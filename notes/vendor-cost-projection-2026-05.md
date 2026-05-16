# Aangan — Third-Party Software Cost Projection

**Status:** Living document. Re-review quarterly. Last updated: [6:14pm - 16May26]
**Owner:** Kumar / ReyKan IT.

> **Purpose:** Forecast Aangan's third-party software (SaaS, cloud, vendor) costs across
> growth scales so we (a) know which vendors to migrate away from at which thresholds,
> (b) keep total third-party software cost under 15% of revenue at every scale,
> (c) avoid the "we discovered the AWS bill late" trap that kills many India-scale apps.

---

## Usage assumptions (family-network economics)

Family apps are read-heavy, write-light, photo-heavy, OTP-light. Different curve from fintech.

| Metric | per MAU/mo | At 10M MAU/mo | At 100M MAU/mo |
|---|---|---|---|
| Sessions | 10 | 100M | 1B |
| API calls / DB queries | 300 | 3B | 30B |
| Posts / comments / events | 3 | 30M | 300M |
| Photos uploaded (~500KB after compression) | 5 | 25 TB new/mo | 250 TB new/mo |
| Errors generated (well-built app) | 0.2 | 2M | 20M |
| OTPs needed (signup + re-verify + device switch) | 0.1 | 1M | 10M |
| Push notifications sent | ~50 | 500M | 5B |

These are the load drivers. Most vendor costs scale with one of these lines.

---

## Annual cost by vendor and scale

| # | Vendor | Today (~100 families) | At 10M MAU | At 100M MAU | Trend |
|---|---|---|---|---|---|
| 1 | **Supabase** (DB + Auth + Realtime + Edge Functions) | ₹25K | **₹3-7 Cr** | **₹15-30 Cr** | Egress-dominated. Self-host at 50M+ MAU. |
| 2 | **Vercel** (web hosting) | ₹0 | **₹4-10 Cr** | **₹15-30 Cr** | Bandwidth-killing. Migrate to Cloudflare Pages at 50M+. |
| 3 | **B2 + Cloudflare CDN** (media) | ₹6K | **₹15-30 L** | **₹2-4 Cr** | Scales beautifully. Cheapest stack possible. |
| 4 | **MSG91 SMS OTP** | ₹10K | **₹2-4 Cr** | **₹15-25 Cr** | Linear, negotiable. Hybrid w/ Truecaller drops 50-60%. |
| 5 | **Twilio SMS fallback** | ₹4K | **₹20-40 L** | **₹2-4 Cr** | Linear; same as MSG91. |
| 6 | **WhatsApp Business API** (if heavily used) | ₹0 | **₹15-20 Cr** | **₹100-150 Cr** | ⚠️ **CATASTROPHIC at scale.** Cap WhatsApp use; reserve for high-value moments. |
| 7 | **Apple Developer Program** | ₹8K | ₹8K | ₹8K | Flat. |
| 8 | **Google Play** | ₹2K amortized | ₹2K amortized | ₹2K amortized | Flat (one-time fee). |
| 9 | **Sentry** (crash reporting) | ₹0 (free tier) | **₹2-5 Cr** | **₹20-50 Cr** | Migrate to Praharee/GlitchTip self-host at 50M+. Half-day swap via `analytics.ts`. |
| 10 | **EAS / Expo** (RN builds) | ₹3-25K | **₹1 L** | **₹1 L** | Flat. |
| 11 | **Zoho Mail / Workspace** | ₹0 | **₹4-10 L** | **₹15-30 L** | Scales with team, not users. |
| 12 | **Domain registrar** | ₹3K | ₹10K | ₹25K | Flat-ish. |
| 13 | **Truecaller silent verification** (if adopted) | — | **₹2.5-5 Cr** | **₹20-40 Cr** | Reduces SMS OTP costs by 50-60% net. |
| 14 | **Razorpay** (when added — pass-through) | ₹0 | **negligible** | **negligible** | ~2% of GMV, recovered. |
| 15 | **Push notifications** (Expo Push / FCM) | ₹0 | ₹0 | ₹0 | Free at all scales. |
| 16 | **Status page** (BetterUptime) | ₹0 | **₹1-3 L** | **₹5-10 L** | Required at SLA-bearing scale. |
| 17 | **GitHub Team / Enterprise** | ₹0 | **₹4-10 L** | **₹30-50 L** | Scales with team. |
| 18 | **Observability stack** (Datadog, Grafana Cloud) | ₹0 | **₹20-50 L** | **₹3-8 Cr** | Many self-host (Prometheus + Grafana). |
| 19 | **Compliance audits** (SOC 2 + ISO 27001) | ₹0 | **₹25-30 L/yr** (after one-time setup) | **₹50L-1 Cr/yr** | Indian enterprise gate. |
| 20 | **DPO + legal + insurance + accounting** | ₹0 | **₹30-50 L** | **₹2-5 Cr** | Required at enterprise / SDF scale. |

---

## Annual totals

