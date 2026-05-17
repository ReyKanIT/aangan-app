import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { usePostStore } from '../../stores/postStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { useLanguageStore } from '../../stores/languageStore';
import { getUpcomingFestivals, formatFestivalDate, Festival } from '../../assets/data/festivals';
import StoriesRow from '../../components/common/StoriesRow';
import * as Location from 'expo-location';
import { getPanchang, moonPhaseEmoji, yogaDescription, DELHI, type PanchangData, type PanchangLocation } from '../../services/panchangService';
import type { Post } from '../../types/database';

type Props = NativeStackScreenProps<any, 'HomeFeed'>;

const GUIDED_FLOW_DISMISSED_KEY = 'guided_flow_dismissed';

// -- Panchang location cache --
let cachedLocation: PanchangLocation | null = null;

async function getDeviceLocation(): Promise<PanchangLocation> {
  if (cachedLocation) return cachedLocation;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DELHI;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    cachedLocation = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      utcOffset: new Date().getTimezoneOffset() / -60,
    };
    return cachedLocation;
  } catch {
    return DELHI;
  }
}

// -- Onboarding progress type --
interface OnboardingProgress {
  added_parent: boolean;
  added_sibling: boolean;
  made_first_post: boolean;
}

// -- Sub-components --

interface GuidedFlowStep {
  key: keyof OnboardingProgress;
  emoji: string;
  label: string;
  labelEn: string;
  action: () => void;
}

interface GuidedFlowBannerProps {
  progress: OnboardingProgress;
  onDismiss: () => void;
  navigation: Props['navigation'];
  isHindi: boolean;
}

