// @version 3.3.595
/**
 * Routing API Routes
 * 
 * Phase 5: Intelligence Layer Optimization
 * 
 * REST API endpoints for intelligent routing, model capabilities,
 * execution recipes, and validation.
 * 
 * @module nexus/routes/routing
 */

import { Router, Request, Response } from 'express';
import { 
  intelligentRouter,
  modelCapabilityService,
  executionRecipeService,
  threeLayerValidation,
  MODEL_PROFILES,
  TASK_PROFILES,
} from '../../precog/engine/index.js';
import type { IntelligentRequest } from '../../precog/engine/intelligent-router.js';
import type { ValidationContext } from '../../precog/engine/three-layer-validation.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Intelligent Routing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route POST /api/v1/routing/route
 * @description Get intelligent routing decision for a prompt
 */
router.post('/route', async (req: Request, res: Response) => {
  try {
    const request: IntelligentRequest = {
      prompt: req.body.prompt,
      taskType: req.body.taskType,
      complexity: req.body.complexity,
      budget: req.body.budget,
      quality: req.body.quality,
      preferredRecipe: req.body.preferredRecipe,
      isCritical: req.body.isCritical,
      sessionId: req.body.sessionId,
      userId: req.body.userId,
      context: req.body.context,
    };

    if (!request.prompt) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: prompt',
      });
      return;
    }

    const decision = await intelligentRouter.route(request);

    res.json({
      ok: true,
      data: {
        selectedModel: decision.selectedModel,
        recipe: decision.recipe.name,
        recipeLane: decision.recipe.lane,
        recipeSteps: decision.routingPlan.steps?.length || 0,
        fallbackChain: decision.fallbackChain,
        confidence: decision.confidence,
        estimatedLatencyMs: decision.estimatedLatencyMs,
        estimatedCost: decision.estimatedCost,
        decisionPath: decision.decisionPath,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route GET /api/v1/routing/stats
 * @description Get routing statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = intelligentRouter.getStats();

    res.json({
      ok: true,
      data: {
        ...stats,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Model Capabilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/v1/routing/models
 * @description Get all model capability profiles
 */
router.get('/models', async (_req: Request, res: Response) => {
  try {
    const profiles = MODEL_PROFILES;

    res.json({
      ok: true,
      data: {
        models: Object.entries(profiles).map(([id, profile]) => ({
          id,
          name: profile.name,
          provider: profile.provider,
          capabilities: profile.capabilities,
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          costPer1kTokens: profile.costPer1kTokens,
          avgLatencyMs: profile.avgLatencyMs,
          maxTokens: profile.maxTokens,
        })),
        count: Object.keys(profiles).length,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route GET /api/v1/routing/models/:modelId
 * @description Get specific model capability profile
 */
router.get('/models/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const profile = modelCapabilityService.getModelProfile(modelId);

    if (!profile) {
      res.status(404).json({
        ok: false,
        error: `Model not found: ${modelId}`,
      });
      return;
    }

    res.json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route POST /api/v1/routing/models/best
 * @description Get best models for a task
 */
router.post('/models/best', async (req: Request, res: Response) => {
  try {
    const { taskType, maxBudget, minQuality, limit } = req.body;

    if (!taskType) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: taskType',
      });
      return;
    }

    const results = modelCapabilityService.getBestModelsForTask(
      taskType,
      { maxBudget, minQuality },
      limit || 3
    );

    res.json({
      ok: true,
      data: {
        taskType,
        models: results,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route GET /api/v1/routing/models/:modelId/fallback
 * @description Get fallback chain for a model
 */
router.get('/models/:modelId/fallback', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const depth = parseInt(req.query.depth as string) || 3;

    const fallbackChain = modelCapabilityService.getFallbackChain(modelId, depth);

    res.json({
      ok: true,
      data: {
        primaryModel: modelId,
        fallbackChain,
        fullChain: [modelId, ...fallbackChain],
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Task Profiles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/v1/routing/tasks
 * @description Get all task profiles
 */
router.get('/tasks', async (_req: Request, res: Response) => {
  try {
    const profiles = TASK_PROFILES;

    res.json({
      ok: true,
      data: {
        tasks: Object.entries(profiles).map(([id, profile]) => ({
          id,
          name: profile.name,
          description: profile.description,
          requiredCapabilities: profile.requiredCapabilities,
          preferredLevel: profile.preferredLevel,
          complexity: profile.complexity,
          constraints: profile.constraints,
        })),
        count: Object.keys(profiles).length,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Execution Recipes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/v1/routing/recipes
 * @description Get all execution recipes
 */
router.get('/recipes', async (_req: Request, res: Response) => {
  try {
    const recipes = executionRecipeService.getAllRecipes();

    res.json({
      ok: true,
      data: {
        recipes: recipes.map(r => ({
          name: r.name,
          description: r.description,
          lane: r.lane,
          steps: r.steps.length,
          expectedLatencyMs: r.expectedLatencyMs,
          expectedCostMultiplier: r.expectedCostMultiplier,
          qualityTarget: r.qualityTarget,
          triggers: r.trigger,
        })),
        count: recipes.length,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route POST /api/v1/routing/recipes/suggest
 * @description Suggest a recipe for a prompt
 */
router.post('/recipes/suggest', async (req: Request, res: Response) => {
  try {
    const { prompt, taskType, complexity } = req.body;

    if (!prompt) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: prompt',
      });
      return;
    }

    const suggestion = executionRecipeService.suggestRecipe(prompt, taskType, complexity);

    res.json({
      ok: true,
      data: {
        recommended: {
          name: suggestion.recipe.name,
          description: suggestion.recipe.description,
          lane: suggestion.recipe.lane,
          steps: suggestion.recipe.steps,
        },
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        alternatives: suggestion.alternativeRecipes,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route GET /api/v1/routing/recipes/stats
 * @description Get recipe execution statistics
 */
router.get('/recipes/stats', async (_req: Request, res: Response) => {
  try {
    const stats = executionRecipeService.getStatistics();

    res.json({
      ok: true,
      data: stats,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route POST /api/v1/routing/validate
 * @description Run three-layer validation on content
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const context: ValidationContext = {
      taskType: req.body.taskType || 'code-generation',
      content: req.body.content,
      contentType: req.body.contentType || 'code',
      language: req.body.language,
      originalPrompt: req.body.originalPrompt,
      isCritical: req.body.isCritical,
      skipLayers: req.body.skipLayers,
    };

    if (!context.content) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: content',
      });
      return;
    }

    const result = await threeLayerValidation.validate(context);

    res.json({
      ok: true,
      data: {
        overallPassed: result.overallPassed,
        overallScore: result.overallScore,
        summary: threeLayerValidation.summarize(result),
        layers: {
          automated: {
            passed: result.automated.passed,
            score: result.automated.score,
            issues: result.automated.issues,
            durationMs: result.automated.durationMs,
          },
          aiSemantic: result.aiSemantic ? {
            passed: result.aiSemantic.passed,
            score: result.aiSemantic.score,
            issues: result.aiSemantic.issues,
            durationMs: result.aiSemantic.durationMs,
          } : null,
          userAcceptance: result.userAcceptance ? {
            passed: result.userAcceptance.passed,
            score: result.userAcceptance.score,
            durationMs: result.userAcceptance.durationMs,
          } : null,
        },
        requiresUserApproval: result.requiresUserApproval,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Learning Status (for RealLearningMetrics component)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/v1/precog/learning/status
 * @description Get learning metrics and status for UI components
 */
router.get('/learning/status', async (req: Request, res: Response) => {
  try {
    // Get learning status from intelligent router and model services
    const modelPerformance = await modelCapabilityService.getPerformanceMetrics();
    const routingStats = intelligentRouter.getRoutingStats();
    
    res.json({
      ok: true,
      data: {
        total: routingStats?.totalRoutes || 0,
        lastAt: routingStats?.lastRouteTime || null,
        models: modelPerformance || {},
        confidence: routingStats?.averageConfidence || 0,
        status: 'active'
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[Routing API] Error fetching learning status:', errMsg);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

export default router;
