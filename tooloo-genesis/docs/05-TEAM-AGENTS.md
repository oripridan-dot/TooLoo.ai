# Team Agents

## Roles
- **Planner**: decomposes tasks into validated steps; produces schemas/specs; no direct code.
- **Executor**: implements steps post-validation/simulation; respects confidence gates.
- **Critic/Validator**: quality checks (types, Gestalt, security, logic).
- **Gap Finder**: scans for missing specs/tests/Gestalt compliance.
- **Reflector**: turns logs into lessons and updates memory.

## Base Agent (OODA)
Observe → query memory for context
Orient → validate understanding; request clarification on gaps
Decide → plan + simulate; require confidence ≥ 0.9
Act → execute with rollback plan

## Pod Runtime
- Messaging/pub-sub between agents.
- Tool registry with validated access to providers.
- Sandbox-aware execution for simulations.

## Safety Rails
- All actions start with validation; simulations before execution.
- Memory updates on outcomes; iteration tracking mandatory.
- Low-confidence paths trigger refinement instead of execution.

## Extensibility
- Add tools with validator wrappers.
- New agent roles register with pod; adhere to OODA contract.