| Scale | Low estimate | High estimate | % of likely revenue |
|---|---|---|---|
| Today (~100 families) | ₹50K | ₹1 L | — (pre-revenue) |
| 10K MAU | ₹3 L | ₹6 L | 20-50% |
| 100K MAU | ₹15 L | ₹30 L | 15-30% |
| 1M MAU | ₹1-2 Cr | ₹3-5 Cr | 20-30% |
| **10M MAU** | **₹8-12 Cr** | **₹20-30 Cr** | **8-30%** |
| **100M MAU** | **₹35-60 Cr** | **₹100-150 Cr** | **9-15%** |

Industry rule: third-party software should be **<15% of revenue**. Aangan economics work at scale only with aggressive vendor management starting at 1M MAU.

---

## Vendors that break economically — migration triggers

| Vendor | Breakage MAU | Cause | Migration target |
|---|---|---|---|
| 🔴 WhatsApp Business (if heavily used) | 5M+ | Per-message pricing × billions | Avoid the line item; use sparingly |
| 🔴 Vercel | 50M+ | Bandwidth cost | Cloudflare Pages or self-host |
| 🟡 Sentry | 50-100M | Per-event cost | Praharee.com / GlitchTip self-host (Mumbai) |
| 🟡 Supabase | 50M+ | Compute + egress | Self-hosted PostgreSQL on AWS |
| 🟢 B2 + CF CDN | Never within plausible scale | — | None |
| 🟢 Apple / Google Play / EAS | Never | Flat-priced | None |
| 🟢 MSG91 | Never (negotiates at scale) | Linear, negotiable | Optional Indian competitors for redundancy |

---

## Vendors that scale beautifully — keep forever

- **B2 + Cloudflare CDN** — cheapest media storage architecture possible
- **Apple Developer / Google Play / EAS** — flat pricing, no scale penalty
- **Expo Push / FCM** — free at all scales

These shouldn't be touched. They're the bedrock.

---

## What we already avoided (smart decisions)

Vendor choices made early that compound favorably:

| Choice | Savings at 10M MAU |
|---|---|
| ✅ Supabase Auth + MSG91 instead of Firebase Auth | **₹10-30 Cr/yr** — Firebase Auth's MAU charge becomes catastrophic above 100K MAU |
| ✅ B2 + Cloudflare instead of Supabase Storage for media | **₹2-5 Cr/yr** — Supabase egress >> B2 + free CF |
| ✅ Sentry SDK protocol (abstracted via `analytics.ts`) | Half-day migration cost when triggered |
| ✅ Postgres data model (portable) | Migration to self-hosted Postgres is feasible at scale |

---

## Hidden costs that surprise at scale

Items often forgotten in budgets:

1. **SOC 2 Type II** — ₹15L one-time + ₹5L/yr recurring
2. **ISO 27001** — ₹10L one-time + ₹3L/yr recurring
3. **DPO salary** (DPDP-required for SDFs) — ₹20-40L/yr
4. **Cyber insurance** (₹5-10 Cr coverage) — ₹3-10L/yr
5. **Annual pen-test** — ₹3-5L per engagement
6. **Legal retainer** (vendor contracts, IP, regulatory) — ₹5-15L/yr
7. **Accounting + GST + statutory filings** — ₹2-5L/yr
8. **EAS Build burn rate at scale** — already on $99/mo, low ceiling
9. **Edge Function cold starts at scale** — may need provisioned warm pool

These aren't "third-party software" line-items but are the **ops tax** on running scaled SaaS infrastructure.

---

## Quarterly review checklist

Run this every Jan 1, Apr 1, Jul 1, Oct 1:

- [ ] Pull actual bills for last 90 days from each vendor dashboard
- [ ] Compare to forecast at current MAU
- [ ] Flag any vendor >20% over forecast
- [ ] Update `VENDOR_HEALTH.md` (to be created — scoring per the 10-point framework)
- [ ] Re-check the migration triggers — anything near threshold?
- [ ] Revisit hidden-costs list (compliance, legal, insurance) for adds
- [ ] Update this file with new scale row if MAU crossed a milestone

---

## Decisions made and parked

| Decision | Status | When triggered |
|---|---|---|
| Stay with Sentry; migrate to Praharee | Default | At 100K MAU OR DPDP enforcement OR price hike >50% OR Praharee matures |
| Defer Razorpay integration | Indefinite | Kumar pivoting to free + ad-revenue model |
| Defer Firebase Auth migration | Indefinite | Not switching — would cost ₹10-30 Cr/yr at 10M MAU |
| Plan WhatsApp Business sparingly | Active | Use only for high-value moments, not bulk broadcasts |
| Build for self-hosted PostgreSQL migration path at 50M MAU | Architectural commitment | Use portable schema; avoid Supabase-specific functions |

---

**Bottom line for Kumar:** the stack you chose today (Supabase + MSG91 + B2/CF + Sentry/Praharee path + Vercel) is **well-aligned** for the 10M MAU horizon. The biggest risk in front of you is WhatsApp Business if you build daily-panchang as a WhatsApp delivery for all users — that single line item could 10× your total third-party bill. Use WhatsApp only as a high-value channel; SMS + email + push for bulk.
