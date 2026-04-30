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
  updateEvent: (eventId: string, patch: Partial<AanganEvent>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  submitRsvp: (eventId: string, status: RsvpStatus, opts?: { guests_count?: number; note?: string | null }) => Promise<boolean>;
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
        // Use the explicit FK constraint name (events_creator_id_fkey)
        // instead of the FK-shorthand `users!creator_id` form. After
        // tonight's REVOKE on public.users (20260429b RLS lockdown phase A),
        // PostgREST's FK-shorthand resolution intermittently failed for
        // sessions whose schema cache was stale, returning PGRST200
        // ("Could not find a relationship between 'events' and 'users'")
        // and rendering /events as a bilingual error banner. The explicit
        // constraint-name form is robust against that — same pattern that
        // the admin page already uses and that has been working through
        // the lockdown.
        .select('*, creator:users!events_creator_id_fkey(id, display_name, display_name_hindi, avatar_url, profile_photo_url, family_level)')
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
        // Same explicit-FK-name fix as fetchEvents above.
        .select('*, creator:users!events_creator_id_fkey(id, display_name, display_name_hindi, avatar_url, profile_photo_url, family_level)')
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

  updateEvent: async (eventId, patch) => {
    set({ error: null });
    try {
      const { error } = await supabase.from('events').update(patch).eq('id', eventId);
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      set((state) => ({
        currentEvent: state.currentEvent?.id === eventId
          ? { ...state.currentEvent, ...patch } as AanganEvent
          : state.currentEvent,
        events: state.events.map((e) => e.id === eventId ? { ...e, ...patch } as AanganEvent : e),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Update failed') });
      return false;
    }
  },

  deleteEvent: async (eventId) => {
    set({ error: null });
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) { set({ error: friendlyError(error.message) }); return false; }
      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        currentEvent: state.currentEvent?.id === eventId ? null : state.currentEvent,
      }));
      return true;
    } catch (e: unknown) {
      set({ error: friendlyError(e instanceof Error ? e.message : 'Delete failed') });
      return false;
    }
  },

  submitRsvp: async (eventId, status, opts) => {
    set({ error: null });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
      // Client-side guard for rsvp_deadline + max_attendees. The DB trusts
      // these inputs (no DB-level trigger enforces capacity), so we stop
      // bad RSVPs here before they land. Server-side enforcement can be
      // added later via a SECURITY DEFINER RPC.
      const event = get().currentEvent;
      if (event && event.id === eventId) {
        if (event.rsvp_deadline && new Date(event.rsvp_deadline).getTime() < Date.now()) {
          set({ error: 'RSVP की तारीख निकल गई — RSVP deadline has passed' });
          return false;
        }
        if (status === 'going' && event.max_attendees != null) {
          const myRsvp = get().rsvps.find((r) => r.user_id === user.id);
          const goingCount = get().rsvps.filter((r) => r.status === 'going').length;
          const myself = opts?.guests_count ?? myRsvp?.guests_count ?? 0;
          const currentSeats = goingCount + get().rsvps.reduce((sum, r) => r.status === 'going' ? sum + (r.guests_count ?? 0) : sum, 0);
          const newSeats = myRsvp?.status === 'going'
            ? currentSeats - 1 - (myRsvp.guests_count ?? 0) + 1 + myself
            : currentSeats + 1 + myself;
          if (newSeats > event.max_attendees) {
            set({ error: `जगह पूरी भर गई — ${event.max_attendees} की सीमा` });
            return false;
          }
        }
      }

      const payload: Record<string, unknown> = { event_id: eventId, user_id: user.id, status };
      if (opts?.guests_count !== undefined) payload.guests_count = opts.guests_count;
      if (opts?.note !== undefined) payload.note = opts.note;
      const { error } = await supabase.from('event_rsvps')
        .upsert(payload, { onConflict: 'event_id,user_id' });
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
        // Explicit FK name (event_rsvps_user_id_fkey) — same fix as
        // fetchEvents/fetchEvent above so the embed survives PostgREST
        // schema-cache hiccups under the post-RLS-lockdown regime.
        .select('*, user:users!event_rsvps_user_id_fkey(id, display_name, display_name_hindi, avatar_url, profile_photo_url, family_level)')
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
