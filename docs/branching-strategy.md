# TooLoo.ai Branching Strategy

## 🎯 Purpose
Standardize how every capability graduates into a sellable product while keeping the network deployable, auditable, and performance-safe.

## 🌿 Branch Portfolio
| Branch | Purpose | Base | Naming | Merge Target |
| --- | --- | --- | --- | --- |
| `main` | Production truth; always releasable | — | n/a | — |
| `release/v{major}.{minor}` | Bundle of productised capabilities headed to market | `main` | `release/v1.7` | `main` (tagged) |
| `feature/{product}-{capability}` | Revenue-grade feature work (UI, orchestrator, services, docs) | `main` | `feature/provider-burst-coach` | `main` → release |
| `experiment/{hypothesis}` | Short-lived spikes to validate feasibility/perf | `main` or feature branch | `experiment/agentic-batching` | Promote into feature/* or delete |
| `hotfix/{ticket}` | Urgent production fix while release in flight | `main` | `hotfix/HF-142-provider-null` | `main` + cherry-pick to release |
| `docs/{topic}` | Documentation-only updates | `main` | `docs/branching-refresh` | `main` |

## 🔁 Product Feature Lifecycle
1. **Discover** – Capture the customer SKU and capability scope in Linear/Jira.
2. **Branch** – Create `feature/{product}-{capability}` from `main` using `scripts/create-feature-branch.sh`.
3. **Build** – Keep commits tight; include orchestrator/web/per-service changes plus benchmarks.
4. **Harden** – Run reliability + performance probes; attach artefacts to the PR.
5. **Promote** – Merge into `main`, then include in the next `release/v{major}.{minor}` bundle.
6. **Package** – Tag the release, update pricing collateral, and backfill docs.

## 🧪 Experiment Flow
Experiments stay isolated in `experiment/{hypothesis}`. Trial integrations that prove out become feature branches via `git checkout -b feature/... origin/main` once scope is clear. Close stale experiments weekly to prevent drift.

## ⚙️ CLI Support
- `npm run branch:status` – Prints current branch, working tree state, divergence from `origin/main`.
- `scripts/create-feature-branch.sh` – Generates compliant feature or experiment branch names (see below).
- `npm run clean` – Stops background services prior to switching branches.

### `create-feature-branch.sh` usage
```
./scripts/create-feature-branch.sh --product "control-room" --capability "burst-coach"
./scripts/create-feature-branch.sh --type experiment --hypothesis "routing-delta"
```

## 🔁 Standard Workflow
1. Sync: `git checkout main && git pull --ff-only`
2. Branch via script (feature or experiment)
3. Develop + commit (reference ticket IDs; keep commits under 200 LOC where possible)
4. Self-review with `npm run branch:status` and attach benchmark artefacts
5. Open PR targeting `main` or active release branch including:
      - Capability SKU + customer outcome
      - Tests performed (`npm run validate`, load/perf scripts, UI smoke)
      - Rollback plan or feature flag toggle
6. After merge, delete the feature branch locally/remotely

## ✅ Readiness Checklist (add to PR)
- [ ] `npm run branch:status` shows clean tree
- [ ] Functional + performance probes listed with outputs
- [ ] Documentation and pricing notes updated
- [ ] `npm run clean` executed (no stray servers)

## 🔒 Governance Notes
- Rebase onto `main` before requesting review to keep history linear
- Never force-push to shared branches (`main`, `release/*`)
- Tag from `main` immediately after release merge: `git tag vX.Y.Z && git push --tags`
- Archive experiments after 14 days unless promoted to feature
