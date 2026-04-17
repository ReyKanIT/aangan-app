-- ============================================================================
-- Aangan v0.9.2 — Event feature expansion
-- Adds: hosted_by ("on behalf of" elders), event gift register (shagun/नेग),
--       event_gift_managers (host-side access control).
-- Kumar: run this in the Supabase SQL editor before releasing the v0.9.2 web build.
-- Safe to re-run — everything is IF NOT EXISTS.
-- ============================================================================

-- 1. Add "on behalf of" field to events
-- Used on the invite card: "श्री सुखदेव शर्मा एवं परिवार की ओर से"
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS hosted_by TEXT;

-- 2. Event gift register (gupta ledger visible only to host side)
CREATE TABLE IF NOT EXISTS public.event_gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    -- Optional link to a platform user; many givers won't have accounts so name
    -- is the authoritative field.
    giver_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    giver_name TEXT NOT NULL,
    giver_name_hindi TEXT,
    -- 'cash' | 'gold' | 'silver' | 'gift' | 'blessing' | 'other'
    gift_type TEXT NOT NULL DEFAULT 'cash',
    amount NUMERIC(10, 2),                -- INR value when gift is cash or priced
    description TEXT,                     -- "sari", "envelope", "gold ring"
    description_hindi TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_gifts_event_id ON public.event_gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_gifts_giver_user_id ON public.event_gifts(giver_user_id);

ALTER TABLE public.event_gifts ENABLE ROW LEVEL SECURITY;

-- 3. Host-side delegates who can see/edit the gift ledger.
-- Creator is implicitly included; this table adds co-managers (e.g., spouse,
-- sibling, trusted elder on the host side).
CREATE TABLE IF NOT EXISTS public.event_gift_managers (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_gift_managers_user_id ON public.event_gift_managers(user_id);

ALTER TABLE public.event_gift_managers ENABLE ROW LEVEL SECURITY;

-- ---- RLS: event_gift_managers ----

-- Only the event creator can grant/revoke gift manager access.
DROP POLICY IF EXISTS "Creator manages gift access" ON public.event_gift_managers;
CREATE POLICY "Creator manages gift access" ON public.event_gift_managers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gift_managers.event_id
              AND events.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gift_managers.event_id
              AND events.creator_id = auth.uid()
        )
    );

-- Managers can see their own row (so the UI knows they have access).
DROP POLICY IF EXISTS "Manager sees own access row" ON public.event_gift_managers;
CREATE POLICY "Manager sees own access row" ON public.event_gift_managers
    FOR SELECT
    USING (user_id = auth.uid());

-- ---- RLS: event_gifts — host side only ----

-- SELECT: creator OR a gift manager for this event
DROP POLICY IF EXISTS "Host side can read gifts" ON public.event_gifts;
CREATE POLICY "Host side can read gifts" ON public.event_gifts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gifts.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_gift_managers
            WHERE event_gift_managers.event_id = event_gifts.event_id
              AND event_gift_managers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Host side can insert gifts" ON public.event_gifts;
CREATE POLICY "Host side can insert gifts" ON public.event_gifts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gifts.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_gift_managers
            WHERE event_gift_managers.event_id = event_gifts.event_id
              AND event_gift_managers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Host side can update gifts" ON public.event_gifts;
CREATE POLICY "Host side can update gifts" ON public.event_gifts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gifts.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_gift_managers
            WHERE event_gift_managers.event_id = event_gifts.event_id
              AND event_gift_managers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Host side can delete gifts" ON public.event_gifts;
CREATE POLICY "Host side can delete gifts" ON public.event_gifts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_gifts.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_gift_managers
            WHERE event_gift_managers.event_id = event_gifts.event_id
              AND event_gift_managers.user_id = auth.uid()
        )
    );

-- updated_at trigger
DROP TRIGGER IF EXISTS trigger_event_gifts_updated_at ON public.event_gifts;
CREATE TRIGGER trigger_event_gifts_updated_at
    BEFORE UPDATE ON public.event_gifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
