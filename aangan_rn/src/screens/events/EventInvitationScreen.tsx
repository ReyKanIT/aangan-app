import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useEventStore } from '../../stores/eventStore';
import { useRsvpStore } from '../../stores/rsvpStore';
import { useAuthStore } from '../../stores/authStore';
import type { RsvpStatus, EventType } from '../../types/database';

type Props = NativeStackScreenProps<any, 'EventInvitation'>;

const EVENT_TYPE_LABELS: Record<EventType, { hindi: string; icon: string }> = {
  wedding: { hindi: '\u0936\u0941\u092D \u0935\u093F\u0935\u093E\u0939', icon: '\uD83D\uDC8D' },
  engagement: { hindi: '\u0938\u0917\u093E\u0908', icon: '\uD83D\uDC8D' },
  puja: { hindi: '\u092A\u0942\u091C\u093E', icon: '\uD83D\uDD4A\uFE0F' },
  birthday: { hindi: '\u091C\u0928\u094D\u092E\u0926\u093F\u0928', icon: '\uD83C\uDF82' },
  gathering: { hindi: '\u092E\u093F\u0932\u0928', icon: '\uD83E\uDD1D' },
  mundan: { hindi: '\u092E\u0941\u0902\u0921\u0928', icon: '\u2702\uFE0F' },
  housewarming: { hindi: '\u0917\u0943\u0939 \u092A\u094D\u0930\u0935\u0947\u0936', icon: '\uD83C\uDFE0' },
  other: { hindi: '\u0905\u0928\u094D\u092F', icon: '\u2B50' },
};

const DIETARY_OPTIONS = [
  { key: 'vegetarian', hindi: '\u0936\u093E\u0915\u093E\u0939\u093E\u0930\u0940', icon: '\uD83E\uDD66' },
  { key: 'jain', hindi: '\u091C\u0948\u0928', icon: '\uD83C\uDF3F' },
  { key: 'vegan', hindi: '\u0935\u0940\u0917\u0928', icon: '\uD83C\uDF31' },
  { key: 'none', hindi: '\u0915\u094B\u0908 \u0928\u0939\u0940\u0902', icon: '\u2714\uFE0F' },
];

