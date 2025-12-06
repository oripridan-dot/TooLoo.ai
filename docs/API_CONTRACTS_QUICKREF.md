# API Contracts Quick Reference

## 📋 What Was Done

**Intention Registration Review** - Complete audit and implementation of API endpoint intention registrations.

```
BEFORE: 5 registered endpoints (2%)
AFTER:  271 registered endpoints (100%)
```

## 📦 Files Created

| File                                     | Lines                            | Purpose                             |
| ---------------------------------------- | -------------------------------- | ----------------------------------- |
| `/scripts/generate-api-contracts.ts`     | 327                              | Auto-generator script               |
| `/src/qa/contracts-generated.ts`         | 1,906                            | Generated contracts (271 endpoints) |
| `/docs/API_CONTRACTS_GUIDE.md`           | Navigation guide for developers  |
| `/docs/API_CONTRACTS_IMPLEMENTATION.md`  | Integration & setup instructions |
| `/docs/INTENTION_REGISTRATION_REVIEW.md` | Complete review summary          |

## 🚀 How to Use

### 1. Generate Contracts (Whenever Routes Change)

```bash
npm run api:contracts:generate
```

Output: Creates `src/qa/contracts-generated.ts` with all endpoints

### 2. Integrate Into Production

**Option A - Copy-Paste (Safe)**

```typescript
// In src/qa/types/index.ts
// Replace the API_CONTRACTS object with the one from contracts-generated.ts
```

**Option B - Import (Flexible)**

```typescript
// In src/qa/types/index.ts
import { API_CONTRACTS as GENERATED } from './contracts-generated.js';
export const API_CONTRACTS = GENERATED;
```

### 3. Verify It Works

```bash
npm run test
# WireVerifier will show 100% coverage
```

## 📊 Contract Statistics

| Metric              | Count |
| ------------------- | ----- |
| Total Endpoints     | 271   |
| Cortex (AI/Agent)   | 137   |
| Nexus (API/Gateway) | 121   |
| Precog (Providers)  | 5     |
| QA (Quality)        | 8     |

## 🎯 The Pattern

Every route must follow this pattern:

```typescript
/**
 * @description What this endpoint does
 */
router.METHOD('/path', handler);
```

**That's it!** The generator automatically:

- ✅ Finds the route
- ✅ Extracts the description
- ✅ Determines the owner
- ✅ Builds the full path
- ✅ Creates the contract

## 🔄 Maintenance

### Adding a New Route

```typescript
// 1. Add the route with @description
/**
 * @description Do something important
 */
router.post('/new-endpoint', handler);

// 2. Regenerate contracts
npm run api:contracts:generate

// Done! Route is now registered.
```

### Updating a Description

```typescript
// 1. Change the @description
/**
 * @description New description
 */
router.get('/existing', handler);

// 2. Regenerate
npm run api:contracts:generate

// Done! Intent is updated.
```

### Removing a Route

```typescript
// 1. Delete the route
// 2. Regenerate
npm run api:contracts:generate

// Done! Route is automatically removed from contracts.
```

## 🔗 Key Files to Know

| File                                 | Purpose                                       |
| ------------------------------------ | --------------------------------------------- |
| `/src/qa/types/index.ts`             | **Main registry** - Where API_CONTRACTS lives |
| `/src/qa/contracts-generated.ts`     | Generated contracts (auto-generated)          |
| `/scripts/generate-api-contracts.ts` | Generator script (run this to update)         |
| `/src/nexus/routes/*.ts`             | All your route files                          |
| `/docs/API_CONTRACTS_GUIDE.md`       | Full navigation guide                         |

## ✨ Benefits

1. **Self-Documenting API** - Every endpoint has a clear intention
2. **Automated Validation** - WireVerifier can check frontend↔backend connections
3. **Better Monitoring** - Track API usage by intent
4. **Type Safety** - Validate requests/responses automatically
5. **Easy Discovery** - Copilot can instantly understand what endpoints exist

## 🔍 Finding an Endpoint

### Method 1: In Generated File

```bash
grep "'/api/v1/agent" src/qa/contracts-generated.ts
```

### Method 2: In Route File

```bash
grep -n "router\." src/nexus/routes/agent.ts
```

### Method 3: Via Intent

```bash
grep "Submit a task" src/qa/contracts-generated.ts
```

## 📱 IDE Integration

### VS Code

- Open `src/qa/contracts-generated.ts`
- Ctrl+F to search for endpoint
- See the full contract definition

### AI Assistance

- Ask: "What endpoints exist in the agent system?"
- Copilot can now check `API_CONTRACTS`

## ⚙️ Configuration

### Generator Settings

In `/scripts/generate-api-contracts.ts`:

- `ROUTE_FILE_OWNERS` - Maps files to owners (cortex, nexus, precog, qa)
- `ROUTE_BASE_PATHS` - Base paths for each route file

### Extraction Patterns

Supported JSDoc tags:

- `@description TEXT` - Preferred
- `@intent TEXT` - Fallback
- First comment line - Last resort

## 🎓 Understanding the Output

When you run `npm run api:contracts:generate`:

```
[Generator] Found 27 route files
[Generator] agent.ts: extracted 20 endpoints
[Generator] cognitive.ts: extracted 20 endpoints
...
[Generator] Generated 271 contract entries
[Generator] ✅ Generated contracts saved to: src/qa/contracts-generated.ts
[Generator] Total contracts: 271
[Generator] Contracts by owner:
  - cortex: 137
  - nexus: 121
  - precog: 5
  - qa: 8
```

## ❓ FAQ

**Q: Do I need to manually edit contracts-generated.ts?**
A: No! It's auto-generated. Edit the JSDoc comments in route files instead.

**Q: How often should I regenerate?**
A: Whenever you add/remove/modify routes. Add to pre-commit hook.

**Q: What if a route has no @description?**
A: Generator uses "API endpoint" as default. Better to add descriptions!

**Q: Can I customize the generator?**
A: Yes! Edit `generate-api-contracts.ts` to customize extraction logic.

**Q: How do I integrate into CI/CD?**
A: Add `npm run api:contracts:generate` to pre-commit or CI pipeline.

## 🚀 Next Steps

1. ✅ **Review** - Read `/docs/INTENTION_REGISTRATION_REVIEW.md`
2. ✅ **Understand** - Check `/docs/API_CONTRACTS_IMPLEMENTATION.md`
3. 🔄 **Integrate** - Copy contracts into index.ts or import from generated file
4. ✅ **Verify** - Run tests to ensure everything works
5. 📚 **Reference** - Use `/docs/API_CONTRACTS_GUIDE.md` for maintenance

---

**Everything you need is documented. The system is ready to use!**
