/**
 * Release history — shown on /admin/versions.
 *
 * Maintained manually alongside each `npm version` bump + git tag. Newest
 * first. Keep entries terse — one line of `summary`, a bullet list of
 * highlights for the body. Stamp committedAt in ISO IST when cutting release.
 *
 * When Kumar adds a release, prepend here and bump package.json + tag.
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
    version: '0.12.0',
    releasedAt: '2026-04-17T12:30:00+05:30',
    stamp: '[12:30pm - 17Apr26]',
    summary: 'Voice invite, sub-event series, co-hosts, potluck, RSVP enforcement, WhatsApp OG preview, admin settings fix',
    category: 'feature',
    migration: 'supabase_migration_v0.12_event_social.sql',
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
    version: '0.11.0',
    releasedAt: '2026-04-17T10:35:00+05:30',
    stamp: '[10:35am - 17Apr26]',
    summary: 'Family RSVP, card tracker, GPS check-in, gift register, hosted-by',
    category: 'feature',
    migration: 'supabase_migration_v0.10_event_advanced.sql',
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
    version: '0.10.0',
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
