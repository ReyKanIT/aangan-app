'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Photo {
  id: string;
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
}

interface Props { eventId: string; }

/**
 * EventMemoryRecap — Shown on past events. Pulls approved photos and makes
 * the post-event page feel like a family memory album rather than an
 * abandoned RSVP list. This is the stickiness loop: guests return to relive.
 */
export default function EventMemoryRecap({ eventId }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('event_photos')
        .select('id, photo_url, thumbnail_url, caption')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12);
      if (!cancelled) {
        setPhotos((data ?? []) as Photo[]);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (isLoading) return null;
  if (photos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading text-lg text-brown">यादें — Memories</h3>
          <p className="font-body text-sm text-brown-light">{photos.length}+ फ़ोटो परिवार से</p>
        </div>
        <a
          href={`/upload/${eventId}`}
          className="min-h-dadi px-4 inline-flex items-center rounded-xl border-2 border-haldi-gold text-haldi-gold-dark font-body text-base font-semibold hover:bg-unread-bg transition-colors whitespace-nowrap"
        >
          + फ़ोटो जोड़ें
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <a
            key={p.id}
            href={p.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square rounded-xl overflow-hidden bg-cream-dark"
            aria-label={p.caption ?? 'Event photo'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumbnail_url ?? p.photo_url}
              alt={p.caption ?? ''}
              loading="lazy"
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
