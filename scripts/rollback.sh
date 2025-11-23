#!/bin/bash
# Rollback Script
# Quickly rollback to previous deployment if issues are detected
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⏪ Starting Rollback Process${NC}"
echo "============================"

# Check for VERCEL_TOKEN
if [ -z "$VERCEL_TOKEN" ]; then
  echo -e "${RED}❌ Error: VERCEL_TOKEN environment variable not set${NC}"
  echo "Set VERCEL_TOKEN to rollback: export VERCEL_TOKEN=your_token"
  exit 1
fi

# List recent deployments
echo -e "\n${BLUE}📋 Recent deployments:${NC}"
vercel ls --token=$VERCEL_TOKEN | head -5

# Get previous deployment (second line of output)
echo -e "\n${YELLOW}🔍 Identifying previous deployment...${NC}"
PREV_DEPLOYMENT=$(vercel ls --token=$VERCEL_TOKEN | sed -n '2p' | awk '{print $1}')

if [ -z "$PREV_DEPLOYMENT" ]; then
  echo -e "${RED}❌ Error: Could not identify previous deployment${NC}"
  exit 1
fi

echo -e "Previous deployment ID: ${BLUE}$PREV_DEPLOYMENT${NC}"

# Confirm rollback
echo -e "\n${YELLOW}⚠️  WARNING: This will rollback production to the previous deployment${NC}"
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${BLUE}Rollback cancelled${NC}"
  exit 0
fi

# Perform rollback
echo -e "\n${YELLOW}⏪ Rolling back to $PREV_DEPLOYMENT...${NC}"
if vercel promote $PREV_DEPLOYMENT --token=$VERCEL_TOKEN; then
  echo -e "${GREEN}✓ Rollback successful${NC}"
else
  echo -e "${RED}❌ Rollback failed${NC}"
  exit 1
fi

echo -e "\n${GREEN}============================"
echo -e "✅ Rollback Complete!"
echo -e "============================${NC}"

echo -e "\n${BLUE}📋 Post-Rollback Actions:${NC}"
echo "1. Verify production is stable"
echo "2. Investigate what caused the rollback"
echo "3. Create incident report"
echo "4. Fix issues before next deployment"
echo "5. Update team in Slack/communication channel"
