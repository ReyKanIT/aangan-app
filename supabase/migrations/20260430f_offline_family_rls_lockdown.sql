-- ============================================================================
-- Migration: 20260430f_offline_family_rls_lockdown
-- P0 — closes a privacy/UX leak in offline_family_members.
-- ----------------------------------------------------------------------------
-- Bug story (2026-04-30):
--   The previous SELECT policy on offline_family_members was:
--     ((added_by = auth.uid())
--      OR (added_by IN (SELECT family_members.family_member_id
--                       FROM family_members
--                       WHERE family_members.user_id = auth.uid())))
--
--   Intent was probably "let me see my relatives' offline contacts so we can
--   build a shared tree". Reality is much worse:
--     Kumar adds his brother Krishna as a family member.
--     Krishna had previously added his wife Chhayadevi as his offline
--     "पत्नी" (wife) row.
--     Now Kumar's family page shows Chhayadevi labeled as पत्नी (wife)
--     because the OR clause leaks Krishna's offline list, AND because
--     each row carries the LABEL the original adder gave it.
--   Kumar reports: "Chaya is my brother's wife, find out why she is shown
--   as my wife — it is very critical bug."
--
-- Fix: tighten SELECT to own rows only.
--   Each user manages their OWN offline contacts. If Kumar wants Chhayadevi
--   in his tree, he adds her himself with the relationship "भाभी" (brother's
--   wife). Krishna keeps his own row labeling her पत्नी. Both rows reference
--   the same human, but each user's labels reflect their relationship.
--
-- Side effect: any existing user who relied on the cross-user visibility
-- loses it. Given Kumar reports it as a critical bug, this is the desired
-- behavior. Future enhancement: a "shared tree" feature that explicitly
-- allows linking each row to a single canonical person record (out of scope
-- here).
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Users can view offline family members" ON public.offline_family_members;

CREATE POLICY "Users can view their own offline family members"
    ON public.offline_family_members FOR SELECT
    USING (added_by = auth.uid());

COMMIT;

-- ============================================================================
-- Verification (as Kumar, after re-login):
--   SELECT count(*) FROM public.offline_family_members;
-- Expected: only Kumar's own rows (4 — KamtaPrasad नाना, Bhagwania नानी,
-- Sumaina अन्य, Lalji अन्य). Chhayadevi (Krishna's wife) should NOT appear.
-- ============================================================================
