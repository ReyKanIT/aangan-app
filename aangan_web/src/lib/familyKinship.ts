// ─────────────────────────────────────────────────────────────────────────────
// Family-tree kinship helpers
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
// This is intentionally a simple 2-hop composition table — no full kinship
// algebra. It handles the common shapes that show up in real family trees
// (brother's wife, sister's husband, parent's parent, child's spouse,
// child's child, etc.) and gracefully degrades for rare combinations.
// ─────────────────────────────────────────────────────────────────────────────

import { RELATIONSHIP_MAP } from './constants';

/** Raw relationship key (e.g. 'brother', 'wife', 'grandfather_paternal'). */
export type RelKey = string;

/**
 * Kinship composition table.
 * Index: composition[viewerToAdder]?.[adderToTarget] = viewerToTarget
 *
 * Returns a relationship key from RELATIONSHIP_OPTIONS (or null when there
 * is no clean single-word reverse and we should fall back to "via X").
 *
 * Conventions:
 *   - Where Indian kinship is gender-asymmetric and we don't know the
 *     target's gender, we default to the male form (matches the existing
 *     RELATIONSHIP_MAP behavior used for reciprocal writes).
 *   - 'brother' covers stepbrother / half_brother in the input direction
 *     for the common cases — the caller normalizes those upstream.
 */
const COMPOSITION: Record<RelKey, Record<RelKey, RelKey | null>> = {
  // ── Viewer → Brother → ___ ─────────────────────────────────────────────
  brother: {
    wife: 'bhabhi',                  // brother's wife → भाभी
    son: 'bhatija',                  // brother's son  → भतीजा
    daughter: 'bhatiji',             // brother's daughter → भतीजी
    father: 'father',                // brother's father = my father
    mother: 'mother',                // brother's mother = my mother
    brother: 'brother',              // brother's brother = my brother
    sister: 'sister',                // brother's sister = my sister
    grandfather_paternal: 'grandfather_paternal',
    grandmother_paternal: 'grandmother_paternal',
    grandfather_maternal: 'grandfather_maternal',
    grandmother_maternal: 'grandmother_maternal',
  },
  // ── Viewer → Sister → ___ ──────────────────────────────────────────────
  sister: {
    husband: 'jija',                 // sister's husband → जीजा
    son: 'bhanja',                   // sister's son  → भांजा
    daughter: 'bhanji',              // sister's daughter → भांजी
    father: 'father',
    mother: 'mother',
    brother: 'brother',
    sister: 'sister',
    grandfather_paternal: 'grandfather_paternal',
    grandmother_paternal: 'grandmother_paternal',
    grandfather_maternal: 'grandfather_maternal',
    grandmother_maternal: 'grandmother_maternal',
  },
  // ── Viewer → Father → ___ ──────────────────────────────────────────────
  father: {
    wife: 'mother',                  // father's wife = my mother
    brother: 'uncle_paternal',       // father's brother → चाचा (could be ताऊ; default younger)
    sister: 'bua',                   // father's sister → बुआ
    father: 'grandfather_paternal',  // father's father → दादा
    mother: 'grandmother_paternal',  // father's mother → दादी
    // father.son/daughter is INTENTIONALLY OMITTED — would naively reduce
    // to "brother"/"sister", but in practice fathers add their nieces and
    // nephews (brother's children = चचेरे, sister's children = ममेरे)
    // far more often than they add the viewer's own siblings. Falling
    // through to the "via पिता" fallback is safer than confidently wrong.
    // See pre-store code-review 2026-04-30.
  },
  // ── Viewer → Mother → ___ ──────────────────────────────────────────────
  mother: {
    husband: 'father',               // mother's husband = my father
    brother: 'uncle_maternal',       // mother's brother → मामा
    sister: 'mausi',                 // mother's sister → मौसी
    father: 'grandfather_maternal',  // mother's father → नाना
    mother: 'grandmother_maternal',  // mother's mother → नानी
    // mother.son/daughter intentionally omitted — see father.son note above.
  },
  // ── Viewer → Husband → ___ ─────────────────────────────────────────────
  husband: {
    brother: 'devar',                // husband's brother → देवर (or जेठ if elder; default younger)
    sister: 'nanad',                 // husband's sister → ननद
    father: 'father_in_law',
    mother: 'mother_in_law',
    son: 'son',
    daughter: 'daughter',
  },
  // ── Viewer → Wife → ___ ────────────────────────────────────────────────
  wife: {
    brother: 'saala',                // wife's brother → साला
    sister: 'saali',                 // wife's sister → साली
    father: 'father_in_law',
    mother: 'mother_in_law',
    son: 'son',
    daughter: 'daughter',
  },
  // ── Viewer → Son → ___ ─────────────────────────────────────────────────
  son: {
    wife: 'daughter_in_law',         // son's wife → बहू
    son: 'grandson_paternal',        // son's son → पोता
    daughter: 'granddaughter_paternal',
  },
  // ── Viewer → Daughter → ___ ────────────────────────────────────────────
  daughter: {
    husband: 'son_in_law',           // daughter's husband → दामाद
    son: 'grandson_maternal',        // daughter's son → नाती
    daughter: 'granddaughter_maternal',
  },
  // ── Viewer → Grandparent → ___ ─────────────────────────────────────────
  // grandparent.son/daughter is INTENTIONALLY OMITTED — a grandparent's
  // son could be the viewer's father OR uncle (taa/chacha/mama). Without
  // the specific lineage we cannot disambiguate, so falling through to
  // "via दादा / नाना" is safer than a confidently wrong label.
  // Spouse-of-grandparent reductions kept (paternal grandparents → bua,
  // maternal → mausi) are dropped for the same reason.
  grandfather_paternal: {},
  grandmother_paternal: {},
  grandfather_maternal: {},
  grandmother_maternal: {},
};

