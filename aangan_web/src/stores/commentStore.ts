import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { PostComment } from '@/types/database';

interface CommentState {
  commentsByPost: Record<string, PostComment[]>;
  loadingPosts: Set<string>;
  error: string | null;

  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<boolean>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
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
        .select('*, author:users!post_comments_author_id_fkey(display_name, display_name_hindi, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        set((s) => {
          const next = new Set(s.loadingPosts);
          next.delete(postId);
          return { error: 'टिप्पणियाँ लोड नहीं हो सकीं।', loadingPosts: next };
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
    } catch {
      set((s) => {
        const next = new Set(s.loadingPosts);
        next.delete(postId);
        return { error: 'टिप्पणियाँ लोड नहीं हो सकीं।', loadingPosts: next };
      });
    }
  },

  addComment: async (postId, content) => {
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
        .select('*, author:users!post_comments_author_id_fkey(display_name, display_name_hindi, avatar_url)')
        .single();

      if (error) {
        set({ error: 'टिप्पणी नहीं हो सकी। दोबारा कोशिश करें।' });
        return false;
      }

      // Optimistic update
      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: [...(s.commentsByPost[postId] ?? []), data as PostComment],
        },
      }));

      return true;
    } catch {
      set({ error: 'टिप्पणी नहीं हो सकी।' });
      return false;
    }
  },

  deleteComment: async (commentId, postId) => {
    set({ error: null });

    // Optimistic: remove immediately
    const prev = get().commentsByPost[postId] ?? [];
    set((s) => ({
      commentsByPost: {
        ...s.commentsByPost,
        [postId]: prev.filter((c) => c.id !== commentId),
      },
    }));

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        // Rollback
        set((s) => ({
          commentsByPost: { ...s.commentsByPost, [postId]: prev },
          error: 'टिप्पणी हटाई नहीं जा सकी।',
        }));
      }
    } catch {
      // Rollback
      set((s) => ({
        commentsByPost: { ...s.commentsByPost, [postId]: prev },
        error: 'टिप्पणी हटाई नहीं जा सकी।',
      }));
    }
  },

  setError: (error) => set({ error }),
}));
