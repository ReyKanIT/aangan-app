import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Post } from '@/types/database';
import { uploadPostMedia } from '@/lib/utils/uploadMedia';
import { friendlyError } from '@/lib/errorMessages';
import { notifyFamilyL1 } from '@/lib/utils/notifyFamilyL1';

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
    const { isFetching, cursor, hasMore, posts } = get();
    if (isFetching || (!hasMore && !reset)) return;

    // Show the full-page loading spinner only when we have nothing to display
    // yet (initial load or a reset with an empty list). Otherwise the feed page
    // briefly renders the "no posts" empty state while the first fetch is in
    // flight.
    const showLoading = reset || posts.length === 0;
    set({ isFetching: true, error: null, ...(showLoading ? { isLoading: true } : {}) });
    if (reset) set({ posts: [], cursor: null, hasMore: true });

    try {
      const effectiveCursor = reset ? null : cursor;
      let query = supabase
        .from('posts')
        .select('*, author:users(id, display_name, display_name_hindi, avatar_url, profile_photo_url, family_level)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (effectiveCursor) query = query.lt('created_at', effectiveCursor);

      const { data, error } = await query;
      if (error) { set({ error: friendlyError(error.message), isFetching: false, isLoading: false }); return; }

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
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch posts'), isFetching: false, isLoading: false });
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

      if (error) { set({ error: friendlyError(error.message) }); return false; }

      // Fan out notifications to Level-1 family — fire-and-forget so a slow
      // edge function doesn't block the modal-close + feed-refresh sequence.
      // No postId in the payload: chaining `.select('id').single()` to the
      // insert above caused v0.13.19 to fail silently for posts whose RLS
      // SELECT policy didn't return the just-inserted row, leaving the modal
      // stuck on submit. Recipients can find the post in /feed via actorId.
      void (async () => {
        const { data: me } = await supabase
          .from('users')
          .select('display_name, display_name_hindi')
          .eq('id', user.id)
          .single();
        const senderName = me?.display_name_hindi || me?.display_name || 'किसी ने';
        const senderNameEn = me?.display_name || 'Someone';
        notifyFamilyL1({
          actorId: user.id,
          type: 'new_post',
          titleHi: 'नई पोस्ट 📸',
          titleEn: 'New post 📸',
          bodyHi: `${senderName} ने नई पोस्ट डाली`,
          bodyEn: `${senderNameEn} shared a new post`,
          data: { type: 'new_post', actorId: user.id },
        });
      })();

      await get().fetchPosts(true);
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to create post') });
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
          ? { ...p, like_count: wasLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1, is_liked: !wasLiked }
          : p
      ),
    }));

    try {
      if (wasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
    } catch (e: unknown) {
      // Rollback on error + show error
      set((state) => ({
        error: friendlyError(e instanceof Error ? e.message : 'Like failed'),
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
    if (error) { set({ error: friendlyError(error.message) }); return false; }
    set((state) => ({ posts: state.posts.filter((p) => p.id !== postId) }));
    return true;
  },

  setError: (error) => set({ error }),
}));
