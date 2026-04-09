# Aangan (आँगन) — Product Requirements Document

> **Living document.** Updated after every release. Last updated: 2026-04-09

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

**Family reminders (v0.4.4)**
- Daily 08:00 IST automated push to all family members for:
  - Birthdays (from `date_of_birth`)
  - Wedding anniversaries
  - Custom important dates: birthday / anniversary / barsi / annual puja / other
- Notification windows: same day, 1 day before, 3 days before, 7 days before
- Per-date toggle to pause without deleting
- Per-date choice: notify family (L1+L2) or self only
- Dedup log — never sends same reminder twice per day
- Upcoming occasions banner on ImportantDates screen

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

- Next.js 15 + Tailwind CSS
- Phone OTP login
- Admin panel
- Guest upload portal (QR scan → upload photos to event, no login required)
- Supabase Auth SSR with middleware

---

## 5. Technical Architecture

### Frontend — React Native (Expo SDK 52)
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

## 8. Pending / Roadmap

| Priority | Feature |
|----------|---------|
| High | Run Supabase migrations (v0.4.2–v0.4.4) |
| High | Configure Twilio in Supabase Auth settings |
| High | Deploy daily-reminders Edge Function + pg_cron |
| High | Set first admin: `UPDATE users SET is_app_admin=TRUE WHERE phone_number='+91XXXXXXXXXX'` |
| Medium | Make event-photos bucket public + anon INSERT policy |
| Medium | Deploy web app: `npx vercel --prod` from `aangan_web/` |
| Medium | Video posts (upload to Supabase Storage) |
| Medium | In-app notification bell real-time badge update |
| Low | Family albums (grouped by event/year) |
| Low | Family recipe / tradition archive |
| Low | Ancestral village map |
| Low | Multi-family support (user belongs to multiple families) |
