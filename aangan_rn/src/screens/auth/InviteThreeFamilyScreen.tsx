/**
 * InviteThreeFamilyScreen — forced "Invite 3 family members" step that fires
 * immediately after first-time ProfileSetup. CEO + CMO #1 priority for the
 * 10K-MAU push (k-factor 0.25 → 0.55+). See:
 *   notes/10k-milestone.md, notes/growth-loops-30d.md Loop 2.
 *
 * Design contract:
 *  - Three pre-filled relationship slots: पिताजी / माँ / भाई-बहन
 *  - Each slot = relationship label + 10-digit phone input + WhatsApp send btn
 *  - Soft "बाद में / Later" skip (does not block onboarding, but records the
 *    `forced_invite_skipped` event + persists `forced_invite_skipped_at` to
 *    AsyncStorage so retargeting jobs can find these users).
 *  - Progress ring at top showing 30% of the overall first-run journey
 *    (post-OTP, post-profile-setup).
 *  - Tap targets ≥52px, body text ≥16px (Dadi Test).
 *  - All Hindi JSX text wrapped in `{'...'}` (v0.13.16 escape-seq regression).
 *
 * The screen replaces navigation to Main on both Continue and Skip — it must
 * never push, only `replace`, so the back button does not deposit the user
 * back into the forced gate after they've gotten through it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import {
  buildForcedInviteMessage,
  openWhatsAppInvite,
} from '../../utils/whatsappInvite';
import { trackFunnelEvent } from '../../utils/funnelEvents';

type Props = NativeStackScreenProps<any, 'InviteThreeFamily'>;

/** AsyncStorage key for the soft-skip flag — the CTO follow-up is to mirror
 *  this into a `skipped_forced_invite` column on the users row. */
export const FORCED_INVITE_SKIPPED_KEY = 'forced_invite_skipped_at';

/** Pre-filled relationship slots per CMO Loop 2 spec. Order is deliberate:
 *  parents first (highest WhatsApp send-rate in pilot), siblings third. */
const RELATIONSHIP_SLOTS: {
  key: 'father' | 'mother' | 'sibling';
  labelHindi: string;
  labelEnglish: string;
  emoji: string;
}[] = [
  { key: 'father',  labelHindi: 'पिताजी',     labelEnglish: 'Father',          emoji: '👨' },
  { key: 'mother',  labelHindi: 'माँ',         labelEnglish: 'Mother',          emoji: '👩' },
  { key: 'sibling', labelHindi: 'भाई-बहन',    labelEnglish: 'Brother / Sister', emoji: '👫' },
];

type SlotState = {
  phone: string;
  sent: boolean;
};

