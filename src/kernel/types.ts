/**
 * @file Synapsys Singularity - Core Types
 * @description The DNA of the Skill Operating System
 * @version 2.1.0
 *
 * SYNAPSYS SINGULARITY ARCHITECTURE
 * =================================
 * A Skill is a FULL-STACK ATOM containing:
 * - Brain (Backend Logic) - Runs in the Nucleus
 * - Face (Frontend UI) - Runs in the Browser
 * - Memory (Data Schema) - Persisted state
 *
 * The App becomes nothing more than a Skill Loader.
 *
 * V2.1.0 ADDITIONS:
 * - Native Engines (learning, evolution, emergence, routing)
 * - No legacy dependencies - all engines are Skills OS native
 */

import { z } from 'zod';
import type {
  ILearningEngine,
  IEvolutionEngine,
  IEmergenceEngine,
  IRoutingEngine,
} from '@tooloo/skills';

// =============================================================================
// KERNEL CONTEXT
// =============================================================================

/**
 * Tool execution result from ToolExecutor
 */
export interface ToolResult<T = unknown> {
  status: 'success' | 'error' | 'denied' | 'timeout';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    toolName: string;
    duration: number;
    timestamp: number;
    cached?: boolean;
  };
}

/**
 * Tool Services available to skills
 * Provides access to file, search, and terminal tools
 */
export interface ToolServices {
  /** Execute a tool by name */
  execute: <T = unknown>(toolName: string, params: unknown) => Promise<ToolResult<T>>;

  /** List available tools */
  listTools: () => Array<{ name: string; description: string; riskLevel: string }>;

  /** Check if a tool exists */
  hasTool: (toolName: string) => boolean;

  // Convenience methods for common tools
  /** Read a file */
  readFile: (
    path: string,
    options?: { startLine?: number; endLine?: number }
  ) => Promise<ToolResult<{ content: string; totalLines: number }>>;

  /** Write a file */
  writeFile: (
    path: string,
    content: string,
    options?: { backup?: boolean }
  ) => Promise<ToolResult<{ success: boolean; path: string }>>;

  /** Search with grep */
  grepSearch: (
    pattern: string,
    options?: { paths?: string[]; maxResults?: number }
  ) => Promise<ToolResult<{ matches: Array<{ file: string; line: number; content: string }> }>>;

  /** Search semantically */
  semanticSearch: (
    query: string,
    options?: { limit?: number }
  ) => Promise<ToolResult<{ matches: Array<{ file: string; content: string; score: number }> }>>;

  /** Execute a terminal command */
  terminal: (
    command: string,
    options?: { cwd?: string; timeout?: number }
  ) => Promise<ToolResult<{ stdout: string; stderr: string; exitCode: number }>>;
}

/**
 * Engine Services available to skills
 * Provides access to native learning, evolution, emergence, and routing engines
 * NO LEGACY DEPENDENCIES - All engines are Skills OS native
 */
export interface EngineServices {
  /** Learning engine for Q-learning, rewards, and optimal actions */
  learning: ILearningEngine;

  /** Evolution engine for A/B testing and prompt optimization */
  evolution: IEvolutionEngine;

  /** Emergence engine for pattern detection and synergies */
  emergence: IEmergenceEngine;

  /** Routing engine for provider selection and waterfall fallback */
  routing: IRoutingEngine;

  /** Check if all engines are healthy */
  isHealthy: () => boolean;

  /** Get combined metrics from all engines */
  getMetrics: () => EngineMetrics;
}

/**
 * Combined metrics from all engines
 */
export interface EngineMetrics {
  learning: {
    totalStates: number;
    totalRewards: number;
    averageQValue: number;
    explorationRate: number;
  };
  evolution: {
    activeStrategies: number;
    activeTests: number;
    totalIterations: number;
    bestPerformance: number;
  };
  emergence: {
    totalPatterns: number;
    totalSynergies: number;
    activeGoals: number;
    signalCount: number;
  };
  routing: {
    totalRoutes: number;
    successRate: number;
    providersOnline: number;
    averageLatency: number;
  };
}

/**
 * The context passed to every skill execution
 * Contains user info, session state, and kernel services
 */
export interface KernelContext {
  /** Current user information */
  user: {
    id: string;
    email?: string;
    tier: 'free' | 'pro' | 'enterprise';
  } | null;

  /** Current session ID */
  sessionId: string;

  /** Project context if applicable */
  project?: {
    id: string;
    name: string;
    path: string;
  };

