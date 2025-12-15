/**
 * @file AutonomousLearningLoop - Continuous Learning Without Intervention
 * @description Phase 9: Autonomous learning cycles and knowledge growth
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * This service provides:
 * - Continuous learning cycles (analyze → learn → optimize)
 * - Knowledge extraction from interactions
 * - Automatic skill improvement
 * - Learning goal management
 * - Progress tracking and reporting
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

/** A learning cycle state */
export type CyclePhase = 'idle' | 'analyzing' | 'learning' | 'optimizing' | 'validating';

/** A learning goal */
export interface LearningGoal {
  id: string;
  name: string;
  description: string;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  priority: number;
  status: 'pending' | 'in-progress' | 'achieved' | 'abandoned';
  createdAt: number;
  achievedAt?: number;
}

/** Knowledge item extracted from interactions */
export interface KnowledgeItem {
  id: string;
  type: 'fact' | 'pattern' | 'preference' | 'technique' | 'error';
  content: string;
  source: string;
  confidence: number;
  useCount: number;
  createdAt: number;
  lastUsed: number;
}

/** A learning cycle record */
export interface LearningCycle {
  id: string;
  startedAt: number;
  completedAt?: number;
  phase: CyclePhase;
  interactionsAnalyzed: number;
  knowledgeExtracted: number;
  improvementsMade: number;
  goalsAdvanced: number;
  errors: string[];
}

/** Configuration for autonomous learning */
export interface AutonomousLearningConfig {
  /** Path to persist learning state */
  persistPath?: string;
  /** How often to run learning cycles (ms) */
  cycleIntervalMs: number;
  /** Minimum interactions before analysis */
  minInteractionsForCycle: number;
  /** Maximum knowledge items to retain */
  maxKnowledgeItems: number;
  /** Confidence threshold for knowledge retention */
  minKnowledgeConfidence: number;
  /** Enable automatic optimization */
  autoOptimizeEnabled: boolean;
}

/** Internal config with required fields */
interface InternalConfig {
  persistPath: string;
  cycleIntervalMs: number;
  minInteractionsForCycle: number;
  maxKnowledgeItems: number;
  minKnowledgeConfidence: number;
  autoOptimizeEnabled: boolean;
}

/** Learning loop metrics */
export interface LearningMetrics {
  totalCycles: number;
  successfulCycles: number;
  failedCycles: number;
  totalKnowledgeItems: number;
  totalGoals: number;
  achievedGoals: number;
  totalInteractionsProcessed: number;
  averageCycleDuration: number;
  currentPhase: CyclePhase;
  lastCycleAt: number;
}

/** An interaction record for learning */
export interface InteractionRecord {
  id: string;
  skillId: string;
  input: string;
  output: string;
  quality: number;
  duration: number;
  timestamp: number;
  feedback?: string;
  learned: boolean;
}

// =============================================================================
// AUTONOMOUS LEARNING LOOP
// =============================================================================

export class AutonomousLearningLoop extends EventEmitter {
  private config: InternalConfig;
  private currentPhase: CyclePhase = 'idle';
  private pendingInteractions: InteractionRecord[] = [];
  private knowledge: Map<string, KnowledgeItem> = new Map();
  private goals: Map<string, LearningGoal> = new Map();
  private cycles: LearningCycle[] = [];
  private cycleInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // Metrics
  private metrics: LearningMetrics = {
    totalCycles: 0,
    successfulCycles: 0,
    failedCycles: 0,
    totalKnowledgeItems: 0,
    totalGoals: 0,
    achievedGoals: 0,
    totalInteractionsProcessed: 0,
    averageCycleDuration: 0,
    currentPhase: 'idle',
    lastCycleAt: 0,
  };

