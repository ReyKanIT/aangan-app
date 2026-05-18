# Engineering Scorecard — 17 May 2026

**Filed by:** CTO standing agent
**Timestamp:** [5:54pm - 17May26]
**Previous scorecard:** none — this is the baseline
**Next refresh:** 24 May 2026 (weekly cadence)

---

## TL;DR

| Axis | Score | Trend | One-line |
|---|---|---|---|
| Release pipeline | 5/10 | flat | Ships, but four manual stages + no smoke gate; one bad release = wasted EAS quota |
| Build quality | 4/10 | ↓ | 8 user-facing regressions in May, 3 in last 14 days |
| Observability | 2/10 | ↓ | Sentry RN installed but DSN unset — every iOS/Indus crash since v0.15.0 invisible |
| Bug rate | unmeasured | n/a | No DAU/MAU instrumentation. Cannot benchmark vs industry. |
| Vendor dependency | 4/10 | flat | 7 P0 vendors, 0 documented RTOs, 0 health probes |
| Tech debt | 5/10 | flat | Top-3 named, no burn-down |
| Infra cost | 9/10 | flat | ~₹8K/mo, well below 15%-of-revenue rail at projected 10K MAU |
| Security posture | 5/10 | flat | RLS works (recent posts-bucket fix proves it); service-role surface unaudited |
| Bus factor | 2/10 | ↓ | Still 1. Vault not created. See `BUS_FACTOR.md`. |
| On-call posture | 1/10 | flat | No on-call. No paging. No status page. |

**Aggregate engineering health: 4.3 / 10 — "shipping but fragile."** Foundation is honest; the gaps are at the seams (observability, on-call, regression gates).

---

## 1. Release pipeline health

**Today's state:**
- v0.16.1 shipped: iOS production via auto-submit to TestFlight ✅, AAB + APK built and ready for store upload ✅, simulator build verified post gen-tree fix ✅
- 4-stage build matrix: `preview-android-apk`, `production-android`, `preview-ios-sim`, `production-ios` — runs via `scripts/release.mjs`
- Auto-increment of iOS buildNumber + Android versionCode codified in `eas.json`
- Pre-commit: `npm run check:critical` (web) + `npm run check:critical-rn` (RN, just landed today) + tsc

**Healthy:**
- Cross-store release-train (`release.mjs`) exists and is dry-run-tested. COO 90d bet #18 done.
- Versioning discipline — every feature commit bumps `package.json` + `app.json` and tags.
- EAS auto-submit to TestFlight on production-ios — removes one manual step.

**Brittle:**
- **No CI.** Every test runs on Kumar's laptop. Push doesn't gate on tsc / jest / critical-features.
- **No post-build smoke gate.** The gen-tree exception today reached an EAS build before sim-test caught it — burned 1 build out of 15/month quota. Should be caught by Maestro on the artifact, before submit.
- **No Maestro flows.** T3 of the regression suite is paper-only. Today the artifact-verification is "Kumar installs IPA on sim and clicks around."
- **EAS quota at 11/15 for May** (assumption — confirm against `eas build:list --limit 30`). 4 builds left, 14 days remaining. If today's gen-tree retry plus the AAB/APK final spends 2 more, we're at 13/15 — dangerously close.
- **No rollback path.** Once an AAB is on Play, the only "rollback" is uploading a new build with a fix — there's no canary or staged rollout configured.

**Score: 5/10.** It ships. It does not protect itself.

**Fix priorities (in 90d roadmap):** GitHub Actions for T0+T1+T2 (30d), post-build Maestro smoke (60d), Play staged rollout config (60d).

---

## 2. Bug rate — May 2026 regression ledger

Eight user-facing regressions traced in May. Root-cause categories:

