'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationStore } from '@/stores/notificationStore';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Notification } from '@/types/database';

const TYPE_ICONS: Record<string, string> = {
  new_post: '📝', event_invite: '🎉', rsvp_update: '📋',
  new_family_member: '👨‍👩‍👧‍👦', post_like: '❤️', post_comment: '💬', general: '🔔',
};

// Derive the in-app deep-link for a notification row. `data` is JSONB in the
// DB, so the narrow `Record<string,string>` type in database.ts is a lie — we
// treat it as `unknown` and read keys defensively.
function deepLinkFor(notif: Notification): string | null {
  const data = (notif.data ?? {}) as Record<string, unknown>;

  // Admin daily feedback digest (inserted by /api/cron/feedback-digest)
  if (data.digest_type === 'feedback_daily') return '/admin/feedback-digest';

  // Panchang morning nudge — send users to the panchang screen
  const nudgeType = typeof data.nudge_type === 'string' ? data.nudge_type : null;
  if (nudgeType && nudgeType.startsWith('panchang')) return '/panchang';
  if (nudgeType === 'festival') return '/festivals';

  // User-action deep links (future-proof — no code inserts these yet, but
  // DB-trigger / mobile app may. Route by type + data.*)
  if (typeof data.event_id === 'string') return `/events/${data.event_id}`;
  if (notif.type === 'event_invite' || notif.type === 'rsvp_update') return '/events';
  if (notif.type === 'new_family_member') return '/family';
  if (notif.type === 'new_post' || notif.type === 'post_like' || notif.type === 'post_comment') {
    return '/feed';
  }

  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount, fetchNotifications } = useNotificationStore();

  // Refresh notifications when the page is visited
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleClick = (notif: Notification) => {
    // Flip is_read first so the bell count drops immediately, then navigate.
    if (!notif.is_read) markAsRead(notif.id);
    const href = deepLinkFor(notif);
    if (href) router.push(href);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-brown">सूचनाएं</h2>
          <p className="font-body text-base text-brown-light">Notifications</p>
        </div>
        {unreadCount > 0 && (
          <GoldButton variant="ghost" size="sm" onClick={markAllAsRead}>
            सब पढ़ा — Mark All Read
          </GoldButton>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : notifications.length === 0 ? (
        <EmptyState emoji="🔔" title="कोई सूचना नहीं" subtitle="अभी कोई सूचना नहीं — No notifications yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={cn(
                'w-full text-left p-4 rounded-2xl flex items-start gap-3 transition-colors min-h-dadi',
                notif.is_read ? 'bg-white' : 'bg-unread-bg border-l-4 border-haldi-gold'
              )}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICONS[notif.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-body font-semibold text-brown text-base leading-snug">
                  {notif.title_hindi ?? notif.title}
                </p>
                {(notif.body_hindi ?? notif.body) && (
                  <p className="font-body text-base text-brown-light mt-0.5 leading-snug">
                    {notif.body_hindi ?? notif.body}
                  </p>
                )}
              </div>
              <span className="font-body text-sm text-brown-light flex-shrink-0 mt-0.5">
                {timeAgo(notif.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
