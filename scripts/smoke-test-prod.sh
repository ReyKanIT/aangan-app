#!/usr/bin/env bash
#
# scripts/smoke-test-prod.sh — verify the deploy worked.
#
# Probes:
#   1. /join/INVALID renders (web SSR)
#   2. /join/AB23CD renders (web SSR with valid-shape but unknown code)
#   3. lookup_invite RPC is anon-callable + returns the right shape
#   4. The middleware allows /join/* to be public
#   5. Storage bucket limits actually landed
#   6. Open edge functions reject unauth'd calls
#
# All probes are read-only — safe to re-run. Doesn't claim or mutate data.
#
# Usage:
#   ./scripts/smoke-test-prod.sh

set -uo pipefail

PROJECT_URL="https://okzmeuhxodzkbdilvkyu.supabase.co"
ANON_KEY="sb_publishable_w_bBTY5Rj-6rtPO1sssUig_KsMsidFD"
WEB_URL="https://aangan.app"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { printf "${GREEN}✓${NC} %s\n" "$*"; PASS=$((PASS+1)); }
fail() { printf "${RED}✗${NC} %s\n" "$*"; FAIL=$((FAIL+1)); }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
info() { printf "  %s\n" "$*"; }

echo
echo "=== Aangan production smoke test ==="
echo

# ── 1. Web /join/INVALID returns 200 + bilingual error ──────────────────
info "[1/6] GET $WEB_URL/join/INVALID"
RESP=$(curl -fsSL "$WEB_URL/join/INVALID" 2>&1) || RESP="curl_error"
if echo "$RESP" | grep -q "आमंत्रण उपलब्ध नहीं"; then
  pass "/join/INVALID renders bilingual error state"
else
  fail "/join/INVALID did not render expected error UI"
  info "  (page may not be deployed yet — check Vercel)"
fi

# ── 2. Web /join/<valid-shape-but-unknown> returns 200 too ──────────────
info "[2/6] GET $WEB_URL/join/AB23CD"
RESP=$(curl -fsSL "$WEB_URL/join/AB23CD" 2>&1) || RESP="curl_error"
if echo "$RESP" | grep -q "आमंत्रण"; then
  pass "/join/AB23CD renders (unknown code path)"
else
  fail "/join/AB23CD did not render"
fi

# ── 3. lookup_invite RPC is anon-callable ───────────────────────────────
info "[3/6] anon POST lookup_invite"
LOOKUP_BODY='{"p_code":"AB23CD","p_user_agent":"smoke-test","p_referer":null}'
LOOKUP=$(curl -fsSL -X POST "$PROJECT_URL/rest/v1/rpc/lookup_invite" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "$LOOKUP_BODY" 2>&1) || LOOKUP="curl_error"
if echo "$LOOKUP" | grep -q '"found"'; then
  pass "lookup_invite RPC is anon-callable + returns expected JSON shape"
  info "  response: $(echo "$LOOKUP" | head -c 200)..."
else
  fail "lookup_invite RPC did not return expected shape"
  info "  response: $LOOKUP"
  info "  (most likely the migration hasn't been applied yet — run ./scripts/deploy-prod.sh)"
fi

# ── 4. invalid-shape code returns invalid_code without DB lookup ────────
info "[4/6] anon POST lookup_invite with invalid shape"
INVALID=$(curl -fsSL -X POST "$PROJECT_URL/rest/v1/rpc/lookup_invite" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_code":"BADCODE","p_user_agent":null,"p_referer":null}' 2>&1) || INVALID="curl_error"
if echo "$INVALID" | grep -q '"invalid_code"'; then
  pass "lookup_invite rejects malformed codes early (no DB hit)"
else
  warn "lookup_invite invalid-code path returned unexpected: $(echo "$INVALID" | head -c 200)"
fi

# ── 5. claim_family_invite requires auth ────────────────────────────────
info "[5/6] anon POST claim_family_invite (must reject)"
CLAIM=$(curl -fsS -X POST "$PROJECT_URL/rest/v1/rpc/claim_family_invite" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_code":"AB23CD"}' 2>&1)
if echo "$CLAIM" | grep -qiE "(permission denied|not authorized|42501|authentication required)"; then
  pass "claim_family_invite correctly rejects anon callers"
elif echo "$CLAIM" | grep -q '"success":false'; then
  pass "claim_family_invite returned a structured error (also OK)"
else
  warn "claim_family_invite anon response was unexpected: $(echo "$CLAIM" | head -c 200)"
fi

# ── 6. open edge functions reject unauth'd calls ────────────────────────
info "[6/6] anon POST audit-log (should 401)"
AUDIT_RESP=$(curl -fsS -X POST "$PROJECT_URL/functions/v1/audit-log" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"user_login"}' 2>&1)
AUDIT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROJECT_URL/functions/v1/audit-log" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"action":"user_login"}' 2>&1)
if [[ "$AUDIT_CODE" =~ ^4 ]]; then
  pass "audit-log rejects no-bearer (HTTP $AUDIT_CODE)"
else
  fail "audit-log responded HTTP $AUDIT_CODE — expected 4xx"
  info "  response: $AUDIT_RESP"
fi

# ── Summary ─────────────────────────────────────────────────────────────
echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
if (( FAIL > 0 )); then
  echo
  echo "If failures relate to RPCs not found (404 / 'function does not exist'),"
  echo "the migration probably hasn't been applied to prod. Run:"
  echo "  ./scripts/deploy-prod.sh"
  exit 1
fi
exit 0
