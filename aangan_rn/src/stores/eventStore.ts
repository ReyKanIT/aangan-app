import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { secureLog, safeError } from '../utils/security';
import type { AanganEvent, AudienceType, EventType, Ceremony } from '../types/database';

interface CreateEventInput {
  title: string;
  titleHindi: string | null;
  eventType: EventType;
  eventDate: string;
  endDate: string | null;
  location: string;
  locationHindi: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  audienceType: AudienceType;
  audienceLevel: number | null;
  audienceLevelMax: number | null;
  audienceGroupId: string | null;
  rsvpDeadline: string | null;
  maxAttendees: number | null;
  ceremonies: Ceremony[];
  description: string | null;
  descriptionHindi: string | null;
  bannerUrl: string | null;
  audienceUserIds: string[];
}

interface EventState {
  events: AanganEvent[];
  currentEvent: AanganEvent | null;
  isLoading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<boolean>;
  updateEvent: (eventId: string, updates: Partial<AanganEvent>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  fetchEventById: (eventId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*, creator:users!events_creator_id_fkey(*)')
        .order('event_date', { ascending: true });

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।'), isLoading: false });
        return;
      }

      set({ events: (data as AanganEvent[]) ?? [], isLoading: false });
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to fetch events'), isLoading: false });
    }
  },

  createEvent: async (input) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();

      // 1. Insert the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          creator_id: session.user.id,
          title: input.title,
          title_hindi: input.titleHindi,
          event_type: input.eventType,
          event_date: input.eventDate,
          end_date: input.endDate,
          location: input.location,
          location_hindi: input.locationHindi,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          audience_type: input.audienceType,
          audience_level: input.audienceLevel,
          audience_level_max: input.audienceLevelMax,
          audience_group_id: input.audienceGroupId,
          rsvp_deadline: input.rsvpDeadline,
          max_attendees: input.maxAttendees,
          ceremonies: input.ceremonies,
          description: input.description,
          description_hindi: input.descriptionHindi,
          banner_url: input.bannerUrl,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (eventError || !event) {
        set({ error: safeError(eventError, 'इवेंट नहीं बन सका। दोबारा कोशिश करें।') });
        return false;
      }

      // 2. Insert RSVPs for each audience member (status: pending)
      if (input.audienceUserIds.length > 0) {
        const rsvpRows = input.audienceUserIds.map((userId) => ({
          event_id: event.id,
          user_id: userId,
          status: 'pending' as const,
          guests_count: 0,
          dietary_preferences: [],
          created_at: now,
          updated_at: now,
        }));

        const { error: rsvpError } = await supabase
          .from('event_rsvps')
          .insert(rsvpRows);

        if (rsvpError) {
          // Roll back the event — invitees would be stuck with no RSVP record
          secureLog.warn('RSVP insert failed, rolling back event:', rsvpError.message);
          await supabase.from('events').delete().eq('id', event.id);
          set({ error: 'इवेंट नहीं बन सका। दोबारा कोशिश करें।' });
          return false;
        }
      }

      // 3. Insert notifications for each audience member
      if (input.audienceUserIds.length > 0) {
        const notificationRows = input.audienceUserIds.map((userId) => ({
          user_id: userId,
          type: 'event_invite' as const,
          title: `नया निमंत्रण: ${input.title}`,
          title_hindi: input.titleHindi ? `नया निमंत्रण: ${input.titleHindi}` : null,
          body: `You are invited to ${input.title}`,
          body_hindi: input.titleHindi ? `आपको ${input.titleHindi} में आमंत्रित किया गया है` : null,
          data: { event_id: event.id, event_type: input.eventType },
          is_read: false,
          created_at: now,
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationRows);

        if (notifError) {
          secureLog.warn('Failed to insert notifications:', notifError.message);
        }
      }

      await get().fetchEvents();
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to create event') });
      return false;
    }
  },

  updateEvent: async (eventId, updates) => {
    set({ error: null });
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { error } = await supabase
        .from('events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('creator_id', session?.user?.id ?? '');

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, ...updates } : e
        ),
        currentEvent:
          state.currentEvent?.id === eventId
            ? { ...state.currentEvent, ...updates }
            : state.currentEvent,
      }));
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to update event') });
      return false;
    }
  },

  deleteEvent: async (eventId) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('creator_id', session.user.id);

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।') });
        return false;
      }

      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        currentEvent: state.currentEvent?.id === eventId ? null : state.currentEvent,
      }));
      return true;
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to delete event') });
      return false;
    }
  },

  fetchEventById: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, creator:users!events_creator_id_fkey(*)')
        .eq('id', eventId)
        .single();

      if (error) {
        set({ error: safeError(error, 'कुछ गलत हो गया।'), isLoading: false });
        return;
      }

      set({ currentEvent: data as AanganEvent, isLoading: false });
    } catch (error: any) {
      set({ error: safeError(error, 'Failed to fetch event'), isLoading: false });
    }
  },

  setError: (error) => set({ error }),
}));
