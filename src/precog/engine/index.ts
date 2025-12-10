// @version 3.3.477
/**
 * Precog Engine Index
 *
 * Exports all engine modules for AI processing and orchestration.
 * V3.3.352: Added Neural Learning Optimizer, Autonomous Evolution Engine, and Shadow Lab
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
export { default as MetaLearningEngine } from './meta-learning-engine.js';
export { default as TrainingCamp } from './training-camp.js';
export { default as HyperSpeedTrainingCamp } from './hyper-speed-training-camp.js';

// Execution
export { ValidatedExecutionFramework } from './validated-execution-framework.js';
export { default as ParallelProviderOrchestrator } from './parallel-provider-orchestrator.js';

// Phase 1: Smart Router (Real Dynamic Provider Ranking)
export {
  ProviderScorecard,
  initProviderScorecard,
  getProviderScorecard,
  type RequestMetric,
  type ProviderStats,
  type ScoringWeights,
} from './provider-scorecard.js';

export {
  SmartRouter,
  initSmartRouter,
  getSmartRouter,
  type SmartRouteOptions,
  type SmartRouteResult,
} from './smart-router.js';

// Phase 2: Self-Optimization (Runtime Config & Benchmarking)
export {
  RuntimeConfig,
  initRuntimeConfig,
  getRuntimeConfig,
  type RuntimeConfigData,
  type ProviderWeights,
  type ModelConfig,
  type ProviderConfig,
} from './runtime-config.js';

export {
  BenchmarkService,
  initBenchmarkService,
  getBenchmarkService,
  type BenchmarkResult,
  type BenchmarkRound,
} from './benchmark-service.js';

// Creativity
export { SerendipityInjector } from './serendipity-injector.js';

// Neural Router (Emergent Model Routing)
export {
  DynamicModelRegistry,
  dynamicModelRegistry,
  type ModelRecommendation,
  type RoutingPlan,
  type RecipeStep,
  type OutcomeData,
  type BudgetTier,
  type DomainType,
} from './model-registry-dynamic.js';

export {
  ModelChooser,
  modelChooser,
  type Intent,
  type ComplexityAnalysis,
  type ShadowTestResult,
  type ExecutionResult,
} from './model-chooser.js';

// Neural Learning Optimizer (Q-Learning based strategy selection)
export {
  NeuralLearningOptimizer,
  neuralLearningOptimizer,
  type LearningStrategy,
  type LearningState,
  type QTableEntry,
  type OptimizerConfig,
  type StrategyMapping,
} from './neural-learning-optimizer.js';

// Autonomous Evolution Engine (Self-optimization and evolutionary leaps)
export {
  AutonomousEvolutionEngine,
  autonomousEvolutionEngine,
  type PerformanceMetrics,
  type ProviderPerformance,
  type ImprovementOpportunity,
  type CodeModification,
  type EvolutionaryLeap,
  type InteractionRecord,
} from './autonomous-evolution-engine.js';

// Shadow Lab (Background challenger experiments)
export {
  ShadowLab,
  shadowLab,
  type ShadowExperiment,
  type ShadowLabConfig,
} from './shadow-lab.js';
