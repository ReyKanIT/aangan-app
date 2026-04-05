import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { secureLog, safeError } from '../utils/security';
import { sendPushToUser } from '../services/pushNotifications';
import type { Post, PostType, AudienceType } from '../types/database';

const PAGE_SIZE = 20;

interface CreatePostInput {
  content: string | null;
  postType: PostType;
  audienceType: AudienceType;
  audienceLevel: number | null;
  audienceLevelMax: number | null;
  audienceGroupId: string | null;
  mediaFiles?: { uri: string; type: string; name: string }[];
  audienceUserIds?: string[];
}

interface PostState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  cursor: string | null;

  fetchPosts: () => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<boolean>;
  likePost: (postId: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  refreshPosts: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  hasMore: true,
  cursor: null,

  fetchPosts: async () => {
    const { isLoading, hasMore, cursor } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      let query = supabase
        .from('posts')
        .select('*, author:users!posts_author_id_fkey(id, display_name, display_name_hindi, profile_photo_url, village, state)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।'), isLoading: false });
        return;
      }

      const newPosts = data ?? [];
      const lastPost = newPosts[newPosts.length - 1];

      set((state) => ({
        posts: cursor ? [...state.posts, ...newPosts] : newPosts,
        cursor: lastPost?.created_at ?? null,
        hasMore: newPosts.length === PAGE_SIZE,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to fetch posts'), isLoading: false });
    }
  },

  createPost: async (input) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      // Upload media files if present
      const mediaUrls: string[] = [];
      if (input.mediaFiles?.length) {
        for (const file of input.mediaFiles) {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, {
              uri: file.uri,
              type: file.type,
              name: file.name,
            } as any);

          if (uploadError) {
            set({ error: `Upload failed: ${uploadError.message}` });
            return false;
          }

          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath);

          mediaUrls.push(urlData.publicUrl);
        }
      }

      // Insert the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: session.user.id,
          content: input.content,
          media_urls: mediaUrls,
          post_type: input.postType,
          audience_type: input.audienceType,
          audience_level: input.audienceLevel,
          audience_level_max: input.audienceLevelMax,
          audience_group_id: input.audienceGroupId,
          delivery_status: 'sent',
          like_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (postError) {
        set({ error: postError.message });
        return false;
      }

      // Insert audience records if user IDs provided
      if (input.audienceUserIds?.length && post) {
        const audienceRows = input.audienceUserIds.map((userId) => ({
          post_id: post.id,
          user_id: userId,
          can_view: true,
          can_respond: true,
        }));

        const { error: audienceError } = await supabase
          .from('post_audience')
          .insert(audienceRows);

        if (audienceError) {
          // Post created but audience insertion failed - non-fatal
          secureLog.warn('Failed to insert post audience:', audienceError.message);
        }
      }

      // Update onboarding progress — made_first_post
      supabase
        .from('onboarding_progress')
        .update({ made_first_post: true })
        .eq('user_id', session.user.id)
        .then(() => {}); // fire-and-forget

      // Notify Level-1 family members about the new post
      const { data: me } = await supabase
        .from('users')
        .select('display_name, display_name_hindi')
        .eq('id', session.user.id)
        .single();

      if (me) {
        const senderName = me.display_name_hindi || me.display_name;
        const { data: l1Members } = await supabase
          .from('family_members')
          .select('family_member_id')
          .eq('user_id', session.user.id)
          .eq('connection_level', 1)
          .limit(50);

        if (l1Members?.length) {
          for (const m of l1Members) {
            sendPushToUser(
              m.family_member_id,
              'नई पोस्ट 📸',
              `${senderName} ने नई पोस्ट डाली`,
              { type: 'new_post', postId: post?.id, actorId: session.user.id },
            );
          }
        }
      }

      // Refresh to get the post with joined author
      await get().refreshPosts();
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to create post') });
      return false;
    }
  },

  likePost: async (postId: string) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      // Optimistic update
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, like_count: p.like_count + (p.is_liked ? -1 : 1), is_liked: !p.is_liked }
            : p
        ),
      }));

      const post = get().posts.find((p) => p.id === postId);
      const isNowLiked = post?.is_liked;

      if (isNowLiked) {
        const { error } = await supabase.rpc('increment_like', { post_id: postId, user_id: session.user.id });
        if (error) {
          // Revert optimistic update
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? { ...p, like_count: p.like_count - 1, is_liked: false } : p
            ),
          }));
          set({ error: safeError(error, 'कुछ गलत हो गया।') });
          return false;
        }
      } else {
        const { error } = await supabase.rpc('decrement_like', { post_id: postId, user_id: session.user.id });
        if (error) {
          // Revert optimistic update
          set((state) => ({
            posts: state.posts.map((p) =>
              p.id === postId ? { ...p, like_count: p.like_count + 1, is_liked: true } : p
            ),
          }));
          set({ error: safeError(error, 'कुछ गलत हो गया।') });
          return false;
        }
      }

      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to like post') });
      return false;
    }
  },

  deletePost: async (postId: string) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', session.user.id);

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      set((state) => ({
        posts: state.posts.filter((p) => p.id !== postId),
      }));
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to delete post') });
      return false;
    }
  },

  refreshPosts: async () => {
    set({ posts: [], cursor: null, hasMore: true });
    await get().fetchPosts();
  },

  setError: (error) => set({ error }),
}));
