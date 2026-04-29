// ─────────────────────────────────────────────────────────────────────────────
// Site URL — single source of truth for absolute URLs (sitemap, OG, share
// links, calendar UIDs, server-rendered metadata). Resolution order:
//   1. NEXT_PUBLIC_SITE_URL env (set in Vercel project settings + .env.local)
//   2. VERCEL_URL (Vercel sets this automatically on every deploy/preview)
//   3. Fallback to https://aangan.app for local builds run without env.
// Use SITE_URL.toString() (no trailing slash) when concatenating paths.
// ─────────────────────────────────────────────────────────────────────────────
export const SITE_URL: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.startsWith('http')) return explicit.replace(/\/$/, '');
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'https://aangan.app';
})();

/** Build an absolute URL for `path` (e.g. "/events/123"). */
export function siteUrl(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return SITE_URL + cleanPath;
}

export const VALIDATION = {
  phoneLength: 10,
  phoneRegex: /^[6-9]\d{9}$/,
  otpLength: 6,
  otpTimer: 60,
  minDisplayNameLength: 2,
  maxDisplayNameLength: 50,
  maxBioLength: 200,
  maxPostLength: 2000,
  maxPhotosPerUpload: 20,
  maxCommentLength: 500,
  maxMessageLength: 1000,
};

// ─────────────────────────────────────────────────────────────────────────────
// Relationship catalogue
//
// `level` is the canonical L1/L2/L3 bucket — single source of truth for the
// family-tree level filter. The user does NOT pick a level — picking the
// relationship fixes it. "other" is L3 by default.
//
// `generation` is the tree-layout row, relative to "you":
//    +2 great-grandparents, +1.5 grandparents, +1 parents/uncles/aunts,
//     0 self/spouse/siblings/cousins/sibling-in-law,
//    -1 children/nephews/nieces/in-law-children,
//    -2 grandchildren, -2.5 great-grandchildren.
//   `samdhi/samdhan` are also generation +1 (parents of your child's spouse).
// ─────────────────────────────────────────────────────────────────────────────

export type RelationshipLevel = 1 | 2 | 3;

export interface RelationshipOption {
  key: string;
  hindi: string;
  english: string;
  level: RelationshipLevel;
  generation: number; // relative to self (0)
  group: 'immediate' | 'grandparents' | 'in_laws' | 'extended' | 'great' | 'other';
}

