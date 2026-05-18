/**
 * KulvrikshTreeView.tsx — premium card-based family lineage visualization.
 *
 * Replaces the old "Circle + line" SVG diagram (FamilyTreeVisualization)
 * with a Cred/Ancestry-grade view:
 *   • Card nodes  — avatar + name + relationship + dates (not bare circles)
 *   • Curved lines — Bezier paths, not straight strokes
 *   • Pinch-zoom + pan — Reanimated 4 + Gesture v2 (already installed)
 *   • Generation labels — "पीढ़ी 1 · वंशज" / "पीढ़ी 2 · पूर्वज"
 *   • Premium shadows + haldi-gold border on the You-card
 *
 * Layering:
 *   Background  → <Svg> with curved <Path> connection lines
 *   Foreground  → absolutely-positioned <View> member cards
 *   Both inside an <Animated.View> driven by pinch/pan shared values.
 *
 * Created 2026-05-17 in v0.15.9 after Kumar's "looks like a newbie's job"
 * feedback comparing Aangan to Cred / Scapia.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Spacing } from '../../theme/spacing';
import { getPresenceRingColor } from '../../utils/presence';
import type { FamilyMember } from '../../types/database';

// ---------------------------------------------------------------------------
// Layout constants — tuned for iPhone-class screens. The whole canvas is
// scrollable + zoomable, so we don't have to fit everything to the viewport.
// ---------------------------------------------------------------------------
const CARD_W = 110;
const CARD_H = 132;
const YOU_CARD_W = 124;
const YOU_CARD_H = 148;
const COL_GAP = 28;          // horizontal gap between sibling cards
const ROW_GAP = 60;          // vertical gap between generations
const AVATAR_R = 28;          // radius of avatar circle inside card
const CANVAS_PAD = 32;        // padding around content inside canvas
const COUPLE_GAP = 10;        // intra-couple gap between paired cards
const COUPLE_PAD = 8;         // padding around the haldi-tinted couple wrapper
// Width of a couple unit when both halves are standard cards (gen ≠ 0).
const COUPLE_W = CARD_W * 2 + COUPLE_GAP;
// Width of a You+spouse couple unit (You-card is larger).
const YOU_COUPLE_W = YOU_CARD_W + CARD_W + COUPLE_GAP;

// Cred-ish neutral palette (warm + premium, matches Aangan's haldi/mehndi)
const COLOR = {
  bg: '#FBF8F0',                  // soft cream background (premium card-stack feel)
  cardBg: '#FFFFFF',
  cardBorder: '#EFE6D0',
  cardShadow: 'rgba(82, 64, 24, 0.10)',
  text: '#3A2A12',
  textMuted: '#85714A',
  haldi: '#C8A84B',
  haldiDeep: '#9C7E2E',
  mehndi: '#7A9A3A',
  lineL1: '#C8A84B',              // gold — descendants
  lineL2: '#7A9A3A',              // green — siblings/spouses
  lineL3: '#A0856C',              // brown — extended
  generationLabel: '#A89373',
};

// ---------------------------------------------------------------------------
// Relationship → generation offset
// ---------------------------------------------------------------------------
// Negative = older generation (above me), 0 = same gen (sides), positive =
// younger gen (below me). Each user opens their own tree and sits at gen 0;
// the same labels resolve to the same offsets regardless of viewer.
//
// Keys are normalised to lowercase Hindi-or-English strings — we look up by
// `relationship_type` (usually English, lowercase, e.g. "wife") first, then
// fall back to `relationship_label_hindi` (e.g. "पत्नी").

const GEN_OFFSET: Record<string, number> = {
  // ── grandparents (above-above) ──
  grandfather: -2, grandmother: -2,
  'दादा': -2, 'दादी': -2, 'नाना': -2, 'नानी': -2,
  // ── parents and parent's siblings ──
  father: -1, mother: -1, parent: -1, dad: -1, mom: -1,
  'पिता': -1, 'माता': -1, 'पापा': -1, 'मम्मी': -1, 'माँ': -1,
  uncle: -1, aunt: -1,
  'चाचा': -1, 'चाची': -1, 'मामा': -1, 'मामी': -1, 'बुआ': -1, 'फूफा': -1, 'मौसी': -1, 'मौसा': -1,
  father_in_law: -1, mother_in_law: -1,
  'ससुर': -1, 'सास': -1,
  // ── same generation: spouse, siblings, cousins, in-laws ──
  husband: 0, wife: 0, spouse: 0, partner: 0,
  'पति': 0, 'पत्नी': 0,
  brother: 0, sister: 0, sibling: 0,
  'भाई': 0, 'बहन': 0,
  cousin: 0, cousin_brother: 0, cousin_sister: 0,
  brother_in_law: 0, sister_in_law: 0,
  'जीजा': 0, 'जीजी': 0, 'देवर': 0, 'देवरानी': 0, 'जेठ': 0, 'जेठानी': 0, 'साला': 0, 'साली': 0,
  // ── children and their generation ──
  son: 1, daughter: 1, child: 1,
  'बेटा': 1, 'बेटी': 1,
  nephew: 1, niece: 1,
  'भतीजा': 1, 'भतीजी': 1, 'भांजा': 1, 'भांजी': 1,
  son_in_law: 1, daughter_in_law: 1,
  'दामाद': 1, 'बहू': 1,
  // ── grandchildren (below-below) ──
  grandson: 2, granddaughter: 2,
  'पोता': 2, 'पोती': 2, 'नाती': 2, 'नातिन': 2,
};

export function getGenerationOffset(member: FamilyMember): number {
  const rt = (member.relationship_type ?? '').toString().toLowerCase().trim();
  if (rt && rt in GEN_OFFSET) return GEN_OFFSET[rt];
  const rh = (member.relationship_label_hindi ?? '').toString().trim();
  if (rh && rh in GEN_OFFSET) return GEN_OFFSET[rh];
  // Unknown relationship → same generation as You. Better than guessing
  // up/down. Tree stays valid; the user can correct the relationship later.
  return 0;
}

// ---------------------------------------------------------------------------
// Couple detection (v0.16.2 — Kumar directive 2026-05-18 01:32 IST)
// "any husband-wife pair should be shown as a pair in GUI & children should be
//  shown as combined children." We detect couples from the ego-centric member
//  list and render them as a single visual unit per generation, with children
//  attaching to the couple midpoint instead of the individual cards.
// ---------------------------------------------------------------------------

export type CoupleId =
  | 'you+spouse'
  | 'father+mother'
  | 'father_in_law+mother_in_law'
  | 'paternal-grandparents'
  | 'maternal-grandparents';

export interface CoupleSlot {
  id: CoupleId;
  /** 'you' for the You+spouse case, otherwise a FamilyMember. */
  primary: FamilyMember | 'you';
  spouse: FamilyMember;
  gen: number;
}

