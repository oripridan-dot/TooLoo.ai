/**
 * @file Orchestrator Routes - V2 Stub for Legacy Compatibility
 * @description Provides stub endpoints for legacy orchestrator API calls
 * @version 2.0.0
 * 
 * These routes exist to prevent 404 errors from legacy UI components.
 * The actual orchestration is now handled by the Skills OS kernel.
 */

import { Router, type Request, type Response } from 'express';

export function createOrchestratorRouter(): Router {
  const router = Router();

  /**
   * GET /orchestrator/status
   * Legacy orchestrator status endpoint
   */
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        status: 'active',
        activeTasks: [],
        queueLength: 0,
        completedToday: 0,
        message: 'Orchestration handled by Skills OS kernel',
      },
    });
  });

  /**
   * GET /orchestrator/queue
   * Legacy queue status
   */
  router.get('/queue', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        pending: [],
        processing: [],
        completed: [],
        failed: [],
      },
    });
  });

  /**
   * POST /orchestrator/queue/add
   * Legacy queue add - redirect to skills
   */
  router.post('/queue/add', (req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        queued: false,
        message: 'Use /api/v2/execute to run skills directly',
        hint: 'POST /api/v2/execute with { skillId, input }',
      },
    });
  });

  /**
   * POST /orchestrator/vision/capture
   * Legacy vision capture stub
   */
  router.post('/vision/capture', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        captured: false,
        message: 'Vision capture not available in Skills OS V2',
      },
    });
  });

  /**
   * GET /orchestrator/metrics
   * Legacy metrics - redirect to observatory
   */
  router.get('/metrics', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        totalRequests: 0,
        avgResponseTime: 0,
        successRate: 100,
        hint: 'Use /api/v2/observatory/pulse for real-time metrics',
      },
    });
  });

  /**
   * Catch-all for any other orchestrator routes
   */
  router.all('*', (req: Request, res: Response) => {
    res.json({
      ok: true,
      data: {
        message: 'Orchestrator functionality moved to Skills OS',
        path: req.path,
        hint: 'Use /api/v2/skills and /api/v2/execute for skill operations',
      },
    });
  });

  return router;
}

export default createOrchestratorRouter;
