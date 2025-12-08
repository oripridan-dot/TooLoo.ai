// @version 3.3.350
/**
 * Precog Engine Index
 *
 * Exports all engine modules for AI processing and orchestration.
 * @module precog/engine
 */

// Cost and optimization
export { CostCalculator } from './cost-calculator.js';

// Data enrichment
export { DataEnrichmentPipeline, dataEnrichment } from './data-enrichment.js';
export type {
  EnrichmentSource,
  EnrichmentContext,
  EnrichedRequest,
  EnrichedResponse,
  ContextChunk,
  EnrichmentMetadata,
  Citation,
  ResponseMetadata,
} from './data-enrichment.js';

// Learning and training
export { MetaLearningEngine } from './meta-learning-engine.js';
export { TrainingCamp } from './training-camp.js';
export { HyperSpeedTrainingCamp } from './hyper-speed-training-camp.js';

// Execution
export { ValidatedExecutionFramework } from './validated-execution-framework.js';
export { ParallelProviderOrchestrator } from './parallel-provider-orchestrator.js';

// Creativity
export { SerendipityInjector } from './serendipity-injector.js';
