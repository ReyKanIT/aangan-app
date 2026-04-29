# EAS Submit Setup Runbook (iOS + Android)

**Issued:** `[7:55pm - 29Apr26]`
**Status:** 🟡 P1 — required before any first store submission. EAS *build* works without these; EAS *submit* fails until they're filled.
**Why:** `aangan_rn/eas.json:69-77` currently has placeholder strings (`REPLACE_WITH_APPLE_ID_EMAIL`, `REPLACE_WITH_ASC_APP_ID`, `REPLACE_WITH_TEAM_ID`) and references `./play-service-account.json` which does not exist on disk.

---

## What's missing

| Field | Where | Type | Value |
|---|---|---|---|
| `submit.production.ios.appleId` | eas.json:74 | Apple ID email | `kumar@reykan.in` (or whichever Apple ID owns the App Store Connect app record) |
| `submit.production.ios.ascAppId` | eas.json:75 | Numeric App Store Connect App ID | obtained from App Store Connect → Apps → Aangan → App Information → Apple ID |
| `submit.production.ios.appleTeamId` | eas.json:76 | 10-char Apple Developer Team ID | obtained from https://developer.apple.com/account → Membership → Team ID |
| `submit.production.android.serviceAccountKeyPath` | eas.json:69 | Path to JSON | `./play-service-account.json` — file MUST exist locally, gitignored |

---

## Step 1 — iOS (Apple side, ~30 min)

### a. Create the App Store Connect app record (if not already)

1. Go to https://appstoreconnect.apple.com → My Apps → "+" → New App.
2. Fill:
   - Platform: iOS
   - Name: `Aangan आँगन`
   - Bundle ID: `app.aangan.family` (must match `aangan_rn/app.json:18`)
   - SKU: `aangan-ios-001`
3. Save.
4. Copy the **Apple ID** (the long numeric ID shown on App Information page — NOT the bundle ID, NOT your email).

### b. Find your Team ID

1. Go to https://developer.apple.com/account → Membership.
2. Copy the **Team ID** (10 alphanumeric characters, e.g. `7T8KZX9P3R`).

### c. Update eas.json

Replace lines 73–77:
```json
"ios": {
  "appleId": "kumar@reykan.in",
  "ascAppId": "1234567890",
  "appleTeamId": "7T8KZX9P3R"
}
```

### d. Configure App Privacy + Data Safety

In App Store Connect → Aangan → App Privacy → answer all data-collection questions. Aangan collects: Name (display name), Phone Number (for OTP), Photos, User Content (posts + voice messages), Identifiers (device ID for push). Mark "Used for App Functionality" and "Linked to User" for all.

### e. Verify with a test submit (build first)

```bash
cd aangan_rn
eas build --platform ios --profile production
# wait ~15 min for the cloud build
eas submit --platform ios --latest
```

If `eas submit` errors with "Apple ID not found" or "Team ID does not match certificate" — the values in eas.json are wrong. Re-check Step 1b.

---

## Step 2 — Android (Google side, ~20 min)

### a. Create a Google Play service account

1. Go to https://console.cloud.google.com → select your "Aangan" project (create one if it doesn't exist).
2. **IAM & Admin** → **Service Accounts** → **Create Service Account**.
   - Name: `aangan-eas-submit`
   - Description: `EAS upload service account for Aangan`
3. **Done** (skip the optional steps).
4. Click the created service account → **Keys** → **Add Key** → **Create new key** → **JSON**. Save the downloaded file as **`play-service-account.json`**.

### b. Grant the service account Play Console access

1. Go to https://play.google.com/console → Setup → API access.
2. Click **Link** next to your Google Cloud project (the one that hosts the service account).
3. Find the `aangan-eas-submit` service account in the list → **Grant access**.
4. Permissions: at minimum check **Release apps to testing tracks** + **Edit and delete draft apps + tracks**. For automated production releases, also **Release to production**.
5. **Apply** + **Invite user**.

### c. Place the JSON in the right spot

```bash
mv ~/Downloads/<your-downloaded-key>.json /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn/play-service-account.json

# Confirm gitignore covers it (already in aangan_rn/.gitignore via *.json catchall? if not, add):
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_rn
grep play-service-account.json .gitignore || echo "play-service-account.json" >> .gitignore
```

### d. Verify

```bash
cd aangan_rn
eas build --platform android --profile production
eas submit --platform android --latest
```

If submit errors with "Service account not found" or "Insufficient permissions" — re-check Step 2b.

---

## Step 3 — store the JSON safely

`play-service-account.json` is a credential — back it up the same way as the keystore (1Password Document + offline copy). See `KEYSTORE_BACKUP_RUNBOOK.md` Steps 2–3 for the pattern.

---

## Step 4 — post-setup verification

After both Steps 1 and 2 complete:

```bash
cd aangan_rn
cat eas.json | grep -E "REPLACE_WITH" || echo "✓ no placeholders remaining"
test -f play-service-account.json && echo "✓ Play service account JSON present"
```

Both checks should pass before declaring T26 done in `PRODUCTION_AUDIT_2026-04-29.md`.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Apple ID requires app-specific password` | Apple now requires 2FA → app-specific password for non-interactive login | Generate at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords; pass via `EAS_APPLE_APP_SPECIFIC_PASSWORD` env var or `eas submit --platform ios --apple-app-specific-password` |
| `Service account not authorized` | Play Console invite not yet accepted | In Play Console → Setup → API access, confirm the service account row says "Status: Active" |
| `bundle identifier mismatch` | `aangan_rn/app.json:18` differs from App Store Connect bundle ID | Make them match exactly (case-sensitive) |
| `track 'production' is closed for new versions` | Play Console internal review pending | Use `track: 'internal'` in eas.json (already the default) until you're ready for production roll-out |

---

## When done, also do:

- Update `aangan_rn/eas.json` (this lives in git, so the values *are* committed — that's expected; only the service-account JSON is secret).
- Commit: `git commit -m "chore: fill EAS Apple submit fields + Play service account path"`.
- Mark T26 done in `PRODUCTION_AUDIT_2026-04-29.md`.
