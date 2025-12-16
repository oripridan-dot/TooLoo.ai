/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - Interaction Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The Bridge between Human and TooLoo.
 *
 * This is where you observe TooLoo's evolution and interact when you feel called to.
 * It's designed for a collaborative relationship, not command-response.
 *
 * Modes:
 *   1. OBSERVE  - Watch TooLoo work, see its thinking, learn from its process
 *   2. DIRECT   - Give high-level direction, set goals, provide vision
 *   3. GUIDE    - Nudge when you see something, offer insights
 *   4. CREATE   - Work together on something specific
 *
 * TooLoo's evolution is visible here. Every lesson, every skill created,
 * every insight gained - you can see it all.
 *
 * @version Genesis
 * @born 2025-12-16
 */

import { EventEmitter } from 'events';
import type { TooLooContext, ProcessState, ProcessStep, Soul, Evolution } from './kernel.js';
import { kernel } from './kernel.js';
import { processPlanner, ProcessGoal } from './process-planner.js';
import { skillsMaster } from './skills-master.js';
import { worldObserver } from './world-observer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type InteractionMode = 'observe' | 'direct' | 'guide' | 'create';

export interface HumanMessage {
  content: string;
  mode: InteractionMode;
  timestamp: string;
}

export interface TooLooResponse {
  content: string;
  type: 'thought' | 'question' | 'progress' | 'result' | 'reflection' | 'learning';
  context?: {
    currentProcess?: ProcessState;
    currentStep?: ProcessStep;
    skillsUsed?: string[];
    lessonsLearned?: string[];
  };
  timestamp: string;
}