function GuidedFlowBanner({ progress, onDismiss, navigation, isHindi }: GuidedFlowBannerProps) {
  const steps: GuidedFlowStep[] = [
    {
      key: 'added_parent',
      emoji: '👨‍👩',
      label: 'माँ-पिता जोड़ें',
      labelEn: 'Add Parents',
      action: () => navigation.navigate('FamilyTree'),
    },
    {
      key: 'added_sibling',
      emoji: '👫',
      label: 'भाई-बहन जोड़ें',
      labelEn: 'Add Siblings',
      action: () => navigation.navigate('FamilyTree'),
    },
    {
      key: 'made_first_post',
      emoji: '📝',
      label: 'पहली पोस्ट करें',
      labelEn: 'Make First Post',
      action: () => navigation.navigate('PostComposer'),
    },
  ];

  const doneCount = steps.filter((s) => progress[s.key]).length;
  const allDone = doneCount === steps.length;

  if (allDone) return null;

  return (
    <View style={guidedFlowStyles.card}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={guidedFlowStyles.dismissButton}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss getting started guide"
      >
        <Text style={guidedFlowStyles.dismissText}>{'✕'}</Text>
      </TouchableOpacity>

      {/* Title */}
      <Text style={guidedFlowStyles.title}>{isHindi ? 'परिवार से शुरुआत करें 🌟' : 'Get Started with Family 🌟'}</Text>
      <Text style={guidedFlowStyles.subtitle}>{isHindi ? 'Getting Started' : 'Complete these steps'}</Text>

      {/* Steps */}
      {steps.map((step) => {
        const isDone = progress[step.key];
        return (
          <View key={step.key} style={guidedFlowStyles.stepRow}>
            <Text style={guidedFlowStyles.stepCheck}>
              {isDone ? '✅' : '○'}
            </Text>
            <Text
              style={[
                guidedFlowStyles.stepText,
                isDone && guidedFlowStyles.stepTextDone,
              ]}
            >
              {step.emoji}{'  '}{isHindi ? step.label : step.labelEn}
            </Text>
            {!isDone && (
              <TouchableOpacity
                style={guidedFlowStyles.stepButton}
                onPress={step.action}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${step.labelEn}`}
              >
                <Text style={guidedFlowStyles.stepButtonText}>{isHindi ? 'शुरू करें →' : 'Start →'}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Progress */}
      <Text style={guidedFlowStyles.progressText}>
        {doneCount}{'/'}{steps.length}{isHindi ? ' पूरे हुए' : ' completed'}
      </Text>
    </View>
  );
}

// v0.15.10 — Facebook-style "What's on your mind?" composer card.
// Sits between PanchangWidget and the first post. Tap → opens PostComposer.
// Avatar circle on left, prompt text in middle, quick-action chips on right.
function ComposerPrompt({
  avatarUrl,
  onPress,
  isHindi,
}: {
  avatarUrl: string | null;
  onPress: () => void;
  isHindi: boolean;
}) {
  return (
    <TouchableOpacity
      style={composerStyles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isHindi ? 'पोस्ट लिखें' : 'Compose a post'}
    >
      <View style={composerStyles.row}>
        <View style={composerStyles.avatarRing}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={composerStyles.avatar} />
          ) : (
            <View style={[composerStyles.avatar, composerStyles.avatarFallback]}>
              <Text style={composerStyles.avatarFallbackText}>{'+'}</Text>
            </View>
          )}
        </View>
        <Text style={composerStyles.prompt} numberOfLines={1}>
          {'अपने मन की बात लिखें…'}
        </Text>
      </View>
      <View style={composerStyles.actionsRow}>
        <View style={composerStyles.action}>
          <Text style={composerStyles.actionEmoji}>{'📷'}</Text>
          <Text style={composerStyles.actionLabel}>{'फ़ोटो'}</Text>
        </View>
        <View style={composerStyles.actionDivider} />
        <View style={composerStyles.action}>
          <Text style={composerStyles.actionEmoji}>{'🎥'}</Text>
          <Text style={composerStyles.actionLabel}>{'वीडियो'}</Text>
        </View>
        <View style={composerStyles.actionDivider} />
        <View style={composerStyles.action}>
          <Text style={composerStyles.actionEmoji}>{'🎤'}</Text>
          <Text style={composerStyles.actionLabel}>{'आवाज़'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PanchangWidget() {
  const [expanded, setExpanded] = useState(false);
  const [panchang, setPanchang] = useState<PanchangData>(() => getPanchang(new Date(), DELHI));
  const animatedHeight = React.useRef(new Animated.Value(0)).current;

  // Load accurate Panchang using device GPS on mount
  useEffect(() => {
    let mounted = true;
    getDeviceLocation().then((loc) => {
      if (!mounted) return;
      setPanchang(getPanchang(new Date(), loc));
    });
    return () => { mounted = false; };
  }, []);

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animatedHeight]);

  const expandedHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const phaseEmoji = moonPhaseEmoji(panchang.moonPhasePercent);
  const yogaDesc = yogaDescription(panchang.yoga);
  const yogaColor = yogaDesc === 'शुभ' ? Colors.mehndiGreen : yogaDesc === 'अशुभ' ? Colors.error : Colors.brownLight;

  // v0.15.8 — show English date + tithi together in collapsed header
  // (Kumar's feedback: home page lacked date+tithi pairing).
  // Format: "17 May 2026, Sunday"
  const today = new Date();
  const englishDate = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const englishWeekday = today.toLocaleDateString('en-IN', { weekday: 'long' });
  // Heuristic for "special today" — पूर्णिमा / अमावस्या / एकादशी are the
  // tithis most users care about.
  const isSpecialTithi =
    panchang.tithi.includes('पूर्णिमा') ||
    panchang.tithi.includes('अमावस्या') ||
    panchang.tithi.includes('एकादशी');

  // v0.16.1 — "What's special today" surface (Kumar bug 2026-05-17 04:45 UTC:
  // "Home page... date hat is special about today neither any notifications.")
  // Combines today's festival from the catalogue with special-tithi info into
  // one prominent banner ribbon under the date/tithi line. If neither applies,
  // we drop a soft "आज का सामान्य पंचांग" line so the visual rhythm holds.
  const specialToday = useMemo(() => {
    const upcoming = getUpcomingFestivals(0); // 0 = only today
    const todayKey = today.toISOString().slice(0, 10);
    const todayFestival = upcoming.find((f) => f.date === todayKey);
    if (todayFestival) {
      return {
        icon: todayFestival.icon,
        line: `${todayFestival.nameHindi} आज है — शुभकामनाएँ!`,
        accent: todayFestival.color,
      };
    }
    if (isSpecialTithi) {
      const which = panchang.tithi.includes('पूर्णिमा')
        ? 'पूर्णिमा — चंद्र दर्शन का दिन'
        : panchang.tithi.includes('अमावस्या')
        ? 'अमावस्या — पूर्वजों को याद करने का दिन'
        : 'एकादशी — व्रत और संयम का दिन';
      return { icon: '✨', line: `आज ${which}`, accent: Colors.haldiGold };
    }
    return null;
  }, [panchang.tithi, isSpecialTithi]);

  return (
    <View style={panchangStyles.container}>
      <TouchableOpacity
        style={panchangStyles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Toggle Panchang details"
        accessibilityHint={expanded ? 'Collapse calendar details' : 'Expand calendar details'}
      >
        <View style={panchangStyles.headerLeft}>
          <Text style={panchangStyles.headerIcon}>{phaseEmoji}</Text>
          <View style={{ flex: 1 }}>
            {/* Top line: English date + tithi (the big visible info) */}
            <Text style={[
              panchangStyles.headerTitle,
              isSpecialTithi && { color: Colors.haldiGold },
            ]}>
              {englishDate}{' • '}{panchang.tithi}
              {isSpecialTithi ? ' ✨' : ''}
            </Text>
            {/* Subtitle: weekday + Vikram Samvat */}
            <Text style={panchangStyles.headerSubtitle}>
              {englishWeekday}{' | '}{'विक्रम संवत '}{panchang.vikramSamvat}{' '}{panchang.maas}
            </Text>
          </View>
        </View>
        <Text style={panchangStyles.chevron}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* "What's special today" ribbon — v0.16.1 */}
      {specialToday && (
        <View style={[panchangStyles.specialRibbon, { backgroundColor: specialToday.accent + '18', borderColor: specialToday.accent + '40' }]}>
          <Text style={panchangStyles.specialIcon}>{specialToday.icon}</Text>
          <Text style={[panchangStyles.specialText, { color: Colors.brown }]} numberOfLines={2}>
            {specialToday.line}
          </Text>
        </View>
      )}

      <Animated.View style={[panchangStyles.body, { height: expandedHeight, overflow: 'hidden' }]}>
        <View style={panchangStyles.grid}>
          <PanchangRow label="तिथि" value={panchang.tithi} />
          <PanchangRow label="पक्ष" value={panchang.paksha} />
          <PanchangRow label="नक्षत्र" value={panchang.nakshatra} />
          <PanchangRow label="वार" value={panchang.vara} />
          <PanchangRow label="सूर्योदय" value={panchang.sunrise} />
          <PanchangRow label="सूर्यास्त" value={panchang.sunset} />
          <View style={[panchangStyles.row, { width: '100%' }]}>
            <Text style={panchangStyles.rowLabel}>{'योग'}</Text>
            <Text style={[panchangStyles.rowValue, { color: yogaColor }]}>
              {panchang.yoga}
              {'  '}
              <Text style={[panchangStyles.yogaBadge, { color: yogaColor }]}>{'(' + yogaDesc + ')'}</Text>
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function PanchangRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={panchangStyles.row}>
      <Text style={panchangStyles.rowLabel}>{label}</Text>
      <Text style={panchangStyles.rowValue}>{value}</Text>
    </View>
  );
}

function FestivalCard({ item }: { item: Festival }) {
  return (
    <View style={[festivalStyles.card, { backgroundColor: item.color + '18' }]}>
      <Text style={festivalStyles.icon}>{item.icon}</Text>
      <Text style={festivalStyles.name} numberOfLines={1}>
        {item.nameHindi}
      </Text>
      <Text style={festivalStyles.date}>{formatFestivalDate(item.date)}</Text>
    </View>
  );
}

function FestivalBanner() {
  const festivals = useMemo(() => getUpcomingFestivals(30), []);

  if (festivals.length === 0) return null;

  return (
    <View style={festivalStyles.container}>
      <Text style={festivalStyles.sectionTitle}>{'आगामी त्यौहार'}</Text>
      <FlatList
        data={festivals}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FestivalCard item={item} />}
        contentContainerStyle={festivalStyles.list}
      />
    </View>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: (id: string) => void }) {
  const timeAgo = useMemo(() => getTimeAgo(post.created_at), [post.created_at]);

  return (
    <View style={postCardStyles.container}>
      <View style={postCardStyles.header}>
        <View style={postCardStyles.avatar}>
          {post.author?.profile_photo_url ? (
            <Image
              source={{ uri: post.author.profile_photo_url }}
              style={postCardStyles.avatarPhoto}
            />
          ) : (
            <View style={postCardStyles.avatarImage}>
              <Text style={postCardStyles.avatarText}>
                {(post.author?.display_name_hindi || post.author?.display_name || '?')[0]}
              </Text>
            </View>
          )}
        </View>
        <View style={postCardStyles.headerInfo}>
          <Text style={postCardStyles.authorName} numberOfLines={1}>
            {post.author?.display_name_hindi || post.author?.display_name || 'Unknown'}
          </Text>
          <Text style={postCardStyles.timeText}>{timeAgo}</Text>
        </View>
        {post.audience_type !== 'all' && (
          <View style={postCardStyles.audienceBadge}>
            <Text style={postCardStyles.audienceBadgeText}>
              {post.audience_type === 'level'
                ? `L${post.audience_level || ''}`
                : 'Custom'}
            </Text>
          </View>
        )}
      </View>

      {post.content ? (
        <Text style={postCardStyles.content}>{post.content}</Text>
      ) : null}

      {post.media_urls && post.media_urls.length > 0 && (
        <View style={postCardStyles.mediaContainer}>
          <View style={postCardStyles.mediaPlaceholder}>
            <Text style={postCardStyles.mediaPlaceholderText}>
              {'📷 '}{post.media_urls.length}{' photo(s)'}
            </Text>
          </View>
        </View>
      )}

      <View style={postCardStyles.actions}>
        <TouchableOpacity
          style={postCardStyles.actionButton}
          onPress={() => onLike(post.id)}
          accessibilityRole="button"
          accessibilityLabel={post.is_liked ? 'Unlike post' : 'Like post'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={postCardStyles.actionIcon}>
            {post.is_liked ? '❤️' : '🤍'}
          </Text>
          <Text style={postCardStyles.actionText}>
            {post.like_count > 0 ? post.like_count : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={postCardStyles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Comment"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={postCardStyles.actionIcon}>{'💬'}</Text>
          <Text style={postCardStyles.actionText}>
            {post.comment_count > 0 ? post.comment_count : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyFeed() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{'📭'}</Text>
      <Text style={emptyStyles.title}>{'अभी कोई पोस्ट नहीं है'}</Text>
      <Text style={emptyStyles.subtitle}>{'No posts yet'}</Text>
      <Text style={emptyStyles.hint}>
        {'नया पोस्ट बनाने के लिए + दबाएं'}
      </Text>
    </View>
  );
}

// -- Helpers --

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'अभी';
  if (diffMin < 60) return `${diffMin} मिनट पहले`;
  if (diffHr < 24) return `${diffHr} घंटे पहले`;
  if (diffDay < 7) return `${diffDay} दिन पहले`;
  return date.toLocaleDateString('hi-IN');
}

async function fetchOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  try {
    // Import supabase client lazily to avoid circular deps at module level
    const { supabase } = await import('../../config/supabase');
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('added_parent, added_sibling, made_first_post')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { added_parent: false, added_sibling: false, made_first_post: false };
    }

    return {
      added_parent: Boolean(data.added_parent),
      added_sibling: Boolean(data.added_sibling),
      made_first_post: Boolean(data.made_first_post),
    };
  } catch {
    return { added_parent: false, added_sibling: false, made_first_post: false };
  }
}

// -- Main Component --

export default function HomeFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { posts, isLoading, hasMore, error, fetchPosts, refreshPosts, likePost } = usePostStore();
  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();
  const { isHindi, loadLanguage } = useLanguageStore();

  // Guided flow state
  const [guidedFlowDismissed, setGuidedFlowDismissed] = useState(true); // start hidden, reveal after async check
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress>({
    added_parent: false,
    added_sibling: false,
    made_first_post: false,
  });

  useEffect(() => {
    fetchPosts();
    loadGuidedFlow();
    loadLanguage();
  }, []);

  const loadGuidedFlow = useCallback(async () => {
    try {
      const dismissed = await AsyncStorage.getItem(GUIDED_FLOW_DISMISSED_KEY);
      if (dismissed === 'true') {
        setGuidedFlowDismissed(true);
        return;
      }
      setGuidedFlowDismissed(false);

      if (user?.id) {
        const progress = await fetchOnboardingProgress(user.id);
        setOnboardingProgress(progress);

        // If all steps done, auto-dismiss permanently
        if (progress.added_parent && progress.added_sibling && progress.made_first_post) {
          await AsyncStorage.setItem(GUIDED_FLOW_DISMISSED_KEY, 'true');
          setGuidedFlowDismissed(true);
        }
      }
    } catch {
      // Silently fail — guided flow is non-critical
      setGuidedFlowDismissed(true);
    }
  }, [user]);

  const handleDismissGuidedFlow = useCallback(async () => {
    try {
      await AsyncStorage.setItem(GUIDED_FLOW_DISMISSED_KEY, 'true');
    } catch {
      // Ignore
    }
    setGuidedFlowDismissed(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refreshPosts();
  }, [refreshPosts]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchPosts();
    }
  }, [isLoading, hasMore, fetchPosts]);

  const handleLike = useCallback((postId: string) => {
    likePost(postId);
  }, [likePost]);

  const handleNavigateNotifications = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleNavigateDashboard = useCallback(() => {
    navigation.navigate('Dashboard');
  }, [navigation]);

  // v0.15.7: Messages were reachable only via Member Profile → Chat. Add a
  // header-icon shortcut so users can jump to the inbox (MessageList) from
  // anywhere on the home feed. Sits between dashboard + bell.
  const handleNavigateMessages = useCallback(() => {
    navigation.navigate('MessageList');
  }, [navigation]);

  const handleNavigateComposer = useCallback(() => {
    navigation.navigate('PostComposer');
  }, [navigation]);

  const renderHeader = useCallback(() => (
    <View>
      <StoriesRow isHindi={isHindi} />
      {!guidedFlowDismissed && (
        <View style={styles.guidedFlowWrapper}>
          <GuidedFlowBanner
            progress={onboardingProgress}
            onDismiss={handleDismissGuidedFlow}
            navigation={navigation}
            isHindi={isHindi}
          />
        </View>
      )}
      <PanchangWidget />
      <FestivalBanner />
      {/* v0.15.10 — Facebook-style "What's on your mind?" composer card */}
      <ComposerPrompt
        avatarUrl={user?.profile_photo_url ?? null}
        onPress={handleNavigateComposer}
        isHindi={isHindi}
      />
    </View>
  ), [guidedFlowDismissed, onboardingProgress, handleDismissGuidedFlow, navigation, isHindi, user?.profile_photo_url, handleNavigateComposer]);

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onLike={handleLike} />
  ), [handleLike]);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.haldiGold} />
      </View>
    );
  }, [isLoading]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.haldiGold} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Aangan</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={handleNavigateDashboard}
              accessibilityRole="button"
              accessibilityLabel="Open dashboard"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dashboardIcon}>{'\uD83D\uDCCA'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNavigateMessages}
              accessibilityRole="button"
              accessibilityLabel="Messages"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.bellIcon}>{'💬'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNavigateNotifications}
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.bellIcon}>{'🔔'}</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>{'पुनः प्रयास करें'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? <EmptyFeed /> : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && posts.length === 0}
            onRefresh={handleRefresh}
            colors={[Colors.haldiGold]}
            tintColor={Colors.haldiGold}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          posts.length === 0 && !isLoading && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + Spacing.xl }]}
        onPress={handleNavigateComposer}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Create new post"
      >
        <Text style={styles.fabText}>{'+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// -- Styles --

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  headerBar: {
    backgroundColor: Colors.haldiGold,
    ...Shadow.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.white,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dashboardButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardIcon: {
    fontSize: 22,
  },
  notificationButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.round,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: Colors.error + '15',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    flex: 1,
  },
  retryText: {
    ...Typography.label,
    color: Colors.error,
    marginLeft: Spacing.md,
  },
  guidedFlowWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  listContent: {
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
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
  fabText: {
    fontSize: 32,
    color: Colors.white,
    lineHeight: 34,
    fontWeight: '300',
  },
});

const guidedFlowStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderLeftWidth: 4,
    borderLeftColor: Colors.haldiGold,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Shadow.sm,
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dismissText: {
    fontSize: 18,
    color: Colors.gray500,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brown,
    marginBottom: 2,
    paddingRight: DADI_MIN_TAP_TARGET,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.brownLight,
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  stepCheck: {
    fontSize: 24,
    marginRight: Spacing.sm,
    width: 30,
    textAlign: 'center',
  },
  stepText: {
    fontSize: 16,
    color: Colors.brown,
    flex: 1,
  },
  stepTextDone: {
    color: Colors.gray400,
    textDecorationLine: 'line-through',
  },
  stepButton: {
    backgroundColor: Colors.haldiGold,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepButtonText: {
    ...Typography.labelSmall,
    color: Colors.white,
    fontWeight: '600',
  },
  progressText: {
    ...Typography.caption,
    color: Colors.haldiGoldDark,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
});

// v0.15.10 — ComposerPrompt styles (Facebook-style "What's on your mind?")
const composerStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    shadowColor: '#3A2A12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F2EAD3',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#F3E5B5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    backgroundColor: '#FAF5E3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { fontSize: 18, color: '#9C7E2E', fontWeight: '700' },
  prompt: {
    fontSize: 15,
    color: '#85714A',
    flex: 1,
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5EFDE',
    paddingTop: 8,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 13, color: '#5C3D1E', fontWeight: '600' },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#F5EFDE',
  },
});

const panchangStyles = StyleSheet.create({
  // v0.15.9 polish — premium spacing + typography hierarchy.
  // Reference: Cred / Scapia card design language.
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    // Layered shadow — deeper than the old Shadow.sm preset
    shadowColor: '#3A2A12',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F2EAD3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 28,           // bigger moon emoji
    marginRight: 14,
  },
  // v0.15.9: primary line — English date + tithi, bigger + tighter
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2A12',
    letterSpacing: 0.1,
  },
  // v0.15.9: subtitle — weekday + Vikram Samvat
  headerSubtitle: {
    fontSize: 12,
    color: '#85714A',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  chevron: {
    fontSize: 14,
    color: '#A89373',
    marginLeft: Spacing.sm,
  },
  // v0.16.1 — "What's special today" ribbon under the date/tithi line
  specialRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  specialIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  specialText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5EFDE',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 12,
  },
  row: {
    width: '50%',
    paddingVertical: 10,
    paddingRight: Spacing.sm,
  },
  rowLabel: {
    fontSize: 11,
    color: '#A89373',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 15,
    color: '#3A2A12',
    marginTop: 4,
    fontWeight: '600',
  },
  yogaBadge: {
    ...Typography.caption,
    fontWeight: '600',
  },
});

const festivalStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.brown,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    width: 120,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.labelSmall,
    color: Colors.brown,
    textAlign: 'center',
  },
  date: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },
});

const postCardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    marginRight: Spacing.md,
  },
  avatarPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
    fontSize: 18,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    ...Typography.label,
    color: Colors.brown,
  },
  timeText: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 2,
  },
  audienceBadge: {
    backgroundColor: Colors.mehndiGreen + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  audienceBadgeText: {
    ...Typography.caption,
    color: Colors.mehndiGreen,
    fontWeight: '600',
  },
  content: {
    ...Typography.body,
    color: Colors.brown,
    marginBottom: Spacing.md,
  },
  mediaContainer: {
    marginBottom: Spacing.md,
  },
  mediaPlaceholder: {
    height: 180,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPlaceholderText: {
    ...Typography.body,
    color: Colors.gray500,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.xl,
    minHeight: DADI_MIN_TAP_TARGET,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.xs,
  },
  actionText: {
    ...Typography.bodySmall,
    color: Colors.gray600,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.huge,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    color: Colors.brown,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  hint: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    textAlign: 'center',
  },
});
