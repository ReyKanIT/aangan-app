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

## Root cause (revised [11:05am - 27Apr26])

**Two independent bugs — both required to be fixed.**

### Bug 1 — env-var name + wrong template ID type (fixed [Apr 26])
The deployed `send-otp-sms` edge function was sending the **Vi DLT
template ID** `1107177660181979501` to the MSG91 v5 OTP API as
`template_id`, but MSG91 expects its own internal **ObjectID**
`69d0acea4401dcf53a0b4f82`. Compounded by an env-var name mismatch
(`MSG91_TEMPLATE_ID` vs `MSG91_TEMPLATE_OTP`). Result: MSG91 returned
`type: error` code 400 ("Invalid template_id"). Fixed by setting the
secret to MSG91's ObjectID and patching the function to log the raw
MSG91 response body. After this fix, MSG91 returns `type: success`
with `request_id` for every call.

### Bug 2 — Vi DLT chain incomplete (open as of [11:00am - 27Apr26])
Even after MSG91 accepts and forwards, **Vi telco silently drops the
SMS** because the **PE-TM Chain** does not exist on vilpower.in. The
PE+Header+Templates ARE all approved; only the TM-PE binding step
remains. Verified by direct AJAX queries against vilpower.in
endpoints (the visual filter dropdowns on the portal don't actually
update the underlying AJAX `Apprstatus` param, which is why earlier
visual checks made it look like nothing was registered):

