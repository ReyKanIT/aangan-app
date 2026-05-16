# costs/ — Aangan monthly burn paper trail

Per CFO Review (CEO Review 2026-05-08, 90d strategic bet):
> Without this, the seed deck's burn numbers are unverifiable to any due-diligence investor.

## Structure

```
costs/
├── README.md            ← this file
├── TEMPLATE.md          ← copy this each month
├── 2026-05.md           ← May 2026 (Kumar to populate from MSG91 + Supabase + EAS dashboards)
├── 2026-06.md           ← June (next month)
└── invoices/            ← optional: PDF/screenshot dumps of monthly invoices
    └── 2026-05/
        ├── msg91-may2026.pdf
        ├── supabase-may2026.pdf
        └── eas-may2026.pdf
```

## Why this exists

1. **Investor due diligence** — Rs.2 Cr seed needs verifiable burn. Pitch deck numbers without invoice backup look like fantasy.
2. **Trend visibility** — month-over-month comparison surfaces creeping cost (Supabase storage egress, SMS retry storms, EAS quota overages).
3. **Audit trail for GST** — once Razorpay/event-bundles launch, GST returns need expense receipts.
4. **Stops surprises** — the v0.14 MSG91 burn was unknown until this folder existed.

## Workflow (5 min per month)

1. First Friday of each month: open `TEMPLATE.md`, copy to `YYYY-MM.md`.
2. Pull dashboards from:
   - MSG91 → https://control.msg91.com → Billing → Invoices
   - Supabase → https://supabase.com/dashboard/project/<id>/settings/billing
   - EAS → https://expo.dev/accounts/<account>/settings/billing
   - Vercel → https://vercel.com/<team>/<project>/settings/billing
   - B2 → https://secure.backblaze.com/b2_buckets.htm → Usage
   - Apple/Google amortized: $99 + $25 / 12 → ₹686 + ₹172 monthly
3. Fill in actuals, commit to git.
4. (Optional) Dump invoice PDFs into `invoices/YYYY-MM/` — these are gitignored by default to avoid bloating the repo with binary blobs; track them in a private cloud folder if needed.

## What to flag

- **Any line item > 2× last month** without a feature explanation → investigate
- **MSG91 SMS-per-signup ratio > 3** → fraud / retry-storm; tighten rate limits
- **Supabase egress > 50 GB/month** → media on hot path; migrate to B2 + CF
- **EAS quota exhausted** → batch releases harder, downgrade to manual `expo run:android` for dev
