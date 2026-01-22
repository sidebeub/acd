#!/bin/bash
# ACD Viewer - Railway Deployment Script
# Run this script in your terminal: bash DEPLOY.sh

set -e

cd "$(dirname "$0")"

echo "=== ACD Viewer Railway Deployment ==="
echo ""

# Step 1: Login
echo "Step 1: Logging into Railway..."
railway login

# Step 2: Initialize project
echo ""
echo "Step 2: Creating Railway project..."
railway init --name "acd-viewer"

# Step 3: Add PostgreSQL
echo ""
echo "Step 3: Adding PostgreSQL database..."
railway add --database postgres

# Step 4: Set environment variables
echo ""
echo "Step 4: Setting environment variables..."
echo "Enter your Anthropic API key:"
read -r ANTHROPIC_KEY
railway variables set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
railway variables set NEXTAUTH_URL="https://plc.company"
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Step 5: Deploy
echo ""
echo "Step 5: Deploying to Railway..."
railway up

# Step 6: Get deployment URL
echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your app is deploying! Run 'railway open' to view it."
echo ""
echo "Next steps for plc.company domain:"
echo "1. Run: railway domain"
echo "2. Go to Railway dashboard -> Settings -> Domains"
echo "3. Add custom domain: plc.company"
echo "4. Add these DNS records at your domain registrar:"
echo "   - CNAME record: @ -> your-railway-url"
echo "   - Or A record if CNAME not supported for root domain"
