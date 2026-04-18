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
    version: '0.9.13',
    releasedAt: '2026-04-18T07:50:00+05:30',
    stamp: '[7:50am - 18Apr26]',
    summary: 'P0: Indus App Store reviewer OTP bypass — unblock signup while DLT template approval completes',
    category: 'fix',
    highlights: [
      'Indus App Store flagged signup as broken because OTP never arrives (DLT template pending → MSG91 400s)',
      '[auth.sms.test_otp] map in supabase/config.toml: 4 reviewer phones + fixed OTPs (Indus 9886110312→123456, Play 9000000001→654321, App Store 9000000002→246810, QA 9886110313→111222)',
      'send-otp-sms edge function short-circuits for those numbers before hitting MSG91 (belt-and-braces fallback if dashboard test_otp map gets out of sync)',
      'RN LoginScreen surfaces the real authStore error instead of generic "OTP नहीं भेज पाया" so reviewers/QA see the actual cause',
      'TESTING_INDUS_APP_STORE.md — ready-to-paste reviewer note for Indus "Edit Details" page',
      'APP_VERSION constant in aangan_rn/config/constants.ts fixed (was 0.5.0, now 0.9.13)',
      'aangan_rn versionCode 11 → 12 + version synced across app.json / package.json / constants.ts',
    ],
  },
  {
    version: '0.9.12',
    releasedAt: '2026-04-18T07:20:00+05:30',
    stamp: '[7:20am - 18Apr26]',
    summary: 'Android build bump for Play Console verification + stale APK URL fix',
    category: 'chore',
    highlights: [
      'aangan_rn/app.json — Android versionCode 10 → 11 (monotonic increment required for every Play submission)',
      'aangan_rn app.json + package.json version 0.9.8 → 0.9.12 (sync to web)',
      'aangan_web/src/app/page.tsx — APK_URL from Aangan-v0.9.0.apk → Aangan-v0.9.12.apk so the landing download link matches the build that will be produced by EAS on the next production build',
      'Footer stamp v0.9.10 → v0.9.12',
      'Google Play Android developer verification: see GOOGLE_PLAY_VERIFICATION_PLAN.md for the 7-step external-distribution registration Kumar must do manually on Play Console before Sept 2026',
    ],
  },
  {
    version: '0.9.11',
    releasedAt: '2026-04-17T16:15:00+05:30',
    stamp: '[4:15pm - 17Apr26]',
    summary: 'Viral loop — dynamic OG images, referral attribution, PWA install on landing (incl. iOS), optional pg_cron runbook',
    category: 'feature',
    migration: 'supabase_migration_v0.9.11_referrals.sql + supabase_migration_v0.9.11_pg_cron_optional.sql',
    highlights: [
      'Dynamic 1200x630 OG image at /events/:id/opengraph-image (Next ImageResponse) — every shared event link now renders a branded preview card even when host did not upload a banner',
      'Host-uploaded banner still wins when present; generic fallback covers the rest',
      '?ref=<uid> captured on landing + login with first-touch attribution, 90-day cookie + sessionStorage',
      'users.referred_by + referred_at columns (migration v0.9.11_referrals) — backfilled at profile-setup save',
      'user_referral_leaderboard view (future /admin/referrals page)',
      'PWAInstallPrompt moved from AppShell to root layout → landing + public pages now get install nudge',
      'iOS Safari branch added: detects iPhone/iPad + no standalone mode + shows "Tap Share → Add to Home Screen" instructions (Android Chrome branch unchanged)',
      'OPTIONAL pg_cron runbook (supabase_migration_v0.9.11_pg_cron_optional.sql) — lets Kumar enable 5-min scheduled-invite sweeps on free Supabase, sidestepping the Vercel Hobby daily-cron limit',
    ],
  },
  {
    version: '0.9.10',
    releasedAt: '2026-04-17T15:55:00+05:30',
    stamp: '[3:55pm - 17Apr26]',
    summary: 'Growth unlock — landing SSR, profile-setup funnel trim, public share CTAs, middleware slim',
    category: 'fix',
    highlights: [
      'Landing page now renders content HTML to Googlebot / WhatsApp crawlers (removed the checking=true spinner gate that was blocking SSR body)',
      'Profile-setup funnel trimmed: Hindi name, city, bio moved into an optional <details> disclosure; only name is required to Continue',
      'PublicShareCTA on /panchang, /festivals, /demo — WhatsApp share + copy link + login CTA to turn passive SEO traffic into sharing + signup loops',
      'Middleware matcher tightened: /api/*, /auth/callback, /upload/*, /panchang, /festivals, /demo, /privacy, /terms, /invite, /tithi-reminders, /support no longer invoke @supabase/ssr bundle on every request (cuts TTFB on SEO pages)',
      'Footer version stamp updated on landing + panchang + festivals (was stale v0.9.0)',
    ],
  },
  {
    version: '0.9.9',
    releasedAt: '2026-04-17T15:20:00+05:30',
    stamp: '[3:20pm - 17Apr26]',
    summary: 'Bulk invite scheduler — paste, contact picker, schedule one-shot send to all invitees',
    category: 'feature',
    migration: 'supabase_migration_v0.9.9_bulk_invites.sql',
    highlights: [
      'BulkInviteManager on every event detail page (hosts + co-hosts only)',
      'Paste invitees as "Name, 9876543210" one per line — dedupes, validates Indian mobile pattern',
      'Optional Contact Picker API on Android Chrome (progressive enhancement; paste fallback everywhere)',
      'Auto-matches pasted phones against existing Aangan users — shows ✓ / 📱 SMS only',
      'Schedule a one-shot batch send at a fixed IST time, or "Send now"',
      'Daily Vercel cron (00:15 IST sweep) drains pending queue: in-app notifications to existing users, MSG91 SMS to non-users (gated on DLT template approval). "Send now" button triggers immediately.',
      'Pre-seeds event_rsvps with status=pending so invitees see the event in /events immediately',
      'Per-invitee status tracking (pending → sent/failed) with error detail',
    ],
  },
  {
    version: '0.9.8',
    releasedAt: '2026-04-17T14:35:00+05:30',
    stamp: '[2:35pm - 17Apr26]',
    summary: '🧪 CODEX TEST CANDIDATE — CEO Mode audit sweep (growth, bugs, UX, perf)',
    category: 'fix',
    highlights: [
      'robots.txt unblocked /events + /kuldevi — fixes WhatsApp preview for every shared event link (huge viral unlock)',
      'sitemap.ts added /kuldevi entry (distinct low-competition SEO keyword)',
      'guest-upload API: end_time (non-existent) → end_datetime — upload deadlines now actually enforce 7-day post-event cutoff',
      'admin/issues inbox: guarded sender_id against null + surfaces ticket/report update errors that were silently swallowed',
      'PotluckSection: captured mutation errors + shows 42P01 "migration pending" banner',
      'PhysicalCardTracker: surfaced errors so hosts know when a card toggle doesn\'t save',
      'RN app: plus_count → guests_count everywhere (matches live DB, was silently writing non-existent column)',
      'RN version sync: app.json + package.json both now 0.9.8',
      'Lazy-loaded EventEditModal, GiftManagersModal, CoHostsModal on event detail (perf)',
      'Dadi Test: 7 bare-link buttons upgraded to 52px+ tap targets with proper labels (co-host +/हटाएं, gift manager +/हटाएं, gift access, sub-event +, memory +फ़ोटो, event edit, potluck delete ✕)',
      'Event invite copy confirmation now visible on mobile (was hidden on sm breakpoint)',
      'Removed stray root package-lock.json (Sentry/Next build warning)',
    ],
  },
  {
    version: '0.9.7',
    releasedAt: '2026-04-17T13:45:00+05:30',
    stamp: '[1:45pm - 17Apr26]',
    summary: 'User-issue reply plumbing — unified /admin/issues inbox, Hindi/English templates, user notifications on reply & resolve',
    category: 'feature',
    migration: 'supabase_migration_v0.9.7_user_issues.sql',
    highlights: [
      'New /admin/issues page consolidates support_tickets + content_reports into one triage inbox',
      'Shared ReplyComposer with 10 built-in Hindi/English templates (OTP, photo upload, family, events, moderation, profile, generic)',
      'Every admin reply + every resolve now fires an in-app notification to the user (notifications table, bilingual)',
      'Content reports gain a reply thread via new report_messages table (mirrors support_messages)',
      '/admin/support: replies + resolves now notify the ticket owner',
      '/admin/reports: resolve/dismiss now notifies the reporter with tailored Hindi+English copy',
      'Issues Inbox nav link prominent in admin sidebar',
    ],
  },
  {
    version: '0.9.6',
    releasedAt: '2026-04-17T13:15:00+05:30',
    stamp: '[1:15pm - 17Apr26]',
    summary: 'Admin settings page self-heals — seeds defaults + diagnostic when DB empty',
    category: 'fix',
    highlights: [
      'Empty `app_settings` table now surfaces "Initialize defaults" button (one-click seed)',
      'Inline diagnostic shows exact Postgres error (42P01 no table, 42501 RLS block, etc.)',
      'Refresh button + row-count in header for quick sanity check',
      '"Add any missing defaults" available even when table is partially populated',
      'Handles null `updated_at` gracefully (shows "Never" instead of "Invalid Date")',
    ],
  },
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
