# 🧠 Synapsys Skill OS

> **The Ultimate Abstraction**: TooLoo.ai as a Universal Kernel that loads and executes Skills.

## Vision

TooLoo.ai is now an **empty shell**. It knows nothing. It only knows how to load a Skill.

- **Want Chat?** Load the `ChatSkill`.
- **Want Coding?** Load the `CodingSkill`.
- **Want Settings?** Load the `SystemSkill`.

Every feature is a plugin. If you delete the `skills/` folder, the app is a blank white screen.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYNAPSYS SKILL OS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│   │  ChatSkill  │    │ SystemSkill │    │ CodingSkill │       │
│   │             │    │             │    │             │       │
│   │ • logic.ts  │    │ • logic.ts  │    │ • logic.ts  │       │
│   │ • ui.tsx    │    │ • ui.tsx    │    │ • ui.tsx    │       │
│   │ • index.ts  │    │ • index.ts  │    │ • index.ts  │       │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│          │                  │                  │               │
│          └────────────┬─────┴──────────────────┘               │
│                       │                                        │
│   ┌───────────────────▼───────────────────────────────────┐   │
│   │                      KERNEL                            │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│   │  │ Registry │  │  Router  │  │ Executor │            │   │
│   │  └──────────┘  └──────────┘  └──────────┘            │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Start the Skill OS kernel
npm run skill-os

# Development mode with hot reload
npm run skill-os:dev
```

The kernel will boot and print:

```
╔══════════════════════════════════════════════════════════════╗
║   🧠 SYNAPSYS SKILL OS                                       ║
║   The Universal Kernel for TooLoo.ai                         ║
╚══════════════════════════════════════════════════════════════╝

  ✅ Synapsys Skill OS is ONLINE

  📊 Registered Skills: 2
     • core.chat (Chat) - core
     • core.system (Settings) - system

  🌐 API: http://localhost:4002/synapsys
```

## API Endpoints

| Endpoint               | Method | Description                           |
| ---------------------- | ------ | ------------------------------------- |
| `/synapsys/execute`    | POST   | Execute a skill directly              |
| `/synapsys/intent`     | POST   | Route + execute from natural language |
| `/synapsys/skills`     | GET    | List all registered skills            |
| `/synapsys/skills/:id` | GET    | Get specific skill info               |
| `/synapsys/activate`   | POST   | Activate a skill (UI state)           |
| `/synapsys/status`     | GET    | Kernel status                         |
| `/synapsys/route`      | GET    | Preview routing (debug)               |
| `/synapsys/suggest`    | GET    | Autocomplete suggestions              |

### Examples

```bash
# List all skills
curl http://localhost:4002/synapsys/skills | jq

# Execute chat skill
curl -X POST http://localhost:4002/synapsys/execute \
  -H "Content-Type: application/json" \
  -d '{"skillId": "core.chat", "input": {"message": "Hello!"}}'

# Natural language routing
curl -X POST http://localhost:4002/synapsys/intent \
  -H "Content-Type: application/json" \
  -d '{"text": "change my theme to dark"}'

# Preview routing
curl "http://localhost:4002/synapsys/route?text=hello"
```

## Directory Structure

```
src/
├── kernel/              # The Universal Kernel
│   ├── types.ts         # Core interfaces (Skill, KernelContext)
│   ├── registry.ts      # Skill storage & lookup
│   ├── router.ts        # Intent-based routing
│   ├── kernel.ts        # Execution engine
│   ├── server.ts        # HTTP API
│   ├── boot.ts          # Bootstrap script
│   └── index.ts         # Public exports
│
└── skills/              # Vertical Skill Slices
    ├── chat/
    │   ├── index.ts     # Skill definition
    │   ├── logic.ts     # Backend brain
    │   └── ui.tsx       # Frontend body
    │
    ├── system/
    │   ├── index.ts
    │   ├── logic.ts
    │   └── ui.tsx
    │
    └── index.ts         # Auto-registers all skills

apps/web/src/
├── hooks/
│   └── useSynapsys.ts   # React hook for kernel
│
└── components/
    ├── SkillRenderer.tsx  # The "Chameleon" UI
    └── AppSkillOS.tsx     # Main application shell
```

## Creating a New Skill

### 1. Create the folder

```bash
mkdir -p src/skills/myskill
```

### 2. Create the logic (backend)

```typescript
// src/skills/myskill/logic.ts
import type { KernelContext } from '../../kernel/types.js';

