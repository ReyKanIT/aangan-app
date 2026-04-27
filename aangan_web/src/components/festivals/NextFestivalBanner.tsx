'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { getNextFestivalForUser, type SystemFestival } from '@/lib/festivals';

// ─────────────────────────────────────────────────────────────────────────────
// NextFestivalBanner
//
// Surfaces the user's nearest upcoming festival within the next 14 days,
// respecting their state and per-festival opt-in. Renders nothing if no
// festival is within the window or the user has opted out of it.
// ─────────────────────────────────────────────────────────────────────────────

interface Props { withinDays?: number; className?: string; }

export default function NextFestivalBanner({ withinDays = 14, className = '' }: Props) {
  const { user } = useAuthStore();
  const [next, setNext] = useState<{ festival: SystemFestival; daysUntil: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await getNextFestivalForUser(supabase, { id: user.id, state_code: user.state_code }, withinDays);
        if (!cancelled) setNext(r);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('does not exist') || msg.includes('relation')) setMissingTable(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, withinDays]);

  if (loading || missingTable || !next) return null;

  const { festival, daysUntil } = next;
  const daysHi = daysUntil === 0 ? 'आज' : daysUntil === 1 ? 'कल' : `${daysUntil} दिन बाद`;
  const daysEn = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
  const importanceColor =
    festival.importance === 'major'  ? 'from-haldi-gold-light to-haldi-gold/30 border-haldi-gold' :
    festival.importance === 'medium' ? 'from-mehndi-green/10 to-mehndi-green/5 border-mehndi-green/40' :
                                       'from-cream-dark/30 to-cream/20 border-cream-dark';

  return (
    <Link
      href="/festivals"
      className={`block bg-gradient-to-r ${importanceColor} border-2 rounded-2xl p-4 mb-4 hover:shadow-md transition-shadow ${className}`}
      aria-label={`अगला त्योहार ${festival.name_hi} ${daysHi}`}
    >
      <div className="flex items-center gap-4">
        <div className="text-5xl shrink-0">{festival.icon ?? '🎉'}</div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-base text-brown-light/80 font-semibold">अगला त्योहार — Next Festival</p>
          <p className="font-heading text-xl text-brown truncate">
            {festival.name_hi} <span className="font-body text-base text-brown-light">— {festival.name_en}</span>
          </p>
          <p className="font-body text-base text-brown mt-0.5">
            <span className="font-bold text-haldi-gold-dark">{daysHi}</span>
            <span className="text-brown-light"> · {daysEn}</span>
          </p>
          {festival.description_hi && (
            <p className="font-body text-base text-brown-light mt-1 truncate">{festival.description_hi}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
