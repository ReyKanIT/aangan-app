import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { AanganEvent, EventRsvp, RsvpStatus } from '@/types/database';
import { friendlyError } from '@/lib/errorMessages';

interface EventState {
  events: AanganEvent[];
  currentEvent: AanganEvent | null;
  rsvps: EventRsvp[];
  isLoading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  fetchEvent: (eventId: string) => Promise<void>;
  createEvent: (data: Partial<AanganEvent>) => Promise<string | null>;
  submitRsvp: (eventId: string, status: RsvpStatus) => Promise<boolean>;
  fetchRsvps: (eventId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentEvent: null,
  rsvps: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, creator:users!creator_id(*)')
        .gte('start_datetime', new Date(Date.now() - 86400000 * 7).toISOString())
        .order('start_datetime', { ascending: true });

      if (error) { set({ error: friendlyError(error.message), isLoading: false }); return; }
      set({ events: data as unknown as AanganEvent[], isLoading: false });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch events'), isLoading: false });
    }
  },

  fetchEvent: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, creator:users!creator_id(*)')
        .eq('id', eventId)
        .single();

      if (error) { set({ error: friendlyError(error.message), isLoading: false }); return; }
      set({ currentEvent: data as unknown as AanganEvent, isLoading: false });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch event'), isLoading: false });
    }
  },

  createEvent: async (data) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    try {
      const { data: created, error } = await supabase.from('events')
        .insert({ ...data, creator_id: user.id })
        .select('id')
        .single();
      if (error) { set({ error: friendlyError(error.message) }); return null; }
      return created.id;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to create event') });
      return null;
    }
  },

  submitRsvp: async (eventId, status) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
      const { error } = await supabase.from('event_rsvps')
        .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      set((state) => ({
        currentEvent: state.currentEvent?.id === eventId
          ? { ...state.currentEvent, my_rsvp: status }
          : state.currentEvent,
      }));
      // Refresh the RSVP list so the attendees section + summary counts include
      // the user's new/updated response without needing a manual reload.
      await get().fetchRsvps(eventId);
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'RSVP failed') });
      return false;
    }
  },

  fetchRsvps: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*, user:users(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) { set({ error: friendlyError(error.message) }); return; }
      set({ rsvps: data as unknown as EventRsvp[] });
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Failed to fetch RSVPs') });
    }
  },

  setError: (error) => set({ error }),
}));
