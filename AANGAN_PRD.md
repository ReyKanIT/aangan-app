# Aangan (आँगन) — Product Requirements Document

> **Living document.** Updated after every release. Last updated: 2026-04-29

---

## Version History

| Version | Date       | Summary |
|---------|------------|---------|
| v0.1    | 2026-03-30 | Core app — OTP auth, family tree (L1/L2/L3), posts, events with RSVP, event photos with QR guest upload, storage tiers, referral system |
| v0.2    | 2026-03-31 | Security hardening — RLS policies, block/report system, audit logs, rate limiting Edge Function, web app (Next.js 15) |
| v0.3    | 2026-04-01 | Social features — comments, reactions, 1-on-1 messages, push notifications, member profiles, edit/delete posts, full-screen photo viewer, guided onboarding flow |
| v0.4    | 2026-04-03 | Cultural layer — Stories carousel, interactive SVG family tree, Panchang/Vedic calendar (self-contained, GPS-accurate), dark/light/system theme, Hindi↔English switch across all screens, profile (DOB, Gotra, Family Role), Google OAuth, poll creation, notification tabs |
| v0.4.1  | 2026-04-03 | EAS crash fix — Supabase env vars injected in all EAS build profiles; production-apk profile for Indus App Store |
| v0.4.2  | 2026-04-04 | Kuldevi / Kuldevta — temple location, puja paddhati, puja niyam (all optional, family-visible only) |
| v0.4.3  | 2026-04-04 | Major Life Events — birth & death events with fully customisable Sutak rules (days, 6 rule toggles, custom notes), live countdown banners, barsi tracking |
| v0.4.4  | 2026-04-04 | Family Reminders — family_important_dates (birthday/anniversary/barsi/puja/other), Supabase Edge Function daily-reminders fires at 08:00 IST via pg_cron, sends batch push notifications to all L1+L2 family members, dedup log prevents duplicates, wedding_anniversary field on profile |
| v0.5.0  | 2026-04-04 | Voice Enabled — voice-to-text on all text inputs (Hindi + English), voice commands for hands-free navigation (8 commands), voice messages in chat (WhatsApp-style audio notes), language selector on login screen |
| v0.6.0  | 2026-04-09 | Media & Storage — B2 cloud storage with Cloudflare CDN (media.aangan.app), post likes persistence (Supabase post_likes table + auto-count trigger), client-side image compression (max 1MB, 1920px, WebP), version bump for all platforms |
| v0.7.0  | 2026-04-10 | AI & Communication — Aangan chatbot (family assistant), DMs/messaging enhancements, notification system improvements |
| v0.8.0  | 2026-04-11 | Play Store submission + Vercel web deploy. Admin dashboard, Expo SDK 36 upgrade, Dadi Test compliance audit pass |
| v0.9.x  | Apr 13–25  | Growth unlock — landing SSR, public share CTAs, dynamic OG images for events, referral attribution, PWA install, viral-loop CEO sweep, MSG91/Vi DLT chain approval, Indus reviewer flow, family tree overhaul (zoomable diagram + exhaustive relationships) |
| v0.10.x | Apr 26     | OTP postmortem fix — env-var name mismatch, real SMS for all Indian mobiles, reviewer-bypass disabled, settings footer auto-version |
| v0.11.0 | Apr 27     | Family tree visual overhaul — full profile fields per member |
| v0.12.0 | Apr 28     | Festival notifications — DB-backed catalogue, regional + opt-in, "Next Festival" banner |
| v0.12.1 | Apr 28     | Recurring panchang events migration + dual-calendar reminders (tithi AND English date) for personal events |
| v0.12.2 | Apr 28     | Bug-fix sweep — new-user upsert, panchang TZ, GPS-blocked fallback, iOS Safari safe-area |
| v0.12.3 | Apr 28     | Avatar uploads → Supabase Storage (was leaking to B2), 2-column tithi/nakshatra UI |
| v0.12.4 | Apr 28     | Family-tree native scroll, PublicShareCTA hydration fix, RN crash-proofing pass |
| v0.12.5 | Apr 29     | **Production-readiness sweep** — RLS lockdown (Phase A), audience-respecting RLS, notification recipient validation, search_path hardening on 18 SECURITY DEFINER functions, corrected v0.2.2 indexes, storage bucket size+MIME limits, JWT-verified edge functions, new `send-push` edge function, web `middleware.ts` deduped + server-side profile-completeness check, `users(*)` joins trimmed across stores, RN version sync 0.9.14 → 0.9.15, `secureLog` migration, Sentry-ready binding, **`daily-reminders` `aangan_events` → `events` fix (event reminders had been silently dead since v0.8.0)**, privacy policy expanded to cover applicable Indian privacy law |

