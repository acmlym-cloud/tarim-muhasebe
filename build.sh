#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║           🚀 Çiftlik Takip - APK Build Script 🚀              ║
# ╚══════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🚀 Çiftlik Takip - APK Build Script 🚀              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd /app/frontend

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Step 1: Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Node.js $(node --version)${NC}"

if ! command -v yarn &> /dev/null; then
    echo -e "${RED}❌ Yarn not found${NC}"
    exit 1
fi
echo -e "${GREEN}  ✅ Yarn $(yarn --version)${NC}"

# Step 2: Install EAS CLI if not exists
echo -e "${YELLOW}📦 Step 2: Checking EAS CLI...${NC}"
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}  Installing EAS CLI...${NC}"
    npm install -g eas-cli
fi
echo -e "${GREEN}  ✅ EAS CLI ready${NC}"

# Step 3: Install dependencies
echo -e "${YELLOW}📦 Step 3: Installing dependencies...${NC}"
yarn install --frozen-lockfile 2>/dev/null || yarn install
echo -e "${GREEN}  ✅ Dependencies installed${NC}"

# Step 4: Run health check
echo -e "${YELLOW}🔍 Step 4: Running health check...${NC}"

# Check if backend is running
backend_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8001/api/accounts" 2>/dev/null || echo "000")
if [ "$backend_status" = "200" ]; then
    echo -e "${GREEN}  ✅ Backend API is running${NC}"
else
    echo -e "${YELLOW}  ⚠️ Backend not accessible (this is OK for local APK build)${NC}"
fi

# Step 5: Verify app.json
echo -e "${YELLOW}📱 Step 5: Verifying app configuration...${NC}"
if [ -f "app.json" ]; then
    app_name=$(cat app.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["expo"]["name"])' 2>/dev/null || echo "Unknown")
    app_version=$(cat app.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["expo"]["version"])' 2>/dev/null || echo "Unknown")
    app_package=$(cat app.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["expo"]["android"]["package"])' 2>/dev/null || echo "Unknown")
    
    echo -e "${GREEN}  ✅ App Name: $app_name${NC}"
    echo -e "${GREEN}  ✅ Version: $app_version${NC}"
    echo -e "${GREEN}  ✅ Package: $app_package${NC}"
else
    echo -e "${RED}❌ app.json not found${NC}"
    exit 1
fi

# Step 6: Build options
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    BUILD OPTIONS                               ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  1) APK (Preview) - Direct install on device"
echo "  2) AAB (Production) - For Google Play Store"
echo "  3) Local APK Build (No Expo account needed)"
echo "  4) Development Build"
echo "  5) Exit"
echo ""

read -p "Select build type [1-5]: " build_choice

case $build_choice in
    1)
        echo -e "${YELLOW}🔨 Building APK (Preview)...${NC}"
        echo -e "${BLUE}This will build on Expo servers. You need an Expo account.${NC}"
        echo ""
        eas build --platform android --profile preview
        ;;
    2)
        echo -e "${YELLOW}🔨 Building AAB (Production)...${NC}"
        echo -e "${BLUE}This will build on Expo servers. You need an Expo account.${NC}"
        echo ""
        eas build --platform android --profile production
        ;;
    3)
        echo -e "${YELLOW}🔨 Building Local APK...${NC}"
        echo -e "${BLUE}This requires Android SDK installed locally.${NC}"
        echo ""
        
        # Check for Android SDK
        if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
            echo -e "${RED}❌ Android SDK not found. Please set ANDROID_HOME or ANDROID_SDK_ROOT${NC}"
            echo ""
            echo "Alternative: Use Expo Go app for testing:"
            echo "  1. Install 'Expo Go' from Play Store"
            echo "  2. Run: npx expo start"
            echo "  3. Scan QR code with Expo Go"
            exit 1
        fi
        
        # Generate native project
        npx expo prebuild --platform android
        
        # Build APK
        cd android
        ./gradlew assembleRelease
        
        echo -e "${GREEN}✅ APK built successfully!${NC}"
        echo -e "${GREEN}📍 Location: android/app/build/outputs/apk/release/app-release.apk${NC}"
        ;;
    4)
        echo -e "${YELLOW}🔨 Building Development Client...${NC}"
        eas build --platform android --profile development
        ;;
    5)
        echo -e "${BLUE}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    BUILD COMPLETE! 🎉                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
