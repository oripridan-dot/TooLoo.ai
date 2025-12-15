/**
 * @file Native Emergence Engine
 * @description Pattern detection and emergent behavior - NO LEGACY DEPENDENCIES
 * @version 1.2.1
 * @skill-os true
 *
 * Implements emergence detection with:
 * - Pattern recognition across skill executions
 * - Skill synergy detection
 * - Emergent goal generation
 * - Emergence signal emission
 */

import { randomUUID } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import type {
  IEmergenceEngine,
  EmergenceSignal,
  Pattern,
  SkillSynergy,
  EmergentGoal,
  EmergenceEngineConfig,
  EmergenceMetrics,
  EngineStats,
} from './types.js';

// =============================================================================
// INTERNAL TYPES
// =============================================================================

interface ExecutionRecord {
  skillId: string;
  context: Record<string, unknown>;
  success: boolean;
  timestamp: Date;
}

// =============================================================================
// EMERGENCE ENGINE IMPLEMENTATION
// =============================================================================

// Internal config type with required properties (defaults set by constructor)
interface InternalEmergenceConfig {
  patternThreshold: number;
  synergyThreshold: number;
  maxActiveGoals: number;
  maxPatterns: number;
  maxSynergies: number;
  persistPath?: string;
}

export class EmergenceEngine implements IEmergenceEngine {
  readonly id = 'emergence-engine';
  readonly version = '1.2.1';

  private executions: ExecutionRecord[] = [];
  private signals: EmergenceSignal[] = [];
  private patterns: Map<string, Pattern> = new Map();
  private synergies: Map<string, SkillSynergy> = new Map();
  private goals: Map<string, EmergentGoal> = new Map();
  private config: InternalEmergenceConfig;
  private startedAt: Date;
  private stats: EngineStats;

