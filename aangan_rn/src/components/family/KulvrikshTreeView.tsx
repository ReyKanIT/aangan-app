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
}

export default function KulvrikshTreeView({
  members,
  isHindi,
  selfDisplayName,
  selfDisplayNameHindi,
  selfAvatarUrl,
  onMemberPress,
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
  const genOffset = useMemo(() => {
    const partitions = new Map<number, FamilyMember[]>();
    for (const m of members) {
      const g = getGenerationOffset(m);
      const bucket = partitions.get(g) ?? [];
      bucket.push(m);
      partitions.set(g, bucket);
    }
    return partitions;
  }, [members]);

  // Sorted list of generation rows that actually have members.
  // 0 is reserved for the You-row even if empty (so it always renders).
  const usedGenerations = useMemo(() => {
    const set = new Set<number>(genOffset.keys());
    set.add(0); // You always at gen 0
    return Array.from(set).sort((a, b) => a - b);
  }, [genOffset]);

  // ── compute positions ─────────────────────────────────────────────────
  // Each generation row is centered horizontally; rows stack vertically.
  // The widest row drives the canvas width.
  const widestRowCount = useMemo(() => {
    let widest = 1; // You row counts as 1 even when empty
    for (const [g, list] of genOffset) {
      const n = g === 0 ? list.length + 1 : list.length; // +1 for You at gen 0
      if (n > widest) widest = n;
    }
    return widest;
  }, [genOffset]);

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

  // Same-gen members (gen 0, excluding You) flank the You-card: half left,
  // half right, leaving the center slot for You.
  const gen0Members = genOffset.get(0) ?? [];
  const gen0Xs = useMemo(() => {
    const n = gen0Members.length;
    if (n === 0) return [];
    const halfLeft = Math.ceil(n / 2);
    const positions: number[] = [];
    for (let i = 0; i < halfLeft; i++) {
      positions.push(
        centerX - YOU_CARD_W / 2 - COL_GAP - (halfLeft - i) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    for (let i = halfLeft; i < n; i++) {
      positions.push(
        centerX + YOU_CARD_W / 2 + COL_GAP + (i - halfLeft) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    return positions;
  }, [gen0Members.length, centerX]);

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

  // ── empty state ───────────────────────────────────────────────────────
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

  // Pre-compute x positions for each non-You generation row.
  // Keyed by generation offset; value is an array of x-centers (one per
  // member in that row, in the same order as genOffset.get(g)).
  const rowXs = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const g of usedGenerations) {
      if (g === 0) continue; // handled separately via gen0Xs
      const list = genOffset.get(g) ?? [];
      map.set(g, spreadX(list.length, CARD_W));
    }
    return map;
  }, [usedGenerations, genOffset, spreadX]);

  const yYou = yOfGen(0);

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

            {/* For each non-You generation, draw a line from each card to
                the trunk point on the next row closer to You. This builds a
                clean trunk-style tree — grandparents → parents → You →
                children → grandchildren. */}
            {usedGenerations.map((g) => {
              if (g === 0) return null;
              const xs = rowXs.get(g) ?? [];
              const isUp = g < 0;
              // The "downstream" anchor: where this row connects toward You.
              // For gen=±1 the anchor is the You-card edge.
              // For gen=±2 the anchor is centerX on the gen=±1 row (or You-row
              // if no gen=±1 members exist).
              const stepTowardYou = isUp ? g + 1 : g - 1;
              const hasIntermediate = stepTowardYou !== 0 && genOffset.has(stepTowardYou);
              const anchorY = hasIntermediate
                ? yOfGen(stepTowardYou)
                : isUp
                ? yYou - YOU_CARD_H / 2
                : yYou + YOU_CARD_H / 2;
              const cardEdgeY = yOfGen(g) + (isUp ? CARD_H / 2 : -CARD_H / 2);
              return xs.map((x, i) => (
                <Path
                  key={`line-${g}-${i}`}
                  d={bezierPath(x, cardEdgeY, centerX, anchorY)}
                  stroke={isUp ? 'url(#lineUp)' : 'url(#lineDown)'}
                  strokeWidth={2}
                  fill="none"
                />
              ));
            })}

            {/* Same-gen members (spouse, siblings) — short horizontal connector */}
            {gen0Xs.map((x, i) => (
              <Path
                key={`gen0-curve-${i}`}
                d={horizBezier(
                  x,
                  yYou,
                  centerX + (x < centerX ? -YOU_CARD_W / 2 : YOU_CARD_W / 2),
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

          {/* Cards for every non-You generation */}
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
              />
            ));
          })}

          {/* You card — center of the universe, haldi-gold border */}
          <YouCardNode
            x={centerX}
            y={yYou}
            width={YOU_CARD_W}
            height={YOU_CARD_H}
            displayName={selfDisplayNameHindi || selfDisplayName || 'आप'}
            avatarUrl={selfAvatarUrl ?? null}
            isHindi={isHindi}
          />

          {/* Same-gen members (gen 0) — flanking the You-card */}
          {gen0Members.map((m, i) => (
            <MemberCardNode
              key={m.id}
              member={m}
              x={gen0Xs[i]}
              y={yYou}
              width={CARD_W}
              height={CARD_H}
              onPress={onMemberPress}
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
}: {
  member: FamilyMember;
  x: number;
  y: number;
  width: number;
  height: number;
  onPress?: (m: FamilyMember) => void;
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
    >
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
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  displayName: string;
  avatarUrl: string | null;
  isHindi: boolean;
}) {
  return (
    <View
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
    >
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
    </View>
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
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.text,
    textAlign: 'center',
    marginTop: 2,
    maxWidth: '100%',
  },
  nameYou: {
    fontSize: 14,
    fontWeight: '800',
    color: COLOR.text,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  rel: {
    fontSize: 11,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  relYou: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.haldiDeep,
    textAlign: 'center',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  years: {
    fontSize: 10,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
