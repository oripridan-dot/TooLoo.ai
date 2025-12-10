// @version 3.3.472
/**
 * Shadow Lab
 *
 * A background experimentation service that listens to user requests and
 * runs challenger models in parallel to discover better routing strategies.
 *
 * When a user sends a prompt:
 * 1. Main thread answers with the chosen model (e.g., Claude Sonnet)
 * 2. Shadow Lab triggers a parallel test with a challenger (e.g., DeepSeek)
 * 3. A lightweight judge (e.g., GPT-4o-mini) compares the results
 * 4. If challenger wins, it updates the NeuralLearningOptimizer weights
 *
 * @module precog/engine/shadow-lab
 */

import { bus } from '../../core/event-bus.js';
import { ProviderEngine } from '../provider-engine.js';
import {
  NeuralLearningOptimizer,
  neuralLearningOptimizer,
  LearningStrategy,
} from './neural-learning-optimizer.js';
import {
  AutonomousEvolutionEngine,
  autonomousEvolutionEngine,
} from './autonomous-evolution-engine.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ShadowExperiment {
  id: string;
  originalIntent: {
    prompt: string;
    domain: string;
    sessionId?: string;
  };
  primary: {
    model: string;
    response?: string;
    latency?: number;
    quality?: number;
    cost?: number;
  };
  challenger: {
    model: string;
    response?: string;
    latency?: number;
    quality?: number;
    cost?: number;
  };
  judgment?: {
    winner: 'primary' | 'challenger' | 'tie';
    reason: string;
    confidence: number;
    judgeModel: string;
  };
  status: 'pending' | 'running' | 'judging' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
}

export interface ShadowLabConfig {
  enabled: boolean;
  experimentRate: number; // Probability of running experiment (0-1)
  maxConcurrent: number; // Max simultaneous experiments
  judgeModel: string; // Model to use for judging
  minPromptLength: number; // Minimum prompt length to experiment on
  cooldownMs: number; // Time between experiments
}

// ============================================================================
// SHADOW LAB CLASS
// ============================================================================

export class ShadowLab {
  private config: ShadowLabConfig;
  private providerEngine: ProviderEngine;
  private optimizer: NeuralLearningOptimizer;
  private evolutionEngine: AutonomousEvolutionEngine;

  private experiments: ShadowExperiment[];
  private runningExperiments: Set<string>;
  private lastExperimentTime: number;

  // Challenger selection weights (updated based on wins)
  private challengerWeights: Record<string, number> = {
    deepseek: 1.0, // Fast and cheap
    gemini: 0.8, // Good alternative
    huggingface: 0.5, // Experimental
    anthropic: 0.7, // When primary isn't anthropic
    openai: 0.6, // When primary isn't openai
  };

  constructor(config?: Partial<ShadowLabConfig>) {
    this.config = {
      enabled: true,
      experimentRate: 0.15, // 15% of requests get shadow tested
      maxConcurrent: 3,
      judgeModel: 'gemini', // Fast and cheap judge
      minPromptLength: 50,
      cooldownMs: 5000, // 5 second cooldown
      ...config,
    };

    this.providerEngine = new ProviderEngine();
    this.optimizer = neuralLearningOptimizer;
    this.evolutionEngine = autonomousEvolutionEngine;

    this.experiments = [];
    this.runningExperiments = new Set();
    this.lastExperimentTime = 0;

    console.log('[ShadowLab] 🧪 Shadow experimentation lab initialized');
    console.log(
      `[ShadowLab] Experiment rate: ${this.config.experimentRate * 100}%, Max concurrent: ${this.config.maxConcurrent}`
    );

    // Subscribe to intent bus
    this.subscribeToIntentBus();
  }

  // ==========================================================================
  // EVENT SUBSCRIPTION
  // ==========================================================================

  /**
   * Subscribe to the intent/routing bus to intercept requests
   */
  private subscribeToIntentBus(): void {
    // Listen for routing decisions
    bus.on('precog', (event, data) => {
      if (event === 'routing:plan') {
        this.onRoutingPlan(data);
      }
    });

    // Listen for chat completions (to get primary response)
    bus.on('nexus', (event, data) => {
      if (event === 'chat:complete') {
        this.onChatComplete(data);
      }
    });
  }

