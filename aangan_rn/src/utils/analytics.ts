/**
 * Crash & analytics wrapper — Sentry-backed in production, no-op locally.
 *
 * 2026-04-29 — replaces the stub with a real Sentry React Native binding.
 * The require is dynamic so this module is safe to load even before
 * `@sentry/react-native` is npm-installed (which Kumar still needs to do
 * — see PRODUCTION_AUDIT_2026-04-29.md → P1-10 Kumar action). Without the
 * dep or without an EXPO_PUBLIC_SENTRY_DSN env var, every call is a no-op
 * (so the existing build keeps working).
 *
 * To finish wiring (one-time setup):
 *   1. cd aangan_rn && npx expo install @sentry/react-native
 *   2. Add to app.json plugins:
 *        ["@sentry/react-native/expo", { "url": "https://sentry.io/" }]
 *   3. Set EAS env var: EXPO_PUBLIC_SENTRY_DSN=<dsn from Sentry project>
 *   4. Rebuild via EAS.
 *
 * Until step 1 lands, this file silently degrades — secureLog still records
 * errors locally during development.
 */

import { secureLog } from './security';

// Dynamically resolve Sentry so this module compiles without the dep
// installed. Kept across the module lifetime — the require runs at most once.
// `any` here is intentional — the package is an optional, late-installed dep
// (see file header). Once Kumar runs `npx expo install @sentry/react-native`
// these can be tightened to `typeof import('@sentry/react-native')`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryNS: any = null;
let initialized = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadSentry(): any {
  if (SentryNS) return SentryNS;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SentryNS = require('@sentry/react-native');
    return SentryNS;
  } catch {
    return null;
  }
}

const SENTRY_DSN =
  // Reading via globalThis avoids `process.env` shape issues on RN platforms.
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const Analytics = {
  /** Initialize crash reporting. Idempotent — safe to call multiple times. */
  init: () => {
    if (initialized) return;
    initialized = true;
    if (!SENTRY_DSN) {
      secureLog.info('[Analytics] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled');
      return;
    }
    const Sentry = loadSentry();
    if (!Sentry) {
      secureLog.info('[Analytics] @sentry/react-native not installed — Sentry disabled');
      return;
    }
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        // Replays are heavy on RN; leave off for now.
        // attachScreenshot: true,
        // attachViewHierarchy: true,
        environment: __DEV__ ? 'development' : 'production',
      });
      secureLog.info('[Analytics] Sentry initialized');
    } catch (e) {
      secureLog.error('[Analytics] Sentry init failed:', e);
    }
  },

  /** Track screen view (Sentry breadcrumb). */
  trackScreen: (screenName: string) => {
    const Sentry = loadSentry();
    if (Sentry && initialized) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: screenName,
        level: 'info',
      });
    } else {
      secureLog.info('[Analytics] Screen:', screenName);
    }
  },

  /** Track custom event (Sentry breadcrumb). */
  trackEvent: (event: string, properties?: Record<string, unknown>) => {
    const Sentry = loadSentry();
    if (Sentry && initialized) {
      Sentry.addBreadcrumb({
        category: 'event',
        message: event,
        level: 'info',
        data: properties,
      });
    } else {
      secureLog.info('[Analytics] Event:', event, properties);
    }
  },

  /** Track error / exception. */
  trackError: (error: Error, context?: Record<string, unknown>) => {
    const Sentry = loadSentry();
    if (Sentry && initialized) {
      try {
        Sentry.captureException(error, { extra: context });
      } catch {
        secureLog.error('[Analytics] Sentry.captureException failed; falling back', error.message);
      }
    } else {
      secureLog.error('[Analytics] Error:', error.message, context);
    }
  },

  /** Identify current user (after login). Strips PII before sending. */
  setUser: (userId: string, traits?: { display_name?: string }) => {
    const Sentry = loadSentry();
    if (Sentry && initialized) {
      Sentry.setUser({
        id: userId,
        // Do NOT send phone_number, email, or anything Sentry could correlate.
        username: traits?.display_name?.slice(0, 30),
      });
    } else {
      secureLog.info('[Analytics] User:', userId);
    }
  },

  /** Reset user identity on sign-out. */
  reset: () => {
    const Sentry = loadSentry();
    if (Sentry && initialized) {
      Sentry.setUser(null);
    } else {
      secureLog.info('[Analytics] Reset');
    }
  },
};
