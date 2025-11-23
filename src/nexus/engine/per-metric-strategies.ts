// @version 2.1.28
/**
 * Per-Metric Strategies Engine (Phase 2B)
 * 
 * Implements intelligent per-metric adaptation strategies
 * that intelligently select and apply targeted boosts based on
 * each metric's current state and recent trend.
 * 
 * 16 strategies total (4 metrics × 4 strategies each)
 * Triggered by Phase 2A plateau predictions
 */

export default class PerMetricStrategies {
  constructor() {
    // Strategy definitions organized by metric
    this.strategies = {
      learningVelocity: this.getLearningVelocityStrategies(),
      adaptationSpeed: this.getAdaptationSpeedStrategies(),
      knowledgeRetention: this.getKnowledgeRetentionStrategies(),
      transferEfficiency: this.getTransferEfficiencyStrategies()
    };

    // Historical effectiveness tracking
    this.history = [];
    this.effectiveness = {};
  }

  /**
   * Learning Velocity Strategies
   * Governs the speed of skill acquisition
   */
  getLearningVelocityStrategies() {
    return {
      'focus-forward': {
        name: 'Focus-Forward',
        description: 'Aggressive learning pace push',
        conditions: { state: 'low', trend: 'improving' },
        boost: 0.15,
        confidence: 0.85,
        rationale: 'Already improving—accelerate momentum with focused learning'
      },

      'refresh-foundation': {
        name: 'Refresh-Foundation',
        description: 'Re-learn foundational concepts',
        conditions: { state: 'low', trend: 'declining' },
        boost: 0.25,
        confidence: 0.78,
        rationale: 'Declining trend suggests foundation issue—rebuild basics'
      },

      'momentum-sustain': {
        name: 'Momentum-Sustain',
        description: 'Light nudge to maintain trend',
        conditions: { state: 'medium', trend: 'improving' },
        boost: 0.10,
        confidence: 0.82,
        rationale: 'Maintain existing momentum with minimal intervention'
      },

      'flow-state': {
        name: 'Flow-State',
        description: 'Minimal intervention (avoid burnout)',
        conditions: { state: 'high', trend: 'any' },
        boost: 0.05,
        confidence: 0.88,
        rationale: 'High performance—maintain without overdoing'
      }
    };
  }

  /**
   * Knowledge Retention Strategies
   * Governs persistence of knowledge over time
   */
  getKnowledgeRetentionStrategies() {
    return {
      'spacing-intervals': {
        name: 'Spacing-Intervals',
        description: 'Spaced repetition with scientific intervals',
        conditions: { state: 'low', trend: 'declining' },
        boost: 0.20,
        confidence: 0.80,
        rationale: 'Declining retention needs spaced repetition to rebuild'
      },

      'elaboration-deep': {
        name: 'Elaboration-Deep',
        description: 'Deep processing of concepts',
        conditions: { state: 'low', trend: 'stable' },
        boost: 0.18,
        confidence: 0.76,
        rationale: 'Stable low retention—need deeper encoding'
      },

      'test-effect': {
        name: 'Test-Effect',
        description: 'Frequent retrieval practice',
        conditions: { state: 'medium', trend: 'any' },
        boost: 0.12,
        confidence: 0.84,
        rationale: 'Medium retention—retrieval practice enhances memory'
      },

      'consolidation-sleep': {
        name: 'Consolidation-Sleep',
        description: 'Memory consolidation phases',
        conditions: { state: 'high', trend: 'any' },
        boost: 0.08,
        confidence: 0.86,
        rationale: 'High retention—strategic consolidation pauses optimize'
      }
    };
  }

  /**
   * Adaptation Speed Strategies
   * Governs rate of strategy adjustment
   */
  getAdaptationSpeedStrategies() {
    return {
      'rapid-pivot': {
        name: 'Rapid-Pivot',
        description: 'Quick strategy switches',
        conditions: { state: 'low', trend: 'declining' },
        boost: 0.22,
        confidence: 0.77,
        rationale: 'Declining adaptation speed—enable rapid strategy pivots'
      },

      'micro-adjust': {
        name: 'Micro-Adjust',
        description: 'Small incremental tweaks',
        conditions: { state: 'low', trend: 'stable' },
        boost: 0.15,
        confidence: 0.79,
        rationale: 'Stable low speed—safe incremental adjustments'
      },

      'rhythm-sync': {
        name: 'Rhythm-Sync',
        description: 'Align with natural cycles',
        conditions: { state: 'medium', trend: 'improving' },
        boost: 0.12,
        confidence: 0.83,
        rationale: 'Improving speed—sync with natural learning rhythms'
      },

      'stabilize-peak': {
        name: 'Stabilize-Peak',
        description: 'Maintain stability',
        conditions: { state: 'high', trend: 'any' },
        boost: 0.08,
        confidence: 0.87,
        rationale: 'High speed—avoid rash decisions, maintain stability'
      }
    };
  }

  /**
   * Transfer Efficiency Strategies
   * Governs ability to apply knowledge in new contexts
   */
  getTransferEfficiencyStrategies() {
    return {
      'context-bridge': {
        name: 'Context-Bridge',
        description: 'Connect concepts across domains',
        conditions: { state: 'low', trend: 'declining' },
        boost: 0.20,
        confidence: 0.78,
        rationale: 'Declining transfer—build explicit domain bridges'
      },

      'analogy-build': {
        name: 'Analogy-Build',
        description: 'Use analogies to transfer knowledge',
        conditions: { state: 'low', trend: 'stable' },
        boost: 0.18,
        confidence: 0.75,
        rationale: 'Stable low transfer—analogies bootstrap connections'
      },

      'cross-domain': {
        name: 'Cross-Domain',
        description: 'Cross-domain application exercises',
        conditions: { state: 'medium', trend: 'any' },
        boost: 0.15,
        confidence: 0.81,
        rationale: 'Medium transfer—structured application practice'
      },

      'mastery-leverage': {
        name: 'Mastery-Leverage',
        description: 'Apply mastery to new domains',
        conditions: { state: 'high', trend: 'any' },
        boost: 0.08,
        confidence: 0.85,
        rationale: 'High transfer—leverage mastery for acceleration'
      }
    };
  }

