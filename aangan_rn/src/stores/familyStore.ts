import { safeError } from '../utils/security';
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { RELATIONSHIP_MAP, RELATIONSHIP_HINDI_LABEL } from '../config/constants';
import { sendPushToUser } from '../services/pushNotifications';
import type { FamilyMember, OfflineFamilyMember, User } from '../types/database';

// Relationship types that map to parent/sibling for onboarding tracking
const PARENT_TYPES = new Set(['पिता', 'माता']);
const SIBLING_TYPES = new Set(['भाई', 'बहन']);

// Sanitize PostgREST filter metacharacters to prevent query injection
function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_.,()\\]/g, '');
}

interface FamilyState {
  members: FamilyMember[];
  /** Offline family members — relatives without Aangan accounts. Fetched via
   *  `get_visible_offline_family_members` RPC; same data the web app shows.
   *  Added 2026-05-16 to fix Kumar's "ancestors gone on iPhone" bug — the
   *  RN screen previously only rendered family_members (online) rows. */
  offlineMembers: OfflineFamilyMember[];
  isLoading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  /** Fetch offline_family_members via SECURITY DEFINER RPC. Mirrors the web
   *  page's behavior. Non-fatal — failures are warned to console; the screen
   *  still renders the online-members list. */
  fetchOfflineMembers: () => Promise<void>;
  addMember: (
    familyMemberId: string,
    relationshipType: string,
    relationshipLabelHindi: string | null,
    connectionLevel: number,
  ) => Promise<boolean>;
  /** Add a family member who does NOT have an Aangan account (ancestors,
   *  deceased relatives, people without smartphones). Inserts directly into
   *  offline_family_members. v0.15.8 added to fix Kumar's "no name option"
   *  bug — RN previously only supported phone-based add (online users only),
   *  forcing offline relatives to be added via the web app. */
  addOfflineMember: (input: {
    displayName: string;
    displayNameHindi?: string | null;
    relationshipType: string;
    relationshipLabelHindi?: string | null;
    connectionLevel: number;
    isDeceased?: boolean;
    villageCity?: string | null;
    birthYear?: number | null;
    deathYear?: number | null;
  }) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberLevel: (memberId: string, level: number) => Promise<boolean>;

  // v0.16.3 direct tree editing (Kumar directive 2026-05-18 8:48 IST).
  // These mirror addMember/addOfflineMember semantics: online rows route
  // through family_members (RLS scoped by user_id = auth.uid()); offline
  // rows route through offline_family_members (added_by = auth.uid()).
  // All four do optimistic local update + revert on error, matching the
  // existing addMember pattern.

  /** Delete an online family_members row by family_member_id. Returns
   *  true on success, false on failure. The relationship is removed for
   *  the current user only — the reverse edge (their tree) is handled by
   *  the same SECURITY DEFINER RPC `remove_family_member_bidirectional`
   *  that `removeMember` uses. v0.16.3: `deleteMember` is an alias kept
   *  for the new tree-edit UI; both call sites end up at the same RPC. */
  deleteMember: (familyMemberId: string) => Promise<boolean>;

  /** Delete an offline_family_members row by id (the raw offline id, NOT
   *  the synthetic `offline-…` adapter id used in the tree view).
   *  Returns true on success. */
  deleteOfflineMember: (offlineId: string) => Promise<boolean>;

  /** Patch a family_members row's relationship/level fields. Only the
   *  fields supplied in `patch` are updated. Returns true on success. */
  updateMember: (
    familyMemberId: string,
    patch: {
      relationshipType?: string;
      relationshipLabelHindi?: string | null;
      connectionLevel?: number;
    },
  ) => Promise<boolean>;

  /** Patch an offline_family_members row. The offline row has name +
   *  relationship fields that the user can edit inline. Returns true on
   *  success. */
  updateOfflineMember: (
    offlineId: string,
    patch: {
      displayName?: string;
      displayNameHindi?: string | null;
      relationshipType?: string;
      relationshipLabelHindi?: string | null;
      connectionLevel?: number;
    },
  ) => Promise<boolean>;

