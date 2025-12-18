# Validation Engine

## Core Pieces
- `createValidator`: schema-first validation with validator registry (syntax/type/security/perf/business/gestalt).
- `simulator`: sandboxed execution with metrics, side-effect capture, rollback plan, confidence score.
- `rollback`: strategies derived from simulator state; executed on failure.
- `iteration-tracker`: records phase, duration, outcomes to memory network.

## Flow
1) Validate input (zod schema + validators).
2) If pass, simulate in sandbox with timeout.
3) Require confidence ≥ 0.9; else refine.
4) Execute with rollback plan ready.
5) Record iteration success/failure/error to memory.

## Validators
- Syntax: parse/static checks.
- Type: static + runtime shape conformance.
- Security: dependency/pattern scanning, unsafe ops detection.
- Performance: simple heuristics/time/alloc checks.
- Business-logic: domain constraints.
- Gestalt: UI structural checks.

## Contracts
- `ValidationResult<T>`: { passed, data?: T, failures?: ValidationFailure[] }.
- `ValidationFailure`: validator, message, path, severity, fixable, suggestedFix.
- Validators are async; return fix suggestions where possible.

## Simulation
- Config: setup, teardown, timeout.
- Metrics: executionTime, resourceUsage, sideEffects; confidence derived from metrics.
- Produces rollbackPlan; sandbox destroyed after run.

## Iteration Tracking
- `trackIteration(taskName)`: records phase, duration; supports recordSuccess/failure/error.
- All records update memory network with metrics and serialized errors.

## Extensibility
- Add validators to registry; compose in `createValidator`.
- Swap sandbox implementation; maintain same interface.
