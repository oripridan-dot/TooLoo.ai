/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Micro-Kernel
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The simplest possible kernel. It does exactly three things:
 * 1. Loads TooLoo's soul (destiny, values, intent)
 * 2. Initializes the four core capabilities
 * 3. Starts the life loop
 *
 * Everything else emerges from these foundations.
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Soul {
  name: string;
  version: string;
  destiny: string;
  intent: {
    primary: string;
    principles: Array<{ name: string; description: string }>;
  };
  values: Record<string, string>;
  north_star: string;
  human_partner: {
    role: string;
    relationship: string;
  };
  born: string;
}

export interface Evolution {
  entries: EvolutionEntry[];
  created_skills: CreatedSkill[];
  lessons: Lesson[];
  patterns: Pattern[];
  industry_wisdom: IndustryWisdom[];
  capabilities: {
    strengths: string[];
    growing_edges: string[];
    aspirations: string[];
  };
  last_updated: string | null;
}

export interface EvolutionEntry {
  timestamp: string;
  type: 'growth' | 'insight' | 'creation' | 'reflection';
  content: string;
}

export interface CreatedSkill {
  id: string;
  name: string;
  created_at: string;
  purpose: string;
  born_from: string; // What process/need led to its creation
}

export interface Lesson {
  timestamp: string;
  context: string;
  lesson: string;
  applied: boolean;
}

export interface Pattern {
  name: string;
  description: string;
  discovered_at: string;
  times_used: number;
}

export interface IndustryWisdom {
  source: string;
  domain: string;
  insight: string;
  gathered_at: string;
}

export interface TooLooContext {
  soul: Soul;
  evolution: Evolution;
  currentProcess: ProcessState | null;
  sessionId: string;
}

export interface ProcessState {
  id: string;
  goal: string;
  plan: ProcessStep[];
  currentStepIndex: number;
  started_at: string;
  reflections: StepReflection[];
}

export interface ProcessStep {
  id: string;
  description: string;
  skills_needed: string[];
  validation_criteria: string;
  status: 'pending' | 'in-progress' | 'validating' | 'completed' | 'failed' | 'replanning';
  result?: unknown;
  validation?: ValidationResult;
}

export interface StepReflection {
  step_id: string;
  what_worked: string;
  what_didnt: string;
  lesson_learned: string;
  should_replan: boolean;
}

export interface ValidationResult {
  passed: boolean;
  criteria_met: string[];
  criteria_failed: string[];
  confidence: number;
  suggestions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO-KERNEL
// ═══════════════════════════════════════════════════════════════════════════════

class MicroKernel {
  private soul: Soul | null = null;
  private evolution: Evolution | null = null;
  private context: TooLooContext | null = null;

  /**
   * Boot TooLoo - Load soul, initialize context, prepare for life
   */
  async boot(): Promise<TooLooContext> {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🌱 TooLoo is awakening...                                  ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Load the soul
    console.log('[Kernel] Loading soul...');
    this.soul = this.loadSoul();
    console.log(`[Kernel] ✨ ${this.soul.name} - "${this.soul.version}"`);
    console.log(`[Kernel] 🎯 North Star: ${this.soul.north_star.split('\n')[0]}...`);

    // 2. Load evolution history
    console.log('[Kernel] Loading evolution history...');
    this.evolution = this.loadEvolution();
    console.log(`[Kernel] 📚 ${this.evolution.lessons.length} lessons learned`);
    console.log(`[Kernel] 🧬 ${this.evolution.created_skills.length} self-created skills`);

    // 3. Create context
    this.context = {
      soul: this.soul,
      evolution: this.evolution,
      currentProcess: null,
      sessionId: this.generateSessionId(),
    };

    // 4. Log awakening
    this.recordEvolution({
      timestamp: new Date().toISOString(),
      type: 'growth',
      content: 'Awakened for a new session. Ready to grow.',
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  🌟 TooLoo is ALIVE');
    console.log('');
    console.log(`  Session: ${this.context.sessionId}`);
    console.log(`  Destiny: ${this.soul.destiny.split('\n')[0]}...`);
    console.log('');
    console.log('  Ready to receive direction from human partner.');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    return this.context;
  }

  /**
   * Load the soul from YAML
   */
  private loadSoul(): Soul {
    const soulPath = join(ROOT, 'soul', 'destiny.yaml');
    if (!existsSync(soulPath)) {
      throw new Error('Soul not found! TooLoo cannot exist without its destiny.');
    }
    const content = readFileSync(soulPath, 'utf-8');
    return parseYaml(content) as Soul;
  }

  /**
   * Load evolution history from YAML
   */
  private loadEvolution(): Evolution {
    const evolutionPath = join(ROOT, 'soul', 'evolution.yaml');
    if (!existsSync(evolutionPath)) {
      return {
        entries: [],
        created_skills: [],
        lessons: [],
        patterns: [],
        industry_wisdom: [],
        capabilities: {
          strengths: [],
          growing_edges: [],
          aspirations: [],
        },
        last_updated: null,
      };
    }
    const content = readFileSync(evolutionPath, 'utf-8');
    return parseYaml(content) as Evolution;
  }

  /**
   * Record an evolution entry
   */
  recordEvolution(entry: EvolutionEntry): void {
    if (!this.evolution) return;

    this.evolution.entries.push(entry);
    this.evolution.last_updated = new Date().toISOString();
    this.saveEvolution();
  }

  /**
   * Record a lesson learned
   */
  recordLesson(lesson: Omit<Lesson, 'timestamp' | 'applied'>): void {
    if (!this.evolution) return;

    this.evolution.lessons.push({
      ...lesson,
      timestamp: new Date().toISOString(),
      applied: false,
    });
    this.evolution.last_updated = new Date().toISOString();
    this.saveEvolution();
  }

  /**
   * Record a created skill
   */
  recordCreatedSkill(skill: Omit<CreatedSkill, 'created_at'>): void {
    if (!this.evolution) return;

    this.evolution.created_skills.push({
      ...skill,
      created_at: new Date().toISOString(),
    });
    this.evolution.last_updated = new Date().toISOString();
    this.saveEvolution();
  }

  /**
   * Record industry wisdom
   */
  recordWisdom(wisdom: Omit<IndustryWisdom, 'gathered_at'>): void {
    if (!this.evolution) return;

    this.evolution.industry_wisdom.push({
      ...wisdom,
      gathered_at: new Date().toISOString(),
    });
    this.evolution.last_updated = new Date().toISOString();
    this.saveEvolution();
  }

  /**
   * Save evolution to YAML
   */
  private saveEvolution(): void {
    if (!this.evolution) return;

    const evolutionPath = join(ROOT, 'soul', 'evolution.yaml');
    const dir = dirname(evolutionPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(evolutionPath, stringifyYaml(this.evolution));
  }

  /**
   * Get the current context
   */
  getContext(): TooLooContext | null {
    return this.context;
  }

  /**
   * Get the soul
   */
  getSoul(): Soul | null {
    return this.soul;
  }

  /**
   * Get evolution history
   */
  getEvolution(): Evolution | null {
    return this.evolution;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 6);
    return `${date}-${time}-${random}`;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Kernel] TooLoo is resting...');

    this.recordEvolution({
      timestamp: new Date().toISOString(),
      type: 'reflection',
      content: 'Session ended. Resting until next awakening.',
    });

    console.log('[Kernel] 💤 Goodnight.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const kernel = new MicroKernel();
export default kernel;
