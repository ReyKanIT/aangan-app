# Aangan (आँगन) — Business Plan

> **Living document.** Last updated: 2026-05-16 | Version 0.8

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| v0.1    | 2026-03-30 | Initial plan — core product, storage model |
| v0.2    | 2026-03-31 | Added security features, web admin, guest upload |
| v0.3    | 2026-04-01 | Added social features, messaging, push notifications |
| v0.4    | 2026-04-03 | Added cultural layer (Panchang, Stories, Polls, Theme), Indus App Store strategy |
| v0.4.2  | 2026-04-04 | Added Kuldevi/Kuldevta heritage feature to product and differentiation sections |
| v0.4.3  | 2026-04-04 | Added Life Events (birth/death + Sutak) to cultural moat analysis |
| v0.4.4  | 2026-04-04 | Added Family Reminders (auto push notifications) to engagement & retention model |
| v0.5    | 2026-04-04 | Added Voice-Enabled Operations — full Hindi voice control for posts, search, and navigation |
| v0.6    | 2026-04-11 | **Strategic pivot:** Growth-first free model, WhatsApp viral loops, offline-first architecture, family-as-unit metrics, v1.0 roadmap |
| v0.7    | 2026-04-11 | **Monetization pivot:** Removed Aangan Gold subscription (₹99/mo). App is 100% FREE — revenue via premium add-ons at scale (Phase 2: 10K+ families) |
| **v0.8** | **2026-05-16** | **Funding model pivot: Bootstrap to self-sufficiency.** Kumar self-funds to 10K families. Beyond 10K, the business must fund itself from revenue. No external seed round. Revenue activation accelerated — moves from Phase 2 optional to Phase 1 mandatory. Aangan operates as a profitable, founder-owned company by Phase 2. VC funding becomes optional, not required, and is only entertained if a strategic moment demands it (e.g., competitive threat from Meta). |

---

## 1. Executive Summary

**Company:** ReyKan IT (operating as Aangan)
**Product:** Aangan — India's first Hindi-first family social network
**Stage:** Pre-seed / Closed Beta (Google Play review pending)
**Founded:** 2026
**Founder:** Kumar

Aangan is a mobile-first platform that gives Indian families a private, structured digital home — replacing chaotic WhatsApp family groups with an organized, culturally aware family space. Unlike WhatsApp groups where messages get buried, photos disappear, and there's no structure, Aangan provides a purpose-built family operating system with Panchang, Kuldevi, Sutak tracking, barsi reminders, family tree visualization, and full Hindi voice control that lets grandparents participate without typing.

**Core positioning:** Aangan is not another social network. It is the organized alternative to WhatsApp family groups — structured, private, and built for how Indian families actually work.

**Key metric:** Families connected (not individual users). The family is the unit.

**Current status (v0.15.6):** Panchang upgrade with Drik-accurate sunrise/sunset and Purnimanta Masa, in-app account-delete flow, demo-account flow for Apple Review, Sentry crash reporting wired (EU/Germany region), TestFlight v0.15.0 live, Indus App Store live, Google Play closed testing in progress.

**Funding model: Bootstrap to self-sufficiency.** Kumar (ReyKan IT) self-funds Aangan to 10,000 connected families. **Beyond 10K families, the business is required to fund itself from revenue.** No external seed round is planned. Revenue activation is the critical Phase 1 milestone — the app moves from "100% free" to "free core + active revenue lines" *before* the 10K threshold, so that monetization is proven and the operating P&L is positive at the moment self-funding ends. VC capital is optional, not required, and is only entertained later if a strategic moment demands it (e.g., Meta launches an Indian family product and Aangan needs to accelerate defensively).

This positions Aangan as a founder-owned, profitable, India-specific consumer app — closer in spirit to Mailchimp, Basecamp, or Indie Indian SaaS (Postman, FreshWorks pre-Series-A) than to the VC-burn-to-grow model of Sharechat or Hike. The bootstrap path is slower (10M MAU in ~7-10 years vs ~3-4 years on VC), but Kumar keeps 100% equity and decision rights.

---

## 2. Problem Statement

### 2.1 The WhatsApp Family Group Problem
300M+ Indian families use WhatsApp as their default family communication tool. It fails them in specific, measurable ways:

- **No structure:** Photos, forwards, good morning messages, and important updates all in one stream — nothing is findable
- **No archive:** Media auto-deletes after 90 days; family memories are lost forever
- **No privacy layers:** Everything is visible to everyone in the group — no way to share selectively with L1 (immediate) vs L3 (extended) family
- **No family identity:** No family tree, no heritage tracking, no cultural calendar
- **No event management:** Wedding planning in WhatsApp is chaos — no RSVP, no guest tracking, no photo collection
- **Group admin fatigue:** One person manages everything; no delegation, no moderation tools

