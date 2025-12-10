# TooLoo.ai V3.3 Architecture

> **@intent** This document provides a visual and textual overview of the TooLoo.ai
> codebase architecture, automatically generated from the actual dependency graph.

*Last generated: 2025-12-09*
*Version: 3.3.455*

---

## 🎯 Reality Check: What's Real vs Pending

**Overall Completion: ~70%** (relative to Year 1 Phase 2 vision)

### ✅ REAL (Functional & Tested)

| Component | Status | Location |
|-----------|--------|----------|
| **🧠 Orchestrator (Brain)** | 100% | `src/cortex/orchestrator.ts` |
| **📊 DAG Builder (Task Management)** | 100% | `src/cortex/agent/system-hub.ts` |
| **💾 Artifact Ledger (Memory)** | 100% | `src/cortex/agent/artifact-manager.ts` |
| **🔀 LLM Provider Routing** | 100% | `src/precog/providers/` |
| **🌐 Server Infrastructure** | 100% | `src/nexus/index.ts`, `src/main.ts` |
| **📋 API Contract Enforcement** | 100% | `src/nexus/middleware/contract-enforcer.ts` |
| **🛡️ QA Guardian** | 100% | `src/qa/` |
| **👁️ Vision→Orchestrator** | 100% | `src/cortex/orchestrator.ts` (V3.3.450) |
| **🖥️ Workstation UI (4-Panel)** | 100% | `src/web-app/src/skin/views/Workstation.jsx` (V3.3.455) |

### ⚠️ READY FOR PRODUCTION USE

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **👁️ Screen Capture (Vision)** | 100% | `src/cortex/vision/screen-capture-service.ts` | Now wired to Orchestrator |
| **🖼️ OCR Text Extraction** | 100% | Uses Tesseract.js | Integrated via event bus |

### ❌ PENDING (Not Built)

| Component | Status | What's Needed |
|-----------|--------|---------------|
| **🤖 Repo Auto-Org (Automation)** | 0% | Branch creation, scope detection, auto-commits |

---

## Visual Dependency Graph

![Dependency Graph](./dependency-graph.svg)

> If the image doesn't render, install Graphviz and re-run `npm run generate:arch`

## Architecture Overview

```mermaid
graph TD
    subgraph "Cognitive Layer"
        Cortex[🧠 Cortex<br/>Intent & Context]
        Precog[🔮 Precog<br/>Model Routing]
    end

    subgraph "Infrastructure Layer"
        Nexus[🌐 Nexus<br/>API & Events]
        Core[⚙️ Core<br/>Shared Utilities]
    end

    subgraph "Quality Layer"
        QA[🛡️ QA<br/>Guardian System]
    end

    subgraph "Shared"
        Shared[📦 Shared<br/>EventBus & Registry]
    end

    Cortex --> Precog
    Cortex --> Shared
    Precog --> Shared
    Nexus --> Cortex
    Nexus --> Precog
    Nexus --> Shared
    QA --> Shared
    Core --> Shared
```

## Module Summary

| Module | Files | Outgoing Dependencies |
|--------|-------|----------------------|
| `@google` | 1 | 0 |
| `axios` | 1 | 0 |
| `better-sqlite3` | 1 | 0 |
| `body-parser` | 1 | 0 |
| `cheerio` | 1 | 0 |
| `chokidar` | 1 | 0 |
| `cli` | 5 | 16 |
| `commander` | 1 | 0 |
| `core` | 14 | 30 |
| `cors` | 1 | 0 |
| `cortex` | 38 | 131 |
| `dotenv` | 2 | 0 |
| `express` | 1 | 0 |
| `fs-extra` | 1 | 0 |
| `glob` | 1 | 0 |
| `js-yaml` | 1 | 0 |
| `main.ts` | 1 | 12 |
| `multer` | 1 | 0 |
| `nexus` | 29 | 136 |
| `node-fetch` | 1 | 0 |
| `openai` | 1 | 0 |
| `playwright` | 1 | 0 |
| `precog` | 23 | 69 |
| `promises` | 1 | 0 |
| `qa` | 13 | 62 |
| `root` | 11 | 0 |
| `shared` | 4 | 6 |
| `sharp` | 1 | 0 |
| `socket.io` | 1 | 0 |
| `typescript` | 1 | 0 |
| `uuid` | 1 | 0 |
| `zod` | 1 | 0 |


