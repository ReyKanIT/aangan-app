'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEventStore } from '@/stores/eventStore';
import { useAuthStore } from '@/stores/authStore';
import AvatarCircle from '@/components/ui/AvatarCircle';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EventInviteCard from '@/components/events/EventInviteCard';
import EventMemoryRecap from '@/components/events/EventMemoryRecap';
import RsvpDetailsForm from '@/components/events/RsvpDetailsForm';
import PhysicalCardTracker from '@/components/events/PhysicalCardTracker';
import GpsCheckIn from '@/components/events/GpsCheckIn';
import GiftRegister from '@/components/events/GiftRegister';
import SubEventsSection from '@/components/events/SubEventsSection';
import PotluckSection from '@/components/events/PotluckSection';
import { VoiceInvitePlayer } from '@/components/events/VoiceInvite';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { formatEventDate, formatEventTime } from '@/lib/utils/formatters';

// Modals are below-the-fold and only open on host interactions — ship them
// as dynamic imports so the /events/:id initial JS drops from 20.4 kB to
// what's actually rendered on first paint.
const EventCreatorModal = dynamic(() => import('@/components/events/EventCreatorModal'), { ssr: false });
const EventEditModal = dynamic(() => import('@/components/events/EventEditModal'), { ssr: false });
const GiftManagersModal = dynamic(() => import('@/components/events/GiftManagersModal'), { ssr: false });
const CoHostsModal = dynamic(() => import('@/components/events/CoHostsModal'), { ssr: false });
import { downloadEventIcs } from '@/lib/utils/calendar';
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
  const [submittingRsvp, setSubmittingRsvp] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [managersOpen, setManagersOpen] = useState(false);
  const [coHostsOpen, setCoHostsOpen] = useState(false);
  const [subEventOpen, setSubEventOpen] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);

  useEffect(() => {
    fetchEvent(eventId);
    fetchRsvps(eventId);
  }, [eventId, fetchEvent, fetchRsvps]);

  // Check co-host membership — determines whether to show edit UI for non-creators.
  // 42P01 (relation doesn't exist) is treated as "no co-host table yet", defaults to false.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('event_co_hosts')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setIsCoHost(!!data);
    })();
    return () => { cancelled = true; };
  }, [eventId, user?.id]);

  const handleRsvp = async (status: RsvpStatus) => {
    if (submittingRsvp || !currentEvent) return;
    setSubmittingRsvp(status);
    try {
      await submitRsvp(currentEvent.id, status);
    } finally {
      setSubmittingRsvp(null);
    }
  };

  const myRsvp = useMemo(() => rsvps.find((r) => r.user_id === user?.id), [rsvps, user?.id]);

  const isPastEvent = useMemo(() => {
    if (!currentEvent) return false;
    return new Date(currentEvent.start_datetime).getTime() < Date.now() - 6 * 60 * 60 * 1000;
  }, [currentEvent]);

  if (isLoading || !currentEvent) return <LoadingSpinner fullPage />;

  const typeInfo = EVENT_TYPES.find((t) => t.value === currentEvent.event_type) ?? { emoji: '📅', label: currentEvent.event_type };
  const isCreator = user?.id === currentEvent.creator_id;
  const canManage = isCreator || isCoHost;

  const rsvpCounts = rsvps.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalGuests = rsvps
    .filter((r) => r.status === 'going')
    .reduce((sum, r) => sum + 1 + (r.guests_count ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/events" className="font-body text-base text-brown-light flex items-center gap-1 mb-4 min-h-dadi">
        ← वापस / Back
      </Link>

      {currentEvent.banner_url && (
        <div className="relative rounded-2xl overflow-hidden mb-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentEvent.banner_url} alt={currentEvent.title} className="w-full h-48 sm:h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <p className="font-heading text-2xl drop-shadow-md">{currentEvent.title_hindi ?? currentEvent.title}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-4xl">{typeInfo.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl text-brown">{currentEvent.title_hindi ?? currentEvent.title}</h1>
            {currentEvent.title_hindi && <p className="font-body text-sm text-brown-light">{currentEvent.title}</p>}
            {currentEvent.hosted_by && (
              <p className="font-body text-base text-haldi-gold-dark mt-1 italic">
                {currentEvent.hosted_by} की ओर से 🙏
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="min-h-dadi px-4 rounded-xl border-2 border-gray-200 text-brown font-body text-base font-semibold hover:border-haldi-gold hover:bg-cream-dark transition-colors"
                aria-label="संपादन"
              >
                ✏️ संपादन
              </button>
              {isCreator && (
                <button
                  onClick={() => setCoHostsOpen(true)}
                  className="min-h-dadi px-4 rounded-xl border-2 border-gray-200 text-brown font-body text-base font-semibold hover:border-haldi-gold hover:bg-cream-dark transition-colors whitespace-nowrap"
                >
                  👥 सह-मेज़बान
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 font-body text-base text-brown">
          <p>📅 {formatEventDate(currentEvent.start_datetime)}</p>
          <p>🕐 {formatEventTime(currentEvent.start_datetime)}</p>
          {currentEvent.location && <p>📍 {currentEvent.location}</p>}
        </div>
        {currentEvent.description && (
          <p className="font-body text-base text-brown-light mt-4 leading-relaxed whitespace-pre-wrap">{currentEvent.description}</p>
        )}

        <button
          onClick={() => downloadEventIcs(currentEvent)}
          className="mt-4 inline-flex items-center gap-2 min-h-dadi px-4 rounded-xl bg-white border-2 border-haldi-gold text-haldi-gold-dark font-body font-semibold text-base hover:bg-unread-bg transition-colors"
        >
          📆 कैलेंडर में जोड़ें — Add to Calendar
        </button>

        {canManage && rsvps.length > 0 && (
          <p className="font-body text-base text-brown-light mt-4">
            📋 {rsvps.length} RSVP · {totalGuests} मेहमान आ रहे हैं
          </p>
        )}
      </div>

      {/* Voice invite from elders */}
      {currentEvent.voice_invite_url && (
        <div className="mb-4">
          <VoiceInvitePlayer
            url={currentEvent.voice_invite_url}
            durationSec={currentEvent.voice_invite_duration_sec}
            speaker={currentEvent.hosted_by || currentEvent.creator?.display_name_hindi || currentEvent.creator?.display_name || null}
          />
        </div>
      )}

      {/* Sub-events series (wedding tilak/haldi/mehndi/sangeet) */}
      <SubEventsSection parentEvent={currentEvent} canManage={canManage} onAddSubEvent={() => setSubEventOpen(true)} />

      {/* Day-of check-in */}
      <GpsCheckIn event={currentEvent} userId={user?.id} />

      {/* Memory recap for past events */}
      {isPastEvent && <EventMemoryRecap eventId={currentEvent.id} />}

      {/* RSVP */}
      {!isPastEvent && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="font-heading text-lg text-brown mb-2">आप आएंगे?</h3>
          <p className="font-body text-base text-brown-light mb-4">Will you attend?</p>
          <div className="flex gap-2">
            {RSVP_OPTIONS.map((opt) => {
              const isActive = currentEvent.my_rsvp === opt.status;
              const isSubmitting = submittingRsvp === opt.status;
              return (
                <button
                  key={opt.status}
                  onClick={() => handleRsvp(opt.status)}
                  disabled={submittingRsvp !== null}
                  aria-busy={isSubmitting}
                  className={`flex-1 min-h-dadi rounded-xl font-body font-semibold text-base border-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${isActive ? opt.bg + ' border-transparent' : opt.outline + ' bg-white'}`}
                >
                  {isSubmitting ? '…' : opt.label}
                </button>
              );
            })}
          </div>

          <RsvpDetailsForm eventId={currentEvent.id} myRsvp={myRsvp} />

          {(rsvpCounts.going || rsvpCounts.maybe || rsvpCounts.not_going) ? (
            <div className="flex gap-3 mt-4 flex-wrap">
              {rsvpCounts.going > 0 && <span className="font-body text-base text-green-600">✓ {rsvpCounts.going} जाएंगे</span>}
              {rsvpCounts.maybe > 0 && <span className="font-body text-base text-orange-500">? {rsvpCounts.maybe} शायद</span>}
              {rsvpCounts.not_going > 0 && <span className="font-body text-base text-red-500">✗ {rsvpCounts.not_going} नहीं</span>}
            </div>
          ) : null}
        </div>
      )}

      {/* Share & Invite */}
      {!isPastEvent && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="font-heading text-lg text-brown mb-1">न्यौता भेजें — Send Invite</h3>
          <p className="font-body text-sm text-brown-light mb-3">WhatsApp पर सीधे फैमिली को भेजें — एक टैप में</p>
          <EventInviteCard event={currentEvent} inviter={currentEvent.creator ?? null} />
          {isCreator && (
            <Link
              href={`/upload/${currentEvent.id}`}
              className="mt-3 flex items-center justify-center gap-2 min-h-dadi rounded-xl border-2 border-haldi-gold text-haldi-gold-dark font-body font-semibold text-base hover:bg-haldi-gold/10 transition-colors"
            >
              <span>📸</span> मेहमान फ़ोटो लिंक — Guest Photo Upload
            </Link>
          )}
        </div>
      )}

      {/* Potluck sign-up — visible to all attendees, editable by hosts */}
      <PotluckSection eventId={currentEvent.id} currentUserId={user?.id} canManage={canManage} />

      {/* Gift register — host side only (RLS enforces) */}
      <GiftRegister
        eventId={currentEvent.id}
        currentUserId={user?.id}
        isCreator={isCreator}
        onOpenManagers={isCreator ? () => setManagersOpen(true) : undefined}
      />

      {/* Physical card tracker — hosts only */}
      {canManage && <PhysicalCardTracker eventId={currentEvent.id} rsvps={rsvps} />}

      {/* Attendees with notes */}
      {rsvps.filter((r) => r.status === 'going').length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading text-lg text-brown mb-4">जाने वाले — Attendees</h3>
          <div className="space-y-4">
            {rsvps.filter((r) => r.status === 'going').map((r) => (
              <div key={r.id} className="flex items-start gap-3">
                <AvatarCircle src={r.user?.avatar_url} name={r.user?.display_name_hindi ?? r.user?.display_name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-body text-base font-semibold text-brown">{r.user?.display_name_hindi ?? r.user?.display_name}</p>
                    {(r.guests_count ?? 0) > 0 && (
                      <span className="font-body text-sm text-haldi-gold-dark bg-unread-bg px-2 py-0.5 rounded-full">+{r.guests_count}</span>
                    )}
                  </div>
                  {r.user?.village_city && <p className="font-body text-sm text-brown-light">📍 {r.user.village_city}</p>}
                  {r.note && (
                    <p className="font-body text-base text-brown-light mt-1 bg-cream rounded-lg px-3 py-2 whitespace-pre-wrap">
                      💬 {r.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editOpen && <EventEditModal event={currentEvent} onClose={() => setEditOpen(false)} />}
      {managersOpen && <GiftManagersModal eventId={currentEvent.id} onClose={() => setManagersOpen(false)} />}
      {coHostsOpen && <CoHostsModal eventId={currentEvent.id} onClose={() => setCoHostsOpen(false)} />}
      {subEventOpen && (
        <EventCreatorModal
          parentEventId={currentEvent.id}
          onClose={() => { setSubEventOpen(false); fetchEvent(eventId); }}
        />
      )}
    </div>
  );
}
