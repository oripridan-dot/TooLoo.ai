// @version 3.3.350
/**
 * Smart Router - Dynamic API Selection and Multi-Provider Orchestration
 *
 * This module enhances TooLoo's AI capabilities with:
 * - Dynamic provider selection based on task requirements
 * - Cost optimization across providers
 * - Latency-aware routing
 * - Automatic failover with context preservation
 * - Result synthesis from multiple providers
 *
 * Part of PHASE 1: AI Foundation and Synthesis
 * @module precog/providers/smart-router
 */

import { bus } from '../../core/event-bus.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderCapability {
  provider: string;
  model: string;
  capabilities: string[];
  costPer1kTokens: number; // in USD
  maxTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsCodeExecution: boolean;
  avgLatencyMs: number;
  reliability: number; // 0-1 score
  specializations: string[];
}

export interface RoutingDecision {
  primaryProvider: string;
  fallbackProviders: string[];
  reason: string;
  estimatedCost: number;
  expectedLatency: number;
  confidence: number;
}

export interface TaskProfile {
  type: 'chat' | 'code' | 'reasoning' | 'creative' | 'analysis' | 'vision' | 'synthesis';
  complexity: 'low' | 'medium' | 'high' | 'expert';
  domain: string;
  requiresStreaming: boolean;
  maxLatencyMs: number;
  budgetConstraint?: number; // Max cost in USD
  preferredProvider?: string;
}

export interface ProviderMetrics {
  provider: string;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  lastUsed: number;
  currentLoad: number;
  healthScore: number;
}

export interface SynthesisResult {
  content: string;
  sources: Array<{
    provider: string;
    contribution: string;
    confidence: number;
  }>;
  consensusScore: number;
  synthesisMethod: string;
}

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  // Anthropic Claude Models
  'anthropic:claude-sonnet-4.5': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
    capabilities: ['chat', 'code', 'reasoning', 'analysis', 'creative'],
    costPer1kTokens: 0.015,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: false,
    avgLatencyMs: 800,
    reliability: 0.98,
    specializations: ['code-review', 'complex-reasoning', 'long-context'],
  },
  'anthropic:claude-haiku-4.5': {
    provider: 'anthropic',
    model: 'claude-haiku-4.5',
    capabilities: ['chat', 'code', 'quick-tasks'],
    costPer1kTokens: 0.0025,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: false,
    avgLatencyMs: 300,
    reliability: 0.97,
    specializations: ['quick-responses', 'simple-tasks', 'cost-effective'],
  },
  'anthropic:claude-opus-4.5': {
    provider: 'anthropic',
    model: 'claude-opus-4.5',
    capabilities: ['chat', 'code', 'reasoning', 'analysis', 'creative', 'expert'],
    costPer1kTokens: 0.075,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: false,
    avgLatencyMs: 1200,
    reliability: 0.99,
    specializations: ['expert-reasoning', 'complex-analysis', 'research'],
  },

  // Google Gemini Models
  'gemini:gemini-2.5-pro': {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    capabilities: ['chat', 'code', 'reasoning', 'vision', 'creative'],
    costPer1kTokens: 0.00125,
    maxTokens: 1000000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: true,
    avgLatencyMs: 600,
    reliability: 0.96,
    specializations: ['multimodal', 'long-context', 'creative-writing'],
  },
  'gemini:gemini-3-pro': {
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    capabilities: ['chat', 'code', 'reasoning', 'vision', 'creative', 'expert'],
    costPer1kTokens: 0.002,
    maxTokens: 2000000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: true,
    avgLatencyMs: 700,
    reliability: 0.95,
    specializations: ['cutting-edge', 'multimodal', 'complex-tasks'],
  },

  // OpenAI Models
  'openai:gpt-5': {
    provider: 'openai',
    model: 'gpt-5',
    capabilities: ['chat', 'code', 'reasoning', 'analysis'],
    costPer1kTokens: 0.03,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: true,
    supportsCodeExecution: true,
    avgLatencyMs: 900,
    reliability: 0.97,
    specializations: ['general-purpose', 'function-calling', 'structured-output'],
  },
  'openai:gpt-5-codex': {
    provider: 'openai',
    model: 'gpt-5-codex-preview',
    capabilities: ['code', 'reasoning', 'analysis'],
    costPer1kTokens: 0.04,
    maxTokens: 128000,
    supportsStreaming: true,
    supportsVision: false,
    supportsCodeExecution: true,
    avgLatencyMs: 1000,
    reliability: 0.96,
    specializations: ['code-generation', 'debugging', 'refactoring'],
  },

  // DeepSeek Models
  'deepseek:deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    capabilities: ['chat', 'code', 'reasoning'],
    costPer1kTokens: 0.0014,
    maxTokens: 64000,
    supportsStreaming: true,
    supportsVision: false,
    supportsCodeExecution: false,
    avgLatencyMs: 500,
    reliability: 0.92,
    specializations: ['cost-effective', 'code-tasks', 'chinese-language'],
  },
  'deepseek:deepseek-coder': {
    provider: 'deepseek',
    model: 'deepseek-coder',
    capabilities: ['code', 'reasoning'],
    costPer1kTokens: 0.001,
    maxTokens: 64000,
    supportsStreaming: true,
    supportsVision: false,
    supportsCodeExecution: false,
    avgLatencyMs: 400,
    reliability: 0.91,
    specializations: ['code-generation', 'code-completion', 'budget-friendly'],
  },

  // Local AI (Ollama)
  'localai:ollama': {
    provider: 'localai',
    model: 'llama3.2',
    capabilities: ['chat', 'code', 'reasoning'],
    costPer1kTokens: 0,
    maxTokens: 32000,
    supportsStreaming: true,
    supportsVision: false,
    supportsCodeExecution: false,
    avgLatencyMs: 200,
    reliability: 0.85,
    specializations: ['offline', 'privacy', 'no-cost'],
  },
};

