import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { secureLog } from '../utils/security';
import type { User } from '../types/database';

interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  blocked_user?: User;
}

interface BlockState {
  blockedUsers: BlockedUser[];
  isLoading: boolean;
  error: string | null;

  fetchBlockedUsers: () => Promise<void>;
  blockUser: (userId: string, reason?: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  isBlocked: (userId: string) => boolean;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedUsers: [],
  isLoading: false,
  error: null,

  fetchBlockedUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('user_blocks')
        .select('*, blocked_user:users!user_blocks_blocked_id_fkey(id, display_name, display_name_hindi, profile_photo_url, phone_number)')
        .eq('blocker_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ blockedUsers: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  blockUser: async (userId: string, reason?: string) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: session.user.id,
          blocked_id: userId,
          reason: reason || null,
        });

      if (error) {
        if (error.code === '23505') {
          set({ error: 'User is already blocked' });
          return false;
        }
        set({ error: error.message });
        return false;
      }

      await get().fetchBlockedUsers();
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  unblockUser: async (userId: string) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', session.user.id)
        .eq('blocked_id', userId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        blockedUsers: state.blockedUsers.filter((b) => b.blocked_id !== userId),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  isBlocked: (userId: string) => {
    return get().blockedUsers.some((b) => b.blocked_id === userId);
  },
}));