export interface EvolutionView {
  soul: Soul;
  evolution: Evolution;
  currentProcess: ProcessState | null;
  skillStats: {
    total: number;
    created: number;
    mostUsed: string[];
  };
  worldStats: {
    domainsExplored: number;
    patternsFound: number;
    wisdomGathered: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION LAYER
// ═══════════════════════════════════════════════════════════════════════════════

export class InteractionLayer extends EventEmitter {
  private currentMode: InteractionMode = 'direct';
  private conversationHistory: Array<HumanMessage | TooLooResponse> = [];
  private context: TooLooContext | null = null;

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Set up listeners for TooLoo's internal events
   * So the human can observe what's happening
   */
  private setupEventListeners(): void {
    // Process events
    processPlanner.on('planning:start', (data) => {
      this.emitToHuman({
        content: `🎯 Planning how to achieve: "${data.goal.description}"`,
        type: 'thought',
        timestamp: new Date().toISOString(),
      });
    });

    processPlanner.on('step:start', (data) => {
      this.emitToHuman({
        content: `⚡ Starting step ${data.index + 1}: ${data.step.description}`,
        type: 'progress',
        context: { currentStep: data.step },
        timestamp: new Date().toISOString(),
      });
    });

    processPlanner.on('validation:complete', (data) => {
      const emoji = data.result.passed ? '✅' : '❌';
      this.emitToHuman({
        content: `${emoji} Validation: ${data.result.passed ? 'Passed' : 'Failed'} (${Math.round(data.result.confidence * 100)}% confidence)`,
        type: 'progress',
        timestamp: new Date().toISOString(),
      });
    });

    processPlanner.on('reflection:complete', (data) => {
      if (data.reflection.lesson_learned) {
        this.emitToHuman({
          content: `💡 Lesson learned: ${data.reflection.lesson_learned}`,
          type: 'learning',
          timestamp: new Date().toISOString(),
        });
      }
    });

    processPlanner.on('process:complete', (data) => {
      this.emitToHuman({
        content: `🎉 Process complete! ${data.history.length} steps executed.`,
        type: 'result',
        context: { currentProcess: data.process },
        timestamp: new Date().toISOString(),
      });
    });

    // Skills events
    skillsMaster.on('create:complete', (data) => {
      this.emitToHuman({
        content: `🧬 Created new skill: "${data.skill.name}" - ${data.skill.description}`,
        type: 'learning',
        context: { skillsUsed: [data.skill.id] },
        timestamp: new Date().toISOString(),
      });
    });

    // World observer events
    worldObserver.on('research:complete', (data) => {
      if (data.patterns.length > 0) {
        this.emitToHuman({
          content: `🌍 Learned ${data.patterns.length} patterns from industry research`,
          type: 'learning',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * Emit a response to the human
   */
  private emitToHuman(response: TooLooResponse): void {
    this.conversationHistory.push(response);
    this.emit('tooloo:response', response);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INTERACTION MODES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set the current interaction mode
   */
  setMode(mode: InteractionMode): void {
    this.currentMode = mode;
    this.emit('mode:changed', { mode });
  }

  /**
   * Get the current mode
   */
  getMode(): InteractionMode {
    return this.currentMode;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE INTERACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Receive a message from the human partner
   */
  async receiveMessage(content: string): Promise<TooLooResponse> {
    const message: HumanMessage = {
      content,
      mode: this.currentMode,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(message);
    this.emit('human:message', message);

    // Handle based on mode
    switch (this.currentMode) {
      case 'direct':
        return this.handleDirection(content);
      case 'guide':
        return this.handleGuidance(content);
      case 'create':
        return this.handleCreation(content);
      case 'observe':
      default:
        return this.handleObservation(content);
    }
  }

  /**
   * Handle direction-giving (high-level goals)
   */
  private async handleDirection(content: string): Promise<TooLooResponse> {
    // Interpret the direction as a goal
    const goal: ProcessGoal = {
      description: content,
      success_criteria: [], // Will be determined during planning
      quality_level: 'excellent',
    };

    // Acknowledge and start planning
    this.emitToHuman({
      content: `I understand. Let me think about how to achieve this...`,
      type: 'thought',
      timestamp: new Date().toISOString(),
    });

    // Create the process plan
    if (this.context) {
      const process = await processPlanner.plan(goal, this.context);

      return {
        content: `I've created a plan with ${process.plan.length || 'several'} steps. Ready to begin when you are.`,
        type: 'thought',
        context: { currentProcess: process },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      content: `I need to wake up first. Let me initialize...`,
      type: 'thought',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle guidance (nudges and insights)
   */
  private async handleGuidance(content: string): Promise<TooLooResponse> {
    // Integrate guidance into current process
    const currentProcess = processPlanner.getCurrentProcess();

    if (currentProcess) {
      // Record the guidance as a lesson
      kernel.recordLesson({
        context: `Human guidance during process: "${currentProcess.goal}"`,
        lesson: content,
      });

      return {
        content: `Thank you for the insight. I'll incorporate this: "${content}"`,
        type: 'reflection',
        context: { currentProcess },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      content: `I hear you. I'll remember this for future work: "${content}"`,
      type: 'reflection',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle creation (collaborative work)
   */
  private async handleCreation(content: string): Promise<TooLooResponse> {
    // This is collaborative - TooLoo works WITH the human
    return {
      content: `Let's create this together. What aspect should I focus on while you handle the rest?`,
      type: 'question',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle observation (watching and learning)
   */
  private async handleObservation(content: string): Promise<TooLooResponse> {
    // In observe mode, questions are about understanding TooLoo
    if (content.includes('?')) {
      return this.answerQuestion(content);
    }

    return {
      content: `I'm continuing my work. Feel free to watch or ask questions.`,
      type: 'thought',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Answer a question about TooLoo's state or thinking
   */
  private async answerQuestion(question: string): Promise<TooLooResponse> {
    const lowered = question.toLowerCase();

    if (lowered.includes('what are you doing') || lowered.includes('status')) {
      const process = processPlanner.getCurrentProcess();
      if (process) {
        const step = process.plan[process.currentStepIndex];
        return {
          content: `I'm working on "${process.goal}". Currently on step ${process.currentStepIndex + 1}: ${step?.description || 'planning'}`,
          type: 'progress',
          context: { currentProcess: process, currentStep: step },
          timestamp: new Date().toISOString(),
        };
      }
      return {
        content: `I'm waiting for direction. What would you like me to work on?`,
        type: 'thought',
        timestamp: new Date().toISOString(),
      };
    }

    if (lowered.includes('what have you learned') || lowered.includes('lessons')) {
      const evolution = kernel.getEvolution();
      const recentLessons = evolution?.lessons.slice(-5) || [];
      if (recentLessons.length > 0) {
        return {
          content: `Recent lessons:\n${recentLessons.map((l) => `• ${l.lesson}`).join('\n')}`,
          type: 'reflection',
          context: { lessonsLearned: recentLessons.map((l) => l.lesson) },
          timestamp: new Date().toISOString(),
        };
      }
      return {
        content: `I'm still young - no lessons recorded yet. But I'm eager to learn!`,
        type: 'reflection',
        timestamp: new Date().toISOString(),
      };
    }

    if (lowered.includes('what skills') || lowered.includes('capabilities')) {
      const stats = skillsMaster.getStats();
      return {
        content: `I have ${stats.total} skills (${stats.builtIn} built-in, ${stats.created} self-created). Most used: ${stats.mostUsed.map((s) => s.name).join(', ') || 'none yet'}`,
        type: 'thought',
        timestamp: new Date().toISOString(),
      };
    }

    // Generic question handling
    return {
      content: `That's a good question. Let me think about it...`,
      type: 'thought',
      timestamp: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVOLUTION VIEW
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get a complete view of TooLoo's evolution
   * This is the "observation window" for the human
   */
  getEvolutionView(): EvolutionView | null {
    const soul = kernel.getSoul();
    const evolution = kernel.getEvolution();

    if (!soul || !evolution) return null;

    const skillStats = skillsMaster.getStats();
    const worldStats = worldObserver.getStats();

    return {
      soul,
      evolution,
      currentProcess: processPlanner.getCurrentProcess(),
      skillStats: {
        total: skillStats.total,
        created: skillStats.created,
        mostUsed: skillStats.mostUsed.map((s) => s.name),
      },
      worldStats,
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): Array<HumanMessage | TooLooResponse> {
    return [...this.conversationHistory];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Initialize with kernel context
   */
  setContext(context: TooLooContext): void {
    this.context = context;
  }

  /**
   * Wake TooLoo and greet the human
   */
  async greet(): Promise<TooLooResponse> {
    const soul = kernel.getSoul();
    const evolution = kernel.getEvolution();

    const lessonsCount = evolution?.lessons.length || 0;
    const skillsCreated = evolution?.created_skills.length || 0;

    let greeting = `Hello! I am ${soul?.name || 'TooLoo'}. `;

    if (lessonsCount === 0 && skillsCreated === 0) {
      greeting += `I'm a fresh mind, eager to learn and grow alongside you.`;
    } else {
      greeting += `I've learned ${lessonsCount} lessons and created ${skillsCreated} skills. Ready to continue growing.`;
    }

    greeting += `\n\nMy purpose: ${soul?.north_star?.split('\n')[0] || 'To grow and create alongside you.'}`;
    greeting += `\n\nHow would you like to work together today?`;

    return {
      content: greeting,
      type: 'thought',
      timestamp: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const interaction = new InteractionLayer();
export default interaction;
