#!/usr/bin/env bash
# Installs a JDK + Gradle into the worker at build time so the sandbox can run
# real JVM test suites (./gradlew test, mvn test) and produce VERIFIED Kotlin /
# Java / Scala repairs instead of falling back to the unverified lightweight
# check. Runs as part of the Render worker buildCommand; the native-node runtime
# persists the build filesystem into runtime, and JAVA_HOME/GRADLE_USER_HOME are
# set as service env vars so the worker process (and its spawned ./gradlew) pick
# them up. './gradlew' uses $JAVA_HOME directly, so PATH is left untouched.
#
# Idempotent: re-running skips anything already present.
set -euo pipefail

JVM_DIR="${JVM_DIR:-/opt/render/project/src/.jvm}"
GRADLE_USER_HOME="${GRADLE_USER_HOME:-$JVM_DIR/gradle-home}"
JDK_URL="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.12_7.tar.gz"
GRADLE_VERSION="8.7"
GRADLE_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"

mkdir -p "$JVM_DIR"

# ---- JDK 17 (Temurin) ----
if [ ! -x "$JVM_DIR/jdk/bin/java" ]; then
  echo "[install-jvm] downloading Temurin JDK 17..."
  curl -fsSL -o /tmp/jdk.tar.gz "$JDK_URL"
  mkdir -p "$JVM_DIR/jdk"
  tar -xzf /tmp/jdk.tar.gz -C "$JVM_DIR/jdk" --strip-components=1
  rm -f /tmp/jdk.tar.gz
fi
export JAVA_HOME="$JVM_DIR/jdk"
export PATH="$JAVA_HOME/bin:$PATH"
"$JAVA_HOME/bin/java" -version

# ---- Gradle (matches the test repos' wrapper version) ----
# Extract with the JDK's bundled `jar` tool so we don't depend on `unzip`.
if [ ! -x "$JVM_DIR/gradle/bin/gradle" ]; then
  echo "[install-jvm] downloading Gradle ${GRADLE_VERSION}..."
  curl -fsSL -o /tmp/gradle.zip "$GRADLE_URL"
  ( cd "$JVM_DIR" && "$JAVA_HOME/bin/jar" xf /tmp/gradle.zip )
  rm -rf "$JVM_DIR/gradle"
  mv "$JVM_DIR/gradle-${GRADLE_VERSION}" "$JVM_DIR/gradle"
  rm -f /tmp/gradle.zip
  # `jar xf` does not preserve unix exec bits — restore them on the launchers.
  chmod +x "$JVM_DIR/gradle/bin/gradle"
fi
"$JVM_DIR/gradle/bin/gradle" --version | grep -i version || true

# ---- Pre-warm the wrapper distribution into GRADLE_USER_HOME ----
# The first sandbox './gradlew test' would otherwise pay a ~130MB Gradle
# download at request time and risk the sandbox timeout. Generate a throwaway
# wrapper pinned to the same version and run it once so Gradle caches the
# distribution under the exact hash the runtime wrapper will look for.
mkdir -p "$GRADLE_USER_HOME"
PREWARM_DIR="$(mktemp -d)"
if ( cd "$PREWARM_DIR" \
     && touch settings.gradle \
     && "$JVM_DIR/gradle/bin/gradle" wrapper --gradle-version "$GRADLE_VERSION" --distribution-type bin -q \
     && GRADLE_USER_HOME="$GRADLE_USER_HOME" ./gradlew --version -q ); then
  echo "[install-jvm] gradle ${GRADLE_VERSION} wrapper cache warmed"
else
  echo "[install-jvm] WARN: prewarm failed (non-fatal; first sandbox run will download)"
fi
rm -rf "$PREWARM_DIR"
echo "[install-jvm] done: JAVA_HOME=$JAVA_HOME GRADLE_USER_HOME=$GRADLE_USER_HOME"
