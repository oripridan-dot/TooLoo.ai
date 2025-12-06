# API Contracts Registry Guide

## Overview

The `API_CONTRACTS` registry in `/src/qa/types/index.ts` defines all API endpoints with their intentions, owners, and validation schemas.

**Current Status:**

- ✅ 5 endpoints registered (manual)
- ❌ 244 endpoints pending registration
- **Total:** 249 endpoints across 27 route files

## File Structure

### Main Files

- **Registry:** `/src/qa/types/index.ts` (lines 420-480) - Contains `API_CONTRACTS` object
- **Routes:** `/src/nexus/routes/*.ts` - 27 route files with endpoint definitions
- **Generator:** `/scripts/generate-api-contracts.ts` - Auto-generates missing contracts (TODO)

## Route Files by Size

| File             | Count | Base Path               | Owner  |
| ---------------- | ----- | ----------------------- | ------ |
| training.ts      | 43    | `/api/v1/training`      | cortex |
| agent.ts         | 20    | `/api/v1/agent`         | cortex |
| cognitive.ts     | 20    | `/api/v1/cognitive`     | cortex |
| chat.ts          | 19    | `/api/v1/chat`          | cortex |
| system.ts        | 19    | `/api/v1/system`        | nexus  |
| visuals.ts       | 19    | `/api/v1/visuals`       | cortex |
| cortex.ts        | 15    | `/api/v1/cortex`        | cortex |
| self-mod.ts      | 15    | `/api/v1/system/self`   | nexus  |
| github.ts        | 14    | `/api/v1/github`        | nexus  |
| exploration.ts   | 13    | `/api/v1/exploration`   | cortex |
| learning.ts      | 13    | `/api/v1/learning`      | cortex |
| emergence.ts     | 11    | `/api/v1/emergence`     | cortex |
| projects.ts      | 10    | `/api/v1/projects`      | nexus  |
| api.ts           | 10    | `/api/v1`               | nexus  |
| suggestions.ts   | 8     | `/api/v1/suggestions`   | nexus  |
| design.ts        | 7     | `/api/v1/design`        | nexus  |
| generate.ts      | 7     | `/api/v1/generate`      | nexus  |
| orchestrator.ts  | 6     | `/api/v1/orchestrator`  | cortex |
| serendipity.ts   | 6     | `/api/v1/serendipity`   | cortex |
| cost.ts          | 3     | `/api/v1/cost`          | precog |
| capabilities.ts  | 3     | `/api/v1/capabilities`  | cortex |
| context.ts       | 3     | `/api/v1/context`       | cortex |
| diagnostic.ts    | 3     | `/api/v1/diagnostic`    | qa     |
| providers.ts     | 2     | `/api/v1/providers`     | precog |
| observability.ts | 5     | `/api/v1/observability` | qa     |
| assets.ts        | 3     | `/api/v1/assets`        | nexus  |
| workflows.ts     | 1     | `/api/v1/workflows`     | cortex |

## APIContract Interface

```typescript
interface APIContract {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  request?: z.ZodType; // Optional - request schema
  response: z.ZodType; // Required - response schema
  intent: string; // What the endpoint does
  owner: 'cortex' | 'precog' | 'nexus' | 'qa';
}
```

## How to Add Contracts

### Option 1: Manual (for critical endpoints)

1. Open `/src/qa/types/index.ts`
2. Find the `API_CONTRACTS` object (line ~420)
3. Add new entry with key `METHOD /path`:

```typescript
'GET /api/v1/agent/status': {
  method: 'GET',
  path: '/api/v1/agent/status',
  response: z.object({ /* ... */ }),
  intent: 'Get agent execution status',
  owner: 'cortex',
},
```

### Option 2: Generate from Routes (recommended)

Create `/scripts/generate-api-contracts.ts` to:

1. Parse all route files
2. Extract method, path, and JSDoc comments
3. Generate contract entries
4. Merge with existing contracts

## Extraction Pattern

Each route file uses this comment pattern:

```typescript
/**
 * @route POST /api/v1/agent/task
 * @description Submit a task for execution
 */
router.post('/task', async (req, res) => {
  // handler
});
```

**Extract:** `POST /api/v1/agent/task` + intent from `@description`

## Navigation Tips for Copilot

1. **To find a specific endpoint:**

   ```bash
   grep -r "router\.(get|post|put|delete)" src/nexus/routes/FILENAME.ts
   ```

2. **To see all endpoints in a file:**

   ```bash
   grep -E "@route|router\.(get|post)" src/nexus/routes/FILENAME.ts
   ```

3. **To check API_CONTRACTS coverage:**
   - See how many entries exist in the registry
   - Compare against the 249 total endpoints

4. **To understand endpoint ownership:**
   - Check the `owner` field in each contract
   - cortex = cognitive/agent endpoints
   - nexus = API gateway/routing
   - precog = AI provider management
   - qa = quality assurance endpoints

## Next Steps

1. ✅ Review existing API_CONTRACTS (5 endpoints)
2. 🔄 Generate contracts for high-priority routes (training, agent, cognitive)
3. 🔄 Generate contracts for all routes systematically
4. ✅ Create WireVerifier tests to validate contracts
5. ✅ Use contracts for API documentation generation

## Integration Points

- **WireVerifier** (`src/qa/wiring/wire-verifier.ts`) - Uses contracts to verify frontend/backend wiring
- **OpenAPI Generator** (`docs/openapi.json`) - Can generate from contracts
- **API Documentation** - Auto-generate docs from intent strings
- **Intent-based Routing** - Route requests based on intent metadata
