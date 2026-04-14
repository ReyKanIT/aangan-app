'use client';
import Link from 'next/link';
import AvatarCircle from '@/components/ui/AvatarCircle';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-cream-dark px-4 py-3 flex items-center justify-between lg:px-6">
      {/* Mobile logo */}
      <Link href="/feed" className="lg:hidden">
        <span className="font-heading text-xl text-haldi-gold font-bold">AANGAN</span>
        <span className="font-heading text-sm text-brown ml-2">आँगन</span>
      </Link>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Notification bell (mobile) */}
        <Link
          href="/notifications"
          className="relative lg:hidden min-h-dadi min-w-dadi flex items-center justify-center"
          aria-label="सूचनाएं — Notifications"
        >
          <span className="text-2xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-error text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <Link
          href="/settings"
          className="min-h-dadi min-w-dadi flex items-center justify-center"
          aria-label="सेटिंग्स — Settings"
        >
          <AvatarCircle src={user?.avatar_url} name={user?.display_name} size={40} />
        </Link>
      </div>
    </header>
  );
}
