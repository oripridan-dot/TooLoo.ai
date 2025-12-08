// @version 1.0.0
/**
 * Meta-Learner: Self-Improvement Cognitive Engine
 *
 * A higher-order learning system that monitors, analyzes, and improves
 * TooLoo's learning capabilities themselves. This implements the
 * "learning to learn" paradigm.
 *
 * Key Capabilities:
 * - Learning velocity analysis (how fast is the system improving?)
 * - Strategy effectiveness tracking (which learning strategies work best?)
 * - Automatic learning rate adjustment based on performance
 * - Cross-domain knowledge transfer detection
 * - Cognitive load balancing
 * - Emergence pattern detection for breakthrough insights
 *
 * @module cortex/cognition/meta-learner
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface LearningVelocity {
  current: number; // Current learning rate (0-1)
  trend: 'accelerating' | 'stable' | 'decelerating' | 'stalled';
  acceleration: number; // Rate of change
  projectedPlateau: Date | null; // When learning might plateau
}

export interface StrategyEffectiveness {
  strategyId: string;
  name: string;
  successRate: number;
  avgImprovementPerUse: number;
  domainAffinity: Record<string, number>; // domain -> effectiveness
  cooldownPeriod: number; // Optimal time between uses
  lastUsed: Date;
}

export interface KnowledgeTransfer {
  id: string;
  sourceDomain: string;
  targetDomain: string;
  transferredConcepts: string[];
  effectivenessGain: number;
  discoveredAt: Date;
}

export interface CognitiveLoadMetrics {
  currentLoad: number; // 0-1, current cognitive demand
  optimalLoad: number; // Ideal load for best learning
  loadDistribution: Record<string, number>; // subsystem -> load
  bottlenecks: string[];
}

export interface EmergencePattern {
  id: string;
  type: 'breakthrough' | 'insight' | 'connection' | 'synthesis';
  description: string;
  involvedSystems: string[];
  confidence: number;
  potentialImpact: 'low' | 'medium' | 'high' | 'transformative';
  discoveredAt: Date;
  exploited: boolean;
}

export interface MetaLearningState {
  initialized: boolean;
  velocity: LearningVelocity;
  strategies: StrategyEffectiveness[];
  transfers: KnowledgeTransfer[];
  cognitiveLoad: CognitiveLoadMetrics;
  emergencePatterns: EmergencePattern[];
  selfImprovementCycles: number;
  lastAnalysis: Date | null;
}

export interface LearningInsight {
  type: 'optimization' | 'warning' | 'opportunity' | 'achievement';
  title: string;
  description: string;
  recommendation?: string;
  confidence: number;
  timestamp: Date;
}

// ============================================================================
// META-LEARNER IMPLEMENTATION
// ============================================================================

export class MetaLearner {
  private static instance: MetaLearner;
  private state: MetaLearningState;
  private dataDir: string;
  private stateFile: string;
  private insightHistory: LearningInsight[] = [];
  private readonly MAX_INSIGHTS = 100;
  private readonly ANALYSIS_INTERVAL = 30000; // 30 seconds
  private analysisTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'meta-learning');
    this.stateFile = path.join(this.dataDir, 'meta-state.json');

    this.state = this.getInitialState();
    this.setupEventListeners();
  }

  static getInstance(): MetaLearner {
    if (!MetaLearner.instance) {
      MetaLearner.instance = new MetaLearner();
    }
    return MetaLearner.instance;
  }

  private getInitialState(): MetaLearningState {
    return {
      initialized: false,
      velocity: {
        current: 0.5,
        trend: 'stable',
        acceleration: 0,
        projectedPlateau: null,
      },
      strategies: [
        {
          strategyId: 'reinforcement',
          name: 'Reinforcement Learning',
          successRate: 0.75,
          avgImprovementPerUse: 0.02,
          domainAffinity: { code: 0.8, creative: 0.6, analysis: 0.7 },
          cooldownPeriod: 5000,
          lastUsed: new Date(),
        },
        {
          strategyId: 'pattern-recognition',
          name: 'Pattern Recognition',
          successRate: 0.8,
          avgImprovementPerUse: 0.03,
          domainAffinity: { code: 0.9, creative: 0.5, analysis: 0.85 },
          cooldownPeriod: 3000,
          lastUsed: new Date(),
        },
        {
          strategyId: 'feedback-integration',
          name: 'User Feedback Integration',
          successRate: 0.9,
          avgImprovementPerUse: 0.05,
          domainAffinity: { code: 0.7, creative: 0.8, analysis: 0.6 },
          cooldownPeriod: 0,
          lastUsed: new Date(),
        },
        {
          strategyId: 'cross-validation',
          name: 'Cross-System Validation',
          successRate: 0.85,
          avgImprovementPerUse: 0.04,
          domainAffinity: { code: 0.85, creative: 0.7, analysis: 0.9 },
          cooldownPeriod: 10000,
          lastUsed: new Date(),
        },
      ],
      transfers: [],
      cognitiveLoad: {
        currentLoad: 0.3,
        optimalLoad: 0.6,
        loadDistribution: {
          reasoning: 0.3,
          learning: 0.2,
          memory: 0.25,
          validation: 0.25,
        },
        bottlenecks: [],
      },
      emergencePatterns: [],
      selfImprovementCycles: 0,
      lastAnalysis: null,
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    // Avoid console.log lint issues by using bus events
    bus.publish('cortex', 'meta:log', { message: 'MetaLearner initializing...' });

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    this.state.initialized = true;
    this.startAnalysisCycle();

    bus.publish('cortex', 'meta:initialized', {
      state: this.getStateSnapshot(),
      timestamp: new Date().toISOString(),
    });
  }

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        this.state = { ...this.state, ...data };
      }
    } catch (_error) {
      // Use fresh state on error
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (_error) {
      // Silently handle save errors
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for learning events from ReinforcementLearner
    bus.on('learning:reward_recorded', (event) => {
      this.processLearningSignal('reward', event.payload);
    });

    bus.on('learning:policy_improved', (event) => {
      this.processLearningSignal('policy_improvement', event.payload);
    });

    // Listen for validation results
    bus.on('team:validation_complete', (event) => {
      this.processValidationSignal(event.payload);
    });

    // Listen for emergence events
    bus.on('emergence:pattern_detected', (event) => {
      this.processEmergenceSignal(event.payload);
    });

    // Listen for cognitive load updates
    bus.on('system:metrics_update', (event) => {
      this.updateCognitiveLoad(event.payload);
    });
  }

  // ============================================================================
  // ANALYSIS ENGINE
  // ============================================================================

  private startAnalysisCycle(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    this.analysisTimer = setInterval(() => {
      this.runMetaAnalysis();
    }, this.ANALYSIS_INTERVAL);

    // Run initial analysis
    this.runMetaAnalysis();
  }

  private async runMetaAnalysis(): Promise<void> {
    this.state.selfImprovementCycles++;
    this.state.lastAnalysis = new Date();

    // 1. Analyze learning velocity
    this.analyzeLearningVelocity();

    // 2. Evaluate strategy effectiveness
    this.evaluateStrategies();

    // 3. Detect knowledge transfer opportunities
    this.detectTransferOpportunities();

    // 4. Check for cognitive bottlenecks
    this.checkCognitiveBottlenecks();

    // 5. Look for emergence patterns
    this.detectEmergencePatterns();

    // 6. Generate insights
    const insights = this.generateInsights();

    // 7. Apply self-improvements
    await this.applySelfImprovements(insights);

    // 8. Facilitate Knowledge Transfer
    await this.facilitateKnowledgeTransfer();

    // 9. Save state
    await this.saveState();

    // Publish analysis complete event
    bus.publish('cortex', 'meta:analysis_complete', {
      cycle: this.state.selfImprovementCycles,
      velocity: this.state.velocity,
      insightsGenerated: insights.length,
      timestamp: new Date().toISOString(),
    });
  }

  private analyzeLearningVelocity(): void {
    const previousVelocity = this.state.velocity.current;

    // Calculate new velocity based on recent learning events
    // This is a simplified model - real implementation would use
    // time-series analysis of learning metrics
    const learningSignals = this.getRecentLearningSignals();
    const improvementRate = this.calculateImprovementRate(learningSignals);

    this.state.velocity.acceleration = improvementRate - previousVelocity;
    this.state.velocity.current = Math.max(0, Math.min(1, improvementRate));

    // Determine trend
    if (this.state.velocity.acceleration > 0.05) {
      this.state.velocity.trend = 'accelerating';
    } else if (this.state.velocity.acceleration < -0.05) {
      this.state.velocity.trend = 'decelerating';
    } else if (this.state.velocity.current < 0.1) {
      this.state.velocity.trend = 'stalled';
    } else {
      this.state.velocity.trend = 'stable';
    }

    // Project plateau
    if (this.state.velocity.trend === 'decelerating') {
      const daysToZero = this.state.velocity.current / Math.abs(this.state.velocity.acceleration);
      this.state.velocity.projectedPlateau = new Date(Date.now() + daysToZero * 86400000);
    } else {
      this.state.velocity.projectedPlateau = null;
    }
  }

  private evaluateStrategies(): void {
    for (const strategy of this.state.strategies) {
      // Decay success rate slightly to encourage exploration
      strategy.successRate *= 0.99;

      // Ensure minimum exploration
      strategy.successRate = Math.max(0.1, strategy.successRate);
    }
  }

  private detectTransferOpportunities(): void {
    // Analyze domain affinities for transfer learning opportunities
    const domains = ['code', 'creative', 'analysis', 'planning'];

    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        const domain1 = domains[i]!;
        const domain2 = domains[j]!;

        // Check if strategies have similar effectiveness in both domains
        const similarity = this.calculateDomainSimilarity(domain1, domain2);

        if (similarity > 0.7 && !this.hasRecentTransfer(domain1, domain2)) {
          const transfer: KnowledgeTransfer = {
            id: `transfer-${Date.now()}`,
            sourceDomain: domain1,
            targetDomain: domain2,
            transferredConcepts: this.identifyTransferableConcepts(domain1, domain2),
            effectivenessGain: similarity * 0.1,
            discoveredAt: new Date(),
          };

          this.state.transfers.push(transfer);

          // Limit transfer history
          if (this.state.transfers.length > 50) {
            this.state.transfers = this.state.transfers.slice(-50);
          }
        }
      }
    }
  }

  private checkCognitiveBottlenecks(): void {
    const bottlenecks: string[] = [];
    const threshold = 0.8;

    for (const [subsystem, load] of Object.entries(this.state.cognitiveLoad.loadDistribution)) {
      if (load > threshold) {
        bottlenecks.push(subsystem);
      }
    }

    this.state.cognitiveLoad.bottlenecks = bottlenecks;
    this.state.cognitiveLoad.currentLoad =
      Object.values(this.state.cognitiveLoad.loadDistribution).reduce((a, b) => a + b, 0) / 4;
  }

  private detectEmergencePatterns(): void {
    // Look for unexpected correlations and breakthroughs
    if (this.state.velocity.trend === 'accelerating' && this.state.velocity.acceleration > 0.1) {
      const pattern: EmergencePattern = {
        id: `emergence-${Date.now()}`,
        type: 'breakthrough',
        description: 'Significant acceleration in learning velocity detected',
        involvedSystems: ['meta-learner', 'reinforcement-learner'],
        confidence: 0.8,
        potentialImpact: 'high',
        discoveredAt: new Date(),
        exploited: false,
      };

      this.state.emergencePatterns.push(pattern);

      bus.publish('cortex', 'emergence:breakthrough', {
        pattern,
        timestamp: new Date().toISOString(),
      });
    }

    // Limit pattern history
    if (this.state.emergencePatterns.length > 100) {
      this.state.emergencePatterns = this.state.emergencePatterns.slice(-100);
    }
  }

  private generateInsights(): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Velocity insights
    if (this.state.velocity.trend === 'stalled') {
      insights.push({
        type: 'warning',
        title: 'Learning Velocity Stalled',
        description: "The system's learning rate has significantly slowed down.",
        recommendation:
          'Consider introducing new learning challenges or enabling exploration mode.',
        confidence: 0.9,
        timestamp: new Date(),
      });
    } else if (this.state.velocity.trend === 'accelerating') {
      insights.push({
        type: 'achievement',
        title: 'Learning Accelerating',
        description: 'Learning velocity is increasing - the system is improving faster.',
        confidence: 0.85,
        timestamp: new Date(),
      });
    }

    // Strategy insights
    const bestStrategy = this.state.strategies.reduce((a, b) =>
      a.successRate > b.successRate ? a : b
    );

    if (bestStrategy.successRate > 0.85) {
      insights.push({
        type: 'opportunity',
        title: `High-Performing Strategy: ${bestStrategy.name}`,
        description: `Strategy has ${(bestStrategy.successRate * 100).toFixed(1)}% success rate.`,
        recommendation: 'Consider increasing usage of this strategy.',
        confidence: 0.8,
        timestamp: new Date(),
      });
    }

    // Cognitive load insights
    if (this.state.cognitiveLoad.bottlenecks.length > 0) {
      insights.push({
        type: 'optimization',
        title: 'Cognitive Bottlenecks Detected',
        description: `High load in: ${this.state.cognitiveLoad.bottlenecks.join(', ')}`,
        recommendation: 'Consider load balancing or resource reallocation.',
        confidence: 0.75,
        timestamp: new Date(),
      });
    }

    // Store insights
    this.insightHistory.push(...insights);
    if (this.insightHistory.length > this.MAX_INSIGHTS) {
      this.insightHistory = this.insightHistory.slice(-this.MAX_INSIGHTS);
    }

    return insights;
  }

  private async applySelfImprovements(insights: LearningInsight[]): Promise<void> {
    for (const insight of insights) {
      if (insight.type === 'optimization' && insight.confidence > 0.7) {
        // Apply automatic optimizations
        if (insight.title.includes('Bottleneck')) {
          // Rebalance cognitive load
          this.rebalanceCognitiveLoad();
        }
      }
    }

    // Publish improvements
    bus.publish('cortex', 'meta:self_improved', {
      improvementsApplied: insights.filter((i) => i.type === 'optimization').length,
      cycle: this.state.selfImprovementCycles,
      timestamp: new Date().toISOString(),
    });
  }

  private async facilitateKnowledgeTransfer(): Promise<void> {
    // Find pending transfers that haven't been fully exploited
    const recentTransfers = this.state.transfers.filter(
      (t) => new Date().getTime() - new Date(t.discoveredAt).getTime() < 24 * 60 * 60 * 1000
    );

    for (const transfer of recentTransfers) {
      // 1. Identify high-performing strategies in source domain
      const sourceStrategies = this.state.strategies.filter(
        (s) => (s.domainAffinity[transfer.sourceDomain] || 0) > 0.7 && s.successRate > 0.7
      );

      for (const strategy of sourceStrategies) {
        // 2. Check if strategy is underutilized in target domain
        const targetAffinity = strategy.domainAffinity[transfer.targetDomain] || 0;
        
        if (targetAffinity < 0.5) {
          // 3. Apply Transfer: Boost affinity in target domain (Hypothesis: it will work there too)
          // This is "Domain Adaptation"
          const adaptationFactor = 0.1; // Conservative boost
          strategy.domainAffinity[transfer.targetDomain] = targetAffinity + adaptationFactor;
          
          bus.publish('cortex', 'meta:transfer_applied', {
            transferId: transfer.id,
            strategy: strategy.name,
            source: transfer.sourceDomain,
            target: transfer.targetDomain,
            newAffinity: strategy.domainAffinity[transfer.targetDomain]
          });
        }
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getRecentLearningSignals(): number[] {
    // This would integrate with ReinforcementLearner metrics
    // For now, return simulated signals
    return Array.from({ length: 10 }, () => Math.random() * 0.3 + 0.5);
  }

  private calculateImprovementRate(signals: number[]): number {
    if (signals.length === 0) return 0.5;
    return signals.reduce((a, b) => a + b, 0) / signals.length;
  }

  private calculateDomainSimilarity(domain1: string, domain2: string): number {
    let similarity = 0;
    let count = 0;

    for (const strategy of this.state.strategies) {
      const d1 = strategy.domainAffinity[domain1] || 0;
      const d2 = strategy.domainAffinity[domain2] || 0;
      similarity += 1 - Math.abs(d1 - d2);
      count++;
    }

    return count > 0 ? similarity / count : 0;
  }

  private hasRecentTransfer(domain1: string, domain2: string): boolean {
    const oneHourAgo = new Date(Date.now() - 3600000);
    return this.state.transfers.some(
      (t) =>
        t.discoveredAt > oneHourAgo &&
        ((t.sourceDomain === domain1 && t.targetDomain === domain2) ||
          (t.sourceDomain === domain2 && t.targetDomain === domain1))
    );
  }

  private identifyTransferableConcepts(domain1: string, domain2: string): string[] {
    // Domain-specific transferable concepts
    const conceptMap: Record<string, string[]> = {
      'code-creative': ['structure', 'patterns', 'composition'],
      'code-analysis': ['logic', 'decomposition', 'evaluation'],
      'creative-analysis': ['synthesis', 'interpretation', 'context'],
      'code-planning': ['sequencing', 'dependencies', 'optimization'],
    };

    const key1 = `${domain1}-${domain2}`;
    const key2 = `${domain2}-${domain1}`;

    return conceptMap[key1] || conceptMap[key2] || ['general-knowledge'];
  }

  private rebalanceCognitiveLoad(): void {
    // Distribute load more evenly
    const avgLoad = this.state.cognitiveLoad.currentLoad;
    for (const subsystem of Object.keys(this.state.cognitiveLoad.loadDistribution)) {
      this.state.cognitiveLoad.loadDistribution[subsystem] = avgLoad;
    }
    this.state.cognitiveLoad.bottlenecks = [];
  }

  // ============================================================================
  // SIGNAL PROCESSORS
  // ============================================================================

  private processLearningSignal(type: string, payload: Record<string, unknown>): void {
    // Update strategies based on learning signals
    if (type === 'reward') {
      const strategyId = payload['strategy'] as string;
      const success = (payload['value'] as number) > 0;

      const strategy = this.state.strategies.find((s) => s.strategyId === strategyId);
      if (strategy) {
        // Update success rate with exponential moving average
        const alpha = 0.1;
        strategy.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * strategy.successRate;
        strategy.lastUsed = new Date();
      }
    }
  }

  private processValidationSignal(payload: Record<string, unknown>): void {
    const qualityScore = payload['qualityScore'] as number;

    // High quality validations indicate effective learning
    if (qualityScore > 0.8) {
      this.state.velocity.current = Math.min(1, this.state.velocity.current + 0.01);
    }
  }

  private processEmergenceSignal(payload: Record<string, unknown>): void {
    const pattern = payload as unknown as EmergencePattern;

    if (!this.state.emergencePatterns.some((p) => p.id === pattern.id)) {
      this.state.emergencePatterns.push(pattern);
    }
  }

  private updateCognitiveLoad(payload: Record<string, unknown>): void {
    const metrics = payload['metrics'] as Record<string, number>;

    if (metrics) {
      for (const [key, value] of Object.entries(metrics)) {
        if (key in this.state.cognitiveLoad.loadDistribution) {
          this.state.cognitiveLoad.loadDistribution[key] = value;
        }
      }
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getStateSnapshot(): MetaLearningState {
    return { ...this.state };
  }

  getInsightHistory(): LearningInsight[] {
    return [...this.insightHistory];
  }

  getLearningVelocity(): LearningVelocity {
    return { ...this.state.velocity };
  }

  getStrategies(): StrategyEffectiveness[] {
    return [...this.state.strategies];
  }

  getBestStrategyForDomain(domain: string): StrategyEffectiveness | null {
    let best: StrategyEffectiveness | null = null;
    let bestScore = 0;

    for (const strategy of this.state.strategies) {
      const score = (strategy.domainAffinity[domain] || 0) * strategy.successRate;
      if (score > bestScore) {
        bestScore = score;
        best = strategy;
      }
    }

    return best;
  }

  getCognitiveLoad(): CognitiveLoadMetrics {
    return { ...this.state.cognitiveLoad };
  }

  getEmergencePatterns(): EmergencePattern[] {
    return [...this.state.emergencePatterns];
  }

  getTransfers(): KnowledgeTransfer[] {
    return [...this.state.transfers];
  }

  async triggerAnalysis(): Promise<void> {
    await this.runMetaAnalysis();
  }

  stop(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }
}

// Singleton export
export const metaLearner = MetaLearner.getInstance();