  /** Kernel services available to skills */
  services: {
    /** Emit events to the event bus */
    emit: (event: string, payload: unknown) => void;
    /** Get another skill's reference */
    getSkill: (skillId: string) => Skill | undefined;
    /** Execute another skill */
    executeSkill: (skillId: string, input: unknown) => Promise<SkillExecutionResult>;
    /** Access memory/storage - Enhanced with cortex integration */
    memory: MemoryServices;
    /** Access LLM providers */
    llm: {
      complete: (prompt: string, options?: LLMOptions) => Promise<string>;
      stream: (prompt: string, options?: LLMOptions) => AsyncIterable<string>;
    };
    /** Access tools (file, search, terminal) */
    tools: ToolServices;
    /** Access native engines (learning, evolution, emergence, routing) - NEW V1.2 */
    engines: EngineServices;
  };
}

/**
 * Enhanced Memory Services
 * Provides access to session context, conversation history, and memory storage
 */
export interface MemoryServices {
  // Legacy key-value (working memory)
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  delete: (key: string) => Promise<void>;

  // Conversation history
  getHistory: (limit?: number) => ConversationMessage[];
  addMessage: (message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    skillId?: string;
  }) => void;

  // Memory storage
  store: (entry: MemoryStoreInput) => Promise<MemoryEntryRef>;
  retrieve: (query: MemoryRetrieveQuery) => Promise<MemorySearchResult[]>;
  recall: (id: string) => Promise<MemoryEntryRef | null>;
  forget: (id: string) => Promise<boolean>;

  // Session context
  getSessionContext: () => SessionContextSummary;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skillId?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryStoreInput {
  content: string;
  type?: 'episodic' | 'semantic' | 'procedural';
  tier?: 'session' | 'short-term' | 'long-term';
  importance?: number;
  ttl?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryEntryRef {
  id: string;
  content: string;
  type: string;
  importance: number;
  timestamp: number;
}

export interface MemoryRetrieveQuery {
  query?: string;
  type?: string | string[];
  limit?: number;
  minImportance?: number;
  semantic?: boolean;
}

export interface MemorySearchResult {
  memory: MemoryEntryRef;
  score: number;
}

export interface SessionContextSummary {
  sessionId: string;
  messageCount: number;
  workingMemoryKeys: string[];
  activeSkillId?: string;
  startedAt: number;
  lastActivityAt: number;
}

export interface LLMOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// =============================================================================
// SKILL DEFINITION
// =============================================================================

/**
 * Intent configuration for a skill
 * Determines when and how a skill activates
 */
export interface SkillIntent {
  /** Trigger patterns - commands, keywords, or phrases */
  triggers: string[];

  /** Semantic classifier - returns 0-1 confidence score */
  classifier?: (text: string, context?: KernelContext) => number;

  /** Priority when multiple skills match (higher = preferred) */
  priority?: number;

  /** Required context for this skill to activate */
  requires?: {
    auth?: boolean;
    project?: boolean;
    capabilities?: string[];
  };
}

/**
 * UI metadata for the skill
 */
export interface SkillUI {
  /** Icon identifier (lucide icon name or custom) */
  icon: string;

  /** Where this skill appears in the UI */
  placement: 'main' | 'sidebar' | 'modal' | 'floating' | 'hidden';

  /** Keyboard shortcut */
  shortcut?: string;

  /** Loading state component */
  skeleton?: () => unknown;
}

/**
 * The Super-Skill Interface
 *
 * A Skill is EVERYTHING a feature needs:
 * - Intent: When does it activate?
 * - Logic: The backend brain (runs on server)
 * - UI: The frontend body (runs on client)
 */
export interface Skill<TInput = unknown, TOutput = unknown> {
  /** Unique identifier (e.g., 'core.chat', 'plugin.weather') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this skill does */
  description: string;

  /** Semantic version */
  version: string;

  /** Category for organization */
  category: SkillCategory;

  /** Intent configuration */
  intent: SkillIntent;

  /** Input validation schema */
  schema: z.ZodType<TInput>;

  /** Output schema (for type safety and validation) */
  outputSchema?: z.ZodType<TOutput>;

  /** The backend execution logic */
  execute: (input: TInput, context: KernelContext) => Promise<TOutput>;

  /** UI metadata */
  ui: SkillUI;

  /**
   * The React component to render
   * NOTE: This is a component reference, not JSX
   * The actual component is loaded separately for code splitting
   */
  component: string; // Path to component or component identifier

  /** Lifecycle hooks */
  hooks?: {
    onLoad?: (context: KernelContext) => Promise<void>;
    onUnload?: () => Promise<void>;
    onActivate?: (context: KernelContext) => Promise<void>;
    onDeactivate?: () => Promise<void>;
  };

  /** Dependencies on other skills */
  dependencies?: string[];
}

export type SkillCategory =
  | 'core' // Essential system skills
  | 'coding' // Development-related
  | 'ai' // AI/ML features
  | 'learning' // Learning and feedback skills
  | 'evolution' // Self-improvement skills
  | 'emergence' // Pattern detection skills
  | 'integration' // External service integrations
  | 'ui' // UI generation/manipulation
  | 'system' // System settings/config
  | 'plugin'; // Third-party plugins

// =============================================================================
// SKILL EXECUTION
// =============================================================================

/**
 * Result of a skill execution
 */
export interface SkillExecutionResult<T = unknown> {
  /** The skill that was executed */
  skillId: string;

  /** Whether execution succeeded */
  success: boolean;

  /** The output data */
  data?: T;

  /** Error if execution failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Execution metadata */
  meta: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Request to execute a skill
 */
export interface SkillExecuteRequest {
  skillId: string;
  input: unknown;
  context?: Partial<KernelContext>;
}

// =============================================================================
// SKILL REGISTRATION
// =============================================================================

/**
 * Minimal skill definition for registration
 * Used when dynamically loading skills
 */
export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: SkillCategory;
  entry: string; // Path to the skill's index.ts
  ui: SkillUI;
  intent: SkillIntent;
  dependencies?: string[];
}

// =============================================================================
// KERNEL EVENTS
// =============================================================================

export type KernelEvent =
  | { type: 'skill:loading'; skillId: string }
  | { type: 'skill:loaded'; skillId: string }
  | { type: 'skill:error'; skillId: string; error: Error }
  | { type: 'skill:executing'; skillId: string; input: unknown }
  | { type: 'skill:executed'; skillId: string; result: SkillExecutionResult }
  | { type: 'skill:activated'; skillId: string }
  | { type: 'skill:deactivated'; skillId: string }
  | { type: 'kernel:ready' }
  | { type: 'kernel:error'; error: Error };

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Extract input type from a skill
 */
export type SkillInput<S extends Skill> = S extends Skill<infer I, unknown> ? I : never;

/**
 * Extract output type from a skill
 */
export type SkillOutput<S extends Skill> = S extends Skill<unknown, infer O> ? O : never;

/**
 * Type-safe skill creator helper
 */
export function defineSkill<TInput, TOutput>(
  skill: Skill<TInput, TOutput>
): Skill<TInput, TOutput> {
  return skill;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/** Zod schema for SkillExecuteRequest validation */
export const SkillExecuteRequestSchema = z.object({
  skillId: z.string().min(1),
  input: z.unknown(),
  context: z
    .object({
      sessionId: z.string().optional(),
      projectId: z.string().optional(),
    })
    .optional(),
});

/** Zod schema for SkillManifest validation */
export const SkillManifestSchema = z.object({
  id: z.string().regex(/^[a-z]+\.[a-z-]+$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  category: z.enum(['core', 'coding', 'ai', 'integration', 'ui', 'system', 'plugin']),
  entry: z.string(),
  ui: z.object({
    icon: z.string(),
    placement: z.enum(['main', 'sidebar', 'modal', 'floating', 'hidden']),
    shortcut: z.string().optional(),
  }),
  intent: z.object({
    triggers: z.array(z.string()),
    priority: z.number().optional(),
  }),
  dependencies: z.array(z.string()).optional(),
});

// =============================================================================
// SYNAPSYS SINGULARITY - FULL-STACK SKILL ATOMS
// =============================================================================

/**
 * The Brain - Backend cognitive logic
 * Runs in the Nucleus (server-side)
 */
export interface SkillBrain<TInput = unknown, TOutput = unknown> {
  /** Trigger patterns (command prefix, natural language) */
  triggers: string[];

  /** Input validation schema */
  inputSchema: z.ZodType<TInput>;

  /** Output validation schema */
  outputSchema: z.ZodType<TOutput>;

  /** The handler function - processes intent and returns data */
  handler: (ctx: KernelContext, input: TInput) => Promise<TOutput>;

  /** Optional: Classifier function for semantic matching (0-1 confidence) */
  classifier?: (text: string) => number;

  /** Optional: Streaming handler for real-time output */
  streamHandler?: (ctx: KernelContext, input: TInput) => AsyncIterable<Partial<TOutput>>;
}

/**
 * The Face - Frontend UI configuration
 * Tells the browser HOW to render the skill's output
 */
export interface SkillFace<TOutput = unknown> {
  /** UI rendering mode */
  type: 'static' | 'generative' | 'headless';

  /**
   * Static: Pre-built component identifier
   * The frontend will dynamically import this component
   */
  component?: string;

  /**
   * Generative: AI generates the UI on-the-fly
   * Return a prompt that describes how to render the data
   */
  generationPrompt?: (data: TOutput) => string;

  /** Default props to pass to the component */
  defaultProps?: Record<string, unknown>;

  /** Layout hints for the renderer */
  layout?: {
    position?: 'main' | 'sidebar' | 'modal' | 'toast' | 'floating';
    size?: 'sm' | 'md' | 'lg' | 'full';
    animate?: boolean;
  };
}

/**
 * The Memory - Persistent state schema
 * Defines what data this skill persists
 */
export interface SkillMemory {
  /** Schema for persisted skill state */
  schema?: z.ZodType<unknown>;

  /** Storage namespace (defaults to skill.id) */
  namespace?: string;

  /** TTL for cached data in seconds (0 = permanent) */
  ttl?: number;

  /** Whether to sync across sessions */
  sync?: boolean;
}

/**
 * The UNIFIED Skill Manifest - A Full-Stack Atom
 *
 * This is the NEW way to define skills. Each skill is self-contained
 * with its Brain (logic), Face (UI), and Memory (state).
 */
export interface UnifiedSkill<TInput = unknown, TOutput = unknown> {
  // Identity
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: SkillCategory;
  icon?: string;

  // The Three Pillars
  brain: SkillBrain<TInput, TOutput>;
  face: SkillFace<TOutput>;
  memory?: SkillMemory;

  // Lifecycle hooks
  onLoad?: (ctx: KernelContext) => Promise<void>;
  onUnload?: () => Promise<void>;
  onActivate?: (ctx: KernelContext) => Promise<void>;
  onDeactivate?: () => Promise<void>;

  // Dependencies and requirements
  requires?: {
    auth?: boolean;
    project?: boolean;
    capabilities?: string[];
    skills?: string[];
  };

  /** Other skills this depends on */
  dependencies?: string[];
}

/**
 * Helper function to define a unified skill with full type inference
 */
export function defineUnifiedSkill<TInput, TOutput>(
  skill: UnifiedSkill<TInput, TOutput>
): UnifiedSkill<TInput, TOutput> {
  return skill;
}

// =============================================================================
// INVOKE PROTOCOL - Single Entry Point
// =============================================================================

/**
 * Request to /synapsys/invoke - THE universal endpoint
 */
export interface InvokeRequest {
  /** Natural language or command input */
  intent: string;

  /** Optional: Force a specific skill */
  skillId?: string;

  /** Payload for the skill handler */
  payload?: unknown;

  /** Session context */
  context?: {
    sessionId?: string;
    userId?: string;
    conversationId?: string;
    projectId?: string;
  };

  /** Stream the response */
  stream?: boolean;
}

/**
 * Response from /synapsys/invoke
 */
export interface InvokeResponse<T = unknown> {
  ok: boolean;

  // Identity
  skillId: string;
  skillName: string;

  // The output data (passed to Face)
  data?: T;

  // UI rendering instructions
  ui: {
    type: 'static' | 'generative' | 'headless';
    component?: string;
    designPrompt?: string;
    layout?: SkillFace<T>['layout'];
  };

  // Error if failed
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  // Metadata
  meta: {
    duration: number;
    tokens?: number;
    cached?: boolean;
  };
}

/** Zod schema for InvokeRequest validation */
export const InvokeRequestSchema = z.object({
  intent: z.string().min(1),
  skillId: z.string().optional(),
  payload: z.unknown().optional(),
  context: z
    .object({
      sessionId: z.string().optional(),
      userId: z.string().optional(),
      conversationId: z.string().optional(),
      projectId: z.string().optional(),
    })
    .optional(),
  stream: z.boolean().optional(),
});

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert legacy Skill to UnifiedSkill format
 */
export function toUnifiedSkill<TInput, TOutput>(
  legacy: Skill<TInput, TOutput>
): UnifiedSkill<TInput, TOutput> {
  return {
    id: legacy.id,
    name: legacy.name,
    version: legacy.version,
    description: legacy.description,
    category: legacy.category,
    icon: legacy.ui.icon,

    brain: {
      triggers: legacy.intent.triggers,
      inputSchema: legacy.schema as z.ZodType<TInput>,
      outputSchema: (legacy.outputSchema ?? z.unknown()) as z.ZodType<TOutput>,
      handler: async (ctx, input) => legacy.execute(input, ctx),
      classifier: legacy.intent.classifier,
    },

    face: {
      type: legacy.component ? 'static' : 'headless',
      component: legacy.component,
      layout: {
        position: legacy.ui.placement as 'main' | 'sidebar' | 'modal' | 'toast' | 'floating',
      },
    },

    requires: legacy.intent.requires,
    dependencies: legacy.dependencies,
    onLoad: legacy.hooks?.onLoad,
    onUnload: legacy.hooks?.onUnload,
    onActivate: legacy.hooks?.onActivate,
    onDeactivate: legacy.hooks?.onDeactivate,
  };
}
