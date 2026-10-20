#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${IN_BUILDER_CONTAINER:-0}" != "1" ] && ! command -v java >/dev/null 2>&1 && [ ! -x "$SCRIPT_DIR/.local/jdk/bin/java" ]; then
    exec docker compose -f "$SCRIPT_DIR/docker-compose.yml" run --rm apk-builder ./patch-youtube.sh "$@"
fi
JAVA_BIN="${JAVA_HOME:-$SCRIPT_DIR/.local/jdk}/bin/java"
CLI_JAR="$SCRIPT_DIR/tools/revanced-cli.jar"
PATCHES_RVP="$SCRIPT_DIR/FactQuizzer-Patches.rvp"
OUTPUT_APK="$SCRIPT_DIR/YouTube-FactQuizzer.apk"
KEYSTORE="$SCRIPT_DIR/android-app/debug.keystore"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  YouTube ReVanced + FactQuizzer APK Patcher Tool    ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 1. Check Java
if [ ! -f "$JAVA_BIN" ]; then
    if command -v java >/dev/null 2>&1; then
        JAVA_BIN="$(command -v java)"
    else
        echo -e "${RED}[ERROR] Java 17 not found!${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[✓] Java detected:${NC} $($JAVA_BIN -version 2>&1 | head -n 1)"

# Check CLI JAR
if [ ! -f "$CLI_JAR" ]; then
    echo -e "${YELLOW}[!] revanced-cli.jar fehlt. Lade herunter...${NC}"
    mkdir -p "$(dirname "$CLI_JAR")"
    curl -L -s -o "$CLI_JAR" "https://github.com/inotia00/revanced-cli/releases/download/v5.0.2/revanced-cli-5.0.2-all.jar"
fi

# 2. Check Patches Bundle
if [ ! -f "$PATCHES_RVP" ]; then
    echo -e "${YELLOW}[!] FactQuizzer-Patches.rvp missing. Generating now...${NC}"
    "$SCRIPT_DIR/revanced-custom-patch/generate-rvp.sh"
fi
echo -e "${GREEN}[✓] Patch bundle:${NC} $PATCHES_RVP"

# 3. Locate Input YouTube APK
INPUT_APK="$1"

if [ -z "$INPUT_APK" ]; then
    # Try searching in current directory and Downloads
    FOUND_APK=$(find "$SCRIPT_DIR" "$HOME/Downloads" -maxdepth 2 -iname "*youtube*.apk" ! -iname "*FactQuizzer*" ! -iname "*revanced*" 2>/dev/null | head -n 1 || true)
    if [ -n "$FOUND_APK" ]; then
        INPUT_APK="$FOUND_APK"
    fi
fi

if [ -z "$INPUT_APK" ] || [ ! -f "$INPUT_APK" ]; then
    echo ""
    echo -e "${YELLOW}[!] Kein YouTube APK angegeben oder gefunden.${NC}"
    echo -e "Bitte lade die offizielle YouTube APK herunter (z.B. Version 19.47.53 nodpi universal):"
    echo -e "👉 ${BLUE}https://www.apkmirror.com/apk/google-inc/youtube/youtube-19-47-53-release/${NC}"
    echo ""
    echo -e "Anschließend führe diesen Befehl aus:"
    echo -e "   ${GREEN}./patch-youtube.sh /pfad/zu/deiner/youtube.apk${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}[✓] Verwende YouTube APK:${NC} $INPUT_APK"
echo ""
echo -e "${BLUE}[*] Starte ReVanced Patch-Vorgang... Dies kann 1-2 Minuten dauern.${NC}"

# Ensure keystore exists
if [ ! -f "$KEYSTORE" ]; then
    mkdir -p "$(dirname "$KEYSTORE")"
    keytool -genkeypair -v -keystore "$KEYSTORE" -alias androiddebugkey \
        -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android \
        -dname "CN=Android Debug,O=Android,C=US" 2>/dev/null || true
fi

# Run ReVanced CLI
"$JAVA_BIN" -jar "$CLI_JAR" patch \
    -p "$PATCHES_RVP" \
    --keystore "$KEYSTORE" \
    --keystore-password android \
    --keystore-entry-alias androiddebugkey \
    --keystore-entry-password android \
    -o "$OUTPUT_APK" \
    "$INPUT_APK"

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}  ERFOLG! Gepatchte APK erstellt:                    ${NC}"
echo -e "${GREEN}  $OUTPUT_APK                                        ${NC}"
echo -e "${GREEN}=====================================================${NC}"

# Check ADB
if command -v adb >/dev/null 2>&1; then
    DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device$" | wc -l)
    if [ "$DEVICE_COUNT" -gt 0 ]; then
        echo ""
        echo -e "${BLUE}[*] Verbundenes Android-Gerät gefunden!${NC}"
        read -p "Möchtest du YouTube-FactQuizzer.apk direkt auf dem Gerät installieren? [J/n]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[JjYy]$ ]] || [ -z "$REPLY" ]; then
            echo -e "${BLUE}[*] Installiere APK auf dem Gerät...${NC}"
            adb install -r "$OUTPUT_APK"
            echo -e "${GREEN}[✓] Erfolgreich installiert!${NC}"
        fi
    fi
fi
