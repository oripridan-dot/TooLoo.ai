/**
 * @tooloo/core - Skill Interface
 * The executable skill contract for the TooLoo system
 * 
 * @version 2.0.0-alpha.0
 * @description Defines the interface that all skills must implement,
 *              bridging YAML definitions to executable code.
 */

import { z } from 'zod';
import type { 
  Intent, 
  Message, 
  Artifact, 
  MemoryState,
  SessionId,
  ProjectId,
  SkillId,
} from './types.js';

// =============================================================================
// SKILL CONTEXT
// =============================================================================

/**
 * Complete context available to a skill during execution
 */
export interface SkillContext {
  /** Session identifier */
  sessionId: SessionId;
  
  /** Project context if available */
  projectId?: ProjectId;
  
  /** The user's message/prompt */
  userMessage: string;
  
  /** Detected intent */
  intent: Intent;
  
  /** Conversation history */
  conversation: Message[];
  
  /** Memory state with short-term and working memory */
  memory: MemoryState;
  
  /** Available artifacts */
  artifacts: Artifact[];
  
  /** Tools provided by the system */
  tools: SkillTool[];
  
  /** Memory access functions */
  memoryAccess: {
    /** Retrieve relevant memories based on query */
    getRelevant: (query: string, limit?: number) => Promise<RelevantMemory[]>;
    /** Store a new memory entry */
    store: (content: string, metadata?: Record<string, unknown>) => Promise<string>;
  };
}

/**
 * Tool available for skill execution
 */
export interface SkillTool {
  name: string;
  description: string;
  parameters: z.ZodType;
  execute: (params: unknown) => Promise<ToolResult>;
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory entry returned from semantic search
 */
export interface RelevantMemory {
  id: string;
  content: string;
  similarity: number;
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
  };
}

// =============================================================================
// SKILL INTERFACE
// =============================================================================

/**
 * Result of skill execution
 */
export interface SkillResult {
  /** Generated response content */
  content: string;
  
  /** Generated artifacts (code, documents, etc.) */
  artifacts?: Artifact[];
  
  /** Tool calls made during execution */
  toolCalls?: Array<{
    tool: string;
    params: unknown;
    result: ToolResult;
  }>;
  
  /** Follow-up suggestions */
  suggestions?: string[];
  
  /** Metadata about the execution */
  metadata?: {
    tokensUsed?: number;
    latencyMs?: number;
    confidence?: number;
  };
}

/**
 * The Skill interface - implemented by all executable skills
 * 
 * Skills are the "Applications" of TooLoo OS. Each skill:
 * - Has a unique identifier
 * - Defines when it should activate (matches)
 * - Executes logic to produce results
 */
export interface Skill {
  /** Unique skill identifier */
  readonly id: SkillId;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Short description */
  readonly description: string;
  
  /** Version (semver) */
  readonly version: string;
  
  /**
   * Determine if this skill should handle the given intent
   * @param intent - The detected user intent
   * @param message - The user's message
   * @returns Confidence score 0.0-1.0, or false if no match
   */
  matches(intent: Intent, message: string): number | false;
  
  /**
   * Execute the skill with the given context
   * @param context - Complete execution context
   * @returns Promise resolving to skill result
   */
  execute(context: SkillContext): Promise<SkillResult>;
  
  /**
   * Optional: Validate if the skill can execute with current context
   * Use this for pre-flight checks (e.g., required tools, permissions)
   */
  canExecute?(context: SkillContext): boolean | Promise<boolean>;
  
  /**
   * Optional: Clean up after execution
   * Use this for releasing resources, saving state, etc.
   */
  cleanup?(context: SkillContext): void | Promise<void>;
}

/**
 * Configuration for creating a skill
 */
export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  
  /** Intent types that trigger this skill */
  intents?: Intent['type'][];
  
  /** Keywords that boost match confidence */
  keywords?: string[];
  
  /** Regex patterns for matching */
  patterns?: RegExp[];
  
  /** Minimum confidence to accept a match */
  minConfidence?: number;
}

// =============================================================================
// SKILL FACTORY
// =============================================================================

/**
 * Create a skill from configuration and handlers
 * 
 * @example
 * ```ts
 * const codeSkill = defineSkill({
 *   id: 'code-generator',
 *   name: 'Code Generator',
 *   description: 'Generate code from descriptions',
 *   version: '1.0.0',
 *   intents: ['code', 'create'],
 *   keywords: ['write', 'create', 'implement'],
 * }, {
 *   execute: async (ctx) => {
 *     // Generate code...
 *     return { content: '// Generated code' };
 *   }
 * });
 * ```
 */
export function defineSkill(
  config: SkillConfig,
  handlers: {
    execute: (context: SkillContext) => Promise<SkillResult>;
    canExecute?: (context: SkillContext) => boolean | Promise<boolean>;
    cleanup?: (context: SkillContext) => void | Promise<void>;
    customMatch?: (intent: Intent, message: string) => number | false;
  }
): Skill {
  const {
    id,
    name,
    description,
    version,
    intents = [],
    keywords = [],
    patterns = [],
    minConfidence = 0.5,
  } = config;

  return {
    id: id as SkillId,
    name,
    description,
    version,

    matches(intent: Intent, message: string): number | false {
      // Custom matcher takes precedence
      if (handlers.customMatch) {
        return handlers.customMatch(intent, message);
      }

      let score = 0;
      const messageLower = message.toLowerCase();

      // Intent matching (40% weight)
      if (intents.includes(intent.type)) {
        score += 0.4 * intent.confidence;
      }

      // Keyword matching (30% weight)
      const keywordMatches = keywords.filter(k => 
        messageLower.includes(k.toLowerCase())
      ).length;
      if (keywords.length > 0) {
        score += 0.3 * (keywordMatches / keywords.length);
      }

      // Pattern matching (30% weight)
      const patternMatches = patterns.filter(p => p.test(message)).length;
      if (patterns.length > 0) {
        score += 0.3 * (patternMatches / patterns.length);
      }

      // Return false if below minimum confidence
      if (score < minConfidence) {
        return false;
      }

      return Math.min(score, 1.0);
    },

    execute: handlers.execute,
    canExecute: handlers.canExecute,
    cleanup: handlers.cleanup,
  };
}

// =============================================================================
// SKILL REGISTRY INTERFACE
// =============================================================================

/**
 * Interface for skill registry operations
 * Used by the orchestrator to find and execute skills
 */
export interface ISkillRegistry {
  /** Register a skill */
  register(skill: Skill): void;
  
  /** Unregister a skill */
  unregister(skillId: SkillId): boolean;
  
  /** Get a skill by ID */
  get(skillId: SkillId): Skill | undefined;
  
  /** Get all registered skills */
  getAll(): Skill[];
  
  /** Find best matching skill for intent */
  findMatch(intent: Intent, message: string): {
    skill: Skill;
    confidence: number;
  } | undefined;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const ToolResultSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SkillResultSchema = z.object({
  content: z.string(),
  artifacts: z.array(z.any()).optional(),
  toolCalls: z.array(z.object({
    tool: z.string(),
    params: z.unknown(),
    result: ToolResultSchema,
  })).optional(),
  suggestions: z.array(z.string()).optional(),
  metadata: z.object({
    tokensUsed: z.number().optional(),
    latencyMs: z.number().optional(),
    confidence: z.number().optional(),
  }).optional(),
});
