'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Route-level error boundary for the (app) authenticated shell.
//
// Why this file exists:
//   On 2026-05-02 a Postgres RLS recursion (events ↔ event_rsvps) made the
//   /events page 500 for every authenticated user. Without a route boundary
//   the failure bubbled to global-error.tsx — which unmounts the WHOLE shell,
//   loses the user's tab/scroll state, and wipes any in-flight form data.
//   This boundary catches errors inside any (app) route (events, feed, family,
//   panchang, festivals, messages, settings, …) and renders a recoverable UI
//   without taking down the rest of the app.
//
// What it does:
//   - Captures the error to Sentry (matches global-error.tsx behavior).
//   - Renders a Hindi-first, Dadi-test-sized "try again" screen.
//   - reset() re-renders the failing segment without a full page reload.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import GoldButton from '@/components/ui/GoldButton';

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: 'app-route' },
      extra: { digest: error.digest },
    });
    // Also log to console so it's visible in dev / prod browser console
    console.error('[app/error] caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 text-5xl" aria-hidden>🙏</div>
      <h1 className="font-heading mb-2 text-2xl text-brown-dark">
        कुछ गड़बड़ हुई
      </h1>
      <p className="mb-1 text-base text-brown-dark/80">Something went wrong</p>
      <p className="mb-6 max-w-md text-sm text-brown-light">
        घबराइए मत — दोबारा कोशिश करें या होम पेज पर वापस जाएं।
        <br />
        <span className="opacity-70">
          Don&apos;t worry — try again or go back home.
        </span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <GoldButton onClick={reset}>फिर से कोशिश करें — Try Again</GoldButton>
        <a
          href="/feed"
          className="inline-flex min-h-dadi items-center justify-center rounded-xl border-2 border-brown-light/30 bg-cream px-6 py-3 text-base font-medium text-brown-dark hover:bg-cream-dark"
        >
          होम पेज — Home
        </a>
      </div>

      {process.env.NODE_ENV !== 'production' && error.message && (
        <pre className="mt-8 max-w-xl overflow-auto rounded-lg bg-cream-dark p-3 text-left text-xs text-brown-dark/70">
          {error.message}
          {error.digest && `\n\ndigest: ${error.digest}`}
        </pre>
      )}
    </div>
  );
}
