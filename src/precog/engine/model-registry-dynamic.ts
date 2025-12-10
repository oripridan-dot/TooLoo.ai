// @version 1.0.0
/**
 * Dynamic Model Registry
 *
 * The brain center for the Emergent Neural Router - translates "Intent Features"
 * into "Model Recommendations" by querying the Knowledge Graph.
 *
 * This replaces static provider profiles with a self-evolving cognitive system
 * that learns from outcomes and adapts routing decisions over time.
 *
 * @module precog/engine/model-registry-dynamic
 */

import KnowledgeGraphEngine from '../../cortex/memory/knowledge-graph-engine.js';
import { bus } from '../../core/event-bus.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ModelRecommendation {
  provider: string;
  score: number;
  confidence: number;
  metrics: {
    successRate: number;
    avgTime: number;
    avgCost: number;
    avgQuality: number;
    attempts: number;
  };
  capabilities: string[];
  lastUsed: number | null;
}

export interface RecipeStep {
  role: string;
  model: string;
  task: string;
  priority?: number;
  fallback?: string;
}

export interface RoutingPlan {
  type: 'single' | 'recipe';
  model?: string;
  lane?: 'fast' | 'focus' | 'deep' | 'audit';
  confidence: number;
  name?: string;
  steps?: RecipeStep[];
  shadowTest?: boolean;
}

export interface OutcomeData {
  success: boolean;
  rating: number; // 0-1 normalized
  latency: number; // milliseconds
  quality?: number;
  cost?: number;
}

export type BudgetTier = 'low' | 'medium' | 'high';
export type DomainType = 'coding' | 'creative' | 'analysis' | 'generation' | 'general' | 'research';

// ============================================================================
// DYNAMIC MODEL REGISTRY CLASS
// ============================================================================

export class DynamicModelRegistry {
  private kg: KnowledgeGraphEngine;

  /**
   * Cold-start "DNA" - Base truth before learning kicks in
   * Maps domain to preferred models and quality threshold
   */
  private baseRegistry: Record<
    DomainType,
    {
      preferred: string[];
      threshold: number;
    }
  > = {
    coding: {
      preferred: ['deepseek', 'anthropic', 'gemini'],
      threshold: 0.8,
    },
    creative: {
      preferred: ['gemini', 'openai', 'anthropic'],
      threshold: 0.7,
    },
    analysis: {
      preferred: ['anthropic', 'gemini', 'openai'],
      threshold: 0.85,
    },
    generation: {
      preferred: ['gemini', 'openai', 'anthropic'],
      threshold: 0.75,
    },
    research: {
      preferred: ['anthropic', 'gemini', 'openai'],
      threshold: 0.85,
    },
    general: {
      preferred: ['gemini', 'deepseek', 'anthropic'],
      threshold: 0.7,
    },
  };

  /**
   * Feature patterns for domain classification
   */
  private featurePatterns: Record<string, DomainType> = {
    // Coding patterns
    code: 'coding',
    script: 'coding',
    react: 'coding',
    node: 'coding',
    typescript: 'coding',
    javascript: 'coding',
    python: 'coding',
    function: 'coding',
    class: 'coding',
    api: 'coding',
    debug: 'coding',
    fix: 'coding',
    implement: 'coding',
    refactor: 'coding',
    test: 'coding',

    // Creative patterns
    design: 'creative',
    image: 'creative',
    svg: 'creative',
    creative: 'creative',
    write: 'creative',
    story: 'creative',
    poem: 'creative',
    ui: 'creative',
    ux: 'creative',
    visual: 'creative',

    // Analysis patterns
    analyze: 'analysis',
    analysis: 'analysis',
    evaluate: 'analysis',
    compare: 'analysis',
    review: 'analysis',
    assess: 'analysis',
    explain: 'analysis',
    summarize: 'analysis',

    // Generation patterns
    generate: 'generation',
    create: 'generation',
    build: 'generation',
    make: 'generation',
    produce: 'generation',

    // Research patterns
    research: 'research',
    investigate: 'research',
    explore: 'research',
    study: 'research',
    document: 'research',
  };

  /**
   * Model capability profiles for intelligent routing
   */
  private modelCapabilities: Record<string, string[]> = {
    deepseek: ['coding', 'fast-inference', 'cost-effective', 'technical'],
    anthropic: ['reasoning', 'safety', 'analysis', 'creative', 'high-quality'],
    openai: ['versatile', 'creative', 'generation', 'fast', 'reliable'],
    gemini: ['multimodal', 'analysis', 'fast', 'cost-effective', 'reasoning'],
    huggingface: ['research', 'experimental', 'diverse-models', 'free-tier'],
    openinterpreter: ['code-execution', 'local', 'versatile', 'experimental'],
  };

