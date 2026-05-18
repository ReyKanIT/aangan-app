[5:40pm - 17May26]

# Aangan — 30-Day Growth Loops Plan

> **Owner:** cmo-2026-05-17
> **Horizon:** [17May26] → [16Jun26]
> **Objective:** lift k-factor from ~0.25 → ~0.6 AND get first ₹ of revenue on the books, while building the measurement bedrock to grade everything.
> **Constraint:** bootstrap mode — total cash burn for this 30-day plan must stay under **₹15K** outside of Kumar's time.

---

## How to read this doc

Each loop has:
- **Loop name** (one phrase)
- **Current state** (working / broken / not built)
- **Single biggest leverage point** (one specific feature/UX change — not a list)
- **Estimated k or retention delta** (with how we'll measure it)
- **Required engineering work** (terse, scoped for CTO)
- **Priority** (P0/P1/P2)

Ship order is roughly: instrument → activation gates → viral mechanics → revenue rails → retention loops.

---

## Loop 1 — **Funnel instrumentation (foundation)**

**Status:** ❌ Not built. We have Supabase tables but no event-emit on the critical funnel steps. Sentry is wired for crashes only.

**Single biggest leverage point:** A single `funnel_events` table (or a free PostHog tier integration) that captures:
- `otp_requested`, `otp_verified`, `profile_setup_started`, `profile_setup_completed`, `first_family_member_added`, `first_post_created`, `app_opened_day_N`

**Estimated impact:** Doesn't move k directly. But **without this, every other loop's experiment can't be graded.** This is foundational; everything else compounds on it.

**Engineering work for CTO:**
- New Supabase table `funnel_events (user_id uuid, event text, props jsonb, ts timestamptz)` with RLS allowing service-role write only.
- Emit from RN at 7 points listed above (single helper `trackFunnelEvent(name, props)`).
- Simple SQL view `funnel_30d_v` that computes step-conversion rates.
- *(Optional, free)* PostHog SDK integration as a parallel destination — gives a UI for free.

**Priority:** **P0**. Without this, the rest of this doc is theatre.

**Effort:** 2-3 days CTO. Cost: ₹0 (Supabase already paid; PostHog free tier).

---

## Loop 2 — **WhatsApp invite chain (the primary viral loop)**

**Status:** ✅ Mechanic shipped v0.13.0 (`family_invites` + `/join/[code]` + `InviteWithCodeModal`). 🟡 **No forcing function in onboarding.** Users have to discover the invite modal on their own.

**Single biggest leverage point:** **Forced "Invite 3 family members" step in post-OTP onboarding flow.** Block "Skip to Home" with a soft gate; 3 invite slots; pre-fill Hindi WhatsApp message; each slot uses `create_family_invite` RPC with the relationship pre-set.

**Estimated impact:** **k 0.25 → 0.55.** Measured by:
- Numerator: `family_invite_clicks` rows / `claim_family_invite` success-count per inviter.
- Already-shipped: `family_invite_clicks` table tracks this exact funnel.

**Engineering work for CTO:**
- New RN screen `OnboardingInviteScreen` after `ProfileSetup`. Three relationship-typed slots (default: "पिताजी", "माँ", "भाई/बहन") with a WhatsApp share button per slot.
- Re-use existing `InviteWithCodeModal` logic; mass-generate 3 invites via `create_family_invite`.
- Soft skip "बाद में" — log skip event to `funnel_events` (Loop 1).
- Track: invites-sent-per-user, invites-claimed-per-inviter, slot-skipped-by-position.

**Priority:** **P0**. The single highest-leverage growth shipment of the next 30 days.

**Effort:** 3 days CTO. Cost: ₹0.

---

## Loop 3 — **Profile-setup compression (activation unlock)**

**Status:** 🚩 Broken — 8 fields, abandons ~50% per anecdotal Kumar feedback.

**Single biggest leverage point:** **Cut mandatory profile-setup from 8 fields to 3.** Mandatory = Name (auto-script-detect Devanagari vs Latin and ask "क्या यही नाम है?" to confirm), Photo, Phone-already-verified. Move all other fields (Hindi-name explicit, Village, State, DOB, Gotra, Family Role, Wedding Anniversary) to a "Complete your profile" progressive-enrichment card on the home feed.

**Estimated impact:** Profile-Setup completion rate **~50% → ~85%**. That's a 1.7x multiplier on every install we pay to acquire. Measured via Loop 1's `profile_setup_completed / profile_setup_started`.

**Engineering work for CTO:**
- ProfileSetupScreen — gut 5 fields, leave 3.
- Add "अपना आँगन पूरा करें" card to HomeFeed top (above GuidedFlowBanner) with progress ring (0–100% based on optional fields filled).
- Each optional field gets a single-tap entry sheet — no modal stack.
- DB: no schema change (all 8 fields already optional in `users` table per RLS audit).

**Priority:** **P0**. Pairs with Loop 2 — both ship in week 1.

**Effort:** 2 days CTO + Design Lead review. Cost: ₹0.

---

## Loop 4 — **Family Tree printable PDF (first revenue line)**

**Status:** ❌ Not built. Gated by 500-user threshold per Kumar's 2026-05-16 rule. **We can build the rails now; activate when threshold hits.**

**Single biggest leverage point:** End-to-end purchase flow: Family tab → "अपना परिवार-वृक्ष प्रिंट करें" button → preview SVG → Razorpay checkout (₹299) → email PDF + ship physical print via partner.

**Estimated impact:** First ₹ on the books. Validates willingness-to-pay. Also a **viral artifact** — a printed wall-hanging brings new family members in (estimated +0.05 k contribution at scale).

**Engineering work for CTO:**
- Razorpay integration (test mode → prod mode flip).
- PDF generation server-side from existing SVG family-tree.
- Print partner integration (Kumar to source 3 vendor quotes — non-engineering).
- Order-tracking table `print_orders` with RLS.
- GST invoice generation (1-line addition once Kumar has GST number).

**Priority:** **P1** (build now, ship to prod when 500-user threshold fires).

**Effort:** 1 week CTO. Cost: ~₹0 in build (Razorpay free; vendor margin is pass-through).

---

## Loop 5 — **Panchang daily share (Tier-2/3 SEO + retention loop)**

**Status:** 🟡 Partial. `/panchang` public route exists. `panchang-share` button is in CRITICAL_FEATURES.md row 91 but not prominently surfaced. No daily push to share.

**Single biggest leverage point:** **Daily 7:30 AM IST "आज की तिथि" push** with a tap-to-share-on-WhatsApp action that pre-fills a Hindi message with the tithi + a link to `/panchang?utm=daily_share`.

**Estimated impact:**
- Retention: +5-8% D7 (daily-pull habit reinforced).
- Viral: +0.05 k (each share = small chance of install from a non-Aangan WhatsApp contact).

**Engineering work for CTO:**
- Extend `daily-reminders` cron with a new 7:30 IST job (separate from 8:00 IST family reminders).
- Push payload: `{title: "आज पूर्णिमा", body: "देखें आज का पंचांग और शेयर करें", deep_link: "/panchang?action=share"}`.
- RN — when opened via this deep link, auto-trigger WhatsApp share sheet with pre-filled message.
- Public `/panchang` SSR page — add a sticky "WhatsApp पर भेजें" CTA at top (it might be there; verify).
- UTM tracking on `?utm=daily_share` → counted in `funnel_events` (Loop 1).

**Priority:** **P1**. Ships in week 2-3.

**Effort:** 3 days CTO. Cost: ₹0.

---

## Loop 6 — **Festival hijack (Raksha Bandhan + Ganesh Chaturthi window)**

**Status:** 🟡 Partial. Per-festival landing pages exist (24 festivals per growth-and-monetization-2026-05.md). Festival push notifications shipped v0.12.0.

**Single biggest leverage point:** **2 weeks before each festival, run a Hindi YouTube creator drip** (3 mid-tier creators @ 50K-200K subs each) with a "Aangan में अपने परिवार को कैसे शामिल करें" video — pre-festival emotional priming. CTAs land on a festival-specific `/festivals/raksha-bandhan?utm=creator_X` page.

**Estimated impact:** 500-1500 installs per festival window. Cost: ₹1.5-3L per festival. At 0.5% conversion-to-active-family that's 8-15 new families per ₹1L spent — high but seasonal.

**Engineering work for CTO:**
- Almost none. Festival pages exist.
- Add per-festival OG image dynamic generation (might exist).
- UTM-instrument the `/festivals/[festival]` routes (Loop 1).
- Conversion tracking: utm_source=X → install → activate.

**Priority:** **P2** (defer until after Loops 1-3 ship; need budget approval from CEO since this is the biggest single line-item this quarter).

**Effort:** 2 days CTO. Cost: ₹2-5L per festival window (CEO sign-off needed).

---

## Loop 7 — **Family-tree-share-after-build (latent compounding loop)**

**Status:** ❌ Not built. We have a beautiful tree (v0.16.1 ego-centric tree just shipped) — and *zero* prompt to share it.

**Single biggest leverage point:** When a user reaches the **"4th family member added" milestone**, fire a one-time modal: "देखो आपका आँगन कितना सुंदर बन गया! WhatsApp पर शेयर करें?" with a pre-rendered tree image + share button. One-shot, can be skipped, never re-prompts after dismissal.

**Estimated impact:** +0.1-0.2 k. Family members who *see* a beautiful tree in a WhatsApp forward have higher install conversion than abstract invite links.

**Engineering work for CTO:**
- Trigger: `family_members.count(WHERE user_id = self) === 4` (transition-based, not steady-state).
- RN: pre-render `KulvrikshTreeView` as image via `react-native-view-shot`.
- Upload to Supabase storage `share-cache` bucket (new, 7-day TTL).
- Open WhatsApp share with image + Hindi caption + link.
- Log to `funnel_events`: `family_tree_share_triggered`, `family_tree_share_completed`.

**Priority:** **P2**. Ships week 3-4.

**Effort:** 3 days CTO. Cost: ₹0.

---

## Loop 8 — **App-store listing copy refresh (top-of-funnel)**

**Status:** 🟡 Live but features-led not pain-led. Current short description leads with "Family Tree, Panchang, Chat".

**Single biggest leverage point:** Rewrite Play Store + Indus short-description + first 2 screenshots to lead with the **pain-point**: "WhatsApp के 10 ग्रुप नहीं — एक आँगन" (No more 10 WhatsApp groups — one Aangan).

**Estimated impact:** Store-listing-view → install conversion estimated lift **+15-25%**. Measured via Play Console funnel chart (already free + native).

**Engineering work:** **None — this is pure CMO + Design Lead work.** Just submit new ASO strings + screenshots.

**Priority:** **P1**. Ship in week 1 alongside Loops 2 and 3.

**Effort:** 1 day CMO (copy) + 1 day Design Lead (screenshot mocks) + 1 day Kumar (submission). Cost: ₹0.

---

## 30-day ship calendar

| Week | Ship | Owner |
|---|---|---|
| **Week 1 (17-23 May)** | Loop 1 (instrumentation), Loop 3 (profile-setup compression), Loop 8 (store listing refresh) | CTO + Design Lead + Kumar |
| **Week 2 (24-30 May)** | Loop 2 (forced invite at signup), Loop 5 (Panchang daily share) | CTO |
| **Week 3 (31 May-6 Jun)** | Loop 4 (Razorpay + Family Tree PDF rails built; gated by 500 users for activation), Loop 7 (family-tree share modal) | CTO |
| **Week 4 (7-13 Jun)** | Loop 6 prep (creator outreach — Kumar) + measurement review of Weeks 1-3 ships | CMO + Kumar |
| **End of 30 days** | First scorecard re-grade. Target: overall score 4.2 → 6.5+ | CMO |

---

## What we are explicitly NOT doing in this 30 days

- **No FCM migration** (deferred per PRD §9.2; Expo Push is fine until 10K).
- **No new language support** (Marathi/Gujarati/Tamil are v1.1 work).
- **No iOS-only features** — TestFlight v0.15.0 is live; focus is feature parity not iOS-novel work.
- **No Aangan Premium tier shipping** (gated by 5,000 users; we're at ~?00 today).
- **No AdMob** (gated by 5,000 users + UX review).
- **No celebrity / Bollywood partnerships** (Phase 2 territory).
- **No pandit marketplace MVP** (gated by 2,000 users).

These are all great. They are not the next ship.

---

## Coordination proposals for siblings

Based on the loops above, here are the two concrete asks for the parallel sibling agents:

```
PROPOSAL FOR DESIGN LEAD:
Design the post-OTP "Invite 3 family members" onboarding screen (Loop 2).
Three pre-filled relationship slots (पिताजी / माँ / भाई-बहन) each with an
inline WhatsApp share button. Use the existing InviteWithCodeModal as the
visual reference. Tap targets ≥ 52px; Hindi-first labels with English
subtitles wrapped in {'...'}. A "बाद में" (later) link in the footer for
soft skip. Include a 30%-progress ring at top to signal "you're 30% done
setting up your aangan".
Anchor: Loop 2 (forced-invite-at-signup) — the highest-leverage growth
loop in the 30-day plan.
DoD: A Figma frame + redlined RN-spec ready for CTO to implement within
4 hours of the brief landing.

PROPOSAL FOR TESTING LEAD:
Build a Maestro flow that walks a fresh install through:
(a) phone OTP success, (b) profile-setup completion, (c) first family
member added via the forced-invite step. The flow must emit timing
data for each step and a pass/fail count we can query.
Anchor: profile-setup completion rate is the suspected biggest drop in
the funnel (Scorecard §1.3). We currently estimate ~50% drop with no
instrumentation; this flow lets us regression-test that the
3-mandatory-field compression (Loop 3) actually moves the rate up.
DoD: Maestro flow runs green on iOS Simulator + Android emulator;
emits 'profile_setup_success_ts_ms' as a numeric measurement; CI
artefact captures the time-to-first-family-member; CMO can re-run
weekly to track drift.
```

---

## Risks & dependencies for this 30-day plan

| Risk | Mitigation |
|---|---|
| CTO over-committed on Kumar bug fixes; can't ship 5 features in 30 days | CMO prioritises Loops 1-3 as P0 must-ship; Loops 4-7 slip to next sprint without panic |
| Razorpay onboarding delays (GST / business registration) | Build rails in test-mode; flip to prod when ready |
| Festival hijack budget not approved | Loop 6 is P2 with explicit CEO sign-off gate |
| New 8-field profile-setup contains business logic we don't realise | Audit consumer of each field (Gotra used by Kuldevi? DOB used by reminders?) before cutting |
| Maestro flow flaky on emulator | Testing Lead's standing concern; accept up to 5% flake in CI |

---

## What success looks like at day 30

- Funnel instrumented end-to-end; CMO can answer "what's our profile-setup completion rate?" in 10 seconds via SQL.
- k-factor measured at ~0.45-0.6 (up from ~0.25).
- Profile-setup completion ≥ 80% (up from ~50%).
- At least 1 paid order on the books (₹299 Family Tree PDF) — or rails built, ready to fire at 500-user threshold.
- Play Store listing-view → install conversion measurable; baseline + post-change reading taken.
- Total cash spent: < ₹15K (excluding any festival creator deal which gets separate CEO sign-off).

---

End of 30-day growth plan. Next CMO review of this doc: **2026-06-16**. CMO will mark each loop ✅ / 🟡 / ❌ at the end of week 4.
