// Snapshot Composer (P6) - Assembles final cognitive snapshot
// Combines segments, patterns, and traits into exportable JSON format
// Output: Complete conversation intelligence snapshot ready for UI/export

/**
 * Compose cognitive snapshot from conversation intelligence pipeline outputs
 * @param {Object} inputs - Pipeline outputs { messages, segments, patterns, traits }
 * @param {Object} [options] - Composition options and metadata
 * @returns {Object} snapshot - Complete cognitive snapshot
 */
export function composeSnapshot(inputs, options = {}) {
  const { messages, segments, patterns, traits } = inputs;
  const timestamp = new Date().toISOString();
  
  // Extract metadata from inputs
  const metadata = {
    messageCount: messages?.length || 0,
    segmentCount: segments?.length || 0,
    patternCount: patterns?.length || 0,
    processingTime: options.processingTime || null,
    timestamp,
    version: '1.0.0',
    scoringSpecVersion: options.scoringSpecVersion || '0.1.0'
  };

  // Compile pattern insights with confidence filtering
  const patternInsights = (patterns || [])
    .filter(p => p.features.confidence > 0.35) // Threshold per spec
    .map(p => ({
      id: p.patterns[0],
      segmentId: p.segmentId,
      confidence: Math.round(p.features.confidence * 100) / 100,
      distinctiveness: Math.round(p.features.distinctiveness * 100) / 100,
      texts: p.texts.slice(0, 2), // Limit to first 2 for brevity
      isHighlight: p.features.confidence > 0.78 // Highlight threshold per spec
    }))
    .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

  // Generate segment summary with pattern mapping
  const segmentSummary = (segments || []).map(seg => ({
    id: seg.id,
    label: seg.label,
    confidence: seg.confidence || 0,
    patternCount: patternInsights.filter(p => p.segmentId === seg.id).length
  }));

  // Create trait vector with interpretations
  const traitVector = traits ? {
    decisionCompression: {
      value: Math.round(traits.decisionCompression * 100) / 100,
      interpretation: getTraitInterpretation('decisionCompression', traits.decisionCompression)
    },
    riskDiscipline: {
      value: Math.round(traits.riskDiscipline * 100) / 100,
      interpretation: getTraitInterpretation('riskDiscipline', traits.riskDiscipline)
    },
    trustPriority: {
      value: Math.round(traits.trustPriority * 100) / 100,
      interpretation: getTraitInterpretation('trustPriority', traits.trustPriority)
    },
    structureExpectation: {
      value: Math.round(traits.structureExpectation * 100) / 100,
      interpretation: getTraitInterpretation('structureExpectation', traits.structureExpectation)
    }
  } : {};

  // Generate recommendations based on traits and patterns
  const recommendations = generateRecommendations(traitVector, patternInsights);

  // Assemble final snapshot
  const snapshot = {
    metadata,
    segments: segmentSummary,
    patterns: patternInsights,
    traits: traitVector,
    recommendations,
    summary: {
      totalInsights: patternInsights.length,
      highlightPatterns: patternInsights.filter(p => p.isHighlight).length,
      dominantTrait: getDominantTrait(traitVector),
      conversationStyle: getConversationStyle(segments, patterns)
    }
  };

  return snapshot;
}

/**
 * Get trait interpretation for UI display
 * @param {string} traitName - Name of the trait
 * @param {number} value - Trait value (0-1)
 * @returns {string} interpretation - Human-readable interpretation
 */
function getTraitInterpretation(traitName, value) {
  const interpretations = {
    decisionCompression: {
      high: 'Prefers rapid, compressed decision-making',
      medium: 'Balanced approach to decision-making',
      low: 'Prefers deliberate, expanded decision processes'
    },
    riskDiscipline: {
      high: 'Systematic risk identification and mitigation',
      medium: 'Moderate attention to risk factors',
      low: 'Risk-tolerant, action-oriented approach'
    },
    trustPriority: {
      high: 'Strong emphasis on privacy and trust',
      medium: 'Balanced trust considerations',
      low: 'Pragmatic approach to trust trade-offs'
    },
    structureExpectation: {
      high: 'Prefers organized, structured outputs',
      medium: 'Moderate structure preferences',
      low: 'Comfortable with flexible formats'
    }
  };

  const level = value > 0.7 ? 'high' : value > 0.4 ? 'medium' : 'low';
  return interpretations[traitName]?.[level] || `${traitName}: ${value}`;
}

