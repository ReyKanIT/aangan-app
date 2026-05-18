# Engineering Roadmap — 30 / 60 / 90 days

**Filed by:** CTO standing agent
**Timestamp:** [5:56pm - 17May26]
**Goal:** unblock 10K MAU and harden Aangan to take that load without P0s.
**Re-baseline:** 17 Jun 2026, 17 Jul 2026, 17 Aug 2026.

---

## Anchoring questions

| Question | Today | At 1K MAU | At 10K MAU |
|---|---|---|---|
| What breaks first? | Hidden crashes (Sentry RN dark) | RLS hot spots, edge function cold-starts | OTP cost spike, storage egress |
| What's our cycle time (commit → store-live)? | ~30 min RN, ~5 min web | same | **must be <10 min RN** or release fatigue kills us |
| What's the cost of a missed P0? | 1 EAS build + 1 day Kumar | 1 day of installs lost | revenue + churn |
| What slows us most? | manual sim verify + no CI | manual sim verify + no CI | **release-train cycle time** |

---

# 30-day milestones (target: 17 Jun 2026)

## M1 — Observability live (CRITICAL — everything below depends on it)

**Outcome (user/business):** Every iOS / Indus / Android crash is visible within 60 sec. Crash-free sessions becomes a tracked metric, so we can prove (or disprove) that "v0.16.x has no regressions."

**Technical work:**
1. Kumar runs `eas env:create EXPO_PUBLIC_SENTRY_DSN` for `production` + `preview` profiles. (5 min, on his Action Tracker.)
2. Rebuild one production EAS build to pick up the env var.
3. Verify a forced crash in TestFlight appears on Sentry dashboard.
4. Add `track('app_open')` and `track('session_start')` into `App.tsx` to capture DAU/MAU baseline (Supabase `analytics_events` table — simpler than PostHog at this scale).

**Owner:** Kumar (DSN) + main agent (analytics events).

**DoD:**
- Sentry RN issue stream shows ≥1 real event from a non-Kumar device within 7 days.
- `analytics_events` table populated; query for "DAU last 7 days" returns a number > 0.

**EAS builds consumed:** 1 (rebuild for env to take effect).
**Supabase cost delta:** negligible (<10MB / mo at current scale).

**Risks:**
1. Sentry DSN format mismatch — verify against `SENTRY_RN_SETUP.md` runbook.
2. Analytics events spike Supabase row-count at scale — auto-prune after 90 days via cron.
3. Kumar doesn't execute env:create — track on this scorecard weekly.

---

## M2 — CI gate (GitHub Actions: T0 + T1 + T2)

**Outcome:** No more "Kumar runs `npm test` on his laptop." Every push runs the gates. Pre-commit hook + CI duplicate the protection.

**Technical work:**
1. `.github/workflows/ci.yml`: trigger on push + PR, run `npx tsc --noEmit`, `npm test`, `npm run check:critical`, `npm run check:critical-rn`.
2. Cache `node_modules` per package to keep CI under 90 sec.
3. Branch protection on `main` (Kumar enables via gh CLI or GitHub UI).
4. Husky pre-commit (per `TESTING.md` Phase 2e) — non-blocking warning today, blocking after 2 weeks of green.

**Owner:** Main agent (orchestrator).

**DoD:**
- A push that breaks TypeScript fails CI within 90 sec.
- A push that deletes a `CRITICAL_FEATURES.md`-listed selector fails CI.
- `main` branch has the workflow as required check.

**EAS builds consumed:** 0.
**Supabase cost delta:** 0.

**Risks:**
1. `expo-file-system` API-drift errors in `utils/uploadFile.ts` will fail tsc — need to allow-list them (per `TESTING.md` T0 section) before turning on the gate.
2. Existing tests assume Kumar's `__mocks__/fileMock.js` setup — verify on CI Linux runner.
3. Kumar uses `git push` from multiple machines; husky must be installed on each.

---

## M3 — Vendor health probes + status page

**Outcome:** At 1K MAU, when MSG91 has a 20-min outage, we know within 15 minutes (not from user complaints). Foundation for the COO 90d bet #19.

