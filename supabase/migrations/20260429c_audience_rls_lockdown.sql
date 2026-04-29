-- ============================================================================
-- Migration: 20260429c_audience_rls_lockdown
-- P0 — fixes audience-bypass leaks across child tables of public.posts and
--      public.stories. Without this, posts' audience controls are fictional.
-- ----------------------------------------------------------------------------
-- Findings (audit 2026-04-29):
--   Five tables had SELECT USING (auth.uid() IS NOT NULL) — i.e. effectively
--   public to every signed-in user, regardless of the parent post's audience:
--     * public.post_comments  (v0.3 line 51)
--     * public.post_reactions (v0.3 line 103)
--     * public.post_polls     (v0.4 line 79)
--     * public.poll_votes     (v0.4 line 87)
--     * public.stories        (v0.4 line 39)
--     * public.story_views    (v0.4 line 50)
--
-- Fix:
--   1. Helper function public.can_view_post(post_uuid) → BOOLEAN that mirrors
--      the posts-table SELECT predicate. Centralizes audience logic.
--   2. Helper function public.can_view_story(story_uuid) → BOOLEAN gating
--      stories to the author + the author's family (any connection level).
--   3. Replace the leaky SELECT policies with EXISTS-based predicates.
--   4. Tighten direct_messages.UPDATE WITH CHECK so receivers can only flip
--      is_read = TRUE — they cannot rewrite content / sender_id / created_at.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Centralized audience helpers (SECURITY DEFINER + search_path locked)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.can_view_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(UUID) TO authenticated;

COMMENT ON FUNCTION public.can_view_post(UUID) IS
'Returns TRUE iff auth.uid() is allowed to view the parent post per the posts SELECT policy. Use in child-table RLS to inherit audience rules.';

-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_story(p_story_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.can_view_story(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_story(UUID) TO authenticated;

COMMENT ON FUNCTION public.can_view_story(UUID) IS
'Returns TRUE iff auth.uid() is the story author OR a family member of the author, AND the story has not expired.';

-- ----------------------------------------------------------------------------
-- 2. post_comments — gate read by parent-post visibility.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read comments on visible posts" ON public.post_comments;

CREATE POLICY "comments visible iff parent post visible"
  ON public.post_comments FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.can_view_post(post_id));

-- INSERT/DELETE policies stay as-is (already enforce author_id = auth.uid()).
-- Add a defensive check that the inserter can also view the post — prevents
-- comment-spamming on a post they shouldn't be able to see.
DROP POLICY IF EXISTS "Users can insert own comments" ON public.post_comments;
CREATE POLICY "Users can insert own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND public.can_view_post(post_id)
  );

-- ----------------------------------------------------------------------------
-- 3. post_reactions — same pattern.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read reactions" ON public.post_reactions;

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

-- ----------------------------------------------------------------------------
-- 4. post_polls — gate read by parent-post visibility.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Family can view polls" ON public.post_polls;

CREATE POLICY "polls visible iff parent post visible"
  ON public.post_polls FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.can_view_post(post_id));

-- ----------------------------------------------------------------------------
-- 5. poll_votes — visible only to the post author + the voter themselves.
--    (Family-wide vote enumeration was a leak; we now expose vote breakdowns
--    only via the post_polls.options JSONB which the author can aggregate.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view votes" ON public.poll_votes;

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

-- INSERT — voter must also be allowed to view the parent post.
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

-- ----------------------------------------------------------------------------
-- 6. stories — gate by family connection.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Family can view stories" ON public.stories;

CREATE POLICY "stories visible to author + family"
  ON public.stories FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.can_view_story(id));

-- ----------------------------------------------------------------------------
-- 7. story_views — viewer must be able to view the parent story; story
--    author can also see all viewers (for the "seen by" list).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view story views" ON public.story_views;

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

-- ----------------------------------------------------------------------------
-- 8. direct_messages — receiver UPDATE must not allow content rewrite.
--    PG row-level WITH CHECK can't restrict columns directly, so we add a
--    BEFORE UPDATE trigger that rejects changes to anything except is_read /
--    read_at when the caller is the receiver.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dm_receiver_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Sender can update freely (currently there's no UPDATE policy for sender,
    -- but we future-proof). This guard only fires for the receiver path.
    IF auth.uid() = OLD.receiver_id AND auth.uid() <> OLD.sender_id THEN
        IF NEW.content        IS DISTINCT FROM OLD.content
           OR NEW.sender_id   IS DISTINCT FROM OLD.sender_id
           OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
           OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Receivers may only mark messages as read; cannot modify content or routing.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dm_receiver_guard ON public.direct_messages;
CREATE TRIGGER trg_dm_receiver_guard
    BEFORE UPDATE ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION public.dm_receiver_update_guard();

COMMIT;

-- ============================================================================
-- Verification queries (run as authenticated user A who is NOT in family
-- with author B; B has audience-restricted posts):
--
--   SELECT count(*) FROM public.post_comments
--     WHERE post_id IN (SELECT id FROM public.posts WHERE author_id = '<B>');
--   -- Expected: 0 (audience denies)
--
--   SELECT count(*) FROM public.stories WHERE author_id = '<B>';
--   -- Expected: 0 (not in family)
--
--   -- A logs in, comments on their own visible post:
--   INSERT INTO public.post_comments (post_id, author_id, content)
--   VALUES ('<A_visible_post>', auth.uid(), 'test');
--   -- Expected: success.
--
--   -- A tries to comment on B's hidden post:
--   INSERT INTO public.post_comments (post_id, author_id, content)
--   VALUES ('<B_hidden_post>', auth.uid(), 'test');
--   -- Expected: 42501 / RLS violation.
-- ============================================================================
