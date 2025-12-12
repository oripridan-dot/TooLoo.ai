/**
 * @tooloo/api - Health Routes
 * System health and status endpoints
 * 
 * @version 2.0.0-alpha.0
 */

import { Router, type Request, type Response } from 'express';
import type { TooLooServer } from '../server.js';
import type { APIResponse, HealthResponse, StatusResponse } from '../types.js';

export function createHealthRouter(server: TooLooServer): Router {
  const router = Router();

  /**
   * GET /health
   * Basic health check
   */
  router.get('/', (_req: Request, res: Response) => {
    const response: APIResponse<HealthResponse> = {
      ok: true,
      data: {
        status: 'healthy',
        version: '2.0.0-alpha.0',
        uptime: server.getUptime(),
        checks: {
          providers: true,  // TODO: Wire to actual provider health
          memory: true,     // TODO: Wire to memory system
          skills: true,     // TODO: Wire to skill registry
        },
      },
    };
    res.json(response);
  });

  /**
   * GET /health/status
   * Detailed system status
   */
  router.get('/status', (_req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    
    const response: APIResponse<StatusResponse> = {
      ok: true,
      data: {
        version: '2.0.0-alpha.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: server.getUptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        },
        providers: [
          // TODO: Wire to actual provider registry
          { id: 'deepseek', name: 'DeepSeek', status: 'available', circuitState: 'closed' },
          { id: 'anthropic', name: 'Anthropic', status: 'available', circuitState: 'closed' },
          { id: 'openai', name: 'OpenAI', status: 'available', circuitState: 'closed' },
        ],
        skills: {
          loaded: 0,  // TODO: Wire to skill registry
          enabled: 0,
        },
      },
    };
    res.json(response);
  });

  /**
   * GET /health/ready
   * Readiness probe for orchestrators
   */
  router.get('/ready', (_req: Request, res: Response) => {
    // TODO: Add actual readiness checks
    const ready = true;
    
    if (ready) {
      res.json({ ok: true, ready: true });
    } else {
      res.status(503).json({ ok: false, ready: false });
    }
  });

  /**
   * GET /health/live
   * Liveness probe for orchestrators
   */
  router.get('/live', (_req: Request, res: Response) => {
    res.json({ ok: true, alive: true });
  });

  return router;
}
