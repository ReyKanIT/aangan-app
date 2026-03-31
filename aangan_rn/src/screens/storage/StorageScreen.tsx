import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { STORAGE_TIERS, STORAGE_ADDONS } from '../../config/constants';
import { useStorageStore } from '../../stores/storageStore';
import GoldButton from '../../components/common/GoldButton';
import LoadingScreen from '../../components/common/LoadingScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RING_SIZE = 160;
const RING_STROKE = 14;

// --- Circular Progress Ring ---
function CircularProgress({
  percent,
  usedGb,
  totalGb,
}: {
  percent: number;
  usedGb: number;
  totalGb: number;
}) {
  const animValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const ringColor =
    percent > 90 ? Colors.error : percent > 70 ? Colors.warning : Colors.mehndiGreen;

  // Simple ring approximation using border
  const rotation = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.ringContainer}>
      {/* Background ring */}
      <View style={[styles.ringBg, { borderColor: Colors.gray200 }]} />
      {/* Progress ring (visual approximation) */}
      <View
        style={[
          styles.ringBg,
          {
            borderColor: ringColor,
            borderRightColor: 'transparent',
            borderBottomColor: percent > 50 ? ringColor : 'transparent',
            borderLeftColor: percent > 75 ? ringColor : 'transparent',
            transform: [{ rotateZ: '-45deg' }],
          },
        ]}
      />
      {/* Center text */}
      <View style={styles.ringCenter}>
        <Text style={[styles.ringPercent, { color: ringColor }]}>
          {Math.round(percent)}%
        </Text>
        <Text style={styles.ringUsed}>
          {usedGb.toFixed(1)} / {totalGb} GB
        </Text>
        <Text style={styles.ringLabel}>उपयोग / Used</Text>
      </View>
    </View>
  );
}

