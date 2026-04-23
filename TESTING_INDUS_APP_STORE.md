# Indus App Store — Reviewer Testing Note

> Paste this into the Indus "Edit Details" → Reviewer Notes field before
> clicking "Submit for Final Review"

---

## Reviewer test credentials — DEPRECATED 2026-04-23

The reviewer OTP bypass was disabled on 2026-04-23 because the Vi DLT
OTP template is now approved and real SMS delivery via MSG91 is live.

If you're a reviewer and need to test the app, please:
- Use any **valid Indian mobile number** with access to SMS
- Enter the number on the login screen → tap **OTP भेजें / Send OTP**
- Within ~5–15 seconds you will receive an SMS from sender **AANGFM**
  reading "Aapka Aangan OTP NNNNNN hai. 10 minute ke liye valid. Kisi
  ke saath share na karein. - AANGFM"
- Enter that 6-digit code → tap **सत्यापित करें / Verify**

Please reach out to `support@aangan.app` if the OTP does not arrive
within 60 seconds — we can investigate telco-side delivery issues
(DND status, carrier blocking) from MSG91 logs.

---

## Fixing your listed issues

> **Issue 1:** Users do not receive a verification email/OTP after signing up.

**Status update (2026-04-23):** Real SMS delivery via MSG91 is live —
Vi DLT OTP template is approved. Any valid Indian mobile receives an
SMS from sender AANGFM within 5–15 seconds.

> **Issue 2:** Sign up option is not functional.

**Status update (2026-04-23):** With real OTP delivery live, the full
signup flow works end-to-end for any valid Indian mobile. No special
test numbers required.

---

## What's live in v0.9.13

Bigger feature set than what you last reviewed:

- Family tree with 3-level hierarchy (including offline members + deceased relatives)
- Daily Panchang + 50+ festival alerts
- Wedding series (Tilak → Haldi → Mehndi → Sangeet → Shaadi as linked sub-events)
- Voice invites (30-sec elder blessing, plays inline on invite page)
- Bulk invitee scheduler + contact picker
- Private gift register (शगुन बही)
- GPS event check-in
- Potluck sign-up ("क्या लाओगे?")
- Hindi/English voice-to-text
- AI family chatbot in Hindi

---

## Kumar — reviewer bypass was DISABLED on 2026-04-23

All rows in Supabase Dashboard → Authentication → Phone → Test phone
numbers should be **removed**. Likewise, `supabase/config.toml` is
cleared of `[auth.sms.test_otp]` entries and the edge function's
`REVIEWER_PHONES` Set is empty.

Every OTP request now flows: client → Supabase Auth → `send-otp-sms`
hook → MSG91 → Vi DLT → real SMS. If a submission deadline forces us
to re-enable the bypass (e.g. another store takes Vi down), repopulate:
1. `supabase/config.toml` `[auth.sms.test_otp]`
2. `supabase/functions/send-otp-sms/index.ts` `REVIEWER_PHONES` Set
3. Supabase Dashboard → Auth → Phone → Test phone numbers (authoritative)
…all three must match for the bypass to work.

---

*Generated [7:50am - 18Apr26] · Aangan v0.9.13 · Contact: support@aangan.app*
