'use client';
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

const TYPE_ICONS: Record<string, string> = {
  new_post: '📝', event_invite: '🎉', rsvp_update: '📋',
  new_family_member: '👨‍👩‍👧‍👦', post_like: '❤️', post_comment: '💬', general: '🔔',
};

export default function NotificationsPage() {
  const { notifications, isLoading, markAsRead, markAllAsRead, unreadCount, fetchNotifications } = useNotificationStore();

  // Refresh notifications when the page is visited
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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
        <EmptyState emoji="🔔" title="कोई सूचना नहीं" subtitle="No notifications yet" />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={cn(
                'w-full text-left p-4 rounded-2xl flex items-start gap-3 transition-colors',
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
              <span className="font-body text-xs text-brown-light flex-shrink-0 mt-0.5">
                {timeAgo(notif.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
