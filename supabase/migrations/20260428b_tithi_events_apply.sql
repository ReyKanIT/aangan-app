-- ============================================================================
-- TITHI EVENTS — APPLY (replaces drafted 20260416_tithi_events.sql)
-- ============================================================================
-- Activates the personal-event reminder backbone. Stores user-created
-- birthdays / anniversaries / shraddha entries with tithi tuple AND
-- (optional) Gregorian reference date so the panchang-nudge cron can fire
-- BOTH a tithi-anniversary reminder AND a Gregorian-anniversary reminder
-- (e.g., a birthday entered as "15-Aug-1980" pings every Aug 15 AND on
-- the equivalent tithi each year).
--
-- Differences vs the drafted 20260416 migration:
--   - References public.users(id) (the app's user table) instead of
--     auth.users / profiles. Matches the rest of the schema.
--   - Adds notify_days_before per event (default 3, override per event).
--   - Adds is_active flag for soft-disable.
--   - RLS uses public.users semantics consistent with our other tables.
--
-- Created: 2026-04-28
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tithi_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- Optional link to a family member (online or offline). Loose nullable,
    -- no FK to keep this independent of family-member churn.
    person_id UUID,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'birthday'
        CHECK (type IN ('birthday', 'anniversary', 'shraddha', 'festival', 'other')),
    -- Tithi tuple (always set — derived from gregorian_ref if provided)
    tithi_number SMALLINT NOT NULL CHECK (tithi_number BETWEEN 1 AND 30),
    paksha TEXT NOT NULL CHECK (paksha IN ('shukla', 'krishna')),
    masa SMALLINT NOT NULL CHECK (masa BETWEEN 1 AND 12),
    -- Optional Gregorian reference date. Presence triggers BOTH calendar
    -- reminders (tithi anniversary + Gregorian anniversary). If null,
    -- only tithi-anniversary reminders fire.
    gregorian_ref DATE,
    note TEXT,
    notify_days_before SMALLINT NOT NULL DEFAULT 3 CHECK (notify_days_before BETWEEN 0 AND 30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tithi_events_user ON public.tithi_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tithi_events_active ON public.tithi_events(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tithi_events_match ON public.tithi_events(masa, paksha, tithi_number);
CREATE INDEX IF NOT EXISTS idx_tithi_events_gregorian ON public.tithi_events(gregorian_ref) WHERE gregorian_ref IS NOT NULL;

ALTER TABLE public.tithi_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tithi_events_owner_all" ON public.tithi_events;
CREATE POLICY "tithi_events_owner_all" ON public.tithi_events
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trigger_tithi_events_updated_at
    BEFORE UPDATE ON public.tithi_events
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
