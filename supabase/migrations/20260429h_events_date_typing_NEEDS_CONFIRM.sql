-- ============================================================================
-- Migration: 20260429h_events_date_typing_NEEDS_CONFIRM
-- P1 — TEXT → TIMESTAMPTZ for events date columns. Defensive: only runs the
-- conversion if the column is currently a non-TIMESTAMPTZ type.
-- ----------------------------------------------------------------------------
-- ⚠️  KUMAR — DO NOT APPLY UNTIL THE SCHEMA DRIFT BELOW IS RESOLVED  ⚠️
--
-- Audit finding (2026-04-29):
--   supabase_schema.sql:364 declares events.event_date as TEXT.
--   But aangan_web reads `start_datetime` (TIMESTAMPTZ) — that column does
--   not appear in any committed migration.
--   aangan_rn reads `event_date` (the schema.sql column name).
--
-- Possibilities:
--   A. Prod has BOTH columns (event_date TEXT + start_datetime TIMESTAMPTZ),
--      added by an unrecorded SQL Editor change.
--   B. Prod renamed event_date → start_datetime via an out-of-band ALTER.
--   C. Prod still has only event_date and the web app silently fails.
--
-- Diagnose first:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'events'
--     AND column_name IN ('event_date', 'end_date', 'rsvp_deadline', 'start_datetime');
--
-- Then either:
--   * Pick `event_date` everywhere — drop start_datetime if it exists, fix
--     web app to read event_date.
--   * Pick `start_datetime` everywhere — fold this migration's logic into a
--     proper rename, fix RN to read start_datetime.
--   * Keep both with a generated column.
--
-- This migration is a SHELL that converts TEXT → TIMESTAMPTZ if and only if
-- the column is currently TEXT. It does NOT rename or unify the columns.
-- That naming decision is yours.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_data_type TEXT;
BEGIN
    -- event_date
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date';

    IF v_data_type IS NOT NULL AND v_data_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
        RAISE NOTICE 'Converting events.event_date (% → timestamptz)', v_data_type;
        EXECUTE $sql$
            ALTER TABLE public.events
            ALTER COLUMN event_date TYPE TIMESTAMPTZ
            USING (NULLIF(event_date, '')::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')
        $sql$;
    ELSIF v_data_type IS NOT NULL THEN
        RAISE NOTICE 'events.event_date is already %. No change.', v_data_type;
    END IF;

    -- end_date (nullable)
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'end_date';

    IF v_data_type IS NOT NULL AND v_data_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
        RAISE NOTICE 'Converting events.end_date (% → timestamptz)', v_data_type;
        EXECUTE $sql$
            ALTER TABLE public.events
            ALTER COLUMN end_date TYPE TIMESTAMPTZ
            USING (NULLIF(end_date, '')::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')
        $sql$;
    END IF;

    -- rsvp_deadline (nullable)
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'rsvp_deadline';

    IF v_data_type IS NOT NULL AND v_data_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
        RAISE NOTICE 'Converting events.rsvp_deadline (% → timestamptz)', v_data_type;
        EXECUTE $sql$
            ALTER TABLE public.events
            ALTER COLUMN rsvp_deadline TYPE TIMESTAMPTZ
            USING (NULLIF(rsvp_deadline, '')::TIMESTAMPTZ AT TIME ZONE 'Asia/Kolkata')
        $sql$;
    END IF;
END $$;

COMMIT;
