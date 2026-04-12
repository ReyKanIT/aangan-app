import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  error: string | null;

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
      set({ isLoading: false, error: 'Failed to initialize' });
    }
  },

  sendOtp: async (phone) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
      if (error) { set({ error: error.message }); return false; }
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to send OTP' });
      return false;
    }
  },

  verifyOtp: async (phone, token) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token, type: 'sms' });
      if (error) { set({ error: error.message }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Verification failed' });
      return false;
    }
  },

  sendEmailOtp: async (email) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) { set({ error: error.message }); return false; }
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to send OTP' });
      return false;
    }
  },

  verifyEmailOtp: async (email, token) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) { set({ error: error.message }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Verification failed' });
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
          set({ error: error.message });
        }
        return false;
      }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      return false;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Sign in failed' });
      return false;
    }
  },

  signUpWithEmail: async (email, password) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { set({ error: error.message }); return false; }
      if (data.session) { set({ session: data.session }); await get().fetchProfile(); return true; }
      if (data.user) {
        // Account created, now send email OTP for verification
        const { error: otpError } = await supabase.auth.signInWithOtp({ email });
        if (otpError) { set({ error: otpError.message }); return false; }
        return true;
      }
      return false;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Sign up failed' });
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
      if (error) set({ error: error.message });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Google sign-in failed' });
    }
  },

  signInWithApple: async () => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) set({ error: error.message });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Apple sign-in failed' });
    }
  },

  signOut: async () => {
    if (_subscription) { _subscription.unsubscribe(); _subscription = null; }
    await supabase.auth.signOut();
    set({ session: null, user: null, isNewUser: false });
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (error) {
        if (error.code === 'PGRST116') { set({ user: null, isNewUser: true, isLoading: false }); return; }
        set({ error: error.message, isLoading: false }); return;
      }
      const isNewUser = !data.display_name ||
        data.display_name === data.phone_number ||
        data.display_name === session.user.email;
      set({ user: data, isNewUser, isLoading: false });
      // Update last_seen_at (fire-and-forget)
      supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', session.user.id).then(() => {}, () => {});
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch profile', isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const { session } = get();
    if (!session?.user) return false;
    try {
      const { error } = await supabase.from('users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
      if (error) { set({ error: error.message }); return false; }
      await get().fetchProfile();
      set({ isNewUser: false });
      return true;
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Update failed' });
      return false;
    }
  },

  setError: (error) => set({ error }),
}));
