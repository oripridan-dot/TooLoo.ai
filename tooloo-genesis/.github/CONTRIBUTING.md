# Contributing to TooLoo.ai - Genesis

## Philosophy
Validation-first, simulation-before-execution, reflection-after-completion. If you can’t validate it, don’t build it.

## Ground Rules
- Every function begins with validation.
- Simulate before production execution; require confidence ≥ 0.9.
- Track iterations and update the memory network for successes, failures, and errors.
- UI changes must be Gestalt-compliant (tokens only, no hard-coded spacing/colors) and include Gestalt tests.
- Use branded IDs from `@tooloo/types`; no `any`.

## Workflow
1. Fork/branch from `main` (protected).
2. Add/align specs first (docs or inline) and validation schemas.
3. Implement with validators + simulations + iteration tracking.
4. Add/extend tests: unit, validation, Gestalt (UI), integration.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm test` (or filtered) before PR.
6. Keep commits small; follow commit format.

## Commit Messages
Format: `type(scope): description`
- `feat`, `fix`, `validate`, `gestalt`, `memory`, `reflect`, `chore`, `docs`.
Example: `validate(validation): add business-logic validator edge cases`

## PR Checklist
- [ ] Validation schema in place
- [ ] Validators wired
- [ ] Simulation/rollback path defined (if applicable)
- [ ] Iteration tracking calls added
- [ ] Memory updates on key outcomes
- [ ] Tests added/updated (unit/validation/gestalt/integration)
- [ ] No hard-coded spacing/colors; tokens used
- [ ] Imports are ESM with `.js` extensions

## Code Style
- ESM only; include `.js` extensions in local imports.
- Prefer functional clarity over cleverness.
- Typed errors over `any`.
- No synchronous file I/O in critical paths.

## Testing
- Use pnpm workspaces; run package-scoped tests via `pnpm --filter <pkg> test`.
- Gestalt tests must assert zero violations.
- Validation tests must cover failure modes with suggestions.

## Security & Secrets
- No secrets in code. Use env vars and `.env.example` for placeholders.
- Prefer OIDC to cloud over static keys. Scope secrets per environment.

## Questions
Open an issue with the tag `question` and include:
- Context, desired outcome, validation plan, proposed simulation.
