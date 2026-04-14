import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { DirectMessage, ConversationSummary } from '@/types/database';
import { friendlyError } from '@/lib/errorMessages';

interface MessageState {
  messages: Record<string, DirectMessage[]>;
  conversations: ConversationSummary[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  fetchMessages: (otherUserId: string) => Promise<void>;
  sendMessage: (otherUserId: string, content: string) => Promise<boolean>;
  markRead: (otherUserId: string) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  conversations: [],
  totalUnread: 0,
  isLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoading: false }); return; }

      // Fetch recent messages where current user is sender or receiver
      const { data: sent, error: sentErr } = await supabase
        .from('direct_messages')
        .select('*, sender:users!sender_id(display_name, display_name_hindi, avatar_url)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: received, error: recvErr } = await supabase
        .from('direct_messages')
        .select('*, sender:users!sender_id(display_name, display_name_hindi, avatar_url)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (sentErr || recvErr) {
        set({ error: friendlyError((sentErr || recvErr)!.message), isLoading: false });
        return;
      }

      const allMessages = [...(sent || []), ...(received || [])] as DirectMessage[];

      // Group by conversation partner
      const convMap = new Map<string, { messages: DirectMessage[]; unread: number }>();

      for (const msg of allMessages) {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, { messages: [], unread: 0 });
        }
        const conv = convMap.get(otherUserId)!;
        conv.messages.push(msg);
        if (msg.receiver_id === user.id && !msg.is_read) {
          conv.unread++;
        }
      }

      // Fetch user profiles for all conversation partners
      const partnerIds = Array.from(convMap.keys());
      let partnerProfiles: Record<string, { display_name: string; display_name_hindi: string | null; avatar_url: string | null }> = {};

      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('users')
          .select('id, display_name, display_name_hindi, avatar_url')
          .in('id', partnerIds);

        if (profiles) {
          for (const p of profiles) {
            partnerProfiles[p.id] = p;
          }
        }
      }

      // Build conversation summaries
      const conversations: ConversationSummary[] = [];
      let totalUnread = 0;

      for (const [partnerId, conv] of convMap) {
        // Sort messages by created_at descending to get the latest
        conv.messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = conv.messages[0];
        const profile = partnerProfiles[partnerId];

        conversations.push({
          userId: partnerId,
          displayName: profile?.display_name ?? 'Unknown',
          displayNameHindi: profile?.display_name_hindi ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          lastMessage: latest.content,
          lastMessageAt: latest.created_at,
          unreadCount: conv.unread,
        });

        totalUnread += conv.unread;
      }

      // Sort conversations by last message time (newest first)
      conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      set({ conversations, totalUnread, isLoading: false });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch conversations'), isLoading: false });
    }
  },

  fetchMessages: async (otherUserId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoading: false }); return; }

      // Fetch messages in both directions
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*, sender:users!sender_id(display_name, display_name_hindi, avatar_url)')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) { set({ error: friendlyError(error.message), isLoading: false }); return; }

      set((state) => ({
        messages: { ...state.messages, [otherUserId]: (data || []) as DirectMessage[] },
        isLoading: false,
      }));
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch messages'), isLoading: false });
    }
  },

  sendMessage: async (otherUserId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const optimisticMsg: DirectMessage = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        receiver_id: otherUserId,
        content,
        message_type: 'text',
        audio_url: null,
        audio_duration_seconds: null,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      set((state) => ({
        messages: {
          ...state.messages,
          [otherUserId]: [...(state.messages[otherUserId] || []), optimisticMsg],
        },
      }));

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content,
          message_type: 'text',
        })
        .select('*, sender:users!sender_id(display_name, display_name_hindi, avatar_url)')
        .single();

      if (error) {
        // Rollback optimistic update
        set((state) => ({
          messages: {
            ...state.messages,
            [otherUserId]: (state.messages[otherUserId] || []).filter((m) => m.id !== optimisticMsg.id),
          },
          error: friendlyError(error.message),
        }));
        return false;
      }

      // Replace optimistic message with real one
      set((state) => ({
        messages: {
          ...state.messages,
          [otherUserId]: (state.messages[otherUserId] || []).map((m) =>
            m.id === optimisticMsg.id ? (data as DirectMessage) : m
          ),
        },
      }));

      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to send message') });
      return false;
    }
  },

  markRead: async (otherUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('direct_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Update local state
      set((state) => ({
        messages: {
          ...state.messages,
          [otherUserId]: (state.messages[otherUserId] || []).map((m) =>
            m.sender_id === otherUserId && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          ),
        },
        conversations: state.conversations.map((c) =>
          c.userId === otherUserId ? { ...c, unreadCount: 0 } : c
        ),
        totalUnread: Math.max(0, state.totalUnread - (state.conversations.find((c) => c.userId === otherUserId)?.unreadCount ?? 0)),
      }));
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to mark as read') });
    }
  },
}));
