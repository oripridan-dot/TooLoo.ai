# TooLoo.ai Diet & Efficiency Plan

This document tracks the execution of the "Size and Efficiency Diet" to streamline the development workflow and gain total control over the system.

## Phase 1: Assessment & Analysis (Clarity & Insight)
- [x] **Initial Workspace Audit**: Identified cluttered root directory and loose documentation.
- [x] **Documentation Consolidation**: Move loose Markdown files to `docs/`.
- [x] **Root Cleanup**: Move loose script files to `scripts/` or `tests/`.
- [x] **Codebase Audit**: Identify dead code and overlaps (Precog/Legacy).
    - **Findings**:
        - `src/nexus/engine` contained many legacy/unused files (`GitHubIntegrationEngine`, `SlackNotificationEngine`, etc.).
        - `src/web-app` is a hybrid of Legacy HTML/JS and a React App (used only by `visuals.html`).
        - `src/nexus/interface/web-server.ts` was unused legacy code.
    - **Actions Taken**:
        - Archived legacy engines to `_archive/legacy_engines/`.
        - Archived legacy Nexus files to `_archive/legacy_nexus/`.
        - Archived unused Web App prototypes to `_archive/web-app-prototypes/`.
        - Restored active HTML files (`index.html`, `visuals.html`, etc.) to `src/web-app/`.

## Phase 2: Solution Design & Implementation (Solid Foundation)
- [x] **Standardization**: Enforce `eslint` and `prettier`.
    - Created `.prettierrc`.
    - Updated `.eslintrc.json` to be strict and use Prettier.
- [x] **Dependency Management**: Audit `package.json` for unused packages.
    - Merged `src/web-app/package.json` into root `package.json`.
    - Removed unused deps (`nodemon`, `http-server`, `npm-run-all`).
    - Upgraded `vite` to v5 and migrated to Tailwind v4.
- [x] **Testing Structure**: Organize tests into a coherent structure. (Partially done by moving scripts, need to check `vitest` config).
- [x] **Frontend Migration**: Plan the migration of the Legacy Dashboard to the React App.
    - **Current State**: Unified. `index.html` now bootstraps the React App.
    - **Actions Taken**:
        - Created `src/web-app/src/components/Dashboard.jsx` (React version of legacy dashboard).
        - Created `src/web-app/src/components/ControlRoom.jsx` (React version of legacy control room).
        - Created `src/web-app/src/components/Projects.jsx` (React version of legacy projects page).
        - Updated `App.jsx` to route to all new components.
        - Updated `Sidebar.jsx` to include all navigation links.
        - Archived legacy `index.html`, `control-room.html`, and `projects.html` to `_archive/web-app/`.
        - Created new `index.html` that loads `src/main.jsx`.
    - **Next Step**: Phase 2b Complete. Proceed to Phase 3.

## Phase 3: Optimization & Refinement
- [x] **Performance Monitoring**: Verify `src/core/metrics-collector.ts` usage.
    - **Actions Taken**:
        - Verified `MetricsCollector` was underutilized.
        - Integrated `MetricsCollector` into `src/nexus/routes/observability.ts` (added `/metrics` endpoint).
        - Integrated `MetricsCollector` into `src/nexus/routes/system.ts` (updated `/introspect` endpoint).
- [x] **Cost Optimization**: Review provider usage.
    - **Actions Taken**:
        - Reviewed `src/precog/provider-engine.ts` and `src/precog/engine/cost-calculator.ts`.
        - Updated `ProviderEngine` to actively record workflow costs using `CostCalculator`.

## Phase 4: Continuous Improvement
- [x] **Automated Workflows**: Enhance CI/CD scripts.
    - **Actions Taken**:
        - Created `Dockerfile` for multi-stage build (Frontend + Backend).
        - Consolidated `ci.yml` and `ci-cd.yml` into `.github/workflows/main-pipeline.yml`.
        - Pipeline now includes: Lint, Test, Frontend Build, Security Audit, and Docker Build (on main).


---
*Last Updated: 2025-11-27*
