Title: Replace placeholder tokens in docs and .env examples

Description:
Several documentation files and example .env entries use literal placeholder tokens like `ghp_placeholder_your_token_here`. This causes confusion and can lead to accidental commits with placeholder tokens or improperly configured deployments.

Files affected (examples):
- `SETUP_GITHUB_POSTGRESQL.md`
- `GITHUB_INTEGRATION_SETUP.md`
- `OUTSOURCE_CONNECTIONS_*` files
- `GITHUB_INTEGRATION_DEPLOYED.md`

Acceptance criteria:
- Replace literal placeholder tokens with `REPLACE_ME` or clearly documented instructions.
- Add a `.env.example` with `REPLACE_ME` markers and a short `README` snippet on how to obtain tokens.
- Add a CI check (simple script) that fails the pipeline if any tracked docs or `.env.example` include the word `placeholder` or `ghp_placeholder`.
- Update README with a "Setup" section that references the `.env.example` and environment setup steps.

Priority: High
Assignee: TBD
Labels: infra, docs, critical
