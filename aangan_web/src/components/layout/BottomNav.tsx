'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useNotificationStore } from '@/stores/notificationStore';

const TABS = [
  { href: '/feed', emoji: '🏠', label: 'घर' },
  { href: '/family', emoji: '👨‍👩‍👧‍👦', label: 'परिवार' },
  { href: '/events', emoji: '📅', label: 'उत्सव' },
  { href: '/notifications', emoji: '🔔', label: 'सूचना' },
  { href: '/settings', emoji: '⚙️', label: 'सेटिंग्स' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-cream-dark z-50 safe-area-pb">
      <ul className="flex">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 min-h-[56px] relative',
                  isActive ? 'text-haldi-gold' : 'text-brown-light'
                )}
              >
                <span className="text-xl">{tab.emoji}</span>
                <span className="font-body text-xs mt-0.5">{tab.label}</span>
                {tab.href === '/notifications' && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1/4 bg-error text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
