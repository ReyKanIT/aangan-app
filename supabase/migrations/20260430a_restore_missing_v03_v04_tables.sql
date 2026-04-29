-- ============================================================================
-- Migration: 20260430a_restore_missing_v03_v04_tables
-- P0 — restores tables that v0.3 + v0.4 features depend on but never landed
--      in production (project okzmeuhxodzkbdilvkyu).
-- ----------------------------------------------------------------------------
-- Background (audit 2026-04-29):
--   Direct introspection of prod schema confirmed the following tables are
--   referenced by v0.3 / v0.4 / v0.2-security migrations but DO NOT EXIST:
--     * public.post_comments         (v0.3 — comments on posts)
--     * public.post_reactions        (v0.3 — namaste / like reactions)
--     * public.post_polls            (v0.4 — poll attached to a post)
--     * public.poll_votes            (v0.4 — vote rows for a poll)
--     * public.stories               (v0.4 — 24h ephemeral media)
--     * public.story_views           (v0.4 — who saw which story)
--     * public.rate_limits           (v0.2 security — abuse throttle bucket)
--     * public.user_blocks           (v0.2 security — user-vs-user blocklist)
--     * public.onboarding_progress   (v0.3 — first-run checklist)
--
--   Tables already present in prod (NOT touched here): users, posts, events,
--   notifications, direct_messages, post_audience, post_likes, audience_groups,
--   family_members, audit_logs, content_reports, event_*, support_*, etc.
--
-- Strategy:
--   1. CREATE TABLE IF NOT EXISTS for each missing table, copying the column
--      shape from supabase_migration_v0.3_features.sql + v0.4_features.sql.
--   2. CREATE INDEX IF NOT EXISTS on every FK column for query plans.
--   3. ENABLE ROW LEVEL SECURITY on every new table.
--   4. Apply audience-respecting policies modeled on the never-landed
--      20260429c_audience_rls_lockdown.sql (which assumed these tables
--      existed). Specifically:
--        - post_comments / post_reactions  → SELECT/INSERT gated by
--          can_view_post() so child rows inherit the parent post's audience.
--        - post_polls / poll_votes         → SELECT gated by can_view_post();
--          poll_votes visible only to voter + post author.
--        - stories / story_views           → gated by can_view_story()
--          (author + family_members rows).
--        - user_blocks                     → only own blocker rows.
--        - rate_limits                     → no direct user policy; access
--          only via SECURITY DEFINER helper rpc_record_rate_hit().
--        - onboarding_progress             → user manages own row.
--   5. Trigger functions (update_comment_count, update_reaction_counts,
--      create_onboarding_progress, expire_old_stories helper) created with
--      `SET search_path = public, pg_temp` already locked.
--   6. CREATE OR REPLACE used only for functions that are guaranteed new
--      to prod (none of the names below exist in prod per audit).
--
-- Hard constraints honored:
--   * No DROP, no ALTER on any pre-existing table (posts/users/etc).
--   * No GRANT SELECT to anon on any new table.
--   * No re-definition of existing functions (can_view_post / can_view_story
--     are referenced but defined here ONLY IF NOT EXISTS via DO block — they
--     never landed in prod either, so we create them here once).
--   * Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Audience helper functions (originally meant to land in 20260429c).
--    These are referenced by the policies below; we create them here because
--    the prior migration was skipped when its target tables didn't exist.
--    Guarded with DO block so we don't redefine if some later migration
--    already installed them.
-- ----------------------------------------------------------------------------
DO $bootstrap$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'can_view_post'
    ) THEN
        EXECUTE $fn$
            CREATE FUNCTION public.can_view_post(p_post_id UUID)
            RETURNS BOOLEAN
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public, pg_temp
            STABLE
            AS $body$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.posts p
                    WHERE p.id = p_post_id
                      AND (
                        p.author_id = auth.uid()
                        OR p.audience_type = 'all'
                        OR EXISTS (
                            SELECT 1 FROM public.post_audience pa
                            WHERE pa.post_id = p.id
                              AND (
                                pa.user_id = auth.uid()
                                OR pa.audience_group_id IN (
                                    SELECT ag.id FROM public.audience_groups ag
                                    WHERE ag.creator_id = p.author_id
                                )
                              )
                        )
                      )
                );
            $body$;
        $fn$;

        REVOKE ALL ON FUNCTION public.can_view_post(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.can_view_post(UUID) TO authenticated;
    END IF;
END
$bootstrap$;

-- can_view_story moved below the stories CREATE TABLE so its body can resolve
-- public.stories. Postgres validates SQL-language function bodies at CREATE
-- time, so the function must come AFTER the table.

-- ============================================================================
-- 1. POST_COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id
    ON public.post_comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_author
    ON public.post_comments(author_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- SELECT — gated by parent post visibility
DROP POLICY IF EXISTS "comments visible iff parent post visible" ON public.post_comments;
CREATE POLICY "comments visible iff parent post visible"
    ON public.post_comments FOR SELECT
    USING (auth.uid() IS NOT NULL AND public.can_view_post(post_id));

-- INSERT — author + must be allowed to view the post
DROP POLICY IF EXISTS "Users can insert own comments" ON public.post_comments;
CREATE POLICY "Users can insert own comments"
    ON public.post_comments FOR INSERT
    WITH CHECK (
        auth.uid() = author_id
        AND public.can_view_post(post_id)
    );

-- UPDATE — author can edit own comment content
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
CREATE POLICY "Users can update own comments"
    ON public.post_comments FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- DELETE — author can delete own comment
DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments"
    ON public.post_comments FOR DELETE
    USING (auth.uid() = author_id);

-- Trigger function: keep posts.comment_count in sync.
-- NOTE: posts.comment_count column is added by v0.3 separately. We don't add
-- it here (touching posts is forbidden by the migration brief). The trigger
-- will silently no-op against a missing column at INSERT time only if the
-- column doesn't exist — so we guard the UPDATE with a column-existence check.
CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'posts'
          AND column_name  = 'comment_count'
    ) THEN
        RETURN NULL; -- column not present yet; skip denormalization
    END IF;

    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts SET comment_count = comment_count + 1
            WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0)
            WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_count ON public.post_comments;
