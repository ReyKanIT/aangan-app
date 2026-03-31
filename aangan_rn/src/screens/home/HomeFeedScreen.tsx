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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { usePostStore } from '../../stores/postStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import { getUpcomingFestivals, formatFestivalDate, Festival } from '../../assets/data/festivals';
import type { Post } from '../../types/database';

type Props = NativeStackScreenProps<any, 'HomeFeed'>;

// -- Panchang static data --
const PANCHANG_DATA = {
  vikramSamvat: 2083,
  maas: 'चैत्र',
  tithi: 'शुक्ल षष्ठी',
  paksha: 'शुक्ल पक्ष',
  nakshatra: 'पुनर्वसु',
  yoga: 'शोभन',
  sunrise: '06:12',
  sunset: '18:34',
};

// -- Sub-components --

function PanchangWidget() {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = React.useRef(new Animated.Value(0)).current;

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
    outputRange: [0, 180],
  });

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
          <Text style={panchangStyles.headerIcon}>{'🗓️'}</Text>
          <View>
            <Text style={panchangStyles.headerTitle}>
              {'आज का पंचांग'}
            </Text>
            <Text style={panchangStyles.headerSubtitle}>
              {'विक्रम संवत '}{PANCHANG_DATA.vikramSamvat}{' | '}{PANCHANG_DATA.maas}
            </Text>
          </View>
        </View>
        <Text style={panchangStyles.chevron}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      <Animated.View style={[panchangStyles.body, { height: expandedHeight, overflow: 'hidden' }]}>
        <View style={panchangStyles.grid}>
          <PanchangRow label="तिथि" value={PANCHANG_DATA.tithi} />
          <PanchangRow label="पक्ष" value={PANCHANG_DATA.paksha} />
          <PanchangRow label="नक्षत्र" value={PANCHANG_DATA.nakshatra} />
          <PanchangRow label="योग" value={PANCHANG_DATA.yoga} />
          <PanchangRow label="सूर्योदय" value={PANCHANG_DATA.sunrise} />
          <PanchangRow label="सूर्यास्त" value={PANCHANG_DATA.sunset} />
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

// -- Main Component --

export default function HomeFeedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { posts, isLoading, hasMore, error, fetchPosts, refreshPosts, likePost } = usePostStore();
  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPosts();
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

  const handleNavigateComposer = useCallback(() => {
    navigation.navigate('PostComposer');
  }, [navigation]);

  const renderHeader = useCallback(() => (
    <View>
      <PanchangWidget />
      <FestivalBanner />
    </View>
  ), []);

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

const panchangStyles = StyleSheet.create({
  container: {
    margin: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  headerTitle: {
    ...Typography.label,
    color: Colors.brown,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },
  chevron: {
    fontSize: 14,
    color: Colors.brownLight,
    marginLeft: Spacing.sm,
  },
  body: {
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    width: '50%',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  rowLabel: {
    ...Typography.caption,
    color: Colors.brownMuted,
  },
  rowValue: {
    ...Typography.body,
    color: Colors.brown,
    marginTop: 2,
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
