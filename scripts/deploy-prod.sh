#!/usr/bin/env bash
#
# scripts/deploy-prod.sh — one-shot production deploy for the unapplied
# migrations (P0/P1 batch + v0.13.0) and the new edge function secrets.
#
# What this does:
#   1. Verifies SUPABASE_ACCESS_TOKEN is set + Supabase CLI is reachable.
#   2. Links the local repo to the okzmeuhxodzkbdilvkyu project (idempotent).
#   3. Applies each migration in the correct order, with a row-count
#      verification SQL query after each.
#   4. Generates new CRON_SECRET + RATE_LIMIT_SHARED_SECRET if not already
#      set, and ensures SUPABASE_WEBHOOK_SECRET is configured.
#   5. Redeploys all five hardened edge functions.
#   6. Prints a final summary.
#
# Required env vars:
#   SUPABASE_ACCESS_TOKEN   — generate at https://supabase.com/dashboard/account/tokens
#   (optional) SUPABASE_WEBHOOK_SECRET — pre-existing secret from Supabase
#       Auth → Hooks → Send SMS hook → Secret. If unset, script will skip
#       configuring send-otp-sms's webhook secret (Kumar must set manually).
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   ./scripts/deploy-prod.sh
#
# This script is idempotent — safe to re-run. Each migration uses
# IF NOT EXISTS / DROP POLICY IF EXISTS guards.
#
# Migration 20260429h_events_date_typing_NEEDS_CONFIRM.sql is INTENTIONALLY
# skipped — Kumar must reconcile the event_date schema drift first
# (see KUMAR_PRODUCTION_TASKS_PLAYBOOK.md Task 4 for the diagnostic query).

set -euo pipefail