export const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  // ── L1 — Immediate / सीधा ──
  { key: 'father',           hindi: 'पिता',     english: 'Father',           level: 1, generation:  1, group: 'immediate' },
  { key: 'mother',           hindi: 'माँ',      english: 'Mother',           level: 1, generation:  1, group: 'immediate' },
  { key: 'son',              hindi: 'बेटा',     english: 'Son',              level: 1, generation: -1, group: 'immediate' },
  { key: 'daughter',         hindi: 'बेटी',     english: 'Daughter',         level: 1, generation: -1, group: 'immediate' },
  { key: 'brother',          hindi: 'भाई',      english: 'Brother',          level: 1, generation:  0, group: 'immediate' },
  { key: 'sister',           hindi: 'बहन',      english: 'Sister',           level: 1, generation:  0, group: 'immediate' },
  { key: 'husband',          hindi: 'पति',      english: 'Husband',          level: 1, generation:  0, group: 'immediate' },
  { key: 'wife',             hindi: 'पत्नी',    english: 'Wife',             level: 1, generation:  0, group: 'immediate' },
  { key: 'stepfather',       hindi: 'सौतेला पिता',  english: 'Stepfather',   level: 1, generation:  1, group: 'immediate' },
  { key: 'stepmother',       hindi: 'सौतेली माँ',   english: 'Stepmother',   level: 1, generation:  1, group: 'immediate' },
  { key: 'stepson',          hindi: 'सौतेला बेटा',  english: 'Stepson',      level: 1, generation: -1, group: 'immediate' },
  { key: 'stepdaughter',     hindi: 'सौतेली बेटी',  english: 'Stepdaughter', level: 1, generation: -1, group: 'immediate' },
  { key: 'stepbrother',      hindi: 'सौतेला भाई',   english: 'Stepbrother',  level: 1, generation:  0, group: 'immediate' },
  { key: 'stepsister',       hindi: 'सौतेली बहन',   english: 'Stepsister',   level: 1, generation:  0, group: 'immediate' },
  { key: 'half_brother',     hindi: 'सौतेला भाई',   english: 'Half-brother', level: 1, generation:  0, group: 'immediate' },
  { key: 'half_sister',      hindi: 'सौतेली बहन',   english: 'Half-sister',  level: 1, generation:  0, group: 'immediate' },
  { key: 'adopted_son',      hindi: 'गोद लिया बेटा', english: 'Adopted son', level: 1, generation: -1, group: 'immediate' },
  { key: 'adopted_daughter', hindi: 'गोद ली बेटी',   english: 'Adopted daughter', level: 1, generation: -1, group: 'immediate' },

  // ── L2 — Grandparents / दादा-दादी, नाना-नानी ──
  { key: 'grandfather_paternal', hindi: 'दादा',  english: 'Grandfather (paternal)', level: 2, generation:  2, group: 'grandparents' },
  { key: 'grandmother_paternal', hindi: 'दादी',  english: 'Grandmother (paternal)', level: 2, generation:  2, group: 'grandparents' },
  { key: 'grandfather_maternal', hindi: 'नाना',  english: 'Grandfather (maternal)', level: 2, generation:  2, group: 'grandparents' },
  { key: 'grandmother_maternal', hindi: 'नानी',  english: 'Grandmother (maternal)', level: 2, generation:  2, group: 'grandparents' },

  // ── L2 — Grandchildren ──
  { key: 'grandson_paternal',     hindi: 'पोता',   english: "Grandson (son's son)",       level: 2, generation: -2, group: 'grandparents' },
  { key: 'granddaughter_paternal', hindi: 'पोती',  english: "Granddaughter (son's daughter)", level: 2, generation: -2, group: 'grandparents' },
  { key: 'grandson_maternal',     hindi: 'नाती',   english: "Grandson (daughter's son)",   level: 2, generation: -2, group: 'grandparents' },
  { key: 'granddaughter_maternal', hindi: 'नातिन', english: "Granddaughter (daughter's daughter)", level: 2, generation: -2, group: 'grandparents' },
  { key: 'grandson',         hindi: 'पोता/नाती',     english: 'Grandson',         level: 2, generation: -2, group: 'grandparents' },
  { key: 'granddaughter',    hindi: 'पोती/नातिन',    english: 'Granddaughter',    level: 2, generation: -2, group: 'grandparents' },

  // ── L2 — In-laws (parents & children) ──
  { key: 'father_in_law',    hindi: 'ससुर',     english: 'Father-in-law',    level: 2, generation:  1, group: 'in_laws' },
  { key: 'mother_in_law',    hindi: 'सास',      english: 'Mother-in-law',    level: 2, generation:  1, group: 'in_laws' },
  { key: 'son_in_law',       hindi: 'दामाद',    english: 'Son-in-law',       level: 2, generation: -1, group: 'in_laws' },
  { key: 'daughter_in_law',  hindi: 'बहू',      english: 'Daughter-in-law',  level: 2, generation: -1, group: 'in_laws' },

  // ── L2 — Siblings-in-law (Indian-specific) ──
  { key: 'jeth',             hindi: 'जेठ',      english: "Husband's elder brother",    level: 2, generation: 0, group: 'in_laws' },
  { key: 'jethani',          hindi: 'जेठानी',   english: "Jeth's wife",                level: 2, generation: 0, group: 'in_laws' },
  { key: 'devar',            hindi: 'देवर',     english: "Husband's younger brother",  level: 2, generation: 0, group: 'in_laws' },
  { key: 'devrani',          hindi: 'देवरानी',  english: "Devar's wife",               level: 2, generation: 0, group: 'in_laws' },
  { key: 'nanad',            hindi: 'ननद',      english: "Husband's sister",           level: 2, generation: 0, group: 'in_laws' },
  { key: 'bhabhi',           hindi: 'भाभी',     english: "Brother's wife",             level: 2, generation: 0, group: 'in_laws' },
  { key: 'jija',             hindi: 'जीजा',     english: "Sister's husband",           level: 2, generation: 0, group: 'in_laws' },
  { key: 'saala',            hindi: 'साला',     english: "Wife's brother",             level: 2, generation: 0, group: 'in_laws' },
  { key: 'saali',            hindi: 'साली',     english: "Wife's sister",              level: 2, generation: 0, group: 'in_laws' },
  { key: 'sandhu',           hindi: 'साढू',     english: "Wife's sister's husband",    level: 2, generation: 0, group: 'in_laws' },
  { key: 'brother_in_law',   hindi: 'देवर/जीजा',    english: 'Brother-in-law',   level: 2, generation: 0, group: 'in_laws' },
  { key: 'sister_in_law',    hindi: 'ननद/भाभी',     english: 'Sister-in-law',    level: 2, generation: 0, group: 'in_laws' },

  // ── L3 — Great-grandparents ──
  { key: 'great_grandfather_paternal', hindi: 'परदादा',   english: 'Great-grandfather (paternal)', level: 3, generation: 3, group: 'great' },
  { key: 'great_grandmother_paternal', hindi: 'परदादी',   english: 'Great-grandmother (paternal)', level: 3, generation: 3, group: 'great' },
  { key: 'great_grandfather_maternal', hindi: 'परनाना',   english: 'Great-grandfather (maternal)', level: 3, generation: 3, group: 'great' },
  { key: 'great_grandmother_maternal', hindi: 'परनानी',   english: 'Great-grandmother (maternal)', level: 3, generation: 3, group: 'great' },

  // ── L3 — Uncles/Aunts (paternal vs maternal) ──
  { key: 'tau',              hindi: 'ताऊ',      english: "Father's elder brother",  level: 3, generation: 1, group: 'extended' },
  { key: 'tai',              hindi: 'ताई',      english: "Tau's wife",              level: 3, generation: 1, group: 'extended' },
  { key: 'uncle_paternal',   hindi: 'चाचा',     english: "Father's younger brother", level: 3, generation: 1, group: 'extended' },
  { key: 'aunt_paternal',    hindi: 'चाची',     english: "Chacha's wife",            level: 3, generation: 1, group: 'extended' },
  { key: 'bua',              hindi: 'बुआ',      english: "Father's sister",          level: 3, generation: 1, group: 'extended' },
  { key: 'fufa',             hindi: 'फूफा',     english: "Bua's husband",            level: 3, generation: 1, group: 'extended' },
  { key: 'uncle_maternal',   hindi: 'मामा',     english: "Mother's brother",         level: 3, generation: 1, group: 'extended' },
  { key: 'aunt_maternal',    hindi: 'मामी',     english: "Mama's wife",              level: 3, generation: 1, group: 'extended' },
  { key: 'mausi',            hindi: 'मौसी',     english: "Mother's sister",          level: 3, generation: 1, group: 'extended' },
  { key: 'mausa',            hindi: 'मौसा',     english: "Mausi's husband",          level: 3, generation: 1, group: 'extended' },

  // ── L3 — Nephews & nieces (brother's vs sister's) ──
  { key: 'bhatija',          hindi: 'भतीजा',    english: "Brother's son",      level: 3, generation: -1, group: 'extended' },
  { key: 'bhatiji',          hindi: 'भतीजी',    english: "Brother's daughter", level: 3, generation: -1, group: 'extended' },
  { key: 'bhanja',           hindi: 'भांजा',    english: "Sister's son",       level: 3, generation: -1, group: 'extended' },
  { key: 'bhanji',           hindi: 'भांजी',    english: "Sister's daughter",  level: 3, generation: -1, group: 'extended' },
  { key: 'nephew',           hindi: 'भतीजा',    english: 'Nephew',             level: 3, generation: -1, group: 'extended' },
  { key: 'niece',            hindi: 'भतीजी',    english: 'Niece',              level: 3, generation: -1, group: 'extended' },

  // ── L3 — Cousins ──
  { key: 'cousin_brother_paternal', hindi: 'चचेरा भाई', english: 'Cousin brother (paternal)', level: 3, generation: 0, group: 'extended' },
  { key: 'cousin_sister_paternal',  hindi: 'चचेरी बहन', english: 'Cousin sister (paternal)',  level: 3, generation: 0, group: 'extended' },
  { key: 'cousin_brother_maternal', hindi: 'ममेरा भाई', english: 'Cousin brother (maternal)', level: 3, generation: 0, group: 'extended' },
  { key: 'cousin_sister_maternal',  hindi: 'ममेरी बहन', english: 'Cousin sister (maternal)',  level: 3, generation: 0, group: 'extended' },
  { key: 'cousin',                  hindi: 'चचेरा भाई/बहन', english: 'Cousin',                level: 3, generation: 0, group: 'extended' },

  // ── L3 — Samdhi/Samdhan (parents of child's spouse — elder generation) ──
  { key: 'samdhi',           hindi: 'समधी',     english: "Child's father-in-law", level: 3, generation: 1, group: 'extended' },
  { key: 'samdhan',          hindi: 'समधन',     english: "Child's mother-in-law", level: 3, generation: 1, group: 'extended' },

  // ── Other / Custom ──
  { key: 'other',            hindi: 'अन्य',     english: 'Other (custom)',        level: 3, generation: 0, group: 'other' },
];

