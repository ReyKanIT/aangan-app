# Aangan CEO Dashboard

**Date:** [5:37pm - 17May26]
**Owner:** CEO standing agent
**Cadence:** new dated file each Monday; this is the first one — non-Monday seed.

---

```
============================== AANGAN CEO DASHBOARD ==============================

  Date:               2026-05-17
  Branch:             claude/interesting-tesla-0c90df
  RN version:         v0.16.1
  Web:                aangan.app (live)

  MAU (estimated):    UNKNOWN — Bet #2 (analytics) is unfair-funded P0
  Installs to date:   ~100 families (low-confidence — needs instrumentation)
  Signups (lifetime): UNKNOWN
  D7 retention:       UNMEASURED
  k-factor:           ~0 (no forced-invite step yet)

  Stores live:        Play (placeholder listing) · Indus (v0.9-era) · iOS TestFlight
  App Store iOS:      Pending Apple review (v0.15.x submitted; 3 ASC inputs Kumar-blocked)

  Build (this branch):    PASS (per latest commits — c9dbfa0 ego-centric tree shipped)
  Tests:                  116 passing (Phase 1 regression suite)
  Deploys:                web v0.16.x live; RN v0.16.1 → TestFlight pending
  P0 regressions (30d):   3 — Google sign-in stripped (caught late), posts bucket RLS
                          missing, Kulvriksh gen-tree exception (caught on sim — good)

  Bus factor:         1 (Kumar). Vault: empty. Successor: unassigned. ⚠️ P0.

  Agents standing:    CEO · CTO · CMO · Design · Testing
  Agents pending:     COO (target ≤ [17Jun26]) · CFO (target ≤ [17Sep26])

==================================================================================
```

---

## Top 5 Bets (this quarter, ranked by ICE — full text in `notes/10k-milestone.md`)

| # | Bet | Owner | DoD this week | Status |
|---|---|---|---|---|
| 1 | Forced "Invite 3 family members" onboarding | CTO + Design + CMO | Spec + mocks in `notes/`, sim-testable behind flag | ⏳ not started |
| 2 | Analytics + KPI dashboard (5 KPIs live) | CTO | Posthog or equivalent wired RN + web | ⏳ not started |
| 3 | iOS App Store live + Play listing real | CTO interim → COO when spawned | ASC fields filled, submit to Apple Review | ⏳ blocked on Kumar 3 inputs |
| 4 | NRI WhatsApp ad test (first paid funnel) | CMO + Kumar | ₹50K test campaign live; 500 attributions | ⏳ not started |
| 5 | WhatsApp share of family tree (viral mechanic) | CTO + CMO + Design | Share CTA wired in KulvrikshTreeView | ⏳ not started |

---

## Top 3 Risks

1. **Bus factor = 1.** Kumar disappears → Aangan dark forever. Vault unpopulated, no successor named. `BUS_FACTOR.md` describes the fix; nobody has executed it. *Above every growth bet.*
2. **Burn vs revenue gate mismatch.** Phase 0 projects ₹15-25L spend; Kumar's bridge is ₹50K-1L. 30× delta. If virality (Bets #1, #5) doesn't beat projections, 10K date slides into a capital event.
3. **Compliance / store rejection risk.** Apple Privacy Labels stale at v0.13. DPDP residency claim light. One rejection = 2-week ship loss + delayed iOS launch = direct hit on Bet #3 timeline.

## Risks de-prioritised but tracked

- RN ↔ web code divergence (CTO Review): real, but a 10K-MAU concern, not a 1K-MAU concern. Defer until post-500-users.
- Service-role keys in 7 API routes (CTO Review): mitigate with rate-limit + input-validation in the regression suite, not full rewrite.
- Praharee parked (good — explicit stop-doing).

---

## This week's actions — by sibling

### CTO
Anchor Bet #2 (analytics). Stand up Posthog (or equivalent) on RN + web in one branch. Goal: by EOW we can read **today's signup count** off a real dashboard. Do not gold-plate dashboards — 5 KPIs from `10k-milestone.md`, that's it. **DoD:** Kumar opens one URL Friday and sees real numbers.

### CMO
Anchor Bet #4 (NRI funnel). Set up Meta Ads Manager + 3 creative variants targeted Indian-diaspora US/UK/UAE, 35-65y, Hindi-first copy. Don't launch yet; have it ready to go *the day Bet #2 lands* so we can measure attribution. Parallel: draft 5 share-text variants for Bet #5 with Design.

