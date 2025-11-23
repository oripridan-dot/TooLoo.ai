# TooLoo.ai Testing Strategy (v2.0)

This document outlines the new, comprehensive testing strategy for TooLoo.ai, moving towards a fully TypeScript-based, service-oriented testing architecture.

## 🎯 Goals
- **Speed**: Fast feedback loop for developers.
- **Reliability**: Tests that don't flake.
- **Coverage**: Full coverage of the 9 core services and their interactions.
- **Modernity**: Using Vitest and TypeScript.

## 🏗️ Architecture

### 1. Unit Tests (`tests/unit/`)
Focus on individual functions and classes within services. Mock all external dependencies.
- **Naming**: `*.test.ts`
- **Scope**: Single file/module.
- **Example**: `tests/unit/brain-service.test.ts`

### 2. Integration Tests (`tests/integration/`)
Focus on the interaction between services. Mock the network layer (`fetch`) but test the service logic that constructs requests and handles responses.
- **Naming**: `*.test.ts`
- **Scope**: Two or more services interacting.
- **Example**: `tests/integration/service-mesh.test.ts`

### 3. System Tests (`tests/system/`)
Focus on the orchestration and lifecycle of the entire system.
- **Naming**: `*.test.ts`
- **Scope**: Orchestrator, startup sequences, global configuration.
- **Example**: `tests/system/orchestrator.test.ts`

## 🚀 Running Tests

### Run the Fresh Suite
```bash
npm run test:fresh
```

### Run All Tests (Legacy + Fresh)
```bash
npm run test:all
```

## 📝 Writing New Tests

1.  **Identify the Service**: Look in `src/servers/`.
2.  **Create the Test File**: Create `tests/unit/<service-name>.test.ts`.
3.  **Mock Dependencies**: Use `vi.mock()` for `fs`, `fetch`, and other side effects.
4.  **Write Assertions**: Use `expect()` to verify behavior.

## 🔄 Migration Plan
We are gradually migrating from the legacy `.js` tests in `tests/` to this new structure.
- [x] Infrastructure Setup (Vitest + TS)
- [x] Orchestrator System Test
- [x] Service Mesh Integration Test
- [x] Brain Service Unit Test
- [ ] Hands Service Unit Test
- [ ] Eyes Service Unit Test
- [ ] ... (Remaining Services)

