'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEventStore } from '@/stores/eventStore';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatEventDate, formatEventTime } from '@/lib/utils/formatters';
import { EVENT_TYPES } from '@/lib/constants';

const EventCreatorModal = dynamic(() => import('@/components/events/EventCreatorModal'), { ssr: false });

export default function EventsPage() {
  const { events, fetchEvents, isLoading, error } = useEventStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventTypeMap = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">उत्सव</h2>
          <p className="font-body text-base text-brown-light">Family Events</p>
        </div>
        <GoldButton size="sm" onClick={() => setModalOpen(true)}>+ उत्सव बनाएं</GoldButton>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 font-body text-base">
          <p className="font-semibold">कुछ गड़बड़ हुई — Something went wrong</p>
          <p className="text-base mt-1">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : events.length === 0 ? (
        <EmptyState
          emoji="🎉"
          title={'कोई उत्सव नहीं'}
          subtitle={'आने वाला कोई उत्सव नहीं — No upcoming events'}
          action={<GoldButton size="sm" onClick={() => setModalOpen(true)}>उत्सव बनाएं</GoldButton>}
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const typeInfo = eventTypeMap[event.event_type] ?? { emoji: '📅', label: event.event_type };
            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <article className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                  {event.banner_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.banner_url} alt={event.title} loading="lazy" className="w-full h-32 object-cover" />
                  )}
                  <div className="flex items-start gap-4 p-4">
                    <div className="w-14 h-14 rounded-xl bg-cream-dark flex items-center justify-center text-3xl flex-shrink-0">
                      {typeInfo.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-lg text-brown truncate">
                        {event.title_hindi ?? event.title}
                      </h3>
                      <p className="font-body text-base text-haldi-gold font-semibold mt-0.5">
                        {formatEventDate(event.start_datetime)}
                      </p>
                      <p className="font-body text-sm text-brown-light mt-0.5">
                        🕐 {formatEventTime(event.start_datetime)}
                        {event.location && ` · 📍 ${event.location}`}
                      </p>
                    </div>
                    {event.my_rsvp && (
                      <RsvpBadge status={event.my_rsvp} />
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && <EventCreatorModal onClose={() => { setModalOpen(false); fetchEvents(); }} />}
    </div>
  );
}

function RsvpBadge({ status }: { status: string }) {
  const map = {
    going: { label: 'जाएंगे', bg: 'bg-green-100 text-green-700' },
    maybe: { label: 'शायद', bg: 'bg-orange-100 text-orange-700' },
    not_going: { label: 'नहीं', bg: 'bg-red-100 text-red-700' },
  }[status] ?? { label: status, bg: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`font-body text-sm font-semibold px-2 py-1 rounded-full whitespace-nowrap ${map.bg}`}>
      {map.label}
    </span>
  );
}
