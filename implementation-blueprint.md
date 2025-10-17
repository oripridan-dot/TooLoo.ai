# Conversation Intelligence MVP Implementation Blueprint (v0.1.0)
Date: 2025-10-08

## 1. Objective
Deliver a local-first conversation intelligence engine that (a) ingests a transcript, (b) segments phases, (c) detects micro patterns, (d) scores & produces a cognitive snapshot, and (e) surfaces a 60‑second onboarding value loop.

## 2. Guiding Constraints
- Zero cloud upload of raw text (local-only processing for baseline tier).
- Deterministic heuristics in MVP (no heavy ML dependence).
- Sub-60s first-run value (<=400 messages typical transcript).
- Modular upgrade path for ML enhancements later.

## 3. High-Level Architecture Layers
| Layer | Responsibility | Components |
|-------|----------------|------------|
| Acquisition | Input normalization | TranscriptParser |
| Segmentation | Phase boundary inference | SegmenterEngine |
| Pattern Extraction | Candidate generation | LexicalScanner, StructuralAnalyzer |
| Scoring | Feature computation + confidence | PatternScorer (uses scoring spec) |
| Trait Synthesis | Aggregated user/profile traits | TraitAggregator |
| Snapshot Assembly | Output packaging | SnapshotComposer |
| Onboarding Orchestration | Timed progressive reveal | OnboardingController |
| Privacy & Trust | Enforce local-only + messaging | PrivacyGuard |
| Telemetry (Local) | Instrument runtime (non-personal) | EventEmitter (local buffer) |

## Pattern Extraction Engine (P3) - Design Overview

### Purpose
Extract candidate conversational patterns from parsed and segmented transcripts, emitting features for scoring and downstream analysis.

### Architecture
- **Input:** Segmented transcript objects (from parser and segmenter)
- **Core Steps:**
	1. Candidate Lexer: Tokenizes transcript for pattern candidates
	2. Windowed Grouping: Groups tokens/events in sliding windows to detect multi-turn patterns
	3. Distinctiveness Pre-Filter: Filters out generic/common patterns, prioritizes unique/distinctive ones
	4. Feature Emission: Emits features (confidence, frequency, recency, distinctiveness) for scoring
- **Output:** Array of pattern objects with features, ready for scoring

### Feature Set
- **confidence:** Likelihood pattern is correctly identified
- **frequency:** Occurrence count within session
- **recency:** How recently pattern appeared
- **distinctiveness:** Uniqueness compared to other sessions

### Integration Points
- Consumes outputs from parser and segmenter
- Emits features to scoring stub (see pattern-scoring-spec.md)
- Harness validates extraction accuracy and feature emission

### Extensibility
- Modular design for future ML upgrades
- Configurable pattern definitions and window sizes

### Next Steps
1. Implement pattern-extractor.js (core logic)
2. Build pattern-extraction-harness.js (validation)
3. Document pattern-extractor-contract.md
4. Integrate with scoring stub

## 4. Data Flow (Sequential)
1. Raw input (paste/drag) → TranscriptParser → normalized messages[].
2. messages[] → SegmenterEngine → segments[].
3. messages[] + segments[] → LexicalScanner → pattern candidates.
4. candidates → StructuralAnalyzer (adds structural flags).
5. enriched candidates → PatternScorer → patternInstances[].
6. patternInstances[] → TraitAggregator → traits vector.
7. traits + patterns + segments → SnapshotComposer → snapshot payload.
8. OnboardingController orchestrates timeline updates.

## 5. Minimal Internal Interfaces (Conceptual)
TranscriptParser.parse(rawText) -> { messages, metadata }
SegmenterEngine.run(messages) -> { segments }
PatternExtractor.run(messages, segments) -> { candidates }
PatternScorer.score(candidates, messages) -> { patternInstances }
TraitAggregator.build(patternInstances) -> { traits }
SnapshotComposer.compose({segments, patternInstances, traits}) -> snapshot
OnboardingController.execute(snapshotPromiseProgressCallbacks)

(No external API exposure in MVP; surfaces via local UI invocation.)

## 6. Build Phases & Order
| Phase | Deliverables | Dependencies | Acceptance |
|-------|--------------|--------------|------------|
| P1 Parsing + Synthetic Tests | TranscriptParser + unit tests using synthetic sessions | dataset | Parses all sessions w/ 100% message count fidelity |
| P2 Segmentation Engine | Segment heuristics + coverage test | P1 | Matches taxonomy boundaries on synthetic sessions ≥85% |
| P3 Pattern Extraction | Lexical + structural candidate detection | P2 | Detects all expected pattern occurrences (no misses) |
| P4 Scoring Module | Implements scoring spec | P3 | Confidence bands within calibration ranges |
| P5 Trait Aggregation | Trait vector derivation | P4 | Trait values stable ±0.05 across runs |
| P6 Snapshot Composer | Assembled payload + export | P5 | JSON schema validation passes |
| P7 Onboarding Orchestrator | Timed progress UI stub + simulation | P6 | Simulated run completes <60s |
| P8 Privacy & Telemetry | Local logging + badge & opt-in toggle | P7 | Badge visible; no raw export without user action |
| P9 Hardening & QA | Edge cases, large transcript sampling | All prior | Performance & criteria confirmed |

