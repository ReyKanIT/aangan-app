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

## What's live in v0.13.5

Substantially bigger feature set than what you last reviewed (v0.9.14
on 2026-04-18 — this is the first mobile release since then):

**New since last review (v0.10 → v0.13.5):**
- 🆔 **Stable Aangan ID** — every user gets a permanent, share-able
  discovery handle (e.g. `AAN-X7K2 P9X3`) visible in Settings. Family
  members can find each other by ID even after phone-number changes.
- 🌳 **Per-viewer family-tree labels** — the tree now derives the
  correct Hindi label for each relative based on the viewer's position
  (your brother's wife shows as भाभी for you, even though her row was
  added by your brother as पत्नी). Includes a "via X" badge so users
  know which side of the family a transitive relative came from.
- 🔗 **WhatsApp deep-link family invites** — generates a one-tap link
  like `https://aangan.app/join/ABC123` with the relationship
  pre-set; recipient lands directly on the family-add screen.
- 🪔 **Festival chatbot grounded in 27+ festivals** — actual upcoming
  dates with Hindi day names, filtered to the user's state (Karwa
  Chauth for north India, Pongal for Tamil Nadu, Chhath for Bihar/UP).
- 🪔 **50+ festivals catalog** with regional opt-in/out preferences
- 📅 **Recurring panchang reminders** — every-month tithi alerts
  (पूर्णिमा, अमावस्या, एकादशी)
- 🔒 **Privacy-safe family-of-family view** — see relatives' tree
  positions without their phone / email / DOB / address being exposed
  to family-of-family viewers.

**Already live in prior reviews (still part of v0.13.5):**
- Family tree with 3-level hierarchy (including offline members + deceased relatives)
- Daily Panchang + 50+ festival alerts
- Wedding series (Tilak → Haldi → Mehndi → Sangeet → Shaadi as linked sub-events)
- Voice invites (30-sec elder blessing, plays inline on invite page)
- Bulk invitee scheduler + contact picker
- Private gift register (शगुन बही)
- GPS event check-in
- Potluck sign-up ("क्या लाओगे?")
- Hindi/English voice-to-text
- AI family chatbot in Hindi (now DB-grounded for festival accuracy)

## Discovery testing (NEW for this release)

After signing in, go to **Settings** → see your Aangan ID below your
name (formatted as `AAN-XXXX YYYY`). Tap **कॉपी / Copy** or **WhatsApp**
to share. Then open the app on a second device, sign in with a different
number, go to **Family Tree → "+ जोड़ें"** → enter the first user's
Aangan ID in the search box → the user should appear instantly without
needing the phone number.

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

*Generated [11:55pm - 30Apr26] · Aangan v0.13.5 (build 20) · Contact: support@aangan.app*
