/**
 * @tooloo/api - Projects Routes
 * Project management endpoints (stubs)
 * 
 * @version 2.0.0-alpha.0
 */

import { Router, type Request, type Response } from 'express';
import type { APIResponse } from '../types.js';

export function createProjectsRouter(): Router {
  const router = Router();

  /**
   * GET /projects
   * List all projects
   */
  router.get('/', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        projects: [],
        total: 0,
      },
    };
    res.json(response);
  });

  /**
   * GET /projects/active/current
   * Get current active project
   */
  router.get('/active/current', (_req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        project: null,
        message: 'No active project',
      },
    };
    res.json(response);
  });

  /**
   * POST /projects
   * Create a new project
   */
  router.post('/', (req: Request, res: Response) => {
    const { name, description } = req.body;
    const response: APIResponse = {
      ok: true,
      data: {
        id: `proj_${Date.now()}`,
        name: name || 'Untitled Project',
        description: description || '',
        createdAt: new Date().toISOString(),
      },
    };
    res.status(201).json(response);
  });

  /**
   * GET /projects/:id
   * Get project by ID
   */
  router.get('/:id', (req: Request, res: Response) => {
    const response: APIResponse = {
      ok: true,
      data: {
        id: req.params.id,
        name: 'Project',
        description: '',
        createdAt: new Date().toISOString(),
      },
    };
    res.json(response);
  });

  return router;
}
