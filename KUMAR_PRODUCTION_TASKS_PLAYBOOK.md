# Kumar's Production Tasks Playbook

**Issued:** `[8:13pm - 29Apr26]`
**Total time if everything goes smoothly:** ~90 minutes
**Sequence:** sequenced from most-critical to least. Do them in order.

> **Resume context:** the wider audit + task tracker lives in [PRODUCTION_AUDIT_2026-04-29.md](PRODUCTION_AUDIT_2026-04-29.md). The five tasks below are the Kumar-only items (T03, T09, T12, T26, T33). Mark each as `[x]` in the audit doc as you complete it.

---

## ✅ Task 1 — Rotate MSG91 auth key — DONE 2026-04-30 ~01:55 IST

Completed in-session via Chrome browser automation. New key `AanganAPIv2` (5057…4aP1) is the active key in both MSG91 and Supabase. Old `AanganAPIKey` is disabled. Leaked git-history key `505756…f2P1` returns HTTP 401 on `/api/v5/sms/credits`. **No further action needed.**

Original procedure preserved below for reference.

---

(Original)

The key `505756…` is leaked in git history. Rotate first; everything else can wait.

### Step 1.1 — Get the new key (5 min)

1. Open https://control.msg91.com → log in as Kumar.
2. Top-right user menu → **API & Webhooks** (or **API Keys**).
3. Find the active key starting with `505756` — confirm it matches the one in your password manager.
4. Click **Regenerate** (or **Disable + Create new**).
5. Copy the new key.
6. Open 1Password → find your `MSG91 — Auth Key` entry → paste the new key → in notes add: `Rotated 2026-04-29. Old key 505756* DEAD.` → Save.

**Check the old key is dead** — paste this in Terminal (it will use the leaked old key, expect 401):
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "https://control.msg91.com/api/v5/sms/credits" \
  -H "authkey: 505756AQEhXpC30Xnc69d0aaf2P1"
```
**Expected:** `HTTP 401` or `HTTP 403`. If you see `HTTP 200`, the old key is still live — go back to step 4.

### Step 1.2 — Update Supabase Edge Function secret (3 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
npx supabase secrets set \
  MSG91_AUTH_KEY="<paste-new-key-here>" \
  --project-ref okzmeuhxodzkbdilvkyu
```

Verify it's set (value will be masked):
```bash
npx supabase secrets list --project-ref okzmeuhxodzkbdilvkyu | grep MSG91_AUTH_KEY
```

Force the edge function to pick up the new secret (secrets are read at cold-start):
```bash
npx supabase functions deploy send-otp-sms --project-ref okzmeuhxodzkbdilvkyu --no-verify-jwt
```

### Step 1.3 — Smoke test (5 min)

1. Open https://aangan.app/login on your phone.
2. Enter `9886146312` → tap **Send OTP**.
3. Within 5 seconds you should get an SMS from `AANGFM` with a 6-digit code.
4. Complete the login.

**If the SMS doesn't arrive within 30s:**
- Open Supabase Dashboard → Edge Functions → `send-otp-sms` → Logs.
- Look for `MSG91 401 Unauthorized` (key not propagated — rerun Step 1.2) or `MSG91 secrets not configured`.

### Step 1.4 — Mark done in audit doc (1 min)

Open [PRODUCTION_AUDIT_2026-04-29.md](PRODUCTION_AUDIT_2026-04-29.md) → §3 → change `[k] **T03**` to `[x] **T03**`.

---

## 🟥 Task 2 — Back up the Android keystore off-machine (15 min)

Lose `aangan-release.keystore` and you can never update the Play Store app. Two backups in different locations.

### Step 2.1 — Verify the keystore is still good (1 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn
ls -la aangan-release.keystore credentials.json
```
Both files must exist. If either is missing, **STOP** and tell me before continuing.

Get the SHA-256 fingerprint (used to verify any restored copy):
```bash
KEYPW=$(grep -m1 keystorePassword credentials.json | sed 's/.*"\([^"]*\)".*/\1/')
keytool -list -v -keystore aangan-release.keystore -storepass "$KEYPW" | grep "SHA-256"
```
Note the SHA-256 fingerprint — paste it into your password manager later.

### Step 2.2 — Backup #1: 1Password Document (5 min)

1. Open the **1Password desktop app** (the web version doesn't support file attachments well).
2. Click **+ New Item** → **Document**.
3. Title: `Aangan — Android Release Keystore (PKCS12)`
4. Vault: your personal vault (or create a new "Aangan" vault).
5. **Attach files**: drag both `aangan-release.keystore` AND `credentials.json` from `aangan_rn/` into the item.
6. In the **Notes** field, paste:
```
Generated: 2026-04-29
Package:   app.aangan.family
Alias:     aangan-key
SHA-256:   <paste fingerprint from Step 2.1>
Restore path: aangan_rn/aangan-release.keystore
```
7. **Save**.

### Step 2.3 — Backup #2: encrypted DMG on iCloud Drive (5 min)

```bash
cd /tmp && mkdir aangan-keystore-backup
cp /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/aangan-release.keystore aangan-keystore-backup/
cp /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/credentials.json aangan-keystore-backup/

