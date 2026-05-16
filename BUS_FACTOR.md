# BUS_FACTOR.md — Aangan Founder-Redundancy

> "Bus factor = 1" means if Kumar gets hit by a bus tomorrow, Aangan goes
> dark forever. This file fixes that.

**Status:** ⚠️ Bus factor = **1** (only Kumar).
**Goal:** bus factor ≥ 2 (Kumar + 1 designated successor with shared vault).

[11:31pm - 15May26] · Initial draft. Re-review every 90 days.

---

## What only Kumar can do today (the "single point of failure" list)

Each row below is a credential, key, or relationship where Aangan stops
working if Kumar disappears.

| # | Asset | Who else has access | If lost | Mitigation |
|---|---|---|---|---|
| 1 | `aangan-release.keystore` (Android signing) | **NOBODY** | App Store update path forever broken; users must reinstall under new package | 1Password backup + SHA-256 fingerprint recorded (see `KEYSTORE_BACKUP_RUNBOOK.md`) |
| 2 | Apple Developer team — payment, primary admin | **Only Kumar** | Apps stop updating; TestFlight dies; iOS users get "app no longer available" after cert expiry | Add 1 family member as **Apple Account Holder backup** (free, ASC → Users) |
| 3 | Google Play Console — admin | **Only Kumar** | Same as above on Android | Add 1 Account Owner backup in Play Console |
| 4 | Supabase project — service-role key + DB password | **Only Kumar** | DB inaccessible; cron functions dead; account-delete endpoint dead | Vault entry + Supabase org member backup |
| 5 | MSG91 — auth key, sender ID, DLT bindings | **Only Kumar** | OTP-via-SMS dies; users can't sign in via phone | Vault entry + MSG91 multi-user (their dashboard allows secondary admins) |
| 6 | Vilpower DLT portal — PE ID `1100093984` | **Only Kumar** | New SMS templates blocked; can't recover deleted templates | Vault entry + add successor as DLT admin |
| 7 | Vercel — deploy access, env vars | **Only Kumar** | Production frozen at last deploy; no env rotations | Vercel team invite for successor (free, hobby team) |
| 8 | B2 (Backblaze) — bucket access keys for media | **Only Kumar** | Existing media keeps serving from CF cache; new uploads fail | Vault entry |
| 9 | Cloudflare — DNS, CDN, R2 | **Only Kumar** | DNS works (cached); changes/CDN purge dead | CF team-member invite |
| 10 | Twilio — fallback SMS auth | **Only Kumar** | Vi-DLT-failure email-OTP fallback breaks | Vault entry |
| 11 | Sentry — error stream access | **Only Kumar** | Crashes still captured but invisible | Sentry team invite |
| 12 | Zoho Mail — support@, info@, kumar@ | **Only Kumar** | Support email dies (users can't reach human) | Add `support@` forwarding to a successor address |
| 13 | Domain registrar (NameSilo) — aangan.app | **Only Kumar** | Domain expires on next renewal | Vault entry + auto-renew confirmed + heir clause |
| 14 | GitHub repo `aangan_app` — admin | **Only Kumar** | Code lives on, deploys still work (via Vercel webhook), but no new commits/PRs by successor | Add 1 collaborator with admin role |
| 15 | Razorpay (when launched) | **Only Kumar** | Refunds, payouts, KYC frozen | Add a successor as Razorpay sub-admin |

---

## The fix — three layers

### Layer 1: 1Password shared vault "Aangan Ops" (P0 — do this first)

1. Create a 1Password vault: `Aangan Ops` (or whatever password manager you use)
2. Populate one entry per row above with:
   - Login URL
   - Username / email
   - Password (or API key)
   - 2FA secret (TOTP), backup codes
   - Notes: what this credential controls, how to rotate
3. Add encrypted attachments where relevant: `aangan-release.keystore`, EAS service-account JSON, signing certs
4. Share the vault read-write with **one designated successor** — typically a trusted family member or co-founder. Until you pick a name, share with yourself on a second device (backup laptop + iPhone) so you survive single-device loss.
5. Document successor identity here:

| Successor | Relationship | Vault access | Email |
|---|---|---|---|
| _(to be assigned)_ | | | |

### Layer 2: Provider-level redundancy (P1 — do this within 30 days)

Where the platform supports it, add the successor as a team member at each
provider directly. This means the successor doesn't need to log in *as Kumar*
to act — they have their own credentials with appropriate role.

| Provider | Action | Tier | Time |
|---|---|---|---|
| Apple Developer | Add as Admin in https://developer.apple.com/account#/team | free | 5 min |
| Google Play | Add as Admin in Play Console → Setup → Users | free | 5 min |
| Supabase | Org → Add Member as Admin | free | 5 min |
| GitHub | Repo → Settings → Collaborators → Admin | free | 2 min |
| Vercel | Team → Invite as Member | free (Hobby) / $20 (Pro) | 2 min |
| Cloudflare | Team → Invite as Admin | free | 5 min |
| MSG91 | Dashboard → Users → Invite as Admin | free | 5 min |
| Sentry | Settings → Members → Invite as Admin | free | 5 min |
| Zoho Mail | Admin Console → Users → New User | free | 5 min |

### Layer 3: A written "Incident handover" doc (P2 — within 90 days)

A `HANDOVER.md` that lives in the repo describing:
- What Aangan does (1 paragraph)
- Tech stack overview (already in `AANGAN_PRD.md` and `CLAUDE.md`)
- Critical runbooks: how to deploy, how to roll back, how to rotate keys
- Active customer-impacting bugs / known issues
- "First 24 hours" checklist for a successor: log in to ASC + Play, rotate any
  shared secrets, post a "still here" message to existing users

---

## Self-check (Kumar, every quarter)

- [ ] Vault entries up-to-date (no stale passwords from rotations)
- [ ] Successor still has access (test login works, 2FA still works)
- [ ] `aangan-release.keystore` SHA-256 fingerprint matches what's in vault
- [ ] At least one provider (start with Apple) actually has the successor invited
- [ ] HANDOVER.md is < 6 months old

---

## Background

CEO Review 2026-05-08 flagged this risk across CTO + CFO + COO independently:
> "Single-founder bus factor on Supabase service-role / MSG91 / vilpower.in /
> ASC creds. Mitigation: founder-redundancy vault."

The single-founder pattern is the single largest unmitigated existential risk
in the business. Every other risk in the CEO review can be retried — this one
cannot.
