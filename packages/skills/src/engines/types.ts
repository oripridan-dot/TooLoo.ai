/**
 * @file Native Skills OS Engine Types
 * @description Type definitions for native engines that replace legacy bridges
 * @version 1.2.1
 * @skill-os true
 *
 * These are NATIVE engines built specifically for Skills OS.
 * They do NOT depend on any legacy src/cortex or src/precog code.
 */

import { z } from 'zod';

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Base interface for all native engines
 */
export interface NativeEngine {
  /** Unique engine identifier */
  readonly id: string;

  /** Engine version */
  readonly version: string;

  /** Initialize the engine */
  initialize(): Promise<void>;

  /** Shutdown the engine */
  shutdown(): Promise<void>;

  /** Health check */
  isHealthy(): boolean;

  /** Get engine statistics */
  getStats(): EngineStats;
}

export interface EngineStats {
  operationCount: number;
  successCount: number;
  errorCount: number;
  lastOperationAt: Date | null;
  uptime: number;
}

// =============================================================================
// LEARNING ENGINE TYPES
// =============================================================================

/**
 * Learning engine state and action types
 */
export interface LearningState {
  taskType: string;
  complexity: 'low' | 'medium' | 'high';
  context: string;
  provider?: string;
}

export interface LearningAction {
  provider: string;
  temperature: number;
  strategy: 'direct' | 'chain_of_thought' | 'few_shot' | 'decompose';
}

export interface Reward {
  id: string;
  sessionId: string;
  timestamp: Date;
  value: number; // -1 to 1
  source: 'explicit' | 'implicit' | 'system';
  context: LearningState;
  action: LearningAction;
}

export interface QTableEntry {
  stateKey: string;
  actionKey: string;
  qValue: number;
  visitCount: number;
  lastUpdated: Date;
}

export interface LearningPolicy {
  explorationRate: number; // epsilon (0-1)
  learningRate: number; // alpha (0-1)
  discountFactor: number; // gamma (0-1)
  minExplorationRate: number;
  explorationDecay: number;
}

export interface LearningEngineConfig {
  policy?: LearningPolicy;
  persistPath?: string;
  autoSaveInterval?: number;
  // Convenience shorthand properties (alternative to policy object)
  learningRate?: number;
  discountFactor?: number;
  epsilon?: number;
  epsilonDecay?: number;
  minEpsilon?: number;
}

/**
 * Learning Engine Interface
 */
export interface ILearningEngine extends NativeEngine {
  /** Record a reward/feedback for a state-action pair */
  recordReward(reward: Omit<Reward, 'id' | 'timestamp'>): Promise<Reward>;

  /** Get optimal action for a state (exploration vs exploitation) */
  getOptimalAction(state: LearningState, availableActions: LearningAction[]): Promise<LearningAction>;

  /** Get Q-value for a state-action pair */
  getQValue(state: LearningState, action: LearningAction): number;

  /** Get all Q-table entries */
  getQTable(): QTableEntry[];

  /** Get learning metrics */
  getMetrics(): LearningMetrics;

  /** Pause/resume learning */
  setLearningEnabled(enabled: boolean): void;
}

export interface LearningMetrics {
  totalRewards: number;
  positiveRewards: number;
  negativeRewards: number;
  averageReward: number;
  explorationRate: number;
  learningVelocity: number;
  qTableSize: number;
}

// =============================================================================
// EVOLUTION ENGINE TYPES
// =============================================================================

/**
 * Prompt strategy for A/B testing
 */
export interface PromptStrategy {
  id: string;
  name: string;
  template: string;
  skillId: string;
  usageCount: number;
  successRate: number;
  avgQuality: number;
  avgLatency: number;
  isChampion: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  parentId?: string;
  mutation?: string;
}

/**
 * A/B Test definition
 */
export interface ABTest {
  id: string;
  name: string;
  skillId: string;
  strategyA: string;
  strategyB: string;
  status: 'running' | 'completed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  resultsA: TestResults;
  resultsB: TestResults;
  winner?: 'A' | 'B' | 'tie';
  confidence: number;
  minSamples: number;
}

export interface TestResults {
  samples: number;
  successes: number;
  totalQuality: number;
  totalLatency: number;
}

/**
 * Improvement goal
 */
