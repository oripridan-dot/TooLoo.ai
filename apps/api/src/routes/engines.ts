/**
 * @tooloo/api - Engines Routes
 * Endpoints for engine status, feedback, and learning operations
 *
 * @version 1.3.0
 * @skill-os true
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Orchestrator } from '@tooloo/engine';
import { kernel } from '../../../../src/kernel/kernel.js';
import {
  createSkillEngineService,
  feedbackToReward,
  type FeedbackInput,
} from '../../../../src/skills/engine-service.js';

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackBody {
  type: 'positive' | 'negative' | 'rating' | 'implicit';
  value?: number;
  skillId?: string;
  messageId?: string;
  provider?: string;
  taskType?: string;
  complexity?: 'low' | 'medium' | 'high';
  strategy?: 'direct' | 'chain_of_thought' | 'few_shot' | 'decompose';
}

interface ABTestBody {
  name: string;
  skillId: string;
  strategyA: string;
  strategyB: string;
  minSamples?: number;
}

// =============================================================================
// FACTORY
// =============================================================================

export function createEnginesRouter(_orchestrator: Orchestrator): Router {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /engines/status - Get all engine metrics and health
  // -------------------------------------------------------------------------
  router.get('/status', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      const health = service.getEngineHealth();
      const metrics = service.getAllMetrics();

      res.json({
        success: true,
        data: {
          healthy: health.healthy,
          engines: health.engines,
          metrics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /engines/learning - Get learning engine status
  // -------------------------------------------------------------------------
  router.get('/learning', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);
      const status = service.getLearningStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /engines/feedback - Record user feedback for Q-learning
  // -------------------------------------------------------------------------
  router.post('/feedback', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as FeedbackBody;

      // Validate required fields
      if (!body.type) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: type',
        });
        return;
      }

      // Get session ID from header or generate one
      const sessionId = (req.headers['x-session-id'] as string) ?? `api-${Date.now()}`;

      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      const feedbackInput: FeedbackInput = {
        type: body.type,
        value: body.value ?? (body.type === 'positive' ? 1 : body.type === 'negative' ? -1 : 0),
        sessionId,
        skillId: body.skillId ?? 'unknown',
        provider: body.provider,
        taskType: body.taskType ?? 'general',
        complexity: body.complexity ?? 'medium',
        strategy: body.strategy ?? 'direct',
      };

      const result = await service.recordFeedback(feedbackInput);

      res.json({
        success: result.success,
        data: {
          reward: result.rewardValue,
          newQValue: result.newQValue,
          message: result.message,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /engines/evolution - Get evolution engine status
  // -------------------------------------------------------------------------
  router.get('/evolution', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);
      const status = service.getEvolutionStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /engines/ab-test - Start a new A/B test
  // -------------------------------------------------------------------------
  router.post('/ab-test', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as ABTestBody;

      // Validate required fields
      if (!body.name || !body.skillId || !body.strategyA || !body.strategyB) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, skillId, strategyA, strategyB',
        });
        return;
      }

      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      const testId = await service.startABTest({
        name: body.name,
        skillId: body.skillId,
        strategyA: body.strategyA,
        strategyB: body.strategyB,
        minSamples: body.minSamples,
      });

      res.json({
        success: true,
        data: {
          testId,
          message: `A/B test "${body.name}" started`,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /engines/emergence - Get emergence engine status
  // -------------------------------------------------------------------------
  router.get('/emergence', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);
      const summary = service.getEmergenceSummary();

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /engines/emergence/detect - Trigger pattern detection
  // -------------------------------------------------------------------------
  router.post('/emergence/detect', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      await service.detectPatterns();
      await service.calculateSynergies();
      const goals = await service.generateGoals();

      res.json({
        success: true,
        data: {
          message: 'Pattern detection complete',
          newGoals: goals.length,
          goals,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /engines/routing - Get routing engine status
  // -------------------------------------------------------------------------
  router.get('/routing', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);
      const status = service.getRoutingStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /engines/routing/recommend - Get provider recommendation
  // -------------------------------------------------------------------------
  router.post('/routing/recommend', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskType, requirements } = req.body as {
        taskType: string;
        requirements?: { minContext?: number; capabilities?: string[] };
      };

      if (!taskType) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: taskType',
        });
        return;
      }

      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      const recommendation = service.getRecommendedProvider(taskType, requirements);

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
