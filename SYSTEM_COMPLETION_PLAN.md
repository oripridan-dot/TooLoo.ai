# Synapsys Architecture: System Completion & Verification Plan

**Date**: November 26, 2025
**Target Version**: v2.1.340
**Objective**: Address user concerns regarding incomplete Synapsys commits and ensure all architectural promises are fully implemented.

---

## 1. Audit Findings: The "Incomplete" Reality

A deep code inspection confirms your suspicion. While the *structure* of Synapsys is in place, several key components—specifically in the **Training** and **Memory** modules—rely on "TODOs" and mock data rather than full implementations.

### 🔴 Critical Gaps (Must Fix)

| Module | Component | Issue | Impact |
| :--- | :--- | :--- | :--- |
| **Precog** | `ProvidersArena` | **Fake Data**: `GET /events` returns hardcoded mock events. | The "Arena" dashboard shows fake history. |
| **Precog** | `ProvidersArena` | **No Persistence**: `POST /events` has a `TODO` to save data but does nothing. | All training/comparison data is lost on restart. |
| **Precog** | `ProvidersArena` | **No Real-time Updates**: `TODO: Broadcast to connected WebSocket clients` is unimplemented. | The UI won't update live when comparisons happen. |
| **Precog** | `ProvidersArena` | **Missing History**: `GET /history` returns an empty array with a "to be implemented" message. | User query history is not tracked. |

### 🟡 Architectural Limitations (Acceptable for V2.1)

| Module | Component | Status | Note |
| :--- | :--- | :--- | :--- |
| **Cortex** | `VectorStore` | **Simple Persistence**: Uses a JSON file (`data/memory/vectors.json`) instead of a DB. | Functional for personal use, but will slow down after ~5,000 memories. |
| **Nexus** | `SocketServer` | **Race Condition**: Fixed in v2.1.333 (Timeout reduction), but needs E2E verification. | The fix is code-complete but needs validation. |

---

## 2. Implementation Roadmap

We will execute this plan in 3 phases to reach 100% "Synapsys Complete" status.

### Phase 1: The "Real Data" Upgrade (Priority: HIGH)
*Goal: Remove all mocks and enable true persistence for the Providers Arena.*

1.  **Create `ArenaStore` Class**:
    *   Implement a file-based store (similar to `VectorStore`) in `src/precog/training/arena-store.ts`.
    *   Persist events to `data/training/arena-events.json`.
2.  **Update `providers-arena-server.ts`**:
    *   Replace `mockEvents` in `GET /events` with `ArenaStore.getRecent()`.
    *   Implement `ArenaStore.add()` in `POST /events`.
    *   Implement `ArenaStore.getHistory()` in `GET /history`.

### Phase 2: Real-Time Synapse (Priority: MEDIUM)
*Goal: Connect the Training module to the Nexus socket system.*

1.  **Bridge Event Bus**:
    *   In `providers-arena-server.ts`, import the global `EventBus`.
    *   Publish `arena:event` events when new comparisons/queries occur.
2.  **Socket Forwarding**:
    *   Update `src/nexus/socket.ts` to listen for `arena:event`.
    *   Emit these events to connected frontend clients via `socket.emit('arena:update', ...)`.

### Phase 3: Full System Verification (Priority: HIGH)
*Goal: Prove it works with the new Integration Test Suite.*

1.  **Environment Prep**:
    *   Ensure Port 4000 is free (kill zombie processes).
    *   Clear `data/training/*.json` to start fresh.
2.  **Run Integration Suite**:
    *   Execute `scripts/integration-test-suite.ts`.
    *   **New Test Case**: Add a test to verify that an Arena query persists to disk and survives a restart.

---

## 3. Execution Strategy

I am ready to begin **Phase 1** immediately.

**Step 1**: Create `src/precog/training/arena-store.ts`.
**Step 2**: Refactor `src/precog/training/providers-arena-server.ts` to use it.
**Step 3**: Verify persistence by running a manual query and checking the JSON file.

*Shall I proceed with Step 1?*
