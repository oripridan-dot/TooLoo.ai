/**
 * @tooloo/providers - Provider Type Definitions
 * Unified LLM provider interface
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';
import type { ProviderId } from '@tooloo/core';

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

/**
 * Provider capability domains
 */
export type CapabilityDomain = 
  | 'coding'
  | 'reasoning'
  | 'creative'
  | 'analysis'
  | 'vision'
  | 'function-calling';

/**
 * Capability level
 */
export type CapabilityLevel = 'expert' | 'proficient' | 'capable' | 'limited' | 'none';

/**
 * Model capability rating
 */
export interface ModelCapability {
  domain: CapabilityDomain;
  level: CapabilityLevel;
  score: number;  // 0-100
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  costPer1kInput: number;   // USD
  costPer1kOutput: number;  // USD
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  models: ModelInfo[];
  defaultModel: string;
  enabled: boolean;
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;  // For tool messages
  toolCallId?: string;
}

/**
 * Tool/function definition
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Tool call from model
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}

/**
 * Completion request
 */
export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;  // Extracted system prompt for providers that handle it separately
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  responseFormat?: { type: 'text' | 'json_object' };
}

/**
 * Usage statistics
 */
export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
}

/**
 * Completion response (non-streaming)
 */
export interface CompletionResponse {
  id: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'tool_use' | 'content_filter' | 'error';
  usage: UsageStats;
  latencyMs: number;
  provider?: string;  // Provider that generated this response
  metadata?: Record<string, unknown>;  // Provider-specific metadata
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  id: string;
  type: 'content' | 'delta' | 'tool_call' | 'usage' | 'done' | 'error';
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: UsageStats;
  error?: string;
  finishReason?: CompletionResponse['finishReason'];
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  
  /** Time in ms before attempting recovery */
  resetTimeout: number;
  
  /** Number of successful calls to close circuit */
  successThreshold: number;
  
  /** Timeout for individual calls in ms */
  callTimeout: number;
}

/**
 * Circuit breaker status
 */
export interface CircuitBreakerStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextRetry?: Date;
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
  checkedAt: Date;
}

/**
 * Provider - Unified interface for all LLM providers
 */
export interface Provider {
  /** Provider identifier */
  readonly id: ProviderId;
  
  /** Provider display name */
  readonly name: string;
  
  /** Available models */
  readonly models: ModelInfo[];
  
  /** Circuit breaker status */
  readonly circuitStatus: CircuitBreakerStatus;
  
  /**
   * Check if provider is available
   */
  isAvailable(): boolean;
  
  /**
   * Health check
   */
  healthCheck(): Promise<HealthCheckResult>;
  
  /**
   * Complete a chat request (non-streaming)
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /**
   * Stream a chat completion
   */
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;
  
  /**
   * Get model information
   */
  getModel(modelId: string): ModelInfo | undefined;
  
  /**
   * Count tokens in messages (approximate)
   */
  countTokens(messages: ChatMessage[]): number;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  responseFormat: z.object({
    type: z.enum(['text', 'json_object']),
  }).optional(),
});

export const UsageStatsSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  estimatedCost: z.number().optional(),
});

export const CompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  content: z.string(),
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter', 'error']),
  usage: UsageStatsSchema,
  latencyMs: z.number(),
});

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,  // 30 seconds
  successThreshold: 2,
  callTimeout: 60000,   // 60 seconds
};

/**
 * Model capabilities matrix for common providers
 */
export const MODEL_CAPABILITIES: Record<string, ModelInfo> = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    contextWindow: 64000,
    maxOutputTokens: 8000,
    capabilities: [
      { domain: 'coding', level: 'expert', score: 95 },
      { domain: 'reasoning', level: 'proficient', score: 85 },
      { domain: 'analysis', level: 'proficient', score: 80 },
    ],
    costPer1kInput: 0.00014,
    costPer1kOutput: 0.00028,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: [
      { domain: 'coding', level: 'expert', score: 92 },
      { domain: 'reasoning', level: 'expert', score: 95 },
      { domain: 'creative', level: 'expert', score: 90 },
      { domain: 'analysis', level: 'expert', score: 93 },
      { domain: 'vision', level: 'proficient', score: 85 },
    ],
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: [
      { domain: 'coding', level: 'proficient', score: 88 },
      { domain: 'reasoning', level: 'expert', score: 90 },
      { domain: 'creative', level: 'proficient', score: 85 },
      { domain: 'analysis', level: 'proficient', score: 87 },
      { domain: 'vision', level: 'expert', score: 92 },
    ],
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: [
      { domain: 'coding', level: 'proficient', score: 85 },
      { domain: 'reasoning', level: 'proficient', score: 88 },
      { domain: 'creative', level: 'proficient', score: 82 },
      { domain: 'analysis', level: 'expert', score: 90 },
      { domain: 'vision', level: 'proficient', score: 85 },
    ],
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
  },
};
