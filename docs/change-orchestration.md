# Change Orchestration Pipeline

TooLoo.ai now routes every self-modification through a dedicated change session managed by `change-orchestrator.js`. The orchestration flow is designed to keep our self-editing safe, auditable, and ready for UI presentation.

## Lifecycle

1. **Session Start** – Components open a change session with the orchestrator, capturing the initiating prompt, high-level description, and metadata.
2. **Plan Recording** – Planning steps are logged via `addPlanStep`, giving downstream consumers (API/UI) a narrative of the intended work.
3. **Change Application** – File operations (`create`, `update`, `append`, `delete`) are delegated to the orchestrator. Updates flow through `SelfAwarenessManager` to ensure backups (`.bak`) are created automatically unless explicitly disabled.
4. **Validation Runs** – Optional validations (tests, builds, inspections) leverage `runValidation`, which records stdout/stderr, duration, status, and errors.
5. **Notes & Diagnostics** – Any additional notes or warnings can be attached mid-flight by calling `addNote`.
6. **Finalization** – Once complete or failed, the session is finalized with a status and summary payload. A JSON log is persisted under `logs/change-sessions/<sessionId>.json` for later inspection.

## Integration Points

- `simple-api-server.js` instantiates the orchestrator, registers it with the Environment Hub, and injects it into the `SelfImplementationWizard`.
- `SelfImplementationWizard` now pushes both plan and execution steps into the session transcript so the final response can narrate the work performed.
- Future API endpoints and UI surfaces can rely on `changeOrchestrator.listSessions()` / `getSessionSummary()` to present real-time or historical change reports.

## Next Steps

- Expose session summaries via API to power the dashboard.
- Attach automated validation profiles (e.g., run lint + targeted tests) to specific change types.
- Surface orchestrator insights in the monitoring UI alongside maintenance controls.
