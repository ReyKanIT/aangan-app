/**
 * Funnel-event stub for the forced-invite onboarding (v0.16.1).
 *
 * The CMO scorecard (`notes/growth-loops-30d.md` §1) flagged funnel
 * instrumentation as a separate Week-1 deliverable. To avoid coupling the
 * forced-invite PR to the analytics pipe, every event call goes through this
 * thin wrapper: console log today, future Sentry breadcrumb + Supabase upsert
 * tomorrow. Swap one function body and every call site upgrades.
 *
 * Keep the event-name set CLOSED — the union below is the source of truth.
 * Adding a new event = adding it to the union AND documenting it in the
 * scorecard doc.
 */
import { secureLog } from './security';

export type FunnelEventName =
  | 'forced_invite_shown'
  | 'forced_invite_phone_filled'
  | 'forced_invite_whatsapp_sent'
  | 'forced_invite_continued'
  | 'forced_invite_skipped';

export type FunnelEventProps = Record<string, string | number | boolean | null>;

export function trackFunnelEvent(
  name: FunnelEventName,
  props: FunnelEventProps = {},
): void {
  try {
    // Today: structured console log only — picked up by Sentry breadcrumbs
    // via `secureLog.info` and by EAS dev logs.
    secureLog.info(`[funnel] ${name}`, props);

    // Future wiring (kept commented so the intent is obvious):
    // Sentry.addBreadcrumb({ category: 'funnel', message: name, data: props });
    // await supabase.from('funnel_events').insert({ name, props, ts: new Date() });
  } catch {
    // Never let an analytics call crash a user-facing flow.
  }
}
