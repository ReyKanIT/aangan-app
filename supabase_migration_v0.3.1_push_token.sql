-- ============================================================
-- Aangan v0.3.1 — Add push_token column to users table
-- Run AFTER supabase_migration_v0.3_features.sql
-- ============================================================

-- Required by pushNotifications.ts — stores Expo push token per user
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for fast lookups when sending targeted push notifications
CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON public.users(id)
  WHERE push_token IS NOT NULL;

-- ─── VERIFICATION ────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'users' AND column_name = 'push_token';
-- Expected: 1 row — push_token | text