  constructor(config: AutonomousLearningConfig) {
    super();
    this.config = {
      persistPath: config.persistPath ?? './data/autonomous-learning.json',
      cycleIntervalMs: config.cycleIntervalMs,
      minInteractionsForCycle: config.minInteractionsForCycle,
      maxKnowledgeItems: config.maxKnowledgeItems,
      minKnowledgeConfidence: config.minKnowledgeConfidence,
      autoOptimizeEnabled: config.autoOptimizeEnabled,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Learning] 📚 Initializing autonomous learning loop...');

    // Load persisted state
    await this.loadState();

    // Set up default goals
    this.registerDefaultGoals();

    // Start cycle loop
    this.startCycleLoop();

    this.initialized = true;
    this.emit('initialized');
    console.log('[Learning] ✅ Autonomous learning loop ready');
  }

  async shutdown(): Promise<void> {
    console.log('[Learning] 🛑 Shutting down learning loop...');

    // Stop cycle loop
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }

    // Run final cycle if there are pending interactions
    if (this.pendingInteractions.length > 0) {
      await this.runLearningCycle();
    }

    // Persist state
    await this.saveState();

    this.initialized = false;
    this.emit('shutdown');
    console.log('[Learning] ✅ Learning loop shutdown complete');
  }

  isHealthy(): boolean {
    return this.initialized;
  }

  // ---------------------------------------------------------------------------
  // Interaction Recording
  // ---------------------------------------------------------------------------

  /**
   * Record an interaction for learning
   */
  recordInteraction(interaction: Omit<InteractionRecord, 'learned'>): void {
    const record: InteractionRecord = {
      ...interaction,
      learned: false,
    };

    this.pendingInteractions.push(record);
    this.emit('interaction:recorded', record);

    // Check if we should trigger an early cycle
    if (
      this.currentPhase === 'idle' &&
      this.pendingInteractions.length >= this.config.minInteractionsForCycle * 2
    ) {
      this.runLearningCycle();
    }
  }

  /**
   * Record feedback for an interaction
   */
  recordFeedback(interactionId: string, feedback: string, quality: number): void {
    const interaction = this.pendingInteractions.find(i => i.id === interactionId);
    if (interaction) {
      interaction.feedback = feedback;
      interaction.quality = quality;
      this.emit('feedback:recorded', { interactionId, feedback, quality });
    }
  }

  // ---------------------------------------------------------------------------
  // Learning Cycle
  // ---------------------------------------------------------------------------

  /**
   * Start the cycle loop
   */
  private startCycleLoop(): void {
    if (this.cycleInterval) return;

    this.cycleInterval = setInterval(async () => {
      if (
        this.currentPhase === 'idle' &&
        this.pendingInteractions.length >= this.config.minInteractionsForCycle
      ) {
        await this.runLearningCycle();
      }
    }, this.config.cycleIntervalMs);
  }

  /**
   * Run a complete learning cycle
   */
  async runLearningCycle(): Promise<LearningCycle> {
    const cycle: LearningCycle = {
      id: `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      phase: 'analyzing',
      interactionsAnalyzed: 0,
      knowledgeExtracted: 0,
      improvementsMade: 0,
      goalsAdvanced: 0,
      errors: [],
    };

    this.emit('cycle:started', cycle);
    console.log(`[Learning] 🔄 Starting learning cycle: ${cycle.id}`);

    try {
      // Phase 1: Analysis
      cycle.phase = 'analyzing';
      this.currentPhase = 'analyzing';
      this.metrics.currentPhase = 'analyzing';
      this.emit('phase:changed', { cycle: cycle.id, phase: 'analyzing' });

      const toAnalyze = this.pendingInteractions.splice(
        0,
        Math.min(100, this.pendingInteractions.length)
      );
      cycle.interactionsAnalyzed = toAnalyze.length;

      // Phase 2: Learning (knowledge extraction)
      cycle.phase = 'learning';
      this.currentPhase = 'learning';
      this.metrics.currentPhase = 'learning';
      this.emit('phase:changed', { cycle: cycle.id, phase: 'learning' });

      for (const interaction of toAnalyze) {
        const items = await this.extractKnowledge(interaction);
        cycle.knowledgeExtracted += items.length;
        interaction.learned = true;
      }

      // Phase 3: Optimization
      if (this.config.autoOptimizeEnabled) {
        cycle.phase = 'optimizing';
        this.currentPhase = 'optimizing';
        this.metrics.currentPhase = 'optimizing';
        this.emit('phase:changed', { cycle: cycle.id, phase: 'optimizing' });

        const improvements = await this.optimizeFromKnowledge();
        cycle.improvementsMade = improvements;
      }

      // Phase 4: Validation
      cycle.phase = 'validating';
      this.currentPhase = 'validating';
      this.metrics.currentPhase = 'validating';
      this.emit('phase:changed', { cycle: cycle.id, phase: 'validating' });

      const goalsAdvanced = this.updateGoals();
      cycle.goalsAdvanced = goalsAdvanced;

      // Complete
      cycle.completedAt = Date.now();
      this.currentPhase = 'idle';
      this.metrics.currentPhase = 'idle';

      this.metrics.totalCycles++;
      this.metrics.successfulCycles++;
      this.metrics.totalInteractionsProcessed += cycle.interactionsAnalyzed;
      this.metrics.lastCycleAt = Date.now();
      this.updateAverageCycleDuration(cycle.completedAt - cycle.startedAt);

      this.cycles.push(cycle);
      this.emit('cycle:completed', cycle);
      console.log(`[Learning] ✅ Learning cycle complete: ${cycle.knowledgeExtracted} knowledge items extracted`);

    } catch (error) {
      cycle.errors.push(error instanceof Error ? error.message : 'Unknown error');
      cycle.completedAt = Date.now();
      this.currentPhase = 'idle';
      this.metrics.currentPhase = 'idle';
      this.metrics.totalCycles++;
      this.metrics.failedCycles++;

      this.cycles.push(cycle);
      this.emit('cycle:failed', { cycle, error });
      console.error('[Learning] ❌ Learning cycle failed:', error);
    }

    return cycle;
  }

  // ---------------------------------------------------------------------------
  // Knowledge Extraction
  // ---------------------------------------------------------------------------

  /**
   * Extract knowledge from an interaction
   */
  private async extractKnowledge(interaction: InteractionRecord): Promise<KnowledgeItem[]> {
    const items: KnowledgeItem[] = [];

    // Extract patterns from high-quality interactions
    if (interaction.quality >= 0.8) {
      const pattern = this.extractPattern(interaction);
      if (pattern) {
        items.push(pattern);
        this.addKnowledge(pattern);
      }
    }

    // Extract techniques from successful completions
    const techniques = this.extractTechniques(interaction);
    for (const technique of techniques) {
      items.push(technique);
      this.addKnowledge(technique);
    }

    // Extract errors from low-quality interactions
    if (interaction.quality < 0.5) {
      const error = this.extractError(interaction);
      if (error) {
        items.push(error);
        this.addKnowledge(error);
      }
    }

    // Extract preferences from feedback
    if (interaction.feedback) {
      const preference = this.extractPreference(interaction);
      if (preference) {
        items.push(preference);
        this.addKnowledge(preference);
      }
    }

    return items;
  }

  /**
   * Extract a pattern from an interaction
   */
  private extractPattern(interaction: InteractionRecord): KnowledgeItem | null {
    // Simple pattern extraction - in production, use NLP
    const inputWords = interaction.input.toLowerCase().split(/\s+/).slice(0, 5);
    const patternKey = `pattern:${interaction.skillId}:${inputWords.join('-')}`;

    return {
      id: patternKey,
      type: 'pattern',
      content: `For ${interaction.skillId}: input starting with "${inputWords.join(' ')}" produces high-quality results`,
      source: interaction.id,
      confidence: interaction.quality,
      useCount: 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
  }

  /**
   * Extract techniques from an interaction
   */
  private extractTechniques(interaction: InteractionRecord): KnowledgeItem[] {
    const techniques: KnowledgeItem[] = [];

    // Look for code blocks
    const codeBlocks = interaction.output.match(/```[\s\S]*?```/g);
    if (codeBlocks && codeBlocks.length > 0) {
      techniques.push({
        id: `technique:code:${interaction.id}`,
        type: 'technique',
        content: `Use code blocks for ${interaction.skillId} responses`,
        source: interaction.id,
        confidence: 0.8,
        useCount: 1,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });
    }

    // Look for structured output (lists, headers)
    if (interaction.output.includes('\n- ') || interaction.output.includes('\n## ')) {
      techniques.push({
        id: `technique:structure:${interaction.id}`,
        type: 'technique',
        content: `Use structured formatting for ${interaction.skillId} responses`,
        source: interaction.id,
        confidence: 0.7,
        useCount: 1,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });
    }

    return techniques;
  }

  /**
   * Extract an error pattern from a low-quality interaction
   */
  private extractError(interaction: InteractionRecord): KnowledgeItem | null {
    return {
      id: `error:${interaction.id}`,
      type: 'error',
      content: `Avoid this pattern for ${interaction.skillId}: ${interaction.input.substring(0, 100)}`,
      source: interaction.id,
      confidence: 1 - interaction.quality,
      useCount: 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
  }

  /**
   * Extract preference from feedback
   */
  private extractPreference(interaction: InteractionRecord): KnowledgeItem | null {
    if (!interaction.feedback) return null;

    return {
      id: `preference:${interaction.id}`,
      type: 'preference',
      content: `User preference for ${interaction.skillId}: ${interaction.feedback}`,
      source: interaction.id,
      confidence: interaction.quality,
      useCount: 1,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };
  }

  /**
   * Add knowledge item to the store
   */
  private addKnowledge(item: KnowledgeItem): void {
    const existing = this.knowledge.get(item.id);
    if (existing) {
      // Merge with existing
      existing.useCount++;
      existing.confidence = (existing.confidence + item.confidence) / 2;
      existing.lastUsed = Date.now();
    } else {
      // Add new
      this.knowledge.set(item.id, item);
      this.metrics.totalKnowledgeItems++;

      // Prune if over limit
      this.pruneKnowledge();
    }
  }

  /**
   * Prune low-confidence/stale knowledge
   */
  private pruneKnowledge(): void {
    if (this.knowledge.size <= this.config.maxKnowledgeItems) return;

    // Sort by score (confidence * recency)
    const items = Array.from(this.knowledge.values());
    const now = Date.now();
    items.sort((a, b) => {
      const scoreA = a.confidence * (1 - (now - a.lastUsed) / (7 * 24 * 60 * 60 * 1000));
      const scoreB = b.confidence * (1 - (now - b.lastUsed) / (7 * 24 * 60 * 60 * 1000));
      return scoreB - scoreA;
    });

    // Keep top items
    const toKeep = items.slice(0, this.config.maxKnowledgeItems);
    this.knowledge.clear();
    for (const item of toKeep) {
      this.knowledge.set(item.id, item);
    }
    this.metrics.totalKnowledgeItems = this.knowledge.size;
  }

  // ---------------------------------------------------------------------------
  // Optimization
  // ---------------------------------------------------------------------------

  /**
   * Generate optimizations from accumulated knowledge
   */
  private async optimizeFromKnowledge(): Promise<number> {
    let improvements = 0;

    // Group knowledge by skill
    const bySkill: Map<string, KnowledgeItem[]> = new Map();
    for (const item of this.knowledge.values()) {
      const skillId = item.source.split(':')[0] ?? 'unknown';
      if (!bySkill.has(skillId)) {
        bySkill.set(skillId, []);
      }
      bySkill.get(skillId)?.push(item);
    }

    // For each skill with enough knowledge, generate optimizations
    for (const [skillId, items] of bySkill) {
      if (items.length >= 5) {
        // In production, this would generate actual optimizations
        this.emit('optimization:proposed', {
          skillId,
          knowledgeCount: items.length,
          patterns: items.filter(i => i.type === 'pattern').length,
          errors: items.filter(i => i.type === 'error').length,
        });
        improvements++;
      }
    }

    return improvements;
  }

  // ---------------------------------------------------------------------------
  // Goal Management
  // ---------------------------------------------------------------------------

  /**
   * Register a learning goal
   */
  registerGoal(goal: Omit<LearningGoal, 'status' | 'createdAt'>): void {
    const fullGoal: LearningGoal = {
      ...goal,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.goals.set(goal.id, fullGoal);
    this.metrics.totalGoals++;
    this.emit('goal:registered', fullGoal);
    console.log(`[Learning] 🎯 Registered learning goal: ${goal.name}`);
  }

  /**
   * Register default learning goals
   */
  private registerDefaultGoals(): void {
    this.registerGoal({
      id: 'knowledge-base-size',
      name: 'Build Knowledge Base',
      description: 'Accumulate 1000 knowledge items',
      targetMetric: 'totalKnowledgeItems',
      currentValue: this.metrics.totalKnowledgeItems,
      targetValue: 1000,
      priority: 1,
    });

    this.registerGoal({
      id: 'cycle-success-rate',
      name: 'Maintain High Success Rate',
      description: 'Keep learning cycle success rate above 95%',
      targetMetric: 'cycleSuccessRate',
      currentValue: 100,
      targetValue: 95,
      priority: 2,
    });

    this.registerGoal({
      id: 'interaction-quality',
      name: 'Improve Interaction Quality',
      description: 'Achieve average interaction quality of 0.9',
      targetMetric: 'averageInteractionQuality',
      currentValue: 0,
      targetValue: 0.9,
      priority: 1,
    });
  }

  /**
   * Update goal progress
   */
  private updateGoals(): number {
    let advanced = 0;

    for (const goal of this.goals.values()) {
      if (goal.status === 'achieved' || goal.status === 'abandoned') continue;

      // Update current value based on metric
      const newValue = this.getMetricValue(goal.targetMetric);
      if (newValue !== goal.currentValue) {
        goal.currentValue = newValue;
        advanced++;

        // Check if achieved
        if (goal.currentValue >= goal.targetValue) {
          goal.status = 'achieved';
          goal.achievedAt = Date.now();
          this.metrics.achievedGoals++;
          this.emit('goal:achieved', goal);
          console.log(`[Learning] 🏆 Goal achieved: ${goal.name}`);
        } else if (goal.status === 'pending') {
          goal.status = 'in-progress';
        }
      }
    }

    return advanced;
  }

  /**
   * Get current value of a metric
   */
  private getMetricValue(metricName: string): number {
    switch (metricName) {
      case 'totalKnowledgeItems':
        return this.metrics.totalKnowledgeItems;
      case 'cycleSuccessRate':
        return this.metrics.totalCycles > 0
          ? (this.metrics.successfulCycles / this.metrics.totalCycles) * 100
          : 100;
      case 'averageInteractionQuality':
        // Would need to track this separately
        return 0;
      default:
        return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Metrics & State
  // ---------------------------------------------------------------------------

  private updateAverageCycleDuration(duration: number): void {
    const totalCycles = this.metrics.successfulCycles;
    const currentAvg = this.metrics.averageCycleDuration;
    this.metrics.averageCycleDuration =
      (currentAvg * (totalCycles - 1) + duration) / totalCycles;
  }

  getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  getKnowledge(type?: KnowledgeItem['type']): KnowledgeItem[] {
    const items = Array.from(this.knowledge.values());
    return type ? items.filter(i => i.type === type) : items;
  }

  getGoals(): LearningGoal[] {
    return Array.from(this.goals.values());
  }

  getCycles(limit = 10): LearningCycle[] {
    return this.cycles.slice(-limit);
  }

  getCurrentPhase(): CyclePhase {
    return this.currentPhase;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    // In production, load from persistPath
  }

  private async saveState(): Promise<void> {
    // In production, save to persistPath
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: AutonomousLearningLoop | null = null;

export function getAutonomousLearningLoop(
  config?: AutonomousLearningConfig
): AutonomousLearningLoop {
  if (!instance) {
    instance = new AutonomousLearningLoop(config ?? {
      cycleIntervalMs: 300000, // 5 minutes
      minInteractionsForCycle: 10,
      maxKnowledgeItems: 10000,
      minKnowledgeConfidence: 0.5,
      autoOptimizeEnabled: true,
    });
  }
  return instance;
}

export function resetAutonomousLearningLoop(): void {
  instance = null;
}

export default AutonomousLearningLoop;
