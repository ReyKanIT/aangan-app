# DLT Approval-Request Emails — DRAFT for Kumar review
*[11:03am - 26Apr26]*

> **Purpose:** SMS OTP for Aangan App is failing. Almost everything
> on Vi DLT is approved — Header AANGFM, all 6 Content Templates
> (including OTP `1107177660181979501`), and PE
> `1101455800000093984`. The single remaining blocker is the
> **Telemarketer WALKOVER WEB SOLUTIONS PRIVATE LIMITED**
> (`1302157225275643280`) is in **Pending** status, which prevents
> the **PE-TM Chain** from being created — and without that chain,
> Vi telco silently drops every OTP SMS.
>
> Per founder directive *[10:30am - 26Apr26]* — **"if not approved
> lets send email to concerned party for approval, no more short
> cuts"** — we are NOT adding any bypass. We email the parties.

---

## Verified state on vilpower.in *[11:00am - 26Apr26]*

Direct AJAX queries against the portal endpoints (the visual filters
on vilpower don't actually update the AJAX `Apprstatus` param, so
the UI tables look empty — but the underlying data is approved):

| What | Status |
|---|---|
| **Principal Entity** — ReyKan Information Technologies pvt Ltd, ID `1101455800000093984` | ✅ Approved (Reg# VI-1100093984, expires 16-Apr-2027) |
| **Header / Sender ID** AANGFM (DLT Header ID `1105177634147076603`) | ✅ Approved 17-Apr-2026 14:26 IST · Validity Permanent · Header Expiry 30-Jun-2026 |
| **Templates** — 6 of 6 active | ✅ All Approved on 20-Apr-2026 |
| → Aangan OTP `1107177660181979501` (Transactional) | ✅ |
| → Aangan Event Invite `1107177660212465624` (Service-Explicit) | ✅ |
| → Aangan RSVP Confirm `1107177660234341845` (Service-Explicit) | ✅ |
| → Aangan Event Reminder 24h `1107177660290782243` (Service-Implicit) | ✅ |
| → Aangan Event Reminder 2h `1107177660323100746` (Service-Explicit) | ✅ |
| → Aangan Family Join `1107177660343986635` (Service-Explicit) | ✅ |
| **Telemarketer** WALKOVER WEB SOLUTIONS PRIVATE LIMITED, TM ID `1302157225275643280`, Type **Both** | ❌ **Pending** |
| **PE-TM Chain** | ❌ **Not Registered** (chain creation server-side rejects with "Unable to process request now." while TM is Pending) |

**MSG91 side**: API call returns `type: success` with `request_id`
(verified earlier today). MSG91 accepts and forwards to Vi telco.
Vi telco silently drops because PE-TM chain doesn't exist.

---

## Email 1 — to MSG91 / WALKOVER (the TM that must accept)
**To:** support@msg91.com
**Cc:** info@reykanit.com (Kumar)
**Subject:** Urgent — Please accept TM-PE binding for our PE `1101455800000093984` (Aangan / ReyKan IT) on vilpower.in

Hello MSG91 / WALKOVER team,

We are sending OTPs through your platform for our app **Aangan**.
Everything on the Vi DLT (vilpower.in) side under our Principal
Entity is **approved** — Header AANGFM, all 6 Content Templates
(including OTP template `1107177660181979501`). However the
**WALKOVER WEB SOLUTIONS PRIVATE LIMITED** Telemarketer record
(TM ID `1302157225275643280`) we added against our PE on
vilpower.in is still in **Pending** status, and as a result we
cannot create the **PE-TM Chain** — Vi telco silently drops every
OTP we send through your API.

MSG91 returns `type: success` with `request_id` for every call we
make (verified today on the OTP V5 API), so the issue is purely the
missing PE-TM binding on Vi DLT.

**Our identifiers:**
- Brand: Aangan (आँगन)
- Principal Entity: ReyKan Information Technologies pvt Ltd
- Vi DLT PE ID: `1101455800000093984` *(Reg# VI-1100093984)*
- Vi DLT Header / Sender ID: **AANGFM** (DLT Header ID
  `1105177634147076603`, Approved 17-Apr-2026)
- MSG91 user: `reykan` / `info@reykanit.com`

**Requested action:**
1. Please log in to vilpower.in as **WALKOVER WEB SOLUTIONS
   PRIVATE LIMITED** (`1302157225275643280`) and **accept** the
   TM-PE binding request from PE `1101455800000093984` (ReyKan IT)
   so it moves to **Approved**.
2. After that, on the MSG91 panel side, please ensure the AANGFM
   sender ID for our account is mapped to:
   - DLT Entity / Principal Entity ID = `1101455800000093984`
   - DLT Template (OTP) = `1107177660181979501`
3. If anything additional is required from our side (KYC,
   declaration, agreement upload), please share the checklist.

This is blocking real users — including reviewers from Google Play
and the Apple App Store — from logging into Aangan.

Thanks,
Kumar
Founder, ReyKan Information Technologies pvt Ltd
info@reykanit.com · +91 80504 07806

---

## Email 2 — to Vi DLT (Vilpower) Helpdesk (escalation L1)
**To:** support@vilpower.in
**Cc:** wasim.ahmed@vilpower.in, info@reykanit.com
**Subject:** Pending TM (`1302157225275643280` WALKOVER) under PE `1101455800000093984` (ReyKan IT / Aangan) — please expedite

Hello Vi DLT team,

Our Principal Entity on vilpower.in is fully set up:
- PE: ReyKan Information Technologies pvt Ltd, ID `1101455800000093984` (Reg# VI-1100093984), Approved
- Header AANGFM (DLT Header ID `1105177634147076603`), Approved 17-Apr-2026, Permanent
- All 6 Content Templates Approved (including OTP `1107177660181979501`)

However the Telemarketer **WALKOVER WEB SOLUTIONS PRIVATE LIMITED**
(TM ID `1302157225275643280`, Type: Both) we added against our PE on
27-Mar-2026 (or thereabouts) is showing **Pending** status, and as
a result we cannot create a PE-TM Chain (vilpower's
`/pe_tm_binding/addchain/` endpoint returns "Unable to process
request now." while TM is Pending). Without the chain, Vi telco
silently drops our SMS OTPs even though MSG91 accepts and forwards
them.

Could you please:
1. Confirm whether the Pending approval is awaited from
   Vi DLT operator side or from the Telemarketer (WALKOVER) side.
2. If from your side — kindly expedite.
3. If from WALKOVER — kindly indicate the standard SLA / escalation
   path so we can push WALKOVER (we have parallel email to
   support@msg91.com / WALKOVER).

This is blocking SMS OTP delivery for our app, and end-users
(including app store reviewers) cannot complete signup.

Thanks,
Kumar
Founder, ReyKan Information Technologies pvt Ltd
PE ID: `1101455800000093984` · Reg# VI-1100093984
info@reykanit.com · +91 80504 07806

---

## Vi DLT Escalation Matrix (in case L1 doesn't respond)
*(captured from vilpower.in/supportmatrix/ on [11:02am - 26Apr26])*

| Tier | When | Name | Phone | Email |
|---|---|---|---|---|
| L1 | 0–48 hrs | Group ID | 9619500900 | support@vilpower.in |
| L2 | > 48 hrs | Wasim Ahmed | 9154320201 | wasim.ahmed@vilpower.in |
| L3 | > 72 hrs | Rajender R | 9154320202 | rajender.r@vilpower.in |
| L4 | > 120 hrs | Sai Kishore | 9619218621 | saikishore.l@vodafoneidea.com |
| L5 | > 120 hrs | Alexander Mathai | 9702004207 | alexander.mathai@vodafoneidea.com |

---

## What NOT to do until WALKOVER moves to Approved + Chain is created

- **Do not** add `+919886146312` or any number to `REVIEWER_PHONES`
  in `supabase/functions/send-otp-sms/index.ts`.
- **Do not** populate `[auth.sms.test_otp]` in `supabase/config.toml`.
- **Do not** add Test phone numbers in Supabase Dashboard → Auth →
  Phone.
- **Do not** weaken the OTP flow as a temporary fix.

The path forward: WALKOVER TM moves to Approved → create PE-TM Chain
on vilpower → ensure MSG91 sender AANGFM is mapped to PE
`1101455800000093984` + OTP template `1107177660181979501` → real
SMS lands → done.