CREATE TRIGGER trg_comment_count
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_comment_count();

-- ============================================================================
-- 2. POST_REACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction    TEXT NOT NULL CHECK (reaction IN ('like', 'namaste')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post
    ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user
    ON public.post_reactions(user_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions visible iff parent post visible" ON public.post_reactions;
CREATE POLICY "reactions visible iff parent post visible"
    ON public.post_reactions FOR SELECT
    USING (auth.uid() IS NOT NULL AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users can toggle own reactions" ON public.post_reactions;
CREATE POLICY "Users can toggle own reactions"
    ON public.post_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND public.can_view_post(post_id)
    );

DROP POLICY IF EXISTS "Users can remove own reactions" ON public.post_reactions;
CREATE POLICY "Users can remove own reactions"
    ON public.post_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger: keep posts.namaste_count in sync (guarded against missing column).
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'posts'
          AND column_name  = 'namaste_count'
    ) THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.reaction = 'namaste' THEN
        UPDATE public.posts SET namaste_count = namaste_count + 1
            WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' AND OLD.reaction = 'namaste' THEN
        UPDATE public.posts SET namaste_count = GREATEST(namaste_count - 1, 0)
            WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reaction_counts ON public.post_reactions;
CREATE TRIGGER trg_reaction_counts
    AFTER INSERT OR DELETE ON public.post_reactions
    FOR EACH ROW EXECUTE FUNCTION public.update_reaction_counts();

-- ============================================================================
-- 3. STORIES (must be created before policies that reference it from
--    can_view_story; can_view_story already references public.stories).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    media_url   TEXT NOT NULL,
    media_type  TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
    caption     TEXT,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    view_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_author
    ON public.stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires
    ON public.stories(expires_at);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- can_view_story — defined here (post-stories-CREATE) so the SQL function
-- body can resolve public.stories at CREATE-FUNCTION parse time.
DO $bootstrap2$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'can_view_story'
    ) THEN
        EXECUTE $fn$
            CREATE FUNCTION public.can_view_story(p_story_id UUID)
            RETURNS BOOLEAN
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public, pg_temp
            STABLE
            AS $body$
                SELECT EXISTS (
                    SELECT 1
                    FROM public.stories s
                    WHERE s.id = p_story_id
                      AND s.expires_at > NOW()
                      AND (
                        s.author_id = auth.uid()
                        OR EXISTS (
                            SELECT 1 FROM public.family_members fm
                            WHERE fm.user_id = auth.uid()
                              AND fm.family_member_id = s.author_id
                        )
                      )
                );
            $body$;
        $fn$;

        REVOKE ALL ON FUNCTION public.can_view_story(UUID) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.can_view_story(UUID) TO authenticated;
    END IF;
