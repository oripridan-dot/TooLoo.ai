# Architecture

## System Overview
- **ADE Loop**: Intent → Validation Plan → Simulation → Execution → Verification → Reflection → Memory.
- **Layers**: UI (apps/studio) → API (apps/api) → Kernel/Engines (packages/validation, packages/team) → Memory (packages/memory) → Knowledge (packages/knowledge) → Design System (packages/gestalt) → Types (packages/types).
- **Data Flow**: Requests validated at edges, simulated in sandbox, executed with rollback plans, tracked via iteration-tracker, outcomes recorded in memory network, surfaced to UI.

## Trust Boundaries
- External providers (LLMs, vector stores) accessed via adapters; all inputs validated by `@tooloo/validation` schemas.
- Sandbox isolates simulations; no direct prod mutations without passing confidence threshold.
- API enforces schema + auth middleware; UI only consumes validated events.

## Module Map
- **@tooloo/types**: Branded IDs, validation/result types, typed errors.
- **@tooloo/validation**: createValidator, simulator, rollback, iteration-tracker, validator registry.
- **@tooloo/memory**: Memory nodes, fungal links, temporal tracking, query/enrichment.
- **@tooloo/gestalt**: Gestalt principles, tokens, validators, UI primitives.
- **@tooloo/team**: Agents (planner/executor/critic/gap-finder/reflector), pod runtime, OODA loop.
- **@tooloo/knowledge**: search/validate/cite.
- **apps/studio**: Cognitive UI (canvas, validation status, iteration timeline).
- **apps/api**: REST/socket routes to orchestrate ADE loop and stream validation events.

## Build/Runtime
- ESM-only, `.js` extensions in imports.
- pnpm workspaces + turbo orchestrates lint/typecheck/test.
- TypeScript project refs per package; each emits declarations (composite builds).

## Validation & Simulation Guardrails
- Every entry function starts with schema validation.
- Simulations run in sandbox; require confidence ≥ 0.9 before execution.
- Rollback plans produced by simulator; execution gated by validation + simulation.

## Observability
- Structured logs; hooks for metrics (execution time, resource usage, side effects) from simulator.
- Iteration tracker records successes/failures/errors to memory network.

## Extensibility
- Pluggable memory provider (start in-memory, later vector/db).
- Pluggable validators (syntax/type/security/perf/business/gestalt).
- Agent tools registry to add providers safely.
