# Aangan CEO Review — 8 May 2026

> Cross-functional review by CTO / CFO / CMO / COO agents. Living document — Claude updates the **Action Tracker** at the bottom as items complete.

[11:18am - 8May26] · Initial review filed by Kumar
[Updated as actions progress — see tracker]

---

## Officer Verdicts at a Glance

| Officer | Verdict | One line |
|---|---|---|
| **CTO** | WATCH | Foundations solid; RN/web duplication + zero RN crash reporting + service-role surface are the three things that hurt at scale |
| **CFO** | HEALTHY but PRE-REVENUE | Burn ~₹7–9K/mo. No SKU live. No `costs/` paper trail. Plan promises ₹3–5L/mo at 20K families with zero payment infra |
| **CMO** | SOFT | Shipping cadence excellent, brand assets distinctive — but 6 different pitches across listings, content engine dormant, `PLAY_STORE_URL = null` on landing page |
| **COO** | WORKABLE → DRILLED | Process hygiene unusually strong for solo founder; all 3 stores blocked on small Kumar-inputs |

---

## CTO Review — Tech Health

**Verdict: WATCH**

Strengths:
- Web build green and lean (Next 15 + React 19, 179 KB shared, Sentry server+edge wired, PWA, CSP)
- Defensive guardrails (CRITICAL_FEATURES.md + smoke tests + Hindi-attr lint) actually prevent regressions
- Supabase migrations disciplined and sequentially dated

**Top 5 Tech Risks:**

1. **RN ↔ Web code divergence** — duplicate kinship logic, RN screens 1000–1400 LOC. Every feature ships twice. → `packages/shared` pnpm workspace.
2. **No RN crash reporting** — every iOS/TestFlight + Indus crash invisible since v0.15.0. → `@sentry/react-native`.
3. **Service-role keys + cron secrets in 7 API routes** — one SSRF = full DB compromise. → audit each for rate-limit + input validation.
4. **Migration drift** between `supabase_schema.sql` and `supabase/migrations/*`. → `supabase db pull` from prod, reconcile, freeze legacy.
5. **RN screen monoliths** — 9 screens >700 LOC. → decompose FamilyTreeScreen and PostComposerScreen first.

**Quick wins (7d):** Sentry RN · schema reconcile · rate-limit `/api/feedback` + `/api/guest-upload` · `npm audit` + `expo doctor` · document EAS quota burn.

**Strategic bets (90d):** packages/shared monorepo · RLS load-test at 10k users · OTP cost modeling + WhatsApp Business OTP fallback · decommission B2 after Supabase Storage migration.

---

## CFO Review — Financials

**Verdict: HEALTHY but PRE-REVENUE**

**Estimated monthly burn: ~₹6,750–8,950**

| Line item | Est./month | Confidence |
|---|---|---|
| Supabase Pro | ₹2,100 | Documented |
| EAS Build | ₹2,450 | Documented |
| MSG91 SMS OTP | ₹500–1,500 | Estimate |
| Vercel | ₹0 | Documented |
| Twilio | ₹200–500 | Estimate |
| B2 + CF CDN | ₹0–500 | Estimate |
| Sentry | ₹0 | Free tier |
| Domain + Zoho | ₹100 | Estimate |
| Apple/Google/Indus amortized | ₹1,400 | Estimate |

**Per-unit economics:** ~₹0.15–0.20 per SMS OTP · ~₹0.30–0.50 per signup · ~₹3–5 to onboard a family of 10 · **ARPU = ₹0** today.

**Top 5 financial risks:**
1. No revenue infrastructure (zero payment SDK, zero priced SKU, zero invoice flow)
2. SMS OTP cost is unmonitored (no MSG91 invoice in repo)
3. EAS free-tier locked-in (₹2,450/mo paid plan effectively required)
4. No GST registration / ReyKan IT entity status not in repo
5. Supabase storage egress could hockey-stick at 50K+ users

**Bottom line:** Wallet fine, *books don't exist yet*. Before raising Rs.2 Cr seed, two things must be true: (a) a `costs/` paper trail an investor can verify, (b) one priced SKU live in production.

---

## CMO Review — Brand & Growth

**Verdict: SOFT**

**Proposed one-sentence pitch:**
> **"Aangan is the private courtyard your family group never had — one app for photos, the family tree, festivals, and panchang, built so Dadi can use it too."**
>
> Ads: *"WhatsApp ग्रुप का जवाब — परिवार का अपना आँगन।"*

