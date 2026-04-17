import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { VALIDATION } from '../config/constants';
import type {
  EventRsvp,
  RsvpStats,
  RsvpStatus,
  PhysicalCard,
  EventConfirmation,
  EventCheckin,
  ConfirmationMethod,
  CheckinType,
} from '../types/database';

interface RsvpState {
  rsvps: EventRsvp[];
  stats: RsvpStats;
  physicalCards: PhysicalCard[];
  confirmations: EventConfirmation[];
  checkins: EventCheckin[];
  isLoading: boolean;
  error: string | null;

  fetchRsvps: (eventId: string) => Promise<void>;
  submitRsvp: (
    eventId: string,
    status: RsvpStatus,
    plusCount?: number,
    responseNote?: string | null,
    dietaryPreferences?: string[],
  ) => Promise<boolean>;
  fetchStats: (eventId: string) => Promise<void>;
  toggleCard: (eventId: string, userId: string, sent: boolean, sentVia?: 'hand' | 'post' | 'courier') => Promise<boolean>;
  addConfirmation: (
    eventId: string,
    userId: string,
    method: ConfirmationMethod,
    notes?: string | null,
  ) => Promise<boolean>;
  autoCheckin: (eventId: string, latitude: number, longitude: number, eventLat: number, eventLng: number) => Promise<boolean>;
  fetchCheckins: (eventId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const emptyStats: RsvpStats = {
  total: 0,
  accepted: 0,
  declined: 0,
  pending: 0,
  maybe: 0,
  total_guests: 0,
};

export const useRsvpStore = create<RsvpState>((set, get) => ({
  rsvps: [],
  stats: { ...emptyStats },
  physicalCards: [],
  confirmations: [],
  checkins: [],
  isLoading: false,
  error: null,

  fetchRsvps: async (eventId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*, user:users!event_rsvps_user_id_fkey(*)')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const rsvps = data ?? [];
      set({ rsvps, isLoading: false });

      // Also calculate stats from fetched data
      const stats: RsvpStats = {
        total: rsvps.length,
        accepted: rsvps.filter((r) => r.status === 'accepted').length,
        declined: rsvps.filter((r) => r.status === 'declined').length,
        pending: rsvps.filter((r) => r.status === 'pending').length,
        maybe: rsvps.filter((r) => r.status === 'maybe').length,
        total_guests: rsvps.reduce((sum, r) => sum + (r.status === 'accepted' ? 1 + (r.guests_count ?? 0) : 0), 0),
      };
      set({ stats });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch RSVPs', isLoading: false });
    }
  },

  submitRsvp: async (eventId, status, plusCount = 0, responseNote = null, dietaryPreferences = []) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('event_rsvps')
        .upsert(
          {
            event_id: eventId,
            user_id: session.user.id,
            status,
            guests_count: plusCount,
            response_note: responseNote,
            dietary_preferences: dietaryPreferences,
            updated_at: now,
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Refresh RSVPs and stats
      await get().fetchRsvps(eventId);
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to submit RSVP' });
      return false;
    }
  },

  fetchStats: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('status, guests_count')
        .eq('event_id', eventId);

      if (error) {
        set({ error: error.message });
        return;
      }

      const rsvps = data ?? [];
      const stats: RsvpStats = {
        total: rsvps.length,
        accepted: rsvps.filter((r) => r.status === 'accepted').length,
        declined: rsvps.filter((r) => r.status === 'declined').length,
        pending: rsvps.filter((r) => r.status === 'pending').length,
        maybe: rsvps.filter((r) => r.status === 'maybe').length,
        total_guests: rsvps.reduce((sum, r) => sum + (r.status === 'accepted' ? 1 + (r.guests_count ?? 0) : 0), 0),
      };
      set({ stats });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch stats' });
    }
  },

  toggleCard: async (eventId, userId, sent, sentVia) => {
    set({ error: null });
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('physical_cards')
        .upsert(
          {
            event_id: eventId,
            user_id: userId,
            card_sent: sent,
            sent_at: sent ? now : null,
            sent_via: sent ? (sentVia ?? null) : null,
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) {
        set({ error: error.message });
        return false;
      }

      set((state) => {
        const existing = state.physicalCards.findIndex(
          (c) => c.event_id === eventId && c.user_id === userId
        );
        const updated = [...state.physicalCards];
        if (existing >= 0) {
          updated[existing] = { ...updated[existing], card_sent: sent, sent_at: sent ? now : null, sent_via: sent ? (sentVia ?? null) : null };
        }
        return { physicalCards: updated };
      });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to toggle card' });
      return false;
    }
  },

  addConfirmation: async (eventId, userId, method, notes = null) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { data, error } = await supabase
        .from('event_confirmations')
        .insert({
          event_id: eventId,
          user_id: userId,
          confirmation_method: method,
          confirmed_by: session.user.id,
          notes,
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        set({ error: error.message });
        return false;
      }

      if (data) {
        set((state) => ({ confirmations: [...state.confirmations, data] }));
      }
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to add confirmation' });
      return false;
    }
  },

  autoCheckin: async (eventId, latitude, longitude, eventLat, eventLng) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const distance = calculateDistance(latitude, longitude, eventLat, eventLng);
      if (distance > VALIDATION.gpsCheckInRadiusMeters) {
        set({ error: `आप इवेंट स्थान से ${Math.round(distance)}m दूर हैं। ${VALIDATION.gpsCheckInRadiusMeters}m के अंदर आएं।` });
        return false;
      }

      const { data, error } = await supabase
        .from('event_checkins')
        .insert({
          event_id: eventId,
          user_id: session.user.id,
          checkin_type: 'gps' as CheckinType,
          latitude,
          longitude,
          accuracy_meters: distance,
          checked_in_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        set({ error: error.message });
        return false;
      }

      if (data) {
        set((state) => ({ checkins: [...state.checkins, data] }));
      }
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Check-in failed' });
      return false;
    }
  },

  fetchCheckins: async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('event_checkins')
        .select('*')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: false });

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ checkins: data ?? [] });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch check-ins' });
    }
  },

  setError: (error) => set({ error }),
}));
