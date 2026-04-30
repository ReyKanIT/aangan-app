// ─────────────────────────────────────────────────────────────────────────────
// Family-tree kinship helpers — RN mirror of aangan_web/src/lib/familyKinship.ts
//
// Why this file exists:
//   Each row in family_members / offline_family_members carries a
//   `relationship_type` from the perspective of the row's `added_by` user.
//   When a *different* user views the row (via the family-of-family RLS
//   predicate), showing that raw label produces wildly wrong results — most
//   famously the 2026-04-30 "Chhayadevi shown as Kumar's पत्नी" bug, where
//   Kumar's brother Krishna had added his wife as 'wife' and Kumar saw it
//   verbatim.
//
// Approach:
//   For a viewer V looking at a row added by A about target T, we know:
//     * V→A   from V's family_members (the viewer's own connections)
//     * A→T   from the row's relationship_type
//   We compute V→T = compose(V→A, A→T) using a small lookup table covering
//   the everyday Indian-kinship cases. Anything not in the table falls back
//   to the row's stored Hindi label, prefixed with "via <adder name>" so the
//   user knows it's a transitive view rather than a direct relationship.
//
// RN ↔ web parity note:
//   This file is line-by-line identical to the web version EXCEPT for the
//   import — RN uses RELATIONSHIP_HINDI_LABEL from src/config/constants.ts
//   for English-key → Hindi lookup. Web uses RELATIONSHIP_MAP for the same
//   purpose (web's MAP is hindi-labels, RN's MAP is reverse-keys). Keep the
//   composition table in sync between the two files.
// ─────────────────────────────────────────────────────────────────────────────

import { RELATIONSHIP_HINDI_LABEL } from '../config/constants';

/** Raw relationship key (e.g. 'brother', 'wife', 'grandfather_paternal'). */
export type RelKey = string;

/**
 * Kinship composition table.
 * Index: composition[viewerToAdder]?.[adderToTarget] = viewerToTarget
 */
const COMPOSITION: Record<RelKey, Record<RelKey, RelKey | null>> = {
  brother: {
    wife: 'bhabhi',
    son: 'bhatija',
    daughter: 'bhatiji',
    father: 'father',
    mother: 'mother',
    brother: 'brother',
    sister: 'sister',
    grandfather_paternal: 'grandfather_paternal',
    grandmother_paternal: 'grandmother_paternal',
    grandfather_maternal: 'grandfather_maternal',
    grandmother_maternal: 'grandmother_maternal',
  },
  sister: {
    husband: 'jija',
    son: 'bhanja',
    daughter: 'bhanji',
    father: 'father',
    mother: 'mother',
    brother: 'brother',
    sister: 'sister',
    grandfather_paternal: 'grandfather_paternal',
    grandmother_paternal: 'grandmother_paternal',
    grandfather_maternal: 'grandfather_maternal',
    grandmother_maternal: 'grandmother_maternal',
  },
  father: {
    wife: 'mother',
    brother: 'uncle_paternal',
    sister: 'bua',
    father: 'grandfather_paternal',
    mother: 'grandmother_paternal',
    // father.son/daughter intentionally omitted — adder fathers most often
    // add nieces/nephews (cousins-of-viewer), not viewer's biological siblings.
  },
  mother: {
    husband: 'father',
    brother: 'uncle_maternal',
    sister: 'mausi',
    father: 'grandfather_maternal',
    mother: 'grandmother_maternal',
    // mother.son/daughter intentionally omitted — same reason as father.son.
  },
  husband: {
    brother: 'devar',
    sister: 'nanad',
    father: 'father_in_law',
    mother: 'mother_in_law',
    son: 'son',
    daughter: 'daughter',
  },
  wife: {
    brother: 'saala',
    sister: 'saali',
    father: 'father_in_law',
    mother: 'mother_in_law',
    son: 'son',
    daughter: 'daughter',
  },
  son: {
    wife: 'daughter_in_law',
    son: 'grandson_paternal',
    daughter: 'granddaughter_paternal',
  },
  daughter: {
    husband: 'son_in_law',
    son: 'grandson_maternal',
    daughter: 'granddaughter_maternal',
  },
  // grandparent.{son,daughter} intentionally omitted — grandparent's son
  // could be father OR uncle without lineage info. Fall through to via-X.
  grandfather_paternal: {},
  grandmother_paternal: {},
  grandfather_maternal: {},
  grandmother_maternal: {},
};

const COMPOSITION_NORMALIZE: Record<RelKey, RelKey> = {
  stepbrother: 'brother',
  half_brother: 'brother',
  stepsister: 'sister',
  half_sister: 'sister',
  stepfather: 'father',
  stepmother: 'mother',
  stepson: 'son',
  stepdaughter: 'daughter',
  adopted_son: 'son',
  adopted_daughter: 'daughter',
};

function normalize(rel: RelKey): RelKey {
  return COMPOSITION_NORMALIZE[rel] ?? rel;
}

/**
 * Compose two relationship keys. Returns the composed key, or null if the
 * combination isn't in the table (caller should fall back to via-X badge).
 */
export function composeRelationship(
  viewerToAdder: RelKey,
  adderToTarget: RelKey
): RelKey | null {
  const v = normalize(viewerToAdder);
  const a = normalize(adderToTarget);
  return COMPOSITION[v]?.[a] ?? null;
}

export interface DerivedLabelResult {
  hindiLabel: string;
  isDerived: boolean;
  viaAdderId: string | null;
  isFallback: boolean;
}

/**
 * High-level helper for the family-tree renderer.
 *
 * @param row        The offline/online row being rendered (from added_by's perspective).
 * @param viewerId   The current user's id.
 * @param viewerToAdderRel  Map of (other_user_id → viewer's relationship_type to that user).
 */
export function deriveRowLabel(
  row: { added_by: string; relationship_type: string; relationship_label_hindi: string | null },
  viewerId: string,
  viewerToAdderRel: Map<string, string>
): DerivedLabelResult {
  if (row.added_by === viewerId) {
    return {
      hindiLabel: row.relationship_label_hindi || RELATIONSHIP_HINDI_LABEL[row.relationship_type] || row.relationship_type,
      isDerived: false,
      viaAdderId: null,
      isFallback: false,
    };
  }

  const viewerToAdder = viewerToAdderRel.get(row.added_by);
  if (!viewerToAdder) {
    return {
      hindiLabel: row.relationship_label_hindi || RELATIONSHIP_HINDI_LABEL[row.relationship_type] || row.relationship_type,
      isDerived: false,
      viaAdderId: row.added_by,
      isFallback: true,
    };
  }

  const composed = composeRelationship(viewerToAdder, row.relationship_type);
  if (composed) {
    return {
      hindiLabel: RELATIONSHIP_HINDI_LABEL[composed] ?? composed,
      isDerived: true,
      viaAdderId: row.added_by,
      isFallback: false,
    };
  }

  return {
    hindiLabel: row.relationship_label_hindi || RELATIONSHIP_HINDI_LABEL[row.relationship_type] || row.relationship_type,
    isDerived: false,
    viaAdderId: row.added_by,
    isFallback: true,
  };
}
