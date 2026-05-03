-- ============================================================================
-- Migration: 20260503b_aangan_id_serial
-- Replace the random aangan_id generator with a sequence-backed one so the
-- IDs are AAN-1, AAN-2, … in join order — easier for Dadi to remember and
-- dictate over the phone than random AAN-X7K2P9 strings.
-- ----------------------------------------------------------------------------
-- Bug story (2026-05-03):
--   Kumar asked: "can u give aangan ID as serial number as per order of
--   joining instead of a random number?"
--
--   The original 20260430h generator picked 8 chars from a 32-char alphabet
--   each signup. Functional but unmemorable. Companion script
--   scripts/renumber_aangan_ids.py renumbered the 10 existing users by
--   created_at ASC; this migration switches the on-INSERT generator to
--   match so new signups continue the sequence.
--
-- Behaviour after this migration:
--   1st signup post-migration → AAN-{N+1} where N is the highest existing
--   serial. The sequence's setval at the bottom keeps it in sync.
-- ============================================================================

BEGIN;

-- ─── 1. Sequence ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.aangan_id_seq START 1;

-- ─── 2. Replace the generator ────────────────────────────────────────────────
-- New behaviour: nextval() of the sequence; defensive WHILE-loop in case the
-- sequence catches up to a row that's still on a legacy random ID (the
-- renumber script is idempotent so this should be empty in practice).
CREATE OR REPLACE FUNCTION public.generate_aangan_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
VOLATILE
AS $$
DECLARE
    v_serial BIGINT;
    v_code TEXT;
BEGIN
    LOOP
        v_serial := nextval('public.aangan_id_seq');
        v_code := 'AAN-' || v_serial::TEXT;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE aangan_id = v_code);
    END LOOP;
    RETURN v_code;
END;
$$;

-- (The BEFORE INSERT trigger from 20260430h already calls generate_aangan_id()
-- — no trigger change needed.)

-- ─── 3. Sync the sequence to the highest existing serial ─────────────────────
-- The renumber script (renumber_aangan_ids.py) ran first and assigned
-- AAN-1..AAN-N. setval() makes the very next nextval() return N+1. If for
-- some reason the table has no AAN-{int} rows, the sequence stays at 1.
DO $$
DECLARE
    v_max BIGINT;
BEGIN
    SELECT COALESCE(
        MAX(CAST(substring(aangan_id from 'AAN-([0-9]+)$') AS BIGINT)),
        0
    ) INTO v_max
    FROM public.users
    WHERE aangan_id ~ '^AAN-[0-9]+$';

    IF v_max > 0 THEN
        PERFORM setval('public.aangan_id_seq', v_max);
        RAISE NOTICE 'aangan_id_seq set to %; next signup will get AAN-%', v_max, v_max + 1;
    ELSE
        RAISE NOTICE 'No serial-format aangan_ids found yet; sequence starts at 1.';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- ============================================================================
-- Verification:
--   SELECT aangan_id FROM public.users ORDER BY created_at ASC LIMIT 5;
-- Expected after both this migration AND scripts/renumber_aangan_ids.py:
--   AAN-1, AAN-2, AAN-3, AAN-4, AAN-5
--
--   SELECT last_value FROM public.aangan_id_seq;
-- Expected: equals the count of users (or last assigned serial).
-- ============================================================================
