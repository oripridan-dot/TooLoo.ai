# ⚠️ DEPRECATED: Legacy Cortex Code

> **Status:** DEPRECATED as of Skills OS V1.5.0 (December 15, 2025)
> **Migration Target:** `skills/*.yaml` + `packages/skills/src/`

## Why This Code is Deprecated

Skills OS V1.5 completes Phase 10: Legacy Deprecation. All capabilities previously provided by the cortex modules are now available through the skill system.

## Migration Guide

### Memory Operations

**Before (Legacy):**
```typescript
import { memory } from './src/cortex/memory';
await memory.store({ content: 'data', type: 'fact' });
await memory.retrieve({ query: 'search' });
```

**After (Skills OS):**
```typescript
import { getUnifiedSkillRouter } from './src/kernel/unified-router';
const router = getUnifiedSkillRouter();

await router.storeMemory('data', 'fact', 0.8);
await router.retrieveMemory('search');

// Or via skill execution:
await kernel.execute({
  skillId: 'memory',
  input: { action: 'store', content: 'data', type: 'fact' }
});
```

### Learning & Feedback

**Before (Legacy):**
```typescript
import { learner } from './src/cortex/learning';
await learner.reward('skill-id', 1.0);
```

**After (Skills OS):**
```typescript
await router.recordFeedback('skill-id', 'positive');

// Or directly:
await kernel.execute({
  skillId: 'learning',
  input: { action: 'feedback', skillId: 'skill-id', feedback: 'positive' }
});
```

### Tool Execution

**Before (Legacy):**
```typescript
import { tools } from './src/cortex/tools';
await tools.execute('file_read', { path: '/foo' });
```

**After (Skills OS):**
```typescript
// Tools are now part of skill context
await kernel.execute({
  skillId: 'coding-assistant',
  input: { task: 'Read the file at /foo' }
});

// Or directly via ToolExecutor:
import { getToolExecutor } from '@tooloo/skills';
const executor = getToolExecutor();
await executor.execute('file_read', { path: '/foo' }, context);
```

### Emergence & Patterns

**Before (Legacy):**
```typescript
import { emergence } from './src/cortex/emergence';
await emergence.detectPatterns();
```

**After (Skills OS):**
```typescript
await router.detectPatterns();

// Or via EmergenceEngine:
import { getEmergenceEngine } from '@tooloo/skills';
const engine = getEmergenceEngine();
await engine.detectPatterns();
```

## Skill Equivalents

| Legacy Module | Skill ID | Service |
|---------------|----------|---------|
| `cortex/memory` | `memory` | `MemoryCortex` |
| `cortex/learning` | `learning` | `LearningEngine` |
| `cortex/emergence` | `emergence` | `EmergenceEngine` |
| `cortex/tools` | `coding-assistant` | `ToolExecutor` |
| `cortex/scheduling` | `scheduler` | `SkillScheduler` |
| `cortex/orchestrator` | `orchestrator` | `SkillOrchestrator` |
| `cortex/self-modification` | `autonomous-evolution` | `SelfImprovementService` |

## Timeline

- **V1.5.0** (Dec 2025): Deprecation markers added
- **V1.6.0** (Jan 2026): Legacy imports emit warnings
- **V2.0.0** (Mar 2026): Legacy code removed

## Questions?

See [SKILLS_OS_ARCHITECTURE.md](../docs/SKILLS_OS_ARCHITECTURE.md) for the new architecture.
