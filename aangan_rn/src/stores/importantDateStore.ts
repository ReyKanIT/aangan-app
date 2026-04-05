import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { safeError } from '../utils/security';

export type ImportantDateCategory = 'birthday' | 'anniversary' | 'barsi' | 'puja' | 'other';

export interface ImportantDate {
  id: string;
  created_by: string;
  category: ImportantDateCategory;
  person_name: string;
  person_name_hindi: string | null;
  event_month: number;   // 1–12
  event_day: number;     // 1–31
  event_year: number | null;
  notify_days_before: number[];
  notify_family: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateImportantDateInput {
  category: ImportantDateCategory;
  person_name: string;
  person_name_hindi?: string;
  event_month: number;
  event_day: number;
  event_year?: number;
  notify_days_before: number[];
  notify_family: boolean;
  notes?: string;
}

/** Returns upcoming dates sorted by days until next occurrence */
export function daysUntilNext(date: ImportantDate): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), date.event_month - 1, date.event_day);
  if (target < today) target = new Date(now.getFullYear() + 1, date.event_month - 1, date.event_day);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatEventDate(month: number, day: number, year?: number | null): string {
  const MONTHS_HI = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  const m = MONTHS_HI[month - 1] ?? '';
  return year ? `${day} ${m} ${year}` : `${day} ${m}`;
}

export const CATEGORY_META: Record<ImportantDateCategory, { hi: string; en: string; emoji: string }> = {
  birthday:    { hi: 'जन्मदिन',        en: 'Birthday',          emoji: '🎂' },
  anniversary: { hi: 'सालगिरह',        en: 'Anniversary',       emoji: '💑' },
  barsi:       { hi: 'बरसी',           en: 'Death Anniversary', emoji: '🪔' },
  puja:        { hi: 'वार्षिक पूजा',   en: 'Annual Puja',       emoji: '🙏' },
  other:       { hi: 'अन्य',           en: 'Other',             emoji: '⭐' },
};

interface ImportantDateState {
  dates: ImportantDate[];
  isLoading: boolean;
  error: string | null;

  fetchDates: () => Promise<void>;
  createDate: (input: CreateImportantDateInput) => Promise<ImportantDate | null>;
  updateDate: (id: string, input: Partial<CreateImportantDateInput>) => Promise<boolean>;
  deleteDate: (id: string) => Promise<boolean>;
  toggleActive: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useImportantDateStore = create<ImportantDateState>((set, get) => ({
  dates: [],
  isLoading: false,
  error: null,

  fetchDates: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('family_important_dates')
        .select('*')
        .order('event_month')
        .order('event_day');
      if (error) throw error;
      set({ dates: (data as ImportantDate[]) ?? [], isLoading: false });
    } catch (err) {
      set({ error: safeError(err, 'Failed to load dates'), isLoading: false });
    }
  },

  createDate: async (input) => {
    set({ error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('family_important_dates')
        .insert({
          created_by: user.id,
          category: input.category,
          person_name: input.person_name,
          person_name_hindi: input.person_name_hindi || null,
          event_month: input.event_month,
          event_day: input.event_day,
          event_year: input.event_year ?? null,
          notify_days_before: input.notify_days_before,
          notify_family: input.notify_family,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      set((s) => ({ dates: [...s.dates, data as ImportantDate].sort((a, b) => a.event_month - b.event_month || a.event_day - b.event_day) }));
      return data as ImportantDate;
    } catch (err) {
      set({ error: safeError(err, 'Failed to save date') });
      return null;
    }
  },

  updateDate: async (id, input) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('family_important_dates')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      set((s) => ({ dates: s.dates.map((d) => d.id === id ? { ...d, ...input } : d) }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'Failed to update date') });
      return false;
    }
  },

  deleteDate: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase.from('family_important_dates').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ dates: s.dates.filter((d) => d.id !== id) }));
      return true;
    } catch (err) {
      set({ error: safeError(err, 'Failed to delete date') });
      return false;
    }
  },

  toggleActive: async (id) => {
    const date = get().dates.find((d) => d.id === id);
    if (!date) return;
    // Optimistic UI update first, then persist via direct Supabase call
    set((s) => ({
      dates: s.dates.map((d) => d.id === id ? { ...d, is_active: !d.is_active } : d),
    }));
    await supabase
      .from('family_important_dates')
      .update({ is_active: !date.is_active, updated_at: new Date().toISOString() })
      .eq('id', id);
  },

  clearError: () => set({ error: null }),
}));
