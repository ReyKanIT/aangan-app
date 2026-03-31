'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEventStore } from '@/stores/eventStore';
import { useAuthStore } from '@/stores/authStore';
import GoldButton from '@/components/ui/GoldButton';
import AvatarCircle from '@/components/ui/AvatarCircle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatEventDate, formatEventTime } from '@/lib/utils/formatters';
import { EVENT_TYPES } from '@/lib/constants';
import type { RsvpStatus } from '@/types/database';

const RSVP_OPTIONS = [
  { status: 'going' as RsvpStatus, label: 'जाएंगे ✓', bg: 'bg-green-500 text-white', outline: 'border-green-500 text-green-600' },
  { status: 'maybe' as RsvpStatus, label: 'शायद 🤔', bg: 'bg-orange-400 text-white', outline: 'border-orange-400 text-orange-500' },
  { status: 'not_going' as RsvpStatus, label: 'नहीं जाएंगे ✗', bg: 'bg-red-500 text-white', outline: 'border-red-500 text-red-600' },
];

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { currentEvent, fetchEvent, submitRsvp, fetchRsvps, rsvps, isLoading } = useEventStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchEvent(eventId);
    fetchRsvps(eventId);
  }, [eventId, fetchEvent, fetchRsvps]);

  if (isLoading || !currentEvent) return <LoadingSpinner fullPage />;

  const typeInfo = EVENT_TYPES.find((t) => t.value === currentEvent.event_type) ?? { emoji: '📅', label: currentEvent.event_type };
  const isCreator = user?.id === currentEvent.creator_id;

  const rsvpCounts = rsvps.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/events" className="font-body text-sm text-brown-light flex items-center gap-1 mb-4">
        ← वापस / Back
      </Link>

      {/* Event Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{typeInfo.emoji}</span>
          <div>
            <h1 className="font-heading text-2xl text-brown">{currentEvent.title_hindi ?? currentEvent.title}</h1>
            {currentEvent.title_hindi && <p className="font-body text-sm text-brown-light">{currentEvent.title}</p>}
          </div>
        </div>
        <div className="space-y-2 font-body text-sm text-brown">
          <p>📅 {formatEventDate(currentEvent.start_datetime)}</p>
          <p>🕐 {formatEventTime(currentEvent.start_datetime)}</p>
          {currentEvent.location && <p>📍 {currentEvent.location}</p>}
        </div>
        {currentEvent.description && (
          <p className="font-body text-sm text-brown-light mt-4 leading-relaxed">{currentEvent.description}</p>
        )}
        {isCreator && (
          <Link href={`/events/${eventId}/rsvps`}>
            <GoldButton variant="outline" size="sm" className="mt-4">📋 RSVP देखें — View RSVPs</GoldButton>
          </Link>
        )}
      </div>

      {/* RSVP Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <h3 className="font-heading text-lg text-brown mb-2">आप आएंगे?</h3>
        <p className="font-body text-sm text-brown-light mb-4">Will you attend?</p>
        <div className="flex gap-2">
          {RSVP_OPTIONS.map((opt) => {
            const isActive = currentEvent.my_rsvp === opt.status;
            return (
              <button
                key={opt.status}
                onClick={() => submitRsvp(currentEvent.id, opt.status)}
                className={`flex-1 min-h-dadi rounded-xl font-body font-semibold text-sm border-2 transition-all ${isActive ? opt.bg + ' border-transparent' : opt.outline + ' bg-white'}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* RSVP Summary */}
        {(rsvpCounts.going || rsvpCounts.maybe || rsvpCounts.not_going) ? (
          <div className="flex gap-3 mt-4">
            {rsvpCounts.going > 0 && <span className="font-body text-sm text-green-600">✓ {rsvpCounts.going} जाएंगे</span>}
            {rsvpCounts.maybe > 0 && <span className="font-body text-sm text-orange-500">? {rsvpCounts.maybe} शायद</span>}
            {rsvpCounts.not_going > 0 && <span className="font-body text-sm text-red-500">✗ {rsvpCounts.not_going} नहीं</span>}
          </div>
        ) : null}
      </div>

      {/* Attendees */}
      {rsvps.filter((r) => r.status === 'going').length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading text-lg text-brown mb-4">जाने वाले — Attendees</h3>
          <div className="space-y-3">
            {rsvps.filter((r) => r.status === 'going').map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <AvatarCircle src={r.user?.avatar_url} name={r.user?.display_name_hindi ?? r.user?.display_name} size={40} />
                <div>
                  <p className="font-body text-sm font-semibold text-brown">{r.user?.display_name_hindi ?? r.user?.display_name}</p>
                  {r.user?.village_city && <p className="font-body text-xs text-brown-light">📍 {r.user.village_city}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
