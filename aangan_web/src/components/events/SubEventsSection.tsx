'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatEventDate, formatEventTime } from '@/lib/utils/formatters';
import { EVENT_TYPES } from '@/lib/constants';
import type { AanganEvent } from '@/types/database';

interface Props {
  parentEvent: AanganEvent;
  canManage: boolean;
  onAddSubEvent: () => void;
}

/**
 * SubEventsSection — Indian weddings aren't one event, they're a series:
 * Tilak → Haldi → Mehndi → Sangeet → Wedding → Reception. This renders the
 * child events as a vertical timeline so the whole series fits on one page.
 */
export default function SubEventsSection({ parentEvent, canManage, onAddSubEvent }: Props) {
  const [subs, setSubs] = useState<AanganEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('parent_event_id', parentEvent.id)
        .order('start_datetime', { ascending: true });
      if (!cancelled) {
        // 42703 = column does not exist (pre-migration); treat as "no sub-events"
        if (error?.code !== '42703') setSubs((data ?? []) as AanganEvent[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [parentEvent.id]);

  // Don't render anything if this IS already a sub-event (avoid recursion rabbit hole)
  if (parentEvent.parent_event_id) return null;

  const showSection = canManage || subs.length > 0;
  if (!showSection) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading text-lg text-brown">समारोह — Events in this series</h3>
          <p className="font-body text-sm text-brown-light">तिलक, हल्दी, मेहंदी, संगीत…</p>
        </div>
        {canManage && (
          <button
            onClick={onAddSubEvent}
            className="min-h-dadi px-4 rounded-xl border-2 border-haldi-gold text-haldi-gold-dark font-body text-base font-semibold hover:bg-unread-bg transition-colors whitespace-nowrap"
          >
            + जोड़ें
          </button>
        )}
      </div>

      {loading && <p className="font-body text-base text-brown-light">…</p>}

      {!loading && subs.length === 0 && canManage && (
        <p className="font-body text-base text-brown-light text-center py-4">
          अभी कोई sub-event नहीं — Add child events for tilak/haldi/etc.
        </p>
      )}

      {subs.length > 0 && (
        <ol className="relative border-l-2 border-haldi-gold/30 ml-2 space-y-4">
          {subs.map((s) => {
            const typeInfo = EVENT_TYPES.find((t) => t.value === s.event_type) ?? { emoji: '📅', label: s.event_type };
            return (
              <li key={s.id} className="ml-4">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-haldi-gold text-white text-sm">
                  {typeInfo.emoji}
                </span>
                <Link
                  href={`/events/${s.id}`}
                  className="block p-3 rounded-xl bg-cream hover:bg-cream-dark transition-colors"
                >
                  <p className="font-heading text-base text-brown">{s.title_hindi ?? s.title}</p>
                  <p className="font-body text-sm text-haldi-gold font-semibold mt-0.5">
                    {formatEventDate(s.start_datetime)} · 🕐 {formatEventTime(s.start_datetime)}
                  </p>
                  {s.location && <p className="font-body text-xs text-brown-light mt-0.5">📍 {s.location}</p>}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