**Technical work:**
1. BetterUptime free-tier (10 monitors) — set up these 4 probes at 15-min cadence:
   - `GET https://aangan.app/api/health` (returns Supabase ping result)
   - `POST https://<supabase>/functions/v1/send-otp-sms` with reviewer-bypass phone (no SMS cost, returns 200)
   - `GET https://aangan.app/panchang` (static-ish, catches Vercel + CF)
   - `GET https://<supabase>.supabase.co/rest/v1/family_members?limit=1` with anon key (catches RLS + DB)
2. Status page at `status.aangan.app` (BetterUptime hosted, free).
3. Webhook alerts → Kumar's email + WhatsApp (BetterUptime built-in).

**Owner:** Main agent + Kumar (BetterUptime account).

**DoD:**
- Status page live with 4 green checks.
- A test alert (manually kill a probe) reaches Kumar's phone in <15 min.

**EAS builds consumed:** 0.
**Supabase cost delta:** ~₹100/mo (4 probes × 96 hits/day × Supabase request cost — well under noise floor).

**Risks:**
1. Probe authentication — `/health` endpoint needs implementation; today's `/api/health` returns... probably 404. Verify.
2. False positives from CF edge cache evictions — set the probe to fail only after 2 consecutive misses.
3. Alarm fatigue if probes are too sensitive.

---

## M4 — RN screen `EventsListScreen.tsx` shipped (or removed)

**Outcome:** No uncommitted half-feature on Kumar's laptop. Either Events tab is live in v0.16.2 or the file is stashed cleanly.

**Technical work:**
1. Review the uncommitted `aangan_rn/src/screens/events/EventsListScreen.tsx` (382 LOC).
2. Wire into `AppNavigator.tsx` (already modified — review what changed).
3. If it works on sim → ship in v0.16.2.
4. If it doesn't → branch + stash to `feature/events-tab`.

**Owner:** Main agent (orchestrator).

**DoD:** `git status` shows zero untracked source files in `aangan_rn/src/screens/`.

**EAS builds consumed:** 0-1 (if shipped, the next release will include it).
**Supabase cost delta:** 0.

**Risks:**
1. Code-quality risk — this is unreviewed code. Treat as PR, not as merge-and-pray.
2. Events feature was previously web-only; check schema parity with web's `events` table.

---

# 60-day milestones (target: 17 Jul 2026)

## M5 — Maestro E2E flows (T3) on the 5 critical user journeys

**Outcome:** Every EAS build is automatically tested against 5 flows before it can be submitted. The "Kumar manually installs IPA on sim" step is replaced by a Maestro run. Cycle time drops from ~30 min to ~15 min.

