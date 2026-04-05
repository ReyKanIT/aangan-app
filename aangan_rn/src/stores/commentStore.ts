import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';
import { sendPushToUser } from '../services/pushNotifications';

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    display_name: string;
    display_name_hindi: string | null;
    profile_photo_url: string | null;
  };
}

interface CommentState {
  // Map of postId → comments[]
  commentsByPost: Record<string, PostComment[]>;
  loadingPosts: Set<string>;
  error: string | null;

  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, postAuthorId: string) => Promise<boolean>;
  deleteComment: (commentId: string, postId: string) => Promise<boolean>;
  clearComments: (postId: string) => void;
  setError: (error: string | null) => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  commentsByPost: {},
  loadingPosts: new Set(),
  error: null,

  fetchComments: async (postId) => {
    set((s) => ({ loadingPosts: new Set(s.loadingPosts).add(postId) }));
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, author:users!post_comments_author_id_fkey(id, display_name, display_name_hindi, profile_photo_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        set((s) => {
          const next = new Set(s.loadingPosts);
          next.delete(postId);
          return { error: safeError(error, 'टिप्पणियाँ लोड नहीं हो सकीं।'), loadingPosts: next };
        });
        return;
      }

      set((s) => {
        const next = new Set(s.loadingPosts);
        next.delete(postId);
        return {
          commentsByPost: { ...s.commentsByPost, [postId]: (data ?? []) as PostComment[] },
          loadingPosts: next,
        };
      });
    } catch (err) {
      set((s) => {
        const next = new Set(s.loadingPosts);
        next.delete(postId);
        return { error: safeError(err, 'टिप्पणियाँ लोड नहीं हो सकीं।'), loadingPosts: next };
      });
    }
  },

  addComment: async (postId, content, postAuthorId) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: session.user.id,
          content: content.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*, author:users!post_comments_author_id_fkey(id, display_name, display_name_hindi, profile_photo_url)')
        .single();

      if (error) {
        set({ error: safeError(error, 'टिप्पणी नहीं हो सकी। दोबारा कोशिश करें।') });
        return false;
      }

      // Optimistic update
      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: [...(s.commentsByPost[postId] ?? []), data as PostComment],
        },
      }));

      // Push notification to post author (if different user)
      if (postAuthorId && postAuthorId !== session.user.id) {
        const authorName =
          (data as any)?.author?.display_name_hindi ||
          (data as any)?.author?.display_name ||
          'किसी ने';
        sendPushToUser(
          postAuthorId,
          `${authorName} ने टिप्पणी की`,
          content.trim().slice(0, 80),
          { type: 'new_comment', post_id: postId, comment_id: (data as PostComment).id }
        );
      }

      return true;
    } catch (err) {
      set({ error: safeError(err, 'टिप्पणी नहीं हो सकी।') });
      return false;
    }
  },

  deleteComment: async (commentId, postId) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        set({ error: safeError(error, 'टिप्पणी हटाई नहीं जा सकी।') });
        return false;
      }

      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: (s.commentsByPost[postId] ?? []).filter((c) => c.id !== commentId),
        },
      }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'टिप्पणी हटाई नहीं जा सकी।') });
      return false;
    }
  },

  clearComments: (postId) => {
    set((s) => {
      const next = { ...s.commentsByPost };
      delete next[postId];
      return { commentsByPost: next };
    });
  },

  setError: (error) => set({ error }),
}));
