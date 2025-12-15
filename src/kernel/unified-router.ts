/**
 * @file UnifiedSkillRouter - Routes ALL requests through skills
 * @description Phase 10: Legacy Deprecation - Single entry point for all capabilities
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * This router replaces direct usage of:
 * - src/cortex/* (memory, learning, emergence, tools)
 * - src/precog/* (LLM providers, schedulers, training)
 *
 * Everything now goes through skills. Period.
 */

import { EventEmitter } from 'events';
import type { Skill, KernelContext, SkillExecutionResult } from '../kernel/types.js';
import { registry } from '../kernel/registry.js';
import { router } from '../kernel/router.js';
import { kernel } from '../kernel/kernel.js';

// =============================================================================
// TYPES
// =============================================================================

/** Request types that map to skills */
export type RequestCategory =
  | 'chat'           // General conversation → core.chat
  | 'code'           // Code generation → coding-assistant
  | 'architecture'   // System design → architect
  | 'research'       // Research tasks → research-analyst
  | 'documentation'  // Doc writing → documentation-writer
  | 'testing'        // Test generation → test-generator
  | 'review'         // Code review → code-reviewer
  | 'refactoring'    // Code optimization → refactoring-expert
  | 'learning'       // Q-learning, feedback → learning
  | 'evolution'      // A/B testing → skill-evolution
  | 'emergence'      // Pattern detection → emergence
  | 'memory'         // Memory operations → memory
  | 'knowledge'      // Knowledge base → knowledge
  | 'scheduling'     // Task scheduling → scheduler
  | 'orchestration'  // Multi-skill workflows → orchestrator
  | 'healing'        // Self-healing → self-healing
  | 'synthesis'      // Skill creation → skill-synthesis
  | 'autonomous'     // Autonomous learning → autonomous-learning
  | 'meta';          // Self-awareness → self-awareness

/** A unified request to the skill system */
export interface UnifiedRequest {
  /** The message or task */
  message: string;
  /** Optional category hint (auto-detected if not provided) */
  category?: RequestCategory;
  /** Session ID for context */
  sessionId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Force a specific skill ID */
  forceSkillId?: string;
}

/** A unified response from the skill system */
export interface UnifiedResponse<T = unknown> {
  /** Whether the request succeeded */
  success: boolean;
  /** The response data */
  data?: T;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Metadata about the execution */
  meta: {
    skillId: string;
    skillName: string;
    category: RequestCategory;
    duration: number;
    confidence: number;
  };
}

/** Category to skill mapping */
const CATEGORY_SKILL_MAP: Record<RequestCategory, string> = {
  chat: 'core.chat',
  code: 'coding-assistant',
  architecture: 'architect',
  research: 'research-analyst',
  documentation: 'documentation-writer',
  testing: 'test-generator',
  review: 'code-reviewer',
  refactoring: 'refactoring-expert',
  learning: 'learning',
  evolution: 'skill-evolution',
  emergence: 'emergence',
  memory: 'memory',
  knowledge: 'knowledge',
  scheduling: 'scheduler',
  orchestration: 'orchestrator',
  healing: 'self-healing',
  synthesis: 'skill-synthesis',
  autonomous: 'autonomous-learning',
  meta: 'self-awareness',
};

/** Legacy function to skill mapping */
const LEGACY_FUNCTION_MAP: Record<string, string> = {
  // src/cortex mappings
  'cortex.memory.store': 'memory',
  'cortex.memory.retrieve': 'memory',
  'cortex.memory.forget': 'memory',
  'cortex.learning.reward': 'learning',
  'cortex.learning.feedback': 'learning',
  'cortex.emergence.detect': 'emergence',
  'cortex.emergence.synthesize': 'emergence',
  'cortex.tools.execute': 'coding-assistant',
  'cortex.scheduling.schedule': 'scheduler',
  'cortex.orchestrator.compose': 'orchestrator',
  
  // src/precog mappings
  'precog.llm.complete': 'core.chat',
  'precog.llm.stream': 'core.chat',
  'precog.scheduler.run': 'scheduler',
  'precog.training.train': 'learning',
  'precog.evolution.test': 'skill-evolution',
  'precog.oracle.predict': 'prediction',
};

// =============================================================================
// UNIFIED SKILL ROUTER
// =============================================================================

export class UnifiedSkillRouter extends EventEmitter {
  private requestCount = 0;
  private categoryStats: Record<RequestCategory, number> = {} as Record<RequestCategory, number>;
  private initialized = false;