// Helper — normalised relationship key (English first, Hindi fallback).
function relKey(m: FamilyMember): string {
  const rt = (m.relationship_type ?? '').toString().toLowerCase().trim();
  if (rt) return rt;
  return (m.relationship_label_hindi ?? '').toString().trim();
}

function findOne(members: FamilyMember[], keys: string[]): FamilyMember | undefined {
  // Returns the FIRST member whose normalised key matches any of `keys`.
  // If multiple match (data error upstream), the rest are ignored; the
  // caller can choose to warn.
  return members.find((m) => keys.includes(relKey(m)));
}

function findAllByKeys(members: FamilyMember[], keys: string[]): FamilyMember[] {
  return members.filter((m) => keys.includes(relKey(m)));
}

/**
 * Detect couple slots from a flat ego-centric member list.
 *
 * Phase 1 (shipped 2026-05-18):
 *   - You + spouse   (gen 0)   — wife/husband/spouse/पति/पत्नी
 *   - father+mother  (gen -1)
 *   - father_in_law+mother_in_law (gen -1)
 *   - paternal grandparents दादा+दादी (gen -2)
 *   - maternal grandparents नाना+नानी (gen -2)
 *
 * Phase 2 (deferred — see notes/design-backlog.md):
 *   - चाचा+चाची, मामा+मामी, मौसा+मौसी, बुआ+फूफा (gen -1 uncle/aunt pairs)
 *
 * The function is pure & side-effect free; couple-pair render relies on it.
 */
export function detectCouples(
  members: FamilyMember[],
  includeYou: boolean = true,
): CoupleSlot[] {
  if (!members || members.length === 0) return [];
  const slots: CoupleSlot[] = [];

  // ── gen 0: You + spouse ────────────────────────────────────────────────
  if (includeYou) {
    const spouses = findAllByKeys(members, [
      'wife', 'husband', 'spouse', 'partner', 'पति', 'पत्नी',
    ]);
    if (spouses.length >= 1) {
      if (spouses.length > 1 && typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[KulvrikshTreeView] detectCouples: multiple spouses found, using first only',
          spouses.map((s) => s.id),
        );
      }
      slots.push({
        id: 'you+spouse',
        primary: 'you',
        spouse: spouses[0],
        gen: 0,
      });
    }
  }

  // ── gen -1: parents ────────────────────────────────────────────────────
  const father = findOne(members, ['father', 'dad', 'पिता', 'पापा']);
  const mother = findOne(members, ['mother', 'mom', 'माता', 'मम्मी', 'माँ']);
  if (father && mother) {
    slots.push({ id: 'father+mother', primary: father, spouse: mother, gen: -1 });
  }

  // ── gen -1: parents-in-law ─────────────────────────────────────────────
  const fil = findOne(members, ['father_in_law', 'ससुर']);
  const mil = findOne(members, ['mother_in_law', 'सास']);
  if (fil && mil) {
    slots.push({
      id: 'father_in_law+mother_in_law',
      primary: fil,
      spouse: mil,
      gen: -1,
    });
  }

  // ── gen -2: paternal grandparents ──────────────────────────────────────
  // Pair दादा+दादी explicitly (paternal). For English-only `grandfather`/
  // `grandmother` we treat the first pair as paternal-side.
  const dada = findOne(members, ['दादा']);
  const dadi = findOne(members, ['दादी']);
  if (dada && dadi) {
    slots.push({ id: 'paternal-grandparents', primary: dada, spouse: dadi, gen: -2 });
  } else {
    // English-only fallback: a single grandfather + grandmother pair counts
    // as paternal in the absence of more info.
    const gf = findOne(members, ['grandfather']);
    const gm = findOne(members, ['grandmother']);
    if (gf && gm) {
      slots.push({
        id: 'paternal-grandparents',
        primary: gf,
        spouse: gm,
        gen: -2,
      });
    }
  }

  // ── gen -2: maternal grandparents ──────────────────────────────────────
  const nana = findOne(members, ['नाना']);
  const nani = findOne(members, ['नानी']);
  if (nana && nani) {
    slots.push({ id: 'maternal-grandparents', primary: nana, spouse: nani, gen: -2 });
  }

  return slots;
}

