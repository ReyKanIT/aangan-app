# Reviewer Bypass — DISABLED 2026-04-23

> Previously this doc walked Kumar through adding reviewer phone numbers to
> Supabase Dashboard. **That bypass is now disabled** per Kumar's instruction
> once the Vi DLT OTP template was approved. Real SMS via MSG91 is the only
> authentication path.

---

## What changed

- `supabase/config.toml` — `[auth.sms.test_otp]` section emptied
- `supabase/functions/send-otp-sms/index.ts` — `REVIEWER_PHONES` Set emptied
- Supabase Dashboard → Authentication → Phone → Test phone numbers — Kumar
  must manually delete all 4 rows (Dashboard is authoritative in prod;
  config.toml doesn't push)

---

## Kumar — manual Supabase Dashboard cleanup

1. Open Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Phone**
2. Scroll to **Test phone numbers**
3. Delete each row:
   - `+919886110312`
   - `+919000000001`
   - `+919000000002`
   - `+919886146312`
4. Click **Save**
5. Wait ~10 seconds for config to propagate

**Once Dashboard is cleared, every incoming OTP goes to MSG91 + Vi DLT.**
Any valid Indian mobile will receive a real SMS.

---

## Verify real OTP end-to-end

1. Open [aangan.app/login](https://aangan.app/login) in a fresh browser
2. Enter any valid Indian mobile (not on DND for transactional SMS)
3. Tap **OTP भेजें / Send OTP**
4. Within 5–15 seconds: SMS from **AANGFM** reading
   *"Aapka Aangan OTP NNNNNN hai. 10 minute ke liye valid. Kisi ke saath share na karein. -Aangan"*
5. Enter the 6-digit OTP → tap **Verify** → lands on /profile-setup (new user)
   or /feed (returning user)

---

## If OTP doesn't arrive

Check in this order:

1. **Phone on DND?** TRAI DND registry blocks transactional SMS unless the
   subscriber opts in to commercial category. Test with a phone known to
   receive bank/transactional SMS.
2. **MSG91 delivery log** → msg91.com → Logs → filter by mobile `91<number>`
   → check status (Delivered / Failed / Rejected). If Rejected, the reason
   column shows whether it was Vi (DLT mismatch) or telco (DND / invalid).
3. **Supabase edge function logs** → Dashboard → Edge Functions →
   `send-otp-sms` → Logs. Look for:
   - `Hook invoked, phone: ***NNNN` — Supabase reached the hook ✓
   - `OTP sent to ***NNNN via MSG91, request_id: ...` — MSG91 accepted ✓
   - `MSG91 error: ...` — MSG91 rejected with reason
   - `MSG91 secrets not configured` — `MSG91_AUTH_KEY` or
     `MSG91_TEMPLATE_ID` missing from edge-function secrets
4. **Template ID match** — `MSG91_TEMPLATE_ID` secret must equal the exact
   Vi-approved Template ID `1107177660181979501`. A wrong ID returns 200
   from MSG91 but telco silently drops the SMS for DLT mismatch.
5. **Sender ID match** — `MSG91_SENDER_ID` defaults to `AANGFM`. If MSG91
   account has a different registered sender, SMS is sent but Vi rejects
   at the telco gateway.

---

## Re-enabling bypass (if ever needed)

If a store submission or emergency requires bypass again:
1. Add entries to `[auth.sms.test_otp]` in `supabase/config.toml`
2. Add same phones (country-code-prefixed, without `+`) to `REVIEWER_PHONES`
   in `supabase/functions/send-otp-sms/index.ts`
3. Deploy: `supabase functions deploy send-otp-sms --project-ref okzmeuhxodzkbdilvkyu`
4. Add matching rows in Supabase Dashboard → Auth → Phone → Test numbers
   (Dashboard is authoritative — without this step the bypass won't work in prod)

All three must match. Dashboard alone is sufficient for prod; config.toml
and the Set are belt-and-braces for local dev + edge function hygiene.

---

*[9:55am - 22Apr26] · Aangan v0.9.14 · Real SMS live, reviewer bypass retired*
