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
  | 'forced_invite_skipped'
  // Direct tree editing v0.16.3 (Kumar directive 2026-05-18 8:48 IST).
  // Fired from FamilyTreeScreen action handlers when the user picks a row
  // from TreeCardActionSheet or completes the resulting action.
  | 'tree_card_longpress'
  | 'tree_add_child_from_card'
  | 'tree_add_spouse_from_card'
  | 'tree_add_parent_from_card'
  | 'tree_edit_relationship'
  | 'tree_edit_name'
  | 'tree_remove_member';

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
