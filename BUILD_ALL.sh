#!/bin/bash
# ============================================================
# Aangan v0.2 — One-Command Build Script
# ============================================================
# Builds: Android APK + iOS IPA (via EAS) + Website
#
# Prerequisites:
#   1. EAS login:    eas login   (Expo account: reykanit)
#   2. Vercel login: npx vercel login
#
# Usage:
#   chmod +x BUILD_ALL.sh
#   ./BUILD_ALL.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RN_DIR="$SCRIPT_DIR/aangan_rn"
WEB_DIR="$SCRIPT_DIR/aangan_web"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           Aangan v0.2 — Build & Deploy              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─── Check prerequisites ───────────────────────────────────
check_eas() {
  if ! command -v eas &>/dev/null; then
    echo "Installing EAS CLI..."
    npm install -g eas-cli --prefix ~/.npm-global
    export PATH="$HOME/.npm-global/bin:$PATH"
  fi
}

check_logged_in() {
  if ! eas whoami &>/dev/null 2>&1; then
    echo "❌ Not logged in to EAS. Run: eas login"
    echo "   Account: reykanit"
    exit 1
  fi
  echo "✅ EAS logged in as: $(eas whoami)"
}

# ─── Website Build & Deploy ────────────────────────────────
build_website() {
  echo ""
  echo "─── Website ─────────────────────────────────────────"
  echo "Building Next.js..."
  cd "$WEB_DIR"
  npm install
  npm run build
  echo "✅ Website built at: $WEB_DIR/.next/standalone"

  echo "Deploying to Vercel..."
  if command -v vercel &>/dev/null && vercel whoami &>/dev/null 2>&1; then
    npx vercel --prod --yes
    echo "✅ Website deployed to Vercel"
  else
    echo "⚠️  Vercel not logged in. Run: npx vercel login && npx vercel --prod"
    echo "   Or deploy .next/standalone to any Node.js host"
  fi
}

# ─── Android APK Build ────────────────────────────────────
build_android() {
  echo ""
  echo "─── Android APK ─────────────────────────────────────"
  cd "$RN_DIR"
  echo "Starting EAS Android build (cloud)..."
  eas build \
    --platform android \
    --profile preview \
    --non-interactive \
    --message "v0.2 Security Release"
  echo "✅ Android APK build queued — check https://expo.dev for download link"
}

# ─── iOS IPA Build ────────────────────────────────────────
build_ios() {
  echo ""
  echo "─── iOS IPA ─────────────────────────────────────────"
  cd "$RN_DIR"
  echo "Starting EAS iOS build (cloud)..."
  eas build \
    --platform ios \
    --profile preview \
    --non-interactive \
    --message "v0.2 Security Release"
  echo "✅ iOS IPA build queued — check https://expo.dev for download link"
}

# ─── Main ─────────────────────────────────────────────────
main() {
  export PATH="$HOME/.npm-global/bin:$PATH"
  check_eas

  BUILD_TARGET="${1:-all}"

  case "$BUILD_TARGET" in
    web)      build_website ;;
    android)  check_logged_in && build_android ;;
    ios)      check_logged_in && build_ios ;;
    apps)     check_logged_in && build_android && build_ios ;;
    all)
      build_website
      check_logged_in
      build_android
      build_ios
      ;;
    *)
      echo "Usage: $0 [web|android|ios|apps|all]"
      exit 1
      ;;
  esac

  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║                   Build Complete!                   ║"
  echo "╠══════════════════════════════════════════════════════╣"
  echo "║  APK/IPA download: https://expo.dev/accounts/       ║"
  echo "║                    reykanit/projects/aangan         ║"
  echo "╚══════════════════════════════════════════════════════╝"
}

main "$@"
