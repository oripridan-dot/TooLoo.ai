# UI Placeholder Audit — TooLoo.ai
Generated: 2025-11-04

Scope: Repo-wide scan for UI placeholders and mock data patterns (placeholder, "placeholder demo", mock, TODO placeholders).

Summary:
- Matches found: 142 (scanned for "placeholder" and related markers)
- Common categories:
  - Input/textarea placeholders in web UI (prompts, help text)
  - Documentation or setup files containing placeholder tokens (GITHUB_TOKEN, .env examples)
  - UI demo pages and components with "YOUR PROMPT HERE" or similar
  - Code comments that indicate placeholder/demo implementations

Top files (sample)
- `web-app/control-room-redesigned.html` — form placeholders and provider-burst demo (uses live endpoints already)
- `web-app/*` — many chat pages with input placeholders (expected and OK for UX)
- `packages/web/src/components/*` — React/TSX placeholders for prompts (UX-level)
- `SETUP_GITHUB_POSTGRESQL.md`, `GITHUB_INTEGRATION_SETUP.md`, `OUTSOURCE_CONNECTIONS_*` — placeholder GitHub tokens in docs and .env examples (action required)
- `engines/*`, `server/*`, `lib/*` — several comments referencing placeholder implementations (e.g., Figma API, screenshot logic)

Actionable findings and recommendations

1) UX placeholders (forms, input hints)
- Status: INTENTIONAL
- Files: `web-app/*`, `packages/web/src/*`, `tooloo-embedded-ui.html`, etc.
- Action: No change required — these are user-facing input hints. Ensure they remain meaningful and consistent.

2) Placeholder tokens in docs and .env examples
- Status: HIGH PRIORITY (security/ops friction)
- Files: `SETUP_GITHUB_POSTGRESQL.md`, `GITHUB_INTEGRATION_SETUP.md`, `OUTSOURCE_CONNECTIONS_*`, `GITHUB_INTEGRATION_DEPLOYED.md`
- Action: Replace placeholders with clear instructions for obtaining real tokens. Add a checklist in README and a script to verify required env vars are set. Consider marking repo status in CI if placeholders remain.

3) Code-level placeholders and stubs
- Status: MEDIUM priority
- Files: `lib/domains/*` (some implemented), `engines/*`, `servers/*` (Figma import stub), `engine/*` (placeholder generators)
- Action: Triage: create issues for each stub that represents production functionality (fact-checking, sandbox, Figma import, screenshot logic). Many of these are already implemented (fact-check, code sandbox) — mark done where applicable.

4) Demo images and background assets with placeholder art
- Status: LOW priority
- Files: `packages/web/src/assets/*-bg.png` (data URIs)
- Action: Optional — replace with branded assets for production.

Next steps (recommended)
1. Replace placeholder tokens in docs and .env examples with actionable steps and small scripts (deadline: 1 day).
2. Create GitHub issues for any remaining code stubs that need production implementation (Figma, screenshot service, advanced generators). Tag owners and priority.
3. Add a simple CI check that fails if required env vars are missing or still contain the literal substring `placeholder`.
4. Move UX placeholders audit to a living checklist and close items that are intentional.

Appendix — Selected matches (partial)
- `SETUP_GITHUB_POSTGRESQL.md` — GITHUB_TOKEN=ghp_placeholder_your_token_here
- `web-app/control-room-redesigned.html` — provider burst placeholder/demo handled via `/api/v1/providers/burst`
- `web-app/providers-arena.html` — textarea placeholder "Ask me anything..."
- `web-app/outcomes-dashboard.html` — api-host placeholder `http://localhost:3001`
- `packages/web/src/components/MissionControl.tsx` — placeholder="YOUR PROMPT HERE..."

If you want, I can now:
- Create the GitHub issue files for the remaining code stubs and for the env/token replacements.
- Add a CI check script to detect `placeholder` in critical config files.
- Replace doc placeholders with templated instructions and a `.env.example` that contains `REPLACE_ME` markers instead of `placeholder`.

Which of the above should I execute now?