import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
  Linking,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { STORAGE_TIERS, REFERRAL_LIMITS } from '../../config/constants';
import { useStorageStore } from '../../stores/storageStore';
import { useAuthStore } from '../../stores/authStore';
import GoldButton from '../../components/common/GoldButton';
import LoadingScreen from '../../components/common/LoadingScreen';
import type { Referral, StorageTier } from '../../types/database';

// --- Constants ---
const EARLY_ADOPTER_TOTAL = REFERRAL_LIMITS.maxEarlyAdopters;

const STEPS = [
  { num: 1, icon: '📱', titleHi: 'कोड शेयर करें', titleEn: 'Share Code', desc: 'अपना रेफरल कोड दोस्तों और परिवार को भेजें' },
  { num: 2, icon: '👤', titleHi: 'दोस्त जुड़ें', titleEn: 'Friend Joins', desc: 'आपके कोड से रजिस्टर करें' },
  { num: 3, icon: '✅', titleHi: 'वेरिफ़ाई हो', titleEn: 'Friend Verifies', desc: `${REFERRAL_LIMITS.verificationDays} दिन तक ऐप इस्तेमाल करें` },
  { num: 4, icon: '🎁', titleHi: 'स्टोरेज पाएं', titleEn: 'You Get Storage', desc: 'दोनों को एक्स्ट्रा स्टोरेज मिले' },
];

const TIER_CONFIG: Record<StorageTier, { icon: string; hi: string; en: string; color: string; referrals: number; gb: number }> = {
  base: { icon: '🏠', hi: 'मूल', en: 'Base', color: Colors.gray500, referrals: 0, gb: STORAGE_TIERS.base.gb },
  bronze: { icon: '🥉', hi: 'कांस्य', en: 'Bronze', color: '#CD7F32', referrals: STORAGE_TIERS.bronze.referrals, gb: STORAGE_TIERS.bronze.gb },
  silver: { icon: '🥈', hi: 'रजत', en: 'Silver', color: '#A0A0A0', referrals: STORAGE_TIERS.silver.referrals, gb: STORAGE_TIERS.silver.gb },
  gold: { icon: '🥇', hi: 'सोना', en: 'Gold', color: Colors.haldiGold, referrals: STORAGE_TIERS.gold.referrals, gb: STORAGE_TIERS.gold.gb },
};

const TIER_ORDER: StorageTier[] = ['base', 'bronze', 'silver', 'gold'];

// --- Step Card ---
function StepCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step.num}</Text>
      </View>
      <Text style={styles.stepIcon}>{step.icon}</Text>
      <Text style={styles.stepTitle}>{step.titleHi}</Text>
      <Text style={styles.stepTitleEn}>{step.titleEn}</Text>
      <Text style={styles.stepDesc}>{step.desc}</Text>
    </View>
  );
}

// --- Tier Card ---
function TierCard({
  tier,
  isCurrent,
}: {
  tier: StorageTier;
  isCurrent: boolean;
}) {
  const config = TIER_CONFIG[tier];

  return (
    <View style={[styles.tierCardItem, isCurrent && { borderColor: config.color, borderWidth: 2, backgroundColor: config.color + '10' }]}>
      {isCurrent && (
        <View style={[styles.currentBadge, { backgroundColor: config.color }]}>
          <Text style={styles.currentBadgeText}>वर्तमान / Current</Text>
        </View>
      )}
      <Text style={styles.tierCardIcon}>{config.icon}</Text>
      <Text style={[styles.tierCardName, { color: config.color }]}>{config.hi}</Text>
      <Text style={[styles.tierCardNameEn, { color: config.color }]}>{config.en}</Text>
      <Text style={styles.tierCardGb}>{config.gb} GB</Text>
      {config.referrals > 0 && (
        <Text style={styles.tierCardReferrals}>{config.referrals} रेफरल</Text>
      )}
    </View>
  );
}