END
$bootstrap2$;

DROP POLICY IF EXISTS "stories visible to author + family" ON public.stories;
CREATE POLICY "stories visible to author + family"
    ON public.stories FOR SELECT
    USING (auth.uid() IS NOT NULL AND public.can_view_story(id));

DROP POLICY IF EXISTS "Users can create own stories" ON public.stories;
CREATE POLICY "Users can create own stories"
    ON public.stories FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
    ON public.stories FOR DELETE
    USING (auth.uid() = author_id);

-- ============================================================================
-- 4. STORY_VIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.story_views (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id    UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story
    ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer
    ON public.story_views(viewer_id);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viewer or story author can read story_views" ON public.story_views;
CREATE POLICY "viewer or story author can read story_views"
    ON public.story_views FOR SELECT
    USING (
        auth.uid() = viewer_id
        OR EXISTS (
            SELECT 1 FROM public.stories s
            WHERE s.id = story_views.story_id
              AND s.author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own views" ON public.story_views;
CREATE POLICY "Users can insert own views"
    ON public.story_views FOR INSERT
    WITH CHECK (
        auth.uid() = viewer_id
        AND public.can_view_story(story_id)
    );

-- ============================================================================
-- 5. POST_POLLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_polls (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    options     JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_polls_post
    ON public.post_polls(post_id);

ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls visible iff parent post visible" ON public.post_polls;
CREATE POLICY "polls visible iff parent post visible"
    ON public.post_polls FOR SELECT
    USING (auth.uid() IS NOT NULL AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users can create polls" ON public.post_polls;
CREATE POLICY "Users can create polls"
    ON public.post_polls FOR INSERT
    WITH CHECK (
        auth.uid() = (SELECT author_id FROM public.posts WHERE id = post_id)
    );

DROP POLICY IF EXISTS "Post author can update own poll" ON public.post_polls;
CREATE POLICY "Post author can update own poll"
    ON public.post_polls FOR UPDATE
    USING (
        auth.uid() = (SELECT author_id FROM public.posts WHERE id = post_id)
    )
    WITH CHECK (
        auth.uid() = (SELECT author_id FROM public.posts WHERE id = post_id)
    );

-- ============================================================================
-- 6. POLL_VOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
    voter_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    option_id   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
    ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter
    ON public.poll_votes(voter_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voter or post author can read votes" ON public.poll_votes;
CREATE POLICY "voter or post author can read votes"
    ON public.poll_votes FOR SELECT
    USING (
        auth.uid() = voter_id
        OR EXISTS (
            SELECT 1 FROM public.post_polls pp
            JOIN public.posts p ON p.id = pp.post_id
            WHERE pp.id = poll_votes.poll_id
              AND p.author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can vote once" ON public.poll_votes;
CREATE POLICY "Users can vote once"
    ON public.poll_votes FOR INSERT
    WITH CHECK (
        auth.uid() = voter_id
        AND EXISTS (
            SELECT 1 FROM public.post_polls pp
            WHERE pp.id = poll_votes.poll_id
              AND public.can_view_post(pp.post_id)
        )
    );

DROP POLICY IF EXISTS "Users can change own vote" ON public.poll_votes;
CREATE POLICY "Users can change own vote"
    ON public.poll_votes FOR UPDATE
    USING (auth.uid() = voter_id)
    WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can withdraw own vote" ON public.poll_votes;
CREATE POLICY "Users can withdraw own vote"
    ON public.poll_votes FOR DELETE
    USING (auth.uid() = voter_id);

-- ============================================================================
-- 7. ONBOARDING_PROGRESS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    user_id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    added_parent     BOOLEAN NOT NULL DEFAULT FALSE,
    added_sibling    BOOLEAN NOT NULL DEFAULT FALSE,
    made_first_post  BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own onboarding" ON public.onboarding_progress;
CREATE POLICY "Users manage own onboarding"
    ON public.onboarding_progress FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_onboarding_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.onboarding_progress (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Auto-create on new user (idempotent: ON CONFLICT in body)
DROP TRIGGER IF EXISTS trg_onboarding_progress ON public.users;
CREATE TRIGGER trg_onboarding_progress
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.create_onboarding_progress();

-- Backfill rows for any user that doesn't have an onboarding row yet.
INSERT INTO public.onboarding_progress (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 8. USER_BLOCKS  (referenced by v0.2 security; never landed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (blocker_id, blocked_id),
    CONSTRAINT user_blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
    ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
    ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- A user can only see / manage rows where they are the blocker.
-- The blocked user does NOT see that they've been blocked (privacy).
DROP POLICY IF EXISTS "Users read own blocks" ON public.user_blocks;
CREATE POLICY "Users read own blocks"
    ON public.user_blocks FOR SELECT
    USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users add own blocks" ON public.user_blocks;
CREATE POLICY "Users add own blocks"
    ON public.user_blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users remove own blocks" ON public.user_blocks;
CREATE POLICY "Users remove own blocks"
    ON public.user_blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- ============================================================================
-- 9. RATE_LIMITS  (referenced by v0.2 security; never landed)
--    No direct user policies — RLS denies all by default. Access only via
--    SECURITY DEFINER helper rpc_record_rate_hit() defined below.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bucket      TEXT NOT NULL,        -- e.g. 'send_otp', 'create_post', 'send_message'
    hit_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata    JSONB
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_bucket_time
    ON public.rate_limits(user_id, bucket, hit_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket_time
    ON public.rate_limits(bucket, hit_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No FOR ALL policy → RLS-deny-by-default for authenticated/anon.
-- Access strictly via the helper RPC below.

CREATE OR REPLACE FUNCTION public.rpc_record_rate_hit(
    p_bucket    TEXT,
    p_metadata  JSONB DEFAULT NULL,
    p_window    INTERVAL DEFAULT INTERVAL '1 minute',
    p_max_hits  INTEGER  DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_count  INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    IF p_bucket IS NULL OR length(p_bucket) = 0 OR length(p_bucket) > 64 THEN
        RAISE EXCEPTION 'Invalid bucket name';
    END IF;

    SELECT count(*) INTO v_count
    FROM public.rate_limits
    WHERE user_id = v_uid
      AND bucket  = p_bucket
      AND hit_at  > NOW() - p_window;

    IF v_count >= p_max_hits THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.rate_limits (user_id, bucket, metadata)
    VALUES (v_uid, p_bucket, p_metadata);

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_record_rate_hit(TEXT, JSONB, INTERVAL, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_record_rate_hit(TEXT, JSONB, INTERVAL, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.rpc_record_rate_hit(TEXT, JSONB, INTERVAL, INTEGER) IS
'Records a rate-limit hit for the calling user. Returns FALSE if the call exceeds p_max_hits within p_window (caller should treat as deny). Default = 30/min.';

COMMIT;

-- ============================================================================
-- Verification queries (run manually post-apply, all should return expected):
-- ============================================================================
--
-- 1. All 9 tables exist:
--    SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public'
--       AND table_name IN ('post_comments','post_reactions','stories',
--                          'story_views','post_polls','poll_votes',
--                          'onboarding_progress','user_blocks','rate_limits')
--     ORDER BY table_name;
--    -- Expected: 9 rows
--
-- 2. RLS enabled on every new table:
--    SELECT relname FROM pg_class
--     WHERE relname IN ('post_comments','post_reactions','stories',
--                       'story_views','post_polls','poll_votes',
--                       'onboarding_progress','user_blocks','rate_limits')
--       AND relrowsecurity = TRUE;
--    -- Expected: 9 rows
--
-- 3. Policy counts per table:
--    SELECT tablename, count(*) FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('post_comments','post_reactions','stories',
--                         'story_views','post_polls','poll_votes',
--                         'onboarding_progress','user_blocks','rate_limits')
--    GROUP BY tablename ORDER BY tablename;
--    -- Expected: post_comments=4, post_reactions=3, stories=3, story_views=2,
--    --           post_polls=3, poll_votes=4, onboarding_progress=1,
--    --           user_blocks=3, rate_limits=0 (deny-by-default)
--
-- 4. Helper functions present + search_path locked:
--    SELECT proname, proconfig FROM pg_proc
--     WHERE pronamespace = 'public'::regnamespace
--       AND proname IN ('can_view_post','can_view_story',
--                       'update_comment_count','update_reaction_counts',
--                       'create_onboarding_progress','rpc_record_rate_hit');
--    -- Expected: 6 rows, every proconfig contains 'search_path=public, pg_temp'
--
-- 5. Anon cannot read any new table:
--    SET ROLE anon;
--    SELECT count(*) FROM public.post_comments;     -- 0 / RLS denies
--    SELECT count(*) FROM public.stories;            -- 0
--    SELECT count(*) FROM public.rate_limits;        -- 0
--    RESET ROLE;
-- ============================================================================
