# Branching Strategy and Performance Validation

To keep development streamlined, each major capability should live in its own feature branch. This isolates experiments, simplifies pull requests, and makes it easier to measure the impact of each change.

## Workflow Checklist

1. **Create a feature branch**: use a descriptive name such as `feature/api-rate-limits` or `fix/ui-latency`.
2. **Implement the change**: commit early and often while keeping work scoped to the branch.
3. **Run validation**:
   - `npm run lint` to maintain consistent style.
   - `npm run validate` to execute the automated test suite and API performance probe. The helper automatically launches `simple-api-server.js` (or the next configured fallback) so you only need the latest code and dependencies installed.
   - Additional package-specific checks if your work affects tooling under `packages/`.
4. **Review analytics**: if your change has measurable performance impact, record before-and-after metrics in the pull request description.
5. **Open a pull request**: reference the relevant task and clearly summarize the scope.

## Performance Validation Tips

- For frontend updates, rely on Vitest and Testing Library coverage to ensure component behavior stays responsive.
- Use `npm run perf` (or `npm run validate`) to confirm the `/api/v1/health` endpoint maintains a p95 latency under 250ms by default. Override `PERF_P95_THRESHOLD_MS` if you need a stricter budget.
- When the probe fails, review the printed log excerpt for the affected entry point, fix the regression, and rerun the command until it passes.
- Backend API updates should be accompanied by integration checks or local profiling runs using `simple-api-server.js`.
- When adding heavy computations, prefer asynchronous patterns to avoid blocking event loops.

Following this process keeps the main branch stable while allowing rapid, parallel development across the platform.
