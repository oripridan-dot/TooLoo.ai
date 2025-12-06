# API Contracts: Implementation Strategy & Benefits

## 🎯 Overview
This document outlines the strategy for leveraging API Contracts across the four pillars of Synapsys (Cortex, Nexus, Precog, QA). By treating contracts as the "Source of Truth," we enable rapid evolution, automated validation, and smarter AI agents.

---

## 🧠 Cortex (The Brain)
**Benefit:** *Hallucination Prevention & Tool Discovery*

### Strategy
1.  **Dynamic Tool Registry:** Instead of hardcoding tools for agents, Cortex will load `API_CONTRACTS` at runtime.
    *   **Implementation:** Create a `ContractToolProvider` that converts contracts into the tool format expected by the LLM (e.g., OpenAI function definitions).
    *   **Result:** When you add a new endpoint to Nexus, the AI agent *immediately* knows how to use it without code changes.
2.  **Intent Matching:** When a user asks "Check system health," Cortex searches the `intent` field in contracts to find the matching endpoint (`GET /api/v1/system/status`).
3.  **Parameter Validation:** Before calling a tool, Cortex uses the contract's `parameters` schema to validate its own generated arguments, catching errors *before* making the network call.

---

## 🔗 Nexus (The Body)
**Benefit:** *Type Safety & Runtime Enforcement*

### Strategy
1.  **Contract Enforcer Middleware (Implemented):**
    *   Intercepts every request.
    *   Matches against `API_CONTRACTS`.
    *   **Enhancement:** Add body/query validation using the `parameters` metadata. If a required parameter is missing, reject with 400 Bad Request automatically.
2.  **Documentation Generation:**
    *   Use contracts to auto-generate `openapi.json` (Swagger).
    *   This keeps API documentation 100% in sync with code.
3.  **Deprecation Warnings:**
    *   If a route is marked `deprecated: true` in the contract, add a `Warning` header to the response automatically.

---

## 🔮 Precog (The Future)
**Benefit:** *Anomaly Detection & Traffic Prediction*

### Strategy
1.  **Baseline Modeling:** Precog uses contracts to understand "normal" behavior.
    *   *Example:* `POST /api/v1/chat/message` is expected to be high-volume. `DELETE /api/v1/system/reset` is expected to be near-zero.
2.  **Violation Detection:**
    *   Precog monitors the `ContractEnforcer` logs.
    *   A spike in "Contract Violations" (requests to unknown endpoints) indicates a potential attack or a client-side bug.
3.  **Cost Prediction:**
    *   Associate "Cost Tokens" with contracts (e.g., `generate` endpoints = high cost).
    *   Precog predicts future API costs based on contract usage trends.

---

## 🛡️ QA (The Immune System)
**Benefit:** *Automated Testing & Fuzzing*

### Strategy
1.  **Wire Verifier (Enhanced):**
    *   Already implemented: Checks if code matches contracts.
2.  **Auto-Fuzzer:**
    *   QA Agent reads the contract for `POST /api/v1/data`.
    *   It sees `parameters: [{ name: 'age', type: 'number' }]`.
    *   It automatically generates test cases: `age: -1`, `age: "string"`, `age: 99999`.
    *   It fires these at the endpoint to ensure it handles errors gracefully.
3.  **Breaking Change Detection:**
    *   When a PR is opened, QA compares the *new* generated contracts against the *main* branch.
    *   If a contract was removed or parameters changed incompatibly, it blocks the merge.

---

## 🚀 Roadmap

| Phase | System | Action | Status |
| :--- | :--- | :--- | :--- |
| **1** | **Nexus** | **Hard-wire Contracts (Middleware)** | ✅ Complete |
| **1** | **QA** | **Update Wire Verifier** | ✅ Complete |
| **1** | **All** | **Enhance Generator (Metadata)** | ✅ Complete |
| 2 | Cortex | Implement `ContractToolProvider` | ⏳ Pending |
| 2 | Nexus | Add Runtime Parameter Validation | ⏳ Pending |
| 3 | QA | Build Auto-Fuzzer | ⏳ Pending |
| 3 | Precog | Implement Anomaly Detection | ⏳ Pending |
