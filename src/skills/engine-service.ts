/**
 * @file Skill Engine Service
 * @description Bridges skill execution to native engines
 * @version 1.3.0
 * @skill-os true
 *
 * This service provides the integration layer between YAML-defined skills
 * and the native engines (Learning, Evolution, Emergence, Routing).
 *
 * Skills access engines via context.services.engines, but this service
 * provides higher-level abstractions for common operations.
 */

import type { KernelContext, EngineServices } from '../kernel/types.js';
import type { LearningState, LearningAction } from '@tooloo/skills';

// =============================================================================
// TYPES
// =============================================================================

export interface FeedbackInput {
  /** Type of feedback */
  type: 'positive' | 'negative' | 'rating' | 'implicit';
  /** Feedback value: 1/-1 for thumbs, 1-5 for rating, custom for implicit */
  value: number;
  /** Session ID for context */
  sessionId: string;
  /** Skill that generated the response */
  skillId: string;
  /** Provider used */
  provider?: string;
  /** Task context */
  taskType?: string;
  /** Complexity level */
  complexity?: 'low' | 'medium' | 'high';
  /** Strategy used */
  strategy?: 'direct' | 'chain_of_thought' | 'few_shot' | 'decompose';
}

export interface FeedbackResult {
  success: boolean;
  rewardValue: number;
  newQValue?: number;
  message: string;
}

export interface LearningStatus {
  enabled: boolean;
  explorationRate: number;
  totalRewards: number;
  positiveRewards: number;
  negativeRewards: number;
  qTableSize: number;
  averageReward: number;
  topStrategies: Array<{
    state: string;
    action: string;
    qValue: number;
  }>;
}

export interface ABTestRequest {
  skillId: string;
  name: string;
  strategyA: string;
  strategyB: string;
  minSamples?: number;
}

export interface PatternSummary {
  totalPatterns: number;
  totalSynergies: number;
  activeGoals: number;
  recentPatterns: Array<{
    name: string;
    frequency: number;
    confidence: number;
  }>;
  topSynergies: Array<{
    skillA: string;
    skillB: string;
    score: number;
  }>;
}

// =============================================================================
// FEEDBACK CONVERSION
// =============================================================================

/**
 * Convert user feedback to reward value (-1 to +1)
 */
export function feedbackToReward(input: FeedbackInput): number {
  switch (input.type) {
    case 'positive':
      return 1.0;
    case 'negative':
      return -1.0;
    case 'rating':
      // Convert 1-5 rating to -1 to +1
      return (input.value - 3) / 2;
    case 'implicit':
      // Pass through implicit values directly
      // copy: +0.3, follow-up: +0.2, regenerate: -0.5, abandon: -0.3
      return Math.max(-1, Math.min(1, input.value));
    default:
      return 0;
  }
}

/**
 * Build learning state from feedback context
 */
export function buildLearningState(input: FeedbackInput): LearningState {
  return {
    taskType: input.taskType ?? 'general',
    complexity: input.complexity ?? 'medium',
    context: input.skillId,
    provider: input.provider,
  };
}

/**
 * Build learning action from feedback context
 */
export function buildLearningAction(input: FeedbackInput): LearningAction {
  return {
    provider: input.provider ?? 'unknown',
    temperature: 0.7, // Default, could be tracked
    strategy: input.strategy ?? 'direct',
  };
}

// =============================================================================
// SKILL ENGINE SERVICE
// =============================================================================

export class SkillEngineService {
  private engines: EngineServices;
  private sessionId: string;

  constructor(context: KernelContext) {
    this.engines = context.services.engines;
    this.sessionId = context.sessionId;
  }

  // ---------------------------------------------------------------------------
  // Learning Engine Operations
  // ---------------------------------------------------------------------------

