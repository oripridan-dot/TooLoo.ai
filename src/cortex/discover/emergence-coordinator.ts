// @version 2.2.649
/**
 * EmergenceCoordinator
 * Master orchestration layer for TooLoo's emergence and learning systems.
 *
 * Connects and coordinates:
 * - EmergenceAmplifier: Signal detection and amplification
 * - CuriosityEngine: Multi-dimensional intrinsic motivation
 * - ExplorationEngine (Lab): Hypothesis testing
 * - ReinforcementLearner: RL-based learning
 * - SerendipityState: Controlled randomness discoveries
 *
 * Key capabilities:
 * - Closed-loop emergence amplification (detection → exploration → learning)
 * - Global learning controls (pause, resume, budget management)
 * - Adaptive exploration based on emergence signals
 * - Safety-aware emergence amplification
 * - Cross-system coordination and feedback
 */

import { bus } from '../../core/event-bus.js';
import { EmergenceAmplifier, EmergenceSignature, EmergenceEvent } from './emergence-amplifier.js';
import {
  CuriosityEngine,
  CuriositySignal,
  CuriosityDimensions,
} from '../exploration/curiosity-engine.js';
import { ExplorationEngine, ExplorationHypothesis } from '../exploration/lab.js';
import { ReinforcementLearner, LearningMetrics } from '../learning/reinforcement-learner.js';
import { safetyPolicy, RiskLevel, ActionType } from '../../core/safety/safety-policy.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type EmergenceResponseLevel = 'observe' | 'cautious' | 'moderate' | 'amplify' | 'surge';

export interface EmergenceCoordinatorPolicy {
  // Global learning controls
  learningEnabled: boolean;
  maxDailyLearningBudget: number; // Total learning operations per day
  maxHourlyBudget: number; // Burst protection

  // Emergence response thresholds
  observeThreshold: number; // Below this: observe only
  cautiousThreshold: number; // Careful exploration
  moderateThreshold: number; // Standard exploration
  amplifyThreshold: number; // Aggressive exploration
  surgeThreshold: number; // Maximum amplification

  // Safety integration
  requireSafetyCheck: boolean;
  maxEmergenceRiskLevel: RiskLevel;
  pauseOnSafetyViolation: boolean;

  // Feedback loops
  emergenceLearningBoost: number; // Multiplier for learning rate during emergence
  curiosityExplorationTrigger: number; // Curiosity score to trigger exploration
  crossSystemFeedbackEnabled: boolean;

  // Timing
  coordinationIntervalMs: number; // Main loop interval
  emergenceTimeoutMs: number; // Max time for emergence response
}

export interface LearningBudget {
  daily: { used: number; limit: number; resetAt: Date };
  hourly: { used: number; limit: number; resetAt: Date };
}

export interface CoordinationState {
  status: 'active' | 'paused' | 'limited' | 'emergency_stop';
  pauseReason?: string;
  activeEmergenceResponses: number;
  pendingCuriositySignals: CuriositySignal[];
  recentEmergences: EmergenceEvent[];
  learningBudget: LearningBudget;
  lastCoordinationCycle: Date;
  systemHealth: SystemHealth;
}

export interface SystemHealth {
  emergenceAmplifier: 'healthy' | 'degraded' | 'offline';
  curiosityEngine: 'healthy' | 'degraded' | 'offline';
  explorationEngine: 'healthy' | 'degraded' | 'offline';
  reinforcementLearner: 'healthy' | 'degraded' | 'offline';
  overallHealth: number; // 0-1
}

export interface EmergenceResponse {
  id: string;
  emergenceId: string;
  responseLevel: EmergenceResponseLevel;
  actions: EmergenceAction[];
  safetyAssessment: EmergenceSafetyAssessment;
  startedAt: Date;
  completedAt?: Date;
  outcome?: EmergenceOutcome;
}

export interface EmergenceAction {
  type:
    | 'boost_exploration'
    | 'trigger_hypothesis'
    | 'amplify_learning'
    | 'inject_curiosity'
    | 'broadcast_signal';
  target: string;
  parameters: Record<string, unknown>;
  executed: boolean;
  result?: unknown;
}

export interface EmergenceSafetyAssessment {
  riskLevel: RiskLevel;
  approved: boolean;
  constraints: string[];
  reasoning: string;
}

