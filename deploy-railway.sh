#!/bin/bash
# ════════════════════════════════════════════════════════════
# SOMA Backend — Railway Deploy Script
# Run: railway login  →  then  ./deploy-railway.sh
# ════════════════════════════════════════════════════════════
set -e

echo "🚀 Deploying SOMA backend to Railway..."

# Must be logged in
if ! railway whoami &>/dev/null; then
  echo "❌ Not logged in. Run: railway login"
  exit 1
fi

# Link to backend folder
cd "$(dirname "$0")/backend"

# Check if project exists, create if not
if ! railway status &>/dev/null; then
  echo "📦 Creating new Railway project..."
  railway init --name soma-backend
fi

# Set non-sensitive env vars
echo "⚙️  Setting environment variables..."
railway variables set \
  SUPABASE_URL="https://jbqyhvudopvokfmowjij.supabase.co" \
  JWT_EXPIRY="7d" \
  REFRESH_TOKEN_EXPIRY="30d" \
  PORT="3000" \
  NODE_ENV="production"

echo ""
echo "⚠️  You still need to set these 2 sensitive vars manually:"
echo "   Go to → railway.app → your project → Variables tab"
echo ""
echo "   SUPABASE_SERVICE_KEY  = (service_role key from supabase.com → Settings → API)"
echo "   JWT_SECRET            = $(openssl rand -hex 32)  ← copy this!"
echo ""
read -p "Have you set SUPABASE_SERVICE_KEY and JWT_SECRET in the dashboard? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "👉 Set them at railway.app first, then re-run this script."
  exit 0
fi

# Deploy
echo "🏗  Deploying..."
railway up --detach

# Get the URL
echo ""
echo "⏳ Waiting for deployment URL..."
sleep 5
DOMAIN=$(railway domain 2>/dev/null || echo "")

if [ -n "$DOMAIN" ]; then
  echo ""
  echo "✅ Backend live at: https://$DOMAIN"
  echo ""
  echo "📱 Next step — add this to EAS build secrets:"
  echo "   eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value \"https://$DOMAIN\""
  echo ""
  echo "🔧 Also update CORS in Railway dashboard:"
  echo "   CORS_ORIGINS = https://$DOMAIN,exp://,soma://"
else
  echo ""
  echo "✅ Deploy triggered! Check Railway dashboard for your URL."
  echo "   Then run: eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value \"https://YOUR_URL\""
fi
