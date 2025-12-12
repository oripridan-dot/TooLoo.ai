// @version 3.3.561
/**
 * Intelligent Router
 * 
 * Phase 5: Intelligence Layer Optimization
 * 
 * Unified intelligent routing system that combines:
 * - Model Capability Matrix
 * - Execution Recipes
 * - Three-Layer Validation
 * - Smart Routing
 * 
 * @module precog/engine/intelligent-router
 */

import { bus } from '../../core/event-bus.js';
import { modelCapabilityService } from './model-capabilities.js';
import { executionRecipeService, type RecipeName, type ExecutionRecipe } from './execution-recipes.js';
import { threeLayerValidation, type ThreeLayerResult, type ValidationContext } from './three-layer-validation.js';
import { modelChooser, type RoutingPlan, type RecipeStep } from './model-chooser.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligentRequest {
  prompt: string;
  taskType?: string;
  complexity?: number;
  budget?: 'low' | 'medium' | 'high';
  quality?: 'draft' | 'standard' | 'premium';
  preferredRecipe?: RecipeName;
  isCritical?: boolean;
  sessionId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface IntelligentResponse {
  // Routing decision
  selectedModel: string;
  recipe: ExecutionRecipe;
  routingPlan: RoutingPlan;
  fallbackChain: string[];
  
  // Metrics & scoring
  confidence: number;
  estimatedLatencyMs: number;
  estimatedCost: number;
  
  // Decision metadata
  decisionPath: DecisionStep[];
  selectedAt: number;
}

export interface DecisionStep {
  phase: string;
  action: string;
  reason: string;
  data?: Record<string, unknown>;
  durationMs: number;
}

export interface ExecutionResult {
  success: boolean;
  content: string;
  model: string;
  latencyMs: number;
  cost: number;
  quality: number;
  validation?: ThreeLayerResult;
  fallbacksUsed: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligent Router Class
// ─────────────────────────────────────────────────────────────────────────────

export class IntelligentRouter {
  private routingHistory: Map<string, IntelligentResponse[]>;
  private executionStats: {
    totalRequests: number;
    successfulRequests: number;
    fallbacksTriggered: number;
    avgLatencyMs: number;
    avgQuality: number;
  };

  constructor() {
    this.routingHistory = new Map();
    this.executionStats = {
      totalRequests: 0,
      successfulRequests: 0,
      fallbacksTriggered: 0,
      avgLatencyMs: 0,
      avgQuality: 0,
    };
  }

