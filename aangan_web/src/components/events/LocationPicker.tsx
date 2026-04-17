'use client';
import { useState } from 'react';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

/**
 * LocationPicker — Compact GPS capture. Used in event creator/editor so guests
 * can later check in. Optional — events without GPS fall back to manual check-in.
 */
export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCoords = latitude != null && longitude != null;

  const capture = () => {
    if (!navigator.geolocation) {
      setError('GPS उपलब्ध नहीं');
      return;
    }
    setError(null);
    setWorking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setWorking(false);
      },
      (err) => {
        setError(err.message);
        setWorking(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <div className="mb-4">
      <label className="block font-body font-semibold text-brown mb-1">
        GPS लोकेशन <span className="text-brown-light text-sm font-normal">Optional — for auto check-in</span>
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={capture}
          disabled={working}
          className="min-h-dadi px-4 rounded-xl bg-white border-2 border-haldi-gold text-haldi-gold-dark font-body font-semibold text-base hover:bg-unread-bg transition-colors disabled:opacity-60"
        >
          {working ? '…' : hasCoords ? '📍 दोबारा पकड़ें' : '📍 यहाँ है — Tag current location'}
        </button>
        {hasCoords && (
          <>
            <span className="font-body text-sm text-green-600">
              ✓ {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="font-body text-sm text-brown-light underline"
            >
              हटाएं
            </button>
          </>
        )}
      </div>
      {error && <p className="font-body text-sm text-error mt-1">{error}</p>}
    </div>
  );
}
