# iOS TestFlight v0.15.0 — Live

**Date:** [1:36am - 6May26]
**Build ID:** 9eeb7356-aca1-47fc-9b63-6c2521fe51a9
**Submission ID:** 1d5cca8b-8e9a-43a7-bd27-cc4b4dc29838
**App Version:** 0.15.0 (build 22)
**IPA:** https://expo.dev/artifacts/eas/kCcqAhKEwcGB1jF9Wmd49e.ipa

## Setup performed this session

- Bundle ID `app.aangan.family` registered at developer.apple.com (Push Notifications enabled)
- App Store Connect entry created: ASC App ID **6766877913**
- Apple Team ID: **HF79NZ8925**
- App-Specific Password "EAS Build Aangan" generated for `eas submit`
- App Store Connect API Key (Admin role): Key ID **86FBFVF2G7**, Issuer ID `985fdd88-07a9-4cb9-ab1f-948c4d38c6de`
  - Stored at `~/.aangan/asc_api_key.p8` (chmod 600)
- `eas.json` populated with all real values, committed v0.15.0

## Future builds

All subsequent `eas build --platform ios --profile production --non-interactive` calls
work autonomously — Apple Distribution Cert + Provisioning Profile cached on EAS servers,
ASC API key handles `eas submit`.

## Next actions
- Add internal testers in App Store Connect → TestFlight → Internal Testing
- Verify push notifications work on TestFlight build
- Monitor Sentry for crashes on real iOS hardware
