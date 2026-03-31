#!/bin/bash
# =============================================================================
# Aangan आँगन — Build Script v0.1
# =============================================================================
# This script builds installable APK (Android) and IPA (iOS) using EAS Cloud.
#
# Prerequisites:
#   1. Node.js 18+ installed
#   2. Expo account (create at https://expo.dev/signup)
#
# Usage:
#   ./build.sh          # Build both platforms
#   ./build.sh android  # Build Android APK only
#   ./build.sh ios      # Build iOS IPA only
#   ./build.sh login    # Login to Expo first
# =============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  █████╗  █████╗ ███╗   ██╗ ██████╗  █████╗ ███╗   ██╗"
echo " ██╔══██╗██╔══██╗████╗  ██║██╔════╝ ██╔══██╗████╗  ██║"
echo " ███████║███████║██╔██╗ ██║██║  ███╗███████║██╔██╗ ██║"
echo " ██╔══██║██╔══██║██║╚██╗██║██║   ██║██╔══██║██║╚██╗██║"
echo " ██║  ██║██║  ██║██║ ╚████║╚██████╔╝██║  ██║██║ ╚████║"
echo " ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝"
echo -e "${NC}"
echo "  Build Script v0.1 — Your Family App"
echo ""

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Update Node.js.${NC}"
    exit 1
fi

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Handle commands
case "${1:-both}" in
    login)
        echo -e "${YELLOW}Logging into Expo...${NC}"
        npx eas-cli login
        echo -e "${GREEN}Login successful!${NC}"
        ;;

    android)
        echo -e "${YELLOW}Building Android APK...${NC}"
        echo "This will build on Expo's cloud servers."
        echo "The APK file will be available for download when complete."
        echo ""
        npx eas-cli build --platform android --profile preview
        echo -e "${GREEN}Android build complete! Check the link above to download the APK.${NC}"
        ;;

    ios)
        echo -e "${YELLOW}Building iOS IPA...${NC}"
        echo "This will build on Expo's cloud servers."
        echo "You'll need an Apple Developer account for iOS builds."
        echo ""
        npx eas-cli build --platform ios --profile preview
        echo -e "${GREEN}iOS build complete! Check the link above to download.${NC}"
        ;;

    both)
        echo -e "${YELLOW}Building for Android and iOS...${NC}"
        echo ""

        echo -e "${YELLOW}Step 1: Checking Expo login...${NC}"
        npx eas-cli whoami 2>/dev/null || {
            echo -e "${YELLOW}Not logged in. Running login...${NC}"
            npx eas-cli login
        }

        echo ""
        echo -e "${YELLOW}Step 2: Building Android APK...${NC}"
        npx eas-cli build --platform android --profile preview --non-interactive

        echo ""
        echo -e "${YELLOW}Step 3: Building iOS IPA...${NC}"
        npx eas-cli build --platform ios --profile preview --non-interactive

        echo ""
        echo -e "${GREEN}Both builds initiated!${NC}"
        echo "Download links will appear when builds complete."
        echo "You can also check status at: https://expo.dev/accounts/YOUR_ACCOUNT/builds"
        ;;

    *)
        echo "Usage: ./build.sh [login|android|ios|both]"
        echo ""
        echo "  login    - Login to your Expo account"
        echo "  android  - Build Android APK"
        echo "  ios      - Build iOS IPA"
        echo "  both     - Build both platforms (default)"
        ;;
esac
