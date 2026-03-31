import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { Notification } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
  setError: (error: string | null) => void;
}

let realtimeChannel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const notifications = data ?? [];
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch notifications', isLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    set({ error: null });
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: now })
        .eq('id', notificationId);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: now } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
      return false;
    }
  },

  markAllRead: async () => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: now })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.is_read ? n.read_at : now,
        })),
        unreadCount: 0,
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark all as read' });
      return false;
    }
  },

  subscribeToRealtime: () => {
    const subscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Clean up existing subscription
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }

      realtimeChannel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            set((state) => ({
              notifications: [newNotification, ...state.notifications],
              unreadCount: state.unreadCount + 1,
            }));
          }
        )
        .subscribe();
    };

    subscribe();
  },

  unsubscribeFromRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  setError: (error) => set({ error }),
}));
