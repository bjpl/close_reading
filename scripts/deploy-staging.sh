#!/bin/bash
# Staging Deployment Script
# Deploy to staging environment for testing before production
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Staging Deployment${NC}"
echo "==============================="

# 1. Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 2. Run quick validation (skip full test suite for faster deployment)
echo -e "\n${YELLOW}🔍 Quick validation...${NC}"
npm run lint
npm run typecheck
echo -e "${GREEN}✓ Validation passed${NC}"

# 3. Build
echo -e "\n${YELLOW}🏗️  Building...${NC}"
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

# 4. Deploy to staging
echo -e "\n${YELLOW}☁️  Deploying to staging...${NC}"
if [ -n "$VERCEL_TOKEN" ]; then
  STAGING_URL=$(vercel --token=$VERCEL_TOKEN)
else
  STAGING_URL=$(vercel)
fi

echo -e "${GREEN}✓ Staging deployment successful${NC}"
echo -e "\n${BLUE}📋 Staging URL:${NC}"
echo "$STAGING_URL"

echo -e "\n${GREEN}==============================="
echo -e "🎉 Staging Deployment Complete!"
echo -e "===============================${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Test the staging deployment: $STAGING_URL"
echo "2. Run E2E tests against staging"
echo "3. If all tests pass, promote to production:"
echo "   ./scripts/deploy-production.sh"
