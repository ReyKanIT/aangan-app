# v0.9.8 — Codex Testing Handoff

> Status: **sent to Codex for testing** · [2:40pm - 17Apr26]

## Scope

v0.9.8 is the CEO-Mode audit sweep across Growth, Bugs, UX, and Performance. It touches ~20 files, mostly surgical fixes (error handling, column names, tap targets), no schema changes.

## Pre-test checklist for Kumar

Before handing to Codex, ensure these migrations are applied in the Supabase SQL editor. They're idempotent, safe to re-run:

1. `supabase_migration_v0.9.2_event_advanced.sql` — hosted_by, event_gifts, event_gift_managers
2. `supabase_migration_v0.9.4_event_social.sql` — voice_invite_url, parent_event_id, event_co_hosts, event_potluck_items, event_potluck_signups
3. `supabase_migration_v0.9.7_user_issues.sql` — report_messages

If any haven't been applied yet, the affected sections degrade gracefully (42P01 detection), but **Codex will see partial functionality** on those features.

## Test matrix (what to poke)

### 🟢 Growth (highest business impact)

- [ ] Paste a shared `/events/:id` URL into WhatsApp → preview should show the **event title, date, hosted_by, and cover image**, NOT a plain-text fallback. (This was silently broken until v0.9.8 due to robots.txt disallow.)
- [ ] Check `https://aangan.app/robots.txt` — confirm `/events` and `/kuldevi` are under Allow, not Disallow.
- [ ] Check `https://aangan.app/sitemap.xml` — `/kuldevi` should appear.

### 🟢 Admin

- [ ] Open `/admin/settings` — page should either show populated rows OR show an amber diagnostic panel + "Initialize defaults" button (no longer blank).
- [ ] Open `/admin/issues` — unified inbox should show both support tickets and content reports.
- [ ] Reply to an issue using a template (e.g., "OTP not received") — user should receive an in-app notification.
- [ ] Mark an issue resolved via the checkbox — user gets a different notification ("Your issue is resolved").
- [ ] Click Save on an issue rapidly (before page fully loads) — should show "Session lost" rather than silently failing.

### 🟢 Events (host side)

- [ ] Create an event with a cover photo + voice invite + hosted_by text.
- [ ] Add 2 co-hosts. Co-host should see edit button on the event.
- [ ] Add a sub-event ("Haldi") to the parent wedding — should render as timeline.
- [ ] Add 2 potluck items + claim one. Host deletes an item — should work with confirm.
- [ ] Log 2 physical cards as hand-delivered — running count updates.
- [ ] Add a gift register entry (cash 5100 from चाचा रामकुमार) — total cash tally should update.
- [ ] Grant a second admin gift-register access — they should see the register.

### 🟢 Events (guest side)

- [ ] RSVP as "going" with guest count 4 + a note "पूरा परिवार आ रहे हैं".
- [ ] RSVP deadline passed → should see "RSVP की तारीख निकल गई" error instead of silent failure.
- [ ] Max attendees reached → should see "जगह पूरी भर गई" error.
- [ ] Click "Add to Calendar" → .ics downloads and imports cleanly into Apple Calendar / Google Calendar.
- [ ] On event day, click "मैं पहुँच गया/गई" — GPS check-in works when within 300m, falls back to manual when outside.
- [ ] Past event → Memory Recap section shows approved photos.

### 🟢 Dadi Test (grandmother usability)

- [ ] Every button on the event detail page is **≥52px tall** (use devtools inspector).
- [ ] On mobile (<640px): after copying invite link, the "कॉपी हुआ" confirmation text is visible (not just the ✅ emoji).
- [ ] Destructive actions (delete event, remove co-host, remove gift manager, delete potluck item, delete gift entry) all show a confirm step.

### 🟢 React Native app

- [ ] RSVP from RN — verify the row lands in `event_rsvps.guests_count` (was silently writing to `plus_count` which doesn't exist).
- [ ] Version in Settings reads v0.9.8 (was mismatched: app.json 0.9.1, package.json 0.8.0).

### 🟢 Performance

- [ ] `/events/[eventId]` first-load size reports **17.6 kB** (was 20.4 kB). Check Network tab.
- [ ] Opening the edit modal should show a brief loading state (it's now dynamically imported).

## Known issues (intentionally deferred from v0.9.8)

- Landing page `/` still renders from client — SEO crawlers see a spinner. Biggest growth win, but needs a proper server/client split refactor. **Target: v0.9.9**.
- Middleware is 167 kB on every request → ~100-300ms TTFB on 3G. **Target: v0.9.9**.
- Shared chunk `8837-*.js` is 122 kB, pulls supabase+zustand+sentry into every route. Needs `@next/bundle-analyzer` pass. **Target: v0.9.9+**.
- `supabase_schema.sql` is known-stale (says `event_date`, `plus_count`; live DB uses `start_datetime`, `guests_count`). Will regenerate from prod snapshot. **Target: v0.9.9**.
- Profile-setup funnel trim (5 fields → 1 required + skip). **Target: v0.9.9**.
- Public share CTAs on `/panchang`, `/festivals`, `/demo`. **Target: v0.9.9**.

## Rollback plan

If Codex finds a blocker:

```bash
git revert c461246  # v0.9.8 commit
git push origin main
# Vercel will auto-deploy the reverted state
```

No DB changes to roll back — v0.9.8 is a code-only release.

## Release artifacts

- Tag: `v0.9.8` (pushed to GitHub)
- Vercel: auto-deployed to production
- Commit: `c461246`
- Admin visibility: `/admin/versions` shows the release history
