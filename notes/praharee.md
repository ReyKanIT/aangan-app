# Praharee — strategic viability research

**Status:** Parked. Pick up after Aangan launch and stabilization.
**Last reviewed:** [3:24pm - 16May26]
**Owner:** Kumar (ReyKan IT) — second venture, distinct from Aangan.

> **Working pitch in one line:** *Praharee is Sentry for India — every crash and error captured, stored exclusively in Mumbai (DPDP-compliant), priced in INR, with WhatsApp alerts and Hindi documentation.*

---

## Why this idea, why now

The Indian DPDP Act (Digital Personal Data Protection Act, 2023, in force from 2024-25) is steadily tightening data-residency expectations, especially for entities classified as **Significant Data Fiduciaries (SDFs)**. The Indian government has signalled additional localization mandates for "sensitive" categories. Family / health / fintech data is in the path.

**Sentry, Bugsnag, Rollbar, Crashlytics, Datadog, NewRelic, Embrace** — every major hosted crash-reporting service stores data in US or EU. None has an Indian region today (May 2026). That gap is unlikely to be closed by the global players within 12-18 months even if they choose to — opening certified Indian data-residency regions is slow (ask Salesforce, took them 3 years).

**The structural opportunity:** Indian SaaS startups, fintechs (RBI compliance), healthtech (DPDP sensitive category), and any SDF have a regulatory reason to prefer an Indian alternative. Most don't have one. Bigger, mature foreign competitors take 18+ months to localize. That's the window.

---

## Name: Praharee (प्रहरी)

**Sanskrit-Hindi meaning:** sentry, one on watch, watchman on duty.

Exact semantic equivalent of "Sentry" — a soldier at the gate of your application.

### Domain availability (checked 2026-05-16 via WHOIS + DNS)

| Domain | Status (NS record / WHOIS) |
|---|---|
| **praharee.com** | ✅ **SECURED by Kumar 2026-05-16, 3:30pm IST** — primary brand domain |
| **praharee.in** | NS: NONE · WHOIS: active TLD, no registration found → **likely available** |
| **praharee.io** | NS: NONE · WHOIS: "Domain not found" → **available** |
| **praharee.dev** | NS: NONE · WHOIS: no registration → **likely available** |
| **praharee.ai** | NS: NONE · WHOIS: "Domain not found" → **available** |
| **praharee.app** | NS: NONE · no registration → **likely available** |
| **praharee.tech** | NS: NONE · no registration → **likely available** |
| **praharee.co.in** | NS: NONE · no registration → **likely available** |
| **praharee.org** | NS: NONE · WHOIS: "Domain not found" → **available** |
| **praharee.net** | NS: NONE · WHOIS: "No match" → **available** |

**Recommended acquisition order** (when project formally starts):
1. `praharee.com` — primary brand domain (~₹900/yr at NameSilo/GoDaddy)
2. `praharee.in` — India market identity (~₹650/yr at BigRock/GoDaddy.in)
3. `praharee.dev` — dev-tool positioning (~₹1,400/yr at Google Domains)
4. `praharee.io` — defensive (~₹3,000/yr)
5. `praharee.ai` — defensive (~₹15,000/yr — pricey but worth it given AI adjacency)

> **Verify just-in-time:** WHOIS data is up to 24 hours stale. Before purchase, run final check on `instantdomainsearch.com` or directly at GoDaddy/NameSilo. Budget ₹20,000 for all 5 TLDs first year. If `praharee.com` is no longer available at acquisition time, fall back to `praharee.in` as primary brand.

### Trademark conflict analysis

Web search (May 2026) for "Praharee" reveals:

| Existing use | Class | Conflict? |
|---|---|---|
| **Pashudhan Praharee** (`pashudhanpraharee.com`) — livestock-husbandry magazine | Class 16 (printed matter) / 35 (animal-husbandry information services) | **No conflict** — different class, different industry |
| **Prahari** (BSF / Border Security Force app, single-R single-I spelling) | Government use, not commercially trademarked | **No conflict** — distinct spelling, defense vs software |
| **Pehredar** (abandoned Punjabi newspaper app, Newsgroup Clients app) | Class 9 (mobile apps) | **Low risk** — different spelling + dormant + different industry |

