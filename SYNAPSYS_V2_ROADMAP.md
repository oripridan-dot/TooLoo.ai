# Synapsys 2.0 Consolidation Roadmap

> **Version:** 2.0.0-alpha.0  
> **Branch:** `synapsys-v2`  
> **Status:** ✅ Foundation Complete & Verified  
> **Last Updated:** December 12, 2025

## 🎯 Vision

Transform TooLoo.ai from a fragmented system to a unified cognitive platform with:
- Clean monorepo architecture (`@tooloo/*` packages)
- Declarative skill system (YAML/Markdown skill files)
- Embedding-based routing (semantic similarity over regex)
- Event-sourced memory with projections
- Cognitive unit testing ("The Gym")

---

## 📦 Package Status

| Package | Version | Status | Description |
|---------|---------|--------|-------------|
| `@tooloo/core` | 2.0.0-alpha.0 | ✅ Verified | The Soul - types, context, TypedEventBus |
| `@tooloo/skills` | 2.0.0-alpha.0 | ✅ Verified | SkillRegistry, SkillRouter, defineSkill |
| `@tooloo/providers` | 2.0.0-alpha.0 | ✅ Verified | 3 LLM adapters, CircuitBreaker, streaming |
| `@tooloo/memory` | 2.0.0-alpha.0 | ✅ Verified | SQLiteEventStore, Vector/Graph projections |
| `@tooloo/evals` | 2.0.0-alpha.0 | ✅ Verified | 19 golden tests, CognitiveEvaluator |
| `@tooloo/contracts` | 2.0.0-alpha.0 | ✅ Verified | 12 API contracts with Zod validation |

---

## 🧠 Critical Additions (User Requirements)

### 1. Cortex Evals ("The Gym") ✅ Implemented

**Location:** `packages/evals/`

A harness for testing cognitive components against golden datasets:

```yaml
# packages/evals/golden/coding.yaml
inputs:
  - prompt: "Write a TypeScript function to merge two sorted arrays"
    expectedSkill: "code-generation"
    expectedConfidence: [0.8, 1.0]
    expectedKeywords: ["function", "TypeScript", "merge"]
```

**Features:**
- YAML-based test definitions
- Expected skill matching
- Confidence thresholds
- Batch evaluation with reports

### 2. Precog Router ✅ Implemented

**Location:** `packages/skills/src/router.ts`

Embedding-based skill routing instead of regex patterns:

```typescript
const router = new SkillRouter(registry, embedFn, {
  semanticWeight: 0.6,
  keywordWeight: 0.2,
  intentWeight: 0.2,
  minSemanticConfidence: 0.7,
});

const result = await router.route("Write a merge sort in Python");
// Returns best matching skill with confidence score
```

### 3. Memory Bridge ✅ Implemented

**Location:** `packages/memory/`

Event Store as Source of Truth with projections:

```
Event Store (SQLite) 
       │
       ├──▶ Vector Projection (Semantic Search)
       │
       └──▶ Graph Projection (Knowledge Graph)
```

**Components:**
- `event-store.ts` - Append-only event log
- `projections.ts` - Async projections to Vector/Graph stores
- `semantic-cache.ts` - LLM response caching

### 4. Skill Studio 🔄 Planned (Phase 2)

**Status:** Interface defined, UI pending