export interface MyInput {
  query: string;
}
export interface MyOutput {
  result: string;
}

export async function myExecute(input: MyInput, context: KernelContext): Promise<MyOutput> {
  return { result: `Processed: ${input.query}` };
}
```

### 3. Create the UI (frontend)

```tsx
// src/skills/myskill/ui.tsx
export function MyUI({ data, onInteract, isLoading }) {
  return (
    <div>
      <h1>My Skill</h1>
      <button onClick={() => onInteract({ query: 'test' })}>Run</button>
      {data && <p>{data.result}</p>}
    </div>
  );
}
```

### 4. Create the definition

```typescript
// src/skills/myskill/index.ts
import { z } from 'zod';
import { defineSkill } from '../../kernel/index.js';
import { myExecute } from './logic.js';

export const MySkill = defineSkill({
  id: 'plugin.myskill',
  name: 'My Skill',
  description: 'Does something awesome',
  version: '1.0.0',
  category: 'plugin',

  intent: {
    triggers: ['/myskill', 'my skill'],
    priority: 5,
  },

  schema: z.object({ query: z.string() }),
  execute: myExecute,

  ui: {
    icon: 'star',
    placement: 'sidebar',
  },
  component: 'skills/myskill/ui',
});

export default MySkill;
```

### 5. Register the skill

```typescript
// src/skills/index.ts
import { MySkill } from './myskill/index.js';

export const BUILT_IN_SKILLS = [
  ChatSkill,
  SystemSkill,
  MySkill, // Add here
];
```

### 6. Add UI component mapping

```typescript
// apps/web/src/components/SkillRenderer.tsx
const SKILL_COMPONENTS = {
  'core.chat': lazy(() => import('...')),
  'core.system': lazy(() => import('...')),
  'plugin.myskill': lazy(() => import('...')), // Add here
};
```

## The Skill Interface

```typescript
interface Skill<TInput, TOutput> {
  // Identity
  id: string; // Unique ID: 'core.chat', 'plugin.weather'
  name: string; // Human-readable name
  description: string; // What it does
  version: string; // Semver
  category: SkillCategory;

  // When to activate
  intent: {
    triggers: string[]; // Commands: ['/chat', 'hello']
    classifier?: (text: string) => number; // AI-based matching
    priority?: number; // Higher = preferred
    requires?: {
      auth?: boolean;
      project?: boolean;
    };
  };

  // Backend logic
  schema: z.ZodType<TInput>; // Input validation
  outputSchema?: z.ZodType<TOutput>;
  execute: (input: TInput, ctx: KernelContext) => Promise<TOutput>;

  // Frontend UI
  ui: {
    icon: string;
    placement: 'main' | 'sidebar' | 'modal' | 'floating' | 'hidden';
    shortcut?: string;
  };
  component: string; // Path to React component

  // Lifecycle
  hooks?: {
    onLoad?: (ctx) => Promise<void>;
    onActivate?: (ctx) => Promise<void>;
    onDeactivate?: () => Promise<void>;
  };

  dependencies?: string[]; // Other skills this depends on
}
```

## Why This Architecture?

1. **Code Deletion**: No more complex routing, navigation state, or disjointed types.

2. **Instant Features**: Add one folder → Kernel auto-loads it, creates API, registers UI.

3. **AI Compatibility**: An AI can write a perfect skill because all context (logic + UI) is in one place.

4. **True Modularity**: Delete `skills/chat/` and chat disappears. No side effects.

5. **Plugin Ecosystem**: Third parties can create skills that integrate seamlessly.

## Frontend Usage

```tsx
import { useSynapsys } from './hooks/useSynapsys';

function MyComponent() {
  const {
    activeSkill,
    skillData,
    isLoading,
    error,
    skills,
    execute,
    executeIntent,
    activate,
    dispatch,
  } = useSynapsys();

  // Execute specific skill
  const result = await execute('core.chat', { message: 'Hello' });

  // Natural language routing
  const result = await executeIntent('change theme to dark');

  // Dispatch to active skill
  await dispatch({ message: 'Hello' });

  // Switch skills
  await activate('core.system');
}
```

## Contributing

When adding features to TooLoo.ai:

1. **Don't add routes** - Create a Skill
2. **Don't add components** - Add them to a Skill's UI
3. **Don't add services** - Add them to a Skill's logic
4. **Keep it vertical** - One feature = One folder

---

_The future is modular. The future is Skills._
