/**
 * Aangan Tithi Event Service
 * ─────────────────────────────────────────────────────────────────
 * Hindu tradition celebrates birthdays, anniversaries, and shraddha
 * by TITHI (lunar day) rather than Gregorian date. A person born on
 * "Krishna Ashtami of Bhadrapada" (Janmashtami) observes that day
 * every year — on a different Gregorian date each time.
 *
 * This service:
 *   • Converts Gregorian dates to (tithi, paksha, masa) tuples
 *   • Finds the next Gregorian date matching any tithi/paksha/masa
 *   • Stores events in localStorage (swap for Supabase once the
 *     `tithi_events` migration lands)
 *   • Matches today's panchang against stored events
 * ─────────────────────────────────────────────────────────────────
 */

import { getPanchang, DELHI, type PanchangLocation } from './panchangService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TithiEventType =
  | 'birthday'
  | 'anniversary'
  | 'shraddha'
  | 'festival'
  | 'other';

export interface TithiEvent {
  id: string;
  name: string;
  type: TithiEventType;
  /** 1–15 (Shukla Pratipada → Purnima) or 16–30 (Krishna Pratipada → Amavasya) */
  tithiNumber: number;
  paksha: 'shukla' | 'krishna';
  /** 1 = Chaitra, 2 = Vaishakha, …, 12 = Phalguna */
  masa: number;
  /** Optional: the original Gregorian date the event was derived from */
  gregorianReference?: string;
  createdAt: string;
  /** Optional: link to a family member ID (when we wire up DB) */
  personId?: string;
  /** Optional: display note */
  note?: string;
}

export interface UpcomingMatch {
  event: TithiEvent;
  date: Date;
  daysAway: number;
  /** Which calendar produced this match — 'tithi' for the lunar
   *  recurrence, 'gregorian' for the year-over-year English-date match. */
  calendarSource?: 'tithi' | 'gregorian';
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MASA_LIST: { num: number; hindi: string; english: string }[] = [
  { num: 1,  hindi: 'चैत्र',       english: 'Chaitra' },
  { num: 2,  hindi: 'वैशाख',      english: 'Vaishakha' },
  { num: 3,  hindi: 'ज्येष्ठ',     english: 'Jyeshtha' },
  { num: 4,  hindi: 'आषाढ़',      english: 'Ashadha' },
  { num: 5,  hindi: 'श्रावण',     english: 'Shravana' },
  { num: 6,  hindi: 'भाद्रपद',    english: 'Bhadrapada' },
  { num: 7,  hindi: 'आश्विन',    english: 'Ashwin' },
  { num: 8,  hindi: 'कार्तिक',    english: 'Kartik' },
  { num: 9,  hindi: 'मार्गशीर्ष', english: 'Margashirsha' },
  { num: 10, hindi: 'पौष',        english: 'Paush' },
  { num: 11, hindi: 'माघ',        english: 'Magha' },
  { num: 12, hindi: 'फाल्गुन',   english: 'Phalguna' },
];

const TITHI_SHUKLA: string[] = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
];
const TITHI_KRISHNA: string[] = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'अमावस्या',
];

export function tithiLabel(tithiNumber: number): string {
  if (tithiNumber >= 1 && tithiNumber <= 15) return TITHI_SHUKLA[tithiNumber - 1];
  if (tithiNumber >= 16 && tithiNumber <= 30) return TITHI_KRISHNA[tithiNumber - 16];
  return '';
}

export function masaLabel(masa: number): string {
  const m = MASA_LIST.find((x) => x.num === masa);
  return m ? `${m.hindi}` : '';
}

export function masaFromHindi(hindi: string): number {
  const m = MASA_LIST.find((x) => x.hindi === hindi);
  return m ? m.num : 1;
}

export function eventTypeLabel(type: TithiEventType): string {
  return {
    birthday: 'जन्मदिन',
    anniversary: 'सालगिरह',
    shraddha: 'श्राद्ध / बरसी',
    festival: 'त्योहार',
    other: 'अन्य',
  }[type];
}

// ─── Gregorian → Tithi conversion ─────────────────────────────────────────────

/**
 * Compute the tithi tuple for a given Gregorian date, sampled at sunrise IST.
 * Per Hindu convention, a civil day is named by the tithi current at sunrise.
 */
