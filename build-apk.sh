#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${IN_BUILDER_CONTAINER:-0}" != "1" ] && [ ! -d "$PROJECT_DIR/.local/jdk" ]; then
  exec docker compose -f "$PROJECT_DIR/docker-compose.yml" run --rm apk-builder ./build-apk.sh "$@"
fi

SDK_DIR="$PROJECT_DIR/.local/android-sdk"
if [ -d "$PROJECT_DIR/.local/jdk" ]; then
  export JAVA_HOME="$PROJECT_DIR/.local/jdk"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if ! command -v zip >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq zip unzip curl >/dev/null
fi

if [ ! -f "$SDK_DIR/build-tools/34.0.0/aapt2" ] || [ ! -f "$SDK_DIR/platforms/android-34/android.jar" ]; then
  echo "==> Bootstrapping project-local Android SDK into .local/android-sdk..."
  mkdir -p "$SDK_DIR/cmdline-tools"
  curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o "$SDK_DIR/cmdline-tools.zip"
  unzip -q "$SDK_DIR/cmdline-tools.zip" -d "$SDK_DIR/cmdline-tools"
  rm -f "$SDK_DIR/cmdline-tools.zip"
  yes | "$SDK_DIR/cmdline-tools/cmdline-tools/bin/sdkmanager" --sdk_root="$SDK_DIR" "build-tools;34.0.0" "platforms;android-34" >/dev/null
fi

export PATH="$SDK_DIR/build-tools/34.0.0:$PATH"

AAPT2="$SDK_DIR/build-tools/34.0.0/aapt2"
D8="$SDK_DIR/build-tools/34.0.0/d8"
ZIPALIGN="$SDK_DIR/build-tools/34.0.0/zipalign"
APKSIGNER="$SDK_DIR/build-tools/34.0.0/apksigner"
ANDROID_JAR="$SDK_DIR/platforms/android-34/android.jar"

BUILD_DIR="$PROJECT_DIR/android-app/build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/compiled_res" "$BUILD_DIR/gen" "$BUILD_DIR/classes"

echo "==> 1. Compiling Android Resources..."
"$AAPT2" compile --dir "$PROJECT_DIR/android-app/src/main/res" -o "$BUILD_DIR/compiled_res.zip"

echo "==> 2. Linking Resources and generating R.java..."
"$AAPT2" link -o "$BUILD_DIR/unaligned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$PROJECT_DIR/android-app/src/main/AndroidManifest.xml" \
  --java "$BUILD_DIR/gen" \
  --auto-add-overlay \
  "$BUILD_DIR/compiled_res.zip"

echo "==> 3. Compiling Java sources..."
javac -source 1.8 -target 1.8 \
  -bootclasspath "$ANDROID_JAR" \
  -cp "$ANDROID_JAR" \
  -d "$BUILD_DIR/classes" \
  "$BUILD_DIR/gen/com/factquizzer/overlay/R.java" \
  "$PROJECT_DIR/android-app/src/main/java/com/factquizzer/overlay/OverlayActivity.java"

echo "==> 4. Converting to DEX bytecode (d8)..."
"$D8" --lib "$ANDROID_JAR" \
  --output "$BUILD_DIR" \
  "$BUILD_DIR/classes/com/factquizzer/overlay/"*.class

echo "==> 5. Adding DEX and Assets to APK..."
cd "$BUILD_DIR"
zip -j "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/classes.dex"

cd "$PROJECT_DIR/android-app/src/main"
zip -ur "$BUILD_DIR/unaligned.apk" assets/

echo "==> 6. Aligning APK (zipalign)..."
"$ZIPALIGN" -p -f 4 "$BUILD_DIR/unaligned.apk" "$PROJECT_DIR/FactQuizzer-Overlay.apk"

echo "==> 7. Signing APK with debug certificate..."
KEYSTORE="$PROJECT_DIR/android-app/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias androiddebugkey \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass android \
    -keypass android \
    -dname "CN=FactQuizzer, OU=Dev, O=FactQuizzer, L=Berlin, ST=Berlin, C=DE"
fi

"$APKSIGNER" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias androiddebugkey \
  "$PROJECT_DIR/FactQuizzer-Overlay.apk"

echo "==> SUCCESS! APK created at: $PROJECT_DIR/FactQuizzer-Overlay.apk"
ls -lh "$PROJECT_DIR/FactQuizzer-Overlay.apk"