  /**
   * Handle routing plan event
   */
  private onRoutingPlan(data: {
    plan: { model: string; type: string };
    features: string[];
    complexity: string;
    requestId?: string;
  }): void {
    // Decide if we should run shadow experiment
    if (!this.shouldExperiment(data)) return;

    // We'll set up the experiment but wait for the primary response
    console.log(`[ShadowLab] 🎯 Preparing shadow experiment for request ${data.requestId}`);
  }

  /**
   * Handle chat completion event
   */
  private onChatComplete(data: {
    requestId: string;
    prompt: string;
    response: string;
    provider: string;
    latency: number;
    domain?: string;
  }): void {
    // Check if we should experiment on this
    if (!this.config.enabled) return;
    if (data.prompt.length < this.config.minPromptLength) return;
    if (this.runningExperiments.size >= this.config.maxConcurrent) return;
    if (Date.now() - this.lastExperimentTime < this.config.cooldownMs) return;
    if (Math.random() > this.config.experimentRate) return;

    // Run shadow experiment in background
    this.runExperiment({
      prompt: data.prompt,
      domain: data.domain || 'general',
      sessionId: data.requestId,
      primaryModel: data.provider,
      primaryResponse: data.response,
      primaryLatency: data.latency,
    }).catch((err) => {
      console.error('[ShadowLab] Experiment failed:', err);
    });
  }

  // ==========================================================================
  // EXPERIMENTATION
  // ==========================================================================

  /**
   * Decide if we should run an experiment
   */
  private shouldExperiment(data: any): boolean {
    if (!this.config.enabled) return false;
    if (this.runningExperiments.size >= this.config.maxConcurrent) return false;
    if (Date.now() - this.lastExperimentTime < this.config.cooldownMs) return false;
    return Math.random() < this.config.experimentRate;
  }

  /**
   * Run a shadow experiment
   */
  async runExperiment(params: {
    prompt: string;
    domain: string;
    sessionId?: string;
    primaryModel: string;
    primaryResponse: string;
    primaryLatency: number;
  }): Promise<ShadowExperiment> {
    const experimentId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.runningExperiments.add(experimentId);
    this.lastExperimentTime = Date.now();

    // Select challenger (different from primary)
    const challenger = this.selectChallenger(params.primaryModel);
    if (!challenger) {
      this.runningExperiments.delete(experimentId);
      throw new Error('No suitable challenger found');
    }

    const experiment: ShadowExperiment = {
      id: experimentId,
      originalIntent: {
        prompt: params.prompt,
        domain: params.domain,
        sessionId: params.sessionId,
      },
      primary: {
        model: params.primaryModel,
        response: params.primaryResponse,
        latency: params.primaryLatency,
        quality: this.estimateQuality(params.primaryResponse),
      },
      challenger: {
        model: challenger,
      },
      status: 'running',
      startedAt: Date.now(),
    };

    this.experiments.push(experiment);

    console.log(
      `[ShadowLab] 🧪 Running experiment ${experimentId}: ${params.primaryModel} vs ${challenger}`
    );

    try {
      // Run challenger in background
      const startTime = Date.now();
      const challengerResult = await this.runChallenger(params.prompt, challenger, params.domain);

      experiment.challenger = {
        model: challenger,
        response: challengerResult.content,
        latency: Date.now() - startTime,
        quality: this.estimateQuality(challengerResult.content),
        cost: challengerResult.cost_usd,
      };

      // Judge the results
      experiment.status = 'judging';
      const judgment = await this.judgeResults(experiment);
      experiment.judgment = judgment;

      // Complete experiment
      experiment.status = 'completed';
      experiment.completedAt = Date.now();

      // Process results
      this.processExperimentResults(experiment);

      console.log(
        `[ShadowLab] ✅ Experiment ${experimentId} complete: Winner = ${judgment.winner}`
      );

      return experiment;
    } catch (error) {
      experiment.status = 'failed';
      experiment.completedAt = Date.now();
      console.error(`[ShadowLab] ❌ Experiment ${experimentId} failed:`, error);
      throw error;
    } finally {
      this.runningExperiments.delete(experimentId);
    }
  }

  /**
   * Select a challenger model
   */
  private selectChallenger(primaryModel: string): string | null {
    // Filter out primary model
    const candidates = Object.entries(this.challengerWeights)
      .filter(([model]) => model !== primaryModel)
      .filter(([model]) => this.isModelAvailable(model));

    if (candidates.length === 0) return null;

    // Weighted random selection
    const totalWeight = candidates.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [model, weight] of candidates) {
      random -= weight;
      if (random <= 0) return model;
    }

