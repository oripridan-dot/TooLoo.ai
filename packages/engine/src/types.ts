// @version 3.3.576
/**
 * @tooloo/engine - Types
 * Core type definitions for the orchestration engine
 *
 * @version 2.0.0-alpha.0
 */

import type { SkillDefinition, ToolRef } from '@tooloo/skills';

// =============================================================================
// TOOL TYPES
// =============================================================================

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool definition with schema and executor
 */
export interface ToolDefinition<TInput = unknown> {
  /** Zod schema for input validation */
  schema: import('zod').ZodType<TInput>;
  /** Human-readable description */
  description?: string;
  /** Execute the tool */
  execute: (input: TInput) => Promise<string | ToolResult>;
  /** Whether this tool requires confirmation before execution */
  requiresConfirmation?: boolean;
  /** Risk level for safety classification */
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Tool call request from LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool call response
 */
export interface ToolCallResponse {
  toolCallId: string;
  name: string;
  result: ToolResult;
}

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

/**
 * Artifact generated during execution
 */
export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'diagram' | 'data' | 'other';
  name: string;
  content: string;
  language?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    tags?: string[];
    source?: string;
    [key: string]: unknown;
  };
}

/**
 * Conversation message
 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Detected intent
 */
export interface Intent {
  type: string;
  confidence: number;
  entities?: Record<string, unknown>;
}

/**
 * Orchestration context for skill execution
 */
export interface OrchestrationContext {
  sessionId: string;
  projectId?: string;
  userMessage: string;
  intent: Intent;
  conversation: Message[];
  artifacts: Artifact[];
}

/**
 * Execution context passed to skill executor
 */
export interface ExecutionContext {
  skill: SkillDefinition;
  orchestration: OrchestrationContext;
  tools: ToolRef[];
}

// =============================================================================
// ROUTING TYPES
// =============================================================================

/**
 * Routing configuration
 */
export interface RoutingConfig {
  /** Enable semantic routing with embeddings */
  semantic: boolean;
  /** Weight for semantic similarity (0-1) */
  semanticWeight: number;
  /** Weight for keyword matching (0-1) */
  keywordWeight: number;
  /** Minimum confidence to accept a match */
  minConfidence: number;
  /** Embedding function for semantic routing */
  embedFn?: (text: string) => Promise<number[]>;
}

/**
 * Routing result
 */
export interface RoutingResult {
  skill: SkillDefinition;
  confidence: number;
  alternatives: Array<{
    skill: SkillDefinition;
    confidence: number;
  }>;
  reasoning: string;
  routingTimeMs: number;
}

// =============================================================================
// PROVIDER SELECTION
// =============================================================================

/**
 * Provider selection with fallback chain
 */
export interface ProviderSelection {
  providerId: string;
  model: string;
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    [key: string]: unknown;
  };
  fallbacks: Array<{
    providerId: string;
    model: string;
  }>;
}

// =============================================================================
// EXECUTION RESULTS
// =============================================================================

/**
 * Execution result from skill executor
 */
export interface ExecutionResult {
  content: string;
  tokenCount: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  artifacts: Artifact[];
  toolCalls?: ToolCallResponse[];
}

// =============================================================================
// EXECUTOR CONFIG
// =============================================================================

/**
 * Skill executor configuration
 */
export interface ExecutorConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Timeout for execution in ms */
  timeoutMs: number;
  /** Enable streaming responses */
  streaming: boolean;
  /** Enable tool execution */
  enableTools: boolean;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  SkillDefinition,
  ToolRef,
};