# This will prompt for a strong password — store it in 1Password as
# "Aangan — Keystore DMG password" so future-you can mount it:
hdiutil create -volname "AanganKeystore" -srcfolder aangan-keystore-backup \
    -fs HFS+ -encryption AES-256 -format UDZO \
    "$HOME/Library/Mobile Documents/com~apple~CloudDocs/aangan-keystore-2026-04-29.dmg"

rm -rf aangan-keystore-backup
```

Verify it works — mount once, confirm files visible, eject:
```bash
open "$HOME/Library/Mobile Documents/com~apple~CloudDocs/aangan-keystore-2026-04-29.dmg"
# Enter the DMG password → finder window opens → confirm both files are there
# Then: right-click the AanganKeystore disk in Finder sidebar → Eject
```

Wait 30 seconds for iCloud to sync the DMG to the cloud.

### Step 2.4 — Mark done

Open `PRODUCTION_AUDIT_2026-04-29.md` → mark `T09` as `[x]`.

---

## 🟥 Task 3 — Apply Supabase SQL migrations (20 min)

Six migrations need to land in this exact order. Run each in **Supabase Dashboard → SQL Editor** (not via CLI — safer because you see results inline).

### Step 3.1 — Open prod Supabase (1 min)

1. https://app.supabase.com → project `okzmeuhxodzkbdilvkyu`.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open a second tab on **Database** → **Tables** so you can verify after each migration.

### Step 3.2 — Apply, in order

For each file below: open the file, copy-paste its full contents into SQL Editor, click **Run**, confirm "Success" + read any `NOTICE` output.

1. **`supabase/migrations/20260429b_users_rls_lockdown_phase_a.sql`** — closes the public phone-directory leak.
   - **Verify after running**:
     ```sql
     SELECT 1 FROM information_schema.role_table_grants
     WHERE grantee = 'anon' AND table_schema = 'public' AND table_name = 'users';
     -- expected: 0 rows
     ```

2. **`supabase/migrations/20260429c_audience_rls_lockdown.sql`** — gates comments/reactions/stories by parent post visibility.
   - **Verify**:
     ```sql
     SELECT polname FROM pg_policy
     WHERE polrelid = 'public.post_comments'::regclass;
     -- expected: includes "comments visible iff parent post visible"
     ```

3. **`supabase/migrations/20260429d_notification_insert_hardening.sql`** — recipient-validation on notifications.

4. **`supabase/migrations/20260429e_search_path_hardening.sql`** — locks search_path on every SECURITY DEFINER function.
   - **Verify**:
     ```sql
     SELECT n.nspname || '.' || p.proname AS fn, p.proconfig
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef = TRUE
       AND (p.proconfig IS NULL OR NOT EXISTS (
           SELECT 1 FROM unnest(p.proconfig) c WHERE c LIKE 'search_path=%'
       ));
     -- expected: 0 rows
     ```

5. **`supabase/migrations/20260429f_indexes_corrected.sql`** — perf indexes that the broken v0.2.2 never created.

6. **`supabase/migrations/20260429g_storage_bucket_limits.sql`** — file-size + MIME guards.
   - **Verify**:
     ```sql
     SELECT id, public, file_size_limit, allowed_mime_types
     FROM storage.buckets ORDER BY id;
     -- expected: every row has non-null file_size_limit and allowed_mime_types
     ```

**⚠️ DO NOT apply `20260429h_events_date_typing_NEEDS_CONFIRM.sql`** — see Task 4.

### Step 3.3 — Configure new edge function secrets

The hardened edge functions need new env vars. From your terminal:

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App

# 1. Webhook secret for send-otp-sms (Supabase Auth uses this; copy the
#    value from Supabase Dashboard → Authentication → Hooks → Send SMS hook,
#    look for the "Secret" field):
npx supabase secrets set SUPABASE_WEBHOOK_SECRET="<paste-from-auth-hooks>" \
  --project-ref okzmeuhxodzkbdilvkyu

# 2. Cron secret for daily-reminders. Generate one:
CRON=$(openssl rand -hex 32)
echo "CRON_SECRET = $CRON   (save this in 1Password)"
npx supabase secrets set CRON_SECRET="$CRON" --project-ref okzmeuhxodzkbdilvkyu

# 3. Shared secret for rate-limit pre-auth path:
RL=$(openssl rand -hex 32)
echo "RATE_LIMIT_SHARED_SECRET = $RL   (save this in 1Password)"
npx supabase secrets set RATE_LIMIT_SHARED_SECRET="$RL" \
  --project-ref okzmeuhxodzkbdilvkyu

# 4. Redeploy all three edge functions to pick up the new secrets:
npx supabase functions deploy send-otp-sms   --project-ref okzmeuhxodzkbdilvkyu --no-verify-jwt
npx supabase functions deploy audit-log      --project-ref okzmeuhxodzkbdilvkyu
npx supabase functions deploy rate-limit     --project-ref okzmeuhxodzkbdilvkyu
npx supabase functions deploy daily-reminders --project-ref okzmeuhxodzkbdilvkyu --no-verify-jwt
npx supabase functions deploy send-push      --project-ref okzmeuhxodzkbdilvkyu
```

