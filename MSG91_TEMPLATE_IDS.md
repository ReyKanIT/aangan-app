# Vi DLT Template IDs — Aangan

> Submitted to vilpower.in on **2026-04-19 ~18:00 IST** under PEID `VI-1100093984`,
> Header `AANGFM`, Brand `Aangan` (approved 2026-04-19).
>
> All currently **Pending** (Vi review = 24–72 hours). Once approved, set as
> Supabase secrets so MSG91 edge functions can reference them.

---

## Live Template IDs

| # | Template Name | Type | Template ID | Status | Env var |
|---|---|---|---|---|---|
| 1 | **Aangan OTP** | Service-Implicit | `1107177660181979501` | Pending | `MSG91_TEMPLATE_OTP` |
| 2 | **Aangan Event Invite** | Service-Implicit | `1107177660212465624` | Pending | `MSG91_TEMPLATE_EVENT_INVITE` |
| 3 | **Aangan RSVP Confirm** | Service-Implicit | `1107177660234341845` | Pending | `MSG91_TEMPLATE_RSVP_CONFIRM` |
| 4 | **Aangan Event Reminder 24h** | Service-Implicit | `1107177660290782243` | Pending | `MSG91_TEMPLATE_REMIND_24H` |
| 5 | **Aangan Event Reminder 2h** | Service-Implicit | `1107177660323100746` | Pending | `MSG91_TEMPLATE_REMIND_2H` |
| 6 | **Aangan Family Join** | Service-Implicit | `1107177660343986635` | Pending | `MSG91_TEMPLATE_FAMILY_JOIN` |

All six are Category `Communication/Broadcasting/Entertainment/IT`, single-SMS,
Roman-Hindi transliteration (no Devanagari Unicode).

---

## Approved template content (what Vi has)

```
# 1. OTP
Aapka Aangan OTP {#numeric#} hai. 10 minute ke liye valid. Kisi ke saath share na karein. - AANGFM

# 2. Event Invite
{#alphanumeric#} ne aapko {#alphanumeric#} mein bulaya hai. {#alphanumeric#} ko {#alphanumeric#} par. RSVP: {#url#} - AANGFM

# 3. RSVP Confirm
Aapka RSVP {#alphanumeric#} event ke liye confirm ho gaya. Tarikh {#alphanumeric#}. Details: {#url#} - AANGFM

# 4. Event Reminder 24h
Kal {#alphanumeric#} par {#alphanumeric#} hai. Samay {#alphanumeric#}. Pata: {#alphanumeric#}. Dekhein: {#url#} - AANGFM

# 5. Event Reminder 2h
Yaad dilaane ke liye: {#alphanumeric#} 2 ghante mein shuru hoga. {#alphanumeric#} par. Dekhein: {#url#} - AANGFM

# 6. Family Join
{#alphanumeric#} ne Aangan join kar liya hai aur aapke family tree mein jud gaye. Dekhein: {#url#} - AANGFM
```

**Variable type cheat sheet (Vi DLT typed variables):**
- `{#numeric#}` → digits only (OTP, order number)
- `{#alphanumeric#}` → letters + numbers + spaces + `_` `/` `.` (names, places, dates like "15 Jun 2026")
- `{#url#}` → must start with `http://`, `https://`, or `www.` (sample needs full URL)
- `{#cbn#}`, `{#email#}`, `{#urlott#}` → not used here

---

## Post-approval wiring

Once Vi moves a template to **Approved**:

1. Save the Template ID as a Supabase secret:
   ```bash
   supabase secrets set MSG91_TEMPLATE_OTP=1107177660181979501
   supabase secrets set MSG91_TEMPLATE_EVENT_INVITE=1107177660212465624
   supabase secrets set MSG91_TEMPLATE_RSVP_CONFIRM=1107177660234341845
   supabase secrets set MSG91_TEMPLATE_REMIND_24H=1107177660290782243
   supabase secrets set MSG91_TEMPLATE_REMIND_2H=1107177660323100746
   supabase secrets set MSG91_TEMPLATE_FAMILY_JOIN=1107177660343986635
   ```