**Recommendation:** File Class 42 (Technology & Software Services) trademark for "**Praharee**" + Devanagari mark "**प्रहरी**" in India via [trademarkia.in](https://www.trademarkia.in) or [legalwiz.in](https://www.legalwiz.in) as soon as project formally commences. Cost: ~₹9,000 per class + government fee. WIPO international filing (Madrid Protocol) later when revenue justifies (~₹70,000 for US + EU + UK).

---

## Product positioning

| | Sentry (hosted) | Praharee |
|---|---|---|
| **Data residency** | US / EU | **India (Mumbai, ap-south-1)** |
| **Pricing currency** | USD | **INR with GST invoicing** |
| **Payments** | Stripe (foreign exchange + bank charges) | **Razorpay (UPI / NetBanking / cards)** |
| **Alert channels** | Slack / email / PagerDuty | **WhatsApp Business + Slack + email** (most Indian dev teams use WhatsApp) |
| **Documentation language** | English | **Hindi + English** |
| **Support hours** | US/EU timezone | **IST 09:00–21:00** |
| **DPDP compliance** | Customer responsibility | **Built-in: PII auto-redaction (Aadhaar / PAN / phone / email), DPDP retention reports** |
| **Indian carrier metadata** | None | **Show Jio/Airtel/Vi when crash from Indian SIM** (huge for OTP / telco-dependent flows) |
| **BYOK** | Enterprise tier only | **All paid tiers** (HashiCorp Vault Indian region) |
| **SDK quality** | Industry-leading | **Forked from Sentry's BSD-licensed SDKs** — same quality from day 1 |
| **Self-host option** | Sentry self-host (heavy: Postgres + Redis + Kafka + ClickHouse) | **Lightweight self-host via GlitchTip compat** |

**The moat is regulatory + relational, not technical.** Sentry's technical edge can be matched in 12-18 months (their SDKs are open-source). Their UX is a 12-year iteration moat. The features Sentry **can't** replicate quickly are the India-specific ones: DPDP-native, WhatsApp alerts, INR billing, Hindi docs, IST support.

---

## Engineering scope — Sentry-quality bar

### Tier 1: Must-have for launch (6-9 months, team of 4-6)

| Component | Approach | Effort |
|---|---|---|
| Event ingestion API | Kafka or Redis Streams; target 1k events/sec at launch | 6 weeks |
| SDKs: JS web + React Native + iOS native | Fork from `getsentry/sentry-javascript` and `getsentry/sentry-react-native` (BSD-3-Clause). Rebrand. Re-point endpoint. | 8 weeks |
| Source-map symbolication | Self-host Sentry's open-source `symbolicator` (Apache 2.0, Rust) | 3 weeks |
| Issue grouping / fingerprinting | Hash top-N stack frames. ~85% as good as Sentry's at launch. | 2 weeks |
| Event storage | **v1:** Postgres + partitioning. **v2 at 10M events/mo:** ClickHouse or Snuba. | 3 weeks |
| Search + filter | Postgres GIN indexes on tags, JSONB on stack fingerprint. ElasticSearch in v2. | 2 weeks |
| Dashboard (web app) | Next.js from scratch — don't fork Sentry's Django+React frontend (1M LOC) | 12 weeks |
| Auth + multi-tenancy | Supabase auth for v1 (Indian region) | 2 weeks |
| Alert rules engine | Cron-driven scan + webhook fanout (Slack / WhatsApp / email) | 3 weeks |
| GST + Razorpay billing | Razorpay subscription API + GST invoice templates | 3 weeks |
| Status page | BetterUptime / Statuspage hosted | 1 day |

**Subtotal:** ~30 person-weeks engineering, plus design + ops + product. Realistic with 4-6 FTE in 6-9 months.

### Tier 2: Competitive parity (months 10-18)

- Performance monitoring (transactions / traces)
- Release health (commits → releases → crashes correlated)
- Custom dashboards + saved searches
- GitHub / Jira / Linear / Slack integrations (full set)
- Native crash collection (Android NDK, iOS PLCrashReporter)
- Source-map upload CLI (`praharee-cli upload-sourcemaps`)
- Self-hosted enterprise edition (Docker Compose + Helm)

### Tier 3: The moat features (year 2-3)

- Session replay (heavy R&D — Rrweb or similar; storage-intensive)
- Backend SDKs: Python, Node, Java, Go, .NET, Ruby, PHP (8 SDKs)
- AI-assisted root cause analysis (hot research area; potential differentiator)
- Distributed tracing (OpenTelemetry compatible)

---

## Operational quality — where most "clone" projects die

Sentry quality isn't just engineering. It's operational. To be trusted with someone's crash data:

| Requirement | Year-1 cost (estimate, INR) |
|---|---|
| 24/7 on-call rotation (2 engineers on rotation) | ₹50L |
| 99.95% uptime SLA infra premium (multi-AZ Mumbai + standby) | ₹15L |
| Status page (BetterUptime / Statuspage) | ₹50K |
| **SOC 2 Type II** (within 18 mo of paid customers — Indian enterprise gate) | ₹15L one-time + ₹5L/yr |
| **ISO 27001** (Indian enterprise gate) | ₹10L one-time + ₹3L/yr |
| **DPO** (Data Protection Officer — required under DPDP for SDF) | ₹15L/yr |
| Cyber liability insurance (₹5 Cr coverage) | ₹3L/yr |
| Backup + cross-AZ disaster recovery (Mumbai) | ₹5L/yr infra premium |

**This is the part competitors keep underestimating.** Engineering builds the product; ops builds the trust.

### Sentry-quality measurable bar

| Quality dimension | Sentry today | Praharee launch target |
|---|---|---|
| Event-to-dashboard latency | < 30 sec | < 60 sec |
| Ingestion uptime | 99.95% | 99.95% (non-negotiable) |
| Issue grouping accuracy | ~95% | > 85% (good enough at launch) |
| SDK overhead | < 5 KB minified | < 10 KB |
| SDK reliability (own crashes / M events) | < 1 ppm | < 10 ppm |
| First-crash-to-fix loop (P50) | 4 hours | 8 hours |
| Free tier | 5K events/month | 5K events/month (match, don't undercut) |
| Search query P95 | < 500 ms | < 1 s |
| Source-map symbolication success | > 98% | > 95% |

**Reachable with focused 6-engineer team over 18 months.** Uptime is the hardest — every minute of ingest downtime erodes trust that takes weeks to rebuild.

---

## Team + capital

### MVP (months 1-9, target: 50 free-tier customers, 5 paying)

- 1 founder / CEO (Kumar)
- 2 backend engineers (Go or Rust for ingestion; Python for processing)
- 1 frontend engineer (Next.js)
- 1 SDK engineer (JS + RN + iOS)
- 1 designer (part-time / contractor)

**5-6 FTE · ~₹2-3 Cr total ($240K-$360K)** assuming Bangalore engineering salaries.

### v1 launch (months 10-18, target: 500 paying customers)

- Add: 2 more engineers, 1 sales, 1 customer-success

**9-10 FTE · ~₹8-10 Cr total ($1M+).**

### Funding ladder

| Round | Amount | Milestone | Use |
|---|---|---|---|
| Pre-seed | $200-300K | MVP + 50 free customers | Friends-family-fools or angel |
| **Seed** | **$1-1.5M** | Public launch + 500 paying customers | Indian VCs (Blume, Stellaris, Multiples, India Quotient) interested in B2B SaaS with regulatory tailwind |
| Series A | $4-6M | 5,000 paying customers + first enterprise contracts | Lightspeed India, Sequoia, Accel — once SOC 2 lands |

---

## Realistic 24-month roadmap

| Quarter | Focus | Customers |
|---|---|---|
| **Q1 (months 1-3)** | Entity setup (Pvt Ltd). GSTIN. Razorpay. Trademark filings (Praharee + प्रहरी, Class 42). Fork GlitchTip / Sentry SDKs. Single-tenant Mumbai deploy. JS web SDK end-to-end. **Aangan as first dogfood customer.** | 1 (Aangan) |
| **Q2 (months 4-6)** | React Native SDK + iOS native SDK. Multi-tenant org/project model. Free tier signup flow. Razorpay billing. Closed beta with 10 Indian startups. | 10 |
| **Q3 (months 7-9)** | Android native SDK. Source-map upload + symbolication. Slack + WhatsApp alert integrations. DPDP compliance dashboard. **Open beta launch.** | 50 paying |
| **Q4 (months 10-12)** | Performance monitoring (basic transactions). Release health. **Public launch.** NASSCOM / IndiaFOSS / FOSS United sponsorships. | 500 paying |
| **Year 2** | iOS dSYM pipeline. JVM debug info. Session replay (heavy R&D). Backend SDKs (Python, Node, Java, Go). Indian enterprise sales push. SOC 2 Type II. ISO 27001. Multi-region failover (Mumbai + Hyderabad). | 5,000 paying + 50 enterprise |

---

## Honest risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Sentry announces ap-south-1 region** | Medium-high (12-24 month horizon, especially if Indian regulator forces it) | Lean harder on INR pricing, WhatsApp alerts, Hindi docs — features Sentry won't localize fast |
| **Indian devs prefer global tools for status signal** | Medium | Bottom-up: target Tier-2/3 startups + regulated fintech first; let enterprise pull follow regulator pressure |
| **GlitchTip / OSS erodes pricing power** | Medium | OSS is a feature not a threat — most companies don't want to self-host. Praharee's value is "hosted in India with INR billing + WhatsApp alerts." |
| **Crashlytics is free + Google-default for Android** | High | Position as DPDP-compliant alternative. Crashlytics' data residency is opaque (Google services). Fintechs are leaving Crashlytics already. |
| **Mobile SDK quality is hard; one bad release loses 3 months of trust** | High | Fork Sentry's BSD-licensed SDKs as base. Never write from scratch. Extensive real-Indian-device test fleet. |
| **Ingestion outage = "Praharee was down when my app crashed"** | High | Architectural: multi-AZ ingest, never drop events on disk-full, retry queue in SDK, status page transparency |
| **Senior Rust/Go infra eng hiring in India is expensive** | Medium | Hire Bangalore-based ex-Razorpay / Flipkart / Swiggy infra engineers. Salary band ₹50L-1.2 Cr per senior. |

---

## Aangan as Praharee v0 — the practical bootstrap

Today's plan for Aangan crash reporting (Option 1 — DIY Supabase Mumbai):
- One Supabase migration (`crash_log` table)
- One edge function (`log-crash` ingestion endpoint)
- Replace `analytics.ts` Sentry calls with `fetch('/functions/log-crash')`
- Admin viewer at `aangan_web/src/app/(admin)/crashes/page.tsx`

**This IS Praharee v0.** When Praharee formally spins out:
- Aangan becomes the first dogfood customer (proven 6+ months in production)
- The DIY logger code becomes the v1 ingestion backbone
- "Aangan has been monitored by Praharee since May 2026" — first credibility data point in the pitch deck
- Migration from Aangan's internal logger to Praharee's multi-tenant system is a 2-day re-architecture (extract org/project layer, no other changes)

This is the cheapest possible path to validate the Praharee idea: build the minimum for one real customer (Aangan), run it for 6 months, then decide based on:

| Question | Decision |
|---|---|
| Did Sentry announce ap-south-1? | If yes → re-evaluate Praharee's market window |
| Did DPDP enforcement actually bite (fines, public actions)? | If yes → urgent commercial demand |
| Do you have a co-founder for Praharee? | **Necessary** — running both Aangan + Praharee is two CEO jobs |
| Did Aangan reach product-market fit? | Yes → spin out Praharee · No → keep DIY logger as Aangan-only tool |

---

## Action items (parked until Aangan stable)

When the project formally restarts:

- [x] **`praharee.com` acquired** [3:30pm - 16May26]
- [ ] Acquire defensive TLDs: `praharee.in`, `praharee.dev`, `praharee.ai`, `praharee.app` — budget ₹15-20K first year (.com already locked)
- [ ] File Class 42 trademark for "Praharee" + "प्रहरी" in India (~₹9K + govt fee)
- [ ] Co-founder conversations: technical co-founder essential (you can't be CEO of Aangan + CTO of Praharee)
- [ ] Incorporate as Pvt Ltd (separate from ReyKan IT — keeps cap tables clean for Praharee's investors)
- [ ] Pre-seed conversations: target Indian B2B SaaS angels (Kunal Shah, Pranay Chulet, ex-Razorpay leadership)
- [ ] Lift the Aangan crash-log code into a `praharee-core` repo with org/project multi-tenancy

---

**Last updated:** 2026-05-16. Re-review every 6 months until Praharee formally starts.