export interface ImprovementGoal {
  id: string;
  skillId: string;
  metric: 'successRate' | 'quality' | 'latency' | 'costEfficiency';
  targetValue: number;
  currentValue: number;
  deadline?: Date;
  status: 'active' | 'achieved' | 'failed' | 'abandoned';
  createdAt: Date;
  progress: number;
}

export interface EvolutionEngineConfig {
  minSamplesForDecision?: number;
  confidenceThreshold?: number;
  maxConcurrentTests?: number;
  persistPath?: string;
  // Convenience shorthand properties
  populationSize?: number;
  mutationRate?: number;
  eliteCount?: number;
  maxGenerations?: number;
}

/**
 * Evolution Engine Interface
 */
export interface IEvolutionEngine extends NativeEngine {
  /** Create a new prompt strategy */
  createStrategy(strategy: Omit<PromptStrategy, 'id' | 'createdAt' | 'lastUsedAt'>): Promise<PromptStrategy>;

  /** Mutate an existing strategy */
  mutateStrategy(strategyId: string, mutation: string): Promise<PromptStrategy>;

  /** Get champion strategy for a skill */
  getChampion(skillId: string): PromptStrategy | null;

  /** Start an A/B test */
  startABTest(test: Omit<ABTest, 'id' | 'startedAt' | 'resultsA' | 'resultsB' | 'confidence'>): Promise<ABTest>;

  /** Record a test sample */
  recordSample(testId: string, strategy: 'A' | 'B', result: { success: boolean; quality: number; latency: number }): Promise<void>;

  /** Get test status and results */
  getTestResults(testId: string): ABTest | null;

  /** Complete a test and declare winner */
  completeTest(testId: string): Promise<ABTest>;

  /** Set an improvement goal */
  setGoal(goal: Omit<ImprovementGoal, 'id' | 'createdAt' | 'currentValue' | 'progress'>): Promise<ImprovementGoal>;

  /** Update goal progress */
  updateGoalProgress(goalId: string, currentValue: number): Promise<ImprovementGoal>;

  /** Get all active goals */
  getActiveGoals(): ImprovementGoal[];

  /** Get evolution metrics */
  getMetrics(): EvolutionMetrics;
}

export interface EvolutionMetrics {
  totalStrategies: number;
  activeTests: number;
  completedTests: number;
  improvementsDeployed: number;
  activeGoals: number;
  achievedGoals: number;
}

// =============================================================================
// EMERGENCE ENGINE TYPES
// =============================================================================

/**
 * Emergence signal types
 */
export type EmergenceType = 'pattern' | 'synergy' | 'anomaly' | 'breakthrough' | 'insight';

export interface EmergenceSignal {
  id: string;
  type: EmergenceType;
  source: string;
  strength: number; // 0-1
  description: string;
  relatedSkills: string[];
  timestamp: Date;
  exploited: boolean;
}

/**
 * Pattern detected across skill executions
 */
export interface Pattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  skills: string[];
  triggers: string[];
  createdAt: Date;
  lastSeenAt: Date;
}

/**
 * Synergy between skills
 */
export interface SkillSynergy {
  id: string;
  skillA: string;
  skillB: string;
  synergyScore: number; // 0-1
  combinedSuccessRate: number;
  interactions: number;
  discoveredAt: Date;
}

/**
 * Emergent goal generated from patterns
 */
export interface EmergentGoal {
  id: string;
  title: string;
  description: string;
  priority: number; // 1-10
  sourcePattern?: string;
  sourceSynergy?: string;
  status: 'proposed' | 'active' | 'completed' | 'rejected';
  createdAt: Date;
}

export interface EmergenceEngineConfig {
  patternThreshold?: number;
  synergyThreshold?: number;
  maxActiveGoals?: number;
  persistPath?: string;
  // Convenience shorthand properties
  maxPatterns?: number;
  maxSynergies?: number;
}

/**
 * Emergence Engine Interface
 */
export interface IEmergenceEngine extends NativeEngine {
  /** Record a skill execution for pattern analysis */
  recordExecution(skillId: string, context: Record<string, unknown>, success: boolean): Promise<void>;

  /** Detect patterns in recent executions */
  detectPatterns(): Promise<Pattern[]>;

  /** Calculate synergy between skills */
  calculateSynergies(): Promise<SkillSynergy[]>;

  /** Generate emergent goals from patterns */
  generateGoals(): Promise<EmergentGoal[]>;

