# TooLoo Genesis - Build Sequence

This document specifies the **exact order** to build TooLoo Genesis.

## Overview

Build in layers, validating each layer before moving to the next.

```
Foundation (Week 1)
    ↓
Validation (Week 2)
    ↓
Memory (Week 3)
    ↓
Team (Week 4)
    ↓
UI (Week 5)
    ↓
Integration (Week 6)
```

---

## Phase 1: Foundation (Days 1-7)

### Day 1: Repository Setup

**Task 1.1**: Initialize repository
```bash
mkdir tooloo-genesis
cd tooloo-genesis
pnpm init
```

**Task 1.2**: Setup monorepo
```bash
# Create package.json with workspaces
# Create turbo.json
# Create tsconfig.json
```

**Acceptance Criteria**:
- ✅ `pnpm install` works
- ✅ TypeScript compiles
- ✅ Turbo runs

**Task 1.3**: Create base packages
```bash
mkdir -p packages/{types,validation,gestalt,memory,team,knowledge}
mkdir -p apps/{studio,api}
```

**Acceptance Criteria**:
- ✅ All packages have package.json
- ✅ All packages have tsconfig.json
- ✅ Imports work between packages

### Day 2-3: Type System

**Location**: `packages/types/`

**Build Order**:
1. `src/branded.ts` - Branded type utilities
2. `src/validation.ts` - Validation types
3. `src/gestalt.ts` - Gestalt types
4. `src/memory.ts` - Memory types
5. `src/team.ts` - Team types

**Specification**: Each file exports:
- Type definitions
- Type guards
- Factory functions

**Example** (`src/branded.ts`):
```typescript
// Branded type utility
export type Brand<K, T> = K & { readonly __brand: T };

// ID types
export type UserId = Brand<string, 'UserId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type TaskId = Brand<string, 'TaskId'>;

// Factory functions
export const UserId = (value: string): UserId => {
  if (!value || typeof value !== 'string') {
    throw new TypeError('UserId must be a non-empty string');
  }
  return value as UserId;
};

// Type guards
export const isUserId = (value: unknown): value is UserId => {
  return typeof value === 'string' && value.length > 0;
};

// Export all
export type * from './branded';
export { UserId, isUserId };
```

**Acceptance Criteria**:
- ✅ All types defined
- ✅ All factories work
- ✅ All type guards work
- ✅ Tests pass (100% coverage)

### Day 4-5: Validation Engine Core

**Location**: `packages/validation/src/core/`

**Build Order**:
1. `validator.ts` - Core validation logic
2. `simulator.ts` - Simulation engine
3. `rollback.ts` - Rollback mechanisms

**Specification** (`validator.ts`):
```typescript
import { z } from 'zod';
import type { ValidationResult } from '@tooloo/types';

export interface ValidatorConfig<T> {
  schema: z.ZodSchema<T>;
  validators: ValidatorType[];
  onFailure?: (failures: ValidationFailure[]) => void;
}

export type ValidatorType = 
  | 'syntax'
  | 'type'
  | 'security'
  | 'performance'
  | 'business-logic'
  | 'gestalt';

export interface ValidationFailure {
  validator: ValidatorType;
  message: string;
  path: string[];
  severity: 'error' | 'warning';
  fixable: boolean;
  suggestedFix?: string;
}

export function createValidator<T>(
  config: ValidatorConfig<T>
): (input: unknown) => Promise<ValidationResult<T>> {
  return async (input: unknown) => {
    // 1. Schema validation
    const schemaResult = config.schema.safeParse(input);
    if (!schemaResult.success) {
      return {
        passed: false,
        failures: schemaResult.error.issues.map(toValidationFailure)
      };
    }
    
    // 2. Additional validators
    const failures: ValidationFailure[] = [];
    for (const validatorType of config.validators) {
      const validator = getValidator(validatorType);
      const result = await validator.validate(schemaResult.data);
      if (!result.passed) {
        failures.push(...result.failures);
      }
    }
    
    // 3. Return result
    if (failures.length > 0) {
      config.onFailure?.(failures);
      return { passed: false, failures };
    }
    
    return {
      passed: true,
      data: schemaResult.data
    };
  };
}
```

**Acceptance Criteria**:
- ✅ Validators can be composed
- ✅ Failures include fix suggestions
- ✅ Async validators work
- ✅ Tests pass

### Day 6-7: Gestalt System Foundation

**Location**: `packages/gestalt/src/`

**Build Order**:
1. `principles/` - Gestalt principle enforcers
2. `tokens/` - Design tokens
3. `validators/` - Gestalt validators

**Specification** (`principles/proximity.ts`):
```typescript
export const ProximityPrinciple = {
  spacing: {
    related: '8px',      // Items in same group
    group: '24px',       // Between groups  
    section: '48px',     // Between sections
    page: '96px'         // Between major areas
  },
  
  validate: (layout: Layout): GestaltViolation[] => {
    const violations: GestaltViolation[] = [];
    const spacings = layout.getAllSpacings();
    
    // Check spacing ratios
    const ratios = calculateRatios(spacings);
    if (ratios.max / ratios.min < 3) {
      violations.push({
        principle: 'proximity',
        message: 'Insufficient contrast between grouping levels',
        severity: 'error',
        fix: 'Use semantic spacing tokens: related < group < section'
      });
    }
    
    return violations;
  },
  
  enforce: () => {
    // CSS-in-JS or Tailwind class generators
    return {
      related: 'space-y-2',
      group: 'space-y-6',
      section: 'space-y-12',
      page: 'space-y-24'
    };
  }
};
```

