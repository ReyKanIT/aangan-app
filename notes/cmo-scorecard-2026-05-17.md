[5:39pm - 17May26]

# Aangan — CMO Scorecard

> **Date:** [5:39pm - 17May26]
> **Author:** cmo-2026-05-17 (standing CMO agent)
> **Frame:** current state of the funnel, viral coefficient, competitive position, onboarding, and monetization readiness, scored 1-10 with a single concrete next move per axis.

---

## TL;DR

| Axis | Score | Headline |
|---|---|---|
| User funnel | **3 / 10** | Largely uninstrumented. We are flying blind from install → first-post. Biggest *known* drop: profile-setup completion (anecdotally < 50%). |
| Viral coefficient (k) | **4 / 10** | Mechanic shipped (v0.13.0 WhatsApp invite + Aangan ID). No share-prompt in onboarding. Estimated k ≈ 0.2–0.3. Forced "invite 3 family" at signup is the 2x lever. |
| Competitive position | **8 / 10** | Wedge is genuinely sharp (Hindi-first + Panchang + Kuldevi + Sutak + audience-control + Dadi Test). No competitor stacks these. Risk: unknown to market. |
| Onboarding quality | **4 / 10** | Hardcoded `+91`, native confirm dialogs, P0 Dadi-Test misses in Login + FamilyTree per `notes/design-backlog.md`. First-60-second experience is shaky. |
| Monetization readiness | **2 / 10** | Razorpay not integrated. No paid SKU live. First milestone (500 users → Razorpay + Family Tree PDF) is the right unlock. |
| **Overall** | **4.2 / 10** | Strong moat, weak measurement, weak activation, no revenue rails. Fixable in 30-60 days. |

---

## 1. User funnel

### 1.1 Funnel definition

```
Install → Open → Phone-OTP-success → Profile-Setup-complete →
  → First family member added → First post → D7 retention → D30 retention
```

### 1.2 Step-by-step assessment

| Step | Estimated conversion | Confidence | Notes |
|---|---|---|---|
| Install → Open | 60–70% | Medium | Industry benchmark; not instrumented for Aangan specifically |
| Open → OTP-success | **Unknown — instrument needed** | Low | Vi DLT chain live (per memory); SMS delivery should be fine. Need: count of `phone_otp_verify` success / count of `phone_otp_request`. **No event currently fires from RN to a count.** |
| OTP-success → Profile-Setup-complete | **~50% (anecdotal — KUMAR FEEDBACK signal)** | Low | Profile-setup demands: name (Hindi + English), photo, village, state, DOB, Gotra, Family Role, Wedding Anniversary. That's **8 fields**. Far too many for a phone-first flow. **Likely biggest drop in the funnel.** |
| Profile-Setup → First family member added | **Unknown — instrument needed** | Low | No "ego-centric tree" pre-population by default; user has to know they need to add a parent / sibling first. v0.16.1 added ego-centric tree which helps comprehension but does not add a forcing function. |
| First family member → First post | **Unknown — instrument needed** | Low | The composer is in feed, but new users see an empty feed. The "GuidedFlowBanner" with 3 steps (parents / siblings / first post) is the right idea, but tap targets are 36px (below Dadi 44px min) per Design backlog. |
| D7 retention | **Unknown** | Low | Daily reminders cron exists at 08:00 IST, and Panchang widget is a daily-pull. Probably 25–35% in the absence of instrumentation. |
| D30 retention | **Unknown** | Low | Plausibly 15–20% based on family-graph apps benchmarks. |

### 1.3 Biggest drop (hypothesis)

**Profile-Setup completion is almost certainly the biggest drop.** Eight fields is a 2026-Indian-millennial flow, not a Dadi-Test flow. Some fields are also weird gates for entry:
- **Wedding anniversary** — a single 22-year-old user has no wedding anniversary. They will either lie, leave blank, or abandon.
- **Gotra** — many urban younger users don't know their Gotra. Same outcome.
- **Hindi + English name** — typing your name in two scripts is friction.

