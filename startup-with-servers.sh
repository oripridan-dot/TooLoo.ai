#!/bin/bash

# TooLoo Server Startup & Verification
# Ensures all servers are running properly on first launch

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$REPO_ROOT/server-startup.log"

echo "🚀 TooLoo Server Startup & Verification" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ports to check
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3050 3100 3123)

echo "" | tee -a "$LOG_FILE"
echo -e "${BLUE}📍 Repository root: $REPO_ROOT${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Kill any existing Node processes on our ports
echo -e "${YELLOW}Checking for existing processes...${NC}" | tee -a "$LOG_FILE"
for port in "${PORTS[@]}"; do
  if lsof -i ":$port" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Port $port is in use${NC}" | tee -a "$LOG_FILE"
  fi
done
echo "" | tee -a "$LOG_FILE"

# Check Node.js
echo -e "${BLUE}🔍 Checking Node.js...${NC}" | tee -a "$LOG_FILE"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "${GREEN}  ✅ Node.js $NODE_VERSION found${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}  ❌ Node.js not found!${NC}" | tee -a "$LOG_FILE"
  exit 1
fi
echo "" | tee -a "$LOG_FILE"

# Check npm packages
echo -e "${BLUE}📦 Checking npm packages...${NC}" | tee -a "$LOG_FILE"
cd "$REPO_ROOT"
if npm list express >/dev/null 2>&1; then
  echo -e "${GREEN}  ✅ Required packages installed${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${YELLOW}  ⚠️  Installing npm packages...${NC}" | tee -a "$LOG_FILE"
  npm install >/dev/null 2>&1
  echo -e "${GREEN}  ✅ Packages installed${NC}" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# Start server monitor
echo -e "${BLUE}🎯 Starting Server Monitor...${NC}" | tee -a "$LOG_FILE"
echo -e "${YELLOW}  This will start all 17 services automatically${NC}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Run the monitor
node servers/server-monitor.js 2>&1 | tee -a "$LOG_FILE"
