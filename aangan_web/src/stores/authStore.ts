import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errorMessages';
import type { User } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  error: string | null;
  // Raw backend error (Supabase / hook) — kept alongside the friendly
  // `error` so the login page can show a "Show details" diagnostic when
  // OTP delivery fails. Helps Kumar see "phone signup disabled" or
  // "SMS provider error 503" instead of just "OTP नहीं भेज पाए".
  rawError: string | null;

  initialize: () => Promise<void>;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, token: string) => Promise<boolean>;
  sendEmailOtp: (email: string) => Promise<boolean>;
  verifyEmailOtp: (email: string, token: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  setError: (error: string | null) => void;
}

let _subscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isNewUser: false,
  error: null,
  rawError: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });
      if (session?.user) await get().fetchProfile();
      else set({ isLoading: false });

      if (_subscription) _subscription.unsubscribe();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({ session: null, user: null, isNewUser: false, isLoading: false });
          return;
        }
        set({ session });
        if (session?.user) await get().fetchProfile();
      });
      _subscription = subscription;
    } catch {
      set({ isLoading: false, error: friendlyError('Failed to initialize') });
    }
  },

  // `phone` is a full E.164 number (e.g. "+919876543210"). The login page
  // composes it from the country picker + national number. Do not prepend any
  // dial code here.
  sendOtp: async (phone) => {
    set({ error: null, rawError: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) { set({ error: friendlyError(error.message), rawError: error.message }); return false; }
      return true;
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Failed to send OTP';
      set({ error: friendlyError(raw), rawError: raw });
      return false;
    }
  },

  verifyOtp: async (phone, token) => {
    set({ error: null, rawError: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) { set({ error: friendlyError(error.message), rawError: error.message }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'Verification failed';
      set({ error: friendlyError(raw), rawError: raw });
      return false;
    }
  },

  sendEmailOtp: async (email) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to send OTP') });
      return false;
    }
  },

  verifyEmailOtp: async (email, token) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Verification failed') });
      return false;
    }
  },

  signInWithEmail: async (email, password) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          set({ error: 'ईमेल वेरिफ़ाई नहीं हुआ। "Email OTP भेजें" दबाकर वेरिफ़ाई करें।' });
        } else if (msg.includes('invalid login credentials') || msg.includes('invalid')) {
          set({ error: 'ईमेल या पासवर्ड गलत है।' });
        } else {
          set({ error: friendlyError(error.message) });
        }
        return false;
      }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Sign in failed') });
      return false;
    }
  },

  signUpWithEmail: async (email, password) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      if (data.user) {
        // Account created, now send email OTP for verification
        const { error: otpError } = await supabase.auth.signInWithOtp({ email });
        if (otpError) { set({ error: friendlyError(otpError.message) }); return false; }
        return true;
      }
      return false;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Sign up failed') });
      return false;
    }
  },

  signInWithGoogle: async () => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) set({ error: friendlyError(error.message) });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Google sign-in failed') });
    }
  },

  signInWithApple: async () => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) set({ error: friendlyError(error.message) });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Apple sign-in failed') });
    }
  },

  signOut: async () => {
    if (_subscription) { _subscription.unsubscribe(); _subscription = null; }
    await supabase.auth.signOut();
    set({ session: null, user: null, isNewUser: false, isLoading: false });

    // Clear every per-user cache so the next user signing in on the same
    // browser does not briefly see the previous user's feed / family /
    // messages / notifications. Dynamic import avoids circular deps at module
    // load time, and each store is reset via its own setState.
    try {
      const [
        { usePostStore },
        { useCommentStore },
        { useEventStore },
        { useFamilyStore },
        { useMessageStore },
        { useNotificationStore },
      ] = await Promise.all([
        import('./postStore'),
        import('./commentStore'),
        import('./eventStore'),
        import('./familyStore'),
        import('./messageStore'),
        import('./notificationStore'),
      ]);

      // Unsubscribe from the old user's realtime notifications channel
      // before we wipe state; otherwise the next user would still receive
      // inserts targeted at the previous user.
      useNotificationStore.getState().unsubscribeFromRealtime();

      usePostStore.setState({
        posts: [], isLoading: false, isFetching: false, hasMore: true,
        cursor: null, error: null,
      });
      useCommentStore.setState({
        commentsByPost: {}, loadingPosts: new Set(), error: null,
      });
      useEventStore.setState({
        events: [], currentEvent: null, rsvps: [], isLoading: false, error: null,
      });
      useFamilyStore.setState({
        members: [], searchResults: [], isLoading: false, error: null,
      });
      useMessageStore.setState({
        messages: {}, conversations: [], totalUnread: 0, isLoading: false, error: null,
      });
      useNotificationStore.setState({
        notifications: [], unreadCount: 0, isLoading: false, error: null,
      });
    } catch (e) {
      console.error('[signOut] Failed to clear caches:', e);
    }
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (error) {
        if (error.code === 'PGRST116') { set({ user: null, isNewUser: true, isLoading: false }); return; }
        set({ error: friendlyError(error.message), isLoading: false }); return;
      }
      const isNewUser = !data.display_name ||
        data.display_name === data.phone_number ||
        data.display_name === session.user.email;
      set({ user: data, isNewUser, isLoading: false });
      // Update last_seen_at (fire-and-forget)
      supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', session.user.id).then(() => {}, () => {});
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch profile'), isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const { session } = get();
    if (!session?.user) return false;
    try {
      // upsert (not update) so new phone-auth users who have no row yet in
      // public.users get one created here — there is no DB trigger that
      // auto-inserts from auth.users, so a plain .update() would silently
      // affect 0 rows and leave isNewUser stuck as true forever.
      //
      // KNOWN RISK (tracked in STORE_READINESS_AUDIT_2026-04-30.md):
      // This blind upsert keyed on auth.uid() will RECREATE the account-
      // fragmentation bug (the Kumar 05d182cf vs 578a8432 case fixed by
      // 20260430c) for any user who logs in with email today and phone
      // tomorrow (or vice-versa). The proper fix is a SECURITY DEFINER
      // RPC `find_or_link_profile(phone, email)` that locates an existing
      // public.users row by phone/email match and either links the new
      // auth identity or surfaces a "merge needed" error. Deferred to a
      // dedicated session — auth-flow changes need careful security
      // thinking and identity-link plumbing.
      //
      // Mitigation now in place:
      // - Migration 20260430h adds users.aangan_id, a stable share-able
      //   handle that survives identity changes.
      // - Future "I lost my number" recovery flow can ask the user for
      //   their AAN-XXXXXXXX and rebind the new auth identity to the
      //   existing public.users row.
      const { error } = await supabase.from('users')
        .upsert({ id: session.user.id, ...data, updated_at: new Date().toISOString() });
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      await get().fetchProfile();
      set({ isNewUser: false });
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Update failed') });
      return false;
    }
  },

  setError: (error) => set({ error }),
}));