// --- Tier Progress ---
function TierProgressSection({
  currentTier,
  verifiedCount,
}: {
  currentTier: StorageTier;
  verifiedCount: number;
}) {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const nextTier = currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null;
  const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;
  const currentConfig = TIER_CONFIG[currentTier];

  const progressPercent = nextConfig
    ? Math.min((verifiedCount / nextConfig.referrals) * 100, 100)
    : 100;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>टियर प्रगति</Text>
      <Text style={styles.sectionSubtitle}>Tier Progress</Text>

      {/* Current -> Next visual */}
      <View style={styles.progressRow}>
        <View style={styles.progressTierBox}>
          <View style={[styles.progressTierCircle, { borderColor: currentConfig.color, backgroundColor: currentConfig.color + '20' }]}>
            <Text style={styles.progressTierIcon}>{currentConfig.icon}</Text>
          </View>
          <Text style={[styles.progressTierLabel, { color: currentConfig.color }]}>{currentConfig.hi}</Text>
        </View>

        <View style={styles.progressArrow}>
          <Text style={styles.progressArrowText}>{'→'}</Text>
        </View>

        {nextConfig ? (
          <View style={styles.progressTierBox}>
            <View style={[styles.progressTierCircle, { borderColor: nextConfig.color }]}>
              <Text style={styles.progressTierIcon}>{nextConfig.icon}</Text>
            </View>
            <Text style={[styles.progressTierLabel, { color: nextConfig.color }]}>{nextConfig.hi}</Text>
          </View>
        ) : (
          <View style={styles.progressTierBox}>
            <View style={[styles.progressTierCircle, { borderColor: Colors.haldiGold, backgroundColor: Colors.haldiGold + '20' }]}>
              <Text style={styles.progressTierIcon}>{'🎉'}</Text>
            </View>
            <Text style={[styles.progressTierLabel, { color: Colors.haldiGold }]}>अधिकतम!</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {nextConfig && (
        <View style={styles.progressBarBox}>
          <Text style={styles.progressBarLabel}>
            {verifiedCount} / {nextConfig.referrals} रेफरल — {nextConfig.hi} तक
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: nextConfig.color },
              ]}
            />
          </View>
        </View>
      )}

      {currentTier === 'gold' && (
        <Text style={styles.progressMaxText}>
          {'🎉 आप सर्वोच्च टियर पर हैं! / You are at the highest tier!'}
        </Text>
      )}
    </View>
  );
}

// --- Referral List Item ---
function ReferralItem({ referral }: { referral: Referral }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'लंबित / Pending', color: Colors.warning },
    verified: { label: 'सत्यापित / Verified', color: Colors.mehndiGreen },
    rejected: { label: 'अस्वीकृत / Rejected', color: Colors.error },
  };
  const s = statusMap[referral.status] || statusMap.pending;

  // Use referred_id to show initials as avatar placeholder
  const initials = referral.referred_id.slice(0, 2).toUpperCase();

  return (
    <View style={styles.referralItem}>
      {/* Avatar placeholder */}
      <View style={styles.referralAvatar}>
        <Text style={styles.referralAvatarText}>{initials}</Text>
      </View>
      <View style={styles.referralInfo}>
        <Text style={styles.referralCode}>{referral.referral_code}</Text>
        <Text style={styles.referralDate}>
          {new Date(referral.referred_at).toLocaleDateString('hi-IN')}
        </Text>
      </View>
      <View style={[styles.referralStatusBadge, { backgroundColor: s.color + '20' }]}>
        <Text style={[styles.referralStatusText, { color: s.color }]}>{s.label}</Text>
      </View>
    </View>
  );
}

// --- Rule Item ---
function RuleItem({ text, textEn }: { text: string; textEn: string }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleBullet}>{'•'}</Text>
      <View style={styles.ruleContent}>
        <Text style={styles.ruleText}>{text}</Text>
        <Text style={styles.ruleTextEn}>{textEn}</Text>
      </View>
    </View>
  );
}

