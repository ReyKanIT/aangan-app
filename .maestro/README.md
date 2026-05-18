# Aangan Maestro Flows (.maestro/)

> Tier T3 of the regression suite — see `REGRESSION_SUITE.md` at the repo root
> for the layered model.

Maestro drives the iOS simulator (and Android emulator, when wired) through
real navigation flows. This is where we catch the regression class that Jest
**cannot** see — runtime exceptions in native modules, Reanimated worklets,
react-native-svg, and React's Rules-of-Hooks violations that only fire on
re-render (e.g. the 2026-05-17 gen-tree regression in v0.16.1).

---

## Installing Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
# Add $HOME/.maestro/bin to your PATH per the installer prompt.
maestro --version  # confirm
```

Homebrew alternative (preferred on Kumar's machine):

```bash
brew tap mobile-dev-inc/tap
brew install maestro
```

> **Block:** if `sudo` is required for the homebrew prefix, fall back to the
> curl install which only writes to `$HOME/.maestro`.

---

## Running flows

```bash
# Boot the canonical iPhone 17 Pro simulator first
xcrun simctl boot 2B795901-B185-4FDE-B0EE-63D2DD9B1501 || true
open -a Simulator

# Install the latest dev build OR the EAS-preview-ios-sim artifact onto it,
# then run one flow:
maestro test .maestro/family-tree-renders.yaml

# Or the full pack:
maestro test .maestro/
```

The flow files reference the app by its iOS bundle id `app.aangan.family` and the
Android package `app.aangan.family`. They're agnostic to debug vs release; just
make sure SOMETHING is installed.

---

## Test account (per CLAUDE.md)

| Field | Value |
|---|---|
| Phone | `9876543210` |
| OTP | `123456` |
| iOS simulator | iPhone 17 Pro, UDID `2B795901-B185-4FDE-B0EE-63D2DD9B1501` |
| App bundle id | `app.aangan.family` |

Flows that need to log in should always use this number — Twilio's test mode
is wired to accept it without sending a real SMS. **Never check live numbers
into a flow** — they'll consume Twilio quota on CI.

---

## Naming convention

`<area>-<behaviour>.yaml`

- `family-tree-renders.yaml` — Family tab opens, कुलवृक्ष selected by default, canvas renders without ErrorBoundary fallback.
- `signin-phone.yaml` — phone OTP happy path.
- `compose-photo.yaml` — pick library photo → post → verify in feed.
- `add-member-name-only.yaml` — modal name-first form, name only.
- `add-member-with-phone.yaml` — same, with phone field.
- `create-event.yaml` — Events tab → EventCreator → save → appears in list.
- `panchang-special-day.yaml` — fake a special-tithi date and verify ribbon.

One feature = one or more flows; keep them under a minute each so the
post-build smoke pack can run inside the EAS post-build hook budget.

---

## Adding a new flow

1. Reproduce the bug or behaviour by hand on the simulator first. Note the
   exact tap targets — Maestro selects by visible text, by `testID`, or by
   coordinates (last resort).
2. Start small: `appId` + `launchApp` + one `assertVisible`. Run it.
3. Layer taps. Re-run after each tap.
4. Commit + add a row to `AANGAN_REGRESSION_SUITE.xlsx` via the generator
   at `/tmp/build_aangan_regression_xlsx.py`.

---

## What's wired today

- `signin-phone.yaml` — reviewer-bypass phone OTP flow (`9876543210`/`123456`).
  Handles both fresh-state and cached-session start paths by signing out
  through Settings before driving the real OTP screen. Every other flow
  depends on the app being signed in, so this is the prerequisite leaf
  in the smoke graph. *(landed [10:42pm - 17May26])*
- `family-tree-renders.yaml` — canonical reproducer for the gen-tree
  regression class (v0.16.1, Kumar 2026-05-17).

Everything else from REGRESSION_SUITE.md's Phase-3 list is on the backlog —
see `notes/test-backlog.md`.

---

## Post-build smoke harness

The single-entry point for running the smoke pack against a freshly-built
.app artifact is `aangan_rn/scripts/post-build-smoke.sh`:

```bash
bash aangan_rn/scripts/post-build-smoke.sh /path/to/Aangan.app
# or, when +x:
aangan_rn/scripts/post-build-smoke.sh /path/to/Aangan.app
```

It installs the artifact via `xcrun simctl install`, cold-launches it,
then runs `maestro test signin-phone.yaml` (and any additional flows
passed as args) with JUnit output to `/tmp/aangan-maestro/`. Exit code
is 0 only when every flow passes — wire this into `release.mjs` in
Phase 4 to gate `eas submit` on real-device behaviour.

The contract is documented in TESTING.md Phase 3.
