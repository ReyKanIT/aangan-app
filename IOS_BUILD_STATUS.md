# Aangan iOS Build Readiness Report
> Last updated: 2026-04-10 10:42 PM IST

---

## Current EAS Config Status

### app.json (aangan_rn/app.json) — CONFIGURED
| Field | Value | Status |
|-------|-------|--------|
| App Name | Aangan आँगन | OK |
| Slug | aangan | OK |
| Version | 0.6.0 | NEEDS UPDATE to 0.8.0 |
| Bundle Identifier | app.aangan.family | OK |
| iOS Build Number | 7 | NEEDS UPDATE |
| Orientation | portrait | OK |
| Scheme (deep linking) | aangan | OK |
| Icon | ./assets/icon.png | OK (exists) |
| Splash | ./assets/splash-icon.png | OK (exists) |
| Splash BG Color | #FDFAF0 (Cream) | OK |
| supportsTablet | true | OK |
| EAS Project ID | a708f68e-dc74-4d43-8e97-100ead7d466b | OK |
| Owner | reykanit | OK |

### eas.json (aangan_rn/eas.json) — CONFIGURED
| Profile | iOS Config | Status |
|---------|-----------|--------|
| development | simulator: true | OK — for local testing |
| preview | simulator: false | OK — for TestFlight internal |
| preview-ios-sim | simulator: true | OK — for simulator testing |
| production | autoIncrement: true | OK — for App Store submission |

The `submit.production` section exists but is empty — will need Apple credentials added.

### iOS Info.plist Permissions — CONFIGURED
| Permission | Description | Status |
|------------|-------------|--------|
| NSCameraUsageDescription | Profile photos and event pictures | OK |
| NSPhotoLibraryUsageDescription | Share photos with family | OK |
| NSLocationWhenInUseUsageDescription | Event check-in | OK |
| NSContactsUsageDescription | Invite family from contacts | OK |
| NSMicrophoneUsageDescription | Voice messages and voice input | OK |
| NSSpeechRecognitionUsageDescription | Voice-to-text in Hindi and English | OK |
| ITSAppUsesNonExemptEncryption | false (no export compliance needed) | OK |

### EAS Login Status — NOT LOGGED IN
You need to run `eas login` before building.

---

## Version & Build Numbers for v0.8.0

### Current values (stale — still on v0.6.0):
- `expo.version`: "0.6.0"
- `expo.ios.buildNumber`: "7"
- `expo.android.versionCode`: 9

### Recommended values for v0.8.0:
| Field | New Value | Notes |
|-------|-----------|-------|
| `expo.version` | "0.8.0" | Match web app version |
| `expo.ios.buildNumber` | "1" | Reset to 1 for new version (Apple allows this) |
| `expo.android.versionCode` | 10 | Must always increment (Android requirement) |

> Note: The production EAS profile has `autoIncrement: true` for iOS, so buildNumber will auto-increment on each `eas build`. You can start at "1" for the first v0.8.0 iOS build.

---

## Steps Once Apple Developer Account Is Activated

### Phase 1: Account Setup (Day 1 after activation)
1. **Log into Apple Developer Portal** — https://developer.apple.com
2. **Accept agreements** — Apple Developer Program License Agreement
3. **Log into App Store Connect** — https://appstoreconnect.apple.com
4. **Accept App Store Connect agreements** — including Paid Applications agreement (even for free apps)

### Phase 2: EAS Configuration (Day 1)
1. **Log into EAS CLI**:
   ```bash
   cd /path/to/aangan_rn
   npx eas login
   ```
2. **Update app.json version** to 0.8.0:
   ```json
   "version": "0.8.0",
   "ios": {
     "buildNumber": "1",
     ...
   }
   ```
3. **Configure Apple credentials in EAS**:
   ```bash
   npx eas credentials --platform ios
   ```
   EAS will guide you through:
   - Linking your Apple Developer account
   - Creating a Distribution Certificate (EAS can auto-generate)
   - Creating a Provisioning Profile (EAS can auto-generate)
   - Setting up an App ID for `app.aangan.family`

### Phase 3: Build iOS App (Day 1-2)
1. **Build for TestFlight (internal testing)**:
   ```bash
   npx eas build --platform ios --profile preview
   ```
2. **Build for App Store submission**:
   ```bash
   npx eas build --platform ios --profile production
   ```
3. **Submit to App Store**:
   ```bash
   npx eas submit --platform ios --profile production
   ```
   Or configure `eas.json` submit section:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@email.com",
         "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
         "appleTeamId": "YOUR_TEAM_ID"
       }
     }
   }
   ```

### Phase 4: App Store Connect Listing (Day 2-3)
1. **Create new app** in App Store Connect
   - Bundle ID: `app.aangan.family`
   - Name: "Aangan — Family Social Network"
   - Primary Language: Hindi
   - Category: Social Networking
2. **Upload screenshots** (iPhone 6.7" and 6.1" required)
   - Minimum 3 screenshots per size class
   - Sizes: 1290x2796 (6.7") and 1179x2556 (6.1")
3. **Fill listing details** (already drafted in APP_STORE_ASSETS.md):
   - Description (English + Hindi)
   - Keywords: family, social, network, hindi, voice, panchang, festival, india
   - Privacy Policy URL: https://aangan.app/privacy
   - Support URL: https://aangan.app/support
4. **Set pricing** — Free
5. **Submit for review** — Apple review typically takes 24-48 hours

---

## Missing Configurations Checklist

| Item | Status | Action Needed |
|------|--------|---------------|
| Apple Developer Account | PENDING ACTIVATION | Wait ~48 hours after payment |
| Bundle Identifier (app.aangan.family) | CONFIGURED in app.json | Will be registered on Apple portal via EAS |
| Distribution Certificate | NOT YET CREATED | EAS will auto-generate on first build |
| Provisioning Profile | NOT YET CREATED | EAS will auto-generate on first build |
| App Store Connect App | NOT YET CREATED | Create manually after account activation |
| iOS Screenshots (6.7" + 6.1") | NOT READY | Need iPhone-sized screenshots (current ones are Android) |
| Privacy Policy page | NEEDS VERIFICATION | Confirm https://aangan.app/privacy is live |
| Support page | NEEDS VERIFICATION | Confirm https://aangan.app/support is live |
| app.json version | STALE (0.6.0) | Update to 0.8.0 before building |
| eas.json submit config | EMPTY | Add Apple ID, Team ID, ASC App ID |
| EAS CLI login | NOT LOGGED IN | Run `npx eas login` |
| Google Maps API Key (iOS) | EMPTY STRING | Optional — only needed if maps are used |
| Push Notification Certificate (APNs) | NOT CONFIGURED | Needed for expo-notifications on iOS |
| App Icon (1024x1024) | AVAILABLE | aangan_icon_1024.png exists in project root |

---

## Summary

**What's ready:**
- EAS project is configured with correct bundle ID, permissions, and build profiles
- iOS-specific Info.plist permissions are comprehensive and well-written
- Production build profile with autoIncrement is set up
- App icon (1024x1024) exists
- App Store listing content (name, description, keywords) is drafted

**What's blocking:**
1. Apple Developer account activation (~48 hours from April 10)
2. app.json version needs bump from 0.6.0 to 0.8.0
3. EAS CLI needs login (`npx eas login`)
4. iOS screenshots need to be captured at iPhone dimensions
5. Privacy policy and support pages need to be live at aangan.app

**Estimated timeline:** Once Apple Developer account is activated, first TestFlight build can be ready in ~1 hour. App Store submission (including listing setup and review) will take 2-3 days.
