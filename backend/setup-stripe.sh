#!/bin/bash

# SOMA Stripe Setup Script
# This script automates as much as possible
# Some parts require manual interaction with Stripe Dashboard

set -e

echo "🔑 SOMA Stripe Setup Script"
echo "================================"
echo ""

# Step 1: Verify Stripe CLI
echo "Step 1: Checking Stripe CLI..."
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
fi
echo "✅ Stripe CLI ready"
echo ""

# Step 2: Check if already logged in
echo "Step 2: Checking Stripe login..."
if stripe whoami &> /dev/null; then
    echo "✅ Already logged in to Stripe"
else
    echo "⚠️  Need to login to Stripe"
    echo "Running: stripe login"
    stripe login
fi
echo ""

# Step 3: Start webhook listener
echo "Step 3: Starting webhook listener..."
echo "================================"
echo ""
echo "This terminal will now listen for Stripe webhooks."
echo "IMPORTANT: Keep this terminal open!"
echo ""
echo "When you see 'whsec_test_...' below, copy it and send to me."
echo ""
echo "Starting: stripe listen --forward-to localhost:3000/stripe/webhook"
echo ""
echo "================================"
echo ""

stripe listen --forward-to localhost:3000/stripe/webhook
