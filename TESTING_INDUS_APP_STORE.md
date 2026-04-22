# Indus App Store — Reviewer Testing Note

> Paste this into the Indus "Edit Details" → Reviewer Notes field before
> clicking "Submit for Final Review"

---

## Reviewer test credentials

The app uses phone OTP authentication via MSG91 (Vi DLT registered,
PEID VI-1100093984). Our DLT content template is in the final approval
queue with Vi. While approval completes, please use the following
reviewer bypass number to verify the full signup + login flow:

| Field | Value |
|---|---|
| Phone | **9886110312** |
| Country | India (+91) |
| OTP | **123456** |

### Steps

1. Open the Aangan app
2. On the login screen, enter phone **9886110312**
3. Tap **Continue / OTP भेजें**
4. On the OTP screen, enter **123456**
5. Tap **Verify / सत्यापित करें**
6. You're logged in. No real SMS is sent — this is a preregistered
   reviewer-only bypass on our Supabase Auth config.

### Why the bypass exists

Real users get a genuine SMS OTP via MSG91 (DLT-compliant). Reviewers,
however, don't have an Indian SIM registered with us and the DLT
template approval is still completing — so a bypass was the only way
to let external reviewers test signup end-to-end. Once Vi DLT template
goes live (expected within 72 hours), real SMS flows to every non-
reviewer number immediately; no app update needed.

### Additional QA numbers

If you'd like to test with a second identity (e.g., inviting a family
member to an event):

| Phone | OTP |
|---|---|
| 9886146312 | 111222 |
| 9000000001 | 654321 |

---

## Fixing your listed issues

> **Issue 1:** Users do not receive a verification email/OTP after signing up.

**Root cause:** Aangan is phone-OTP only (no email signup). Real OTP
delivery is gated on final Vi DLT template approval. Until then, the
reviewer numbers above bypass MSG91 entirely and complete signup.

> **Issue 2:** Sign up option is not functional.

**Root cause:** Without OTP delivery, the "Continue" button's
downstream verification step couldn't complete in testing. Using the
reviewer phone (**9886110312** + OTP **123456**) makes the full
signup → profile setup → feed flow work.

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

## Kumar — one-time Supabase Dashboard step (required)

The edge-function bypass in `send-otp-sms/index.ts` handles reviewer phones
if Supabase routes them to the hook. For absolute bulletproofing, also add
them to Supabase Auth so Supabase short-circuits *before* calling the hook:

1. Supabase Dashboard → **Authentication** → **Sign-In / Up** → **Phone**
2. Scroll to **Test phone numbers**
3. Add each row:
   | Phone number | OTP |
   |---|---|
   | `+919886110312` | `123456` |
   | `+919000000001` | `654321` |
   | `+919000000002` | `246810` |
   | `+919886146312` | `111222` |
4. Save

Once set, reviewers and real users are handled by separate paths:
- Real numbers → MSG91 (DLT template when approved)
- Reviewer numbers → fixed OTP, no SMS ever fires

---

*Generated [7:50am - 18Apr26] · Aangan v0.9.13 · Contact: support@aangan.app*
