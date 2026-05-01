-- ============================================================================
-- Migration: 20260501a_update_family_member_relationship
-- Adds an UPDATE counterpart to add_family_member_bidirectional so users
-- can correct an existing family_members row's relationship without
-- having to remove + re-add.
-- ----------------------------------------------------------------------------
-- Background:
--   When the relationship catalogue expanded from ~20 to 60+ options
--   (the v0.4 / v0.10 family-tree overhaul), users who had added members
--   with the old small list got stuck — there was no way to update the
--   relationship in-place. Kumar's verbal ask: "Allow one time to change
--   the relationship of members as earlier very smalllist was there."
--
--   Doing a direct UPDATE from the client would only fix one side of
--   the bidirectional pair (the viewer's own row), leaving the other
--   user's reciprocal row stale. This RPC updates BOTH sides
--   atomically — same pattern as add_family_member_bidirectional from
--   migration 20260430b.
--
-- Auth: SECURITY DEFINER, callable by `authenticated` only. The RPC
--   verifies the caller actually has a family_members row pointing to
--   p_member_id (i.e. they're entitled to relabel that connection)
--   before writing.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_family_member_relationship(
    p_member_id UUID,
    p_rel_type TEXT,
    p_rel_hindi TEXT,
    p_level INTEGER,
    p_reverse_type TEXT,
    p_reverse_hindi TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller UUID;
    v_existing INT;
BEGIN
    v_caller := auth.uid();
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Validate inputs (loose — app constrains to RELATIONSHIP_OPTIONS).
    IF p_rel_type IS NULL OR length(trim(p_rel_type)) = 0 OR length(p_rel_type) > 64 THEN
        RAISE EXCEPTION 'rel_type required';
    END IF;
    IF p_reverse_type IS NULL OR length(trim(p_reverse_type)) = 0 OR length(p_reverse_type) > 64 THEN
        RAISE EXCEPTION 'reverse_type required';
    END IF;
    IF p_level IS NULL OR p_level < 1 OR p_level > 99 THEN
        RAISE EXCEPTION 'level must be 1..99';
    END IF;

    -- Confirm the caller actually has a row connecting them to p_member_id.
    -- This is what prevents anyone from relabeling a stranger's connection.
    SELECT count(*) INTO v_existing
    FROM public.family_members
    WHERE user_id = v_caller AND family_member_id = p_member_id;

    IF v_existing = 0 THEN
        RAISE EXCEPTION 'No existing family connection between caller and member';
    END IF;

    -- 1. Update the caller's view of the relationship.
    UPDATE public.family_members
       SET relationship_type = p_rel_type,
           relationship_label_hindi = COALESCE(p_rel_hindi, relationship_label_hindi),
           connection_level = p_level
     WHERE user_id = v_caller
       AND family_member_id = p_member_id;

    -- 2. Update the OTHER user's reciprocal row (if it exists — RLS-respecting:
    -- we use SECURITY DEFINER to bypass the other user's RLS, but only because
    -- the relationship is mutual by definition. If the reciprocal row was
    -- never written (legacy data or a one-sided add), skip silently — the
    -- caller's view is the source of truth for THEIR display.
    UPDATE public.family_members
       SET relationship_type = p_reverse_type,
           relationship_label_hindi = COALESCE(p_reverse_hindi, relationship_label_hindi),
           connection_level = p_level
     WHERE user_id = p_member_id
       AND family_member_id = v_caller;
END;
$$;

REVOKE ALL ON FUNCTION public.update_family_member_relationship(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_family_member_relationship(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.update_family_member_relationship(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) IS
'Update the relationship label/type/level on an existing family_members pair. Caller must have an existing connection to p_member_id. Updates both sides of the bidirectional pair atomically. Mirror of add_family_member_bidirectional (20260430b) for in-place relationship corrections.';

COMMIT;