  constructor(config?: Partial<EmergenceEngineConfig>) {
    this.config = {
      patternThreshold: config?.patternThreshold ?? 3, // Min occurrences to be a pattern
      synergyThreshold: config?.synergyThreshold ?? 0.7, // Min combined success rate
      maxActiveGoals: config?.maxActiveGoals ?? 10,
      maxPatterns: config?.maxPatterns ?? 1000,
      maxSynergies: config?.maxSynergies ?? 500,
      persistPath: config?.persistPath,
    };
    this.startedAt = new Date();
    this.stats = {
      operationCount: 0,
      successCount: 0,
      errorCount: 0,
      lastOperationAt: null,
      uptime: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log(`[${this.id}] Initializing v${this.version}...`);

    if (this.config.persistPath) {
      await this.loadState();
    }

    console.log(`[${this.id}] ✅ Initialized with ${this.patterns.size} patterns, ${this.synergies.size} synergies`);
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.id}] Shutting down...`);

    if (this.config.persistPath) {
      await this.saveState();
    }

    console.log(`[${this.id}] ✅ Shutdown complete`);
  }

  isHealthy(): boolean {
    return true;
  }

  getStats(): EngineStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  // ---------------------------------------------------------------------------
  // Execution Recording
  // ---------------------------------------------------------------------------

  async recordExecution(
    skillId: string,
    context: Record<string, unknown>,
    success: boolean
  ): Promise<void> {
    const record: ExecutionRecord = {
      skillId,
      context,
      success,
      timestamp: new Date(),
    };

    this.executions.push(record);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    // Keep last 1000 executions
    if (this.executions.length > 1000) {
      this.executions = this.executions.slice(-1000);
    }

    // Update synergies for skill pairs
    await this.updateSynergies(skillId);
  }

  // ---------------------------------------------------------------------------
  // Pattern Detection
  // ---------------------------------------------------------------------------

  async detectPatterns(): Promise<Pattern[]> {
    const newPatterns: Pattern[] = [];
    const recentExecutions = this.executions.slice(-100);

    // Detect sequential patterns (skill A followed by skill B)
    const sequences: Map<string, { count: number; skills: string[]; contexts: string[] }> = new Map();

    for (let i = 1; i < recentExecutions.length; i++) {
      const prev = recentExecutions[i - 1]!;
      const curr = recentExecutions[i]!;

      // Only consider executions within 5 minutes of each other
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
      if (timeDiff > 5 * 60 * 1000) continue;

      const key = `${prev.skillId}->${curr.skillId}`;
      const existing = sequences.get(key);
      if (existing) {
        existing.count++;
      } else {
        sequences.set(key, {
          count: 1,
          skills: [prev.skillId, curr.skillId],
          contexts: [],
        });
      }
    }

    // Convert frequent sequences to patterns
    for (const [key, data] of sequences) {
      if (data.count >= this.config.patternThreshold) {
        const existingPattern = this.patterns.get(key);
        if (existingPattern) {
          existingPattern.frequency = data.count;
          existingPattern.lastSeenAt = new Date();
        } else {
          const pattern: Pattern = {
            id: randomUUID(),
            name: `Sequence: ${data.skills.join(' → ')}`,
            description: `Skills ${data.skills.join(' and ')} are frequently used together`,
            frequency: data.count,
            confidence: Math.min(1, data.count / 10),
            skills: data.skills,
            triggers: data.contexts,
            createdAt: new Date(),
            lastSeenAt: new Date(),
          };
          this.patterns.set(key, pattern);
          newPatterns.push(pattern);

          // Emit emergence signal for new pattern
          await this.emitSignal({
            type: 'pattern',
            source: this.id,
            strength: pattern.confidence,
            description: pattern.description,
            relatedSkills: pattern.skills,
          });
        }
      }
    }

    this.stats.successCount++;
    console.log(`[${this.id}] Detected ${newPatterns.length} new patterns`);
    return newPatterns;
  }

  // ---------------------------------------------------------------------------
  // Synergy Calculation
  // ---------------------------------------------------------------------------

  async calculateSynergies(): Promise<SkillSynergy[]> {
    const newSynergies: SkillSynergy[] = [];
    const skillPairs: Map<string, { successes: number; total: number }> = new Map();

    // Find skill pairs that appear together
    const recentExecutions = this.executions.slice(-200);
    
    for (let i = 1; i < recentExecutions.length; i++) {
      const prev = recentExecutions[i - 1]!;
      const curr = recentExecutions[i]!;

      // Only consider executions within 10 minutes
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
      if (timeDiff > 10 * 60 * 1000) continue;
      if (prev.skillId === curr.skillId) continue;

      const key = [prev.skillId, curr.skillId].sort().join(':');
      const existing = skillPairs.get(key);
      const bothSuccess = prev.success && curr.success;

      if (existing) {
        existing.total++;
        if (bothSuccess) existing.successes++;
      } else {
        skillPairs.set(key, {
          total: 1,
          successes: bothSuccess ? 1 : 0,
        });
      }
    }

    // Convert high-synergy pairs
    for (const [key, data] of skillPairs) {
      if (data.total < 3) continue;

      const successRate = data.successes / data.total;
      if (successRate >= this.config.synergyThreshold) {
        const parts = key.split(':');
        const skillA = parts[0] ?? 'unknown';
        const skillB = parts[1] ?? 'unknown';
        const existing = this.synergies.get(key);

        if (existing) {
          existing.synergyScore = successRate;
          existing.combinedSuccessRate = successRate;
          existing.interactions = data.total;
        } else {
          const synergy: SkillSynergy = {
            id: randomUUID(),
            skillA,
            skillB,
            synergyScore: successRate,
            combinedSuccessRate: successRate,
            interactions: data.total,
            discoveredAt: new Date(),
          };
          this.synergies.set(key, synergy);
          newSynergies.push(synergy);

          // Emit emergence signal for new synergy
          await this.emitSignal({
            type: 'synergy',
            source: this.id,
            strength: successRate,
            description: `High synergy detected between ${skillA} and ${skillB}`,
            relatedSkills: [skillA, skillB],
          });
        }
      }
    }

    console.log(`[${this.id}] Found ${newSynergies.length} new synergies`);
    return newSynergies;
  }

  private async updateSynergies(skillId: string): Promise<void> {
    // Quick synergy update after each execution
    const recent = this.executions.slice(-10);
    const otherSkills = new Set(recent.filter((e) => e.skillId !== skillId).map((e) => e.skillId));

    for (const otherSkill of otherSkills) {
      const key = [skillId, otherSkill].sort().join(':');
      const synergy = this.synergies.get(key);
      if (synergy) {
        synergy.interactions++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Goal Generation
  // ---------------------------------------------------------------------------

  async generateGoals(): Promise<EmergentGoal[]> {
    const newGoals: EmergentGoal[] = [];
    const activeGoals = Array.from(this.goals.values()).filter((g) => g.status === 'active');

    if (activeGoals.length >= this.config.maxActiveGoals) {
      console.log(`[${this.id}] Max active goals reached, skipping generation`);
      return [];
    }

    // Generate goals from patterns
    for (const pattern of this.patterns.values()) {
      if (pattern.confidence < 0.5) continue;

      const goalKey = `pattern:${pattern.id}`;
      if (!this.hasGoalForSource(goalKey)) {
        const goal: EmergentGoal = {
          id: randomUUID(),
          title: `Optimize ${pattern.name}`,
          description: `Improve the workflow: ${pattern.description}`,
          priority: Math.round(pattern.confidence * 10),
          sourcePattern: pattern.id,
          status: 'proposed',
          createdAt: new Date(),
        };
        this.goals.set(goal.id, goal);
        newGoals.push(goal);
      }
    }

    // Generate goals from synergies
    for (const synergy of this.synergies.values()) {
      if (synergy.synergyScore < 0.8) continue;

      const goalKey = `synergy:${synergy.id}`;
      if (!this.hasGoalForSource(goalKey)) {
        const goal: EmergentGoal = {
          id: randomUUID(),
          title: `Leverage ${synergy.skillA} + ${synergy.skillB} synergy`,
          description: `These skills work well together (${Math.round(synergy.synergyScore * 100)}% combined success)`,
          priority: Math.round(synergy.synergyScore * 10),
          sourceSynergy: synergy.id,
          status: 'proposed',
          createdAt: new Date(),
        };
        this.goals.set(goal.id, goal);
        newGoals.push(goal);
      }
    }

    if (newGoals.length > 0) {
      await this.emitSignal({
        type: 'insight',
        source: this.id,
        strength: 0.7,
        description: `Generated ${newGoals.length} new improvement goals`,
        relatedSkills: [],
      });
    }

    console.log(`[${this.id}] Generated ${newGoals.length} new goals`);
    return newGoals;
  }

  private hasGoalForSource(sourceKey: string): boolean {
    for (const goal of this.goals.values()) {
      if (sourceKey.startsWith('pattern:') && goal.sourcePattern === sourceKey.replace('pattern:', '')) {
        return true;
      }
      if (sourceKey.startsWith('synergy:') && goal.sourceSynergy === sourceKey.replace('synergy:', '')) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Signal Management
  // ---------------------------------------------------------------------------

  async emitSignal(
    input: Omit<EmergenceSignal, 'id' | 'timestamp' | 'exploited'>
  ): Promise<EmergenceSignal> {
    const signal: EmergenceSignal = {
      ...input,
      id: randomUUID(),
      timestamp: new Date(),
      exploited: false,
    };

    this.signals.push(signal);
    this.stats.operationCount++;
    this.stats.lastOperationAt = new Date();

    // Keep last 500 signals
    if (this.signals.length > 500) {
      this.signals = this.signals.slice(-500);
    }

    console.log(`[${this.id}] 📡 Signal: ${signal.type} - ${signal.description}`);
    return signal;
  }

  getSignals(limit = 50): EmergenceSignal[] {
    return this.signals.slice(-limit);
  }

  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  getSynergies(): SkillSynergy[] {
    return Array.from(this.synergies.values());
  }

  getGoals(): EmergentGoal[] {
    return Array.from(this.goals.values());
  }

  async updateGoalStatus(goalId: string, status: EmergentGoal['status']): Promise<EmergentGoal> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    goal.status = status;
    this.stats.operationCount++;

    console.log(`[${this.id}] Goal ${goalId} status → ${status}`);
    return goal;
  }

  getMetrics(): EmergenceMetrics {
    const goals = Array.from(this.goals.values());

    return {
      totalSignals: this.signals.length,
      signalCount: this.signals.length,
      patternsDetected: this.patterns.size,
      totalPatterns: this.patterns.size,
      synergiesFound: this.synergies.size,
      totalSynergies: this.synergies.size,
      goalsGenerated: goals.length,
      goalsCompleted: goals.filter((g) => g.status === 'completed').length,
      activeGoals: goals.filter((g) => g.status === 'active').length,
    };
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    if (!this.config.persistPath) return;

    try {
      const data = await fs.readJson(this.config.persistPath);

      this.patterns = new Map(
        data.patterns.map((p: Pattern) => [
          p.id,
          { ...p, createdAt: new Date(p.createdAt), lastSeenAt: new Date(p.lastSeenAt) },
        ])
      );

      this.synergies = new Map(
        data.synergies.map((s: SkillSynergy) => [
          `${s.skillA}:${s.skillB}`,
          { ...s, discoveredAt: new Date(s.discoveredAt) },
        ])
      );

      this.goals = new Map(
        data.goals.map((g: EmergentGoal) => [
          g.id,
          { ...g, createdAt: new Date(g.createdAt) },
        ])
      );

      this.signals = data.signals.map((s: EmergenceSignal) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      }));

      console.log(`[${this.id}] Loaded state from disk`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[${this.id}] Failed to load state:`, error);
      }
    }
  }

  private async saveState(): Promise<void> {
    if (!this.config.persistPath) return;

    try {
      await fs.ensureDir(path.dirname(this.config.persistPath));
      await fs.writeJson(
        this.config.persistPath,
        {
          patterns: Array.from(this.patterns.values()),
          synergies: Array.from(this.synergies.values()),
          goals: Array.from(this.goals.values()),
          signals: this.signals.slice(-100),
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error(`[${this.id}] Failed to save state:`, error);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: EmergenceEngine | null = null;

export function getEmergenceEngine(config?: Partial<EmergenceEngineConfig>): EmergenceEngine {
  if (!instance) {
    instance = new EmergenceEngine(config);
  }
  return instance;
}

export function resetEmergenceEngine(): void {
  instance = null;
}