### 2.2 The Cultural Gap
No existing product understands or serves:
- Panchang-based auspicious timing for events
- Kuldevi/Kuldevta heritage (family deity information)
- Sutak observance for births and deaths
- Barsi and death anniversary tracking
- Gotra-based family identity
- Hindi-first interface for rural and semi-urban users

### 2.3 The Exclusion Problem
India's 200M+ population aged 55+ is effectively excluded from digital family life because apps are designed for urban millennials. Grandparents — the keepers of family tradition — can't use existing platforms. Even Hindi-supporting apps require typing, which remains a barrier for elderly users accustomed to spoken communication.

---

## 3. Solution & Product

### 3.1 Core Platform (v0.8.0 — Current)

#### Social Layer
- Private family feed (posts, photos, videos, polls, stories)
- Audience control per post (L1 / L2 / L3 / custom group)
- Comments, reactions, direct messaging (DMs)
- 3-level family tree with interactive SVG visualization
- AI-powered family chatbot

#### Event Management
- Full event lifecycle: invite > RSVP > check-in > photos
- Multi-ceremony support (Mehndi, Sangeet, Pheras in one event)
- QR code guest photo upload (no app install required)
- RSVP tracker for hosts, dietary preferences, +guests

#### Cultural Heritage Layer — Key Differentiator
- **Panchang:** Daily Vedic calendar (tithi, nakshatra, yoga, vara, sunrise/sunset) — offline, GPS-accurate, self-contained engine
- **Kuldevi/Kuldevta:** Family deity names, temple locations, puja method, puja rules
- **Life Events:** Birth/death tracking with fully customizable Sutak rules
- **Barsi tracking:** Death anniversary reminders
- **Festivals:** Pre-loaded Indian festival calendar with notifications

#### Automated Family Reminders — Engagement Engine
- Daily 08:00 IST push notifications to all family members for:
  - Birthdays, wedding anniversaries (from profile)
  - Custom dates: barsi, annual puja, other occasions
  - Upcoming events (7/3/1 day before)
- All notification timing customizable per date
- Dedup log prevents duplicate sends

#### Voice-Enabled Operations — Accessibility Breakthrough
- **Full Hindi voice control:** Post creation, family search, and app navigation — entirely by voice
- **Voice post composer:** Speak a post in Hindi or English; speech-to-text creates the post automatically
- **Voice messages:** Send and receive audio messages in DMs
- **Voice search:** Find family members, events, and posts by speaking naturally
- **Voice navigation:** Open screens, switch tabs, and trigger actions hands-free
- **Dadi Test — passed with voice:** Grandmothers can post, search, and navigate without typing a single character

