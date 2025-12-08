// @version 1.0.0
/**
 * GiantLeapOrchestrator: Synergistic Integration
 * 
 * The "glue" that connects the three prongs of the Giant Leap strategy:
 * 1. Knowledge Amplification (WorldPipeline)
 * 2. Learning Revolution (AdversarialLearner, MetaLearner)
 * 3. Emergence Catalyst (EmergenceCatalyst)
 * 
 * Creates a virtuous cycle where:
 * - New Knowledge -> Triggers Forecasts
 * - Forecasts -> Trigger Red Teaming (Scenario Planning)
 * - Red Teaming Gaps -> Trigger Targeted Knowledge Ingestion
 * - Synthesis -> Becomes New Learning Strategy
 * 
 * @module cortex/giant-leap-orchestrator
 */

import { bus } from '../core/event-bus.js';
import { worldPipeline } from './knowledge/world-pipeline.js';
import { adversarialLearner } from './learning/adversarial-learner.js';
import { emergenceCatalyst } from './emergence/catalyst.js';
import { metaLearner } from './cognition/meta-learner.js';
import { systemExecutionHub } from './agent/system-hub.js';

export class GiantLeapOrchestrator {
  private static instance: GiantLeapOrchestrator;
  private isRunning: boolean = false;

  private constructor() {
    this.setupSynergies();
  }

  static getInstance(): GiantLeapOrchestrator {
    if (!GiantLeapOrchestrator.instance) {
      GiantLeapOrchestrator.instance = new GiantLeapOrchestrator();
    }
    return GiantLeapOrchestrator.instance;
  }

  private setupSynergies() {
    console.log('[GiantLeap] Initializing synergistic loops...');

    // 1. Knowledge -> Foresight Loop
    // When new knowledge arrives, check if it impacts future trends
    bus.on('knowledge:ingestion_completed', async (event) => {
      const { sourceId, itemsCount } = event.payload;
      if (itemsCount > 0) {
        console.log(`[GiantLeap] New knowledge from ${sourceId}. Triggering foresight...`);
        // Trigger a forecast update based on new data
        await emergenceCatalyst.generateForecast(`Trends from ${sourceId}`);
      }
    });

    // 2. Foresight -> Red Teaming Loop (Scenario Planning)
    // When a prediction is made, red team it to see if we are prepared
    bus.on('emergence:forecast_generated', async (event) => {
      const { prediction } = event.payload;
      console.log(`[GiantLeap] Forecast generated: ${prediction.topic}. Triggering Red Team scenario...`);
      
      // Create a scenario where this prediction comes true negatively
      await adversarialLearner.triggerExercise(`Scenario: ${prediction.forecast}`);
    });

    // 3. Learning Gap -> Knowledge Acquisition & Execution Loop
    // When the learner finds a gap, tell the pipeline to find info on it AND try to fix it
    bus.on('learning:gap_detected', async (event) => {
      const { description, severity } = event.payload;
      console.log(`[GiantLeap] Gap detected: ${description}. Requesting knowledge and fix...`);
      
      // 3a. Knowledge Acquisition
      const sources = worldPipeline.getSources();
      if (sources.length > 0 && sources[0]) {
        await worldPipeline.forceIngest(sources[0].id);
      }

      // 3b. Execution (Self-Correction)
      if (severity === 'high' || severity === 'critical') {
        await systemExecutionHub.submitRequest({
            source: 'growth',
            type: 'fix',
            prompt: `Fix detected vulnerability: ${description}`,
            priority: 'high',
            options: {
                autoApprove: false, // Safety first
                saveArtifacts: true
            }
        });
      }
    });

    // 4. Synthesis -> Strategy & Implementation Loop
    // When a novel concept is synthesized, see if it can be a learning strategy AND implement it
    bus.on('emergence:synthesis_created', async (event) => {
      const { result } = event.payload;
      console.log(`[GiantLeap] Novel synthesis: ${result.novelConcept}. Evaluating as strategy...`);
      
      // 4a. Feed into MetaLearner
      // metaLearner.evaluateNewStrategy(result);

      // 4b. Implementation Experiment
      if (result.feasibilityScore > 0.7) {
          await systemExecutionHub.submitRequest({
              source: 'emergence',
              type: 'analyze', // Start with research/prototyping
              prompt: `Explore and prototype novel concept: ${result.novelConcept}. Description: ${result.description}`,
              priority: 'normal'
          });
      }
    });

    this.isRunning = true;
    console.log('[GiantLeap] Synergistic loops active. The flywheel is spinning.');
  }

  public getStatus() {
    return {
      active: this.isRunning,
      loops: [
        'Knowledge -> Foresight',
        'Foresight -> Red Teaming',
        'Gap -> Knowledge',
        'Synthesis -> Strategy'
      ]
    };
  }
}

export const giantLeapOrchestrator = GiantLeapOrchestrator.getInstance();
