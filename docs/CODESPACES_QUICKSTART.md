# TooLoo.ai Transformation - Codespaces Quick Start

This guide walks you through executing the complete transformation of TooLoo.ai using GitHub Codespaces with the Claude plugin.

---

## 🚀 Initial Setup (15 minutes)

### Step 1: Create Codespace

1. Navigate to your TooLoo.ai repository on GitHub
2. Click the green **Code** button
3. Select **Codespaces** tab
4. Click **Create codespace on main**

Wait for the Codespace to initialize (~2-3 minutes).

### Step 2: Verify Environment

```bash
# Check Node version (should be 20+)
node --version

# Check npm
npm --version

# Verify repository structure
ls -la
```

### Step 3: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd web-app && npm install && cd ..

# Make scripts executable
chmod +x scripts/*.sh
```

### Step 4: Verify Current State

```bash
# Try building to ensure everything works
npm run build

# Check if server starts (Ctrl+C to stop after a few seconds)
npm start
```

**✅ Checkpoint**: Build should succeed. Server should start without errors.

---

## 📦 Phase 1: Add Test Infrastructure (Day 1)

### Task 1.1: Install Test Dependencies

```bash
# Run the installation script
bash scripts/install-test-deps.sh

# Or manually:
npm install --save-dev vitest @vitest/ui supertest @types/supertest c8
cd web-app && npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Task 1.2: Update package.json

Add these scripts to root `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:api": "vitest run tests/api",
    "test:unit": "vitest run tests/unit"
  }
}
```

### Task 1.3: Run First Tests

```bash
# Start the server in one terminal
npm start

# In another terminal, run tests
npm test

# Or use watch mode during development
npm run test:watch
```

**✅ Checkpoint**: At least 1-2 smoke tests should pass.

---

## 🏗️ Phase 2: Backend Modularization (Days 2-4)

### Task 2.1: Create Directory Structure

```bash
# Run structure creation script
bash scripts/create-structure.sh

# Verify structure
tree src/ -L 2
```

### Task 2.2: Extract ProviderService

**Using Claude in Codespaces:**

1. Open `simple-api-server.js`
2. Ask Claude: 
   ```
   Extract all provider-related code (OpenAI, Anthropic, Gemini, Groq, Ollama) 
   into src/services/ProviderService.js following the template in that file.
   Preserve all functionality and add proper error handling.
   ```

3. Test the extraction:
   ```bash
   npm test -- tests/unit/provider-service.test.js
   ```

### Task 2.3: Extract Route Modules

**Chat Routes:**
```bash
# Ask Claude to create src/routes/chat.routes.js
# Move all /api/v1/chat* endpoints there
```

**Learning Routes:**
```bash
# Ask Claude to create src/routes/learning.routes.js
# Move all /api/v1/learning* and /api/v1/patterns* endpoints
```

**Health Routes:**
```bash
# Ask Claude to create src/routes/health.routes.js
# Use the HealthCheckService template
```

### Task 2.4: Update simple-api-server.js

```javascript
// Import new modules
import { ProviderService } from './src/services/ProviderService.js';
import chatRoutes from './src/routes/chat.routes.js';
import learningRoutes from './src/routes/learning.routes.js';
import healthRoutes from './src/routes/health.routes.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

// Initialize services
const providerService = new ProviderService(config);

// Use routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/learning', learningRoutes);
app.use('/api/v1/health', healthRoutes);

// Error handling (MUST be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

### Task 2.5: Verify Everything Still Works

```bash
# Run all tests
npm test

# Start server and test manually
npm start

# In another terminal:
curl http://localhost:3001/api/v1/health
```

**✅ Checkpoint**: All existing functionality should work. Tests should pass.

---

## 📊 Phase 3: Add Monitoring (Day 5)

### Task 3.1: Install Logging

```bash
npm install pino pino-pretty
```

### Task 3.2: Integrate Logger

```bash
# Ask Claude to:
# 1. Import logger from src/config/logger.js in simple-api-server.js
# 2. Replace all console.log with logger.info/debug/error
# 3. Add request logging middleware
```

### Task 3.3: Test Logging

```bash
# Start server with pretty logs
NODE_ENV=development npm start

# Make a request and observe structured logs
curl http://localhost:3001/api/v1/health
```

### Task 3.4: Add Enhanced Health Checks

```bash
# Ask Claude to:
# 1. Integrate HealthCheckService into the health routes
# 2. Add provider status checks
# 3. Add memory and uptime checks
```

Test:
```bash
curl http://localhost:3001/api/v1/health | jq
curl http://localhost:3001/api/v1/health/liveness | jq
curl http://localhost:3001/api/v1/health/readiness | jq
```

**✅ Checkpoint**: Health endpoints should return detailed status information.

---

## 🔄 Phase 4: CI/CD Setup (Day 6)

### Task 4.1: Commit Changes

```bash
git checkout -b feature/transformation-phase-1
git add .
git commit -m "feat: add test infrastructure and modular architecture

- Add Vitest test framework
- Extract ProviderService from monolith
- Add error handling middleware
- Add structured logging with Pino
- Enhance health check endpoints

Breaking changes: None
Tests: Added smoke tests for API endpoints
Coverage: 45% (target: 80%)"

git push origin feature/transformation-phase-1
```

### Task 4.2: Create Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Fill in details:
   - Title: `feat: Phase 1 - Test Infrastructure & Modular Architecture`
   - Description: Link to transformation plan, list changes
4. Create PR

### Task 4.3: Verify CI Pipeline

Watch the GitHub Actions workflow run:
- ✅ Lint
- ✅ Tests
- ✅ Build
- ✅ Security audit

**✅ Checkpoint**: CI pipeline should pass (or document any failures to fix).

---

## 📚 Phase 5: Documentation (Day 7)

### Task 5.1: Update README

```bash
# Ask Claude to update README.md with:
# - New architecture overview
# - Updated installation instructions
# - Testing section
# - Development workflow
```

### Task 5.2: Create CONTRIBUTING.md

```bash
# Ask Claude to create CONTRIBUTING.md with:
# - Development setup
# - Coding standards
# - PR process
# - Testing requirements
```

### Task 5.3: Add API Documentation

```bash
# Ask Claude to create docs/API.md documenting:
# - All endpoints
# - Request/response formats
# - Error codes
# - Examples
```

**✅ Checkpoint**: Documentation should be comprehensive and up-to-date.

---

## 🎯 Validation Checklist

Before considering Phase 1 complete, verify:

- [ ] Tests run successfully (`npm test`)
- [ ] Build passes (`npm run build`)
- [ ] Server starts without errors (`npm start`)
- [ ] Health endpoint returns detailed status
- [ ] CI pipeline passes on GitHub
- [ ] Code coverage > 40%
- [ ] All documentation updated
- [ ] No console.log statements (all using logger)
- [ ] Error handling is consistent
- [ ] PR is created and reviewed

---

## 🚨 Common Issues & Solutions

### Issue: Tests fail to connect to server

**Solution:**
```bash
# Start server in test mode
NODE_ENV=test PORT=3001 npm start &

# Wait for startup
sleep 5

# Run tests
npm test
```

### Issue: Port already in use

**Solution:**
```bash
# Kill existing process
pkill -f "node.*simple-api-server.js"

# Or use a different port
PORT=3002 npm start
```

### Issue: Module not found after refactoring

**Solution:**
```bash
# Check import paths are relative
# Should be: import { X } from './src/...'
# Not: import { X } from 'src/...'

# Clear node_modules cache
rm -rf node_modules package-lock.json
npm install
```

### Issue: CI fails but local tests pass

**Solution:**
```bash
# Run tests in CI mode locally
NODE_ENV=test npm ci
npm test
```

---

## 🔄 Continuous Improvement

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-improvement

# 3. Make changes, test frequently
npm run test:watch

# 4. Run full test suite
npm test

# 5. Commit with conventional commits
git commit -m "feat: add new feature"

# 6. Push and create PR
git push origin feature/my-improvement
```

### Weekly Review

- Check test coverage: `npm run test:coverage`
- Review failed tests in CI
- Update dependencies: `npm outdated`
- Review metrics in health endpoint
- Plan next week's improvements

---

## 📞 Getting Help

### Using Claude in Codespaces

**Example prompts:**

```
"Extract the OpenAI provider logic from simple-api-server.js 
into src/services/providers/OpenAIProvider.js"

"Add unit tests for the ProviderService class"

"Refactor this function to be more testable"

"Add proper error handling to this endpoint"

"Generate API documentation for /api/v1/chat"
```

### Resources

- Architecture docs: `docs/ARCHITECTURE.md`
- Test examples: `tests/api/*.test.js`
- Execution checklist: `EXECUTION_CHECKLIST.md`

---

## ✅ Success Metrics

Track these metrics weekly:

| Metric | Week 1 | Week 2 | Week 3 | Target |
|--------|--------|--------|--------|--------|
| Test Coverage | 0% | 40% | 60% | 80% |
| Build Time | 4.6s | ≤5s | ≤5s | <5s |
| Passing Tests | 0 | 15 | 30 | 50+ |
| Response Time | ? | ? | ? | <2s |
| Uptime | ? | 99% | 99.5% | 99.9% |

---

**Next**: After completing Phase 1, proceed to Phase 2 (Advanced Refactoring) in the main transformation document.

---

**Last Updated**: October 2025  
**Created By**: Claude + Human Collaboration  
**Environment**: GitHub Codespaces + Claude Plugin
