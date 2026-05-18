# 10K Families Milestone — Aangan

**Owner:** CEO standing agent
**Last updated:** [5:37pm - 17May26]
**Re-baseline:** quarterly, or on a material event (major bet ships, major bet fails, capital change, +50% rate change).

> **The only number that matters between today and the day this file is replaced:
> 10,000 connected families on Aangan.**

Everything below is in service of that.

---

## Where we are today (2026-05-17)

| Signal | Estimate | Confidence |
|---|---|---|
| Total signups to date | ~100 families (Phase 0 baseline per growth doc) | low — no instrumentation panel yet |
| MAU (estimated) | unknown — no analytics dashboard wired | very low |
| Stores live | Play (live), Indus (v0.9-era live, v0.15+ pending), iOS TestFlight | high |
| iOS App Store | Pending Apple review (v0.15.x submitted) | high |
| Web (aangan.app) | Live, SEO panchang + 24 festival pages indexed | high |
| RN version | v0.16.1 (in this branch) | high |
| Critical regressions in last 30 days | 3 — Google sign-in stripped, posts bucket RLS, gen-tree exception | high |
| Bus factor | 1 (Kumar only) | high |

**Verdict:** Foundations solid, instrumentation thin, distribution barely begun. We don't actually know our MAU. **First instrumented week is the precondition for everything below.**

---

## Target date

**[Apr 17, 2027] — 11 months from today.**

