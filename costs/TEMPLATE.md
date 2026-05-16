# Aangan Monthly Burn — YYYY-MM

> Filled by Kumar from each provider's billing dashboard. Numbers in **INR**.
> Mark estimates as `~₹X` and committed actuals as `₹X (invoice attached)`.

## Headline

| | Value |
|---|---|
| Total burn this month | ₹__,___ |
| vs. last month | +/− __% |
| Active users (MAU) | ___ |
| Cost per active user | ₹__ |
| SMS sent (MSG91 + Twilio) | ___ |
| Cost per SMS (blended) | ₹__ |
| Cost per signup | ₹__ |

## Line items

| Service | Plan | Actual | Notes |
|---|---|---|---|
| Supabase | Pro $25 | ₹2,___ | DB size __GB / 8GB, egress __GB |
| EAS Build (Expo) | $29 prod | ₹2,___ | __ Android / __ iOS builds this month |
| MSG91 SMS OTP | DLT | ₹___ | __ OTPs sent, __% delivered, ₹__ per SMS |
| Twilio SMS fallback | PAYG | ₹___ | Used for non-IN / Vi-fallback |
| Vercel | Hobby | ₹0 | Bandwidth __GB / 100GB free |
| Cloudflare CDN | Free | ₹0 | Requests: ___ M |
| B2 storage | PAYG | ₹___ | __ GB stored, egress free via CF |
| Sentry | Free dev | ₹0 | __K events / 5K monthly |
| Zoho Mail | Free | ₹0 | support@ + info@ + kumar@ |
| Domain (aangan.app) | NameSilo annual | ₹100 (amortized) | renews on YYYY-MM-DD |
| Apple Developer | $99/yr | ₹686 (amortized) | renews YYYY-MM-DD |
| Google Play | $25 one-time | ₹172 (amortized) | over 12 months |
| Indus App Store | Free | ₹0 | |
| **Total** | | **₹__,___** | |

## Variance from last month

| Line item | Δ vs prior month | Explanation |
|---|---|---|
| | | |

## Action items

- [ ] If any line is 2× prior month → investigate
- [ ] If SMS-per-signup > 3 → tighten OTP rate limits
- [ ] If Supabase egress > 50 GB → media migration to B2 + CF

## Source dashboards (pull these for next month)

- MSG91: https://control.msg91.com → Billing → Invoices
- Supabase: https://supabase.com/dashboard/project/<id>/settings/billing
- EAS: https://expo.dev/accounts/<account>/settings/billing
- Vercel: https://vercel.com/<team>/<project>/settings/billing
- B2: https://secure.backblaze.com/b2_buckets.htm → Usage
- Apple: https://developer.apple.com/account → Membership
- Google: https://play.google.com/console → Setup → Developer account
