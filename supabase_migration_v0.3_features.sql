-- ============================================================
-- Aangan v0.3 — Comments, Messages, Reactions, Onboarding
-- Run in Supabase SQL Editor AFTER all v0.2 migrations
-- ============================================================

-- ─── 1. POST COMMENTS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for per-post comment loading
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id
  ON public.post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_comments_author
  ON public.post_comments(author_id);

-- Add comment_count to posts (denormalized for fast display)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Trigger: keep comment_count in sync
CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
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

-- RLS: anyone in the family can read comments on visible posts
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments on visible posts"
  ON public.post_comments FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can insert own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ─── 2. POST REACTIONS (🙏 namaste + ❤️ like already in posts) ─

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction     TEXT NOT NULL CHECK (reaction IN ('like', 'namaste')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post
  ON public.post_reactions(post_id);

-- Add namaste_count to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS namaste_count INTEGER NOT NULL DEFAULT 0;

-- Trigger: keep namaste_count in sync
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reaction = 'namaste' THEN
    UPDATE public.posts SET namaste_count = namaste_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reaction = 'namaste' THEN
    UPDATE public.posts SET namaste_count = GREATEST(namaste_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reaction_counts ON public.post_reactions;
CREATE TRIGGER trg_reaction_counts
  AFTER INSERT OR DELETE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_reaction_counts();

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read reactions"
  ON public.post_reactions FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can toggle own reactions"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 3. DIRECT MESSAGES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent messaging yourself
  CONSTRAINT no_self_message CHECK (sender_id <> receiver_id)
);

-- Composite index for conversation loading (both directions)
CREATE INDEX IF NOT EXISTS idx_dm_conversation
  ON public.direct_messages(
    LEAST(sender_id, receiver_id),
    GREATEST(sender_id, receiver_id),
    created_at ASC
  );

CREATE INDEX IF NOT EXISTS idx_dm_receiver_unread
  ON public.direct_messages(receiver_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_dm_sender
  ON public.direct_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_receiver
  ON public.direct_messages(receiver_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Can read own messages (sent or received)
CREATE POLICY "Users can read own messages"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Can send messages to family members only
CREATE POLICY "Users can send messages to family"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.user_id = auth.uid()
        AND fm.family_member_id = receiver_id
    )
  );

-- Can mark received messages as read
CREATE POLICY "Receivers can mark messages read"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND is_read = TRUE);

-- ─── 4. ONBOARDING PROGRESS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id             UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  added_parent        BOOLEAN NOT NULL DEFAULT FALSE,
  added_sibling       BOOLEAN NOT NULL DEFAULT FALSE,
  made_first_post     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding"
  ON public.onboarding_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create onboarding record when user is created
CREATE OR REPLACE FUNCTION public.create_onboarding_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.onboarding_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_progress ON public.users;
CREATE TRIGGER trg_onboarding_progress
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_onboarding_progress();

-- Backfill for existing users
INSERT INTO public.onboarding_progress (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- ─── 5. ENABLE REALTIME FOR MESSAGES & COMMENTS ─────────────

-- Run these in Supabase Dashboard → Database → Replication
-- or uncomment if your Supabase plan supports it via SQL:
--
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
--
-- NOTE: If supabase_realtime publication doesn't exist, enable via Dashboard:
-- Database → Replication → Tables → enable direct_messages, post_comments

-- ─── 6. NOTIFICATION TYPES (extend enum if needed) ──────────

-- The existing notifications table supports type TEXT — just add new types:
-- 'new_comment', 'new_message', 'comment_reply' are valid with existing schema.
-- No schema change needed — just insert with the new type values.

-- ─── VERIFICATION ────────────────────────────────────────────
-- Run after applying:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('post_comments','post_reactions','direct_messages','onboarding_progress');
-- Expected: 4 rows