**Why this date:**
- The growth doc (`notes/growth-and-monetization-2026-05.md`) projects 1K families by Month 0 (Jul 2026), 5K by Month 6, **10K by Month 12 self-sufficiency**.
- Today is the planning end of Month -2 (we're pre-Phase-0). The honest start of Phase 0 is **when the iOS App Store goes live and we have analytics wired** — call it [Jun 17, 2026].
- 10 months of Phase 0 + Phase 1 → 10K is realistic but not slack. India family-app comps (Sharechat, Pratilipi) hit similar gates in 6-9 months once distribution wakes up; we add a 1-2 month buffer for solo-founder execution.

**Aggressive variant:** [Feb 17, 2027] (9 months) — only achievable if NRI WhatsApp ads land in Aug 2026 with CAC < ₹100 AND forced-family-invite ships in Jun 2026 AND first pandit cohort delivers 200+ families by Sep 2026. Track this monthly; promote to target if Q1 hits.

**Conservative variant:** [Jul 17, 2027] (14 months) — if Apple review drags 30+ days OR first paid acquisition channel doesn't break even by Month 6.

---

## Weekly KPIs (the smallest set that tells us "are we on pace")

Pick **five**. Reviewing more than five weekly is theatre.

| # | KPI | Why it's the metric | Today | Month-6 target | Month-12 (10K gate) target |
|---|---|---|---|---|---|
| 1 | **New installs / wk** | Top-of-funnel proxy; if this is flat we don't have distribution | unknown | 200/wk | 500/wk |
| 2 | **Signup-completion rate** | OTP → profile → first family-tree node. Below 50% = funnel broken | unknown | ≥ 55% | ≥ 65% |
| 3 | **First-family-invite rate** | % of new signups who invite ≥ 1 family member within 24h. **This is the viral coefficient input.** Without it, Aangan is dead | ~0% (no forced step) | ≥ 60% | ≥ 75% |
| 4 | **D7 retention** | Came back 7 days later. Below 30% = product not sticky | unknown | ≥ 35% | ≥ 40% |
| 5 | **k-factor (invites accepted / signup)** | The viral math. k > 1 → self-sustaining. Don't deceive yourself on this | unknown | ≥ 0.6 | ≥ 1.0 |

**Pre-conditions to even measure these:** a real analytics panel (Posthog / Mixpanel / Supabase-derived). **Bet #5 below addresses this.** Until that ships, every other KPI is vibes.

---

## Top 5 cross-functional bets — THIS QUARTER (May → Aug 2026)

Ordered by **ICE = Impact × Confidence ÷ Effort**, on a 1-10 scale.

### Bet #1 — Forced "Invite 3 family members" onboarding step
**ICE:** 9 × 9 ÷ 3 = **27**
**Owner function:** CTO (build) + Design Lead (UX) + CMO (copy)
**1-week milestone:** Spec + mocks landed in `notes/`, behind-flag toggle ready for sim test.
**Why it's #1:** A family network with 1 member is abandoned. Today there is no forced-invite step. This is the single biggest activation lever in the entire backlog and CMO has it as ICE #2 already. Without this, k-factor stays near zero and Bets #3/#4 don't compound.
**DoD:** New signup cannot reach Home without either inviting 3 contacts OR explicitly "skip for now" (which logs to a friction-recovery queue for re-prompt at D2).

### Bet #2 — Analytics + KPI dashboard (the measurement bet)
**ICE:** 8 × 10 ÷ 3 = **26.7**
**Owner function:** CTO
**1-week milestone:** Posthog (or equivalent) wired in RN + web; the 5 KPIs above show real numbers in a Supabase-derived or Posthog dashboard.
**Why:** We literally don't know our MAU. Every other bet on this list flies blind without this. This bet *enables* every other bet to be evaluated.
**DoD:** Kumar can open one URL and see the 5 KPIs above with day/week/month buckets. CEO dashboard pulls from same source.

### Bet #3 — iOS App Store approval + Play Store store-page polish
**ICE:** 9 × 8 ÷ 3 = **24**
**Owner function:** COO (when spawned) — for now CTO interim with Kumar
**1-week milestone:** ASC form fields filled, screenshots uploaded, demo account verified by reviewer flow. Submit to review by end of week.
**Why:** iOS launches the NRI segment (highest willingness-to-install in the growth doc). Play needs a real listing not a placeholder; `PLAY_STORE_URL = null` was flagged in CEO Review 2026-05-08 — flip it. **Two stores live = ~2.5× addressable installs** vs sideload-only today.
**DoD:** Both app icons are clickable from `aangan.app` hero. iOS in review or live. Play store conversion-tracked.

### Bet #4 — NRI WhatsApp ad funnel (first paid acquisition channel)
**ICE:** 8 × 7 ÷ 4 = **14**
**Owner function:** CMO (campaign) + Kumar (creative approval) + Design Lead (ad assets)
**1-week milestone:** Meta Ads Manager set up, first ₹50K test campaign live targeting Indian diaspora US/UK/UAE 35-65y.
**Why:** Growth doc identifies NRIs as highest-willingness-to-install. We need to learn CAC before Phase 1. A ₹50K test with 500-1000 installs tells us whether ₹2-3L/mo (the Phase 1 plan) is viable.
**DoD:** 500 install-attributions tracked, CAC measured, creative-iteration loop established. Decide go/no-go for sustained budget by week 4.

### Bet #5 — WhatsApp share of family tree (zero-cost viral mechanic)
**ICE:** 7 × 7 ÷ 2 = **24.5** *(reordered #5 by ICE; #3 ranked higher by Impact-Confidence weight given store-launch is a one-way door)*
**Owner function:** CTO (build) + CMO (copy/share-text variants) + Design Lead (preview card)
**1-week milestone:** "Share family tree on WhatsApp" CTA wired in KulvrikshTreeView, share-card OG image renders for `/family/[code]` route.
**Why:** Growth doc Phase 1 #5 — "likely the biggest single growth lever once family-tree is rich." Every share = a real-name endorsement to family. K-factor accelerator.
**DoD:** From the tree screen, one tap → WhatsApp opens with pre-filled Hindi-first message + share link → recipient lands on a public-share page that converts to install.

---

## Stop-doing list

Three things to pause/kill because they don't serve the 10K path:

### 1. Stop: Praharee (Sentry-for-India) parallel-track build
Domain is secured, research is done (`notes/praharee.md`). **It's a separate company.** Kumar cannot run two products solo and hit 10K on either. Park Praharee until Aangan crosses 10K *or* until a co-founder is hired. The cost of the parked domain (~₹3K/yr) is trivial; the cost of split founder attention is the company. **Action:** Mark Praharee "frozen until Aangan @ 10K" in `notes/praharee.md`.

### 2. Stop: Programmatic festival SEO expansion beyond 24
We already shipped 24 festival landing pages (`/festivals/[slug]`). Growth doc proposes "50+". **Diminishing return.** The festivals already shipped cover ~95% of search volume. Building 50 more is content engineering with thin payoff for the 10K path. Once the 24 we have are ranking, *then* expand. **Action:** Re-prioritise to "improve depth of existing 24 pages (kuldevi info, panchang of festival day, share CTAs)" rather than add new ones.

### 3. Stop: Events tab as a v0.16.2 first-class feature
The events tab and event-creation flow (per `EventsListScreen` in current branch + RegressionSuite mentions) is being built *before* virality is wired. **Events have no value at 1 family.** They become valuable at 50-member trees. Defer events tab polish until forced-invite (Bet #1) has shipped and average tree size > 5 members. **Action:** Keep the existing screen at minimum-viable; do not pour any design or CTO cycles into events until forced-invite metrics validate the family-graph thickening.

(These three deferrals free ~3-4 weeks of CTO + Design cycles. Re-direct that capacity to Bets #1, #2, #5.)

---

## Spawn-trigger criteria — COO and CFO

### Spawn COO when ANY of these hits

- **Triple-store live** (Apple App Store + Play + Indus all live with current build version) — store ops becomes a daily ritual: review responses, listing updates, screenshot refresh per release. Currently this falls on Kumar and the CTO; a COO would own it standing.
- **>1,000 MAU** — support ticket volume crosses the threshold where Kumar can't respond personally; need an ops function for support SLA, ticket pipeline, refund policy.
- **First store rejection or P0 outage in production** — incident response needs an owner who isn't writing code.
- **DLT chain renewal or compliance event** (DPDP audit request, Apple Privacy Labels refresh required) — recurring compliance work needs a standing owner.

**Currently:** 2 of 4 met-or-near. iOS App Store imminent. Recommend **spawn COO within 30 days** — by [Jun 17, 2026], to coincide with iOS launch.

### Spawn CFO when ANY of these hits

- **First paid SKU live** (Razorpay + Family Tree PDF ₹299, per Kumar's milestone-gated rule, post-500-users) — books must exist before money flows.
- **Bridge funding > ₹1L spent** (the projected bootstrap ceiling per growth doc Phase 0) — burn tracking needs daily-not-monthly attention.
- **Approach 5,000 MAU** — unit economics decisions (vendor switches, OTP costs, storage egress) start having real ₹ impact; need someone who lives in the cost model.
- **Capital event signalled** (a strategic investor reaches out, or Kumar decides to test the seed market) — raise-readiness is months of work, can't be done reactively.

**Currently:** 0 of 4 met. Recommend **defer CFO spawn until 500-user gate is crossed OR Kumar signals capital intent.** Provisional spawn target: [Sep 17, 2026] (Month 3 of Phase 0). Until then, the CFO axis is shared between CTO (cost model) and CEO (spend authority).

### Why not spawn both today

Standing agents are non-zero overhead even at agent-level — every doc they produce is a thing Kumar might read. Spawning before they have a real workstream is performative. Wait until the work is unambiguously there.

---

## Risks to the 10K path (top 3)

1. **Bus factor = 1.** If Kumar disappears, Aangan disappears. `BUS_FACTOR.md` exists; vault and successor do not. **Mitigation:** every CEO review surfaces this until done. P0 above any growth bet.
2. **Burn outpaces revenue gate.** Growth doc says ₹15-25L for Phase 0. Kumar's bridge is ₹50K-1L. **Gap of 30×.** Either we hit virality cheaper than projected (Bets #1, #5), or this milestone slides 6+ months waiting for capital. Track CAC weekly from Bet #4 to disambiguate.
3. **Stores reject for compliance.** Account-delete shipped (good). Apple Privacy Nutrition Labels are at v0.13 not v0.15. DPDP data-residency claim is light. One rejection = 2-week ship loss. **Mitigation:** COO spawn closes this; until then, CTO + Kumar manually re-verify every submission against the compliance checklist in `CEO_REVIEW_2026-05-08.md`.

---

## Re-baseline trigger

This doc gets replaced (not edited) when ANY of these hits:

- 30 days elapsed without an update
- One of the 5 bets ships (mark done, promote next-best from backlog)
- One of the 5 bets fails or is killed (write a 1-paragraph post-mortem inline, replace it)
- MAU crosses 1K, 2.5K, 5K, or 10K (each is a phase change per growth doc)
- Kumar makes a strategic call that invalidates a stop-doing item

Don't let it rot.