---

## 1. Vision

**Aangan** (आँगन — the courtyard, the heart of an Indian home) is a private family social network built exclusively for Indian families. It replaces scattered WhatsApp groups and Facebook albums with a structured, culturally-aware platform that preserves family heritage, manages events, and keeps generations connected.

**Core promise:** Your family's memories, relationships, and traditions — private, permanent, and beautiful.

---

## 2. Target Users

| Segment | Description |
|---------|-------------|
| **Primary** | Indian families with members spread across cities/countries |
| **Dadi Test** | UI designed to be usable by grandmothers (60+): 52px+ buttons, 16px+ text, Hindi-first |
| **Family admin** | 1 admin per family manages invites, moderation, and settings |
| **Extended family** | 3-level hierarchy — immediate (L1), close extended (L2), wider extended (L3) |

---

## 3. Design Principles

- **Dadi Test (दादी टेस्ट):** Every screen usable by a 65-year-old grandmother with basic smartphone skills
- **Hindi-first:** All UI in Hindi with English subtitles; full toggle available
- **Privacy by default:** Family-only content, granular audience control per post/event
- **Cultural authenticity:** Panchang, Kuldevi, Sutak, Barsi — real Indian family life, not a generic social network
- **Offline-resilient:** Core content cached; Panchang works offline via self-contained engine

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Haldi Gold | `#C8A84B` | Primary CTAs, active states |
| Mehndi Green | `#7A9A3A` | Success, secondary |
| Cream | `#FDFAF0` | Background |
| Brown | `#4A2C2A` | Primary text |

---

## 4. Feature Specification

### 4.1 Authentication
- Phone OTP (Supabase + Twilio SMS)
- Email OTP
- Google OAuth (sign-in with Google)
- Auto-detect returning user vs new user
- Profile setup: name (Hindi + English), photo, village, state, DOB, Gotra, Family Role, Wedding Anniversary

### 4.2 Family Tree

**Member management**
- 3-level hierarchy: L1 (immediate), L2 (close extended), L3 (wider extended)
- Search by phone number to find registered users
- WhatsApp invite for unregistered members
- Relationship labels in Hindi (40+ options)
- Member profile cards with photo, relationship, location
- Tab views: L1 / L2 / L3 / All / Tree

**Interactive SVG Tree (v0.4)**
- Visual generational layout with connection lines
- Gold lines = L1, dashed = L2/L3
- Member circles with initials, names, relationship labels
- Current user shown as larger Mehndi Green node
- Nested ScrollView for pan navigation