// Stepbrother / half_brother / stepsister normalize to their plain forms
// for composition lookup purposes (the gendered direction is what matters
// for the everyday cases the table covers).
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
 * combination isn't in the table (in which case the caller should fall back
 * to the row's stored label with a "via X" badge).
 */
export function composeRelationship(
  viewerToAdder: RelKey,
  adderToTarget: RelKey
): RelKey | null {
  const v = normalize(viewerToAdder);
  const a = normalize(adderToTarget);
  return COMPOSITION[v]?.[a] ?? null;
}

/**
 * High-level helper for the family-tree renderer.
 *
 * @param row        The offline/online row being rendered (from added_by's perspective).
 * @param viewerId   The current user's id.
 * @param viewerToAdderRel  Map of (other_user_id → viewer's relationship_type to that user).
 *                          Built from the viewer's own family_members rows.
 * @returns          { hindiLabel, isDerived, viaAdderId } — feed into the card.
 */
export interface DerivedLabelResult {
  /** The label to show on the card. */
  hindiLabel: string;
  /** True if we computed this label from the viewer's perspective. */
  isDerived: boolean;
  /** The adder's id when isDerived (for the "via X" badge), null otherwise. */
  viaAdderId: string | null;
  /** True when we couldn't compose and fell back to the raw label. */
  isFallback: boolean;
}

export function deriveRowLabel(
  row: { added_by: string; relationship_type: string; relationship_label_hindi: string | null },
  viewerId: string,
  viewerToAdderRel: Map<string, string>
): DerivedLabelResult {
  // Row added by the viewer themselves → label is correct as stored.
  if (row.added_by === viewerId) {
    return {
      hindiLabel: row.relationship_label_hindi || RELATIONSHIP_MAP[row.relationship_type] || row.relationship_type,
      isDerived: false,
      viaAdderId: null,
      isFallback: false,
    };
  }

  const viewerToAdder = viewerToAdderRel.get(row.added_by);
  if (!viewerToAdder) {
    // Adder isn't in viewer's family graph (shouldn't happen given current
    // RLS, but be defensive). Fall back to raw label with via flag.
    return {
      hindiLabel: row.relationship_label_hindi || RELATIONSHIP_MAP[row.relationship_type] || row.relationship_type,
      isDerived: false,
      viaAdderId: row.added_by,
      isFallback: true,
    };
  }

  const composed = composeRelationship(viewerToAdder, row.relationship_type);
  if (composed) {
    return {
      hindiLabel: RELATIONSHIP_MAP[composed] ?? composed,
      isDerived: true,
      viaAdderId: row.added_by,
      isFallback: false,
    };
  }

  // No composition rule — show the raw relationship but mark via.
  return {
    hindiLabel: row.relationship_label_hindi || RELATIONSHIP_MAP[row.relationship_type] || row.relationship_type,
    isDerived: false,
    viaAdderId: row.added_by,
    isFallback: true,
  };
}