## 7. Risk Log
| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Over-segmentation | Noisy phases reduce clarity | Medium | Min segment length & transition validation |
| Lexical ambiguity | False positives inflate pattern list | Medium | Distinctiveness penalty + threshold gating |
| Performance on large inputs | Miss 60s target | Medium | Sampling & early exit after threshold matches |
| Privacy perception | User distrust | Low | Early persistent badge, transparent copy |
| Future ML integration friction | Re-architecture later | Low | Maintain clean feature vector export interface |

## 8. Success Metrics (MVP)
- Time-to-snapshot: < 60s (p50 < 40s on reference dataset of 200 messages).  
- Pattern precision (synthetic set): ≥ 0.9 for highlight patterns.  
- Trait stability: Re-run same transcript variance < 0.02.  
- User perceived clarity (qualitative later).  

## 9. Testing Strategy
| Level | Focus | Tools |
|-------|-------|-------|
| Unit | Parsing, feature functions | Jest/Vitest local |
| Fixture | Synthetic session replay | Custom harness |
| Performance | Timing budgets (tokenization, scoring) | Benchmark script |
| Snapshot Validation | Schema adherence | JSON schema check |
| Regression | Confidence band drift | Stored baseline metrics |

## 10. Privacy Compliance Mechanics
- No network calls during processing (guard rails in PrivacyGuard).  
- Optional pattern signature generation separated in module requiring explicit opt-in flag.  
- Export action manual (no silent persistence).  
- In-memory objects zeroed or GC eligible after view dismissed.  

## 11. Progressive Enhancement Path
MVP heuristic → Add anomaly detection → Introduce embedding semantic layer (local or lightweight wasm model) → Optional federated signature aggregation → Adaptive guidance templates.

## 12. Configuration Surface (MVP)
config = { maxMessages: 400 (sampling threshold), scoring: { lambdaRecency:1.2, freqCap:6 }, thresholds: { candidate:0.35, confirmed:0.55, highlight:0.78 } }

## 13. Logging & Observability
In dev mode: patternInstances debug log + timing breakdown (parse, segment, extract, score). In production: only high-level durations & counts (no raw text). Stored only in-memory.

## 14. Rollout Strategy
1. Internal dev harness with synthetic sessions.  
2. Console-driven simulation of onboarding progress.  
3. Integrate into minimal UI shell (drop zone + progress).  
4. Add privacy badge + opt-in toggle.  
5. Collect manual QA feedback; calibrate thresholds.  
6. Prepare documentation & snapshot schema.  

## 15. Module Ownership (Initial)
| Module | Owner (Role) |
|--------|--------------|
| Parser | Engine Core |
| SegmenterEngine | Engine Core |
| PatternExtractor (Lexical + Structural) | Engine Core |
| PatternScorer | Engine Core |
| TraitAggregator | Intelligence Layer |
| SnapshotComposer | Intelligence Layer |
| OnboardingController | UX Layer |
| PrivacyGuard | Platform Layer |

## 16. Minimal Trait Schema (Reaffirm)
traits = { decisionCompression: number, riskDiscipline: number, trustPriority: number, structureExpectation: number }
Each 0–1; compute once per transcript; deterministic.

## 17. Decomposition for Parallel Work
- Track A (Engine): Parser → Segmenter → PatternExtractor → Scorer.
- Track B (UX): OnboardingController mock → Progress visuals → Privacy badge.
- Track C (Intelligence Integration): TraitAggregator → SnapshotComposer.
Merge after P5 for integrated run.

## 18. Fallback / Degradation Behavior
If segmentation fails: fallback to single segment.  
If pattern detection yields zero: show neutral snapshot with guidance prompt to add another transcript.  
If scoring exception: log error, mark all candidates as low-confidence hidden; still show privacy success + safe completion.

## 19. Versioning & Artifacts
- Scoring spec version tag embedded into snapshot (scoringSpecVersion).  
- Segmenter heuristic version (segmenterVersion).  
- Trait schema version (traitSchemaVersion).  

## 20. Acceptance Gate (Go/No-Go)
Go when: P1–P8 pass acceptance criteria + risk precision metrics satisfied + privacy badge verified persistent across all states + export schema validated.

## 21. Future Architectural Considerations
Introduce streaming segmentation (phase inference while messages arrive). Potential multi-participant persona clustering. Explainability panel (feature contribution list) optional expansion.

---
End of Blueprint v0.1.0