#### Design Philosophy
- **Dadi Test:** Every screen must be usable by a 65-year-old grandmother — now with voice as a first-class input method
- 52px+ tap targets, 16px+ body text, Hindi-first labels with English subtitles
- Colors: Haldi Gold (#C8A84B), Mehndi Green (#7A9A3A), Cream (#FDFAF0)
- Supported languages: Hindi + English (toggle in settings)
- Themes: Light / Dark / System

### 3.2 Technical Infrastructure
- **Mobile:** React Native (Expo SDK 52) — single codebase for iOS + Android
- **Backend:** Supabase (Postgres + RLS + Realtime + Edge Functions + Storage)
- **Web:** Next.js 15 (admin panel + guest upload portal + landing page at aangan.app)
- **Push:** Expo Push API + Supabase Edge Functions
- **Scheduling:** pg_cron for daily reminder function
- **Voice/Speech:** React Native Voice (speech-to-text) — Hindi + English recognition
- **Distribution:** EAS Build > Google Play (pending), Indus App Store (live), Apple App Store (coming)
- **Deployment:** Vercel (web), EAS (mobile builds)

### 3.3 Upcoming: Offline-First Architecture (v0.9+)
For rural India where connectivity is intermittent:
- **Local-first data:** SQLite/WatermelonDB on-device for posts, family tree, panchang
- **Background sync:** Queue writes when offline, sync when connected
- **PWA for feature phones:** Lightweight Progressive Web App for low-end devices without app install
- **Compressed media:** Auto-compress photos for low-bandwidth uploads
- **Offline panchang:** Full year of panchang data cached locally — works without internet

---

## 4. Market Analysis

### 4.1 Market Size

| Segment | Size | Notes |
|---------|------|-------|
| India internet users | 900M+ | TRAI 2025 |
| Indian smartphone users | 700M+ | IDC 2025 |
| Indian families | ~300M families | Census-based estimate |
| WhatsApp family groups | ~200M+ groups | Estimated from WhatsApp India user base |
| Families with smartphones | ~250M | Growing with Jio rural expansion |
| Target initial segment (urban/semi-urban) | 50M families | SAM Year 1-3 |

### 4.2 Market Trends Driving Adoption

1. **Jio Effect:** 500M new internet users since 2016 — many from rural and semi-urban India, exactly Aangan's audience
2. **UPI Normalization:** Digital payments frictionless — enables future premium add-on purchases
3. **Post-Covid family consciousness:** Surveys show increased desire for family connection tools
4. **NRI diaspora growth:** 32M Indians abroad desperate to stay connected to family
5. **Rising smartphone penetration in 55+ age group:** 40% YoY growth in elderly smartphone users
6. **WhatsApp fatigue:** Users increasingly frustrated with group spam, forwards, and lack of organization

### 4.3 Competitive Positioning: Aangan vs WhatsApp Family Groups

Aangan's primary competitor is not another social network — it is the WhatsApp family group. Every feature is designed to solve a specific WhatsApp pain point:

| Pain Point | WhatsApp Group | Aangan |
|------------|---------------|--------|
| Photo organization | Lost in chat stream, auto-deleted | Permanent album, organized by event/date |
| Family tree | Not possible | 3-level interactive visualization |
| Privacy layers | Everyone sees everything | L1/L2/L3 audience control per post |
| Event planning | Chaotic — "kitne log aa rahe hain?" | Structured RSVP, guest tracking, dietary preferences |
| Cultural calendar | Manual reminders | Auto panchang, festivals, barsi, Sutak |
| Heritage | Not possible | Kuldevi/Kuldevta, gotra, family history |
| Elderly access | Typing required | Full Hindi voice control (Dadi Test) |
| Spam/forwards | Major problem | No forwards; family-only content |
| Admin tools | Basic | Role hierarchy, moderation, audit log |

### 4.4 Broader Competitive Landscape

| Product | Type | Hindi? | Family tree? | Events? | Cultural? | Hindi Voice? |
|---------|------|--------|-------------|---------|-----------|-------------|
| **Aangan** | Private family network | First | L1/L2/L3 | Full | Deep | Full |
| WhatsApp | Messaging | Partial | No | No | No | No |
| Facebook | Public social | Partial | Basic | Basic | No | No |
| Kutumb | Indian family | No | Basic | No | No | No |
| FamilyAlbum | Baby photos | No | No | No | No | No |
| 23andMe | Ancestry | No | DNA only | No | No | No |

**Verdict:** No direct competitor in the private Indian family social network space with cultural depth and Hindi voice accessibility.

---

## 5. Business Model — Bootstrap to Self-Sufficiency

### 5.1 Monetization Strategy: Free Core, Active Revenue Lines from 10K Families

**Core philosophy:** The app stays free at its core — WhatsApp doesn't charge, Instagram doesn't charge, Aangan doesn't charge for the family social network itself. But **monetization is not deferred to a later, vaguer phase**. Revenue lines must be *built and activated* before Aangan reaches 10,000 families, so that the business is self-funding the moment Kumar's bridge-funding ends.

**The core app is 100% FREE.** No subscription. No paywall on family features. Every family gets the social network, family tree, events, panchang, festivals — all of it, forever, at zero cost.

**Revenue comes from optional, value-additive products** alongside the core network:
- **Pandit / Purohit Marketplace** (10-15% commission on bookings)
- **Family Tree & Photo Book Prints** (physical artifacts, ₹500 margin per order)
- **Wedding Event Bundles** (high-value, one-time, festival/wedding-tied)
- **Aangan Premium** (verified badge, expanded family-tree, ad-free, ₹199-499/yr)
- **Festival Brand Partnerships** (sponsored seasonal content, brand-safe)
- **Targeted Family-Category Ads** (insurance, education, family travel — at 1M+ MAU only)

None of these touch the core "family social network" experience. They are **alongside** Aangan, not gating it.

#### Phased Revenue Model — Self-Sufficiency Track

**Phase 0 — Build Revenue Infrastructure (Now → 5,000 families) · Kumar-funded**

Before Aangan reaches 10K families, the revenue rails must be live. This phase is about *infrastructure*, not revenue volume — proof that the pipes work.

Pre-10K activation checklist:
- [ ] Razorpay integration shipped (test mode → production)
- [ ] First priced SKU live (Family Tree PDF at ₹299, or print at ₹999)
- [ ] Pandit marketplace MVP — at least 10 pandits onboarded, booking + escrow flow live
- [ ] Aangan Premium tier shipped (initial offering: ad-free + verified badge, ₹199/yr)
- [ ] Optional: AdMob banner ads in non-core surfaces (festival pages, public panchang)

**Target:** ₹10-25K/month revenue by 5K families. Proves the rails work; not yet covering full costs.

**Phase 1 — Self-Sufficiency Threshold (5K → 10K families) · Kumar-funded**

Bridge to break-even. By the time Aangan hits 10K families, **monthly revenue must equal or exceed monthly operating costs**.

Revenue mix at 10K families (target ₹50-100K/month = ₹6-12L/year):
| Line | Volume | Revenue/month |
|---|---|---|
| Pandit marketplace (10% commission on ₹2K avg booking) | 50 bookings/mo | ₹10K |
| Family Tree / Photo Book Prints | 30 orders/mo × ₹400 margin | ₹12K |
| Aangan Premium (₹199/yr × 3% conversion) | 300 subscribers | ₹5K |
| Festival event bundles (Diwali/Karwa Chauth/Raksha Bandhan tie-ins) | 20/mo × ₹500 avg margin | ₹10K |
| AdMob banner ads on public surfaces | 10K MAU × ₹3-5 CPM | ₹3-5K |
| **Total at 10K MAU** | | **₹40-50K/month** |

Monthly cost at 10K MAU: **₹15-30K/month** (Supabase Pro + MSG91 + Vercel free tier + EAS).

**Margin: ₹15-35K/month positive** — small surplus that funds growth investment going forward.

**Phase 2 — Revenue-Funded Growth (10K → 100K families) · Self-funded**

Beyond 10K, every rupee of growth investment must come from revenue. Kumar stops adding capital. The business proves it can grow itself.

Operating principles:
- **30-50% of monthly surplus reinvested in growth** (content, ads, partnerships)
- **No hiring until revenue justifies it** — solo founder + freelancers/contractors first
- **No unnecessary tooling upgrades** — stay on free/cheap tiers until forced off
- **Optimize ARPU before MAU** — high-value users (NRIs, wedding-season buyers, premium subscribers) come first

Target at 100K families: ₹5-15L/month revenue. Net 30-50% margin = ₹1.5-7L/month reinvested in growth.

**Phase 3 — Brand Partnerships & Ad Revenue Scale (100K → 1M+ families) · Self-funded or optional VC**

At this scale, targeted ads + brand sponsorships become viable:
- **Targeted family-category ads** — insurance, kids products, festival decor, wedding services. Indian ARPU benchmark: ₹30-80/MAU/yr → ₹3-8 Cr/yr at 100K MAU, ₹30-80 Cr at 1M
- **Brand partnerships at scale** — Bajaj, HDFC, ITC, Asian Paints sponsor festival/family content
- **Marketplace expansion** — Aangan Shaadi (wedding services), Aangan Capital (financial products), Aangan Travel

This is also the moment to *optionally* consider external capital — but only if a strategic event demands it (Meta launches Indian family product; large acquisition opportunity; international expansion). Aangan is profitable and self-sustaining; raising is a choice, not a need.

### 5.2 Future Revenue Stream: Event Bundles (One-time, High-Value)
Tied to life events — natural purchase moment with high willingness to pay. Introduced in Phase 2.

| Bundle | Target Event | Price | Storage | Duration |
|--------|-------------|-------|---------|----------|
| Shagun | Puja/gathering | Rs.499 | 50 GB | 3 months |
| Mangal | Wedding | Rs.1,499 | 200 GB | 12 months |
| Maharaja | Grand wedding | Rs.4,999 | 500 GB + video | 36 months |

**Wedding bundle economics:** India has ~10M weddings/year. Even 0.1% adoption = 10,000 bundles. At Rs.1,499 avg = **Rs.1.5 Cr/year from weddings alone.**

### 5.3 Viral Growth Engine: Referral-Driven
Each verified referral = +2 GB storage for referrer. Creates organic viral loop at zero CAC.

### 5.4 Unit Economics (Family-Centric)

| Metric | Value | Notes |
|--------|-------|-------|
| Primary unit | Family (not user) | All metrics track families |
| Avg family size on Aangan | 8 members | Mix of immediate + extended |
| ARPU (Phase 1) | Rs.0 | Growth phase — no monetization |
| ARPU (Phase 2, target) | Rs.15-30/family/month | Premium add-ons, event bundles |
| CAC (WhatsApp referral) | ~Rs.0 | Viral loop |
| CAC (paid acquisition) | Rs.100-200 | Temple/community partnerships |
| LTV/CAC (referral) | Infinite | Zero-cost acquisition |

### 5.5 Financial Projections — Bootstrap Track

This forecast is **slower than the original VC-track projection** because growth is constrained by self-generated revenue, not by a capital infusion. The trade-off is permanent profitability and 100% founder ownership.

#### Bootstrap Scenario (Self-Funded Through 10K, Revenue-Funded Thereafter)

| Milestone | Time horizon | Families | Revenue/mo | Costs/mo | Net/mo | Cumulative profit | Funding source |
|---|---|---|---|---|---|---|---|
| v1.0 Launch | Month 0 (Jul 2026) | 1,000 | ₹0 | ₹5K | (₹5K) | (₹5K) | Kumar |
| Revenue rails live | Month 6 | 5,000 | ₹15K | ₹15K | ₹0 | (₹35K) | Kumar |
| **Self-sufficiency** | **Month 12** | **10,000** | **₹50K** | **₹25K** | **+₹25K** | **(₹50K)** | **Transition** |
| Revenue-funded growth | Month 18 | 25,000 | ₹1.5L | ₹50K | +₹1L | +₹0 | **Self** |
| Pandit network mature | Month 24 | 50,000 | ₹4L | ₹1L | +₹3L | +₹15L | Self |
| Brand partnerships start | Month 30 | 100,000 | ₹10L | ₹2L | +₹8L | +₹60L | Self |
| Ads at scale | Month 36 | 250,000 | ₹25L | ₹4L | +₹21L | +₹2 Cr | Self |
| Pre-million inflection | Month 48 | 750,000 | ₹80L | ₹10L | +₹70L | +₹10 Cr | Self |
| Million-family milestone | Month 60 | 1,500,000 | ₹2 Cr | ₹25L | +₹1.75 Cr | +₹30 Cr | Self |
| **5-year ARR run-rate** | **Month 60** | **1.5M** | **₹24 Cr** | **₹3 Cr** | **₹21 Cr/yr** | **₹30 Cr cumulative** | **Self** |

**Total Kumar bridge-funding required: ~₹50K-1L** (between months 0-12, before revenue covers costs).

After Month 12 (10K families): Aangan generates positive cash flow indefinitely. Growth pace is set by how much profit is reinvested vs distributed to Kumar.

#### Sensitivity — what if revenue activation is slower than planned?

If we miss the Month 12 self-sufficiency threshold:
- **Slip by 3 months:** Kumar funds an additional ₹50K-1L. Tolerable.
- **Slip by 6 months:** Kumar funds an additional ₹2-3L. Painful but possible.
- **Slip by 12 months:** Revenue model is broken; revisit Phase 0 thesis (are pandits not actually willing to use marketplace? Are families not buying prints?). May indicate we need a different revenue mix.

**Hedge:** If by Month 9 (5K families) we don't have at least ₹15K/month run-rate, **pause growth and focus 100% on revenue activation** until rails are working. Better to be at 5K families with healthy unit economics than at 15K with broken ones.

#### Why bootstrap beats VC track for Aangan

| | VC track | Bootstrap track |
|---|---|---|
| **Time to 1M MAU** | ~24 months | ~60 months |
| **Capital required** | ₹15-25 Cr seed | ₹50K-1L from Kumar |
| **Founder equity at 1M MAU** | ~70% (after seed dilution) | **100%** |
| **Decision rights** | Board + investors | Kumar alone |
| **Exit clock** | 7-10 year IRR pressure | None |
| **Revenue at 1M MAU** | ₹10-15 Cr/yr (similar) | ₹24 Cr/yr (higher — ARPU prioritized) |
| **Net to Kumar at 1M MAU** | ~₹7-10 Cr cumulative dividend potential | **₹30 Cr cumulative retained earnings** |
| **Risk profile** | High — VC can replace founder; pivot pressure | Low — Kumar controls outcome |
| **Strategic agility** | Constrained by VC thesis | Full control |

The bootstrap track delivers more money to Kumar over 5 years (~₹30 Cr cumulative profit retention vs ~₹7-10 Cr after dilution), keeps 100% control, and avoids the entire VC theatre. The cost is 2-3× slower growth — manageable for a family-network app where retention compounds, not for a fintech where speed is existential.

#### When to optionally raise — strategic triggers only

Raise external capital ONLY if one of these fires:

1. **Meta launches an India-specific family product** — defensive acceleration warranted; raise ₹50-100 Cr to outspend on acquisition
2. **Acquisition offer at ≥₹500 Cr valuation** — entertain, but only as exit (not growth funding)
3. **International expansion opportunity** — bangladesh/pakistan/nepal diaspora simultaneously, requires geographic scale
4. **Aadhaar/DigiLocker partnership** — government-scale opportunity requires enterprise capital
5. **A strategic partnership requires equity dilution** (e.g., Reliance/Tata distribution deal)

Absent any of these, do NOT raise. Bootstrap retains 100% of upside.

### 5.6 Cost Structure — Frugal-Mode Operating

Bootstrap requires aggressive cost discipline. Stay on free tiers until forced off. No tooling upgrades without a revenue justification.

#### Monthly costs by scale (full detail in `notes/vendor-cost-projection-2026-05.md`)

| Cost Category | Today (<1K) | At 5K | At 10K | At 100K | At 1M |
|---|---|---|---|---|---|
| Supabase | ₹0 (free tier) | ₹2K (Pro) | ₹2K | ₹15K | ₹2L |
| Expo EAS | ₹0 (free) | ₹2.5K (Production) | ₹2.5K | ₹2.5K | ₹2.5K |
| Vercel | ₹0 (Hobby) | ₹0 | ₹0 | ₹3K | ₹50K |
| MSG91 SMS | ₹500 | ₹2K | ₹3K | ₹20K | ₹2L |
| B2 + Cloudflare CDN | ₹0 | ₹0 | ₹0 | ₹1K | ₹15K |
| Sentry | ₹0 (free) | ₹0 | ₹0 | ₹0-2K | ₹10K |
| Other (Apple Dev, domain) | ₹500 amortized | ₹500 | ₹500 | ₹500 | ₹500 |
| **Total Infrastructure** | **₹1K** | **₹7K** | **₹8-10K** | **₹40-50K** | **₹4-5L** |

#### Frugality principles

1. **Free tiers first, always.** Don't upgrade until forced (rate-limit hit, feature blocked, real customer-visible degradation).
2. **No tooling subscriptions until proven need.** No premium Sentry features. No premium Vercel. No premium GitHub.
3. **No hiring until revenue justifies it.** Kumar + contractors first. Hire only when revenue per role > 3× cost of role.
4. **Quarterly cost review.** Compare last 90 days bills to forecast. Flag any vendor >20% over forecast. Refer to `notes/vendor-cost-projection-2026-05.md`.
5. **Track every cost in `costs/YYYY-MM.md`.** Monthly invoice paper trail for accountability.

#### What we deliberately do NOT spend on (in Bootstrap mode)

- ❌ Premium marketing tools (HubSpot, Marketo) — use free Mailchimp + manual
- ❌ Premium analytics — Vercel Analytics free tier + Supabase queries
- ❌ Office space, equipment beyond essentials
- ❌ Paid VC pitch consultants / advisors (we aren't pitching)
- ❌ Premium design tools beyond what's needed
- ❌ Co-working memberships beyond bare minimum

#### What we DO spend on (revenue-funded after 10K)

- ✅ Hindi YouTube influencer partnerships (₹2-5L per festival window)
- ✅ Meta ads for NRI segment (₹50K-2L/mo)
- ✅ Pandit partnership outreach + onboarding
- ✅ Content production (Hindi long-form + festival pages)
- ✅ Compliance (SOC 2, ISO when needed for enterprise customers)
- ✅ Praharee transition when triggers fire (per `notes/praharee.md`)

---

## 6. Go-to-Market Strategy

### Phase 0: Closed Testing (Now — May 2026)
**Goal:** 100 families, validate core flows, get Play Store approval
- Google Play closed testing (submitted)
- Indus App Store (live)
- Direct APK distribution to founding families
- Feedback via built-in chatbot and WhatsApp group

### Phase 1: Founding Families (May — Jul 2026)
**Goal:** 1,000 families connected, 100% free
- **v0.9 release (May 2026):** Offline mode, push notifications, WhatsApp invites, photo albums, performance
- **Beta incentive:** Founding family badge + priority feature requests for first 100 families
- **WhatsApp viral loop:** One-tap "Invite family to Aangan" — generates personalized WhatsApp message with deep link
- **Feedback loop:** Weekly calls with 10 power families

### Phase 2: WhatsApp Migration Engine (Jul — Dec 2026)
**Goal:** 10,000 families connected
- **v1.0 production launch (Jul 2026)**
- **"Move your family from WhatsApp" campaign:** Show families exactly what they're losing in WhatsApp groups
- **WhatsApp invite mechanics:**
  - Family admin sends invite via WhatsApp to each member
  - Invite includes family name, admin's name, and one-tap join link
  - New member joins with phone OTP — same number as WhatsApp, zero friction
- **Wedding season prep (Oct-Feb):** Onboard families during peak wedding season — free event management as hook
- **Hindi YouTube content:** "WhatsApp group vs Aangan — kya farak hai" comparison videos
- **Referral bonus:** +1 GB per verified referral = viral storage incentive

### Phase 3: Temple & Community Partnerships (Jan 2027 — Jun 2027)
**Goal:** 50,000 families connected
- **Temple partnerships:** Partner with 100+ temples to recommend Aangan for:
  - Family puja coordination
  - Panchang access (Aangan's built-in feature)
  - Festival event planning
  - Kuldevi/Kuldevta information sharing
- **Village-level adoption campaigns:**
  - Identify "family champions" in each village — one tech-savvy member per family
  - Provide offline demo sessions at community gatherings
  - Village-specific WhatsApp groups to onboard families in batches
- **NRI diaspora:** Targeted social ads (UK, USA, Canada, UAE) — "Stay connected to your family back home"
- **Pandit/purohit partnerships:** Recommend Aangan for puja bookings; Panchang feature synergy

### Phase 4: Mass Adoption (Year 2+)
- **Village adoption playbook:** Repeat temple/community model across 1,000+ villages
- **Corporate gifting:** Aangan premium themes as employee Diwali gift
- **Telecom bundle:** Jio/Airtel family plan bundle
- **Indus App Store featuring:** Leverage Made-in-India positioning
- **PWA launch:** Feature phone users can access Aangan via browser

---

## 7. Product Roadmap

### v0.9 — Offline, Growth & Polish (May 2026)
- Offline mode (SQLite local cache, background sync)
- FCM push notifications (migrate from Expo Push)
- WhatsApp invite deep links with tracking
- Photo albums per event (auto-create, slideshow, ZIP download)
- Performance: lazy loading, skeleton screens, FlashList, < 3s startup

### v1.0 — Production Launch (July 2026)
- Production-grade stability (crash rate < 0.5%)
- iOS App Store launch
- Offline-first architecture (Phase 1: read-only offline mode)
- PWA for feature phones
- 1,000+ families connected target
- Performance optimization (app size < 25 MB)

### v1.1 — Growth Features (Sep 2026)
- WhatsApp invite flow optimization (A/B tested)
- Family analytics dashboard (admin view)
- Multi-language support (Marathi, Gujarati, Tamil — Phase 1)
- Advanced family tree: marriage connections, in-law branches
- Family memory timeline (auto-generated from posts + events)

### v1.2 — Community & Scale (Nov 2026)
- Temple partnership portal (self-serve onboarding for temples)
- Village adoption toolkit (offline demo mode, batch onboarding)
- Full offline-first (read + write + sync)
- Group video calls for family events
- Family document vault

---

## 8. Engagement & Retention Strategy

### 8.1 Built-in Daily Engagement Drivers
| Feature | Daily touchpoint |
|---------|-----------------|
| Panchang widget | Users open app to check tithi/nakshatra |
| Morning reminder push | 08:00 AM IST — birthday/anniversary/event alerts |
| Festival greetings | Custom messages auto-sent on festivals |
| Stories | 24-hour expiry creates daily check-in habit |
| Upcoming festivals | 30-day calendar keeps family planning ahead |
| Post feed | New posts from family create notification pull |
| Voice commands | Elderly users engage daily via voice — no typing friction |

### 8.2 Seasonal Spikes (Natural Revenue Events)
| Season | Feature | Growth driver |
|--------|---------|---------------|
| Wedding season (Oct-Feb) | Event management | Family onboarding spike |
| Holi, Diwali, Navratri | Posts, stories, puja events | DAU spikes + viral sharing |
| New year (Jan) | Important dates setup | New family registrations |
| Family reunions (summer) | Event creation + photo uploads | Family activation |
| Raksha Bandhan, Bhai Dooj | Festival greetings | Viral sharing + new invites |

### 8.3 Retention Mechanics
- **Sunk cost:** Family photos and tree — you can't leave without losing memories
- **Network effects:** More family joins > more value > harder to leave
- **Cultural identity:** Kuldevi, sutak rules, gotra — family heritage is irreplaceable
- **Notification dependency:** Daily reminders become relied upon by family members
- **WhatsApp replacement:** Once family migrates, WhatsApp group becomes inactive

---

## 9. Key Metrics Framework

### Primary Metric: Families Connected
The family is the atomic unit of Aangan. Individual user counts are secondary.

| Metric | Definition | Target (v1.0) | Target (Year 1) |
|--------|------------|---------------|-----------------|
| **Families Connected** | Families with 3+ active members | 1,000 | 20,000 |
| **Family Activation Rate** | % of created families with 3+ members within 7 days | — | 60% |
| **Family DAF (Daily Active Families)** | Families with at least 1 post/reaction/event action per day | — | 40% of total |
| **Premium Add-on Adoption** | % of families purchasing any premium add-on (Phase 2+) | N/A | 5% |
| **Family Referral Rate** | % of families that invite at least 1 new family | — | 25% |
| **WhatsApp Invite Completion** | % of WhatsApp invites that result in app install + join | — | 15% |
| **Dadi Index** | % of families with at least 1 member aged 55+ active weekly | — | 30% |

### Vanity Metrics to Avoid
- Total downloads (meaningless without activation)
- Total users (family is the unit, not individual)
- Page views on web (engagement matters, not views)

---

## 10. Legal & Compliance

### 10.1 Data Privacy
- **DPDP Act 2023 (India):** Consent framework, data localization readiness
- **No data selling:** Business model is free app + premium add-ons — no ad targeting, no data brokers
- **Encrypted storage:** Supabase RLS + Storage policies
- **Right to deletion:** User can delete account and all data

### 10.2 Content Moderation
- Family admin can moderate content within their family
- App admin (Aangan team) can act on reports
- Audit log of all admin actions
- Block/report system for inter-family disputes

### 10.3 Minor Safety
- Age verification recommended (13+ per platform policy)
- No public profiles — all content family-scoped

### 10.4 Payment Compliance (Phase 2+)
- RBI-compliant payment gateway (Razorpay/Cashfree) — when premium add-ons launch
- Auto-generated GST invoices for premium purchases
- Transparent refund policy for one-time purchases

---

## 11. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WhatsApp launches family features | Medium | High | Deep cultural moat (panchang, kuldevi, sutak); 2-year head start; switching cost via photos/tree |
| Low premium add-on adoption | Medium | Medium | Multiple revenue streams (themes, prints, event bundles, brand partnerships) diversify risk |
| Rural connectivity issues | High | Medium | Offline-first architecture; PWA for feature phones; compressed media |
| Storage costs exceed revenue | Low | High | Aggressive compression + CDN; seed funding covers infrastructure until Phase 2 revenue |
| Data breach | Low | Critical | RLS on every table, audit logs, service role key never in app |
| Regulatory (DPDP Act) | Medium | Medium | Privacy by design from day 1; no ad model |
| Founder single point of failure | High | High | Document architecture, hire engineer post-funding |
| Temple/community partnerships slow | Medium | Medium | WhatsApp viral loop as primary growth; partnerships are additive |

---

## 12. Team & Advisors

**Kumar — Founder & CEO (ReyKan IT)**
- Full-stack product development
- Deep domain expertise: Indian family dynamics, cultural practices
- AI-assisted development velocity (Claude Code) — shipped v0.1 to v0.8 solo in 12 days
- 5 CEO Mode rounds completed — 35+ production issues resolved

**Open roles (post-funding):**
- Growth & Community Manager (Hindi-fluent, social media, temple/community partnerships)
- Senior React Native / Backend Engineer
- Village Adoption Coordinator (field ops, Hindi-fluent, rural India experience)

**Advisors sought:**
- Indian family consumer app distribution expert
- Supabase/infrastructure scaling expert
- Temple/religious community partnership specialist
- Rural India digital adoption expert

---

## 13. Milestones & Use of Funds

### Product Milestones

| Milestone | Version | Target Date | Status |
|-----------|---------|-------------|--------|
| Core product complete | v0.8 | Apr 2026 | Done |
| Google Play closed testing | v0.8 | Apr 2026 | Submitted |
| Offline + Growth + Polish | v0.9 | May 2026 | Planned |
| Production launch + 1,000 families | v1.0 | Jul 2026 | Planned |
| iOS launch + growth features | v1.1 | Sep 2026 | Planned |
| Temple partnerships + offline-first | v1.2 | Nov 2026 | Planned |

### Seed Round: Rs.2 Cr

| Milestone | Timeline | Funds Required |
|-----------|----------|---------------|
| v1.0 launch + 1,000 founding families | Month 1-3 | Rs.10L (infra + marketing) |
| 5,000 families + temple partnerships (10 temples) | Month 6 | Rs.30L (2 hires + growth) |
| App Store listings (Google, Apple, Indus) | Month 6 | Rs.15L (legal + dev accounts) |
| 50,000 families + village adoption pilot | Month 18 | Rs.1.2 Cr (full team + field ops) |
| Premium add-ons launch (Phase 2) | Month 12 | Revenue begins |

### Fund Allocation
| Category | Amount | % |
|----------|--------|---|
| Team (3 hires x 12 months) | Rs.80L | 40% |
| Marketing & Growth (WhatsApp campaigns, temple partnerships, village adoption) | Rs.60L | 30% |
| Infrastructure (Supabase, EAS, Vercel, CDN) | Rs.30L | 15% |
| Legal & Compliance (DPDP, payments, GST) | Rs.15L | 7.5% |
| Reserve | Rs.15L | 7.5% |

---

## 14. Exit Strategy

### Primary Exit: Strategic Acquisition (5-7 years)
- **Jio Platforms / Reliance:** Building super-app ecosystem; Aangan's family graph + cultural data is strategic
- **Tata Digital:** Tata Neu family services; natural cultural alignment
- **Shaadi.com / Info Edge:** Family social graph has matrimonial synergies
- **Airtel / Vodafone-Idea:** Telecom family bundle integration
- **PhonePe / Paytm:** Family payment + social layer for UPI ecosystem

### Secondary Exit: IPO (8-10 years)
- If 5M+ active families achieved, standalone consumer tech IPO viable
- Benchmark: ShareChat (valued $5B at 160M users) — Aangan has deeper engagement per family unit

### Target valuation at exit: Rs.500 Cr - Rs.2,000 Cr (based on 5-7x ARR multiple)

---

## 15. Why Now?

1. **WhatsApp fatigue is real:** Families are drowning in group spam — the market is ready for a structured alternative
2. **UPI makes micro-payments frictionless:** When premium add-ons launch, payment infrastructure is ready
3. **Jio brought rural India online:** 500M new users need apps designed for them, not Silicon Valley adaptations
4. **AI enables solo founders:** Claude Code allowed one person to build in 12 days what would take a 5-person team 6 months
5. **Cultural moment:** Post-Covid, families want to stay connected; India's digital heritage is being lost as elders age
6. **No one is building this:** Despite 300M families, no product serves the Indian family with cultural depth

**Aangan is not competing for attention. It is building the digital home every Indian family deserves.**

---

*For technical specifications, see AANGAN_PRD.md. For investor presentation, see AANGAN_PITCH_DECK.md.*
