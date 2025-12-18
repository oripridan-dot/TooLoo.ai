# Infra & Environments

## Environments
- dev, staging, prod. Use Terraform/Pulumi stacks per env.
- Access via GitHub OIDC; avoid static cloud keys.

## Layout (proposed)
- `infra/terraform/` or `infra/pulumi/` with per-env configs.
- State stored remotely (e.g., Terraform Cloud or cloud backend).

## Services (initial)
- App/API hosting (containerized) with sandbox capability.
- Optional vector/db backend for memory (start in-memory).
- Observability: logs/metrics endpoint (OTLP optional).

## Bootstrap
- Run `scripts/bootstrap.ts` to seed Genesis Node, start sandbox, run GapFinder.
- Use `.env` for secrets; keep `.env.example` updated.

## Secrets & Config
- `.env.example` lists required keys. Do not commit real secrets.
- Per-env secrets stored in GitHub Actions secrets or cloud secret manager.

## CI/CD
- Workflows: `validate-build`, `test-validation-engine`; add nightly full suite.
- Protect `main`; require green checks before merge.

## Rollback
- Simulator produces rollback plans; deployment should support rolling deploy and quick rollback per env.
