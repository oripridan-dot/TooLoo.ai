// @version 3.3.559
/**
 * Execution Recipes
 * 
 * Phase 5: Intelligence Layer Optimization
 * 
 * Pre-defined execution patterns for different task types:
 * - Speed Run: Fast, cost-effective execution
 * - Quality Build: Thorough, high-quality execution with validation
 * - Research Dive: Deep analysis with multiple perspectives
 * - Creative Sprint: Exploratory, creative execution
 * 
 * @module precog/engine/execution-recipes
 */

import { bus } from '../../core/event-bus.js';
import { modelCapabilityService, MODEL_PROFILES, TASK_PROFILES } from './model-capabilities.js';
import type { RoutingPlan, RecipeStep } from './model-registry-dynamic.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RecipeName = 
  | 'speed-run' 
  | 'quality-build' 
  | 'research-dive' 
  | 'creative-sprint'
  | 'architect-builder'
  | 'code-review-cycle'
  | 'document-analysis';

export interface ExecutionRecipe {
  name: RecipeName;
  description: string;
  trigger: {
    keywords: string[];
    taskTypes: string[];
    complexityRange: { min: number; max: number };
  };
  steps: RecipeStep[];
  expectedLatencyMs: number;
  expectedCostMultiplier: number;
  qualityTarget: number; // 0-1
  lane: 'fast' | 'focus' | 'deep' | 'audit';
}

