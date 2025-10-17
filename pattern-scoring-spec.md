# Pattern Scoring Specification (v0.1.0)

Date: 2025-10-08

Scope: MVP heuristic model powering first 60-second onboarding + snapshot.

---

## 1. Goals

- Fast (<150ms for <=400 messages) first-pass pattern confidence.
- Deterministic + explainable scoring (no opaque ML in MVP).
- Calibratable using synthetic sessions corpus.
- Resilient to noise (minimize false positives from incidental tokens).

## 2. Inputs

Transcript object: array of messages { id, author, content }.

Candidate pattern definitions: each includes lexical triggers, structural signatures, contextual constraints.

## 3. Output

patternInstances[]: { patternId, messageIds, features, confidence (0–1), stage: prelim|refined, rationale }

## 4. Feature Set

| Code | Feature | Description | Range | Notes |
|------|---------|-------------|-------|-------|
| F_lex | Lexical Match Score | Normalized count of trigger phrases (weighted) / expected max | 0–1 | Stemming + synonym map |
| F_struct | Structural Pattern Score | Presence fidelity of structural markers (e.g., 4 labeled blocks) | 0–1 | Boolean or proportional |
| F_posDiv | Positional Diversity | Spread of occurrences across conversation quartiles | 0–1 | (uniqueQuartiles / 4) |
| F_freq | Normalized Frequency | log(1 + occurrences)/log(1 + cap) | 0–1 | cap default 6 |
| F_recency | Recency Weight | Exponential decay emphasizing later confirmation | 0–1 | e^-lambda×gap, max over supporting msgs |
| F_distinct | Distinctiveness | 1 - overlap coefficient with nearest competing pattern triggers | 0–1 | Avoid lexical collision |
| F_support | Support Density | (#supporting signals)/(#tokens in window) | 0–1 | Window-based density |
| F_contra | Contradiction Penalty | Confidence penalty if negating lexicon present | 0–1 (penalty) | Set to 0 if none |

## 5. Derived Confidence (MVP Formula)

BaseConfidence = 0.22×F_lex + 0.18×F_struct + 0.12×F_posDiv + 0.15×F_freq + 0.12×F_recency + 0.08×F_distinct + 0.08×F_support

Penalty = 0.25×F_contra

Confidence = clamp(BaseConfidence - Penalty, 0, 1)

Rationale weighting: Early emphasis on lexical and structural for determinism; moderate recency to highlight fresh directives.

## 6. Later Variant (v0.2 Idea)

Confidence_v2 = w1×F_lex + w2×F_struct + w3×F_freq + w4×F_recency + w5×MutualInformation(featureSet) - Penalties

Adds unsupervised MI weight after collecting baseline corpus stats.

## 7. Threshold States

| State | Confidence Range | UI Treatment | Purpose |
|-------|------------------|-------------|---------|
| candidate | 0.35–0.55 | muted badge | For refinement stage |
| confirmed | >0.55 | normal badge | Display in onboarding |
| highlight | >0.78 | emphasized | Drives trait inference strongly |
| discard | <0.35 | hidden | Avoid noise |

## 8. False Positive Mitigation

- Require both lexical and at least one non-lexical feature (struct OR support OR freq> minimal) except for pivot-trigger-question (can rely on lexical alone).
- Distinctiveness guard: if overlap coefficient >0.6 with higher-confidence pattern, down-weight F_lex by 20%.
- Recency override: if pattern only appears in first quartile and F_posDiv <0.25, cap confidence at 0.5.
- Minimum evidence rule: at least 2 supporting messages unless structural completeness (e.g., 4-part framing) is perfect.

## 9. Trait Vector Contribution Weights

| Trait | Contributing Patterns | Weight Logic |
|-------|-----------------------|-------------|
| decisionCompression | decision-shorthand-affirm, option-framing-request | avg(confidence) × (count/3 capped) |
| riskDiscipline | risk-surfacing, scope-compression | weighted mean (risk-surfacing ×1.2) |
| trustPriority | local-first-principle, trust-reassurance | max(confidence) |
| structureExpectation | deliverable-framing-quad, scope-compression | harmonic mean to penalize imbalance |

## 10. Recency Decay Specification

For message at position i in sequence length N: recency weight r = exp(-lambda×(1 - i/N)). Default lambda = 1.2. Pattern F_recency = max r among supporting messages.

## 11. Positional Diversity

Divide transcript into 4 equal buckets by message index. Count unique buckets containing supporting messages. F_posDiv = uniqueBuckets/4.

## 12. Distinctiveness Calculation

Overlap coefficient = |TriggerSetA ∩ TriggerSetB| / min(|A|, |B|) among competing patterns. F_distinct = 1 - maxOverlap.

## 13. Support Density

Choose window of ±1 message around each support occurrence (or ±2 for long messages). Concatenate windows, compute density = signalTokens / totalTokensWindow. F_support = min(1, density × scaling), scaling default 2.0.

## 14. Calibration Using Synthetic Sessions

| Pattern | Session Examples | Expected Confidence Band |
|---------|------------------|--------------------------|
| pivot-trigger-question | SYN-001 (m1), SYN-008 (m2) | 0.65–0.9 |
| decision-shorthand-affirm | SYN-002 (m2) | 0.9–0.97 |
| risk-surfacing | SYN-001 (m2,m3), SYN-003 (m2,m3) | 0.85–0.93 |
| scope-compression | SYN-001 (m5), SYN-006 (m2) | 0.70–0.82 |
| local-first-principle | SYN-005 (m2) | 0.9–0.95 |
| pattern-mining-invoke | SYN-004 (m1) | 0.9–0.94 |
| deliverable-framing-quad | SYN-007 (m2) | 0.88–0.93 |
| next-step-authorization | multiple | 0.7–0.82 |

Deviation outside bands indicates either feature weighting drift or detection mis-parse.

## 15. Complexity Budget

For <=400 messages, target: candidate extraction O(N) token scan with streaming lexical check; structural analysis only on candidate windows. Expected < 10k operations (<1ms JS environment typical; budget generous 150ms including UI integration).

## 16. Pseudocode (Narrative Form)

1. Stream messages; emit lexical hits per pattern.  
2. Group contiguous hits into candidate clusters.  
3. For each candidate pattern: compute features (F_lex, F_struct, etc.).  
4. Apply distinctiveness adjustment vs already higher-confidence patterns.  
5. Derive Confidence; assign state via thresholds.  
6. Prune discard; label candidate vs confirmed.  
7. Recompute trait vector from confirmed + highlight.  
8. Emit rationale enumerating top 3 contributing features.

## 17. Rationale Field Format

rationale = [ { feature: code, weight: numeric, contribution: value }, ... top 3 sorted by absolute contribution ]

## 18. Logging (Dev Mode)

For each pattern instance: log JSON { patternId, confidence, features, pruneReason? }. Disabled in production onboarding to maintain speed.

## 19. Acceptance Criteria

- 95% of synthetic session expected bands satisfied.  
- No false highlight states (<0.78) for patterns absent in session corpus.  
- Processing time <150ms on reference machine for 400-message transcript.  
- Rationale includes at least one non-lexical feature for confirmed state (except pivot-trigger-question).  

## 20. Future Upgrade Hooks

- Add small logistic regression after gathering 1k anonymized signature samples.  
- Incorporate semantic embedding overlap for paraphrased triggers.  
- Introduce contradiction lexicon expansion (negation, uncertainty).  

End of Spec v0.1.0
