# Synapsys 2.0 Consolidation Roadmap

> **Version:** 2.0.0-alpha.0  
> **Branch:** `synapsys-v2`  
> **Status:** ✅ Foundation Complete - All packages compile

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
| `@tooloo/core` | 2.0.0-alpha.0 | ✅ Builds | The Soul - types, context, events |
| `@tooloo/skills` | 2.0.0-alpha.0 | ✅ Builds | Skill definitions, registry, loader |
| `@tooloo/providers` | 2.0.0-alpha.0 | ✅ Builds | LLM adapters with circuit breakers |
| `@tooloo/memory` | 2.0.0-alpha.0 | ✅ Builds | Event store, projections, semantic cache |
| `@tooloo/evals` | 2.0.0-alpha.0 | ✅ Builds | Cognitive Unit Testing harness |
| `@tooloo/contracts` | 2.0.0-alpha.0 | ✅ Builds | Zod schemas for all APIs |

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

### Phase 1: Foundation ✅ Complete

- [x] Create synapsys-v2 branch
- [x] Setup pnpm monorepo
- [x] Create @tooloo/core (types, events, context)
- [x] Create @tooloo/skills (registry, loader, router)
- [x] Create @tooloo/providers (adapters, circuit-breaker, streaming)
- [x] Create @tooloo/memory (event-store, projections, semantic-cache)
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

# Build all packages
for pkg in core skills providers memory evals contracts; do
  cd packages/$pkg && pnpm build && cd ../..
done

# Build specific package
cd packages/core && pnpm build

# Run evals
cd packages/evals && pnpm eval

# Type check
cd packages/core && pnpm typecheck
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

- **Packages:** 6
- **Source files:** ~30+
- **Golden test cases:** 20+
- **Event types:** 40+
- **API contracts:** 15+

---

*Last updated: December 2024*
