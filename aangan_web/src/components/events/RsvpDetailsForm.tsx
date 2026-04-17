'use client';
import { useEffect, useState } from 'react';
import { useEventStore } from '@/stores/eventStore';
import type { EventRsvp } from '@/types/database';

interface Props {
  eventId: string;
  myRsvp: EventRsvp | undefined;
}

/**
 * RsvpDetailsForm — Lets a guest attach headcount + a note once they've said
 * "going" or "maybe". Hidden when status is "not_going" (no point asking).
 * Note is the critical field — families use it for "Ram will bring sweets",
 * "reaching at 7pm", dietary stuff, congratulations.
 */
export default function RsvpDetailsForm({ eventId, myRsvp }: Props) {
  const { submitRsvp } = useEventStore();
  const [guests, setGuests] = useState(myRsvp?.guests_count ?? 0);
  const [note, setNote] = useState(myRsvp?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync local state when server RSVP changes (e.g. submitting status flips).
  useEffect(() => {
    setGuests(myRsvp?.guests_count ?? 0);
    setNote(myRsvp?.note ?? '');
  }, [myRsvp?.id, myRsvp?.guests_count, myRsvp?.note]);

  if (!myRsvp || myRsvp.status === 'not_going') return null;

  const canSave =
    (guests !== (myRsvp.guests_count ?? 0) || note.trim() !== (myRsvp.note ?? '')) && !saving;

  const handleSave = async () => {
    setSaving(true);
    const ok = await submitRsvp(eventId, myRsvp.status, {
      guests_count: guests,
      note: note.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div>
        <label className="block font-body font-semibold text-brown mb-1">
          कितने लोग? <span className="text-brown-light text-sm font-normal">How many with you?</span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuests(Math.max(0, guests - 1))}
            className="w-12 h-12 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark text-2xl font-semibold hover:bg-unread-bg transition-colors"
            aria-label="कम करें"
          >−</button>
          <span className="font-body text-xl font-semibold text-brown min-w-[3ch] text-center">
            {guests === 0 ? 'सिर्फ़ मैं' : `+${guests}`}
          </span>
          <button
            type="button"
            onClick={() => setGuests(guests + 1)}
            className="w-12 h-12 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark text-2xl font-semibold hover:bg-unread-bg transition-colors"
            aria-label="बढ़ाएं"
          >+</button>
        </div>
      </div>

      <div>
        <label className="block font-body font-semibold text-brown mb-1">
          संदेश <span className="text-brown-light text-sm font-normal">Your note for the host</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="जैसे — बहुत खुशी हुई! 7 बजे पहुँचेंगे।"
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="min-h-dadi px-5 rounded-xl bg-haldi-gold text-white font-body font-semibold text-base hover:bg-haldi-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '…' : 'सेव करें'}
        </button>
        {savedAt && (
          <span className="font-body text-base text-green-600">✓ सेव हो गया</span>
        )}
      </div>
    </div>
  );
}
