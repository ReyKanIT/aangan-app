-- ============================================================================
-- Migration: 20260430i_offline_family_pii_safe_view
-- P0 — closes the PII leak introduced when the family-of-family visibility
-- was restored in 20260430g.
-- ----------------------------------------------------------------------------
-- Bug story (2026-04-30, found in pre-store security audit):
--   After 20260430g restored the SELECT policy:
--       added_by = auth.uid()
--       OR added_by IN (SELECT family_member_id FROM family_members
--                       WHERE user_id = auth.uid())
--   any user could SELECT * from offline_family_members and read every
--   mobile_number / email / date_of_birth / current_address that any of
--   their family members had ever entered for THEIR offline contacts.
--
--   Concrete leak: Kumar adds Krishna as family. Krishna had previously
--   entered Chhayadevi's mobile + email + DOB + home address as her
--   offline contact. Today Kumar can `SELECT mobile_number, email,
--   date_of_birth, current_address FROM offline_family_members WHERE
--   added_by = '<krishna-uuid>'` and exfiltrate all of it. Same applies
--   to every offline contact of every family member he's added.
--
--   This is TRAI / DPDP-class PII exposure and a Play / App Store
--   reviewability risk for an app aimed at Indian families.
--
-- Fix:
--   1. Tighten the table's SELECT policy back to OWNER-ONLY (the
--      20260430f intent). Direct SELECT now leaks nothing across users.
--   2. Add a SECURITY DEFINER RPC `get_visible_offline_family_members()`
--      that returns the family-of-family superset Kumar wanted, but with
--      mobile_number / email / date_of_birth / current_address NULLED
--      whenever the row's added_by is not the caller. Owner sees their
--      own PII; everyone else sees the social skeleton (name, relation,
--      village, deceased flag, photo) and nothing else.
--   3. Web/RN clients switch from `.from('offline_family_members')` to
--      `supabase.rpc('get_visible_offline_family_members')`.
--
-- Side effect: any unauthorized PII access stops immediately at the DB
-- layer. Existing code that does SELECT * from the table directly will
-- now only see the caller's own rows — which is the intended behavior
-- and the same as what 20260430f enforced. The lookup RPC restores the
-- "see your tree, not their PII" UX.
-- ============================================================================

BEGIN;

-- ─── 1. Re-tighten SELECT to owner-only ─────────────────────────────────────
-- Belt-and-suspenders: even if the RPC is bypassed (e.g. a future code
-- path forgets to use it), direct SELECT across users is impossible.
DROP POLICY IF EXISTS "Users can view their own offline family members" ON public.offline_family_members;
DROP POLICY IF EXISTS "Users can view offline family members" ON public.offline_family_members;

CREATE POLICY "Users can view their own offline family members"
    ON public.offline_family_members FOR SELECT
    USING (added_by = auth.uid());

-- ─── 2. PII-safe view RPC for family-of-family visibility ───────────────────
-- Returns the same row shape as the table, but with PII columns redacted
-- when added_by != auth.uid(). Owner rows pass through unchanged so the
-- "edit my own offline contacts" flow still works. Calling user must be
-- authenticated; auth.uid() is verified before the query runs.
CREATE OR REPLACE FUNCTION public.get_visible_offline_family_members()
RETURNS TABLE (
    id UUID,
    added_by UUID,
    display_name TEXT,
    display_name_hindi TEXT,
    relationship_type TEXT,
    relationship_label_hindi TEXT,
    custom_relationship_label TEXT,
    connection_level INTEGER,
    is_deceased BOOLEAN,
    village_city TEXT,
    current_address TEXT,
    avatar_url TEXT,
    mobile_number TEXT,
    email TEXT,
    date_of_birth DATE,
    date_of_death DATE,
    birth_year INTEGER,
    death_year INTEGER,
    gender TEXT,
    occupation TEXT,
    notes TEXT,
    linked_user_id UUID,
    is_confirmed BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        o.id,
        o.added_by,
        o.display_name,
        o.display_name_hindi,
        o.relationship_type,
        o.relationship_label_hindi,
        o.custom_relationship_label,
        o.connection_level,
        o.is_deceased,
        o.village_city,
        -- ── PII columns: redacted unless caller owns the row ──
        CASE WHEN o.added_by = auth.uid() THEN o.current_address ELSE NULL END AS current_address,
        o.avatar_url,
        CASE WHEN o.added_by = auth.uid() THEN o.mobile_number   ELSE NULL END AS mobile_number,
        CASE WHEN o.added_by = auth.uid() THEN o.email           ELSE NULL END AS email,
        CASE WHEN o.added_by = auth.uid() THEN o.date_of_birth   ELSE NULL END AS date_of_birth,
        o.date_of_death,
        CASE WHEN o.added_by = auth.uid() THEN o.birth_year      ELSE NULL END AS birth_year,
        o.death_year,
        o.gender,
        o.occupation,
        CASE WHEN o.added_by = auth.uid() THEN o.notes           ELSE NULL END AS notes,
        o.linked_user_id,
        o.is_confirmed,
        o.created_at,
        o.updated_at
    FROM public.offline_family_members o
    WHERE o.added_by = auth.uid()
       OR o.added_by IN (
            SELECT fm.family_member_id
            FROM public.family_members fm
            WHERE fm.user_id = auth.uid()
       )
    ORDER BY o.connection_level ASC, o.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_visible_offline_family_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_offline_family_members() TO authenticated;

COMMENT ON FUNCTION public.get_visible_offline_family_members() IS
'Returns offline_family_members visible to the caller (own + family-of-family) with PII columns (mobile, email, DOB, address, notes, birth_year) redacted on rows the caller does not own. Replaces direct SELECT FROM offline_family_members in client code.';

COMMIT;

-- ============================================================================
-- Verification:
--   -- As Kumar: own rows include mobile_number; Krishna's rows have NULL.
--   SELECT added_by, display_name, mobile_number, email
--   FROM public.get_visible_offline_family_members();
--
--   -- Direct SELECT must now return only the caller's own rows:
--   SELECT count(*) FROM public.offline_family_members;
--   -- (= count of rows where added_by = auth.uid())
-- ============================================================================
