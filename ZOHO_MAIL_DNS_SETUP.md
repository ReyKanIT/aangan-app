# Zoho Mail — aangan.app DNS Setup on BigRock

> Prep: after you sign up at workplace.zoho.in and add `aangan.app` as a
> domain, Zoho will ask you to add DNS records. These are the ones.
>
> DNS provider: **BigRock** (manage.bigrock.in → My Orders → aangan.app → DNS / Manage DNS)

---

## Important: pick data centre first

During the Zoho signup / domain-add step, Zoho asks which data centre to
host mail in. Pick **India (.in)** — lower latency for Indian users, cheaper
data egress, and your MX records will be the `.in` variants below.

If you accidentally pick **Global (.com)**, swap every `.in` below to `.com`
(e.g., `mx.zoho.com` instead of `mx.zoho.in`). Everything else is identical.

---

## Records to add on BigRock

### ⚠️ Step A — Domain ownership verification (FIRST, before MX)

Zoho will show you a string like `zb12345xyz67890` and tell you "Add this as
a TXT record on `@`". You can't proceed to MX setup until this verifies.

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| TXT | `@` | `zb<HASH_FROM_ZOHO>` | `1800` |

**Where Zoho shows this value:** after you add `aangan.app` as a domain, Zoho
opens a "Verify domain ownership" screen with the exact string + a button
"Verify". Copy the string → paste into BigRock → wait ~2-5 min → click
Verify back in Zoho.

---

### Step B — MX records (email routing)

Three records, all on the apex (host = `@`). **Delete any existing MX
records first** (e.g., leftover from a past registrar setup) — Zoho will
only deliver if its own three MX are the only MXs on the domain.

| Type | Host / Name | Priority | Destination | TTL |
|---|---|---|---|---|
| MX | `@` | `10` | `mx.zoho.in` | `1800` |
| MX | `@` | `20` | `mx2.zoho.in` | `1800` |
| MX | `@` | `50` | `mx3.zoho.in` | `1800` |

In BigRock's "Add DNS Record" form:
- **Type:** MX
- **Host Name:** leave blank or type `@` (BigRock treats both as apex)
- **Value / Destination:** the hostname (`mx.zoho.in`) — no trailing dot
- **Priority:** the number from the Priority column
- **TTL:** 1800 (30 min) is fine; BigRock's default 3600 also works

Add all three, save, wait 10-30 min for propagation.

---

### Step C — SPF (sender policy)

One TXT record on the apex. **If you already have an SPF record, merge —
don't add a second one.** Multiple SPF records break authentication.

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:zohomail.in ~all` | `1800` |

**If you later add other senders** (Vercel transactional, Sentry, SendGrid,
MSG91 for email, etc.), update this single record to merge:

```
v=spf1 include:zohomail.in include:_spf.vercel.com include:sendgrid.net ~all
```

For now, Zoho-only is correct.

---

### Step D — DKIM (email signing)

Zoho generates a unique public key per domain and shows you the exact value
**after** domain verification succeeds. It's a long base64 blob.

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=<LONG_KEY_FROM_ZOHO>` | `1800` |

**Where Zoho shows this:** after Step A verifies, the Zoho Admin Console
→ **Email Configuration → Email Authentication → DKIM → Manage** →
"Add Record" reveals the selector (usually `zmail`) and the public key.

BigRock's TXT value field has a 255-char limit per segment; Zoho's DKIM
keys are typically ~400 chars. BigRock handles this automatically by
splitting into multiple strings — just paste the full value and save.

---

### Step E — DMARC (policy for rejected/failed emails)

Start with `quarantine` (recommended) so Gmail/Outlook sideline suspicious
spoofs instead of outright rejecting. Once you've watched a week of
rua reports and confirmed SPF+DKIM pass for all legitimate senders,
tighten to `reject`.

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@aangan.app; ruf=mailto:postmaster@aangan.app; sp=quarantine; adkim=s; aspf=s; pct=100` | `1800` |

**What that string means, line by line:**
- `v=DMARC1` — version marker
- `p=quarantine` — if SPF and DKIM both fail, send to spam (not reject)
- `rua=mailto:postmaster@aangan.app` — aggregate reports sent here daily
- `ruf=mailto:postmaster@aangan.app` — forensic reports on failures
- `sp=quarantine` — same policy for subdomains
- `adkim=s` — strict DKIM alignment (domain must match exactly)
- `aspf=s` — strict SPF alignment
- `pct=100` — apply policy to 100% of mail

You'll need to create `postmaster@aangan.app` as a mailbox (or alias to
`support@aangan.app`) inside Zoho so those reports actually go somewhere.

---

## Suggested mailbox list (5 free slots)

Inside Zoho Admin Console → **Users** → Add, create:

| Mailbox | Purpose | Display Name |
|---|---|---|
| `support@aangan.app` | Public support inbox (also used in /support page + DLT registration) | Aangan Support |
| `no-reply@aangan.app` | Transactional outgoing (feedback forms, OTP fallback, system emails) | Aangan Notifications |
| `hello@aangan.app` | Press / partnerships / general inbound | Aangan Team |
| `kumar@aangan.app` | Your personal ops mailbox | Amit Kumar |
| `postmaster@aangan.app` | DMARC reports + abuse contact (RFC 2142 requirement) | Postmaster |

That's 5/5 on the free plan. Can add aliases later if you upgrade to
Mail Lite (₹12/user/month).

---

## BigRock-specific gotchas

1. **DNS panel location:** login to bigrock.in → **My Orders** → row for
   `aangan.app` → **Manage Order** → scroll to **DNS Management** or
   **Manage DNS**. If the domain shows "DNS Managed by: Parking Name
   Servers" you need to switch to BigRock DNS first (Edit Name Servers →
   use BigRock defaults).
2. **Apex host:** BigRock uses `@` or blank — both work.
3. **TXT quoting:** don't wrap values in quotes; BigRock adds them
   automatically.
4. **Propagation:** 10-30 min typical, occasionally up to 2 hours. Check
   with `dig aangan.app MX` from terminal:
   ```
   dig aangan.app MX +short
   dig aangan.app TXT +short
   dig zmail._domainkey.aangan.app TXT +short
   dig _dmarc.aangan.app TXT +short
   ```
5. **Web records are untouched:** your existing A / CNAME records for
   `@` (website), `www`, `media`, etc. stay as-is. Email DNS records
   (MX, SPF, DKIM, DMARC) live alongside them without conflict.

---

## Order of operations summary

1. Sign up on Zoho Workplace (form you're on now) → verify email + mobile
2. Add `aangan.app` as a domain → Zoho shows Step A (ownership TXT)
3. BigRock: add the TXT from Step A → wait 2-5 min → click "Verify" in Zoho
4. BigRock: add the three MX records from Step B → save
5. BigRock: add SPF TXT from Step C
6. Zoho Admin Console → Email Authentication → DKIM → generate key →
   BigRock: add TXT from Step D
7. BigRock: add DMARC TXT from Step E
8. Zoho Admin Console → Users → create the 5 mailboxes
9. Log in to `support@aangan.app` via mail.zoho.in → send test mail to
   your personal gmail → confirm received with SPF/DKIM pass (check
   raw headers: `Authentication-Results` line)
10. Reply to the test mail from gmail → confirm it lands in Zoho

Total time, start to working mailbox: **30-45 minutes**.

---

*Drafted [8:30am - 18Apr26] · For Aangan v0.9.13 · DNS: BigRock · Mail: Zoho Workplace Forever Free*
