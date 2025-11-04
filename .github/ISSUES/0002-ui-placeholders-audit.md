Title: Audit and tidy UI placeholders (forms and demo pages)

Description:
The repository contains many input placeholders and demo content used in UI components. While most are intentional UX hints, we should:

- Confirm which placeholders are intentional user-facing hints and which represent missing functionality or demo content.
- Replace demo placeholders like "YOUR PROMPT HERE" with localized examples where appropriate.
- Remove any placeholder comments that indicate incomplete implementations in production code.

Files to check (sample):
- `web-app/*`, `packages/web/src/components/*`, `tooloo-embedded-ui.html`, `web-app/providers-arena.html`

Acceptance criteria:
- A checklist marking intentional UX placeholders as OK.
- Replace or remove placeholders that represent missing functionality.
- Update design docs describing input hints for consistency.

Priority: Medium
Assignee: TBD
Labels: ui, design, cleanup
