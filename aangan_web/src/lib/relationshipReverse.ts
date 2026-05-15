// ─────────────────────────────────────────────────────────────────────────────
// relationshipReverse — single source of truth for the inverse of every
// relationship key in RELATIONSHIP_OPTIONS.
//
// When user A adds user B as their <rel>, B's row for A must be written
// with the *reverse* of <rel>. Example: if A says "B is my chacha", then
// B's row about A should say "A is my bhatija" (or bhatiji if A is female).
//
// Why centralized:
//   The catalogue grew from ~25 → 60+ keys (chacha, taa, mama, mausa,
//   devar, jeth, bua, fufa, bhabhi, jija, samdhi, etc.) but the local
//   REVERSE_MAP duplicated in EditRelationshipModal.tsx and
//   AddMemberDrawer.tsx still only covered ~25 generic keys. Anything
//   missing fell back to 'other', which produced wrong reverse rows for
//   the second family member. This module fixes that.
//
// Gender handling:
//   Some reverses depend on the viewer's gender. e.g. parent → son if
//   viewer is male else daughter. The plain map picks a sensible default
//   (usually masculine for legacy parity with the previous local maps);
//   call `getReverse(rel, viewerGender)` when the viewer's gender is
//   known to get the gendered reverse.
//
// Symmetric / ambiguous cases:
//   sibling↔sibling, cousin↔cousin, generic brother_in_law/sister_in_law
//   are kept symmetric because there is no Hindi term that disambiguates
//   them without more context (whose side, elder/younger, etc.).
// ─────────────────────────────────────────────────────────────────────────────

export type ViewerGender = 'M' | 'F';

/**
 * Default (gender-neutral / masculine-default) reverse for every
 * relationship key in RELATIONSHIP_OPTIONS. When we have to pick one
 * gendered reverse without knowing the viewer's gender we default to
 * the masculine variant — same convention the prior local map used
 * (father→son, grandfather→grandson). Use `getReverse(rel, gender)`
 * to get the gender-correct reverse when gender is available.
 */
export const REVERSE_RELATIONSHIP: Record<string, string> = {
  // ── L1 — Immediate ─────────────────────────────────────────
  father: 'son',
  mother: 'son',
  son: 'father',
  daughter: 'father',
  brother: 'brother',
  sister: 'brother',
  husband: 'wife',
  wife: 'husband',
  stepfather: 'stepson',
  stepmother: 'stepson',
  stepson: 'stepfather',
  stepdaughter: 'stepfather',
  stepbrother: 'stepbrother',
  stepsister: 'stepbrother',
  half_brother: 'half_brother',
  half_sister: 'half_brother',
  adopted_son: 'father',
  adopted_daughter: 'father',

  // ── L2 — Grandparents / grandchildren ───────────────────────
  grandfather_paternal: 'grandson_paternal',
  grandmother_paternal: 'grandson_paternal',
  grandfather_maternal: 'grandson_maternal',
  grandmother_maternal: 'grandson_maternal',
  grandson_paternal: 'grandfather_paternal',
  granddaughter_paternal: 'grandfather_paternal',
  grandson_maternal: 'grandfather_maternal',
  granddaughter_maternal: 'grandfather_maternal',
  grandson: 'grandfather_paternal',
  granddaughter: 'grandfather_paternal',

  // ── L2 — In-laws (parents & children) ───────────────────────
  father_in_law: 'son_in_law',
  mother_in_law: 'daughter_in_law',
  son_in_law: 'father_in_law',
  daughter_in_law: 'mother_in_law',

  // ── L2 — Siblings-in-law (Indian-specific) ──────────────────
  // jeth = husband's elder brother → for him, viewer is younger
  //   brother's wife = devrani.
  jeth: 'devrani',
  jethani: 'devrani', // jeth's wife → viewer is the younger brother's wife
  devar: 'bhabhi',    // husband's younger brother → viewer is bhabhi
  devrani: 'jethani', // devar's wife → viewer is jethani (elder brother's wife)
  nanad: 'bhabhi',    // husband's sister → viewer is bhabhi
  bhabhi: 'devar',    // brother's wife → for her, viewer is devar (default M)
  jija: 'saala',      // sister's husband → for him, viewer is saala (default M)
  saala: 'jija',      // wife's brother → for him, viewer is jija
  saali: 'jija',      // wife's sister → for her, viewer is jija
  sandhu: 'sandhu',   // wife's sister's husband — symmetric (each is sandhu to the other)
  brother_in_law: 'brother_in_law', // generic — symmetric without more context
  sister_in_law: 'sister_in_law',   // generic — symmetric without more context

  // ── L3 — Great-grandparents ────────────────────────────────
  great_grandfather_paternal: 'grandson_paternal',
  great_grandmother_paternal: 'grandson_paternal',
  great_grandfather_maternal: 'grandson_maternal',
  great_grandmother_maternal: 'grandson_maternal',

  // ── L3 — Uncles / Aunts (paternal vs maternal) ─────────────
  // Father's elder/younger brother + their wives → viewer is bhatija/bhatiji
  // (brother's son/daughter). Father's sister + her husband → viewer is
  // also bhatija/bhatiji (sister's child) but we keep bhatija for symmetry
  // with how the existing UI groups paternal-side reverses.
  tau: 'bhatija',
  tai: 'bhatija',
  uncle_paternal: 'bhatija',  // chacha
  aunt_paternal: 'bhatija',   // chachi
  bua: 'bhanja',              // father's sister → viewer is bhanja (sister's son)
  fufa: 'bhanja',             // bua's husband → viewer is bhanja
  uncle_maternal: 'bhanja',   // mama → viewer is bhanja (sister's son)
  aunt_maternal: 'bhanja',    // mami → viewer is bhanja
  mausi: 'bhanja',            // mother's sister → viewer is bhanja
  mausa: 'bhanja',            // mausi's husband → viewer is bhanja

  // ── L3 — Nephews & nieces (brother's vs sister's) ──────────
  bhatija: 'uncle_paternal',  // brother's son → viewer is chacha (default younger uncle)
  bhatiji: 'uncle_paternal',  // brother's daughter → viewer is chacha
  bhanja: 'uncle_maternal',   // sister's son → viewer is mama
  bhanji: 'uncle_maternal',   // sister's daughter → viewer is mama
  nephew: 'uncle_paternal',
  niece: 'uncle_paternal',

  // ── L3 — Cousins (symmetric — no more-specific reverse) ────
  cousin_brother_paternal: 'cousin_brother_paternal',
  cousin_sister_paternal: 'cousin_brother_paternal',
  cousin_brother_maternal: 'cousin_brother_maternal',
  cousin_sister_maternal: 'cousin_brother_maternal',
  cousin: 'cousin',

  // ── L3 — Samdhi / samdhan (parents of child's spouse) ──────
  // Symmetric across the two families — each side's parents are
  // samdhi/samdhan to the other.
  samdhi: 'samdhi',
  samdhan: 'samdhi',

  // ── Other / Custom ──────────────────────────────────────────
  other: 'other',
};

