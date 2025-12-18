# Gestalt System

## Principles
- Proximity, Similarity, Continuity, Closure, Figure-Ground, Prägnanz.
- Enforced via validators; builds fail on violations.

## Tokens
- Spacing, colors, typography defined in `packages/gestalt/src/tokens/` (no hard-coded values).
- Components consume tokens; spacing semantic levels: related < group < section < page.

## Components
- Card, StatusIndicator, ActionButton, MetricDisplay, IterationTimeline.
- Require Gestalt validation tests asserting zero violations.

## Validation
- `gestalt-validator` checks hierarchy, spacing ratios, grouping consistency, visual contrast.
- Dev overlay (optional) highlights violations; CI blocks merges on failures.

## Usage Rules
- Max 3 levels of visual hierarchy per component.
- Group related items; maintain consistent patterns for similar functions.
- UI code must import tokens; no raw px values.

## Integration
- UI build step runs Gestalt validator.
- Agents (critic) can flag Gestalt issues during reviews.
