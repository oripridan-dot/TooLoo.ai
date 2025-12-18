# GitHub Copilot Instructions for TooLoo Genesis

## Project Overview
TooLoo Genesis is a validation-first AI development platform where every action is validated and simulated before execution.

## Code Generation Rules

### Rule 1: Validation First
Every function must start with validation:

```typescript
async function doSomething(input: unknown) {
  // 1. Validate input
  const validation = await validator.validate(input);
  if (!validation.passed) {
    throw new ValidationError(validation.failures);
  }
  
  // 2. Type-safe data
  const data = validation.data;
  
  // 3. Implementation
  // ...
}
```

### Rule 2: Branded Types
Use branded types for all IDs:

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type ProjectId = string & { readonly __brand: 'ProjectId' };

// Import from @tooloo/types
import { UserId, ProjectId } from '@tooloo/types';
```

### Rule 3: Gestalt Tokens
Never hard-code UI values:

```typescript
// ❌ Wrong
<div className="mt-4 mb-8 p-6">

// ✅ Correct
import { gestalt } from '@tooloo/gestalt';
<div className={gestalt.spacing.section}>
```

### Rule 4: Iteration Tracking
Track every operation:

```typescript
import { trackIteration } from '@tooloo/validation';

const iteration = await trackIteration('operation-name');
try {
  // ... work
  await iteration.recordSuccess();
} catch (error) {
  await iteration.recordFailure(error);
}
```

### Rule 5: Memory Updates
Learn from every action:

```typescript
await memoryNetwork.record({
  pattern: 'pattern-name',
  outcome: 'success' | 'failure',
  duration: number,
  learnings: string[]
});
```

## Component Structure

Every React component follows this pattern:

```typescript
import { gestalt } from '@tooloo/gestalt';
import { validateGestalt } from '@tooloo/gestalt/validators';

interface Props {
  // Props definition
}

export function ComponentName({ ...props }: Props) {
  return (
    <Container spacing={gestalt.spacing.section}>
      {/* Component content */}
    </Container>
  );
}

// REQUIRED: Gestalt validation
ComponentName.gestaltTests = {
  violations: 0,
  principles: ['proximity', 'similarity', 'continuity']
};
```

## API Endpoint Structure

```typescript
import { validateRequest } from '@tooloo/validation';
import { trackIteration } from '@tooloo/validation';

router.post('/endpoint', async (req, res) => {
  const iteration = await trackIteration('endpoint-name');
  
  try {
    // 1. Validate
    const validation = await validateRequest(req.body, schema);
    if (!validation.passed) {
      await iteration.recordFailure(validation);
      return res.status(400).json(validation.failures);
    }
    
    // 2. Business logic
    const result = await service.doWork(validation.data);
    
    // 3. Success
    await iteration.recordSuccess();
    res.json(result);
    
  } catch (error) {
    await iteration.recordError(error);
    res.status(500).json({ error: error.message });
  }
});
```

## Testing Requirements

Every file needs:
1. Unit tests for logic
2. Validation tests
3. Gestalt tests (for UI components)
4. Integration tests

```typescript
describe('ComponentName', () => {
  it('validates input correctly', () => {
    // Validation test
  });
  
  it('passes Gestalt principles', () => {
    const violations = validateGestalt(<Component />);
    expect(violations).toHaveLength(0);
  });
  
  it('tracks iterations', async () => {
    // Iteration tracking test
  });
  
  it('updates memory network', async () => {
    // Memory test
  });
});
```

## Import Organization

```typescript
// 1. External dependencies
import { z } from 'zod';
import React from 'react';

// 2. Internal packages (types first)
import type { UserId, ValidationResult } from '@tooloo/types';
import { validateInput } from '@tooloo/validation';
import { gestalt } from '@tooloo/gestalt';

// 3. Local imports
import { helper } from './utils';
import type { LocalType } from './types';
```

## Common Patterns

### Creating a Validator
```typescript
import { z } from 'zod';
import { createValidator } from '@tooloo/validation';

const schema = z.object({
  // schema definition
});

const validator = createValidator({
  schema,
  validators: ['syntax', 'type', 'security']
});
```

### Creating a Memory Node
```typescript
await memoryNetwork.createNode({
  type: 'pattern' | 'decision' | 'outcome',
  content: {},
  connections: [],
  embedding: await generateEmbedding(content)
});
```

### Creating a Gestalt-Compliant Component
```typescript
export function Card({ children }: Props) {
  return (
    <div className={cn(
      gestalt.spacing.section,
      gestalt.colors.surface,
      gestalt.borders.card
    )}>
      {children}
    </div>
  );
}
```

## Error Handling

Always use typed errors:

```typescript
import { 
  ValidationError,
  SimulationError,
  ExecutionError 
} from '@tooloo/types';

throw new ValidationError('Clear message', {
  details: validation.failures,
  recoverable: true
});
```

## What NOT to Suggest

❌ `any` types
❌ Hard-coded magic numbers
❌ Functions without validation
❌ Components without Gestalt compliance
❌ Operations without tracking
❌ Synchronous file operations
❌ Unhandled promises
❌ Hard-coded secrets

## AI Agent Suggestions

When suggesting agent code:

```typescript
import { BaseAgent } from '@tooloo/team';

export class CustomAgent extends BaseAgent {
  async execute(task: Task): Promise<Result> {
    // 1. Query memory for patterns
    const patterns = await this.memory.query(task);
    
    // 2. Validate approach
    const validation = await this.validateApproach(task, patterns);
    
    // 3. Simulate execution
    const simulation = await this.simulate(task);
    
    // 4. Execute if confident
    if (simulation.confidence > 0.9) {
      const result = await this.executeTask(task);
      
      // 5. Reflect
      await this.reflect({ task, result, simulation });
      
      return result;
    }
    
    throw new LowConfidenceError(simulation);
  }
}
```

## Remember

- Validation before execution
- Simulation before production
- Reflection after completion
- Memory updates always
- Gestalt compliance for UI
- Iteration tracking for everything

## The Goal

Build code that is:
- **Validated**: Can't execute invalid operations
- **Simulated**: Tested before deployment
- **Tracked**: Every attempt is measured
- **Learned**: Every operation improves the system
- **Gestalt**: Every UI respects the brain
