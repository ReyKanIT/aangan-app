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
  Linking,
  useWindowDimensions,
} from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useFamilyStore } from '../../stores/familyStore';
import { useLanguageStore } from '../../stores/languageStore';
import { RELATIONSHIP_MAP } from '../../config/constants';
import LifeEventsList from '../../components/family/LifeEventsList';
import type { FamilyMember, User } from '../../types/database';
import VoiceMicButton from '../../components/voice/VoiceMicButton';

type Props = NativeStackScreenProps<any, 'FamilyTree'>;

// -- Tab options --
type TabKey = 'L1' | 'L2' | 'L3' | 'all' | 'tree' | 'events';

const TABS: { key: TabKey; label: string; labelEn: string }[] = [
  { key: 'L1', label: 'स्तर 1', labelEn: 'Level 1' },
  { key: 'L2', label: 'स्तर 2', labelEn: 'Level 2' },
  { key: 'L3', label: 'स्तर 3', labelEn: 'Level 3' },
  { key: 'all', label: 'सभी', labelEn: 'All' },
  { key: 'tree', label: 'पेड़', labelEn: 'Tree' },
  { key: 'events', label: 'जीवन यात्रा', labelEn: 'Life Events' },
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

// -- WhatsApp helpers --

const WHATSAPP_MESSAGE_AFTER_ADD =
  'नमस्ते! 🙏 मैंने आपको हमारे परिवार के Aangan ऐप में जोड़ा है।\n\n' +
  'Aangan एक private family social network है जहाँ हम family photos, events और updates share करते हैं।\n\n' +
  'अभी download करें: https://aangan.app\n\n' +
  'आपका परिवार आपका इंतज़ार कर रहा है! 💛';

const WHATSAPP_MESSAGE_INVITE_ONLY =
  'नमस्ते! 🙏\n\n' +
  'Aangan एक private family social network है जहाँ हम family photos, events और updates share करते हैं।\n\n' +
  'अभी download करें: https://aangan.app\n\n' +
  'आपका परिवार आपका इंतज़ार कर रहा है! 💛';

function openWhatsApp(message: string) {
  const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
  Linking.canOpenURL(url).then((supported) => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        'WhatsApp नहीं मिला',
        'आपके फोन में WhatsApp इंस्टॉल नहीं है।',
        [{ text: 'ठीक है' }],
      );
    }
  });
}

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

