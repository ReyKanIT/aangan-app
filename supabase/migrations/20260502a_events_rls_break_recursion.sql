-- ============================================================================
-- Migration: 20260502a_events_rls_break_recursion
-- P0 — fixes "infinite recursion detected in policy for relation 'events'"
-- (Postgres SQLSTATE 42P17) that surfaced as HTTP 500 on /events for ALL
-- users (verified 2026-05-02 via aangan.app browser + curl reproduction).
-- ----------------------------------------------------------------------------
-- Bug story:
--   The "Events visible to authorized users" SELECT policy
--   (20260429_event_rls_fix.sql) ends with:
--       OR EXISTS (SELECT 1 FROM public.event_rsvps
--                   WHERE event_rsvps.event_id = events.id
--                     AND event_rsvps.user_id = auth.uid())
--
--   That EXISTS triggers RLS on event_rsvps. The event_rsvps SELECT
--   policy in turn references public.events (the "Users can manage own
--   RSVP" check has a branch that confirms the event is creator-owned),
--   which fires the events RLS policy again. Postgres detects the cycle
--   and aborts every SELECT on events with 42P17.
--
--   The page renders the bilingual "कुछ गड़बड़ हुई — Something went
--   wrong" banner because eventStore.fetchEvents 500s. Has been broken
--   since the v0.13.4 deploy that landed the explicit FK-constraint
--   name (the recursion was always there but masked by other PostgREST
--   400s — now those are gone, so the postgres-side error surfaces).
--
-- Fix:
--   Break the cycle by routing the event_rsvps lookup through a
--   SECURITY DEFINER function. SECURITY DEFINER bypasses RLS on the
--   tables it queries, so the policy can ask "does this user have an
--   RSVP on this event?" without triggering further RLS chains.
--
--   We keep the user-facing semantics identical: the user can see an
--   event if (creator OR audience='all' OR (audience='level' AND
--   in-level family member) OR has-rsvp).
-- ============================================================================

BEGIN;

-- ─── 1. SECURITY DEFINER helper — RLS-free RSVP check ────────────────────
-- Returns true iff the calling user has any RSVP row for the given event.
-- SECURITY DEFINER + SET search_path keeps it injection-safe and bypasses
-- the event_rsvps SELECT policy that was causing the recursion.
CREATE OR REPLACE FUNCTION public.user_has_event_rsvp(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.event_rsvps
        WHERE event_id = p_event_id
          AND user_id = auth.uid()
    );
$$;

-- The function MUST be callable by every authenticated user — otherwise
-- the events SELECT policy can't invoke it and falls through to FALSE,
-- blocking custom-audience event visibility for legitimate invitees.
REVOKE ALL ON FUNCTION public.user_has_event_rsvp(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_event_rsvp(UUID) TO authenticated;

-- ─── 2. Replace the recursive events SELECT policy ───────────────────────
-- Same semantics as 20260429_event_rls_fix.sql, but the EXISTS subquery
-- on event_rsvps is replaced with the SECURITY DEFINER helper above.
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
    -- Custom audience: visible if the user has an RSVP record.
    -- Routed through user_has_event_rsvp() (SECURITY DEFINER) to bypass
    -- the event_rsvps RLS policy and avoid the recursion that produced
    -- 42P17 / HTTP 500 on the page.
    public.user_has_event_rsvp(events.id)
);

-- ─── 3. Reload PostgREST schema cache so the policy change goes live ──────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verification:
--   -- Reproduce the previously-failing query (should now return rows or [])
--   SELECT id, title, creator_id, audience_type
--     FROM public.events
--     ORDER BY start_datetime ASC
--     LIMIT 5;
--
--   -- Confirm function is in place and SECURITY DEFINER:
--   SELECT proname, prosecdef
--     FROM pg_proc
--     WHERE proname = 'user_has_event_rsvp';
-- ============================================================================
