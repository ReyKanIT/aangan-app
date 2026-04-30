-- ============================================================================
-- Migration: 20260430e_family_level_backfill
-- P1 — corrects connection_level on rows where the user input the wrong
--      level when adding a family member (e.g. नाना stored as L1 instead
--      of L2). Backfills both family_members and offline_family_members.
-- ----------------------------------------------------------------------------
-- The relationship → level mapping mirrors RELATIONSHIP_OPTIONS in
-- aangan_web/src/lib/constants.ts (single source of truth).
-- Idempotent: only updates rows whose stored level differs from canonical.
-- ============================================================================

BEGIN;

CREATE TEMP TABLE _correct_levels (rel TEXT PRIMARY KEY, lvl INTEGER NOT NULL);

INSERT INTO _correct_levels (rel, lvl) VALUES
    -- L1
    ('father', 1), ('mother', 1), ('son', 1), ('daughter', 1),
    ('brother', 1), ('sister', 1), ('husband', 1), ('wife', 1),
    ('stepfather', 1), ('stepmother', 1), ('stepson', 1), ('stepdaughter', 1),
    ('stepbrother', 1), ('stepsister', 1),
    ('half_brother', 1), ('half_sister', 1),
    ('adopted_son', 1), ('adopted_daughter', 1),
    -- L2
    ('grandfather_paternal', 2), ('grandmother_paternal', 2),
    ('grandfather_maternal', 2), ('grandmother_maternal', 2),
    ('grandson_paternal', 2), ('granddaughter_paternal', 2),
    ('grandson_maternal', 2), ('granddaughter_maternal', 2),
    ('grandson', 2), ('granddaughter', 2),
    ('father_in_law', 2), ('mother_in_law', 2),
    ('son_in_law', 2), ('daughter_in_law', 2),
    ('jeth', 2), ('jethani', 2), ('devar', 2), ('devrani', 2),
    ('nanad', 2), ('bhabhi', 2), ('jija', 2),
    ('saala', 2), ('saali', 2), ('sandhu', 2),
    ('brother_in_law', 2), ('sister_in_law', 2),
    -- L3
    ('great_grandfather_paternal', 3), ('great_grandmother_paternal', 3),
    ('great_grandfather_maternal', 3), ('great_grandmother_maternal', 3),
    ('tau', 3), ('tai', 3),
    ('uncle_paternal', 3), ('aunt_paternal', 3),
    ('bua', 3), ('fufa', 3),
    ('uncle_maternal', 3), ('aunt_maternal', 3),
    ('mausi', 3), ('mausa', 3),
    ('bhatija', 3), ('bhatiji', 3), ('bhanja', 3), ('bhanji', 3),
    ('nephew', 3), ('niece', 3),
    ('cousin_brother_paternal', 3), ('cousin_sister_paternal', 3),
    ('cousin_brother_maternal', 3), ('cousin_sister_maternal', 3),
    ('cousin', 3),
    ('samdhi', 3), ('samdhan', 3)
ON CONFLICT (rel) DO NOTHING;

-- Note: deliberately NOT covering 'other' — that one is user-defined
-- and the user picks the level themselves.

UPDATE public.offline_family_members ofm
SET connection_level = cl.lvl
FROM _correct_levels cl
WHERE ofm.relationship_type = cl.rel
  AND ofm.connection_level <> cl.lvl;

UPDATE public.family_members fm
SET connection_level = cl.lvl
FROM _correct_levels cl
WHERE fm.relationship_type = cl.rel
  AND fm.connection_level <> cl.lvl;

DROP TABLE _correct_levels;

COMMIT;
