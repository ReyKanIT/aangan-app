#!/bin/bash
# ============================================================
# Aangan SMS OTP End-to-End Test Script
# Usage: ./scripts/test-sms-otp.sh [phone_number] [otp_code]
#
# Examples:
#   ./scripts/test-sms-otp.sh 8050407806          # Send OTP
#   ./scripts/test-sms-otp.sh 8050407806 123456   # Verify OTP
#   ./scripts/test-sms-otp.sh --status             # Check system status
# ============================================================

set -e

# Load from aangan_web/.env.local
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../aangan_web/.env.local"

if [ -f "$ENV_FILE" ]; then
  SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL "$ENV_FILE" | cut -d= -f2)
  ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENV_FILE" | cut -d= -f2)
else
  echo "❌ Cannot find $ENV_FILE — copy .env.local.example and fill in values"
  exit 1
fi

# MSG91 keys — set via env vars or Supabase secrets (not committed to git)
MSG91_AUTH_KEY="${MSG91_AUTH_KEY:-}"
MSG91_TEMPLATE_ID="${MSG91_TEMPLATE_ID:-}"
EDGE_FUNC_URL="$SUPABASE_URL/functions/v1/send-otp-sms"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# ─── STATUS CHECK ───────────────────────────────────────────
if [ "$1" = "--status" ]; then
  echo "=== Aangan SMS OTP System Status ==="
  echo ""

  # 1. Supabase Auth
  echo -n "Supabase Auth API: "
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY")
  [ "$STATUS" = "200" ] && pass "UP (HTTP $STATUS)" || fail "DOWN (HTTP $STATUS)"

  # 2. Phone auth enabled
  echo -n "Phone auth enabled: "
  PHONE_ENABLED=$(curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $ANON_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin)['external']['phone'])" 2>/dev/null)
  [ "$PHONE_ENABLED" = "True" ] && pass "YES" || fail "NO — enable in Supabase Dashboard"

  # 3. Edge function
  echo -n "Edge function (send-otp-sms): "
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$EDGE_FUNC_URL")
  [ "$STATUS" = "405" ] && pass "DEPLOYED (HTTP 405 = correct for GET)" || fail "NOT DEPLOYED (HTTP $STATUS)"

  # 4. MSG91 API
  echo -n "MSG91 API: "
  if [ -n "$MSG91_AUTH_KEY" ] && [ -n "$MSG91_TEMPLATE_ID" ]; then
    RESULT=$(curl -s "https://control.msg91.com/api/v5/otp?template_id=$MSG91_TEMPLATE_ID&mobile=919999999999&authkey=$MSG91_AUTH_KEY&otp=000000" -X POST -H "Content-Type: application/json" 2>/dev/null)
    TYPE=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('type',''))" 2>/dev/null)
    [ "$TYPE" = "success" ] && pass "OK (template + auth key valid)" || fail "ERROR: $RESULT"
  else
    info "SKIPPED (set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID env vars to test)"
  fi

  # 5. Live site
  echo -n "Live site (aangan.app): "
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.aangan.app")
  [ "$STATUS" = "200" ] && pass "UP (HTTP $STATUS)" || fail "DOWN (HTTP $STATUS)"

  echo ""
  echo "=== Pipeline ==="
  echo "User → aangan.app/login → Supabase Auth (signInWithOtp)"
  echo "  → Auth Hook → Edge Function (send-otp-sms)"
  echo "  → MSG91 OTP API → DLT → Telco → SMS on phone"
  echo ""
  exit 0
fi

# ─── SEND OTP ───────────────────────────────────────────────
PHONE="${1:-}"
OTP="${2:-}"

if [ -z "$PHONE" ]; then
  echo "Usage:"
  echo "  $0 --status              Check system health"
  echo "  $0 <10-digit-phone>      Send OTP"
  echo "  $0 <phone> <6-digit-otp> Verify OTP"
  exit 1
fi

# Validate phone
if ! echo "$PHONE" | grep -qE '^[6-9][0-9]{9}$'; then
  fail "Invalid phone number. Enter 10 digits starting with 6-9."
  exit 1
fi

FULL_PHONE="+91${PHONE}"

if [ -z "$OTP" ]; then
  # Send OTP
  echo "=== Sending OTP to $FULL_PHONE ==="
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$SUPABASE_URL/auth/v1/otp" \
    -X POST \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$FULL_PHONE\"}")

  BODY=$(echo "$RESPONSE" | head -1)
  STATUS=$(echo "$RESPONSE" | tail -1)

  if [ "$STATUS" = "200" ]; then
    pass "OTP sent to $FULL_PHONE"
    info "Check your phone for SMS from AANGAN"
    info "Then run: $0 $PHONE <6-digit-otp>"
  elif [ "$STATUS" = "429" ]; then
    fail "Rate limited — too many OTP requests. Wait 60 seconds."
  else
    fail "Failed (HTTP $STATUS): $BODY"
  fi
else
  # Verify OTP
  if ! echo "$OTP" | grep -qE '^[0-9]{6}$'; then
    fail "Invalid OTP. Enter exactly 6 digits."
    exit 1
  fi

  echo "=== Verifying OTP for $FULL_PHONE ==="
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$SUPABASE_URL/auth/v1/verify" \
    -X POST \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$FULL_PHONE\",\"token\":\"$OTP\",\"type\":\"sms\"}")

  BODY=$(echo "$RESPONSE" | head -1)
  STATUS=$(echo "$RESPONSE" | tail -1)

  if [ "$STATUS" = "200" ]; then
    # Extract user info
    USER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id','?'))" 2>/dev/null)
    ACCESS=$(echo "$BODY" | python3 -c "import sys,json; t=json.load(sys.stdin).get('access_token',''); print(t[:20]+'...' if t else 'none')" 2>/dev/null)

    pass "OTP verified! Login successful."
    echo "  User ID: $USER_ID"
    echo "  Access token: $ACCESS"
    echo ""
    pass "🎉 SMS OTP flow is fully working end-to-end!"
  else
    ERROR_MSG=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('msg',''))" 2>/dev/null)
    fail "Verification failed (HTTP $STATUS): $ERROR_MSG"
    if echo "$BODY" | grep -qi "expired"; then
      info "OTP expired. Send a new one: $0 $PHONE"
    fi
  fi
fi
