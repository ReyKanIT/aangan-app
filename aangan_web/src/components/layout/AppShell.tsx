'use client';
import dynamic from 'next/dynamic';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import FeedbackWidget from './FeedbackWidget';
import { Toaster } from 'react-hot-toast';

// PWA install banner only appears after the browser fires `beforeinstallprompt`
// (and only for users who haven't installed/dismissed). No need to ship its
// JS on the critical path — lazy-load it.
const PWAInstallPrompt = dynamic(() => import('@/components/ui/PWAInstallPrompt'), { ssr: false });

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:border-cream-dark lg:bg-white">
        <SideNav />
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        <TopBar />
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />

      {/* Floating Feedback Button */}
      <FeedbackWidget />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Toast Notifications */}
      <Toaster position="top-center" toastOptions={{ className: 'font-body' }} />
    </div>
  );
}
