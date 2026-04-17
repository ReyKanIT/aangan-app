-- ============================================================================
-- Aangan v0.11 — Event social expansion
-- Adds: voice invite from elders, sub-event series (wedding tilak/haldi/sangeet),
--       co-hosts with edit rights, potluck sign-up lists.
-- Kumar: run this AFTER v0.10 migration, before the v0.12 web release.
-- Idempotent — all operations use IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================================

-- 1. Voice invite + parent event link on events
-- voice_invite_url: URL to audio clip recorded by elder (Dadaji etc)
-- voice_invite_duration_sec: for UI to show "Dadaji - 0:18"
-- parent_event_id: self-reference — sub-events (तिलक, हल्दी, मेहंदी, संगीत) hang off the wedding.
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS voice_invite_url TEXT,
    ADD COLUMN IF NOT EXISTS voice_invite_duration_sec INTEGER,
    ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON public.events(parent_event_id);

-- 2. Co-hosts — family members who can edit the event alongside the creator.
-- In Indian weddings: bride + groom + both mothers all need edit rights.
CREATE TABLE IF NOT EXISTS public.event_co_hosts (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_co_hosts_user_id ON public.event_co_hosts(user_id);

ALTER TABLE public.event_co_hosts ENABLE ROW LEVEL SECURITY;

-- Only creator can grant/revoke. Co-hosts read their own row.
DROP POLICY IF EXISTS "Creator manages co-hosts" ON public.event_co_hosts;
CREATE POLICY "Creator manages co-hosts" ON public.event_co_hosts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_co_hosts.event_id
              AND events.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_co_hosts.event_id
              AND events.creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Co-host sees own row" ON public.event_co_hosts;
CREATE POLICY "Co-host sees own row" ON public.event_co_hosts
    FOR SELECT
    USING (user_id = auth.uid());

-- Grant co-hosts UPDATE on events (creator UPDATE policy stays; this adds co-hosts).
DROP POLICY IF EXISTS "Co-hosts can update" ON public.events;
CREATE POLICY "Co-hosts can update" ON public.events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = events.id
              AND event_co_hosts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = events.id
              AND event_co_hosts.user_id = auth.uid()
        )
    );

-- 3. Potluck items — "कौन क्या लाएगा?" list
CREATE TABLE IF NOT EXISTS public.event_potluck_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_name_hindi TEXT,
    quantity_needed INTEGER DEFAULT 1,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_potluck_items_event_id ON public.event_potluck_items(event_id);

ALTER TABLE public.event_potluck_items ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can see the event (mirrors events RLS intent but simpler — if
-- they have an RSVP record or are creator, they see items).
DROP POLICY IF EXISTS "Attendees see potluck items" ON public.event_potluck_items;
CREATE POLICY "Attendees see potluck items" ON public.event_potluck_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_potluck_items.event_id
              AND (
                events.creator_id = auth.uid()
                OR events.audience_type = 'all'
                OR EXISTS (
                    SELECT 1 FROM public.event_rsvps
                    WHERE event_id = events.id AND user_id = auth.uid()
                )
              )
        )
    );

-- Only creator or co-hosts can add/edit/delete potluck items.
DROP POLICY IF EXISTS "Hosts manage potluck items" ON public.event_potluck_items;
CREATE POLICY "Hosts manage potluck items" ON public.event_potluck_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_potluck_items.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = event_potluck_items.event_id
              AND event_co_hosts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_potluck_items.event_id
              AND events.creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.event_co_hosts
            WHERE event_co_hosts.event_id = event_potluck_items.event_id
              AND event_co_hosts.user_id = auth.uid()
        )
    );

-- 4. Potluck sign-ups — which guest committed to bring what
CREATE TABLE IF NOT EXISTS public.event_potluck_signups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.event_potluck_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_potluck_signups_item_id ON public.event_potluck_signups(item_id);
CREATE INDEX IF NOT EXISTS idx_event_potluck_signups_user_id ON public.event_potluck_signups(user_id);

ALTER TABLE public.event_potluck_signups ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the item can see its signups.
DROP POLICY IF EXISTS "See potluck signups" ON public.event_potluck_signups;
CREATE POLICY "See potluck signups" ON public.event_potluck_signups
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_potluck_items i
            JOIN public.events e ON e.id = i.event_id
            WHERE i.id = event_potluck_signups.item_id
              AND (
                e.creator_id = auth.uid()
                OR e.audience_type = 'all'
                OR EXISTS (
                    SELECT 1 FROM public.event_rsvps
                    WHERE event_id = e.id AND user_id = auth.uid()
                )
              )
        )
    );

-- Users manage only their own sign-up row.
DROP POLICY IF EXISTS "Self manage signup" ON public.event_potluck_signups;
CREATE POLICY "Self manage signup" ON public.event_potluck_signups
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
