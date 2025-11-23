#!/bin/bash
echo "🛑 Cleaning up previous session..."
bash scripts/stop-all-services.sh

echo "🏷️  Ensuring version tags..."
npm run version:tag

echo "🚀 Starting TooLoo.ai Synapsys..."
npm run start:synapsys
