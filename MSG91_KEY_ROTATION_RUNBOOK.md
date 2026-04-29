# MSG91 Auth Key Rotation Runbook

**Issued:** `[7:42pm - 29Apr26]`
**Status:** 🔴 P0 — execute before any new prod traffic.
**Why:** The MSG91 auth key (`505756...`) was committed in git at `archive/SUPABASE_SETUP_GUIDE.md:120` (commit `2bd3679`). Treat as compromised. Removing the file from the working tree is not enough — the value is in git history forever.

This runbook is the **authoritative recovery procedure**. Do not skip steps.

---

## Step 0 — preconditions (5 min)

- [ ] You can log in to https://control.msg91.com (Kumar's MSG91 account, ReyKan IT)
- [ ] You have Supabase project access (`okzmeuhxodzkbdilvkyu`) with permission to set secrets
- [ ] You have your password manager (1Password / Bitwarden) open
- [ ] No active SMS-OTP in flight for any prod user (rotation invalidates the key for ~1–2 min)

---

## Step 1 — rotate in MSG91 (5 min)

1. Log in to https://control.msg91.com.
2. Navigate to **API** → **API & Webhooks** (or top-right user menu → **API Keys**).
3. Locate the active auth key beginning with `505756…`. Confirm it matches the leaked value before proceeding.
4. Click **Regenerate** (or **Disable** + **Create new**).
5. Copy the **NEW** auth key to your password manager. Update the `MSG91 — Auth Key` entry; mark the old key as `revoked 2026-04-29` in the entry's notes.
6. Verify the old key is now disabled — `curl` test (optional):
   ```bash
   curl -X GET "https://control.msg91.com/api/v5/sms/credits" \
     -H "authkey: 505756AQEhXpC30Xnc69d0aaf2P1"
   # Expect 401 / 403. If you get a 200, the old key is still live — escalate to MSG91 support.
   ```

---

## Step 2 — update Supabase secret (3 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
npx supabase secrets set \
  MSG91_AUTH_KEY="<NEW_KEY_FROM_STEP_1>" \
  --project-ref okzmeuhxodzkbdilvkyu

# Verify it was set (value will be masked):
npx supabase secrets list --project-ref okzmeuhxodzkbdilvkyu | grep MSG91_AUTH_KEY
```

Re-deploy the edge function so the new secret is in flight (Supabase secrets are pulled at function cold-start; force a refresh):

```bash
npx supabase functions deploy send-otp-sms --project-ref okzmeuhxodzkbdilvkyu --no-verify-jwt
```

---

## Step 3 — smoke test (5 min)

On the live web app or RN app:

1. Trigger an OTP for Kumar's test phone (`9886146312`).
2. Verify SMS arrives within 5 s.
3. Complete login.

If the SMS does not arrive:

- Check Supabase Dashboard → Edge Functions → `send-otp-sms` → Logs. Look for `MSG91 401 Unauthorized` (key not propagated) or `MSG91_AUTH_KEY env not set`.
- Re-run Step 2 if needed.
- Cross-check by hitting MSG91 API manually:
  ```bash
  curl -X POST "https://control.msg91.com/api/v5/flow" \
    -H "authkey: <NEW_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"template_id": "<TEMPLATE_ID>", "sender": "AANGFM", "mobiles": "919886146312", "var1": "123456"}'
  ```

---

## Step 4 — git history scrub (optional, 10 min)

The leaked key is in git history. Two paths:

**Option A — accept the leak, rely on rotation (recommended for solo founder).**
- Old key is dead → no real exposure.
- Add a note in `CREDENTIALS.md` describing the 2026-04-29 rotation.
- Move on.

**Option B — rewrite history with `git filter-repo` (only if planning to open-source the repo).**

```bash
# Backup first
cp -r /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App /tmp/aangan_backup_$(date +%s)

# Install filter-repo if not present
brew install git-filter-repo

# Scrub the value across all history
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
git filter-repo --replace-text <(echo '505756AQEhXpC30Xnc69d0aaf2P1==>REDACTED_2026-04-29')

# Force-push (DESTRUCTIVE — coordinate with any collaborators)
git push --force origin main
git push --force origin --tags
```

⚠️ Option B rewrites every commit hash. If you have any branches, PRs, or tags pinned to old SHAs, they break.

---

## Step 5 — close the loop (2 min)

- [ ] Mark Kumar-only task **T03** done in `PRODUCTION_AUDIT_2026-04-29.md`.
- [ ] Add a one-line entry in `CREDENTIALS.md` (gitignored): `MSG91 auth key rotated 2026-04-29 due to git leak. Old key 505756* dead.`
- [ ] Verify nothing else needs action: `git grep "505756AQEhXpC30Xnc69d0aaf2P1"` should return zero results outside of this runbook (and any postmortem files).

---

## Future prevention

1. Add a pre-commit secret scanner (`gitleaks` or `trufflehog`).
2. Move `CREDENTIALS.md` to a 1Password Document — replace the file with a pointer.
3. Audit all `archive/` content for embedded secrets quarterly.

---

## Recovery if the new key also leaks

Repeat steps 1–3. MSG91 allows unlimited regenerations. The DLT registration, sender ID, and template approvals stay intact across rotations — only the auth key changes.
