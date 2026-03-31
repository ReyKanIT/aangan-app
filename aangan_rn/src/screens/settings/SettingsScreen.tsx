import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Image,
  Animated,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useLanguageStore } from '../../stores/languageStore';
import { useStorageStore } from '../../stores/storageStore';

type Props = NativeStackScreenProps<any, 'Settings'>;

// App version
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

// Notification preference keys
const NOTIFICATION_TYPES = [
  { key: 'new_post', labelHi: 'नई पोस्ट', labelEn: 'New Post', icon: '📝' },
  { key: 'event_invite', labelHi: 'इवेंट निमंत्रण', labelEn: 'Event Invite', icon: '🎉' },
  { key: 'rsvp_update', labelHi: 'RSVP अपडेट', labelEn: 'RSVP Update', icon: '📋' },
  { key: 'new_family_member', labelHi: 'नया सदस्य', labelEn: 'New Family Member', icon: '👨‍👩‍👧‍👦' },
  { key: 'photo_approved', labelHi: 'फ़ोटो स्वीकृत', labelEn: 'Photo Approved', icon: '📸' },
] as const;

const PRIVACY_OPTIONS = [
  { value: 'all', labelHi: 'सभी परिवार', labelEn: 'All Family' },
  { value: 'level_1_2', labelHi: 'Level 1-2 only', labelEn: 'Level 1-2 only' },
] as const;

// -- Circular Progress Ring --

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

  return (
    <View style={ringStyles.wrapper}>
      <View style={ringStyles.container}>
        <View style={[ringStyles.bg, { borderColor: Colors.gray200 }]} />
        <View
          style={[
            ringStyles.progress,
            {
              borderColor: ringColor,
              borderTopColor: 'transparent',
              transform: [{ rotate: `${(percent / 100) * 360}deg` }],
            },
          ]}
        />
        <View style={ringStyles.center}>
          <Text style={ringStyles.percentText}>
            {Math.round(percent)}{'%'}
          </Text>
          <Text style={ringStyles.gbText}>{usedGb.toFixed(1)}{' / '}{totalGb}{' GB'}</Text>
        </View>
      </View>
    </View>
  );
}

// -- Section Header --

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={sectionStyles.header}>{title}</Text>
  );
}

