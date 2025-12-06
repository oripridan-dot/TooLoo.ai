# API Contracts Implementation Guide

## 📊 Status Report

**Generation Complete!** ✅

- **Total Contracts Generated:** 271
- **Previous Contracts:** 5
- **New Contracts:** 266
- **Coverage:** From 2% → 99%+ of all endpoints

### Distribution by Owner

- **Cortex:** 137 contracts (51%)
- **Nexus:** 121 contracts (45%)
- **Precog:** 5 contracts (2%)
- **QA:** 8 contracts (2%)

## 📁 Files Created

1. **`/src/qa/contracts-generated.ts`** (1,907 lines)
   - AUTO-GENERATED file with all 271 API_CONTRACTS
   - Do NOT edit manually - regenerate with script
   - Import this into index.ts to use

2. **`/scripts/generate-api-contracts.ts`** (342 lines)
   - Generator script that creates contracts from route files
   - Scans JSDoc comments for `@description` and `@intent`
   - Sorts contracts alphabetically by path
   - Outputs summary statistics

3. **`/docs/API_CONTRACTS_GUIDE.md`**
   - Complete navigation guide for developers
   - Reference for how to add/update contracts
   - Integration points documentation

## 🚀 Integration Steps

### Step 1: Replace API_CONTRACTS in index.ts

Replace the manual contracts object with the generated one:

```bash
# Option A: Replace in place (recommended)
# Copy contracts from contracts-generated.ts to index.ts API_CONTRACTS object

# Option B: Import from generated file
# In index.ts, add:
import { API_CONTRACTS as GENERATED_CONTRACTS } from './contracts-generated.js';
export const API_CONTRACTS = GENERATED_CONTRACTS;
```

### Step 2: Update package.json scripts

Add this script to `package.json`:

```json
"scripts": {
  "api:contracts:generate": "npx tsx scripts/generate-api-contracts.ts",
  "api:contracts:verify": "npm run api:contracts:generate && npm run test"
}
```

### Step 3: Run verification

```bash
npm run api:contracts:generate
```

This will:

- Extract all endpoints from route files
- Generate contracts with intents
- Save to `contracts-generated.ts`
- Output statistics

### Step 4: Validate with WireVerifier

The `WireVerifier` in `src/qa/wiring/wire-verifier.ts` can now use contracts:

```typescript
const report = await wireVerifier.verify();
console.log(`Coverage: ${report.coverage}%`);
// Should show near 100% coverage now
```

## 📝 Endpoint Registration Pattern

Each route file uses this pattern:

```typescript
/**
 * @route POST /api/v1/agent/task
 * @description Submit a task for execution
 */
router.post('/task', async (req, res) => {
  // implementation
});
```

**Key Fields:**

- `@route METHOD /path` - HTTP method and path
- `@description TEXT` - What the endpoint does (becomes `intent`)
- Extracted automatically by the generator

## 🔍 How the Generator Works

```
1. Scan /src/nexus/routes/*.ts files
2. For each file:
   a. Look for router.METHOD('/path', ...) patterns
   b. Find JSDoc comment above it
   c. Extract intent from @description or @intent
   d. Determine owner from ROUTE_FILE_OWNERS mapping
   e. Build full path using ROUTE_BASE_PATHS mapping
3. Generate TypeScript code with all contracts
4. Write to contracts-generated.ts
5. Output summary statistics
```

## 📊 Contract Statistics

| Metric           | Value    |
| ---------------- | -------- |
| Total Routes     | 27 files |
| Total Endpoints  | 271      |
| GET Endpoints    | ~140     |
| POST Endpoints   | ~110     |
| DELETE Endpoints | ~10      |
| PATCH Endpoints  | ~5       |
| PUT Endpoints    | ~6       |

## ✨ Benefits of Full Registration

1. **Automated Wiring Verification**
   - WireVerifier can validate frontend↔backend connections
   - Detect mismatches before they reach production

2. **API Documentation**
   - Generate OpenAPI/Swagger docs from contracts
   - Auto-update docs when routes change

3. **Intent-based Routing**
   - Route requests based on intent metadata
   - Better analytics and monitoring

4. **Validation Schemas**
   - Standardize request/response validation
   - Type safety across the system

5. **Developer Experience**
   - Quick lookup of endpoint intentions
   - Understand what each API does at a glance
   - Consistent endpoint documentation

## 🔄 Maintenance

### When Adding New Routes

1. Add route in your route file:

```typescript
/**
 * @description What this endpoint does
 */
router.post('/new-path', handler);
```

2. Regenerate contracts:

```bash
npm run api:contracts:generate
```

3. The new endpoint will be included automatically

### When Removing Routes

1. Delete the route handler
2. Regenerate contracts:

```bash
npm run api:contracts:generate
```

The removed endpoint will no longer be in the generated contracts.

### When Updating Intent

1. Edit the `@description` comment in the route file
2. Regenerate contracts:

```bash
npm run api:contracts:generate
```

The intent will be updated automatically.

## 🎯 Next Actions

### For You (Right Now)

1. ✅ Review generated contracts in `contracts-generated.ts`
2. ✅ Test the generator script
3. ⏳ Decide on integration approach (replace vs import)

### For Team/Future

1. 📋 Merge contracts into index.ts or import from generated file
2. 📋 Update WireVerifier to use full contracts
3. 📋 Generate OpenAPI docs from contracts
4. 📋 Add contract generation to CI/CD pipeline
5. 📋 Create IDE plugins for intent lookup

## 🔗 Integration Points

- **WireVerifier** - Uses contracts to validate frontend/backend wiring
- **OpenAPI Generator** - Can generate Swagger/OpenAPI from contracts
- **Documentation** - Auto-generate API docs from intent strings
- **Testing** - Can use contracts to generate integration tests
- **Monitoring** - Track API usage by intent
- **Analytics** - Analyze which endpoints are most used

## 📞 Questions?

See `/docs/API_CONTRACTS_GUIDE.md` for:

- Complete route file listing
- APIContract interface details
- Manual contract addition steps
- Extraction pattern explanation
- Navigation tips for finding endpoints