export interface RecipeSelectionResult {
  recipe: ExecutionRecipe;
  confidence: number;
  reason: string;
  alternativeRecipes: RecipeName[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe Definitions
// ─────────────────────────────────────────────────────────────────────────────

const RECIPES: Record<RecipeName, ExecutionRecipe> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Speed Run - Fast execution for simple tasks
  // ─────────────────────────────────────────────────────────────────────────
  'speed-run': {
    name: 'speed-run',
    description: 'Fast, cost-effective execution for straightforward tasks',
    trigger: {
      keywords: ['quick', 'simple', 'fast', 'just', 'briefly', 'short'],
      taskTypes: ['quick-query', 'conversation', 'summarization'],
      complexityRange: { min: 0, max: 0.4 },
    },
    steps: [
      {
        role: 'executor',
        model: 'deepseek', // Fastest, cheapest for code
        task: 'execute',
        priority: 1,
        fallback: 'gemini',
      },
    ],
    expectedLatencyMs: 1500,
    expectedCostMultiplier: 0.3,
    qualityTarget: 0.75,
    lane: 'fast',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Quality Build - Thorough execution with validation
  // ─────────────────────────────────────────────────────────────────────────
  'quality-build': {
    name: 'quality-build',
    description: 'High-quality execution with validation for important tasks',
    trigger: {
      keywords: ['production', 'quality', 'thorough', 'careful', 'important', 'critical'],
      taskTypes: ['code-generation', 'architecture', 'code-review'],
      complexityRange: { min: 0.4, max: 0.8 },
    },
    steps: [
      {
        role: 'planner',
        model: 'anthropic',
        task: 'plan_approach',
        priority: 1,
        fallback: 'gemini',
      },
      {
        role: 'executor',
        model: 'deepseek',
        task: 'implementation',
        priority: 2,
        fallback: 'anthropic',
      },
      {
        role: 'validator',
        model: 'gemini',
        task: 'validation',
        priority: 3,
        fallback: 'anthropic',
      },
    ],
    expectedLatencyMs: 5000,
    expectedCostMultiplier: 1.5,
    qualityTarget: 0.9,
    lane: 'focus',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Research Dive - Deep analysis with multiple perspectives
  // ─────────────────────────────────────────────────────────────────────────
  'research-dive': {
    name: 'research-dive',
    description: 'Deep research and analysis with multiple model perspectives',
    trigger: {
      keywords: ['research', 'investigate', 'deep', 'comprehensive', 'analyze', 'study'],
      taskTypes: ['research', 'document-analysis', 'architecture'],
      complexityRange: { min: 0.6, max: 1.0 },
    },
    steps: [
      {
        role: 'researcher',
        model: 'anthropic',
        task: 'deep_analysis',
        priority: 1,
        fallback: 'gemini',
      },
      {
        role: 'synthesizer',
        model: 'gemini',
        task: 'synthesize_findings',
        priority: 2,
        fallback: 'openai',
      },
      {
        role: 'challenger',
        model: 'openai',
        task: 'alternative_perspective',
        priority: 3,
        fallback: 'anthropic',
      },
      {
        role: 'integrator',
        model: 'anthropic',
        task: 'integrate_insights',
        priority: 4,
        fallback: 'gemini',
      },
    ],
    expectedLatencyMs: 10000,
    expectedCostMultiplier: 3.0,
    qualityTarget: 0.95,
    lane: 'deep',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Creative Sprint - Exploratory, creative execution
  // ─────────────────────────────────────────────────────────────────────────
  'creative-sprint': {
    name: 'creative-sprint',
    description: 'Exploratory execution for creative and brainstorming tasks',
    trigger: {
      keywords: ['creative', 'ideas', 'brainstorm', 'imagine', 'explore', 'design', 'innovative'],
      taskTypes: ['creative-writing', 'code-generation'],
      complexityRange: { min: 0.3, max: 0.8 },
    },
    steps: [
      {
        role: 'ideator',
        model: 'openai',
        task: 'generate_ideas',
        priority: 1,
        fallback: 'gemini',
      },
      {
        role: 'expander',
        model: 'gemini',
        task: 'expand_concepts',
        priority: 2,
        fallback: 'openai',
      },
      {
        role: 'refiner',
        model: 'anthropic',
        task: 'refine_and_polish',
        priority: 3,
        fallback: 'gemini',
      },
    ],
    expectedLatencyMs: 6000,
    expectedCostMultiplier: 2.0,
    qualityTarget: 0.85,
    lane: 'focus',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Architect-Builder - Complex code tasks
  // ─────────────────────────────────────────────────────────────────────────
  'architect-builder': {
    name: 'architect-builder',
    description: 'Architecture-first approach for complex code tasks',
    trigger: {
      keywords: ['build', 'implement', 'create', 'develop', 'system', 'feature'],
      taskTypes: ['architecture', 'code-generation'],
      complexityRange: { min: 0.6, max: 1.0 },
    },
    steps: [
      {
        role: 'architect',
        model: 'anthropic',
        task: 'design_architecture',
        priority: 1,
        fallback: 'gemini',
      },
      {
        role: 'builder',
        model: 'deepseek',
        task: 'implement_code',
        priority: 2,
        fallback: 'anthropic',
      },
      {
        role: 'reviewer',
        model: 'gemini',
        task: 'code_review',
        priority: 3,
        fallback: 'anthropic',
      },
      {
        role: 'tester',
        model: 'deepseek',
        task: 'write_tests',
        priority: 4,
        fallback: 'gemini',
      },
    ],
    expectedLatencyMs: 8000,
    expectedCostMultiplier: 2.5,
    qualityTarget: 0.92,
    lane: 'deep',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Code Review Cycle - Thorough code review
  // ─────────────────────────────────────────────────────────────────────────
  'code-review-cycle': {
    name: 'code-review-cycle',
    description: 'Multi-perspective code review process',
    trigger: {
      keywords: ['review', 'check', 'audit', 'examine', 'evaluate'],
      taskTypes: ['code-review', 'debugging'],
      complexityRange: { min: 0.3, max: 0.8 },
    },
    steps: [
      {
        role: 'security-reviewer',
        model: 'anthropic',
        task: 'security_audit',
        priority: 1,
        fallback: 'gemini',
      },
      {
        role: 'logic-reviewer',
        model: 'deepseek',
        task: 'logic_review',
        priority: 2,
        fallback: 'anthropic',
      },
      {
        role: 'performance-reviewer',
        model: 'gemini',
        task: 'performance_review',
        priority: 3,
        fallback: 'deepseek',
      },
    ],
    expectedLatencyMs: 5000,
    expectedCostMultiplier: 1.8,
    qualityTarget: 0.88,
    lane: 'audit',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Document Analysis - Long document processing
  // ─────────────────────────────────────────────────────────────────────────
  'document-analysis': {
    name: 'document-analysis',
    description: 'Comprehensive document analysis and extraction',
    trigger: {
      keywords: ['document', 'pdf', 'file', 'extract', 'summarize', 'report'],
      taskTypes: ['document-analysis', 'summarization'],
      complexityRange: { min: 0.3, max: 0.7 },
    },
    steps: [
      {
        role: 'extractor',
        model: 'gemini', // Best for multimodal/long docs
        task: 'extract_content',
        priority: 1,
        fallback: 'anthropic',
      },
      {
        role: 'analyzer',
        model: 'anthropic',
        task: 'deep_analysis',
        priority: 2,
        fallback: 'gemini',
      },
      {
        role: 'summarizer',
        model: 'gemini',
        task: 'create_summary',
        priority: 3,
        fallback: 'openai',
      },
    ],
    expectedLatencyMs: 6000,
    expectedCostMultiplier: 1.5,
    qualityTarget: 0.85,
    lane: 'focus',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Recipe Service
// ─────────────────────────────────────────────────────────────────────────────

export class ExecutionRecipeService {
  private recipes: Record<RecipeName, ExecutionRecipe>;
  private usageHistory: Map<RecipeName, { count: number; avgQuality: number }>;

  constructor() {
    this.recipes = RECIPES;
    this.usageHistory = new Map();
  }

  /**
   * Auto-suggest the best recipe based on prompt and context
   */
  suggestRecipe(
    prompt: string,
    taskType?: string,
    complexity: number = 0.5
  ): RecipeSelectionResult {
    const promptLower = prompt.toLowerCase();
    const scores: Array<{ recipe: ExecutionRecipe; score: number; reasons: string[] }> = [];

    for (const recipe of Object.values(this.recipes)) {
      let score = 0;
      const reasons: string[] = [];

      // Keyword matching
      const keywordMatches = recipe.trigger.keywords.filter(k => promptLower.includes(k));
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 15;
        reasons.push(`Keywords: ${keywordMatches.join(', ')}`);
      }

      // Task type matching
      if (taskType && recipe.trigger.taskTypes.includes(taskType)) {
        score += 30;
        reasons.push(`Task type: ${taskType}`);
      }

      // Complexity range matching
      const { min, max } = recipe.trigger.complexityRange;
      if (complexity >= min && complexity <= max) {
        score += 25;
        reasons.push(`Complexity: ${complexity.toFixed(2)} in range [${min}, ${max}]`);
      } else {
        // Penalty for out-of-range complexity
        const distance = complexity < min ? min - complexity : complexity - max;
        score -= distance * 30;
      }

      // Historical performance bonus
      const history = this.usageHistory.get(recipe.name);
      if (history && history.avgQuality > 0.85) {
        score += 10;
        reasons.push(`Historical quality: ${(history.avgQuality * 100).toFixed(0)}%`);
      }

      scores.push({ recipe, score, reasons });
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const alternatives = scores.slice(1, 4).map(s => s.recipe.name);

    return {
      recipe: best.recipe,
      confidence: Math.min(1, Math.max(0, best.score / 100)),
      reason: best.reasons.join('; '),
      alternativeRecipes: alternatives,
    };
  }

  /**
   * Get a specific recipe by name
   */
  getRecipe(name: RecipeName): ExecutionRecipe | undefined {
    return this.recipes[name];
  }

  /**
   * Convert recipe to routing plan
   */
  toRoutingPlan(recipe: ExecutionRecipe): RoutingPlan {
    return {
      type: 'recipe',
      name: recipe.name,
      steps: recipe.steps,
      lane: recipe.lane,
      confidence: recipe.qualityTarget,
    };
  }

  /**
   * Record recipe execution result for learning
   */
  recordExecution(recipeName: RecipeName, quality: number): void {
    const existing = this.usageHistory.get(recipeName);
    if (existing) {
      const newCount = existing.count + 1;
      const newAvg = (existing.avgQuality * existing.count + quality) / newCount;
      this.usageHistory.set(recipeName, { count: newCount, avgQuality: newAvg });
    } else {
      this.usageHistory.set(recipeName, { count: 1, avgQuality: quality });
    }

    bus.publish('precog', 'recipe:executed', {
      recipe: recipeName,
      quality,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all available recipes
   */
  getAllRecipes(): ExecutionRecipe[] {
    return Object.values(this.recipes);
  }

  /**
   * Get recipe statistics
   */
  getStatistics(): Record<RecipeName, { count: number; avgQuality: number }> {
    const stats: Record<string, { count: number; avgQuality: number }> = {};
    for (const [name, data] of this.usageHistory.entries()) {
      stats[name] = data;
    }
    return stats as Record<RecipeName, { count: number; avgQuality: number }>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const executionRecipeService = new ExecutionRecipeService();
export default executionRecipeService;
