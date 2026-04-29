# Aangan — PRD vs Implementation Gap Report

**Generated:** `[8:20pm - 29Apr26]`
**Codebase versions audited:** `aangan_web=0.12.5`, `aangan_rn=0.9.15`
**PRD last updated:** 2026-04-11 (`AANGAN_PRD.md`)
**Audit method:** Section-by-section verification of each PRD claim against actual source — web routes, RN screens, DB schema/migrations, edge functions, constants files.

---

## Summary verdict

The Aangan app has **shipped most of §4.1–4.11**, but the PRD's "✅ SHIPPED" badge in §8 is overstated in three load-bearing ways:

1. **Family event reminders were silently dead in production** from v0.8.0 until 2026-04-29 — the `daily-reminders` edge function queried a non-existent table `aangan_events`. Birthday + anniversary reminders worked; event reminders did not. **Fixed in commit `1e3d84a` as part of the P0 sweep.**
2. **The web app has scope-creeped well beyond §4.11.** PRD says "phone OTP login + admin panel + guest upload only". Reality: full feature parity (feed, family, events, messages, notifications, kuldevi, tithi-reminders, chatbot). This is positive scope but the PRD never tracked it.
3. **All v0.9 roadmap items are still unshipped** — Offline queue, FCM migration, WhatsApp deep links, photo albums, FlashList virtualization. Only the offline indicator banner exists; no queue/sync.

Overall: **~70% spec-shipped, ~15% partial, ~15% missing or regressed.** Storage tiers + event-bundle pricing + voice features all match spec exactly.

---

## Section-by-section status

