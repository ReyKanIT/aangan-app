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

import React, { useMemo } from 'react';
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

  // ── partition by generation ───────────────────────────────────────────
  // L1 = parents/spouse (above You), L2 = siblings (same row, sides),
  // L3 = children/grandchildren (below You). Number() cast defends
  // against null/string from PostgREST.
  const l1 = useMemo(
    () => members.filter((m) => Number(m.connection_level) === 1),
    [members]
  );
  const l2 = useMemo(
    () => members.filter((m) => Number(m.connection_level) === 2),
    [members]
  );
  const l3 = useMemo(
    () => members.filter((m) => Number(m.connection_level) >= 3),
    [members]
  );

  // ── compute positions ─────────────────────────────────────────────────
  // Center column at x=centerX. Each generation row at its own y. Within
  // a generation, cards are spaced COL_GAP apart and centered horizontally.
  const totalCols = Math.max(l1.length, l2.length + 1, l3.length, 1);
  const canvasW = Math.max(
    totalCols * (CARD_W + COL_GAP) + 2 * CANVAS_PAD,
    screenW
  );
  // Y positions: L1 at top, You in middle, L3 at bottom, L2 alongside You.
  const yL1 = CANVAS_PAD + CARD_H / 2;
  const yYou = yL1 + ROW_GAP + (YOU_CARD_H / 2 + CARD_H / 2);
  const yL3 = yYou + ROW_GAP + (YOU_CARD_H / 2 + CARD_H / 2);
  const canvasH = yL3 + CARD_H / 2 + CANVAS_PAD + 24; // 24 for label

  const centerX = canvasW / 2;

  // Helper — evenly spread `n` cards centered on centerX
  function spreadX(n: number, cardW: number): number[] {
    if (n === 0) return [];
    const totalW = n * cardW + (n - 1) * COL_GAP;
    const startX = centerX - totalW / 2 + cardW / 2;
    return Array.from({ length: n }, (_, i) => startX + i * (cardW + COL_GAP));
  }

  const xsL1 = spreadX(l1.length, CARD_W);
  const xsL3 = spreadX(l3.length, CARD_W);

  // L2: spread to left + right of You-card (skip the center slot)
  const l2Xs = useMemo(() => {
    if (l2.length === 0) return [];
    const halfLeft = Math.ceil(l2.length / 2);
    const positions: number[] = [];
    // Left of You-card
    for (let i = 0; i < halfLeft; i++) {
      positions.push(
        centerX - YOU_CARD_W / 2 - COL_GAP - (halfLeft - i) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    // Right of You-card
    for (let i = halfLeft; i < l2.length; i++) {
      positions.push(
        centerX + YOU_CARD_W / 2 + COL_GAP + (i - halfLeft) * (CARD_W + COL_GAP) + CARD_W / 2
      );
    }
    return positions;
  }, [l2.length, centerX]);

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
          {/* Curved connection lines */}
          <Svg
            width={canvasW}
            height={canvasH}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              {/* Subtle gradient for line color so they don't look stamped */}
              <LinearGradient id="lineL1" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLOR.lineL1} stopOpacity="0.7" />
                <Stop offset="1" stopColor={COLOR.lineL1} stopOpacity="0.3" />
              </LinearGradient>
              <LinearGradient id="lineL3" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COLOR.lineL3} stopOpacity="0.3" />
                <Stop offset="1" stopColor={COLOR.lineL3} stopOpacity="0.7" />
              </LinearGradient>
            </Defs>

            {/* L1 → You: curved Bezier from each parent card down to You */}
            {xsL1.map((x, i) => (
              <Path
                key={`l1-curve-${i}`}
                d={bezierPath(x, yL1 + CARD_H / 2, centerX, yYou - YOU_CARD_H / 2)}
                stroke="url(#lineL1)"
                strokeWidth={2}
                fill="none"
              />
            ))}

            {/* L2 → You: short horizontal connector with subtle curve */}
            {l2Xs.map((x, i) => (
              <Path
                key={`l2-curve-${i}`}
                d={horizBezier(x, yYou, centerX + (x < centerX ? -YOU_CARD_W / 2 : YOU_CARD_W / 2), yYou)}
                stroke={COLOR.lineL2}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="none"
                opacity={0.55}
              />
            ))}

            {/* You → L3: curved Bezier down to each child card */}
            {xsL3.map((x, i) => (
              <Path
                key={`l3-curve-${i}`}
                d={bezierPath(centerX, yYou + YOU_CARD_H / 2, x, yL3 - CARD_H / 2)}
                stroke="url(#lineL3)"
                strokeWidth={2}
                fill="none"
              />
            ))}
          </Svg>

          {/* Generation labels */}
          {l1.length > 0 && (
            <Text style={[styles.generationLabel, { top: CANVAS_PAD - 18, width: canvasW }]}>
              {'पीढ़ी 1 · पूर्वज / Previous generation'}
            </Text>
          )}
          {l3.length > 0 && (
            <Text style={[styles.generationLabel, { top: yL3 + CARD_H / 2 + 4, width: canvasW }]}>
              {'पीढ़ी −1 · वंशज / Next generation'}
            </Text>
          )}

          {/* L1 cards (parents/spouse) */}
          {l1.map((m, i) => (
            <MemberCardNode
              key={m.id}
              member={m}
              x={xsL1[i]}
              y={yL1}
              width={CARD_W}
              height={CARD_H}
              onPress={onMemberPress}
            />
          ))}

          {/* You card — bigger + haldi-gold border */}
          <YouCardNode
            x={centerX}
            y={yYou}
            width={YOU_CARD_W}
            height={YOU_CARD_H}
            displayName={selfDisplayNameHindi || selfDisplayName || 'आप'}
            avatarUrl={selfAvatarUrl ?? null}
            isHindi={isHindi}
          />

          {/* L2 cards (siblings) */}
          {l2.map((m, i) => (
            <MemberCardNode
              key={m.id}
              member={m}
              x={l2Xs[i]}
              y={yYou}
              width={CARD_W}
              height={CARD_H}
              onPress={onMemberPress}
            />
          ))}

          {/* L3 cards (descendants) */}
          {l3.map((m, i) => (
            <MemberCardNode
              key={m.id}
              member={m}
              x={xsL3[i]}
              y={yL3}
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
          {'चुटकी से zoom · double-tap to reset'}
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
