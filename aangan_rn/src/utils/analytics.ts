/**
 * Lightweight analytics wrapper — ready for Sentry/Mixpanel integration.
 *
 * Replace with Sentry.init() and Sentry.captureException() for production.
 * For event tracking, swap secureLog calls with Mixpanel.track() or similar.
 */

import { secureLog } from './security';

export const Analytics = {
  /** Initialize analytics/crash reporting SDKs */
  init: () => {
    // placeholder: Sentry.init({ dsn: '...' })
    secureLog.info('[Analytics] Initialized');
  },

  /** Track screen view */
  trackScreen: (screenName: string) => {
    secureLog.info('[Analytics] Screen:', screenName);
  },

  /** Track custom event with optional properties */
  trackEvent: (event: string, properties?: Record<string, any>) => {
    secureLog.info('[Analytics] Event:', event, properties);
  },

  /** Track error / exception */
  trackError: (error: Error, context?: Record<string, any>) => {
    // placeholder: Sentry.captureException(error, { extra: context })
    secureLog.error('[Analytics] Error:', error.message, context);
  },

  /** Identify current user for analytics */
  setUser: (userId: string, traits?: Record<string, any>) => {
    // placeholder: Sentry.setUser({ id: userId }); Mixpanel.identify(userId);
    secureLog.info('[Analytics] User:', userId);
  },

  /** Reset user identity on sign-out */
  reset: () => {
    // placeholder: Sentry.setUser(null); Mixpanel.reset();
    secureLog.info('[Analytics] Reset');
  },
};