export interface EmergenceOutcome {
  success: boolean;
  learningGain: number;
  newHypotheses: number;
  artifactsCreated: number;
  knowledgeIntegrated: boolean;
}

export interface IntrinsicReward {
  type: 'information_gain' | 'empowerment' | 'progress' | 'novelty' | 'competence';
  value: number;
  source: string;
  context: Record<string, unknown>;
}

export interface CoordinatorMetrics {
  totalEmergenceResponses: number;
  successfulResponses: number;
  averageLearningGain: number;
  budgetUtilization: number;
  emergenceToLearningConversion: number;
  crossSystemSynergies: number;
  safetyInterventions: number;
}

// ============================================================================
// EMERGENCE COORDINATOR
// ============================================================================

export class EmergenceCoordinator {
  private static instance: EmergenceCoordinator;

  private emergenceAmplifier: EmergenceAmplifier;
  private curiosityEngine?: CuriosityEngine;
  private explorationEngine?: ExplorationEngine;
  private reinforcementLearner: ReinforcementLearner;

  private policy: EmergenceCoordinatorPolicy;
  private state: CoordinationState;
  private metrics: CoordinatorMetrics;
  private activeResponses: Map<string, EmergenceResponse> = new Map();
  private intrinsicRewardBuffer: IntrinsicReward[] = [];

  private dataDir: string;
  private stateFile: string;

