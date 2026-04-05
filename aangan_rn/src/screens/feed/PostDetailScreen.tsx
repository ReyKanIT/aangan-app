/**
 * PostDetailScreen — पोस्ट विवरण
 * Full post view: content, media, ❤️ like + 🙏 namaste reactions, comments.
 * Navigation params: { postId: string; postAuthorId: string }
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../../theme/colors';
import { Typography, DADI_MIN_BUTTON_HEIGHT, DADI_MIN_TAP_TARGET } from '../../theme/typography';
import { Spacing, BorderRadius, Shadow } from '../../theme/spacing';

import { useCommentStore } from '../../stores/commentStore';
import { usePostStore } from '../../stores/postStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { safeError } from '../../utils/security';
import FullScreenPhotoViewer from '../../components/common/FullScreenPhotoViewer';
import type { Post } from '../../types/database';
import type { PostComment } from '../../stores/commentStore';
import VoiceMicButton from '../../components/voice/VoiceMicButton';

// ─── Navigation ───────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<any, 'PostDetail'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_SINGLE_HEIGHT = 250;
const MEDIA_THUMB_SIZE = 200;
const AVATAR_SIZE = 40;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'अभी';
  if (diff < 3600) return `${Math.floor(diff / 60)} मिनट पहले`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} घंटे पहले`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} दिन पहले`;
  return new Date(dateStr).toLocaleDateString('hi-IN');
}

function getInitial(name: string): string {
  return (name ?? '?').trim().charAt(0).toUpperCase();
}

// ─── Author Avatar ────────────────────────────────────────────────────────────

interface AvatarProps {
  photoUrl: string | null | undefined;
  name: string;
  size?: number;
}

function Avatar({ photoUrl, name, size = AVATAR_SIZE }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showInitial = !photoUrl || failed;
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        showInitial && styles.avatarFallback,
      ]}
    >
      {showInitial ? (
        <Text style={[styles.avatarInitial, { fontSize: size * 0.42 }]}>
          {getInitial(name)}
        </Text>
      ) : (
        <Image
          source={{ uri: photoUrl! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

// ─── Post Body (inlined — no PostCard import to avoid circular deps) ──────────

interface PostBodyProps {
  post: Post;
  onImagePress: (index: number) => void;
}

function PostBody({ post, onImagePress }: PostBodyProps) {
  const authorName =
    post.author?.display_name_hindi || post.author?.display_name || 'अज्ञात';
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const singleImage = hasMedia && post.media_urls.length === 1;
  const multiImage = hasMedia && post.media_urls.length > 1;

  return (
    <View style={styles.postBody}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar
          photoUrl={post.author?.profile_photo_url}
          name={authorName}
          size={AVATAR_SIZE}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.authorMeta}>
            {post.author?.village ? `${post.author.village} · ` : ''}
            {timeAgo(post.created_at)}
          </Text>
        </View>
      </View>

      {/* Content text */}
      {!!post.content && (
        <Text style={styles.postContent}>{post.content}</Text>
      )}

      {/* Media — single image: full width */}
      {singleImage && (
        <TouchableOpacity
          onPress={() => onImagePress(0)}
          activeOpacity={0.92}
          style={styles.singleMediaWrapper}
          accessibilityLabel="फ़ोटो देखें"
        >
          <Image
            source={{ uri: post.media_urls[0] }}
            style={styles.singleMediaImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Media — multiple: horizontal scroll */}
      {multiImage && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaScrollContent}
          style={styles.mediaScroll}
        >
          {post.media_urls.map((url, idx) => (
            <TouchableOpacity
              key={`${idx}-${url}`}
              onPress={() => onImagePress(idx)}
              activeOpacity={0.88}
              style={styles.mediaThumbnailWrapper}
              accessibilityLabel={`फ़ोटो ${idx + 1}`}
            >
              <Image
                source={{ uri: url }}
                style={styles.mediaThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Reaction Button ──────────────────────────────────────────────────────────

interface ReactionButtonProps {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  activeColor: string;
  onPress: () => void;
  loading?: boolean;
}

function ReactionButton({
  emoji,
  label,
  count,
  active,
  activeColor,
  onPress,
  loading,
}: ReactionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[
        styles.reactionBtn,
        active && { borderColor: activeColor, backgroundColor: `${activeColor}18` },
      ]}
      accessibilityLabel={`${label} ${count}`}
      accessibilityRole="button"
    >
      <Text style={styles.reactionEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.reactionLabel,
          active && { color: activeColor, fontWeight: '600' },
        ]}
      >
        {count > 0 ? `${count}` : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment: PostComment;
  currentUserId: string;
  onDelete: (commentId: string) => void;
}

function CommentItem({ comment, currentUserId, onDelete }: CommentItemProps) {
  const isOwn = comment.author_id === currentUserId;
  const authorName =
    comment.author?.display_name_hindi ||
    comment.author?.display_name ||
    'अज्ञात';

  const handleDelete = () => {
    Alert.alert(
      'टिप्पणी हटाएं?',
      'क्या आप यह टिप्पणी हटाना चाहते हैं?',
      [
        { text: 'रद्द करें', style: 'cancel' },
        {
          text: 'हटाएं',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]
    );
  };

  return (
    <View style={styles.commentItem}>
      <Avatar
        photoUrl={comment.author?.profile_photo_url}
        name={authorName}
        size={36}
      />
      <View style={styles.commentBubble}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthorName}>{authorName}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
      {isOwn && (
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteCommentBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="टिप्पणी हटाएं"
        >
          <Text style={styles.deleteCommentIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId, postAuthorId } = route.params as {
    postId: string;
    postAuthorId: string;
  };

  const insets = useSafeAreaInsets();

  // ── Stores ──
  const posts = usePostStore((s) => s.posts);
  const likePost = usePostStore((s) => s.likePost);
  const deletePost = usePostStore((s) => s.deletePost);

  const { commentsByPost, loadingPosts, fetchComments, addComment, deleteComment } =
    useCommentStore();

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? '';

  // ── Local state ──
  const [post, setPost] = useState<Post | null>(
    posts.find((p) => p.id === postId) ?? null
  );
  const [postLoading, setPostLoading] = useState(!post);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Namaste reaction state
  const [isNamested, setIsNamested] = useState(false);
  const [namasteCount, setNamasteCount] = useState(post?.namaste_count ?? 0);
  const [namasteLoading, setNamasteLoading] = useState(false);

  // Like state — mirrors post store with local optimism
  const [isLiked, setIsLiked] = useState(post?.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(post?.like_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Photo viewer
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  const commentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Fetch post if not in store ──
  useEffect(() => {
    if (!post) {
      setPostLoading(true);
      supabase
        .from('posts')
        .select(
          '*, author:users!posts_author_id_fkey(id, display_name, display_name_hindi, profile_photo_url, village, state)'
        )
        .eq('id', postId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) setPost(data as Post);
          setPostLoading(false);
        });
    }
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep post in sync with store (e.g. after like)
  useEffect(() => {
    const storePost = posts.find((p) => p.id === postId);
    if (storePost) {
      setPost(storePost);
      setIsLiked(storePost.is_liked ?? false);
      setLikeCount(storePost.like_count ?? 0);
      setNamasteCount(storePost.namaste_count ?? 0);
    }
  }, [posts, postId]);

  // ── Check existing namaste reaction on mount ──
  useEffect(() => {
    if (!currentUserId) return;
    supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', currentUserId)
      .eq('reaction', 'namaste')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsNamested(true);
      });
  }, [postId, currentUserId]);

  // ── Fetch comments ──
  useEffect(() => {
    fetchComments(postId);
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const comments: PostComment[] = commentsByPost[postId] ?? [];
  const commentsLoading = loadingPosts.has(postId);

  // ── Like handler ──
  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    // Optimistic update
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => prev + (isLiked ? -1 : 1));
    await likePost(postId);
    setLikeLoading(false);
  }, [likeLoading, isLiked, likePost, postId]);

  // ── Namaste handler ──
  const handleNameste = useCallback(async () => {
    if (namasteLoading || !currentUserId) return;
    setNamasteLoading(true);

    // Optimistic update
    const nowNamested = !isNamested;
    setIsNamested(nowNamested);
    setNamasteCount((prev) => prev + (nowNamested ? 1 : -1));

    try {
      if (nowNamested) {
        const { error } = await supabase.from('post_reactions').insert({
          post_id: postId,
          user_id: currentUserId,
          reaction: 'namaste',
          created_at: new Date().toISOString(),
        });
        if (error) {
          // Revert
          setIsNamested(false);
          setNamasteCount((prev) => prev - 1);
        }
      } else {
        const { error } = await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .eq('reaction', 'namaste');
        if (error) {
          // Revert
          setIsNamested(true);
          setNamasteCount((prev) => prev + 1);
        }
      }
    } catch (_err) {
      // Revert on unexpected error
      setIsNamested(!nowNamested);
      setNamasteCount((prev) => prev + (nowNamested ? -1 : 1));
    } finally {
      setNamasteLoading(false);
    }
  }, [namasteLoading, isNamested, currentUserId, postId]);

  // ── Send comment ──
  const handleSendComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || sendingComment) return;
    setSendingComment(true);
    const success = await addComment(postId, text, postAuthorId);
    if (success) {
      setCommentText('');
      commentInputRef.current?.blur();
      // Scroll to bottom after a tick
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
    setSendingComment(false);
  }, [commentText, sendingComment, addComment, postId, postAuthorId]);

  // ── Delete comment ──
  const handleDeleteComment = useCallback(
    (commentId: string) => {
      deleteComment(commentId, postId);
    },
    [deleteComment, postId]
  );

  // ── Edit/Delete post menu ──
  const isAuthor = currentUserId === postAuthorId;

  const handlePostMenu = useCallback(() => {
    Alert.alert('पोस्ट विकल्प', undefined, [
      {
        text: 'संपादित करें',
        onPress: () =>
          navigation.navigate('PostComposer', { editPostId: postId }),
      },
      {
        text: 'हटाएं',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'पोस्ट हटाएं?',
            'यह पोस्ट स्थायी रूप से हट जाएगी।',
            [
              { text: 'रद्द करें', style: 'cancel' },
              {
                text: 'हटाएं',
                style: 'destructive',
                onPress: async () => {
                  const ok = await deletePost(postId);
                  if (ok) navigation.goBack();
                },
              },
            ]
          );
        },
      },
      { text: 'रद्द करें', style: 'cancel' },
    ]);
  }, [navigation, postId, deletePost]);

  // ── Photo viewer ──
  const handleImagePress = useCallback((index: number) => {
    setPhotoViewerIndex(index);
    setPhotoViewerVisible(true);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (postLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.haldiGold} />
        <Text style={styles.loadingText}>लोड हो रहा है…</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>पोस्ट नहीं मिली।</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnFallbackText}>वापस जाएं</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="वापस"
          accessibilityRole="button"
        >
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitleHindi}>पोस्ट</Text>
          <Text style={styles.headerTitleEn}>Post</Text>
        </View>

        {isAuthor ? (
          <TouchableOpacity
            onPress={handlePostMenu}
            style={styles.headerMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="पोस्ट विकल्प"
            accessibilityRole="button"
          >
            <Text style={styles.headerMenuIcon}>⋮</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerMenuPlaceholder} />
        )}
      </View>

      {/* ── Main scrollable content ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post content */}
          <View style={styles.card}>
            <PostBody post={post} onImagePress={handleImagePress} />

            {/* Reactions row */}
            <View style={styles.reactionsRow}>
              <ReactionButton
                emoji="❤️"
                label="पसंद"
                count={likeCount}
                active={isLiked}
                activeColor={Colors.error}
                onPress={handleLike}
                loading={likeLoading}
              />
              <ReactionButton
                emoji="🙏"
                label="नमस्ते"
                count={namasteCount}
                active={isNamested}
                activeColor={Colors.haldiGold}
                onPress={handleNameste}
                loading={namasteLoading}
              />
            </View>
          </View>

          {/* Comments section header */}
          <View style={styles.commentsSectionHeader}>
            <Text style={styles.commentsSectionTitle}>
              टिप्पणियाँ{comments.length > 0 ? ` (${comments.length})` : ''}
            </Text>
          </View>

          {/* Comments list */}
          {commentsLoading && comments.length === 0 ? (
            <View style={styles.commentsLoader}>
              <ActivityIndicator color={Colors.haldiGold} />
              <Text style={styles.commentsLoaderText}>टिप्पणियाँ लोड हो रही हैं…</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>
                अभी कोई टिप्पणी नहीं।{'\n'}पहले आप लिखें!
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteComment}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── Bottom comment input ── */}
        <View
          style={[
            styles.commentInputBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md },
          ]}
        >
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="टिप्पणी लिखें…"
            placeholderTextColor={Colors.gray500}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
            editable={!sendingComment}
          />
          <VoiceMicButton
            onTranscript={(text) => setCommentText(prev => prev + ' ' + text)}
            mode="append"
            size={24}
            disabled={sendingComment}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentText.trim() || sendingComment}
            style={[
              styles.sendBtn,
              (!commentText.trim() || sendingComment) && styles.sendBtnDisabled,
            ]}
            accessibilityLabel="टिप्पणी भेजें"
            accessibilityRole="button"
          >
            {sendingComment ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.sendBtnIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Full-screen photo viewer ── */}
      <FullScreenPhotoViewer
        visible={photoViewerVisible}
        images={post.media_urls ?? []}
        initialIndex={photoViewerIndex}
        onClose={() => setPhotoViewerVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // ── Loading / Error ──
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
  },
  backBtnFallback: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.haldiGold,
    borderRadius: BorderRadius.md,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnFallbackText: {
    ...Typography.button,
    color: Colors.white,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    ...Shadow.sm,
  },
  headerBack: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: {
    fontSize: 24,
    color: Colors.brown,
    lineHeight: 30,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleHindi: {
    ...Typography.h3,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.brown,
  },
  headerTitleEn: {
    ...Typography.labelSmall,
    color: Colors.brownLight,
    fontSize: 12,
    lineHeight: 16,
  },
  headerMenu: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuIcon: {
    fontSize: 26,
    color: Colors.brown,
    lineHeight: 32,
    fontWeight: '700',
  },
  headerMenuPlaceholder: {
    width: 48,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
    marginBottom: Spacing.lg,
  },

  // ── Post Body ──
  postBody: {
    paddingTop: Spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.brown,
  },
  authorMeta: {
    ...Typography.caption,
    color: Colors.brownLight,
    marginTop: 2,
  },

  // Avatar
  avatar: {
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: Colors.haldiGold,
  },
  avatarInitial: {
    color: Colors.white,
    fontWeight: '700',
  },

  // Content
  postContent: {
    ...Typography.body,
    color: Colors.brown,
    lineHeight: 26,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Media
  singleMediaWrapper: {
    marginBottom: Spacing.sm,
  },
  singleMediaImage: {
    width: '100%',
    height: MEDIA_SINGLE_HEIGHT,
  },
  mediaScroll: {
    marginBottom: Spacing.sm,
  },
  mediaScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  mediaThumbnailWrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: MEDIA_THUMB_SIZE,
    height: MEDIA_THUMB_SIZE,
    borderRadius: BorderRadius.md,
  },

  // ── Reactions ──
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  reactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray200,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  reactionEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  reactionLabel: {
    ...Typography.label,
    fontSize: 16,
    color: Colors.brownLight,
  },

  // ── Comments section header ──
  commentsSectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  commentsSectionTitle: {
    ...Typography.h3,
    fontSize: 18,
    color: Colors.brown,
  },

  // Comments loading / empty
  commentsLoader: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  commentsLoaderText: {
    ...Typography.bodySmall,
    color: Colors.brownLight,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xxxl,
  },
  noCommentsText: {
    ...Typography.body,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Comments list
  commentsList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // Comment item
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  commentAuthorName: {
    ...Typography.labelSmall,
    color: Colors.brown,
    fontWeight: '600',
    fontSize: 14,
  },
  commentTime: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.gray500,
    lineHeight: 16,
  },
  commentText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.brown,
  },
  deleteCommentBtn: {
    width: DADI_MIN_TAP_TARGET,
    height: DADI_MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  deleteCommentIcon: {
    fontSize: 18,
    lineHeight: 24,
  },

  // ── Comment input bar ──
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    ...Shadow.md,
  },
  commentInput: {
    flex: 1,
    minHeight: DADI_MIN_BUTTON_HEIGHT,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    fontSize: 16,
    color: Colors.brown,
    backgroundColor: Colors.cream,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.haldiGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray400,
  },
  sendBtnIcon: {
    fontSize: 20,
    color: Colors.white,
    lineHeight: 26,
    fontWeight: '700',
  },
});
