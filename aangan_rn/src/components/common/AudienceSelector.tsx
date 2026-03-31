import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius } from '../../theme/spacing';

type AudienceMode = 'all' | 'level' | 'individual';

interface MemberItem {
  id: string;
  display_name: string;
  display_name_hindi: string | null;
  profile_photo_url: string | null;
}

interface AudienceSelectorProps {
  mode: AudienceMode;
  selectedLevel?: number;
  selectedLevelMax?: number;
  selectedMembers?: string[];
  onModeChange: (mode: AudienceMode) => void;
  onLevelChange?: (min: number, max: number) => void;
  onMembersChange?: (memberIds: string[]) => void;
  memberCount?: number;
  members?: MemberItem[];
}

const MODE_TABS: { key: AudienceMode; labelHi: string; labelEn: string }[] = [
  { key: 'all', labelHi: 'सभी', labelEn: 'All' },
  { key: 'level', labelHi: 'स्तर', labelEn: 'By Level' },
  { key: 'individual', labelHi: 'व्यक्तिगत', labelEn: 'Individual' },
];

export default function AudienceSelector({
  mode,
  selectedLevel = 1,
  selectedLevelMax = 99,
  selectedMembers = [],
  onModeChange,
  onLevelChange,
  onMembersChange,
  memberCount = 0,
  members = [],
}: AudienceSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.display_name.toLowerCase().includes(q) ||
      (m.display_name_hindi && m.display_name_hindi.includes(search))
    );
  });

  const toggleMember = useCallback(
    (id: string) => {
      if (!onMembersChange) return;
      if (selectedMembers.includes(id)) {
        onMembersChange(selectedMembers.filter((mid) => mid !== id));
      } else {
        onMembersChange([...selectedMembers, id]);
      }
    },
    [selectedMembers, onMembersChange],
  );

  return (
    <View style={styles.container}>
      {/* Mode Tabs */}
      <View style={styles.tabRow}>
        {MODE_TABS.map((tab) => {
          const isActive = mode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onModeChange(tab.key)}
            >
              <Text style={[styles.tabTextHi, isActive && styles.tabTextActive]}>
                {tab.labelHi}
              </Text>
              <Text style={[styles.tabTextEn, isActive && styles.tabTextEnActive]}>
                {tab.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* All Mode */}
      {mode === 'all' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTextHi}>सभी परिवार के सदस्य देख सकेंगे</Text>
          <Text style={styles.infoTextEn}>All family members will see this</Text>
          {memberCount > 0 && (
            <Text style={styles.countText}>
              {memberCount} सदस्य
            </Text>
          )}
        </View>
      )}

      {/* Level Mode */}
      {mode === 'level' && (
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel}>स्तर सीमा / Level Range</Text>

          <View style={styles.levelRow}>
            <View style={styles.levelInputGroup}>
              <Text style={styles.levelInputLabel}>न्यूनतम / Min</Text>
              <View style={styles.levelStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() =>
                    onLevelChange?.(Math.max(1, selectedLevel - 1), selectedLevelMax)
                  }
                >
                  <Text style={styles.stepperText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.levelValue}>{selectedLevel}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() =>
                    onLevelChange?.(
                      Math.min(selectedLevelMax, selectedLevel + 1),
                      selectedLevelMax,
                    )
                  }
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.levelDivider}>—</Text>

            <View style={styles.levelInputGroup}>
              <Text style={styles.levelInputLabel}>अधिकतम / Max</Text>
              <View style={styles.levelStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() =>
                    onLevelChange?.(selectedLevel, Math.max(selectedLevel, selectedLevelMax - 1))
                  }
                >
                  <Text style={styles.stepperText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.levelValue}>{selectedLevelMax}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() =>
                    onLevelChange?.(selectedLevel, Math.min(99, selectedLevelMax + 1))
                  }
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.liveCount}>
            ~{memberCount} सदस्य इस सीमा में
          </Text>
        </View>
      )}

      {/* Individual Mode */}
      {mode === 'individual' && (
        <View style={styles.individualContainer}>
          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="खोजें / Search..."
              placeholderTextColor={Colors.gray400}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Selected count */}
          <Text style={styles.selectedCount}>
            {selectedMembers.length} चुने गए / selected
          </Text>

          {/* Member list */}
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            style={styles.memberList}
            renderItem={({ item }) => {
              const isChecked = selectedMembers.includes(item.id);
              return (
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() => toggleMember(item.id)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarText}>
                      {(item.display_name_hindi || item.display_name).charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberNameHi} numberOfLines={1}>
                      {item.display_name_hindi || item.display_name}
                    </Text>
                    {item.display_name_hindi && (
                      <Text style={styles.memberNameEn} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>कोई सदस्य नहीं मिला</Text>
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.creamDark,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.haldiGold,
  },
  tabTextHi: {
    ...Typography.label,
    fontSize: 14,
    color: Colors.brownLight,
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabTextEn: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.gray500,
    marginTop: 1,
  },
  tabTextEnActive: {
    color: Colors.white,
    opacity: 0.8,
  },
  infoBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  infoTextHi: {
    ...Typography.body,
    color: Colors.brown,
  },
  infoTextEn: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.xs,
  },
  countText: {
    ...Typography.label,
    color: Colors.haldiGold,
    marginTop: Spacing.sm,
  },
  levelContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  levelLabel: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.md,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelInputGroup: {
    alignItems: 'center',
    flex: 1,
  },
  levelInputLabel: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginBottom: Spacing.sm,
  },
  levelStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.haldiGold,
  },
  stepperText: {
    ...Typography.button,
    fontSize: 20,
    color: Colors.white,
  },
  levelValue: {
    ...Typography.h3,
    color: Colors.brown,
    paddingHorizontal: Spacing.lg,
    minWidth: 50,
    textAlign: 'center',
  },
  levelDivider: {
    ...Typography.body,
    color: Colors.gray400,
    marginHorizontal: Spacing.sm,
  },
  liveCount: {
    ...Typography.bodySmall,
    color: Colors.mehndiGreen,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  individualContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    maxHeight: 350,
  },
  searchRow: {
    marginBottom: Spacing.md,
  },
  searchInput: {
    ...Typography.body,
    height: DADI_MIN_TAP_TARGET,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    color: Colors.brown,
    backgroundColor: Colors.cream,
  },
  selectedCount: {
    ...Typography.labelSmall,
    color: Colors.haldiGold,
    marginBottom: Spacing.sm,
  },
  memberList: {
    maxHeight: 220,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameHi: {
    ...Typography.body,
    color: Colors.brown,
    fontSize: 15,
  },
  memberNameEn: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.gray500,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