### Step 3.4 — Smoke test prod

1. Login with `9886146312` on aangan.app — OTP arrives, login completes.
2. Open `/feed` — your posts visible.
3. Open `/family` — search a family member by name → confirm results show (this exercises the new `search_users_safe` RPC; if the search returns 0 results when there should be matches, the RPC didn't deploy — re-run migration `b`).
4. Open Supabase Dashboard → Logs → search for any `42501` errors in the last 5 min — those are RLS denials and indicate something the app expected to read is now blocked. If you see them, screenshot and ping me.

### Step 3.5 — Mark done

`PRODUCTION_AUDIT_2026-04-29.md` → mark `T12` as `[x]`.

---

## 🟨 Task 4 — Reconcile event_date schema drift (10 min, then optional migration)

The audit found that `aangan_web` reads `start_datetime` (TIMESTAMPTZ) but `aangan_rn` reads `event_date`. Schema declares `event_date TEXT`. Don't apply migration `h` until you confirm what's actually in prod.

### Step 4.1 — Diagnose (3 min)

In Supabase SQL Editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events'
  AND column_name IN ('event_date', 'end_date', 'rsvp_deadline', 'start_datetime', 'start_time')
ORDER BY column_name;
```

You'll see one of three outcomes:

| Result | What it means | What to do |
|---|---|---|
| Only `event_date` (text) and `end_date`, `rsvp_deadline` rows | Schema matches the file. Web app has been silently broken. | Migration `h` is safe to apply — it converts TEXT → TIMESTAMPTZ. Then update the **web app** in a follow-up to read `event_date` instead of `start_datetime`. |
| Both `event_date` AND `start_datetime` | Out-of-band SQL editor change added `start_datetime`. | Pick one. Either drop `event_date`, or drop `start_datetime` + fix web. **Don't apply migration h** — it doesn't handle the dual-column case. Tell me which way you want to go. |
| Only `start_datetime` (no `event_date`) | Out-of-band rename. | Migration `h` is irrelevant — already done. Update **RN** to read `start_datetime`. **Don't apply migration h.** |

### Step 4.2 — Decide + execute

**If outcome 1**: in SQL Editor, paste + run `supabase/migrations/20260429h_events_date_typing_NEEDS_CONFIRM.sql`. Then ping me — I'll fix the web app's reads in a separate commit.

**If outcome 2 or 3**: paste the diagnosis output back to me. I'll write a tailored migration based on what's actually there.

### Step 4.3 — Mark done

`PRODUCTION_AUDIT_2026-04-29.md` → mark `T33` based on outcome.

---

## 🟨 Task 5 — EAS submit setup + Sentry RN install (30 min)

Required before any iOS App Store submission. Android Play Store submission also needs the service-account JSON.

### Step 5.1 — iOS App Store Connect (15 min)

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**:
   - Platform: **iOS**
   - Name: `Aangan आँगन`
   - Bundle ID: `app.aangan.family` (must match `aangan_rn/app.json:18`)
   - SKU: `aangan-ios-001`
   - User Access: Full Access
2. Save. Open the app's **App Information** page.
3. Copy the **Apple ID** (a 10-digit numeric, NOT your email — usually labeled "Apple ID:" near the top).
4. Open https://developer.apple.com/account → **Membership** → copy the **Team ID** (10 alphanumeric chars, e.g. `7T8KZX9P3R`).
5. Edit `aangan_rn/eas.json` lines 73-77:
```json
"ios": {
  "appleId": "kumar@reykan.in",
  "ascAppId": "1234567890",
  "appleTeamId": "7T8KZX9P3R"
}
```
6. **App Privacy** in App Store Connect → answer the data-collection questionnaire. Aangan collects: Name (display name), Phone Number, Photos, User Content (posts + voice), Identifiers (push token). Mark each as "Used for App Functionality" + "Linked to User".

### Step 5.2 — Google Play service account (10 min)

1. https://console.cloud.google.com → select your "Aangan" project (or create one).
2. **IAM & Admin** → **Service Accounts** → **Create Service Account**:
   - Name: `aangan-eas-submit`
3. Click **Done**, then click the new service account → **Keys** → **Add Key** → **Create new key** → **JSON**.
4. Save the downloaded file as `play-service-account.json` in the right place:
```bash
mv ~/Downloads/<your-downloaded-file>.json \
   /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/play-service-account.json
```
5. Confirm it's gitignored:
```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
git check-ignore aangan_rn/play-service-account.json
# expected: prints the path (means it IS ignored)
```
If nothing prints, add it: `echo "play-service-account.json" >> aangan_rn/.gitignore`.
6. Back up `play-service-account.json` to 1Password the same way you did the keystore in Task 2.
7. https://play.google.com/console → **Setup** → **API access** → **Link** the Google Cloud project → find `aangan-eas-submit` → **Grant access**: check **Release apps to testing tracks** + **Edit and delete draft apps + tracks** → **Apply** + **Invite user**.

### Step 5.3 — Sentry RN install (5 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn
npx expo install @sentry/react-native
```

This patches `app.json` and adds the dep. Now create a Sentry project:
1. https://sentry.io → **Create Project** → React Native → name `aangan-rn`.
2. Copy the **DSN** (`https://...@o....ingest.sentry.io/...`).
3. Add to your password manager as `Sentry Aangan RN DSN`.
4. Add to EAS env vars:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "<paste-DSN>"
```

### Step 5.4 — Verify everything (5 min)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn
grep -c "REPLACE_WITH" eas.json && echo "❌ placeholders remaining" || echo "✓ no placeholders"
test -f play-service-account.json && echo "✓ Play service account JSON present" || echo "❌ missing"
grep -q '"@sentry/react-native"' package.json && echo "✓ Sentry dep installed" || echo "❌ Sentry not installed"
```

All four checks should print ✓.

### Step 5.5 — Commit the eas.json + package.json changes

These changes are safe to commit (the service-account JSON itself is gitignored — only its path is in eas.json):
```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
git add aangan_rn/eas.json aangan_rn/package.json aangan_rn/package-lock.json aangan_rn/app.json
git commit -m "chore(rn): wire EAS Apple submit IDs + install Sentry"
git push origin main
```

### Step 5.6 — Mark done

`PRODUCTION_AUDIT_2026-04-29.md` → mark `T26` as `[x]`.

---

## When all 5 tasks are done

You're production-ready. Build mobile + submit:
```bash
cd aangan_rn
eas build --platform android --profile production
# wait ~15 min
eas submit --platform android --latest

eas build --platform ios --profile production
eas submit --platform ios --latest
```

If anything in the playbook errors, paste the full error back to me and I'll diagnose. The diagnosis output for Task 4 in particular needs me to look at it — don't guess.

---

## Quick checklist (for re-opening this doc later)

- [ ] **Task 1** — MSG91 key rotated (T03)
- [ ] **Task 2** — Keystore backed up to 1Password + iCloud DMG (T09)
- [ ] **Task 3** — Migrations b/c/d/e/f/g applied + edge function secrets set + smoke tested (T12)
- [ ] **Task 4** — event_date schema drift diagnosed and resolved (T33)
- [ ] **Task 5** — EAS Apple IDs filled, Play service account placed, Sentry installed (T26)
- [ ] Mobile EAS production build kicked off
- [ ] Play Store + Indus + iOS submissions filed
