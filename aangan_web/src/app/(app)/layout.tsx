'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { initialize, isLoading, session, isNewUser } = useAuthStore();
  const { fetchNotifications, subscribeToRealtime, unsubscribeFromRealtime } = useNotificationStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!session) return;          // ← wait for auth before fetching
    fetchNotifications();
    subscribeToRealtime();
    return () => unsubscribeFromRealtime();
  }, [session, fetchNotifications, subscribeToRealtime, unsubscribeFromRealtime]);

  // A user who signed up via OAuth but closed the tab before finishing
  // profile setup can deep-link straight into /feed, /family, etc. The
  // middleware only checks "is there a session", not "does the profile
  // exist". Force them back through profile setup here.
  useEffect(() => {
    if (!isLoading && session && isNewUser) {
      router.replace('/profile-setup');
    }
  }, [isLoading, session, isNewUser, router]);

  if (isLoading) return <LoadingSpinner fullPage />;

  // ConfirmProvider mounted INSIDE AppShell so the dialog z-index sits
  // above all in-app surfaces (drawers, modals, toasts) but stays out
  // of pre-auth screens. Replaces window.confirm() — see ConfirmDialog.tsx
  // for the rationale (Jyotsna's "popup msgs not clear" support ticket).
  return (
    <AppShell>
      <ConfirmProvider>{children}</ConfirmProvider>
    </AppShell>
  );
}
