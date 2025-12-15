# ⚠️ DEPRECATED: Legacy Precog Code

> **Status:** DEPRECATED as of Skills OS V1.5.0 (December 15, 2025)
> **Migration Target:** `skills/*.yaml` + `packages/skills/src/`

## Why This Code is Deprecated

Skills OS V1.5 completes Phase 10: Legacy Deprecation. All capabilities previously provided by the precog modules are now available through the skill system.

## Migration Guide

### LLM Provider Access

**Before (Legacy):**
```typescript
import { generateLLM } from './src/precog/providers/llm-provider';
const response = await generateLLM({
  provider: 'openai',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**After (Skills OS):**
```typescript
import { getUnifiedSkillRouter } from './src/kernel/unified-router';
const router = getUnifiedSkillRouter();

const response = await router.chat('Hello');

// Or via skill execution:
await kernel.execute({
  skillId: 'core.chat',
  input: { message: 'Hello' }
});

// Or via RoutingEngine for provider selection:
import { getRoutingEngine } from '@tooloo/skills';
const engine = getRoutingEngine();
const provider = await engine.selectProvider('chat');
```

### Scheduler / Cron Jobs

**Before (Legacy):**
```typescript
import { scheduler } from './src/precog/scheduler';
scheduler.schedule({
  cron: '0 * * * *',
  task: () => doSomething()
});
```

**After (Skills OS):**
```typescript
import { getSkillScheduler } from '@tooloo/skills';
const scheduler = getSkillScheduler();

scheduler.registerTask({
  id: 'my-task',
  skillId: 'my-skill',
  trigger: {
    type: 'cron',
    schedule: '0 * * * *'
  }
});
```

### Training & Evolution

**Before (Legacy):**
```typescript
import { evolutionEngine } from './src/precog/engine/autonomous-evolution-engine';
await evolutionEngine.runExperiment(config);
```

**After (Skills OS):**
```typescript
import { getEvolutionEngine } from '@tooloo/skills';
const engine = getEvolutionEngine();

await engine.startTest({
  id: 'test-1',
  variants: [{ id: 'a', config: {} }, { id: 'b', config: {} }],
  metrics: ['latency', 'quality']
});
```

### Oracle / Prediction

**Before (Legacy):**
```typescript
import { Oracle } from './src/precog/oracle';
const prediction = await oracle.predict(input);
```

**After (Skills OS):**
```typescript
await kernel.execute({
  skillId: 'prediction',
  input: { action: 'predict', data: input }
});
```

## Skill Equivalents

| Legacy Module | Skill ID | Service |
|---------------|----------|---------|
| `precog/providers` | `core.chat` | `RoutingEngine` |
| `precog/scheduler` | `scheduler` | `SkillScheduler` |
| `precog/engine/evolution` | `skill-evolution` | `EvolutionEngine` |
| `precog/training` | `learning` | `LearningEngine` |
| `precog/oracle` | `prediction` | EmergenceEngine |
| `precog/harvester` | `knowledge` | `MemoryCortex` |
| `precog/synthesizer` | `skill-synthesis` | `SkillSynthesizer` |

## Timeline

- **V1.5.0** (Dec 2025): Deprecation markers added
- **V1.6.0** (Jan 2026): Legacy imports emit warnings
- **V2.0.0** (Mar 2026): Legacy code removed

## Questions?

See [SKILLS_OS_ARCHITECTURE.md](../docs/SKILLS_OS_ARCHITECTURE.md) for the new architecture.
