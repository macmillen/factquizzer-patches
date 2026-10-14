#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="/tmp/factquizzer_rvp_build"
JAVA_BIN="${JAVA_HOME:-$HOME/.local/share/jdk}/bin/java"
SMALI_JAR="$HOME/.local/share/smali.jar"
BAKSMALI_JAR="$HOME/.local/share/baksmali.jar"
BASE_RVP_URL="https://github.com/inotia00/revanced-patches/releases/download/v5.14.1/patches-5.14.1.rvp"
OUTPUT_RVP="$PROJECT_ROOT/FactQuizzer-Patches.rvp"

echo "=== FactQuizzer ReVanced Patch Bundle Builder ==="

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/extracted"

echo "[1/6] Downloading base ReVanced patches bundle..."
curl -L -s -o "$BUILD_DIR/base.rvp" "$BASE_RVP_URL"

echo "[2/6] Extracting patch bundle..."
unzip -q "$BUILD_DIR/base.rvp" -d "$BUILD_DIR/extracted"

echo "[3/6] Disassembling extension bytecode (shared.rve)..."
"$JAVA_BIN" -jar "$BAKSMALI_JAR" d "$BUILD_DIR/extracted/extensions/shared.rve" -o "$BUILD_DIR/shared_smali"

echo "[4/6] Injecting QuizButton smali files..."
cp "$SCRIPT_DIR/smali/app/revanced/extension/youtube/patches/overlaybutton/QuizButton"*.smali \
   "$BUILD_DIR/shared_smali/app/revanced/extension/youtube/patches/overlaybutton/"

echo "      Reassembling shared.rve..."
"$JAVA_BIN" -jar "$SMALI_JAR" a "$BUILD_DIR/shared_smali" -o "$BUILD_DIR/extracted/extensions/shared.rve"

echo "[5/6] Updating player bottom controls layout XML and preferences..."
cp "$SCRIPT_DIR/layout/youtube_controls_bottom_ui_container.xml" \
   "$BUILD_DIR/extracted/youtube/overlaybuttons/shared/host/layout/youtube_controls_bottom_ui_container.xml"

# Add FactQuizzer preference into revanced_prefs.xml
python3 -c "
prefs_path = '$BUILD_DIR/extracted/youtube/settings/xml/revanced_prefs.xml'
with open(prefs_path, 'r') as f:
    prefs_xml = f.read()

target_pref = '<SwitchPreference android:title=\"@string/revanced_overlay_button_external_downloader_title\" android:key=\"revanced_overlay_button_external_downloader\" android:summary=\"@string/revanced_overlay_button_external_downloader_summary\" />'
quizzer_pref = '''<SwitchPreference android:title=\"@string/revanced_overlay_button_external_downloader_title\" android:key=\"revanced_overlay_button_external_downloader\" android:summary=\"@string/revanced_overlay_button_external_downloader_summary\" />
        <!-- SETTINGS: FACTQUIZZER
        <SwitchPreference android:title=\"Show FactQuizzer button\" android:key=\"revanced_overlay_button_factquizzer\" android:summary=\"Tap to launch FactQuizzer quiz overlay.\" android:defaultValue=\"true\" />SETTINGS: FACTQUIZZER -->'''

prefs_xml = prefs_xml.replace(target_pref, quizzer_pref, 1)
with open(prefs_path, 'w') as f:
    f.write(prefs_xml)
"

echo "      Generating icons across all styles and densities..."
python3 -c "
from PIL import Image

src = Image.open('$PROJECT_ROOT/android-app/src/main/assets/icons/icon512.png').convert('RGBA')
mask = Image.new('L', src.size, 0)
for y in range(src.height):
    for x in range(src.width):
        p = src.getpixel((x, y))
        if p[3] > 50 and not (p[0] > 180 and p[1] < 80 and p[2] < 80):
            mask.putpixel((x, y), 255)

bbox = mask.getbbox()
cropped_mask = mask.crop(bbox)
brain_white = Image.new('RGBA', cropped_mask.size, (255, 255, 255, 255))
brain_white.putalpha(cropped_mask)

densities = {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}

for style in ['bold', 'rounded', 'thin']:
    for d_name, d_size in densities.items():
        canvas = Image.new('RGBA', (d_size, d_size), (0, 0, 0, 0))
        target_max = int(d_size * 0.72)
        ratio = min(target_max / brain_white.width, target_max / brain_white.height)
        new_w = max(1, int(brain_white.width * ratio))
        new_h = max(1, int(brain_white.height * ratio))
        resized = brain_white.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (d_size - new_w) // 2
        offset_y = (d_size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        canvas.save(f'$BUILD_DIR/extracted/youtube/overlaybuttons/{style}/drawable-{d_name}/revanced_quiz_button.png')
"

echo "      Updating patcher bytecode to register FactQuizzer standalone patch..."
"$JAVA_BIN" -jar "$BAKSMALI_JAR" d "$BUILD_DIR/extracted/classes.dex" -o "$BUILD_DIR/patcher_smali"

# Inject standalone FactQuizzerPatch smali files
mkdir -p "$BUILD_DIR/patcher_smali/app/revanced/patches/youtube/player/factquizzer"
cp "$SCRIPT_DIR/smali_patcher/app/revanced/patches/youtube/player/factquizzer/"*.smali \
   "$BUILD_DIR/patcher_smali/app/revanced/patches/youtube/player/factquizzer/"

# Patch OverlayButtonsPatchKt.smali for drawable only
python3 -c "
smali_path = '$BUILD_DIR/patcher_smali/app/revanced/patches/youtube/player/overlaybuttons/OverlayButtonsPatchKt.smali'
with open(smali_path, 'r') as f:
    code = f.read()

# 1. Expand drawable array from 0x17 to 0x18
code = code.replace(
    'const/16 v14, 0x17\n\n    .line 187\n    new-array v14, v14, [Ljava/lang/String;',
    'const/16 v14, 0x18\n\n    .line 187\n    new-array v14, v14, [Ljava/lang/String;'
)

# 2. Append revanced_quiz_button.png
target_drawable = '''const/16 v15, 0x16

    .line 209
    const-string v24, \"yt_outline_screen_vertical_vd_theme_24.png\"

    aput-object v24, v14, v15'''
quiz_drawable_insert = '''const/16 v15, 0x16

    .line 209
    const-string v24, \"yt_outline_screen_vertical_vd_theme_24.png\"

    aput-object v24, v14, v15

    const/16 v15, 0x17

    const-string v24, \"revanced_quiz_button.png\"

    aput-object v24, v14, v15'''
code = code.replace(target_drawable, quiz_drawable_insert, 1)

with open(smali_path, 'w') as f:
    f.write(code)
"

echo "      Reassembling patcher classes.dex..."
"$JAVA_BIN" -jar "$SMALI_JAR" a "$BUILD_DIR/patcher_smali" -o "$BUILD_DIR/extracted/classes.dex"

echo "      Injecting compiled .class files for desktop CLI support..."
cp -r "$SCRIPT_DIR/classes/"* "$BUILD_DIR/extracted/"

echo "[6/6] Packaging FactQuizzer-Patches.rvp..."
(cd "$BUILD_DIR/extracted" && zip -q -r "$OUTPUT_RVP" *)

echo "SUCCESS! Created $OUTPUT_RVP"
