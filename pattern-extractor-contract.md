# Pattern Extractor Contract (MVP)

## Purpose
Defines the guarantees, input/output, feature definitions, and edge case handling for the pattern extraction engine (P3).

## Input
- **messages:** Array of parsed transcript messages (from parser)
- **segments:** Array of segmentation objects (from segmenter)
- **options:** Configurable (windowSize, patternDefs)

## Output
- **patternCandidates:** Array of pattern objects, each with:
  - patterns: Array of pattern IDs detected
  - segmentId: Associated segment
  - windowStart/windowEnd: Message indices
  - texts: Array of matched message texts
  - features: { confidence, frequency, recency, distinctiveness }

## Feature Definitions
- **confidence:** Likelihood pattern is correctly identified (0–1)
- **frequency:** Occurrence count within session
- **recency:** How recently pattern appeared (lower = more recent)
- **distinctiveness:** Uniqueness compared to other sessions (0–1)

## Edge Case Handling
- If no patterns detected: Return empty array
- If overlapping windows: Emit all valid groups, deduplicate downstream
- If segmentId not found: Set to null
- If message missing text/timestamp: Skip or set to null

## Extensibility
- Pattern definitions and window size are configurable
- Feature computation can be extended for ML upgrades

## Acceptance Criteria
- Detects all expected pattern occurrences in synthetic sessions
- Feature emission matches spec
- Handles edge cases gracefully

---
Version: v0.1.0
Date: 2025-10-08
