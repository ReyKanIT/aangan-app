import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';
import type { Post } from '../../types/database';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.lg * 2;

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'अभी';
  if (diffMins < 60) return `${diffMins} मिनट पहले`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} घंटे पहले`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} दिन पहले`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} सप्ताह पहले`;
}

function getAudienceBadge(post: Post): { label: string; color: string } {
  switch (post.audience_type) {
    case 'all':
      return { label: 'सभी', color: Colors.mehndiGreen };
    case 'level':
      return {
        label: `L${post.audience_level || 1}${post.audience_level_max ? `-${post.audience_level_max}` : ''}`,
        color: Colors.haldiGold,
      };
    case 'custom':
      return { label: 'चुनिंदा', color: Colors.info };
    default:
      return { label: 'सभी', color: Colors.mehndiGreen };
  }
}

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const badge = getAudienceBadge(post);
  const authorName =
    post.author?.display_name_hindi || post.author?.display_name || 'सदस्य';
  const authorInitial = authorName.charAt(0);

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  return (
    <View style={styles.card}>
      {/* Author Row */}
      <View style={styles.authorRow}>
        {post.author?.profile_photo_url ? (
          <Image
            source={{ uri: post.author.profile_photo_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{authorInitial}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
          <Text style={styles.timeText}>{timeAgo(post.created_at)}</Text>
        </View>
        <View style={[styles.audienceBadge, { backgroundColor: badge.color + '20' }]}>
          <Text style={[styles.audienceBadgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Content */}
      {post.content && (
        <Text style={styles.content}>{post.content}</Text>
      )}

      {/* Media Gallery */}
      {post.media_urls && post.media_urls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media_urls.length === 1 ? (
            <View style={styles.singleImageWrap}>
              {imageErrors.has(0) ? (
                <View style={[styles.singleImage, styles.imagePlaceholder]}>
                  <Text style={styles.placeholderText}>फ़ोटो</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: post.media_urls[0] }}
                  style={styles.singleImage}
                  resizeMode="cover"
                  onError={() => handleImageError(0)}
                />
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
            >
              {post.media_urls.map((url, index) => (
                <View key={index} style={styles.galleryImageWrap}>
                  {imageErrors.has(index) ? (
                    <View style={[styles.galleryImage, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderText}>फ़ोटो</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: url }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                      onError={() => handleImageError(index)}
                    />
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Text style={[styles.actionIcon, post.is_liked && styles.actionIconActive]}>
            {post.is_liked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>
            {post.like_count > 0 ? post.like_count : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>
            {post.comment_count > 0 ? post.comment_count : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
          <Text style={styles.actionIcon}>↗️</Text>
        </TouchableOpacity>

        {/* Read receipt */}
        {post.viewed_count !== undefined && post.audience_count !== undefined && (
          <View style={styles.readReceipt}>
            <Text style={styles.readReceiptText}>
              देखा: {post.viewed_count}/{post.audience_count}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.haldiGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...Typography.label,
    color: Colors.haldiGoldDark,
    fontSize: 18,
  },
  authorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  authorName: {
    ...Typography.label,
    color: Colors.brown,
    fontSize: 15,
  },
  timeText: {
    ...Typography.caption,
    color: Colors.gray500,
    marginTop: 1,
  },
  audienceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  audienceBadgeText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    ...Typography.body,
    color: Colors.brown,
    marginBottom: Spacing.md,
  },
  mediaContainer: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  singleImageWrap: {
    paddingHorizontal: Spacing.lg,
  },
  singleImage: {
    width: '100%',
    height: 250,
    borderRadius: BorderRadius.md,
  },
  imagePlaceholder: {
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...Typography.bodySmall,
    color: Colors.gray400,
  },
  gallery: {
    paddingLeft: Spacing.lg,
  },
  galleryImageWrap: {
    marginRight: Spacing.sm,
  },
  galleryImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingTop: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DADI_MIN_TAP_TARGET,
    paddingRight: Spacing.xl,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionIconActive: {
    color: Colors.error,
  },
  actionCount: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
    marginLeft: Spacing.xs,
  },
  readReceipt: {
    marginLeft: 'auto',
  },
  readReceiptText: {
    ...Typography.caption,
    color: Colors.gray500,
    fontSize: 12,
  },
});
