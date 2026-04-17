/**
 * Release history — shown on /admin/versions.
 *
 * Versioning strategy: we stay in the 0.9.x series through the beta. v1.0 is
 * reserved for the major release with all known bug fixes landed. Each beta
 * ship → patch bump (0.9.5, 0.9.6, …).
 *
 * Maintained manually alongside each `npm version` bump + git tag. Newest
 * first. Keep entries terse — one line of `summary`, a bullet list of
 * highlights for the body. Stamp `stamp` in project format (CLAUDE.md Hard Rules).
 *
 * When Kumar ships a release, prepend here and bump package.json + tag.
 */

export interface ReleaseNote {
  version: string;
  releasedAt: string; // ISO timestamp
  stamp: string;      // project-format timestamp from CLAUDE.md Hard Rules
  summary: string;
  highlights: string[];
  migration?: string; // filename in repo root if a DB migration ships alongside
  category: 'feature' | 'fix' | 'chore' | 'security';
}

export const RELEASES: ReleaseNote[] = [
  {
    version: '0.9.5',
    releasedAt: '2026-04-17T12:50:00+05:30',
    stamp: '[12:50pm - 17Apr26]',
    summary: 'Collapse version tags back into 0.9.x series (reserving v1.0 for the major release)',
    category: 'chore',
    highlights: [
      'Retagged v0.10.0 → v0.9.2, v0.11.0 → v0.9.3, v0.12.0 → v0.9.4 (same commits)',
      'Renamed migration files to match (v0.9.2_event_advanced, v0.9.4_event_social)',
      'package.json now tracks the 0.9.x beta line — next ship is v0.9.6',
      'v1.0.0 held for major release after the remaining bug sweep',
    ],
  },
  {
    version: '0.9.4',
    releasedAt: '2026-04-17T12:30:00+05:30',
    stamp: '[12:30pm - 17Apr26]',
    summary: 'Voice invite, sub-event series, co-hosts, potluck, RSVP enforcement, WhatsApp OG preview, admin settings fix',
    category: 'feature',
    migration: 'supabase_migration_v0.9.4_event_social.sql',
    highlights: [
      'Voice invite recorder (30s max) — elders record blessing, plays inline on event page',
      'Sub-event series (parent/child) — तिलक → हल्दी → मेहंदी → संगीत → शादी',
      'Co-hosts with edit rights — bride/groom/mothers all manage the event',
      'Potluck sign-up ("क्या लाओगे?") — host adds items, guests claim with quantity',
      'max_attendees + rsvp_deadline now enforced client-side at RSVP time',
      'Rich OG metadata on /events/:id — WhatsApp previews with banner image',
      'Admin settings page bug fixed (was keying on non-existent `id` column)',
      'Admin /versions history table (this page)',
    ],
  },
  {
    version: '0.9.3',
    releasedAt: '2026-04-17T10:35:00+05:30',
    stamp: '[10:35am - 17Apr26]',
    summary: 'Family RSVP, card tracker, GPS check-in, gift register, hosted-by',
    category: 'feature',
    migration: 'supabase_migration_v0.9.2_event_advanced.sql',
    highlights: [
      'Family-style RSVP with quick headcount picks + guest-names note',
      'Physical invitation card tracker (हाथ से/पोस्ट से/कूरियर से)',
      'GPS check-in on event day — auto-confirm if within 300m of tagged coords',
      'Private gift register (शगुन/नेग बही) with event_gift_managers access control',
      '"किनकी ओर से" (on-behalf-of) field surfaces on invite + event page',
      'LocationPicker on event create/edit',
    ],
  },
  {
    version: '0.9.2',
    releasedAt: '2026-04-17T09:55:00+05:30',
    stamp: '[9:55am - 17Apr26]',
    summary: 'Cover photo, WhatsApp invite card, ICS export, edit/delete, RSVP notes, memory recap',
    category: 'feature',
    highlights: [
      'Event cover photo upload (creator + edit)',
      'WhatsApp-first EventInviteCard with inviter-context preview',
      'Calendar export (.ics) — Apple/Google/Outlook Calendar',
      'Edit/Delete event UI (creator-only, confirm-step delete)',
      'RSVP note + plus-count exposed in attendee list',
      'Post-event Memory Recap (photo grid on past events)',
    ],
  },
  {
    version: '0.9.1',
    releasedAt: '2026-04-16T23:50:00+05:30',
    stamp: '[11:50pm - 16Apr26]',
    summary: 'Invite share card, offline & deceased family members',
    category: 'feature',
    highlights: [
      'Reusable InviteShareCard (WhatsApp + Copy Link + native share)',
      'Offline family member records (added by trees, no account required)',
      'Deceased member flag in tree',
    ],
  },
];