### Design Lead
Anchor Bet #1 (forced-invite). Mock the 3-screen onboarding insert: "invite via WhatsApp / invite via phone / skip for now". Dadi Test compliant, Hindi-first, integrate with the relationship chip language used in `InviteWithCodeModal`. **DoD:** Figma or in-doc spec landed in `notes/design-forced-invite-spec.md` by EOW; CTO can start building from it Monday.

### Testing Lead
Anchor Bet #2 prerequisite. Write the test fixtures that prove the 5 KPI funnel events fire correctly (`signup_complete`, `invite_sent`, `invite_accepted`, `post_created`, `session_d7`). The dashboard is only as good as the events that feed it. **DoD:** failing-test scaffold for the 5 events landed; CTO's instrumentation PR turns them green.

### Kumar (founder, executive ask — the actually-blocking-everything items)

These three things only Kumar can do. Each unblocks a chunk of the 5 bets.

1. **Populate the Aangan Ops vault + name a successor.** 1-2 hours. `BUS_FACTOR.md` is the runbook. **Do this before any bet ships.** Above-everything P0.
2. **Submit the 3 ASC fields Apple needs** (per `APPLE_REVIEW_DEMO_ACCOUNT.md` + CEO Review tracker P0 #4). 15 minutes. Unblocks Bet #3.
3. **Authorise CEO/CTO to spend up to ₹50K of bridge funds on Bet #4** (NRI WhatsApp ad test) once Bet #2 ships. No prior approval needed per ad-creative; just the budget envelope. Reply "approved" in chat.

If only one of these gets done this week — **do #1.**

---

## Directives to siblings (the orchestrator will relay each)

```
DIRECTIVE TO CTO: Stand up analytics + KPI dashboard (Bet #2). Provisional —
  the precise vendor (Posthog vs Mixpanel vs Supabase-derived) is a CTO call,
  but the 5 KPIs in notes/10k-milestone.md must show real numbers by EOW.
  Anchor: 10k-milestone Bet #2. DoD: Kumar opens one URL on Friday and sees
  installs/wk, signup-completion-rate, first-family-invite-rate, D7 retention,
  k-factor. Due: [22May26] EOD.

DIRECTIVE TO CTO (parallel): Begin Bet #1 (forced-invite) the moment Design's
  spec lands. Anchor: 10k-milestone Bet #1. DoD: behind-flag build that a sim
  test can verify by [29May26]. Due: [29May26].

DIRECTIVE TO CMO: Stand up Meta Ads Manager + 3 NRI-targeted creative
  variants (Bet #4). Do NOT launch the campaign until Bet #2 attribution is
  live. Parallel: draft 5 WhatsApp-share copy variants for Bet #5 with
  Design Lead. Anchor: 10k-milestone Bets #4 + #5. DoD: campaign ready to
  toggle live; 5 share-copy variants in notes/cmo-share-copy-variants.md.
  Due: [22May26].

DIRECTIVE TO DESIGN: Spec the 3-screen forced-invite onboarding (Bet #1).
  Dadi Test compliant, Hindi-first, reuse the 25 Hindi relationship chips
  from InviteWithCodeModal. Anchor: 10k-milestone Bet #1. DoD:
  notes/design-forced-invite-spec.md with screen mocks and copy.
  Due: [22May26] so CTO has it Monday.

DIRECTIVE TO TESTING: Author the failing-test scaffold for the 5 KPI funnel
  events (signup_complete, invite_sent, invite_accepted, post_created,
  session_d7_return). Anchor: 10k-milestone Bet #2. DoD: 5 red tests in
  aangan_rn/src/__tests__/analytics/ that turn green once CTO instruments.
  Due: [22May26].
```

---

## Final-call rulings — none this cycle

CEO has not been asked to break any CTO/CMO/Design/Testing tie this week. If a directive surfaces a conflict (e.g. "CTO says we can't ship forced-invite without rate-limiter; CMO says ship without it"), CEO will rule in the Wed dispatch.

---

## Next dashboard

[18May26] is a Monday — full Mon scorecard pulls into `notes/ceo-dashboard-2026-05-18.md` with whatever's landed by then. This dashboard (2026-05-17) is the seed.

CEO STANDING BY — agent-id: ceo-standing-2026-05-17