  /**
   * Record user feedback and update Q-learning
   */
  async recordFeedback(input: FeedbackInput): Promise<FeedbackResult> {
    const rewardValue = feedbackToReward(input);
    const state = buildLearningState(input);
    const action = buildLearningAction(input);

    try {
      const reward = await this.engines.learning.recordReward({
        sessionId: input.sessionId,
        value: rewardValue,
        source: input.type === 'implicit' ? 'implicit' : 'explicit',
        context: state,
        action: action,
      });

      // Get updated Q-value
      const newQValue = this.engines.learning.getQValue(state, action);

      return {
        success: true,
        rewardValue: reward.value,
        newQValue,
        message: `Recorded ${input.type} feedback (reward: ${rewardValue.toFixed(2)})`,
      };
    } catch (error) {
      return {
        success: false,
        rewardValue: 0,
        message: `Failed to record feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get optimal action for a given state
   */
  async getOptimalStrategy(
    taskType: string,
    complexity: 'low' | 'medium' | 'high',
    skillId: string,
    availableProviders: string[]
  ): Promise<LearningAction> {
    const state: LearningState = {
      taskType,
      complexity,
      context: skillId,
    };

    // Build available actions from providers
    const availableActions: LearningAction[] = availableProviders.flatMap((provider) => [
      { provider, temperature: 0.3, strategy: 'direct' as const },
      { provider, temperature: 0.7, strategy: 'chain_of_thought' as const },
      { provider, temperature: 0.5, strategy: 'few_shot' as const },
    ]);

    return this.engines.learning.getOptimalAction(state, availableActions);
  }

  /**
   * Get learning status and metrics
   */
  getLearningStatus(): LearningStatus {
    const metrics = this.engines.learning.getMetrics();
    const qTable = this.engines.learning.getQTable();

    // Sort by Q-value to get top strategies
    const sortedEntries = qTable
      .filter((entry) => entry.qValue > 0)
      .sort((a, b) => b.qValue - a.qValue)
      .slice(0, 10);

    return {
      enabled: true, // Could track paused state
      explorationRate: metrics.explorationRate,
      totalRewards: metrics.totalRewards,
      positiveRewards: metrics.positiveRewards,
      negativeRewards: metrics.negativeRewards,
      qTableSize: metrics.qTableSize,
      averageReward: metrics.averageReward,
      topStrategies: sortedEntries.map((entry) => ({
        state: entry.stateKey,
        action: entry.actionKey,
        qValue: entry.qValue,
      })),
    };
  }

  /**
   * Pause/resume learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.engines.learning.setLearningEnabled(enabled);
  }

  // ---------------------------------------------------------------------------
  // Evolution Engine Operations
  // ---------------------------------------------------------------------------

  /**
   * Start an A/B test for a skill
   */
  async startABTest(request: ABTestRequest): Promise<string> {
    const test = await this.engines.evolution.startABTest({
      name: request.name,
      skillId: request.skillId,
      strategyA: request.strategyA,
      strategyB: request.strategyB,
      status: 'running',
      minSamples: request.minSamples ?? 30,
    });
    return test.id;
  }

  /**
   * Record a sample for an A/B test
   */
  async recordABSample(
    testId: string,
    strategy: 'A' | 'B',
    result: { success: boolean; quality: number; latency: number }
  ): Promise<void> {
    await this.engines.evolution.recordSample(testId, strategy, result);
  }

  /**
   * Get champion prompt strategy for a skill
   */
  getChampionStrategy(skillId: string): { template: string; successRate: number } | null {
    const champion = this.engines.evolution.getChampion(skillId);
    if (!champion) return null;

    return {
      template: champion.template,
      successRate: champion.successRate,
    };
  }

  /**
   * Get evolution metrics
   */
  getEvolutionStatus() {
    return this.engines.evolution.getMetrics();
  }

  // ---------------------------------------------------------------------------
  // Emergence Engine Operations
  // ---------------------------------------------------------------------------

  /**
   * Record a skill execution for pattern detection
   */
  async recordExecution(skillId: string, success: boolean, context?: Record<string, unknown>): Promise<void> {
    await this.engines.emergence.recordExecution(skillId, context ?? {}, success);
  }

  /**
   * Detect patterns from recent executions
   * Returns the detected patterns
   */
  detectPatterns(): Array<{
    id: string;
    type: string;
    frequency: number;
    significance: number;
  }> {
    const patterns = this.engines.emergence.getPatterns();
    return patterns.map((p) => ({
      id: p.name,
      type: 'sequence', // Default type since Pattern doesn't have a type field
      frequency: p.frequency,
      significance: p.confidence,
    }));
  }

  /**
   * Calculate synergies between skills
   * Returns the calculated synergies
   */
  calculateSynergies(): Array<{
    skillA: string;
    skillB: string;
    synergy: number;
    description: string;
  }> {
    const synergies = this.engines.emergence.getSynergies();
    return synergies.map((s) => ({
      skillA: s.skillA,
      skillB: s.skillB,
      synergy: s.synergyScore,
      description: `Synergy score: ${(s.synergyScore * 100).toFixed(0)}%, ${s.interactions} interactions`,
    }));
  }

  /**
   * Generate emergent goals
   */
  async generateGoals(): Promise<Array<{ id: string; title: string; priority: number }>> {
    const goals = await this.engines.emergence.generateGoals();
    return goals.map((g) => ({
      id: g.id,
      title: g.title,
      priority: g.priority,
    }));
  }

  /**
   * Get emergence summary
   */
  getEmergenceSummary(): PatternSummary {
    const patterns = this.engines.emergence.getPatterns();
    const synergies = this.engines.emergence.getSynergies();
    const goals = this.engines.emergence.getGoals().filter((g) => g.status === 'active');

    return {
      totalPatterns: patterns.length,
      totalSynergies: synergies.length,
      activeGoals: goals.length,
      recentPatterns: patterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5)
        .map((p) => ({
          name: p.name,
          frequency: p.frequency,
          confidence: p.confidence,
        })),
      topSynergies: synergies
        .sort((a, b) => b.synergyScore - a.synergyScore)
        .slice(0, 5)
        .map((s) => ({
          skillA: s.skillA,
          skillB: s.skillB,
          score: s.synergyScore,
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // Routing Engine Operations
  // ---------------------------------------------------------------------------

  /**
   * Get recommended provider for a request
   */
  getRecommendedProvider(
    taskType: string,
    _requirements?: { minContext?: number; capabilities?: string[] }
  ): { provider: string; model: string; reason: string } {
    const result = this.engines.routing.decideRoute(taskType);

    return {
      provider: result.selectedProvider,
      model: result.selectedModel,
      reason: result.reason,
    };
  }

  /**
   * Update provider health
   */
  updateProviderHealth(
    providerId: string,
    health: { isHealthy?: boolean; latency?: number; errorCount?: number }
  ): void {
    this.engines.routing.updateHealth(providerId, health);
  }

  /**
   * Get routing status
   */
  getRoutingStatus() {
    return this.engines.routing.getMetrics();
  }

  // ---------------------------------------------------------------------------
  // Aggregate Operations
  // ---------------------------------------------------------------------------

  /**
   * Get overall engine health
   */
  getEngineHealth(): {
    healthy: boolean;
    engines: {
      learning: boolean;
      evolution: boolean;
      emergence: boolean;
      routing: boolean;
    };
  } {
    return {
      healthy: this.engines.isHealthy(),
      engines: {
        learning: this.engines.learning.isHealthy(),
        evolution: this.engines.evolution.isHealthy(),
        emergence: this.engines.emergence.isHealthy(),
        routing: this.engines.routing.isHealthy(),
      },
    };
  }

  /**
   * Get all engine metrics
   */
  getAllMetrics() {
    return this.engines.getMetrics();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SkillEngineService from kernel context
 */
export function createSkillEngineService(context: KernelContext): SkillEngineService {
  return new SkillEngineService(context);
}
