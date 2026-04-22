# OTP Fix — Supabase Dashboard test phone numbers

> Diagnosed 2026-04-22 in CEO Mode end-to-end test.
>
> **TL;DR:** Kumar added `+919886110312` to Supabase Dashboard → Auth → Phone → Test phone numbers (so Indus reviewer flow works). The **other 3 reviewer phones are missing** from the same map. They're declared in `supabase/config.toml`, but config.toml is local-only — prod Supabase uses Dashboard.

---

## Symptom

- Reviewer phone `9886110312` + OTP `123456` → works ✓
- Reviewer phones `9886146312` / `9000000001` / `9000000002` → Supabase `/auth/v1/otp` returns `{}` (empty), verify with the documented OTP returns `403 {"code":"otp_expired","message":"Token has expired or is invalid"}`.

That 403 means Supabase didn't short-circuit via test_otp — it went to the normal SMS path and generated its own random OTP. Since MSG91 delivery is still blocked by pending DLT re-review, no SMS arrives, and the documented fixed OTP fails to match.

---

## The 2-minute fix

1. Open Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Phone**
2. Scroll to **Test phone numbers** section
3. Add **exactly** these 3 rows (alongside the existing `+919886110312 → 123456`):

| Phone number | OTP |
|---|---|
| `+919000000001` | `654321` |
| `+919000000002` | `246810` |
| `+919886146312` | `111222` |

4. Click **Save**
5. Wait ~10 seconds for config to propagate

**Format matters:**
- Phone must be in full E.164 form — `+91` prefix, no spaces or dashes.
- OTP must be exactly 6 digits.

---

## Verify after save

In any browser on [aangan.app/login](https://aangan.app/login):

| Phone | OTP | Expected |
|---|---|---|
| 9886110312 | 123456 | /profile-setup or /feed |
| 9886146312 | 111222 | /profile-setup or /feed |
| 9000000001 | 654321 | /profile-setup or /feed |
| 9000000002 | 246810 | /profile-setup or /feed |

All four should land on /profile-setup (for first-time login) or /feed (returning user) without seeing the "गलत OTP है" error.

---

## Why config.toml isn't enough

`supabase/config.toml` is **only applied when you run `supabase start` locally**. It does NOT push settings to the production Supabase project. Every change to `auth.sms.test_otp` in config.toml must be manually mirrored in the production Dashboard.

This is a Supabase limitation (no config push from CLI to cloud), not a bug in our code.

---

## Real-user OTP (non-reviewer phones)

Still blocked on Vi DLT template re-review. 5 templates Pending (including OTP as Transactional), 1 approved (Event Reminder 24h). Once Vi approves the OTP template:
1. Set `supabase secrets set MSG91_TEMPLATE_OTP=1107177660181979501`
2. Real-user OTPs via MSG91 start flowing

Until then, real users on non-reviewer phones will get stuck on /otp with no SMS arriving. The reviewer test_otp map is the only working path.

---

*Diagnosed [9:25am - 22Apr26] · Aangan v0.9.14 · Kumar to apply Supabase Dashboard change*
