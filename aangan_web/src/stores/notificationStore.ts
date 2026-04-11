import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Notification } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

let _channel: RealtimeChannel | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { set({ error: error.message, isLoading: false }); return; }
      const notifs = data as Notification[];
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.is_read).length,
        isLoading: false,
      });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch notifications', isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) { set({ error: error.message }); return; }
      set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to mark as read' });
    }
  },

  markAllAsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      if (error) { set({ error: error.message }); return; }
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to mark all as read' });
    }
  },

  subscribeToRealtime: () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      if (_channel) _channel.unsubscribe();
      _channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const newNotif = payload.new as Notification;
          set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        })
        .subscribe();
    }, () => {});
  },

  unsubscribeFromRealtime: () => {
    if (_channel) { _channel.unsubscribe(); _channel = null; }
  },
}));
