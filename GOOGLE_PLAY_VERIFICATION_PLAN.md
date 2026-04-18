# Google Play — Android Developer Verification Action Plan

> Triggered by Play Console email to ReyKan (17 Apr 2026)
> Hard deadline: **September 2026** — unregistered apps become uninstallable
> on certified Android devices after that date.

---

## What the email actually means

Google announced a new "Android developer verification" framework that ties
**every Android app** (including ones distributed outside Play) to a verified
developer identity. After Sept 2026, a `<package_name, signing_key>` pair that
isn't registered in Play Console can't be installed on certified Android
devices in the rollout countries (India is in the first wave).

The email confirms **your Play-distributed app was auto-registered**. What's
NOT auto-handled is **apps you distribute outside Play** — which for Aangan
means:

1. APK hosted at `https://media.aangan.app/releases/Aangan-v0.9.0.apk`
2. Indus App Store listing at `https://store.indusappstore.com/app/aangan`

Both use the same package name + signing key as the Play build, but Google
wants them explicitly registered as "external distribution" so they trust
the signing key for sideload installs.

---

## Your Aangan identifiers (from `aangan_rn/app.json`)

| Field | Value |
|---|---|
| Package name | `app.aangan.family` |
| iOS bundle ID | `app.aangan.family` |
| Android versionCode | `10` (stale — bump to match v0.9.11) |
| Expo version | `0.9.11` (post-v0.9.11 ship) |
| Owner | `reykanit` |

EAS project ID: `a708f68e-dc74-4d43-8e97-100ead7d466b` (from IOS_BUILD_STATUS.md)

---

## Concrete action items (do in order)

### 1. Confirm Play auto-registration landed
**Where:** https://play.google.com/console → select Aangan app → left sidebar
→ **App integrity** → **App signing**. You should see:
- `app.aangan.family`
- An SHA-256 "app signing key certificate" fingerprint
- An SHA-256 "upload key certificate" fingerprint

Save both fingerprints — you'll paste them when registering external builds.

**Time: 2 minutes.**

### 2. Register the external-distribution APK
The `https://media.aangan.app/releases/Aangan-v0.9.0.apk` is an external
channel. If EAS built it with the **same signing key as Play**, you register
that key. If it was built with a **different local keystore**, that key also
needs adding.

**Where:** Play Console → **Settings** → **Developer account** → **Android
developer verification** page (new section as of Apr 2026; Google's email
linked to it).

**Fields you'll fill:**
- Package name: `app.aangan.family`
- Distribution channel: **Outside Play** → **Direct download (APK)**
- URL: `https://media.aangan.app/releases/Aangan-v0.9.X.apk`
- Signing key SHA-256: pasted from step 1 (or from the EAS build output —
  run `npx eas credentials --platform android` and pick "Show credentials")

**Time: 5-10 minutes.**

### 3. Register the Indus App Store distribution
Same flow as step 2 but:
- Distribution channel: **Outside Play** → **Third-party app store**
- Store name: Indus App Store
- URL: `https://store.indusappstore.com/app/aangan`
- Signing key SHA-256: same as step 2 if you ship the identical APK.
  If Indus made you sign with their key, add that SHA-256 too.

**Time: 5 minutes.**

### 4. Add any extra signing keys
If at any point you've built Aangan with a local dev keystore (e.g., for
internal QA builds that were distributed), add those SHA-256 fingerprints
under the same package name. Otherwise those builds break in Sep 2026.

Most likely safe to skip if every public build came from EAS production
profile — that one uses a single stable upload key.

**Time: 5 minutes (only if extra keys exist).**

### 5. Bump Android versionCode + rebuild
Currently `app.json` has `versionCode: 10` but Aangan is at v0.9.11.
Every Android release needs a monotonically increasing versionCode. This
is separate from verification but a good housekeeping pass.

**Where:** `aangan_rn/app.json`
```json
"android": {
  "package": "app.aangan.family",
  "versionCode": 11,    // bump from 10
  ...
}
```

Then rebuild:
```bash
cd aangan_rn
npx eas build --platform android --profile production
```

The new APK preserves the same signing key (EAS stores it) so verification
registrations from steps 2-3 remain valid.

**Time: 15 min local + ~20 min EAS build queue.**

### 6. Re-publish the APK
After EAS returns the new APK URL, replace the file hosted at
`https://media.aangan.app/releases/Aangan-v0.9.X.apk` and update the landing
page's `APK_URL` constant in `aangan_web/src/app/page.tsx`:

```tsx
const APK_URL = 'https://media.aangan.app/releases/Aangan-v0.9.11.apk';
```

Commit + tag as the next release.

**Time: 10 minutes.**

### 7. (Optional but recommended) Submit updated APK to Indus
Indus App Store gets a fresh build too so their reviewers see the current
verification-compliant APK.

**Time: 15-30 minutes depending on Indus review queue.**

---

## What happens if you skip this?

From September 2026:
- Users who **tap the APK download link on aangan.app** on a cert. Android
  device will see: "This app can't be installed — developer not verified."
- Users installing from Indus App Store: same block.
- Users updating from **Google Play** are unaffected (Play app already
  auto-registered per the email).

This is a growth blocker for India-specific sideload traffic, which has
historically been a big channel for family apps. Worth doing before the
deadline.

---

## Checklist (tick as you go)

- [ ] Play Console → App integrity → copied SHA-256 fingerprints
- [ ] Android developer verification page → registered APK as external
- [ ] Android developer verification page → registered Indus App Store
- [ ] Any extra local-keystore SHA-256s added (likely none for you)
- [ ] `app.json` versionCode bumped (10 → 11)
- [ ] EAS production build triggered + APK downloaded
- [ ] APK re-hosted at `media.aangan.app/releases/Aangan-v0.9.11.apk`
- [ ] Landing page `APK_URL` constant updated + deployed
- [ ] Indus App Store fresh build submitted

---

## One thing I can do for you right now

Bump Android versionCode in `aangan_rn/app.json` and the landing APK URL
would be a trivial 2-line change I can ship as v0.9.12. Want me to?

The rest (Play Console registrations, EAS build, APK upload, Indus submission)
are actions that **require your Play Console login + EAS credentials** — I'd
rather you drive those so nothing lands on your developer account by surprise.
