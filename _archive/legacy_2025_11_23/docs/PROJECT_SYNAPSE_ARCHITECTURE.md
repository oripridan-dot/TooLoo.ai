# Project Synapse: Architectural Blueprint

## Executive Summary
Project Synapse represents a complete reimagining of the TooLoo.ai platform. Moving away from the reactive, multi-server orchestration model, Synapse is designed as a **proactive, self-evolving cognitive system**.

**Core Philosophy**: From Orchestration to Symbiosis.
**Target State**: A single, cohesive Node.js monorepo with emergent capabilities.

---

## 1. The Trinity Architecture

The system is divided into three interconnected pillars, replacing the old flat list of servers.

### Pillar 1: The Cortex (Cognitive Core)
*Replaces: Orchestrator, Capabilities Server, Reports Server*
The central nervous system. It maintains a live graph of the system's own code and capabilities.
- **`src/cortex/system-model`**: Real-time graph of all available modules and services.
- **`src/cortex/intent-parser`**: Translates high-level user goals into execution plans.
- **`src/cortex/metaprogrammer`**: The self-modification engine. Writes code, tests, and commits changes.

### Pillar 2: The Precog (Predictive Intelligence Fabric)
*Replaces: Training Server, Budget Server, Provider Cup*
The intuition layer. It manages resources and synthesizes new capabilities on the fly.
- **`src/precog/oracle`**: Predictive resource management (pre-warming providers based on probability).
- **`src/precog/synthesizer`**: Combines models (e.g., GPT-4o + Claude Haiku) into transient "super-capabilities".
- **`src/precog/market`**: Real-time provider arbitrage and performance tracking.

### Pillar 3: The Nexus (Symbiotic Workspace)
*Replaces: Web Server, Coach Server, Segmentation Server, Product Development*
The interface layer. It adapts to the user and co-creates the product.
- **`src/nexus/trait-weaver`**: Learns the user's coding style and preferences.
- **`src/nexus/auto-architect`**: Real-time pair programmer that scaffolds code as you type.
- **`src/nexus/interface`**: The API gateway and UI serving layer.

---

## 2. Proposed Directory Structure (Clean Slate)

```text
/project-synapse
├── .github/                 # GitHub Actions & Workflows
├── config/                  # Environment & System Config
├── docs/                    # Self-generated documentation
├── scripts/                 # CLI tools & maintenance scripts
├── src/
│   ├── core/                # Shared utilities & types
│   │   ├── bus/             # Event Bus (Inter-pillar communication)
│   │   └── memory/          # Vector store & short-term memory
│   ├── cortex/              # Pillar 1: Cognitive Core
│   ├── precog/              # Pillar 2: Predictive Intelligence
│   └── nexus/               # Pillar 3: Symbiotic Workspace
├── tests/                   # System-wide integration tests
├── package.json
└── README.md
```

---

## 3. Technology Stack Refinement

- **Runtime**: Node.js (Latest LTS)
- **Language**: TypeScript (Strict Mode) - *Recommended for the new architecture to ensure type safety in self-modifying code.*
- **Communication**: Internal Event Bus (EventEmitter) instead of HTTP between local services.
- **Storage**: SQLite (for system model) + Vector DB (for memory).
- **Testing**: Vitest (faster than Jest).

---

## 4. Operation Bootstrap: Phase 1

1.  **Initialize**: Create the repository structure.
2.  **Introspect**: Run a script to analyze the *old* TooLoo.ai codebase and extract reusable logic (prompts, provider adapters).
3.  **Ignite**: Build the `cortex/system-model` to allow the system to "see" itself.