Debugging UI for skill resolution showing:
- Query embedding visualization
- Skill embedding space
- Match scores in real-time
- History of routing decisions

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      @tooloo/core                            │
│  • TooLooContext (branded IDs, session, intent)             │
│  • TypedEventBus (40+ event types)                          │
│  • Context factory & update functions                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ @tooloo/skills │   │ @tooloo/providers │   │  @tooloo/memory  │
│               │   │                 │   │                 │
│ • SkillDef    │   │ • BaseProvider  │   │ • EventStore    │
│ • Registry    │   │ • Adapters      │   │ • Projections   │
│ • Loader      │   │ • CircuitBreaker│   │ • SemanticCache │
│ • Router      │   │ • Streaming     │   │                 │
└───────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌─────────────────┐                       ┌─────────────────┐
│  @tooloo/evals   │                       │ @tooloo/contracts│
│                 │                       │                 │
│ • Golden Tests  │                       │ • API Schemas   │
│ • Evaluator     │                       │ • Validation    │
│ • Metrics       │                       │ • Registry      │
└─────────────────┘                       └─────────────────┘
```

---

## 🚀 Phase Roadmap

### Phase 1: Foundation ✅ Complete & Verified

- [x] Create synapsys-v2 branch
- [x] Setup pnpm 10.0.0 monorepo with workspaces
- [x] Create @tooloo/core (types, TypedEventBus, context factory)
- [x] Create @tooloo/skills (SkillRegistry, SkillRouter, defineSkill)
- [x] Create @tooloo/providers (Anthropic/DeepSeek/OpenAI, CircuitBreaker)
- [x] Create @tooloo/memory (SQLiteEventStore, Vector/Graph projections)
- [x] Create @tooloo/evals (types, loader, evaluator, golden tests)
- [x] Create @tooloo/contracts (schemas, registry)
- [x] Fix all TypeScript compilation errors
- [x] Verify all packages build

### Phase 2: Integration (Next)

- [ ] Wire packages together in main entry point
- [ ] Create @tooloo/runtime for orchestration
- [ ] Implement Skill Studio UI
- [ ] Add more golden test cases
- [ ] Write integration tests
- [ ] Performance benchmarks

### Phase 3: Migration

- [ ] Migrate existing V3.3 functionality
- [ ] Deprecate old code paths
- [ ] Update frontend to use new APIs
- [ ] Documentation & examples

---

## 🔧 Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages (in dependency order)
cd packages/core && pnpm build && cd ../...
cd packages/contracts && pnpm build && cd ../...
cd packages/skills && pnpm build && cd ../...
cd packages/providers && pnpm build && cd ../...
cd packages/memory && pnpm build && cd ../...
cd packages/evals && pnpm build && cd ../...

# Build specific package
cd packages/core && pnpm build

# Test golden datasets
cd packages/evals && node --input-type=module -e "
import { loadGoldenInputs, getGoldenInputsSummary } from './dist/index.js';
const summary = await getGoldenInputsSummary('./golden');
console.log(summary);
"
```

---

## 📁 Key Files

| File | Description |
|------|-------------|
| `packages/core/src/types.ts` | THE SOUL - all core type definitions |
| `packages/core/src/events/bus.ts` | TypedEventBus with 40+ event types |
| `packages/skills/src/router.ts` | Embedding-based skill routing |
| `packages/memory/src/event-store.ts` | SQLite event store implementation |
| `packages/memory/src/projections.ts` | Vector & Graph projections |
| `packages/evals/golden/*.yaml` | Golden test datasets |
| `packages/contracts/src/registry.ts` | API contract definitions |

---

## 🧪 TypeScript Fixes Applied

During the consolidation, the following issues were fixed:

1. **Zod 4 Compatibility**
   - `z.record(z.unknown())` → `z.record(z.string(), z.unknown())`
   - Recursive schemas need explicit type annotation

2. **Strict null checks**
   - Array index access with `noUncheckedIndexedAccess`
   - Added guards for possibly undefined values

3. **Project references**
   - Added `composite: true` to all package tsconfigs
   - Added `paths` and `references` for cross-package imports

4. **Unused variable warnings**
   - Prefixed unused parameters with `_`

---

## 📊 Metrics

- **Packages:** 6 (all verified working)
- **Source files:** 30+ TypeScript files
- **Golden test cases:** 19 across 4 categories
- **Event types:** 40+
- **API contracts:** 12 with Zod validation
- **Commits:** afd3674 (foundation), ce89ebf (build fix)

---

*Last updated: December 12, 2025*