export default function EventInvitationScreen({ route, navigation }: Props) {
  const { eventId } = route.params as { eventId: string };
  const { currentEvent, isLoading: eventLoading, fetchEventById } = useEventStore();
  const { submitRsvp, error: rsvpError } = useRsvpStore();
  const session = useAuthStore((s) => s.session);

  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(null);
  const [plusCount, setPlusCount] = useState(0);
  const [dietary, setDietary] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const loadEvent = useCallback(async () => {
    await fetchEventById(eventId);
  }, [eventId, fetchEventById]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Pre-fill existing RSVP
  useEffect(() => {
    if (currentEvent?.my_rsvp) {
      const r = currentEvent.my_rsvp;
      setRsvpStatus(r.status);
      setPlusCount(r.guests_count);
      setDietary(r.dietary_preferences);
      if (r.status !== 'pending') {
        setHasSubmitted(true);
      }
    }
  }, [currentEvent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvent();
    setRefreshing(false);
  }, [loadEvent]);

  const isPastEvent = currentEvent
    ? new Date(currentEvent.event_date) < new Date()
    : false;

  const isPastDeadline = currentEvent?.rsvp_deadline
    ? new Date(currentEvent.rsvp_deadline) < new Date()
    : false;

  const canRsvp = !isPastEvent && !isPastDeadline;

  const handleRsvpSelect = (status: RsvpStatus) => {
    if (!canRsvp) return;
    setRsvpStatus(status);
    if (status === 'declined') {
      setPlusCount(0);
      setDietary([]);
    }
  };

  const toggleDietary = (key: string) => {
    if (key === 'none') {
      setDietary(['none']);
      return;
    }
    setDietary((prev) => {
      const filtered = prev.filter((d) => d !== 'none');
      return filtered.includes(key)
        ? filtered.filter((d) => d !== key)
        : [...filtered, key];
    });
  };

  const handleSubmitRsvp = async () => {
    if (!rsvpStatus || isSubmitting) return;

    setIsSubmitting(true);
    const success = await submitRsvp(
      eventId,
      rsvpStatus,
      plusCount,
      null,
      dietary,
    );
    setIsSubmitting(false);

    if (success) {
      setHasSubmitted(true);
      Alert.alert(
        '\u0927\u0928\u094D\u092F\u0935\u093E\u0926',
        '\u0906\u092A\u0915\u093E \u091C\u0935\u093E\u092C \u0926\u0930\u094D\u091C \u0939\u094B \u0917\u092F\u093E!',
      );
    } else {
      Alert.alert(
        '\u0924\u094D\u0930\u0941\u091F\u093F',
        rsvpError || '\u091C\u0935\u093E\u092C \u0926\u0947\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908',
      );
    }
  };

  const openMaps = () => {
    if (!currentEvent) return;
    const { latitude, longitude, address, location } = currentEvent;
    if (latitude && longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    } else if (address) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('hi-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('hi-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (eventLoading && !currentEvent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={[Typography.body, styles.loadingText]}>
          {'\u0928\u093F\u092E\u0902\u0924\u094D\u0930\u0923 \u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948...'}
        </Text>
      </View>
    );
  }

  if (!currentEvent) {
    return (
      <View style={styles.centered}>
        <Text style={[Typography.h2, { textAlign: 'center' }]}>
          {'\u0907\u0935\u0947\u0902\u091F \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadEvent}>
          <Text style={Typography.button}>
            {'\u092B\u093F\u0930 \u0938\u0947 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventTypeInfo = EVENT_TYPE_LABELS[currentEvent.event_type] || EVENT_TYPE_LABELS.other;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.haldiGold} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Decorative Header Gradient */}
      <LinearGradient
        colors={[Colors.haldiGold, Colors.haldiGoldLight, Colors.cream]}
        style={styles.headerGradient}
      >
        <Text style={styles.decorBorder}>{'~ \u0936\u0941\u092D ~'}</Text>
        {/* Event type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeIcon}>{eventTypeInfo.icon}</Text>
          <Text style={styles.typeBadgeText}>{eventTypeInfo.hindi}</Text>
        </View>
        {/* Event title */}
        <Text style={styles.eventTitle}>
          {currentEvent.title_hindi || currentEvent.title}
        </Text>
        {currentEvent.title_hindi && currentEvent.title ? (
          <Text style={styles.eventSubtitle}>{currentEvent.title}</Text>
        ) : null}
      </LinearGradient>

      {/* Host Info */}
      {currentEvent.creator && (
        <View style={styles.hostSection}>
          <View style={styles.hostRow}>
            {currentEvent.creator.profile_photo_url ? (
              <Image
                source={{ uri: currentEvent.creator.profile_photo_url }}
                style={styles.hostAvatar}
              />
            ) : (
              <View style={styles.hostAvatarPlaceholder}>
                <Text style={styles.hostAvatarText}>
                  {(currentEvent.creator.display_name_hindi || currentEvent.creator.display_name || '?')[0]}
                </Text>
              </View>
            )}
            <View style={styles.hostInfo}>
              <Text style={styles.hostLabel}>
                {'\u0906\u092F\u094B\u091C\u0915'}
              </Text>
              <Text style={Typography.bodyLarge}>
                {currentEvent.creator.display_name_hindi || currentEvent.creator.display_name}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Dual Calendar Date */}
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Text style={styles.iconEmoji}>{'\uD83D\uDCC5'}</Text>
        </View>
        <View style={styles.dateSection}>
          <Text style={styles.sectionTitle}>
            {'\u0924\u093E\u0930\u0940\u0916'}
          </Text>
          <Text style={[Typography.bodyLarge, { fontWeight: '600' }]}>
            {formatDate(currentEvent.event_date)}
          </Text>
          <Text style={Typography.bodySmall}>
            {formatTime(currentEvent.event_date)}
            {currentEvent.end_date ? ` - ${formatTime(currentEvent.end_date)}` : ''}
          </Text>
          {/* Tithi placeholder */}
          <Text style={[Typography.bodySmall, { color: Colors.haldiGold, marginTop: Spacing.xs }]}>
            {'\u0924\u093F\u0925\u093F: \u0936\u0941\u092D \u092E\u0941\u0939\u0942\u0930\u094D\u0924'}
          </Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Text style={styles.iconEmoji}>{'\uD83D\uDCCD'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            {'\u0938\u094D\u0925\u093E\u0928'}
          </Text>
          <Text style={[Typography.bodyLarge, { fontWeight: '600' }]}>
            {currentEvent.location_hindi || currentEvent.location}
          </Text>
          {currentEvent.address ? (
            <Text style={Typography.bodySmall}>{currentEvent.address}</Text>
          ) : null}
          <TouchableOpacity style={styles.mapButton} onPress={openMaps} activeOpacity={0.7}>
            <Text style={styles.mapButtonText}>
              {'\uD83D\uDDFA\uFE0F Google Maps \u092E\u0947\u0902 \u0926\u0947\u0916\u0947\u0902'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description */}
      {(currentEvent.description || currentEvent.description_hindi) && (
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Text style={styles.iconEmoji}>{'\uD83D\uDCDD'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              {'\u0935\u093F\u0935\u0930\u0923'}
            </Text>
            <Text style={Typography.body}>
              {currentEvent.description_hindi || currentEvent.description}
            </Text>
          </View>
        </View>
      )}

      {/* Ceremony Timeline */}
      {currentEvent.ceremonies && currentEvent.ceremonies.length > 0 && (
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>
            {'\uD83C\uDF89 \u0915\u093E\u0930\u094D\u092F\u0915\u094D\u0930\u092E'}
          </Text>
          {currentEvent.ceremonies.map((ceremony, index) => (
            <View key={index} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              {index < currentEvent.ceremonies.length - 1 && (
                <View style={styles.timelineLine} />
              )}
              <View style={styles.timelineContent}>
                <Text style={[Typography.bodySmall, styles.timelineTime]}>
                  {ceremony.time}
                </Text>
                <Text style={[Typography.body, { fontWeight: '600' }]}>
                  {ceremony.name}
                </Text>
                {ceremony.nameEn ? (
                  <Text style={Typography.bodySmall}>{ceremony.nameEn}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* RSVP Section */}
      <View style={styles.rsvpSection}>
        <Text style={styles.rsvpTitle}>
          {'\u0906\u092A\u0915\u093E \u091C\u0935\u093E\u092C'}
        </Text>

        {!canRsvp ? (
          <View style={styles.rsvpClosedCard}>
            <Text style={[Typography.body, { textAlign: 'center', color: Colors.gray600 }]}>
              {isPastEvent
                ? '\u092F\u0939 \u0907\u0935\u0947\u0902\u091F \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948'
                : 'RSVP \u0915\u0940 \u0938\u092E\u092F \u0938\u0940\u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u0908 \u0939\u0948'}
            </Text>
            {hasSubmitted && rsvpStatus && (
              <View style={[styles.statusChip, getStatusChipStyle(rsvpStatus)]}>
                <Text style={styles.statusChipText}>
                  {'\u0906\u092A\u0915\u093E \u091C\u0935\u093E\u092C: '}
                  {getStatusLabel(rsvpStatus)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* 3 RSVP Buttons */}
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpAccepted,
                  rsvpStatus === 'accepted' && styles.rsvpButtonActive,
                  rsvpStatus === 'accepted' && { borderColor: Colors.mehndiGreen },
                ]}
                onPress={() => handleRsvpSelect('accepted')}
                activeOpacity={0.7}
              >
                <Text style={styles.rsvpButtonEmoji}>{'\u2705'}</Text>
                <Text style={[styles.rsvpButtonText, rsvpStatus === 'accepted' && { color: Colors.white }]}>
                  {'\u0939\u093E\u0901, \u0906\u0909\u0901\u0917\u093E'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpMaybe,
                  rsvpStatus === 'maybe' && styles.rsvpButtonActive,
                  rsvpStatus === 'maybe' && { borderColor: Colors.warning, backgroundColor: Colors.warning },
                ]}
                onPress={() => handleRsvpSelect('maybe')}
                activeOpacity={0.7}
              >
                <Text style={styles.rsvpButtonEmoji}>{'\uD83E\uDD14'}</Text>
                <Text style={[styles.rsvpButtonText, rsvpStatus === 'maybe' && { color: Colors.white }]}>
                  {'\u0936\u093E\u092F\u0926'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  styles.rsvpDeclined,
                  rsvpStatus === 'declined' && styles.rsvpButtonActive,
                  rsvpStatus === 'declined' && { borderColor: Colors.error, backgroundColor: Colors.error },
                ]}
                onPress={() => handleRsvpSelect('declined')}
                activeOpacity={0.7}
              >
                <Text style={styles.rsvpButtonEmoji}>{'\u274C'}</Text>
                <Text style={[styles.rsvpButtonText, rsvpStatus === 'declined' && { color: Colors.white }]}>
                  {'\u0928\u0939\u0940\u0902 \u0906 \u092A\u093E\u0909\u0901\u0917\u093E'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Plus-ones counter */}
            {(rsvpStatus === 'accepted' || rsvpStatus === 'maybe') && (
              <View style={styles.plusSection}>
                <Text style={Typography.label}>
                  {'\u0938\u093E\u0925 \u092E\u0947\u0902 \u0915\u093F\u0924\u0928\u0947 \u0932\u094B\u0917 \u0906\u090F\u0902\u0917\u0947?'}
                </Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setPlusCount(Math.max(0, plusCount - 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.counterButtonText}>{'-'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{plusCount}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setPlusCount(Math.min(10, plusCount + 1))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.counterButtonText}>{'+'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Dietary checkboxes */}
            {(rsvpStatus === 'accepted' || rsvpStatus === 'maybe') && (
              <View style={styles.dietarySection}>
                <Text style={Typography.label}>
                  {'\u092D\u094B\u091C\u0928 \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E'}
                </Text>
                <View style={styles.dietaryGrid}>
                  {DIETARY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.dietaryChip,
                        dietary.includes(opt.key) && styles.dietaryChipActive,
                      ]}
                      onPress={() => toggleDietary(opt.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dietaryIcon}>{opt.icon}</Text>
                      <Text
                        style={[
                          styles.dietaryText,
                          dietary.includes(opt.key) && styles.dietaryTextActive,
                        ]}
                      >
                        {opt.hindi}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Submit */}
            {rsvpStatus && (
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
                onPress={handleSubmitRsvp}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={Typography.button}>
                    {hasSubmitted
                      ? '\u091C\u0935\u093E\u092C \u0905\u092A\u0921\u0947\u091F \u0915\u0930\u0947\u0902'
                      : '\u091C\u0935\u093E\u092C \u092D\u0947\u091C\u0947\u0902'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[Typography.caption, { textAlign: 'center' }]}>
          {'\u0906\u0901\u0917\u0928 \u2014 \u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u093E \u0906\u0901\u0917\u0928'}
        </Text>
      </View>
    </ScrollView>
  );
}

function getStatusLabel(status: RsvpStatus): string {
  switch (status) {
    case 'accepted': return '\u0939\u093E\u0901, \u0906\u0909\u0901\u0917\u093E';
    case 'declined': return '\u0928\u0939\u0940\u0902 \u0906 \u092A\u093E\u0909\u0901\u0917\u093E';
    case 'maybe': return '\u0936\u093E\u092F\u0926';
    case 'pending': return '\u0905\u092D\u0940 \u0924\u092F \u0928\u0939\u0940\u0902';
  }
}

function getStatusChipStyle(status: RsvpStatus) {
  switch (status) {
    case 'accepted': return { backgroundColor: Colors.rsvpAccepted };
    case 'declined': return { backgroundColor: Colors.rsvpDeclined };
    case 'maybe': return { backgroundColor: Colors.rsvpMaybe };
    default: return { backgroundColor: Colors.rsvpPending };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    paddingBottom: Spacing.huge,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.haldiGold,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
  },

  // Header
  headerGradient: {
    paddingTop: Spacing.huge + Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
  },
  decorBorder: {
    ...Typography.h3,
    color: Colors.brown,
    marginBottom: Spacing.md,
    letterSpacing: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    marginBottom: Spacing.lg,
  },
  typeBadgeIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  typeBadgeText: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
  },
  eventTitle: {
    ...Typography.h1,
    textAlign: 'center',
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  eventSubtitle: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    color: Colors.brownLight,
    fontStyle: 'italic',
  },

  // Host
  hostSection: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.haldiGold,
  },
  hostAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.haldiGold,
  },
  hostAvatarText: {
    ...Typography.h2,
    color: Colors.brown,
  },
  hostInfo: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  hostLabel: {
    ...Typography.labelSmall,
    color: Colors.brownMuted,
  },

  // Cards
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconEmoji: {
    fontSize: 20,
  },
  dateSection: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.brownMuted,
    marginBottom: Spacing.xs,
  },

  // Maps button
  mapButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  mapButtonText: {
    ...Typography.bodySmall,
    color: Colors.mehndiGreen,
    fontWeight: '600',
  },

  // Timeline
  timelineCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  timelineTitle: {
    ...Typography.h3,
    marginBottom: Spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.haldiGold,
    marginTop: 4,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 18,
    bottom: -Spacing.lg,
    width: 2,
    backgroundColor: Colors.haldiGoldLight,
  },
  timelineContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  timelineTime: {
    color: Colors.haldiGoldDark,
    fontWeight: '600',
    marginBottom: 2,
  },

  // RSVP Section
  rsvpSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadow.md,
  },
  rsvpTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  rsvpClosedCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statusChip: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
  },
  statusChipText: {
    ...Typography.label,
    color: Colors.white,
  },
  rsvpButtons: {
    gap: Spacing.md,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  rsvpAccepted: {
    borderColor: Colors.mehndiGreen,
    backgroundColor: `${Colors.mehndiGreen}15`,
  },
  rsvpMaybe: {
    borderColor: Colors.warning,
    backgroundColor: `${Colors.warning}15`,
  },
  rsvpDeclined: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}15`,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.mehndiGreen,
  },
  rsvpButtonEmoji: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  rsvpButtonText: {
    ...Typography.button,
    color: Colors.brown,
    fontSize: 18,
  },

  // Plus-ones
  plusSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  counterButton: {
    width: DADI_MIN_BUTTON_HEIGHT,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.sm,
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.brown,
  },
  counterValue: {
    ...Typography.h1,
    marginHorizontal: Spacing.xxl,
    minWidth: 50,
    textAlign: 'center',
  },

  // Dietary
  dietarySection: {
    marginTop: Spacing.xl,
  },
  dietaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  dietaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.creamDark,
    minHeight: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dietaryChipActive: {
    borderColor: Colors.mehndiGreen,
    backgroundColor: `${Colors.mehndiGreen}20`,
  },
  dietaryIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  dietaryText: {
    ...Typography.body,
    color: Colors.brown,
  },
  dietaryTextActive: {
    color: Colors.mehndiGreenDark,
    fontWeight: '600',
  },

  // Submit
  submitButton: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.haldiGold,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  submitDisabled: {
    opacity: 0.6,
  },

  // Footer
  footer: {
    marginTop: Spacing.xxxl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
});
