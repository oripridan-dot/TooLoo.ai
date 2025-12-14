/**
 * @tooloo/api - Visuals Routes
 * Visual generation endpoints (stubs)
 * 
 * @version 2.0.0-alpha.0
 */

import { Router, type Request, type Response } from 'express';
import type { APIResponse } from '../types.js';

export function createVisualsRouter(): Router {
  const router = Router();

  /**
   * GET /visuals/v2/status
   * Get visual generation status
   */
  router.get('/v2/status', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        enabled: false,
        reason: 'Visual generation coming in future release',
        supportedFormats: ['svg', 'png', 'mermaid'],
      },
    };
    res.json(response);
  });

  /**
   * POST /visuals/generate
   * Generate a visual (placeholder)
   */
  router.post('/generate', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Visual generation not yet available',
      },
    };
    res.status(501).json(response);
  });

  return router;
}
