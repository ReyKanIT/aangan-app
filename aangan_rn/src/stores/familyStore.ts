import { safeError } from '../utils/security';
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { RELATIONSHIP_MAP, RELATIONSHIP_HINDI_LABEL } from '../config/constants';
import { sendPushToUser } from '../services/pushNotifications';
import type { FamilyMember, User } from '../types/database';

// Relationship types that map to parent/sibling for onboarding tracking
const PARENT_TYPES = new Set(['पिता', 'माता']);
const SIBLING_TYPES = new Set(['भाई', 'बहन']);

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
        .select('*, member:users!family_members_family_member_id_fkey(id, display_name, display_name_hindi, profile_photo_url, village, state, family_level)')
        .eq('user_id', session.user.id)
        .order('connection_level', { ascending: true })
        .limit(200);

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।'), isLoading: false });
        return;
      }

      set({ members: data ?? [], isLoading: false });
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to fetch family members'), isLoading: false });
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

      // Reverse-relationship lookup. Bug fixed 2026-04-30: previously the
      // RELATIONSHIP_MAP was Hindi-keyed but the call site passes English
      // keys, so this fell through and the reverse defaulted to the SAME
      // relationship as the forward — corrupting every bidirectional pair
      // (B saw A as B's father if A added B as A's father).
      const reverseRelationship = RELATIONSHIP_MAP[relationshipType] ?? relationshipType;
      const reverseLabelHindi = RELATIONSHIP_HINDI_LABEL[reverseRelationship] ?? null;

      // Use server-side SECURITY DEFINER function for atomic bidirectional insert.
      // The 6th param `p_reverse_hindi` was added by migration 20260430b; older
      // backends (pre-fix) ignored a 6th arg, so this call works against either.
      const { error } = await supabase.rpc('add_family_member_bidirectional', {
        p_member_id: familyMemberId,
        p_rel_type: relationshipType,
        p_rel_hindi: relationshipLabelHindi,
        p_level: connectionLevel,
        p_reverse_type: reverseRelationship,
        p_reverse_hindi: reverseLabelHindi,
      });

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      await get().fetchMembers();

      // Send push notification to the added member
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        const { data: me } = await supabase
          .from('users')
          .select('display_name, display_name_hindi')
          .eq('id', currentSession.user.id)
          .single();
        if (me) {
          const senderName = me.display_name_hindi || me.display_name;
          sendPushToUser(
            familyMemberId,
            'परिवार में जुड़े! 🏠',
            `${senderName} ने आपको परिवार में जोड़ा`,
            { type: 'new_family_member', actorId: currentSession.user.id },
          );
        }
      }

      // Update onboarding progress
      if (currentSession?.user) {
        const isParent = PARENT_TYPES.has(relationshipType);
        const isSibling = SIBLING_TYPES.has(relationshipType);
        if (isParent || isSibling) {
          const updateData: Record<string, boolean> = {};
          if (isParent) updateData.added_parent = true;
          if (isSibling) updateData.added_sibling = true;
          supabase
            .from('onboarding_progress')
            .update(updateData)
            .eq('user_id', currentSession.user.id)
            .then(() => {}); // fire-and-forget
        }
      }

      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to add family member') });
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
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      set((state) => ({
        members: state.members.filter((m) => m.family_member_id !== memberId),
      }));
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to remove family member') });
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
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      set((state) => ({
        members: state.members.map((m) =>
          m.family_member_id === memberId ? { ...m, connection_level: level } : m
        ),
      }));
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to update member level') });
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
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return [];
      }

      return data ?? [];
    } catch (error: any) {
      set({ error: safeError(error, 'Search failed') });
      return [];
    }
  },

  getMembersByLevel: (level: number) => {
    return get().members.filter((m) => m.connection_level === level);
  },

  setError: (error) => set({ error }),
}));
