# Aangan v0.5.0 Pre-Release Testing Report

**Date:** 2026-04-04
**App Version:** 0.5.0 (app.json) / 0.4.5 (constants.ts) -- MISMATCH
**Stack:** Expo SDK 54, React Native 0.81.5, Supabase

---

## Summary

| Category                     | Result  | Issues |
|------------------------------|---------|--------|
| 1. Code Quality & Linting    | WARN    | 3 TODOs, 4 console statements (guarded) |
| 2. Dependency Security        | WARN    | npm audit could not run (no Node in PATH); manual review OK |
| 3. Bundle Size Analysis       | WARN    | node_modules 4.0 GB (normal for RN, but verify no stale deps) |
| 4. Asset Validation           | PASS    | All 4 required assets present |
| 5. Environment Configuration  | WARN    | Version mismatch; .env properly gitignored |
| 6. Navigation Flow            | FAIL    | 5 screens navigated to but NOT registered in navigator |
| 7. Permission Audit           | WARN    | READ_SMS + RECEIVE_SMS may be unnecessary |
| 8. Accessibility              | PASS    | 210 accessibility props across 23 files |
| 9. Performance Red Flags      | WARN    | 8 inline renderItem functions in FlatLists |
| 10. Crash Risk Assessment     | WARN    | 7 unguarded .then() chains; ErrorBoundary exists |

**Overall: 1 FAIL, 7 WARN, 2 PASS -- Not ready for release without fixing Category 6**

---

## 1. Code Quality & Linting -- WARN

### Console Statements
Only 4 console statements found, all properly guarded:
- `src/hooks/useAudioPlayer.ts:27` -- `console.warn` for playback errors (acceptable)
- `src/utils/security.ts:206` -- `console.warn` for store errors (acceptable)
- `src/utils/security.ts:217` -- guarded by `__DEV__` check (OK)
- `src/utils/security.ts:223` -- guarded by `__DEV__` check (OK)

**Verdict:** No production console leaks. PASS.

### TODO/FIXME Comments
3 TODOs remaining:
- `src/stores/storageStore.ts:357` -- "TODO: Pass real Razorpay payment ID after checkout"
- `src/screens/home/PostComposerScreen.tsx:30` -- "TODO: update RootStackParamList to add editPostId param"
- `src/screens/messages/MessageListScreen.tsx:199` -- "TODO: navigate to a family-member picker"

**Verdict:** Non-blocking but should be tracked. WARN.

### Hardcoded Secrets
No hardcoded API keys, passwords, or secrets found in source code. Supabase credentials are properly loaded via `process.env.EXPO_PUBLIC_*` with a runtime validation check that crashes the app if missing (intentional). PASS.

### TypeScript Check
Could not run `npx tsc --noEmit` -- Node.js not available in the restricted shell PATH. Strict mode is enabled in tsconfig.json. Manual verification recommended.

**Action required:** Run `npx tsc --noEmit` manually before release.

---

## 2. Dependency Security -- WARN

Could not run `npm audit` due to Node.js not being in the shell PATH.

### Manual Dependency Review
- **Total dependencies:** 27 runtime, 3 dev
- **Key versions look current:**
  - expo ~54.0.33
  - react 19.1.0
  - react-native 0.81.5
  - @supabase/supabase-js ^2.101.0
  - zustand ^5.0.12
- **No deprecated packages detected** in package.json

**Action required:** Run `npm audit` and `npx expo-doctor` manually before release.

---

## 3. Bundle Size Analysis -- WARN

- **node_modules size:** 4.0 GB (typical for Expo SDK 54 project)
- **Dependencies count:** 27 runtime packages

### Largest Dependencies (by typical size)
1. `expo` (~54.0.33) -- core framework
2. `react-native-reanimated` (~4.1.1) -- animations
3. `react-native-screens` (~4.16.0) -- navigation
4. `expo-camera` (~17.0.10) -- camera access
5. `expo-av` (^16.0.8) -- audio/video

**Note:** `expo-speech-recognition` and `expo-speech` both included -- verify both are actually used.

---

## 4. Asset Validation -- PASS

All required image assets exist:

| Asset              | File                  | Size     | Status |
|--------------------|-----------------------|----------|--------|
| App Icon           | assets/icon.png       | 1.04 MB  | WARN (large, consider optimizing) |
| Adaptive Icon      | assets/adaptive-icon.png | 296 KB | OK |
| Splash Icon        | assets/splash-icon.png | 24 KB   | OK |
| Favicon            | assets/favicon.png    | 1.5 KB   | OK |

### app.json Configuration
- App name: "Aangan" (with Devanagari)
- Slug: "aangan"
- Orientation: portrait-only
- New Arch enabled: true
- Deep linking scheme: "aangan://"
- iOS bundle ID: app.aangan.family
- Android package: app.aangan.family
- EAS project ID: configured

**WARN:** icon.png at 1.04 MB is large. Consider compressing to under 500 KB.

---

