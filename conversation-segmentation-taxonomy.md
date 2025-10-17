# Conversation Segmentation Taxonomy (Derived from Historical Interaction Patterns)

Version: 0.1.0  
Date: 2025-10-08  
Source Scope: All observed interaction styles, strategic pivots, pattern mining dialogues, decision compression tokens, privacy assertions, execution directives.

---
## 1. Macro Phase Inventory
| Code | Label | Core Intent | Typical Duration (messages) | Preceded By | Leads To |
|------|-------|-------------|------------------------------|-------------|----------|
| STRAT | Strategic Reframing Challenge | Test viability / raise ceiling concern | 1–3 | RISK (sometimes) | PIVOT, OPTION |
| OPTION | Option Framing & Compression | Establish small decision set & capture shorthand response | 2–5 | STRAT, EXEC | AUTH, EXEC |
| RISK | Structured Risk Enumeration | Surface blockers categorically | 2–6 | STRAT trigger or user query | MITIG, PIVOT |
| MITIG | Mitigation Sequencing | Convert risks into ordered actions | 1–3 | RISK | AUTH, EXEC |
| PIVOT | Pivot Authorization | Explicit shift in strategic vector | 1–2 | STRAT, RISK | NEW_STRAT foundation |
| PRIV | Privacy Principle Establishment | Lock local-first constraints | 1–3 | OPTION or STRAT | TRUST, ONBOARD |
| META | Meta-Analysis Invocation | Request cognitive/profile extraction | 1–4 | Any execution plateau | PROFILE, EXEC |
| PROFILE | Cognitive Profile Delivery | Present structured user pattern & preferences | 1–3 | META | OPTION, EXEC |
| FORMAT | Reporting Convention Lock | Codify Outcome/Test/Impact/Next schema | 1–2 | PROFILE or EXEC | EXEC |
| EXEC | Execution Kickoff / Implementation | Begin artifact or code/data generation | Variable | AUTH, MITIG, OPTION | REFINEMENT |
| REFINEMENT | Iterative Spec Refinement | Tighten artifacts, insert constraints | 2–7 | EXEC | EXEC (loop) |
| TRUST | Trust Reinforcement / Assurance | Affirm privacy, boundaries, safety | 1–2 | PRIV, ONBOARD | ONBOARD |
| ONBOARD | Time-to-Value Experience Design | Craft user’s first-run pipeline | 2–5 | PRIV, STRAT | EXEC |
| AUTH | Next-Step Authorization | Concise green-light tokens | 1 | OPTION, MITIG | EXEC |

---
## 2. Micro Pattern Catalogue (Extended)
| ID | Label | Lexical Signals | Structural Signals | Phase Affinity | Failure Modes |
|----|-------|-----------------|--------------------|----------------|---------------|
| option-framing-request | Option Framing Request | "three ways", "options", enumerated list | Numeric/bullet onset | OPTION | Over-enumeration (>4) reduces compression |
| decision-shorthand-affirm | Decision Shorthand Affirmation | Tokens like `1.y / 2.ok / 3.3.go` | Single message multi decisions | AUTH | Mis-parse leads to mis-prioritized execution |
| pivot-trigger-question | Pivot Trigger Question | "ceiling", "right path?", "shift" | Sudden viability interrogation | STRAT | Missed detection delays strategic realignment |
| risk-surfacing | Risk Surfacing | "risks", "blockers", categories | Enumeration across dimensions | RISK | Unstructured dump lowers actionable clarity |
| scope-compression | Scope Compression | Arrows `→`, condensed stage chain | One message summarizes pipeline | MITIG / EXEC | Over-compression hides dependencies |
| next-step-authorization | Next-Step Authorization | "proceed", "execute", "go" | Short imperative | AUTH | Premature start if misaligned |
| local-first-principle | Local-First Assertion | "local-only", "no central storage" | Early-phase privacy directive | PRIV | Ignored directive erodes trust |
| pattern-mining-invoke | Pattern Mining Invocation | "analyze", "cognitive profile" | Transition from EXEC to META | META | Shallow extraction reduces perceived intelligence |
| deliverable-framing-quad | Outcome/Test/Impact/Next | "Outcome:", "Tested:", etc. | 4-labeled clauses | FORMAT | Inconsistent ordering causes scan friction |
| quality-bar-assert | Quality Bar Assertion | "zero tolerance", "supreme quality" | Early constraint injection | STRAT / REFINEMENT | Under-enforcement drifts quality |
| trust-reassurance | Trust / Privacy Reassurance | "processed locally", "nothing stored" | Post-privacy directive echo | TRUST | Missing reassurance increases abandonment risk |