// -- Main Component --

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { language, isHindi, toggleLanguage, loadLanguage } = useLanguageStore();
  const { userStorage, isLoading: storageLoading, fetchStorage, getUsageBreakdown } = useStorageStore();

  // Local notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    new_post: true,
    event_invite: true,
    rsvp_update: true,
    new_family_member: true,
    photo_approved: true,
  });

  // Privacy: who can see profile
  const [profileVisibility, setProfileVisibility] = useState<'all' | 'level_1_2'>('all');

  useEffect(() => {
    loadLanguage();
    fetchStorage();
  }, []);

  const usage = getUsageBreakdown();

  const toggleNotif = useCallback((key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      isHindi ? 'लॉगआउट' : 'Logout',
      isHindi ? 'क्या आप लॉगआउट करना चाहते हैं?' : 'Are you sure you want to logout?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'लॉगआउट करें' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
          },
        },
      ],
    );
  }, [isHindi, signOut, navigation]);

  const handleReferral = useCallback(async () => {
    const referralCode = userStorage?.referral_code || 'AANGAN';
    try {
      await Share.share({
        message: `Aangan (\u0906\u0901\u0917\u0928) \u0910\u092A \u092A\u0930 \u0905\u092A\u0928\u093E \u092A\u0930\u093F\u0935\u093E\u0930 \u091C\u094B\u0921\u093C\u0947\u0902! \u092E\u0947\u0930\u093E \u0930\u0947\u092B\u0930\u0932 \u0915\u094B\u0921: ${referralCode}\nhttps://aangan.app/invite/${referralCode}`,
      });
    } catch {
      // User cancelled share
    }
  }, [userStorage]);

  const handleHelp = useCallback(() => {
    Linking.openURL('mailto:support@aangan.app');
  }, []);

  // Avatar initials fallback
  const displayName = user?.display_name_hindi || user?.display_name || '';
  const initials = user?.display_name
    ? user.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isHindi ? '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938' : 'Settings'}
          </Text>
          <View style={styles.backButton} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.huge }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Card */}
        <View style={[styles.card, Shadow.md]}>
          <View style={styles.profileRow}>
            {user?.profile_photo_url ? (
              <Image source={{ uri: user.profile_photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName || (isHindi ? '\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E' : 'User')}
              </Text>
              <Text style={styles.profilePhone} numberOfLines={1}>
                {user?.phone_number ?? ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ProfileSetup', { editMode: true })}
              accessibilityRole="button"
              accessibilityLabel={isHindi ? 'Edit profile' : 'Edit profile'}
            >
              <Text style={styles.editButtonText}>
                {isHindi ? '\u0938\u0902\u092A\u093E\u0926\u0928' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Language Toggle */}
        <SectionHeader title={isHindi ? '\u092D\u093E\u0937\u093E (Language)' : 'Language (\u092D\u093E\u0937\u093E)'} />
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.langLabel, language === 'hi' && styles.activeLangText]}>
              {'\u0939\u093F\u0902\u0926\u0940'}
            </Text>
            <Switch
              value={language === 'en'}
              onValueChange={toggleLanguage}
              trackColor={{ false: Colors.haldiGold, true: Colors.mehndiGreen }}
              thumbColor={Colors.white}
              style={{ marginHorizontal: Spacing.md }}
              accessibilityLabel="Language toggle"
            />
            <Text style={[styles.langLabel, language === 'en' && styles.activeLangText]}>
              English
            </Text>
          </View>
        </View>

        {/* 3. Notification Preferences */}
        <SectionHeader title={isHindi ? '\u0938\u0942\u091A\u0928\u093E \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915\u0924\u093E\u090F\u0902 (Notifications)' : 'Notifications'} />
        <View style={[styles.card, Shadow.sm]}>
          {NOTIFICATION_TYPES.map((n, index) => (
            <View key={n.key}>
              <View style={styles.notifRow}>
                <Text style={styles.notifIcon}>{n.icon}</Text>
                <View style={styles.notifTextContainer}>
                  <Text style={styles.notifLabel}>
                    {isHindi ? n.labelHi : n.labelEn}
                  </Text>
                  <Text style={styles.notifSubLabel}>
                    {isHindi ? n.labelEn : n.labelHi}
                  </Text>
                </View>
                <Switch
                  value={notifPrefs[n.key]}
                  onValueChange={() => toggleNotif(n.key)}
                  trackColor={{ false: Colors.gray300, true: Colors.mehndiGreen }}
                  thumbColor={Colors.white}
                  accessibilityLabel={`${n.labelEn} notifications toggle`}
                />
              </View>
              {index < NOTIFICATION_TYPES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* 4. Privacy */}
        <SectionHeader title={isHindi ? '\u0917\u094B\u092A\u0928\u0940\u092F\u0924\u093E (Privacy)' : 'Privacy'} />
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.privacyLabel}>
            {isHindi ? '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0915\u094C\u0928 \u0926\u0947\u0916 \u0938\u0915\u0924\u093E \u0939\u0948?' : 'Who can see your profile?'}
          </Text>
          <View style={styles.pickerRow}>
            {PRIVACY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.pickerOption,
                  profileVisibility === opt.value && styles.pickerOptionActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setProfileVisibility(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: profileVisibility === opt.value }}
                accessibilityLabel={opt.labelEn}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    profileVisibility === opt.value && styles.pickerOptionTextActive,
                  ]}
                >
                  {isHindi ? opt.labelHi : opt.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 5. Storage */}
        <SectionHeader title={isHindi ? '\u0938\u094D\u091F\u094B\u0930\u0947\u091C (Storage)' : 'Storage'} />
        <View style={[styles.card, Shadow.sm]}>
          {storageLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.haldiGold} />
            </View>
          ) : (
            <>
              <CircularProgress
                percent={usage.usedPercent}
                usedGb={usage.usedGb}
                totalGb={usage.totalGb}
              />

              <View style={styles.storageBreakdown}>
                <View style={styles.storageRow}>
                  <Text style={styles.storageLabel}>
                    {isHindi ? '\u092C\u0947\u0938 \u0938\u094D\u091F\u094B\u0930\u0947\u091C' : 'Base Storage'}
                  </Text>
                  <Text style={styles.storageValue}>{usage.baseGb}{' GB'}</Text>
                </View>
                <View style={styles.storageRow}>
                  <Text style={styles.storageLabel}>
                    {isHindi ? '\u0930\u0947\u092B\u0930\u0932 \u092C\u094B\u0928\u0938' : 'Referral Bonus'}
                  </Text>
                  <Text style={styles.storageValue}>{usage.referralBonusGb}{' GB'}</Text>
                </View>
                <View style={styles.storageRow}>
                  <Text style={styles.storageLabel}>
                    {isHindi ? '\u0916\u0930\u0940\u0926\u093E \u0917\u092F\u093E' : 'Purchased'}
                  </Text>
                  <Text style={styles.storageValue}>{usage.purchasedGb}{' GB'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upgradeButton}
                activeOpacity={0.7}
                onPress={() => Alert.alert(
                  isHindi ? '\u091C\u0932\u094D\u0926 \u0906 \u0930\u0939\u093E \u0939\u0948' : 'Coming Soon',
                  isHindi ? '\u0938\u094D\u091F\u094B\u0930\u0947\u091C \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u091C\u0932\u094D\u0926 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u094B\u0917\u093E' : 'Storage upgrade coming soon',
                )}
                accessibilityRole="button"
                accessibilityLabel="Upgrade storage"
              >
                <Text style={styles.upgradeButtonText}>
                  {isHindi ? '\u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902 (Upgrade)' : 'Upgrade Storage'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 6. Referral */}
        <View style={[styles.card, Shadow.sm]}>
          <TouchableOpacity
            style={styles.referralButton}
            activeOpacity={0.7}
            onPress={handleReferral}
            accessibilityRole="button"
            accessibilityLabel="Invite friends"
          >
            <Text style={styles.referralIcon}>{'🎁'}</Text>
            <View style={styles.referralTextContainer}>
              <Text style={styles.referralTitle}>
                {isHindi ? '\u0926\u094B\u0938\u094D\u0924\u094B\u0902 \u0915\u094B \u091C\u094B\u0921\u093C\u0947\u0902' : 'Refer Friends'}
              </Text>
              <Text style={styles.referralSubtitle}>
                {isHindi ? 'Invite friends & earn storage' : '\u0926\u094B\u0938\u094D\u0924\u094B\u0902 \u0915\u094B \u092C\u0941\u0932\u093E\u090F\u0902 \u0914\u0930 \u0938\u094D\u091F\u094B\u0930\u0947\u091C \u092A\u093E\u090F\u0902'}
              </Text>
            </View>
            <Text style={styles.referralChevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* 7. Help & Support */}
        <SectionHeader title={isHindi ? '\u0938\u0939\u093E\u092F\u0924\u093E (Help)' : 'Help & Support'} />
        <View style={[styles.card, Shadow.sm]}>
          <TouchableOpacity
            style={styles.helpRow}
            activeOpacity={0.7}
            onPress={handleHelp}
            accessibilityRole="button"
            accessibilityLabel="Help and support"
          >
            <Text style={styles.helpIcon}>{'❓'}</Text>
            <Text style={styles.helpText}>
              {isHindi ? '\u0938\u0939\u093E\u092F\u0924\u093E \u090F\u0935\u0902 \u0938\u092E\u0930\u094D\u0925\u0928' : 'Help & Support'}
            </Text>
            <Text style={styles.helpChevron}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* 8. Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.7}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text style={styles.logoutText}>
            {isHindi ? '\u0932\u0949\u0917\u0906\u0909\u091F \u0915\u0930\u0947\u0902' : 'Logout'}
          </Text>
        </TouchableOpacity>

        {/* 9. App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{'Aangan v'}{APP_VERSION}{' ('}{BUILD_NUMBER}{')'}</Text>
          <Text style={styles.versionSubtext}>{'Made with \u2764\uFE0F in India'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: Colors.brown,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginHorizontal: Spacing.xs,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    backgroundColor: Colors.haldiGoldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...Typography.h2,
    color: Colors.haldiGoldDark,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    ...Typography.h3,
    color: Colors.brown,
  },
  profilePhone: {
    ...Typography.bodySmall,
    color: Colors.gray500,
    marginTop: 2,
  },
  editButton: {
    minHeight: DADI_MIN_TAP_TARGET,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.haldiGold,
  },
  editButtonText: {
    ...Typography.labelSmall,
    color: Colors.haldiGold,
  },

  // Language toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  langLabel: {
    ...Typography.body,
    color: Colors.brownLight,
  },
  activeLangText: {
    fontWeight: '700',
    color: Colors.brown,
  },

  // Notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    paddingVertical: Spacing.xs,
  },
  notifIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
    width: 30,
    textAlign: 'center',
  },
  notifTextContainer: {
    flex: 1,
  },
  notifLabel: {
    ...Typography.body,
    color: Colors.brown,
  },
  notifSubLabel: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 1,
  },

  // Privacy
  privacyLabel: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginBottom: Spacing.md,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickerOption: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  pickerOptionActive: {
    backgroundColor: Colors.haldiGold,
    borderColor: Colors.haldiGold,
  },
  pickerOptionText: {
    ...Typography.body,
    color: Colors.haldiGold,
  },
  pickerOptionTextActive: {
    color: Colors.white,
  },

  // Storage
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  storageBreakdown: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  storageLabel: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  storageValue: {
    ...Typography.bodySmall,
    color: Colors.brown,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: Colors.mehndiGreen,
    borderRadius: BorderRadius.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    ...Typography.button,
    color: Colors.white,
  },

  // Referral
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  referralIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  referralTextContainer: {
    flex: 1,
  },
  referralTitle: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
  },
  referralSubtitle: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 2,
  },
  referralChevron: {
    fontSize: 22,
    color: Colors.gray400,
  },

  // Help
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  helpIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  helpText: {
    ...Typography.body,
    color: Colors.mehndiGreen,
    flex: 1,
  },
  helpChevron: {
    fontSize: 22,
    color: Colors.gray400,
  },

  // Logout
  logoutButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  logoutText: {
    ...Typography.button,
    color: Colors.error,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.gray500,
    textAlign: 'center',
  },
  versionSubtext: {
    ...Typography.caption,
    color: Colors.gray400,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

// Ring styles
const RING_SIZE = 120;
const RING_STROKE = 10;

const ringStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bg: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  progress: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  center: {
    alignItems: 'center',
  },
  percentText: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.brown,
  },
  gbText: {
    ...Typography.caption,
    color: Colors.gray500,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    ...Typography.label,
    color: Colors.brownLight,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
});
