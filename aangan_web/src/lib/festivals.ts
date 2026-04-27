// ─────────────────────────────────────────────────────────────────────────────
// Festival helpers — shared by the panchang-nudge cron, the home "Next
// Festival" banner, and the settings page. The DB is the source of truth
// (system_festivals table seeded by migration 20260428_system_festivals.sql).
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SystemFestival {
  id: string;
  name_en: string;
  name_hi: string;
  date: string;            // YYYY-MM-DD
  region: string;          // 'all-india' or comma-separated 'IN-MH,IN-GJ' ...
  importance: 'major' | 'medium' | 'minor';
  icon: string | null;
  notify_days_before: number;
  description_en: string | null;
  description_hi: string | null;
  is_active: boolean;
}

export interface UserFestivalPref {
  festival_id: string;
  opt_in: boolean;
  notify_days_before: number | null;
}

// ── Indian states (ISO 3166-2:IN) ───────────────────────────────────────────

export interface IndianState {
  code: string;
  name_en: string;
  name_hi: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: 'IN-AN', name_en: 'Andaman & Nicobar Islands', name_hi: 'अंडमान निकोबार' },
  { code: 'IN-AP', name_en: 'Andhra Pradesh',            name_hi: 'आंध्र प्रदेश' },
  { code: 'IN-AR', name_en: 'Arunachal Pradesh',         name_hi: 'अरुणाचल प्रदेश' },
  { code: 'IN-AS', name_en: 'Assam',                     name_hi: 'असम' },
  { code: 'IN-BR', name_en: 'Bihar',                     name_hi: 'बिहार' },
  { code: 'IN-CH', name_en: 'Chandigarh',                name_hi: 'चंडीगढ़' },
  { code: 'IN-CT', name_en: 'Chhattisgarh',              name_hi: 'छत्तीसगढ़' },
  { code: 'IN-DN', name_en: 'Dadra & Nagar Haveli',      name_hi: 'दादरा नगर हवेली' },
  { code: 'IN-DD', name_en: 'Daman & Diu',               name_hi: 'दमन दीव' },
  { code: 'IN-DL', name_en: 'Delhi',                     name_hi: 'दिल्ली' },
  { code: 'IN-GA', name_en: 'Goa',                       name_hi: 'गोवा' },
  { code: 'IN-GJ', name_en: 'Gujarat',                   name_hi: 'गुजरात' },
  { code: 'IN-HR', name_en: 'Haryana',                   name_hi: 'हरियाणा' },
  { code: 'IN-HP', name_en: 'Himachal Pradesh',          name_hi: 'हिमाचल प्रदेश' },
  { code: 'IN-JK', name_en: 'Jammu & Kashmir',           name_hi: 'जम्मू कश्मीर' },
  { code: 'IN-JH', name_en: 'Jharkhand',                 name_hi: 'झारखंड' },
  { code: 'IN-KA', name_en: 'Karnataka',                 name_hi: 'कर्नाटक' },
  { code: 'IN-KL', name_en: 'Kerala',                    name_hi: 'केरल' },
  { code: 'IN-LA', name_en: 'Ladakh',                    name_hi: 'लद्दाख' },
  { code: 'IN-LD', name_en: 'Lakshadweep',               name_hi: 'लक्षद्वीप' },
  { code: 'IN-MP', name_en: 'Madhya Pradesh',            name_hi: 'मध्य प्रदेश' },
  { code: 'IN-MH', name_en: 'Maharashtra',               name_hi: 'महाराष्ट्र' },
  { code: 'IN-MN', name_en: 'Manipur',                   name_hi: 'मणिपुर' },
  { code: 'IN-ML', name_en: 'Meghalaya',                 name_hi: 'मेघालय' },
  { code: 'IN-MZ', name_en: 'Mizoram',                   name_hi: 'मिज़ोरम' },
  { code: 'IN-NL', name_en: 'Nagaland',                  name_hi: 'नागालैंड' },
  { code: 'IN-OR', name_en: 'Odisha',                    name_hi: 'ओडिशा' },
  { code: 'IN-PY', name_en: 'Puducherry',                name_hi: 'पुडुचेरी' },
  { code: 'IN-PB', name_en: 'Punjab',                    name_hi: 'पंजाब' },
  { code: 'IN-RJ', name_en: 'Rajasthan',                 name_hi: 'राजस्थान' },
  { code: 'IN-SK', name_en: 'Sikkim',                    name_hi: 'सिक्किम' },
  { code: 'IN-TN', name_en: 'Tamil Nadu',                name_hi: 'तमिलनाडु' },
  { code: 'IN-TG', name_en: 'Telangana',                 name_hi: 'तेलंगाना' },
  { code: 'IN-TR', name_en: 'Tripura',                   name_hi: 'त्रिपुरा' },
  { code: 'IN-UP', name_en: 'Uttar Pradesh',             name_hi: 'उत्तर प्रदेश' },
  { code: 'IN-UT', name_en: 'Uttarakhand',               name_hi: 'उत्तराखंड' },
  { code: 'IN-WB', name_en: 'West Bengal',               name_hi: 'पश्चिम बंगाल' },
];

