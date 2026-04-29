-- ============================================================================
-- Migration: 20260429_event_rls_fix.sql
-- Fix: Allow event creators to pre-create RSVPs and notifications for invitees
-- Also: Fix events SELECT policy to include level-based visibility
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. event_rsvps: Allow event creator to INSERT RSVPs for invited users
-- ----------------------------------------------------------------------------
-- The existing "Users can manage own RSVP" policy (FOR ALL) blocks creators
-- from inserting RSVP rows where user_id != auth.uid().
-- We add a separate INSERT-only policy for event creators.

CREATE POLICY "Event creator can invite users to RSVP"
ON public.event_rsvps
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_rsvps.event_id
          AND events.creator_id = auth.uid()
    )
);

-- ----------------------------------------------------------------------------
-- 2. notifications: Allow event creator to INSERT notifications for invitees
-- ----------------------------------------------------------------------------
-- The existing policy only allows users to insert notifications for themselves.
-- We add a policy allowing event creators to notify invited users.

CREATE POLICY "Event creator can notify invited users"
ON public.notifications
FOR INSERT
WITH CHECK (
    (data->>'event_id') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = (data->>'event_id')::uuid
          AND events.creator_id = auth.uid()
    )
);

-- ----------------------------------------------------------------------------
-- 3. events SELECT: Add level-based visibility (no RSVP record required)
-- ----------------------------------------------------------------------------
-- Currently, family members with audience_type='level' can only see an event
-- if they have a pre-created RSVP record. With this fix, level-based events
-- are visible to family members within the audience level range.

-- Drop old SELECT policy and replace with improved version
DROP POLICY IF EXISTS "Events visible to authorized users" ON public.events;

CREATE POLICY "Events visible to authorized users"
ON public.events
FOR SELECT
USING (
    -- Creator always sees their own events
    creator_id = auth.uid()
    OR
    -- Public events visible to all
    audience_type = 'all'
    OR
    -- Level-based: visible to family members within the level range
    (
        audience_type = 'level'
        AND EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.user_id = events.creator_id
              AND fm.family_member_id = auth.uid()
              AND fm.connection_level <= COALESCE(events.audience_level_max, events.audience_level, 99)
        )
    )
    OR
    -- Custom audience: visible if the user has an RSVP record
    EXISTS (
        SELECT 1 FROM public.event_rsvps
        WHERE event_rsvps.event_id = events.id
          AND event_rsvps.user_id = auth.uid()
    )
);
