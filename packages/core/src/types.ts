/**
 * @tooloo/core - The Soul
 * Core types, interfaces, and contracts for TooLoo.ai Skills OS V1.1
 * 
 * @version 1.1.0.0
 * @updated 2025-12-15
 * @description This file defines the foundational types that flow through
 *              every component of the TooLoo system. Change these carefully
 *              as they impact the entire architecture.
 */

import { z } from 'zod';

// =============================================================================
// IDENTITY & CONTEXT
// =============================================================================

/**
 * Unique identifiers used throughout the system
 */
export type SessionId = string & { readonly __brand: 'SessionId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type ProjectId = string & { readonly __brand: 'ProjectId' };
export type ArtifactId = string & { readonly __brand: 'ArtifactId' };
export type SkillId = string & { readonly __brand: 'SkillId' };
export type ProviderId = string & { readonly __brand: 'ProviderId' };

/**
 * Create branded IDs safely
 */
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createUserId = (id: string): UserId => id as UserId;
export const createProjectId = (id: string): ProjectId => id as ProjectId;
export const createArtifactId = (id: string): ArtifactId => id as ArtifactId;
export const createSkillId = (id: string): SkillId => id as SkillId;
export const createProviderId = (id: string): ProviderId => id as ProviderId;

// =============================================================================
// INTENT & CONFIDENCE
// =============================================================================

/**
 * Detected user intent categories
 */
export type IntentType = 
  | 'code'        // Writing, editing, or debugging code
  | 'design'      // UI/UX design, component design
  | 'analyze'     // Code review, analysis, explanation
  | 'research'    // Web search, documentation lookup
  | 'plan'        // Architecture, planning, strategy
  | 'chat'        // General conversation
  | 'execute'     // Run commands, deploy, build
  | 'create'      // Generate content, documents, images
  | 'fix'         // Debug, repair, troubleshoot
  | 'refactor'    // Improve existing code
  | 'test'        // Write or run tests
  | 'document'    // Documentation, comments
  | 'introspect'  // Self-awareness, identity questions
  | 'evolve'      // Self-improvement, evolution
  | 'learn'       // Learning, feedback, rewards
  | 'remember'    // Memory storage/retrieval
  | 'experiment'  // A/B tests, benchmarks
  | 'emerge'      // Creative synthesis, predictions
  | 'observe'     // Monitoring, metrics, health
  | 'route'       // Routing decisions
  | 'meta'        // Meta-cognition, thinking about thinking
  | 'unknown';    // Could not determine intent

/**
 * Detected intent with confidence score
 */
export interface Intent {
  type: IntentType;
  confidence: number;  // 0.0 - 1.0
  keywords: string[];
  subIntents?: Intent[];
  reasoning?: string;
}

/**
 * Zod schema for Intent validation
 */
export const IntentSchema: z.ZodType<Intent> = z.object({
  type: z.enum([
    'code', 'design', 'analyze', 'research', 'plan', 'chat',
    'execute', 'create', 'fix', 'refactor', 'test', 'document', 'unknown'
  ]),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
  subIntents: z.lazy((): z.ZodType<Intent[]> => z.array(IntentSchema)).optional(),
  reasoning: z.string().optional(),
});

// =============================================================================
// MEMORY STATE
// =============================================================================

/**
 * Message in conversation history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: Intent;
    skillsUsed?: SkillId[];
    provider?: ProviderId;
    tokenCount?: number;
    latencyMs?: number;
  };
}

/**
 * Zod schema for Message validation
 */
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.coerce.date(),
  metadata: z.object({
    intent: IntentSchema.optional(),
    skillsUsed: z.array(z.string()).optional(),
    provider: z.string().optional(),
    tokenCount: z.number().optional(),
    latencyMs: z.number().optional(),
  }).optional(),
});

/**
 * Memory entry for long-term storage
 */
export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: 'conversation' | 'artifact' | 'knowledge' | 'event';
    timestamp: Date;
    projectId?: ProjectId;
    sessionId?: SessionId;
    tags?: string[];
    importance?: number;  // 0.0 - 1.0
  };
}

/**
 * Complete memory state
 */
export interface MemoryState {
  shortTerm: Message[];           // Last N messages (conversation context)
  workingMemory: Map<string, unknown>;  // Temporary computation state
  recentArtifacts: ArtifactId[];  // Recently accessed artifacts
  contextWindow: {
    usedTokens: number;
    maxTokens: number;
    priority: 'recency' | 'relevance' | 'importance';
  };
}

// =============================================================================
// ARTIFACTS
// =============================================================================

/**
 * Artifact types that can be generated
 */
