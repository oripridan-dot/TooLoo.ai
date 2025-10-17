# Trait Aggregator Contract (MVP)

## Purpose
Defines the guarantees, input/output, trait computation formulas, and validation criteria for the trait aggregator module.

## Input
- **patternCandidates:** Array of pattern objects from pattern extractor, each containing:
  - patterns: Array of pattern IDs (single pattern per window)
  - features: { confidence, frequency, recency, distinctiveness }
  - segmentId: Associated conversation segment
- **options:** Configurable weights and thresholds (optional)

## Output
- **traitVector:** Object with cognitive trait scores (0–1 scale):
  - decisionCompression: Efficiency in decision-making processes
  - riskDiscipline: Systematic approach to risk identification/mitigation
  - trustPriority: Emphasis on privacy and trust considerations
  - structureExpectation: Preference for organized, structured outputs

## Pattern-to-Trait Mapping
| Pattern | Contributing Traits |
|---------|-------------------|
| decision-shorthand-affirm | decisionCompression |
| option-framing-request | decisionCompression |
| risk-surfacing | riskDiscipline |
| scope-compression | riskDiscipline |
| local-first-principle | trustPriority |
| deliverable-framing-quad | structureExpectation |
| next-step-authorization | decisionCompression |
| pivot-trigger-question | riskDiscipline |
| pattern-mining-invoke | structureExpectation |

## Computation Formula
For each trait:
1. **Pattern Contribution:** weight = confidence × log(1 + frequency)
2. **Trait Accumulation:** Sum weighted contributions for all mapped patterns
3. **Normalization:** traitValue = min(1, totalWeight / patternCount)

## Validation Criteria
- **Range:** All trait values must be between 0–1
- **Stability:** Re-running same session should produce values within ±0.02
- **Accuracy:** Computed traits should be within ±0.2 of expected values (from synthetic sessions)
- **Coverage:** All four traits should have non-zero values for sessions with diverse patterns

## Edge Case Handling
- **No patterns detected:** All traits default to 0
- **Missing pattern mappings:** Unmapped patterns are ignored
- **Zero confidence patterns:** Contribute 0 weight to traits
- **Single pattern sessions:** Trait computed from available evidence

## Export Format
```json
{
  "decisionCompression": 0.75,
  "riskDiscipline": 0.82,
  "trustPriority": 0.65,
  "structureExpectation": 0.71,
  "timestamp": "2025-10-08T...",
  "version": "1.0.0"
}
```

## Integration Points
- Consumes outputs from pattern-extractor.js
- Feeds into snapshot composer for final cognitive profile
- Used by onboarding flow for adaptive recommendations

## Acceptance Criteria
- Trait computation completes for all synthetic sessions
- Values are stable across multiple runs (±0.02 variance)
- Accuracy ≥80% for sessions with expected trait annotations
- Performance <50ms for typical pattern loads

## Future Enhancements
- Weighted trait contributions based on pattern distinctiveness
- Temporal trait evolution tracking across multiple sessions
- Calibration against larger corpus for normalization

---
Version: v1.0.0
Date: 2025-10-08