  private coordinationInterval?: NodeJS.Timeout;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'emergence-coordinator');
    this.stateFile = path.join(this.dataDir, 'coordinator-state.json');

    // Get singleton instances
    this.emergenceAmplifier = EmergenceAmplifier.getInstance();
    this.reinforcementLearner = ReinforcementLearner.getInstance();

    // Default policy
    this.policy = {
      learningEnabled: true,
      maxDailyLearningBudget: 1000,
      maxHourlyBudget: 100,

      observeThreshold: 0.3,
      cautiousThreshold: 0.5,
      moderateThreshold: 0.65,
      amplifyThreshold: 0.8,
      surgeThreshold: 0.95,

      requireSafetyCheck: true,
      maxEmergenceRiskLevel: RiskLevel.MEDIUM,
      pauseOnSafetyViolation: true,

      emergenceLearningBoost: 1.5,
      curiosityExplorationTrigger: 0.7,
      crossSystemFeedbackEnabled: true,

      coordinationIntervalMs: 15000, // 15 seconds
      emergenceTimeoutMs: 300000, // 5 minutes
    };

    // Initialize state
    const now = new Date();
    this.state = {
      status: 'active',
      activeEmergenceResponses: 0,
      pendingCuriositySignals: [],
      recentEmergences: [],
      learningBudget: {
        daily: {
          used: 0,
          limit: this.policy.maxDailyLearningBudget,
          resetAt: this.getNextMidnight(),
        },
        hourly: { used: 0, limit: this.policy.maxHourlyBudget, resetAt: this.getNextHour() },
      },
      lastCoordinationCycle: now,
      systemHealth: {
        emergenceAmplifier: 'healthy',
        curiosityEngine: 'healthy',
        explorationEngine: 'healthy',
        reinforcementLearner: 'healthy',
        overallHealth: 1.0,
      },
    };

    this.metrics = {
      totalEmergenceResponses: 0,
      successfulResponses: 0,
      averageLearningGain: 0,
      budgetUtilization: 0,
      emergenceToLearningConversion: 0,
      crossSystemSynergies: 0,
      safetyInterventions: 0,
    };

    this.setupListeners();
  }

  static getInstance(): EmergenceCoordinator {
    if (!EmergenceCoordinator.instance) {
      EmergenceCoordinator.instance = new EmergenceCoordinator();
    }
    return EmergenceCoordinator.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(
    curiosityEngine?: CuriosityEngine,
    explorationEngine?: ExplorationEngine
  ): Promise<void> {
    console.log('[EmergenceCoordinator] Initializing cross-system coordination...');

    this.curiosityEngine = curiosityEngine;
    this.explorationEngine = explorationEngine;

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    // Update health status
    this.updateSystemHealth();

    // Start coordination loop
    this.startCoordinationLoop();

    bus.publish('cortex', 'coordinator:initialized', {
      policy: this.policy,
      state: this.getStateSnapshot(),
      systemHealth: this.state.systemHealth,
      timestamp: new Date().toISOString(),
    });

    console.log('[EmergenceCoordinator] Ready - Coordinating emergence across systems');
  }

  private setupListeners(): void {
    // Listen for emergence events from EmergenceAmplifier
    bus.on('emergence:detected', (event) => {
      this.handleEmergenceDetected(
        event.payload as EmergenceEvent & { strength: number; confidence: number }
      );
    });

    // Listen for curiosity signals from CuriosityEngine
    bus.on('curiosity:signal_generated', (event) => {
      this.handleCuriositySignal(event.payload as CuriositySignal);
    });

    // Listen for exploration results from Lab
    bus.on('exploration:hypothesis_validated', (event) => {
      this.handleExplorationResult(event.payload as ExplorationHypothesis);
    });

    // Listen for learning events from ReinforcementLearner
    bus.on('learning:significant_signal', (event) => {
      this.handleLearningSignal(
        event.payload as { value: number; context: Record<string, unknown> }
      );
    });

    // Listen for safety events
    bus.on('safety:violation_detected', (event) => {
      this.handleSafetyViolation(event.payload as { severity: string; reason: string });
    });

    // Listen for system stress (from Amygdala)
    bus.on('amygdala:stress_change', (event) => {
      this.handleStressChange(event.payload as { level: string });
    });
  }

  // ============================================================================
  // GLOBAL LEARNING CONTROLS
  // ============================================================================

  /**
   * Pause all learning across systems
   */
  pauseLearning(reason: string): void {
    this.state.status = 'paused';
    this.state.pauseReason = reason;

    bus.publish('cortex', 'coordinator:learning_paused', {
      reason,
      timestamp: new Date().toISOString(),
    });

    console.log(`[EmergenceCoordinator] ⏸️ Learning paused: ${reason}`);
  }

  /**
   * Resume learning across systems
   */
  resumeLearning(): void {
    this.state.status = 'active';
    this.state.pauseReason = undefined;

    bus.publish('cortex', 'coordinator:learning_resumed', {
      timestamp: new Date().toISOString(),
    });

    console.log('[EmergenceCoordinator] ▶️ Learning resumed');
  }

  /**
   * Emergency stop - immediately halt all learning and exploration
   */
  emergencyStop(reason: string): void {
    this.state.status = 'emergency_stop';
    this.state.pauseReason = reason;

    // Clear all active responses
    this.activeResponses.clear();
    this.state.activeEmergenceResponses = 0;

    bus.publish('cortex', 'coordinator:emergency_stop', {
      reason,
      timestamp: new Date().toISOString(),
    });

    console.log(`[EmergenceCoordinator] 🛑 EMERGENCY STOP: ${reason}`);
  }

  /**
   * Check and consume learning budget
   */
  private consumeBudget(amount: number = 1): boolean {
    this.refreshBudgetIfNeeded();

    if (this.state.learningBudget.hourly.used + amount > this.state.learningBudget.hourly.limit) {
      return false;
    }
    if (this.state.learningBudget.daily.used + amount > this.state.learningBudget.daily.limit) {
      return false;
    }

    this.state.learningBudget.hourly.used += amount;
    this.state.learningBudget.daily.used += amount;

    this.metrics.budgetUtilization =
      this.state.learningBudget.daily.used / this.state.learningBudget.daily.limit;

    return true;
  }

  private refreshBudgetIfNeeded(): void {
    const now = new Date();

    if (now >= this.state.learningBudget.hourly.resetAt) {
      this.state.learningBudget.hourly.used = 0;
      this.state.learningBudget.hourly.resetAt = this.getNextHour();
    }

    if (now >= this.state.learningBudget.daily.resetAt) {
      this.state.learningBudget.daily.used = 0;
      this.state.learningBudget.daily.resetAt = this.getNextMidnight();
    }
  }

  // ============================================================================
  // EMERGENCE RESPONSE - CLOSED LOOP
  // ============================================================================

  /**
   * Handle detected emergence and coordinate response
   */
  private async handleEmergenceDetected(
    emergencePayload: EmergenceEvent & { strength: number; confidence: number }
  ): Promise<void> {
    if (this.state.status !== 'active') {
      console.log('[EmergenceCoordinator] Ignoring emergence - learning paused');
      return;
    }

    if (!this.consumeBudget(5)) {
      // Emergence responses cost 5 budget units
      console.log('[EmergenceCoordinator] Budget exhausted - limiting emergence response');
      this.state.status = 'limited';
      return;
    }

    const strength = emergencePayload.strength;
    const responseLevel = this.determineResponseLevel(strength);

    console.log(
      `[EmergenceCoordinator] 🌟 Emergence detected (strength: ${(strength * 100).toFixed(0)}%) → Response: ${responseLevel}`
    );

    // Safety assessment for emergence response
    const safetyAssessment = await this.assessEmergenceSafety(emergencePayload, responseLevel);

    if (!safetyAssessment.approved) {
      this.metrics.safetyInterventions++;
      console.log(
        `[EmergenceCoordinator] ⚠️ Emergence response blocked: ${safetyAssessment.reasoning}`
      );

      if (this.policy.pauseOnSafetyViolation) {
        this.pauseLearning(`Safety check failed: ${safetyAssessment.reasoning}`);
      }
      return;
    }

    // Create emergence response
    const response = await this.createEmergenceResponse(
      emergencePayload,
      responseLevel,
      safetyAssessment
    );
    this.activeResponses.set(response.id, response);
    this.state.activeEmergenceResponses++;

    // Execute response actions
    await this.executeEmergenceResponse(response);
  }

  /**
   * Determine response level based on emergence strength
   */
  private determineResponseLevel(strength: number): EmergenceResponseLevel {
    if (strength >= this.policy.surgeThreshold) return 'surge';
    if (strength >= this.policy.amplifyThreshold) return 'amplify';
    if (strength >= this.policy.moderateThreshold) return 'moderate';
    if (strength >= this.policy.cautiousThreshold) return 'cautious';
    return 'observe';
  }

  /**
   * Assess safety of proposed emergence response
   */
  private async assessEmergenceSafety(
    emergence: EmergenceEvent & { strength: number },
    responseLevel: EmergenceResponseLevel
  ): Promise<EmergenceSafetyAssessment> {
    if (!this.policy.requireSafetyCheck) {
      return {
        riskLevel: RiskLevel.LOW,
        approved: true,
        constraints: [],
        reasoning: 'Safety check disabled',
      };
    }

    // Map response level to risk
    const responseRiskMap: Record<EmergenceResponseLevel, RiskLevel> = {
      observe: RiskLevel.LOW,
      cautious: RiskLevel.LOW,
      moderate: RiskLevel.MEDIUM,
      amplify: RiskLevel.MEDIUM,
      surge: RiskLevel.HIGH,
    };

    const estimatedRisk = responseRiskMap[responseLevel];
    const constraints: string[] = [];

    // Check against max allowed risk
    const riskOrder = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const estimatedRiskIndex = riskOrder.indexOf(estimatedRisk);
    const maxRiskIndex = riskOrder.indexOf(this.policy.maxEmergenceRiskLevel);

    if (estimatedRiskIndex > maxRiskIndex) {
      return {
        riskLevel: estimatedRisk,
        approved: false,
        constraints: ['Risk level exceeds policy maximum'],
        reasoning: `Response level ${responseLevel} has ${estimatedRisk} risk, but max allowed is ${this.policy.maxEmergenceRiskLevel}`,
      };
    }

    // Check system health
    if (this.state.systemHealth.overallHealth < 0.5) {
      constraints.push('System health degraded - limiting response');
    }

    // Check active responses
    if (this.state.activeEmergenceResponses >= 3) {
      constraints.push('Max concurrent responses reached');
    }

    // Use SafetyPolicy for deeper assessment
    const safetyAssessment = await safetyPolicy.assess({
      type: ActionType.EXPERIMENT_EXECUTION,
      description: `Emergence response: ${responseLevel} for strength ${emergence.strength}`,
      scope: ['emergence-coordinator', 'exploration-engine', 'reinforcement-learner'],
      actor: 'emergence-coordinator',
      sessionId: `emergence-${emergence.id}`,
    });

    if (safetyAssessment.blockingIssues.length > 0) {
      return {
        riskLevel: safetyAssessment.riskLevel,
        approved: false,
        constraints: safetyAssessment.blockingIssues,
        reasoning: safetyAssessment.reasoning,
      };
    }

    return {
      riskLevel: estimatedRisk,
      approved: true,
      constraints: [...constraints, ...safetyAssessment.warnings],
      reasoning: `Approved with ${constraints.length} constraints`,
    };
  }

  /**
   * Create emergence response plan
   */
  private async createEmergenceResponse(
    emergence: EmergenceEvent & { strength: number; confidence: number },
    responseLevel: EmergenceResponseLevel,
    safetyAssessment: EmergenceSafetyAssessment
  ): Promise<EmergenceResponse> {
    const actions: EmergenceAction[] = [];

    // Base actions by response level
    switch (responseLevel) {
      case 'observe':
        actions.push({
          type: 'broadcast_signal',
          target: 'all',
          parameters: { signal: 'emergence_observed', strength: emergence.strength },
          executed: false,
        });
        break;

      case 'cautious':
        actions.push({
          type: 'inject_curiosity',
          target: 'curiosity-engine',
          parameters: { boost: 0.2, domain: emergence.signature?.domain || 'general' },
          executed: false,
        });
        break;

      case 'moderate':
        actions.push({
          type: 'inject_curiosity',
          target: 'curiosity-engine',
          parameters: { boost: 0.4, domain: emergence.signature?.domain || 'general' },
          executed: false,
        });
        actions.push({
          type: 'trigger_hypothesis',
          target: 'exploration-engine',
          parameters: { priority: 'medium', relatedEmergence: emergence.id },
          executed: false,
        });
        break;

      case 'amplify':
        actions.push({
          type: 'inject_curiosity',
          target: 'curiosity-engine',
          parameters: { boost: 0.6, domain: emergence.signature?.domain || 'general' },
          executed: false,
        });
        actions.push({
          type: 'trigger_hypothesis',
          target: 'exploration-engine',
          parameters: { priority: 'high', relatedEmergence: emergence.id },
          executed: false,
        });
        actions.push({
          type: 'amplify_learning',
          target: 'reinforcement-learner',
          parameters: { boost: this.policy.emergenceLearningBoost, duration: 300000 },
          executed: false,
        });
        break;

      case 'surge':
        actions.push({
          type: 'inject_curiosity',
          target: 'curiosity-engine',
          parameters: {
            boost: 1.0,
            domain: emergence.signature?.domain || 'general',
            priority: 'critical',
          },
          executed: false,
        });
        actions.push({
          type: 'trigger_hypothesis',
          target: 'exploration-engine',
          parameters: { priority: 'critical', relatedEmergence: emergence.id, maxConcurrent: 5 },
          executed: false,
        });
        actions.push({
          type: 'amplify_learning',
          target: 'reinforcement-learner',
          parameters: { boost: this.policy.emergenceLearningBoost * 2, duration: 600000 },
          executed: false,
        });
        actions.push({
          type: 'broadcast_signal',
          target: 'all',
          parameters: {
            signal: 'emergence_surge',
            strength: emergence.strength,
            priority: 'critical',
          },
          executed: false,
        });
        break;
    }

    return {
      id: `response-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      emergenceId: emergence.id,
      responseLevel,
      actions,
      safetyAssessment,
      startedAt: new Date(),
    };
  }

  /**
   * Execute emergence response actions
   */
  private async executeEmergenceResponse(response: EmergenceResponse): Promise<void> {
    this.metrics.totalEmergenceResponses++;

    for (const action of response.actions) {
      try {
        await this.executeAction(action);
        action.executed = true;
      } catch (error) {
        console.error(`[EmergenceCoordinator] Action failed: ${action.type}`, error);
        action.result = { error: String(error) };
      }
    }

    // Calculate outcome
    const outcome: EmergenceOutcome = {
      success: response.actions.filter((a) => a.executed).length > 0,
      learningGain: this.calculateLearningGain(response),
      newHypotheses: response.actions.filter((a) => a.type === 'trigger_hypothesis' && a.executed)
        .length,
      artifactsCreated: 0, // Will be updated by exploration results
      knowledgeIntegrated: false,
    };

    response.completedAt = new Date();
    response.outcome = outcome;

    if (outcome.success) {
      this.metrics.successfulResponses++;
      this.updateAverageLearningGain(outcome.learningGain);
    }

    // Clean up
    this.activeResponses.delete(response.id);
    this.state.activeEmergenceResponses--;

    bus.publish('cortex', 'coordinator:emergence_response_complete', {
      responseId: response.id,
      responseLevel: response.responseLevel,
      outcome,
      duration: response.completedAt.getTime() - response.startedAt.getTime(),
      timestamp: new Date().toISOString(),
    });

    await this.saveState();
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: EmergenceAction): Promise<void> {
    switch (action.type) {
      case 'inject_curiosity':
        // Signal curiosity engine to boost exploration in domain
        bus.publish('cortex', 'coordinator:curiosity_boost', {
          boost: action.parameters['boost'],
          domain: action.parameters['domain'],
          priority: action.parameters['priority'],
        });
        break;

      case 'trigger_hypothesis':
        // Signal exploration engine to generate hypothesis
        bus.publish('cortex', 'coordinator:hypothesis_request', {
          priority: action.parameters['priority'],
          relatedEmergence: action.parameters['relatedEmergence'],
          maxConcurrent: action.parameters['maxConcurrent'],
        });
        break;

      case 'amplify_learning':
        // Signal reinforcement learner to boost learning rate
        bus.publish('cortex', 'coordinator:learning_boost', {
          boost: action.parameters['boost'],
          duration: action.parameters['duration'],
        });
        break;

      case 'boost_exploration':
        // Directly increase exploration rate
        bus.publish('cortex', 'coordinator:exploration_boost', {
          multiplier: action.parameters['multiplier'],
          duration: action.parameters['duration'],
        });
        break;

      case 'broadcast_signal':
        // Broadcast to all systems
        bus.publish('cortex', `coordinator:${action.parameters['signal']}`, {
          strength: action.parameters['strength'],
          priority: action.parameters['priority'],
          timestamp: new Date().toISOString(),
        });
        break;
    }

    action.result = { executed: true };
  }

  // ============================================================================
  // INTRINSIC REWARDS
  // ============================================================================

  /**
   * Calculate and emit intrinsic reward signals
   */
  generateIntrinsicReward(
    type: IntrinsicReward['type'],
    value: number,
    source: string,
    context: Record<string, unknown> = {}
  ): IntrinsicReward {
    const reward: IntrinsicReward = {
      type,
      value: Math.max(-1, Math.min(1, value)),
      source,
      context,
    };

    this.intrinsicRewardBuffer.push(reward);

    // Trim buffer
    if (this.intrinsicRewardBuffer.length > 1000) {
      this.intrinsicRewardBuffer = this.intrinsicRewardBuffer.slice(-1000);
    }

    // Emit for reinforcement learner
    bus.publish('cortex', 'coordinator:intrinsic_reward', {
      ...reward,
      timestamp: new Date().toISOString(),
    });

    return reward;
  }

  /**
   * Calculate information gain reward
   */
  calculateInformationGain(
    priorUncertainty: number,
    posteriorUncertainty: number,
    domain: string
  ): IntrinsicReward {
    // Information gain = reduction in uncertainty
    const gain = Math.max(0, priorUncertainty - posteriorUncertainty);
    const normalized = Math.min(1, gain / priorUncertainty);

    return this.generateIntrinsicReward('information_gain', normalized, 'coordinator', {
      priorUncertainty,
      posteriorUncertainty,
      domain,
    });
  }

  /**
   * Calculate empowerment reward (ability to influence future states)
   */
  calculateEmpowerment(
    actionableStates: number,
    totalStates: number,
    context: Record<string, unknown>
  ): IntrinsicReward {
    const empowerment = actionableStates / Math.max(1, totalStates);

    return this.generateIntrinsicReward('empowerment', empowerment, 'coordinator', {
      actionableStates,
      totalStates,
      ...context,
    });
  }

  /**
   * Calculate progress reward (movement toward goals)
   */
  calculateProgress(
    previousDistance: number,
    currentDistance: number,
    goalId: string
  ): IntrinsicReward {
    const progress = (previousDistance - currentDistance) / Math.max(1, previousDistance);
    const bounded = Math.max(-1, Math.min(1, progress));

    return this.generateIntrinsicReward('progress', bounded, 'coordinator', {
      previousDistance,
      currentDistance,
      goalId,
      improved: progress > 0,
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleCuriositySignal(signal: CuriositySignal): void {
    if (this.state.status !== 'active') return;

    this.state.pendingCuriositySignals.push(signal);

    // Trim buffer
    if (this.state.pendingCuriositySignals.length > 100) {
      this.state.pendingCuriositySignals = this.state.pendingCuriositySignals.slice(-100);
    }

    // Check if should trigger exploration
    if (signal.score >= this.policy.curiosityExplorationTrigger) {
      bus.publish('cortex', 'coordinator:curiosity_triggered_exploration', {
        signalId: signal.id,
        score: signal.score,
        type: signal.type,
      });

      // Generate intrinsic reward for novelty
      this.generateIntrinsicReward('novelty', signal.score * 0.5, 'curiosity-engine', {
        curiosityType: signal.type,
        originalScore: signal.score,
      });
    }
  }

  private handleExplorationResult(hypothesis: ExplorationHypothesis): void {
    if (this.state.status !== 'active') return;

    if (hypothesis.status === 'validated' && hypothesis.results?.success) {
      // Successful exploration - generate competence reward
      this.generateIntrinsicReward('competence', 0.7, 'exploration-engine', {
        hypothesisId: hypothesis.id,
        hypothesisType: hypothesis.type,
        confidence: hypothesis.results.confidence,
      });

      this.metrics.crossSystemSynergies++;

      // Feed back to emergence detection
      this.emergenceAmplifier.receiveSignal(
        'exploration-engine',
        'discovery',
        hypothesis.results.confidence,
        { hypothesisId: hypothesis.id, type: hypothesis.type }
      );
    }
  }

  private handleLearningSignal(payload: { value: number; context: Record<string, unknown> }): void {
    if (this.state.status !== 'active') return;

    // Significant learning signal - feed to emergence
    this.emergenceAmplifier.receiveSignal(
      'reinforcement-learner',
      payload.value > 0 ? 'positive_learning' : 'negative_learning',
      Math.abs(payload.value),
      payload.context
    );

    // Generate progress reward if positive
    if (payload.value > 0.5) {
      this.generateIntrinsicReward(
        'progress',
        payload.value * 0.6,
        'reinforcement-learner',
        payload.context
      );
    }
  }

  private handleSafetyViolation(payload: { severity: string; reason: string }): void {
    this.metrics.safetyInterventions++;

    if (payload.severity === 'critical') {
      this.emergencyStop(`Critical safety violation: ${payload.reason}`);
    } else if (payload.severity === 'high' && this.policy.pauseOnSafetyViolation) {
      this.pauseLearning(`Safety violation: ${payload.reason}`);
    }
  }

  private handleStressChange(payload: { level: string }): void {
    // Reduce emergence responses during high stress
    if (payload.level === 'PANIC' || payload.level === 'CRITICAL') {
      this.pauseLearning('System stress critical');
    } else if (payload.level === 'CALM' && this.state.status === 'paused') {
      // Auto-resume when stress normalizes (if paused due to stress)
      if (this.state.pauseReason === 'System stress critical') {
        this.resumeLearning();
      }
    }
  }

  // ============================================================================
  // COORDINATION LOOP
  // ============================================================================

  private startCoordinationLoop(): void {
    this.coordinationInterval = setInterval(
      () => this.runCoordinationCycle(),
      this.policy.coordinationIntervalMs
    );
  }

  private async runCoordinationCycle(): Promise<void> {
    this.state.lastCoordinationCycle = new Date();

    // Refresh budgets
    this.refreshBudgetIfNeeded();

    // Update system health
    this.updateSystemHealth();

    // Process pending curiosity signals
    await this.processPendingCuriosity();

    // Clean up stale responses
    this.cleanupStaleResponses();

    // Emit telemetry
    bus.publish('cortex', 'coordinator:cycle_complete', {
      state: this.getStateSnapshot(),
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    });
  }

  private async processPendingCuriosity(): Promise<void> {
    if (this.state.pendingCuriositySignals.length === 0) return;
    if (this.state.status !== 'active') return;

    // Aggregate curiosity signals
    const signals = this.state.pendingCuriositySignals.splice(0, 10);
    const avgScore = signals.reduce((s, sig) => s + sig.score, 0) / signals.length;

    // If aggregate curiosity is high, boost exploration
    if (avgScore >= this.policy.curiosityExplorationTrigger && this.consumeBudget(2)) {
      bus.publish('cortex', 'coordinator:aggregate_curiosity_trigger', {
        signalCount: signals.length,
        averageScore: avgScore,
        action: 'boost_exploration',
      });

      // Generate information gain reward for curiosity clustering
      this.generateIntrinsicReward('information_gain', avgScore * 0.3, 'coordinator', {
        signalCount: signals.length,
        clusterType: 'curiosity',
      });
    }
  }

  private cleanupStaleResponses(): void {
    const now = Date.now();

    for (const [id, response] of this.activeResponses) {
      if (now - response.startedAt.getTime() > this.policy.emergenceTimeoutMs) {
        console.log(`[EmergenceCoordinator] Cleaning up stale response: ${id}`);
        this.activeResponses.delete(id);
        this.state.activeEmergenceResponses--;
      }
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private updateSystemHealth(): void {
    const health = this.state.systemHealth;

    // Simple health check based on recent activity
    health.emergenceAmplifier = 'healthy'; // Always healthy if initialized
    health.curiosityEngine = this.curiosityEngine ? 'healthy' : 'offline';
    health.explorationEngine = this.explorationEngine ? 'healthy' : 'offline';
    health.reinforcementLearner = 'healthy'; // Always healthy if initialized

    const healthyCount = [
      health.emergenceAmplifier,
      health.curiosityEngine,
      health.explorationEngine,
      health.reinforcementLearner,
    ].filter((s) => s === 'healthy').length;

    health.overallHealth = healthyCount / 4;
  }

  private calculateLearningGain(response: EmergenceResponse): number {
    const executedActions = response.actions.filter((a) => a.executed).length;
    const totalActions = response.actions.length;
    const levelMultiplier: Record<EmergenceResponseLevel, number> = {
      observe: 0.1,
      cautious: 0.3,
      moderate: 0.5,
      amplify: 0.8,
      surge: 1.0,
    };

    return (executedActions / totalActions) * levelMultiplier[response.responseLevel];
  }

  private updateAverageLearningGain(gain: number): void {
    const n = this.metrics.successfulResponses;
    this.metrics.averageLearningGain = ((n - 1) * this.metrics.averageLearningGain + gain) / n;
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private getNextHour(): Date {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    return nextHour;
  }

  // ============================================================================
  // STATE PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        this.metrics = data.metrics || this.metrics;
        // Restore budget state but recalculate reset times
        if (data.state?.learningBudget) {
          this.state.learningBudget.daily.used = data.state.learningBudget.daily?.used || 0;
          this.state.learningBudget.hourly.used = data.state.learningBudget.hourly?.used || 0;
        }
        console.log('[EmergenceCoordinator] Restored state from disk');
      }
    } catch (error) {
      console.error('[EmergenceCoordinator] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(
        this.stateFile,
        {
          state: {
            learningBudget: this.state.learningBudget,
            status: this.state.status,
          },
          metrics: this.metrics,
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[EmergenceCoordinator] Failed to save state:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getStateSnapshot(): Omit<CoordinationState, 'pendingCuriositySignals' | 'recentEmergences'> & {
    pendingCuriosityCount: number;
    recentEmergenceCount: number;
  } {
    return {
      status: this.state.status,
      pauseReason: this.state.pauseReason,
      activeEmergenceResponses: this.state.activeEmergenceResponses,
      pendingCuriosityCount: this.state.pendingCuriositySignals.length,
      recentEmergenceCount: this.state.recentEmergences.length,
      learningBudget: this.state.learningBudget,
      lastCoordinationCycle: this.state.lastCoordinationCycle,
      systemHealth: this.state.systemHealth,
    };
  }

  getMetrics(): CoordinatorMetrics {
    return { ...this.metrics };
  }

  getPolicy(): EmergenceCoordinatorPolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<EmergenceCoordinatorPolicy>): void {
    this.policy = { ...this.policy, ...updates };

    bus.publish('cortex', 'coordinator:policy_updated', {
      updates,
      newPolicy: this.policy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Manual emergence injection for testing
   */
  async injectEmergence(
    type: string,
    strength: number,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    this.emergenceAmplifier.receiveSignal('manual_injection', type, strength, metadata);
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
    }
    await this.saveState();
    console.log('[EmergenceCoordinator] Shutdown complete');
  }
}

// Singleton export
export const emergenceCoordinator = EmergenceCoordinator.getInstance();
