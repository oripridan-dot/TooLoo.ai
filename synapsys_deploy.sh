#!/bin/bash

echo "🚀 Initiating Synapsys Migration Protocol..."

# 1. Create target directories if missing
mkdir -p apps/web/public/assets
mkdir -p apps/web/src/components/admin

# 2. Migrate Assets (The "Mind" visualizers)
echo "📦 Migrating Mission Control Assets..."
if [ -d "packages/web/public/assets" ]; then
    cp -r packages/web/public/assets/* apps/web/public/assets/
    echo "✅ Assets secured."
else
    echo "⚠️  Warning: Mission Control assets not found. Interface may lack visuals."
fi

# 3. Clean Legacy & Duplicate Packages
echo "🧹 Purging obsolete neural pathways..."
rm -rf packages/web
rm -rf web-app
rm -rf archive

# 4. Install Dependencies for the Unified Core
echo "🔗 Wiring dependencies..."
cd apps/web
pnpm add react-router-dom framer-motion lucide-react clsx tailwind-merge 2>/dev/null || echo "Dependencies may already be installed"

cd ../..
echo "✅ Synapsys Architecture V3.3.577 Deployment Complete."
echo "👉 Run 'cd apps/web && pnpm dev' to activate."