// Hindi label lookup — kept as Record<string,string> for backward compatibility
// with existing callers (RELATIONSHIP_MAP[type]).
export const RELATIONSHIP_MAP: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((r) => [r.key, r.hindi])
);

export const RELATIONSHIP_LEVEL: Record<string, RelationshipLevel> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((r) => [r.key, r.level])
);

export const RELATIONSHIP_GENERATION: Record<string, number> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((r) => [r.key, r.generation])
);

export function getRelationshipLevel(key: string): RelationshipLevel {
  return RELATIONSHIP_LEVEL[key] ?? 3;
}

export function getRelationshipGeneration(key: string): number {
  return RELATIONSHIP_GENERATION[key] ?? 0;
}

export const GENDER_OPTIONS = [
  { value: 'male',   hindi: 'पुरुष', english: 'Male' },
  { value: 'female', hindi: 'महिला', english: 'Female' },
  { value: 'other',  hindi: 'अन्य',  english: 'Other' },
];

export const EVENT_TYPES = [
  { value: 'wedding', label: 'विवाह', emoji: '💍' },
  { value: 'birthday', label: 'जन्मदिन', emoji: '🎂' },
  { value: 'puja', label: 'पूजा', emoji: '🪔' },
  { value: 'festival', label: 'त्योहार', emoji: '🎉' },
  { value: 'reunion', label: 'मिलन', emoji: '👨‍👩‍👧‍👦' },
  { value: 'other', label: 'अन्य', emoji: '📅' },
];

export const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'सभी परिवार', sublabel: 'All Family' },
  { value: 'level_1', label: 'Level 1', sublabel: 'Direct Family' },
  { value: 'level_2', label: 'Level 2', sublabel: 'Close Family' },
  { value: 'level_3', label: 'Level 3', sublabel: 'Extended Family' },
];
