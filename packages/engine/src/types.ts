/**
 * @tooloo/engine - Types
 * Core types for the orchestration engine
 * 
 * @version 2.0.0-alpha.0
 */

import type { 
  Intent, 
  Message, 
  Artifact, 
  SessionId,
  UserId,
  ProjectId,
  SkillId,
  ProviderId,
  MemoryState
} from '@tooloo/core';
import type { SkillDefinition } from '@tooloo/skills';

// =============================================================================
// ORCHESTRATION CONTEXT
// =============================================================================

/**
 * Complete context available during orchestration
 */
export interface OrchestrationContext {
  /** Current session identifier */
  sessionId: SessionId;
  
  /** Current user identifier */
  userId?: UserId;
  
  /** Active project context */
  projectId?: ProjectId;
  
  /** The user's message/prompt */
  userMessage: string;
  
  /** Detected intent from the message */
  intent: Intent;
  
  /** Conversation history */
  conversation: Message[];
  
  /** Memory state for context hydration */
  memory: MemoryState;
  
  /** Available artifacts from previous interactions */
  artifacts: Artifact[];
  
  /** Metadata about the current request */
  metadata: {
    timestamp: Date;
    requestId: string;
    source: 'api' | 'socket' | 'internal';
    clientInfo?: {
      userAgent?: string;
      ip?: string;
    };
  };
}

// =============================================================================
// SKILL EXECUTION
// =============================================================================

/**
 * Context passed to skill execution
 */
export interface SkillExecutionContext {
  /** The orchestration context */
  orchestration: OrchestrationContext;
  
  /** The matched skill definition */
  skill: SkillDefinition;
  
  /** Routing confidence for this skill */
  confidence: number;
  
  /** Available tools for this skill */
  tools: SkillTool[];
  
  /** Memory access functions */
  memory: {
    getRelevant: (query: string, limit?: number) => Promise<MemoryEntry[]>;
    store: (entry: Omit<MemoryEntry, 'id'>) => Promise<string>;
  };
}

/**
 * Memory entry type (simplified from core)
 */
export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: 'conversation' | 'artifact' | 'knowledge' | 'event';
    timestamp: Date;
    projectId?: string;
    sessionId?: string;
    tags?: string[];
    importance?: number;
  };
}

/**
 * Tool available for skill execution
 */
export interface SkillTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
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

// =============================================================================
// ROUTING
// =============================================================================

/**
 * Result of skill routing
 */
export interface RoutingResult {
  /** Matched skill */
  skill: SkillDefinition;
  
  /** Confidence in this match */
  confidence: number;
  
  /** Alternative skills that could handle this */
  alternatives: Array<{
    skill: SkillDefinition;
    confidence: number;
  }>;
  
  /** Reasoning for the selection */
  reasoning: string;
  
  /** Time taken to route (ms) */
  routingTimeMs: number;
}

/**
 * Result of provider selection
 */
export interface ProviderSelection {
  /** Selected provider ID */
  providerId: ProviderId;
  
  /** Selected model */
  model: string;
  
  /** Reason for selection */
  reason: string;
  
  /** Fallback providers in case of failure */
  fallbacks: Array<{
    providerId: ProviderId;
    model: string;
  }>;
  
  /** Configuration overrides */
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

// =============================================================================
// ORCHESTRATION RESULT
// =============================================================================

/**
 * Complete result of orchestration
 */
export interface OrchestrationResult {
  /** Was the orchestration successful */
  success: boolean;
  
  /** The generated response */
  response?: {
    content: string;
    role: 'assistant';
    metadata: {
      skillId: SkillId;
      providerId: ProviderId;
      model: string;
      tokenCount: {
        prompt: number;
        completion: number;
        total: number;
      };
      latencyMs: number;
    };
  };
  
  /** Generated artifacts */
  artifacts?: Artifact[];
  
  /** Tool calls made during execution */
  toolCalls?: Array<{
    tool: string;
    params: Record<string, unknown>;
    result: ToolResult;
  }>;
  
  /** Error if orchestration failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
    recoverable: boolean;
  };
  
  /** Routing information */
  routing: RoutingResult;
  
  /** Provider information */
  provider: ProviderSelection;
  
  /** Performance metrics */
  metrics: {
    totalTimeMs: number;
    routingTimeMs: number;
    executionTimeMs: number;
    memoryRetrievalTimeMs?: number;
  };
}

// =============================================================================
// ORCHESTRATOR CONFIGURATION
// =============================================================================

/**
 * Configuration for the orchestrator
 */
export interface OrchestratorConfig {
  /** Default provider to use */
  defaultProvider: string;
  
  /** Default model to use */
  defaultModel: string;
  
  /** Maximum retries on failure */
  maxRetries: number;
  
  /** Timeout for LLM calls (ms) */
  timeout: number;
  
  /** Enable streaming responses */
  streaming: boolean;
  
  /** Routing configuration */
  routing: {
    /** Use semantic routing vs keyword-based */
    semantic: boolean;
    /** Minimum confidence to accept a skill match */
    minConfidence: number;
    /** Weight for semantic similarity */
    semanticWeight: number;
    /** Weight for keyword matches */
    keywordWeight: number;
  };
  
  /** Memory configuration */
  memory: {
    /** Maximum messages in short-term memory */
    maxShortTerm: number;
    /** Maximum tokens for context window */
    maxContextTokens: number;
  };
  
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    includeTimings: boolean;
  };
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_CONFIG: OrchestratorConfig = {
  defaultProvider: 'deepseek',
  defaultModel: 'deepseek-chat',
  maxRetries: 3,
  timeout: 60000,
  streaming: true,
  routing: {
    semantic: true,
    minConfidence: 0.6,
    semanticWeight: 0.6,
    keywordWeight: 0.4,
  },
  memory: {
    maxShortTerm: 20,
    maxContextTokens: 128000,
  },
  logging: {
    level: 'info',
    includeTimings: true,
  },
};

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted by the orchestrator
 */
export type OrchestratorEvent =
  | { type: 'orchestration:start'; context: OrchestrationContext }
  | { type: 'orchestration:routed'; result: RoutingResult }
  | { type: 'orchestration:provider_selected'; selection: ProviderSelection }
  | { type: 'orchestration:executing'; skill: SkillDefinition }
  | { type: 'orchestration:tool_call'; tool: string; params: Record<string, unknown> }
  | { type: 'orchestration:stream_chunk'; chunk: string }
  | { type: 'orchestration:complete'; result: OrchestrationResult }
  | { type: 'orchestration:error'; error: Error };