**Flows (from REGRESSION_SUITE.md):**
1. `signin-phone.yaml` — reviewer-bypass phone 9876543210 → OTP 123456 → home
2. `home-loads.yaml` — header, FAB, post feed present after sign-in
3. `family-tree.yaml` — Family tab opens to कुलवृक्ष, tree renders for ≥1 member (catches today's gen-tree class)
4. `compose-photo.yaml` — pick photo → post → verify in feed (catches the v0.15.10 + v0.16.0 photo-upload classes)
5. `delete-account.yaml` — typed DELETE → 200 → user signed out (Play/Apple compliance)

**Owner:** Testing Lead (sibling agent) drafts flows; main agent runs them; CTO reviews coverage.

**DoD:**
- 5 flows pass on the latest preview-ios-sim build.
- `scripts/post-build-smoke.sh` runs all 5 against the just-built artifact and exits non-zero on any failure.

**EAS builds consumed:** 2-3 (testing the harness itself + one to verify against a real build).
**Supabase cost delta:** uses `aangan_test` project — minor (~₹500/mo for a separate Supabase project if needed; or namespace within prod via test-user emails).

**Risks:**
1. Maestro on iOS sim sometimes flakes on first launch — add retry-once logic.
2. Photo-upload flow needs a deterministic image in the sim's photo library — pre-seed via Maestro's `addMedia`.
3. Supabase `aangan_test` project doesn't exist yet — need decision: separate project ($25/mo) or namespacing in prod (cheaper but riskier).

---

## M6 — Supabase schema-drift detector (nightly)

**Outcome:** A regression like the posts-bucket RLS loss (v0.16.0) is caught within 24h, not after a user reports a broken upload.

**Technical work:**
1. Nightly GitHub Action: `supabase db pull --project-ref <prod>` → `git diff supabase_schema.sql` → if diff, email Kumar.
2. Also: `supabase db lint` for RLS coverage on all tables flagged "must have RLS."

**Owner:** Main agent.

**DoD:**
- A test PR that drops an RLS policy on a non-prod project triggers the alert.

**EAS builds consumed:** 0.
**Supabase cost delta:** negligible (one db-pull per night).

**Risks:**
1. `supabase db pull` requires service-role auth — keep that secret in GitHub Actions encrypted env.
2. Migration drift is already known (CEO Review CTO #4) — first run will produce a noisy diff; baseline it once before turning on alerts.
3. False positives from Supabase-internal auth.* changes — filter out the `auth` schema.

---

## M7 — Security pass on service-role API routes

**Outcome:** All 7 server routes that hold a service-role key are audited for SSRF / rate-limit / input validation. Reduces "one bug = full DB compromise" risk.

**Technical work:**
1. Inventory the 7 routes (from CEO Review CTO #3).
2. For each: confirm `isSameOrigin` guard, add per-IP rate-limit (Vercel KV or Cloudflare WAF), input-schema-validate (Zod).
3. `npm audit` + `expo doctor` pass.
4. ADR documenting the audit results.

**Owner:** Main agent under CTO review.

**DoD:**
- All 7 routes have same-origin + rate-limit + Zod schema. ADR `notes/adr-0001-service-role-routes.md` filed.

**EAS builds consumed:** 0 (web-side only).
**Supabase cost delta:** 0.

**Risks:**
1. Vercel KV is paid above free tier — may need to migrate to a simpler in-memory rate-limit for now.
2. Adding Zod schemas to in-flight endpoints risks breaking existing clients — add as warnings before hard-enforcing.
3. Could find an actual vulnerability — document and fix before publishing.

---

# 90-day milestones (target: 17 Aug 2026)

## M8 — Release cycle time <10 min (commit → store-live)

**Outcome:** Kumar can ship a hotfix from a feedback message to the store in under 10 minutes. Today's ~30 min becomes the regression baseline.

**Technical work:**
1. Merge M2 (CI) + M5 (Maestro) + M6 (schema-drift) into a single "release gate" workflow.
2. `release.mjs` updates: parallelize the 4 EAS builds (today they're partly sequential). Pin EAS worker class to paid faster tier if cycle-time still > 10 min after parallelization.
3. Play staged rollout: 5% → 25% → 100% over 48h. Auto-pause on crash spike via Sentry alert.
4. Cycle-time metric instrumented and posted on the CTO scorecard.

**Owner:** Main agent.

**DoD:**
- 5 consecutive `release.mjs --type patch --commit --build all` runs complete in <10 min wall-clock.
- One staged rollout to Play executed end-to-end without manual baby-sitting.

**EAS builds consumed:** ~10 across the testing period.
**Supabase cost delta:** 0.

**Risks:**
1. EAS free-tier worker class limits — may need to upgrade if parallel doesn't help. CFO budget impact: $99/mo. Worth it at our scale.
2. Play's staged rollout dashboard sometimes lies about percentage reached — verify with Sentry adoption %.
3. Auto-pause requires Sentry → GitHub Action webhook chain that doesn't exist yet.

---

## M9 — Bus factor 2 (per BUS_FACTOR.md Layer 1+2)

**Outcome:** If Kumar is unreachable for a week, a designated successor can keystore-sign a release and push it. Tested.

**Technical work:**
- This is on Kumar (vault creation + provider invites). CTO tracks on the scorecard weekly.
- Engineering side: a `HANDOVER.md` (Layer 3) draft — runbooks already exist (`KEYSTORE_BACKUP_RUNBOOK.md`, `MSG91_KEY_ROTATION_RUNBOOK.md`, `EAS_SUBMIT_SETUP_RUNBOOK.md`); just need an index.

**Owner:** Kumar (operational) + main agent (HANDOVER.md index).

**DoD:**
- 1Password "Aangan Ops" vault exists with all 15 BUS_FACTOR rows populated.
- Successor named in BUS_FACTOR.md.
- Provider-level redundancy: at minimum Apple + Play + Supabase + GitHub.
- `HANDOVER.md` reviewed by the successor.

**EAS builds consumed:** 0.
**Supabase cost delta:** 0.

**Risks:**
1. Successor onboarding requires Kumar's time (~3h) — non-negotiable.
2. 2FA seeds in the vault require successor to claim each device — coordinate.
3. Trust failure mode — only viable successor candidates are family. Document.

---

## M10 — Cost instrumentation (CFO foundational)

**Outcome:** CFO has actual numbers, not estimates. ₹/MAU is a tracked metric on the scorecard.

**Technical work:**
1. Monthly cron: pull MSG91 + Supabase + EAS + Vercel + B2 invoices via dashboard scraping or API.
2. Aggregate into `costs/2026-MM.md` with actuals vs forecast from `notes/vendor-cost-projection-2026-05.md`.
3. Flag any vendor >20% over forecast.

**Owner:** Main agent (script) + CFO (interpretation).

**DoD:**
- `costs/2026-08.md` exists and is auto-populated for August.
- Variance alerts triggered for any vendor >20% over forecast.

**EAS builds consumed:** 0.
**Supabase cost delta:** 0.

**Risks:**
1. Most Indian vendors don't have invoice APIs — may need to manually upload PDFs into a parser. Or hand-fill: 30 min/month for Kumar.
2. GST invoice extraction can be done by Tabula / pdfplumber; ChatGPT API works too.
3. CFO function will want this in a spreadsheet — pipe to `AANGAN_REGRESSION_SUITE.xlsx` siblings.

---

# Cycle-time analysis (the most-leveraged metric)

**Today's release cycle:**
1. Code edit + sim test: ~5 min
2. tsc + jest + check:critical: ~30 sec
3. EAS Android AAB build: ~12 min
4. EAS Android APK build: ~10 min (parallel with #3 in `release.mjs`)
5. EAS iOS sim build: ~8 min
6. EAS iOS production build + auto-submit: ~15 min
7. Manual sim verify of iOS sim build: ~5 min
8. Kumar AAB upload to Play (manual): ~3 min
9. Play review + propagation: 1-4 hours (out of our control)

**~30-50 min wall clock excluding Play review.** ~20 min of that is EAS build time. CI + Maestro replaces step #7 (5 min); Play staged rollout removes step #8 anxiety. Realistic target: **8-12 min from commit to "build artifact published, smoke gate passed, Play upload triggered."**

This is the single biggest lever for unlocking volume. Every hour Kumar spends babysitting a release is an hour not spent on Kumar's actual P1: getting to 10K families.

---

# Risk register (top 5 across all milestones)

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Sentry RN DSN never gets set | medium | catastrophic (all crash data lost) | weekly scorecard nudge; CTO escalates after 2 misses |
| 2 | CI gate breaks dev flow → Kumar bypasses | medium | high (gates become decorative) | start as warning-only, prove fast (<90s), promote to required after 14 days |
| 3 | Maestro flakiness | high | medium | retry-once; allow 1 flake/PR; CTO reviews flake rate weekly |
| 4 | Supabase schema drift bigger than expected | high | medium-high | baseline once, accept the noise, fix top-3 drift items in M6 |
| 5 | EAS quota exhausted by harness-testing | medium | high (release ban) | run harness against locally-built JS bundle when possible; reserve EAS for store builds only |

---

# What we are NOT doing (and why)

These are explicitly deferred:

- **`packages/shared` monorepo** (CEO Review CTO #1) — Large refactor. Defer until after M8 (release cycle <10 min). At 1K-10K MAU the duplication is a tax, not a blocker.
- **B2 → Supabase Storage full migration** (CEO Review CTO Strategic) — happening organically via posts bucket fix; full migration deferred to 100K MAU prep.
- **WhatsApp Business OTP fallback** (CEO Review CTO Strategic) — only justified at 1M+ MAU per `vendor-cost-projection-2026-05.md`. Premature.
- **Visual regression testing (Percy / Chromatic)** — explicitly rejected in REGRESSION_SUITE.md.
- **Full E2E grid across device sizes** — Maestro on one iOS sim + one Android emu is enough.

These are not "no" forever. They are "no until the 30/60/90 above ships."
