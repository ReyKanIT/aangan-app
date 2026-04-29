-- ============================================================================
-- Migration: 20260429d_notification_insert_hardening
-- P0 — closes notification phishing/spam vector.
-- ----------------------------------------------------------------------------
-- Finding (audit 2026-04-29):
--   The "Event creator can notify invited users" policy added in
--   20260429_event_rls_fix.sql:31-41 only validates that the event in
--   data->>'event_id' belongs to the caller. The recipient column
--   (notifications.user_id) is NEVER validated — meaning any event creator
--   can insert a notification into any user's row by passing an arbitrary
--   user_id alongside their own event_id.
--
-- Fix:
--   Recreate the policy with an additional EXISTS check requiring that
--   notifications.user_id is either:
--     a) the event creator themselves (always allowed), OR
--     b) a user with an RSVP record on this event, OR
--     c) a family member of the creator (so non-RSVP'd family can also be
--        legitimately invited via push).
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Event creator can notify invited users" ON public.notifications;

CREATE POLICY "Event creator can notify legitimately-invited users"
ON public.notifications
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (data->>'event_id') IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = (data->>'event_id')::uuid
          AND e.creator_id = auth.uid()
    )
    AND (
        -- Recipient is the event creator themselves (rare but legitimate)
        notifications.user_id = auth.uid()
        OR
        -- Recipient has an RSVP record for this event (was invited)
        EXISTS (
            SELECT 1 FROM public.event_rsvps r
            WHERE r.event_id = (data->>'event_id')::uuid
              AND r.user_id = notifications.user_id
        )
        OR
        -- Recipient is a family member of the event creator
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.user_id = auth.uid()
              AND fm.family_member_id = notifications.user_id
        )
    )
);

COMMENT ON POLICY "Event creator can notify legitimately-invited users" ON public.notifications IS
'Hardened 2026-04-29: requires recipient (notifications.user_id) to be the event creator, an RSVPd invitee, or a family member of the creator. Prior version validated only the event-id, allowing arbitrary recipient injection (phishing).';

COMMIT;

-- ============================================================================
-- Verification (run as user A who created event E1, with invitee B but
-- attempting to spam a stranger C):
--
--   INSERT INTO public.notifications (user_id, type, data)
--   VALUES ('<C>', 'event_invite', jsonb_build_object('event_id', '<E1>'));
--   -- Expected: 42501 RLS violation (C is not RSVP'd, not family).
--
--   INSERT INTO public.notifications (user_id, type, data)
--   VALUES ('<B>', 'event_invite', jsonb_build_object('event_id', '<E1>'));
--   -- Expected: success (B is RSVP'd).
-- ============================================================================
