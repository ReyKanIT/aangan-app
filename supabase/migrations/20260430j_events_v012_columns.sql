-- ============================================================================
-- Migration: 20260430j_events_v012_columns
-- P0 — adds the 4 v0.12-era event columns that the web reads but were never
--      applied to prod. Same class of bug as 20260430d (v0.4 user columns).
-- ----------------------------------------------------------------------------
-- Bug story (2026-04-30, surfaced by Kumar):
--   "There is error in events page, how U are not able to see it?"
--   — caught by post-CEO-mode review; previous static-only audit missed it.
--
--   Schema check showed prod's `events` table has only the v0.10 column set
--   (28 cols incl. start_datetime, banner_url, title_hindi, max_attendees,
--   rsvp_deadline) — but is missing 4 columns that the v0.12.x release
--   shipped client code for:
--       hosted_by              TEXT  — "X की ओर से" badge + OG image
--       voice_invite_url       TEXT  — voice-invite player on detail page
--       invites_scheduled_at   TIMESTAMPTZ — bulk-invite cron schedule
--       invites_sent_at        TIMESTAMPTZ — bulk-invite cron completion
--
--   Effects today on prod:
--   - `events/[eventId]/layout.tsx:26` SELECT explicitly names `hosted_by`
--     → PostgREST 400 → empty OG metadata for shared events.
--   - `events/[eventId]/page.tsx` reads `currentEvent.voice_invite_url`,
--     `invites_scheduled_at`, `invites_sent_at` — undefined-on-old-schema
--     made the conditional renders no-op (silent feature loss, not a 500).
--   - `api/cron/send-scheduled-invites` SELECTs `invites_scheduled_at` → 400
--     → cron silently fails on every run.
--   - The events list itself (eventStore.fetchEvents) uses select('*') so
--     it tolerates missing columns; what crashes is the `creator:users!`
--     FK shorthand on the embed when PostgREST schema cache is stale
--     after tonight's REVOKE on users (20260429b). Companion patch in
--     web client switches to the explicit FK constraint name.
--
-- Fix: idempotent ALTER ADD COLUMN IF NOT EXISTS for all 4 columns.
-- ============================================================================

BEGIN;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS hosted_by              TEXT,
    ADD COLUMN IF NOT EXISTS voice_invite_url       TEXT,
    ADD COLUMN IF NOT EXISTS invites_scheduled_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invites_sent_at        TIMESTAMPTZ;

-- Schedule-cron index: the cron query is
--   WHERE invites_scheduled_at <= NOW() AND invites_sent_at IS NULL
-- so a partial index on rows pending send keeps it fast even at scale.
CREATE INDEX IF NOT EXISTS idx_events_pending_invites
    ON public.events (invites_scheduled_at)
    WHERE invites_sent_at IS NULL AND invites_scheduled_at IS NOT NULL;

-- Reload PostgREST schema cache so the new columns appear via the REST
-- API immediately, without waiting for the next periodic refresh.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='events'
--     AND column_name IN ('hosted_by','voice_invite_url',
--                         'invites_scheduled_at','invites_sent_at')
--   ORDER BY column_name;
-- Expected: 4 rows.
-- ============================================================================
