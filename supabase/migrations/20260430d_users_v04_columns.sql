-- ============================================================================
-- Migration: 20260430d_users_v04_columns
-- P0 — adds the v0.4 user-profile columns that never landed in prod.
-- ----------------------------------------------------------------------------
-- Bug story:
--   The web's `familyStore.fetchMembers` (per the trimmed `users(*)` join
--   shipped in v0.12.5) explicitly requests these columns from the joined
--   users table:
--       id, display_name, display_name_hindi, avatar_url, profile_photo_url,
--       village, state, family_level, date_of_birth, gotra, family_role,
--       last_seen_at
--
--   But prod's public.users had only the v0.1 baseline columns. The
--   v0.4_features.sql migration was never applied (one of the bombshells
--   from the 2026-04-29 audit). PostgREST 400'd the whole select expansion
--   → the family page rendered the bilingual error banner
--   "कुछ गड़बड़ हुई — Something went wrong" while still showing partial data
--   from offline_family_members.
--
-- Fix: idempotent ALTER ADD COLUMN IF NOT EXISTS for all 6 missing columns:
--   * date_of_birth        DATE  (v0.4)
--   * gotra                TEXT  (v0.4)
--   * family_role          TEXT  (v0.4)
--   * theme_preference     TEXT  (v0.4 with check constraint)
--   * wedding_anniversary  DATE  (v0.4.4 daily-reminders dependency)
--   * avatar_url           TEXT  (used by aangan_web's user joins; mirror of
--                                profile_photo_url that the web/RN both read)
--
-- Verified post-apply 2026-04-30: family page error banner gone, both
-- grandparents render with L2 badges (after the related backfill).
-- ============================================================================

BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gotra TEXT,
    ADD COLUMN IF NOT EXISTS family_role TEXT,
    ADD COLUMN IF NOT EXISTS theme_preference TEXT
        CHECK (theme_preference IS NULL OR theme_preference IN ('light','dark','system')),
    ADD COLUMN IF NOT EXISTS wedding_anniversary DATE,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill avatar_url from profile_photo_url where avatar_url is null
-- (some app code reads avatar_url, other code reads profile_photo_url; keep
-- both populated until that's reconciled).
UPDATE public.users
SET avatar_url = profile_photo_url
WHERE avatar_url IS NULL AND profile_photo_url IS NOT NULL;

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='users'
--     AND column_name IN ('date_of_birth','gotra','family_role',
--                         'theme_preference','wedding_anniversary','avatar_url')
--   ORDER BY column_name;
-- Expected: 6 rows.
-- ============================================================================
