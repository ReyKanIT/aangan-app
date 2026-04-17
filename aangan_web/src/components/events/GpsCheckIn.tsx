'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { AanganEvent } from '@/types/database';

interface Props {
  event: AanganEvent;
  userId: string | undefined;
}

interface Checkin {
  id: string;
  checkin_type: 'gps' | 'manual' | 'qr';
  accuracy_meters: number | null;
  checked_in_at: string;
}

// Haversine distance in meters
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

const CHECKIN_RADIUS_METERS = 300;

/**
 * GpsCheckIn — One-tap "I've arrived" for event day. If the event has
 * coordinates and the guest is within 300m, it auto-confirms attendance
 * (checkin_type='gps'). Outside the radius, falls back to manual confirm
 * with an explicit warning so we don't silently reject Dadi at the gate.
 */
export default function GpsCheckIn({ event, userId }: Props) {
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Only show check-in on event day (± 12 hours around start time)
  const isEventDay = (() => {
    const start = new Date(event.start_datetime).getTime();
    const now = Date.now();
    return now > start - 12 * 60 * 60 * 1000 && now < start + 12 * 60 * 60 * 1000;
  })();

  useEffect(() => {
    if (!userId || !isEventDay) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('event_checkins')
        .select('id, checkin_type, accuracy_meters, checked_in_at')
        .eq('event_id', event.id)
        .eq('user_id', userId)
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setExistingCheckin(data as Checkin);
    })();
    return () => { cancelled = true; };
  }, [event.id, userId, isEventDay]);

  if (!isEventDay || !userId) return null;

  const handleCheckIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsWorking(true);

    // If event has no coordinates, fall through to manual check-in
    const eventLat = (event as unknown as { latitude?: number | null }).latitude;
    const eventLng = (event as unknown as { longitude?: number | null }).longitude;

    const saveCheckin = async (type: 'gps' | 'manual', lat?: number, lng?: number, accuracy?: number) => {
      const { error: dbErr } = await supabase.from('event_checkins').insert({
        event_id: event.id,
        user_id: userId,
        checkin_type: type,
        latitude: lat ?? null,
        longitude: lng ?? null,
        accuracy_meters: accuracy ?? null,
        checked_in_at: new Date().toISOString(),
      });
      if (dbErr) { setError(dbErr.message); return false; }
      return true;
    };

    if (eventLat == null || eventLng == null) {
      const ok = await saveCheckin('manual');
      if (ok) {
        setSuccessMsg('✓ मैन्युअल चेक-इन हो गया');
        setExistingCheckin({ id: 'temp', checkin_type: 'manual', accuracy_meters: null, checked_in_at: new Date().toISOString() });
      }
      setIsWorking(false);
      return;
    }

    if (!navigator.geolocation) {
      const ok = await saveCheckin('manual');
      if (ok) { setSuccessMsg('✓ मैन्युअल चेक-इन हो गया (GPS उपलब्ध नहीं)'); }
      setIsWorking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = distanceMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { lat: eventLat, lng: eventLng },
        );
        if (dist <= CHECKIN_RADIUS_METERS + pos.coords.accuracy) {
          const ok = await saveCheckin('gps', pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          if (ok) {
            setSuccessMsg(`✓ पहुँच गए! ${Math.round(dist)}m`);
            setExistingCheckin({ id: 'temp', checkin_type: 'gps', accuracy_meters: pos.coords.accuracy, checked_in_at: new Date().toISOString() });
          }
        } else {
          setError(`आप अभी इवेंट स्थान से ${Math.round(dist)}m दूर हैं। करीब पहुँच कर दोबारा कोशिश करें या मैन्युअल बटन दबाएं।`);
        }
        setIsWorking(false);
      },
      async (geoErr) => {
        setError(`GPS नहीं मिला: ${geoErr.message}`);
        setIsWorking(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const handleManual = async () => {
    if (!userId) return;
    setError(null);
    setIsWorking(true);
    const { error: dbErr } = await supabase.from('event_checkins').insert({
      event_id: event.id,
      user_id: userId,
      checkin_type: 'manual',
      checked_in_at: new Date().toISOString(),
    });
    if (!dbErr) {
      setSuccessMsg('✓ मैन्युअल चेक-इन हो गया');
      setExistingCheckin({ id: 'temp', checkin_type: 'manual', accuracy_meters: null, checked_in_at: new Date().toISOString() });
    } else {
      setError(dbErr.message);
    }
    setIsWorking(false);
  };

  if (existingCheckin) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
        <p className="font-body text-base text-green-700 font-semibold">
          ✓ आप पहुँच चुके हैं — You&rsquo;ve checked in
        </p>
        <p className="font-body text-sm text-green-600 mt-1">
          {existingCheckin.checkin_type === 'gps' ? '📍 GPS से' : existingCheckin.checkin_type === 'qr' ? 'QR कोड से' : 'मैन्युअल'} · {new Date(existingCheckin.checked_in_at).toLocaleTimeString('hi-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
      <h3 className="font-heading text-lg text-brown mb-1">पहुँच गए? — Arrived?</h3>
      <p className="font-body text-sm text-brown-light mb-4">एक टैप में चेक-इन करें</p>

      {error && <p className="font-body text-base text-error mb-3">{error}</p>}
      {successMsg && <p className="font-body text-base text-green-600 mb-3">{successMsg}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleCheckIn}
          disabled={isWorking}
          className="flex-1 min-h-dadi rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark transition-colors disabled:opacity-60"
        >
          {isWorking ? '…' : '📍 मैं पहुँच गया/गई'}
        </button>
        <button
          onClick={handleManual}
          disabled={isWorking}
          className="min-h-dadi px-4 rounded-xl bg-white border-2 border-haldi-gold text-haldi-gold-dark font-body font-semibold text-base hover:bg-unread-bg transition-colors disabled:opacity-60"
        >
          मैन्युअल
        </button>
      </div>
    </div>
  );
}
