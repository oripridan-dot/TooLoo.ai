# TooLoo.ai Architecture Assessment & Branch Plan

**Updated**: 2025-10-17

---

## Current Topology Snapshot

- **Servers** (`servers/`): Nine focused Node services (`web`, `training`, `meta`, `budget`, `coach`, `cup`, `product-development`, `segmentation`, `reports`, `capabilities`, `sources`) orchestrated by `servers/orchestrator.js`. Each service owns its own bootstrap logic, health routes, and provider adapters.
- **Simple API** (`simple-api-server.js`): 2.3k line legacy server bundling routing, provider selection, self-awareness control, filesystem access, and UI helpers inside a single file.
- **Packages** (`packages/`): Modularized code paths divided into `api`, `core`, `engine`, and `web`, but service code still references legacy single-file utilities instead of consuming these modules consistently.
- **Runtime Helpers** (`scripts/`, `apps/`, `engine/`, `lib/`, `environment-hub.js`): Launch scripts, benchmarking harnesses, and environment abstraction layers scattered across the root without a canonical entry point.
- **Memory & Knowledge Base** (`PROJECT_BRAIN.md`, `memory-system/`, `patterns/`, numerous design docs): Critical operating knowledge stored in many Markdown files with partial duplication and no indexing service.
- **Personal Projects & Artifacts** (`personal-projects/`, `product-genesis-*`, `sample-*`): Output of workshops and generation pipelines, often referenced by automation scripts but not versioned alongside code changes.

---

## Pain Points Limiting Maintainability & Performance

1. **Monolithic API Core** – `simple-api-server.js` owns routing, provider orchestration, and system automation directly. The class-level responsibilities (self-awareness, filesystem, UI generation) cannot be tested or tuned independently.
2. **Service Drift** – Each file under `servers/` duplicates server bootstrap code, provider wiring, and health checks. Fixes roll out unevenly and performance tuning requires touching many files.
3. **Shared Logic Fragmentation** – Business logic lives both under `packages/*` and as ad-hoc utilities at the repo root (`change-orchestrator.js`, `self-awareness-manager.js`, etc.). Imports hop across layers, increasing cold-start time and cognitive load.
4. **Configuration Scatter** – Environment assumptions sit inside scripts (`launch-tooloo.sh`), individual servers, and helpers. Rate limits, provider keys, and port bindings are hard-coded in multiple places.
5. **Documentation Bloat Without Indexing** – 70+ top-level Markdown files overlap in scope. Discoverability is low, and onboarding new AI agents requires manual curation.

---

## Feature Branch Streams (90-Day Roadmap)

### 1. `feature/api-core-decomposition`
- Extract HTTP routing, provider orchestration, and self-awareness adapters from `simple-api-server.js` into `packages/api/src` (controllers, services, adapters).
- Introduce a thin starter in `apps/simple-api/index.js` that composes these modules.
- Target: measurable reduction in bundle size, improved cold-start latency, unit-testable modules.

### 2. `feature/service-alignment`
- Create a shared `servers/common/` package: standard Express bootstrap, error middleware, health metrics, and provider registration.
- Update each service (`web`, `training`, `meta`, etc.) to import the shared bootstrap and declare only feature-specific handlers.
- Target: eliminate duplicated startup logic, reduce maintenance surface when changing logging/perf flags.

### 3. `feature/provider-runtime-tuning`
- Consolidate provider configuration in `packages/engine/providers/` with declarative capability tags (latency, cost, token window).
- Add adaptive throttling and request batching utilities consumed by both the decomposed API and orchestrator services.
- Target: consistent rate limiting, fewer hard-coded values, clearer fallbacks when providers fail.

### 4. `feature/memory-system-hardening`
- Build an indexed knowledge service inside `packages/core/memory/` that exposes read/write APIs over `PROJECT_BRAIN.md`, `patterns/*`, and decision logs.
- Surface a searchable index to the web Control Room (orchestrator + UI alignment) for faster context retrieval.
- Target: predictable agent onboarding, reduced duplication across Markdown artifacts.

Each branch is standalone and merges back into `main` per `docs/branching-strategy.md`. Schedule them sequentially to avoid high-risk, cross-branch merges.

---

## Target Directory Model (Post-Refactor)

```
apps/
	simple-api/
		index.js              # Thin HTTP bootstrap
		routes/               # Route modules (status, providers, filesystem, ui)
packages/
	api/
		src/
			controllers/
			services/
			adapters/
	core/
		logging/
		memory/
		config/
	engine/
		providers/
		orchestration/
servers/
	common/
		bootstrap.js
		metrics.js
	web-server.js           # Imports common bootstrap + feature handlers
	...
scripts/
	orchestration/
		launch.js
		health-check.js
docs/
	architecture/
		service-matrix.md
		provider-catalog.md
```

This structure keeps the single-user ethos intact (no new deployables) while creating clear seams for testing and performance work.

---

## Implementation & Validation Guide

- **Branch Workflow**: Follow `docs/branching-strategy.md` – rebase before PR, run `npm run branch:status`, include test evidence, and document rollback.
- **Testing Stack**: Baseline `npm run test` for unit coverage, targeted harnesses (`npm run test:segmenter`, `npm run test:patterns`) when touching AI-specific flows, plus `npm run dev` smoke tests for Control Room start-up integrity.
- **Performance Checks**: Record cold-start time, average provider latency, and memory footprint before/after each branch. Store metrics under `quality/benchmarks/<branch>.md` for traceability.
- **Documentation Updates**: For each merge, update `PROJECT_BRAIN.md`, `DECISIONS.log`, and extract reusable patterns into `patterns/`.

---

## Immediate Next Steps

1. Spin up `feature/api-core-decomposition`, audit `simple-api-server.js` responsibilities, and sketch module boundaries.
2. Draft the shared server bootstrap inside `servers/common/` to prove the alignment concept with one pilot service (recommend `servers/meta-server.js`).
3. Inventory provider configuration touchpoints and design the declarative schema for `packages/engine/providers`.
4. Outline the memory index API (read/write/list) and choose a lightweight search approach (e.g., keyword map + cached embeddings if offline storage permits).

Completing these steps establishes the scaffolding needed for iterative performance work without violating the project’s simplicity principles.