  searchMembers: (query: string) => Promise<Partial<User>[]>;
  getMembersByLevel: (level: number) => FamilyMember[];
  setError: (error: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  members: [],
  offlineMembers: [],
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
        .select('*, member:users!family_members_family_member_id_fkey(id, display_name, display_name_hindi, profile_photo_url, village, state, family_level, last_seen_at)')
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

  fetchOfflineMembers: async () => {
    // Web page uses get_visible_offline_family_members RPC (SECURITY DEFINER,
    // applies the family-of-family visibility predicate + redacts PII on rows
    // the caller doesn't own). RN now uses the same RPC so iOS and web show
    // the same tree. Non-fatal: failures keep the screen functional with
    // only family_members visible.
    try {
      const { data, error } = await supabase.rpc('get_visible_offline_family_members');
      if (error) {
        console.warn('[familyStore] get_visible_offline_family_members error:', error.message, error.code);
        return;
      }
      if (data) set({ offlineMembers: data as OfflineFamilyMember[] });
    } catch (e: any) {
      // RPC may not exist on a stale Supabase project — silently degrade.
      console.warn('[familyStore] get_visible_offline_family_members threw:', e?.message ?? e);
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

  addOfflineMember: async (input) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { error } = await supabase.from('offline_family_members').insert({
        added_by: session.user.id,
        display_name: input.displayName.trim(),
        display_name_hindi: input.displayNameHindi?.trim() || null,
        relationship_type: input.relationshipType,
        relationship_label_hindi: input.relationshipLabelHindi ?? null,
        connection_level: input.connectionLevel,
        is_deceased: input.isDeceased ?? false,
        village_city: input.villageCity ?? null,
        birth_year: input.birthYear ?? null,
        death_year: input.deathYear ?? null,
      });

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      await get().fetchOfflineMembers();
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to add offline family member') });
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

  // ── v0.16.3 direct tree editing ─────────────────────────────────────────
  // Optimistic mutation pattern mirrors addMember: snapshot the old slice,
  // apply the local update, fire the network call, revert on error. Keeps
  // the tree feeling instant while still surfacing failures via `error`.

  deleteMember: async (familyMemberId: string) => {
    set({ error: null });
    const prevMembers = get().members;
    // Optimistic local removal.
    set({ members: prevMembers.filter((m) => m.family_member_id !== familyMemberId) });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ members: prevMembers, error: 'Not authenticated' });
        return false;
      }
      const { error } = await supabase.rpc('remove_family_member_bidirectional', {
        p_member_id: familyMemberId,
      });
      if (error) {
        set({ members: prevMembers, error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ members: prevMembers, error: safeError(error, 'Failed to delete family member') });
      return false;
    }
  },

