# App Store Connect — Your Next 5 Minutes

*[12:00am — 6 May 2026]*

> Apple emailed today: **"You now have access to App Store Connect"**.
> This unblocks the iOS launch path. Below is the exact, sequential
> set of clicks you need to do at https://appstoreconnect.apple.com.
> Once the three values at the bottom are in your hands, I'll handle
> the build + submit autonomously.

---

## Why this is the bottleneck

`aangan_rn/eas.json` line 73-77 has `submit.production.ios` waiting on
three values that ONLY exist after you create the app entry in App Store
Connect:

| Field | Where to find it | What it looks like |
|---|---|---|
| `appleId` | The email you use to sign in to App Store Connect | `kumar@reykanit.com` |
| `ascAppId` | App Store Connect → My Apps → Aangan → App Information → Apple ID (numeric) | `1234567890` |
| `appleTeamId` | https://developer.apple.com/account → Membership Details → Team ID | `A1B2C3D4E5` |

Once filled, `eas submit --platform ios --profile production` works.

---

## Sequential clicks (5 min total)

### 1. Sign in (30 sec)
Go to https://appstoreconnect.apple.com → "Sign In" → use the same
Apple ID Apple sent the access email to. Accept any pending **Program
License Agreement** if prompted.

### 2. Confirm bundle ID is registered (1 min)
Open https://developer.apple.com/account/resources/identifiers/list — make
sure `app.aangan.family` is listed. If not, register it:
- Click **+** → **App IDs** → **Continue** → **App** → **Continue**
- Description: `Aangan Family Network`
- Bundle ID: Explicit → `app.aangan.family`
- Capabilities to enable: **Push Notifications**, **Sign in with Apple**
  (optional but recommended), **Associated Domains** (for universal links
  — `applinks:aangan.app`)
- Continue → Register

### 3. Grab your **Team ID** (15 sec)
On the same developer.apple.com → **Membership** (left sidebar). The 10-char
alphanumeric "Team ID" is what you need. Copy it.

### 4. Create the App Store Connect app entry (2 min)
Back at https://appstoreconnect.apple.com/apps → **+** → **New App**:

| Field | Value |
|---|---|
| Platforms | ✅ iOS (only — iPad ships under same record) |
| Name | `Aangan — Family Network` |
| Primary Language | English (U.S.) |
| Bundle ID | `app.aangan.family` (dropdown shows all your registered IDs) |
| SKU | `AANGAN-IOS-001` |
| User Access | Full Access |

Click **Create**.

### 5. Grab your **ASC App ID** (15 sec)
On the new app's page, **App Information** (left sidebar) → near the top
right you'll see "**Apple ID**: 1234567890". That number is `ascAppId`.

---

## What you send me

Just three lines. Reply with:
```
appleId: <your Apple Account email>
ascAppId: <numeric ASC App ID from step 5>
appleTeamId: <10-char Team ID from step 3>
```

**Or** drop them straight into your shell env (autonomous-friendly):
```
export EXPO_APPLE_ID=<email>
export ASC_APP_ID=<numeric>
export APPLE_TEAM_ID=<10-char>
```

---

## What I'll do once I have them (~45 min)

1. `eas build --platform ios --profile production` — produces a signed `.ipa` (~25 min)
2. `eas submit --platform ios --profile production` — uploads to App Store Connect (~5 min)
3. The build appears in **TestFlight** for internal testing
4. You add internal testers in App Store Connect → TestFlight → Internal Testing
5. Once tested, you submit the build for App Store review (Apple review takes 24-48h typically for new apps)

---

## What's already done

- ✅ App icon 1024×1024 — `aangan_icon_1024.png` at repo root
- ✅ App description (Hindi + English) — `APP_STORE_ASSETS.md`
- ✅ Keywords, categories, age rating — `APP_STORE_ASSETS.md`
- ✅ Privacy policy live at https://aangan.app/privacy
- ✅ Terms live at https://aangan.app/terms
- ✅ Support page live at https://aangan.app/support
- ✅ Privacy Nutrition labels mapping — `APPLE_PRIVACY_NUTRITION_LABELS.md`
- ✅ Bundle ID `app.aangan.family` declared in `aangan_rn/app.json`
- ✅ RN bumped to v0.15.0, iOS buildNumber bumped to 21
- ✅ eas.json submit config switched to env-var-driven (no more hard-coded
  `REPLACE_WITH_*` strings — cleaner pattern, easier to swap envs)

## What's still TBD

- ⏳ **Screenshots** — need 6.5″ (1290×2796) iPhone screenshots from
  the actual app. Can't capture without running on iOS simulator + a
  populated test family. Plan: run preview build in simulator after
  first EAS build completes; capture 10 screens per `APP_STORE_ASSETS.md`
  section 5; upload to App Store Connect.
- ⏳ **App Preview video** (optional but recommended). Can defer to v2.
- ⏳ **Test account credentials** — Apple Review Team will need a
  way to log in. Plan: create a "demo family" in prod with a fixed test
  phone number that auto-accepts a known OTP (or a demo-mode flag).
- ⏳ **Export compliance** declaration — answer "Yes, app uses HTTPS;
  Yes, exempt under standard encryption" in App Store Connect → Build →
  Export Compliance. Trivial click.

---

*Send me the 3 values when you have them and I'll kick off the iOS build.*
