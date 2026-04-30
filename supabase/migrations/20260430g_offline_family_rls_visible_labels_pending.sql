-- ============================================================================
-- Migration: 20260430g_offline_family_rls_visible_labels_pending
-- Reverts the over-tight RLS from 20260430f, restoring family-of-family
-- visibility. The wrong-LABEL UX bug (Chhaya showing as Kumar's "पत्नी")
-- moves to the UI layer: when displaying an offline row whose added_by
-- isn't the viewer, the UI must compute a derived label from the viewer's
-- perspective (e.g. Krishna's "wife" → Kumar's "भाभी"), not show the row's
-- raw relationship_label_hindi.
-- ----------------------------------------------------------------------------
-- Per Kumar 2026-04-30: "She can be in my overall view but for me her
-- relationship is not wife." The correct UX is:
--   * Chhaya is visible in Kumar's extended family
--   * Her label, from Kumar's perspective, is भाभी (brother's wife)
--   * Krishna sees her labeled पत्नी (his wife)
--
-- This migration restores VISIBILITY only. The DERIVED-LABEL feature is a
-- follow-up UI task (see TODO in aangan_web/src/stores/familyStore.ts and
-- the family-page renderer).
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Users can view their own offline family members" ON public.offline_family_members;
DROP POLICY IF EXISTS "Users can view offline family members" ON public.offline_family_members;

-- Restore the original "see your family-of-family rows" predicate. This is
-- the behavior that existed before 20260430f.
CREATE POLICY "Users can view offline family members"
    ON public.offline_family_members FOR SELECT
    USING (
        added_by = auth.uid()
        OR added_by IN (
            SELECT family_members.family_member_id
            FROM public.family_members
            WHERE family_members.user_id = auth.uid()
        )
    );

COMMIT;

-- ============================================================================
-- Follow-up TASK (UI):
--   In the family page renderer, when a member row's added_by != current
--   user, compute a derived relationship label using the graph:
--       viewer → adder → row.relationship_type
--   For example:
--       Krishna's wife (पत्नी) viewed by Kumar (Krishna's brother)
--       → Kumar's भाभी (brother's wife)
--   Use the RELATIONSHIP_REVERSE / RELATIONSHIP_HINDI_LABEL maps shipped
--   in aangan_rn/src/config/constants.ts (mirror to web in a follow-up).
--   Also: badge such rows with "via <adder display_name>" so user knows
--   which side of the family they came from.
-- ============================================================================
