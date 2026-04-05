/**
 * LifeEventsList — rendered inside FamilyTreeScreen's "जीवन यात्रा" tab.
 * Shows birth/death events with live Sutak countdown banners.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import {
  useLifeEventStore,
  isSutakActive,
  sutakDaysRemaining,
} from '../../stores/lifeEventStore';
import type { LifeEvent, SutakRules } from '../../types/database';

type FilterKey = 'all' | 'birth' | 'death';

const SUTAK_RULE_LABELS: { key: keyof Omit<SutakRules, 'customNotes'>; hi: string; en: string; icon: string }[] = [
  { key: 'noTempleVisit',         hi: 'मंदिर न जाएं',          en: 'No temple visits',     icon: '⛩️' },
  { key: 'noReligiousCeremonies', hi: 'हवन / यज्ञ न करें',     en: 'No religious rites',   icon: '🔥' },
  { key: 'noPujaAtHome',          hi: 'घर की पूजा भी नहीं',    en: 'No home puja',         icon: '🪔' },
  { key: 'noAuspiciousWork',      hi: 'मांगलिक कार्य नहीं',    en: 'No auspicious work',   icon: '🎊' },
  { key: 'noFoodSharing',         hi: 'भोजन न परोसें',         en: 'No food sharing',      icon: '🍽️' },
  { key: 'noNewVentures',         hi: 'नया कार्य नहीं',        en: 'No new ventures',      icon: '🚀' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Active Sutak Banner ───────────────────────────────────────────────────────

function ActiveSutakBanner({ event, isHindi }: { event: LifeEvent; isHindi: boolean }) {
  const daysLeft = sutakDaysRemaining(event);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const activeRules = SUTAK_RULE_LABELS.filter((r) => event.sutak_rules[r.key]);
  const isBirth = event.event_type === 'birth';

  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.titleRow}>
        <Animated.Text style={[bannerStyles.icon, { opacity: pulseAnim }]}>
          {'🔴'}
        </Animated.Text>
        <View style={{ flex: 1 }}>
          <Text style={bannerStyles.title}>
            {isHindi
              ? `${isBirth ? 'जन्म' : 'देहांत'} सूतक चल रहा है`
              : `${isBirth ? 'Birth' : 'Death'} Sutak in progress`}
          </Text>
          <Text style={bannerStyles.name}>
            {event.person_name_hindi || event.person_name}
          </Text>
        </View>
        <View style={bannerStyles.daysBox}>
          <Text style={bannerStyles.daysNumber}>{daysLeft}</Text>
          <Text style={bannerStyles.daysLabel}>{isHindi ? 'दिन\nबाकी' : 'days\nleft'}</Text>
        </View>
      </View>

      <Text style={bannerStyles.endDate}>
        {isHindi ? 'सूतक समाप्ति: ' : 'Sutak ends: '}
        <Text style={{ fontWeight: '700' }}>{formatDate(event.sutak_end_date!)}</Text>
      </Text>

      {activeRules.length > 0 && (
        <>
          <Text style={bannerStyles.rulesTitle}>
            {isHindi ? 'इस दौरान परिवार के नियम:' : 'Family observances during this period:'}
          </Text>
          <View style={bannerStyles.rulesGrid}>
            {activeRules.map((r) => (
              <View key={r.key} style={bannerStyles.ruleChip}>
                <Text style={bannerStyles.ruleChipIcon}>{r.icon}</Text>
                <Text style={bannerStyles.ruleChipText}>{isHindi ? r.hi : r.en}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {event.sutak_rules.customNotes ? (
        <View style={bannerStyles.customNotes}>
          <Text style={bannerStyles.customNotesIcon}>📌</Text>
          <Text style={bannerStyles.customNotesText}>{event.sutak_rules.customNotes}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: LifeEvent;
  isHindi: boolean;
  onEdit: (event: LifeEvent) => void;
  onDelete: (id: string) => void;
}

function EventCard({ event, isHindi, onEdit, onDelete }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const active = isSutakActive(event);
  const daysLeft = sutakDaysRemaining(event);
  const isBirth = event.event_type === 'birth';
  const activeRules = SUTAK_RULE_LABELS.filter((r) => event.sutak_rules[r.key]);

  return (
    <View style={[cardStyles.container, active && cardStyles.containerActive]}>
      {/* Card header */}
      <TouchableOpacity
        style={cardStyles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${event.person_name} ${isBirth ? 'birth' : 'death'} event`}
      >
        <View style={[cardStyles.typeBadge, isBirth ? cardStyles.typeBadgeBirth : cardStyles.typeBadgeDeath]}>
          <Text style={cardStyles.typeEmoji}>{isBirth ? '👶' : '🙏'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={cardStyles.personName}>
            {event.person_name_hindi || event.person_name}
          </Text>
          <Text style={cardStyles.subInfo}>
            {event.relationship ? `${event.relationship}  •  ` : ''}
            {formatDate(event.event_date)}
          </Text>
          {isBirth && event.baby_gender && event.baby_gender !== 'not_disclosed' && (
            <Text style={cardStyles.subInfo}>
              {event.baby_gender === 'boy' ? '👦 ' : '👧 '}
              {isHindi ? (event.baby_gender === 'boy' ? 'बेटे का जन्म' : 'बेटी का जन्म') : (event.baby_gender === 'boy' ? 'Baby boy' : 'Baby girl')}
            </Text>
          )}
          {!isBirth && event.age_at_death != null && (
            <Text style={cardStyles.subInfo}>
              {isHindi ? `आयु: ${event.age_at_death} वर्ष` : `Age: ${event.age_at_death} years`}
            </Text>
          )}
        </View>

        {/* Sutak status */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {event.sutak_enabled ? (
            active ? (
              <View style={cardStyles.sutakActivePill}>
                <Text style={cardStyles.sutakActivePillText}>
                  {isHindi ? `सूतक ${daysLeft}d` : `Sutak ${daysLeft}d`}
                </Text>
              </View>
            ) : (
              <View style={cardStyles.sutakDonePill}>
                <Text style={cardStyles.sutakDonePillText}>
                  {isHindi ? 'सूतक समाप्त' : 'Sutak done'}
                </Text>
              </View>
            )
          ) : (
            <View style={cardStyles.sutakOffPill}>
              <Text style={cardStyles.sutakOffPillText}>
                {isHindi ? 'सूतक नहीं' : 'No sutak'}
              </Text>
            </View>
          )}
          <Text style={cardStyles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={cardStyles.expandedBody}>
          {event.sutak_enabled && (
            <>
              <View style={cardStyles.expandRow}>
                <Text style={cardStyles.expandLabel}>{isHindi ? 'सूतक अवधि:' : 'Sutak period:'}</Text>
                <Text style={cardStyles.expandValue}>
                  {event.sutak_start_date ? formatDate(event.sutak_start_date) : formatDate(event.event_date)}
                  {' → '}
                  {event.sutak_end_date ? formatDate(event.sutak_end_date) : '—'}
                  {'  ('}
                  {event.sutak_days}
                  {isHindi ? ' दिन)' : ' days)'}
                </Text>
              </View>

              {activeRules.length > 0 && (
                <View style={cardStyles.expandRow}>
                  <Text style={cardStyles.expandLabel}>{isHindi ? 'नियम:' : 'Rules:'}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    {activeRules.map((r) => (
                      <Text key={r.key} style={cardStyles.expandValue}>
                        {r.icon}{'  '}{isHindi ? r.hi : r.en}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {event.sutak_rules.customNotes ? (
                <View style={cardStyles.expandRow}>
                  <Text style={cardStyles.expandLabel}>{'📌 '}{isHindi ? 'विशेष:' : 'Notes:'}</Text>
                  <Text style={[cardStyles.expandValue, { fontStyle: 'italic' }]}>{event.sutak_rules.customNotes}</Text>
                </View>
              ) : null}
            </>
          )}

          {event.notes ? (
            <View style={cardStyles.expandRow}>
              <Text style={cardStyles.expandLabel}>{isHindi ? 'टिप्पणी:' : 'Notes:'}</Text>
              <Text style={cardStyles.expandValue}>{event.notes}</Text>
            </View>
          ) : null}

          {event.birth_place ? (
            <View style={cardStyles.expandRow}>
              <Text style={cardStyles.expandLabel}>{isHindi ? 'स्थान:' : 'Place:'}</Text>
              <Text style={cardStyles.expandValue}>{event.birth_place}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={cardStyles.actions}>
            <TouchableOpacity
              style={cardStyles.editBtn}
              onPress={() => onEdit(event)}
              accessibilityRole="button"
              accessibilityLabel="Edit event"
            >
              <Text style={cardStyles.editBtnText}>{'✏️  '}{isHindi ? 'संपादित करें' : 'Edit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cardStyles.deleteBtn}
              onPress={() => onDelete(event.id)}
              accessibilityRole="button"
              accessibilityLabel="Delete event"
            >
              <Text style={cardStyles.deleteBtnText}>{'🗑️  '}{isHindi ? 'हटाएं' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface LifeEventsListProps {
  isHindi: boolean;
  onAddEvent: () => void;
  onEditEvent: (eventId: string) => void;
  navigation?: any;
}

export default function LifeEventsList({ isHindi, onAddEvent, onEditEvent }: LifeEventsListProps) {
  const { events, isLoading, error, fetchEvents, deleteEvent } = useLifeEventStore();
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => { fetchEvents(); }, []);

  const activeSutaks = useMemo(
    () => events.filter(isSutakActive),
    [events],
  );

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.event_type === filter);
  }, [events, filter]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      isHindi ? 'घटना हटाएं' : 'Delete Event',
      isHindi ? 'क्या आप सच में इस घटना को हटाना चाहते हैं?' : 'Are you sure you want to delete this event?',
      [
        { text: isHindi ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isHindi ? 'हटाएं' : 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
      ],
    );
  }, [deleteEvent, isHindi]);

  const renderItem = useCallback(({ item }: { item: LifeEvent }) => (
    <EventCard
      event={item}
      isHindi={isHindi}
      onEdit={(e) => onEditEvent(e.id)}
      onDelete={handleDelete}
    />
  ), [isHindi, onEditEvent, handleDelete]);

  const listHeader = useMemo(() => (
    <View>
      {/* Active Sutak banners */}
      {activeSutaks.map((e) => (
        <ActiveSutakBanner key={e.id} event={e} isHindi={isHindi} />
      ))}

      {/* Filter pills */}
      <View style={listStyles.filterRow}>
        {([
          { key: 'all', hi: 'सभी', en: 'All' },
          { key: 'birth', hi: '👶 जन्म', en: '👶 Birth' },
          { key: 'death', hi: '🙏 देहांत', en: '🙏 Death' },
        ] as { key: FilterKey; hi: string; en: string }[]).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[listStyles.filterPill, filter === f.key && listStyles.filterPillActive]}
            onPress={() => setFilter(f.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: filter === f.key }}
          >
            <Text style={[listStyles.filterText, filter === f.key && listStyles.filterTextActive]}>
              {isHindi ? f.hi : f.en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [activeSutaks, filter, isHindi]);

  return (
    <View style={listStyles.container}>
      {error ? (
        <View style={listStyles.errorBanner}>
          <Text style={listStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchEvents} tintColor={Colors.haldiGold} colors={[Colors.haldiGold]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={listStyles.empty}>
              <Text style={listStyles.emptyIcon}>{'🌱'}</Text>
              <Text style={listStyles.emptyTitle}>{isHindi ? 'कोई घटना नहीं' : 'No life events yet'}</Text>
              <Text style={listStyles.emptySubtitle}>
                {isHindi ? 'जन्म या देहांत की घटना जोड़ें' : 'Add a birth or death event'}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[listStyles.list, filteredEvents.length === 0 && listStyles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={listStyles.fab}
        onPress={onAddEvent}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isHindi ? 'Add life event' : 'Add life event'}
      >
        <Text style={listStyles.fabText}>{'+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bannerStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.error + '12',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  icon: { fontSize: 20 },
  title: { ...Typography.label, color: Colors.error, fontWeight: '700' },
  name: { ...Typography.body, color: Colors.brown, marginTop: 2 },
  daysBox: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 56,
  },
  daysNumber: { color: Colors.white, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  daysLabel: { color: Colors.white + 'CC', fontSize: 11, textAlign: 'center', lineHeight: 13 },
  endDate: { ...Typography.bodySmall, color: Colors.brown, marginBottom: Spacing.sm },
  rulesTitle: { ...Typography.caption, color: Colors.brownMuted, fontWeight: '600', marginBottom: Spacing.sm },
  rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ruleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '18',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  ruleChipIcon: { fontSize: 14 },
  ruleChipText: { ...Typography.caption, color: Colors.error, fontWeight: '600' },
  customNotes: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'flex-start' },
  customNotesIcon: { fontSize: 16 },
  customNotesText: { ...Typography.bodySmall, color: Colors.brown, flex: 1, fontStyle: 'italic' },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  containerActive: {
    borderWidth: 1.5,
    borderColor: Colors.error + '60',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  typeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadgeBirth: { backgroundColor: Colors.mehndiGreen + '20' },
  typeBadgeDeath: { backgroundColor: Colors.brownLight + '20' },
  typeEmoji: { fontSize: 24 },
  personName: { ...Typography.label, color: Colors.brown, fontWeight: '700' },
  subInfo: { ...Typography.caption, color: Colors.brownLight, marginTop: 2 },
  chevron: { ...Typography.caption, color: Colors.brownLight, marginTop: 4 },

  sutakActivePill: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sutakActivePillText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
  sutakDonePill: {
    backgroundColor: Colors.mehndiGreen + '25',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sutakDonePillText: { ...Typography.caption, color: Colors.mehndiGreenDark, fontWeight: '600' },
  sutakOffPill: {
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sutakOffPillText: { ...Typography.caption, color: Colors.gray500 },

  expandedBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  expandRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  expandLabel: { ...Typography.caption, color: Colors.brownMuted, fontWeight: '600', minWidth: 80 },
  expandValue: { ...Typography.caption, color: Colors.brown, flex: 1 },

  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  editBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.haldiGoldLight + '30',
    borderWidth: 1,
    borderColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: { ...Typography.label, color: Colors.haldiGoldDark, fontWeight: '600' },
  deleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: { ...Typography.label, color: Colors.error, fontWeight: '600' },
});

const listStyles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterPillActive: { backgroundColor: Colors.haldiGold, borderColor: Colors.haldiGold },
  filterText: { ...Typography.label, color: Colors.brown, fontSize: 14 },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.huge },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.h3, color: Colors.brown, textAlign: 'center', marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.gray500, textAlign: 'center' },
  errorBanner: { backgroundColor: Colors.error + '15', padding: Spacing.md },
  errorText: { ...Typography.bodySmall, color: Colors.error },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
  },
  fabText: { fontSize: 28, color: Colors.white, lineHeight: 30 },
});