| # | Date | Regression | Category | Caught by |
|---|---|---|---|---|
| 1 | 2026-05-03 | Google sign-in button rendering as `\u` escapes (v0.13.17) | JSX-text encoding | Kumar visual |
| 2 | 2026-05-08 | /events 500 — RLS recursion between events ↔ event_rsvps | Supabase RLS | Sentry web |
| 3 | 2026-05-09 | post/event modal hang after submit (v0.13.21) | RN UI state | Kumar |
| 4 | 2026-05-10 | post uploads going to B2 not Supabase Storage (v0.13.20) | Storage routing | Kumar |
| 5 | 2026-05-10 | post/event notifications not fanning out (v0.13.19) | Edge function | Kumar |
| 6 | 2026-05-14 | RSVP `guests_count`/`note` field mismatch with prod schema (v0.14.4) | Schema drift | Kumar |
| 7 | 2026-05-15 | posts bucket lost ALL RLS policies → pic upload broken (v0.16.0) | Supabase RLS | Kumar (after 3 wrong client-side fixes) |
| 8 | 2026-05-17 | Kulvriksh tree render exception after gen-tree refactor (v0.16.1) | RN render | Sim test post-build |

**Root-cause distribution:**
- Supabase RLS / schema drift: 3 (#2, #6, #7) — **most expensive class** — caused mis-attribution to client-side bugs and wasted EAS builds
- RN UI / render: 3 (#3, #5, #8)
- JSX encoding: 1 (#1) — protected against now via `npm run check:critical` Hindi-attr lint
- Storage routing: 1 (#4)

**Industry benchmark:** Series-A consumer apps typically run ~1 P0 regression per 1k MAU per week. Aangan today: 8 regressions in 17 days, unknown active users. If active users are even 100 (likely), regression rate is **>>1 per 1K MAU/week** by orders of magnitude.

**Aggravating factor:** zero RN crash telemetry. We only know about regressions Kumar manually catches. There is almost certainly a long tail of unreported crashes.

**Mitigations underway:**
- `CRITICAL_FEATURES.md` + smoke tests (catches feature-removal class)
- `check:critical-rn` script (catches RN counterpart removals — landed today)
- Jest scaffold + KulvrikshTreeView regression test (catches render-exception class for the tree)
- Hindi-JSX-attr lint (catches Devanagari escape class)
- Regression suite document (`REGRESSION_SUITE.md`) — strategy is in place, Phase 1 partially complete

**Missing:**
- **Schema-drift detection.** No `supabase db diff` running pre-commit against prod. The posts-bucket RLS regression (#7) would have been caught by a nightly diff of `supabase_schema.sql` vs prod RLS catalog.
- **Sentry RN DSN unset.** Crashes invisible.
- **No Maestro flows.** RN screen interaction regressions invisible until manual.

**Score: 4/10.** The pattern of "Kumar finds it, blames client code, tries 3 fixes, real bug is on server" (regression #7) is a process failure, not a code failure. Need server-side state-of-the-world checks.

---

## 3. Vendor dependency map — RTO analysis

For each P0 vendor, what is the recovery posture today?

| Vendor | What dies if it dies | Fallback exists | Documented RTO | Probe cadence |
|---|---|---|---|---|
| Supabase (DB + Auth + Realtime + Edge Fns) | Everything | ❌ no replica | **none** | none |
| MSG91 (SMS OTP) | Phone sign-in for Vi/Jio (most users) | partial — Twilio fallback wired for non-Vi | **none** | none |
| Twilio (SMS fallback) | Email OTP path when MSG91 + Vi fail | Email OTP itself | **none** | none |
| EAS / Expo (builds) | All store updates | ❌ no | **none** (free tier, no SLA) | quota: manual checking |
| Vercel (web hosting) | aangan.app + all SEO routes | static failover via Cloudflare | **none** | uptime via Vercel only |
| Cloudflare (DNS + CDN + R2) | Domain resolution + media CDN | nothing — single point | **none** | none |
| B2 (media storage) | New uploads fail; CF cache keeps serving existing | partial — Supabase Storage as alternative (just migrated to it for posts) | **none** | none |
| MSG91 DLT (Vi chain) | SMS template approvals (low frequency) | n/a — admin only | n/a | none |
| Sentry | Crash visibility (already invisible since DSN unset) | none | n/a | n/a |
| Apple Developer | iOS updates | none | annual cert | none |
| Google Play Console | Android updates | none | none | none |

**Conclusion:** Aangan has **zero documented RTOs.** A Supabase outage of >2 hours would force a public status post but we have no playbook. MSG91 outage = Twilio fallback for non-Vi, email OTP for Vi — that's the only documented multi-vendor failover.

**Recommendations (90d roadmap):**
1. **Status page + 4 synthetic probes** (15-min cadence): Supabase auth round-trip, OTP send, post create, photo upload. Vendor BetterUptime free tier covers this. ~30 min setup.
2. **Document RTOs.** Even setting `Supabase: RTO 24h, RPO 1h (PITR)` makes the gap visible.
3. **Add the dual-region Supabase replica conversation to the 100K MAU prep work.** Not needed at 1K-10K.
4. **MSG91 invoice paper trail** — already in `costs/2026-05.md` template; Kumar needs to fill from dashboard.

---

## 4. Tech debt — top 3 items

Picked by ratio of (incident probability × user-pain) / (fix effort).

### #1 — Sentry RN DSN unset → all RN crashes invisible

- **Effort:** 30 min. `eas env:create EXPO_PUBLIC_SENTRY_DSN` on production + preview profiles.
- **Pain:** every Indus + iOS crash since v0.15.0 is undetected. Affects up to 100% of mobile users.
- **Why not done:** Kumar todo item from CEO Review (P0 #6). Code wired, env not set.
- **Owner:** Kumar (5-min task — already on his Action Tracker).

### #2 — iOS dev simulator won't rebuild locally

- **Effort:** 2-4h. Either (a) install Homebrew → CocoaPods or (b) document EAS-sim-only workflow as the canonical path and remove `expo run:ios` from the README.
- **Pain:** Every iOS-only bug requires an EAS preview-ios-sim build, which costs ~25 min and a slot of EAS quota. Today's gen-tree regression cost one such build cycle.
- **Why not done:** environment debt accrued silently.
- **Owner:** Main agent (orchestrator) to install + verify, with Kumar OK.

### #3 — Events tab uncommitted in working tree (`aangan_rn/src/screens/events/EventsListScreen.tsx`, 382 LOC)

- **Effort:** 0 hours if it's complete; needs review pass.
- **Pain:** Code on disk but not in any release. If laptop dies, lost.
- **Why not done:** mid-feature.
- **Owner:** Main agent to either ship it in v0.16.2 or stash it cleanly.

**Other named debts (lower priority):**
- RN ↔ web kinship logic duplicated (called out in CEO Review CTO #1). `packages/shared` not started.
- 9 RN screen monoliths >700 LOC. FamilyTreeScreen at 1300+. Decomposition deferred.
- `supabase_schema.sql` vs `supabase/migrations/` drift (CEO Review CTO #4) — exact magnitude unknown.
- Service-role keys in 7 API routes (CEO Review CTO #3) — security audit needed.

---

## 5. Score on each axis (with one-line rationale)

| Axis | Score | Rationale |
|---|---|---|
| Release cadence | 5/10 | 30-min cycle; release.mjs automates 70% but no CI or post-build gate |
| Build quality | 4/10 | 8 May regressions; trend not improving without observability |
| Observability | 2/10 | Sentry web live + insightful; Sentry RN code-only without DSN |
| Bug rate | unmeasured | DAU/MAU not instrumented. Propose: add `track('app_open')` in `App.tsx` ASAP. |
| Vendor dependency | 4/10 | Vendor list mapped, RTOs absent, probes absent |
| Tech debt | 5/10 | Top-3 named with effort estimates, no burn-down chart |
| Infra cost | 9/10 | ~₹8K/mo with headroom; vendor-projection doc covers 100M MAU horizon |
| Security posture | 5/10 | RLS catches most issues (proven by post-bucket discovery); service-role audit not done |
| Bus factor | 2/10 | Kumar-only. Vault and successor still pending per BUS_FACTOR.md. |
| On-call posture | 1/10 | No on-call, no paging, no status page, no MTTA/MTTR |

**Aggregate: 4.3 / 10.** "Foundations honest, seams fragile." Goal: 7.0 / 10 by 17 Aug 2026.

---

## Measurement gaps (cannot be scored yet)

These need instrumentation before they can be tracked:

1. **DAU / MAU** — no analytics today. Propose: add `track('app_open')` + `track('session_start')` via Supabase `analytics_events` table or PostHog free-tier.
2. **Crash-free sessions %** — needs Sentry RN DSN set.
3. **Cycle time (commit → store-live)** — needs CI timestamps. Estimate today: ~30 min for RN, ~5 min for web.
4. **EAS quota burn** — manually known; should be in a weekly auto-report.

Without these four numbers, we are flying mostly blind. **The #1 30d milestone is to instrument them.**