export function stateLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const s = INDIAN_STATES.find((s) => s.code === code);
  return s ? `${s.name_hi} — ${s.name_en}` : code;
}

// ── Region match: returns true if a festival applies to the user's state ────

export function festivalAppliesToState(festivalRegion: string, userStateCode: string | null | undefined): boolean {
  if (festivalRegion === 'all-india') return true;
  if (!userStateCode) return false; // regional festival, user has no state set → don't notify
  return festivalRegion.split(',').map((s) => s.trim()).includes(userStateCode);
}

// ── Date math (IST) ─────────────────────────────────────────────────────────

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + 'T00:00:00+05:30').getTime();
  const b = new Date(toYmd + 'T00:00:00+05:30').getTime();
  return Math.round((b - a) / 86400000);
}

// ── Reverse-geocode GPS → state code via OpenStreetMap Nominatim (no key) ───

export async function reverseGeocodeToState(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=5`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const stateName: string | undefined = data?.address?.state;
    if (!stateName) return null;
    // Match against INDIAN_STATES by name (case-insensitive, loose)
    const norm = stateName.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and');
    const match = INDIAN_STATES.find((s) =>
      s.name_en.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and') === norm
    );
    return match?.code ?? null;
  } catch {
    return null;
  }
}

// ── Fetch the next upcoming festival for a user (used by the home banner) ───
//
// "Next" = soonest active festival within `withinDays` that:
//  - matches the user's state (or is all-india)
//  - is NOT opted out by the user
//
// Returns null if nothing is upcoming.

export async function getNextFestivalForUser(
  supabase: SupabaseClient,
  user: { id: string; state_code: string | null },
  withinDays = 14
): Promise<{ festival: SystemFestival; daysUntil: number } | null> {
  const todayIST = istDateStr();
  const horizon = addDaysIST(todayIST, withinDays);

  const [{ data: festivals }, { data: prefs }] = await Promise.all([
    supabase
      .from('system_festivals')
      .select('*')
      .eq('is_active', true)
      .gte('date', todayIST)
      .lte('date', horizon)
      .order('date', { ascending: true }),
    supabase
      .from('user_festival_prefs')
      .select('festival_id, opt_in, notify_days_before')
      .eq('user_id', user.id)
      .eq('opt_in', false),
  ]);

  if (!festivals || festivals.length === 0) return null;
  const optedOut = new Set((prefs ?? []).map((p) => p.festival_id));

  for (const f of festivals as SystemFestival[]) {
    if (optedOut.has(f.id)) continue;
    if (!festivalAppliesToState(f.region, user.state_code)) continue;
    return { festival: f, daysUntil: daysBetween(todayIST, f.date) };
  }
  return null;
}

export function istDateStr(date = new Date()): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const istMs = utcMs + 330 * 60 * 1000;
  const ist = new Date(istMs);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIST(ymd: string, days: number): string {
  const ms = new Date(ymd + 'T00:00:00+05:30').getTime() + days * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