    const first = candidates[0];
    return first ? first[0] : null;
  }

  /**
   * Check if a model is available
   */
  private isModelAvailable(model: string): boolean {
    const providerStatus = this.providerEngine.getProviderStatus();
    return providerStatus.some((p) => p.id.startsWith(model) && p.status !== 'Missing Key');
  }

  /**
   * Run the challenger model
   */
  private async runChallenger(
    prompt: string,
    model: string,
    domain: string
  ): Promise<{
    content: string;
    cost_usd: number;
  }> {
    const result = await this.providerEngine.generate({
      prompt,
      provider: model,
      taskType: domain,
      sessionId: `shadow-lab-${Date.now()}`,
    });

    return {
      content: result.content,
      cost_usd: result.cost_usd || 0,
    };
  }

  // ==========================================================================
  // JUDGING
  // ==========================================================================

  /**
   * Judge which response is better
   */
  private async judgeResults(experiment: ShadowExperiment): Promise<{
    winner: 'primary' | 'challenger' | 'tie';
    reason: string;
    confidence: number;
    judgeModel: string;
  }> {
    // First, try quick heuristic comparison
    const heuristicJudgment = this.quickHeuristicJudge(experiment);

    // If heuristic is confident enough, use it
    if (heuristicJudgment.confidence > 0.7) {
      return {
        ...heuristicJudgment,
        judgeModel: 'heuristic',
      };
    }

    // Otherwise, use LLM judge
    try {
      return await this.llmJudge(experiment);
    } catch {
      // Fallback to heuristic if LLM judge fails
      return {
        ...heuristicJudgment,
        judgeModel: 'heuristic-fallback',
      };
    }
  }

  /**
   * Quick heuristic-based judgment
   */
  private quickHeuristicJudge(experiment: ShadowExperiment): {
    winner: 'primary' | 'challenger' | 'tie';
    reason: string;
    confidence: number;
  } {
    const primary = experiment.primary;
    const challenger = experiment.challenger;

    // Calculate composite scores
    const primaryScore =
      (primary.quality || 0.5) * 0.5 +
      (1 - (primary.latency || 2000) / 10000) * 0.3 +
      (1 - (primary.cost || 0.01) / 0.1) * 0.2;

    const challengerScore =
      (challenger.quality || 0.5) * 0.5 +
      (1 - (challenger.latency || 2000) / 10000) * 0.3 +
      (1 - (challenger.cost || 0.01) / 0.1) * 0.2;

    const diff = challengerScore - primaryScore;

    if (diff > 0.15) {
      return {
        winner: 'challenger',
        reason: `Challenger scored ${(challengerScore * 100).toFixed(1)}% vs ${(primaryScore * 100).toFixed(1)}% for primary (quality + speed + cost)`,
        confidence: Math.min(0.9, 0.5 + diff),
      };
    }

    if (diff < -0.15) {
      return {
        winner: 'primary',
        reason: `Primary scored ${(primaryScore * 100).toFixed(1)}% vs ${(challengerScore * 100).toFixed(1)}% for challenger`,
        confidence: Math.min(0.9, 0.5 - diff),
      };
    }

    return {
      winner: 'tie',
      reason: `Scores too close: primary ${(primaryScore * 100).toFixed(1)}% vs challenger ${(challengerScore * 100).toFixed(1)}%`,
      confidence: 0.6,
    };
  }

  /**
   * LLM-based judgment for more nuanced comparison
   */
  private async llmJudge(experiment: ShadowExperiment): Promise<{
    winner: 'primary' | 'challenger' | 'tie';
    reason: string;
    confidence: number;
    judgeModel: string;
  }> {
    const judgePrompt = `You are an expert AI response evaluator. Compare these two AI responses to the same prompt.

ORIGINAL PROMPT:
${experiment.originalIntent.prompt.slice(0, 500)}

RESPONSE A (${experiment.primary.model}):
${(experiment.primary.response || '').slice(0, 1000)}

RESPONSE B (${experiment.challenger.model}):
${(experiment.challenger.response || '').slice(0, 1000)}

Evaluate on:
1. Accuracy and correctness
2. Completeness
3. Clarity and formatting
4. Relevance to the prompt

Which response is better? Reply with ONLY a JSON object:
{"winner": "A" | "B" | "TIE", "reason": "brief explanation", "confidence": 0.0-1.0}`;

    try {
      const result = await this.providerEngine.generate({
        prompt: judgePrompt,
        provider: this.config.judgeModel,
        taskType: 'analysis',
        sessionId: `shadow-lab-judge-${Date.now()}`,
      });

      // Parse JSON response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          winner: parsed.winner === 'A' ? 'primary' : parsed.winner === 'B' ? 'challenger' : 'tie',
          reason: parsed.reason || 'LLM judgment',
          confidence: parsed.confidence || 0.7,
          judgeModel: this.config.judgeModel,
        };
      }
    } catch (error) {
      console.error('[ShadowLab] LLM judge error:', error);
    }

    // Default fallback
    return {
      winner: 'tie',
      reason: 'Could not determine winner',
      confidence: 0.5,
      judgeModel: this.config.judgeModel,
    };
  }

  /**
   * Estimate response quality using heuristics
   */
  private estimateQuality(content: string): number {
    if (!content) return 0;

    let score = 0.5;

    // Length (reasonable range)
    if (content.length > 100) score += 0.1;
    if (content.length > 500) score += 0.1;
    if (content.length > 3000) score -= 0.05; // Might be too verbose

    // Structure
    if (content.includes('\n')) score += 0.05;
    if (content.includes('```')) score += 0.1; // Code blocks
    if (/^\d+\.|^-\s/m.test(content)) score += 0.05; // Lists

    // Quality indicators
    if (/example|for instance|specifically/i.test(content)) score += 0.05;
    if (/however|although|alternatively/i.test(content)) score += 0.05;

    // Error indicators
    if (/error|sorry|cannot|unable to/i.test(content)) score -= 0.1;

    return Math.min(1, Math.max(0, score));
  }

  // ==========================================================================
  // RESULTS PROCESSING
  // ==========================================================================

  /**
   * Process experiment results and update systems
   */
  private processExperimentResults(experiment: ShadowExperiment): void {
    if (!experiment.judgment) return;

    const { winner, confidence } = experiment.judgment;

    // Update challenger weights based on results
    if (winner === 'challenger' && confidence > 0.6) {
      // Increase challenger weight
      const challengerModel = experiment.challenger.model;
      const currentChallengerWeight = this.challengerWeights[challengerModel];
      this.challengerWeights[challengerModel] =
        (currentChallengerWeight !== undefined ? currentChallengerWeight : 0.5) * 1.1;

      // Decrease primary weight slightly
      const primaryModel = experiment.primary.model;
      const currentPrimaryWeight = this.challengerWeights[primaryModel];
      if (currentPrimaryWeight !== undefined) {
        this.challengerWeights[primaryModel] = currentPrimaryWeight * 0.95;
      }

      // Feed to optimizer
      this.optimizer.recordInteraction({
        strategy: 'random_exploration', // Shadow testing is exploration
        model: experiment.challenger.model,
        domain: experiment.originalIntent.domain,
        success: true,
        quality: experiment.challenger.quality || 0.7,
        latency: experiment.challenger.latency || 2000,
        cost: experiment.challenger.cost || 0.01,
      });

      // Feed to evolution engine
      this.evolutionEngine.recordInteraction({
        provider: experiment.challenger.model,
        promptType: experiment.originalIntent.domain,
        success: true,
        latency: experiment.challenger.latency || 2000,
        cost: experiment.challenger.cost || 0.01,
        quality: experiment.challenger.quality || 0.7,
        domain: experiment.originalIntent.domain,
      });

      // Emit challenger win event
      const winReason = experiment.judgment?.reason || 'challenger outperformed';
      bus.publish('precog', 'shadow-test:challenger-won', {
        champion: experiment.primary.model,
        challenger: experiment.challenger.model,
        reason: winReason,
        domain: experiment.originalIntent.domain,
        experimentId: experiment.id,
      });

      console.log(
        `[ShadowLab] 🏆 Challenger ${experiment.challenger.model} won! Updating weights.`
      );
    } else if (winner === 'primary') {
      // Primary won - reinforce primary
      this.optimizer.recordInteraction({
        strategy: 'efficiency', // Primary route worked
        model: experiment.primary.model,
        domain: experiment.originalIntent.domain,
        success: true,
        quality: experiment.primary.quality || 0.7,
        latency: experiment.primary.latency || 2000,
        cost: experiment.primary.cost || 0.01,
      });
    }
  }

  // ==========================================================================
  // MANUAL EXPERIMENTATION
  // ==========================================================================

  /**
   * Manually run a shadow experiment
   */
  async manualExperiment(params: {
    prompt: string;
    domain?: string;
    primaryModel?: string;
    challengerModel?: string;
  }): Promise<ShadowExperiment> {
    const primary = params.primaryModel || 'gemini';
    const challenger = params.challengerModel || this.selectChallenger(primary) || 'deepseek';

    // Get primary response
    const startPrimary = Date.now();
    const primaryResult = await this.providerEngine.generate({
      prompt: params.prompt,
      provider: primary,
      taskType: params.domain,
      sessionId: `shadow-lab-manual-${Date.now()}`,
    });

    return this.runExperiment({
      prompt: params.prompt,
      domain: params.domain || 'general',
      primaryModel: primary,
      primaryResponse: primaryResult.content,
      primaryLatency: Date.now() - startPrimary,
    });
  }

  // ==========================================================================
  // CONVENIENCE API FOR CHAT INTEGRATION
  // ==========================================================================

  /**
   * maybeRunExperiment - Convenience method for chat integration
   *
   * Called from chat.ts after each response. Decides whether to run an experiment
   * based on experiment rate and cooldown. Returns immediately if no experiment runs.
   *
   * @returns null if no experiment, or experiment result with challenger outcome
   */
  async maybeRunExperiment(params: {
    prompt: string;
    context: { sessionId?: string; taskType?: string; features?: string[] };
    primaryProvider: string;
    primaryResult: {
      response: string;
      latency: number;
      cost: number;
      quality: number;
    };
  }): Promise<{
    ran: boolean;
    experimentId?: string;
    challenger?: string;
    challengerWon?: boolean;
    judgment?: {
      winner: 'primary' | 'challenger' | 'tie';
      reason: string;
      confidence: number;
    };
  } | null> {
    // Check if we should run experiment
    if (!this.config.enabled) return { ran: false };
    if (params.prompt.length < this.config.minPromptLength) return { ran: false };
    if (this.runningExperiments.size >= this.config.maxConcurrent) return { ran: false };
    if (Date.now() - this.lastExperimentTime < this.config.cooldownMs) return { ran: false };
    if (Math.random() > this.config.experimentRate) return { ran: false };

    // Run experiment
    try {
      const experiment = await this.runExperiment({
        prompt: params.prompt,
        domain: params.context.taskType || 'general',
        sessionId: params.context.sessionId,
        primaryModel: params.primaryProvider,
        primaryResponse: params.primaryResult.response,
        primaryLatency: params.primaryResult.latency,
      });

      return {
        ran: true,
        experimentId: experiment.id,
        challenger: experiment.challenger.model,
        challengerWon: experiment.judgment?.winner === 'challenger',
        judgment: experiment.judgment
          ? {
              winner: experiment.judgment.winner,
              reason: experiment.judgment.reason,
              confidence: experiment.judgment.confidence,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[ShadowLab] maybeRunExperiment failed:', error);
      return { ran: false };
    }
  }

  // ==========================================================================
  // STATUS & CONFIGURATION
  // ==========================================================================

  /**
   * Get lab status
   */
  getStatus(): {
    enabled: boolean;
    config: ShadowLabConfig;
    runningCount: number;
    totalExperiments: number;
    recentResults: Array<{
      id: string;
      winner: string;
      models: string;
      domain: string;
      timestamp: number;
    }>;
    challengerWeights: Record<string, number>;
  } {
    const completed = this.experiments.filter((e) => e.status === 'completed');

    return {
      enabled: this.config.enabled,
      config: this.config,
      runningCount: this.runningExperiments.size,
      totalExperiments: this.experiments.length,
      recentResults: completed.slice(-10).map((e) => ({
        id: e.id,
        winner: e.judgment?.winner || 'unknown',
        models: `${e.primary.model} vs ${e.challenger.model}`,
        domain: e.originalIntent.domain,
        timestamp: e.completedAt || e.startedAt,
      })),
      challengerWeights: { ...this.challengerWeights },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ShadowLabConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[ShadowLab] Configuration updated:', this.config);
  }

  /**
   * Enable/disable shadow lab
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[ShadowLab] ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
}

// Export singleton instance
export const shadowLab = new ShadowLab();

export default ShadowLab;
