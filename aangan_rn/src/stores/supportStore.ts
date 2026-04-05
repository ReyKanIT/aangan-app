import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';
import type { SupportTicket, SupportMessage, SupportTicketCategory } from '../types/database';

export interface CreateTicketInput {
  category: SupportTicketCategory;
  subject: string;
  message: string;
}

interface SupportState {
  tickets: SupportTicket[];
  activeTicket: SupportTicket | null;
  messages: SupportMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchMyTickets: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<SupportTicket | null>;
  fetchMessages: (ticketId: string) => Promise<void>;
  sendMessage: (ticketId: string, message: string) => Promise<boolean>;
  setActiveTicket: (ticket: SupportTicket | null) => void;
  clearError: () => void;
}

export const CATEGORY_META: Record<SupportTicketCategory, { en: string; hi: string; emoji: string }> = {
  billing:         { en: 'Billing',         hi: 'भुगतान',       emoji: '💳' },
  account:         { en: 'Account',         hi: 'खाता',         emoji: '👤' },
  bug_report:      { en: 'Bug / Error',     hi: 'गड़बड़ी',       emoji: '🐛' },
  feature_request: { en: 'Feature Request', hi: 'सुझाव',        emoji: '💡' },
  complaint:       { en: 'Complaint',       hi: 'शिकायत',       emoji: '📢' },
  general:         { en: 'General Query',   hi: 'सामान्य प्रश्न', emoji: '❓' },
};

export const STATUS_META: Record<string, { en: string; hi: string; color: string }> = {
  open:              { en: 'Open',              hi: 'खुला',           color: '#2196F3' },
  assigned:          { en: 'Assigned',          hi: 'सौंपा गया',       color: '#9C27B0' },
  in_progress:       { en: 'In Progress',       hi: 'जारी है',         color: '#FF9800' },
  waiting_for_user:  { en: 'Waiting for You',  hi: 'आपके जवाब का इंतज़ार', color: '#FF5722' },
  resolved:          { en: 'Resolved',          hi: 'हल हो गया',       color: '#4CAF50' },
  closed:            { en: 'Closed',            hi: 'बंद',             color: '#9E9E9E' },
};

export const useSupport = create<SupportState>((set, get) => ({
  tickets: [],
  activeTicket: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  fetchMyTickets: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ tickets: (data as SupportTicket[]) ?? [], isLoading: false });
    } catch (err) {
      set({ error: safeError(err, 'Failed to load tickets'), isLoading: false });
    }
  },

  createTicket: async (input) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          category: input.category,
          subject: input.subject,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      // Insert first message
      const { error: mErr } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: input.message,
        is_from_support: false,
      });
      if (mErr) throw mErr;

      const newTicket = ticket as SupportTicket;
      set((s) => ({ tickets: [newTicket, ...s.tickets] }));
      return newTicket;
    } catch (err) {
      set({ error: safeError(err, 'Failed to create ticket') });
      return null;
    }
  },

  fetchMessages: async (ticketId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select(`
          *,
          sender:users!sender_id (
            id, display_name, display_name_hindi, profile_photo_url
          )
        `)
        .eq('ticket_id', ticketId)
        .eq('is_internal_note', false)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const ticket = get().tickets.find((t) => t.id === ticketId) ?? null;
      set({ messages: (data as SupportMessage[]) ?? [], activeTicket: ticket, isLoading: false });
    } catch (err) {
      set({ error: safeError(err, 'Failed to load messages'), isLoading: false });
    }
  },

  sendMessage: async (ticketId, message) => {
    set({ isSending: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message: message.trim(),
          is_from_support: false,
        })
        .select(`
          *,
          sender:users!sender_id (
            id, display_name, display_name_hindi, profile_photo_url
          )
        `)
        .single();
      if (error) throw error;

      set((s) => ({ messages: [...s.messages, data as SupportMessage], isSending: false }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'Failed to send message'), isSending: false });
      return false;
    }
  },

  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
  clearError: () => set({ error: null }),
}));
