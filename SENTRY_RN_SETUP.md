# Sentry on aangan_rn — Setup Runbook

The wiring is in place. Three one-time setup steps to actually turn it on.

## Status

| Piece | Status |
|---|---|
| `@sentry/react-native` in `package.json` | ✅ added |
| `Analytics` wrapper (`src/utils/analytics.ts`) | ✅ pre-existing |
| `Analytics.init()` call in `App.tsx` | ✅ wired (before fonts, before navigator) |
| `@sentry/react-native/expo` plugin in `app.json` | ✅ added |
| `EXPO_PUBLIC_SENTRY_DSN` env var on EAS | ⏳ Kumar — see below |
| `npx expo install @sentry/react-native` to materialize node_modules | ⏳ Kumar — see below |
| Sentry project created at sentry.io | ⏳ Kumar — see below |

## Step 1 — Create the Sentry project (5 min, free tier)

1. Go to https://sentry.io → sign in (or sign up — free tier covers 5K events/mo, plenty for v0)
2. **Create Project**
3. Platform: **React Native**
4. Project name: `aangan-rn`
5. Team: default
6. **Create Project**
7. Copy the DSN — looks like `https://<hash>@oXXX.ingest.sentry.io/<project-id>`

## Step 2 — Install the npm package locally + commit lockfile

```bash
cd aangan_rn
npx expo install @sentry/react-native
git add package.json package-lock.json
git commit -m "chore(rn) install @sentry/react-native"
```

The `expo install` command picks the version compatible with your Expo SDK (54.x → ~7.5.x). It also runs `expo prebuild` if you have native dirs, which Aangan doesn't — managed workflow, no action needed.

## Step 3 — Set the DSN on EAS (no rebuild required for env-only change)

```bash
cd aangan_rn
eas env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value 'https://<paste-dsn-from-step-1>' --environment production --environment preview --visibility plaintext
```

Or via the EAS web UI: https://expo.dev → your project → Environment variables → **+ Add** → name `EXPO_PUBLIC_SENTRY_DSN`, value the DSN, scope Production+Preview.

The `EXPO_PUBLIC_` prefix means the value is baked into the JS bundle at build time, so no separate native config needed. Local dev (`expo start`) won't have this var, which is fine — `Analytics.init()` no-ops silently and `secureLog.info('[Analytics] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled')` prints to the console.

## Step 4 — Build & verify

```bash
cd aangan_rn
eas build --platform ios --profile production
# Or for fast Android smoke test:
eas build --platform android --profile preview
```

(Costs 1 of your 15 free Android slots/month — see CLAUDE.md EAS quota memory.)

After the build installs on TestFlight / device, force a test crash to confirm wiring:

```ts
// drop this temporarily into AppNavigator or a screen useEffect
Analytics.trackError(new Error('Sentry smoke test'), { source: 'manual' });
```

Within 30s the event should appear at https://sentry.io → your project → Issues. After confirming, delete the test call.

## What gets captured

- **Uncaught exceptions** anywhere in the RN runtime → `Sentry.captureException`
- **Unhandled promise rejections**
- **`Analytics.trackError(err, context)`** call sites — explicit error tagging
- **Breadcrumbs** from `Analytics.trackScreen` and `Analytics.trackEvent` give context leading up to the crash
- **User identifier** set after login via `Analytics.setUser(userId, { display_name })` — only `username` (truncated to 30 chars), no PII

`tracesSampleRate: 0.1` → 10% of transactions sampled for performance. Bump to 1.0 during incident debugging, back to 0.1 after.

## Sample EAS env setup snippet (copy-paste once you have the DSN)

```bash
# Run inside aangan_rn/, replace <DSN> with the value from sentry.io
eas env:create \
  --scope project \
  --name EXPO_PUBLIC_SENTRY_DSN \
  --value '<DSN>' \
  --environment production \
  --environment preview \
  --visibility plaintext
```

After that single command, every future EAS build (iOS or Android, prod or preview) automatically inherits the DSN — no per-build flag needed.

## What this unblocks

Per CEO Review (CTO #2, COO #risk-5):
- v0.15.0 went to TestFlight crash-blind. Every iOS / Indus / Play crash since then has been invisible to Kumar.
- After this lands, **every crash, regardless of platform or distribution channel, surfaces in Sentry within ~30s** with full stack trace, user-id (if logged in), and breadcrumb trail.
- Closes the "no observability on RN" blocker for the COO 90-day "status page + synthetic probe" bet.