// ============================================================================
// SMART ROUTER CLASS
// ============================================================================

export class SmartRouter {
  private metrics: Map<string, ProviderMetrics> = new Map();
  private routingHistory: RoutingDecision[] = [];
  private availableProviders: Set<string> = new Set();

  constructor() {
    this.initializeMetrics();
    this.detectAvailableProviders();
  }

  private initializeMetrics() {
    for (const key of Object.keys(PROVIDER_CAPABILITIES)) {
      const provider = key.split(':')[0];
      if (provider && !this.metrics.has(provider)) {
        this.metrics.set(provider, {
          provider,
          successCount: 0,
          failureCount: 0,
          totalLatencyMs: 0,
          lastUsed: 0,
          currentLoad: 0,
          healthScore: 1.0,
        });
      }
    }
  }

  private detectAvailableProviders() {
    const env = process.env;
    
    if (env['ANTHROPIC_API_KEY']) this.availableProviders.add('anthropic');
    if (env['GEMINI_API_KEY']) this.availableProviders.add('gemini');
    if (env['OPENAI_API_KEY']) this.availableProviders.add('openai');
    if (env['DEEPSEEK_API_KEY']) this.availableProviders.add('deepseek');
    if (env['LOCALAI_BASE_URL'] || env['ENABLE_LOCALAI'] === 'true') {
      this.availableProviders.add('localai');
    }

    console.log(`[SmartRouter] Available providers: ${Array.from(this.availableProviders).join(', ')}`);
  }