export type ArtifactType =
  | 'code'          // Source code files
  | 'document'      // Markdown, text documents
  | 'diagram'       // Mermaid, PlantUML diagrams
  | 'config'        // Configuration files
  | 'test'          // Test files
  | 'image'         // Generated images
  | 'data'          // JSON, CSV, structured data
  | 'command'       // Shell commands, scripts
  | 'plan'          // Task plans, roadmaps
  | 'review';       // Code reviews, analysis

/**
 * Generated artifact
 */
export interface Artifact {
  id: ArtifactId;
  type: ArtifactType;
  name: string;
  content: string;
  language?: string;  // For code artifacts
  path?: string;      // File path if saved
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    skillId?: SkillId;
    sessionId?: SessionId;
    projectId?: ProjectId;
    parentId?: ArtifactId;  // For revisions
    tags?: string[];
    quality?: {
      validated: boolean;
      score?: number;
      issues?: string[];
    };
  };
}

/**
 * Zod schema for Artifact validation
 */
export const ArtifactSchema = z.object({
  id: z.string(),
  type: z.enum([
    'code', 'document', 'diagram', 'config', 'test',
    'image', 'data', 'command', 'plan', 'review'
  ]),
  name: z.string(),
  content: z.string(),
  language: z.string().optional(),
  path: z.string().optional(),
  version: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.object({
    skillId: z.string().optional(),
    sessionId: z.string().optional(),
    projectId: z.string().optional(),
    parentId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    quality: z.object({
      validated: z.boolean(),
      score: z.number().optional(),
      issues: z.array(z.string()).optional(),
    }).optional(),
  }),
});

// =============================================================================
// ROUTING STATE
// =============================================================================

/**
 * Circuit breaker states for providers
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Provider health status
 */
export interface ProviderHealth {
  providerId: ProviderId;
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitState: CircuitState;
  latencyMs: number;
  errorRate: number;  // 0.0 - 1.0
  lastCheck: Date;
  consecutiveFailures: number;
}

/**
 * Routing decision for a request
 */
export interface RoutingDecision {
  providerId: ProviderId;
  model: string;
  reason: string;
  confidence: number;
  alternatives: Array<{
    providerId: ProviderId;
    model: string;
    reason: string;
  }>;
  constraints: {
    maxTokens?: number;
    temperature?: number;
    streamingRequired?: boolean;
  };
}

/**
 * Complete routing state
 */
export interface RoutingState {
  currentProvider?: ProviderId;
  currentModel?: string;
  decision?: RoutingDecision;
  providerHealth: Map<ProviderId, ProviderHealth>;
  fallbackChain: ProviderId[];
}

// =============================================================================
// THE UNIFIED CONTEXT - The Heart of TooLoo
// =============================================================================

/**
 * TooLooContext - The complete state passed through every operation
 * 
 * This is the "nervous system" of TooLoo. Every agent, skill, and handler
 * receives this context and can read/write to it. Changes propagate through
 * the system via the EventBus.
 */
export interface TooLooContext {
  // Identity
  sessionId: SessionId;
  userId: UserId;
  projectId: ProjectId;
  
  // Memory
  memory: MemoryState;
  
  // Intent & Confidence
  intent: Intent;
  confidence: number;  // Overall system confidence 0.0 - 1.0
  
  // Active Skills
  activeSkills: SkillId[];
  composedPrompt?: string;  // Merged skill instructions
  
  // Artifacts
  artifacts: Artifact[];
  activeArtifact?: ArtifactId;
  
  // Routing
  routing: RoutingState;
  