/**
 * Gender-aware overrides applied on top of REVERSE_RELATIONSHIP. Only
 * lists the keys whose reverse changes based on viewer gender. Keys
 * not present here use REVERSE_RELATIONSHIP unchanged regardless of
 * gender (e.g. cousin↔cousin is symmetric in Hindi).
 *
 * "Viewer" = the OTHER person (the one whose row we're writing about).
 * If A says "B is my father" and A is female, B's row for A should be
 * "daughter" — so we look up father → { F: 'daughter' }.
 */
const GENDERED_OVERRIDES: Record<string, Partial<Record<ViewerGender, string>>> = {
  // Parents → child (gendered child)
  father:        { M: 'son',          F: 'daughter' },
  mother:        { M: 'son',          F: 'daughter' },
  stepfather:    { M: 'stepson',      F: 'stepdaughter' },
  stepmother:    { M: 'stepson',      F: 'stepdaughter' },
  adopted_son:   { M: 'father',       F: 'mother' },
  adopted_daughter: { M: 'father',    F: 'mother' },

  // Children → parent (gendered parent)
  son:           { M: 'father',       F: 'mother' },
  daughter:      { M: 'father',       F: 'mother' },
  stepson:       { M: 'stepfather',   F: 'stepmother' },
  stepdaughter:  { M: 'stepfather',   F: 'stepmother' },

  // Spouse
  husband:       { M: 'husband',      F: 'wife' },   // edge: same-sex; default to gender of viewer
  wife:          { M: 'husband',      F: 'wife' },

  // Siblings — gendered
  brother:       { M: 'brother',      F: 'sister' },
  sister:        { M: 'brother',      F: 'sister' },
  stepbrother:   { M: 'stepbrother',  F: 'stepsister' },
  stepsister:    { M: 'stepbrother',  F: 'stepsister' },
  half_brother:  { M: 'half_brother', F: 'half_sister' },
  half_sister:   { M: 'half_brother', F: 'half_sister' },

  // Grandparents → grandchildren (gendered)
  grandfather_paternal:   { M: 'grandson_paternal',   F: 'granddaughter_paternal' },
  grandmother_paternal:   { M: 'grandson_paternal',   F: 'granddaughter_paternal' },
  grandfather_maternal:   { M: 'grandson_maternal',   F: 'granddaughter_maternal' },
  grandmother_maternal:   { M: 'grandson_maternal',   F: 'granddaughter_maternal' },
  grandson:               { M: 'grandfather_paternal', F: 'grandmother_paternal' },
  granddaughter:          { M: 'grandfather_paternal', F: 'grandmother_paternal' },
  grandson_paternal:      { M: 'grandfather_paternal', F: 'grandmother_paternal' },
  granddaughter_paternal: { M: 'grandfather_paternal', F: 'grandmother_paternal' },
  grandson_maternal:      { M: 'grandfather_maternal', F: 'grandmother_maternal' },
  granddaughter_maternal: { M: 'grandfather_maternal', F: 'grandmother_maternal' },

  // Great-grandparents
  great_grandfather_paternal: { M: 'grandson_paternal', F: 'granddaughter_paternal' },
  great_grandmother_paternal: { M: 'grandson_paternal', F: 'granddaughter_paternal' },
  great_grandfather_maternal: { M: 'grandson_maternal', F: 'granddaughter_maternal' },
  great_grandmother_maternal: { M: 'grandson_maternal', F: 'granddaughter_maternal' },

  // In-laws — parent / child of spouse
  father_in_law:    { M: 'son_in_law',     F: 'daughter_in_law' },
  mother_in_law:    { M: 'son_in_law',     F: 'daughter_in_law' },
  son_in_law:       { M: 'father_in_law',  F: 'mother_in_law' },
  daughter_in_law:  { M: 'father_in_law',  F: 'mother_in_law' },

  // Aunts/uncles → nephews/nieces (gendered)
  tau:             { M: 'bhatija', F: 'bhatiji' },
  tai:             { M: 'bhatija', F: 'bhatiji' },
  uncle_paternal:  { M: 'bhatija', F: 'bhatiji' },
  aunt_paternal:   { M: 'bhatija', F: 'bhatiji' },
  bua:             { M: 'bhanja',  F: 'bhanji' },
  fufa:            { M: 'bhanja',  F: 'bhanji' },
  uncle_maternal:  { M: 'bhanja',  F: 'bhanji' },
  aunt_maternal:   { M: 'bhanja',  F: 'bhanji' },
  mausi:           { M: 'bhanja',  F: 'bhanji' },
  mausa:           { M: 'bhanja',  F: 'bhanji' },

  // Nephews/nieces → uncles/aunts (gendered)
  bhatija: { M: 'uncle_paternal', F: 'aunt_paternal' },
  bhatiji: { M: 'uncle_paternal', F: 'aunt_paternal' },
  bhanja:  { M: 'uncle_maternal', F: 'aunt_maternal' },
  bhanji:  { M: 'uncle_maternal', F: 'aunt_maternal' },
  nephew:  { M: 'uncle_paternal', F: 'aunt_paternal' },
  niece:   { M: 'uncle_paternal', F: 'aunt_paternal' },

  // Cousins — gendered cousin term
  cousin_brother_paternal: { M: 'cousin_brother_paternal', F: 'cousin_sister_paternal' },
  cousin_sister_paternal:  { M: 'cousin_brother_paternal', F: 'cousin_sister_paternal' },
  cousin_brother_maternal: { M: 'cousin_brother_maternal', F: 'cousin_sister_maternal' },
  cousin_sister_maternal:  { M: 'cousin_brother_maternal', F: 'cousin_sister_maternal' },
  cousin:                  { M: 'cousin', F: 'cousin' },

  // In-law siblings — gendered viewer disambiguates jeth/jethani etc.
  jeth:    { M: 'devar',    F: 'devrani' },   // for husband's elder brother, viewer is younger brother (devar) or his wife (devrani)
  jethani: { M: 'devar',    F: 'devrani' },
  devar:   { M: 'jeth',     F: 'bhabhi' },    // devar's view: elder brother (jeth) if M, or bhabhi if F
  devrani: { M: 'jeth',     F: 'jethani' },
  nanad:   { M: 'bhai',     F: 'bhabhi' },    // nanad = husband's sister — for her, viewer is brother or bhabhi; 'bhai' isn't a key, fallback handled below
  bhabhi:  { M: 'devar',    F: 'nanad' },     // brother's wife — for her, viewer is devar or nanad
  jija:    { M: 'saala',    F: 'saali' },     // sister's husband — for him, viewer is saala/saali
  saala:   { M: 'jija',     F: 'bhabhi' },    // wife's brother — for him, viewer is jija (her husband) or bhabhi (the other woman)
  saali:   { M: 'jija',     F: 'bhabhi' },
  sandhu:  { M: 'sandhu',   F: 'sandhu' },

  // Samdhi/samdhan symmetric across families, gendered by viewer
  samdhi:  { M: 'samdhi',  F: 'samdhan' },
  samdhan: { M: 'samdhi',  F: 'samdhan' },
};

// Sanitize the override above: a few entries reference labels that
// aren't actual keys in RELATIONSHIP_OPTIONS (e.g. plain "bhai" doesn't
// exist — the catalogue uses "brother"). Map these onto valid keys.
const KEY_ALIASES: Record<string, string> = {
  bhai: 'brother',
};

/**
 * Returns the relationship key that should be stored on the OTHER
 * family member's row. `viewerGender` is the gender of that other
 * family member (the one we're writing the reverse for). When
 * undefined, falls back to the gender-neutral default in
 * REVERSE_RELATIONSHIP.
 *
 * Always returns a non-empty string — falls back to 'other' if `rel`
 * is unknown so callers can rely on a valid relationship_type value.
 */
export function getReverse(rel: string, viewerGender?: ViewerGender): string {
  if (!rel) return 'other';
  if (viewerGender) {
    const override = GENDERED_OVERRIDES[rel]?.[viewerGender];
    if (override) {
      return KEY_ALIASES[override] ?? override;
    }
  }
  const fallback = REVERSE_RELATIONSHIP[rel];
  if (fallback) return KEY_ALIASES[fallback] ?? fallback;
  return 'other';
}
