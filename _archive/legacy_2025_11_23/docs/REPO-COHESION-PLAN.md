# TooLoo.ai – Cohesion & Hygiene Plan

## 1. Current System Map
| Layer | Purpose | Primary Paths | Notes |
| --- | --- | --- | --- |
| Control Room Web Proxy | Entry point proxying UI + orchestration commands | `servers/web-server.js`, `web-app/control-room*.html` | Launches other services via `/system/start`.
| Service Orchestrator & Satellites | Coordinate product, training, budget, segmentation, reports etc. | `servers/orchestrator.js`, `servers/*-server.js` | Each server listens on fixed port 3000–3009 per Copilot brief.
| Core Engines | Domain logic for learning, segmentation, provider orchestration | `engine/*.js`, `engines/*.js`, `packages/engine/src/providers/*` | New defaults in `engine/llm-provider.js` and Claude provider align to Haiku 4.5 preview.
| Automation Scripts | CLI helpers for demos, branching, scoring, setup | `scripts/*.js`, `scripts/*.sh` | `scripts/branch-status.js` and `scripts/create-feature-branch.sh` enforce governance.
| UI Assets | Browser-facing dashboards & demos | `web-app/**`, `tooloo-*.html`, `embed-ui.js` | Multiple variants (`control-room-*.html`, AI analysis dashboards) share static assets.
| Knowledge & Docs | Playbooks, architecture, runbooks | `docs/**`, root-level briefs (`AI-CONSULTATION-*.md`, `README.md`) | Need consolidation; several duplicates with numbered suffixes.
| Data & Outputs | Generated caches, workflow snapshots, benchmarking reports | `data/**`, `datasets/**`, `output/**`, `releases/**` | Contains >1k cache files plus mp3/pdf/html artifacts currently staged.

## 2. Branching Focus Recommendation
- **Next branch:** `feature/control-room-hygiene`
  - **Objective:** Ship repository hygiene and automation so `scripts/create-feature-branch.sh` can run against a clean tree.
  - **Deliverables:**
    - Harden `.gitignore` to cover caches (`data/summaries-cache/**`), workflow backups, generated `output/**`, release zips, and transcripts.
    - Add cleanup CLI (`scripts/repo-hygiene.sh`) to nuke stale mp3/json/html dumps and rotate backups.
    - Document required data seeds vs. generated artifacts inside `docs/ARCHITECTURE-CORE.md`.
  - **Why now:** Without hygiene, branching scripts fail; large staged payload blocks future features.

## 3. Generated / Obsolete Assets to Purge or Relocate
| Category | Location | Action | Rationale |
| --- | --- | --- | --- |
| Summaries cache | `data/summaries-cache/*.json` | Delete & add to `.gitignore` | >1k transient files; rebuilt by summarizer.
| Workflow backups | `data/workflows/active-workflows.json.bak.*` | Delete & ignore `*.bak` in `data/workflows/` | Timestamped copies; cluttering history.
| Bench outputs | `output/*.json`, `output/*.mp3` | Delete & ignore `output/` | Export artifacts; keep only aggregate stats elsewhere.
| Release bundles | `releases/*.zip`, `extensions/chat-timeline/**/*.zip` | Move to GitHub Releases or S3; ignore locally | Binaries explode repo size; rebuildable.
| Legacy backups | `simple-api-server.js.bak*`, `control-room.html.old-backup`, `engine/*.bak` | Delete after verifying canonical versions | Redundant copies risk divergence.
| Dataset fixtures | `datasets/benchmarks/scripts/*.js` duplicates of `scripts/` | Consolidate under single tooling directory | Prevent drift between mirrored helpers.
| Root duplicates | Files with suffix ` (1).md` | Deduplicate content & remove copies | Likely manual backups.
| Provider logs | `server.log`, `smart-server.log`, `training-server.log`, `api.log` | Delete & add to `.gitignore` | Runtime logs, not source.

## 4. Cohesion Steps (Sequence)
1. **Baseline Hygiene (current branch):**
   - Remove staged generated assets listed above.
   - Update `.gitignore` with patterns for caches, outputs, logs, releases.
   - Document "authoritative vs. generated" matrix in `docs/ARCHITECTURE-CORE.md`.
2. **feature/control-room-hygiene:**
   - Implement cleanup CLI + README instructions.
   - Wire cleanup into `npm run clean` (or new `npm run hygiene`).
   - Ensure CI/branch scripts validate cleanliness before branch creation.
3. **feature/provider-insight-ui (future):**
   - Once tree stable, add real-time provider dashboard using `servers/budget-server.js` & `web-app/capabilities-dashboard.html` data.
4. **feature/training-benchmark-suite (future):**
   - Extract benchmark runner (`datasets/benchmarks/runner.js`) into repeatable test harness with snapshots stored under `tests/fixtures/`.

## 5. Immediate TODO Checklist
- [ ] Prune staged caches, outputs, logs, and `.bak` artifacts.
- [ ] Commit governance + provider updates already validated.
- [ ] Harden `.gitignore` and enforce via `scripts/branch-status.js`.
- [ ] Run `npm run branch:status` to confirm clean state pre-branch.
- [ ] Use `scripts/create-feature-branch.sh --product "control-room" --capability "hygiene" --scope "repo"` once clean.

This plan aligns the sprawling assets into a maintainable control-room-first platform, enabling disciplined branching without re-litigating generated data each cycle.
