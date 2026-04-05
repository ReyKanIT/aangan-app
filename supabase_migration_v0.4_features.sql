-- ============================================================
-- Aangan v0.4 — Stories, Polls, User Profile Fields
-- Run in Supabase SQL Editor AFTER all v0.3 migrations
-- ============================================================

-- ─── 1. PROFILE FIELDS (DOB + Gotra) ─────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gotra TEXT,
  ADD COLUMN IF NOT EXISTS family_role TEXT; -- 'father','mother','son','daughter', etc.

-- ─── 2. STORIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption       TEXT,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_author ON public.stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories(expires_at);

-- Story views table
CREATE TABLE IF NOT EXISTS public.story_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, viewer_id)
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can view stories" ON public.stories
  FOR SELECT USING (
    expires_at > NOW() AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can create own stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own stories" ON public.stories
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Users can view story views" ON public.story_views
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own views" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- ─── 3. POST POLLS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]', -- [{id, text, vote_count}]
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id)
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES public.post_polls(id) ON DELETE CASCADE,
  voter_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  option_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, voter_id)
);

ALTER TABLE public.post_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can view polls" ON public.post_polls
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create polls" ON public.post_polls
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT author_id FROM public.posts WHERE id = post_id)
  );

CREATE POLICY "Users can view votes" ON public.poll_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can vote once" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- ─── 4. THEME PREFERENCE ─────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system'));

-- ─── VERIFICATION ────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('stories','story_views','post_polls','poll_votes');
-- Expected: 4 rows