  /**
   * Analyze task and create a profile for routing decisions
   */
  analyzeTask(
    prompt: string,
    context: {
      taskType?: string;
      domain?: string;
      requiresStreaming?: boolean;
      maxLatencyMs?: number;
      budget?: number;
      preferredProvider?: string;
    } = {}
  ): TaskProfile {
    // Complexity detection
    const wordCount = prompt.split(/\s+/).length;
    const hasCode = /```|function|class|import|export|const |let |var /.test(prompt);
    const hasAnalysis = /analyze|compare|evaluate|review|assess|explain why/i.test(prompt);
    const hasCreative = /write|create|generate|compose|design|imagine/i.test(prompt);
    const hasVision = /image|picture|screenshot|diagram|visual/i.test(prompt);
    
    let complexity: TaskProfile['complexity'] = 'low';
    if (wordCount > 500 || hasAnalysis) complexity = 'high';
    else if (wordCount > 200 || hasCode) complexity = 'medium';
    if (hasAnalysis && hasCode) complexity = 'expert';

    // Task type detection
    let type: TaskProfile['type'] = 'chat';
    if (hasCode) type = 'code';
    else if (hasAnalysis) type = 'analysis';
    else if (hasCreative) type = 'creative';
    else if (hasVision) type = 'vision';

    // Domain detection (simplified - integrates with DomainExpertise)
    let domain = 'general';
    if (/code|programming|software|api|database/i.test(prompt)) domain = 'engineering';
    else if (/ui|ux|design|layout|color/i.test(prompt)) domain = 'design';
    else if (/business|strategy|market|revenue/i.test(prompt)) domain = 'business';
    else if (/research|study|data|evidence/i.test(prompt)) domain = 'research';
    else if (/creative|writing|story|artistic/i.test(prompt)) domain = 'creative';

    return {
      type: context.taskType as TaskProfile['type'] || type,
      complexity,
      domain: context.domain || domain,
      requiresStreaming: context.requiresStreaming ?? true,
      maxLatencyMs: context.maxLatencyMs ?? 5000,
      budgetConstraint: context.budget,
      preferredProvider: context.preferredProvider,
    };
  }

  /**
   * Make intelligent routing decision based on task profile
   */
  route(taskProfile: TaskProfile): RoutingDecision {
    const candidates = this.getCandidateModels(taskProfile);
    
    if (candidates.length === 0) {
      return {
        primaryProvider: 'none',
        fallbackProviders: [],
        reason: 'No available providers match task requirements',
        estimatedCost: 0,
        expectedLatency: 0,
        confidence: 0,
      };
    }

    // Score each candidate
    const scored = candidates.map(c => ({
      ...c,
      score: this.scoreCandidate(c, taskProfile),
    })).sort((a, b) => b.score - a.score);

    const primary = scored[0]!;
    const fallbacks = scored.slice(1, 4).map(s => `${s.provider}:${s.model}`);

    const decision: RoutingDecision = {
      primaryProvider: `${primary.provider}:${primary.model}`,
      fallbackProviders: fallbacks,
      reason: this.explainDecision(primary, taskProfile),
      estimatedCost: this.estimateCost(primary, taskProfile),
      expectedLatency: primary.avgLatencyMs,
      confidence: primary.score,
    };

    // Record decision
    this.routingHistory.push(decision);
    bus.publish('precog', 'smart-router:decision', decision);

    return decision;
  }

  private getCandidateModels(taskProfile: TaskProfile): ProviderCapability[] {
    return Object.values(PROVIDER_CAPABILITIES).filter(cap => {
      // Must be available
      if (!this.availableProviders.has(cap.provider)) return false;

      // Must support required capabilities
      if (taskProfile.requiresStreaming && !cap.supportsStreaming) return false;
      if (taskProfile.type === 'vision' && !cap.supportsVision) return false;

      // Must meet latency requirements
      if (cap.avgLatencyMs > taskProfile.maxLatencyMs) return false;

      // Must be within budget
      if (taskProfile.budgetConstraint !== undefined) {
        const estimatedCost = this.estimateCost(cap, taskProfile);
        if (estimatedCost > taskProfile.budgetConstraint) return false;
      }

      return true;
    });
  }

  private scoreCandidate(cap: ProviderCapability, taskProfile: TaskProfile): number {
    let score = 0;

    // Reliability weight (30%)
    score += cap.reliability * 30;

    // Cost efficiency weight (25%)
    const maxCost = 0.1; // Normalize against max expected cost
    const costScore = 1 - Math.min(cap.costPer1kTokens / maxCost, 1);
    score += costScore * 25;

    // Latency weight (20%)
    const latencyScore = 1 - Math.min(cap.avgLatencyMs / taskProfile.maxLatencyMs, 1);
    score += latencyScore * 20;

    // Specialization match (15%)
    const specMatch = cap.specializations.some(s => 
      taskProfile.domain.includes(s) || 
      taskProfile.type.includes(s)
    );
    if (specMatch) score += 15;

    // Complexity match (10%)
    if (taskProfile.complexity === 'expert' && cap.capabilities.includes('expert')) {
      score += 10;
    } else if (taskProfile.complexity === 'low' && cap.specializations.includes('quick-responses')) {
      score += 10;
    } else if (taskProfile.complexity === 'medium') {
      score += 5;
    }

    // Preferred provider bonus
    if (taskProfile.preferredProvider === cap.provider) {
      score += 5;
    }

    // Health score from metrics
    const metrics = this.metrics.get(cap.provider);
    if (metrics) {
      score += metrics.healthScore * 5;
    }

    return score / 100;
  }

  private estimateCost(cap: ProviderCapability, taskProfile: TaskProfile): number {
    // Estimate tokens based on complexity
    const tokenEstimates: Record<string, number> = {
      low: 500,
      medium: 1500,
      high: 3000,
      expert: 6000,
    };
    
    const inputTokens = tokenEstimates[taskProfile.complexity] ?? 1000;
    const outputTokens = inputTokens * 1.5; // Assume 1.5x output
    const totalTokens = inputTokens + outputTokens;
    
    return (totalTokens / 1000) * cap.costPer1kTokens;
  }

  private explainDecision(cap: ProviderCapability, taskProfile: TaskProfile): string {
    const reasons: string[] = [];
    
    if (cap.reliability >= 0.97) reasons.push('high reliability');
    if (cap.costPer1kTokens < 0.005) reasons.push('cost-effective');
    if (cap.avgLatencyMs < 500) reasons.push('fast response');
    if (cap.specializations.some(s => taskProfile.domain.includes(s))) {
      reasons.push(`specialized for ${taskProfile.domain}`);
    }
    
    return `Selected ${cap.provider}/${cap.model}: ${reasons.join(', ')}`;
  }

  /**
   * Update metrics after a request completes
   */
  recordOutcome(provider: string, success: boolean, latencyMs: number) {
    const metrics = this.metrics.get(provider);
    if (!metrics) return;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }
    
    metrics.totalLatencyMs += latencyMs;
    metrics.lastUsed = Date.now();
    
    // Recalculate health score
    const total = metrics.successCount + metrics.failureCount;
    const successRate = total > 0 ? metrics.successCount / total : 1;
    const avgLatency = total > 0 ? metrics.totalLatencyMs / total : 0;
    const latencyPenalty = Math.min(avgLatency / 5000, 0.3);
    
    metrics.healthScore = Math.max(0, successRate - latencyPenalty);
    
    bus.publish('precog', 'smart-router:metrics', { provider, metrics });
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return {
      availableProviders: Array.from(this.availableProviders),
      metrics: Object.fromEntries(this.metrics),
      recentDecisions: this.routingHistory.slice(-10),
      capabilities: PROVIDER_CAPABILITIES,
    };
  }

  /**
   * Synthesize results from multiple providers
   */
  async synthesizeResults(
    results: Array<{ provider: string; content: string; confidence: number }>
  ): Promise<SynthesisResult> {
    if (results.length === 0) {
      return {
        content: '',
        sources: [],
        consensusScore: 0,
        synthesisMethod: 'none',
      };
    }

    if (results.length === 1) {
      return {
        content: results[0]!.content,
        sources: [{ 
          provider: results[0]!.provider, 
          contribution: 'sole-source',
          confidence: results[0]!.confidence 
        }],
        consensusScore: results[0]!.confidence,
        synthesisMethod: 'single-source',
      };
    }

    // Multi-provider synthesis
    // Calculate consensus based on content similarity and confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // For now, use the highest confidence result as primary
    // Full synthesis would use LLM to merge (done in synthesizer.ts)
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
    const primary = sorted[0]!;

    return {
      content: primary.content,
      sources: results.map(r => ({
        provider: r.provider,
        contribution: r === primary ? 'primary' : 'supporting',
        confidence: r.confidence,
      })),
      consensusScore: avgConfidence,
      synthesisMethod: 'confidence-weighted',
    };
  }
}

// Export singleton instance
export const smartRouter = new SmartRouter();
