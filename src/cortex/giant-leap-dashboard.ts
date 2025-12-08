// @version 1.0.0
/**
 * GiantLeapDashboard: Visualization & Monitoring
 * 
 * Aggregates metrics from all Giant Leap systems to provide a unified view
 * of Tooloo's evolution.
 * 
 * @module cortex/giant-leap-dashboard
 */

import { worldPipeline } from './knowledge/world-pipeline.js';
import { adversarialLearner } from './learning/adversarial-learner.js';
import { emergenceCatalyst } from './emergence/catalyst.js';
import { metaLearner } from './cognition/meta-learner.js';
import { giantLeapOrchestrator } from './giant-leap-orchestrator.js';

export interface GiantLeapMetrics {
  knowledge: {
    sources: number;
    itemsIngested: number;
    lastUpdate: Date | null;
  };
  learning: {
    velocity: number;
    trend: string;
    adversarialExercises: number;
    vulnerabilitiesFound: number;
  };
  emergence: {
    syntheses: number;
    predictions: number;
    activeGoals: number;
  };
  synergy: {
    activeLoops: string[];
    status: boolean;
  };
  timestamp: Date;
}

export class GiantLeapDashboard {
  private static instance: GiantLeapDashboard;

  private constructor() {}

  static getInstance(): GiantLeapDashboard {
    if (!GiantLeapDashboard.instance) {
      GiantLeapDashboard.instance = new GiantLeapDashboard();
    }
    return GiantLeapDashboard.instance;
  }

  public getMetrics(): GiantLeapMetrics {
    const pipelineStats = worldPipeline.getStats();
    const learningVelocity = metaLearner.getLearningVelocity();
    // Accessing private state via public methods if available, or inferring
    // For prototype, we'll assume we can get these or add getters later
    // Adding getters to the classes would be cleaner, but for now we construct:
    
    return {
      knowledge: {
        sources: pipelineStats.totalSources,
        itemsIngested: pipelineStats.itemsIngested,
        lastUpdate: pipelineStats.lastIngestion
      },
      learning: {
        velocity: learningVelocity.current,
        trend: learningVelocity.trend,
        adversarialExercises: 0, // Placeholder until getter added
        vulnerabilitiesFound: 0
      },
      emergence: {
        syntheses: 0, // Placeholder
        predictions: 0,
        activeGoals: 0
      },
      synergy: {
        activeLoops: giantLeapOrchestrator.getStatus().loops,
        status: giantLeapOrchestrator.getStatus().active
      },
      timestamp: new Date()
    };
  }

  public generateReport(): string {
    const metrics = this.getMetrics();
    return `
# 🚀 Giant Leap Status Report
*${metrics.timestamp.toISOString()}*

## 🧠 Knowledge Amplification
- **Active Sources:** ${metrics.knowledge.sources}
- **Items Ingested:** ${metrics.knowledge.itemsIngested}

## 🎓 Learning Revolution
- **Velocity:** ${(metrics.learning.velocity * 100).toFixed(1)}% (${metrics.learning.trend})
- **Adversarial Exercises:** ${metrics.learning.adversarialExercises}

## ✨ Emergence Catalyst
- **Syntheses:** ${metrics.emergence.syntheses}
- **Predictions:** ${metrics.emergence.predictions}
- **Active Goals:** ${metrics.emergence.activeGoals}

## 🔄 Synergy
- **Status:** ${metrics.synergy.status ? 'Active' : 'Inactive'}
- **Loops:**
${metrics.synergy.activeLoops.map(l => `  - ${l}`).join('\n')}
    `;
  }
}

export const giantLeapDashboard = GiantLeapDashboard.getInstance();
