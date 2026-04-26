# OTP Failure Post-Mortem — 2026-04-26

> **DO NOT REPEAT.** Read this before changing anything in
> `supabase/functions/send-otp-sms/index.ts`,
> Supabase Dashboard → Auth → Hooks/Phone, or MSG91 secrets.

---

## Symptom (what Kumar saw)

- New WhatsApp-style login on `aangan.app` (v0.10.0): enter `+91...`
  → confirm → no SMS arrives → user stuck.
- RN app same outcome.
- Indus / Play / App Store reviewers + Kumar himself unable to log in.
- Login page just shows "OTP नहीं भेज पाए" — no clue why.

---

## Root cause (the one-liner)

**Environment variable name mismatch.** The deployed
`send-otp-sms` edge function read `Deno.env.get('MSG91_TEMPLATE_ID')`,
but the runbook (`MSG91_TEMPLATE_IDS.md` step "Post-approval wiring")
told Kumar to set the secret as `MSG91_TEMPLATE_OTP`. Whichever name
was actually set on the project, *one of them was empty*, the function
fell into the `if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) → 503 "SMS
provider not configured"` branch, and Supabase surfaced it as a
generic "OTP failed". No SMS was ever attempted.

Vi DLT was a red herring — verified live on vilpower.in dashboard
[2:30pm - 26Apr26] that **all 6** Aangan templates including
`1107177660181979501` Aangan OTP (Transactional) are **APPROVED**.

---

## Contributing factors (so we never repeat)

1. **Two names for one thing.** Code referenced `MSG91_TEMPLATE_ID`,
   the runbook referenced `MSG91_TEMPLATE_OTP`. Neither is wrong on its
   own; the bug was the mismatch.
2. **Hidden by friendlyError.** `aangan_web/src/lib/errorMessages.ts`
   maps every backend error to a Hindi/English friendly message and
   throws away the original. From Kumar's seat, "SMS provider not
   configured" looked identical to "DLT pending" looked identical to
   "rate limited" — all became "OTP नहीं भेज पाए".
3. **No fallback.** v0.10.0's login page deleted email/Google/Apple,
   so when SMS broke there was no alternate path to log in and verify
   anything. Kumar locked himself (and reviewers) out.
4. **Reviewer bypass removed too early.** e009119 retired the
   `REVIEWER_PHONES` set and `[auth.sms.test_otp]` map under the
   assumption that real SMS worked. Real SMS had never actually
   delivered end-to-end on a non-bypass number — only the bypass had
   been tested.

---

## Permanent guards landed in v0.10.1

- **Function reads both env-var names AND defaults to the known
  approved Vi template ID** (`1107177660181979501`). So even if the
  secret is unset, the function still attempts MSG91 with the right
  template.
  → file: `supabase/functions/send-otp-sms/index.ts`
- **`rawError` field on auth store** preserves the original Supabase /
  hook message; `/login` exposes it via "विवरण दिखाएं — Show details"
  toggle. Future SMS failures show the actual cause.
  → files: `aangan_web/src/stores/authStore.ts`,
  `aangan_web/src/app/(auth)/login/page.tsx`
- **Email-OTP fallback link** below the phone form on `/login` +
  email mode re-enabled on `/otp`. Users (and Kumar) always have a
  passwordless alternative if SMS is ever broken again.
- **Founder QA bypass restored** (`+919886146312` →
  `111222`) in `REVIEWER_PHONES` + `supabase/config.toml`. Pair with a
  matching row in Dashboard → Auth → Phone → Test phone numbers.
  Empty back out *only* after a real Vi-approved SMS lands on a
  non-bypass number end-to-end.

---

## Required external steps (cannot be done from code)

| # | Action | Where | Auth needed |
|---|---|---|---|
| 1 | `git push origin main` | local | done [2:43pm - 26Apr26] |
| 2 | `supabase functions deploy send-otp-sms --project-ref okzmeuhxodzkbdilvkyu` | local CLI | service_role |
| 3 | Confirm secret `MSG91_AUTH_KEY` is set | `supabase secrets list` | service_role |
| 4 | `supabase secrets set MSG91_TEMPLATE_OTP=1107177660181979501` (and `MSG91_TEMPLATE_ID=…` for safety) | local CLI | service_role |
| 5 | Confirm `MSG91_SENDER_ID=AANGFM` is set | `supabase secrets list` | service_role |
| 6 | Supabase Dashboard → Auth → Hooks: confirm Send-SMS hook is **enabled**, points to `https://okzmeuhxodzkbdilvkyu.functions.supabase.co/send-otp-sms`, and `SUPABASE_WEBHOOK_SECRET` matches the function's secret | Dashboard | Kumar |
| 7 | Supabase Dashboard → Auth → Phone → Test phone numbers: add `+919886146312 → 111222` | Dashboard | Kumar |
| 8 | MSG91 console → PE-TM Chain → confirm Vi PE `1101455800000093984` ↔ Aangan TM ↔ Aangan OTP template `1107177660181979501` are all linked | MSG91 | Kumar |
| 9 | Test from a non-bypass Indian mobile | phone | Kumar |

Step 8 is the one most likely to bite us next: Vi approves the
template, but until the PE-TM chain is wired in MSG91, MSG91 won't
emit the SMS *with* the approved DLT context — Vi telco will then
silently drop it.

---

## How to verify it's actually working (not just bypassed)

1. Tail edge function logs:
   `supabase functions logs send-otp-sms --project-ref okzmeuhxodzkbdilvkyu --tail`
2. Trigger a real OTP from a phone NOT in `REVIEWER_PHONES` (e.g. a
   family member's number). Look for:
   - `Hook invoked, phone: ***NNNN`
   - `Sending OTP via MSG91 to ***NNNN`
   - `OTP sent to ***NNNN via MSG91, request_id: …`
3. SMS should land within 5–15s reading
   `Aapka Aangan OTP NNNNNN hai. 10 minute ke liye valid. Kisi ke
   saath share na karein. -Aangan`
4. If MSG91 logs (msg91.com → Logs) show `Status: Delivered`, the
   pipeline is healthy.

If steps 1-3 succeed but the SMS never arrives → Vi telco drop
(usually PE-TM chain or sender-ID mismatch).
If step 1 doesn't log anything → Supabase Hook isn't actually wired
(step 6 above).
If step 1 logs `MSG91 secrets not configured` → step 4 above.

---

## Closing the loop

Once a real SMS lands on a non-bypass Indian number end-to-end and the
MSG91 logs show Delivered:

1. Empty `REVIEWER_PHONES` in `send-otp-sms/index.ts` back to
   `new Set<string>([])`.
2. Empty `[auth.sms.test_otp]` in `supabase/config.toml`.
3. Delete the matching rows in Supabase Dashboard → Auth → Phone →
   Test phone numbers.
4. Re-deploy the function.

Until then, the bypass exists and Kumar's phone short-circuits MSG91.

---

*[2:45pm - 26Apr26] · Aangan v0.10.1 · ReyKan IT Private Limited*
