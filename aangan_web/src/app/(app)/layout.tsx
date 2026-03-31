'use client';
import { useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { initialize, isLoading } = useAuthStore();
  const { fetchNotifications, subscribeToRealtime, unsubscribeFromRealtime } = useNotificationStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    fetchNotifications();
    subscribeToRealtime();
    return () => unsubscribeFromRealtime();
  }, [fetchNotifications, subscribeToRealtime, unsubscribeFromRealtime]);

  if (isLoading) return <LoadingSpinner fullPage />;

  return <AppShell>{children}</AppShell>;
}