  deleteOfflineMember: async (offlineId: string) => {
    set({ error: null });
    const prev = get().offlineMembers;
    set({ offlineMembers: prev.filter((o) => o.id !== offlineId) });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ offlineMembers: prev, error: 'Not authenticated' });
        return false;
      }
      const { error } = await supabase
        .from('offline_family_members')
        .delete()
        .eq('id', offlineId)
        .eq('added_by', session.user.id);
      if (error) {
        set({ offlineMembers: prev, error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ offlineMembers: prev, error: safeError(error, 'Failed to delete offline member') });
      return false;
    }
  },

  updateMember: async (familyMemberId, patch) => {
    set({ error: null });
    const prev = get().members;
    // Build the optimistic patch + payload.
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.relationshipType !== undefined) updates.relationship_type = patch.relationshipType;
    if (patch.relationshipLabelHindi !== undefined) updates.relationship_label_hindi = patch.relationshipLabelHindi;
    if (patch.connectionLevel !== undefined) updates.connection_level = patch.connectionLevel;

    set({
      members: prev.map((m) =>
        m.family_member_id === familyMemberId
          ? {
              ...m,
              ...(patch.relationshipType !== undefined ? { relationship_type: patch.relationshipType } : {}),
              ...(patch.relationshipLabelHindi !== undefined ? { relationship_label_hindi: patch.relationshipLabelHindi } : {}),
              ...(patch.connectionLevel !== undefined ? { connection_level: patch.connectionLevel } : {}),
            }
          : m,
      ),
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ members: prev, error: 'Not authenticated' });
        return false;
      }
      const { error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('user_id', session.user.id)
        .eq('family_member_id', familyMemberId);
      if (error) {
        set({ members: prev, error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ members: prev, error: safeError(error, 'Failed to update family member') });
      return false;
    }
  },

  updateOfflineMember: async (offlineId, patch) => {
    set({ error: null });
    const prev = get().offlineMembers;
    const updates: Record<string, any> = {};
    if (patch.displayName !== undefined) updates.display_name = patch.displayName;
    if (patch.displayNameHindi !== undefined) updates.display_name_hindi = patch.displayNameHindi;
    if (patch.relationshipType !== undefined) updates.relationship_type = patch.relationshipType;
    if (patch.relationshipLabelHindi !== undefined) updates.relationship_label_hindi = patch.relationshipLabelHindi;
    if (patch.connectionLevel !== undefined) updates.connection_level = patch.connectionLevel;

    set({
      offlineMembers: prev.map((o) =>
        o.id === offlineId
          ? {
              ...o,
              ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
              ...(patch.displayNameHindi !== undefined ? { display_name_hindi: patch.displayNameHindi } : {}),
              ...(patch.relationshipType !== undefined ? { relationship_type: patch.relationshipType } : {}),
              ...(patch.relationshipLabelHindi !== undefined ? { relationship_label_hindi: patch.relationshipLabelHindi } : {}),
              ...(patch.connectionLevel !== undefined ? { connection_level: patch.connectionLevel } : {}),
            }
          : o,
      ),
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ offlineMembers: prev, error: 'Not authenticated' });
        return false;
      }
      const { error } = await supabase
        .from('offline_family_members')
        .update(updates)
        .eq('id', offlineId)
        .eq('added_by', session.user.id);
      if (error) {
        set({ offlineMembers: prev, error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ offlineMembers: prev, error: safeError(error, 'Failed to update offline member') });
      return false;
    }
  },

  searchMembers: async (query: string) => {
    try {
      const sanitized = sanitizeSearchQuery(query);
      const trimmed = sanitized.trim();

      // ── AAN-ID short-circuit (v0.13.5 parity with web) ──────────────
      // If input looks like an Aangan ID (AAN-XXXXXXXX, with or
      // without the dash, case-insensitive), resolve directly via the
      // SECURITY DEFINER RPC. Returns one unambiguous user, bypassing
      // name fuzzy match. Falls through to name search on miss so a
      // user named "Aanchal" still works without a hyphen.
      const aanganIdRegex = /^AAN[-]?[A-Z0-9]{4,12}$/i;
      const compact = trimmed.replace(/\s+/g, '');
      if (aanganIdRegex.test(compact)) {
        const normalized = compact.toUpperCase();
        const candidate = normalized.startsWith('AAN-') ? normalized : 'AAN-' + normalized.slice(3);
        const { data: aanganHit, error: aanganErr } = await supabase
          .rpc('lookup_user_by_aangan_id', { p_aangan_id: candidate });
        if (!aanganErr && aanganHit && aanganHit.length > 0) {
          return aanganHit;
        }
        // Fall through to name search if no exact ID match.
      }

      // ── Name search via SECURITY DEFINER RPC (post-RLS-lockdown) ──
      // Switched 2026-05-01 to search_users_safe RPC for parity with
      // web. After the 20260429b REVOKE on public.users from anon,
      // direct .from('users') still works for authenticated callers
      // but PostgREST schema-cache hiccups have caused intermittent
      // FK-shorthand failures. The RPC returns the same shape (incl.
      // aangan_id since 20260430h) and is rate-limited to 20 rows.
      const { data, error } = await supabase
        .rpc('search_users_safe', { p_query: trimmed });

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
