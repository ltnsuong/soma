#!/bin/bash
set -e
echo "📦 Building for production..."
npm run build

echo "🚀 Deploying to Vercel..."
vercel deploy --prod --yes --name soma --token $VERCEL_TOKEN || vercel deploy --prod --yes --name soma
