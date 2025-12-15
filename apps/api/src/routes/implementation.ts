/**
 * @tooloo/api - Implementation Routes
 * API endpoints for safe code implementation
 *
 * @version 1.0.0
 * @skill-os true
 */

import { Router, Request, Response } from 'express';
import {
  getSafeImplementationService,
  type ImplementationRequest,
  type ImplementationResult,
} from '@tooloo/skills';

export function createImplementationRouter(): Router {
  const router = Router();
  const service = getSafeImplementationService();

  /**
   * POST /api/v2/implement
   * Execute a safe code implementation
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const request: ImplementationRequest = {
        files: req.body.files ?? [],
        description: req.body.description ?? 'No description provided',
        riskLevel: req.body.riskLevel,
        autoApprove: req.body.autoApprove ?? false,
        runTests: req.body.runTests ?? true,
        testPatterns: req.body.testPatterns,
        requestedBy: req.body.requestedBy ?? 'api',
      };

      // Validate minimum requirements
      if (!request.files || request.files.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No files provided for implementation',
        });
      }

      // Validate each file operation
      for (const file of request.files) {
        if (!file.path || !file.action) {
          return res.status(400).json({
            ok: false,
            error: 'Each file must have path and action',
          });
        }
        if (file.action !== 'delete' && !file.content) {
          return res.status(400).json({
            ok: false,
            error: `File ${file.path} requires content for ${file.action} action`,
          });
        }
      }

      console.log(`[API] Implementation requested: ${request.description}`);
      console.log(`[API] Files: ${request.files.length}, Risk: ${request.riskLevel ?? 'auto'}`);

      const result = await service.implement(request);

      return res.json({
        ok: result.success,
        data: result,
      });
    } catch (error) {
      console.error('[API] Implementation error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Implementation failed',
      });
    }
  });

  /**
   * POST /api/v2/implement/rollback/:id
   * Rollback a previous implementation
   */
  router.post('/rollback/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: 'Implementation ID required',
        });
      }

      const success = await service.rollbackById(id);

      return res.json({
        ok: success,
        data: {
          success,
          message: success
            ? `Successfully rolled back implementation ${id}`
            : `Could not find implementation ${id} to roll back`,
        },
      });
    } catch (error) {
      console.error('[API] Rollback error:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Rollback failed',
      });
    }
  });

  /**
   * GET /api/v2/implement/status/:id
   * Get status of an implementation
   */
  router.get('/status/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const impl = service.getImplementation(id);

      if (!impl) {
        return res.status(404).json({
          ok: false,
          error: `Implementation ${id} not found`,
        });
      }

      return res.json({
        ok: true,
        data: {
          id: impl.id,
          description: impl.request.description,
          pipeline: impl.pipelineState,
          fileCount: impl.stagedFiles.length,
          errors: impl.errors,
          warnings: impl.warnings,
          createdAt: impl.createdAt,
          completedAt: impl.completedAt,
        },
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      });
    }
  });

  /**
   * GET /api/v2/implement/history
   * Get recent implementation history
   */
  router.get('/history', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const implementations = service.listImplementations(limit);

      return res.json({
        ok: true,
        data: implementations.map((impl) => ({
          id: impl.id,
          description: impl.request.description,
          pipeline: impl.pipelineState,
          fileCount: impl.stagedFiles.length,
          success: impl.pipelineState.validated && impl.errors.length === 0,
          createdAt: impl.createdAt,
          completedAt: impl.completedAt,
        })),
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to get history',
      });
    }
  });

  /**
   * GET /api/v2/implement/health
   * Check if the implementation service is healthy
   */
  router.get('/health', (req: Request, res: Response) => {
    return res.json({
      ok: true,
      data: {
        healthy: service.isHealthy(),
        service: 'SafeImplementationService',
        version: '1.0.0',
      },
    });
  });

  return router;
}