export function gregorianToTithi(
  date: Date,
  location: PanchangLocation = DELHI,
): { tithiNumber: number; paksha: 'shukla' | 'krishna'; masa: number; masaName: string } {
  // Sample at ~06:00 IST (just after sunrise for most Indian latitudes)
  // Use explicit IST construction to avoid browser-timezone mismatches
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const atSunrise = new Date(Date.UTC(y, m, d, 0, 30)); // 00:30 UTC = 06:00 IST
  const p = getPanchang(atSunrise, location);
  const paksha: 'shukla' | 'krishna' = p.tithiNumber <= 15 ? 'shukla' : 'krishna';
  const masa = masaFromHindi(p.maas);
  return { tithiNumber: p.tithiNumber, paksha, masa, masaName: p.maas };
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface CurrentPanchangMatch {
  tithiNumber: number;
  paksha: 'shukla' | 'krishna';
  masa: number;
}

/**
 * Does this event occur TODAY (at sunrise IST)?
 */
export function matchesToday(
  event: TithiEvent,
  today: Date = new Date(),
  location: PanchangLocation = DELHI,
): boolean {
  const t = gregorianToTithi(today, location);
  return (
    t.tithiNumber === event.tithiNumber &&
    t.paksha === event.paksha &&
    t.masa === event.masa
  );
}

/**
 * Find the next Gregorian date (at or after `from`) when this event's
 * tithi/paksha/masa recurs. Searches up to 2 years ahead to allow for
 * adhika (extra) masa years. Returns null if no match found.
 */
export function nextOccurrence(
  event: TithiEvent,
  from: Date = new Date(),
  location: PanchangLocation = DELHI,
): Date | null {
  // Use UTC-based cursor to avoid browser timezone drift
  const cursor = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate(), 0, 30)); // 00:30 UTC = 06:00 IST
  for (let i = 0; i < 730; i++) {
    const t = gregorianToTithi(cursor, location);
    if (
      t.tithiNumber === event.tithiNumber &&
      t.paksha === event.paksha &&
      t.masa === event.masa
    ) {
      return new Date(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return null;
}

/**
 * Find the next Gregorian-anniversary date (year-over-year on the same
 * month+day as the original `gregorianReference`). Returns null if the
 * event has no Gregorian reference set. Handles Feb 29 → Feb 28 fallback
 * in non-leap years.
 */
export function nextGregorianAnniversary(
  event: TithiEvent,
  from: Date = new Date(),
): Date | null {
  if (!event.gregorianReference) return null;
  const ref = new Date(event.gregorianReference + 'T00:00:00+05:30');
  if (Number.isNaN(ref.getTime())) return null;
  const refMonth = ref.getMonth();
  const refDay = ref.getDate();

  const fromMidnight = new Date(from);
  fromMidnight.setHours(0, 0, 0, 0);

  // Try this year first; if already past, roll to next year.
  for (let yearOffset = 0; yearOffset < 2; yearOffset++) {
    const year = fromMidnight.getFullYear() + yearOffset;
    let candidate = new Date(year, refMonth, refDay);
    // Feb 29 fallback to Feb 28 in non-leap years
    if (candidate.getMonth() !== refMonth) {
      candidate = new Date(year, refMonth, refDay - 1);
    }
    if (candidate >= fromMidnight) return candidate;
  }
  return null;
}

/**
 * Upcoming events sorted by nearest first, within `daysAhead` window.
 * For each event we emit BOTH the next tithi-anniversary and the next
 * Gregorian-anniversary (if the event has a `gregorianReference`).
 * Events with no match inside the window are excluded.
 */
export function upcoming(
  events: TithiEvent[],
  daysAhead = 60,
  from: Date = new Date(),
  location: PanchangLocation = DELHI,
): UpcomingMatch[] {
  const results: UpcomingMatch[] = [];
  const fromMidnight = new Date(from);
  fromMidnight.setHours(0, 0, 0, 0);
  const horizon = new Date(fromMidnight);
  horizon.setDate(horizon.getDate() + daysAhead);

  for (const event of events) {
    // Tithi-calendar match (always)
    const nextTithi = nextOccurrence(event, fromMidnight, location);
    if (nextTithi && nextTithi <= horizon) {
      const daysAway = Math.round((nextTithi.getTime() - fromMidnight.getTime()) / 86400000);
      results.push({ event, date: nextTithi, daysAway, calendarSource: 'tithi' });
    }
    // Gregorian-calendar match (only when reference date is set)
    const nextGreg = nextGregorianAnniversary(event, fromMidnight);
    if (nextGreg && nextGreg <= horizon) {
      const daysAway = Math.round((nextGreg.getTime() - fromMidnight.getTime()) / 86400000);
      // Avoid duplicate entry if both calendars resolve to the SAME day
      // (rare — only when birth year's tithi happens to land on the same
      // Gregorian month/day as the original date).
      const sameDayAsTithi = nextTithi && Math.abs(nextGreg.getTime() - nextTithi.getTime()) < 86400000;
      if (!sameDayAsTithi) {
        results.push({ event, date: nextGreg, daysAway, calendarSource: 'gregorian' });
      }
    }
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
}

// ─── Supabase storage (primary, when migration 20260428b is applied) ────────

import { supabase } from '@/lib/supabase/client';

interface TithiEventRow {
  id: string;
  user_id: string;
  person_id: string | null;
  name: string;
  type: TithiEventType;
  tithi_number: number;
  paksha: 'shukla' | 'krishna';
  masa: number;
  gregorian_ref: string | null;
  note: string | null;
  notify_days_before: number;
  is_active: boolean;
  created_at: string;
}

function rowToEvent(r: TithiEventRow): TithiEvent {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    tithiNumber: r.tithi_number,
    paksha: r.paksha,
    masa: r.masa,
    gregorianReference: r.gregorian_ref ?? undefined,
    note: r.note ?? undefined,
    personId: r.person_id ?? undefined,
    createdAt: r.created_at,
  };
}

/**
 * Load events from Supabase (returns null if the table does not exist
 * yet — caller falls back to localStorage in that case).
 */
export async function loadEventsFromSupabase(): Promise<TithiEvent[] | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data, error } = await supabase
      .from('tithi_events')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('does not exist') || msg.includes('relation') || error.code === '42P01') return null;
      throw error;
    }
    return ((data ?? []) as TithiEventRow[]).map(rowToEvent);
  } catch {
    return null;
  }
}