2. Update `supabase/functions/send-otp-sms/index.ts` to read
   `Deno.env.get('MSG91_TEMPLATE_OTP')` instead of the hard-coded test-mode
   template (reviewer bypass for `REVIEWER_PHONES` stays as-is).

3. For event/RSVP/reminder/family-join flows, create/update the corresponding
   edge functions (`send-event-invite-sms`, `send-rsvp-confirm-sms`,
   `send-event-reminder-sms`, `send-family-join-sms`) and wire them to the
   right MSG91 DLT template via `template_id` param.

4. **Remove the reviewer-OTP bypass** from `send-otp-sms/index.ts` only after
   **all** reviewer accounts finish their app-store review cycles (Indus +
   Play + App Store Connect). Premature removal breaks the reviewer login
   flow even though real OTP now works for everyone else.

---

## Deferred (not yet submitted — submit before v1.0 release)

These 9 templates were planned in `SMS_TEMPLATES_DLT.md` but skipped in the
initial submission batch. Submit when the corresponding feature goes live.

| Template | Reason deferred | When to submit |
|---|---|---|
| **A6 Physical Card Sent** | Rare edge case, host marks card as hand-delivered | When >10 hosts use physical cards |
| **A7 Support Ticket Reply** | Admin reply workflow via /admin/issues | Before Admin Mode is opened to non-Kumar users |
| **A8 Issue Resolved** | Admin closes ticket/report | Same as A7 |
| **B1 Festival Greeting** | Needs opt-in consent system | After "Allow festival SMS" toggle is live in settings |
| **B2 Daily Panchang Digest** | Same — needs opt-in | After panchang SMS opt-in |
| **B3 Weekly Family Digest** | Needs opt-in | Post-v1.0 |
| **B4 Upcoming Events Digest** | Needs opt-in | Post-v1.0 |
| **B5 Birthday Reminder** | Needs opt-in | Post-v1.0 |
| **B6 App Update** | Needs opt-in | On major release |
| **B7 Maintenance Notice** | Low volume, announce via app banner instead | Skip unless required |

Submission process for each: log into vilpower.in → Templates → +Add →
Template Type=Service → Consent=Implicit (for A-series) or Explicit (for
B-series) → Category `Communication/Broadcasting/Entertainment/IT` → Header
`AANGFM` → Brand `Aangan` → paste content (swap `{#var#}` → typed
`{#numeric#}` / `{#alphanumeric#}` / `{#url#}` as appropriate) → Save → fill
sample values → Submit. Each takes ~2 minutes.

---

## Rejection handling

If Vi rejects a template:
- Check `vilpower.in → Templates → Approval Status = Rejected` — the remarks
  column shows the reason.
- Most common rejections:
  - **"Sender ID missing in body"** → add `- AANGFM` at the end (we already do)
  - **"Variable sample invalid"** → sample values allow only alphabets, numbers,
    spaces, `_`, `/`, `.`. Hyphens (e.g. `TKT-001`), colons (`7:30 PM`), and
    other punctuation get rejected. Use spaces or strip the punctuation
    (`TKT 001` / `7 30 PM`).
  - **"URL format invalid"** → sample must start with `http://`, `https://`, or
    `www.`. `aangan.app/e/ab12` is rejected; `https://aangan.app/e/ab12` passes.
  - **"Consent type mismatch"** → Service Implicit is for user-triggered
    messages (OTP, RSVP, invite). Service Explicit is only for opt-in
    broadcasts (festivals, digests). Don't use Explicit for transactional
    flows.
- Re-submit with fix; typically approves on 2nd try.

---

*[6:28pm - 19Apr26] · Aangan v0.9.14 · ReyKan IT Private Limited · PEID VI-1100093984 · Header AANGFM*