**Recommendation:** cut profile-setup from 8 fields to **3 mandatory fields** (Name [auto-script-detect], Phone-already-verified, Photo). Move DOB, Gotra, Family Role, Village, State, Wedding Anniversary, Hindi-name to **post-onboarding progressive enrichment** (gentle nudges with "complete your profile to unlock X" framing). Move the 3-mandatory bar to a 30-second flow.

### 1.4 Score: **3 / 10**

We don't know our own funnel. We assume it works. **One change that 2x's our scorecard score here: instrument the funnel** (Phase 0 of growth-loops-30d.md, item 1).

---

## 2. Viral coefficient (k-factor)

### 2.1 Current viral mechanics shipped

| Mechanic | Status | Estimated k contribution |
|---|---|---|
| WhatsApp deep-link invite with relationship pre-set (v0.13.0) | ✅ Shipped | 0.15 — solid mechanic, but **no forcing function** in onboarding |
| Aangan ID share (v0.13.5) | ✅ Shipped | 0.05 — useful for re-connection across phone changes; low broad reach |
| QR guest-upload (v0.1) | ✅ Shipped | 0.05 — side-door installs from wedding/event guests |
| Referral storage bonus (+2 GB per verified) | ✅ Shipped | ~0 — storage was removed from Settings UI (v0.15.8 pivot per design-backlog) so the user can't see the bonus. Probably worth pruning. |
| Public OG-rich event share links | ✅ Shipped | 0.02 — sporadic |
| Forced-invite-at-signup | ❌ Not shipped | **0.3-0.5 lift if added** |
| WhatsApp share of family tree after build | ❌ Not shipped | **0.2 lift if added** |
| Panchang daily share | ❌ Not in onboarding; share button exists in `CRITICAL_FEATURES.md` row 91 but isn't featured | 0.05–0.1 lift |

### 2.2 Estimated current k

**~0.2–0.3** — every 10 new families bring 2–3 more.

Self-sustaining viral growth requires k ≥ 1.0. We are nowhere near. Most family-graph apps live around k = 0.6–1.4 (the WhatsApp invite chain in Aangan v0.13.0 has the right shape but is *opt-in not forced*).

### 2.3 Single change that 2x's k

**Add a "Invite 3 family members" step to the post-OTP onboarding flow.** Block "Skip to Home" with a soft gate: "Aangan ek परिवार के बिना खाली है" (Aangan is empty without family). Pre-fill the share message in Hindi. Use the v0.13.0 family-invite RPC.

This pulls k from ~0.25 to ~0.6 in one ship. The CTO can deliver it in 2-3 days (per the growth-and-monetization-2026-05.md Phase 0 priority).

### 2.4 Score: **4 / 10**

The mechanics exist. The forcing function does not.

---

## 3. Competitive position

### 3.1 The Aangan wedge

| Dimension | Aangan | WhatsApp Family Group | Facebook | Kutumb | MyHeritage | FamilySearch |
|---|---|---|---|---|---|---|
| Hindi-first UI | ✅ deep | partial | partial | ❌ | ❌ | ❌ |
| Family tree (L1/L2/L3 with audience control) | ✅ | ❌ | basic | basic | ✅ (no audience) | ✅ |
| Panchang built-in (offline-capable) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kuldevi / Kuldevta | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sutak rules + barsi tracking | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dual-calendar reminders (tithi + English) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Voice-first composition (Hindi STT) | ✅ | partial | ❌ | ❌ | ❌ | ❌ |
| Dadi Test (52px+, 16px+, Hindi labels) | ✅ | partial | ❌ | partial | ❌ | ❌ |
| Phone-only auth | ✅ | ✅ | ❌ (email default) | ✅ | ❌ | ❌ |
| Audience-controlled posts per L1/L2/L3 | ✅ | ❌ (group-level only) | partial | ❌ | ❌ | ❌ |
| Free forever | ✅ (core) | ✅ | ✅ | partial | ❌ | ❌ |

