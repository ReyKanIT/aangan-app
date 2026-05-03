-- ============================================================================
-- Migration: 20260503a_events_subevent_voice_duration
-- P0 — completes the v0.12 events column-set. Companion to 20260430j which
--      added 4 of the v0.12 columns but missed these 2.
-- ----------------------------------------------------------------------------
-- Bug story (2026-05-03, surfaced by Kumar):
--   "events creation is not working"
--   Reproduced via direct PostgREST insert with the EXACT payload
--   EventCreatorModal.tsx:57-72 sends. PostgREST returned PGRST204:
--     "Could not find the 'parent_event_id' column of 'events' in the
--      schema cache"
--   Same error fires for voice_invite_duration_sec. EventCreatorModal sets
--   both fields on every create. The insert fails before the row lands;
--   eventStore.createEvent returns null; the modal shows
--   "उत्सव नहीं बना पाए" and stays open.
--
--   Same class of bug as 20260430j — v0.12 ship of two related features
--   (sub-events series + voice-invite duration metadata) shipped client
--   code but the migration that adds the storage columns was never run.
--
-- Effects today on prod:
--   - Sub-event creation: blocked. EventCreatorModal includes
--     parent_event_id in every payload (null for root events, UUID for
--     children). PostgREST rejects the column → ALL event creation 400s.
--   - Voice invite duration: even after this migration, the duration is
--     captured into the row; without it, the duration was discarded
--     silently when voice invites were attached.
--   - SubEventsSection.tsx already tolerates the missing column on read
--     (catches PostgREST 42703 / treats as "no sub-events") — so the read
--     path doesn't 500, but no parent→child relationships exist in prod.
--
-- Fix: idempotent ALTER ADD COLUMN IF NOT EXISTS for both columns.
--   - parent_event_id: self-referential FK with ON DELETE SET NULL so
--     deleting a parent doesn't cascade-delete its sub-events; they
--     become root events instead, preserving user data.
--   - voice_invite_duration_sec: simple INTEGER, nullable.
--   - Index on parent_event_id supports SubEventsSection.tsx's WHERE
--     parent_event_id = $1 lookup pattern.
-- ============================================================================

BEGIN;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS parent_event_id          UUID REFERENCES public.events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS voice_invite_duration_sec INTEGER;

CREATE INDEX IF NOT EXISTS idx_events_parent_event_id
    ON public.events (parent_event_id)
    WHERE parent_event_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verification:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='events'
--     AND column_name IN ('parent_event_id','voice_invite_duration_sec')
--   ORDER BY column_name;
-- Expected: 2 rows.
--
-- After applying, the smoke-test insert
--   POST /rest/v1/events {parent_event_id: null, voice_invite_duration_sec: null, ...}
-- should return 201 instead of 400 PGRST204.
-- ============================================================================
