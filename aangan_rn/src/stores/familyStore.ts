import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { RELATIONSHIP_MAP } from '../config/constants';
import type { FamilyMember, User } from '../types/database';

// Sanitize PostgREST filter metacharacters to prevent query injection
function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_.,()\\]/g, '');
}

interface FamilyState {
  members: FamilyMember[];
  isLoading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  addMember: (
    familyMemberId: string,
    relationshipType: string,
    relationshipLabelHindi: string | null,
    connectionLevel: number,
  ) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberLevel: (memberId: string, level: number) => Promise<boolean>;
  searchMembers: (query: string) => Promise<Partial<User>[]>;
  getMembersByLevel: (level: number) => FamilyMember[];
  setError: (error: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  members: [],
  isLoading: false,
  error: null,

  fetchMembers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('family_members')
        .select('*, member:users!family_members_family_member_id_fkey(*)')
        .eq('user_id', session.user.id)
        .order('connection_level', { ascending: true });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ members: data ?? [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch family members', isLoading: false });
    }
  },

  addMember: async (familyMemberId, relationshipType, relationshipLabelHindi, connectionLevel) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const reverseRelationship = RELATIONSHIP_MAP[relationshipType] || relationshipType;

      // Use server-side SECURITY DEFINER function for atomic bidirectional insert
      const { error } = await supabase.rpc('add_family_member_bidirectional', {
        p_member_id: familyMemberId,
        p_rel_type: relationshipType,
        p_rel_hindi: relationshipLabelHindi,
        p_level: connectionLevel,
        p_reverse_type: reverseRelationship,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      await get().fetchMembers();
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to add family member' });
      return false;
    }
  },

  removeMember: async (memberId: string) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      // Use server-side SECURITY DEFINER function for atomic bidirectional delete
      const { error } = await supabase.rpc('remove_family_member_bidirectional', {
        p_member_id: memberId,
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        members: state.members.filter((m) => m.family_member_id !== memberId),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove family member' });
      return false;
    }
  },

  updateMemberLevel: async (memberId: string, level: number) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { error } = await supabase
        .from('family_members')
        .update({ connection_level: level, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('family_member_id', memberId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        members: state.members.map((m) =>
          m.family_member_id === memberId ? { ...m, connection_level: level } : m
        ),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to update member level' });
      return false;
    }
  },

  searchMembers: async (query: string) => {
    try {
      // V-04 FIX: Never select phone_number. Only search by name, not phone.
      const sanitized = sanitizeSearchQuery(query);
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, display_name_hindi, profile_photo_url, village, state, family_level')
        .or(`display_name.ilike.%${sanitized}%,display_name_hindi.ilike.%${sanitized}%`)
        .limit(20);

      if (error) {
        set({ error: error.message });
        return [];
      }

      return data ?? [];
    } catch (error: any) {
      set({ error: error.message || 'Search failed' });
      return [];
    }
  },

  getMembersByLevel: (level: number) => {
    return get().members.filter((m) => m.connection_level === level);
  },

  setError: (error) => set({ error }),
}));