function EmptyLevel({ level, searchQuery }: { level: string; searchQuery: string }) {
  const showInviteButton = searchQuery.trim().length > 0;

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

      {showInviteButton && (
        <TouchableOpacity
          style={emptyStyles.whatsappButton}
          onPress={() => openWhatsApp(WHATSAPP_MESSAGE_INVITE_ONLY)}
          accessibilityRole="button"
          accessibilityLabel="Invite via WhatsApp"
        >
          <Text style={emptyStyles.whatsappButtonIcon}>{'💬'}</Text>
          <Text style={emptyStyles.whatsappButtonText}>
            {'नए सदस्य को WhatsApp से आमंत्रित करें'}
          </Text>
        </TouchableOpacity>
      )}
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

// -- Family Tree Visualization --

const TREE_COLORS = {
  haldiGold: '#C8A84B',
  mehndiGreen: '#7A9A3A',
  cream: '#FDFAF0',
  brown: '#5C3D1E',
  white: '#FFFFFF',
  l1Line: '#C8A84B',
  l2Line: '#7A9A3A',
  l3Line: '#A0856C',
};

const NODE_RADIUS = 30;
const USER_RADIUS = 38;
const CANVAS_HEIGHT = 420;
const ROW_Y = { l1: 80, user: 220, l2: 220, l3: 340 };
const COL_SPACING = 110;

function FamilyTreeVisualization({ members, isHindi }: { members: FamilyMember[]; isHindi: boolean }) {
  const { width: screenWidth } = useWindowDimensions();

  const l1 = useMemo(() => members.filter((m) => m.connection_level === 1), [members]);
  const l2 = useMemo(() => members.filter((m) => m.connection_level === 2), [members]);
  const l3 = useMemo(() => members.filter((m) => m.connection_level >= 3), [members]);

  // Total columns needed: max of each row + 1 (user in center)
  const totalCols = Math.max(l1.length, l2.length + 1, l3.length, 1);
  const canvasWidth = Math.max(totalCols * COL_SPACING + COL_SPACING, screenWidth);

  const centerX = canvasWidth / 2;

  // Compute x positions spread evenly around centerX
  function rowXPositions(count: number, y: number, excludeCenter = false): { x: number; y: number }[] {
    if (count === 0) return [];
    const totalWidth = (count - 1) * COL_SPACING;
    const startX = centerX - totalWidth / 2;
    // If this row shares y with user, offset slightly so nodes don't overlap center
    return Array.from({ length: count }, (_, i) => {
      let x = startX + i * COL_SPACING;
      // Nudge L2 nodes away from center if they'd collide
      if (excludeCenter) {
        const halfTotal = totalWidth / 2;
        const slot = startX + i * COL_SPACING;
        // push nodes left of center further left, right of center further right
        if (slot < centerX - USER_RADIUS - 10) {
          x = Math.min(slot, centerX - USER_RADIUS - 20 - (count - 1 - i) * COL_SPACING);
        } else if (slot > centerX + USER_RADIUS + 10) {
          x = Math.max(slot, centerX + USER_RADIUS + 20 + i * COL_SPACING);
        }
      }
      return { x, y };
    });
  }

  const l1Positions = rowXPositions(l1.length, ROW_Y.l1);
  const l3Positions = rowXPositions(l3.length, ROW_Y.l3);

  // For L2: spread left and right of the user node at y=220
  const l2Positions = useMemo(() => {
    if (l2.length === 0) return [];
    const half = Math.ceil(l2.length / 2);
    const positions: { x: number; y: number }[] = [];
    // Left side
    for (let i = 0; i < half; i++) {
      positions.push({ x: centerX - USER_RADIUS - 20 - (half - i) * COL_SPACING, y: ROW_Y.l2 });
    }
    // Right side
    for (let i = half; i < l2.length; i++) {
      positions.push({ x: centerX + USER_RADIUS + 20 + (i - half + 1) * COL_SPACING, y: ROW_Y.l2 });
    }
    return positions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l2.length, centerX]);

  if (members.length === 0) {
    return (
      <View style={treeStyles.emptyContainer}>
        <Text style={treeStyles.emptyIcon}>{'🌳'}</Text>
        <Text style={treeStyles.emptyTitle}>
          {isHindi ? 'परिवार के सदस्य जोड़ें' : 'Add family members'}
        </Text>
        <Text style={treeStyles.emptySubtitle}>
          {'to see the family tree / पेड़ देखने के लिए'}
        </Text>
      </View>
    );
  }

  function truncateName(name: string, max = 8): string {
    if (!name) return '?';
    return name.length > max ? name.slice(0, max) + '…' : name;
  }

  function memberInitial(m: FamilyMember): string {
    const name = m.member?.display_name_hindi || m.member?.display_name || '?';
    return name[0] || '?';
  }

  function memberShortName(m: FamilyMember): string {
    const name = m.member?.display_name_hindi || m.member?.display_name || '?';
    return truncateName(name, 8);
  }

  function memberRelLabel(m: FamilyMember): string {
    return truncateName(m.relationship_label_hindi || m.relationship_type || '', 7);
  }

  return (
    <View style={treeStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Svg width={canvasWidth} height={CANVAS_HEIGHT}>
            {/* --- Connection lines (drawn first, behind nodes) --- */}

            {/* L1 lines */}
            {l1Positions.map((pos, i) => (
              <Line
                key={`l1-line-${i}`}
                x1={centerX}
                y1={ROW_Y.user - USER_RADIUS}
                x2={pos.x}
                y2={ROW_Y.l1 + NODE_RADIUS}
                stroke={TREE_COLORS.l1Line}
                strokeWidth={2}
              />
            ))}

            {/* L2 lines */}
            {l2Positions.map((pos, i) => (
              <Line
                key={`l2-line-${i}`}
                x1={centerX}
                y1={ROW_Y.user}
                x2={pos.x}
                y2={pos.y}
                stroke={TREE_COLORS.l2Line}
                strokeWidth={2}
                strokeDasharray="6,4"
              />
            ))}

            {/* L3 lines */}
            {l3Positions.map((pos, i) => (
              <Line
                key={`l3-line-${i}`}
                x1={centerX}
                y1={ROW_Y.user + USER_RADIUS}
                x2={pos.x}
                y2={ROW_Y.l3 - NODE_RADIUS}
                stroke={TREE_COLORS.l3Line}
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            ))}

            {/* --- Current user node --- */}
            <G>
              <Circle
                cx={centerX}
                cy={ROW_Y.user}
                r={USER_RADIUS}
                fill={TREE_COLORS.cream}
                stroke={TREE_COLORS.mehndiGreen}
                strokeWidth={4}
              />
              <SvgText
                x={centerX}
                y={ROW_Y.user - 6}
                textAnchor="middle"
                fontSize={16}
                fontWeight="700"
                fill={TREE_COLORS.mehndiGreen}
              >
                {'आप'}
              </SvgText>
              <SvgText
                x={centerX}
                y={ROW_Y.user + 14}
                textAnchor="middle"
                fontSize={11}
                fill={TREE_COLORS.brown}
              >
                {'You'}
              </SvgText>
            </G>

            {/* --- Level 1 nodes (top row) --- */}
            {l1.map((member, i) => {
              const pos = l1Positions[i];
              return (
                <G key={`l1-node-${member.id}`}>
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS}
                    fill={TREE_COLORS.white}
                    stroke={TREE_COLORS.haldiGold}
                    strokeWidth={3}
                  />
                  <SvgText
                    x={pos.x}
                    y={pos.y + 6}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight="700"
                    fill={TREE_COLORS.brown}
                  >
                    {memberInitial(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill={TREE_COLORS.brown}
                  >
                    {memberShortName(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 30}
                    textAnchor="middle"
                    fontSize={10}
                    fill={TREE_COLORS.haldiGold}
                  >
                    {memberRelLabel(member)}
                  </SvgText>
                </G>
              );
            })}

            {/* --- Level 2 nodes (middle row, flanking user) --- */}
            {l2.map((member, i) => {
              const pos = l2Positions[i];
              return (
                <G key={`l2-node-${member.id}`}>
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS}
                    fill={TREE_COLORS.white}
                    stroke={TREE_COLORS.haldiGold}
                    strokeWidth={3}
                  />
                  <SvgText
                    x={pos.x}
                    y={pos.y + 6}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight="700"
                    fill={TREE_COLORS.brown}
                  >
                    {memberInitial(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill={TREE_COLORS.brown}
                  >
                    {memberShortName(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 30}
                    textAnchor="middle"
                    fontSize={10}
                    fill={TREE_COLORS.mehndiGreen}
                  >
                    {memberRelLabel(member)}
                  </SvgText>
                </G>
              );
            })}

            {/* --- Level 3 nodes (bottom row) --- */}
            {l3.map((member, i) => {
              const pos = l3Positions[i];
              return (
                <G key={`l3-node-${member.id}`}>
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_RADIUS}
                    fill={TREE_COLORS.white}
                    stroke={TREE_COLORS.haldiGold}
                    strokeWidth={3}
                  />
                  <SvgText
                    x={pos.x}
                    y={pos.y + 6}
                    textAnchor="middle"
                    fontSize={18}
                    fontWeight="700"
                    fill={TREE_COLORS.brown}
                  >
                    {memberInitial(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 16}
                    textAnchor="middle"
                    fontSize={11}
                    fill={TREE_COLORS.brown}
                  >
                    {memberShortName(member)}
                  </SvgText>
                  <SvgText
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 30}
                    textAnchor="middle"
                    fontSize={10}
                    fill={TREE_COLORS.brown}
                    opacity={0.6}
                  >
                    {memberRelLabel(member)}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* Legend */}
      <View style={treeStyles.legend}>
        <View style={treeStyles.legendRow}>
          <View style={[treeStyles.legendDot, { backgroundColor: TREE_COLORS.haldiGold }]} />
          <Text style={treeStyles.legendText}>
            {'L1 — करीबी परिवार / Close Family'}
          </Text>
        </View>
        <View style={treeStyles.legendRow}>
          <View style={[treeStyles.legendDot, { backgroundColor: TREE_COLORS.mehndiGreen }]} />
          <Text style={treeStyles.legendText}>
            {'L2 — विस्तारित परिवार / Extended'}
          </Text>
        </View>
        <View style={treeStyles.legendRow}>
          <View style={[treeStyles.legendDot, { backgroundColor: '#A0856C' }]} />
          <Text style={treeStyles.legendText}>
            {'L3 — दूर के रिश्ते / Distant Relatives'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// -- Main Component --

export default function FamilyTreeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { members, isLoading, error, fetchMembers, addMember, searchMembers } = useFamilyStore();
  const { isHindi } = useLanguageStore();

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
        // Show WhatsApp invite alert after successful member addition
        Alert.alert(
          'WhatsApp पर आमंत्रित करें?',
          'सदस्य को Aangan ऐप के बारे में WhatsApp मेसेज भेजें।',
          [
            {
              text: 'WhatsApp पर भेजें',
              onPress: () => openWhatsApp(WHATSAPP_MESSAGE_AFTER_ADD),
            },
            {
              text: 'नहीं, बाद में',
              style: 'cancel',
            },
          ],
        );
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
                {isHindi ? tab.label : tab.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search — hidden on tree and events tabs */}
      {activeTab !== 'tree' && activeTab !== 'events' && (
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
            <VoiceMicButton
              onTranscript={(text) => setSearchQuery(text)}
              mode="replace"
              size={22}
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
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Tree, Life Events, or Member Grid */}
      {activeTab === 'events' ? (
        <LifeEventsList
          isHindi={isHindi}
          onAddEvent={() => navigation.navigate('AddLifeEvent')}
          onEditEvent={(eventId) => navigation.navigate('AddLifeEvent', { eventId })}
        />
      ) : activeTab === 'tree' ? (
        <FamilyTreeVisualization members={members} isHindi={isHindi} />
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyLevel level={tabLabel} searchQuery={searchQuery} />
            ) : null
          }
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
      )}

      {/* Invite Banner — hidden on events tab (has its own FAB) */}
      {activeTab !== 'events' && (
        <View style={[styles.inviteBanner, { paddingBottom: insets.bottom + Spacing.md }]}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add family member"
          >
            <Text style={styles.inviteIcon}>{'👨‍👩‍👧‍👦'}</Text>
            <Text style={styles.inviteText}>{isHindi ? 'परिवार जोड़ें' : 'Add Family'}</Text>
          </TouchableOpacity>
        </View>
      )}

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
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  whatsappButtonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  whatsappButtonText: {
    ...Typography.button,
    color: Colors.white,
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

const treeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
  },
  legend: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: 120, // leave room for invite banner
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: Spacing.sm,
  },
  legendText: {
    ...Typography.bodySmall,
    color: Colors.brown,
  },
});
