// Presence indicator helpers — ring color around family-member avatars.
//
// v0.15.7 (2026-05-16): Kumar's spec — show presence at a glance on the
// family tree.
//
// Thresholds:
//   🟢 Green   — last seen < 5 minutes ago        ("online now")
//   🟡 Yellow  — last seen 5–30 minutes ago        ("just here")
//   🟠 Orange  — last seen 30 min – 24 hours ago  ("away today")
//   🔴 Red     — last seen 1–7 days ago            ("away this week")
//   ⚪ Grey    — deceased (offline_family_members.is_deceased = true)
//   (no ring) — last seen > 7 days ago OR offline-alive member with no last_seen
//
// The "no ring" buckets render the card without a colored border so that the
// visual signal is reserved for actively-online / recently-active / inactive
// states. Family-tree readers want to *spot* who's been active recently —
// not see a wall of red rings on every cousin who hasn't logged in this month.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type PresenceStatus =
  | 'online'      // < 5 minutes
  | 'recent'      // 5–30 minutes
  | 'today'       // 30 min – 24 hours
  | 'week'        // 1–7 days
  | 'long_absent' // > 7 days
  | 'deceased'    // is_deceased = true (overrides last_seen)
  | 'none';       // no last_seen_at known (offline member who never logged in)

export interface PresenceInput {
  lastSeenAt?: string | null;
  isDeceased?: boolean;
}

/** Returns the presence bucket for a family member.
 *  Deceased overrides every other state — even if somehow `lastSeenAt` is set. */
export function getPresenceStatus({ lastSeenAt, isDeceased }: PresenceInput): PresenceStatus {
  if (isDeceased) return 'deceased';
  if (!lastSeenAt) return 'none';

  const lastSeen = Date.parse(lastSeenAt);
  if (Number.isNaN(lastSeen)) return 'none';

  const elapsed = Date.now() - lastSeen;
  if (elapsed < 0) return 'online';            // future-dated → treat as just-now
  if (elapsed < 5 * MINUTE) return 'online';
  if (elapsed < 30 * MINUTE) return 'recent';
  if (elapsed < 24 * HOUR) return 'today';
  if (elapsed < 7 * DAY) return 'week';
  return 'long_absent';
}

/** Hex color for a presence status, or null when no ring should render. */
export function getPresenceColor(status: PresenceStatus): string | null {
  switch (status) {
    case 'online':   return '#10B981'; // green-500
    case 'recent':   return '#F59E0B'; // amber-500
    case 'today':    return '#F97316'; // orange-500
    case 'week':     return '#EF4444'; // red-500
    case 'deceased': return '#9CA3AF'; // gray-400
    case 'long_absent':
    case 'none':
    default:
      return null;                     // no ring
  }
}

/** Convenience: combined call — input → ring color (or null). */
export function getPresenceRingColor(input: PresenceInput): string | null {
  return getPresenceColor(getPresenceStatus(input));
}
