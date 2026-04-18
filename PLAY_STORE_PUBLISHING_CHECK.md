# Google Play Store — Publishing Readiness Check

> [7:30am - 18Apr26] · Aangan v0.9.12
> Scope: what's required to publish Aangan on the Play Store (NOT just external
> verification — that's in GOOGLE_PLAY_VERIFICATION_PLAN.md).

## TL;DR

**Content + assets: ~85% ready.** PLAY_STORE_LISTING.md (337 lines) has every
text block, SEO keyword, and data-safety answer pre-written. Icons and
feature graphic exist at correct dimensions. Privacy + Terms pages are live.

**Blocking on 4 things:**
1. **EAS `submit.production` section is empty** — can't actually submit to Play without Apple/Google creds filled in
2. **Only 2 screenshots** exist (Play requires min 2, best practice 4–8)
3. **PLAY_STORE_LISTING.md version is stale** (v0.8.0 reference throughout, we're at v0.9.12)
4. **Play Console app listing not yet created** (manual step in Play Console UI)

Everything else is either already in the repo or is a 5-min data-entry task.

---

## ✅ What's already done

### Code + config

| Item | State |
|---|---|
| `aangan_rn/app.json` Android package | `app.aangan.family` ✓ |
| Android versionCode | 11 (bumped in v0.9.12) |
| Android adaptive icon | `./assets/adaptive-icon.png` ✓ |
| Android permissions | CAMERA, STORAGE, LOCATION, RECORD_AUDIO — all declared |
| Expo plugins | expo-image-picker, expo-location, expo-camera, expo-notifications, expo-av, expo-speech-recognition — all with permission strings |
| EAS project ID | `a708f68e-dc74-4d43-8e97-100ead7d466b` ✓ |
| EAS production profile | `buildType: "app-bundle"` (AAB — what Play wants) ✓ |
| EAS production-apk profile | `buildType: "apk"` for sideload distribution ✓ |

### Assets (all at correct Play dimensions)

| File | Dimensions | Play requirement |
|---|---|---|
| `aangan_icon_512.png` | 512×512 | exactly 512×512 ✓ |
| `play_store_feature_graphic.png` | 1024×500 | exactly 1024×500 ✓ |
| `play_store_screenshot_1.png` | 1080×1920 | min 320px, max 3840px, 16:9 or 9:16 ✓ |
| `play_store_screenshot_2.png` | 1080×1920 | ✓ |

### Public web pages (needed for Play data safety form)

| URL | Status |
|---|---|
| https://aangan.app/privacy | 200 ✓ (redirects to www.aangan.app/privacy) |
| https://aangan.app/terms | 200 ✓ |
| https://aangan.app/support | exists on the app |

### Listing content (already drafted in PLAY_STORE_LISTING.md)

- App Name: "Aangan — Family Social Network"
- Short description (79/80 chars): bilingual
- Full description (EN + HI): complete with emoji + feature list
- What's New block
- Hindi secondary listing text
- SEO keyword set (primary + long-tail)
- Data Safety Form answers (all questions pre-answered — phone, name, photos, messages, voice recordings, encryption, deletion, third parties)
- Contact details
- Promotional text ("100% Free" angle)

---

## 🔧 What needs action before first Play submission

### 1. Fill `eas.json` submit.production with Google service account

Currently empty in `aangan_rn/eas.json`:
```json
"submit": { "production": {} }
```

Need to add:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./play-service-account.json",
      "track": "internal"
    }
  }
}
```

**How to get the service account JSON:**
1. Play Console → **Setup** → **API access**
2. Link a Google Cloud project (auto-created by Play Console if none)
3. **Create new service account** → role: **Service Account User**
4. Download the JSON key file
5. In Play Console → **Users and permissions** → invite the service account email → grant "Release apps to production, closed, open tracks"
6. Save JSON locally as `aangan_rn/play-service-account.json` — **.gitignore it**

**Time: 15 minutes** (once Play Console is open + you have admin access).

### 2. Create the app listing in Play Console

1. Play Console → **All apps** → **Create app**
2. Fill:
   - App name: **Aangan — Family Social Network**
   - Default language: **English (India) – en-IN**
   - App type: **App** (not Game)
   - Free or paid: **Free**
   - Declarations: confirm Play policies + US export compliance
3. Click **Create app** → you get a blank listing shell

**Time: 3 minutes.**

### 3. Complete required declarations (all have answers in PLAY_STORE_LISTING.md)

Play Console sidebar → **Policy** → tick all:

- **App content**
  - Privacy policy URL: `https://aangan.app/privacy` ✓ already live
  - Ads: **No ads** ✓
  - App access: **All app functionality is available without special access** (or declare OTP flow if you want to be precise)
  - Content rating: fill questionnaire. Aangan is social/communication with user-generated content → expect **Everyone / Teen** rating. Declare: no violence, no sexual content, no gambling, user-generated content present, messaging present.
  - Target audience: **18+** (COPPA-safe — we don't target kids)
  - News app: **No**
  - Government app: **No**
  - COVID-19 contact tracing: **No**
  - Data safety: **copy answers from PLAY_STORE_LISTING.md §"Data Safety Form Answers"** — the table there already maps every field Play asks.
  - Financial features: **No**

- **Store settings**
  - App category: **Social Networking** (primary)
  - Tags: Family, Community, Local
  - Contact email: from PLAY_STORE_LISTING.md §6
  - Website: https://aangan.app
  - Phone (optional)

**Time: 30 minutes** (mostly reading each questionnaire screen).

### 4. Upload store listing assets

Play Console → **Grow** → **Main store listing**:

| Field | Source file |
|---|---|
| App icon | `aangan_icon_512.png` |
| Feature graphic | `play_store_feature_graphic.png` |
| Phone screenshots (2 min, 8 max) | `play_store_screenshot_1.png`, `play_store_screenshot_2.png` |
| Short description | PLAY_STORE_LISTING.md §1 "Short Description" |
| Full description | PLAY_STORE_LISTING.md §1 "Full Description" |
| What's new | PLAY_STORE_LISTING.md §4 |

**Gap:** only 2 screenshots. **Strongly recommend 6–8** before hitting Publish — users skim the carousel and 2 shots under-sell the app. Suggested shots to capture:
1. Family tree view (3-level hierarchy)
2. Panchang screen
3. Event detail with RSVP
4. Voice message composer
5. Kuldevi page
6. Hindi feed / post composer
7. Festival calendar
8. Invite/share flow

**Time: 1 hour** to capture + polish (or another Claude session can do via emulator).

### 5. Hindi localization listing (hi-IN)

Play Console → **Grow** → **Store listing** → **+ Add translations** → add Hindi.
Copy text from PLAY_STORE_LISTING.md §3.

**Time: 10 minutes.**

### 6. Internal testing track

**Do this BEFORE production push.** Play requires recent test history before
approving a first production submission from a new developer.

1. Play Console → **Testing** → **Internal testing** → **Create release**
2. Upload the AAB from `npx eas build --platform android --profile production`
3. Add testers (your team email, personal Gmail)
4. Save → **Review release** → **Start rollout**
5. Install via the internal test link on 2-3 real devices + one emulator
6. Fix anything that crashes. Push another internal build if needed.

**Time: 30 min build + EAS queue + install + smoke test.**

### 7. Production submission

Once internal testing has ≥1 successful rollout + you've installed it yourself:

1. Play Console → **Production** → **Create new release**
2. Promote from Internal (recommended) or upload fresh AAB
3. Release name: **0.9.12**
4. Release notes: paste from PLAY_STORE_LISTING.md §4
5. Review → Roll out to 100% of Production

Play review typically takes **1–3 days** for new apps. You'll see:
- "Update in review" → "Approved" → "Live"

**Time: 10 min submit + 1-3 days Play review.**

### 8. Post-approval

- Update `aangan_web/src/app/page.tsx` to replace the "Coming Soon on iOS" style Android placeholder with a real Play Store badge
- Add a **Play Store badge** next to Android APK on the download section
- Add `https://play.google.com/store/apps/details?id=app.aangan.family` to sitemap.ts

---

## 🛑 What's NOT needed (debunking common worries)

- **App Signing key:** Google Play Managed signing handles it — you don't generate a keystore yourself for Play. EAS production builds use Play's upload key by default.
- **Separate Google Play Developer account:** the one-time $25 is already paid (per the verification email to ReyKan).
- **Separate play.google.com login:** same Google account as the Console.
- **Physical device for review:** Google reviews on their own infra.
- **Trademark proof:** "Aangan" is a generic Hindi word; no conflict. "Aangan आँगन" as a compound name is distinctive enough.

---

## 📋 One-sheet checklist

Copy this to your project tracker:

```
Pre-listing
[ ] Create Play Console app listing (5 min)
[ ] Set up Google service account + download JSON
[ ] Paste service account path into aangan_rn/eas.json submit.production.android
[ ] Add play-service-account.json to aangan_rn/.gitignore

Policy declarations
[ ] Privacy policy URL = https://aangan.app/privacy
[ ] Ads: No ads
[ ] Target audience: 18+
[ ] Content rating questionnaire (expect Teen)
[ ] Data safety form (copy from PLAY_STORE_LISTING.md §"Data Safety Form Answers")

Store listing
[ ] Short + full description (copy from PLAY_STORE_LISTING.md)
[ ] App icon 512×512 (have it: aangan_icon_512.png)
[ ] Feature graphic 1024×500 (have it: play_store_feature_graphic.png)
[ ] Screenshots: 6–8 (have only 2 — capture 4–6 more)
[ ] Hindi translation (copy from PLAY_STORE_LISTING.md §3)

Build + test
[ ] Refresh PLAY_STORE_LISTING.md from v0.8.0 → v0.9.12 (chore)
[ ] npx eas build --platform android --profile production
[ ] Upload AAB to Internal testing
[ ] Install on 2+ real devices, smoke test
[ ] Promote Internal → Production

Post-launch
[ ] Landing page: add Play Store badge + link
[ ] sitemap.ts: add Play Store URL
```

---

## 🎯 What I can do right now without your login

1. ✅ **Bump PLAY_STORE_LISTING.md from v0.8.0 → v0.9.12** — update version refs, What's New block, release notes.
2. ✅ **Add `play-service-account.json` to `aangan_rn/.gitignore`** — so when you drop the JSON file in the repo it doesn't accidentally get committed.
3. ✅ **Scaffold the `eas.json` submit section** with placeholders so the field names are right the first time.
4. ✅ **Add Play Store landing-page placeholder** that flips from "Coming Soon" to a real link once the app is approved (uses env var toggle).

Want me to autorun those 4? They're all safe code changes, no credentials, no account actions.

## 🟡 What needs YOUR login

Steps 1–7 of the Pre-listing/Policy/Store Listing/Build+Test sections. Play
Console is the only place to click "Create app" and fill the questionnaires
— no API for that path.

If you open Play Console in your main Chrome and connect the tab to a Claude
session (extension icon → Connect), I can drive through every questionnaire
field using the data already in PLAY_STORE_LISTING.md and only pause for your
click on the final Submit.

---

*Generated by audit at [7:30am - 18Apr26]*
