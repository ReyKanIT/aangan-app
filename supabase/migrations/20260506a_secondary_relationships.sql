-- ============================================================================
-- Migration: 20260506a_secondary_relationships
-- Allow a family member to carry MORE THAN ONE relationship to "me".
-- Kumar's request 2026-05-06: "बुआ की बेटी married to मौसी का बेटा" — she's
-- both my cousin sister AND my भाभी.
--
-- The family_members + offline_family_members tables already have
-- (user_id, family_member_id) as PRIMARY KEY, so a second row would
-- collide. Rather than a heavy multi-row redesign, we add a JSONB
-- ARRAY of secondary relationships on the existing row. The primary
-- relationship stays in the existing relationship_type / relationship_label_hindi
-- columns (no breaking change); secondaries layer on top.
--
-- Each secondary entry shape:
--   {
--     "type": "bhabhi",                       -- relationship key
--     "label_hindi": "भाभी",                  -- display label
--     "label_en": "Sister-in-law",            -- English fallback
--     "via_member_id": "<uuid>",              -- optional: connecting relative
--     "via_label": "मौसी का बेटा",            -- optional: free-text describing the path
--     "added_at": "2026-05-06T20:00:00+05:30" -- set by RPC
--   }
--
-- The order in the JSON array IS significant — the UI renders them in
-- order, and remove_secondary_relationship takes an index. Append-only
-- via add_secondary_relationship; never directly UPDATE the column from
-- the client (RLS allows it, but the RPC enforces structural validation).
-- ============================================================================

BEGIN;

-- ─── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.family_members
    ADD COLUMN IF NOT EXISTS secondary_relationships JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.offline_family_members
    ADD COLUMN IF NOT EXISTS secondary_relationships JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Per-row sanity check: must be a JSON array.
ALTER TABLE public.family_members
    DROP CONSTRAINT IF EXISTS family_members_secondary_relationships_array_check;
ALTER TABLE public.family_members
    ADD CONSTRAINT family_members_secondary_relationships_array_check
    CHECK (jsonb_typeof(secondary_relationships) = 'array');

ALTER TABLE public.offline_family_members
    DROP CONSTRAINT IF EXISTS offline_family_members_secondary_relationships_array_check;
ALTER TABLE public.offline_family_members
    ADD CONSTRAINT offline_family_members_secondary_relationships_array_check
    CHECK (jsonb_typeof(secondary_relationships) = 'array');

