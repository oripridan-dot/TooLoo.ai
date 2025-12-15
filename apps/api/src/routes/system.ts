/**
 * @tooloo/api - System Routes
 * System-level endpoints for error reporting, metrics, and control
 * 
 * @version 2.0.0-alpha.0
 */

import { Router, type Request, type Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import type { APIResponse } from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

interface SystemRouterDeps {
  io: SocketIOServer;
}

interface ErrorReport {
  type: string;
  component?: string;
  error: string;
  stack?: string;
  code?: string;
  timestamp: string;
  context?: {
    prompt?: string;
    retryCount?: number;
    [key: string]: unknown;
  };
}

interface ErrorReportResponse {
  received: boolean;
  errorId: string;
  willRetry: boolean;
}

// In-memory error store (would be replaced with proper storage in production)
const errorStore: ErrorReport[] = [];
const MAX_STORED_ERRORS = 100;

// =============================================================================
// ROUTER
// =============================================================================

export function createSystemRouter(deps: SystemRouterDeps): Router {
  const router = Router();
  const { io } = deps;

  /**
   * POST /system/report-error
   * Receive error reports from frontend (SafeRender, etc.)
   * Used for self-healing feedback loop
   */
  router.post('/report-error', (req: Request, res: Response) => {
    const report = req.body as ErrorReport;
    
    // Validate required fields
    if (!report.error || !report.type) {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'INVALID_REPORT',
          message: 'Error report must include type and error fields',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Generate error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store error (with limit)
    errorStore.unshift({ ...report, timestamp: report.timestamp || new Date().toISOString() });
    if (errorStore.length > MAX_STORED_ERRORS) {
      errorStore.pop();
    }

    // Log for debugging
    console.log(`[System] Error reported: ${errorId}`, {
      type: report.type,
      component: report.component,
      error: report.error.slice(0, 100),
    });

    // Emit to connected admin dashboards
    io.emit('system:error-reported', {
      errorId,
      type: report.type,
      component: report.component,
      timestamp: new Date().toISOString(),
    });

    // Determine if auto-retry is appropriate
    const willRetry = report.type === 'generation_error' && 
                      (report.context?.retryCount || 0) < 3;

    const response: APIResponse<ErrorReportResponse> = {
      ok: true,
      data: {
        received: true,
        errorId,
        willRetry,
      },
    };

    res.json(response);
  });

  /**
   * GET /system/errors
   * List recent errors (for admin dashboard)
   */
  router.get('/errors', (_req: Request, res: Response) => {
    const response: APIResponse<{ errors: ErrorReport[]; total: number }> = {
      ok: true,
      data: {
        errors: errorStore.slice(0, 20),
        total: errorStore.length,
      },
    };
    res.json(response);
  });

  /**
   * GET /system/metrics
   * System metrics for monitoring
   */
  router.get('/metrics', (_req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    
    const response: APIResponse = {
      ok: true,
      data: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        errors: {
          total: errorStore.length,
          recent: errorStore.slice(0, 5).map(e => ({
            type: e.type,
            component: e.component,
            timestamp: e.timestamp,
          })),
        },
        uptime: process.uptime(),
        connections: io.engine?.clientsCount || 0,
      },
    };
    res.json(response);
  });

  /**
   * POST /system/broadcast
   * Broadcast a message to all connected clients (admin function)
   */
  router.post('/broadcast', (req: Request, res: Response) => {
    const { event, data } = req.body;

    if (!event) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Event name required' },
      });
      return;
    }

    io.emit(event, data);

    res.json({
      ok: true,
      data: {
        broadcast: true,
        event,
        connections: io.engine?.clientsCount || 0,
      },
    });
  });

  return router;
}
