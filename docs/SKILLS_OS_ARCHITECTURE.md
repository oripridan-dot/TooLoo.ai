# TooLoo.ai Skills OS Architecture

> **Version:** 1.5.0 | **Phase:** 10 Complete | **Date:** December 15, 2025

## 🎯 Core Principle

**Everything is a Skill.**

Skills OS is not a chatbot with plugins. It's an operating system where:

- The **UI** doesn't know what "Chat" is - it asks the Kernel "What can I do?"
- The **API** doesn't have hardcoded routes - it routes requests to Skills
- **New capabilities** are added by creating YAML files, not writing code

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                     │
│                        apps/web (Port 5173)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Skills Shell: Dynamically renders UI based on skill registry       │   │
│  │  • No hardcoded menus                                                │   │
│  │  • Components map to skill IDs                                       │   │
│  │  • WebSocket for real-time updates                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                       │
│                        apps/api (Port 4001)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REST + WebSocket endpoints                                          │   │
│  │  • POST /api/v2/execute → Kernel.execute()                          │   │
│  │  • POST /api/v2/route → UnifiedRouter.route()                       │   │
│  │  • GET /api/v2/skills → Registry.listManifests()                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KERNEL                                          │
│                     src/kernel (Port 4002)                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │   Registry    │  │    Router     │  │    Kernel     │                   │
│  │  ───────────  │  │  ───────────  │  │  ───────────  │                   │
│  │  Load YAML    │  │  Intent →     │  │  Execute()    │                   │
│  │  Validate     │  │  Skill match  │  │  Context      │                   │
│  │  Store        │  │  Confidence   │  │  Services     │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED SKILL ROUTER                              │   │
│  │  ──────────────────────────────────────────────────────────────────  │   │
│  │  • Routes ALL requests through skills (no legacy paths)              │   │
│  │  • Legacy function → Skill mapping                                   │   │
│  │  • Category-based routing                                            │   │
│  │  • Convenience methods for common operations                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SKILL DEFINITIONS                                   │
│                          skills/*.yaml                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  30 Skills Total                                                     │   │
│  │  ├── Core: core.chat, core.skills, core.admin, core.metrics         │   │
│  │  ├── Coding: coding-assistant, architect, code-reviewer, etc.       │   │
│  │  ├── Meta: self-awareness, self-modification, autonomous-evolution  │   │
│  │  ├── Learning: learning, experimentation, meta-cognition            │   │
│  │  ├── Memory: memory, knowledge, context                             │   │
│  │  ├── Emergence: emergence, prediction, goal-pursuit                 │   │
│  │  ├── Services: scheduler, orchestrator, observability               │   │
│  │  └── Autonomous: self-healing, skill-synthesis, autonomous-learning │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NATIVE ENGINES                                    │
│                   packages/skills/src/engines/                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ LearningEngine│  │EvolutionEngine│  │EmergenceEngine│  │RoutingEngine│  │
│  │  ───────────  │  │  ───────────  │  │  ───────────  │  │ ─────────── │  │
│  │  Q-learning   │  │  A/B testing  │  │  Patterns     │  │ Provider    │  │
│  │  Rewards      │  │  Strategies   │  │  Synergies    │  │ selection   │  │
│  │  Exploration  │  │  Optimization │  │  Goals        │  │ Fallback    │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SERVICES                                         │
│                   packages/skills/src/services/                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │ Orchestrator  │  │   Scheduler   │  │ SelfImprove   │                   │
│  │  ───────────  │  │  ───────────  │  │  ───────────  │                   │
│  │  Compose      │  │  Cron/Event   │  │  Analyze      │                   │
│  │  Sequential   │  │  Interval     │  │  Propose      │                   │
│  │  Parallel     │  │  Threshold    │  │  Test/Deploy  │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │  SelfHealing  │  │ SkillSynthesis│  │ AutoLearning  │                   │
│  │  ───────────  │  │  ───────────  │  │  ───────────  │                   │
│  │  Health check │  │  Gap detect   │  │  Cycles       │                   │
│  │  Auto-recover │  │  Create YAML  │  │  Knowledge    │                   │
│  │  Escalate     │  │  Deploy       │  │  Optimize     │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOOLS                                           │
│                   packages/skills/src/tools/                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ToolExecutor: Unified tool execution with safety                    │   │
│  │  ├── file_read, file_write, file_delete                             │   │
│  │  ├── grep_search, semantic_search                                   │   │
│  │  ├── terminal_execute                                                │   │
│  │  └── list_dir                                                        │   │
│  │                                                                       │   │
│  │  Safety: Path validation, approval workflow, audit logging           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MEMORY                                          │
│                       packages/memory/                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  MemoryCortex: Multi-tier memory system                              │   │
│  │  ├── Session memory (immediate context)                              │   │
│  │  ├── Working memory (key-value slots)                                │   │
│  │  ├── Short-term memory (recent interactions)                         │   │
│  │  ├── Long-term memory (persistent knowledge)                         │   │
│  │  └── Vector storage (semantic search)                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
TooLoo.ai/
├── skills/                          # 📦 SKILL DEFINITIONS (Source of Truth)
│   ├── coding-assistant.yaml        # Code generation
│   ├── architect.yaml               # System design
│   ├── self-awareness.yaml          # Introspection
│   ├── autonomous-evolution.yaml    # Self-improvement
│   └── ... (30 skills total)
│
├── src/kernel/                       # 🧠 KERNEL
│   ├── boot.ts                       # Entry point
│   ├── kernel.ts                     # Execution engine
│   ├── registry.ts                   # Skill registry
│   ├── router.ts                     # Intent routing
│   ├── unified-router.ts             # Phase 10: All-through-skills router
│   └── types.ts                      # Type definitions
│
├── packages/
│   ├── skills/                       # 📦 @tooloo/skills
│   │   ├── src/engines/              # Native engines (4)
│   │   │   ├── learning.ts           # Q-learning
│   │   │   ├── evolution.ts          # A/B testing
│   │   │   ├── emergence.ts          # Pattern detection
│   │   │   └── routing.ts            # Provider routing
│   │   ├── src/services/             # Services (6)
│   │   │   ├── orchestrator.ts       # Multi-skill composition
│   │   │   ├── scheduler.ts          # Time/event triggers
│   │   │   ├── self-improvement.ts   # Autonomous evolution
│   │   │   ├── self-healing.ts       # Auto-recovery
│   │   │   ├── skill-synthesizer.ts  # Automatic skill creation
│   │   │   └── autonomous-learning.ts # Continuous learning
│   │   └── src/tools/                # Tool execution
│   │       ├── executor.ts           # ToolExecutor
│   │       ├── file-tools.ts         # File operations
│   │       ├── search-tools.ts       # Search operations
│   │       └── terminal-tools.ts     # Terminal operations
│   │
│   ├── memory/                       # 📦 @tooloo/memory
│   │   └── src/cortex.ts             # MemoryCortex
│   │
│   └── providers/                    # 📦 @tooloo/providers
│       └── src/                      # LLM provider adapters
│
├── apps/
│   ├── api/                          # 🌐 API Server (Port 4001)
│   └── web/                          # 🖥️ Skills Shell (Port 5173)
│
├── src/cortex/                       # ⚠️ DEPRECATED (see DEPRECATED.md)
├── src/precog/                       # ⚠️ DEPRECATED (see DEPRECATED.md)
│
└── tests/
    └── unit/services/                # Stress tests
        └── skills-os-stress.test.ts
```

---

## 🔌 API Contracts

### Execute a Skill

```bash
POST /api/v2/execute
Content-Type: application/json

{
  "skillId": "coding-assistant",
  "input": {
    "task": "Write a TypeScript function to merge arrays"
  }
}

# Response
{
  "success": true,
  "data": "function mergeArrays<T>(...arrays: T[][]): T[] {...}",
  "meta": {
    "skillId": "coding-assistant",
    "duration": 1234
  }
}
```

### Route via Unified Router

```bash
POST /api/v2/route
Content-Type: application/json

{
  "message": "Help me design a microservices architecture",
  "category": "architecture"  // Optional hint
}

# Response
{
  "success": true,
  "data": "Here's a microservices architecture...",
  "meta": {
    "skillId": "architect",
    "skillName": "System Architect",
    "category": "architecture",
    "duration": 2345,
    "confidence": 0.92
  }
}
```

### List Skills

```bash
GET /api/v2/skills

# Response
{
  "data": [
    {
      "id": "coding-assistant",
      "name": "Coding Assistant",
      "category": "coding",
      "keywords": ["code", "typescript", "function"]
    },
    ...
  ]
}
```

---

## 🧬 Skill Anatomy

```yaml
# skills/example.yaml
id: example-skill
name: Example Skill
version: "1.0.0"
description: >
  What this skill does

category: coding  # coding, meta, learning, memory, emergence, etc.

keywords:
  - keyword1
  - keyword2

schema:
  type: object
  properties:
    task:
      type: string
      description: The task to perform
  required:
    - task

instructions: |
  You are an expert at...
  
  ## Guidelines
  - Always do X
  - Never do Y

tools:
  - file_read
  - file_write

composability:
  canCompose: true
  requiresContext: true
  outputFormats:
    - json
    - markdown

context:
  requiredMemory:
    - conversationHistory
  providedContext:
    - taskResults
```

---

## 🔄 Request Flow

```
1. User Input
   │
   ▼
2. UI (Skills Shell)
   │ WebSocket / HTTP
   ▼
3. API Gateway
   │ POST /api/v2/route
   ▼
4. UnifiedSkillRouter
   │ Determine category/skill
   ▼
5. Kernel.execute()
   │ Load skill from registry
   │ Validate input
   │ Provide context + services
   ▼
6. Skill.execute()
   │ Access tools, memory, engines
   │ Generate response
   ▼
7. Response flows back
   │
   ▼
8. UI renders result
```

---

## 📊 Metrics & Observability

### Key Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| `skills_executed_total` | Kernel | Total skill executions |
| `skills_execution_duration` | Kernel | Execution time histogram |
| `learning_rewards_total` | LearningEngine | Q-learning rewards |
| `evolution_tests_active` | EvolutionEngine | Active A/B tests |
| `emergence_patterns_detected` | EmergenceEngine | Pattern count |
| `routing_provider_health` | RoutingEngine | Provider availability |
| `healing_issues_detected` | SelfHealingService | Issue count |
| `synthesis_skills_created` | SkillSynthesizer | Auto-created skills |
| `learning_cycles_completed` | AutonomousLearningLoop | Learning cycles |

### Health Endpoints

- `GET /api/v2/health` - Overall system health
- `GET /synapsys/status` - Kernel status
- `GET /synapsys/engines` - Engine health

---

## 🔐 Security Model

### Tool Execution Safety

1. **Path Validation**: Only allowed paths can be accessed
2. **Approval Workflow**: High-risk operations require approval
3. **Rate Limiting**: Prevent abuse (100 ops/minute)
4. **Audit Logging**: All operations logged
5. **Sandboxing**: Terminal commands run in restricted environment

### Self-Modification Safety

1. **Risk Assessment**: All changes classified (low/medium/high/critical)
2. **Auto-Approval Limits**: Only low/medium risk auto-approved
3. **Rollback**: Automatic rollback on failures
4. **Daily Limits**: Max 10 improvements per day
5. **Human Escalation**: Critical changes require human approval

---

## 🚀 Getting Started

### Boot Skills OS

```bash
# Start everything
pnpm dev

# Or boot kernel only
pnpm boot

# Check health
pnpm health
```

### Create a New Skill

1. Create YAML in `skills/my-skill.yaml`
2. Restart kernel or call registry reload
3. Skill is now available via router

### Execute a Skill

```typescript
import { kernel } from './src/kernel/kernel.js';

const result = await kernel.execute({
  skillId: 'coding-assistant',
  input: { task: 'Write a hello world function' }
});
```

### Use Unified Router

```typescript
import { getUnifiedSkillRouter } from './src/kernel/unified-router.js';

const router = getUnifiedSkillRouter();
const response = await router.chat('Hello, how are you?');
```

---

## 📚 References

- [SKILLS_OS.md](../SKILLS_OS.md) - Quick start guide
- [SKILLS_OS_EVOLUTION.md](../SKILLS_OS_EVOLUTION.md) - Evolution roadmap
- [copilot-instructions.md](../.github/copilot-instructions.md) - Copilot guidelines

---

*Skills OS V1.5.0 - Phase 10 Complete*
*Everything is a Skill*
