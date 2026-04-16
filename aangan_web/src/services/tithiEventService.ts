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
  // Sample at ~06:00 local (just after sunrise for most Indian latitudes)
  const atSunrise = new Date(date);
  atSunrise.setHours(6, 0, 0, 0);
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
  const cursor = new Date(from);
  cursor.setHours(6, 0, 0, 0);
  for (let i = 0; i < 730; i++) {
    const t = gregorianToTithi(cursor, location);
    if (
      t.tithiNumber === event.tithiNumber &&
      t.paksha === event.paksha &&
      t.masa === event.masa
    ) {
      return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/**
 * Upcoming events sorted by nearest first, within `daysAhead` window.
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
    const next = nextOccurrence(event, fromMidnight, location);
    if (!next) continue;
    if (next > horizon) continue;
    const daysAway = Math.round((next.getTime() - fromMidnight.getTime()) / 86400000);
    results.push({ event, date: next, daysAway });
  }
  return results.sort((a, b) => a.daysAway - b.daysAway);
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
