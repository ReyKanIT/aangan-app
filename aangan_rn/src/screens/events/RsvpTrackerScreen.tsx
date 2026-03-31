import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useRsvpStore } from '../../stores/rsvpStore';
import type {
  EventRsvp,
  RsvpStatus,
  ConfirmationMethod,
  EventCheckin,
} from '../../types/database';

type Props = NativeStackScreenProps<any, 'RsvpTracker'>;

type FilterTab = 'all' | 'accepted' | 'declined' | 'pending' | 'maybe';

const FILTER_TABS: { key: FilterTab; hindi: string; color: string }[] = [
  { key: 'all', hindi: '\u0938\u092D\u0940', color: Colors.brown },
  { key: 'accepted', hindi: '\u0938\u094D\u0935\u0940\u0915\u0943\u0924', color: Colors.rsvpAccepted },
  { key: 'declined', hindi: '\u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924', color: Colors.rsvpDeclined },
  { key: 'pending', hindi: '\u0932\u0902\u092C\u093F\u0924', color: Colors.rsvpPending },
  { key: 'maybe', hindi: '\u0936\u093E\u092F\u0926', color: Colors.rsvpMaybe },
];

const STATUS_LABELS: Record<RsvpStatus, string> = {
  accepted: '\u0939\u093E\u0901',
  declined: '\u0928\u0939\u0940\u0902',
  pending: '\u0932\u0902\u092C\u093F\u0924',
  maybe: '\u0936\u093E\u092F\u0926',
};

const DELIVERY_METHODS = [
  { key: 'hand' as const, hindi: '\u0939\u093E\u0925 \u0938\u0947', icon: '\uD83E\uDD1D' },
  { key: 'post' as const, hindi: '\u0921\u093E\u0915', icon: '\uD83D\uDCEE' },
  { key: 'courier' as const, hindi: '\u0915\u0942\u0930\u093F\u092F\u0930', icon: '\uD83D\uDE9A' },
];

const CONFIRMATION_METHODS: { key: ConfirmationMethod; hindi: string; icon: string }[] = [
  { key: 'app', hindi: '\u090F\u092A', icon: '\u2713' },
  { key: 'call', hindi: '\u0915\u0949\u0932', icon: '\u260E' },
  { key: 'meeting', hindi: '\u092E\u093F\u0932\u0928', icon: '\uD83E\uDD1D' },
];

