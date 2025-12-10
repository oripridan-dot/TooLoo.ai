// @version 2.2.239
/**
 * XAI Schemas — Zod validation for transparency envelope structure
 *
 * Defines the exact structure for V3 multi-provider orchestration responses.
 */

import { z } from 'zod';

/**
 * Provider trace — records a single provider's participation
 */
export const ProviderTraceSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'local']),
  model: z.string(), // e.g., "claude-sonnet-4-20250514", "gemini-2.0-flash-exp"
  role: z.enum(['generator', 'reviewer', 'tester', 'optimizer', 'synthesizer', 'validator']),
  latency_ms: z.number(),
  cost_usd: z.number(),
  tokens: z
    .object({
      input: z.number().optional(),
      output: z.number().optional(),
      total: z.number(),
    })
    .optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type ProviderTrace = z.infer<typeof ProviderTraceSchema>;

/**
 * Validation trace — records validation pipeline steps
 */
export const ValidationTraceSchema = z.object({
  stage: z.enum(['generate', 'review', 'test', 'optimize', 'consensus']),
  provider: z.string(),
  model: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'pending']),
  score: z.number().min(0).max(1).optional(),
  feedback: z.string().optional(),
  timestamp: z.string(),
});

export type ValidationTrace = z.infer<typeof ValidationTraceSchema>;

/**
 * Reasoning trace — from Tree of Thoughts
 */
export const ReasoningTraceSchema = z.object({
  thought: z.string(),
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1),
  branch_id: z.number().optional(),
});

export type ReasoningTrace = z.infer<typeof ReasoningTraceSchema>;

/**
 * XAI Meta — the transparency metadata attached to every V3 response
 */
export const XAIMetaSchema = z.object({
  // Provider Transparency
  providers_used: z.array(z.string()), // ["anthropic", "gemini"]
  models: z.array(z.string()), // ["claude-sonnet-4-20250514", "gemini-2.0-flash-exp"]
  primary_provider: z.string(), // Main response generator
  primary_model: z.string(),

  // Confidence & Quality
  confidence_score: z.number().min(0).max(1),
  consensus_score: z.number().min(0).max(1).optional(), // Agreement between providers

  // Routing Intelligence
  routing_reason: z.string(), // "High complexity detected (code architecture)"
  task_classification: z.enum(['simple', 'moderate', 'complex', 'critical']),
  execution_mode: z.enum(['single', 'fallback', 'ensemble', 'validation_loop']),

  // Cost Transparency
  cost_usd: z.number(), // Total cost
  cost_breakdown: z.record(z.string(), z.number()).optional(), // { "gemini": 0.003, "claude_validation": 0.008 }

  // Latency
  total_latency_ms: z.number(),
  provider_latencies: z.record(z.string(), z.number()).optional(),

  // Validation Pipeline
  validation_status: z.enum(['none', 'partial', 'full', 'failed']).optional(),
  validation_trace: z.array(ValidationTraceSchema).optional(),

  // Reasoning (from Tree of Thoughts)
  reasoning_trace: z.array(ReasoningTraceSchema).optional(),

  // Provider Traces (detailed)
  provider_traces: z.array(ProviderTraceSchema).optional(),

  // Feature Flags
  v3_full_validation: z.boolean().optional(),
  regeneration_triggered: z.boolean().optional(),
  regeneration_count: z.number().optional(),

  // Timestamp
  timestamp: z.string(),
});

export type XAIMeta = z.infer<typeof XAIMetaSchema>;

/**
 * XAI Envelope — the complete V3 response wrapper
 *
 * This is what makes TooLoo.ai unique: transparent multi-provider orchestration.
 */
export const XAIEnvelopeSchema = z.object({
  // Standard response
  ok: z.boolean(),
  data: z.any(), // The actual response content

  // V3 Transparency Layer
  meta: XAIMetaSchema,

  // API versioning
  api_version: z.literal('v2').or(z.literal('v3')).default('v3'),

  // Timestamp
  timestamp: z.number(),
});

export type XAIEnvelope = z.infer<typeof XAIEnvelopeSchema>;

/**
 * Minimal XAI Meta for simple/fast responses
 */
export const XAIMetaMinimalSchema = XAIMetaSchema.pick({
  providers_used: true,
  models: true,
  primary_provider: true,
  primary_model: true,
  confidence_score: true,
  routing_reason: true,
  cost_usd: true,
  total_latency_ms: true,
  execution_mode: true,
  task_classification: true,
  timestamp: true,
});

export type XAIMetaMinimal = z.infer<typeof XAIMetaMinimalSchema>;