## Module Responsibilities

| Module | Role | Key Components |
|--------|------|----------------|
| **Cortex** | The "Manager" | Intent detection, Memory, Planning, Motor control |
| **Precog** | The "Strategist" | Model routing, Training data, Synthesis |
| **Nexus** | The "Backbone" | API server, WebSocket, Routes, Versioning |
| **Core** | Shared Utilities | Config, Module Registry, Architecture Analyzer |
| **Shared** | Communication | EventBus, System Info |
| **QA** | Quality Guardian | Hygiene checks, Wiring verification |

## Dependency Rules

1. **No Circular Dependencies** - Modules must not create circular imports
2. **Shared is Leaf** - `@shared/*` should only be imported, never import from other modules
3. **Layered Access** - Higher layers (Cortex, Precog) can import from lower (Nexus, Core)

## Violations Report

⚠️ **3 violations detected** - See `dependency-graph.json` for details

## Key Integration Points (V3.3.449)

### API Contract Enforcement
The system enforces API contracts at runtime via middleware:

- **Location**: `src/nexus/middleware/contract-enforcer.ts`
- **Contracts**: `src/qa/contracts-generated.ts` (271 schemas)
- **Features**:
  - Full Zod schema validation for requests/responses
  - Metrics tracking (validatedRequests, schemaViolations, unknownRoutes)
  - Event emission to QA Guardian for automated fixing
  - Configurable enforcement levels (strict/development mode)

### QA Guardian Integration
The autonomous fixer now has direct access to API contracts:

- **Location**: `src/qa/agent/autonomous-fixer.ts`
- **Capabilities**:
  - Analyze schema violations and propose fixes
  - Generate type-safe fix suggestions
  - Track violations as issues for continuous improvement

### Environment Hub (ACTIVE - Not Orphaned)
**Note**: The dependency graph analyzer incorrectly marks `environment-hub.ts` as orphaned.
It is actively used in `main.ts` for component registration:

```typescript
// From main.ts
import environmentHub from './core/environment-hub.js';
environmentHub.registerComponent('cortex', cortex, ['intent', 'memory', 'planning', 'motor']);
environmentHub.registerComponent('precog', precog, ['routing', 'synthesis', 'providers']);
```

### Circular Dependency Resolution
Previously identified circular dependencies have been resolved:

1. **Sandbox Manager ↔ Docker Sandbox**: Resolved via `src/core/sandbox/types.ts` which extracts the `ISandbox` interface
2. **Visual Cortex → Cortex Index**: Uses dynamic `import()` to break the cycle

### Workstation UI (V3.3.455)
The unified development interface provides 4-panel productivity:

- **Location**: `src/web-app/src/skin/views/Workstation.jsx`
- **Access**: Press `W` key or click "Workstation" in sidebar
- **Panels**:
  1. **TaskBoard** - Active/pending/completed tasks (`/api/v1/tasks/list`)
  2. **Chat** - TooLoo conversation (`/api/v1/chat`)
  3. **Context** - Active file, session, knowledge (`/api/v1/context/current`)
  4. **Artifacts** - Generated code, docs, tests (`/api/v1/artifacts/list`)
- **Features**:
  - 4-panel grid layout (responsive)
  - Real-time API polling with hooks
  - Framer Motion animations
  - Integrated with LiquidShell UI system

---

*Generated by `scripts/generate-arch-graph.ts`*
