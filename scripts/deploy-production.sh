#!/bin/bash
# Production Deployment Script
# This script handles the complete production deployment process
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Production Deployment${NC}"
echo "=================================="

# 1. Environment validation
echo -e "\n${YELLOW}📋 Step 1/8: Validating environment...${NC}"
if [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ Error: .env.local not found${NC}"
  echo "Please create .env.local with production environment variables"
  exit 1
fi

# Check for required environment variables
if [ -z "$VERCEL_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Warning: VERCEL_TOKEN not set${NC}"
  echo "Set VERCEL_TOKEN environment variable or deployment will fail"
fi

echo -e "${GREEN}✓ Environment validated${NC}"

# 2. Clean install dependencies
echo -e "\n${YELLOW}📦 Step 2/8: Installing dependencies...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 3. Run linter
echo -e "\n${YELLOW}🔍 Step 3/8: Running linter...${NC}"
if npm run lint; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${RED}❌ Linting failed${NC}"
  echo "Fix linting errors before deploying"
  exit 1
fi

# 4. Type checking
echo -e "\n${YELLOW}🔧 Step 4/8: Type checking...${NC}"
if npm run typecheck; then
  echo -e "${GREEN}✓ Type check passed${NC}"
else
  echo -e "${RED}❌ Type check failed${NC}"
  echo "Fix TypeScript errors before deploying"
  exit 1
fi

# 5. Run tests
echo -e "\n${YELLOW}🧪 Step 5/8: Running tests...${NC}"
if npm run test:unit && npm run test:integration; then
  echo -e "${GREEN}✓ All tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed${NC}"
  echo "Fix failing tests before deploying"
  exit 1
fi

# 6. Build application
echo -e "\n${YELLOW}🏗️  Step 6/8: Building application...${NC}"
if npm run build; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

# 7. Check bundle size
echo -e "\n${YELLOW}📊 Step 7/8: Checking bundle size...${NC}"
BUNDLE_SIZE=$(du -sh dist | cut -f1)
BUNDLE_SIZE_KB=$(du -s dist | cut -f1)
MAX_SIZE_KB=2048  # 2MB uncompressed (~500KB gzipped)

echo "Bundle size: $BUNDLE_SIZE ($BUNDLE_SIZE_KB KB)"

if [ $BUNDLE_SIZE_KB -gt $MAX_SIZE_KB ]; then
  echo -e "${RED}❌ Bundle too large: ${BUNDLE_SIZE_KB}KB > ${MAX_SIZE_KB}KB${NC}"
  echo "Optimize bundle size before deploying"
  exit 1
fi
echo -e "${GREEN}✓ Bundle size acceptable${NC}"

# 8. Deploy to Vercel
echo -e "\n${YELLOW}☁️  Step 8/8: Deploying to Vercel...${NC}"
if [ -n "$VERCEL_TOKEN" ]; then
  if vercel --prod --token=$VERCEL_TOKEN; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
  else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  VERCEL_TOKEN not set - using interactive deployment${NC}"
  if vercel --prod; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
  else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  fi
fi

echo -e "\n${GREEN}=================================="
echo -e "🎉 Production Deployment Complete!"
echo -e "==================================${NC}"

# Post-deployment checks
echo -e "\n${BLUE}📋 Post-Deployment Checklist:${NC}"
echo "1. Verify deployment at production URL"
echo "2. Check Sentry for any errors"
echo "3. Monitor Web Vitals dashboard"
echo "4. Test critical user flows"
echo "5. Update deployment log in Notion/Jira"
