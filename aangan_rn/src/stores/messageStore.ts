import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';
import { sendPushToUser } from '../services/pushNotifications';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type?: 'text' | 'voice';
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    display_name_hindi: string | null;
    profile_photo_url: string | null;
  };
}

export interface ConversationSummary {
  userId: string;
  displayName: string;
  displayNameHindi: string | null;
  profilePhotoUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessageState {
  // Map of otherUserId → messages[]
  messages: Record<string, DirectMessage[]>;
  conversations: ConversationSummary[];
  totalUnread: number;
  loadingConversations: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  fetchMessages: (otherUserId: string) => Promise<void>;
  sendMessage: (otherUserId: string, content: string) => Promise<boolean>;
  sendVoiceMessage: (otherUserId: string, audioUri: string, durationSeconds: number) => Promise<boolean>;
  markRead: (otherUserId: string) => Promise<void>;
  subscribeToMessages: (onMessage: (msg: DirectMessage) => void) => void;
  unsubscribeFromMessages: () => void;
  setError: (error: string | null) => void;
}

// Module-level channel reference (outside Zustand state to avoid serialisation issues)
let _realtimeChannel: RealtimeChannel | null = null;

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  conversations: [],
  totalUnread: 0,
  loadingConversations: false,
  error: null,

  // ─── fetchConversations ───────────────────────────────────────────────────
  fetchConversations: async () => {
    set({ loadingConversations: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ loadingConversations: false });
        return;
      }
      const me = session.user.id;