  /** Emit an emergence signal */
  emitSignal(signal: Omit<EmergenceSignal, 'id' | 'timestamp' | 'exploited'>): Promise<EmergenceSignal>;

  /** Get recent emergence signals */
  getSignals(limit?: number): EmergenceSignal[];

  /** Get all detected patterns */
  getPatterns(): Pattern[];

  /** Get skill synergies */
  getSynergies(): SkillSynergy[];

  /** Get proposed/active goals */
  getGoals(): EmergentGoal[];

  /** Accept or reject a goal */
  updateGoalStatus(goalId: string, status: EmergentGoal['status']): Promise<EmergentGoal>;

  /** Get emergence metrics */
  getMetrics(): EmergenceMetrics;
}

export interface EmergenceMetrics {
  totalSignals: number;
  signalCount: number;
  patternsDetected: number;
  totalPatterns: number;
  synergiesFound: number;
  totalSynergies: number;
  goalsGenerated: number;
  goalsCompleted: number;
  activeGoals: number;
}

// =============================================================================
// ROUTING ENGINE TYPES
// =============================================================================

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: string;
  name: string;
  apiKeyEnv: string;
  models: string[];
  defaultModel: string;
  maxTokens: number;
  costPer1kTokens: number;
  priority: number;
  enabled: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  successRate: number;
  lastChecked: Date;
  errorCount: number;
}

/**
 * Routing decision
 */
export interface RouteDecision {
  id: string;
  selectedProvider: string;
  selectedModel: string;
  reason: string;
  fallbackOrder: string[];
  timestamp: Date;
}

/**
 * Route result
 */
export interface RouteResult {
  provider: string;
  model: string;
  response: string;
  success: boolean;
  latency: number;
  tokens?: number;
  cost?: number;
  attempts: RouteAttempt[];
}

export interface RouteAttempt {
  provider: string;
  success: boolean;
  latency: number;
  error?: string;
}

export interface RoutingEngineConfig {
  providers?: ProviderConfig[];
  defaultTimeout?: number;
  maxRetries?: number;
  healthCheckInterval?: number;
  // Convenience shorthand properties
  persistPath?: string;
  defaultProvider?: string;
  fallbackChain?: string[];
  healthCheckIntervalMs?: number;
}

/**
 * Routing Engine Interface
 */
export interface IRoutingEngine extends NativeEngine {
  /** Route a request to the best provider */
  route(prompt: string, options?: RouteOptions): Promise<RouteResult>;

  /** Get provider health status */
  getProviderHealth(providerId: string): ProviderHealth | null;

  /** Get all provider health statuses */
  getAllHealth(): ProviderHealth[];

  /** Update provider health */
  updateHealth(providerId: string, health: Partial<ProviderHealth>): void;

  /** Get routing decision without executing */
  decideRoute(taskType?: string): RouteDecision;

  /** Get routing metrics */
  getMetrics(): RoutingMetrics;

  /** Enable/disable a provider */
  setProviderEnabled(providerId: string, enabled: boolean): void;

  /** Get available providers */
  getProviders(): ProviderConfig[];
}

export interface RouteOptions {
  taskType?: string;
  preferredProvider?: string;
  excludeProviders?: string[];
  maxTokens?: number;
  timeout?: number;
  system?: string;
}

export interface RoutingMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  averageLatency: number;
  providerUsage: Record<string, number>;
  fallbackCount: number;
  successRate: number;
  healthyProviders: number;
}

// =============================================================================
// ENGINE SERVICES (Exposed to Skills)
// =============================================================================

/**
 * Engine services available to skills via context.services.engines
 */
export interface EngineServices {
  learning: ILearningEngine;
  evolution: IEvolutionEngine;
  emergence: IEmergenceEngine;
  routing: IRoutingEngine;
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const LearningStateSchema = z.object({
  taskType: z.string(),
  complexity: z.enum(['low', 'medium', 'high']),
  context: z.string(),
  provider: z.string().optional(),
});

export const LearningActionSchema = z.object({
  provider: z.string(),
  temperature: z.number().min(0).max(2),
  strategy: z.enum(['direct', 'chain_of_thought', 'few_shot', 'decompose']),
});

export const RewardSchema = z.object({
  sessionId: z.string(),
  value: z.number().min(-1).max(1),
  source: z.enum(['explicit', 'implicit', 'system']),
  context: LearningStateSchema,
  action: LearningActionSchema,
});
