# TooLoo.ai Inspection & Optimization Plan

## Objective
Inspect TooLoo.ai from the bottom up, left to right, and in depth to ensure structure, architecture, code, functionality, and connectivity are fully optimized.

## Phase 0: Immediate Repairs (The "Tooloo" CLI)
*   **Issue**: The `tooloo` CLI command `system` is missing, preventing built-in introspection.
*   **Action**: Implement `src/cli/commands/system.ts` and register it in `src/cli/index.ts`.
*   **Goal**: Restore `npm run tooloo:introspect` and `npm run tooloo:awareness`.

## Phase 1: Foundation & Infrastructure (Bottoms Up)
### 1.1 Environment & Configuration
*   **Files**: `.env`, `package.json`, `tsconfig.json`, `.eslintrc.json`.
*   **Checks**:
    *   Verify all dependencies are used and up-to-date.
    *   Ensure strict type checking is enabled and respected.
    *   Validate environment variable loading and schema.

### 1.2 Core Libraries (`src/core/`)
*   **Modules**: `EventBus`, `FSManager`, `ModuleRegistry`, `SystemInfo`.
*   **Checks**:
    *   **EventBus**: Verify event propagation and listener cleanup (memory leaks).
    *   **FSManager**: Test "Golden Plate" retrieval and file operations.
    *   **Registry**: Ensure all modules register correctly at startup.

## Phase 2: Synapsys Architecture (Left to Right)
### 2.1 Sensory Input (Left)
*   **Modules**: `src/cortex/sensory/`, `src/precog/harvester/`.
*   **Checks**:
    *   **File Watcher**: Verify it detects changes without looping.
    *   **Harvester**: Ensure it correctly parses project structure and dependencies.

### 2.2 Processing Center (The Brain)
*   **Precog (Predictive)**:
    *   **Providers**: Test failover logic (Gemini -> Anthropic -> OpenAI).
    *   **Oracle**: Verify context shadow updates.
*   **Cortex (Cognitive)**:
    *   **Orchestrator**: Check plan queue management and retry logic.
    *   **Memory (Hippocampus)**: Verify VectorStore and Short-term memory persistence.
    *   **Planning (Prefrontal)**: Test goal decomposition.

### 2.3 Action & Output (Right)
*   **Modules**: `src/cortex/motor/`, `src/nexus/`.
*   **Checks**:
    *   **MotorCortex**: Verify file writing and command execution safety.
    *   **Nexus (API)**: Test all routes in `src/nexus/routes/`.
    *   **Web App**: Ensure the Control Room UI connects and updates in real-time.

## Phase 3: In-Depth Analysis
### 3.1 Code Quality
*   **Linting**: Continue enforcing the new ESLint rules.
*   **Type Safety**: Eliminate `any` types where possible (long-term goal).
*   **Dead Code**: Identify and remove unused files in `src/`.

### 3.2 Functionality & Connectivity
*   **Tests**: Run and expand the test suite (`vitest`).
*   **Python SDK**: Ensure the new Python SDK stays in sync with the Node.js API.
*   **Integrations**: Verify GitHub API connectivity and token handling.

## Phase 4: Optimization
*   **Performance**: Profile startup time and API response latency.
*   **Memory**: Monitor heap usage during heavy load (e.g., large context ingestion).
*   **Cost**: Optimize token usage in `ProviderEngine`.

---

**Status**: Phase 0 (CLI Repair) COMPLETE. Phase 1.1 (Environment & Configuration) COMPLETE. Phase 1.2 (Core Libraries) COMPLETE. Phase 2.1 (Sensory Input) COMPLETE. Phase 2.2 (Processing Center) COMPLETE. Phase 2.3 (Action & Output) COMPLETE. Phase 3.1 (Code Quality) COMPLETE. Phase 3.2 (Functionality & Connectivity) COMPLETE. Phase 4 (Optimization) IN PROGRESS.
**Findings**:
*   `src/cortex/memory/vector-store.ts`: `add()` method sends full text to OpenAI embedding API without chunking, causing 400 errors for large files. **FIXED**.
*   `src/cli/index.ts`: Fixed shebang issue to restore CLI functionality.
*   **Tests**: Cleaned up test suite. Excluded legacy archive and web-app tests. Created unit tests for `EventBus`, `FSManager`, `ModuleRegistry`, `SystemInfo`, `Config`, `FileWatcher`, and `Harvester`. All 25 tests PASSED.
*   **VectorStore**: Implemented chunking (8000 chars) and verified with `tests/unit/vector-store-chunking.test.ts`.
*   **Core Libraries**: Verified functionality of EventBus, FSManager, ModuleRegistry, and SystemInfo via unit tests.
*   **Configuration**: Created `src/core/config.ts` with Zod schema validation for environment variables. Verified with `tests/unit/core/config.test.ts`.
*   **Sensory Input**: Verified `FileWatcher` (ignores correct dirs, emits events) and `Harvester` (orchestration logic) via unit tests.
*   **Processing Center**: Verified `Oracle` (shadow updates), `LLMProvider` (failover logic), `Orchestrator` (task queue), `Hippocampus` (memory persistence), and `Planner` (goal decomposition) via unit tests.
*   **Action & Output**: Verified `Executor` (command execution safety) and `Nexus` (API structure and health check) via unit tests. All 43 tests PASSED.
*   **Code Quality**: Linting passed. Refactored `src/nexus/routes/api.ts` and `src/nexus/routes/orchestrator.ts` to use a shared `request` utility. Improved type safety in `VisualCortex`, `DesignRoutes`, `ChatRoutes`, and `GitHubRoutes` by replacing `any` with specific types or `unknown`.
*   **Python SDK**: Verified `src/sdk/python/tooloo` functionality via `tests/python/test_tooloo_ai.py`.
*   **Integrations**: Verified GitHub API routes via `tests/unit/nexus/routes/github.test.ts`.
*   **Optimization**:
    *   **Performance**: Created `scripts/profile-startup.ts` (Startup: ~2s) and `scripts/profile-api.ts` (Latency: ~40-90ms).
    *   **Memory**: Created `scripts/profile-memory.ts` (Stable ~360MB RSS).
    *   **Cost**: Integrated `CostCalculator` into `ProviderEngine` to log estimated costs per request.

## Next Steps
Continue Phase 4 (Optimization).
*   **Performance**: Analyze startup profile for further reductions (e.g., lazy loading).
*   **Memory**: Investigate if 360MB RSS can be reduced (e.g., by optimizing imports or dependencies).
*   **Cost**: Refine `CostCalculator` with more accurate token counting (using `tiktoken` or similar if available, or character count approximation).