**Top 3 funnel leaks:**
1. **Landing → install** — Hero CTA is "Download Android APK" (sideload friction); iOS shows "Coming Soon" despite TestFlight live; `PLAY_STORE_URL = null` in `page.tsx:90`.
2. **Single-user activation trap** — no forced family-invite step at signup; a family network has zero value until member 2 joins.
3. **SEO traffic → signup** — `/panchang` and `/festivals` are indexed and crawlable, but `PublicShareCTA` only offers "Login for daily reminders." Every visitor who isn't ready to install is lost.

**Top 3 growth bets (ICE-ranked):**
| # | Bet | I × C × E |
|---|---|---|
| 1 | Daily Panchang WhatsApp/Email opt-in | 9 × 8 × 8 |
| 2 | Forced "Invite 3 family members" onboarding step | 9 × 8 × 7 |
| 3 | Per-festival SEO landing pages (50+) | 8 × 9 × 6 |

**SEO + sharing — missing:** Play Store link, iOS TestFlight link, per-festival pages, `/kuldevi` page, blog, BreadcrumbList schema, FAQ schema, panchang/festival-specific share text variants.

**Strategic bets (90d):** Content engine (1 long-form Hindi piece/week) · Pandit/Purohit affiliate program · NRI WhatsApp drip · Hindi YouTube partnership.

---

## COO Review — Operations

**Verdict: WORKABLE → DRILLED**

**Store launch scorecard:**

| Store | Status | Reason |
|---|---|---|
| Apple App Store | APPROVED-IMMINENT | TestFlight v0.15.0 build 22 live; need 3 ASC values + screenshots + demo account + export compliance click |
| Google Play | BLOCKED | Console listing not created; `submit.production.android` empty; only 2/8 screenshots |
| Indus App Store | APPROVED-IMMINENT | v0.9-era live; v0.15.x update packet drafted, needs fresh AAB + screenshots |
| DLT-SMS (Vi) | BLOCKED | Chain `1115177724853137338` pending with WALKOVER |

**Top 5 operational risks:**
1. Vi/MSG91 OTP outage recurrence — no automated DLT health probe
2. Keystore loss — `aangan-release.keystore` only on Kumar's Mac
3. Critical-feature silent regression (8 of 9 routes still `(TBD)` smoke tests)
4. EAS quota exhaustion (15 Android builds/mo)
5. Single-founder bus factor on creds/keys

**Compliance gaps:** Apple Privacy Nutrition Labels need version bump to v0.15.x · DPDP data-residency claim not surfaced in `/privacy` · no in-app account-delete flow (Play requires) · DLT chain TM-pending.

**Strategic bets (90d):** Status page + synthetic OTP probe · founder-redundancy vault + BUS_FACTOR.md · CI maturity (build + smoke on PR) · support SLA + ticket pipeline · in-app DPDP/GDPR self-service · cross-store `release.mjs` train.

---

## Cross-Cutting Themes

| Theme | CTO | CFO | CMO | COO |
|---|---|---|---|---|
| Bus factor (Kumar single point of failure) | ✓ | ✓ | | ✓ |
| No revenue rails | | ✓ | ✓ | |
| Stores blocked on small inputs | | | ✓ | ✓ |
| Content engine dormant | | | ✓ | |
| No RN observability | ✓ | | | ✓ |
| DPDP/GDPR in-app delete missing | | | | ✓ |

---

## Action Tracker

### P0 — This Week