**Acceptance Criteria**:
- ✅ All 6 Gestalt principles defined
- ✅ Validators work
- ✅ Tokens generate valid CSS
- ✅ Tests pass

---

## Phase 2: Validation System (Days 8-14)

### Day 8-9: Specific Validators

**Location**: `packages/validation/src/validators/`

**Build Order**:
1. `syntax.ts` - Syntax checking
2. `type.ts` - Type validation
3. `security.ts` - Security scanning
4. `performance.ts` - Performance analysis
5. `business-logic.ts` - Business rule validation

**Specification** (each validator):
```typescript
import type { Validator, ValidationResult } from '@tooloo/types';

export const SyntaxValidator: Validator = {
  name: 'syntax',
  
  async validate(input: unknown): Promise<ValidationResult> {
    const failures = [];
    
    // Validation logic
    // ...
    
    if (failures.length > 0) {
      return { passed: false, failures };
    }
    
    return { passed: true, data: input };
  }
};
```

**Acceptance Criteria**:
- ✅ Each validator is independent
- ✅ Each validator is async
- ✅ Each validator provides fix suggestions
- ✅ Tests cover edge cases

### Day 10-11: Simulation Engine

**Location**: `packages/validation/src/core/simulator.ts`

**Specification**:
```typescript
export interface SimulationConfig {
  setup: (sandbox: Sandbox) => Promise<void>;
  teardown: (sandbox: Sandbox) => Promise<void>;
  timeout?: number;
}

export interface SimulationResult {
  success: boolean;
  confidence: number;
  outcome: any;
  metrics: {
    executionTime: number;
    resourceUsage: ResourceMetrics;
    sideEffects: SideEffect[];
  };
  rollbackPlan: RollbackPlan;
}

export function createSimulation(
  config: SimulationConfig
): <T>(fn: () => Promise<T>) => Promise<SimulationResult> {
  return async (fn) => {
    const sandbox = await createSandbox();
    
    try {
      await config.setup(sandbox);
      
      const startTime = Date.now();
      const result = await sandbox.execute(fn);
      const duration = Date.now() - startTime;
      
      const metrics = await sandbox.collectMetrics();
      const confidence = calculateConfidence(metrics);
      
      return {
        success: true,
        confidence,
        outcome: result,
        metrics: {
          executionTime: duration,
          resourceUsage: metrics.resources,
          sideEffects: metrics.sideEffects
        },
        rollbackPlan: sandbox.getRollbackPlan()
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        outcome: null,
        error
      };
    } finally {
      await config.teardown(sandbox);
      await sandbox.destroy();
    }
  };
}
```

**Acceptance Criteria**:
- ✅ Sandboxes are isolated
- ✅ Metrics are collected
- ✅ Rollback plans are generated
- ✅ Timeouts work
- ✅ Tests pass

### Day 12-14: Iteration Tracking

**Location**: `packages/validation/src/iteration-tracker.ts`

**Specification**:
```typescript
export interface Iteration {
  id: IterationId;
  taskName: string;
  startTime: number;
  phase: 'validation' | 'simulation' | 'execution';
  
  recordSuccess: (metrics?: Metrics) => Promise<void>;
  recordFailure: (failure: ValidationFailure) => Promise<void>;
  recordError: (error: Error) => Promise<void>;
}

export async function trackIteration(
  taskName: string
): Promise<Iteration> {
  const id = generateIterationId();
  const startTime = Date.now();
  
  return {
    id,
    taskName,
    startTime,
    phase: 'validation',
    
    async recordSuccess(metrics) {
      const duration = Date.now() - startTime;
      
      await memoryNetwork.record({
        type: 'iteration-success',
        taskName,
        duration,
        phase: this.phase,
        metrics
      });
    },
    
    async recordFailure(failure) {
      const duration = Date.now() - startTime;
      
      await memoryNetwork.record({
        type: 'iteration-failure',
        taskName,
        duration,
        phase: this.phase,
        failure
      });
    },
    
    async recordError(error) {
      const duration = Date.now() - startTime;
      
      await memoryNetwork.record({
        type: 'iteration-error',
        taskName,
        duration,
        phase: this.phase,
        error: serializeError(error)
      });
    }
  };
}
```

**Acceptance Criteria**:
- ✅ Iterations are tracked per task
- ✅ Metrics are collected
- ✅ Memory network is updated
- ✅ Queries return insights
- ✅ Tests pass

---

## Phase 3: Memory Network (Days 15-21)

### Day 15-17: Memory Nodes & Network

**Location**: `packages/memory/src/`

**Build Order**:
1. `node.ts` - Memory node implementation
2. `network.ts` - Network management
3. `fungal-link.ts` - Connection management

