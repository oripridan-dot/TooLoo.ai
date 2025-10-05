#!/bin/bash
set -e

echo "🔧 Installing backend testing dependencies..."
npm install --save-dev \
  vitest@latest \
  @vitest/ui@latest \
  supertest@latest \
  @types/supertest@latest \
  c8@latest

echo "🔧 Installing frontend testing dependencies..."
cd web-app
npm install --save-dev \
  vitest@latest \
  @vitest/ui@latest \
  @testing-library/react@latest \
  @testing-library/jest-dom@latest \
  @testing-library/user-event@latest \
  jsdom@latest

echo "✅ All test dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Run 'npm test' in root to test backend"
echo "2. Run 'cd web-app && npm test' to test frontend"