export async function addEventToSupabase(
  draft: Omit<TithiEvent, 'id' | 'createdAt'>,
): Promise<TithiEvent | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase
    .from('tithi_events')
    .insert({
      user_id: session.user.id,
      person_id: draft.personId ?? null,
      name: draft.name,
      type: draft.type,
      tithi_number: draft.tithiNumber,
      paksha: draft.paksha,
      masa: draft.masa,
      gregorian_ref: draft.gregorianReference ?? null,
      note: draft.note ?? null,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToEvent(data as TithiEventRow);
}

export async function deleteEventFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase.from('tithi_events').delete().eq('id', id);
  return !error;
}

/**
 * Best-effort migration: if there are localStorage events but the
 * Supabase table is now reachable, push them up so the user keeps their
 * data when the cron starts firing notifications. Idempotent — events
 * already in Supabase are not duplicated (matched by name+tithi tuple).
 */
export async function migrateLocalToSupabase(): Promise<{ migrated: number; skipped: number } | null> {
  const local = loadEvents();
  if (local.length === 0) return { migrated: 0, skipped: 0 };
  const remote = await loadEventsFromSupabase();
  if (remote === null) return null; // table not ready
  const remoteKeys = new Set(remote.map((e) => `${e.name}|${e.tithiNumber}|${e.paksha}|${e.masa}`));
  let migrated = 0;
  let skipped = 0;
  for (const e of local) {
    const key = `${e.name}|${e.tithiNumber}|${e.paksha}|${e.masa}`;
    if (remoteKeys.has(key)) { skipped++; continue; }
    const inserted = await addEventToSupabase({
      name: e.name, type: e.type, tithiNumber: e.tithiNumber,
      paksha: e.paksha, masa: e.masa,
      gregorianReference: e.gregorianReference, note: e.note, personId: e.personId,
    });
    if (inserted) migrated++;
  }
  return { migrated, skipped };
}

// ─── Storage (localStorage MVP) ───────────────────────────────────────────────

const STORAGE_KEY = 'aangan:tithi-events:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function loadEvents(): TithiEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TithiEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: TithiEvent[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function addEvent(
  draft: Omit<TithiEvent, 'id' | 'createdAt'>,
): TithiEvent {
  const event: TithiEvent = {
    ...draft,
    id: `te_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const current = loadEvents();
  current.push(event);
  saveEvents(current);
  return event;
}

export function updateEvent(id: string, patch: Partial<TithiEvent>): TithiEvent | null {
  const current = loadEvents();
  const idx = current.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  current[idx] = { ...current[idx], ...patch, id: current[idx].id, createdAt: current[idx].createdAt };
  saveEvents(current);
  return current[idx];
}

export function deleteEvent(id: string): boolean {
  const current = loadEvents();
  const next = current.filter((e) => e.id !== id);
  if (next.length === current.length) return false;
  saveEvents(next);
  return true;
}

/**
 * Helper: build an event from a Gregorian reference date.
 * Automatically computes tithi/paksha/masa.
 */
export function buildEventFromGregorian(
  name: string,
  type: TithiEventType,
  gregorianDate: Date,
  extras: { note?: string; personId?: string } = {},
): Omit<TithiEvent, 'id' | 'createdAt'> {
  const t = gregorianToTithi(gregorianDate);
  return {
    name,
    type,
    tithiNumber: t.tithiNumber,
    paksha: t.paksha,
    masa: t.masa,
    gregorianReference: gregorianDate.toISOString().slice(0, 10),
    ...extras,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatEventLabel(event: TithiEvent): string {
  const pakshaLabel = event.paksha === 'shukla' ? 'शुक्ल' : 'कृष्ण';
  return `${masaLabel(event.masa)} ${pakshaLabel} ${tithiLabel(event.tithiNumber)}`;
}

export function formatRelativeDate(date: Date, from: Date = new Date()): string {
  const midnight = new Date(from);
  midnight.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - midnight.getTime()) / 86400000);
  if (days === 0) return 'आज / Today';
  if (days === 1) return 'कल / Tomorrow';
  if (days < 7)  return `${days} दिन बाद / in ${days} days`;
  if (days < 30) return `${Math.round(days / 7)} हफ़्ते बाद / in ${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} महीने बाद / in ${Math.round(days / 30)} months`;
}
