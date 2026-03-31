import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import type { FamilyMember } from '../../types/database';

interface MemberCardProps {
  member: FamilyMember;
  onPress?: () => void;
}

function getLevelBadge(level: number): { label: string; bg: string; text: string } {
  if (level === 1) {
    return { label: `L1`, bg: Colors.haldiGold, text: Colors.white };
  }
  if (level === 2) {
    return { label: `L2`, bg: Colors.mehndiGreen, text: Colors.white };
  }
  return { label: `L${level}`, bg: Colors.gray400, text: Colors.white };
}

export default function MemberCard({ member, onPress }: MemberCardProps) {
  const user = member.member;
  const displayName = user?.display_name_hindi || user?.display_name || 'सदस्य';
  const displayNameEn = user?.display_name_hindi ? user?.display_name : undefined;
  const initial = displayName.charAt(0);
  const badge = getLevelBadge(member.connection_level);
  const relationship =
    member.relationship_label_hindi || member.relationship_type || '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Photo */}
      {user?.profile_photo_url ? (
        <Image
          source={{ uri: user.profile_photo_url }}
          style={styles.photo}
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoInitial}>{initial}</Text>
        </View>
      )}

      {/* Level badge */}
      <View style={[styles.levelBadge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.levelText, { color: badge.text }]}>{badge.label}</Text>
      </View>

      {/* Name */}
      <Text style={styles.nameHindi} numberOfLines={1}>
        {displayName}
      </Text>
      {displayNameEn && (
        <Text style={styles.nameEn} numberOfLines={1}>
          {displayNameEn}
        </Text>
      )}

      {/* Relationship */}
      {relationship !== '' && (
        <View style={styles.relationshipPill}>
          <Text style={styles.relationshipText}>{relationship}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: DADI_MIN_TAP_TARGET,
    ...Shadow.sm,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.sm,
  },
  photoPlaceholder: {
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitial: {
    ...Typography.h2,
    color: Colors.haldiGoldDark,
    fontSize: 26,
  },
  levelBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    minWidth: 28,
    alignItems: 'center',
  },
  levelText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  nameHindi: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 15,
    textAlign: 'center',
  },
  nameEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    textAlign: 'center',
    marginTop: 1,
  },
  relationshipPill: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.haldiGold + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  relationshipText: {
    ...Typography.caption,
    color: Colors.haldiGold,
    fontSize: 12,
    fontWeight: '600',
  },
});
