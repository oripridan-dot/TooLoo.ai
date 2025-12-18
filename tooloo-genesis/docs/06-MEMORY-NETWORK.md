# Memory Network

## Node Model
- Types: pattern, decision, outcome, reflection, lesson.
- Fields: id (branded), content, embedding, keywords, timestamp, accessCount, lastAccessed, confidence, fungalLinks.

## Fungal Links
- Relationships: supports, contradicts, extends, requires, warns.
- Strength increases with co-activation; stores nutrients (context enrichment, shared constraints, warning signals).

## Temporal Tracking
- Scales: milliseconds (reactivity), seconds (interactivity), minutes (flow), hours (productiveHours), days (patternsLearned), weeks (velocityTrend).
- `trackTemporal` records events; `getTemporalInsights` derives trends and predictions.

## Query
- Parameters: type, keywords, embedding, timeRange, minConfidence.
- Steps: vector search → filter → enrich with connections → surface warnings/supporting patterns.

## Providers
- Default in-memory provider; adapter interface for vector/db backends.

## Integration
- Iteration tracker records outcomes to memory.
- Agents query memory before planning/execution; reflector writes lessons post-run.