| # | Item | Owner | Status | Notes |
|---|---|---|---|---|
| 1 | Save CEO review + tracker | Claude | ✅ | This file |
| 2 | Commit panchang v2 + register as v0.15.5 | Claude | ✅ | Tag `v0.15.5` — Drik-accurate sunrise/sunset, Purnimanta Masa, Rahu/Choghadiya, Bhadra/Panchak |
| 3 | Flip `PLAY_STORE_URL` + iOS TestFlight link | Claude | ✅ | Env-driven: `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_TESTFLIGHT_URL`. Flip from Vercel without code edit. |
| 4 | Demo-account flow (phone `9999999999` → OTP `123456` env-gated) | Claude | ✅ | Wired via `REVIEWER_PHONES_E164` env on `supabase/functions/send-otp-sms`. Runbook: `APPLE_REVIEW_DEMO_ACCOUNT.md`. **Kumar:** set the Supabase Dashboard test-phone pair + the env secret + the ASC sign-in info. |
| 5 | In-app account-delete flow | Claude | ✅ | "Danger Zone" with typed-DELETE confirmation in `/(app)/settings`, `/api/account/delete` endpoint, critical-features guards added (21 markers / 6 routes pass). |
| 6 | `@sentry/react-native` on aangan_rn | Claude | ✅ | Package pinned in `aangan_rn/package.json`, expo plugin added, `Analytics.init()` called early in `App.tsx`. Runbook: `SENTRY_RN_SETUP.md`. **Kumar:** `npx expo install @sentry/react-native` + `eas env:create EXPO_PUBLIC_SENTRY_DSN`. |
| 7 | 6 store screenshots @ 1290×2796 | Claude | ✅ | `app_store_screenshots/` — 6 PNGs at exact Apple 6.7″ size, regen command in folder README. Authenticated screens (feed/family/events) flagged as v2 follow-up post-demo-account wiring. |
| 8 | Execute keystore backup runbook | **Kumar** | ⏳ | 15 min — 1Password. See `KEYSTORE_BACKUP_RUNBOOK.md`. Removes catastrophic single-point-of-failure. |
| 9 | Audit MSG91 dashboard → `costs/2026-05.md` | **Kumar** | ⏳ | 30 min. `costs/` scaffold ships next so you have a template. |
| 10 | Email WALKOVER re DLT chain `1115177724853137338` | **Kumar** | ⏳ | 5 min — 48h re-ping cadence until TM accepts. |

### 30-Day Bets

| # | Item | Owner | Status |
|---|---|---|---|
| 11 | Daily Panchang WhatsApp/Email opt-in | Claude | ✅ Capture wired (`/api/panchang/subscribe` + `DailyPanchangOptIn` component on `/panchang` + `/festivals/[slug]`). `panchang_subscribers` migration shipped — **Kumar: `supabase db push` to apply.** Delivery (Pass C on `panchang-nudge` cron) is the v2 follow-up once Kumar picks WhatsApp vs email channel. |
| 12 | Razorpay test integration + ₹299 Family Tree PDF SKU | Claude | ⏳ Not started |
| 13 | `packages/shared` pnpm workspace (kinship + types + supabase) | Claude | ⏳ Large refactor — held |
| 14 | Forced "Invite 3 family members" onboarding step | Claude | ⏳ Not started |
| 15 | Per-festival SEO landing pages (50+, programmatic) | Claude | ✅ 24 routes shipped (`/festivals/[slug]`) — Event + BreadcrumbList JSON-LD, opt-in CTA, sitemap auto-includes, /festivals list now links to detail pages. Adding a festival = appending one entry to `data/festivals2026.ts`. |

### 90-Day Strategic

| # | Item | Owner | Status |
|---|---|---|---|
| 16 | `costs/` directory + monthly invoice template | Claude | ✅ `costs/README.md`, `TEMPLATE.md`, `2026-05.md` shipped. Pre-filled with CFO Review estimates; Kumar fills actuals from MSG91/Supabase/EAS dashboards. |
| 17 | `BUS_FACTOR.md` doc + 1Password "Aangan Ops" vault | Claude (doc) + Kumar (vault) | ✅ doc shipped. ⏳ Kumar to create vault + designate successor. |
| 18 | `release.mjs` cross-store release-train | Claude | ✅ shipped. `node scripts/release.mjs --type patch --commit --build all` bumps web/RN versions + iOS buildNumber + Android versionCode, runs build, tags, triggers EAS. Dry-run verified. |
| 19 | Status page + synthetic OTP probe (15-min cadence) | Claude | ⏳ Not started (needs external service choice) |
| 20 | Content engine (1 long-form Hindi piece/week) | Kumar (content) | ⏳ |
| 21 | Pandit/Purohit affiliate program | Kumar | ⏳ |
| 22 | NRI WhatsApp drip (Meta ads) | Kumar | ⏳ |
| 23 | Hindi YouTube partnership | Kumar | ⏳ |

**Legend:** ⏳ pending · 🟡 in progress · ✅ done · ⚠️ blocked

---

## Closeout Checklist (for the eventual "all done" moment)

- [ ] All P0 Claude items checked
- [ ] All P0 Kumar items checked
- [ ] All 30d bets checked or explicitly deferred with reason
- [ ] 90d items either checked or moved to a new dated review
- [ ] Final tally posted in this file with timestamp