// --- Main Screen ---
export default function ReferralScreen() {
  const {
    userStorage,
    referrals,
    isLoading,
    fetchStorage,
    fetchReferrals,
    generateReferralCode,
  } = useStorageStore();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    fetchStorage();
    fetchReferrals();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStorage();
    await fetchReferrals();
    setRefreshing(false);
  }, [fetchStorage, fetchReferrals]);

  const referralCode = userStorage?.referral_code || '';
  const currentTier = userStorage?.storage_tier || 'base';
  const verifiedCount = userStorage?.verified_referral_count || 0;
  const programStatus = userStorage?.referral_program_status || 'active';
  const isWaitlisted = programStatus === 'waitlisted';

  // Simulated early adopter count (in production this would come from the server)
  const earlyAdopterRemaining = 7842;

  const ensureCode = useCallback(async (): Promise<string | null> => {
    if (referralCode) return referralCode;
    setGeneratingCode(true);
    const code = await generateReferralCode();
    setGeneratingCode(false);
    return code;
  }, [referralCode, generateReferralCode]);

  const handleCopyCode = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('कोड कॉपी हुआ!', `${code}\nCode copied!`);
  }, [ensureCode]);

  const handleShareGeneric = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const message = `आँगन ऐप से जुड़ें! मेरा रेफरल कोड: ${code}\nJoin Aangan! My referral code: ${code}\nhttps://aangan.app/invite/${code}`;
    try {
      await Share.share({ message });
    } catch {}
  }, [ensureCode]);

  const handleShareWhatsApp = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const message = encodeURIComponent(
      `आँगन ऐप से जुड़ें! मेरा रेफरल कोड: ${code}\nJoin Aangan! My referral code: ${code}\nhttps://aangan.app/invite/${code}`,
    );
    const url = `whatsapp://send?text=${message}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp नहीं मिला', 'WhatsApp not installed on this device.');
    }
  }, [ensureCode]);

  const handleShareSMS = useCallback(async () => {
    const code = await ensureCode();
    if (!code) return;
    const body = encodeURIComponent(
      `आँगन ऐप से जुड़ें! मेरा रेफरल कोड: ${code} https://aangan.app/invite/${code}`,
    );
    const url = `sms:?body=${body}`;
    await Linking.openURL(url);
  }, [ensureCode]);

  if (isLoading && !userStorage) {
    return <LoadingScreen messageHindi="लोड हो रहा है..." message="Loading..." />;
  }

  const verifiedReferrals = referrals.filter((r) => r.status === 'verified');
  const pendingReferrals = referrals.filter((r) => r.status === 'pending');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.haldiGold} />
      }
    >
      {/* Waitlist Banner */}
      {isWaitlisted && (
        <View style={styles.waitlistBanner}>
          <Text style={styles.waitlistIcon}>{'⏳'}</Text>
          <View style={styles.waitlistTextWrap}>
            <Text style={styles.waitlistTitle}>
              आप वेटलिस्ट में हैं
            </Text>
            <Text style={styles.waitlistSubtitle}>You are on the waitlist</Text>
            <Text style={styles.waitlistStatus}>
              स्थिति: #{userStorage?.user_id?.slice(0, 6) || '---'}
            </Text>
          </View>
        </View>
      )}

      {/* Early Adopter Counter */}
      <View style={styles.earlyAdopterCard}>
        <Text style={styles.earlyAdopterIcon}>{'🚀'}</Text>
        <Text style={styles.earlyAdopterCount}>
          {earlyAdopterRemaining.toLocaleString('en-IN')} / {EARLY_ADOPTER_TOTAL.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.earlyAdopterLabel}>स्लॉट शेष / slots remaining</Text>
        <View style={styles.earlyAdopterBar}>
          <View
            style={[
              styles.earlyAdopterFill,
              { width: `${((EARLY_ADOPTER_TOTAL - earlyAdopterRemaining) / EARLY_ADOPTER_TOTAL) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>कैसे काम करता है?</Text>
        <Text style={styles.sectionSubtitle}>How It Works</Text>
        <View style={styles.stepsRow}>
          {STEPS.map((step, idx) => (
            <StepCard key={idx} step={step} index={idx} />
          ))}
        </View>
      </View>

      {/* Referral Code */}
      {!isWaitlisted && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>आपका रेफरल कोड</Text>
          <Text style={styles.sectionSubtitle}>Your Referral Code</Text>

          {referralCode ? (
            <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
              <Text style={styles.codeText}>{referralCode}</Text>
              <Text style={styles.copyIcon}>{'📋'}</Text>
            </TouchableOpacity>
          ) : (
            <GoldButton
              title="Generate Code"
              titleHindi="कोड बनाएं"
              onPress={handleCopyCode}
              loading={generatingCode}
            />
          )}

          {/* Share Buttons: WhatsApp, SMS, Copy */}
          <View style={styles.shareButtonsRow}>
            <TouchableOpacity style={[styles.shareBtn, styles.shareBtnWhatsApp]} onPress={handleShareWhatsApp}>
              <Text style={styles.shareBtnIcon}>{'💬'}</Text>
              <Text style={styles.shareBtnLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareBtn, styles.shareBtnSMS]} onPress={handleShareSMS}>
              <Text style={styles.shareBtnIcon}>{'✉️'}</Text>
              <Text style={styles.shareBtnLabel}>SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareBtn, styles.shareBtnCopy]} onPress={handleCopyCode}>
              <Text style={styles.shareBtnIcon}>{'📋'}</Text>
              <Text style={styles.shareBtnLabel}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Generic share */}
          <GoldButton
            title="Share"
            titleHindi="शेयर करें"
            onPress={handleShareGeneric}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      )}

      {/* Tier Progress */}
      <View style={styles.section}>
        <TierProgressSection currentTier={currentTier} verifiedCount={verifiedCount} />
      </View>

      {/* Tier Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>स्टोरेज टियर</Text>
        <Text style={styles.sectionSubtitle}>Storage Tiers</Text>
        <View style={styles.tierCardsRow}>
          {TIER_ORDER.map((tier) => (
            <TierCard key={tier} tier={tier} isCurrent={tier === currentTier} />
          ))}
        </View>
      </View>

      {/* Referral List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>आपके रेफरल</Text>
        <Text style={styles.sectionSubtitle}>
          Your Referrals ({verifiedReferrals.length} verified, {pendingReferrals.length} pending)
        </Text>

        {referrals.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{'🤝'}</Text>
            <Text style={styles.emptyText}>अभी तक कोई रेफरल नहीं</Text>
            <Text style={styles.emptySubtext}>No referrals yet</Text>
          </View>
        ) : (
          referrals.map((r) => <ReferralItem key={r.id} referral={r} />)
        )}
      </View>

      {/* Anti-abuse Rules */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>नियम</Text>
        <Text style={styles.sectionSubtitle}>Rules</Text>
        <View style={styles.rulesCard}>
          <RuleItem
            text={`एक दिन में अधिकतम ${REFERRAL_LIMITS.maxInvitesPerDay} रेफरल भेज सकते हैं`}
            textEn={`Max ${REFERRAL_LIMITS.maxInvitesPerDay} invites per day`}
          />
          <RuleItem
            text={`रेफरल को ${REFERRAL_LIMITS.verificationDays} दिन तक ऐप इस्तेमाल करना होगा`}
            textEn={`Referred user must use app for ${REFERRAL_LIMITS.verificationDays} days`}
          />
          <RuleItem
            text="डुप्लिकेट या फ़ेक अकाउंट अस्वीकृत होंगे"
            textEn="Duplicate/fake accounts will be rejected"
          />
          <RuleItem
            text={`प्रति यूज़र अधिकतम ${REFERRAL_LIMITS.maxReferralsPerUser} रेफरल`}
            textEn={`Max ${REFERRAL_LIMITS.maxReferralsPerUser} referrals per user`}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  screenContent: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.huge,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: 2,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginBottom: Spacing.md,
  },

  // Waitlist banner
  waitlistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    borderWidth: 1.5,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  waitlistIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  waitlistTextWrap: {
    flex: 1,
  },
  waitlistTitle: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 16,
  },
  waitlistSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 1,
  },
  waitlistStatus: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },

  // Early adopter counter
  earlyAdopterCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.haldiGold + '40',
    ...Shadow.sm,
  },
  earlyAdopterIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  earlyAdopterCount: {
    ...Typography.h2,
    color: Colors.haldiGold,
    fontWeight: '700',
  },
  earlyAdopterLabel: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  earlyAdopterBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  earlyAdopterFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.haldiGold,
  },

  // Steps
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stepCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  stepNumber: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.haldiGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  stepIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepTitle: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 14,
    textAlign: 'center',
  },
  stepTitleEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 11,
    textAlign: 'center',
  },
  stepDesc: {
    ...Typography.caption,
    color: Colors.gray600,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // Code box
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  codeText: {
    ...Typography.h2,
    color: Colors.haldiGold,
    letterSpacing: 3,
  },
  copyIcon: {
    fontSize: 28,
  },

  // Share buttons
  shareButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  shareBtn: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  shareBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  shareBtnSMS: {
    backgroundColor: Colors.info,
  },
  shareBtnCopy: {
    backgroundColor: Colors.brown,
  },
  shareBtnIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  shareBtnLabel: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    fontSize: 12,
  },

  // Tier progress
  progressSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadow.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },
  progressTierBox: {
    alignItems: 'center',
  },
  progressTierCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderColor: Colors.gray300,
  },
  progressTierIcon: {
    fontSize: 26,
  },
  progressTierLabel: {
    ...Typography.label,
    fontSize: 14,
  },
  progressArrow: {
    marginHorizontal: Spacing.xl,
  },
  progressArrowText: {
    fontSize: 28,
    color: Colors.gray400,
  },
  progressBarBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.md,
  },
  progressBarLabel: {
    ...Typography.bodySmall,
    color: Colors.brown,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.gray200,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  progressMaxText: {
    ...Typography.body,
    color: Colors.haldiGold,
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  // Tier cards
  tierCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tierCardItem: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadow.sm,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderTopRightRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  tierCardIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tierCardName: {
    ...Typography.label,
    fontSize: 16,
  },
  tierCardNameEn: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 1,
  },
  tierCardGb: {
    ...Typography.h3,
    color: Colors.brown,
    marginTop: Spacing.sm,
  },
  tierCardReferrals: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },

  // Referral list
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  referralAvatarText: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 14,
  },
  referralInfo: {
    flex: 1,
  },
  referralCode: {
    ...Typography.body,
    color: Colors.brown,
    fontSize: 14,
  },
  referralDate: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 2,
  },
  referralStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  referralStatusText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.brown,
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.xs,
  },

  // Rules
  rulesCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ruleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  ruleBullet: {
    ...Typography.body,
    color: Colors.haldiGold,
    marginRight: Spacing.sm,
    fontSize: 18,
  },
  ruleContent: {
    flex: 1,
  },
  ruleText: {
    ...Typography.body,
    color: Colors.brown,
    fontSize: 14,
  },
  ruleTextEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 12,
    marginTop: 1,
  },
});
