// @version 2.1.28
// Trait Aggregator (P4) - MVP
// Consumes pattern extraction outputs and computes cognitive trait vector
// Maps patterns to traits: decisionCompression, riskDiscipline, trustPriority, structureExpectation

/**
 * Compute cognitive trait vector from pattern extraction results
 * @param {Array} patternCandidates - Pattern objects with features from pattern extractor
 * @param {Object} [options] - Configurable weights and thresholds
 * @returns {Object} traitVector - Cognitive traits (0-1 scale)
 */
export function computeTraitVector(patternCandidates, options = {}) {
  // Pattern-to-trait mapping per spec (expanded for better coverage)
  const patternMapping = {
    'decision-shorthand-affirm': ['decisionCompression'],
    'option-framing-request': ['decisionCompression', 'structureExpectation'],
    'risk-surfacing': ['riskDiscipline', 'structureExpectation'],
    'scope-compression': ['riskDiscipline', 'structureExpectation'],
    'local-first-principle': ['trustPriority'],
    'deliverable-framing-quad': ['structureExpectation'],
    'next-step-authorization': ['decisionCompression'],
    'pivot-trigger-question': ['riskDiscipline', 'decisionCompression'],
    'pattern-mining-invoke': ['structureExpectation', 'riskDiscipline']
  };

  // Initialize trait accumulators
  const traits = {
    decisionCompression: { total: 0, count: 0 },
    riskDiscipline: { total: 0, count: 0 },
    trustPriority: { total: 0, count: 0 },
    structureExpectation: { total: 0, count: 0 }
  };

  // Aggregate pattern contributions to traits
  for (const pattern of patternCandidates) {
    const patternId = pattern.patterns[0]; // Single pattern per window
    const mappedTraits = patternMapping[patternId] || [];
    
    for (const traitName of mappedTraits) {
      if (traits[traitName]) {
        // Enhanced weighting: stronger confidence factor, linear frequency scaling
        const weight = (pattern.features.confidence * 1.5) * (1 + pattern.features.frequency * 0.3);
        traits[traitName].total += weight;
        traits[traitName].count += 1;
      }
    }
  }

  // Compute final trait values (0-1 scale) with improved normalization
  const traitVector = {};
  for (const [traitName, accumulator] of Object.entries(traits)) {
    if (accumulator.count > 0) {
      // Average weighted score with amplified normalization
      const avgWeight = accumulator.total / accumulator.count;
      traitVector[traitName] = Math.min(1, avgWeight * 0.8); // Scaled to reach higher values
    } else {
      traitVector[traitName] = 0;
    }
  }

  return traitVector;
}

/**
 * Format trait vector for display or export
 * @param {Object} traitVector - Computed trait values
 * @returns {Object} formatted - Rounded values with metadata
 */
export function formatTraitVector(traitVector) {
  const formatted = {};
  for (const [trait, value] of Object.entries(traitVector)) {
    formatted[trait] = Math.round(value * 100) / 100; // Round to 2 decimals
  }
  formatted.timestamp = new Date().toISOString();
  formatted.version = '1.0.0';
  return formatted;
}
