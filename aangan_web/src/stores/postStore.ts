import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Post } from '@/types/database';
import { uploadPostMedia } from '@/lib/utils/uploadMedia';

interface PostState {
  posts: Post[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  cursor: string | null;
  error: string | null;

  fetchPosts: (reset?: boolean) => Promise<void>;
  createPost: (content: string, mediaFiles: File[], audienceType: string, audienceLevel?: number) => Promise<boolean>;
  likePost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<boolean>;
  setError: (error: string | null) => void;
}

const PAGE_SIZE = 20;

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  isLoading: false,
  isFetching: false,
  hasMore: true,
  cursor: null,
  error: null,

  fetchPosts: async (reset = false) => {
    const { isFetching, cursor, hasMore } = get();
    if (isFetching || (!hasMore && !reset)) return;

    set({ isFetching: true, error: null });
    if (reset) set({ posts: [], cursor: null, hasMore: true });

    try {
      const effectiveCursor = reset ? null : cursor;
      let query = supabase
        .from('posts')
        .select('*, author:users(*)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (effectiveCursor) query = query.lt('created_at', effectiveCursor);

      const { data, error } = await query;
      if (error) { set({ error: error.message, isFetching: false }); return; }

      // Check which posts the current user has liked
      const { data: { user } } = await supabase.auth.getUser();
      let likedPostIds = new Set<string>();
      if (user && data && data.length > 0) {
        const postIds = data.map((p: { id: string }) => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        if (likes) likedPostIds = new Set(likes.map((l: { post_id: string }) => l.post_id));
      }

      const newPosts = (data as unknown as Post[]).map((p) => ({
        ...p,
        is_liked: likedPostIds.has(p.id),
      }));
      set((state) => ({
        posts: reset ? newPosts : [...state.posts, ...newPosts],
        cursor: newPosts.length > 0 ? newPosts[newPosts.length - 1].created_at : state.cursor,
        hasMore: newPosts.length === PAGE_SIZE,
        isFetching: false,
        isLoading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch posts', isFetching: false });
    }
  },

  createPost: async (content, mediaFiles, audienceType, audienceLevel) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const mediaUrls: string[] = [];
      for (const file of mediaFiles) {
        const url = await uploadPostMedia(file, user.id);
        mediaUrls.push(url);
      }

      const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        content,
        audience_type: audienceType === 'all' ? 'all' : 'level',
        audience_level: audienceLevel ?? null,
        media_urls: mediaUrls,
        like_count: 0,
        comment_count: 0,
        is_pinned: false,
      });

      if (error) { set({ error: error.message }); return false; }
      await get().fetchPosts(true);
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to create post' });
      return false;
    }
  },

  likePost: async (postId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.is_liked;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, like_count: wasLiked ? p.like_count - 1 : p.like_count + 1, is_liked: !wasLiked }
          : p
      ),
    }));

    try {
      if (wasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
    } catch {
      // Rollback on error
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, like_count: wasLiked ? p.like_count + 1 : p.like_count - 1, is_liked: wasLiked }
            : p
        ),
      }));
    }
  },

  deletePost: async (postId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', user.id);
    if (error) { set({ error: error.message }); return false; }
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
    return true;
  },

  setError: (error) => set({ error }),
}));