**Life Events tab (v0.4.3)**
- Birth events: person name, gender, birth place, relationship
- Death events: person name, age, relationship
- Sutak / Paatak period:
  - Master toggle (disable if family doesn't observe)
  - Customisable days (default birth=10, death=13)
  - 6 individual rule toggles: no temple / no havans / no home puja / no mangal work / no food sharing / no new ventures
  - Custom notes for family-specific rules
- Live countdown banner when Sutak is active
- End-date display, active rule chips

### 4.3 Posts & Feed

- Text, photo, video, document posts
- Audience control: All family / Level 1–2 / Custom group
- Reactions: ❤️ Like, 🙏 Namaste
- Comments with reply threading
- Edit / Delete own posts
- Poll creation: add options, vote, see results
- Infinite scroll with pagination
- Stories carousel (24-hour expiry, photo/video, captions)

### 4.4 Events & RSVP

- Event types: Wedding, Engagement, Puja, Birthday, Gathering, Mundan, Housewarming, Other
- Multi-ceremony support (Mehndi, Sangeet, Pheras, etc.)
- RSVP: Accepted / Declined / Maybe / Pending
- RSVP tracker for organisers
- Physical card sent tracking
- GPS check-in at venue
- QR code guest upload — guests upload photos without installing the app

**Event photo gallery**
- Full-screen viewer with swipe navigation
- Photo approval moderation
- Privacy controls per photo (L1/L2/custom)

### 4.5 Notifications

- Push notifications via Expo + Supabase Edge Functions
- Notification types: new post, comment, reply, DM, event invite, RSVP update, new family member, photo approved, storage upgrade, referral verified
- Filter tabs: All / Invitations / Comments / Reactions
- Mark individual / mark all read
- Real-time via Supabase Realtime subscription

**Family reminders (v0.4.4 + v0.12.1 dual-calendar + v0.12.5 fix)**
- Daily 08:00 IST automated push to all family members for:
  - Birthdays (from `date_of_birth`)
  - Wedding anniversaries
  - Custom important dates: birthday / anniversary / barsi / annual puja / other
  - Upcoming family events (next 7 days)
- Notification windows: same day, 1 day before, 3 days before, 7 days before
- Per-date toggle to pause without deleting
- Per-date choice: notify family (L1+L2) or self only
- Dedup log — never sends same reminder twice per day
- Upcoming occasions banner on ImportantDates screen
- v0.12.1 — personal-event reminders fire on **both** the Hindu tithi and the English calendar date (dual-calendar)
- v0.12.5 — **bug fix:** the upcoming-events branch of the cron queried a non-existent table `aangan_events` (real table is `events`), so event reminders had been silently dead from v0.8.0 (Apr 11) until 2026-04-29. Birthday + anniversary reminders had been working throughout. Fix landed in commit `1e3d84a`.
- v0.12.5 — `daily-reminders` edge function now requires a `CRON_SECRET` bearer token; configure via `supabase secrets set CRON_SECRET=…` and pass it from the cron caller

### 4.6 Messaging

- 1-on-1 direct messages
- Real-time delivery via Supabase Realtime
- Read receipts
- Conversation list with last message and unread count

### 4.7 Cultural Features

**Panchang / Vedic Calendar (v0.4)**
- Self-contained engine — no external API, works offline
- Algorithms: Jean Meeus "Astronomical Algorithms"
- Outputs: Tithi (30 names), Nakshatra (27 names), Yoga (27 names + शुभ/अशुभ/सामान्य), Vara (day in Hindi), Masa (12 solar months), Vikram Samvat, Sunrise/Sunset
- GPS location used for accurate sunrise/sunset — falls back to Delhi coordinates
- Moon phase emoji on widget header (🌑→🌕→🌑)
- Expandable widget in home feed

**Kuldevi / Kuldevta (v0.4.2)**
- Kuldevi: name + temple location
- Kuldevta: name + temple location
- Puja Paddhati (method/procedure) — free text
- Puja Niyam (rules, special notes) — free text
- All fields optional; visible to family members only

**Festivals**
- Pre-loaded Indian festival calendar
- Upcoming festivals strip in home feed (next 30 days)

### 4.8 Storage

- Base: 10 GB per user
- Referral bonus: +2 GB per verified referral (up to 100 referrals)
- Tiers: Base → Bronze (25 GB) → Silver (50 GB) → Gold (100 GB)
- Paid add-ons: individual (₹29–₹249/month) and family pool (₹119–₹699/month)

**Event bundles (one-time purchase)**
| Bundle | Price | Storage | Photos | Video | Expiry |
|--------|-------|---------|--------|-------|--------|
| Shagun | ₹499 | 50 GB | 500 | ✗ | 3 months |
| Mangal | ₹1,499 | 200 GB | Unlimited | ✗ | 12 months |
| Maharaja | ₹4,999 | 500 GB | Unlimited | ✓ | 36 months |
| Puja | ₹199 | 25 GB | 200 | ✗ | 1 month |
| Gathering | ₹499 | 50 GB | 500 | ✗ | 3 months |
| Engagement | ₹799 | 100 GB | 1,000 | ✗ | 6 months |

### 4.8.1 Voice Enabled Operations (v0.5.0)

**Voice-to-Text Input**
- Mic button on all text inputs: Post Composer, Family Tree search, Chat, Comments, Event Creator
- Speech recognition languages: Hindi (hi-IN) and English (en-IN)
- Dadi Test compliant — mic button 52px+ with clear visual affordance
- Uses `expo-speech-recognition` for on-device STT

**Voice Commands**
- Floating action button for hands-free navigation (accessible from all screens)
- 8 supported commands in Hindi and English:
  - "घर दिखाओ" / "Show Home"
  - "परिवार दिखाओ" / "Show Family"
  - "नया पोस्ट लिखो" / "New Post"
  - "सूचनाएं दिखाओ" / "Show Notifications"
  - "सेटिंग खोलो" / "Open Settings"
  - "संदेश दिखाओ" / "Show Messages"
  - "इवेंट बनाओ" / "Create Event"
  - "खोजो" / "Search"
- Matching algorithm: Jaccard word-overlap (fuzzy, handles partial matches)
- Visual feedback: pulsing mic animation while listening, command confirmation toast

**Voice Messages in Chat**
- Record and send audio messages (WhatsApp-style voice notes)
- Format: M4A (AAC), max duration 120 seconds
- Waveform visualization during recording and in message bubbles
- Play/pause controls in received message bubbles
- Stored in Supabase Storage `voice-messages` bucket
- Uses `expo-av` for recording and playback

**Language Selector on Login (v0.5.0)**
- Hindi/English toggle on login screen, shown before authentication
- Allows users to set preferred language before entering the app
- Persisted via AsyncStorage, applied across all screens immediately

---

### 4.9 Settings

- Language toggle: हिंदी ↔ English (persisted, applied across all screens)
- Theme: ☀️ Light / 🌙 Dark / 📱 System (AsyncStorage persisted)
- Notification preferences per type (on/off)
- Profile privacy (who can see profile)
- Kuldevi / Kuldevta info
- Family important dates & reminders
- Storage usage ring with upgrade CTA
- Referral / share invite link
- Help / FAQ / Feedback / Email support
- Legal: Terms, Privacy Policy

### 4.10 Admin

- Web admin dashboard (Next.js 15, Supabase SSR)
- Content moderation: approve/reject photos, resolve reports
- User management
- App-wide settings (JSONB key-value store)
- Audit log viewer

### 4.11 Web App

- Next.js 15 + Tailwind CSS, deployed on Vercel at https://aangan.app
- Phone OTP + email + Google OAuth login
- Supabase Auth SSR with middleware (server-side profile-completeness check + protected-route gating)
- PWA-installable, dynamic OG images on event share links
- Sentry instrumentation (client + edge + server runtimes)

#### 4.11.1 Authenticated routes (full feature parity with mobile)

The web app is **not** a thin admin tool — it is a full secondary front-end. Every authenticated mobile screen has a web counterpart:

| Web route | Purpose |
|---|---|
| `/feed` | Family feed with posts, polls, stories, reactions, threaded comments |
| `/family` | Family tree (zoomable diagram), member list with L1/L2/L3 tabs, add by phone search, add new members |
| `/events` | Event listing, event detail page, RSVP, ceremonies, photo gallery, gift register |
| `/events/[eventId]` | Server-rendered with dynamic OG images for WhatsApp/iMessage previews |
| `/messages` | 1-on-1 chat with realtime updates and read receipts |
| `/notifications` | Filtered notification feed |
| `/kuldevi` | Kuldevi/Kuldevta config page |
| `/tithi-reminders` | Manage important dates with dual-calendar (tithi + English) reminders |
| `/chatbot` | Aangan family assistant (v0.7) |
| `/settings` | Language toggle, theme, notification prefs, profile, storage usage, referral, legal |
| `/profile-setup` | Post-OTP profile completion (Hindi+English name, photo, village, state, DOB, gotra, family role, wedding anniversary) |

#### 4.11.2 Public / SEO routes (no auth required)

| Web route | Purpose |
|---|---|
| `/` | Landing — Hindi-first hero, feature grid, Dadi Test cards, download CTAs (APK + Indus + iOS-coming-soon) |
| `/login`, `/otp` | Phone OTP auth flow |
| `/invite` | "Invite your family to Aangan" share-CTA page (WhatsApp share button, QR code) |
| `/panchang` | Today's Panchang (tithi, nakshatra, yoga, vara, masa, sunrise/sunset) — works without login, GPS-aware with Delhi fallback |
| `/festivals` | Indian festival catalog with regional filters |
| `/demo` | Marketing demo / screenshot tour |
| `/support` | Help / contact form |
| `/privacy`, `/terms` | Legal pages |
| `/upload/[eventId]` | **Guest upload portal** — QR scan → upload event photos without account. Anonymous-INSERT bucket policy with size/MIME guards |
| `/auth/callback` | OAuth/PKCE redirect handler |

#### 4.11.3 Admin routes (`is_app_admin = true` required)

| Web route | Purpose |
|---|---|
| `/admin` | Dashboard — DAU/WAU/MAU/D7-D30 retention, recent users/posts/events/reports, support queue |
| `/admin/users` | User management — search by name/phone, role/admin toggle, deactivate |
| `/admin/analytics` | Engagement metrics, time-series breakdowns |
| `/admin/reports` | Content moderation queue (approve/reject reports) |
| `/admin/issues` | Combined view: support tickets + content reports |
| `/admin/audit` | Audit log viewer with actor + action filters |
| `/admin/feedback-digest` | Aggregated feedback summary, exportable |
| `/admin/support` | Support ticket workspace with inline chat |
| `/admin/settings` | App-wide JSONB settings (`app_settings` table) |
| `/admin/versions` | Release history (driven by `aangan_web/src/data/versions.ts`) |

---

### 4.12 Support & Feedback System (added v0.5+, formalized v0.9)

> Not in the original §4 spec. Documented retrospectively per the 2026-04-29 PRD audit.

**RN screens:**
- `screens/support/HelpScreen.tsx` — FAQ + contact CTAs
- `screens/support/FeedbackScreen.tsx` — bilingual feedback form
- `screens/support/MyTicketsScreen.tsx`, `TicketDetailScreen.tsx`, `SupportChatScreen.tsx` — full ticket lifecycle with chat thread
- `screens/support/ReportContentScreen.tsx` — flag posts/comments/users for moderation

**Web counterpart:** `/support` (public-facing) and `/admin/support` + `/admin/issues` (admin workspace).

**DB tables:** `support_tickets`, `support_messages`, `content_reports` — RLS-protected, private-to-user except admin role.

**Cron:** `aangan_web/src/app/api/cron/feedback-digest/route.ts` — daily aggregation for admin review.

---

### 4.13 Festivals (extended in v0.12.0)

Original §4.7 mentioned only "pre-loaded calendar + upcoming strip". Reality is a richer feature:

- **DB-backed catalog:** `system_festivals` table (`supabase/migrations/20260428_system_festivals.sql`) — every festival has name (Hindi + English), date, region, and category.
- **Regional opt-in:** users select which regions' festivals they want (North / South / East / West / All India).
- **"Next Festival" banner** on home feed — countdown to the next opted-in festival.
- **Festival push notifications** (v0.12.0) — daily-reminders cron pushes a notification on the day of, opt-in.
- **Public `/festivals` SEO page** — full catalog browsable without login.

---

## 5. Technical Architecture

### Frontend — React Native (Expo SDK 36)
- Navigation: `@react-navigation/native-stack` + bottom tabs
- State: Zustand stores (auth, post, family, event, notification, message, story, theme, language, lifeEvent, importantDate, voice)
- Styling: StyleSheet with centralized theme tokens (colors, typography, spacing)
- Push: `expo-notifications` + Expo Push API
- Location: `expo-location` (GPS for Panchang accuracy)
- Images: `expo-image-picker` + Supabase Storage
- SVG: `react-native-svg` (family tree visualization)
- Panchang: self-contained astronomical engine (Jean Meeus algorithms)
- Speech: `expo-speech-recognition` (voice-to-text + voice commands)
- Audio: `expo-av` (voice message recording/playback)
- TTS: `expo-speech` (text-to-speech, future use)

### Backend — Supabase
- Auth: Phone OTP + Email OTP + Google OAuth
- Database: PostgreSQL with RLS on every table
- Storage: event-photos bucket, story-media bucket, voice-messages bucket
- Realtime: direct_messages, post_comments subscriptions
- Edge Functions: rate-limit, audit-log, daily-reminders (pg_cron at 02:30 UTC)

### Web — Next.js 15
- Hosted: Vercel
- Auth: Supabase SSR
- Features: Admin, Guest upload

### CI / Distribution
- EAS Build profiles: development (simulator), preview (APK), preview-ios-sim, production (IPA/AAB), production-apk
- Firebase App Distribution for internal beta testing
- Indus App Store: production-apk profile

---

## 6. Database Schema (key tables)

| Table | Purpose |
|-------|---------|
| `users` | Profile, push_token, DOB, gotra, family_role, wedding_anniversary, kuldevi/kuldevta fields |
| `family_members` | Bidirectional connections with L1/L2/L3 levels |
| `posts` | Content with audience controls |
| `post_comments` | Threaded comments |
| `post_reactions` | Like / Namaste |
| `post_polls` / `poll_votes` | Poll system |
| `aangan_events` | Events with RSVP + multi-ceremony |
| `event_rsvps` | RSVP with +guests, dietary prefs |
| `event_photos` | Photos with privacy + moderation |
| `direct_messages` | 1-on-1 messages |
| `notifications` | In-app notification store |
| `stories` / `story_views` | 24-hour stories |
| `life_events` | Birth/death events with Sutak rules (JSONB) |
| `family_important_dates` | Recurring dates with notification prefs |
| `reminder_notification_log` | Dedup for daily reminder function |
| `user_storage` | Storage tier tracking |
| `referrals` | Referral program |
| `content_reports` | Moderation queue |
| `audit_logs` | Security audit trail |
| `app_settings` | JSONB key-value config |

---

## 7. Migrations In Order

```
supabase_migration_v0.2_security.sql       — RLS, blocks, reports, audit
supabase_migration_v0.2.1_patch.sql        — security patches
supabase_migration_v0.2.2_indexes.sql      — performance indexes
supabase_migration_v0.2.3_guest_upload.sql — guest upload policy
supabase_migration_v0.3_features.sql       — comments, messages, onboarding
supabase_migration_v0.3.1_push_token.sql   — push_token column
supabase_migration_v0.4_features.sql       — stories, polls, DOB, gotra, theme
supabase_migration_v0.4.2_kuldevi.sql      — kuldevi/kuldevta columns
supabase_migration_v0.4.3_life_events.sql  — life_events + Sutak
supabase_migration_v0.4.4_reminders.sql    — family_important_dates + reminder_log
```

---

## 8. Shipped Features (v0.12.5) ✅

Most features in §4.1–4.13 are shipped. Asterisks below mark partial / regressed / postponed items uncovered in the 2026-04-29 PRD-vs-implementation audit.

| Feature | Status | Note |
|---------|--------|------|
| Phone OTP auth + Email OTP + Google OAuth | ✅ SHIPPED | |
| Family tree (L1/L2/L3) + interactive zoomable diagram | ✅ SHIPPED | v0.11.0 overhaul |
| Posts & feed with audience control + polls + stories | ✅ SHIPPED | |
| Events & RSVP with multi-ceremony, GPS check-in, QR upload | ✅ SHIPPED | |
| Voice messages + voice-to-text + voice commands | ✅ SHIPPED | M4A 120s, 8 commands |
| Panchang / Vedic calendar (self-contained Meeus engine) | ✅ SHIPPED | GPS-aware, Delhi fallback |
| Festival calendar + regional opt-in + push (v0.12.0) | ✅ SHIPPED | See §4.13 |
| Kuldevi / Kuldevta | ✅ SHIPPED | |
| Aangan chatbot (family assistant) | ✅ SHIPPED | v0.7.0 |
| DMs / messaging with read receipts (realtime) | ✅ SHIPPED | |
| Push notifications | ✅ SHIPPED | Expo Push (FCM migration deferred — see §9.2) |
| Family reminders — birthdays + anniversaries | ✅ SHIPPED | |
| Family reminders — upcoming events | ⚠️ FIXED 2026-04-29 | Was silently dead Apr 11 → Apr 29 (table-name typo `aangan_events` vs `events`). Fixed in commit `1e3d84a`. |
| Admin dashboard (web) — 9 sub-routes | ✅ SHIPPED | See §4.11.3 |
| B2 cloud storage + Cloudflare CDN | ✅ SHIPPED | |
| Supabase Storage hardening — file_size_limit + MIME allowlist | ✅ SHIPPED v0.12.5 | event-photos 20 MiB, family-photos 8 MiB, voice-messages 10 MiB, avatars 4 MiB |
| Dadi Test compliance (52px+ buttons, 16px+ text, Hindi-first) | ✅ SHIPPED | |
| Play Store submission (v0.8.0 AAB) | ✅ SHIPPED | |
| Web app live on Vercel | ✅ SHIPPED | Full feature parity — see §4.11.1 |
| Support / Tickets system (§4.12) | ✅ SHIPPED | Retrospectively documented in v0.12.5 audit |
| RLS hardening — users-table anon revoke, audience-respecting child-table policies, notification recipient validation, search_path on 18 SECURITY DEFINER functions | ✅ SHIPPED v0.12.5 | Migration files `20260429b/c/d/e/f/g_*.sql` |
| Edge function authn — JWT-verified `audit-log` / `rate-limit` / `send-push`, fail-closed `send-otp-sms`, CRON_SECRET on `daily-reminders` | ✅ SHIPPED v0.12.5 | |
| Privacy policy — applicable Indian privacy law sections | ✅ SHIPPED v0.12.5 | User rights, retention, cross-border, breach notification, privacy-team contact |
| Sentry web (Next.js) | ✅ SHIPPED | Per-runtime: client + edge + server |
| Sentry RN (mobile) | 🟡 BINDING SHIPPED | Inert until Kumar runs `npx expo install @sentry/react-native` + sets `EXPO_PUBLIC_SENTRY_DSN`. Documented in `KUMAR_PRODUCTION_TASKS_PLAYBOOK.md` Task 5. |

---

## 9. Roadmap — Next (revised post 2026-04-29 audit)

**Theme: Offline, Growth, and Performance**
**Status legend:** ✅ Shipped · 🟡 Partial · 🔴 Not started · ⏸ Deferred

### 9.1 Offline Mode — 🟡 Partial

**Shipped:**
- Offline indicator banner (`aangan_rn/src/components/common/OfflineBanner.tsx`) with Hindi "ऑफलाइन" label and Dadi Test-compliant sizing.
- NetInfo singleton + `withRetry` exponential-backoff helper (`aangan_rn/src/utils/network.ts`).
- Persisted offline queue primitive (factories + AsyncStorage) — built but not yet wired to post / comment / RSVP creation flows.
- Panchang already works offline (self-contained engine).

**Not shipped:**
- Local SQLite cache for family / posts / events.
- Queue-and-sync wiring on post / comment / RSVP creation.
- Conflict resolution UI ("server wins, user notified").
- Cache-expiry policy (7 days posts, 30 days family).

### 9.2 Push Notifications (FCM) — ⏸ Deferred

Honest re-assessment: **Expo Push is fine until ~10K MAU.** FCM migration is a multi-day refactor with native-build implications. Defer until reliability ceilings are hit OR until rich notifications (event-photo previews) become a real product need.

**Currently shipped under Expo Push:**
- Per-user `push_token` registration on login.
- `daily-reminders` cron at 08:00 IST → `https://exp.host/--/api/v2/push/send`.
- New `send-push` edge function (v0.12.5) with JWT auth + relationship validation.

**Not shipped (FCM-only):**
- Android notification channels (high/default/low priority lanes).
- Rich notifications with images.
- Notification grouping by type.
- Deep links from notification tap → open relevant screen.

### 9.3 WhatsApp Invite Deep Links — 🔴 Not started (HIGH-ROI)

Highest-leverage growth lever in §9 and not started. Spec:

- Generate shareable invite: `https://aangan.app/join/{family_code}`
- Family code = 6-char alphanumeric on `families.invite_code` (new column).
- WhatsApp share button with pre-filled Hindi message:
  > "🏡 आँगन पर हमारे परिवार से जुड़ें! अभी डाउनलोड करें: [link]"
- Deep link handling: web `/join/{code}` → install CTA → on app open after auth, auto-add as family member with invitee → inviter relationship.
- Invite tracking: `invites` table with `inviter_id`, `invitee_phone`, `code`, `created_at`, `claimed_at`, conversion rate.
- QR code generation for in-person invites (shaadi cards, family gatherings).

### 9.4 Photo Albums per Event — 🔴 Not started

- Auto-create album when event is created.
- Manual album creation within events.
- Album cover photo selection.
- Slideshow mode (auto-play with transitions).
- Download album as ZIP.
- Album sharing via link (privacy-respecting).

### 9.5 Performance Improvements — 🟡 Partial

**Shipped:**
- Skeleton screens on most list views.
- Client-side image compression (max 1MB, 1920px, WebP).
- Code-splitting on web for below-fold modals (`(app)/feed/page.tsx`, `(app)/events/[eventId]/page.tsx`).
- B2 + Cloudflare CDN for media.

**Not shipped:**
- FlashList virtualization on feed + family members.
- Blur-hash placeholders during image load.
- Image CDN resize variants (thumbnail / medium / full via Cloudflare transforms).
- Bundle size budget enforcement.
- Startup time target (< 3 sec on mid-range Android) not measured.

---

## 10. Roadmap — v1.0.0 (Target: July 2026)

**Theme: Production Launch, Multi-Platform, Community**

### 10.1 Production Release

- Google Play Store: full production launch (out of review/beta)
- App Store Optimization (ASO): Hindi + English keywords, screenshots, feature graphic
- In-app review prompt after 7 days of active use
- Crash reporting: Sentry integration
- Analytics: Mixpanel or PostHog for user engagement tracking

### 10.2 iOS App Store Launch

- EAS Build for iOS (production profile)
- Apple Developer account setup
- App Store review guidelines compliance
- iOS-specific UI adjustments (safe areas, haptics, Dynamic Island)
- TestFlight beta distribution before launch
- Universal Links for iOS deep linking

### 10.3 Family Analytics Dashboard

- Activity summary: daily/weekly/monthly active members
- Engagement metrics: posts created, comments, reactions, event RSVPs
- Family tree completeness score (% of members with photos, DOB, relationships filled)
- "Most active members" leaderboard (gamification)
- "Quiet members" nudge — suggest reaching out to inactive family members
- Admin-only view (family admin role)
- Export as PDF report

### 10.4 Video Messages

- Short video clips up to 30 seconds in chat
- Video recording with timer countdown
- Video compression (target: < 5 MB per clip)
- Thumbnail generation
- Playback in chat bubble (inline player)
- Storage: Supabase Storage `video-messages` bucket

### 10.5 Multi-Language Support

| Language | Script | Priority |
|----------|--------|----------|
| Hindi (हिंदी) | Devanagari | ✅ Already shipped |
| English | Latin | ✅ Already shipped |
| Gujarati (ગુજરાતી) | Gujarati | v1.0 |
| Kannada (ಕನ್ನಡ) | Kannada | v1.0 |
| Marathi (मराठी) | Devanagari | v1.0 |
| Tamil (தமிழ்) | Tamil | v1.0 |

- Karnataka has 65M+ population; Bangalore is India's tech capital — strategic for early adopter families
- i18n framework: `react-i18next` with namespace-based translation files
- Language selector in settings (expandable beyond 6 languages)
- Community-contributed translations (post-launch)
- RTL support preparation for future Urdu/Arabic

### 10.6 Family Memory Timeline

- Auto-generated yearly recap: "Your Family in 2026"
- Timeline view: major events, milestones, top posts, new members added
- Photo montage generation (top 12 photos of the year)
- Shareable recap card (image) for WhatsApp/Instagram
- Birthday & anniversary highlights
- "On this day" feature — resurface posts from 1 year ago

### 10.7 Community Features

- **Kuldevi/Village Connect:** find and connect with other families who share the same Kuldevi or ancestral village
- Community feed: public posts visible to connected families (opt-in)
- Community events: temple gatherings, village reunions visible to relevant families
- Privacy controls: families choose what to share with community (nothing by default)
- Moderation: community-level admins, report system
- Search: find families by Kuldevi name, village name, gotra, or state

---

## 11. Future Monetization (Phase 2+, post 10K families)

When Aangan reaches 10,000+ active families with strong retention, optional premium add-ons will be introduced. The core app remains 100% free forever.

| Add-On | Type | Price Range | Notes |
|--------|------|-------------|-------|
| Premium stickers & themes | One-time purchase | ₹49-199 | Rangoli, Mughal, Temple themes for posts |
| Professional family tree prints | One-time purchase | ₹299-999 | Physical poster or PDF export |
| Large event management (100+ guests) | Per-event purchase | ₹499-4,999 | Seating charts, vendor tools, guest management |
| Sponsored festival greetings | Free to users | Brands pay | Tasteful, family-appropriate brand partnerships |

No subscription model until proven demand and strong retention metrics.

---

## 12. Future Backlog (Post v1.0)

| Priority | Feature |
|----------|---------|
| Medium | Family recipe / tradition archive |
| Medium | Ancestral village map with GPS pins |
| Medium | Multi-family support (user belongs to multiple families) |
| Medium | Web app feature parity (posts, events, family tree on web) |
| Low | AR family tree (3D visualization) |
| Low | Family newspaper (auto-generated weekly digest PDF) |
| Low | Integration with genealogy services (FamilySearch, MyHeritage) |
| Low | Smart photo tagging (face recognition to tag family members) |
