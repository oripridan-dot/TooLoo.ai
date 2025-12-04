// @version 2.2.238
/**
 * TransparencyWrapper — The heart of TooLoo.ai V3
 *
 * Wraps all responses with full transparency metadata showing:
 * - Which providers collaborated
 * - The exact models used (claude-sonnet-4.5, gemini-3-pro-preview)
 * - Cost breakdown ($0.003 Gemini + $0.008 Claude = $0.011)
 * - Validation trace
 * - Routing decisions
 */

import {
  XAIEnvelope,
  XAIMeta,
  ProviderTrace,
  ValidationTrace,
  ReasoningTrace,
  XAIEnvelopeSchema,
} from './schemas.js';
import { getXAIConfig } from './config.js';

/**
 * Builder pattern for constructing XAI metadata
 */
export class XAIMetaBuilder {
  private meta: Partial<XAIMeta> = {
    providers_used: [],
    models: [],
    provider_traces: [],
    validation_trace: [],
    reasoning_trace: [],
    cost_breakdown: {},
    provider_latencies: {},
    timestamp: new Date().toISOString(),
  };

  private startTime: number = Date.now();

  /**
   * Add a provider trace
   */
  addProvider(trace: ProviderTrace): this {
    this.meta.provider_traces!.push(trace);

    // Update aggregated fields
    if (!this.meta.providers_used!.includes(trace.provider)) {
      this.meta.providers_used!.push(trace.provider);
    }
    if (!this.meta.models!.includes(trace.model)) {
      this.meta.models!.push(trace.model);
    }

    // Update cost breakdown
    this.meta.cost_breakdown![`${trace.provider}_${trace.role}`] = trace.cost_usd;
    this.meta.provider_latencies![trace.provider] = trace.latency_ms;

    return this;
  }

  /**
   * Set the primary (main) provider
   */
  setPrimary(provider: string, model: string): this {
    this.meta.primary_provider = provider;
    this.meta.primary_model = model;
    return this;
  }

  /**
   * Set routing information
   */
  setRouting(
    reason: string,
    classification: XAIMeta['task_classification'],
    mode: XAIMeta['execution_mode']
  ): this {
    this.meta.routing_reason = reason;
    this.meta.task_classification = classification;
    this.meta.execution_mode = mode;
    return this;
  }

  /**
   * Set confidence scores
   */
  setConfidence(confidence: number, consensus?: number): this {
    this.meta.confidence_score = confidence;
    if (consensus !== undefined) {
      this.meta.consensus_score = consensus;
    }
    return this;
  }

  /**
   * Add validation trace entry
   */
  addValidation(trace: ValidationTrace): this {
    this.meta.validation_trace!.push(trace);
    return this;
  }

  /**
   * Set validation status
   */
  setValidationStatus(status: XAIMeta['validation_status']): this {
    this.meta.validation_status = status;
    return this;
  }

  /**
   * Add reasoning trace (from Tree of Thoughts)
   */
  addReasoning(trace: ReasoningTrace): this {
    this.meta.reasoning_trace!.push(trace);
    return this;
  }

  /**
   * Record regeneration event
   */
  recordRegeneration(count: number = 1): this {
    this.meta.regeneration_triggered = true;
    this.meta.regeneration_count = (this.meta.regeneration_count || 0) + count;
    return this;
  }

  /**
   * Finalize and build the metadata
   */
  build(): XAIMeta {
    // Calculate totals
    const config = getXAIConfig();

    // Total cost
    const totalCost = this.meta.provider_traces!.reduce((sum, t) => sum + t.cost_usd, 0);

    // Total latency
    const totalLatency = Date.now() - this.startTime;

    // Set V3 flag
    this.meta.v3_full_validation = config.V3_FULL_VALIDATION;

    // Ensure required fields have defaults
    const meta: XAIMeta = {
      providers_used: this.meta.providers_used || [],
      models: this.meta.models || [],
      primary_provider: this.meta.primary_provider || 'unknown',
      primary_model: this.meta.primary_model || 'unknown',
      confidence_score: this.meta.confidence_score ?? 0.85,
      consensus_score: this.meta.consensus_score,
      routing_reason: this.meta.routing_reason || 'Default routing',
      task_classification: this.meta.task_classification || 'moderate',
      execution_mode: this.meta.execution_mode || 'single',
      cost_usd: totalCost,
      cost_breakdown: this.meta.cost_breakdown,
      total_latency_ms: totalLatency,
      provider_latencies: this.meta.provider_latencies,
      validation_status: this.meta.validation_status,
      validation_trace: this.meta.validation_trace,
      reasoning_trace: this.meta.reasoning_trace,
      provider_traces: this.meta.provider_traces,
      v3_full_validation: this.meta.v3_full_validation,
      regeneration_triggered: this.meta.regeneration_triggered,
      regeneration_count: this.meta.regeneration_count,
      timestamp: new Date().toISOString(),
    };

    return meta;
  }
}

