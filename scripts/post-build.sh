#!/bin/bash
# Runs after expo export — adds PWA support to dist/

# Copy font
cp node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf dist/Ionicons.ttf

# Copy icons
cp assets/icon.png dist/icon-192.png
cp assets/icon.png dist/icon-512.png

# Write manifest
cat > dist/manifest.json << 'EOF'
{
  "name": "SOMA",
  "short_name": "SOMA",
  "description": "Your AI Life Companion",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0F0A2E",
  "theme_color": "#7B6EF6",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
EOF

# Write service worker
cat > dist/sw.js << 'EOF'
const CACHE = 'soma-v1'
const PRECACHE = ['/', '/index.html', '/Ionicons.ttf', '/icon-192.png', '/icon-512.png', '/manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (url.hostname.includes('railway.app') || url.hostname.includes('supabase.co') || url.hostname.includes('groq.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
    return
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()))
      }
      return res
    }))
  )
})
EOF

# Patch index.html — inject PWA tags and service worker registration
# Extract the JS bundle filename from the generated index.html
BUNDLE=$(grep -o 'index-[a-f0-9]*\.js' dist/index.html | head -1)

cat > dist/index.html << HTMLEOF
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
    <title>SOMA</title>
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="SOMA" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="theme-color" content="#7B6EF6" />
    <meta name="description" content="Your AI Life Companion — personal growth, real connections." />
    <meta property="og:title" content="SOMA" />
    <meta property="og:description" content="Your AI Life Companion" />
    <meta property="og:image" content="/icon-512.png" />
    <link rel="icon" href="/favicon.ico" />
    <style id="expo-reset">
      html, body { height: 100%; overflow: hidden; background-color: #0F0A2E; margin: 0; padding: 0; }
      #root { display: flex; height: 100%; flex: 1; background-color: #0F0A2E; }
    </style>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="/_expo/static/js/web/${BUNDLE}" defer></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').catch(function() {})
        })
      }
    </script>
  </body>
</html>
HTMLEOF

echo "✅ PWA build complete"