/**
 * Returns the set of member-ids that have been "consumed" into couple slots.
 * Layout math uses this set to skip those members in the per-generation
 * single-card partition (they render as part of the couple unit instead).
 */
function coupleMemberIds(couples: CoupleSlot[]): Set<string> {
  const ids = new Set<string>();
  for (const c of couples) {
    if (c.primary !== 'you') ids.add(c.primary.id);
    ids.add(c.spouse.id);
  }
  return ids;
}

function generationLabel(g: number, isHindi: boolean): string {
  switch (g) {
    case -2: return isHindi ? 'दादा-दादी / नाना-नानी' : 'Grandparents';
    case -1: return isHindi ? 'माता-पिता / चाचा-बुआ' : 'Parents & their siblings';
    case 0:  return isHindi ? 'आप, जीवनसाथी, भाई-बहन' : 'You, spouse, siblings';
    case 1:  return isHindi ? 'बच्चे / भतीजे-भांजे' : 'Children & nephews/nieces';
    case 2:  return isHindi ? 'पोते-पोती / नाती-नातिन' : 'Grandchildren';
    default: return g < 0 ? (isHindi ? 'पूर्वज' : 'Ancestors') : (isHindi ? 'वंशज' : 'Descendants');
  }
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface KulvrikshTreeViewProps {
  /** All family members (online + offline-adapted) the screen has. */
  members: FamilyMember[];
  isHindi: boolean;
  /** Current user — drawn as the "आप" card in the center. */
  selfDisplayName?: string | null;
  selfDisplayNameHindi?: string | null;
  selfAvatarUrl?: string | null;
  /** Optional tap handler for navigating to a member's profile. */
  onMemberPress?: (m: FamilyMember) => void;
  /** v0.16.3 direct tree editing: long-press a member card → screen opens
   *  the TreeCardActionSheet. Receives the long-pressed FamilyMember. */
  onMemberLongPress?: (m: FamilyMember) => void;
  /** v0.16.3 direct tree editing: long-press the central "You" card →
   *  screen opens the TreeCardActionSheet in You-card mode. */
  onYouLongPress?: () => void;
}

export default function KulvrikshTreeView({
  members,
  isHindi,
  selfDisplayName,
  selfDisplayNameHindi,
  selfAvatarUrl,
  onMemberPress,
  onMemberLongPress,
  onYouLongPress,
}: KulvrikshTreeViewProps) {
  const { width: screenW } = useWindowDimensions();

  // ── ego-centric generation layout (v0.16.1) ───────────────────────────
  // Kumar directive (2026-05-17 18:48 IST): "keep [me] as centre of family
  // and show children below me and elders above me. Likewise view should
  // be there for every user." Pre-v0.16.1 we partitioned by `connection_level`
  // (degrees of separation). That bunched brother/sister/wife/child all into
  // one "L1" row, which is genealogically wrong. We now derive a generation
  // offset (-2 = grandparent, -1 = parent, 0 = same gen, +1 = child, +2 =
  // grandchild) from the relationship string. The current user sits at gen
  // 0; rows above are elders, rows below are descendants.
  //
  // Coverage map — kept in this file (not a shared module) because the
  // mapping is layout-presentation specific. If we ever need it elsewhere,
  // promote to utils/relationships.ts.
  // Detect husband-wife pairs from the flat member list. Couples render as
  // a paired card unit; children attach to the couple midpoint instead of
  // the individual cards. (v0.16.2 — Kumar directive 2026-05-18.)
  const couples = useMemo(() => detectCouples(members, true), [members]);

  // Set of member-ids that are already accounted for inside a couple slot —
  // these are excluded from the per-generation single-card partition so we
  // don't render them twice.
  const consumedIds = useMemo(() => coupleMemberIds(couples), [couples]);

  const genOffset = useMemo(() => {
    const partitions = new Map<number, FamilyMember[]>();
    for (const m of members) {
      if (consumedIds.has(m.id)) continue;
      const g = getGenerationOffset(m);
      const bucket = partitions.get(g) ?? [];
      bucket.push(m);
      partitions.set(g, bucket);
    }
    return partitions;
  }, [members, consumedIds]);

  // Couples partitioned by generation (parallel to genOffset).
  const couplesByGen = useMemo(() => {
    const map = new Map<number, CoupleSlot[]>();
    for (const c of couples) {
      const list = map.get(c.gen) ?? [];
      list.push(c);
      map.set(c.gen, list);
    }
    return map;
  }, [couples]);

  // Convenience: the "You + spouse" couple, if present. Used in many places
  // (gen 0 layout, child-anchor midpoint, etc.).
  const youCouple = useMemo(
    () => couples.find((c) => c.id === 'you+spouse') ?? null,
    [couples],
  );

  // Sorted list of generation rows that actually have members.
  // 0 is reserved for the You-row even if empty (so it always renders).
  const usedGenerations = useMemo(() => {
    const set = new Set<number>(genOffset.keys());
    for (const g of couplesByGen.keys()) set.add(g);
    set.add(0); // You always at gen 0
    return Array.from(set).sort((a, b) => a - b);
  }, [genOffset, couplesByGen]);

  // ── compute positions ─────────────────────────────────────────────────
  // Each generation row is centered horizontally; rows stack vertically.
  // The widest row drives the canvas width.
  //
  // Slot accounting: a couple takes ~2 card widths + 10px gap as one
  // "wide slot". A single member takes 1 card width. Gen 0 always reserves
  // 1 slot for the You-card. The You+spouse couple replaces (You) + (spouse-
  // single) with a single wide slot; we account for it via gen0Slots below.
  const widestRowCount = useMemo(() => {
    let widest = 1; // You row counts as ≥1 even when empty
    for (const g of usedGenerations) {
      const singles = (genOffset.get(g) ?? []).length;
      const cpls = (couplesByGen.get(g) ?? []).length;
      // Couple counts as ~2 cards' worth horizontally — bias the canvas math
      // so couples never get clipped.
      let n = singles + cpls * 2;
      if (g === 0) {
        // gen 0: if no You+spouse couple, You adds 1 slot; if there IS a
        // You+spouse couple, that couple already counts for You + spouse.
        n += youCouple ? 0 : 1;
      }
      if (n > widest) widest = n;
    }
    return widest;
  }, [usedGenerations, genOffset, couplesByGen, youCouple]);

  const canvasW = Math.max(
    widestRowCount * (CARD_W + COL_GAP) + 2 * CANVAS_PAD,
    screenW
  );
  const centerX = canvasW / 2;

  // Y position for a given generation offset. You-row is at the vertical
  // midline; each row above/below is ROW_GAP + card-height further from it.
  const yOfGen = useCallback((g: number): number => {
    const youRowY = CANVAS_PAD + Math.max(...usedGenerations.map(Math.abs)) * (ROW_GAP + CARD_H) + YOU_CARD_H / 2;
    if (g === 0) return youRowY;
    const cardCenterToCardCenter = ROW_GAP + (g > 0 ? CARD_H / 2 + YOU_CARD_H / 2 : YOU_CARD_H / 2 + CARD_H / 2);
    const step = ROW_GAP + CARD_H;
    return youRowY + Math.sign(g) * (cardCenterToCardCenter + (Math.abs(g) - 1) * step);
  }, [usedGenerations]);

  const canvasH = useMemo(() => {
    const lowestY = yOfGen(Math.max(...usedGenerations));
    return lowestY + CARD_H / 2 + CANVAS_PAD + 24;
  }, [usedGenerations, yOfGen]);

  // Helper — evenly spread `n` cards centered on centerX
  const spreadX = useCallback((n: number, cardW: number): number[] => {
    if (n === 0) return [];
    const totalW = n * cardW + (n - 1) * COL_GAP;
    const startX = centerX - totalW / 2 + cardW / 2;
    return Array.from({ length: n }, (_, i) => startX + i * (cardW + COL_GAP));
  }, [centerX]);

  // You-card position. When You has a spouse (couple), the pair is centered
  // on centerX: You sits left of center, spouse sits right of center, the
  // couple's midpoint is exactly centerX. Without a spouse, You sits at
  // centerX as before.
  const youX = useMemo(() => {
    if (!youCouple) return centerX;
    // couple width = YOU_CARD_W + COUPLE_GAP + CARD_W
    return centerX - (YOU_CARD_W + COUPLE_GAP + CARD_W) / 2 + YOU_CARD_W / 2;
  }, [centerX, youCouple]);

  // Spouse-card position (only meaningful when youCouple exists).
  const spouseX = useMemo(() => {
    if (!youCouple) return null;
    return centerX + (YOU_CARD_W + COUPLE_GAP + CARD_W) / 2 - CARD_W / 2;
  }, [centerX, youCouple]);

  // The "left edge" + "right edge" of the gen-0 You-unit (couple-or-single).
  // Used to position sibling cards flanking the unit.
  const gen0UnitHalfW = youCouple
    ? (YOU_CARD_W + COUPLE_GAP + CARD_W) / 2
    : YOU_CARD_W / 2;

  // Same-gen members (gen 0, excluding You and excluding the consumed spouse)
  // flank the You-unit: half left, half right.
  const gen0Members = genOffset.get(0) ?? [];
  const gen0Xs = useMemo(() => {
    const n = gen0Members.length;
    if (n === 0) return [];
    const halfLeft = Math.ceil(n / 2);
    const positions: number[] = [];
    for (let i = 0; i < halfLeft; i++) {
      positions.push(
        centerX - gen0UnitHalfW - COL_GAP - (halfLeft - i) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    for (let i = halfLeft; i < n; i++) {
      positions.push(
        centerX + gen0UnitHalfW + COL_GAP + (i - halfLeft) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    return positions;
  }, [gen0Members.length, centerX, gen0UnitHalfW]);

  // ── gestures: pinch + pan ─────────────────────────────────────────────
  const scale = useSharedValue(1);
  const baseScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseTx = useSharedValue(0);
  const baseTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = baseScale.value * e.scale;
      // Clamp to a sensible range so user can't pinch to 0 or 100x
      scale.value = Math.max(0.5, Math.min(3, next));
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      baseTx.value = tx.value;
      baseTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = baseTx.value + e.translationX;
      ty.value = baseTy.value + e.translationY;
    });

  // Double-tap → reset to fit
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 16, stiffness: 120 });
      tx.value = withSpring(0, { damping: 16, stiffness: 120 });
      ty.value = withSpring(0, { damping: 16, stiffness: 120 });
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // Pre-compute x positions for each non-You generation row.
  // Keyed by generation offset; value is an array of x-centers (one per
  // member in that row, in the same order as genOffset.get(g)).
  //
  // v0.16.1 fix (2026-05-17): this useMemo was BELOW the empty-state early
  // return. When the screen first mounts with members=[] and then re-renders
  // with the fetched list, React saw N hooks then N+1 hooks → "Rendered more
  // hooks than during the previous render" exception in Hermes prod, caught
  // by ErrorBoundary as "कुछ गलत हो गया". Jest tests didn't catch it because
  // every test rendered with a static populated members prop, so the
  // empty→populated transition never happened in tests.
  //
  // Moved ABOVE the early-return so the hook count stays stable across renders.
  //
  // v0.16.2 (2026-05-18): couples render as a single wide unit centered in
  // the row; singles flank them. `rowXs` holds card-center xs for the
  // SINGLE members only (same order as genOffset.get(g)). Couple unit
  // midpoints live in `coupleRowMidXs`.
  const rowXs = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const g of usedGenerations) {
      if (g === 0) continue; // handled separately via gen0Xs
      const singles = genOffset.get(g) ?? [];
      const cpls = couplesByGen.get(g) ?? [];
      if (cpls.length === 0) {
        map.set(g, spreadX(singles.length, CARD_W));
        continue;
      }
      // Couples cluster around centerX; singles flank them.
      // Couple-unit total width:
      const cplsTotalW = cpls.length * COUPLE_W + (cpls.length - 1) * COL_GAP;
      const halfL = Math.ceil(singles.length / 2);
      const positions: number[] = [];
      for (let i = 0; i < halfL; i++) {
        positions.push(
          centerX - cplsTotalW / 2 - COL_GAP - (halfL - i) * (CARD_W + COL_GAP) + CARD_W / 2,
        );
      }
      for (let i = halfL; i < singles.length; i++) {
        positions.push(
          centerX + cplsTotalW / 2 + COL_GAP + (i - halfL) * (CARD_W + COL_GAP) + CARD_W / 2,
        );
      }
      map.set(g, positions);
    }
    return map;
  }, [usedGenerations, genOffset, couplesByGen, spreadX, centerX]);

  // Couple-midpoint x for every couple in every non-You generation.
  // The midpoint is what child trunk lines connect to.
  const coupleRowMidXs = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const g of usedGenerations) {
      if (g === 0) continue;
      const cpls = couplesByGen.get(g) ?? [];
      if (cpls.length === 0) continue;
      const totalW = cpls.length * COUPLE_W + (cpls.length - 1) * COL_GAP;
      const startX = centerX - totalW / 2 + COUPLE_W / 2;
      map.set(
        g,
        Array.from({ length: cpls.length }, (_, i) => startX + i * (COUPLE_W + COL_GAP)),
      );
    }
    return map;
  }, [usedGenerations, couplesByGen, centerX]);

  // Trunk anchor for the gen-0 You-unit, used by children's connection
  // lines. With a spouse → midpoint between You and spouse (= centerX).
  // Without a spouse → just centerX, which is You's card center anyway.
  const gen0AnchorX = centerX;

  const yYou = yOfGen(0);

  // ── empty state ───────────────────────────────────────────────────────
  // MUST come AFTER every hook call above. See note on rowXs about the
  // Rules-of-Hooks regression this position prevents.
  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>{'🪔'}</Text>
        <Text style={styles.emptyTitle}>
          {isHindi ? 'अपना कुलवृक्ष बनाएँ' : 'Build your Kulvriksh'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isHindi
            ? 'परिवार के सदस्यों को जोड़ें और पीढ़ियों का इतिहास सहेजें'
            : 'Add family members to preserve generations of history'}
        </Text>
      </View>
    );
  }

  // ── render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.viewport}>
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            styles.canvas,
            { width: canvasW, height: canvasH },
            animatedStyle,
          ]}
        >
          {/* Curved connection lines — drawn behind cards */}
          <Svg
            width={canvasW}
            height={canvasH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="lineUp" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLOR.lineL1} stopOpacity="0.75" />
                <Stop offset="1" stopColor={COLOR.lineL1} stopOpacity="0.3" />
              </LinearGradient>
              <LinearGradient id="lineDown" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLOR.lineL3} stopOpacity="0.3" />
                <Stop offset="1" stopColor={COLOR.lineL3} stopOpacity="0.75" />
              </LinearGradient>
            </Defs>

            {/* For each non-You generation, draw a line from each card (and
                couple midpoint) to the trunk point on the next row closer
                to You. v0.16.2: children attach to the (You+spouse) midpoint
                via gen0AnchorX. Couple units use a single trunk line from
                their midpoint, NOT two separate lines per card. */}
            {usedGenerations.map((g) => {
              if (g === 0) return null;
              const xs = rowXs.get(g) ?? [];
              const cplsMidXs = coupleRowMidXs.get(g) ?? [];
              const isUp = g < 0;
              // The "downstream" anchor: where this row connects toward You.
              // For gen=±1 the anchor is the gen-0 anchor (couple-midpoint
              //   or You-center).
              // For gen=±2 the anchor is the gen=±1 couple-midpoint if any,
              //   else the centerX on that row, else gen-0 anchor.
              const stepTowardYou = isUp ? g + 1 : g - 1;
              const interCpls = stepTowardYou !== 0
                ? coupleRowMidXs.get(stepTowardYou) ?? []
                : [];
              const hasIntermediate =
                stepTowardYou !== 0 &&
                ((genOffset.get(stepTowardYou)?.length ?? 0) > 0 ||
                  interCpls.length > 0);
              const anchorY = hasIntermediate
                ? yOfGen(stepTowardYou)
                : isUp
                ? yYou - YOU_CARD_H / 2
                : yYou + YOU_CARD_H / 2;
              // The anchor X: gen-0 anchor unless a closer intermediate row
              // is present, in which case use its first couple midpoint or
              // centerX. Kept simple — visual hierarchy matters more than
              // perfect graph-routing here.
              const anchorX = hasIntermediate
                ? interCpls[0] ?? centerX
                : gen0AnchorX;
              const cardEdgeY = yOfGen(g) + (isUp ? CARD_H / 2 : -CARD_H / 2);
              return (
                <React.Fragment key={`line-frag-${g}`}>
                  {/* singles → anchor */}
                  {xs.map((x, i) => (
                    <Path
                      key={`line-${g}-s-${i}`}
                      d={bezierPath(x, cardEdgeY, anchorX, anchorY)}
                      stroke={isUp ? 'url(#lineUp)' : 'url(#lineDown)'}
                      strokeWidth={2}
                      fill="none"
                    />
                  ))}
                  {/* couples (midpoint) → anchor */}
                  {cplsMidXs.map((mx, i) => (
                    <Path
                      key={`line-${g}-c-${i}`}
                      d={bezierPath(mx, cardEdgeY, anchorX, anchorY)}
                      stroke={isUp ? 'url(#lineUp)' : 'url(#lineDown)'}
                      strokeWidth={2}
                      fill="none"
                    />
                  ))}
                </React.Fragment>
              );
            })}

            {/* Same-gen members (siblings) — short horizontal connector to
                the You-unit. Skips the spouse case because the spouse is
                now rendered as part of the couple wrapper, not a flank. */}
            {gen0Xs.map((x, i) => (
              <Path
                key={`gen0-curve-${i}`}
                d={horizBezier(
                  x,
                  yYou,
                  centerX + (x < centerX ? -gen0UnitHalfW : gen0UnitHalfW),
                  yYou,
                )}
                stroke={COLOR.lineL2}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="none"
                opacity={0.55}
              />
            ))}
          </Svg>

          {/* Generation labels — one per non-empty row */}
          {usedGenerations.map((g) => {
            const list = g === 0 ? gen0Members : genOffset.get(g) ?? [];
            if (g !== 0 && list.length === 0) return null;
            const y = yOfGen(g);
            // Label sits just above the cards for elders, just below for descendants.
            const labelTop = g < 0
              ? y - CARD_H / 2 - 22
              : g > 0
              ? y + CARD_H / 2 + 6
              : y + YOU_CARD_H / 2 + 6;
            return (
              <Text
                key={`gen-label-${g}`}
                style={[styles.generationLabel, { top: labelTop, width: canvasW }]}
              >
                {generationLabel(g, isHindi)}
              </Text>
            );
          })}

          {/* couple-pair render — soft haldi-gold rounded wrapper spanning
              both cards, drawn BEHIND cards so the cards sit on top. One
              wrapper per couple across every generation including gen 0. */}
          {/* Non-gen-0 couple wrappers */}
          {usedGenerations.map((g) => {
            if (g === 0) return null;
            const cpls = couplesByGen.get(g) ?? [];
            const midXs = coupleRowMidXs.get(g) ?? [];
            const y = yOfGen(g);
            return cpls.map((c, i) => (
              <View
                key={`couple-wrap-${c.id}-${i}`}
                style={[
                  styles.couplePairWrapper,
                  {
                    left: midXs[i] - COUPLE_W / 2 - COUPLE_PAD,
                    top: y - CARD_H / 2 - COUPLE_PAD,
                    width: COUPLE_W + COUPLE_PAD * 2,
                    height: CARD_H + COUPLE_PAD * 2,
                  },
                ]}
                pointerEvents="none"
              />
            ));
          })}
          {/* Gen 0 You+spouse wrapper */}
          {youCouple ? (
            <View
              style={[
                styles.couplePairWrapper,
                styles.couplePairWrapperYou,
                {
                  left: centerX - (YOU_CARD_W + COUPLE_GAP + CARD_W) / 2 - COUPLE_PAD,
                  top: yYou - YOU_CARD_H / 2 - COUPLE_PAD,
                  width: YOU_CARD_W + COUPLE_GAP + CARD_W + COUPLE_PAD * 2,
                  height: YOU_CARD_H + COUPLE_PAD * 2,
                },
              ]}
              pointerEvents="none"
            />
          ) : null}

          {/* Cards for every non-You generation — singles first, then
              couples (both halves rendered as standard cards). */}
          {usedGenerations.map((g) => {
            if (g === 0) return null;
            const list = genOffset.get(g) ?? [];
            const xs = rowXs.get(g) ?? [];
            const y = yOfGen(g);
            return list.map((m, i) => (
              <MemberCardNode
                key={m.id}
                member={m}
                x={xs[i]}
                y={y}
                width={CARD_W}
                height={CARD_H}
                onPress={onMemberPress}
                onLongPress={onMemberLongPress}
              />
            ));
          })}
          {/* couple-pair render — paired cards per non-gen-0 row */}
          {usedGenerations.map((g) => {
            if (g === 0) return null;
            const cpls = couplesByGen.get(g) ?? [];
            const midXs = coupleRowMidXs.get(g) ?? [];
            const y = yOfGen(g);
            return cpls.flatMap((c, i) => {
              const mx = midXs[i];
              const leftX = mx - COUPLE_W / 2 + CARD_W / 2;
              const rightX = mx + COUPLE_W / 2 - CARD_W / 2;
              if (c.primary === 'you') return []; // gen 0 handled below
              return [
                <MemberCardNode
                  key={`${c.id}-primary`}
                  member={c.primary}
                  x={leftX}
                  y={y}
                  width={CARD_W}
                  height={CARD_H}
                  onPress={onMemberPress}
                  onLongPress={onMemberLongPress}
                />,
                <MemberCardNode
                  key={`${c.id}-spouse`}
                  member={c.spouse}
                  x={rightX}
                  y={y}
                  width={CARD_W}
                  height={CARD_H}
                  onPress={onMemberPress}
                  onLongPress={onMemberLongPress}
                />,
              ];
            });
          })}

          {/* You card — center of the universe, haldi-gold border */}
          <YouCardNode
            x={youX}
            y={yYou}
            width={YOU_CARD_W}
            height={YOU_CARD_H}
            displayName={selfDisplayNameHindi || selfDisplayName || 'आप'}
            avatarUrl={selfAvatarUrl ?? null}
            isHindi={isHindi}
            onLongPress={onYouLongPress}
          />

          {/* Spouse card (paired with You) */}
          {youCouple && spouseX !== null ? (
            <MemberCardNode
              member={youCouple.spouse}
              x={spouseX}
              y={yYou}
              width={CARD_W}
              height={CARD_H}
              onPress={onMemberPress}
              onLongPress={onMemberLongPress}
            />
          ) : null}

          {/* Same-gen members (gen 0) — flanking the You-unit */}
          {gen0Members.map((m, i) => (
            <MemberCardNode
              key={m.id}
              member={m}
              x={gen0Xs[i]}
              y={yYou}
              width={CARD_W}
              height={CARD_H}
              onPress={onMemberPress}
              onLongPress={onMemberLongPress}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Subtle hint chip — appears on first render */}
      <View style={styles.hintChip} pointerEvents="none">
        <Text style={styles.hintChipText}>
          {isHindi
            ? 'चुटकी से zoom · दो-बार-tap reset'
            : 'Pinch to zoom · double-tap to reset'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card node — used for every member EXCEPT the central "You" card
// ---------------------------------------------------------------------------

function MemberCardNode({
  member,
  x,
  y,
  width,
  height,
  onPress,
  onLongPress,
}: {
  member: FamilyMember;
  x: number;
  y: number;
  width: number;
  height: number;
  onPress?: (m: FamilyMember) => void;
  /** v0.16.3 direct tree editing: long-press opens TreeCardActionSheet. */
  onLongPress?: (m: FamilyMember) => void;
}) {
  const m = member.member;
  const displayName = m?.display_name_hindi || m?.display_name || '—';
  const relLabel = member.relationship_label_hindi || member.relationship_type || '';
  const avatarUrl = m?.profile_photo_url ?? null;
  // Birth/death years (from offline member adapter on FamilyTreeScreen).
  // Guarded via cast since User type doesn't formally declare them.
  const extra = m as unknown as { birth_year?: number; death_year?: number; is_deceased?: boolean };
  const yearLine =
    extra?.birth_year && extra?.death_year
      ? `${extra.birth_year}–${extra.death_year}`
      : extra?.birth_year
      ? `b. ${extra.birth_year}`
      : null;

  // v0.15.7 presence ring color, applied to avatar border
  const ringColor =
    getPresenceRingColor({
      lastSeenAt: m?.last_seen_at ?? null,
      isDeceased: extra?.is_deceased === true,
    }) ?? COLOR.cardBorder;

  return (
    <Pressable
      onPress={onPress ? () => onPress(member) : undefined}
      onLongPress={onLongPress ? () => onLongPress(member) : undefined}
      delayLongPress={350}
      style={[
        cardStyles.card,
        {
          left: x - width / 2,
          top: y - height / 2,
          width,
          height,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${relLabel}`}
      accessibilityHint={onLongPress ? 'Long press for edit options / लंबे दबाव से विकल्प' : undefined}
    >
      {/* v0.16.3: visible "⋯" handle in top-right as a discoverability
          fallback for users who don't know about long-press. Decorative
          only — the whole card is the long-press target. */}
      {onLongPress ? (
        <View style={cardStyles.actionHandle} pointerEvents="none">
          <Text style={cardStyles.actionHandleDots}>{'⋯'}</Text>
        </View>
      ) : null}
      <View style={[cardStyles.avatarRing, { borderColor: ringColor }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={cardStyles.avatar} />
        ) : (
          <View style={[cardStyles.avatar, cardStyles.avatarPlaceholder]}>
            <Text style={cardStyles.avatarInitial}>{displayName.charAt(0)}</Text>
          </View>
        )}
      </View>
      <Text style={cardStyles.name} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={cardStyles.rel} numberOfLines={1}>
        {relLabel}
      </Text>
      {yearLine ? (
        <Text style={cardStyles.years} numberOfLines={1}>
          {yearLine}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// "You" card — center, larger, haldi-gold border, never tappable
// ---------------------------------------------------------------------------

function YouCardNode({
  x,
  y,
  width,
  height,
  displayName,
  avatarUrl,
  isHindi,
  onLongPress,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  displayName: string;
  avatarUrl: string | null;
  isHindi: boolean;
  /** v0.16.3 direct tree editing: long-press opens TreeCardActionSheet in
   *  You-card mode (Add-only actions). No tap handler — You is not
   *  navigable. */
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        cardStyles.card,
        cardStyles.cardYou,
        {
          left: x - width / 2,
          top: y - height / 2,
          width,
          height,
        },
      ]}
      accessibilityRole={onLongPress ? 'button' : undefined}
      accessibilityLabel={isHindi ? 'आप' : 'You'}
      accessibilityHint={onLongPress ? 'Long press for add options / लंबे दबाव से जोड़ें विकल्प' : undefined}
    >
      {/* v0.16.3: visible "⋯" handle as a discoverability fallback. */}
      {onLongPress ? (
        <View style={cardStyles.actionHandle} pointerEvents="none">
          <Text style={cardStyles.actionHandleDots}>{'⋯'}</Text>
        </View>
      ) : null}
      <View style={[cardStyles.avatarRing, cardStyles.avatarRingYou, { borderColor: COLOR.haldi }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={cardStyles.avatarYou} />
        ) : (
          <View style={[cardStyles.avatarYou, cardStyles.avatarPlaceholder]}>
            <Text style={[cardStyles.avatarInitial, { fontSize: 22 }]}>
              {(displayName || 'आप').charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <Text style={cardStyles.nameYou} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={cardStyles.relYou}>{isHindi ? 'आप' : 'You'}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Bezier path helpers
// ---------------------------------------------------------------------------

/**
 * Curve from (x1,y1) to (x2,y2) with vertical-leaning control points. Used
 * for parent↔child and you↔descendant connections.
 */
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}

/**
 * Subtle horizontal curve between two same-row nodes (siblings, spouse).
 */
function horizBezier(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1 - 8}, ${midX} ${y2 - 8}, ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    backgroundColor: COLOR.bg,
    overflow: 'hidden',
  },
  canvas: {
    position: 'relative',
    alignSelf: 'center',
  },
  generationLabel: {
    position: 'absolute',
    left: 0,
    textAlign: 'center',
    fontSize: 11,
    color: COLOR.generationLabel,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  hintChip: {
    position: 'absolute',
    bottom: Spacing.md,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(58, 42, 18, 0.85)',
    borderRadius: 999,
  },
  hintChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // v0.16.2 couple-pair wrapper: subtle haldi-tinted rounded background
  // spanning both cards of a husband-wife couple. Sits BEHIND the cards.
  couplePairWrapper: {
    position: 'absolute',
    backgroundColor: 'rgba(200, 168, 75, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 75, 0.18)',
    borderRadius: 22,
  },
  couplePairWrapperYou: {
    backgroundColor: 'rgba(200, 168, 75, 0.10)',
    borderColor: 'rgba(200, 168, 75, 0.32)',
  },

  // empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: COLOR.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h2,
    color: COLOR.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.body,
    color: COLOR.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: COLOR.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.cardBorder,
    paddingTop: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    // Layered shadow — premium card-stack feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardYou: {
    backgroundColor: '#FFFDF6',
    borderWidth: 2,
    borderColor: COLOR.haldi,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarRing: {
    width: AVATAR_R * 2 + 4,
    height: AVATAR_R * 2 + 4,
    borderRadius: AVATAR_R + 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarRingYou: {
    width: AVATAR_R * 2 + 8,
    height: AVATAR_R * 2 + 8,
    borderRadius: AVATAR_R + 4,
    borderWidth: 3,
  },
  avatar: {
    width: AVATAR_R * 2,
    height: AVATAR_R * 2,
    borderRadius: AVATAR_R,
  },
  avatarYou: {
    width: AVATAR_R * 2 + 4,
    height: AVATAR_R * 2 + 4,
    borderRadius: AVATAR_R + 2,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3E5B5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.haldiDeep,
  },
  // v0.16.1 Design Lead audit fix (2026-05-17): card text was 13/11/11/10
  // which is below the Dadi Test 16px-body minimum and read as cramped.
  // Bumped to 15/13/12 + tightened margin to keep cards from growing too tall.
  // Card dimensions (CARD_W 110, CARD_H 132) remain unchanged so the existing
  // generation-row layout math is undisturbed.
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.text,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: '100%',
  },
  nameYou: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.text,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  rel: {
    fontSize: 13,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  relYou: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.haldiDeep,
    textAlign: 'center',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  years: {
    fontSize: 11,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  // v0.16.3 — small "⋯" affordance in the top-right corner of each card.
  // Decorative — the entire card is the long-press target. Purely a
  // discoverability hint for users who don't know about long-press.
  actionHandle: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionHandleDots: {
    fontSize: 18,
    lineHeight: 18,
    color: COLOR.textMuted,
    fontWeight: '700',
    opacity: 0.55,
  },
});
