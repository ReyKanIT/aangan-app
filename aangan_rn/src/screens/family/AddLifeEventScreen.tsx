import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';
import {
  useLifeEventStore,
  DEFAULT_SUTAK_RULES,
  DEFAULT_SUTAK_DAYS,
  type CreateLifeEventInput,
} from '../../stores/lifeEventStore';
import type { LifeEventType, SutakRules, LifeEvent } from '../../types/database';

type Props = NativeStackScreenProps<any, 'AddLifeEvent'>;

// ─── Relationship options ───────────────────────────────────────────────────
const RELATIONSHIP_OPTIONS = [
  { key: 'स्वयं', label: 'स्वयं (Self)' },
  { key: 'पत्नी', label: 'पत्नी (Wife)' },
  { key: 'पति', label: 'पति (Husband)' },
  { key: 'बेटा', label: 'बेटा (Son)' },
  { key: 'बेटी', label: 'बेटी (Daughter)' },
  { key: 'पिता', label: 'पिता (Father)' },
  { key: 'माता', label: 'माता (Mother)' },
  { key: 'भाई', label: 'भाई (Brother)' },
  { key: 'बहन', label: 'बहन (Sister)' },
  { key: 'दादा', label: 'दादा (Grandfather)' },
  { key: 'दादी', label: 'दादी (Grandmother)' },
  { key: 'नाना', label: 'नाना' },
  { key: 'नानी', label: 'नानी' },
  { key: 'चाचा', label: 'चाचा (Uncle)' },
  { key: 'ताया', label: 'ताया (Elder Uncle)' },
  { key: 'अन्य', label: 'अन्य (Other)' },
];

// ─── Sutak rule definitions ──────────────────────────────────────────────────
interface SutakRuleDef {
  key: keyof Omit<SutakRules, 'customNotes'>;
  label: string;
  labelEn: string;
  icon: string;
}

const SUTAK_RULE_DEFS: SutakRuleDef[] = [
  { key: 'noTempleVisit',         label: 'मंदिर न जाएं',              labelEn: 'No temple visits',            icon: '⛩️' },
  { key: 'noReligiousCeremonies', label: 'हवन / यज्ञ न करें',         labelEn: 'No havans / religious rites', icon: '🔥' },
  { key: 'noPujaAtHome',          label: 'घर की पूजा भी न करें',      labelEn: 'No puja at home either',      icon: '🪔' },
  { key: 'noAuspiciousWork',      label: 'मांगलिक कार्य न करें',      labelEn: 'No auspicious work',          icon: '🎊' },
  { key: 'noFoodSharing',         label: 'दूसरों को भोजन न परोसें',   labelEn: 'Do not serve food to others', icon: '🍽️' },
  { key: 'noNewVentures',         label: 'नया कार्य शुरू न करें',     labelEn: 'No new ventures / purchases', icon: '🚀' },
];

// ─── Small helper components ─────────────────────────────────────────────────

function SectionTitle({ title, titleEn, isHindi }: { title: string; titleEn: string; isHindi: boolean }) {
  return (
    <View style={sectionTitleStyles.row}>
      <View style={sectionTitleStyles.line} />
      <Text style={sectionTitleStyles.text}>{isHindi ? title : titleEn}</Text>
      <View style={sectionTitleStyles.line} />
    </View>
  );
}