  /**
   * Select the best strategy for a metric based on state & trend
   */
  selectStrategy(metric, state, trend) {
    const available = this.strategies[metric];
    if (!available) {
      return null;
    }

    // Score each strategy based on condition match
    const scored = Object.entries(available).map(([key, strategy]) => {
      let score = 0;

      // Match state condition
      if (strategy.conditions.state === state) {
        score += 100;
      } else if (strategy.conditions.state !== state && state !== 'unknown') {
        score -= 50; // Penalty for mismatch
      }

      // Match trend condition
      if (strategy.conditions.trend === 'any' || strategy.conditions.trend === trend) {
        score += 80;
      } else if (trend !== 'unknown') {
        score -= 30; // Penalty for mismatch
      }

      // Confidence bonus
      score += strategy.confidence * 50;

      return { key, strategy, score };
    });

    // Sort by score and return top strategy
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * Analyze metric state (low/medium/high)
   */
  analyzeMetricState(value) {
    if (value < 0.35) return 'low';
    if (value < 0.65) return 'medium';
    return 'high';
  }

  /**
   * Calculate trend direction from improvement deltas
   */
  calculateTrendDirection(deltas) {
    if (!deltas || deltas.length < 3) return 'unknown';

    // Get recent vs previous averages
    const recent = deltas.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const threshold = deltas.slice(-6, -3).length > 0
      ? deltas.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
      : 0;

    // Determine trend
    if (recent > threshold + 0.02) return 'improving';
    if (recent < threshold - 0.02) return 'declining';
    return 'stable';
  }

  /**
   * Apply strategies to all metrics
   * Returns results with before/after values for each metric
   */
  applyStrategies(metrics, trends) {
    const results = {};

    for (const [metricName, currentValue] of Object.entries(metrics)) {
      if (!this.strategies[metricName]) continue;

      const trend = trends[metricName] || 'unknown';
      const state = this.analyzeMetricState(currentValue);

      // Select best strategy
      const selected = this.selectStrategy(metricName, state, trend);

      if (selected) {
        const boost = selected.strategy.boost;
        const afterValue = Math.min(1.0, Math.max(0.0, currentValue + boost));

        results[metricName] = {
          strategy: selected.key,
          strategyName: selected.strategy.name,
          before: currentValue,
          boost,
          after: afterValue,
          state,
          trend,
          rationale: selected.strategy.rationale,
          confidence: selected.strategy.confidence
        };

        // Track effectiveness
        this.trackEffectiveness(selected.key, metricName, boost, afterValue - currentValue);
      }
    }

    // Store history
    this.history.push({
      timestamp: new Date().toISOString(),
      results,
      totalBoost: Object.values(results).reduce((sum, r) => sum + r.boost, 0)
    });

    return results;
  }

  /**
   * Track strategy effectiveness over time
   */
  trackEffectiveness(strategy, metric, boost, delta) {
    const key = `${metric}:${strategy}`;
    if (!this.effectiveness[key]) {
      this.effectiveness[key] = {
        usageCount: 0,
        totalBoost: 0,
        totalDelta: 0,
        lastUsed: null
      };
    }

    this.effectiveness[key].usageCount += 1;
    this.effectiveness[key].totalBoost += boost;
    this.effectiveness[key].totalDelta += delta;
    this.effectiveness[key].lastUsed = new Date().toISOString();
  }

  /**
   * Get effectiveness summary
   */
  getEffectivenessSummary() {
    const summary = {};

    for (const [key, data] of Object.entries(this.effectiveness)) {
      const avgDelta = data.totalDelta / data.usageCount;
      summary[key] = {
        ...data,
        averageDelta: avgDelta,
        efficiency: avgDelta / (data.totalBoost / data.usageCount) // delta per unit boost
      };
    }

    return summary;
  }

  /**
   * Get history of applications
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  /**
   * Get recent effectiveness (last N applications)
   */
  getRecentEffectiveness(window = 10) {
    const recent = this.history.slice(-window);
    
    const summary = {
      applicationsCount: recent.length,
      totalBoostApplied: recent.reduce((sum, h) => sum + h.totalBoost, 0),
      averageBoostPerApplication: 0,
      strategiesUsed: {}
    };

    if (recent.length > 0) {
      summary.averageBoostPerApplication = summary.totalBoostApplied / recent.length;
      
      // Count strategy usage
      for (const h of recent) {
        for (const [metric, result] of Object.entries(h.results)) {
          const key = result.strategy;
          summary.strategiesUsed[key] = (summary.strategiesUsed[key] || 0) + 1;
        }
      }
    }

    return summary;
  }

  /**
   * Clear history (for reset scenarios)
   */
  clearHistory() {
    this.history = [];
    this.effectiveness = {};
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      history: this.history,
      effectiveness: this.effectiveness
    };
  }

  /**
   * Import state from persistence
   */
  importState(state) {
    if (state.history) this.history = state.history;
    if (state.effectiveness) this.effectiveness = state.effectiveness;
  }
}