/**
 * TransparencyWrapper — Main class for creating XAI-wrapped responses
 */
export class TransparencyWrapper {
  private builder: XAIMetaBuilder;

  constructor() {
    this.builder = new XAIMetaBuilder();
  }

  /**
   * Start a new transparency session
   */
  static create(): TransparencyWrapper {
    return new TransparencyWrapper();
  }

  /**
   * Get the metadata builder for chained operations
   */
  get meta(): XAIMetaBuilder {
    return this.builder;
  }

  /**
   * Wrap data with the XAI envelope
   */
  wrap<T>(data: T, ok: boolean = true): XAIEnvelope {
    const envelope: XAIEnvelope = {
      ok,
      data,
      meta: this.builder.build(),
      api_version: 'v3',
      timestamp: Date.now(),
    };

    // Validate the envelope
    const result = XAIEnvelopeSchema.safeParse(envelope);
    if (!result.success) {
      console.warn('[XAI] Envelope validation warning:', result.error);
    }

    return envelope;
  }

  /**
   * Create a minimal envelope for simple responses
   */
  wrapMinimal<T>(
    data: T,
    provider: string,
    model: string,
    latencyMs: number,
    costUsd: number
  ): XAIEnvelope {
    this.builder
      .addProvider({
        provider: provider as any,
        model,
        role: 'generator',
        latency_ms: latencyMs,
        cost_usd: costUsd,
        success: true,
      })
      .setPrimary(provider, model)
      .setRouting('Single provider response', 'simple', 'single')
      .setConfidence(0.85);

    return this.wrap(data);
  }

  /**
   * Create an error envelope
   */
  wrapError(error: Error | string, partialData?: any): XAIEnvelope {
    const errorMessage = error instanceof Error ? error.message : error;

    return {
      ok: false,
      data: {
        error: errorMessage,
        ...partialData,
      },
      meta: this.builder.setConfidence(0).build(),
      api_version: 'v3',
      timestamp: Date.now(),
    };
  }
}

/**
 * Quick helper to wrap a simple response
 */
export function wrapResponse<T>(
  data: T,
  provider: string,
  model: string,
  options: {
    latencyMs?: number;
    costUsd?: number;
    confidence?: number;
    routingReason?: string;
    taskClassification?: XAIMeta['task_classification'];
    executionMode?: XAIMeta['execution_mode'];
  } = {}
): XAIEnvelope {
  const wrapper = TransparencyWrapper.create();

  wrapper.meta
    .addProvider({
      provider: provider as any,
      model,
      role: 'generator',
      latency_ms: options.latencyMs || 0,
      cost_usd: options.costUsd || 0,
      success: true,
    })
    .setPrimary(provider, model)
    .setRouting(
      options.routingReason || 'Standard routing',
      options.taskClassification || 'moderate',
      options.executionMode || 'single'
    )
    .setConfidence(options.confidence || 0.85);

  return wrapper.wrap(data);
}

/**
 * Format cost for display
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.001) return '<$0.001';
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`;
  return `$${costUsd.toFixed(3)}`;
}

/**
 * Format the cost breakdown for display
 * e.g., "$0.003 (Gemini) + $0.008 (Claude validation) = $0.011 total"
 */
export function formatCostBreakdown(meta: XAIMeta): string {
  if (!meta.cost_breakdown || Object.keys(meta.cost_breakdown).length === 0) {
    return formatCost(meta.cost_usd);
  }

  const parts = Object.entries(meta.cost_breakdown)
    .map(([key, cost]) => `${formatCost(cost as number)} (${key.replace('_', ' ')})`)
    .join(' + ');

  return `${parts} = ${formatCost(meta.cost_usd)} total`;
}

/**
 * Generate a summary badge for the response
 * e.g., "gemini-3-pro + claude-sonnet-4.5 | validated | $0.011"
 */
export function generateBadge(meta: XAIMeta): string {
  const models = meta.models.join(' + ');
  const validation =
    meta.validation_status === 'full'
      ? 'validated'
      : meta.validation_status === 'partial'
        ? 'partial-val'
        : 'unvalidated';
  const cost = formatCost(meta.cost_usd);

  return `${models} | ${validation} | ${cost}`;
}
