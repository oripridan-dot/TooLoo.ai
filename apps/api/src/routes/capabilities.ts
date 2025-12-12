/**
 * @tooloo/api - Capabilities Routes
 * System capabilities and feature status
 * 
 * @version 2.0.0-alpha.0
 */

import { Router, type Request, type Response } from 'express';
import type { APIResponse } from '../types.js';

export function createCapabilitiesRouter(): Router {
  const router = Router();

  /**
   * GET /capabilities/status
   * Get system capabilities status
   */
  router.get('/status', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        chat: { enabled: true, streaming: true },
        code: { enabled: true, languages: ['typescript', 'javascript', 'python'] },
        analysis: { enabled: true },
        visuals: { enabled: false, reason: 'Coming soon' },
        memory: { enabled: true, type: 'session' },
        providers: {
          deepseek: { available: true },
          anthropic: { available: true },
          openai: { available: true },
          gemini: { available: false },
        },
      },
    };
    res.json(response);
  });

  /**
   * GET /capabilities/features
   * List all features
   */
  router.get('/features', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        features: [
          { id: 'chat', name: 'Chat', enabled: true },
          { id: 'code', name: 'Code Generation', enabled: true },
          { id: 'analysis', name: 'Analysis', enabled: true },
          { id: 'visuals', name: 'Visual Generation', enabled: false },
        ],
      },
    };
    res.json(response);
  });

  return router;
}