// --- Breakdown Bar ---
function BreakdownBar({
  label,
  labelEn,
  usedGb,
  totalGb,
  color,
}: {
  label: string;
  labelEn: string;
  usedGb: number;
  totalGb: number;
  color: string;
}) {
  const percent = totalGb > 0 ? (usedGb / totalGb) * 100 : 0;

  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabel}>
        <View style={[styles.breakdownDot, { backgroundColor: color }]} />
        <View>
          <Text style={styles.breakdownText}>{label}</Text>
          <Text style={styles.breakdownTextEn}>{labelEn}</Text>
        </View>
      </View>
      <Text style={styles.breakdownGb}>{usedGb.toFixed(2)} GB</Text>
      <View style={styles.breakdownBarBg}>
        <View
          style={[
            styles.breakdownBarFill,
            { width: `${Math.min(percent, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// --- Tier Badge ---
function TierBadge({ tier }: { tier: string }) {
  const tierLabels: Record<string, { hi: string; en: string; color: string }> = {
    base: { hi: 'मूल', en: 'Base', color: Colors.gray500 },
    bronze: { hi: 'कांस्य', en: 'Bronze', color: '#CD7F32' },
    silver: { hi: 'रजत', en: 'Silver', color: '#A0A0A0' },
    gold: { hi: 'सोना', en: 'Gold', color: Colors.haldiGold },
  };
  const t = tierLabels[tier] || tierLabels.base;

  return (
    <View style={[styles.tierBadge, { backgroundColor: t.color + '20', borderColor: t.color }]}>
      <Text style={[styles.tierBadgeText, { color: t.color }]}>
        {t.hi} ({t.en})
      </Text>
    </View>
  );
}

// --- Paid Plans Modal ---
function PaidPlansModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const { purchaseStorage } = useStorageStore();

  const addons = STORAGE_ADDONS.individual;

  const handlePurchase = async (addon: (typeof addons)[number]) => {
    const price = billingCycle === 'monthly' ? addon.monthly : addon.annual;
    Alert.alert(
      'पुष्टि करें',
      `${addon.gb} GB — ₹${price}/${billingCycle === 'monthly' ? 'महीना' : 'वर्ष'}`,
      [
        { text: 'रद्द', style: 'cancel' },
        {
          text: 'खरीदें',
          onPress: async () => {
            await purchaseStorage('individual', addon.gb, billingCycle, price);
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>स्टोरेज बढ़ाएं</Text>
          <Text style={styles.modalSubtitle}>Upgrade Storage</Text>

          {/* Billing toggle */}
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'monthly' && styles.billingOptionActive,
              ]}
              onPress={() => setBillingCycle('monthly')}
            >
              <Text
                style={[
                  styles.billingText,
                  billingCycle === 'monthly' && styles.billingTextActive,
                ]}
              >
                मासिक / Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                billingCycle === 'annual' && styles.billingOptionActive,
              ]}
              onPress={() => setBillingCycle('annual')}
            >
              <Text
                style={[
                  styles.billingText,
                  billingCycle === 'annual' && styles.billingTextActive,
                ]}
              >
                वार्षिक / Annual
              </Text>
              <Text style={styles.saveBadge}>20% बचत</Text>
            </TouchableOpacity>
          </View>

          {/* Add-on cards */}
          {addons.map((addon) => {
            const price = billingCycle === 'monthly' ? addon.monthly : addon.annual;
            return (
              <TouchableOpacity
                key={addon.gb}
                style={styles.addonCard}
                onPress={() => handlePurchase(addon)}
                activeOpacity={0.7}
              >
                <View style={styles.addonLeft}>
                  <Text style={styles.addonGb}>{addon.gb} GB</Text>
                  <Text style={styles.addonPeriod}>
                    {billingCycle === 'monthly' ? 'प्रति माह' : 'प्रति वर्ष'}
                  </Text>
                </View>
                <Text style={styles.addonPrice}>₹{price}</Text>
              </TouchableOpacity>
            );
          })}

          <GoldButton
            title="Close"
            titleHindi="बंद करें"
            onPress={onClose}
            variant="secondary"
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    </Modal>
  );
}

// --- Main Screen ---
export default function StorageScreen() {
  const {
    userStorage,
    pool,
    referrals,
    isLoading,
    fetchStorage,
    fetchReferrals,
    fetchPool,
    getUsageBreakdown,
  } = useStorageStore();

  const [plansVisible, setPlansVisible] = useState(false);

  useEffect(() => {
    fetchStorage();
    fetchReferrals();
  }, []);

  useEffect(() => {
    if (userStorage?.pool_id) {
      fetchPool();
    }
  }, [userStorage?.pool_id]);

  const breakdown = getUsageBreakdown();
  const totalGb = breakdown.totalGb;
  const usedGb = breakdown.usedGb;
  const usedPercent = breakdown.usedPercent;

  const tierProgress = useStorageStore.getState().userStorage;
  const currentTier = tierProgress?.storage_tier || 'base';
  const verifiedCount = tierProgress?.verified_referral_count || 0;

  const nextTierMap: Record<string, { name: string; need: number }> = {
    base: { name: 'कांस्य (Bronze)', need: STORAGE_TIERS.bronze.referrals },
    bronze: { name: 'रजत (Silver)', need: STORAGE_TIERS.silver.referrals },
    silver: { name: 'सोना (Gold)', need: STORAGE_TIERS.gold.referrals },
    gold: { name: '', need: 0 },
  };
  const nextInfo = nextTierMap[currentTier];

  const referralCode = userStorage?.referral_code || '';
  const isActive = userStorage?.referral_program_status === 'active';
  const isWaitlisted = userStorage?.referral_program_status === 'waitlisted';

  const handleCopyCode = useCallback(async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('कोड कॉपी हुआ!', referralCode);
    }
  }, [referralCode]);

  const handleShare = useCallback(
    async (method: 'whatsapp' | 'sms' | 'copy') => {
      const message = `आँगन ऐप से जुड़ें! मेरा रेफरल कोड: ${referralCode}\nhttps://aangan.app/invite/${referralCode}`;

      if (method === 'copy') {
        await Clipboard.setStringAsync(message);
        Alert.alert('लिंक कॉपी हुआ!');
        return;
      }

      try {
        await Share.share({ message });
      } catch {}
    },
    [referralCode],
  );

  if (isLoading && !userStorage) {
    return <LoadingScreen messageHindi="स्टोरेज लोड हो रहा है..." message="Loading storage..." />;
  }

  // Breakdown values in GB
  const usedBytes = userStorage?.used_storage_bytes || 0;
  const postsGb = (usedBytes * 0.4) / (1024 * 1024 * 1024);
  const eventsGb = (usedBytes * 0.45) / (1024 * 1024 * 1024);
  const profileGb = (usedBytes * 0.15) / (1024 * 1024 * 1024);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {/* Storage Usage Ring */}
      <View style={styles.section}>
        <CircularProgress percent={usedPercent} usedGb={usedGb} totalGb={totalGb} />
      </View>

      {/* Breakdown Bars */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>उपयोग विवरण</Text>
        <Text style={styles.sectionSubtitle}>Usage Breakdown</Text>
        <BreakdownBar
          label="पोस्ट"
          labelEn="Posts"
          usedGb={postsGb}
          totalGb={totalGb}
          color={Colors.haldiGold}
        />
        <BreakdownBar
          label="इवेंट फ़ोटो"
          labelEn="Event Photos"
          usedGb={eventsGb}
          totalGb={totalGb}
          color={Colors.mehndiGreen}
        />
        <BreakdownBar
          label="प्रोफ़ाइल"
          labelEn="Profile"
          usedGb={profileGb}
          totalGb={totalGb}
          color={Colors.info}
        />
      </View>

      {/* Current Tier */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>वर्तमान टियर</Text>
        <Text style={styles.sectionSubtitle}>Current Tier</Text>
        <TierBadge tier={currentTier} />
        {nextInfo.name !== '' && (
          <View style={styles.tierProgressBox}>
            <Text style={styles.tierProgressText}>
              अगला: {nextInfo.name} — {verifiedCount}/{nextInfo.need} रेफरल
            </Text>
            <View style={styles.tierProgressBar}>
              <View
                style={[
                  styles.tierProgressFill,
                  {
                    width: `${Math.min(
                      (verifiedCount / nextInfo.need) * 100,
                      100,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Referral Section (if active) */}
      {isActive && referralCode !== '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>रेफरल कोड</Text>
          <Text style={styles.sectionSubtitle}>Referral Code</Text>

          {/* Code display + copy */}
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{referralCode}</Text>
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>

          {/* Share buttons */}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
              onPress={() => handleShare('whatsapp')}
            >
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: Colors.info }]}
              onPress={() => handleShare('sms')}
            >
              <Text style={styles.shareBtnText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: Colors.gray600 }]}
              onPress={() => handleShare('copy')}
            >
              <Text style={styles.shareBtnText}>लिंक कॉपी</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <Text style={styles.referralProgress}>
            {verifiedCount}/{nextInfo.need} रेफरल {nextInfo.name} के लिए
          </Text>

          {/* Early adopter slots */}
          <View style={styles.slotsBox}>
            <Text style={styles.slotsText}>
              🎯 7,842 / 10,000 अर्ली एडॉप्टर स्लॉट शेष
            </Text>
          </View>
        </View>
      )}

      {/* Waitlist banner */}
      {isWaitlisted && (
        <View style={styles.waitlistBanner}>
          <Text style={styles.waitlistText}>
            आप वेटलिस्ट में हैं — स्थिति: #{useStorageStore.getState().userStorage?.id?.slice(-4) || '??'}
          </Text>
          <Text style={styles.waitlistSubtext}>
            You are on the waitlist
          </Text>
        </View>
      )}

      {/* Upgrade Button */}
      <View style={styles.section}>
        <GoldButton
          title="Upgrade Storage"
          titleHindi="स्टोरेज बढ़ाएं"
          onPress={() => setPlansVisible(true)}
        />
      </View>

      {/* Family Pool */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>परिवार पूल</Text>
        <Text style={styles.sectionSubtitle}>Family Pool</Text>

        {pool ? (
          <View style={styles.poolCard}>
            <Text style={styles.poolName}>{pool.pool_name}</Text>
            <Text style={styles.poolUsage}>
              {(pool.used_storage_bytes / (1024 * 1024 * 1024)).toFixed(1)} /{' '}
              {pool.total_storage_gb} GB उपयोग
            </Text>
            <Text style={styles.poolMembers}>
              {pool.member_ids.length} सदस्य
            </Text>
          </View>
        ) : (
          <GoldButton
            title="Create Family Pool"
            titleHindi="परिवार पूल बनाएं"
            onPress={() => {
              Alert.prompt
                ? Alert.prompt('पूल नाम', 'Pool name दर्ज करें', (name) => {
                    if (name) useStorageStore.getState().createPool(name);
                  })
                : Alert.alert('परिवार पूल', 'जल्द उपलब्ध होगा');
            }}
            variant="secondary"
          />
        )}
      </View>

      {/* Paid Plans Modal */}
      <PaidPlansModal visible={plansVisible} onClose={() => setPlansVisible(false)} />
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

  // Ring
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringBg: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringPercent: {
    ...Typography.h1,
    fontSize: 32,
    fontWeight: '700',
  },
  ringUsed: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: 2,
  },
  ringLabel: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 1,
  },

  // Breakdown
  breakdownRow: {
    marginBottom: Spacing.md,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  breakdownText: {
    ...Typography.body,
    color: Colors.brown,
    fontSize: 15,
  },
  breakdownTextEn: {
    ...Typography.caption,
    color: Colors.brownLight,
    fontSize: 12,
  },
  breakdownGb: {
    ...Typography.labelSmall,
    color: Colors.brownLight,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  breakdownBarBg: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // Tier
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  tierBadgeText: {
    ...Typography.label,
    fontSize: 15,
  },
  tierProgressBox: {
    marginTop: Spacing.sm,
  },
  tierProgressText: {
    ...Typography.bodySmall,
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  tierProgressBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: 8,
    backgroundColor: Colors.haldiGold,
    borderRadius: 4,
  },

  // Referral code
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  codeText: {
    ...Typography.h3,
    color: Colors.haldiGold,
    letterSpacing: 2,
  },
  copyIcon: {
    fontSize: 22,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  shareBtn: {
    flex: 1,
    height: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  shareBtnText: {
    ...Typography.buttonSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  referralProgress: {
    ...Typography.bodySmall,
    color: Colors.mehndiGreen,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slotsBox: {
    backgroundColor: Colors.haldiGold + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  slotsText: {
    ...Typography.bodySmall,
    color: Colors.haldiGoldDark,
    fontWeight: '600',
  },

  // Waitlist
  waitlistBanner: {
    backgroundColor: Colors.warning + '20',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  waitlistText: {
    ...Typography.label,
    color: Colors.brown,
  },
  waitlistSubtext: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: Spacing.xs,
  },

  // Pool
  poolCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  poolName: {
    ...Typography.label,
    color: Colors.brown,
    marginBottom: Spacing.xs,
  },
  poolUsage: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  poolMembers: {
    ...Typography.caption,
    color: Colors.mehndiGreen,
    marginTop: Spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.huge,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.brown,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginBottom: Spacing.xl,
  },
  billingOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  billingOptionActive: {
    backgroundColor: Colors.haldiGold,
  },
  billingText: {
    ...Typography.labelSmall,
    color: Colors.brownLight,
  },
  billingTextActive: {
    color: Colors.white,
  },
  saveBadge: {
    ...Typography.caption,
    color: Colors.mehndiGreen,
    fontSize: 10,
    marginTop: 2,
  },
  addonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  addonLeft: {},
  addonGb: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 18,
  },
  addonPeriod: {
    ...Typography.caption,
    color: Colors.brownLight,
  },
  addonPrice: {
    ...Typography.h3,
    color: Colors.haldiGold,
  },
});
