# Apple Review Demo Account — Runbook

When you submit Aangan to Apple App Review (and again for Google Play Review),
the reviewer needs a working sign-in. Phone OTP is hostile to reviewers —
their carrier may not be in India, they can't receive Indian SMS, and the
reviewer is a stranger to your MSG91 DLT chain.

**Solution:** a pre-registered reviewer phone + fixed OTP. No real SMS sent,
no MSG91 spend, no DLT risk. Reviewer enters the test phone + the fixed OTP,
Supabase Auth accepts it, and the reviewer is in.

---

## Pre-arranged credentials (do not commit real values to git)

| Field | Value used during last review | Status |
|---|---|---|
| Phone (E.164) | `+91 99999 99999` (or any unused 10-digit Indian mobile) | placeholder — Kumar to choose |
| OTP (6-digit) | `123456` | placeholder — Kumar to choose |
| Country code | India (+91) | |

Pick whatever number you want, but it must:
- be in E.164 (`+91XXXXXXXXXX`)
- NOT be an actual Indian mobile that could receive SMS
- NOT collide with a real user already in `auth.users`
- be memorable enough to type into ASC

`+91 99999 99999` is conventional for reviewer accounts because no SIM uses it.

---

## Setup — three places, all must match

### 1. Supabase Dashboard (authoritative for verify)

1. Open https://supabase.com/dashboard/project/<your-project>/auth/providers
2. Scroll to **Phone** → **Test phone numbers**
3. Click **+ Add test phone number**
4. Phone: `+919999999999`  ·  OTP: `123456`
5. Save

This makes `supabase.auth.verifyOtp({ phone, token: '123456', type: 'sms' })`
succeed for that phone without calling MSG91.

### 2. Edge Function env (skips the MSG91 outbound call)

1. Open https://supabase.com/dashboard/project/<your-project>/functions/secrets
2. Add/update secret: `REVIEWER_PHONES_E164` = `919999999999`
   (comma-separate if multiple, no `+` prefix, no spaces)
3. Save & redeploy `send-otp-sms` function (Supabase does this automatically
   on secret change, but verify in **Functions → send-otp-sms → Logs**)

This makes the `sendOtp` step return 200 immediately for the reviewer phone,
without an MSG91 outbound call (no DLT spend, no risk of carrier drop).

### 3. App Store Connect (Apple sees this)

1. ASC → My Apps → Aangan → App Information → App Review Information
2. Sign-In Required: **Yes**
3. User name: `+91 99999 99999`
4. Password: `123456`  *(Apple's form labels it "Password", but for OTP apps
   you put the fixed OTP here — they enter it as the SMS code.)*
5. Notes (optional but recommended):

> Aangan uses phone OTP only — no email/password. The pre-registered test
> phone +91 99999 99999 is wired to a fixed 6-digit OTP (123456). On the
> login screen, enter the phone, tap "Send OTP", then enter 123456 on the
> next screen. No real SMS is sent. After login, the demo family has 8
> members, 5 posts, and 2 upcoming events for review.

### 4. Google Play Console (parallel for Play Review)

Same approach: Play Console → App content → App access → **All or some
functionality is restricted** → enter phone + OTP + same notes.

---

## Test it before submitting

On the live app (or TestFlight build):
1. Enter `+91 99999 99999`
2. Tap "Send OTP" — should immediately advance to OTP entry without an
   SMS being sent
3. Enter `123456`
4. Verify you're logged in as the demo account

If step 2 takes > 3 seconds, MSG91 was called — the env var didn't propagate.
Check Supabase function logs.

---

## After Apple/Google approval — clean up

For security hygiene, remove the bypass after the first approval lands. Keep
it only if you anticipate frequent re-submissions (you usually don't).

1. Supabase Dashboard → Auth → Phone → Test phone numbers → remove the row
2. Supabase Functions → secrets → `REVIEWER_PHONES_E164` → empty (or delete)
3. ASC / Play Console → leave the credentials as-is (only used on review)

If a future review requires it again, re-add — the wiring in
`supabase/functions/send-otp-sms/index.ts` reads the env var every cold start.

---

## Why this is safe (defense rationale)

- The bypass triggers **only** if the phone string matches an entry in
  `REVIEWER_PHONES_E164`. Real users' phones never match.
- The bypass only short-circuits the *outbound SMS* (MSG91 call). The OTP
  Supabase Auth accepts at verify time is set in Supabase Dashboard's test
  map — Supabase Auth, not Aangan, owns that comparison. We don't have a
  hardcoded "if (token === '123456')" anywhere in the codebase.
- The webhook secret (`SUPABASE_WEBHOOK_SECRET`) still gates the function —
  random internet callers can't trigger it even with a reviewer phone.
- An attacker who knew the demo phone AND the demo OTP could log in as the
  reviewer account, see the demo family, and nothing else (no PII, no real
  user data — the demo account is isolated).

Last reviewed: [Kumar to update on each submission].
