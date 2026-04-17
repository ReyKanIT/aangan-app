'use client';
import { useEffect, useState } from 'react';
import { useEventStore } from '@/stores/eventStore';
import type { EventRsvp } from '@/types/database';

interface Props {
  eventId: string;
  myRsvp: EventRsvp | undefined;
}

const QUICK_COUNTS = [
  { value: 0, label: 'सिर्फ़ मैं', sub: 'Just me' },
  { value: 1, label: '2 लोग', sub: 'With 1' },
  { value: 3, label: '4 लोग', sub: 'Family of 4' },
  { value: 5, label: '6 लोग', sub: 'Family of 6' },
];

/**
 * RsvpDetailsForm — Lets guests RSVP "with family" (Indian wedding convention
 * where whole households are invited under one name). Quick-pick counts handle
 * the 80% case; names textarea captures "Ram, Sita, बच्चे" free-form.
 */
export default function RsvpDetailsForm({ eventId, myRsvp }: Props) {
  const { submitRsvp } = useEventStore();
  const [guests, setGuests] = useState(myRsvp?.guests_count ?? 0);
  const [note, setNote] = useState(myRsvp?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
        <label className="block font-body font-semibold text-brown mb-2">
          कितने लोग आ रहे हैं? <span className="text-brown-light text-sm font-normal">How many coming? (family invite)</span>
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {QUICK_COUNTS.map((q) => {
            const isActive = guests === q.value;
            return (
              <button
                key={q.value}
                type="button"
                onClick={() => setGuests(q.value)}
                className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center min-h-dadi transition-all ${isActive ? 'border-haldi-gold bg-unread-bg' : 'border-gray-200 hover:border-haldi-gold-light'}`}
              >
                <span className="font-body text-base font-semibold text-brown">{q.label}</span>
                <span className="font-body text-xs text-brown-light">{q.sub}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuests(Math.max(0, guests - 1))}
            className="w-12 h-12 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark text-2xl font-semibold hover:bg-unread-bg transition-colors"
            aria-label="कम करें"
          >−</button>
          <span className="font-body text-xl font-semibold text-brown min-w-[7ch] text-center">
            {guests === 0 ? 'सिर्फ़ मैं' : `मैं +${guests}`}
          </span>
          <button
            type="button"
            onClick={() => setGuests(guests + 1)}
            className="w-12 h-12 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark text-2xl font-semibold hover:bg-unread-bg transition-colors"
            aria-label="बढ़ाएं"
          >+</button>
          <span className="font-body text-sm text-brown-light">अपने हिसाब से / custom</span>
        </div>
      </div>

      <div>
        <label className="block font-body font-semibold text-brown mb-1">
          मेहमानों के नाम या संदेश <span className="text-brown-light text-sm font-normal">Guest names or note</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="जैसे — श्री राम, श्रीमती सीता, बच्चे · 7 बजे पहुँचेंगे"
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 font-body text-base text-brown focus:border-haldi-gold focus:outline-none resize-none"
        />
        <p className="font-body text-xs text-brown-light mt-1">मेज़बान देखेंगे — Visible to the host</p>
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
