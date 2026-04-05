import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useLanguageStore } from '../../stores/languageStore';
import {
  useImportantDateStore,
  daysUntilNext,
  formatEventDate,
  CATEGORY_META,
  type ImportantDate,
  type ImportantDateCategory,
  type CreateImportantDateInput,
} from '../../stores/importantDateStore';

type Props = NativeStackScreenProps<any, 'ImportantDates'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { n: 1,  hi: 'जनवरी',   en: 'January'   },
  { n: 2,  hi: 'फरवरी',   en: 'February'  },
  { n: 3,  hi: 'मार्च',   en: 'March'     },
  { n: 4,  hi: 'अप्रैल',  en: 'April'     },
  { n: 5,  hi: 'मई',      en: 'May'       },
  { n: 6,  hi: 'जून',     en: 'June'      },
  { n: 7,  hi: 'जुलाई',   en: 'July'      },
  { n: 8,  hi: 'अगस्त',   en: 'August'    },
  { n: 9,  hi: 'सितंबर',  en: 'September' },
  { n: 10, hi: 'अक्टूबर', en: 'October'   },
  { n: 11, hi: 'नवंबर',   en: 'November'  },
  { n: 12, hi: 'दिसंबर',  en: 'December'  },
];

const DAYS_OPTIONS = [
  { days: 1, hi: '1 दिन पहले',  en: '1 day before'  },
  { days: 3, hi: '3 दिन पहले',  en: '3 days before' },
  { days: 7, hi: '7 दिन पहले',  en: '7 days before' },
  { days: 0, hi: 'उसी दिन',     en: 'On the day'    },
];

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  editDate?: ImportantDate;
  isHindi: boolean;
}