  /**
   * Make intelligent routing decision based on all inputs
   */
  async route(request: IntelligentRequest): Promise<IntelligentResponse> {
    const startTime = Date.now();
    const decisionPath: DecisionStep[] = [];

    // ─────────────────────────────────────────────────────────────────────
    // Step 1: Analyze request complexity and detect task type
    // ─────────────────────────────────────────────────────────────────────
    const phaseStart = Date.now();
    const taskType = request.taskType || this.detectTaskType(request.prompt);
    const complexity = request.complexity ?? this.analyzeComplexity(request.prompt);
    
    decisionPath.push({
      phase: 'analysis',
      action: 'detect_task_type',
      reason: `Detected task type: ${taskType}, complexity: ${(complexity * 100).toFixed(0)}%`,
      data: { taskType, complexity },
      durationMs: Date.now() - phaseStart,
    });

    // ─────────────────────────────────────────────────────────────────────
    // Step 2: Select execution recipe
    // ─────────────────────────────────────────────────────────────────────
    const recipeStart = Date.now();
    let recipe: ExecutionRecipe;
    
    if (request.preferredRecipe) {
      recipe = executionRecipeService.getRecipe(request.preferredRecipe)!;
      decisionPath.push({
        phase: 'recipe_selection',
        action: 'use_preferred',
        reason: `Using preferred recipe: ${request.preferredRecipe}`,
        durationMs: Date.now() - recipeStart,
      });
    } else {
      const recipeResult = executionRecipeService.suggestRecipe(request.prompt, taskType, complexity);
      recipe = recipeResult.recipe;
      decisionPath.push({
        phase: 'recipe_selection',
        action: 'auto_select',
        reason: recipeResult.reason,
        data: {
          selectedRecipe: recipe.name,
          confidence: recipeResult.confidence,
          alternatives: recipeResult.alternativeRecipes,
        },
        durationMs: Date.now() - recipeStart,
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Step 3: Select best model from capability matrix
    // ─────────────────────────────────────────────────────────────────────
    const modelStart = Date.now();
    const taskProfile = modelCapabilityService.getTaskProfile(taskType as any);
    const modelScores = modelCapabilityService.scoreModelsForTask(
      taskProfile!,
      this.mapBudget(request.budget),
      this.mapQuality(request.quality)
    );

    // Get the best model that fits constraints
    const sortedModels = modelScores.sort((a, b) => b.score - a.score);
    const selectedModel = sortedModels[0]?.modelId || recipe.steps[0]?.model || 'anthropic';
    
    decisionPath.push({
      phase: 'model_selection',
      action: 'score_models',
      reason: `Selected ${selectedModel} (score: ${(sortedModels[0]?.score ?? 0 * 100).toFixed(0)}%)`,
      data: {
        topModels: sortedModels.slice(0, 3).map(m => ({ id: m.modelId, score: m.score })),
        constraints: { budget: request.budget, quality: request.quality },
      },
      durationMs: Date.now() - modelStart,
    });

    // ─────────────────────────────────────────────────────────────────────
    // Step 4: Get fallback chain
    // ─────────────────────────────────────────────────────────────────────
    const fallbackStart = Date.now();
    const fallbackChain = modelCapabilityService.getFallbackChain(selectedModel, 3);
    
    decisionPath.push({
      phase: 'fallback_planning',
      action: 'build_chain',
      reason: `Fallback chain: ${[selectedModel, ...fallbackChain].join(' → ')}`,
      data: { fallbackChain },
      durationMs: Date.now() - fallbackStart,
    });

    // ─────────────────────────────────────────────────────────────────────
    // Step 5: Create routing plan
    // ─────────────────────────────────────────────────────────────────────
    const planStart = Date.now();
    
    // Merge recipe steps with selected model
    const enhancedSteps: RecipeStep[] = recipe.steps.map((step, idx) => ({
      ...step,
      model: idx === 0 ? selectedModel : step.model,
      fallback: fallbackChain[idx] || step.fallback,
    }));

    const routingPlan: RoutingPlan = {
      type: 'recipe',
      name: recipe.name,
      steps: enhancedSteps,
      lane: recipe.lane,
      confidence: sortedModels[0]?.score ?? recipe.qualityTarget,
    };

    decisionPath.push({
      phase: 'plan_creation',
      action: 'create_routing_plan',
      reason: `Created ${recipe.steps.length}-step routing plan in ${recipe.lane} lane`,
      data: { planType: routingPlan.type, steps: routingPlan.steps?.length ?? 0 },
      durationMs: Date.now() - planStart,
    });

    // ─────────────────────────────────────────────────────────────────────
    // Step 6: Calculate estimates
    // ─────────────────────────────────────────────────────────────────────
    const modelProfile = modelCapabilityService.getModelProfile(selectedModel);
    const estimatedLatencyMs = modelProfile?.latencyMs?.average || recipe.expectedLatencyMs;
    const estimatedCost =
      ((modelProfile?.costPer1kTokens?.input || 0) + (modelProfile?.costPer1kTokens?.output || 0.01)) *
      recipe.expectedCostMultiplier;

    // ─────────────────────────────────────────────────────────────────────
    // Emit event and return response
    // ─────────────────────────────────────────────────────────────────────
    const response: IntelligentResponse = {
      selectedModel,
      recipe,
      routingPlan,
      fallbackChain,
      confidence: sortedModels[0]?.score ?? 0.8,
      estimatedLatencyMs,
      estimatedCost,
      decisionPath,
      selectedAt: Date.now(),
    };

    bus.publish('precog', 'intelligent-router:decision', {
      model: selectedModel,
      recipe: recipe.name,
      confidence: response.confidence,
      totalDecisionTimeMs: Date.now() - startTime,
    });

    // Track in history
    const historyKey = request.sessionId || 'default';
    const history = this.routingHistory.get(historyKey) || [];
    history.push(response);
    if (history.length > 100) history.shift();
    this.routingHistory.set(historyKey, history);

    return response;
  }

  /**
   * Execute a request with intelligent routing
   */
  async execute(
    request: IntelligentRequest,
    executor: (model: string, prompt: string, step: RecipeStep) => Promise<string>
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const fallbacksUsed: string[] = [];

    // Get routing decision
    const routing = await this.route(request);

    // Execute through recipe steps
    let content = '';
    let currentModel = routing.selectedModel;
    let success = false;

    for (const step of routing.routingPlan.steps || []) {
      const modelToUse = step.model || currentModel;
      
      try {
        content = await executor(modelToUse, request.prompt, step);
        currentModel = modelToUse;
        success = true;
      } catch (error) {
        // Try fallback
        if (step.fallback) {
          fallbacksUsed.push(modelToUse);
          try {
            content = await executor(step.fallback, request.prompt, step);
            currentModel = step.fallback;
            success = true;
          } catch {
            // Fallback also failed
          }
        }
      }
    }

    // Run validation if we have content
    let validation: ThreeLayerResult | undefined;
    if (success && content) {
      const validationContext: ValidationContext = {
        taskType: request.taskType || 'code-generation',
        content,
        contentType: this.detectContentType(content),
        language: this.detectLanguage(content),
        originalPrompt: request.prompt,
        isCritical: request.isCritical,
      };

      validation = await threeLayerValidation.validate(validationContext);
    }

    const latencyMs = Date.now() - startTime;
    const quality = validation?.overallScore ?? 0.8;

    // Record outcome for learning
    executionRecipeService.recordExecution(routing.recipe.name, quality);

    // Update stats
    this.executionStats.totalRequests++;
    if (success) this.executionStats.successfulRequests++;
    if (fallbacksUsed.length > 0) this.executionStats.fallbacksTriggered++;
    this.executionStats.avgLatencyMs = 
      (this.executionStats.avgLatencyMs * (this.executionStats.totalRequests - 1) + latencyMs) / 
      this.executionStats.totalRequests;
    this.executionStats.avgQuality = 
      (this.executionStats.avgQuality * (this.executionStats.totalRequests - 1) + quality) / 
      this.executionStats.totalRequests;

    return {
      success,
      content,
      model: currentModel,
      latencyMs,
      cost: routing.estimatedCost,
      quality,
      validation,
      fallbacksUsed,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────

  private detectTaskType(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (/\b(code|function|implement|fix|debug|refactor)\b/.test(lower)) {
      if (/\b(review|check)\b/.test(lower)) return 'code-review';
      if (/\b(debug|fix|error)\b/.test(lower)) return 'debugging';
      return 'code-generation';
    }
    if (/\b(architect|design|system|structure)\b/.test(lower)) return 'architecture';
    if (/\b(research|investigate|analyze|study)\b/.test(lower)) return 'research';
    if (/\b(write|create|story|blog|article)\b/.test(lower)) return 'creative-writing';
    if (/\b(summarize|summary|tldr)\b/.test(lower)) return 'summarization';
    if (/\b(document|pdf|file|extract)\b/.test(lower)) return 'document-analysis';
    
    return 'general';
  }

  private analyzeComplexity(prompt: string): number {
    let complexity = 0.3; // Base

    // Length factor
    if (prompt.length > 200) complexity += 0.1;
    if (prompt.length > 500) complexity += 0.1;
    if (prompt.length > 1000) complexity += 0.1;

    // Technical terms
    const technicalTerms = [
      'async', 'await', 'algorithm', 'database', 'api', 'authentication',
      'microservice', 'kubernetes', 'docker', 'cache', 'performance',
    ];
    const technicalCount = technicalTerms.filter(t => prompt.toLowerCase().includes(t)).length;
    complexity += technicalCount * 0.05;

    // Complexity indicators
    if (/multiple|several|various|complex/i.test(prompt)) complexity += 0.1;
    if (/simple|basic|quick|just/i.test(prompt)) complexity -= 0.15;
    if (/comprehensive|thorough|complete/i.test(prompt)) complexity += 0.15;

    return Math.max(0, Math.min(1, complexity));
  }

  private mapBudget(budget?: 'low' | 'medium' | 'high'): number {
    switch (budget) {
      case 'low': return 0.001;
      case 'medium': return 0.01;
      case 'high': return 0.1;
      default: return 0.01;
    }
  }

  private mapQuality(quality?: 'draft' | 'standard' | 'premium'): number {
    switch (quality) {
      case 'draft': return 0.7;
      case 'standard': return 0.85;
      case 'premium': return 0.95;
      default: return 0.85;
    }
  }

  private detectContentType(content: string): 'code' | 'text' | 'json' | 'markdown' {
    if (content.startsWith('{') || content.startsWith('[')) {
      try {
        JSON.parse(content);
        return 'json';
      } catch { /* not json */ }
    }
    if (content.includes('```') || /^#+ /m.test(content)) return 'markdown';
    if (/function\s|const\s|let\s|import\s|export\s|class\s/.test(content)) return 'code';
    return 'text';
  }

  private detectLanguage(content: string): string | undefined {
    if (/import\s.*from\s|export\s.*{|:\s*\w+\s*[=;]/.test(content)) return 'typescript';
    if (/def\s+\w+\(|import\s+\w+|from\s+\w+\s+import/.test(content)) return 'python';
    if (/func\s+\w+\(|package\s+\w+/.test(content)) return 'go';
    return undefined;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Statistics & Status
  // ─────────────────────────────────────────────────────────────────────────

  getStats() {
    return {
      ...this.executionStats,
      successRate: this.executionStats.totalRequests > 0
        ? this.executionStats.successfulRequests / this.executionStats.totalRequests
        : 0,
      recipeStats: executionRecipeService.getStatistics(),
    };
  }

  getRoutingHistory(sessionId?: string): IntelligentResponse[] {
    return this.routingHistory.get(sessionId || 'default') || [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const intelligentRouter = new IntelligentRouter();
export default intelligentRouter;

// Re-export related types
export type { ExecutionRecipe, RecipeName } from './execution-recipes.js';
export type { ThreeLayerResult, ValidationContext } from './three-layer-validation.js';