      // Pull all messages involving the current user (last 500 to cover all conversations)
      const { data, error } = await supabase
        .from('direct_messages')
        .select(
          'id, sender_id, receiver_id, content, message_type, audio_url, audio_duration_seconds, is_read, created_at,' +
          ' sender:users!direct_messages_sender_id_fkey(id, display_name, display_name_hindi, profile_photo_url),' +
          ' receiver:users!direct_messages_receiver_id_fkey(id, display_name, display_name_hindi, profile_photo_url)'
        )
        .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        set({ error: safeError(error, 'संदेश लोड नहीं हो सके।'), loadingConversations: false });
        return;
      }

      // Group by partner userId — keep only the most recent message per partner
      const partnerMap = new Map<string, {
        profile: { id: string; display_name: string; display_name_hindi: string | null; profile_photo_url: string | null };
        lastMessage: string;
        lastMessageAt: string;
        unreadCount: number;
      }>();

      for (const msg of (data ?? []) as any[]) {
        const partnerId = msg.sender_id === me ? msg.receiver_id : msg.sender_id;
        const partnerProfile =
          msg.sender_id === me
            ? (msg.receiver as any)
            : (msg.sender as any);

        if (!partnerMap.has(partnerId)) {
          // First (most recent) message for this partner
          partnerMap.set(partnerId, {
            profile: partnerProfile ?? { id: partnerId, display_name: 'परिवार का सदस्य', display_name_hindi: null, profile_photo_url: null },
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: 0,
          });
        }

        // Accumulate unread count: messages sent to me that are unread
        if (msg.receiver_id === me && !msg.is_read) {
          const entry = partnerMap.get(partnerId)!;
          entry.unreadCount += 1;
        }
      }

      const conversations: ConversationSummary[] = Array.from(partnerMap.entries()).map(
        ([userId, entry]) => ({
          userId,
          displayName: entry.profile.display_name,
          displayNameHindi: entry.profile.display_name_hindi,
          profilePhotoUrl: entry.profile.profile_photo_url,
          lastMessage: entry.lastMessage,
          lastMessageAt: entry.lastMessageAt,
          unreadCount: entry.unreadCount,
        })
      );

      // Sort by lastMessageAt DESC (already ordered from DB, but re-sort after grouping)
      conversations.sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

      set({ conversations, totalUnread, loadingConversations: false });
    } catch (err) {
      set({ error: safeError(err, 'संदेश लोड नहीं हो सके।'), loadingConversations: false });
    }
  },

  // ─── fetchMessages ────────────────────────────────────────────────────────
  fetchMessages: async (otherUserId) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const me = session.user.id;

      const { data, error } = await supabase
        .from('direct_messages')
        .select(
          '*, sender:users!direct_messages_sender_id_fkey(id, display_name, display_name_hindi, profile_photo_url)'
        )
        .or(
          `and(sender_id.eq.${me},receiver_id.eq.${otherUserId}),` +
          `and(sender_id.eq.${otherUserId},receiver_id.eq.${me})`
        )
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        set({ error: safeError(error, 'संदेश नहीं खुल सके।') });
        return;
      }

      set((s) => ({
        messages: {
          ...s.messages,
          [otherUserId]: (data ?? []) as DirectMessage[],
        },
      }));
    } catch (err) {
      set({ error: safeError(err, 'संदेश नहीं खुल सके।') });
    }
  },

  // ─── sendMessage ─────────────────────────────────────────────────────────
  sendMessage: async (otherUserId, content) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      const me = session.user.id;

      const now = new Date().toISOString();
      const optimisticMsg: DirectMessage = {
        id: `optimistic-${Date.now()}`,
        sender_id: me,
        receiver_id: otherUserId,
        content: content.trim(),
        is_read: false,
        read_at: null,
        created_at: now,
      };

      // Optimistic update
      set((s) => ({
        messages: {
          ...s.messages,
          [otherUserId]: [...(s.messages[otherUserId] ?? []), optimisticMsg],
        },
        conversations: _upsertConversationLastMessage(
          s.conversations,
          otherUserId,
          content.trim(),
          now
        ),
      }));

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: me,
          receiver_id: otherUserId,
          content: content.trim(),
          is_read: false,
          created_at: now,
        })
        .select(
          '*, sender:users!direct_messages_sender_id_fkey(id, display_name, display_name_hindi, profile_photo_url)'
        )
        .single();

      if (error) {
        // Roll back optimistic message
        set((s) => ({
          messages: {
            ...s.messages,
            [otherUserId]: (s.messages[otherUserId] ?? []).filter(
              (m) => m.id !== optimisticMsg.id
            ),
          },
          error: safeError(error, 'संदेश नहीं भेजा जा सका। दोबारा कोशिश करें।'),
        }));
        return false;
      }

      const confirmed = data as DirectMessage;

      // Replace optimistic message with confirmed one
      set((s) => ({
        messages: {
          ...s.messages,
          [otherUserId]: (s.messages[otherUserId] ?? []).map((m) =>
            m.id === optimisticMsg.id ? confirmed : m
          ),
        },
      }));

      // Push notification to receiver
      const senderName =
        (confirmed as any)?.sender?.display_name_hindi ||
        (confirmed as any)?.sender?.display_name ||
        'परिवार का सदस्य';

      sendPushToUser(
        otherUserId,
        `${senderName} का संदेश`,
        content.trim().slice(0, 80),
        { type: 'direct_message', sender_id: me, message_id: confirmed.id }
      );

      return true;
    } catch (err) {
      set({ error: safeError(err, 'संदेश नहीं भेजा जा सका।') });
      return false;
    }
  },

  // ─── sendVoiceMessage ────────────────────────────────────────────────────
  sendVoiceMessage: async (otherUserId, audioUri, durationSeconds) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      const me = session.user.id;

      // Upload audio file to Supabase storage
      const fileName = `${me}/${Date.now()}.m4a`;
      const response = await fetch(audioUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, blob, {
          contentType: 'audio/m4a',
          upsert: false,
        });

      if (uploadError) {
        set({ error: safeError(uploadError, 'वॉइस मैसेज अपलोड नहीं हो सका।') });
        return false;
      }

      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      const audioUrl = urlData.publicUrl;
      const now = new Date().toISOString();
      const voiceContent = '\uD83C\uDFA4 Voice message';

      // Optimistic update
      const optimisticMsg: DirectMessage = {
        id: `optimistic-${Date.now()}`,
        sender_id: me,
        receiver_id: otherUserId,
        content: voiceContent,
        message_type: 'voice',
        audio_url: audioUrl,
        audio_duration_seconds: durationSeconds,
        is_read: false,
        read_at: null,
        created_at: now,
      };

      set((s) => ({
        messages: {
          ...s.messages,
          [otherUserId]: [...(s.messages[otherUserId] ?? []), optimisticMsg],
        },
        conversations: _upsertConversationLastMessage(
          s.conversations,
          otherUserId,
          voiceContent,
          now
        ),
      }));

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: me,
          receiver_id: otherUserId,
          content: voiceContent,
          message_type: 'voice',
          audio_url: audioUrl,
          audio_duration_seconds: durationSeconds,
          is_read: false,
          created_at: now,
        })
        .select(
          '*, sender:users!direct_messages_sender_id_fkey(id, display_name, display_name_hindi, profile_photo_url)'
        )
        .single();

      if (error) {
        set((s) => ({
          messages: {
            ...s.messages,
            [otherUserId]: (s.messages[otherUserId] ?? []).filter(
              (m) => m.id !== optimisticMsg.id
            ),
          },
          error: safeError(error, 'वॉइस मैसेज नहीं भेजा जा सका। दोबारा कोशिश करें।'),
        }));
        return false;
      }

      const confirmed = data as DirectMessage;

      // Replace optimistic message with confirmed one
      set((s) => ({
        messages: {
          ...s.messages,
          [otherUserId]: (s.messages[otherUserId] ?? []).map((m) =>
            m.id === optimisticMsg.id ? confirmed : m
          ),
        },
      }));

      // Push notification to receiver
      const senderName =
        (confirmed as any)?.sender?.display_name_hindi ||
        (confirmed as any)?.sender?.display_name ||
        'परिवार का सदस्य';

      sendPushToUser(
        otherUserId,
        `${senderName} का वॉइस मैसेज`,
        '\uD83C\uDFA4 वॉइस मैसेज',
        { type: 'direct_message', sender_id: me, message_id: confirmed.id }
      );

      return true;
    } catch (err) {
      set({ error: safeError(err, 'वॉइस मैसेज नहीं भेजा जा सका।') });
      return false;
    }
  },

  // ─── markRead ────────────────────────────────────────────────────────────
  markRead: async (otherUserId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const me = session.user.id;

      await supabase
        .from('direct_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('receiver_id', me)
        .eq('sender_id', otherUserId)
        .eq('is_read', false);

      // Update local state
      set((s) => {
        const updatedMessages = (s.messages[otherUserId] ?? []).map((m) =>
          m.receiver_id === me && !m.is_read
            ? { ...m, is_read: true, read_at: new Date().toISOString() }
            : m
        );

        const updatedConversations = s.conversations.map((c) =>
          c.userId === otherUserId ? { ...c, unreadCount: 0 } : c
        );

        const totalUnread = updatedConversations.reduce((sum, c) => sum + c.unreadCount, 0);

        return {
          messages: { ...s.messages, [otherUserId]: updatedMessages },
          conversations: updatedConversations,
          totalUnread,
        };
      });
    } catch {
      // markRead failures are non-critical — silently ignore
    }
  },

  // ─── subscribeToMessages ──────────────────────────────────────────────────
  subscribeToMessages: (onMessage) => {
    // Clean up any existing subscription first
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const me = session.user.id;

      _realtimeChannel = supabase
        .channel(`direct_messages:${me}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${me}`,
          },
          async (payload) => {
            const raw = payload.new as DirectMessage;

            // Fetch sender profile to enrich the message
            const { data: senderData } = await supabase
              .from('users')
              .select('id, display_name, display_name_hindi, profile_photo_url')
              .eq('id', raw.sender_id)
              .single();

            const enriched: DirectMessage = {
              ...raw,
              sender: senderData ?? undefined,
            };

            const senderId = enriched.sender_id;

            // Update messages list for this conversation
            set((s) => {
              const existing = s.messages[senderId] ?? [];
              // Avoid duplicates
              if (existing.some((m) => m.id === enriched.id)) return s;

              const updatedMessages = [...existing, enriched];

              // Update conversation summary
              const updatedConversations = _upsertConversationWithIncoming(
                s.conversations,
                enriched,
                senderData
              );

              const totalUnread = updatedConversations.reduce(
                (sum, c) => sum + c.unreadCount,
                0
              );

              return {
                messages: { ...s.messages, [senderId]: updatedMessages },
                conversations: updatedConversations,
                totalUnread,
              };
            });

            // Notify UI for immediate scroll / sound
            onMessage(enriched);
          }
        )
        .subscribe();
    });
  },

  // ─── unsubscribeFromMessages ──────────────────────────────────────────────
  unsubscribeFromMessages: () => {
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
  },

  setError: (error) => set({ error }),
}));

