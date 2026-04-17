'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AvatarCircle from '@/components/ui/AvatarCircle';
import type { EventRsvp } from '@/types/database';

interface PhysicalCard {
  event_id: string;
  user_id: string;
  card_sent: boolean;
  sent_via: 'hand' | 'post' | 'courier' | null;
  sent_at: string | null;
}

interface Props {
  eventId: string;
  rsvps: EventRsvp[];
}

/**
 * PhysicalCardTracker — In Indian family events, the printed invitation card
 * is the real invite; the app RSVP is a bonus. Creators need a checklist to
 * track who got a card in hand (हाथ से) vs by post vs courier, so no one
 * important is forgotten.
 */
export default function PhysicalCardTracker({ eventId, rsvps }: Props) {
  const [cards, setCards] = useState<Record<string, PhysicalCard>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('physical_cards')
        .select('event_id, user_id, card_sent, sent_via, sent_at')
        .eq('event_id', eventId);
      if (!cancelled && data) {
        const map: Record<string, PhysicalCard> = {};
        for (const c of data as PhysicalCard[]) map[c.user_id] = c;
        setCards(map);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const toggleCard = async (userId: string, via: 'hand' | 'post' | 'courier') => {
    setSaving(userId);
    const existing = cards[userId];
    const nextSent = !(existing?.card_sent && existing?.sent_via === via);
    const payload = {
      event_id: eventId,
      user_id: userId,
      card_sent: nextSent,
      sent_via: nextSent ? via : null,
      sent_at: nextSent ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from('physical_cards')
      .upsert(payload, { onConflict: 'event_id,user_id' });
    if (!error) {
      setCards((prev) => ({ ...prev, [userId]: payload as PhysicalCard }));
    }
    setSaving(null);
  };

  const totalSent = Object.values(cards).filter((c) => c.card_sent).length;

  if (rsvps.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-heading text-lg text-brown">कार्ड ट्रैकर — Invite Card Tracker</h3>
        <span className="font-body text-sm text-brown-light">{totalSent}/{rsvps.length}</span>
      </div>
      <p className="font-body text-sm text-brown-light mb-4">किसको कार्ड दिया? — Who received their physical card?</p>

      <div className="space-y-3">
        {rsvps.map((r) => {
          const card = cards[r.user_id];
          const isSaving = saving === r.user_id;
          return (
            <div key={r.id} className="flex items-center gap-3 flex-wrap">
              <AvatarCircle src={r.user?.avatar_url} name={r.user?.display_name_hindi ?? r.user?.display_name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="font-body text-base font-semibold text-brown truncate">{r.user?.display_name_hindi ?? r.user?.display_name}</p>
                {card?.card_sent && card.sent_at && (
                  <p className="font-body text-xs text-green-600">
                    ✓ {card.sent_via === 'hand' ? 'हाथ से' : card.sent_via === 'post' ? 'पोस्ट से' : 'कूरियर से'} · {new Date(card.sent_at).toLocaleDateString('hi-IN')}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {(['hand', 'post', 'courier'] as const).map((via) => {
                  const label = via === 'hand' ? '🖐️ हाथ' : via === 'post' ? '📮 पोस्ट' : '📦 कूरियर';
                  const isActive = card?.card_sent && card?.sent_via === via;
                  return (
                    <button
                      key={via}
                      onClick={() => toggleCard(r.user_id, via)}
                      disabled={isSaving}
                      className={`min-h-dadi px-3 rounded-lg border-2 font-body text-sm font-semibold transition-colors disabled:opacity-50 ${isActive ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-brown hover:border-haldi-gold'}`}
                      aria-pressed={isActive}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
