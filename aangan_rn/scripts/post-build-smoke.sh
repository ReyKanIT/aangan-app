#!/usr/bin/env bash
#
# post-build-smoke.sh — T3 post-build smoke pack
# ------------------------------------------------------------------
# Installs a freshly-built iOS .app onto the booted simulator and runs
# the Maestro smoke flow(s) against it. Returns 0 only when every flow
# passes. Wired into release.mjs in Phase 4 (per REGRESSION_SUITE.md).
#
# Usage:
#   scripts/post-build-smoke.sh /path/to/Aangan.app
#
# Environment:
#   UDID         iOS simulator UDID (default: Kumar's iPhone 17 Pro)
#   MAESTRO_DIR  Override the .maestro/ flow directory (default: repo-root/.maestro)
#   BUNDLE_ID    App bundle id to relaunch (default: app.aangan.family)
#
# Authored [10:42pm - 17May26] — Testing Lead per CTO M5 anchor.
# ------------------------------------------------------------------
set -euo pipefail

UDID="${UDID:-2B795901-B185-4FDE-B0EE-63D2DD9B1501}"
BUNDLE_ID="${BUNDLE_ID:-app.aangan.family}"

# Repo root = parent of aangan_rn/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAESTRO_DIR="${MAESTRO_DIR:-$REPO_ROOT/.maestro}"

# ---- arg check ----
if [ "$#" -lt 1 ]; then
  echo "usage: $0 <path-to-Aangan.app>" >&2
  exit 64
fi
APP_PATH="$1"

if [ ! -d "$APP_PATH" ]; then
  echo "error: APP_PATH does not exist or is not a .app bundle: $APP_PATH" >&2
  exit 65
fi

if [ ! -d "$MAESTRO_DIR" ]; then
  echo "error: MAESTRO_DIR does not exist: $MAESTRO_DIR" >&2
  exit 66
fi

# ---- preflight ----
if ! command -v xcrun >/dev/null 2>&1; then
  echo "error: xcrun not on PATH — install Xcode command line tools" >&2
  exit 67
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "error: maestro not on PATH" >&2
  echo "  install: curl -Ls 'https://get.maestro.mobile.dev' | bash" >&2
  echo "  then: export PATH=\"\$PATH:\$HOME/.maestro/bin\"" >&2
  exit 68
fi

# ---- boot check ----
echo "▸ Checking simulator $UDID..."
if ! xcrun simctl list devices booted | grep -q "$UDID"; then
  echo "  → booting $UDID"
  xcrun simctl boot "$UDID"
  # Give SpringBoard a moment.
  sleep 5
fi

# ---- install ----
echo "▸ Installing $APP_PATH onto $UDID..."
xcrun simctl install "$UDID" "$APP_PATH"

# ---- relaunch to a known state ----
echo "▸ Terminating any running instance of $BUNDLE_ID..."
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true

echo "▸ Launching $BUNDLE_ID..."
xcrun simctl launch "$UDID" "$BUNDLE_ID"

# Allow the splash → login transition to settle before Maestro probes.
sleep 4

# ---- run flows ----
echo "▸ Running Maestro flows from $MAESTRO_DIR..."
# Use --format junit so CI (Phase 4) can ingest results. Output is also
# echoed to stdout so a human running this locally sees pass/fail in
# real time.
RESULTS_DIR="${RESULTS_DIR:-/tmp/aangan-maestro}"
mkdir -p "$RESULTS_DIR"

# Default flow: signin-phone. Add more by passing them as additional args
# (e.g. scripts/post-build-smoke.sh App.app extra-flow.yaml) or by adding
# them to FLOWS below.
FLOWS=(
  "$MAESTRO_DIR/signin-phone.yaml"
)
shift || true
for extra in "$@"; do
  FLOWS+=("$extra")
done

EXIT_CODE=0
for flow in "${FLOWS[@]}"; do
  echo "  → $flow"
  if ! maestro --device "$UDID" test "$flow" \
        --format junit \
        --output "$RESULTS_DIR/$(basename "${flow%.*}").xml"; then
    EXIT_CODE=1
    echo "  ✗ FAILED: $flow"
  else
    echo "  ✓ PASSED: $flow"
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✓ All smoke flows passed. Results: $RESULTS_DIR"
else
  echo "✗ One or more smoke flows failed. Results: $RESULTS_DIR" >&2
fi

exit "$EXIT_CODE"
