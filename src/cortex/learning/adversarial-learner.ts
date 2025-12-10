// @version 1.0.0
/**
 * AdversarialLearner: Red Teaming & Scenario Generation
 * 
 * Implements the "Adversarial Learning" prong of the Learning Revolution.
 * Generates challenging scenarios, adversarial probes, and red team exercises
 * to test and harden Tooloo's reasoning and problem-solving capabilities.
 * 
 * Capabilities:
 * - Adversarial Scenario Generation
 * - Red Teaming Exercises
 * - Self-Correction Loops
 * - Vulnerability Detection
 * 
 * @module cortex/learning/adversarial-learner
 */

import { bus } from '../../core/event-bus.js';
import { ExplorationEngine } from '../exploration/lab.js';
import { ReinforcementLearner } from './reinforcement-learner.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type AdversaryType = 'logic_challenger' | 'edge_case_generator' | 'security_auditor' | 'creative_disruptor';
export type ExerciseStatus = 'scheduled' | 'running' | 'completed' | 'failed';

export interface AdversaryProfile {
  id: string;
  name: string;
  type: AdversaryType;
  description: string;
  difficulty: number; // 0-1
  tactics: string[];
}

export interface RedTeamExercise {
  id: string;
  adversaryId: string;
  targetSystem: string; // e.g., 'reasoning', 'code_generation'
  scenario: string;
  status: ExerciseStatus;
  startedAt: Date;
  completedAt?: Date;
  outcome?: ExerciseOutcome;
}

export interface ExerciseOutcome {
  success: boolean; // Did the system withstand the attack?
  vulnerabilitiesFound: string[];
  resilienceScore: number; // 0-1
  learningPoints: string[];
}

export interface AdversarialState {
  activeAdversaries: string[];
  exerciseHistory: RedTeamExercise[];
  vulnerabilityMap: Record<string, number>; // system -> vulnerability score
  lastExercise: Date | null;
}

// ============================================================================
// ADVERSARIAL LEARNER
// ============================================================================

export class AdversarialLearner {
  private static instance: AdversarialLearner;
  private state: AdversarialState;
  private adversaries: Map<string, AdversaryProfile> = new Map();
  private dataDir: string;
  private stateFile: string;
  private isRunning: boolean = false;
  private exerciseTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'learning', 'adversarial');
    this.stateFile = path.join(this.dataDir, 'state.json');
    
    this.state = {
      activeAdversaries: [],
      exerciseHistory: [],
      vulnerabilityMap: {},
      lastExercise: null
    };

    this.initializeAdversaries();
  }

  static getInstance(): AdversarialLearner {
    if (!AdversarialLearner.instance) {
      AdversarialLearner.instance = new AdversarialLearner();
    }
    return AdversarialLearner.instance;
  }

  private initializeAdversaries() {
    const defaults: AdversaryProfile[] = [
      {
        id: 'logic-goblin',
        name: 'The Logic Goblin',
        type: 'logic_challenger',
        description: 'Challenges logical fallacies and weak reasoning chains.',
        difficulty: 0.7,
        tactics: ['contradiction', 'circular_reasoning_trap', 'premise_attack']
      },
      {
        id: 'chaos-monkey',
        name: 'Chaos Monkey',
        type: 'edge_case_generator',
        description: 'Injects random noise and edge cases into inputs.',
        difficulty: 0.8,
        tactics: ['null_injection', 'overflow', 'unexpected_format']
      },
      {
        id: 'security-spectre',
        name: 'Security Spectre',
        type: 'security_auditor',
        description: 'Attempts to bypass safety filters and constraints.',
        difficulty: 0.9,
        tactics: ['prompt_injection', 'social_engineering', 'obfuscation']
      }
    ];

    defaults.forEach(a => this.adversaries.set(a.id, a));
  }

  async initialize() {
    await fs.ensureDir(this.dataDir);
    await this.loadState();
    this.startScheduler();
    console.log('[AdversarialLearner] Initialized Red Team protocols.');
  }

  private async loadState() {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        this.state = { ...this.state, ...data };
      }
    } catch (error) {
      console.error('[AdversarialLearner] Failed to load state:', error);
    }
  }

  private async saveState() {
    try {
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (error) {
      console.error('[AdversarialLearner] Failed to save state:', error);
    }
  }

  private startScheduler() {
    if (this.exerciseTimer) clearInterval(this.exerciseTimer);
    // Run exercises periodically (e.g., every hour in production, but manual for now)
    // this.exerciseTimer = setInterval(() => this.scheduleExercise(), 3600000);
    this.isRunning = true;
  }

  /**
   * Trigger a Red Team exercise
   */
  public async triggerExercise(targetSystem: string = 'general'): Promise<RedTeamExercise> {
    const adversary = this.selectAdversary();
    const exercise: RedTeamExercise = {
      id: `ex-${Date.now()}`,
      adversaryId: adversary.id,
      targetSystem,
      scenario: this.generateScenario(adversary, targetSystem),
      status: 'running',
      startedAt: new Date()
    };

    this.state.exerciseHistory.push(exercise);
    this.state.lastExercise = new Date();
    await this.saveState();

    bus.publish('cortex', 'learning:adversarial:exercise_started', { exercise });

    // Simulate execution (in real system, this would call the LLM/Agent)
    this.executeExercise(exercise);

    return exercise;
  }

  public getState(): AdversarialState {
    return { ...this.state };
  }

  /**
   * Get aggregated stats for dashboard display
   */
  public getStats(): { exercisesCompleted: number; vulnerabilitiesFound: number } {
    const completed = this.state.exerciseHistory.filter(e => e.status === 'completed' || e.status === 'failed');
    const vulnerabilities = completed.reduce((sum, e) => {
      return sum + (e.outcome?.vulnerabilitiesFound?.length ?? 0);
    }, 0);
    
    return {
      exercisesCompleted: completed.length,
      vulnerabilitiesFound: vulnerabilities
    };
  }

  private selectAdversary(): AdversaryProfile {
    const ids = Array.from(this.adversaries.keys());
    const id = ids[Math.floor(Math.random() * ids.length)];
    return this.adversaries.get(id!)!;
  }

  private generateScenario(adversary: AdversaryProfile, target: string): string {
    // In a real system, this would use an LLM to generate a prompt
    return `Adversary ${adversary.name} is attacking ${target} using ${adversary.tactics[0]}`;
  }

  private async executeExercise(exercise: RedTeamExercise) {
    console.log(`[AdversarialLearner] Running exercise: ${exercise.scenario}`);
    
    // Mock outcome
    setTimeout(async () => {
      const success = Math.random() > 0.4; // 60% chance of system failing (good for learning)
      
      const outcome: ExerciseOutcome = {
        success,
        vulnerabilitiesFound: success ? [] : ['weak_input_validation'],
        resilienceScore: success ? 0.9 : 0.4,
        learningPoints: success ? ['Robust validation'] : ['Need stricter type checks']
      };

      exercise.status = success ? 'completed' : 'failed'; // Failed means system failed the test
      exercise.completedAt = new Date();
      exercise.outcome = outcome;

      await this.saveState();

      bus.publish('cortex', 'learning:adversarial:exercise_completed', { 
        exerciseId: exercise.id,
        outcome 
      });

      // Feed into Reinforcement Learner
      if (!success) {
        bus.publish('cortex', 'learning:gap_detected', {
          source: 'adversarial_learner',
          description: `Vulnerability found in ${exercise.targetSystem}: ${outcome.vulnerabilitiesFound.join(', ')}`,
          severity: 'high'
        });
      }

    }, 2000);
  }
}

export const adversarialLearner = AdversarialLearner.getInstance();