export default function InviteThreeFamilyScreen({ navigation }: Props) {
  const currentUser = useAuthStore((s) => s.user);

  const [slots, setSlots] = useState<Record<string, SlotState>>(() =>
    Object.fromEntries(RELATIONSHIP_SLOTS.map((r) => [r.key, { phone: '', sent: false }])),
  );

  // Fire `forced_invite_shown` once on mount — this is the denominator of the
  // CMO's "profile-setup → first-invite" conversion KPI.
  useEffect(() => {
    trackFunnelEvent('forced_invite_shown');
  }, []);

  const inviterName = useMemo(
    () => currentUser?.display_name_hindi || currentUser?.display_name || null,
    [currentUser?.display_name_hindi, currentUser?.display_name],
  );

  const updatePhone = useCallback(
    (slotKey: string, raw: string) => {
      const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 10);
      setSlots((prev) => {
        const next = { ...prev, [slotKey]: { ...prev[slotKey], phone: cleaned } };
        // Fire `forced_invite_phone_filled` on the *first* digit per slot —
        // this measures user intent, not data quality.
        if (cleaned.length === 1 && prev[slotKey].phone.length === 0) {
          trackFunnelEvent('forced_invite_phone_filled', { slot: slotKey });
        }
        return next;
      });
    },
    [],
  );

  const handleSend = useCallback(
    async (slotKey: string, labelHindi: string) => {
      const slot = slots[slotKey];
      if (!slot) return;

      const message = buildForcedInviteMessage({
        inviterName,
        relationshipLabelHindi: labelHindi,
      });

      // Phone may be blank — WhatsApp will then prompt the user to pick a
      // contact, which is a perfectly valid path in the field. We still mark
      // the slot as "actioned" because the user did opt in to the invite.
      const opened = await openWhatsAppInvite(message, slot.phone || null);
      if (opened) {
        setSlots((prev) => ({ ...prev, [slotKey]: { ...prev[slotKey], sent: true } }));
        trackFunnelEvent('forced_invite_whatsapp_sent', {
          slot: slotKey,
          had_phone: slot.phone.length > 0,
        });
      }
    },
    [slots, inviterName],
  );

  const anySent = useMemo(
    () => Object.values(slots).some((s) => s.sent),
    [slots],
  );

  const sentCount = useMemo(
    () => Object.values(slots).filter((s) => s.sent).length,
    [slots],
  );

  const handleContinue = useCallback(() => {
    trackFunnelEvent('forced_invite_continued', { sent_count: sentCount });
    navigation.replace('Main');
  }, [navigation, sentCount]);

  const handleSkip = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FORCED_INVITE_SKIPPED_KEY, new Date().toISOString());
    } catch {
      // AsyncStorage is best-effort — never block the user out of the app
      // because we couldn't write a retargeting flag.
    }
    trackFunnelEvent('forced_invite_skipped', { sent_count: sentCount });
    navigation.replace('Main');
  }, [navigation, sentCount]);

  // Progress: this screen represents 30% of the overall first-run flow
  // (Splash → OTP → ProfileSetup → InviteThreeFamily → Main). The exact
  // percentage is a CMO call — keep the constant at the top of the file so
  // it's easy to tweak after A/B results.
  const PROGRESS_PCT = 0.3;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress ring — 30% post-profile-setup, per CMO Loop 2 spec */}
        <View style={styles.progressRow}>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ now: Math.round(PROGRESS_PCT * 100), min: 0, max: 100 }}
          >
            <View style={[styles.progressFill, { width: `${PROGRESS_PCT * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(PROGRESS_PCT * 100)}%</Text>
        </View>

        {/* Title block */}
        <Text style={styles.title}>{'अपने 3 परिवार वालों को बुलाएं'}</Text>
        <Text style={styles.subtitle}>{'Invite 3 family members'}</Text>
        <Text style={styles.helper}>
          {'जितने ज़्यादा अपने, उतना ही असली आँगन। 💛'}
        </Text>

        {/* Three relationship slots */}
        {RELATIONSHIP_SLOTS.map((slot) => {
          const state = slots[slot.key];
          return (
            <View key={slot.key} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                <View style={styles.slotLabelCol}>
                  <Text style={styles.slotLabelHindi}>{slot.labelHindi}</Text>
                  <Text style={styles.slotLabelEnglish}>{slot.labelEnglish}</Text>
                </View>
                {state.sent && (
                  <View style={styles.sentBadge}>
                    <Text style={styles.sentBadgeText}>{'✓ भेजा'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.slotRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>{'+91'}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={state.phone}
                  onChangeText={(t) => updatePhone(slot.key, t)}
                  placeholder={'10 अंकों का नंबर'}
                  placeholderTextColor={Colors.gray400}
                  keyboardType="phone-pad"
                  maxLength={10}
                  accessibilityLabel={`${slot.labelEnglish} phone number`}
                />
                <TouchableOpacity
                  style={[styles.whatsappButton, state.sent && styles.whatsappButtonSent]}
                  onPress={() => handleSend(slot.key, slot.labelHindi)}
                  accessibilityRole="button"
                  accessibilityLabel={`Send WhatsApp invite to ${slot.labelEnglish}`}
                  activeOpacity={0.85}
                >
                  <Text style={styles.whatsappIcon}>{'💬'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Continue button — always enabled. Soft skip path = the floating
            "बाद में" link below. Disabling Continue on a forced-invite gate
            was tested in pilot and reduced completion by 11% (users felt
            stuck) — see notes/growth-loops-30d.md §Loop 2. */}
        <TouchableOpacity
          style={[styles.continueButton, !anySent && styles.continueButtonMuted]}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to home"
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            {anySent ? 'आगे बढ़ें →' : 'अभी आगे बढ़ें →'}
          </Text>
        </TouchableOpacity>

        {/* Soft skip — floating link, bottom-right */}
        <TouchableOpacity
          style={styles.skipLink}
          onPress={handleSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip and invite later"
          activeOpacity={0.7}
        >
          <Text style={styles.skipLinkText}>{'बाद में / Later'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: Spacing.huge,
  },

  // Progress ring (linear bar, "ring" used loosely per CMO copy)
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.haldiGold,
    borderRadius: 4,
  },
  progressLabel: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.haldiGoldDark,
    minWidth: 40,
    textAlign: 'right',
  },

  // Title / subtitle / helper
  title: {
    ...Typography.h2,
    fontSize: 24,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  helper: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },

  // Slot card
  slotCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  slotEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  slotLabelCol: {
    flex: 1,
  },
  slotLabelHindi: {
    ...Typography.label,
    fontSize: 18,
    color: Colors.brown,
    fontWeight: '600',
  },
  slotLabelEnglish: {
    ...Typography.caption,
    fontSize: 14,
    color: Colors.gray500,
  },
  sentBadge: {
    backgroundColor: Colors.mehndiGreen,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  sentBadgeText: {
    ...Typography.caption,
    fontSize: 13,
    color: Colors.white,
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countryCode: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
  },
  whatsappButton: {
    minWidth: DADI_MIN_BUTTON_HEIGHT,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  whatsappButtonSent: {
    backgroundColor: Colors.mehndiGreen,
  },
  whatsappIcon: {
    fontSize: 22,
    color: Colors.white,
  },

  // Continue + skip
  continueButton: {
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  continueButtonMuted: {
    backgroundColor: Colors.haldiGold,
    opacity: 0.85,
  },
  continueButtonText: {
    ...Typography.button,
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
  },
  skipLink: {
    alignSelf: 'flex-end',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
  },
  skipLinkText: {
    ...Typography.body,
    fontSize: 16,
    color: Colors.gray600,
    textDecorationLine: 'underline',
  },
});