function FieldLabel({ hi, en }: { hi: string; en: string }) {
  return (
    <Text style={fieldStyles.label}>
      {hi}{'  '}
      <Text style={fieldStyles.labelEn}>({en})</Text>
    </Text>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AddLifeEventScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const { createEvent, updateEvent, events } = useLifeEventStore();

  // If editing, pre-populate
  const editEvent: LifeEvent | undefined = route.params?.eventId
    ? events.find((e) => e.id === (route.params as { eventId?: string })?.eventId)
    : undefined;
  const isEditing = Boolean(editEvent);

  // ── form state ──────────────────────────────────────────────────────────────
  const [eventType, setEventType] = useState<LifeEventType>(editEvent?.event_type ?? 'birth');
  const [personName, setPersonName] = useState(editEvent?.person_name ?? '');
  const [personNameHindi, setPersonNameHindi] = useState(editEvent?.person_name_hindi ?? '');
  const [eventDate, setEventDate] = useState(editEvent?.event_date ?? new Date().toISOString().split('T')[0]);
  const [relationship, setRelationship] = useState(editEvent?.relationship ?? '');
  const [babyGender, setBabyGender] = useState<'boy' | 'girl' | 'not_disclosed'>(editEvent?.baby_gender ?? 'not_disclosed');
  const [birthPlace, setBirthPlace] = useState(editEvent?.birth_place ?? '');
  const [ageAtDeath, setAgeAtDeath] = useState(editEvent?.age_at_death?.toString() ?? '');
  const [notes, setNotes] = useState(editEvent?.notes ?? '');
  const [isVisibleToFamily, setIsVisibleToFamily] = useState(editEvent?.is_visible_to_family ?? true);

  // ── sutak state ─────────────────────────────────────────────────────────────
  const [sutakEnabled, setSutakEnabled] = useState(editEvent?.sutak_enabled ?? true);
  const [sutakDays, setSutakDays] = useState(
    editEvent?.sutak_days?.toString() ?? DEFAULT_SUTAK_DAYS[eventType].toString(),
  );
  const [sutakRules, setSutakRules] = useState<SutakRules>(
    editEvent?.sutak_rules ?? DEFAULT_SUTAK_RULES,
  );

  const [isSaving, setIsSaving] = useState(false);

  // Reset sutak days when event type changes (and not editing)
  useEffect(() => {
    if (!isEditing) {
      setSutakDays(DEFAULT_SUTAK_DAYS[eventType].toString());
      setSutakRules({
        ...DEFAULT_SUTAK_RULES,
        noPujaAtHome: eventType === 'death',
        noNewVentures: eventType === 'death',
      });
    }
  }, [eventType, isEditing]);

  const toggleRule = useCallback((key: keyof Omit<SutakRules, 'customNotes'>) => {
    setSutakRules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── date helpers ─────────────────────────────────────────────────────────────
  const handleDateChange = useCallback((text: string) => {
    // Accept DD/MM/YYYY and convert to YYYY-MM-DD
    const cleaned = text.replace(/[^\d/]/g, '');
    setEventDate(cleaned);
  }, []);

  const parsedDate = (() => {
    // Try YYYY-MM-DD first
    if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return eventDate;
    // Try DD/MM/YYYY
    const m = eventDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return null;
  })();

  // ── validation & save ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!personName.trim()) {
      Alert.alert(isHindi ? 'नाम जरूरी है' : 'Name required', isHindi ? 'कृपया व्यक्ति का नाम दर्ज करें' : 'Please enter the person\'s name');
      return;
    }
    if (!parsedDate) {
      Alert.alert(isHindi ? 'दिनांक गलत है' : 'Invalid date', isHindi ? 'कृपया YYYY-MM-DD या DD/MM/YYYY प्रारूप में दिनांक दर्ज करें' : 'Enter date as YYYY-MM-DD or DD/MM/YYYY');
      return;
    }
    const days = parseInt(sutakDays, 10);
    if (sutakEnabled && (isNaN(days) || days < 1 || days > 90)) {
      Alert.alert(isHindi ? 'सूतक दिन' : 'Sutak days', isHindi ? 'कृपया 1–90 के बीच दिन दर्ज करें' : 'Enter sutak days between 1 and 90');
      return;
    }

    setIsSaving(true);
    const input: CreateLifeEventInput = {
      event_type: eventType,
      person_name: personName.trim(),
      person_name_hindi: personNameHindi.trim() || undefined,
      event_date: parsedDate,
      relationship: relationship || undefined,
      baby_gender: eventType === 'birth' ? babyGender : undefined,
      birth_place: eventType === 'birth' ? birthPlace.trim() || undefined : undefined,
      age_at_death: eventType === 'death' && ageAtDeath ? parseInt(ageAtDeath, 10) || undefined : undefined,
      sutak_enabled: sutakEnabled,
      sutak_days: sutakEnabled ? days : DEFAULT_SUTAK_DAYS[eventType],
      sutak_rules: { ...sutakRules, customNotes: sutakRules.customNotes.trim() },
      notes: notes.trim() || undefined,
      is_visible_to_family: isVisibleToFamily,
    };

    try {
      const result = isEditing
        ? await updateEvent(editEvent!.id, input)
        : await createEvent(input);

      if (result) {
        Alert.alert(
          isHindi ? 'सहेजा गया ✓' : 'Saved ✓',
          isHindi
            ? (isEditing ? 'घटना अपडेट हो गई' : 'घटना जोड़ी गई')
            : (isEditing ? 'Event updated' : 'Event added'),
          [{ text: isHindi ? 'ठीक है' : 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, [personName, parsedDate, sutakEnabled, sutakDays, sutakRules, eventType, babyGender, birthPlace, ageAtDeath, personNameHindi, relationship, notes, isVisibleToFamily, isEditing, editEvent, createEvent, updateEvent, navigation, isHindi]);

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>{isHindi ? 'रद्द' : 'Cancel'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing
            ? (isHindi ? 'घटना संपादित करें' : 'Edit Event')
            : (isHindi ? 'नई घटना जोड़ें' : 'Add Life Event')}
        </Text>
        <TouchableOpacity
          style={[styles.headerBtn, styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save"
        >
          {isSaving
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveText}>{isHindi ? 'सहेजें' : 'Save'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.huge }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Event Type Selector ── */}
        <SectionTitle title="घटना का प्रकार" titleEn="Event Type" isHindi={isHindi} />
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeCard, eventType === 'birth' && styles.typeCardActive]}
            onPress={() => setEventType('birth')}
            accessibilityRole="radio"
            accessibilityState={{ checked: eventType === 'birth' }}
          >
            <Text style={styles.typeEmoji}>{'👶'}</Text>
            <Text style={[styles.typeLabel, eventType === 'birth' && styles.typeLabelActive]}>
              {isHindi ? 'जन्म' : 'Birth'}
            </Text>
            <Text style={styles.typeSubLabel}>{isHindi ? 'Birth' : 'जन्म'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeCard, eventType === 'death' && styles.typeCardDeath]}
            onPress={() => setEventType('death')}
            accessibilityRole="radio"
            accessibilityState={{ checked: eventType === 'death' }}
          >
            <Text style={styles.typeEmoji}>{'🙏'}</Text>
            <Text style={[styles.typeLabel, eventType === 'death' && styles.typeLabelDeath]}>
              {isHindi ? 'देहांत' : 'Death'}
            </Text>
            <Text style={styles.typeSubLabel}>{isHindi ? 'Death' : 'देहांत'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Basic Info ── */}
        <SectionTitle title="व्यक्ति की जानकारी" titleEn="Person Details" isHindi={isHindi} />
        <View style={styles.card}>
          <FieldLabel hi="नाम *" en="Name (required)" />
          <TextInput
            style={fieldStyles.input}
            value={personName}
            onChangeText={setPersonName}
            placeholder={isHindi ? 'पूरा नाम लिखें' : 'Enter full name'}
            placeholderTextColor={Colors.gray400}
            accessibilityLabel="Person name"
          />

          <View style={styles.fieldDivider} />
          <FieldLabel hi="नाम (हिंदी में)" en="Name in Hindi" />
          <TextInput
            style={fieldStyles.input}
            value={personNameHindi}
            onChangeText={setPersonNameHindi}
            placeholder="जैसे: राम कुमार शर्मा"
            placeholderTextColor={Colors.gray400}
            accessibilityLabel="Person name in Hindi"
          />

          <View style={styles.fieldDivider} />
          <FieldLabel hi="दिनांक *" en="Date (YYYY-MM-DD)" />
          <TextInput
            style={fieldStyles.input}
            value={eventDate}
            onChangeText={handleDateChange}
            placeholder="2024-03-15  या  15/03/2024"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
            accessibilityLabel="Event date"
          />

          <View style={styles.fieldDivider} />
          <FieldLabel hi="रिश्ता" en="Relationship to you" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <View style={styles.pillRow}>
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.pill, relationship === opt.key && styles.pillActive]}
                  onPress={() => setRelationship(relationship === opt.key ? '' : opt.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: relationship === opt.key }}
                >
                  <Text style={[styles.pillText, relationship === opt.key && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* ── Birth-specific ── */}
        {eventType === 'birth' && (
          <>
            <SectionTitle title="जन्म की विशेष जानकारी" titleEn="Birth Details" isHindi={isHindi} />
            <View style={styles.card}>
              <FieldLabel hi="शिशु का लिंग" en="Baby's gender" />
              <View style={styles.genderRow}>
                {[
                  { key: 'boy', hi: '👦 बेटा', en: '👦 Boy' },
                  { key: 'girl', hi: '👧 बेटी', en: '👧 Girl' },
                  { key: 'not_disclosed', hi: '🤷 नहीं बताना', en: '🤷 Not disclosed' },
                ].map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.genderBtn, babyGender === g.key && styles.genderBtnActive]}
                    onPress={() => setBabyGender(g.key as typeof babyGender)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: babyGender === g.key }}
                  >
                    <Text style={[styles.genderText, babyGender === g.key && styles.genderTextActive]}>
                      {isHindi ? g.hi : g.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.fieldDivider} />
              <FieldLabel hi="जन्म स्थान" en="Place of birth" />
              <TextInput
                style={fieldStyles.input}
                value={birthPlace}
                onChangeText={setBirthPlace}
                placeholder={isHindi ? 'जैसे: दिल्ली, उत्तर प्रदेश' : 'e.g. Delhi, Uttar Pradesh'}
                placeholderTextColor={Colors.gray400}
                accessibilityLabel="Birth place"
              />
            </View>
          </>
        )}

        {/* ── Death-specific ── */}
        {eventType === 'death' && (
          <>
            <SectionTitle title="देहांत की जानकारी" titleEn="Death Details" isHindi={isHindi} />
            <View style={styles.card}>
              <FieldLabel hi="आयु (वर्षों में)" en="Age at time of death" />
              <TextInput
                style={fieldStyles.input}
                value={ageAtDeath}
                onChangeText={setAgeAtDeath}
                placeholder={isHindi ? 'जैसे: 75' : 'e.g. 75'}
                placeholderTextColor={Colors.gray400}
                keyboardType="numeric"
                accessibilityLabel="Age at death"
              />
            </View>
          </>
        )}

        {/* ── Sutak Section ── */}
        <SectionTitle
          title={eventType === 'birth' ? 'सूतक नियम' : 'पातक / सूतक नियम'}
          titleEn={eventType === 'birth' ? 'Sutak Rules (Birth Impurity)' : 'Sutak Rules (Death Impurity)'}
          isHindi={isHindi}
        />

        {/* Sutak info banner */}
        <View style={sutakStyles.infoBanner}>
          <Text style={sutakStyles.infoIcon}>{eventType === 'birth' ? '👶' : '🙏'}</Text>
          <Text style={sutakStyles.infoText}>
            {eventType === 'birth'
              ? (isHindi
                ? 'जन्म के बाद परिवार में सूतक होता है। इस दौरान धार्मिक कार्यों में कुछ प्रतिबंध रहते हैं। नियम अपनी परंपरा के अनुसार बदलें।'
                : 'After birth, the family observes Sutak (birth impurity period). Adjust rules as per your family traditions.')
              : (isHindi
                ? 'देहांत के बाद परिवार में सूतक (पातक) होता है। परिवार की मान्यताओं के अनुसार नियम बदल सकते हैं।'
                : 'After death, the family observes Sutak/Paatak (mourning impurity). Rules vary by family tradition.')}
          </Text>
        </View>

        <View style={styles.card}>
          {/* Master toggle */}
          <View style={sutakStyles.masterToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={sutakStyles.masterToggleLabel}>
                {isHindi ? 'सूतक लागू करें' : 'Enable Sutak period'}
              </Text>
              <Text style={sutakStyles.masterToggleSubLabel}>
                {isHindi ? 'बंद करें अगर परिवार में यह नहीं मानते' : 'Disable if your family does not observe this'}
              </Text>
            </View>
            <Switch
              value={sutakEnabled}
              onValueChange={setSutakEnabled}
              trackColor={{ false: Colors.gray300, true: Colors.haldiGold }}
              thumbColor={Colors.white}
              accessibilityLabel="Enable sutak"
            />
          </View>

          {sutakEnabled && (
            <>
              <View style={styles.fieldDivider} />

              {/* Days input */}
              <View style={sutakStyles.daysRow}>
                <View style={{ flex: 1 }}>
                  <Text style={sutakStyles.daysLabel}>
                    {isHindi ? 'सूतक के दिन' : 'Sutak duration'}
                  </Text>
                  <Text style={sutakStyles.daysSubLabel}>
                    {isHindi
                      ? `सामान्यतः जन्म = 10 दिन, देहांत = 13 दिन`
                      : 'Common: birth = 10 days, death = 13 days'}
                  </Text>
                </View>
                <TextInput
                  style={sutakStyles.daysInput}
                  value={sutakDays}
                  onChangeText={setSutakDays}
                  keyboardType="numeric"
                  maxLength={2}
                  accessibilityLabel="Sutak days"
                />
                <Text style={sutakStyles.daysSuffix}>
                  {isHindi ? ' दिन' : ' days'}
                </Text>
              </View>

              <View style={styles.fieldDivider} />

              {/* Rule toggles */}
              <Text style={sutakStyles.rulesTitle}>
                {isHindi ? 'प्रतिबंध / नियम चुनें :' : 'Select restrictions:'}
              </Text>
              {SUTAK_RULE_DEFS.map((rule, idx) => (
                <View key={rule.key}>
                  <View style={sutakStyles.ruleRow}>
                    <Text style={sutakStyles.ruleIcon}>{rule.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={sutakStyles.ruleLabel}>{isHindi ? rule.label : rule.labelEn}</Text>
                      <Text style={sutakStyles.ruleSublabel}>{isHindi ? rule.labelEn : rule.label}</Text>
                    </View>
                    <Switch
                      value={sutakRules[rule.key]}
                      onValueChange={() => toggleRule(rule.key)}
                      trackColor={{ false: Colors.gray300, true: Colors.mehndiGreen }}
                      thumbColor={Colors.white}
                      accessibilityLabel={rule.labelEn}
                    />
                  </View>
                  {idx < SUTAK_RULE_DEFS.length - 1 && <View style={styles.fieldDivider} />}
                </View>
              ))}

              <View style={styles.fieldDivider} />

              {/* Custom notes */}
              <FieldLabel hi="परिवार की विशेष बातें" en="Custom notes for your family" />
              <TextInput
                style={[fieldStyles.input, fieldStyles.inputMultiline]}
                value={sutakRules.customNotes}
                onChangeText={(t) => setSutakRules((p) => ({ ...p, customNotes: t }))}
                placeholder={
                  isHindi
                    ? 'जैसे: हमारे यहाँ 12वें दिन हवन होता है, अष्टमी के दिन पूजा वर्जित है...'
                    : 'e.g. We hold a havan on the 12th day; puja is prohibited on Ashtami...'
                }
                placeholderTextColor={Colors.gray400}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel="Custom sutak notes"
              />
            </>
          )}
        </View>

        {/* ── Visibility & Notes ── */}
        <SectionTitle title="अन्य जानकारी" titleEn="Other Details" isHindi={isHindi} />
        <View style={styles.card}>
          <View style={sutakStyles.masterToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={sutakStyles.masterToggleLabel}>
                {isHindi ? 'परिवार को दिखाएं' : 'Visible to family'}
              </Text>
              <Text style={sutakStyles.masterToggleSubLabel}>
                {isHindi ? 'बंद करें तो केवल आप देख सकेंगे' : 'Disable to keep private to yourself'}
              </Text>
            </View>
            <Switch
              value={isVisibleToFamily}
              onValueChange={setIsVisibleToFamily}
              trackColor={{ false: Colors.gray300, true: Colors.mehndiGreen }}
              thumbColor={Colors.white}
              accessibilityLabel="Visible to family"
            />
          </View>

          <View style={styles.fieldDivider} />
          <FieldLabel hi="नोट्स" en="Additional notes" />
          <TextInput
            style={[fieldStyles.input, fieldStyles.inputMultiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder={isHindi ? 'कोई अन्य जानकारी...' : 'Any additional information...'}
            placeholderTextColor={Colors.gray400}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Notes"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    ...Shadow.sm,
  },
  headerBtn: {
    paddingHorizontal: Spacing.md,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  headerTitle: { ...Typography.label, color: Colors.brown, flex: 1, textAlign: 'center' },
  cancelText: { ...Typography.label, color: Colors.gray500 },
  saveBtn: {
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { ...Typography.label, color: Colors.white, fontWeight: '700' },

  content: { padding: Spacing.lg },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  fieldDivider: { height: 1, backgroundColor: Colors.gray100, marginVertical: Spacing.md },

  typeRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  typeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    ...Shadow.sm,
  },
  typeCardActive: { borderColor: Colors.mehndiGreen, backgroundColor: Colors.mehndiGreen + '10' },
  typeCardDeath: { borderColor: Colors.brownLight, backgroundColor: Colors.brownLight + '15' },
  typeEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  typeLabel: { ...Typography.label, color: Colors.brown, fontWeight: '700' },
  typeLabelActive: { color: Colors.mehndiGreen },
  typeLabelDeath: { color: Colors.brownLight },
  typeSubLabel: { ...Typography.caption, color: Colors.gray500, marginTop: 2 },

  pillScroll: { marginTop: Spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: Spacing.sm, paddingBottom: Spacing.xs },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  pillActive: { backgroundColor: Colors.haldiGold, borderColor: Colors.haldiGold },
  pillText: { ...Typography.caption, color: Colors.brown, fontWeight: '500' },
  pillTextActive: { color: Colors.white, fontWeight: '700' },

  genderRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  genderBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  genderBtnActive: { backgroundColor: Colors.haldiGoldLight + '50', borderColor: Colors.haldiGold },
  genderText: { ...Typography.caption, color: Colors.brown, fontWeight: '500', textAlign: 'center' },
  genderTextActive: { color: Colors.haldiGoldDark, fontWeight: '700' },
});

const fieldStyles = StyleSheet.create({
  label: { ...Typography.label, color: Colors.brown, marginBottom: Spacing.xs },
  labelEn: { ...Typography.caption, color: Colors.brownLight, fontWeight: '400' },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.brown,
    backgroundColor: Colors.gray50,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  inputMultiline: { minHeight: 90, paddingTop: Spacing.md },
});

const sutakStyles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.haldiGoldLight + '25',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 20, marginTop: 1 },
  infoText: { ...Typography.bodySmall, color: Colors.brown, flex: 1, lineHeight: 20 },

  masterToggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  masterToggleLabel: { ...Typography.label, color: Colors.brown },
  masterToggleSubLabel: { ...Typography.caption, color: Colors.brownLight, marginTop: 2 },

  daysRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  daysLabel: { ...Typography.label, color: Colors.brown },
  daysSubLabel: { ...Typography.caption, color: Colors.brownLight, marginTop: 2 },
  daysInput: {
    width: 56,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.haldiGoldDark,
    backgroundColor: Colors.haldiGoldLight + '20',
  },
  daysSuffix: { ...Typography.label, color: Colors.brownLight },

  rulesTitle: { ...Typography.label, color: Colors.brown, marginBottom: Spacing.sm },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: DADI_MIN_TAP_TARGET },
  ruleIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  ruleLabel: { ...Typography.body, color: Colors.brown },
  ruleSublabel: { ...Typography.caption, color: Colors.brownLight, marginTop: 1 },
});

const sectionTitleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
  line: { flex: 1, height: 1, backgroundColor: Colors.haldiGold + '50' },
  text: { ...Typography.label, color: Colors.haldiGoldDark, fontWeight: '600', fontSize: 13 },
});