  constructor() {
    this.kg = new KnowledgeGraphEngine();
    console.log('[DynamicModelRegistry] 🧠 Neural Router initialized with Knowledge Graph');
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Queries the Knowledge Graph for the best model given specific features
   * @param features - e.g. ['react', 'complex_logic', 'json']
   * @param budgetTier - 'low' | 'medium' | 'high'
   */
  async getBestModels(
    features: string[],
    budgetTier: BudgetTier = 'medium'
  ): Promise<ModelRecommendation[]> {
    const domain = this.mapFeaturesToDomain(features);
    const complexity = this.detectComplexity(features);

    console.log(
      `[DynamicModelRegistry] 🎯 Domain: ${domain}, Complexity: ${complexity}, Budget: ${budgetTier}`
    );

    // Ask KG for learned recommendations
    const recommendations = this.kg.getProviderRecommendations(domain, {
      priority: budgetTier === 'low' ? 'cost' : budgetTier === 'high' ? 'quality' : 'balanced',
      complexity,
      domain,
      features,
    });

    // If KG is cold (not enough data), fall back to base registry
    if (!recommendations || recommendations.length === 0) {
      console.log('[DynamicModelRegistry] 📊 Using cold-start fallback (KG learning)');
      return this.fallbackSelection(features, domain, budgetTier);
    }

    // Emit learning event
    bus.publish('precog', 'routing:decision', {
      domain,
      complexity,
      budgetTier,
      recommendations: recommendations.slice(0, 3).map((r) => r.provider),
      source: 'knowledge-graph',
    });

    return recommendations;
  }

  /**
   * Maps an array of features to a primary domain
   */
  mapFeaturesToDomain(features: string[]): DomainType {
    const domainScores: Record<DomainType, number> = {
      coding: 0,
      creative: 0,
      analysis: 0,
      generation: 0,
      research: 0,
      general: 0,
    };

    // Score each feature against known patterns
    for (const feature of features) {
      const normalizedFeature = feature.toLowerCase();

      // Check direct pattern matches
      for (const [pattern, domain] of Object.entries(this.featurePatterns)) {
        if (normalizedFeature.includes(pattern)) {
          domainScores[domain] += 1;
        }
      }
    }

    // Find the highest scoring domain
    let bestDomain: DomainType = 'general';
    let bestScore = 0;

    for (const [domain, score] of Object.entries(domainScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain as DomainType;
      }
    }

    return bestDomain;
  }

  /**
   * Detects complexity level from features
   */
  detectComplexity(features: string[]): 'low' | 'medium' | 'high' {
    const complexityIndicators = [
      'complex',
      'advanced',
      'architecture',
      'system',
      'multi',
      'integration',
      'optimization',
      'security',
      'performance',
      'scale',
      'distributed',
      'concurrent',
      'async',
    ];

    const simpleIndicators = ['simple', 'basic', 'quick', 'easy', 'small', 'tiny', 'mini'];

    let complexityScore = 0;

    for (const feature of features) {
      const normalized = feature.toLowerCase();
      if (complexityIndicators.some((ind) => normalized.includes(ind))) {
        complexityScore += 1;
      }
      if (simpleIndicators.some((ind) => normalized.includes(ind))) {
        complexityScore -= 1;
      }
    }

    // Also consider feature count
    if (features.length > 5) complexityScore += 1;
    if (features.length > 10) complexityScore += 1;

    if (complexityScore >= 2) return 'high';
    if (complexityScore <= -1) return 'low';
    return 'medium';
  }

  /**
   * Fallback selection when Knowledge Graph doesn't have enough data
   */
  fallbackSelection(
    features: string[],
    domain: DomainType,
    budgetTier: BudgetTier
  ): ModelRecommendation[] {
    const baseConfig = this.baseRegistry[domain] || this.baseRegistry.general;
    const preferred = [...baseConfig.preferred];

    // Adjust order based on budget tier
    if (budgetTier === 'low') {
      // Prioritize cost-effective models
      const costEffective = ['deepseek', 'gemini', 'huggingface'];
      preferred.sort((a, b) => {
        const aIndex = costEffective.indexOf(a);
        const bIndex = costEffective.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    } else if (budgetTier === 'high') {
      // Prioritize quality models
      const quality = ['anthropic', 'openai', 'gemini'];
      preferred.sort((a, b) => {
        const aIndex = quality.indexOf(a);
        const bIndex = quality.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    }

    // Convert to ModelRecommendation format
    return preferred.map((provider, index) => ({
      provider,
      score: 1 - index * 0.1, // Decreasing score by rank
      confidence: 0.5, // Low confidence for cold-start
      metrics: {
        successRate: 0.5,
        avgTime: 2000,
        avgCost: 0.01,
        avgQuality: 0.7,
        attempts: 0,
      },
      capabilities: this.modelCapabilities[provider] || ['general-purpose'],
      lastUsed: null,
    }));
  }

  /**
   * Records outcome and feeds it back into the Knowledge Graph
   * This is the learning pathway for the neural router
   */
  async recordOutcome(features: string[], modelId: string, outcome: OutcomeData): Promise<void> {
    const domain = this.mapFeaturesToDomain(features);
    const complexity = this.detectComplexity(features);
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[DynamicModelRegistry] 📝 Recording outcome for ${modelId} in ${domain} domain`);

    // Record to Knowledge Graph
    this.kg.recordTaskPerformance({
      taskId,
      goal: domain,
      provider: modelId,
      success: outcome.success,
      responseTime: outcome.latency,
      quality: outcome.rating,
      cost: outcome.cost,
      context: {
        features,
        complexity,
        domain,
      },
      timestamp: Date.now(),
    });

    // Emit learning event
    bus.publish('precog', 'outcome:recorded', {
      taskId,
      domain,
      modelId,
      outcome,
      features,
    });

    console.log(
      `[DynamicModelRegistry] ✅ Knowledge Graph updated (success: ${outcome.success}, quality: ${outcome.rating})`
    );
  }

  /**
   * Gets the recommended recipe for a given intent/task type
   */
  getRecipeForTask(taskType: string, complexity: 'low' | 'medium' | 'high'): RecipeStep[] | null {
    // Only complex tasks get recipes
    if (complexity === 'low') return null;

    const recipes: Record<string, RecipeStep[]> = {
      'code-architecture': [
        { role: 'architect', model: 'anthropic', task: 'design_spec', priority: 1 },
        {
          role: 'builder',
          model: 'deepseek',
          task: 'implementation',
          priority: 2,
          fallback: 'anthropic',
        },
        { role: 'critic', model: 'gemini', task: 'security_review', priority: 3 },
      ],
      'code-complex': [
        { role: 'planner', model: 'anthropic', task: 'breakdown', priority: 1 },
        { role: 'implementer', model: 'deepseek', task: 'code', priority: 2 },
        { role: 'reviewer', model: 'gemini', task: 'review', priority: 3 },
      ],
      'research-deep': [
        { role: 'researcher', model: 'anthropic', task: 'deep_analysis', priority: 1 },
        { role: 'synthesizer', model: 'gemini', task: 'synthesis', priority: 2 },
        { role: 'validator', model: 'openai', task: 'fact_check', priority: 3 },
      ],
      'creative-production': [
        { role: 'ideator', model: 'openai', task: 'brainstorm', priority: 1 },
        { role: 'creator', model: 'gemini', task: 'generate', priority: 2 },
        { role: 'refiner', model: 'anthropic', task: 'polish', priority: 3 },
      ],
    };

    return recipes[taskType] || null;
  }

  /**
   * Gets the current state of the registry for debugging/monitoring
   */
  getRegistryState(): {
    baseRegistry: Record<DomainType, { preferred: string[]; threshold: number }>;
    modelCapabilities: Record<string, string[]>;
    kgStats: any;
  } {
    return {
      baseRegistry: this.baseRegistry,
      modelCapabilities: this.modelCapabilities,
      kgStats: this.kg.getGraphStatistics(),
    };
  }

  /**
   * Gets recommendations with full context for transparency
   */
  async getRecommendationsWithContext(
    features: string[],
    budgetTier: BudgetTier = 'medium'
  ): Promise<{
    recommendations: ModelRecommendation[];
    context: {
      domain: DomainType;
      complexity: 'low' | 'medium' | 'high';
      budgetTier: BudgetTier;
      source: 'knowledge-graph' | 'cold-start';
    };
  }> {
    const domain = this.mapFeaturesToDomain(features);
    const complexity = this.detectComplexity(features);

    const kgRecommendations = this.kg.getProviderRecommendations(domain, {
      priority: budgetTier === 'low' ? 'cost' : budgetTier === 'high' ? 'quality' : 'balanced',
      complexity,
    });

    const hasKGData = kgRecommendations && kgRecommendations.length > 0;

    return {
      recommendations: hasKGData
        ? kgRecommendations
        : this.fallbackSelection(features, domain, budgetTier),
      context: {
        domain,
        complexity,
        budgetTier,
        source: hasKGData ? 'knowledge-graph' : 'cold-start',
      },
    };
  }
}

// Export singleton instance
export const dynamicModelRegistry = new DynamicModelRegistry();
export default DynamicModelRegistry;