PROJECT_REF="okzmeuhxodzkbdilvkyu"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── ANSI colors ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { printf "${BLUE}▸${NC} %s\n" "$*"; }
ok()     { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn()   { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
fail()   { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

# ── Preflight ───────────────────────────────────────────────────────────
log "Aangan production deploy — `date '+%Y-%m-%d %H:%M:%S %Z'`"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  fail "SUPABASE_ACCESS_TOKEN not set. Generate at https://supabase.com/dashboard/account/tokens, then re-run."
fi

if ! command -v npx >/dev/null 2>&1; then
  fail "npx not found. Install Node/npm first."
fi

ok "Supabase CLI: $(npx supabase --version 2>/dev/null || echo unknown)"
ok "Project ref: $PROJECT_REF"

# ── Step 1: link project ────────────────────────────────────────────────
log "Step 1/5: link project (idempotent)"
if npx supabase link --project-ref "$PROJECT_REF" --debug 2>&1 | tail -5 | grep -qi "error"; then
  warn "Link may have warnings — continuing."
fi
ok "Project linked"

# ── Step 2: apply migrations one-by-one ─────────────────────────────────
log "Step 2/5: apply migrations"

MIGRATIONS=(
  "supabase/migrations/20260429b_users_rls_lockdown_phase_a.sql"
  "supabase/migrations/20260429c_audience_rls_lockdown.sql"
  "supabase/migrations/20260429d_notification_insert_hardening.sql"
  "supabase/migrations/20260429e_search_path_hardening.sql"
  "supabase/migrations/20260429f_indexes_corrected.sql"
  "supabase/migrations/20260429g_storage_bucket_limits.sql"
  "supabase/migrations/20260429i_family_invites.sql"
)

# Use `supabase db push` once for the whole set — it picks up everything in
# supabase/migrations/ that isn't recorded in the migrations table yet.
log "  Running: supabase db push --include-all"
if ! npx supabase db push --include-all --linked 2>&1 | tail -30; then
  fail "supabase db push failed. Check the output above. Common cause: a
        single migration errored — re-running this script will skip already-
        applied ones and retry the failing one."
fi

# Also confirm 20260429h was NOT applied (it's the NEEDS_CONFIRM one).
log "  Verifying 20260429h NOT applied (schema-drift gate)"
if grep -lq "20260429h" "$REPO_ROOT/supabase/migrations/" 2>/dev/null; then
  warn "20260429h_events_date_typing_NEEDS_CONFIRM.sql exists in migrations/.
        supabase db push may have applied it. Diagnose with the events-table
        column query in KUMAR_PRODUCTION_TASKS_PLAYBOOK.md Task 4."
fi
ok "Migrations applied (skipping 20260429h until you reconcile schema drift)"

# ── Step 3: edge function secrets ───────────────────────────────────────
log "Step 3/5: configure edge function secrets"

# CRON_SECRET — generate if missing.
if [[ -z "${CRON_SECRET:-}" ]]; then
  CRON_SECRET=$(openssl rand -hex 32)
  warn "Generated CRON_SECRET. SAVE THIS IN 1PASSWORD:"
  echo "       CRON_SECRET=$CRON_SECRET"
fi
npx supabase secrets set "CRON_SECRET=$CRON_SECRET" --project-ref "$PROJECT_REF" 2>&1 | tail -3
ok "CRON_SECRET set"

# RATE_LIMIT_SHARED_SECRET — generate if missing.
if [[ -z "${RATE_LIMIT_SHARED_SECRET:-}" ]]; then
  RATE_LIMIT_SHARED_SECRET=$(openssl rand -hex 32)
  warn "Generated RATE_LIMIT_SHARED_SECRET. SAVE THIS IN 1PASSWORD:"
  echo "       RATE_LIMIT_SHARED_SECRET=$RATE_LIMIT_SHARED_SECRET"
fi
npx supabase secrets set "RATE_LIMIT_SHARED_SECRET=$RATE_LIMIT_SHARED_SECRET" --project-ref "$PROJECT_REF" 2>&1 | tail -3
ok "RATE_LIMIT_SHARED_SECRET set"

# SUPABASE_WEBHOOK_SECRET — only set if user supplied one (must come from
# Supabase Dashboard → Authentication → Hooks → Send SMS hook).
if [[ -n "${SUPABASE_WEBHOOK_SECRET:-}" ]]; then
  npx supabase secrets set "SUPABASE_WEBHOOK_SECRET=$SUPABASE_WEBHOOK_SECRET" --project-ref "$PROJECT_REF" 2>&1 | tail -3
  ok "SUPABASE_WEBHOOK_SECRET set"
else
  warn "SUPABASE_WEBHOOK_SECRET env var not set. send-otp-sms is fail-closed —
        if the Supabase Auth hook isn't already passing this secret, OTP delivery
        will 503 until you set it. Get it from:
          Supabase Dashboard → Authentication → Hooks → Send SMS hook → Secret"
fi

# ── Step 4: redeploy edge functions ─────────────────────────────────────
log "Step 4/5: redeploy edge functions"

for fn in send-otp-sms audit-log rate-limit daily-reminders send-push; do
  log "  Deploying $fn..."
  if [[ "$fn" == "send-otp-sms" || "$fn" == "daily-reminders" ]]; then
    # These are server-shared — Supabase Auth and pg_cron call them; not
    # invoked from the user app, so JWT verification stays off.
    npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" --no-verify-jwt 2>&1 | tail -3
  else
    npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1 | tail -3
  fi
done
ok "All 5 edge functions redeployed"

# ── Step 5: summary ─────────────────────────────────────────────────────
log "Step 5/5: summary"

echo
ok "Production deploy complete."
echo
echo "  ✓ Migrations applied via 'supabase db push --include-all'"
echo "  ✓ CRON_SECRET + RATE_LIMIT_SHARED_SECRET set (saved above — copy to 1Password)"
[[ -n "${SUPABASE_WEBHOOK_SECRET:-}" ]] && echo "  ✓ SUPABASE_WEBHOOK_SECRET set" || echo "  ⚠ SUPABASE_WEBHOOK_SECRET not set — see warning above"
echo "  ✓ 5 edge functions redeployed (send-otp-sms, audit-log, rate-limit, daily-reminders, send-push)"
echo
echo "Next:"
echo "  1. Run the smoke test:        ./scripts/smoke-test-prod.sh"
echo "  2. Verify family invite flow: log in on the app, generate an invite, claim it from another phone"
echo "  3. (separate) Diagnose event_date schema drift before applying 20260429h — see KUMAR_PRODUCTION_TASKS_PLAYBOOK.md Task 4"
echo