/**
 * Generate actionable recommendations based on cognitive profile
 * @param {Object} traits - Trait vector with values and interpretations
 * @param {Array} patterns - Pattern insights
 * @returns {Array} recommendations - Actionable recommendations
 */
function generateRecommendations(traits, patterns) {
  const recommendations = [];

  // Decision compression recommendations
  if (traits.decisionCompression?.value > 0.7) {
    recommendations.push({
      category: 'Decision Making',
      text: 'Use decision compression formats (1.y/2.ok/3.go) for rapid authorization',
      confidence: 0.8
    });
  }

  // Risk discipline recommendations  
  if (traits.riskDiscipline?.value > 0.7) {
    recommendations.push({
      category: 'Risk Management',
      text: 'Lead with structured risk enumeration before proposing solutions',
      confidence: 0.85
    });
  }

  // Trust priority recommendations
  if (traits.trustPriority?.value > 0.7) {
    recommendations.push({
      category: 'Privacy & Trust',
      text: 'Emphasize local-first processing and data privacy in communications',
      confidence: 0.9
    });
  }

  // Structure expectation recommendations
  if (traits.structureExpectation?.value > 0.7) {
    recommendations.push({
      category: 'Output Format',
      text: 'Use Outcome/Tested/Impact/Next framing for deliverables',
      confidence: 0.85
    });
  }

  return recommendations;
}

/**
 * Identify dominant trait for summary
 * @param {Object} traits - Trait vector
 * @returns {string} dominantTrait - Name of highest-scoring trait
 */
function getDominantTrait(traits) {
  let maxTrait = 'balanced';
  let maxValue = 0;

  for (const [traitName, traitData] of Object.entries(traits)) {
    if (traitData.value > maxValue) {
      maxValue = traitData.value;
      maxTrait = traitName;
    }
  }

  return maxValue > 0.6 ? maxTrait : 'balanced';
}

/**
 * Analyze conversation style from segments and patterns
 * @param {Array} segments - Conversation segments
 * @param {Array} patterns - Pattern insights
 * @returns {string} style - Conversation style classification
 */
function getConversationStyle(patterns) {
  // Analyze patterns to determine conversation style
  if (!patterns || patterns.length === 0) {
    return 'exploratory';
  }
  
  const pivotPatterns = patterns.filter(p => p.id && p.id.includes('pivot'));
  const structurePatterns = patterns.filter(p => p.id && p.id.includes('structure'));
  const riskPatterns = patterns.filter(p => p.id && p.id.includes('risk'));
  
  // Calculate style scores
  const pivotScore = pivotPatterns.reduce((sum, p) => sum + (p.confidence || 0), 0);
  const structureScore = structurePatterns.reduce((sum, p) => sum + (p.confidence || 0), 0);
  const riskScore = riskPatterns.reduce((sum, p) => sum + (p.confidence || 0), 0);
  
  // Determine style based on dominant patterns
  if (pivotScore > 0.3) return 'decisive';
  if (structureScore > 0.4) return 'methodical';
  if (riskScore > 0.5) return 'cautious';
  return 'exploratory';
}

/**
 * Format snapshot for export
 * @param {Object} snapshot - Raw snapshot
 * @param {string} format - Export format ('json' | 'summary')
 * @returns {Object|string} formatted - Formatted snapshot
 */
export function formatSnapshot(snapshot, format = 'json') {
  if (format === 'summary') {
    return {
      timestamp: snapshot.metadata.timestamp,
      messageCount: snapshot.metadata.messageCount,
      insights: snapshot.summary.totalInsights,
      dominantTrait: snapshot.summary.dominantTrait,
      style: snapshot.summary.conversationStyle,
      recommendations: snapshot.recommendations.length
    };
  }
  
  return snapshot; // Default JSON format
}