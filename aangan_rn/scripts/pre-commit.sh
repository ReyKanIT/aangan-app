#!/usr/bin/env sh
# Aangan RN pre-commit gate script.
#
# Husky 9 invokes this from .husky/pre-commit. Keeping the bulk of the
# logic in a regular shell script means we can edit / lint / version-control
# it like any other code path — the .husky/pre-commit file is a one-liner
# wrapper that just sources this.
#
# Sequence per feedback_release_workflow.md:
#   1. tsc --noEmit  (T0)            — fail on any new type break
#   2. jest src/__tests__/  (T1)     — full component + helper suite
#   3. check:critical-rn  (T2)       — manifest invariants (runs from repo root)
#
# Each gate is hard. A red gate means revert or fix — never bypass with --no-verify.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
RN_DIR="$REPO_ROOT/aangan_rn"

if [ ! -d "$RN_DIR" ]; then
  echo "pre-commit: aangan_rn directory not found; skipping RN gates"
  exit 0
fi

cd "$RN_DIR"

echo "▸ T0  tsc --noEmit (aangan_rn)"
npx --no-install tsc --noEmit

echo "▸ T1  jest src/__tests__/ (aangan_rn)"
npx --no-install jest src/__tests__/ --passWithNoTests

cd "$REPO_ROOT"
if [ -f "scripts/check-critical-rn.mjs" ]; then
  echo "▸ T2  check:critical-rn (root)"
  node scripts/check-critical-rn.mjs
fi

echo "✓ pre-commit gates passed"
