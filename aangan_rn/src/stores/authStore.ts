import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { secureLog } from '../utils/security';
import type { User } from '../types/database';
import { Session } from '@supabase/supabase-js';

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
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  setError: (error: string | null) => void;
  updateLastSeen: () => Promise<void>;
}

// Module-level subscription reference for cleanup
let _authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isNewUser: false,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, isLoading: false });

      if (session?.user) {
        await get().fetchProfile();
      } else {
        set({ isLoading: false });
      }

      // Listen for auth changes (store subscription for cleanup)
      if (_authSubscription) {
        _authSubscription.unsubscribe();
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          set({ session: null, user: null, isNewUser: false, isLoading: false });
          return;
        }
        set({ session });
        if (session?.user) {
          await get().fetchProfile();
        }
      });
      _authSubscription = subscription;
    } catch (error) {
      set({ isLoading: false, error: 'Failed to initialize' });
    }
  },

  sendOtp: async (phone: string) => {
    set({ error: null });
    try {
      const fullPhone = `+91${phone}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        set({ error: error.message });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to send OTP' });
      return false;
    }
  },

  verifyOtp: async (phone: string, token: string) => {
    set({ error: null });
    try {
      const fullPhone = `+91${phone}`;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token,
        type: 'sms',
      });
      if (error) {
        set({ error: error.message });
        return false;
      }
      if (data.session) {
        set({ session: data.session });
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Verification failed' });
      return false;
    }
  },

  sendEmailOtp: async (email: string) => {
    set({ error: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        set({ error: error.message });
        return false;
      }
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to send email OTP' });
      return false;
    }
  },

  verifyEmailOtp: async (email: string, token: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) {
        set({ error: error.message });
        return false;
      }
      if (data.session) {
        set({ session: data.session });
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Verification failed' });
      return false;
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ error: error.message });
        return false;
      }
      if (data.session) {
        set({ session: data.session });
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Sign in failed' });
      return false;
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        set({ error: error.message });
        return false;
      }
      if (data.session) {
        set({ session: data.session });
        await get().fetchProfile();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Sign up failed' });
      return false;
    }
  },

  signOut: async () => {
    // Clean up subscriptions before signing out
    try {
      const { useNotificationStore } = require('./notificationStore');
      useNotificationStore.getState().unsubscribeFromRealtime();
    } catch (_) { /* store may not be initialized */ }
    if (_authSubscription) {
      _authSubscription.unsubscribe();
      _authSubscription = null;
    }
    await supabase.auth.signOut();
    set({ session: null, user: null, isNewUser: false });
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        // If user profile not found (deleted), sign out to force re-login
        if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
          secureLog.warn('User profile not found, signing out');
          await get().signOut();
          return;
        }
        set({ error: error.message, isLoading: false });
        return;
      }

      // Check if new user (display_name matches phone/email = hasn't set profile)
      const isNewUser = !data.display_name ||
        data.display_name === data.phone_number ||
        data.display_name === session.user.phone ||
        data.display_name === session.user.email;

      set({ user: data, isNewUser, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateProfile: async (data: Partial<User>) => {
    const { session } = get();
    if (!session?.user) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (error) {
        set({ error: error.message });
        return false;
      }

      await get().fetchProfile();
      set({ isNewUser: false });
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  setError: (error) => set({ error }),

  updateLastSeen: async () => {
    const { session } = get();
    if (!session?.user) return;
    try {
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', session.user.id);
    } catch (e) {
      secureLog.warn('Failed to update last_seen_at:', e);
    }
  },
}));
