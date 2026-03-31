import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useFamilyStore } from '../../stores/familyStore';
import { RELATIONSHIP_MAP } from '../../config/constants';
import type { FamilyMember, User } from '../../types/database';

type Props = NativeStackScreenProps<any, 'FamilyTree'>;

// -- Tab options --
type TabKey = 'L1' | 'L2' | 'L3' | 'all';

const TABS: { key: TabKey; label: string; labelEn: string }[] = [
  { key: 'L1', label: 'स्तर 1', labelEn: 'Level 1' },
  { key: 'L2', label: 'स्तर 2', labelEn: 'Level 2' },
  { key: 'L3', label: 'स्तर 3', labelEn: 'Level 3' },
  { key: 'all', label: 'सभी', labelEn: 'All' },
];

// -- Relationship options for AddMemberModal --
const RELATIONSHIP_OPTIONS = [
  { key: 'पिता', label: 'पिता (Father)' },
  { key: 'माता', label: 'माता (Mother)' },
  { key: 'भाई', label: 'भाई (Brother)' },
  { key: 'बहन', label: 'बहन (Sister)' },
  { key: 'पति', label: 'पति (Husband)' },
  { key: 'पत्नी', label: 'पत्नी (Wife)' },
  { key: 'बेटा', label: 'बेटा (Son)' },
  { key: 'बेटी', label: 'बेटी (Daughter)' },
  { key: 'दादा', label: 'दादा (Grandfather-P)' },
  { key: 'दादी', label: 'दादी (Grandmother-P)' },
  { key: 'नाना', label: 'नाना (Grandfather-M)' },
  { key: 'नानी', label: 'नानी (Grandmother-M)' },
  { key: 'चाचा', label: 'चाचा (Uncle-P)' },
  { key: 'चाची', label: 'चाची (Aunt-P)' },
  { key: 'मामा', label: 'मामा (Uncle-M)' },
  { key: 'मामी', label: 'मामी (Aunt-M)' },
  { key: 'बुआ', label: 'बुआ (Father\'s Sister)' },
  { key: 'फूफा', label: 'फूफा (Bua\'s Husband)' },
];

// -- Sub-components --

function MemberCard({ member }: { member: FamilyMember }) {
  const displayName = member.member?.display_name_hindi || member.member?.display_name || 'Unknown';
  const initial = displayName[0] || '?';
  const relationship = member.relationship_label_hindi || member.relationship_type || '';

  return (
    <View style={memberStyles.card}>
      <View style={memberStyles.photoContainer}>
        {member.member?.profile_photo_url ? (
          <View style={memberStyles.photo}>
            <Text style={memberStyles.photoText}>{initial}</Text>
          </View>
        ) : (
          <View style={memberStyles.photo}>
            <Text style={memberStyles.photoText}>{initial}</Text>
          </View>
        )}
        {member.is_verified && (
          <View style={memberStyles.verifiedBadge}>
            <Text style={memberStyles.verifiedIcon}>{'✓'}</Text>
          </View>
        )}
      </View>

      <Text style={memberStyles.name} numberOfLines={1}>
        {displayName}
      </Text>

      <Text style={memberStyles.relationship} numberOfLines={1}>
        {relationship}
      </Text>

      <View style={memberStyles.levelBadge}>
        <Text style={memberStyles.levelBadgeText}>
          {'L'}{member.connection_level}
        </Text>
      </View>
    </View>
  );
}

function EmptyLevel({ level }: { level: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{'👨‍👩‍👧‍👦'}</Text>
      <Text style={emptyStyles.title}>
        {level === 'all'
          ? 'कोई परिवार सदस्य नहीं'
          : `${level} में कोई सदस्य नहीं`}
      </Text>
      <Text style={emptyStyles.subtitle}>
        {level === 'all'
          ? 'No family members yet'
          : `No members in ${level}`}
      </Text>
    </View>
  );
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (phone: string, relationship: string, relationshipHindi: string, level: number) => void;
  isSubmitting: boolean;
}

