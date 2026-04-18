'use client';
import SideNav from './SideNav';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import FeedbackWidget from './FeedbackWidget';
import { Toaster } from 'react-hot-toast';

// PWAInstallPrompt moved to the root layout in v0.9.11 so landing + public
// SEO pages also get the install nudge. No duplicate mount here.

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

      {/* Toast Notifications */}
      <Toaster position="top-center" toastOptions={{ className: 'font-body' }} />
    </div>
  );
}