// ─── Private helpers ──────────────────────────────────────────────────────────

function _upsertConversationLastMessage(
  conversations: ConversationSummary[],
  partnerId: string,
  lastMessage: string,
  lastMessageAt: string
): ConversationSummary[] {
  const idx = conversations.findIndex((c) => c.userId === partnerId);
  if (idx === -1) return conversations;

  const updated = [...conversations];
  updated[idx] = { ...updated[idx], lastMessage, lastMessageAt };
  return updated.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

function _upsertConversationWithIncoming(
  conversations: ConversationSummary[],
  msg: DirectMessage,
  senderProfile: { id: string; display_name: string; display_name_hindi: string | null; profile_photo_url: string | null } | null
): ConversationSummary[] {
  const idx = conversations.findIndex((c) => c.userId === msg.sender_id);

  if (idx !== -1) {
    const updated = [...conversations];
    updated[idx] = {
      ...updated[idx],
      lastMessage: msg.content,
      lastMessageAt: msg.created_at,
      unreadCount: updated[idx].unreadCount + 1,
    };
    return updated.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  // New conversation partner
  const newConvo: ConversationSummary = {
    userId: msg.sender_id,
    displayName: senderProfile?.display_name ?? 'परिवार का सदस्य',
    displayNameHindi: senderProfile?.display_name_hindi ?? null,
    profilePhotoUrl: senderProfile?.profile_photo_url ?? null,
    lastMessage: msg.content,
    lastMessageAt: msg.created_at,
    unreadCount: 1,
  };

  return [newConvo, ...conversations];
}
