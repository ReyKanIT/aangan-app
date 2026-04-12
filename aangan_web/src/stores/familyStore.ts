import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { FamilyMember, User } from '@/types/database';

interface FamilyState {
  members: FamilyMember[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  addMember: (memberId: string, relType: string, relHindi: string, level: number, reverseType: string) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  clearSearch: () => void;
  setError: (error: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  members: [],
  searchResults: [],
  isLoading: false,
  error: null,

  fetchMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { set({ isLoading: false, error: 'Not authenticated' }); return; }

      const { data, error } = await supabase
        .from('family_members')
        .select('*, member:users!family_members_family_member_id_fkey(*)')
        .eq('user_id', session.user.id)
        .order('connection_level', { ascending: true });

      if (error) { set({ error: error.message, isLoading: false }); return; }
      set({ members: data as unknown as FamilyMember[], isLoading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch family', isLoading: false });
    }
  },

  searchUsers: async (query) => {
    if (!query.trim()) { set({ searchResults: [] }); return; }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`display_name.ilike.%${query.replace(/[%_,.()\\']/g, '\\$&')}%,display_name_hindi.ilike.%${query.replace(/[%_,.()\\']/g, '\\$&')}%`)
        .limit(20);

      if (error) { set({ error: error.message }); return; }
      set({ searchResults: data as User[] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Search failed' });
    }
  },

  addMember: async (memberId, relType, relHindi, level, reverseType) => {
    set({ error: null });
    try {
      const { error } = await supabase.rpc('add_family_member_bidirectional', {
        p_member_id: memberId,
        p_rel_type: relType,
        p_rel_hindi: relHindi,
        p_level: level,
        p_reverse_type: reverseType,
      });
      if (error) { set({ error: error.message }); return false; }
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to add member' });
      return false;
    }
  },

  removeMember: async (memberId) => {
    set({ error: null });
    try {
      const { error } = await supabase.rpc('remove_family_member_bidirectional', {
        p_member_id: memberId,
      });
      if (error) { set({ error: error.message }); return false; }
      set((state) => ({
        members: state.members.filter((m) => m.family_member_id !== memberId),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to remove member' });
      return false;
    }
  },

  clearSearch: () => set({ searchResults: [] }),
  setError: (error) => set({ error }),
}));
