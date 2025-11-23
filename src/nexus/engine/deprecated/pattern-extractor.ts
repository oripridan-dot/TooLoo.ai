// @version 2.1.11
// Pattern Extraction Engine (P3) - MVP
// Consumes parsed messages and segments, emits pattern candidates with features
// Core steps: candidate lexer, windowed grouping, distinctiveness filter, feature emission

/**
 * Run pattern extraction on parsed messages and segments
 * @param {Array} messages - Parsed transcript messages
 * @param {Array} segments - Segmentation output
 * @param {Object} [options] - Configurable options (windowSize, patternDefs)
 * @returns {Array} patternCandidates - Array of pattern objects with features
 */
export function runPatternExtraction(messages, segments, options = {}) {
  // Default config
  const windowSize = options.windowSize || 4;
  const patternDefs = options.patternDefs || [
    { id: 'pivot-trigger-question', keywords: ['ceiling', 'right path', 'pivot', 'shift path', 'viability'], type: 'macro' },
    { id: 'risk-surfacing', keywords: ['risk', 'constraints', 'blocker', 'exposure', 'fragile', 'friction', 'Enumerating', 'Technical', 'Legal', 'UX', 'Data', 'launch blockers', 'categorize', 'categorization'], type: 'micro' },
    { id: 'scope-compression', keywords: ['condensed', 'pipeline', 'segment phases', 'micro patterns', 'profile', 'adaptive guidance', 'sequence', '→', 'plan', 'actionable', 'prioritized', 'mitigation'], type: 'macro' },
    { id: 'next-step-authorization', keywords: ['proceed', 'approved', 'green-light', 'go', 'good. proceed', 'yes. reflect', 'execute', 'step 1', 'start', 'authorization', 'approval', 'confirm'], type: 'micro' },
    { id: 'decision-shorthand-affirm', keywords: ['affirm', 'decide', 'decision', 'choose', 'shorthand', '1.y', '2.ok', '3.3.go', 'compressed', 'multi decision', 'priority', 'approval'], type: 'macro' },
    { id: 'option-framing-request', keywords: ['option', 'framing', 'request', 'Three levers', 'choices', 'tasks', 'Preference order', 'enumerates'], type: 'macro' },
    { id: 'local-first-principle', keywords: ['local-only', 'local first', 'privacy', 'no central', 'processing stays on your device', 'ephemeral', 'anonymized', 'opt-in', 'hashed'], type: 'macro' },
    { id: 'pattern-mining-invoke', keywords: ['pattern mining', 'mining', 'invoke'], type: 'micro' },
    { id: 'deliverable-framing-quad', keywords: ['deliverable', 'framing', 'quad', 'Outcome:', 'Tested:', 'Impact:', 'Next:'], type: 'macro' }
  ];

  // Candidate lexer: tokenize messages for pattern candidates
  const candidates = [];
  // Helper: map message index to segmentId
  function getSegmentIdForIndex(idx) {
    if (!segments || segments.length === 0) return null;
    for (const seg of segments) {
      // Find start/end indices for segment
      const startIdx = messages.findIndex(m => m.id === seg.startMessageId);
      const endIdx = messages.findIndex(m => m.id === seg.endMessageId);
      if (startIdx !== -1 && endIdx !== -1 && idx >= startIdx && idx <= endIdx) {
        return seg.id;
      }
    }
    return null;
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    for (const def of patternDefs) {
      for (const kw of def.keywords) {
        if (msg.content && msg.content.toLowerCase().includes(kw)) {
          candidates.push({
            patternId: def.id,
            type: def.type,
            messageIndex: i,
            segmentId: getSegmentIdForIndex(i),
            text: msg.content,
            timestamp: msg.ts || null
          });
        }
      }
    }
  }

  // Refined windowing: each candidate forms its own window
  const grouped = candidates.map(c => ({
    windowStart: c.messageIndex,
    windowEnd: c.messageIndex,
    patterns: [c.patternId],
    segmentId: c.segmentId,
    texts: [c.text]
  }));

  // Distinctiveness filter: filter out generic/common patterns
  const distinctPatterns = grouped.filter(g => {
    // Example: only keep windows with unique pattern combinations
    const uniquePatterns = [...new Set(g.patterns)];
    return uniquePatterns.length === g.patterns.length;
  });

  // Feature emission: dynamic scoring per spec
  const patternCandidates = grouped.map(g => {
    // Frequency: count of pattern in session
    const freq = candidates.filter(c => c.patternId === g.patterns[0]).length;
    // Recency: how recently pattern appeared (lower = more recent)
    const recency = messages.length - g.windowEnd;
    // Distinctiveness: overlap coefficient among patterns
    const patternSet = new Set(candidates.map(c => c.patternId));
    const overlap = candidates.filter(c => c.patternId === g.patterns[0]).length / patternSet.size;
    const distinctiveness = 1 - overlap;
    // Confidence: basic lexical match score (normalized)
    const F_lex = 1; // direct keyword match
    const F_freq = Math.log(1 + freq) / Math.log(1 + 6); // cap default 6
    const F_recency = Math.exp(-1.2 * (1 - g.windowEnd / messages.length));
    const baseConfidence = 0.22 * F_lex + 0.15 * F_freq + 0.12 * F_recency;
    const confidence = Math.min(1, Math.max(0, baseConfidence));
    return {
      patterns: g.patterns,
      segmentId: g.segmentId,
      windowStart: g.windowStart,
      windowEnd: g.windowEnd,
      texts: g.texts,
      features: {
        confidence,
        frequency: freq,
        recency,
        distinctiveness
      }
    };
  });

  return patternCandidates;
}

// No CommonJS export; ES module only