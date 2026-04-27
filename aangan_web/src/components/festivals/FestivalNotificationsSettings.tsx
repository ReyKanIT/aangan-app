'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  INDIAN_STATES,
  reverseGeocodeToState,
  type SystemFestival,
} from '@/lib/festivals';
import { friendlyError } from '@/lib/errorMessages';

// ─────────────────────────────────────────────────────────────────────────────
// FestivalNotificationsSettings
//
// Per-user opt-in/out for each system festival + state picker (or "Use my
// location" via browser Geolocation → reverse-geocode to ISO 3166-2:IN
// state code via OpenStreetMap Nominatim, no API key required).
// ─────────────────────────────────────────────────────────────────────────────

interface PrefRow {
  id?: string;
  festival_id: string;
  opt_in: boolean;
  notify_days_before: number | null;
}

export default function FestivalNotificationsSettings() {
  const { user, fetchProfile } = useAuthStore();
  const [festivals, setFestivals] = useState<SystemFestival[]>([]);
  const [prefs, setPrefs] = useState<Map<string, PrefRow>>(new Map());
  const [stateCode, setStateCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState(false);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [missingTable, setMissingTable] = useState(false);

  useEffect(() => { setStateCode(user?.state_code ?? ''); }, [user?.state_code]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: fests, error: fErr }, { data: prefRows }] = await Promise.all([
        supabase.from('system_festivals').select('*').eq('is_active', true).order('date', { ascending: true }),
        supabase.from('user_festival_prefs').select('id, festival_id, opt_in, notify_days_before').eq('user_id', user.id),
      ]);
      if (fErr) {
        const msg = fErr.message || '';
        if (msg.includes('does not exist') || msg.includes('relation')) { setMissingTable(true); return; }
        throw fErr;
      }
      setFestivals((fests ?? []) as SystemFestival[]);
      const m = new Map<string, PrefRow>();
      for (const p of (prefRows ?? []) as PrefRow[]) m.set(p.festival_id, p);
      setPrefs(m);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Could not load festivals'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const saveState = async (newCode: string) => {
    if (!user) return;
    setSavingState(true);
    setError('');
    setSuccess('');
    try {
      const { error: upErr } = await supabase
        .from('users')
        .update({ state_code: newCode || null })
        .eq('id', user.id);
      if (upErr) throw upErr;
      setStateCode(newCode);
      setSuccess('राज्य सहेजा गया — State saved');
      await fetchProfile();
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Could not save state'));
    } finally {
      setSavingState(false);
    }
  };

  const useGps = async () => {
    if (!('geolocation' in navigator)) {
      setError('आपके ब्राउज़र में GPS नहीं — Geolocation not supported in this browser');
      return;
    }
    setGpsBusy(true);
    setError('');
    setSuccess('');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const detected = await reverseGeocodeToState(lat, lng);
      if (!detected) {
        setError('राज्य पहचान नहीं हुआ — Could not detect state from GPS. Please pick manually.');
        return;
      }
      // Save GPS coords + state
      if (user) {
        await supabase.from('users').update({ state_code: detected, gps_lat: lat, gps_lng: lng }).eq('id', user.id);
        setStateCode(detected);
        setSuccess(`राज्य पहचाना: ${INDIAN_STATES.find(s => s.code === detected)?.name_hi ?? detected}`);
        await fetchProfile();
      }
    } catch (e: unknown) {
      const msg = e instanceof GeolocationPositionError ? 'GPS access denied' : (e instanceof Error ? e.message : 'GPS failed');
      setError(friendlyError(msg));
    } finally {
      setGpsBusy(false);
    }
  };

  const togglePref = async (festivalId: string) => {
    if (!user) return;
    const existing = prefs.get(festivalId);
    const newOptIn = !(existing?.opt_in ?? true); // default state is opted-in
    setSavingPref(festivalId);
    setError('');
    try {
      if (existing?.id) {
        const { error: upErr } = await supabase
          .from('user_festival_prefs')
          .update({ opt_in: newOptIn })
          .eq('id', existing.id);
        if (upErr) throw upErr;
        setPrefs((prev) => new Map(prev).set(festivalId, { ...existing, opt_in: newOptIn }));
      } else {
        const { data: ins, error: insErr } = await supabase
          .from('user_festival_prefs')
          .insert({ user_id: user.id, festival_id: festivalId, opt_in: newOptIn })
          .select('id, festival_id, opt_in, notify_days_before')
          .single();
        if (insErr) throw insErr;
        if (ins) setPrefs((prev) => new Map(prev).set(festivalId, ins as PrefRow));
      }
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Could not save preference'));
    } finally {
      setSavingPref(null);
    }
  };

  if (missingTable) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 font-body text-base text-yellow-800">
        🛠️ त्योहार सूचना सेवा तैयार हो रही है — Festival notifications setup pending. Run migration <code>20260428_system_festivals.sql</code> in Supabase Studio to enable this.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 border border-haldi-gold/20 shadow-sm">
      <div className="mb-3">
        <h3 className="font-heading text-lg text-brown">🎉 त्योहार सूचनाएं</h3>
        <p className="font-body text-base text-brown-light">Festival Notifications</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 mb-3">
          <p className="font-body text-base text-error">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-mehndi-green rounded-xl px-4 py-3 mb-3">
          <p className="font-body text-base text-mehndi-green">✅ {success}</p>
        </div>
      )}

      {/* State picker */}
      <div className="mb-4 pb-4 border-b border-cream-dark">
        <label className="block font-body font-semibold text-brown mb-1">
          आपका राज्य <span className="text-brown-light text-sm font-normal">— Your State (for regional festivals)</span>
        </label>
        <p className="font-body text-base text-brown-light mb-2">
          Karwa Chauth, Chhath, Pongal जैसे क्षेत्रीय त्योहारों के लिए ज़रूरी
        </p>
        <div className="flex gap-2 flex-wrap">
          <select
            value={stateCode}
            onChange={(e) => saveState(e.target.value)}
            disabled={savingState}
            className="flex-1 min-w-[200px] border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base focus:border-haldi-gold focus:outline-none bg-white"
          >
            <option value="">राज्य चुनें — Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name_hi} — {s.name_en}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={useGps}
            disabled={gpsBusy}
            className="px-4 py-3 bg-mehndi-green/15 border-2 border-mehndi-green text-mehndi-green font-body font-semibold text-base rounded-xl min-h-dadi hover:bg-mehndi-green/25 transition-colors disabled:opacity-60"
          >
            {gpsBusy ? '⏳ खोज रहे...' : '📍 GPS से पता लगाएं'}
          </button>
        </div>
      </div>

      {/* Festival list with toggles */}
      {loading ? (
        <p className="font-body text-base text-brown-light py-4 text-center">लोड हो रहा है…</p>
      ) : festivals.length === 0 ? (
        <p className="font-body text-base text-brown-light py-4 text-center">कोई आगामी त्योहार नहीं — No upcoming festivals.</p>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {festivals.map((f) => {
            const pref = prefs.get(f.id);
            const optedIn = pref?.opt_in ?? true; // default is on
            const isRegional = f.region !== 'all-india';
            return (
              <li key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream/40 hover:bg-cream-dark/40 transition-colors">
                <span className="text-2xl shrink-0">{f.icon ?? '🎉'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-brown text-base truncate">
                    {f.name_hi} <span className="text-brown-light font-normal">— {f.name_en}</span>
                  </p>
                  <p className="font-body text-base text-brown-light">
                    {f.date}
                    {isRegional && <span className="ml-2 text-orange-700 text-sm">📍 क्षेत्रीय</span>}
                    <span className="ml-2 text-sm">{f.notify_days_before} दिन पहले</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => togglePref(f.id)}
                  disabled={savingPref === f.id}
                  className={`w-14 h-8 rounded-full transition-colors relative shrink-0 ${optedIn ? 'bg-mehndi-green' : 'bg-gray-300'} disabled:opacity-50`}
                  role="switch"
                  aria-checked={optedIn}
                  aria-label={`${f.name_en} reminder toggle`}
                >
                  <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${optedIn ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