## 5. Environment Configuration -- WARN

### .env Files
- `.env` -- exists with Supabase credentials
- `.env.example` -- exists with placeholder values
- `.env` is listed in `.gitignore` -- PASS (secrets won't be committed)
- `supabase/.env.local` -- exists for local Supabase setup

### eas.json Build Profiles
All 5 build profiles have environment variables set:
- `development` -- no env vars (uses .env locally)
- `preview` -- SUPABASE_URL + ANON_KEY set
- `preview-ios-sim` -- SUPABASE_URL + ANON_KEY set
- `production` -- SUPABASE_URL + ANON_KEY set
- `production-apk` -- SUPABASE_URL + ANON_KEY set

### VERSION MISMATCH (FAIL-level concern)
- `app.json` says version `0.5.0`
- `src/config/constants.ts` says `APP_VERSION = '0.4.5'`
- `src/config/constants.ts` says `BUILD_NUMBER = '5'`
- `app.json` says `versionCode: 4` and `buildNumber: "4"`

**Action required:** Synchronize version numbers before release.

---

## 6. Navigation Flow -- FAIL

### Registered Screens (26 total)
All 26 screens in AppNavigator.tsx are properly imported and registered:
- Auth: Splash, Login, OTP, ProfileSetup, Onboarding
- Main Tabs: Home, Family, Compose, Notifications, Settings
- Feed: PostDetail, MemberProfile
- Messages: MessageList, Chat
- Events: EventCreator, EventInvitation, RsvpTracker, EventPhotos
- Storage: Storage, Referral
- Settings: Kuldevi
- Family: AddLifeEvent, ImportantDates
- Support: SupportChat, MyTickets, TicketDetail

### MISSING FROM NAVIGATOR (navigated to but not registered)
These screens exist as files and are navigated to via `navigation.navigate()`, but are NOT in AppNavigator.tsx or RootStackParamList:

1. **HelpScreen** (`src/screens/support/HelpScreen.tsx`)
   - Navigated from: `SettingsScreen.tsx:471`
2. **FeedbackScreen** (`src/screens/support/FeedbackScreen.tsx`)
   - Navigated from: `SettingsScreen.tsx:485` and `HelpScreen.tsx:213`
3. **TermsScreen** (`src/screens/legal/TermsScreen.tsx`)
   - Navigated from: `SettingsScreen.tsx:517`
4. **PrivacyPolicyScreen** (`src/screens/legal/PrivacyPolicyScreen.tsx`)
   - Navigated from: `SettingsScreen.tsx:531`
5. **ReportContentScreen** (`src/screens/support/ReportContentScreen.tsx`)
   - File exists but no direct navigate() call found (may be used via different mechanism)

**This will cause runtime crashes when users tap Help, Feedback, Terms, or Privacy in Settings.**

**Action required:** Add these 5 screens to RootStackParamList and the Stack.Navigator before release.

---

## 7. Permission Audit -- WARN

### iOS Permissions (6 total)
| Permission                        | Justification | Verdict |
|-----------------------------------|---------------|---------|
| NSCameraUsageDescription          | Profile photos, event pictures | OK |
| NSPhotoLibraryUsageDescription    | Share family photos | OK |
| NSLocationWhenInUseUsageDescription | Event check-in | OK |
| NSContactsUsageDescription        | Invite family from contacts | OK |
| NSMicrophoneUsageDescription      | Voice messages, voice input | OK |
| NSSpeechRecognitionUsageDescription | Voice-to-text Hindi/English | OK |

All iOS permissions have Hindi-friendly descriptions. PASS.

### Android Permissions (8 total)
| Permission                        | Verdict |
|-----------------------------------|---------|
| CAMERA                            | OK |
| READ_EXTERNAL_STORAGE             | OK (legacy, harmless) |
| WRITE_EXTERNAL_STORAGE            | OK (legacy, harmless) |
| ACCESS_FINE_LOCATION              | OK -- event check-in |
| ACCESS_COARSE_LOCATION            | OK -- event check-in |
| RECEIVE_SMS                       | WARN -- likely unnecessary |
| READ_SMS                          | WARN -- likely unnecessary |
| RECORD_AUDIO                      | OK -- voice messages |

**WARN:** `RECEIVE_SMS` and `READ_SMS` permissions are declared but the app uses Supabase auth (which handles OTP server-side). These permissions may trigger Google Play review flags and are likely unnecessary unless auto-reading OTP codes.

**Action required:** Remove READ_SMS and RECEIVE_SMS unless auto-OTP-read is implemented.

---

## 8. Accessibility -- PASS

### Accessibility Props Usage
- **210 accessibility props** across **23 files**
- Props used: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessible`

### Key Screens Coverage
| Screen              | Accessibility Props | Status |
|---------------------|--------------------:|--------|
| SettingsScreen      | 29                  | Good |
| FamilyTreeScreen    | 21                  | Good |
| HomeFeedScreen      | 15                  | Good |
| PostComposerScreen  | 34                  | Excellent |
| LoginScreen         | 3                   | OK |
| NotificationsScreen | 7                   | OK |

### Dadi Test Compliance
- Tab bar items use `minHeight: DADI_MIN_TAP_TARGET` -- PASS
- Tab labels use Hindi-first text -- PASS
- Body text size verification recommended (should be 16px+)

---

## 9. Performance Red Flags -- WARN

### Inline FlatList renderItem Functions
8 FlatList components use inline arrow functions for `renderItem` instead of `useCallback`:

1. `src/screens/messages/MessageListScreen.tsx:225`
2. `src/screens/home/PostComposerScreen.tsx:234`
3. `src/screens/events/RsvpTrackerScreen.tsx:306`
4. `src/screens/events/RsvpTrackerScreen.tsx:449`
5. `src/screens/home/HomeFeedScreen.tsx:279`
6. `src/screens/messages/ChatScreen.tsx:383`
7. `src/screens/family/MemberProfileScreen.tsx:400`
8. `src/components/common/AudienceSelector.tsx:198`

**Note:** 5 FlatLists correctly use `useCallback` for renderItem:
- HomeFeedScreen (main feed), NotificationsScreen, FamilyTreeScreen, ImportantDatesScreen, LifeEventsList

### Memoization Usage
- `useCallback`: 178 occurrences across 35 files -- Good
- `useMemo`: 34 occurrences across 9 files -- Adequate

### Key Props
- `keyExtractor` and `key` props: 82 occurrences across 33 files -- Adequate

### Image Compression
- `src/utils/imageCompressor.ts` exists -- images are compressed before upload. PASS.

### Large Icon Asset
- `assets/icon.png` is 1.04 MB -- could slow initial bundle. Consider compressing.

---

## 10. Crash Risk Assessment -- WARN

### Error Boundary
- `src/components/common/ErrorBoundary.tsx` EXISTS -- catches React render errors. PASS.
- Uses `secureLog.error` for error reporting.

### try/catch Coverage
- **227 try/catch blocks** across **44 files** -- Good coverage
- **328 await statements** across **57 files**
- Ratio: ~0.69 try/catch per await -- reasonable

### Unguarded Promise Chains (.then without .catch)
7 `.then()` calls found without explicit `.catch()`:

1. `src/stores/postStore.ts:172` -- fire-and-forget (intentional, acceptable)
2. `src/stores/familyStore.ts:126` -- fire-and-forget (intentional, acceptable)
3. `src/screens/family/FamilyTreeScreen.tsx:83` -- `Linking.canOpenURL` (low risk)
4. `src/screens/home/HomeFeedScreen.tsx:171` -- `getDeviceLocation` (should have catch)
5. `src/stores/messageStore.ts:447` -- `getSession` (should have catch)
6. `src/screens/feed/PostDetailScreen.tsx:343` -- data fetch (should have catch)
7. `src/screens/feed/PostDetailScreen.tsx:371` -- data fetch (should have catch)

**Action required:** Add `.catch()` to items 4-7 to prevent unhandled promise rejections.

### Supabase Client Safety
- Runtime check throws if env vars missing -- prevents silent auth failures. PASS.
- SecureStore adapter has try/catch on all operations. PASS.
- URL polyfill imported before Supabase client creation. PASS.

---

## Critical Actions Before Release

### Must Fix (Blockers)
1. **Register missing screens in AppNavigator** -- Help, Feedback, Terms, Privacy, ReportContent will crash the app when tapped
2. **Sync version numbers** -- app.json (0.5.0) vs constants.ts (0.4.5) and build numbers (4 vs 5)

### Should Fix (High Priority)
3. **Add .catch() to 4 unguarded promise chains** in HomeFeedScreen, messageStore, PostDetailScreen
4. **Remove READ_SMS and RECEIVE_SMS** Android permissions unless auto-OTP is implemented
5. **Compress icon.png** from 1.04 MB to under 500 KB

### Nice to Have
6. **Wrap 8 inline renderItem functions** in `useCallback` for better FlatList performance
7. **Resolve 3 TODO comments** (Razorpay ID, editPostId param, member picker)
8. **Run `npx tsc --noEmit`** to verify no TypeScript errors
9. **Run `npm audit`** to check dependency vulnerabilities
10. **Run `npx expo-doctor`** to validate Expo configuration

---

## Files Referenced

- `/aangan_rn/app.json` -- app configuration
- `/aangan_rn/eas.json` -- EAS build profiles
- `/aangan_rn/package.json` -- dependencies
- `/aangan_rn/tsconfig.json` -- TypeScript config
- `/aangan_rn/src/config/constants.ts` -- version constants
- `/aangan_rn/src/config/supabase.ts` -- Supabase client
- `/aangan_rn/src/navigation/AppNavigator.tsx` -- navigation setup
- `/aangan_rn/src/utils/security.ts` -- security utilities
- `/aangan_rn/src/components/common/ErrorBoundary.tsx` -- error boundary