function AddEditModal({ visible, onClose, editDate, isHindi }: AddModalProps) {
  const { createDate, updateDate } = useImportantDateStore();
  const isEditing = Boolean(editDate);

  const [category, setCategory]     = useState<ImportantDateCategory>(editDate?.category ?? 'birthday');
  const [personName, setPersonName] = useState(editDate?.person_name ?? '');
  const [personNameHi, setPersonNameHi] = useState(editDate?.person_name_hindi ?? '');
  const [month, setMonth]           = useState(editDate?.event_month ?? 1);
  const [day, setDay]               = useState(editDate?.event_day?.toString() ?? '');
  const [year, setYear]             = useState(editDate?.event_year?.toString() ?? '');
  const [notifyDays, setNotifyDays] = useState<number[]>(editDate?.notify_days_before ?? [1, 3, 7]);
  const [notifyFamily, setNotifyFamily] = useState(editDate?.notify_family ?? true);
  const [notes, setNotes]           = useState(editDate?.notes ?? '');
  const [isSaving, setIsSaving]     = useState(false);

  // Reset when re-opened for a new entry
  useEffect(() => {
    if (visible && !editDate) {
      setCategory('birthday'); setPersonName(''); setPersonNameHi('');
      setMonth(1); setDay(''); setYear('');
      setNotifyDays([1, 3, 7]); setNotifyFamily(true); setNotes('');
    }
  }, [visible, editDate]);

  const toggleNotifyDay = useCallback((d: number) => {
    setNotifyDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!personName.trim()) {
      Alert.alert(isHindi ? 'नाम जरूरी है' : 'Name required');
      return;
    }
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      Alert.alert(isHindi ? 'दिनांक गलत है' : 'Invalid day', isHindi ? '1–31 के बीच दिन लिखें' : 'Enter day between 1–31');
      return;
    }
    if (notifyDays.length === 0) {
      Alert.alert(isHindi ? 'कम से कम एक अनुस्मारक चुनें' : 'Select at least one reminder');
      return;
    }

    setIsSaving(true);
    const input: CreateImportantDateInput = {
      category,
      person_name: personName.trim(),
      person_name_hindi: personNameHi.trim() || undefined,
      event_month: month,
      event_day: dayNum,
      event_year: year ? parseInt(year, 10) || undefined : undefined,
      notify_days_before: notifyDays,
      notify_family: notifyFamily,
      notes: notes.trim() || undefined,
    };

    try {
      const ok = isEditing
        ? await updateDate(editDate!.id, input)
        : await createDate(input);
      if (ok) onClose();
    } finally {
      setIsSaving(false);
    }
  }, [personName, personNameHi, category, month, day, year, notifyDays, notifyFamily, notes, isEditing, editDate, createDate, updateDate, onClose, isHindi]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Modal header */}
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.headerBtn} accessibilityRole="button">
            <Text style={modalStyles.cancelText}>{isHindi ? 'रद्द' : 'Cancel'}</Text>
          </TouchableOpacity>
          <Text style={modalStyles.headerTitle}>
            {isEditing ? (isHindi ? 'संपादित करें' : 'Edit') : (isHindi ? 'नई तारीख जोड़ें' : 'Add Important Date')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[modalStyles.headerBtn, modalStyles.saveBtn, isSaving && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            {isSaving
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={modalStyles.saveText}>{isHindi ? 'सहेजें' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: Colors.cream }} contentContainerStyle={modalStyles.content} keyboardShouldPersistTaps="handled">

          {/* Category */}
          <Text style={modalStyles.sectionLabel}>{isHindi ? 'प्रकार' : 'Category'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.pillScroll}>
            <View style={modalStyles.pillRow}>
              {(Object.entries(CATEGORY_META) as [ImportantDateCategory, typeof CATEGORY_META['birthday']][]).map(([key, meta]) => (
                <TouchableOpacity
                  key={key}
                  style={[modalStyles.pill, category === key && modalStyles.pillActive]}
                  onPress={() => setCategory(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === key }}
                >
                  <Text style={modalStyles.pillEmoji}>{meta.emoji}</Text>
                  <Text style={[modalStyles.pillText, category === key && modalStyles.pillTextActive]}>
                    {isHindi ? meta.hi : meta.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Person name */}
          <Text style={modalStyles.sectionLabel}>{isHindi ? 'किसका? *' : 'Person\'s name *'}</Text>
          <View style={modalStyles.card}>
            <TextInput
              style={modalStyles.input}
              value={personName}
              onChangeText={setPersonName}
              placeholder={isHindi ? 'नाम लिखें' : 'Enter name'}
              placeholderTextColor={Colors.gray400}
            />
            <View style={modalStyles.divider} />
            <TextInput
              style={modalStyles.input}
              value={personNameHi}
              onChangeText={setPersonNameHi}
              placeholder="हिंदी में नाम (वैकल्पिक)"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          {/* Date */}
          <Text style={modalStyles.sectionLabel}>{isHindi ? 'तारीख' : 'Date'}</Text>
          <View style={modalStyles.card}>
            {/* Month picker */}
            <Text style={modalStyles.fieldLabel}>{isHindi ? 'महीना' : 'Month'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={modalStyles.pillRow}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.n}
                    style={[modalStyles.monthPill, month === m.n && modalStyles.monthPillActive]}
                    onPress={() => setMonth(m.n)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: month === m.n }}
                  >
                    <Text style={[modalStyles.monthPillText, month === m.n && modalStyles.monthPillTextActive]}>
                      {isHindi ? m.hi : m.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Day + Year */}
            <View style={modalStyles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.fieldLabel}>{isHindi ? 'दिन *' : 'Day *'}</Text>
                <TextInput
                  style={[modalStyles.input, { textAlign: 'center', fontWeight: '700', fontSize: 20 }]}
                  value={day}
                  onChangeText={setDay}
                  placeholder="1–31"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.fieldLabel}>{isHindi ? 'वर्ष (वैकल्पिक)' : 'Year (optional)'}</Text>
                <TextInput
                  style={[modalStyles.input, { textAlign: 'center' }]}
                  value={year}
                  onChangeText={setYear}
                  placeholder="2000"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
          </View>

          {/* Notification timing */}
          <Text style={modalStyles.sectionLabel}>{isHindi ? 'अनुस्मारक कब भेजें?' : 'When to send reminders?'}</Text>
          <View style={modalStyles.card}>
            {DAYS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.days}
                style={modalStyles.checkRow}
                onPress={() => toggleNotifyDay(opt.days)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: notifyDays.includes(opt.days) }}
              >
                <Text style={modalStyles.checkIcon}>
                  {notifyDays.includes(opt.days) ? '✅' : '⬜'}
                </Text>
                <Text style={modalStyles.checkLabel}>
                  {isHindi ? opt.hi : opt.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notify family */}
          <View style={modalStyles.card}>
            <View style={modalStyles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.switchLabel}>
                  {isHindi ? 'परिवार को सूचित करें' : 'Notify family members'}
                </Text>
                <Text style={modalStyles.switchSubLabel}>
                  {isHindi ? 'L1 और L2 परिवार को notification जाएगी' : 'L1 and L2 family members will be notified'}
                </Text>
              </View>
              <Switch
                value={notifyFamily}
                onValueChange={setNotifyFamily}
                trackColor={{ false: Colors.gray300, true: Colors.mehndiGreen }}
                thumbColor={Colors.white}
              />
            </View>
          </View>

          {/* Notes */}
          <Text style={modalStyles.sectionLabel}>{isHindi ? 'नोट्स' : 'Notes'}</Text>
          <View style={modalStyles.card}>
            <TextInput
              style={[modalStyles.input, { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.md }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={isHindi ? 'कोई विशेष बात...' : 'Any special note...'}
              placeholderTextColor={Colors.gray400}
              multiline
              numberOfLines={3}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Date Card ────────────────────────────────────────────────────────────────

function DateCard({
  item,
  isHindi,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: ImportantDate;
  isHindi: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[item.category];
  const days = daysUntilNext(item);
  const isToday = days === 0;
  const isSoon = days <= 7;

  return (
    <View style={[dateCardStyles.container, !item.is_active && dateCardStyles.containerInactive, isToday && dateCardStyles.containerToday]}>
      <View style={dateCardStyles.left}>
        <Text style={dateCardStyles.emoji}>{meta.emoji}</Text>
      </View>

      <View style={dateCardStyles.middle}>
        <Text style={[dateCardStyles.name, !item.is_active && dateCardStyles.nameInactive]}>
          {item.person_name_hindi || item.person_name}
        </Text>
        <Text style={dateCardStyles.category}>
          {isHindi ? meta.hi : meta.en}
          {'  •  '}
          {formatEventDate(item.event_month, item.event_day, item.event_year)}
        </Text>
        {item.is_active && (
          <Text style={[dateCardStyles.countdown, isSoon && dateCardStyles.countdownSoon, isToday && dateCardStyles.countdownToday]}>
            {isToday
              ? (isHindi ? '🎉 आज!' : '🎉 Today!')
              : (isHindi ? `${days} दिन बाद` : `in ${days} days`)}
          </Text>
        )}
        {!item.is_active && (
          <Text style={dateCardStyles.inactiveLabel}>{isHindi ? 'बंद है' : 'Paused'}</Text>
        )}
      </View>

      <View style={dateCardStyles.actions}>
        <Switch
          value={item.is_active}
          onValueChange={onToggle}
          trackColor={{ false: Colors.gray300, true: Colors.mehndiGreen }}
          thumbColor={Colors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          accessibilityLabel={item.is_active ? 'Pause reminder' : 'Enable reminder'}
        />
        <TouchableOpacity onPress={onEdit} style={dateCardStyles.iconBtn} accessibilityRole="button" accessibilityLabel="Edit">
          <Text style={dateCardStyles.iconBtnText}>{'✏️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={dateCardStyles.iconBtn} accessibilityRole="button" accessibilityLabel="Delete">
          <Text style={dateCardStyles.iconBtnText}>{'🗑️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ImportantDatesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const { dates, isLoading, error, fetchDates, deleteDate, toggleActive } = useImportantDateStore();

  const [showModal, setShowModal] = useState(false);
  const [editDate, setEditDate] = useState<ImportantDate | undefined>();
  const [filter, setFilter] = useState<'all' | ImportantDateCategory>('all');

  useEffect(() => { fetchDates(); }, []);

  const sorted = useMemo(() =>
    [...dates].sort((a, b) => daysUntilNext(a) - daysUntilNext(b)),
  [dates]);

  const filtered = useMemo(() =>
    filter === 'all' ? sorted : sorted.filter((d) => d.category === filter),
  [sorted, filter]);

  // Upcoming in next 30 days (for the top banner)
  const upcoming = useMemo(() =>
    sorted.filter((d) => d.is_active && daysUntilNext(d) <= 30),
  [sorted]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      isHindi ? 'हटाएं?' : 'Delete?',
      isHindi ? 'क्या आप इस तारीख को हटाना चाहते हैं?' : 'Delete this important date?',
      [
        { text: isHindi ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isHindi ? 'हटाएं' : 'Delete', style: 'destructive', onPress: () => deleteDate(id) },
      ],
    );
  }, [deleteDate, isHindi]);

  const handleEdit = useCallback((date: ImportantDate) => {
    setEditDate(date);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditDate(undefined);
  }, []);

  const renderItem = useCallback(({ item }: { item: ImportantDate }) => (
    <DateCard
      item={item}
      isHindi={isHindi}
      onEdit={() => handleEdit(item)}
      onDelete={() => handleDelete(item.id)}
      onToggle={() => toggleActive(item.id)}
    />
  ), [isHindi, handleEdit, handleDelete, toggleActive]);

  const listHeader = useMemo(() => (
    <View>
      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>{'🔔'}</Text>
        <Text style={styles.infoText}>
          {isHindi
            ? 'यहाँ जन्मदिन, सालगिरह, बरसी आदि जोड़ें। परिवार के सभी सदस्यों को notification मिलेगी।'
            : 'Add birthdays, anniversaries, barsi etc. All family members will get notified automatically.'}
        </Text>
      </View>

      {/* Upcoming this month */}
      {upcoming.length > 0 && (
        <View style={styles.upcomingBanner}>
          <Text style={styles.upcomingTitle}>
            {'📅 '}{isHindi ? 'जल्द आने वाले अवसर' : 'Upcoming occasions'}
          </Text>
          {upcoming.slice(0, 3).map((d) => {
            const days = daysUntilNext(d);
            const meta = CATEGORY_META[d.category];
            return (
              <Text key={d.id} style={styles.upcomingItem}>
                {meta.emoji}{'  '}
                {d.person_name_hindi || d.person_name}
                {'  —  '}
                <Text style={styles.upcomingDays}>
                  {days === 0 ? (isHindi ? 'आज!' : 'Today!') : (isHindi ? `${days} दिन बाद` : `in ${days} days`)}
                </Text>
              </Text>
            );
          })}
        </View>
      )}

      {/* Filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              {isHindi ? 'सभी' : 'All'}
            </Text>
          </TouchableOpacity>
          {(Object.entries(CATEGORY_META) as [ImportantDateCategory, typeof CATEGORY_META['birthday']][]).map(([key, meta]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterPill, filter === key && styles.filterPillActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                {meta.emoji}{'  '}{isHindi ? meta.hi : meta.en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  ), [upcoming, filter, isHindi]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isHindi ? 'परिवार की खास तारीखें' : 'Family Important Dates'}</Text>
          <Text style={styles.headerSubtitle}>{isHindi ? 'जन्मदिन • सालगिरह • बरसी • पूजा' : 'Birthdays • Anniversaries • Barsi • Puja'}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchDates} tintColor={Colors.haldiGold} colors={[Colors.haldiGold]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'📅'}</Text>
              <Text style={styles.emptyTitle}>{isHindi ? 'कोई तारीख नहीं' : 'No dates added yet'}</Text>
              <Text style={styles.emptySubtitle}>{isHindi ? '+ बटन दबाकर जोड़ें' : 'Tap + to add important dates'}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
        onPress={() => { setEditDate(undefined); setShowModal(true); }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Add important date"
      >
        <Text style={styles.fabText}>{'+'}</Text>
      </TouchableOpacity>

      <AddEditModal
        visible={showModal}
        onClose={handleCloseModal}
        editDate={editDate}
        isHindi={isHindi}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Shadow.sm,
  },
  backBtn: { width: DADI_MIN_TAP_TARGET, height: DADI_MIN_TAP_TARGET, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: Colors.brown },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.label, color: Colors.brown, fontWeight: '700', textAlign: 'center' },
  headerSubtitle: { ...Typography.caption, color: Colors.brownLight, marginTop: 2, textAlign: 'center' },

  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.mehndiGreen + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    margin: Spacing.lg,
    marginBottom: 0,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 20 },
  infoText: { ...Typography.bodySmall, color: Colors.brown, flex: 1, lineHeight: 20 },

  upcomingBanner: {
    backgroundColor: Colors.haldiGold + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    margin: Spacing.lg,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: Colors.haldiGold,
  },
  upcomingTitle: { ...Typography.label, color: Colors.haldiGoldDark, fontWeight: '700', marginBottom: Spacing.sm },
  upcomingItem: { ...Typography.body, color: Colors.brown, marginBottom: 4 },
  upcomingDays: { color: Colors.haldiGoldDark, fontWeight: '700' },

  filterScroll: { marginTop: Spacing.lg },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.gray100,
    borderWidth: 1, borderColor: Colors.gray200,
  },
  filterPillActive: { backgroundColor: Colors.haldiGold, borderColor: Colors.haldiGold },
  filterText: { ...Typography.caption, color: Colors.brown, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },

  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.huge },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.h3, color: Colors.brown, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.gray500, textAlign: 'center' },
  errorBanner: { backgroundColor: Colors.error + '15', padding: Spacing.md },
  errorText: { ...Typography.bodySmall, color: Colors.error },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
  },
  fabText: { fontSize: 32, color: Colors.white, lineHeight: 34 },
});

const dateCardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.md,
  },
  containerInactive: { opacity: 0.55 },
  containerToday: { borderWidth: 2, borderColor: Colors.haldiGold },
  left: { width: 44, alignItems: 'center' },
  emoji: { fontSize: 30 },
  middle: { flex: 1 },
  name: { ...Typography.label, color: Colors.brown, fontWeight: '700' },
  nameInactive: { color: Colors.gray500 },
  category: { ...Typography.caption, color: Colors.brownLight, marginTop: 2 },
  countdown: { ...Typography.caption, color: Colors.gray500, marginTop: 3, fontWeight: '600' },
  countdownSoon: { color: Colors.haldiGoldDark },
  countdownToday: { color: Colors.mehndiGreen, fontSize: 14 },
  inactiveLabel: { ...Typography.caption, color: Colors.gray400, marginTop: 3, fontStyle: 'italic' },
  actions: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  iconBtn: { width: DADI_MIN_TAP_TARGET, height: 36, justifyContent: 'center', alignItems: 'center' },
  iconBtnText: { fontSize: 18 },
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Shadow.sm,
  },
  headerBtn: { paddingHorizontal: Spacing.md, height: DADI_MIN_TAP_TARGET, justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  headerTitle: { ...Typography.label, color: Colors.brown, flex: 1, textAlign: 'center' },
  cancelText: { ...Typography.label, color: Colors.gray500 },
  saveBtn: { backgroundColor: Colors.haldiGold, borderRadius: BorderRadius.md },
  saveText: { ...Typography.label, color: Colors.white, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  sectionLabel: { ...Typography.label, color: Colors.brown, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.sm },
  divider: { height: 1, backgroundColor: Colors.gray100, marginVertical: Spacing.md },
  input: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: 16, color: Colors.brown, backgroundColor: Colors.gray50,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  pillScroll: { marginBottom: Spacing.md },
  pillRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200,
  },
  pillActive: { backgroundColor: Colors.haldiGold, borderColor: Colors.haldiGold },
  pillEmoji: { fontSize: 16 },
  pillText: { ...Typography.caption, color: Colors.brown, fontWeight: '500' },
  pillTextActive: { color: Colors.white, fontWeight: '700' },
  fieldLabel: { ...Typography.caption, color: Colors.brownMuted, fontWeight: '600', marginBottom: Spacing.xs },
  monthPill: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 16, backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200,
    marginRight: Spacing.sm,
  },
  monthPillActive: { backgroundColor: Colors.mehndiGreen + '25', borderColor: Colors.mehndiGreen },
  monthPillText: { ...Typography.caption, color: Colors.brown },
  monthPillTextActive: { color: Colors.mehndiGreenDark, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: DADI_MIN_TAP_TARGET },
  checkIcon: { fontSize: 22, width: 28 },
  checkLabel: { ...Typography.body, color: Colors.brown },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchLabel: { ...Typography.label, color: Colors.brown },
  switchSubLabel: { ...Typography.caption, color: Colors.brownLight, marginTop: 2 },
});
