import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { EVENT_TYPES, VALIDATION, EVENT_BUNDLES } from '../../config/constants';
import { useEventStore } from '../../stores/eventStore';
import { useFamilyStore } from '../../stores/familyStore';
import type { EventType, Ceremony, FamilyMember, BundleType } from '../../types/database';
import VoiceMicButton from '../../components/voice/VoiceMicButton';

type Props = NativeStackScreenProps<any, 'EventCreator'>;

type AudienceMode = 'level' | 'individual';

const EVENT_TYPE_HINDI: Record<string, string> = {
  wedding: '\u0935\u093F\u0935\u093E\u0939',
  engagement: '\u0938\u0917\u093E\u0908',
  puja: '\u092A\u0942\u091C\u093E',
  birthday: '\u091C\u0928\u094D\u092E\u0926\u093F\u0928',
  gathering: '\u092E\u093F\u0932\u0928',
  mundan: '\u092E\u0941\u0902\u0921\u0928',
  housewarming: '\u0917\u0943\u0939 \u092A\u094D\u0930\u0935\u0947\u0936',
  other: '\u0905\u0928\u094D\u092F',
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '\uD83D\uDC8D',
  engagement: '\uD83D\uDC8D',
  puja: '\uD83D\uDD4A\uFE0F',
  birthday: '\uD83C\uDF82',
  gathering: '\uD83E\uDD1D',
  mundan: '\u2702\uFE0F',
  housewarming: '\uD83C\uDFE0',
  other: '\u2B50',
};

const BUNDLE_INFO: Record<string, { name: string; nameHindi: string }> = {
  shagun: { name: 'Shagun', nameHindi: '\u0936\u0917\u0941\u0928' },
  mangal: { name: 'Mangal', nameHindi: '\u092E\u0902\u0917\u0932' },
  maharaja: { name: 'Maharaja', nameHindi: '\u092E\u0939\u093E\u0930\u093E\u091C\u093E' },
  puja: { name: 'Puja', nameHindi: '\u092A\u0942\u091C\u093E' },
  gathering: { name: 'Gathering', nameHindi: '\u092E\u093F\u0932\u0928' },
  engagement: { name: 'Engagement', nameHindi: '\u0938\u0917\u093E\u0908' },
};