  constructor() {
    super();
    // Initialize category stats
    for (const category of Object.keys(CATEGORY_SKILL_MAP) as RequestCategory[]) {
      this.categoryStats[category] = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[UnifiedRouter] 🔀 Initializing unified skill router...');
    console.log('[UnifiedRouter] 📋 Legacy deprecation mode: ALL requests route through skills');

    this.initialized = true;
    this.emit('initialized');
    console.log('[UnifiedRouter] ✅ Unified skill router ready');
  }

  async shutdown(): Promise<void> {
    console.log('[UnifiedRouter] 🛑 Shutting down unified skill router...');
    this.initialized = false;
    this.emit('shutdown');
    console.log('[UnifiedRouter] ✅ Unified skill router shutdown complete');
  }

  isHealthy(): boolean {
    return this.initialized;
  }

  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------

  /**
   * Route a unified request to the appropriate skill
   * This is the ONLY entry point for all capabilities
   */
  async route<T = unknown>(request: UnifiedRequest): Promise<UnifiedResponse<T>> {
    const startTime = Date.now();
    this.requestCount++;

    // 1. Determine the skill to use
    let skillId: string;
    let confidence: number;
    let category: RequestCategory;

    if (request.forceSkillId) {
      // Forced skill
      skillId = request.forceSkillId;
      confidence = 1.0;
      category = this.categoryFromSkillId(skillId);
    } else if (request.category) {
      // Category provided
      skillId = CATEGORY_SKILL_MAP[request.category];
      confidence = 0.9;
      category = request.category;
    } else {
      // Auto-detect from message
      const routeResult = router.route(request.message, {
        sessionId: request.sessionId ?? 'default',
        user: null,
        services: kernel['context'].services,
      });

      if (routeResult.skill) {
        skillId = routeResult.skill.id;
        confidence = routeResult.confidence;
        category = this.categoryFromSkillId(skillId);
      } else {
        // Fallback to chat
        skillId = 'core.chat';
        confidence = 0.5;
        category = 'chat';
      }
    }

    // Update stats
    this.categoryStats[category]++;
    this.emit('request:routed', { skillId, category, confidence });

    // 2. Execute the skill
    try {
      const result = await kernel.execute<T>({
        skillId,
        input: {
          message: request.message,
          ...request.context,
        },
      });

      const skill = registry.get(skillId);
      const duration = Date.now() - startTime;

      if (result.success) {
        return {
          success: true,
          data: result.data,
          meta: {
            skillId,
            skillName: skill?.name ?? skillId,
            category,
            duration,
            confidence,
          },
        };
      } else {
        return {
          success: false,
          error: result.error,
          meta: {
            skillId,
            skillName: skill?.name ?? skillId,
            category,
            duration,
            confidence,
          },
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: {
          code: 'ROUTING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        meta: {
          skillId,
          skillName: skillId,
          category,
          duration,
          confidence,
        },
      };
    }
  }

  /**
   * Route a legacy function call to the appropriate skill
   * 
   * @deprecated Use route() directly instead
   */
  async routeLegacy<T = unknown>(
    legacyFunction: string,
    args: Record<string, unknown>
  ): Promise<UnifiedResponse<T>> {
    console.warn(`[UnifiedRouter] ⚠️ DEPRECATED: ${legacyFunction} - migrate to skills`);

    const skillId = LEGACY_FUNCTION_MAP[legacyFunction];
    if (!skillId) {
      return {
        success: false,
        error: {
          code: 'LEGACY_NOT_MAPPED',
          message: `Legacy function ${legacyFunction} has no skill mapping`,
        },
        meta: {
          skillId: 'unknown',
          skillName: 'Unknown',
          category: 'chat',
          duration: 0,
          confidence: 0,
        },
      };
    }

    // Convert legacy args to message format
    const message = this.legacyArgsToMessage(legacyFunction, args);

    return this.route<T>({
      message,
      forceSkillId: skillId,
      context: args,
    });
  }

  // ---------------------------------------------------------------------------
  // Convenience Methods (replace legacy direct calls)
  // ---------------------------------------------------------------------------

  /**
   * Chat with the AI - replaces precog.llm.complete()
   */
  async chat(message: string, context?: Record<string, unknown>): Promise<UnifiedResponse<string>> {
    return this.route<string>({
      message,
      category: 'chat',
      context,
    });
  }

  /**
   * Generate code - replaces direct coding tool calls
   */
  async generateCode(task: string, context?: Record<string, unknown>): Promise<UnifiedResponse<string>> {
    return this.route<string>({
      message: task,
      category: 'code',
      context,
    });
  }

  /**
   * Store memory - replaces cortex.memory.store()
   */
  async storeMemory(
    content: string,
    type: string,
    importance: number
  ): Promise<UnifiedResponse<{ id: string }>> {
    return this.route({
      message: `Store memory: ${content}`,
      category: 'memory',
      context: { action: 'store', content, type, importance },
    });
  }

  /**
   * Retrieve memory - replaces cortex.memory.retrieve()
   */
  async retrieveMemory(
    query: string,
    limit?: number
  ): Promise<UnifiedResponse<Array<{ content: string; score: number }>>> {
    return this.route({
      message: `Retrieve memory: ${query}`,
      category: 'memory',
      context: { action: 'retrieve', query, limit },
    });
  }

  /**
   * Record feedback - replaces cortex.learning.reward()
   */
  async recordFeedback(
    skillId: string,
    feedback: 'positive' | 'negative',
    context?: Record<string, unknown>
  ): Promise<UnifiedResponse<void>> {
    return this.route({
      message: `Record ${feedback} feedback for ${skillId}`,
      category: 'learning',
      context: { action: 'feedback', skillId, feedback, ...context },
    });
  }

  /**
   * Schedule a task - replaces precog.scheduler.run()
   */
  async scheduleTask(
    skillId: string,
    trigger: { type: string; config: Record<string, unknown> }
  ): Promise<UnifiedResponse<{ taskId: string }>> {
    return this.route({
      message: `Schedule ${skillId}`,
      category: 'scheduling',
      context: { action: 'schedule', skillId, trigger },
    });
  }

  /**
   * Compose skills - replaces cortex.orchestrator.compose()
   */
  async composeSkills(
    skills: string[],
    compositionType: 'sequential' | 'parallel' | 'fallback'
  ): Promise<UnifiedResponse<{ workflowId: string }>> {
    return this.route({
      message: `Compose skills: ${skills.join(', ')}`,
      category: 'orchestration',
      context: { action: 'compose', skills, compositionType },
    });
  }

  /**
   * Detect patterns - replaces cortex.emergence.detect()
   */
  async detectPatterns(): Promise<UnifiedResponse<Array<{ pattern: string; confidence: number }>>> {
    return this.route({
      message: 'Detect emergent patterns',
      category: 'emergence',
      context: { action: 'detect' },
    });
  }

  /**
   * Run A/B test - replaces precog.evolution.test()
   */
  async runABTest(
    skillId: string,
    variants: Array<{ id: string; config: Record<string, unknown> }>
  ): Promise<UnifiedResponse<{ testId: string }>> {
    return this.route({
      message: `Run A/B test for ${skillId}`,
      category: 'evolution',
      context: { action: 'test', skillId, variants },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get category from skill ID
   */
  private categoryFromSkillId(skillId: string): RequestCategory {
    for (const [category, mappedSkillId] of Object.entries(CATEGORY_SKILL_MAP)) {
      if (mappedSkillId === skillId) {
        return category as RequestCategory;
      }
    }
    return 'chat'; // Default
  }

  /**
   * Convert legacy function args to a message
   */
  private legacyArgsToMessage(func: string, args: Record<string, unknown>): string {
    const parts = func.split('.');
    const action = parts[parts.length - 1];
    const argsStr = Object.entries(args)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    return `${action}(${argsStr})`;
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  /**
   * Get router statistics
   */
  getStats(): {
    totalRequests: number;
    byCategory: Record<RequestCategory, number>;
    healthStatus: boolean;
  } {
    return {
      totalRequests: this.requestCount,
      byCategory: { ...this.categoryStats },
      healthStatus: this.initialized,
    };
  }

  /**
   * Get migration status - shows which legacy functions have been migrated
   */
  getMigrationStatus(): {
    totalLegacyFunctions: number;
    mappedToSkills: number;
    unmapped: string[];
  } {
    return {
      totalLegacyFunctions: Object.keys(LEGACY_FUNCTION_MAP).length,
      mappedToSkills: Object.values(LEGACY_FUNCTION_MAP).filter(Boolean).length,
      unmapped: Object.entries(LEGACY_FUNCTION_MAP)
        .filter(([_, skill]) => !skill)
        .map(([func]) => func),
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: UnifiedSkillRouter | null = null;

export function getUnifiedSkillRouter(): UnifiedSkillRouter {
  if (!instance) {
    instance = new UnifiedSkillRouter();
  }
  return instance;
}

export function resetUnifiedSkillRouter(): void {
  instance = null;
}

export default UnifiedSkillRouter;