function AddMemberModal({ visible, onClose, onSubmit, isSubmitting }: AddMemberModalProps) {
  const [phone, setPhone] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('');
  const [level, setLevel] = useState(1);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);

  const resetForm = useCallback(() => {
    setPhone('');
    setSelectedRelationship('');
    setLevel(1);
    setShowRelationshipPicker(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(() => {
    if (!phone || phone.length !== 10) {
      Alert.alert('त्रुटि', 'कृपया 10 अंकों का फोन नंबर दर्ज करें');
      return;
    }
    if (!selectedRelationship) {
      Alert.alert('त्रुटि', 'कृपया रिश्ता चुनें');
      return;
    }
    onSubmit(phone, selectedRelationship, selectedRelationship, level);
    resetForm();
  }, [phone, selectedRelationship, level, onSubmit, resetForm]);

  const selectedLabel = useMemo(() => {
    const found = RELATIONSHIP_OPTIONS.find((r) => r.key === selectedRelationship);
    return found?.label || '';
  }, [selectedRelationship]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={modalStyles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={modalStyles.closeText}>{'✕'}</Text>
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>{'परिवार जोड़ें'}</Text>
          <View style={modalStyles.closeButton} />
        </View>

        <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
          {/* Phone Input */}
          <Text style={modalStyles.fieldLabel}>{'फोन नंबर'}</Text>
          <View style={modalStyles.phoneRow}>
            <View style={modalStyles.countryCode}>
              <Text style={modalStyles.countryCodeText}>{'+91'}</Text>
            </View>
            <TextInput
              style={modalStyles.phoneInput}
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10 digit number"
              placeholderTextColor={Colors.gray400}
              keyboardType="phone-pad"
              maxLength={10}
              accessibilityLabel="Phone number"
            />
          </View>

          {/* Relationship Dropdown */}
          <Text style={modalStyles.fieldLabel}>{'रिश्ता (Relationship)'}</Text>
          <TouchableOpacity
            style={modalStyles.dropdownButton}
            onPress={() => setShowRelationshipPicker(!showRelationshipPicker)}
            accessibilityRole="button"
            accessibilityLabel="Select relationship"
          >
            <Text style={[
              modalStyles.dropdownText,
              !selectedRelationship && { color: Colors.gray400 },
            ]}>
              {selectedLabel || 'रिश्ता चुनें...'}
            </Text>
            <Text style={modalStyles.dropdownArrow}>{'▼'}</Text>
          </TouchableOpacity>

          {showRelationshipPicker && (
            <View style={modalStyles.pickerList}>
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    modalStyles.pickerItem,
                    selectedRelationship === opt.key && modalStyles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedRelationship(opt.key);
                    setShowRelationshipPicker(false);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[
                    modalStyles.pickerItemText,
                    selectedRelationship === opt.key && modalStyles.pickerItemTextSelected,
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Level Picker */}
          <Text style={modalStyles.fieldLabel}>{'स्तर (Level): '}{level}</Text>
          <View style={modalStyles.levelRow}>
            <TouchableOpacity
              style={[modalStyles.levelButton, level <= 1 && modalStyles.levelButtonDisabled]}
              onPress={() => setLevel(Math.max(1, level - 1))}
              disabled={level <= 1}
              accessibilityRole="button"
              accessibilityLabel="Decrease level"
            >
              <Text style={modalStyles.levelButtonText}>{'-'}</Text>
            </TouchableOpacity>

            <View style={modalStyles.levelDisplay}>
              <Text style={modalStyles.levelDisplayText}>{level}</Text>
            </View>

            <TouchableOpacity
              style={[modalStyles.levelButton, level >= 99 && modalStyles.levelButtonDisabled]}
              onPress={() => setLevel(Math.min(99, level + 1))}
              disabled={level >= 99}
              accessibilityRole="button"
              accessibilityLabel="Increase level"
            >
              <Text style={modalStyles.levelButtonText}>{'+'}</Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[modalStyles.submitButton, isSubmitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Invite family member"
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={modalStyles.submitButtonText}>{'निमंत्रण भेजें (Send Invite)'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// -- Main Component --

export default function FamilyTreeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { members, isLoading, error, fetchMembers, addMember, searchMembers } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Filter by level
    if (activeTab === 'L1') {
      filtered = filtered.filter((m) => m.connection_level === 1);
    } else if (activeTab === 'L2') {
      filtered = filtered.filter((m) => m.connection_level === 2);
    } else if (activeTab === 'L3') {
      filtered = filtered.filter((m) => m.connection_level === 3);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        const name = (m.member?.display_name || '').toLowerCase();
        const nameHindi = (m.member?.display_name_hindi || '').toLowerCase();
        const relationship = (m.relationship_type || '').toLowerCase();
        return name.includes(q) || nameHindi.includes(q) || relationship.includes(q);
      });
    }

    return filtered;
  }, [members, activeTab, searchQuery]);

  const handleRefresh = useCallback(async () => {
    await fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = useCallback(async (
    phone: string,
    relationship: string,
    relationshipHindi: string,
    level: number,
  ) => {
    setIsSubmitting(true);
    try {
      // First search for the user by phone
      const results = await searchMembers(phone);
      if (results.length === 0) {
        Alert.alert(
          'सदस्य नहीं मिला',
          'इस नंबर वाला कोई सदस्य नहीं मिला। पहले उन्हें ऐप पर आमंत्रित करें।',
          [{ text: 'ठीक है' }],
        );
        setIsSubmitting(false);
        return;
      }

      const targetUser = results[0];
      if (!targetUser.id) return;
      const success = await addMember(targetUser.id, relationship, relationshipHindi, level);
      if (success) {
        setShowAddModal(false);
        Alert.alert('सफल', 'परिवार सदस्य जोड़ दिया गया!');
      }
    } catch {
      Alert.alert('त्रुटि', 'सदस्य जोड़ने में समस्या हुई');
    }
    setIsSubmitting(false);
  }, [searchMembers, addMember]);

  const renderItem = useCallback(({ item }: { item: FamilyMember }) => (
    <MemberCard member={item} />
  ), []);

  const tabLabel = activeTab === 'all' ? 'all' : `Level ${activeTab.slice(1)}`;

  return (
    <View style={styles.screen}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { paddingTop: insets.top }]}>
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.key }}
              accessibilityLabel={`${tab.label} ${tab.labelEn}`}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>{'🔍'}</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="नाम से खोजें / Search by name"
            placeholderTextColor={Colors.gray400}
            returnKeyType="search"
            accessibilityLabel="Search family members"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearText}>{'✕'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Grid */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={!isLoading ? <EmptyLevel level={tabLabel} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[Colors.haldiGold]}
            tintColor={Colors.haldiGold}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredMembers.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Invite Banner */}
      <View style={[styles.inviteBanner, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add family member"
        >
          <Text style={styles.inviteIcon}>{'👨‍👩‍👧‍👦'}</Text>
          <Text style={styles.inviteText}>{'परिवार जोड़ें (Add Family)'}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Member Modal */}
      <AddMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  tabBar: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.haldiGold,
  },
  tabText: {
    ...Typography.label,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.haldiGold,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Shadow.sm,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    color: Colors.brown,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  clearButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 16,
    color: Colors.gray500,
  },
  errorBanner: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  row: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  listContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  inviteBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadow.lg,
  },
  inviteButton: {
    flexDirection: 'row',
    backgroundColor: Colors.mehndiGreen,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    paddingHorizontal: Spacing.xl,
  },
  inviteIcon: {
    fontSize: 22,
    marginRight: Spacing.sm,
  },
  inviteText: {
    ...Typography.button,
    color: Colors.white,
  },
});

const memberStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    ...Typography.h2,
    color: Colors.haldiGoldDark,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.mehndiGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  verifiedIcon: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '700',
  },
  name: {
    ...Typography.label,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: 2,
  },
  relationship: {
    ...Typography.caption,
    color: Colors.brownLight,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: Colors.haldiGold + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    ...Typography.caption,
    color: Colors.haldiGoldDark,
    fontWeight: '600',
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadow.sm,
    minHeight: 56,
  },
  closeButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: Colors.brown,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  body: {
    flex: 1,
    padding: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  countryCodeText: {
    ...Typography.body,
    color: Colors.brown,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.brown,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  dropdownText: {
    ...Typography.body,
    color: Colors.brown,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.gray500,
    marginLeft: Spacing.sm,
  },
  pickerList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    ...Shadow.md,
    maxHeight: 250,
  },
  pickerItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  pickerItemSelected: {
    backgroundColor: Colors.haldiGold + '15',
  },
  pickerItemText: {
    ...Typography.body,
    color: Colors.brown,
  },
  pickerItemTextSelected: {
    color: Colors.haldiGoldDark,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  levelButton: {
    width: DADI_MIN_BUTTON_HEIGHT,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelButtonDisabled: {
    backgroundColor: Colors.gray300,
  },
  levelButtonText: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '700',
  },
  levelDisplay: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDisplayText: {
    ...Typography.h2,
    color: Colors.brown,
  },
  submitButton: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
});