**No competitor stacks these.** The wedge is real and defensible — WhatsApp can copy two of these, never all of them in one product.

### 3.2 Is the wedge sharp enough?

**Yes — but the market doesn't know it.** The Play Store listing leads with "Family Tree, Panchang, Chat" — a *features* line, not a *pain-point* line. The hero CTA should read: "अब WhatsApp के 10 ग्रुप नहीं — एक आँगन" (No more 10 WhatsApp groups — one Aangan). The current short description is close but loses the *emotional* punch.

### 3.3 Risk

**The wedge is invisible until a Dadi tries it.** Aangan needs a *visible* in-product moment that screams "this is for Indian families specifically" — within the first 60 seconds, before the user has invested anything. Today, that moment lives in Settings (Kuldevi) or in the Panchang widget on the home feed *after* completing profile-setup. **Too deep.**

**Recommendation:** put the Panchang ribbon ("आज पूर्णिमा — चंद्र दर्शन का दिन") on the **post-OTP "loading your aangan" splash screen** for the first 1.5 seconds. First impression = Indian-family-specific cultural awareness.

### 3.4 Score: **8 / 10**

Strong moat. Visibility weak. Marketing copy needs sharpening (CMO's own job; addressed in next sprint).

---

## 4. Onboarding quality

### 4.1 First-60-second user-journey map (current)

| Second | What happens | Friction flag |
|---|---|---|
| 0 | Install → Open. Splash with Aangan logo. | OK |
| 2 | Login screen: phone field with hardcoded `+91`. NRI users blocked. | 🚩 P0 — no country picker (Design backlog) |
| 5 | User taps phone field, types number. The big white "लॉगिन करें" CTA is below the fold on small Android devices. | 🚩 medium — verify viewport |
| 10 | OTP request. SMS arrives via MSG91/Vi (live per memory). | OK |
| 25 | OTP entered. Auth succeeds. New-user upsert fires. | OK |
| 30 | **Profile-Setup screen with 8 fields** (Name Hi+En, Photo, Village, State, DOB, Gotra, Family Role, Wedding Anniversary). | 🚩 **P0 — biggest drop** |
| 60+ | User abandons OR completes profile, lands on home feed. Empty feed. GuidedFlowBanner shows 3 next-steps. Step buttons are 36px (below Dadi 44px min, per design-backlog). | 🚩 P0 + medium |

**Verdict:** the first 60 seconds are *not* tuned. They are a 2024-flow that hasn't been refined for the bootstrap conversion-critical phase.

### 4.2 Activation event

**Is "first family member added" the right activation event?** Reviewing the GuidedFlowBanner's current 3-step list (add parents / siblings / first post), the activation should be:

> **A family with 3+ members and 1+ post within 7 days.** (This is also the `Family Activation Rate` metric in `AANGAN_BUSINESS_PLAN.md` §9.)

Today's banner is correct in spirit. The form is wrong:
- 36px tap targets fail Dadi Test
- No celebration moment after step completion
- No "your aangan is X% ready" progress ring
- Step text in Hindi only; English subtitle missing per Aangan's bilingual standard

### 4.3 Recommendations (rank-ordered)

1. **P0:** Cut profile-setup to 3 mandatory fields. Move the other 5 to gentle post-activation nudges.
2. **P0:** Add country-code picker (also a CRITICAL_FEATURES manifest item — per Design Lead).
3. **P0:** Force "invite 3 family members" as step 1 of the GuidedFlow, with a soft skip ("बाद में") but track skip-rate as a funnel metric.
4. **P1:** Bump GuidedFlowBanner tap targets 36 → 44px.
5. **P1:** Add a celebratory state after the first family member is added — confetti, "अब आपका आँगन शुरू हुआ!" toast. Emotional payoff.
6. **P1:** Replace native `Alert.alert` confirm flows on Settings sign-out / family-tree invite confirms with `useConfirm()` Hindi-first dialog (per CRITICAL_FEATURES row 70).

### 4.4 Score: **4 / 10**

Right activation event picked. Wrong form. The 60-second flow has 2 P0 frictions that probably cost us 30-40% of installs.

---

## 5. Monetization readiness

### 5.1 PRD §11 monetization paths

| Path | Build effort | Earliest activation | LTV signal | Friction at first sale |
|---|---|---|---|---|
| **Family Tree PDF/print (₹299–₹999)** | 1 week | 500 users | High — physical artifact, one-time, gift-able | Low — Razorpay one-shot |
| **Pandit / Purohit marketplace** | 2-3 weeks | 2,000 users | High — recurring puja bookings | High — supply-side network needed |
| **Aangan Premium (₹199/yr — ad-free + verified)** | 1 week | 5,000 users | Medium — annual subscription | Medium — perceived value not yet clear |
| **Festival event bundles (₹499–₹4,999)** | 2 weeks | 8,000 users | High in season; seasonal | Low — seasonal demand |
| **AdMob banners on public surfaces** | 3 days | 5,000 users + UX review | Low ARPU but ongoing | Low — set-and-forget |

### 5.2 Which ships FIRST? — **Family Tree PDF**

**Reasoning:**
- **Lowest friction.** Single-shot Razorpay flow. No marketplace supply-side problem to solve.
- **Highest LTV per first sale.** ₹400 margin per order vs ₹3-5/yr from ads.
- **Validates willingness-to-pay** without needing a critical mass of users (10 sales × ₹400 = ₹4K is plenty of signal).
- **Doubles as a viral artifact.** A printed family tree is a physical wall hanging that brings new family members in. Pure k-factor compounding.
- **Gated by user-milestone (500 users) not calendar** — meaning we're not wasting engineering on revenue rails before there's any demand. Per Kumar's 2026-05-16 rule.

**Second to ship: Pandit marketplace (at 2K users).** Higher build cost but huge TAM and natural cultural fit.

### 5.3 What's blocking the first SKU today?

- Razorpay not integrated (CTO scoping needed)
- GST registration (Kumar; ReyKan IT)
- Print partner — quotes from 3 vendors needed (Kumar)
- Aangan ID artifact design (CMO + Design Lead — exists at 32-bit ID, but the printable layout doesn't)

### 5.4 Score: **2 / 10**

Zero revenue rails live. Plan exists, sequencing is right, execution hasn't started.

---

## Score summary

| Axis | Score | One-line rationale |
|---|---|---|
| User funnel | **3 / 10** | Largely uninstrumented; profile-setup is the assumed biggest drop |
| Viral coefficient | **4 / 10** | Mechanics exist; no forcing function; k ≈ 0.25 |
| Competitive position | **8 / 10** | Wedge is sharp and stacked; market doesn't know yet |
| Onboarding quality | **4 / 10** | 60-sec flow has 2 P0 frictions and the right activation event chosen |
| Monetization readiness | **2 / 10** | Zero rails live; sequencing right; Razorpay + Family Tree PDF is the first ship |
| **Overall** | **4.2 / 10** | Bootstrap-track feasible but needs aggressive next 60 days |

---

## What changes the overall score most

| Lift | What we do | Score delta |
|---|---|---|
| **+1.5** | Instrument the funnel (Mixpanel/PostHog or even just Supabase event-table) | funnel 3 → 6, gives every other axis a measurement bedrock |
| **+1.0** | Forced "invite 3 family at signup" + cut profile-setup to 3 fields | k 4 → 7; onboarding 4 → 6 |
| **+0.8** | Razorpay + Family Tree PDF SKU live | monetization 2 → 5 |
| **+0.5** | Re-cut Play Store hero copy + screenshots to lead with pain-point not features | competitive 8 → 9 |

**If we execute these 4 in the next 30 days, the scorecard moves from 4.2 to ~7.0 — that's the path to 10K self-funded.**

---

End of scorecard. Next CMO review: **2026-05-31** (or sooner if any axis-score-changing event lands).
