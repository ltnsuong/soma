#!/bin/bash
# Run after: npx expo export -p web --output-dir dist
# Usage: bash scripts/postbuild-web.sh

set -e
DIST="$(dirname "$0")/../dist"

# Get the generated bundle filename
BUNDLE=$(grep -o '_expo/static/js/web/index-[a-f0-9]*.js' "$DIST/index.html" | head -1)

cat > "$DIST/index.html" <<HTMLEOF
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>Soma — Your AI Life Companion</title>
    <meta name="description" content="Your personal AI companion for growth, reflection and building the life you want." />
    <meta name="theme-color" content="#0F0A2E" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Soma" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://mysoma.site/" />
    <meta property="og:title" content="Soma — Your AI Life Companion" />
    <meta property="og:description" content="The best version of you starts with knowing yourself. Your personal AI companion for growth, reflection and building the life you want." />
    <meta property="og:image" content="https://mysoma.site/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Soma — Your AI Life Companion" />
    <meta name="twitter:description" content="The best version of you starts with knowing yourself." />
    <meta name="twitter:image" content="https://mysoma.site/og-image.png" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <style id="expo-reset">
      html, body { height: 100%; margin: 0; }
      body { overflow: hidden; background-color: #0F0A2E; }
      #root { display: flex; height: 100%; flex: 1; }
      * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        -webkit-tap-highlight-color: transparent;
      }
      [data-focusable="true"] {
        transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.12s ease;
      }
      [data-focusable="true"]:hover { opacity: 0.88; }
      [data-focusable="true"]:active { transform: scale(0.96) !important; opacity: 0.75; }
      ::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
      @media (min-width: 600px) {
        body {
          display: flex;
          justify-content: center;
          background: radial-gradient(ellipse at 50% -20%, #1e0f5e 0%, #090618 70%);
          overflow: hidden;
        }
        #root {
          max-width: 430px;
          width: 100%;
          box-shadow: 0 0 140px rgba(123, 110, 246, 0.22), 0 0 0 1px rgba(123, 110, 246, 0.1);
        }
      }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="/$BUNDLE" defer></script>
  </body>
</html>
HTMLEOF

echo "✓ index.html patched with custom head (font, meta, CSS)"
echo "  Bundle: $BUNDLE"
