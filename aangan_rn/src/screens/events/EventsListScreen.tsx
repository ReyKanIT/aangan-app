/**
 * EventsListScreen — v0.16.1
 *
 * Added because EventCreatorScreen existed in code but had NO entry point
 * anywhere in the UI (Kumar 2026-05-17 14:02 IST: "where is event creation
 * feature?"). Adding a dedicated "कार्यक्रम / Events" bottom tab so users
 * can both browse upcoming family events and create new ones.
 *
 * Minimal v0.16.1 surface:
 *   • List of family events sorted by date asc, upcoming first
 *   • Per-row: date pill, title (Hindi + English), location, host name, RSVP count
 *   • Empty state for new users
 *   • Pull-to-refresh
 *   • FAB → EventCreator (the existing screen)
 *   • Tap row → EventDetail (existing)
 *
 * Future (v0.16.2+): filter chips (Upcoming / Past / Mine), calendar view, RSVP
 * directly from the list.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useEventStore } from '../../stores/eventStore';
import { useLanguageStore } from '../../stores/languageStore';
import type { AanganEvent } from '../../types/database';

type Props = NativeStackScreenProps<any, 'Events'>;

// ── Date helpers ─────────────────────────────────────────────────────────

function pickLabel(en: string | null | undefined, hi: string | null | undefined, isHindi: boolean): string {
  if (isHindi) return (hi || en || '').toString();
  return (en || hi || '').toString();
}

function formatDayPill(iso: string): { day: string; month: string } {
  try {
    const d = new Date(iso);
    const day = String(d.getDate());
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    return { day, month };
  } catch {
    return { day: '—', month: '' };
  }
}

function formatTimeBand(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function isUpcoming(iso: string): boolean {
  try {
    return new Date(iso).getTime() >= Date.now() - 24 * 60 * 60 * 1000; // include today
  } catch {
    return true;
  }
}

// ── Row ──────────────────────────────────────────────────────────────────

function EventRow({
  event,
  isHindi,
  onPress,
}: {
  event: AanganEvent;
  isHindi: boolean;
  onPress: () => void;
}) {
  const title = pickLabel(event.title, event.title_hindi, isHindi);
  const location = pickLabel(event.location, event.location_hindi, isHindi);
  const { day, month } = formatDayPill(event.event_date);
  const time = formatTimeBand(event.event_date);
  const hostName = event.creator?.display_name_hindi || event.creator?.display_name || '';
  const stats = event.rsvp_stats;
  const rsvpLine = stats
    ? `${stats.accepted ?? 0} ${isHindi ? 'आ रहे' : 'going'}${stats.maybe ? ` · ${stats.maybe} ${isHindi ? 'शायद' : 'maybe'}` : ''}`
    : '';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${day} ${month}${time ? ', ' + time : ''}`}
    >
      <View style={styles.datePill}>
        <Text style={styles.datePillDay}>{day}</Text>
        <Text style={styles.datePillMonth}>{month}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title || '—'}</Text>
        {time ? <Text style={styles.rowTime}>{time}</Text> : null}
        {location ? (
          <Text style={styles.rowLocation} numberOfLines={1}>{'📍 '}{location}</Text>
        ) : null}
        <View style={styles.rowMeta}>
          {hostName ? <Text style={styles.rowHost} numberOfLines={1}>{isHindi ? 'मेज़बान: ' : 'Host: '}{hostName}</Text> : null}
          {rsvpLine ? <Text style={styles.rowRsvp}>{rsvpLine}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function EventsListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isHindi } = useLanguageStore();
  const { events, isLoading, fetchEvents } = useEventStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  // Upcoming first (ascending by date), then past in reverse-chronological order.
  const sortedEvents = useMemo(() => {
    const list = [...events];
    list.sort((a, b) => {
      const aUp = isUpcoming(a.event_date);
      const bUp = isUpcoming(b.event_date);
      if (aUp !== bUp) return aUp ? -1 : 1;
      // both upcoming OR both past — ascending for upcoming, descending for past
      const cmp = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      return aUp ? cmp : -cmp;
    });
    return list;
  }, [events]);

  const handleCreate = useCallback(() => {
    navigation.navigate('EventCreator');
  }, [navigation]);

  const handleRowPress = useCallback((event: AanganEvent) => {
    navigation.navigate('EventDetail', { eventId: event.id });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isHindi ? 'कार्यक्रम' : 'Events'}</Text>
        <Text style={styles.headerSubtitle}>
          {isHindi ? 'परिवार के आयोजन और RSVP' : 'Family gatherings & RSVPs'}
        </Text>
      </View>

      <FlatList
        data={sortedEvents}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventRow event={item} isHindi={isHindi} onPress={() => handleRowPress(item)} />
        )}
        contentContainerStyle={[
          styles.listContent,
          sortedEvents.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[Colors.haldiGold]}
            tintColor={Colors.haldiGold}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{'📅'}</Text>
              <Text style={styles.emptyTitle}>
                {isHindi ? 'अभी कोई कार्यक्रम नहीं' : 'No events yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isHindi
                  ? 'पहला परिवारिक आयोजन बनाइए — जन्मदिन, शादी, पूजा'
                  : 'Create your first family gathering — birthday, wedding, puja'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={handleCreate}
                accessibilityRole="button"
                accessibilityLabel="Create first event"
              >
                <Text style={styles.emptyCtaText}>
                  {isHindi ? 'नया कार्यक्रम बनाएँ' : 'Create new event'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.haldiGold} />
            </View>
          )
        }
      />

      {/* FAB — primary action: create event */}
      {sortedEvents.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
          onPress={handleCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isHindi ? 'नया कार्यक्रम बनाएँ' : 'Create new event'}
        >
          <Text style={styles.fabText}>{'+'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.brown,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: 2,
  },
  listContent: {
    paddingVertical: Spacing.md,
    paddingBottom: 120, // room for FAB + tab bar
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  // Row
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
    minHeight: 92,
  },
  datePill: {
    width: 56,
    height: 64,
    backgroundColor: Colors.haldiGold + '20',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  datePillDay: {
    ...Typography.h2,
    color: Colors.haldiGoldDark,
    fontWeight: '700',
  },
  datePillMonth: {
    ...Typography.caption,
    color: Colors.haldiGoldDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.h3,
    color: Colors.brown,
    fontSize: 16,
  },
  rowTime: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },
  rowLocation: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: 4,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: Spacing.md,
  },
  rowHost: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  rowRsvp: {
    ...Typography.caption,
    color: Colors.mehndiGreen,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.brownLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyCta: {
    backgroundColor: Colors.haldiGold,
    paddingHorizontal: Spacing.xxl,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    ...Typography.button,
    color: Colors.white,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: DADI_MIN_TAP_TARGET + 8,
    height: DADI_MIN_TAP_TARGET + 8,
    borderRadius: (DADI_MIN_TAP_TARGET + 8) / 2,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  fabText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '700',
    marginTop: -2,
  },
});