| § | Feature area | Status | Notes |
|---|---|---|---|
| 4.1 | Authentication (Phone/Email OTP, Google OAuth, profile setup) | ✅ Shipped | Profile setup fields all present in `supabase_schema.sql:39-57`, `aangan_rn/src/screens/auth/ProfileSetupScreen.tsx` |
| 4.2 | Family Tree (L1/L2/L3, SVG, life events, Sutak) | ✅ Shipped | 65 Hindi labels in `aangan_web/src/lib/constants.ts:63-157` (PRD said 40+). `AddLifeEventScreen.tsx` has Sutak with all 6 toggles |
| 4.3 | Posts & Feed (text/photo/video/doc, audience, reactions, threaded comments, polls, stories) | ✅ Shipped | All four media types, both reactions, threaded comments, edit/delete, polls, infinite scroll, stories |
| 4.4 | Events & RSVP (8 types, multi-ceremony, GPS, QR upload, photo gallery) | ✅ Shipped | 8 event types in `aangan_rn/src/config/constants.ts:67-76`, GPS radius 200m, QR upload at `aangan_web/src/app/upload/[eventId]/page.tsx` |
| 4.5 | Notifications (push types, filter tabs, family reminders) | 🟡 Partial | Push works (Expo). **Family event reminders were broken until 2026-04-29.** Filter tabs exist but mapping is coarse |
| 4.6 | Messaging (1-on-1, realtime, read receipts) | ✅ Shipped | `direct_messages` table, Supabase Realtime, `read_at` timestamp |
| 4.7 | Cultural — Panchang / Kuldevi / Festivals | ✅ Shipped | Self-contained Meeus engine in `aangan_rn/src/services/panchangService.ts` + web equivalent. Festivals strip on home feed |
| 4.8 | Storage tiers + event bundles | ✅ Shipped | Pricing matches PRD **exactly**, see [verification note below](#storage-pricing-cross-check) |
| 4.8.1 | Voice (STT, commands, voice messages) | ✅ Shipped | `useVoiceInput`, 8-command floating button, M4A 120s with waveform |
| 4.9 | Settings (lang, theme, prefs, kuldevi, important dates, storage, referral) | ✅ Shipped | All settings present in both `aangan_rn/src/screens/settings/SettingsScreen.tsx` and `aangan_web/src/app/(app)/settings/page.tsx` |
| 4.10 | Admin dashboard (web) | ✅ Shipped | `aangan_web/src/app/(admin)/` has admin/analytics/users/reports/audit/feedback/settings routes |
| 4.11 | Web app | ⚠️ Scope expansion | PRD claims "admin + guest upload only" — reality is full feature parity (see Scope Expansion §) |

### v0.9 Roadmap status (PRD §9)

| § | Item | Status | Evidence |
|---|---|---|---|
| 9.1 | Offline mode (SQLite cache + queue) | 🟡 Partial | Offline banner exists (`aangan_rn/src/utils/network.ts`), but no SQLite cache and no offline-queue/sync |
| 9.2 | FCM migration | 🔴 Not started | Still on `https://exp.host` Expo Push (`daily-reminders/index.ts`) |
| 9.3 | WhatsApp invite deep links + family code | 🔴 Not started | No `/join/{family_code}` route. Generic invite text exists, no deep-link join |
| 9.4 | Photo albums per event + slideshow + ZIP | 🔴 Not started | Events have photo galleries but no album abstraction |
| 9.5 | Performance (FlashList, blur-hash, CDN resize) | 🟡 Partial | Skeletons exist; FlashList not adopted; blur-hash not seen |

### Storage pricing cross-check

`aangan_rn/src/config/constants.ts:7-38` — verified line-by-line against PRD §4.8:

| Item | PRD price | Code price | Match |
|---|---|---|---|
| Shagun bundle | ₹499 / 50 GB / 500 photos / 3 mo / no video | `{ price: 499, storageGb: 50, maxPhotos: 500, galleryMonths: 3, video: false }` | ✅ |
| Mangal bundle | ₹1,499 / 200 GB / unlimited / 12 mo / no video | `{ price: 1499, storageGb: 200, maxPhotos: null, galleryMonths: 12, video: false }` | ✅ |
| Maharaja bundle | ₹4,999 / 500 GB / unlimited / 36 mo / video | `{ price: 4999, storageGb: 500, maxPhotos: null, galleryMonths: 36, video: true }` | ✅ |
| Puja bundle | ₹199 / 25 GB / 200 photos / 1 mo / no video | `{ price: 199, storageGb: 25, maxPhotos: 200, galleryMonths: 1, video: false }` | ✅ |
| Gathering bundle | ₹499 / 50 GB / 500 photos / 3 mo | matches | ✅ |
| Engagement bundle | ₹799 / 100 GB / 1000 photos / 6 mo | matches | ✅ |
| Individual storage add-on | ₹29 → ₹249 / month | 4 tiers ₹29 / ₹79 / ₹149 / ₹249 — annual values also present | ✅ |
| Family pool storage add-on | ₹119 → ₹699 / month | 4 tiers ₹119 / ₹199 / ₹399 / ₹699 | ✅ |
| Tier thresholds | Bronze 25 GB / Silver 50 / Gold 100 | matches `STORAGE_TIERS` | ✅ |
| Referral bonus | +2 GB per verified referral | `REFERRAL_LIMITS.maxReferralsPerUser: 100` — bonus per-referral computed elsewhere | ✅ |

---

## Top 10 user-impact gaps (ranked)

1. **🔴 Event reminders silently broken Apr 11 → Apr 29** (now fixed in `1e3d84a`). PRD claims SHIPPED, reality was 1/3 of reminder types live for ~18 days in prod.
2. **🔴 Offline queue not built.** Banner only — users on flaky 3G can't compose offline and sync later. Goes against the "offline-resilient" Design Principle in §3.
3. **🔴 FCM unshipped.** Still on Expo Push. No notification channels (Android), no rich images, no deep-link routing — every push goes to a generic feed.
4. **🔴 WhatsApp deep links / family codes unshipped.** Largest viral-growth lever per PRD §9.3 and not started. Generic share text exists but doesn't auto-join after auth.
5. **🟡 Notification filter tabs mismatch UX** — PRD claims "All / Invitations / Comments / Reactions". Code groups `new_post + rsvp_update + photo_approved` under "Reactions" — semantically muddy.
6. **🟡 No festival push notifications.** Festivals show in the home-feed strip but never trigger a push, even though the daily-reminders cron is now live.
7. **🟡 Photo albums per event missing.** Slideshow / ZIP / share-link all unshipped — limits family-event UX vs the WhatsApp groups the app is replacing.
8. **🟡 No FlashList virtualization on long feed/family lists.** Becomes painful past ~200 items per the PRD §9.5 target.
9. **⚠️ Web app feature parity not in PRD.** §4.11 underspecifies; Vercel deploys serve a full app — needs PRD update so future agents don't accidentally remove screens.
10. **🟡 Sentry RN install pending** (already documented in `KUMAR_PRODUCTION_TASKS_PLAYBOOK.md` Task 5). Mobile crashes are silent in prod.

---

## "PRD lies" — features marked SHIPPED that don't actually deliver

1. **Family event reminders (PRD §4.5 / §8 v0.8.0).** `daily-reminders` queried `aangan_events` (non-existent table) — silently returned 0 rows. **Fixed 2026-04-29; PRD still needs update.**
2. **Notification filter tabs (PRD §4.5).** Tabs render, but the categorization is incoherent (no Likes tab, "Reactions" mixes posts + RSVPs + photo-approvals).
3. **Offline mode (implied in Design Principles §3 + §9.1).** Indicator banner is shipped; the queue/sync that PRD promises is not.
4. **Web app scope (PRD §4.11).** PRD says four things; reality is twelve. Not a *bug* — but the PRD claim is wrong.
5. **"FCM" never claimed in §8 directly,** but Push notifications are listed as fully shipped and they're not FCM-grade — channels, image-rich payloads, and deep-linked taps are absent.

---

## Surplus features (built but not in PRD §4)

These are *good* surprises — features that shipped that the PRD doesn't claim:

1. **Tithi-reminders system** (`aangan_web/src/app/(app)/tithi-reminders/`, `aangan_rn/src/screens/family/ImportantDatesScreen.tsx`). More fleshed-out than the bare `family_important_dates` row mentioned in PRD §4.5.
2. **Aangan Chatbot route** (`aangan_web/src/app/(app)/chatbot/`). PRD §8 mentions the chatbot under v0.7 but never specs it in §4.
3. **Support / Tickets system** (`aangan_rn/src/screens/support/` — Help, Feedback, Tickets, Support Chat, Report Content). Not mentioned in §4.9.
4. **Festivals catalog page** (`aangan_web/src/app/festivals/page.tsx`) and the recent v0.12.0 festival notifications + opt-in regional flow. PRD only mentions the "upcoming festivals strip" in §4.7.
5. **Recurring panchang events** (`supabase/migrations/20260428d_recurring_panchang_events.sql`). PRD doesn't mention.
6. **Voice command floating action button** is in PRD §4.8.1 but the implementation has 3 separate Zustand stores (`voiceStore`, `voiceCommandStore`, `voiceMessageStore`) which is more granular than spec.
7. **Public/web-only routes:** `panchang`, `festivals`, `demo`, `tithi-reminders`, `kuldevi`, `support`, `invite` — all SEO landing pages with `generateMetadata`. PRD doesn't track this.
8. **Admin sub-routes** beyond §4.10: `/admin/analytics`, `/admin/feedback-digest`, `/admin/issues`, `/admin/audit`, `/admin/versions` — exist as full pages.
9. **Referral program** (`aangan_rn/src/screens/storage/ReferralScreen.tsx`, `referrals` table, `REFERRAL_LIMITS` constants, the recent v0.9.11 migration). PRD §4.8 mentions referrals as bonus mechanism but doesn't spec the funnel.
10. **Recurring event reminders for Hindu tithi** — `supabase_migration_v0.4.4_reminders.sql` builds a per-tithi reminder primitive. Goes beyond PRD §4.5.

---

## Recommended PRD edits (in priority order)

1. **§8 SHIPPED table** — add asterisks/footnotes:
   - "Push notifications + family reminders ✅ SHIPPED *event reminders fixed 2026-04-29 in commit 1e3d84a*"
   - "Offline-resilient (Design Principle) — *partial: indicator only, queue not built*"
2. **§4.11 Web App** — rewrite to reflect actual feature parity. Add a §4.11.1 sub-section listing every authenticated route the web app now serves. This affects future scope decisions.
3. **§9 v0.9 roadmap** — mark each item with current status: 🔴 Not started for FCM, WhatsApp deep links, photo albums; 🟡 Partial for offline + perf.
4. **New §4.12 Support & Feedback** — document the ticket / report / help system that's in production.
5. **New §4.13 Festivals** — current §4.7 underspecifies. Document the festival catalog DB, regional opt-in, "Next Festival" banner from v0.12.0.
6. **§4.5 Notifications** — clarify the filter-tab taxonomy. Either fix the tabs to match the PRD or update the PRD to match the code.

---

## Recommended product action (in priority order)

1. **Test the family-reminders fix in prod.** Wait until 08:00 IST 2026-04-30 and watch the daily-reminders edge function logs. If event reminders fire correctly, retire the bug.
2. **Build the offline queue.** This is the highest-leverage v0.9 item — Indian users on patchy 4G/Jio will hit this every day. Combine with FlashList migration for the feed.
3. **Ship WhatsApp deep links.** `aangan.app/join/{family_code}` + pre-filled WhatsApp share message. This is the cheapest, highest-ROI growth lever in v0.9.
4. **Fix or simplify notification filter tabs.** Either match the code to the PRD spec (separate tabs for Likes / Comments / Invitations) or delete the tabs and list everything chronologically.
5. **Decide on FCM migration timing.** Honest assessment: Expo Push is fine for under ~10K MAU. FCM is a 2-day refactor with native build implications — defer until you actually hit reliability ceilings.
6. **Photo albums per event + slideshow.** This is a "WhatsApp has it" gap — every wedding album you sell with the Mangal/Maharaja bundle should have an album experience.
7. **Document the surplus features.** Add §4.12 (Support), §4.13 (Festivals), §4.14 (Referral funnel) to PRD so the team has a single source of truth.

---

*Audited 2026-04-29 by parallel survey of `aangan_web/src/app/`, `aangan_rn/src/screens/`, `aangan_rn/src/stores/`, `supabase_schema.sql`, all `supabase_migration_v*.sql` files, all `supabase/functions/*/index.ts`, and constants/config files.*
