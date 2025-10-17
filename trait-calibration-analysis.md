# Trait Calibration Analysis - October 8, 2025

## Current Accuracy Assessment
- **Overall accuracy: 25% (3/12 traits within ±0.2 tolerance)**
- **Sessions with validation data: 3 (SYN-001, SYN-002, SYN-003)**
- **Sessions without expected traits: 5 (SYN-004 through SYN-008)**

## Detailed Mismatch Analysis

### Session SYN-001 (Pivot Viability)
- **decisionCompression:** Computed 0.50, Expected 0.75 (diff: -0.25) ⚠
- **riskDiscipline:** Computed 0.75, Expected 0.85 (diff: -0.10) ✓
- **trustPriority:** Computed 0.00, Expected 0.45 (diff: -0.45) ⚠
- **structureExpectation:** Computed 0.39, Expected 0.65 (diff: -0.26) ⚠

**Issues identified:**
- trustPriority = 0 suggests no local-first-principle patterns detected or mapped
- decisionCompression underweighted despite pivot decisions and authorizations
- structureExpectation low despite scope compression patterns

### Session SYN-002 (Decision Compression)
- **decisionCompression:** Computed 0.60, Expected 0.90 (diff: -0.30) ⚠
- **riskDiscipline:** Computed 0.00, Expected 0.35 (diff: -0.35) ⚠
- **trustPriority:** Computed 0.00, Expected 0.25 (diff: -0.25) ⚠
- **structureExpectation:** Computed 0.00, Expected 0.55 (diff: -0.55) ⚠

**Issues identified:**
- decisionCompression severely underweighted despite decision-shorthand-affirm patterns
- All other traits at 0, suggesting mapping gaps
- Session focused on compression should have high decisionCompression

### Session SYN-003 (Risk Enumeration)
- **decisionCompression:** Computed 0.69, Expected 0.65 (diff: +0.04) ✓
- **riskDiscipline:** Computed 0.60, Expected 0.95 (diff: -0.35) ⚠
- **trustPriority:** Computed 0.41, Expected 0.40 (diff: +0.01) ✓
- **structureExpectation:** Computed 0.00, Expected 0.75 (diff: -0.75) ⚠

**Issues identified:**
- riskDiscipline underweighted despite heavy risk-surfacing content
- structureExpectation = 0 despite structured risk categorization
- Best performance but still missing key structural patterns

## Root Cause Analysis

### 1. Pattern-to-Trait Mapping Gaps
- **Missing mappings:** Some patterns not contributing to expected traits
- **Weak coverage:** Single pattern types may not capture trait complexity
- **Scope compression:** Should contribute to structureExpectation but may be undermapped

### 2. Computation Formula Issues
- **Underweighting:** confidence × log(1 + frequency) may be too conservative
- **Normalization:** min(1, totalWeight / patternCount) may suppress high values
- **Frequency scaling:** log(1 + frequency) caps contribution too aggressively

### 3. Pattern Detection Quality
- **Zero trait values:** Suggest patterns not detected or not mapped properly
- **Consistently low values:** Formula may need amplification
- **Missing local-first patterns:** trustPriority often 0, indicating detection gaps

## Calibration Strategy

### Phase 1: Expand Pattern Mappings
- Add multi-trait mappings (patterns can contribute to multiple traits)
- Map scope-compression → structureExpectation more strongly
- Map risk-surfacing → both riskDiscipline and structureExpectation

### Phase 2: Adjust Computation Formula
- Increase confidence weighting coefficient
- Use linear frequency scaling instead of logarithmic
- Adjust normalization to allow higher trait values

### Phase 3: Add Expected Traits
- Annotate sessions 004-008 with expected trait ranges
- Increase validation coverage for more robust testing

### Phase 4: Iterative Refinement
- Test each change and measure accuracy improvement
- Target ≥80% accuracy (per contract requirements)
- Validate stability across multiple runs

## Next Actions
1. Update pattern-to-trait mappings for broader coverage
2. Refine computation formula with stronger weighting
3. Add expected traits to all synthetic sessions
4. Run calibration iterations until accuracy target is met