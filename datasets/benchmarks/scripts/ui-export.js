// UI Export Module - Generates frontend-ready JSON for conversation intelligence display
// Transforms cognitive snapshots into optimized UI formats for patterns, traits, and recommendations

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { composeSnapshot, formatSnapshot } from '../engine/snapshot-composer.js';
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';

/**
 * Generate UI-ready export formats
 * @param {Object} snapshot - Complete cognitive snapshot 
 * @param {string} format - Export format: 'dashboard', 'timeline', 'summary', 'insights'
 * @returns {Object} UI-optimized data structure
 */
function generateUIExport(snapshot, format = 'dashboard') {
  switch (format) {
    case 'dashboard':
      return generateDashboardExport(snapshot);
    case 'timeline':
      return generateTimelineExport(snapshot);
    case 'summary':
      return generateSummaryExport(snapshot);
    case 'insights':
      return generateInsightsExport(snapshot);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

/**
 * Dashboard view - Overview with key metrics and top insights
 */
function generateDashboardExport(snapshot) {
  return {
    overview: {
      messageCount: snapshot.metadata.messageCount,
      processingTime: `${snapshot.metadata.processingTime}ms`,
      conversationStyle: snapshot.summary.conversationStyle,
      dominantTrait: snapshot.summary.dominantTrait,
      totalInsights: snapshot.summary.totalInsights,
      confidence: calculateOverallConfidence(snapshot.patterns)
    },
    topPatterns: snapshot.patterns
      .slice(0, 5)
      .map(p => ({
        name: formatPatternName(p.id),
        confidence: Math.round(p.confidence * 100),
        segment: p.segmentId,
        description: getPatternDescription(p.id)
      })),
    traitProfile: Object.entries(snapshot.traits).map(([trait, data]) => ({
      name: formatTraitName(trait),
      value: Math.round(data.value * 100),
      interpretation: data.interpretation,
      color: getTraitColor(data.value),
      icon: getTraitIcon(trait)
    })),
    recommendations: snapshot.recommendations.slice(0, 3).map(r => ({
      type: r.type,
      message: r.message,
      priority: r.priority,
      actionable: r.actionable
    })),
    metadata: {
      timestamp: snapshot.metadata.timestamp,
      version: snapshot.metadata.version,
      exported: new Date().toISOString()
    }
  };
}

/**
 * Timeline view - Chronological pattern flow across segments
 */
function generateTimelineExport(snapshot) {
  const segmentMap = new Map();
  
  // Group patterns by segment
  snapshot.patterns.forEach(pattern => {
    const segId = pattern.segmentId || 'unknown';
    if (!segmentMap.has(segId)) {
      segmentMap.set(segId, []);
    }
    segmentMap.get(segId).push(pattern);
  });
  
  const timeline = Array.from(segmentMap.entries()).map(([segmentId, patterns]) => {
    const segment = snapshot.segments.find(s => s.id === segmentId);
    return {
      segmentId,
      title: segment?.title || 'Untitled Segment',
      messageRange: segment ? `${segment.startMessage}-${segment.endMessage}` : 'Unknown',
      patternCount: patterns.length,
      patterns: patterns.map(p => ({
        id: p.id,
        name: formatPatternName(p.id),
        confidence: Math.round(p.confidence * 100),
        distinctiveness: Math.round(p.distinctiveness * 100),
        frequency: p.frequency
      })).sort((a, b) => b.confidence - a.confidence),
      dominantTheme: identifyDominantTheme(patterns)
    };
  });
  
  return {
    timeline,
    flow: analyzePatternFlow(timeline),
    metadata: {
      segmentCount: timeline.length,
      totalPatterns: snapshot.patterns.length,
      exported: new Date().toISOString()
    }
  };
}

/**
 * Summary view - Condensed insights for quick understanding
 */
function generateSummaryExport(snapshot) {
  const topTraits = Object.entries(snapshot.traits)
    .sort(([,a], [,b]) => b.value - a.value)
    .slice(0, 2);
    
  return {
    quickInsights: [
      `${snapshot.summary.conversationStyle} conversation style`,
      `${snapshot.summary.totalInsights} patterns detected`,
      `${topTraits[0][0]} trait dominant (${Math.round(topTraits[0][1].value * 100)}%)`,
      `${snapshot.recommendations.length} actionable recommendations`
    ],
    keyFindings: {
      style: snapshot.summary.conversationStyle,
      strength: topTraits[0] ? formatTraitName(topTraits[0][0]) : 'Balanced',
      patterns: snapshot.patterns.slice(0, 3).map(p => formatPatternName(p.id)),
      confidence: `${Math.round(calculateOverallConfidence(snapshot.patterns) * 100)}%`
    },
    recommendations: snapshot.recommendations.filter(r => r.priority === 'high').map(r => r.message),
    exportInfo: {
      processingTime: snapshot.metadata.processingTime,
      timestamp: snapshot.metadata.timestamp,
      exported: new Date().toISOString()
    }
  };
}

/**
 * Insights view - Deep dive into patterns and their implications
 */
function generateInsightsExport(snapshot) {
  const insights = [];
  
  // Pattern-based insights
  const highConfidencePatterns = snapshot.patterns.filter(p => p.confidence > 0.4);
  const uniquePatterns = [...new Set(snapshot.patterns.map(p => p.id))];
  
  insights.push({
    category: 'Pattern Analysis',
    title: 'High Confidence Patterns',
    data: highConfidencePatterns.map(p => ({
      pattern: formatPatternName(p.id),
      confidence: Math.round(p.confidence * 100),
      implication: getPatternImplication(p.id),
      segment: p.segmentId
    }))
  });
  
  // Trait-based insights
  const extremeTraits = Object.entries(snapshot.traits)
    .filter(([, data]) => data.value > 0.7 || data.value < 0.3);
    
  insights.push({
    category: 'Cognitive Profile',
    title: 'Notable Trait Patterns',
    data: extremeTraits.map(([trait, data]) => ({
      trait: formatTraitName(trait),
      value: Math.round(data.value * 100),
      interpretation: data.interpretation,
      impact: getTraitImpact(trait, data.value)
    }))
  });
  
  // Behavioral insights
  insights.push({
    category: 'Behavioral Analysis',
    title: 'Conversation Dynamics',
    data: {
      messagePattern: analyzeMessagePattern(snapshot.metadata.messageCount),
      segmentProgression: analyzeSegmentProgression(snapshot.segments),
      patternEvolution: analyzePatternEvolution(snapshot.patterns),
      styleConsistency: analyzeStyleConsistency(snapshot.patterns)
    }
  });
  
  return {
    insights,
    correlations: findPatternCorrelations(snapshot.patterns),
    recommendations: snapshot.recommendations.map(r => ({
      ...r,
      rationale: getRecommendationRationale(r, snapshot)
    })),
    metadata: {
      insightCount: insights.length,
      exported: new Date().toISOString()
    }
  };
}

// Helper functions for UI formatting

function calculateOverallConfidence(patterns) {
  if (patterns.length === 0) return 0;
  return patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
}

function formatPatternName(patternId) {
  return patternId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTraitName(traitKey) {
  const names = {
    decisionCompression: 'Decision Compression',
    riskDiscipline: 'Risk Discipline', 
    trustPriority: 'Trust Priority',
    structureExpectation: 'Structure Expectation'
  };
  return names[traitKey] || traitKey;
}

function getTraitColor(value) {
  if (value > 0.7) return '#22c55e'; // Green
  if (value > 0.4) return '#f59e0b'; // Yellow 
  return '#ef4444'; // Red
}

function getTraitIcon(trait) {
  const icons = {
    decisionCompression: '⚡',
    riskDiscipline: '🛡️',
    trustPriority: '🔒',
    structureExpectation: '📋'
  };
  return icons[trait] || '📊';
}

function getPatternDescription(patternId) {
  const descriptions = {
    'pivot-trigger-question': 'Asks clarifying questions before major decisions',
    'scope-compression': 'Prefers condensed, focused problem definitions',
    'next-step-authorization': 'Seeks explicit approval before proceeding',
    'local-first-principle': 'Prioritizes local/private solutions',
    'risk-surfacing': 'Actively identifies potential risks and concerns'
  };
  return descriptions[patternId] || 'Pattern detected in conversation flow';
}

function getPatternImplication(patternId) {
  const implications = {
    'pivot-trigger-question': 'Values thorough understanding before action',
    'scope-compression': 'Efficient communication style, focused outcomes',
    'next-step-authorization': 'Collaborative approach, seeks alignment',
    'local-first-principle': 'Privacy-conscious, prefers control',
    'risk-surfacing': 'Proactive risk management mindset'
  };
  return implications[patternId] || 'Contributes to overall conversation style';
}

function identifyDominantTheme(patterns) {
  const themes = patterns.map(p => p.id.split('-')[0]);
  const themeCount = themes.reduce((acc, theme) => {
    acc[theme] = (acc[theme] || 0) + 1;
    return acc;
  }, {});
  
  const dominantTheme = Object.entries(themeCount).sort(([,a], [,b]) => b - a)[0];
  return dominantTheme ? dominantTheme[0] : 'mixed';
}

function analyzePatternFlow(timeline) {
  return {
    progression: timeline.map(t => ({
      segment: t.segmentId,
      intensity: t.patterns.length,
      theme: t.dominantTheme
    })),
    trends: 'Analyzing pattern evolution across segments'
  };
}

function getTraitImpact(trait, value) {
  if (trait === 'decisionCompression' && value > 0.7) {
    return 'Prefers rapid decision cycles, may benefit from structured checkpoints';
  }
  if (trait === 'riskDiscipline' && value > 0.7) {
    return 'Strong risk awareness, thorough in threat assessment';
  }
  if (trait === 'trustPriority' && value > 0.7) {
    return 'High privacy standards, values data sovereignty';
  }
  if (trait === 'structureExpectation' && value > 0.7) {
    return 'Appreciates organized outputs and clear frameworks';
  }
  return 'Balanced trait expression';
}

function analyzeMessagePattern(messageCount) {
  if (messageCount < 4) return 'Concise exchange';
  if (messageCount < 8) return 'Standard conversation';
  return 'Extended dialogue';
}

function analyzeSegmentProgression(segments) {
  return `${segments.length} phases detected`;
}

function analyzePatternEvolution(patterns) {
  const bySegment = patterns.reduce((acc, p) => {
    const seg = p.segmentId || 'unknown';
    acc[seg] = (acc[seg] || 0) + 1;
    return acc;
  }, {});
  
  return Object.keys(bySegment).length > 1 ? 'Evolving across segments' : 'Consistent throughout';
}

function analyzeStyleConsistency(patterns) {
  const styles = patterns.map(p => p.id.split('-')[0]);
  const uniqueStyles = new Set(styles);
  return uniqueStyles.size < 3 ? 'Consistent style' : 'Varied approaches';
}

function findPatternCorrelations(patterns) {
  // Simple correlation analysis
  const correlations = [];
  const patternTypes = [...new Set(patterns.map(p => p.id))];
  
  for (let i = 0; i < patternTypes.length; i++) {
    for (let j = i + 1; j < patternTypes.length; j++) {
      const typeA = patternTypes[i];
      const typeB = patternTypes[j];
      const cooccurrence = patterns.filter(p => 
        patterns.some(p2 => p !== p2 && p.segmentId === p2.segmentId && 
                           ((p.id === typeA && p2.id === typeB) || 
                            (p.id === typeB && p2.id === typeA)))
      ).length;
      
      if (cooccurrence > 0) {
        correlations.push({
          patternA: formatPatternName(typeA),
          patternB: formatPatternName(typeB),
          strength: cooccurrence
        });
      }
    }
  }
  
  return correlations.slice(0, 3); // Top 3 correlations
}

function getRecommendationRationale(recommendation, snapshot) {
  const trait = recommendation.type;
  const traitData = snapshot.traits[trait];
  
  if (traitData) {
    return `Based on ${formatTraitName(trait)} score of ${Math.round(traitData.value * 100)}%`;
  }
  
  return 'Based on detected conversation patterns';
}

/**
 * Export conversation data in multiple UI formats
 * @param {Object} conversationData - Raw conversation with messages and segments
 * @param {Array} formats - Export formats to generate
 * @returns {Object} Multi-format export package
 */
function exportConversationUI(conversationData, formats = ['dashboard']) {
  // Generate snapshot first
  const patterns = runPatternExtraction(conversationData.messages, conversationData.segments);
  const traits = computeTraitVector(patterns);
  const snapshot = composeSnapshot({
    messages: conversationData.messages,
    segments: conversationData.segments,
    patterns,
    traits
  }, {
    processingTime: Date.now() - (conversationData.startTime || Date.now()),
    scoringSpecVersion: '0.1.0'
  });
  
  // Generate requested formats
  const exports = {};
  for (const format of formats) {
    exports[format] = generateUIExport(snapshot, format);
  }
  
  return {
    formats: exports,
    metadata: {
      exportedAt: new Date().toISOString(),
      formatsGenerated: formats,
      sourceSnapshot: snapshot.metadata
    }
  };
}

export { 
  generateUIExport, 
  exportConversationUI,
  generateDashboardExport,
  generateTimelineExport, 
  generateSummaryExport,
  generateInsightsExport
};