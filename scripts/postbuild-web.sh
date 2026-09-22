#!/bin/bash
# Run after: npx expo export -p web
# Usage: bash scripts/postbuild-web.sh
set -e

DIST="$(dirname "$0")/../dist"
WEB_TEMPLATE="$(dirname "$0")/../web/index.html"

# Find the generated JS bundle path from the expo-generated index.html
BUNDLE=$(grep -o '_expo/static/js/web/index-[a-f0-9]*\.js' "$DIST/index.html" | head -1)

if [ -z "$BUNDLE" ]; then
  echo "ERROR: Could not find bundle in $DIST/index.html"
  exit 1
fi

echo "Found bundle: $BUNDLE"

# Copy web/index.html to dist/index.html and inject the bundle script tag
sed "s|<!-- Expo JS bundle is injected here by \`expo export -p web\` -->|<script src=\"/$BUNDLE\" defer></script>|" \
  "$WEB_TEMPLATE" > "$DIST/index.html"

echo "✓ dist/index.html patched from web/index.html (bundle: /$BUNDLE)"

# Copy icon fonts to a flat /assets/fonts/ path so Vercel CLI can upload them
# (Vercel CLI excludes any path containing "node_modules")
FONT_SRC="$DIST/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts"
FONT_DEST="$DIST/assets/fonts"
mkdir -p "$FONT_DEST"
cp "$FONT_SRC"/*.ttf "$FONT_DEST/"
echo "✓ Copied $(ls "$FONT_DEST"/*.ttf | wc -l | tr -d ' ') font files to dist/assets/fonts/"

# index.html references /apple-touch-icon.png but expo export doesn't emit it.
# Without this it 404s (on Vercel the SPA rewrite masks it by returning HTML as the icon).
#
# This used to call sharp. sharp is a native module, and EAS runs
# `npm ci --include=dev` on the iOS builder, where it cannot resolve a prebuilt
# binary for that machine, falls back to compiling via node-gyp, and fails the
# whole Install dependencies phase — so no iOS build could ever start. The icon is
# a fixed 180x180 crop of assets/icon.png that changes only when the app icon does,
# so it is generated once and committed at web/apple-touch-icon.png.
#
# Regenerate it only if the app icon changes (sharp is no longer a dependency, so
# install it for the one-off):
#   npx --yes sharp-cli@5 -i assets/icon.png -o web/ resize 180 180 --fit cover
cp "$(dirname "$0")/../web/apple-touch-icon.png" "$DIST/apple-touch-icon.png"
echo "  Copied apple-touch-icon.png (180x180)"

# The App Store requires a reachable privacy policy, and an auto-renewing
# subscription requires terms. These are plain static pages; expo export does not
# know about them, and vercel.json excludes both from the SPA rewrite so they are
# served as themselves rather than as index.html.
for page in privacy.html terms.html; do
  cp "$(dirname "$0")/../web/$page" "$DIST/$page"
  echo "  Copied $page"
done
