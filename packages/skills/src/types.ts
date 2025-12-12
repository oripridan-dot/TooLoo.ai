/**
 * @tooloo/skills - Skill Type Definitions
 * Declarative skill definitions with Claude-style instructions
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';
import type { IntentType, SkillId } from '@tooloo/core';

// =============================================================================
// SKILL DEFINITION SCHEMA
// =============================================================================

/**
 * Tool reference that a skill can use
 */
export interface ToolRef {
  name: string;
  description?: string;
  required?: boolean;
}

/**
 * Context configuration for a skill
 */
export interface SkillContextConfig {
  /** Maximum tokens this skill needs */
  maxTokens: number;
  
  /** What RAG sources to include */
  ragSources: Array<'codebase' | 'docs' | 'memory' | 'web' | 'artifacts'>;
  
  /** Memory scope for this skill */
  memoryScope: 'session' | 'project' | 'global';
  
  /** Whether to include conversation history */
  includeHistory?: boolean;
  
  /** Maximum history messages to include */
  maxHistoryMessages?: number;
}

/**
 * Trigger configuration for automatic skill activation
 */
export interface SkillTriggers {
  /** Intent types that activate this skill */
  intents: IntentType[];
  
  /** Keywords/phrases that trigger this skill */
  keywords: string[];
  
  /** Regex patterns for advanced matching */
  patterns?: string[];
  
  /** Minimum confidence to activate */
  minConfidence?: number;
}

/**
 * Composability rules for skill combinations
 */
export interface SkillComposability {
  /** Skills that must be active for this skill to work */
  requires: string[];
  
  /** Skills that work well with this one */
  enhances: string[];
  
  /** Skills that conflict with this one */
  conflicts: string[];
  
  /** Priority when multiple skills are selected (higher = runs first) */
  priority?: number;
}

/**
 * Model requirements for skill execution
 */
export interface SkillModelRequirements {
  /** Minimum context window size */
  minContext?: number;
  
  /** Required capabilities */
  capabilities?: Array<'coding' | 'reasoning' | 'creative' | 'vision' | 'analysis'>;
  
  /** Preferred providers (in order) */
  preferredProviders?: string[];
  
  /** Temperature override */
  temperature?: number;
}

/**
 * Complete Skill Definition
 * This is what gets loaded from YAML/MD files
 */
export interface SkillDefinition {
  /** Unique identifier */
  id: SkillId;
  
  /** Human-readable name */
  name: string;
  
  /** Version (semver) */
  version: string;
  
  /** Short description */
  description: string;
  
  /** Full system prompt instructions (the "soul" of this skill) */
  instructions: string;
  
  /** Tools this skill can use */
  tools: ToolRef[];
  
  /** When to automatically activate */
  triggers: SkillTriggers;
  
  /** Context configuration */
  context: SkillContextConfig;
  
  /** Composability rules */
  composability: SkillComposability;
  
  /** Model requirements */
  modelRequirements?: SkillModelRequirements;
  
  /** Additional metadata */
  metadata?: {
    author?: string;
    license?: string;
    tags?: string[];
    examples?: Array<{
      input: string;
      output: string;
    }>;
  };
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

export const ToolRefSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export const SkillContextConfigSchema = z.object({
  maxTokens: z.number().min(1000).max(200000),
  ragSources: z.array(z.enum(['codebase', 'docs', 'memory', 'web', 'artifacts'])),
  memoryScope: z.enum(['session', 'project', 'global']),
  includeHistory: z.boolean().optional(),
  maxHistoryMessages: z.number().optional(),
});

export const SkillTriggersSchema = z.object({
  intents: z.array(z.enum([
    'code', 'design', 'analyze', 'research', 'plan', 'chat',
    'execute', 'create', 'fix', 'refactor', 'test', 'document', 'unknown'
  ])),
  keywords: z.array(z.string()),
  patterns: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
});

export const SkillComposabilitySchema = z.object({
  requires: z.array(z.string()),
  enhances: z.array(z.string()),
  conflicts: z.array(z.string()),
  priority: z.number().optional(),
});

export const SkillModelRequirementsSchema = z.object({
  minContext: z.number().optional(),
  capabilities: z.array(z.enum(['coding', 'reasoning', 'creative', 'vision', 'analysis'])).optional(),
  preferredProviders: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const SkillDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(500),
  instructions: z.string().min(10),
  tools: z.array(ToolRefSchema),
  triggers: SkillTriggersSchema,
  context: SkillContextConfigSchema,
  composability: SkillComposabilitySchema,
  modelRequirements: SkillModelRequirementsSchema.optional(),
  metadata: z.object({
    author: z.string().optional(),
    license: z.string().optional(),
    tags: z.array(z.string()).optional(),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
    })).optional(),
  }).optional(),
});

// =============================================================================
// SKILL STATE
// =============================================================================

/**
 * Runtime state for a loaded skill
 */
export interface SkillState {
  definition: SkillDefinition;
  loadedAt: Date;
  filePath?: string;
  enabled: boolean;
  usageCount: number;
  lastUsed?: Date;
  errors: string[];
}

/**
 * Composed skills result
 */
export interface ComposedSkills {
  /** IDs of composed skills */
  skillIds: SkillId[];
  
  /** Merged instructions */
  instructions: string;
  
  /** Combined tools (deduplicated) */
  tools: ToolRef[];
  
  /** Merged context config (uses highest values) */
  context: SkillContextConfig;
  
  /** Combined model requirements */
  modelRequirements: SkillModelRequirements;
}

// =============================================================================
// SKILL MATCHING
// =============================================================================

/**
 * Result of skill matching
 */
export interface SkillMatch {
  skill: SkillDefinition;
  score: number;  // 0.0 - 1.0
  matchedTriggers: {
    intents: IntentType[];
    keywords: string[];
    patterns: string[];
  };
  reason: string;
}
