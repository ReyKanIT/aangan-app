import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../stores/authStore';
import { usePostStore } from '../../stores/postStore';
import type { User, Post } from '../../types/database';

// ─── Navigation types ─────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<
  any,
  'MemberProfile'
>;

interface RouteParams {
  memberId: string;
  relationshipLabel?: string;
  connectionLevel?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPostTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'अभी';
  if (diffMins < 60) return `${diffMins} मिनट पहले`;
  if (diffHours < 24) return `${diffHours} घंटे पहले`;
  if (diffDays < 7) return `${diffDays} दिन पहले`;
  return date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });
}

// ─── Mini Post Card ───────────────────────────────────────────────────────────
function MiniPostCard({
  post,
  onPress,
}: {
  post: Post;
  onPress: () => void;
}) {
  const hasMedia = post.media_urls && post.media_urls.length > 0;

  return (
    <TouchableOpacity
      style={postCardStyles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`पोस्ट देखें: ${post.content?.slice(0, 40) ?? 'मीडिया पोस्ट'}`}
    >
      <View style={postCardStyles.inner}>
        {/* Content */}
        {post.content ? (
          <Text style={postCardStyles.content} numberOfLines={3}>
            {post.content}
          </Text>
        ) : null}

        {/* Media thumbnail */}
        {hasMedia ? (
          <View style={postCardStyles.mediaThumbnailRow}>
            <Image
              source={{ uri: post.media_urls[0] }}
              style={postCardStyles.mediaThumbnail}
              resizeMode="cover"
              accessibilityLabel="पोस्ट की तस्वीर"
            />
            {post.media_urls.length > 1 && (
              <View style={postCardStyles.mediaCountBadge}>
                <Text style={postCardStyles.mediaCountText}>
                  +{post.media_urls.length - 1}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Footer: likes, comments, time */}
        <View style={postCardStyles.footer}>
          <View style={postCardStyles.statsRow}>
            <Text style={postCardStyles.statItem}>
              {'❤️ '}{post.like_count}
            </Text>
            <Text style={postCardStyles.statItem}>
              {'💬 '}{post.comment_count}
            </Text>
          </View>
          <Text style={postCardStyles.time}>{formatPostTime(post.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const postCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  inner: {
    padding: Spacing.md,
  },
  content: {
    ...Typography.body,
    color: Colors.brown,
    marginBottom: Spacing.sm,
  },
  mediaThumbnailRow: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  mediaThumbnail: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
  },
  mediaCountBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  mediaCountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statItem: {
    ...Typography.caption,
    color: Colors.gray500,
  },
  time: {
    ...Typography.caption,
    color: Colors.gray400,
    fontSize: 12,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MemberProfileScreen({ route, navigation }: Props) {
  const params = route.params as RouteParams;
  const { memberId, relationshipLabel, connectionLevel } = params;

  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);

  const [memberProfile, setMemberProfile] = useState<User | null>(null);
  const [memberPosts, setMemberPosts] = useState<Post[]>([]);
  const [familyCount, setFamilyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', memberId)
        .single();

      if (profileError) {
        setError('प्रोफ़ाइल लोड नहीं हो सकी। दोबारा कोशिश करें।');
        setLoading(false);
        return;
      }
      setMemberProfile(profileData as User);

      // Fetch public posts (audience_type = 'all'), limit 20
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', memberId)
        .eq('audience_type', 'all')
        .order('created_at', { ascending: false })
        .limit(20);

      setMemberPosts((postsData ?? []) as Post[]);

      // Fetch family member count for this user
      const { count } = await supabase
        .from('family_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', memberId);

      setFamilyCount(count ?? 0);
    } catch {
      setError('कुछ गलत हो गया। दोबारा कोशिश करें।');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMessagePress = useCallback(() => {
    if (!memberProfile) return;
    navigation.navigate('Chat', {
      otherUserId: memberId,
      otherUserName: memberProfile.display_name,
      otherUserNameHindi: memberProfile.display_name_hindi ?? undefined,
      otherUserPhoto: memberProfile.profile_photo_url ?? undefined,
    });
  }, [navigation, memberId, memberProfile]);

  const handlePostPress = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', { postId: post.id });
    },
    [navigation]
  );

  // ─── Derived display values ────────────────────────────────────────────────
  const displayName = memberProfile?.display_name_hindi || memberProfile?.display_name || '';
  const displayNameEn = memberProfile?.display_name || '';
  const initial = displayName[0] || displayNameEn[0] || '?';
  const levelLabel = connectionLevel ? `L${connectionLevel}` : null;
  const locationText =
    memberProfile?.village && memberProfile?.state
      ? `📍 ${memberProfile.village}, ${memberProfile.state}`
      : memberProfile?.village
      ? `📍 ${memberProfile.village}`
      : memberProfile?.state
      ? `📍 ${memberProfile.state}`
      : null;

  // ─── List header ──────────────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {/* Profile card */}
      <View style={styles.profileCard}>
        {/* Avatar */}
        {memberProfile?.profile_photo_url ? (
          <Image
            source={{ uri: memberProfile.profile_photo_url }}
            style={styles.avatar}
            resizeMode="cover"
            accessibilityLabel={`${displayName} की प्रोफ़ाइल फोटो`}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.displayNameHindi}>{displayName}</Text>
        {displayNameEn !== displayName && (
          <Text style={styles.displayNameEn}>{displayNameEn}</Text>
        )}

        {/* Badges row */}
        <View style={styles.badgesRow}>
          {relationshipLabel ? (
            <View style={styles.relationshipBadge}>
              <Text style={styles.relationshipBadgeText}>{relationshipLabel}</Text>
            </View>
          ) : null}
          {levelLabel ? (
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{levelLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Location */}
        {locationText ? (
          <Text style={styles.locationText}>{locationText}</Text>
        ) : null}

        {/* Family size */}
        <Text style={styles.familySizeText}>
          {'परिवार में '}
          <Text style={styles.familySizeCount}>{familyCount}</Text>
          {' सदस्य'}
        </Text>

        {/* Message button */}
        {currentUser?.id !== memberId ? (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleMessagePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="संदेश भेजें"
          >
            <Text style={styles.messageButtonText}>
              {'💬  संदेश भेजें — Message'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Posts section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>पोस्ट्स</Text>
        <Text style={styles.sectionCount}>{memberPosts.length}</Text>
      </View>
    </View>
  );

  // ─── Empty / Error / Loading states ──────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={styles.loadingText}>लोड हो रहा है…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
        <Text style={styles.errorEmoji}>😔</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>दोबारा कोशिश करें</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.screen, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="वापस जाएं"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{'प्रोफ़ाइल / Profile'}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Main list: header = profile card + posts section header */}
      <FlatList
        data={memberPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MiniPostCard post={item} onPress={() => handlePostPress(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyPostsEmoji}>📝</Text>
            <Text style={styles.emptyPostsText}>
              {'अभी तक कोई पोस्ट नहीं\nNo posts yet'}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  backButton: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 22,
    color: Colors.brown,
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: DADI_MIN_TAP_TARGET,
  },

  // Profile card
  profileCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    ...Shadow.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
    backgroundColor: Colors.gray200,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  displayNameHindi: {
    ...Typography.h2,
    textAlign: 'center',
    color: Colors.brown,
  },
  displayNameEn: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.brownLight,
    marginTop: 2,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  relationshipBadge: {
    borderWidth: 1.5,
    borderColor: Colors.haldiGold,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  relationshipBadgeText: {
    ...Typography.labelSmall,
    color: Colors.haldiGold,
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: Colors.haldiGoldLight,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  levelBadgeText: {
    ...Typography.labelSmall,
    color: Colors.haldiGoldDark,
    fontWeight: '700',
  },

  // Location & family
  locationText: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  familySizeText: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  familySizeCount: {
    fontWeight: '700',
    color: Colors.haldiGoldDark,
  },

  // Message button
  messageButton: {
    marginTop: Spacing.xl,
    width: '100%',
    height: DADI_MIN_BUTTON_HEIGHT,
    backgroundColor: Colors.mehndiGreen,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    ...Typography.button,
    fontSize: 16,
  },

  // Posts section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.brown,
  },
  sectionCount: {
    ...Typography.bodySmall,
    color: Colors.gray500,
    fontSize: 14,
  },

  // List
  listContent: {
    paddingBottom: Spacing.xxl,
  },

  // Empty posts
  emptyPosts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xxl,
  },
  emptyPostsEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyPostsText: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
  },

  // Loading / Error
  loadingText: {
    ...Typography.body,
    color: Colors.brownLight,
    marginTop: Spacing.md,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.brownLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  retryButton: {
    height: DADI_MIN_BUTTON_HEIGHT,
    paddingHorizontal: Spacing.xxl,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...Typography.button,
    fontSize: 16,
  },
});