  // Request Metadata
  request: {
    id: string;
    timestamp: Date;
    userMessage: string;
    attachments?: Array<{
      type: 'file' | 'image' | 'url';
      content: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  
  // Response Building
  response?: {
    content: string;
    artifacts: ArtifactId[];
    suggestions?: string[];
    followUp?: string;
  };
  
  // Execution State
  execution: {
    stage: 'received' | 'routing' | 'skill-selection' | 'processing' | 'validation' | 'complete' | 'error';
    startTime: Date;
    currentStep?: string;
    errors: Array<{
      code: string;
      message: string;
      recoverable: boolean;
    }>;
  };
}

/**
 * Zod schema for TooLooContext validation
 */
export const TooLooContextSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  projectId: z.string(),
  memory: z.object({
    shortTerm: z.array(MessageSchema),
    workingMemory: z.map(z.string(), z.unknown()),
    recentArtifacts: z.array(z.string()),
    contextWindow: z.object({
      usedTokens: z.number(),
      maxTokens: z.number(),
      priority: z.enum(['recency', 'relevance', 'importance']),
    }),
  }),
  intent: IntentSchema,
  confidence: z.number().min(0).max(1),
  activeSkills: z.array(z.string()),
  composedPrompt: z.string().optional(),
  artifacts: z.array(ArtifactSchema),
  activeArtifact: z.string().optional(),
  routing: z.object({
    currentProvider: z.string().optional(),
    currentModel: z.string().optional(),
    decision: z.object({
      providerId: z.string(),
      model: z.string(),
      reason: z.string(),
      confidence: z.number(),
      alternatives: z.array(z.object({
        providerId: z.string(),
        model: z.string(),
        reason: z.string(),
      })),
      constraints: z.object({
        maxTokens: z.number().optional(),
        temperature: z.number().optional(),
        streamingRequired: z.boolean().optional(),
      }),
    }).optional(),
    providerHealth: z.map(z.string(), z.object({
      providerId: z.string(),
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      circuitState: z.enum(['closed', 'open', 'half-open']),
      latencyMs: z.number(),
      errorRate: z.number(),
      lastCheck: z.coerce.date(),
      consecutiveFailures: z.number(),
    })),
    fallbackChain: z.array(z.string()),
  }),
  request: z.object({
    id: z.string(),
    timestamp: z.coerce.date(),
    userMessage: z.string(),
    attachments: z.array(z.object({
      type: z.enum(['file', 'image', 'url']),
      content: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })).optional(),
  }),
  response: z.object({
    content: z.string(),
    artifacts: z.array(z.string()),
    suggestions: z.array(z.string()).optional(),
    followUp: z.string().optional(),
  }).optional(),
  execution: z.object({
    stage: z.enum(['received', 'routing', 'skill-selection', 'processing', 'validation', 'complete', 'error']),
    startTime: z.coerce.date(),
    currentStep: z.string().optional(),
    errors: z.array(z.object({
      code: z.string(),
      message: z.string(),
      recoverable: z.boolean(),
    })),
  }),
});

// =============================================================================
// AGENT INTERFACE - The Contract for All Agents
// =============================================================================

/**
 * Analysis result from an agent
 */
export interface Analysis {
  canHandle: boolean;
  confidence: number;
  suggestedSkills: SkillId[];
  reasoning: string;
  estimatedTokens?: number;
  estimatedLatencyMs?: number;
}

/**
 * Critique result for self-correction
 */
export interface Critique {
  needsRevision: boolean;
  score: number;  // 0.0 - 1.0
  issues: Array<{
    type: 'accuracy' | 'completeness' | 'style' | 'safety' | 'relevance';
    severity: 'critical' | 'major' | 'minor';
    description: string;
    suggestion?: string;
  }>;
  iterations: number;
  maxIterations: number;
}

/**
 * Streaming chunk from agent execution
 */
export interface Chunk {
  id: string;
  type: 'text' | 'artifact' | 'tool-call' | 'tool-result' | 'error' | 'done';
  content: string;
  metadata?: {
    artifactId?: ArtifactId;
    toolName?: string;
    progress?: number;  // 0.0 - 1.0
  };
}

/**
 * Agent - The contract every agent must fulfill
 * 
 * Agents are the "workers" of TooLoo. Each agent can:
 * - Analyze if it can handle a request
 * - Execute the request (streaming chunks)
 * - Critique output for self-correction
 * - Revise based on critique
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  skills: SkillId[];
  
  /**
   * Analyze if this agent can handle the request
   */
  analyze(ctx: TooLooContext): Promise<Analysis>;
  
  /**
   * Execute the request, streaming chunks
   */
  execute(ctx: TooLooContext): AsyncGenerator<Chunk>;
  
  /**
   * Critique the output for quality
   */
  critique(ctx: TooLooContext, output: string): Promise<Critique>;
  
  /**
   * Revise output based on critique
   */
  revise(ctx: TooLooContext, output: string, critique: Critique): AsyncGenerator<Chunk>;
}

// =============================================================================
// EXECUTION PIPELINE - Recursive Self-Correction
// =============================================================================

/**
 * Pipeline configuration for execution
 */
export interface PipelineConfig {
  maxCritiqueIterations: number;
  minQualityScore: number;
  enableSelfCorrection: boolean;
  timeoutMs: number;
  streamingEnabled: boolean;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxCritiqueIterations: 3,
  minQualityScore: 0.7,
  enableSelfCorrection: true,
  timeoutMs: 60000,
  streamingEnabled: true,
};

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  output: string;
  artifacts: Artifact[];
  iterations: number;
  finalScore: number;
  totalTokens: number;
  totalLatencyMs: number;
  critique?: Critique;
}

// =============================================================================
// API RESPONSE ENVELOPE
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface APIResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    latencyMs: number;
    version: string;
  };
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, meta?: APIResponse<T>['meta']): APIResponse<T> {
  return { ok: true, data, meta };
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<never> {
  return { ok: false, error: { code, message, details } };
}

// =============================================================================
// EXPORTS - Types are already exported above via their declarations
// =============================================================================
