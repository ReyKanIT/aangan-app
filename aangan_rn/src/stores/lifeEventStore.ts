import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';
import type { LifeEvent, LifeEventType, SutakRules } from '../types/database';

export const DEFAULT_SUTAK_RULES: SutakRules = {
  noTempleVisit: true,
  noReligiousCeremonies: true,
  noPujaAtHome: false,
  noAuspiciousWork: true,
  noFoodSharing: true,
  noNewVentures: false,
  customNotes: '',
};

export const DEFAULT_SUTAK_DAYS: Record<LifeEventType, number> = {
  birth: 10,
  death: 13,
};

// Derive sutak end date
export function computeSutakEndDate(startDate: string, days: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().split('T')[0];
}

// Check if sutak is currently active for an event
export function isSutakActive(event: LifeEvent): boolean {
  if (!event.sutak_enabled || !event.sutak_end_date) return false;
  const today = new Date().toISOString().split('T')[0];
  return today >= (event.sutak_start_date ?? event.event_date) && today <= event.sutak_end_date;
}

// Days remaining in sutak (0 if not active)
export function sutakDaysRemaining(event: LifeEvent): number {
  if (!isSutakActive(event)) return 0;
  const today = new Date();
  const end = new Date(event.sutak_end_date!);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  return Math.max(0, diff + 1);
}

export interface CreateLifeEventInput {
  event_type: LifeEventType;
  person_name: string;
  person_name_hindi?: string;
  event_date: string;
  relationship?: string;
  baby_gender?: 'boy' | 'girl' | 'not_disclosed';
  birth_place?: string;
  age_at_death?: number;
  sutak_enabled: boolean;
  sutak_days: number;
  sutak_rules: SutakRules;
  notes?: string;
  is_visible_to_family: boolean;
}

interface LifeEventState {
  events: LifeEvent[];
  isLoading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  createEvent: (input: CreateLifeEventInput) => Promise<LifeEvent | null>;
  updateEvent: (id: string, input: Partial<CreateLifeEventInput>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useLifeEventStore = create<LifeEventState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch own events + visible events from family
      const { data, error } = await supabase
        .from('life_events')
        .select(`
          *,
          creator:users!created_by (
            id, display_name, display_name_hindi, profile_photo_url
          )
        `)
        .order('event_date', { ascending: false });

      if (error) throw error;
      set({ events: (data as LifeEvent[]) ?? [], isLoading: false });
    } catch (err) {
      set({ error: safeError(err, 'Failed to load events'), isLoading: false });
    }
  },

  createEvent: async (input) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = input.event_date;
      const endDate = input.sutak_enabled
        ? computeSutakEndDate(startDate, input.sutak_days)
        : null;

      const row = {
        created_by: user.id,
        event_type: input.event_type,
        person_name: input.person_name,
        person_name_hindi: input.person_name_hindi || null,
        event_date: input.event_date,
        relationship: input.relationship || null,
        baby_gender: input.baby_gender || null,
        birth_place: input.birth_place || null,
        age_at_death: input.age_at_death ?? null,
        sutak_enabled: input.sutak_enabled,
        sutak_days: input.sutak_days,
        sutak_start_date: input.sutak_enabled ? startDate : null,
        sutak_end_date: endDate,
        sutak_rules: input.sutak_rules,
        notes: input.notes || null,
        is_visible_to_family: input.is_visible_to_family,
      };

      const { data, error } = await supabase
        .from('life_events')
        .insert(row)
        .select()
        .single();

      if (error) throw error;

      set((s) => ({ events: [data as LifeEvent, ...s.events] }));
      return data as LifeEvent;
    } catch (err) {
      set({ error: safeError(err, 'Failed to save event') });
      return null;
    }
  },

  updateEvent: async (id, input) => {
    set({ error: null });
    try {
      const patch: Record<string, any> = { ...input };

      // Recompute sutak end date if relevant fields changed
      const existing = get().events.find((e) => e.id === id);
      if (existing) {
        const startDate = input.event_date ?? existing.event_date;
        const days = input.sutak_days ?? existing.sutak_days;
        const enabled = input.sutak_enabled ?? existing.sutak_enabled;
        patch.sutak_start_date = enabled ? startDate : null;
        patch.sutak_end_date = enabled ? computeSutakEndDate(startDate, days) : null;
      }

      const { error } = await supabase
        .from('life_events')
        .update(patch)
        .eq('id', id);

      if (error) throw error;

      set((s) => ({
        events: s.events.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'Failed to update event') });
      return false;
    }
  },

  deleteEvent: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('life_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'Failed to delete event') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