**Specification** (`node.ts`):
```typescript
export interface MemoryNode {
  id: NodeId;
  type: 'pattern' | 'decision' | 'outcome' | 'reflection';
  content: unknown;
  
  // Root system (for retrieval)
  embedding: number[];
  keywords: string[];
  timestamp: Date;
  
  // Health metrics
  accessCount: number;
  lastAccessed: Date;
  confidence: number;
  
  // Connections
  fungalLinks: FungalLink[];
}

export async function createNode(
  data: CreateNodeData
): Promise<MemoryNode> {
  const embedding = await generateEmbedding(data.content);
  
  return {
    id: generateNodeId(),
    type: data.type,
    content: data.content,
    embedding,
    keywords: extractKeywords(data.content),
    timestamp: new Date(),
    accessCount: 0,
    lastAccessed: new Date(),
    confidence: 1.0,
    fungalLinks: []
  };
}
```

**Specification** (`fungal-link.ts`):
```typescript
export interface FungalLink {
  targetNodeId: NodeId;
  relationship: 'supports' | 'contradicts' | 'extends' | 'requires' | 'warns';
  strength: number; // 0-1
  nutrients: NutrientFlow;
  
  formedAt: Date;
  lastActivated: Date;
  activationCount: number;
}

export interface NutrientFlow {
  contextEnrichment: string[];
  sharedConstraints: string[];
  warningSignals: string[];
}

export async function createLink(
  from: NodeId,
  to: NodeId,
  relationship: LinkRelationship
): Promise<FungalLink> {
  return {
    targetNodeId: to,
    relationship,
    strength: 0.2, // Starts weak
    nutrients: extractNutrients(from, to),
    formedAt: new Date(),
    lastActivated: new Date(),
    activationCount: 0
  };
}

export async function strengthenLink(
  link: FungalLink,
  amount: number = 0.1
): Promise<FungalLink> {
  return {
    ...link,
    strength: Math.min(1.0, link.strength + amount),
    lastActivated: new Date(),
    activationCount: link.activationCount + 1
  };
}
```

**Acceptance Criteria**:
- ✅ Nodes can be created
- ✅ Links can be formed
- ✅ Strength increases with co-activation
- ✅ Queries return connected nodes
- ✅ Tests pass

### Day 18-19: Temporal Awareness

**Location**: `packages/memory/src/temporal.ts`

**Specification**:
```typescript
export interface TemporalMetrics {
  // Millisecond scale
  reactivity: number[];
  
  // Second scale
  interactivity: number[];
  
  // Minute scale
  flowDuration: number[];
  
  // Hour scale
  productiveHours: TimeRange[];
  
  // Day scale
  patternsLearned: DatePattern[];
  
  // Week scale
  velocityTrend: number[];
}

export async function trackTemporal(
  event: TemporalEvent
): Promise<void> {
  const scale = determineScale(event);
  await memoryNetwork.record({
    type: 'temporal',
    scale,
    event,
    timestamp: Date.now()
  });
}

export async function getTemporalInsights(
  taskName: string
): Promise<TemporalInsights> {
  const history = await memoryNetwork.query({
    taskName,
    type: 'temporal'
  });
  
  return {
    avgDuration: calculateAverage(history),
    trend: calculateTrend(history),
    optimalTime: findOptimalTime(history),
    predictions: predictFuture(history)
  };
}
```

**Acceptance Criteria**:
- ✅ All time scales tracked
- ✅ Trends calculated
- ✅ Predictions generated
- ✅ Tests pass

### Day 20-21: Query System

**Location**: `packages/memory/src/query.ts`

**Specification**:
```typescript
export interface MemoryQuery {
  type?: NodeType;
  keywords?: string[];
  embedding?: number[];
  timeRange?: TimeRange;
  minConfidence?: number;
}

export async function query(
  params: MemoryQuery
): Promise<MemoryNode[]> {
  // 1. Vector search (fast)
  const candidates = await vectorSearch(params);
  
  // 2. Filter by criteria
  const filtered = candidates.filter(matchesCriteria(params));
  
  // 3. Activate fungal network
  const enriched = await Promise.all(
    filtered.map(node => enrichWithConnections(node))
  );
  
  return enriched;
}

async function enrichWithConnections(
  node: MemoryNode
): Promise<EnrichedNode> {
  const connections = await getActiveConnections(node);
  const nutrients = connections.flatMap(c => c.nutrients);
  
  return {
    ...node,
    enrichedContext: nutrients,
    warningSignals: nutrients.flatMap(n => n.warningSignals),
    supportingPatterns: connections.filter(c => c.relationship === 'supports')
  };
}
```

**Acceptance Criteria**:
- ✅ Vector search works
- ✅ Connections are activated
- ✅ Nutrients flow
- ✅ Tests pass

---

## Phase 4-6: [Continue with Team, UI, Integration]

Would you like me to continue with the complete build sequence for:
- Phase 4: Team Agents (Days 22-28)
- Phase 5: UI System (Days 29-35)
- Phase 6: Integration (Days 36-42)
