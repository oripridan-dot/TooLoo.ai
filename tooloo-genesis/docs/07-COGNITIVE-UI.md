# Cognitive UI

## Principles
- Brain-friendly: spatial over lists, clear grouping, consistent hierarchies.
- Gestalt enforced: proximity, similarity, continuity, closure, figure-ground, prägnanz.

## Canvas
- InfiniteSpace + SpatialNode: nodes in 2D; proximity reflects relevance; zoom-out shows abstract flow, zoom-in shows detail/diffs.

## Validation UI
- Traffic-light states: Planning (blue), Validating (yellow), Success (green), Failure (red with rollback done).
- Shows simulator progress, confidence, rollback plan availability.

## Gestalt Enforcement
- useGestalt hook/HOC runs validator in dev; CI build fails on violations.
- Tokens from `@tooloo/gestalt` for spacing/colors/typography; no hard-coded px.

## Components
- Card, StatusIndicator, ActionButton, MetricDisplay, IterationTimeline; all require Gestalt tests with zero violations.

## Integration
- Subscribes to validation/iteration events from API sockets; updates canvas and status indicators.
- Progressive disclosure: surface key signals first; detail on zoom/expand.