---
## 3. Phase Transition Graph (Condensed)
STRAT → (RISK | OPTION | PIVOT)  
RISK → MITIG → AUTH → EXEC  
OPTION → AUTH → EXEC  
EXEC ↔ REFINEMENT (loop)  
EXEC → META → PROFILE → OPTION/EXEC  
PRIV → TRUST → ONBOARD → EXEC  
PROFILE → FORMAT → EXEC  
STRAT → PRIV (if privacy concern emerges early)

High-value transition archetype: STATUS → CONDITION → PROPOSAL → AUTHORIZATION.

---
## 4. Entry & Exit Signal Templates
| Phase | Entry Signals | Exit Signals | Confidence Heuristics (initial) |
|-------|---------------|-------------|---------------------------------|
| STRAT | viability interrogatives | pivot commitment or risk dive | Lexical pivot words + low preceding execution density |
| RISK | request containing "blockers/risks" | categories exhausted + mitigation sequence begins | Count of category markers >=2 |
| MITIG | presence of ordered executable sequence | explicit approval or immediate execution artifact | Ratio of imperatives to nouns > 0.4 |
| AUTH | compressed tokens / imperative approval | assistant acknowledgement or execution start | Message length < 9 words + imperative |
| PRIV | negative centralization stance | assistant adaptation plan referencing local | Privacy lexicon frequency spike |
| META | request for cognitive/profile | structured profile delivered | Use of meta nouns (profile, cognitive) |
| FORMAT | user mandates structure | format accepted + future lock phrase | 4 labeled segments parsed |
| TRUST | reassurance after privacy directive | movement to onboarding flow design | Contains both 'local' and 'optional' |
| ONBOARD | time-to-value constraint | approved sequential timeline | Contains time slices or seconds markers |

---
## 5. Feature Signals (Extraction Cheatsheet)
- Lexical Markers: pivot, ceiling, blockers, proceed, analyze, cognitive profile, local-only, anonymized, outcome, tested, impact, next.
- Structural Markers: enumeration bullets, arrow chains `→`, compressed token delimiter `/`, four-part labeled sequence, short imperative approvals.
- Temporal Markers: Quick succession of risk enumeration followed by compressed mitigation indicates readiness pivot.

---
## 6. Confidence Aggregation Prototype (Per Segment)
confidence(segment) = 0.35 * lexicalMatch + 0.25 * structuralPattern + 0.2 * transitionContext + 0.2 * brevitySignalAdjust  
Where brevitySignalAdjust down-weights overly long candidates for AUTH, up-weights concise approvals.

---
## 7. Failure Mode Patterns & Mitigations
| Failure Mode | Description | Mitigation |
|--------------|-------------|-----------|
| Over-Segmentation | Splitting each micro directive into new phase | Minimum message threshold rule (>=2) except for AUTH | 
| Under-Segmentation | Collapsing RISK + MITIG | Detect shift from categorical nouns to imperative verbs |
| Misclassified Approval | Treating exploratory question as AUTH | Require imperative + absence of question mark |
| Privacy Miss | Ignoring privacy directive as general preference | Maintain lexicon watchlist + early-phase weighting |
| Format Drift | Partial adoption of quad structure | Validate 4 labels before tagging FORMAT |

---
## 8. Derived User Behavioral Traits (From Patterns)
- Decision Compression Preference: High (frequent shorthand tokens).  
- Risk Appetite: Managed; demands surfaced risks before pivoting.  
- Trust Sensitivity: Elevated; early privacy assertions.  
- Structure Expectation: Expects standardized report schema.  
- Pivot Agility: Fast—single challenge triggers directional shift.

---
## 9. Application Hooks
| Engine Module | Uses | Notes |
|---------------|------|------|
| Segmenter | Phase boundary detection | Apply transition graph & signal heuristics |
| Pattern Scorer | Instance confidence weighting | Use lexical & structural features |
| Profile Builder | Aggregates trait vectors | Normalizes per 100 messages |
| Onboarding Pipeline | Early trait inference | Display immediate value via mini-profile |

---
## 10. Next Extension Opportunities
1. Add adversarial conflict phase taxonomy.  
2. Introduce Collaboration/Multi-Participant differentiation heuristic.  
3. Expand local-first lexicon with jurisdiction-specific privacy terms.  
4. Temporal decay model for pattern recency weighting.  
5. Negative pattern detection (stall, redundancy loops).

---
End of Taxonomy v0.1.0