-- ─── 2. RPC: add_secondary_relationship ──────────────────────────────────────
-- Append a relationship to the array on either family_members or
-- offline_family_members. Authorisation: caller must be the row's user_id
-- (online) or added_by (offline). Errors out if the relationship type is
-- already present in the array (deduped) or matches the primary
-- relationship_type (would just be a duplicate of the primary).
CREATE OR REPLACE FUNCTION public.add_secondary_relationship(
    p_pair_member_id        UUID,
    p_relationship_type     TEXT,
    p_label_hindi           TEXT,
    p_label_en              TEXT DEFAULT NULL,
    p_via_member_id         UUID DEFAULT NULL,
    p_via_label             TEXT DEFAULT NULL,
    p_is_offline            BOOLEAN DEFAULT FALSE,
    p_offline_id            UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller       UUID := auth.uid();
    v_existing     JSONB;
    v_primary_type TEXT;
    v_new_entry    JSONB;
    v_updated      JSONB;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_relationship_type IS NULL OR length(trim(p_relationship_type)) = 0 THEN
        RAISE EXCEPTION 'relationship_type required';
    END IF;

    IF p_label_hindi IS NULL OR length(trim(p_label_hindi)) = 0 THEN
        RAISE EXCEPTION 'label_hindi required';
    END IF;

    -- Build the new entry (created_at always server-side, never client).
    v_new_entry := jsonb_build_object(
        'type',          p_relationship_type,
        'label_hindi',   p_label_hindi,
        'label_en',      p_label_en,
        'via_member_id', p_via_member_id::text,
        'via_label',     p_via_label,
        'added_at',      to_jsonb(NOW())
    );

    IF p_is_offline THEN
        -- Offline row: caller must be the adder.
        IF p_offline_id IS NULL THEN
            RAISE EXCEPTION 'p_offline_id required for offline rows';
        END IF;
        SELECT secondary_relationships, relationship_type
          INTO v_existing, v_primary_type
          FROM public.offline_family_members
         WHERE id = p_offline_id AND added_by = v_caller;
        IF v_existing IS NULL THEN
            RAISE EXCEPTION 'Offline row not found or not yours';
        END IF;
        -- Reject if duplicate of primary or already in secondaries.
        IF v_primary_type = p_relationship_type THEN
            RAISE EXCEPTION 'Already the primary relationship';
        END IF;
        IF v_existing @> jsonb_build_array(jsonb_build_object('type', p_relationship_type)) THEN
            RAISE EXCEPTION 'Relationship type already in secondaries';
        END IF;
        v_updated := v_existing || jsonb_build_array(v_new_entry);
        UPDATE public.offline_family_members
            SET secondary_relationships = v_updated,
                updated_at              = NOW()
            WHERE id = p_offline_id;
    ELSE
        -- Online row: caller must be the user_id side.
        SELECT secondary_relationships, relationship_type
          INTO v_existing, v_primary_type
          FROM public.family_members
         WHERE user_id = v_caller AND family_member_id = p_pair_member_id;
        IF v_existing IS NULL THEN
            RAISE EXCEPTION 'Family-member row not found or not yours';
        END IF;
        IF v_primary_type = p_relationship_type THEN
            RAISE EXCEPTION 'Already the primary relationship';
        END IF;
        IF v_existing @> jsonb_build_array(jsonb_build_object('type', p_relationship_type)) THEN
            RAISE EXCEPTION 'Relationship type already in secondaries';
        END IF;
        v_updated := v_existing || jsonb_build_array(v_new_entry);
        UPDATE public.family_members
            SET secondary_relationships = v_updated
            WHERE user_id = v_caller AND family_member_id = p_pair_member_id;
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.add_secondary_relationship(UUID, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_secondary_relationship(UUID, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, UUID) TO authenticated;

-- ─── 3. RPC: remove_secondary_relationship ───────────────────────────────────
-- Remove the entry at p_index (0-based). Caller must own the row.
CREATE OR REPLACE FUNCTION public.remove_secondary_relationship(
    p_pair_member_id  UUID,
    p_index           INT,
    p_is_offline      BOOLEAN DEFAULT FALSE,
    p_offline_id      UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller   UUID := auth.uid();
    v_existing JSONB;
    v_updated  JSONB;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_index < 0 THEN
        RAISE EXCEPTION 'Invalid index';
    END IF;

    IF p_is_offline THEN
        IF p_offline_id IS NULL THEN
            RAISE EXCEPTION 'p_offline_id required for offline rows';
        END IF;
        SELECT secondary_relationships INTO v_existing
          FROM public.offline_family_members
         WHERE id = p_offline_id AND added_by = v_caller;
        IF v_existing IS NULL THEN
            RAISE EXCEPTION 'Offline row not found or not yours';
        END IF;
        IF p_index >= jsonb_array_length(v_existing) THEN
            RAISE EXCEPTION 'Index out of range';
        END IF;
        v_updated := v_existing - p_index;
        UPDATE public.offline_family_members
            SET secondary_relationships = v_updated,
                updated_at              = NOW()
            WHERE id = p_offline_id;
    ELSE
        SELECT secondary_relationships INTO v_existing
          FROM public.family_members
         WHERE user_id = v_caller AND family_member_id = p_pair_member_id;
        IF v_existing IS NULL THEN
            RAISE EXCEPTION 'Family-member row not found or not yours';
        END IF;
        IF p_index >= jsonb_array_length(v_existing) THEN
            RAISE EXCEPTION 'Index out of range';
        END IF;
        v_updated := v_existing - p_index;
        UPDATE public.family_members
            SET secondary_relationships = v_updated
            WHERE user_id = v_caller AND family_member_id = p_pair_member_id;
    END IF;

    RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_secondary_relationship(UUID, INT, BOOLEAN, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_secondary_relationship(UUID, INT, BOOLEAN, UUID) TO authenticated;

-- ─── 4. Reload PostgREST schema cache ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verification:
--
--   -- Column exists on both tables:
--   SELECT table_name, column_name
--     FROM information_schema.columns
--    WHERE table_schema='public'
--      AND column_name='secondary_relationships';
--   -- Expected: 2 rows (family_members, offline_family_members).
--
--   -- RPCs exist + are callable by authenticated:
--   SELECT proname
--     FROM pg_proc
--    WHERE proname IN ('add_secondary_relationship','remove_secondary_relationship');
--   -- Expected: 2 rows.
--
--   -- Smoke test as authenticated user:
--   SELECT public.add_secondary_relationship(
--     '<some_member_id>'::uuid, 'bhabhi', 'भाभी', 'Sister-in-law',
--     NULL, 'मौसी का बेटा', FALSE, NULL);
--   -- Should return the new array. Re-running with same type errors out.
-- ============================================================================