export default function RsvpTrackerScreen({ route }: Props) {
  const { eventId } = route.params as { eventId: string };
  const {
    rsvps,
    stats,
    physicalCards,
    confirmations,
    checkins,
    isLoading,
    fetchRsvps,
    toggleCard,
    addConfirmation,
    fetchCheckins,
  } = useRsvpStore();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    userId: string;
    method: ConfirmationMethod;
  }>({ visible: false, userId: '', method: 'app' });
  const [deliveryModal, setDeliveryModal] = useState<{
    visible: boolean;
    userId: string;
  }>({ visible: false, userId: '' });

  useEffect(() => {
    fetchRsvps(eventId);
    fetchCheckins(eventId);
  }, [eventId, fetchRsvps, fetchCheckins]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRsvps(eventId), fetchCheckins(eventId)]);
    setRefreshing(false);
  }, [eventId, fetchRsvps, fetchCheckins]);

  const filteredRsvps = filter === 'all'
    ? rsvps
    : rsvps.filter((r) => r.status === filter);

  const getCardStatus = (userId: string) => {
    return physicalCards.find((c) => c.user_id === userId);
  };

  const getConfirmations = (userId: string) => {
    return confirmations.filter((c) => c.user_id === userId);
  };

  const getCheckin = (userId: string): EventCheckin | undefined => {
    return checkins.find((c) => c.user_id === userId);
  };

  const cardsSent = physicalCards.filter((c) => c.card_sent).length;

  const handleToggleCard = async (userId: string) => {
    const existing = getCardStatus(userId);
    if (existing?.card_sent) {
      // Untoggle
      await toggleCard(eventId, userId, false);
    } else {
      // Show delivery method picker
      setDeliveryModal({ visible: true, userId });
    }
  };

  const handleDeliverySelect = async (method: 'hand' | 'post' | 'courier') => {
    await toggleCard(eventId, deliveryModal.userId, true, method);
    setDeliveryModal({ visible: false, userId: '' });
  };

  const handleConfirmMethod = (userId: string, method: ConfirmationMethod) => {
    setConfirmModal({ visible: true, userId, method });
  };

  const confirmConfirmation = async () => {
    const { userId, method } = confirmModal;
    const success = await addConfirmation(eventId, userId, method);
    setConfirmModal({ visible: false, userId: '', method: 'app' });
    if (!success) {
      Alert.alert('\u0924\u094D\u0930\u0941\u091F\u093F', '\u092A\u0941\u0937\u094D\u091F\u093F \u0926\u0930\u094D\u091C \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908');
    }
  };

  const getStatusColor = (status: RsvpStatus) => {
    switch (status) {
      case 'accepted': return Colors.rsvpAccepted;
      case 'declined': return Colors.rsvpDeclined;
      case 'maybe': return Colors.rsvpMaybe;
      case 'pending': return Colors.rsvpPending;
    }
  };

  const renderStatCard = (label: string, value: number, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderRsvpItem = ({ item }: { item: EventRsvp }) => {
    const card = getCardStatus(item.user_id);
    const userConfirmations = getConfirmations(item.user_id);
    const checkin = getCheckin(item.user_id);
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.rsvpCard}>
        <View style={styles.rsvpRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.user?.display_name_hindi || item.user?.display_name || '?')[0]}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.rsvpInfo}>
            <Text style={Typography.body} numberOfLines={1}>
              {item.user?.display_name_hindi || item.user?.display_name || '\u0905\u091C\u094D\u091E\u093E\u0924'}
            </Text>
            <View style={styles.metaRow}>
              {item.user?.family_level !== undefined && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>L{item.user.family_level}</Text>
                </View>
              )}
              {item.plus_count > 0 && (
                <Text style={Typography.caption}>+{item.plus_count}</Text>
              )}
            </View>
          </View>

          {/* Status chip */}
          <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
            <Text style={styles.statusChipText}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          {/* Physical card toggle */}
          <TouchableOpacity
            style={[
              styles.cardToggle,
              card?.card_sent && styles.cardToggleActive,
            ]}
            onPress={() => handleToggleCard(item.user_id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardToggleText, card?.card_sent && { color: Colors.white }]}>
              {card?.card_sent
                ? `\u0915\u093E\u0930\u094D\u0921 \u092D\u0947\u091C\u093E (${card.sent_via || ''})`
                : '\u0915\u093E\u0930\u094D\u0921 \u0928\u0939\u0940\u0902 \u092D\u0947\u091C\u093E'}
            </Text>
          </TouchableOpacity>

          {/* Confirmation methods */}
          <View style={styles.confirmMethods}>
            {CONFIRMATION_METHODS.map((method) => {
              const isConfirmed = userConfirmations.some(
                (c) => c.confirmation_method === method.key,
              );
              return (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.confirmButton,
                    isConfirmed && styles.confirmButtonActive,
                  ]}
                  onPress={() =>
                    !isConfirmed && handleConfirmMethod(item.user_id, method.key)
                  }
                  activeOpacity={isConfirmed ? 1 : 0.7}
                >
                  <Text
                    style={[
                      styles.confirmIcon,
                      isConfirmed && { color: Colors.white },
                    ]}
                  >
                    {method.icon}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* GPS check-in indicator */}
        {checkin ? (
          <View style={styles.checkinBadge}>
            <Text style={styles.checkinText}>
              {'\u2705 \u0909\u092A\u0938\u094D\u0925\u093F\u0924'}
            </Text>
          </View>
        ) : (
          <View style={[styles.checkinBadge, styles.checkinAbsent]}>
            <Text style={[styles.checkinText, { color: Colors.gray500 }]}>
              {'\u26AA \u0905\u0928\u0941\u092A\u0938\u094D\u0925\u093F\u0924'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && rsvps.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={[Typography.body, { marginTop: Spacing.lg }]}>
          {'\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Summary Stats */}
      <View style={styles.statsContainer}>
        <ScrollableStatsRow>
          {renderStatCard('\u0915\u0941\u0932 \u0928\u093F\u092E\u0902\u0924\u094D\u0930\u093F\u0924', stats.total, Colors.brown)}
          {renderStatCard('\u0938\u094D\u0935\u0940\u0915\u0943\u0924', stats.accepted, Colors.rsvpAccepted)}
          {renderStatCard('\u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924', stats.declined, Colors.rsvpDeclined)}
          {renderStatCard('\u0932\u0902\u092C\u093F\u0924', stats.pending, Colors.rsvpPending)}
          {renderStatCard('\u0936\u093E\u092F\u0926', stats.maybe, Colors.rsvpMaybe)}
          {renderStatCard('\u0915\u0941\u0932 \u092E\u0947\u0939\u092E\u093E\u0928', stats.total_guests, Colors.haldiGold)}
        </ScrollableStatsRow>
      </View>

      {/* Card tracking summary */}
      <View style={styles.cardSummary}>
        <Text style={[Typography.label, { color: Colors.haldiGoldDark }]}>
          {'\uD83D\uDCE8 \u0915\u093E\u0930\u094D\u0921 \u092D\u0947\u091C\u0947: '}{cardsSent}/{stats.total}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === tab.key && { backgroundColor: tab.color },
              ]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === tab.key && { color: Colors.white },
                ]}
              >
                {tab.hindi}
              </Text>
              {tab.key !== 'all' && (
                <Text
                  style={[
                    styles.filterCount,
                    filter === tab.key && { color: Colors.white },
                  ]}
                >
                  {tab.key === 'accepted'
                    ? stats.accepted
                    : tab.key === 'declined'
                    ? stats.declined
                    : tab.key === 'pending'
                    ? stats.pending
                    : stats.maybe}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* RSVP List */}
      <FlatList
        data={filteredRsvps}
        keyExtractor={(item) => item.id}
        renderItem={renderRsvpItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.haldiGold} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[Typography.body, { textAlign: 'center', color: Colors.gray500 }]}>
              {'\u0915\u094B\u0908 RSVP \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E'}
            </Text>
          </View>
        }
      />

      {/* Delivery Method Modal */}
      <Modal
        visible={deliveryModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeliveryModal({ visible: false, userId: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[Typography.h3, { textAlign: 'center', marginBottom: Spacing.xl }]}>
              {'\u0915\u093E\u0930\u094D\u0921 \u0915\u0948\u0938\u0947 \u092D\u0947\u091C\u093E?'}
            </Text>
            {DELIVERY_METHODS.map((method) => (
              <TouchableOpacity
                key={method.key}
                style={styles.deliveryOption}
                onPress={() => handleDeliverySelect(method.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.deliveryIcon}>{method.icon}</Text>
                <Text style={Typography.bodyLarge}>{method.hindi}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setDeliveryModal({ visible: false, userId: '' })}
              activeOpacity={0.7}
            >
              <Text style={[Typography.button, { color: Colors.brown }]}>
                {'\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, userId: '', method: 'app' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[Typography.h3, { textAlign: 'center', marginBottom: Spacing.lg }]}>
              {'\u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902?'}
            </Text>
            <Text style={[Typography.body, { textAlign: 'center', marginBottom: Spacing.xl }]}>
              {confirmModal.method === 'call'
                ? '\u0915\u094D\u092F\u093E \u0906\u092A\u0928\u0947 \u0907\u0938 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u094B \u0915\u0949\u0932 \u0915\u0930\u0915\u0947 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0940?'
                : '\u0915\u094D\u092F\u093E \u0906\u092A\u0928\u0947 \u0907\u0938 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0938\u0947 \u092E\u093F\u0932\u0915\u0930 \u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0940?'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.gray300 }]}
                onPress={() => setConfirmModal({ visible: false, userId: '', method: 'app' })}
                activeOpacity={0.7}
              >
                <Text style={[Typography.button, { color: Colors.brown }]}>
                  {'\u0928\u0939\u0940\u0902'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={confirmConfirmation}
                activeOpacity={0.7}
              >
                <Text style={Typography.button}>
                  {'\u0939\u093E\u0901'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Simple horizontal scroll wrapper for stats
function ScrollableStatsRow({ children }: { children: React.ReactNode }) {
  return (
    <FlatList
      horizontal
      data={React.Children.toArray(children)}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => <>{item}</>}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsContainer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderLeftWidth: 4,
    minWidth: 100,
    ...Shadow.sm,
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },

  // Card summary
  cardSummary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.creamDark,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },

  // Filters
  filterContainer: {
    marginBottom: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.white,
    minHeight: DADI_MIN_TAP_TARGET,
    borderWidth: 1,
    borderColor: Colors.gray300,
    marginRight: Spacing.sm,
  },
  filterTabText: {
    ...Typography.label,
    color: Colors.brown,
  },
  filterCount: {
    ...Typography.labelSmall,
    color: Colors.brownLight,
    marginLeft: Spacing.sm,
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  rsvpCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.h3,
    color: Colors.brown,
  },
  rsvpInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: Colors.creamDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  statusChipText: {
    ...Typography.labelSmall,
    color: Colors.white,
    fontWeight: '600',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  cardToggle: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
    backgroundColor: Colors.creamDark,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardToggleActive: {
    backgroundColor: Colors.mehndiGreen,
    borderColor: Colors.mehndiGreen,
  },
  cardToggleText: {
    ...Typography.bodySmall,
    color: Colors.brown,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmMethods: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confirmButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    borderRadius: DADI_MIN_TAP_TARGET / 2,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  confirmButtonActive: {
    backgroundColor: Colors.mehndiGreen,
    borderColor: Colors.mehndiGreen,
  },
  confirmIcon: {
    fontSize: 18,
    color: Colors.brown,
  },

  // Check-in
  checkinBadge: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${Colors.mehndiGreen}20`,
  },
  checkinAbsent: {
    backgroundColor: Colors.gray100,
  },
  checkinText: {
    ...Typography.bodySmall,
    color: Colors.mehndiGreen,
    fontWeight: '600',
  },

  // Empty
  emptyState: {
    paddingVertical: Spacing.huge,
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    marginHorizontal: Spacing.xxl,
    width: '85%',
    maxWidth: 400,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    ...Shadow.sm,
  },
  deliveryIcon: {
    fontSize: 24,
    marginRight: Spacing.lg,
  },
  modalCancel: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
