# Implementation Plan: Full Code Execution Capability

**Date**: November 27, 2025
**Target System**: TooLoo.ai (Synapsys Architecture)
**Goal**: Enable secure, monitored, and robust execution of arbitrary code tasks.

---

## Executive Summary

To transform TooLoo.ai into a system capable of fully executing code-based tasks, we must move beyond simple file manipulation and shell commands to a **secure, sandboxed execution environment**. This requires a new "Execution Layer" that sits between the Cognitive Core (Cortex) and the Interface Layer (Nexus), supported by robust monitoring and artifact tracking.

## Phase 1: Secure Execution Environment (The Sandbox) 🛡️

**Objective**: Create a safe place to run untrusted or generated code without risking the host system.

### 1.1 Containerization Strategy
*   **Technology**: Docker (via `dockerode` or direct CLI).
*   **Design**:
    *   **Ephemeral Containers**: Spin up a fresh container for each task or session.
    *   **Base Image**: A custom `tooloo-runner` image with pre-installed tools (Node.js, Python, git, etc.).
    *   **Volume Mounting**: Mount a specific `temp/workspace/{taskId}` directory to the container, preventing access to the host's root filesystem.

### 1.2 `SandboxManager` Module
*   **Location**: `src/core/sandbox/sandbox-manager.ts`
*   **Responsibilities**:
    *   Lifecycle management (start, stop, restart containers).
    *   Command execution (executing shell commands inside the container).
    *   File transfer (copying files in/out of the container).
    *   Resource limits (CPU, Memory caps).

```typescript
interface Sandbox {
  id: string;
  start(): Promise<void>;
  exec(command: string): Promise<ExecutionResult>;
  stop(): Promise<void>;
}
```

## Phase 2: Comprehensive API & Tooling 🛠️

**Objective**: Standardize how the AI interacts with the system and external tools.

### 2.1 Tool Definition Standard
*   **Location**: `src/shared/tools/`
*   **Structure**:
    *   Define a `Tool` interface (name, description, schema, execute function).
    *   Migrate existing "capabilities" to this standard.

### 2.2 Internal SDK
*   **Location**: `src/sdk/`
*   **Purpose**: A unified library for code running *inside* the sandbox to interact with TooLoo.ai services (if authorized).
*   **Modules**:
    *   `tooloo.llm`: Access to Precog for generation.
    *   `tooloo.storage`: Access to Artifact Ledger.
    *   `tooloo.visual`: Access to Nano Banana Studio (future).

## Phase 3: Advanced Planning & Decomposition 🧠

**Objective**: Upgrade the Planner to handle complex, multi-step coding tasks.

### 3.1 Planner Upgrade (`src/cortex/planning/`)
*   **Enhancement**: Support "Code Execution" steps in the plan.
*   **Dependency Management**: Allow steps to depend on the output of previous steps (e.g., "Step 2 uses the file generated in Step 1").
*   **Error Recovery**: Integrate `Reflector` to analyze execution failures and propose plan modifications dynamically.

### 3.2 Feedback Loop
*   **Mechanism**:
    1.  Planner generates Plan.
    2.  Execution Engine runs Step 1.
    3.  **Success**: Proceed to Step 2.
    4.  **Failure**: Pause. Send error log to Reflector. Reflector generates "Fix Plan". Planner updates remaining steps. Resume.

## Phase 4: Execution Engine & Workflow ⚙️

**Objective**: The engine that drives the process, connecting Planner, Sandbox, and Ledger.

### 4.1 `ExecutionEngine`
*   **Location**: `src/nexus/engine/execution-engine.ts`
*   **Logic**:
    *   Receives a `Plan` from Cortex.
    *   Iterates through `PlanSteps`.
    *   For `command` or `code` steps, delegates to `SandboxManager`.
    *   Captures `stdout`/`stderr`.
    *   Registers outputs in `ArtifactLedger`.

### 4.2 Artifact Integration
*   **Integration**: Every file created, every script run, and every output generated is automatically registered in the `ArtifactLedger` with lineage (provenance).

## Phase 5: Monitoring & Security 🔒

**Objective**: Ensure visibility and control.

### 5.1 Real-time Monitoring
*   **Metrics**: CPU usage, Memory usage, Execution time.
*   **Logging**: Stream container logs to a central `TaskLog` in real-time.

### 5.2 Authentication & Authorization
*   **API Keys**: Enforce API key usage for all external requests to the Execution Engine.
*   **Policies**: Define what a sandbox *cannot* do (e.g., no network access to internal IPs, blocked sensitive env vars).

## Implementation Roadmap

| Phase | Task | Estimated Effort | Dependencies |
| :--- | :--- | :--- | :--- |
| **1** | Setup Docker & `SandboxManager` | 3 Days | Docker installed on host |
| **2** | Define Tool Standard & SDK | 2 Days | Phase 1 |
| **3** | Upgrade Planner & Reflector | 3 Days | Existing Cortex |
| **4** | Build `ExecutionEngine` | 4 Days | Phase 1, 3 |
| **5** | Security & Monitoring | 2 Days | Phase 4 |

## Immediate Next Steps

1.  **Verify Docker Availability**: Ensure the host environment supports Docker operations.
2.  **Prototype Sandbox**: Create a simple script to spin up a container and run `echo "hello world"`.
3.  **Draft SDK Interface**: Define the TypeScript interfaces for the internal SDK.
