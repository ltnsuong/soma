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
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node -e "
require('$ROOT/node_modules/sharp')('$ROOT/assets/icon.png')
  .resize(180,180,{fit:'cover'}).png().toFile('$DIST/apple-touch-icon.png')
  .then(()=>console.log('✓ Generated dist/apple-touch-icon.png (180x180)'))
  .catch(e=>{console.error('✗ apple-touch-icon failed:',e.message);process.exit(1)})
"

# The App Store requires a reachable privacy policy, and an auto-renewing
# subscription requires terms. These are plain static pages; expo export does not
# know about them, and vercel.json excludes both from the SPA rewrite so they are
# served as themselves rather than as index.html.
for page in privacy.html terms.html; do
  cp "$(dirname "$0")/../web/$page" "$DIST/$page"
  echo "\u2713 Copied $page"
done
