-- ============================================================================
-- Aangan v0.9.9 — Bulk invitee list + scheduled send
-- Adds: event_planned_invites queue table + invites_scheduled_at / invites_sent_at
--       on events. Idempotent, safe to re-run.
-- Kumar: run AFTER v0.9.7 migration.
-- ============================================================================

-- 1. Scheduling fields on events
-- invites_scheduled_at: when the bulk send fires. NULL = no schedule set.
-- invites_sent_at: set by the cron once the batch has been dispatched. NULL = not yet sent.
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS invites_scheduled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS invites_sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_events_invites_scheduled_at ON public.events(invites_scheduled_at)
    WHERE invites_sent_at IS NULL AND invites_scheduled_at IS NOT NULL;

-- 2. Planned invites queue
-- Hosts bulk-add rows; cron reads them and creates notifications / fires SMS.
CREATE TABLE IF NOT EXISTS public.event_planned_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    -- invitee_user_id is populated if the phone matches an existing Aangan user.
    invitee_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    invitee_name TEXT NOT NULL,
    invitee_name_hindi TEXT,
    -- E.164-ish format: +91XXXXXXXXXX. Required even for existing users so SMS fallback works.
    invitee_phone TEXT NOT NULL,
    relationship_hint TEXT,              -- optional "cousin", "friend" — helps host organise
    send_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed' | 'skipped'
    send_channel TEXT,                   -- 'notification' | 'sms' | 'both' — what actually fired
    sent_at TIMESTAMP WITH TIME ZONE,
    send_error TEXT,
    added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- No duplicate phone per event — deduplication happens at paste-parse time too.
    UNIQUE (event_id, invitee_phone)
);

CREATE INDEX IF NOT EXISTS idx_planned_invites_event_id ON public.event_planned_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_planned_invites_pending ON public.event_planned_invites(event_id, send_status)
    WHERE send_status = 'pending';

ALTER TABLE public.event_planned_invites ENABLE ROW LEVEL SECURITY;

-- Creator + co-hosts manage the queue.
DROP POLICY IF EXISTS "Hosts manage planned invites" ON public.event_planned_invites;
CREATE POLICY "Hosts manage planned invites" ON public.event_planned_invites
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_planned_invites.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = event_planned_invites.event_id
              AND event_co_hosts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_planned_invites.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = event_planned_invites.event_id
              AND event_co_hosts.user_id = auth.uid()
        )
    );

-- Invitee who matches an existing user can see their own pending row (so we can
-- show "Ram added you to 3 event invites coming up" in-app later).
DROP POLICY IF EXISTS "Invitee sees own pending row" ON public.event_planned_invites;
CREATE POLICY "Invitee sees own pending row" ON public.event_planned_invites
    FOR SELECT
    USING (invitee_user_id = auth.uid());

-- 3. updated_at trigger
DROP TRIGGER IF EXISTS trigger_planned_invites_updated_at ON public.event_planned_invites;
CREATE TRIGGER trigger_planned_invites_updated_at
    BEFORE UPDATE ON public.event_planned_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
