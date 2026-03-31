# Aangan आँगन — Build Guide v0.1

## Prerequisites

1. **Node.js** 18+ (installed: v22.18.0)
2. **Expo CLI**: `npx expo` (bundled)
3. **EAS CLI**: `npx eas-cli` (for cloud builds)
4. **Expo Account**: Create at https://expo.dev

## Quick Start (Development)

```bash
cd aangan_rn
npm install
npx expo start
```

Scan QR code with Expo Go app on your phone.

## Build Installable APK (Android)

### Option 1: EAS Cloud Build (Recommended)
```bash
# Login to Expo
npx eas-cli login

# Build Android APK (preview profile)
npx eas-cli build --platform android --profile preview

# This creates a downloadable .apk file
```

### Option 2: Local APK Build
```bash
# Requires Android SDK installed
npx eas-cli build --platform android --profile preview --local
```

## Build iOS IPA

### Option 1: EAS Cloud Build
```bash
# Build for internal distribution (ad-hoc)
npx eas-cli build --platform ios --profile preview

# Build for App Store
npx eas-cli build --platform ios --profile production
```

### Requirements for iOS:
- Apple Developer Account ($99/year)
- Set `appleId`, `ascAppId`, `appleTeamId` in eas.json
- Provisioning profile (EAS handles this automatically)

## Build Both Platforms
```bash
npx eas-cli build --platform all --profile preview
```

## Supabase Setup

1. Go to https://supabase.com/dashboard/project/okzmeuhxodzkbdilvkyu
2. Open SQL Editor
3. Run the complete schema: `supabase_schema_v0.1.sql`
4. Enable Phone Auth: Dashboard > Authentication > Providers > Phone
5. Configure Twilio: Add SID, Auth Token, Phone Number
6. Create Storage buckets: avatars (public), posts, events, event-photos (authenticated)
7. Enable Realtime: Dashboard > Database > Replication > Enable for notifications table

## Environment Variables

The Supabase URL and key are configured in `src/config/supabase.ts`.
For production, use environment variables via Expo:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://okzmeuhxodzkbdilvkyu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Project Structure

```
src/
├── assets/          # Fonts, festival data, panchang data
├── components/      # Reusable UI components
│   ├── common/      # GoldButton, InputField, AudienceSelector, LoadingScreen
│   ├── family/      # MemberCard
│   └── home/        # PostCard, PanchangWidget, FestivalBanner
├── config/          # Supabase client, constants
├── i18n/            # Hindi/English translations (460+ strings)
├── navigation/      # React Navigation setup
├── screens/         # All 13 screens
│   ├── auth/        # Splash, Login, OTP, ProfileSetup
│   ├── events/      # EventCreator, EventInvitation, RsvpTracker, EventPhotos
│   ├── family/      # FamilyTree
│   ├── home/        # HomeFeed, PostComposer, Notifications
│   ├── settings/    # Settings
│   └── storage/     # Storage, Referral
├── stores/          # Zustand state management (9 stores)
├── theme/           # Colors, typography, spacing
├── types/           # TypeScript database types
└── utils/           # Helper functions
```

## Tech Stack

| Tool | Purpose |
|------|---------|
| React Native + Expo | Cross-platform mobile framework |
| TypeScript | Type safety |
| Supabase | Backend (Postgres, Auth, Realtime, Storage) |
| Zustand | State management |
| React Navigation | Screen navigation |
| i18next | Bilingual support (Hindi/English) |

## Version: 0.1.0 (Foundation Build)