| Component | Status | ID |
|---|---|---|
| PE — ReyKan Information Technologies pvt Ltd | ✅ Approved | `1101455800000093984` (Reg# VI-1100093984) |
| Header — **AANGFM** (not "AANGAN") | ✅ Approved 17-Apr-2026 14:26 IST · Permanent | DLT Header ID `1105177634147076603` |
| Aangan OTP (Transactional) | ✅ Approved 20-Apr-2026 | `1107177660181979501` |
| Aangan Event Invite (Service-Explicit) | ✅ Approved | `1107177660212465624` |
| Aangan RSVP Confirm (Service-Explicit) | ✅ Approved | `1107177660234341845` |
| Aangan Event Reminder 24h (Service-Implicit) | ✅ Approved | `1107177660290782243` |
| Aangan Event Reminder 2h (Service-Explicit) | ✅ Approved | `1107177660323100746` |
| Aangan Family Join (Service-Explicit) | ✅ Approved | `1107177660343986635` |
| TM — WALKOVER WEB SOLUTIONS PRIVATE LIMITED | ❌ **Pending** | `1302157225275643280` |
| **PE-TM Chain** | ❌ **Not Registered** — server rejects creation: *"Unable to process request now."* | — |

> Sender-ID/Header string note: the original runbook used "AANGFM"
> (factually correct — Vi-approved). Some text in this doc and in
> earlier versions of the function header comment referred to
> "AANGAN" — that was wrong. Vi DLT is authoritative; **AANGFM** is
> the correct sender ID.

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

## MSG91 reply received [1:11am - 28Apr26]

MSG91 Client Experience Team responded to the support email sent in
v0.10.2. Verbatim:

> We understand that you are facing an issue with your SMS delivery to
> Vi numbers due to a pending PE-TM (Principal Entity-Telemarketer)
> binding status on the DLT platform.
>
> For our team to approve the pending request on the Vi DLT portal
> ([vilpower.in](http://vilpower.in)), please follow the instructions
> outlined in our help document. This guide explains the necessary
> steps when the status is "Pending at TM."
>
> You can find the detailed process here: PE-TM Chain Binding on DLT
>
> Once the PE-TM binding is approved on the DLT platform, we will
> ensure that your Sender ID (AANGFM) is correctly mapped to your
> Principal Entity ID (1101455800000093984) and the corresponding DLT
> Template ID on our end.
>
> To discuss this case further, you can call at 07316914364.
> Alternatively, provide two preferred callback times.

**Translation:** the ball is back on Kumar (PE side). MSG91 cannot
push the binding from their side until Kumar follows their PE-TM Chain
Binding doc on vilpower.in to either re-submit or accept the chain
request. Once vilpower.in shows the chain status as
**Approved/Active** (instead of "Pending at TM"), MSG91 will finalize
the AANGFM ↔ PE `1101455800000093984` ↔ Template
`1107177660181979501` mapping on their end.

### Action items (added to the v0.10.2 punch list)

| # | Action | Where | Owner |
|---|---|---|---|
| 8a | Open MSG91's "PE-TM Chain Binding on DLT" help doc (link in their email) | email | Kumar |
| 8b | Log in to [vilpower.in](http://vilpower.in) → Header/Template/Chain Binding section → find pending request to WALKOVER WEB SOLUTIONS (`1302157225275643280`) → action it per MSG91 doc | vilpower.in | Kumar |
| 8c | Confirm vilpower.in chain status flips to Approved/Active | vilpower.in | Kumar |
| 8d | Reply to MSG91 thread confirming step 8c so they map AANGFM on their side | email | Kumar |
| 8e | If doc is unclear, call MSG91 at **07316914364** or reply with two callback slots — DLT portal UX is famously confusing, a 10-min phone call beats email ping-pong | phone | Kumar |

Until 8d closes, real SMS will continue to silently drop on Vi
numbers. Email-OTP fallback (landed in v0.10.1) remains the only
working path for real users on Vi.

---

## Closing the loop

Once a real SMS lands on a non-bypass Indian number end-to-end and the
MSG91 logs show Delivered:

1. Empty `REVIEWER_PHONES` in `send-otp-sms/index.ts` back to
   `new Set<string>([])`. *(already empty as of [27Apr26])*
2. Empty `[auth.sms.test_otp]` in `supabase/config.toml`. *(already
   empty as of [27Apr26])*
3. Delete the matching rows in Supabase Dashboard → Auth → Phone →
   Test phone numbers.
4. Re-deploy the function.

---

## Open follow-up [11:05am - 27Apr26]

Two emails sent (drafts kept in `EMAIL_DRAFT_DLT_APPROVAL.md`):

1. **`support@msg91.com`** — asking WALKOVER (TM `1302157225275643280`)
   to log into vilpower.in as the TM and **accept** the binding from
   PE `1101455800000093984` so the TM moves Pending → Approved.
2. **`support@vilpower.in`** (Cc Wasim Ahmed L2 escalation) — asking
   Vi DLT to confirm whether the Pending is on Vi side or WALKOVER
   side, and expedite.

When WALKOVER moves to Approved:

1. On vilpower.in: `/pe_tm_binding/addchain/` → create chain
   "Aangan-WALKOVER" pointing PE `1101455800000093984` → TM
   `1302157225275643280`. Wait for TM-side accept; chain becomes
   Approved.
2. On MSG91 panel (Angular SPA — must be done in foreground browser
   tab; lazy-loaded route doesn't render in background): SMS →
   Sender ID → AANGFM → India edit → set DLT Entity / PE ID
   `1101455800000093984` and DLT Template (OTP)
   `1107177660181979501`. Save.
3. From a non-bypass Indian number, trigger an OTP from
   `aangan.app/login`. Tail edge function logs (expect MSG91
   `type: success`). MSG91 console → Logs → expect
   `Status: Delivered`. SMS lands on phone.
4. If `Delivered` but no SMS on phone: TRAI/sender-ID-vs-PE
   mismatch — re-check the AANGFM ↔ PE `1101455800000093984` ↔
   template `1107177660181979501` triplet on MSG91 panel.

Until WALKOVER is Approved and the chain is built, **no further code
changes** to the OTP path. Bypasses remain off.

---

*[11:05am - 27Apr26] · Aangan v0.10.2 · ReyKan IT Private Limited*
