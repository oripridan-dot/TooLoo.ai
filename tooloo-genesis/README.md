# TooLoo.ai - Genesis

Validation-first Autonomous Development Environment (ADE). Every action is validated, simulated, tracked, and learned from.

## Quickstart
1) `pnpm install`
2) `pnpm lint && pnpm typecheck && pnpm test`
3) Follow `docs/08-BUILD-SEQUENCE.md` day-by-day.

## Core Principles
- Validation before execution
- Simulation before production
- Iteration tracking for everything
- Memory updates on every outcome
- Gestalt-compliant UI (tokens only)

## Repo Layout (high level)
- `.cursorrules`, `.github/copilot-instructions.md` – AI guardrails
- `docs/` – philosophy, architecture, build sequence, systems
- `packages/` – types, validation, gestalt, memory, team, knowledge
- `apps/` – studio (UI), api (backend)
- `scripts/` – bootstrap, validation, build orchestration

### API endpoints (early)
- `POST /api/v2/knowledge/ingest` – body: knowledge document (id, title, content, tags?, source?, createdAt?)
- `POST /api/v2/knowledge/search` – body: `{ text, tags?, limit?, minConfidence? }`
- `GET /api/v2/knowledge/cite/:id?needle=` – returns snippet and passage

## Build Phases (summary)
- Phase 1: Foundation (types)
- Phase 2: Validation engine
- Phase 3: Memory network
- Phase 4: Team agents
- Phase 5: Cognitive UI
- Phase 6: Integration & ADE loop

## Governance
- See `CONTRIBUTING.md` for commit format and checklist.
- See `.cursorrules` and `.github/copilot-instructions.md` for validation-first rules.

## Golden Path (E2E)
1. Define request → validate schema
2. Simulate in sandbox → require confidence ≥ 0.9
3. Execute with rollback plan
4. Reflect + update memory network
5. UI shows green light when validated
