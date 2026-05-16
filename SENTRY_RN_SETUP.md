# Crash Reporting — Sentry now, Praharee later

> **Status update [11:15pm - 16May26]**: Sentry is fully provisioned.
> Both projects created on EU/Germany region. Both env vars set on the
> respective deploy targets. Auto-deploys via Git → Vercel and EAS will
> pick up the DSN on the next build. **Nothing else for Kumar to do
> right now.**

## Live state

| Piece | Status |
|---|---|
| Sentry org: `reykan-information-technologie` | ✅ Kumar signed up |
| Sentry project: `aangan-rn` (React Native) | ✅ Created · EU/Germany region |
| Sentry project: `aangan-web` (Next.js) | ✅ Created · EU/Germany region |
| Vercel env var `NEXT_PUBLIC_SENTRY_DSN` (Production + Preview, Sensitive) | ✅ Set |
| EAS env var `EXPO_PUBLIC_SENTRY_DSN` (production + preview + development) | ✅ Set |
| Privacy policy disclosure (DPDP Legitimate Interest, GDPR-protected EU storage) | ✅ Committed |
| `@sentry/react-native` in `package.json` | ✅ added |
| `Analytics` wrapper (`src/utils/analytics.ts`) | ✅ pre-existing |
| `Analytics.init()` call in `App.tsx` | ✅ wired (before fonts, before navigator) |
| `@sentry/react-native/expo` plugin in `app.json` | ✅ added |
| Web auto-deploy after privacy-policy commit | ⏳ Triggers on next push to `main` |
| RN crash reporting going live | ⏳ Triggers on next `eas build` |

### What activates when

- **Web (aangan_web):** The next push to `main` triggers a Vercel auto-deploy. The new env var bakes into the build at deploy time. Crashes start streaming within minutes.
- **RN (aangan_rn):** The next `eas build --platform ios --profile production` (or android) embeds the env var in the bundle. Crashes start streaming once users install the new build.
- **Local dev:** `expo start` does NOT have the env var → `Analytics.init()` silently no-ops with the log `[Analytics] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled`. This is intentional — local crashes are noise.

## DSN reference (informational — do not commit DSNs to git)

DSNs are stored in:
- Vercel: Project Settings → Environment Variables → `NEXT_PUBLIC_SENTRY_DSN` (Sensitive)
- EAS: https://expo.dev/accounts/reykanit/projects/aangan/environment-variables → `EXPO_PUBLIC_SENTRY_DSN`

Both DSNs are on the EU/Germany region (`*.ingest.de.sentry.io`) — DPDP-friendlier than US, and GDPR-protected.

---

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

---

## Long-term plan: migrate to Praharee.com later

Per `notes/praharee.md`, Aangan is using Sentry today as a **proven-product step on the ladder** toward Aangan's own Indian-region crash-reporting product (Praharee.com — domain secured 2026-05-16). The decision rationale, vendor health analysis, and 10-point evaluation framework live in `notes/praharee.md`.

**Migration triggers** (any one fires the swap):

1. Aangan crosses **100K MAU** — at which point Sentry's pricing curve becomes visible (still affordable to ~10M MAU at ~₹20L/yr, but the migration window opens here for unit economics).
2. **DPDP Act SDF classification** is enforced for family-data apps — government mandates Indian residency.
3. **Sentry pricing** rises by >50%, OR Sentry gets acquired and changes terms.
4. **Praharee.com matures** to production-ready (per its own roadmap in `notes/praharee.md`).

**Migration cost when triggered** (estimate — covered in detail in the Praharee doc):

- Half-day code change: swap the SDK calls inside `src/utils/analytics.ts` to point at Praharee's ingestion endpoint
- ~1 week dual-write validation (Sentry + Praharee simultaneously to confirm parity)
- 1 commit to remove `@sentry/react-native` from `package.json` + the Expo plugin
- Privacy policy update to swap "Sentry (EU)" → "Praharee (Mumbai)"
- Total: **half a day of engineering + 1-2 week validation**

The `analytics.ts` wrapper was specifically built as the abstraction layer that makes this swap a one-file change. Sentry-specific assumptions are not allowed to leak into calling code — every screen calls `Analytics.trackError(err, ctx)`, never `Sentry.captureException()` directly.

### What NOT to build on Sentry (to keep the migration easy)

To avoid drift from Praharee's eventual feature set:

- ❌ Don't build Sentry-specific alert rules that use Sentry-only fields (e.g., release health, custom dashboards based on Sentry Discover)
- ❌ Don't enable Sentry Performance Monitoring (Praharee won't have it at v1 — see `notes/praharee.md` Tier 1/2/3)
- ❌ Don't enable Sentry Session Replay (Praharee Tier 3, year-2+ feature)
- ✅ DO use: basic error capture, breadcrumbs, user identifier, custom tags. All of these are protocol-portable.

Track this in `VENDOR_HEALTH.md` (to be created) with quarterly review.
