-- ============================================================================
-- Migration: 20260430b_family_reciprocal_fix
-- P0 — fixes the catastrophic bug where every RN-added family relationship
--      stored the SAME relationship_type on both sides of the bidirectional
--      pair. After this migration, callers can pass the reverse Hindi label
--      AND existing corrupt rows are repaired.
-- ----------------------------------------------------------------------------
-- Bug summary (audit 2026-04-30):
--   aangan_rn/src/stores/familyStore.ts:77 looked up `RELATIONSHIP_MAP[key]`
--   where the map was Hindi-keyed but the caller passed English keys. 100%
--   miss → fell back to passing the SAME relationship_type as the reverse
--   → SQL `add_family_member_bidirectional` blindly stored both rows
--   identical → every RN-added pair has both directions equal.
--
-- This migration:
--   1. ADDs an optional `p_reverse_hindi TEXT DEFAULT NULL` parameter to
--      `add_family_member_bidirectional`. Existing web callers that pass
--      5 args continue to work unchanged.
--   2. Hardens the function with `SET search_path = public, pg_temp`.
--   3. Backfills corrupt bidirectional pairs using a server-side reverse
--      mapping table that mirrors the JS `RELATIONSHIP_MAP` introduced in
--      `aangan_rn/src/config/constants.ts`. Symmetric relationships (where
--      forward = reverse is correct, e.g. brother↔brother, cousin↔cousin)
--      are explicitly preserved.
--   4. Reports rowcount of repaired pairs in a NOTICE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Updated function signature with reverse Hindi label.
--    DROP first because we're changing the signature (5 → 6 args).
--    Existing 5-arg callers will hit the new function via PostgreSQL's
--    default-arg overloading.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_family_member_bidirectional(UUID, TEXT, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.add_family_member_bidirectional(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.add_family_member_bidirectional(
    p_member_id UUID,
    p_rel_type TEXT,
    p_rel_hindi TEXT,
    p_level INTEGER,
    p_reverse_type TEXT,
    p_reverse_hindi TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Forward row: caller is user_id, member is family_member_id.
    INSERT INTO public.family_members (
        user_id, family_member_id,
        relationship_type, relationship_label_hindi, connection_level
    )
    VALUES (auth.uid(), p_member_id, p_rel_type, p_rel_hindi, p_level)
    ON CONFLICT (user_id, family_member_id) DO UPDATE
    SET relationship_type = EXCLUDED.relationship_type,
        relationship_label_hindi = EXCLUDED.relationship_label_hindi,
        connection_level = EXCLUDED.connection_level,
        updated_at = NOW();

    -- Reverse row: member is user_id, caller is family_member_id.
    INSERT INTO public.family_members (
        user_id, family_member_id,
        relationship_type, relationship_label_hindi, connection_level
    )
    VALUES (p_member_id, auth.uid(), p_reverse_type, p_reverse_hindi, p_level)
    ON CONFLICT (user_id, family_member_id) DO UPDATE
    SET relationship_type = EXCLUDED.relationship_type,
        relationship_label_hindi = COALESCE(EXCLUDED.relationship_label_hindi, public.family_members.relationship_label_hindi),
        connection_level = EXCLUDED.connection_level,
        updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.add_family_member_bidirectional(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_family_member_bidirectional(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Backfill table: forward → reverse mapping mirroring the JS
--    RELATIONSHIP_MAP at `aangan_rn/src/config/constants.ts`. Used only for
--    the one-time data repair below; can be dropped after.
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _rel_reverse (forward TEXT PRIMARY KEY, reverse TEXT NOT NULL, reverse_hindi TEXT);

INSERT INTO _rel_reverse (forward, reverse, reverse_hindi) VALUES
    -- L1 immediate
    ('father', 'son', 'बेटा'),
    ('mother', 'son', 'बेटा'),
    ('son', 'father', 'पिता'),
    ('daughter', 'father', 'पिता'),
    ('brother', 'brother', 'भाई'),
    ('sister', 'brother', 'भाई'),
    ('husband', 'wife', 'पत्नी'),
    ('wife', 'husband', 'पति'),
    ('stepfather', 'son', 'बेटा'),
    ('stepmother', 'son', 'बेटा'),
    ('stepson', 'father', 'पिता'),
    ('stepdaughter', 'father', 'पिता'),
    ('stepbrother', 'brother', 'भाई'),
    ('stepsister', 'brother', 'भाई'),
    ('half_brother', 'half_brother', 'सौतेला भाई'),
    ('half_sister', 'half_brother', 'सौतेला भाई'),
    ('adopted_son', 'father', 'पिता'),
    ('adopted_daughter', 'father', 'पिता'),

    -- L2 grandparents / grandchildren
    ('grandfather_paternal', 'grandson_paternal', 'पोता'),
    ('grandmother_paternal', 'grandson_paternal', 'पोता'),
    ('grandfather_maternal', 'grandson_maternal', 'नाती'),
    ('grandmother_maternal', 'grandson_maternal', 'नाती'),
    ('grandson_paternal', 'grandfather_paternal', 'दादा'),
    ('granddaughter_paternal', 'grandfather_paternal', 'दादा'),
    ('grandson_maternal', 'grandfather_maternal', 'नाना'),
    ('granddaughter_maternal', 'grandfather_maternal', 'नाना'),
    ('grandson', 'grandfather_paternal', 'दादा'),
    ('granddaughter', 'grandfather_paternal', 'दादा'),

    -- L2 in-laws
    ('father_in_law', 'son_in_law', 'दामाद'),
    ('mother_in_law', 'daughter_in_law', 'बहू'),
    ('son_in_law', 'father_in_law', 'ससुर'),
    ('daughter_in_law', 'mother_in_law', 'सास'),

    -- L2 siblings-in-law (Indian-specific)
    ('jeth', 'bhabhi', 'भाभी'),
    ('jethani', 'devar', 'देवर'),
    ('devar', 'bhabhi', 'भाभी'),
    ('devrani', 'jeth', 'जेठ'),
    ('nanad', 'bhabhi', 'भाभी'),
    ('bhabhi', 'devar', 'देवर'),
    ('jija', 'saala', 'साला'),
    ('saala', 'jija', 'जीजा'),
    ('saali', 'jija', 'जीजा'),
    ('sandhu', 'sandhu', 'साढू'),
    ('brother_in_law', 'brother_in_law', 'देवर/जीजा'),
    ('sister_in_law', 'brother_in_law', 'देवर/जीजा'),

    -- L3 great-grandparents
    ('great_grandfather_paternal', 'great_grandson_paternal', 'परपोता'),
    ('great_grandmother_paternal', 'great_grandson_paternal', 'परपोता'),
    ('great_grandfather_maternal', 'great_grandson_maternal', 'परनाती'),
    ('great_grandmother_maternal', 'great_grandson_maternal', 'परनाती'),

    -- L3 uncles/aunts
    ('tau', 'bhatija', 'भतीजा'),
    ('tai', 'bhatija', 'भतीजा'),
    ('uncle_paternal', 'bhatija', 'भतीजा'),
    ('aunt_paternal', 'bhatija', 'भतीजा'),
    ('bua', 'bhatija', 'भतीजा'),
    ('fufa', 'bhatija', 'भतीजा'),
    ('uncle_maternal', 'bhanja', 'भांजा'),
    ('aunt_maternal', 'bhanja', 'भांजा'),
    ('mausi', 'bhanja', 'भांजा'),
    ('mausa', 'bhanja', 'भांजा'),

    -- L3 nephews/nieces
    ('bhatija', 'tau', 'ताऊ'),
    ('bhatiji', 'tau', 'ताऊ'),
    ('bhanja', 'uncle_maternal', 'मामा'),
    ('bhanji', 'uncle_maternal', 'मामा'),
    ('nephew', 'uncle_paternal', 'चाचा'),
    ('niece', 'uncle_paternal', 'चाचा'),

    -- L3 cousins (symmetric)
    ('cousin_brother_paternal', 'cousin_brother_paternal', 'चचेरा भाई'),
    ('cousin_sister_paternal', 'cousin_brother_paternal', 'चचेरा भाई'),
    ('cousin_brother_maternal', 'cousin_brother_maternal', 'ममेरा भाई'),
    ('cousin_sister_maternal', 'cousin_brother_maternal', 'ममेरा भाई'),
    ('cousin', 'cousin', 'चचेरा भाई/बहन'),

    -- L3 samdhi/samdhan
    ('samdhi', 'samdhi', 'समधी'),
    ('samdhan', 'samdhi', 'समधी'),

    -- Other
    ('other', 'other', 'अन्य')
ON CONFLICT (forward) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Identify and repair corrupt bidirectional pairs.
--    A "corrupt" pair: rows A→B and B→A both have the SAME relationship_type
--    AND that type is NOT in the symmetric set (where same-on-both-sides is
--    legitimate, e.g. brother↔brother).
--
--    Repair logic: keep A→B as-is, update B→A's relationship_type +
--    relationship_label_hindi to the correct reverse from _rel_reverse.
--    Only updates rows whose current type matches the forward — preserves
--    any pair that was correctly fixed manually after the bug.
-- ----------------------------------------------------------------------------
DO $repair$
DECLARE
    v_repaired INTEGER;
    v_symmetric_set TEXT[] := ARRAY[
        'brother', 'sister', 'cousin',
        'cousin_brother_paternal', 'cousin_sister_paternal',
        'cousin_brother_maternal', 'cousin_sister_maternal',
        'half_brother', 'half_sister',
        'sandhu', 'brother_in_law', 'sister_in_law',
        'samdhi', 'samdhan', 'other'
    ];
BEGIN
    -- For each pair where both sides hold the same (asymmetric) relationship,
    -- the row where (user_id, family_member_id) is the LARGER tuple is rewritten.
    -- We pick the larger tuple as the "reverse" arbitrarily — the application
    -- treats either direction as equally authoritative.
    WITH corrupt_pairs AS (
        SELECT a.user_id AS forward_user,
               a.family_member_id AS forward_member,
               a.relationship_type AS rel,
               a.connection_level AS lvl
        FROM public.family_members a
        JOIN public.family_members b
          ON a.user_id = b.family_member_id
         AND a.family_member_id = b.user_id
        WHERE a.relationship_type = b.relationship_type
          AND NOT (a.relationship_type = ANY(v_symmetric_set))
          AND a.user_id < a.family_member_id  -- pick one canonical pair
    )
    UPDATE public.family_members fm
    SET relationship_type = r.reverse,
        relationship_label_hindi = r.reverse_hindi,
        updated_at = NOW()
    FROM corrupt_pairs cp
    JOIN _rel_reverse r ON r.forward = cp.rel
    WHERE fm.user_id = cp.forward_member
      AND fm.family_member_id = cp.forward_user
      AND fm.relationship_type = cp.rel;

    GET DIAGNOSTICS v_repaired = ROW_COUNT;
    RAISE NOTICE 'Repaired % corrupt bidirectional family_members rows.', v_repaired;
END
$repair$;

DROP TABLE _rel_reverse;

COMMIT;

-- ============================================================================
-- Verification (run post-apply, expect 0 rows after repair):
--
-- WITH symmetric AS (
--   SELECT unnest(ARRAY[
--     'brother','sister','cousin',
--     'cousin_brother_paternal','cousin_sister_paternal',
--     'cousin_brother_maternal','cousin_sister_maternal',
--     'half_brother','half_sister',
--     'sandhu','brother_in_law','sister_in_law',
--     'samdhi','samdhan','other'
--   ]) AS rel
-- )
-- SELECT a.user_id, a.family_member_id, a.relationship_type
-- FROM public.family_members a
-- JOIN public.family_members b
--   ON a.user_id = b.family_member_id
--  AND a.family_member_id = b.user_id
-- WHERE a.relationship_type = b.relationship_type
--   AND a.relationship_type NOT IN (SELECT rel FROM symmetric);
--
-- Expected: 0 rows.
-- ============================================================================
