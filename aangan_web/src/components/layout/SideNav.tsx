'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useNotificationStore } from '@/stores/notificationStore';
import { useMessageStore } from '@/stores/messageStore';

const NAV_ITEMS = [
  { href: '/feed', emoji: '🏠', hindi: 'घर', english: 'Home' },
  { href: '/family', emoji: '👨‍👩‍👧‍👦', hindi: 'परिवार', english: 'Family' },
  { href: '/events', emoji: '📅', hindi: 'उत्सव', english: 'Events' },
  { href: '/kuldevi', emoji: '🛕', hindi: 'कुलदेवी', english: 'Kuldevi' },
  { href: '/messages', emoji: '💬', hindi: 'संदेश', english: 'Messages' },
  { href: '/chatbot', emoji: '🤖', hindi: 'बॉट', english: 'Chatbot' },
  { href: '/notifications', emoji: '🔔', hindi: 'सूचना', english: 'Notifications' },
  { href: '/settings', emoji: '⚙️', hindi: 'सेटिंग्स', english: 'Settings' },
];

export default function SideNav() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const unreadMessages = useMessageStore((s) => s.totalUnread);

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-cream-dark">
        <h1 className="font-heading text-2xl text-haldi-gold font-bold">AANGAN</h1>
        <p className="font-heading text-lg text-brown">आँगन</p>
        <p className="font-body text-xs text-brown-light mt-1">Family Social Network</p>
      </div>

      {/* Nav Items */}
      <ul className="flex-1 py-4 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group min-h-dadi',
                  isActive
                    ? 'bg-unread-bg border-l-4 border-haldi-gold text-haldi-gold'
                    : 'text-brown-light hover:bg-cream-dark hover:text-brown'
                )}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1">
                  <span className={cn('block font-body font-semibold text-base', isActive ? 'text-haldi-gold' : '')}>
                    {item.hindi}
                  </span>
                  <span className="block font-body text-xs opacity-70">{item.english}</span>
                </span>
                {item.href === '/notifications' && unreadCount > 0 && (
                  <span className="bg-error text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {item.href === '/messages' && unreadMessages > 0 && (
                  <span className="bg-haldi-gold text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Version Footer */}
      <div className="px-6 py-4 border-t border-cream-dark">
        <p className="font-body text-xs text-brown-light">v0.8.0 — Comments, Chat, Kuldevi, Voice, Chatbot</p>
      </div>
    </nav>
  );
}
