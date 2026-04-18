'use client';
import dynamic from 'next/dynamic';

// Client-side wrapper that lazy-loads the PWA prompt with ssr: false.
// Root layout.tsx is a server component and cannot use `ssr: false` directly,
// so we hide that detail behind this tiny client island.
const PWAInstallPrompt = dynamic(() => import('./PWAInstallPrompt'), { ssr: false });

export default function PWAInstallMount() {
  return <PWAInstallPrompt />;
}