export default function EventCreatorScreen({ navigation }: Props) {
  const { createEvent, isLoading: storeLoading } = useEventStore();
  const { members, fetchMembers } = useFamilyStore();

  // Form state
  const [eventType, setEventType] = useState<EventType>('wedding');
  const [title, setTitle] = useState('');
  const [titleHindi, setTitleHindi] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState<Date | null>(null);
  const [maxAttendees, setMaxAttendees] = useState('0');

  // Audience
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('level');
  const [audienceLevel, setAudienceLevel] = useState(3);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Ceremonies
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  // Bundle modal
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<BundleType | null>(null);

  // Saving
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Default RSVP deadline: 3 days before event
  useEffect(() => {
    const deadline = new Date(eventDate);
    deadline.setDate(deadline.getDate() - 3);
    if (deadline > new Date()) {
      setRsvpDeadline(deadline);
    }
  }, [eventDate]);

  const getMembersForLevel = useCallback(() => {
    return members.filter((m) => m.connection_level <= audienceLevel);
  }, [members, audienceLevel]);

  const filteredMembers = useCallback(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.member?.display_name?.toLowerCase().includes(q) ||
        m.member?.display_name_hindi?.toLowerCase().includes(q) ||
        m.member?.phone_number?.includes(q),
    );
  }, [members, memberSearch]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  // Ceremony builder
  const addCeremony = () => {
    if (ceremonies.length >= VALIDATION.maxCeremonies) {
      Alert.alert('\u0938\u0940\u092E\u093E', `\u0905\u0927\u093F\u0915\u0924\u092E ${VALIDATION.maxCeremonies} \u0915\u093E\u0930\u094D\u092F\u0915\u094D\u0930\u092E \u091C\u094B\u0921\u093C \u0938\u0915\u0924\u0947 \u0939\u0948\u0902`);
      return;
    }
    setCeremonies([...ceremonies, { time: '', name: '' }]);
  };

  const updateCeremony = (index: number, field: keyof Ceremony, value: string) => {
    setCeremonies((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const removeCeremony = (index: number) => {
    setCeremonies((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return '\u0936\u0940\u0930\u094D\u0937\u0915 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902';
    if (!venue.trim()) return '\u0938\u094D\u0925\u093E\u0928 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902';
    if (!address.trim()) return '\u092A\u0924\u093E \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902';
    if (audienceMode === 'individual' && selectedMembers.length === 0) {
      return '\u0915\u092E \u0938\u0947 \u0915\u092E \u090F\u0915 \u0938\u0926\u0938\u094D\u092F \u091A\u0941\u0928\u0947\u0902';
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('\u0924\u094D\u0930\u0941\u091F\u093F', error);
      return;
    }

    setIsSaving(true);

    // Combine date and time
    const combined = new Date(eventDate);
    combined.setHours(eventTime.getHours(), eventTime.getMinutes(), 0, 0);

    let endDateStr: string | null = null;
    if (endTime) {
      const endCombined = new Date(eventDate);
      endCombined.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
      endDateStr = endCombined.toISOString();
    }

    // Determine audience user IDs
    let audienceUserIds: string[] = [];
    if (audienceMode === 'level') {
      audienceUserIds = getMembersForLevel().map((m) => m.family_member_id);
    } else {
      audienceUserIds = selectedMembers;
    }

    const success = await createEvent({
      title: title.trim(),
      titleHindi: titleHindi.trim() || null,
      eventType,
      eventDate: combined.toISOString(),
      endDate: endDateStr,
      location: venue.trim(),
      locationHindi: null,
      address: address.trim(),
      latitude: null,
      longitude: null,
      audienceType: audienceMode === 'level' ? 'level' : 'custom',
      audienceLevel: audienceMode === 'level' ? 1 : null,
      audienceLevelMax: audienceMode === 'level' ? audienceLevel : null,
      audienceGroupId: null,
      rsvpDeadline: rsvpDeadline ? rsvpDeadline.toISOString() : null,
      maxAttendees: parseInt(maxAttendees, 10) || null,
      ceremonies: ceremonies.filter((c) => c.time.trim() && c.name.trim()),
      description: description.trim() || null,
      descriptionHindi: null,
      bannerUrl: null,
      audienceUserIds,
    });

    setIsSaving(false);

    if (success) {
      Alert.alert(
        '\u0938\u092B\u0932',
        '\u0907\u0935\u0947\u0902\u091F \u092C\u0928\u093E\u092F\u093E \u0917\u092F\u093E!',
        [{ text: '\u0920\u0940\u0915 \u0939\u0948', onPress: () => navigation.goBack() }],
      );
    } else {
      Alert.alert('\u0924\u094D\u0930\u0941\u091F\u093F', '\u0907\u0935\u0947\u0902\u091F \u092C\u0928\u093E\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={Typography.h1}>
            {'\u0928\u092F\u093E \u0907\u0935\u0947\u0902\u091F'}
          </Text>
          <Text style={Typography.bodySmall}>New Event</Text>
        </View>

        {/* Event Type Selector */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0907\u0935\u0947\u0902\u091F \u092A\u094D\u0930\u0915\u093E\u0930'}
          </Text>
          <Text style={styles.fieldSubLabel}>Event Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeScroll}
          >
            {EVENT_TYPES.map((et) => (
              <TouchableOpacity
                key={et.key}
                style={[
                  styles.typeChip,
                  { borderColor: et.color },
                  eventType === et.key && { backgroundColor: et.color },
                ]}
                onPress={() => setEventType(et.key as EventType)}
                activeOpacity={0.7}
              >
                <Text style={styles.typeIcon}>
                  {EVENT_TYPE_ICONS[et.key] || '\u2B50'}
                </Text>
                <Text
                  style={[
                    styles.typeText,
                    eventType === et.key && { color: Colors.white },
                  ]}
                >
                  {EVENT_TYPE_HINDI[et.key] || et.key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0936\u0940\u0930\u094D\u0937\u0915 *'}
          </Text>
          <Text style={styles.fieldSubLabel}>Event Title</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={title}
              onChangeText={setTitle}
              placeholder="\u0907\u0935\u0947\u0902\u091F \u0915\u093E \u0928\u093E\u092E"
              placeholderTextColor={Colors.gray400}
            />
            <VoiceMicButton
              onTranscript={(text) => setTitle(prev => prev + ' ' + text)}
              mode="append"
              size={24}
            />
          </View>
        </View>

        {/* Hindi Title */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0939\u093F\u0902\u0926\u0940 \u0936\u0940\u0930\u094D\u0937\u0915'}
          </Text>
          <Text style={styles.fieldSubLabel}>Hindi Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={titleHindi}
            onChangeText={setTitleHindi}
            placeholder="\u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u0928\u093E\u092E"
            placeholderTextColor={Colors.gray400}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0924\u093E\u0930\u0940\u0916 *'}
          </Text>
          <Text style={styles.fieldSubLabel}>Date</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerButtonText}>
              {'\uD83D\uDCC5 '}{formatDate(eventDate)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              minimumDate={new Date()}
              onChange={(_: DateTimePickerEvent, date?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setEventDate(date);
              }}
            />
          )}
        </View>

        {/* Time */}
        <View style={styles.row}>
          <View style={[styles.section, styles.flex]}>
            <Text style={styles.fieldLabel}>
              {'\u0938\u092E\u092F *'}
            </Text>
            <Text style={styles.fieldSubLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerButtonText}>
                {'\u23F0 '}{formatTime(eventTime)}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={eventTime}
                mode="time"
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (date) setEventTime(date);
                }}
              />
            )}
          </View>
          <View style={{ width: Spacing.md }} />
          <View style={[styles.section, styles.flex]}>
            <Text style={styles.fieldLabel}>
              {'\u0938\u092E\u093E\u092A\u094D\u0924\u093F'}
            </Text>
            <Text style={styles.fieldSubLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerButtonText}>
                {endTime ? `\u23F0 ${formatTime(endTime)}` : '\u091A\u0941\u0928\u0947\u0902'}
              </Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime || new Date()}
                mode="time"
                onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowEndTimePicker(Platform.OS === 'ios');
                  if (date) setEndTime(date);
                }}
              />
            )}
          </View>
        </View>

        {/* Venue */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0938\u094D\u0925\u093E\u0928 *'}
          </Text>
          <Text style={styles.fieldSubLabel}>Venue</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={venue}
              onChangeText={setVenue}
              placeholder="\u0938\u094D\u0925\u093E\u0928 \u0915\u093E \u0928\u093E\u092E"
              placeholderTextColor={Colors.gray400}
            />
            <VoiceMicButton
              onTranscript={(text) => setVenue(prev => prev + ' ' + text)}
              mode="append"
              size={24}
            />
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u092A\u0924\u093E *'}
          </Text>
          <Text style={styles.fieldSubLabel}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="\u092A\u0942\u0930\u093E \u092A\u0924\u093E"
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0935\u093F\u0935\u0930\u0923'}
          </Text>
          <Text style={styles.fieldSubLabel}>Description (optional)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <TextInput
              style={[styles.input, styles.textArea, { flex: 1 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="\u0915\u094B\u0908 \u0935\u093F\u0936\u0947\u0937 \u091C\u093E\u0928\u0915\u093E\u0930\u0940..."
              placeholderTextColor={Colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <VoiceMicButton
              onTranscript={(text) => setDescription(prev => prev + ' ' + text)}
              mode="append"
              size={24}
            />
          </View>
        </View>

        {/* RSVP Deadline */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'RSVP \u0938\u092E\u092F \u0938\u0940\u092E\u093E'}
          </Text>
          <Text style={styles.fieldSubLabel}>RSVP Deadline</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDeadlinePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerButtonText}>
              {rsvpDeadline ? `\uD83D\uDCC5 ${formatDate(rsvpDeadline)}` : '\u091A\u0941\u0928\u0947\u0902'}
            </Text>
          </TouchableOpacity>
          {showDeadlinePicker && (
            <DateTimePicker
              value={rsvpDeadline || new Date()}
              mode="date"
              minimumDate={new Date()}
              maximumDate={eventDate}
              onChange={(_: DateTimePickerEvent, date?: Date) => {
                setShowDeadlinePicker(Platform.OS === 'ios');
                if (date) setRsvpDeadline(date);
              }}
            />
          )}
        </View>

        {/* Max Attendees */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0905\u0927\u093F\u0915\u0924\u092E \u0932\u094B\u0917'}
          </Text>
          <Text style={styles.fieldSubLabel}>Max Attendees (0 = unlimited)</Text>
          <TextInput
            style={styles.input}
            value={maxAttendees}
            onChangeText={(t) => setMaxAttendees(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.gray400}
          />
        </View>

        {/* Audience Selector */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0928\u093F\u092E\u0902\u0924\u094D\u0930\u0923 \u0915\u093F\u0938\u0947 \u092D\u0947\u091C\u0947\u0902?'}
          </Text>
          <Text style={styles.fieldSubLabel}>Audience</Text>
          <View style={styles.audienceToggle}>
            <TouchableOpacity
              style={[styles.audienceTab, audienceMode === 'level' && styles.audienceTabActive]}
              onPress={() => setAudienceMode('level')}
              activeOpacity={0.7}
            >
              <Text style={[styles.audienceTabText, audienceMode === 'level' && styles.audienceTabTextActive]}>
                {'\u0938\u094D\u0924\u0930 \u0938\u0947'}
              </Text>
              <Text style={[styles.audienceTabSub, audienceMode === 'level' && { color: Colors.white }]}>
                By Level
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.audienceTab, audienceMode === 'individual' && styles.audienceTabActive]}
              onPress={() => setAudienceMode('individual')}
              activeOpacity={0.7}
            >
              <Text style={[styles.audienceTabText, audienceMode === 'individual' && styles.audienceTabTextActive]}>
                {'\u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924'}
              </Text>
              <Text style={[styles.audienceTabSub, audienceMode === 'individual' && { color: Colors.white }]}>
                Individual
              </Text>
            </TouchableOpacity>
          </View>

          {audienceMode === 'level' ? (
            <View style={styles.levelSelector}>
              <View style={styles.levelRow}>
                <TouchableOpacity
                  style={styles.levelButton}
                  onPress={() => setAudienceLevel(Math.max(1, audienceLevel - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.levelButtonText}>{'-'}</Text>
                </TouchableOpacity>
                <View style={styles.levelDisplay}>
                  <Text style={styles.levelNumber}>{audienceLevel}</Text>
                  <Text style={Typography.bodySmall}>
                    {'\u0938\u094D\u0924\u0930 \u0924\u0915'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.levelButton}
                  onPress={() => setAudienceLevel(Math.min(99, audienceLevel + 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.levelButtonText}>{'+'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[Typography.body, styles.memberCount]}>
                {getMembersForLevel().length} {'\u0938\u0926\u0938\u094D\u092F \u092E\u093F\u0932\u0947\u0902\u0917\u0947'}
              </Text>
            </View>
          ) : (
            <View style={styles.individualSelector}>
              <TextInput
                style={styles.searchInput}
                value={memberSearch}
                onChangeText={setMemberSearch}
                placeholder={'\uD83D\uDD0D \u0928\u093E\u092E \u092F\u093E \u092B\u093C\u094B\u0928 \u0938\u0947 \u0916\u094B\u091C\u0947\u0902...'}
                placeholderTextColor={Colors.gray400}
              />
              <Text style={[Typography.bodySmall, { marginBottom: Spacing.sm }]}>
                {selectedMembers.length} {'\u091A\u0941\u0928\u0947 \u0917\u090F'}
              </Text>
              <View style={styles.memberList}>
                {filteredMembers().map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberRow,
                      selectedMembers.includes(m.family_member_id) && styles.memberRowActive,
                    ]}
                    onPress={() => toggleMember(m.family_member_id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(m.member?.display_name_hindi || m.member?.display_name || '?')[0]}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={Typography.body}>
                        {m.member?.display_name_hindi || m.member?.display_name || '\u0905\u091C\u094D\u091E\u093E\u0924'}
                      </Text>
                      <Text style={Typography.caption}>
                        {m.relationship_label_hindi || m.relationship_type} | L{m.connection_level}
                      </Text>
                    </View>
                    <View style={[styles.checkBox, selectedMembers.includes(m.family_member_id) && styles.checkBoxActive]}>
                      {selectedMembers.includes(m.family_member_id) && (
                        <Text style={styles.checkMark}>{'\u2713'}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Ceremony Timeline Builder */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u0915\u093E\u0930\u094D\u092F\u0915\u094D\u0930\u092E'}
          </Text>
          <Text style={styles.fieldSubLabel}>Ceremony Timeline</Text>
          {ceremonies.map((ceremony, index) => (
            <View key={index} style={styles.ceremonyRow}>
              <TextInput
                style={[styles.input, styles.ceremonyTimeInput]}
                value={ceremony.time}
                onChangeText={(v) => updateCeremony(index, 'time', v)}
                placeholder="\u0938\u092E\u092F"
                placeholderTextColor={Colors.gray400}
              />
              <TextInput
                style={[styles.input, styles.ceremonyNameInput]}
                value={ceremony.name}
                onChangeText={(v) => updateCeremony(index, 'name', v)}
                placeholder="\u0928\u093E\u092E"
                placeholderTextColor={Colors.gray400}
              />
              <TouchableOpacity
                style={styles.ceremonyDelete}
                onPress={() => removeCeremony(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.ceremonyDeleteText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addCeremonyButton} onPress={addCeremony} activeOpacity={0.7}>
            <Text style={styles.addCeremonyText}>
              {'+ \u0915\u093E\u0930\u094D\u092F\u0915\u094D\u0930\u092E \u091C\u094B\u0921\u093C\u0947\u0902'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bundle Selector */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>
            {'\u092B\u094B\u091F\u094B \u092C\u0902\u0921\u0932'}
          </Text>
          <Text style={styles.fieldSubLabel}>Photo Bundle (optional)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowBundleModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerButtonText}>
              {selectedBundle
                ? `${BUNDLE_INFO[selectedBundle]?.nameHindi || selectedBundle} - \u20B9${EVENT_BUNDLES[selectedBundle]?.price || ''}`
                : '\u092C\u0902\u0921\u0932 \u091A\u0941\u0928\u0947\u0902'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={Typography.button}>
              {'\u0907\u0935\u0947\u0902\u091F \u092C\u0928\u093E\u090F\u0901 \u0914\u0930 \u0928\u093F\u092E\u0902\u0924\u094D\u0930\u0923 \u092D\u0947\u091C\u0947\u0902'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Bundle Modal */}
      <Modal
        visible={showBundleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBundleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[Typography.h2, { textAlign: 'center', marginBottom: Spacing.xl }]}>
              {'\u092B\u094B\u091F\u094B \u092C\u0902\u0921\u0932 \u091A\u0941\u0928\u0947\u0902'}
            </Text>
            <ScrollView>
              {(Object.keys(EVENT_BUNDLES) as BundleType[]).map((key) => {
                const bundle = EVENT_BUNDLES[key];
                const info = BUNDLE_INFO[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.bundleCard,
                      selectedBundle === key && styles.bundleCardActive,
                    ]}
                    onPress={() => setSelectedBundle(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bundleHeader}>
                      <Text style={[Typography.h3, selectedBundle === key && { color: Colors.white }]}>
                        {info?.nameHindi || key}
                      </Text>
                      <Text style={[Typography.bodyLarge, { fontWeight: '700' }, selectedBundle === key && { color: Colors.white }]}>
                        {'\u20B9'}{bundle.price}
                      </Text>
                    </View>
                    <Text style={[Typography.bodySmall, selectedBundle === key && { color: Colors.white }]}>
                      {bundle.storageGb}GB | {bundle.maxPhotos ?? '\u0905\u0938\u0940\u092E\u093F\u0924'} \u092B\u094B\u091F\u094B | {bundle.galleryMonths} \u092E\u0939\u0940\u0928\u0947
                      {bundle.video ? ' | \u0935\u0940\u0921\u093F\u092F\u094B' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors.gray300 }]}
                onPress={() => {
                  setSelectedBundle(null);
                  setShowBundleModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[Typography.button, { color: Colors.brown }]}>
                  {'\u0928\u0939\u0940\u0902 \u091A\u093E\u0939\u093F\u090F'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowBundleModal(false)}
                activeOpacity={0.7}
              >
                <Text style={Typography.button}>
                  {'\u091A\u0941\u0928\u0947\u0902'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge * 2,
  },
  header: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  fieldLabel: {
    ...Typography.label,
    marginBottom: 2,
  },
  fieldSubLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },

  // Inputs
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Typography.body,
    color: Colors.brown,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  searchInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Typography.body,
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },

  // Picker buttons
  pickerButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  pickerButtonText: {
    ...Typography.body,
    color: Colors.brown,
  },

  // Event type selector
  typeScroll: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.round,
    borderWidth: 2,
    backgroundColor: Colors.white,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    marginRight: Spacing.sm,
  },
  typeIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  typeText: {
    ...Typography.label,
    color: Colors.brown,
  },

  // Audience
  audienceToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  audienceTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  audienceTabActive: {
    backgroundColor: Colors.haldiGold,
    ...Shadow.sm,
  },
  audienceTabText: {
    ...Typography.label,
    color: Colors.brownLight,
  },
  audienceTabTextActive: {
    color: Colors.white,
  },
  audienceTabSub: {
    ...Typography.caption,
    color: Colors.gray500,
  },

  // Level selector
  levelSelector: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelButton: {
    width: DADI_MIN_BUTTON_HEIGHT,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  levelButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brown,
  },
  levelDisplay: {
    alignItems: 'center',
    marginHorizontal: Spacing.xxl,
  },
  levelNumber: {
    ...Typography.h1,
    color: Colors.haldiGold,
    fontSize: 40,
  },
  memberCount: {
    marginTop: Spacing.md,
    color: Colors.mehndiGreen,
    fontWeight: '600',
  },

  // Individual selector
  individualSelector: {
    marginTop: Spacing.sm,
  },
  memberList: {
    maxHeight: 300,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Shadow.sm,
  },
  memberRowActive: {
    backgroundColor: `${Colors.mehndiGreen}15`,
    borderWidth: 1,
    borderColor: Colors.mehndiGreen,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    ...Typography.label,
    color: Colors.brown,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: {
    backgroundColor: Colors.mehndiGreen,
    borderColor: Colors.mehndiGreen,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Ceremony builder
  ceremonyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  ceremonyTimeInput: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  ceremonyNameInput: {
    flex: 2,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  ceremonyDelete: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ceremonyDeleteText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  addCeremonyButton: {
    borderWidth: 2,
    borderColor: Colors.haldiGold,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  addCeremonyText: {
    ...Typography.label,
    color: Colors.haldiGold,
  },

  // Save
  saveButton: {
    backgroundColor: Colors.mehndiGreen,
    minHeight: DADI_MIN_BUTTON_HEIGHT + 4,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    ...Shadow.md,
  },
  saveDisabled: {
    opacity: 0.6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    maxHeight: '80%',
  },
  bundleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.gray200,
    ...Shadow.sm,
  },
  bundleCardActive: {
    borderColor: Colors.haldiGold,
    backgroundColor: Colors.haldiGold,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
