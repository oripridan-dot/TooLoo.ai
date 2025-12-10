// @version 1.0.0
/**
 * Global Error Handler Middleware
 * 
 * Production hardening: Catches unhandled errors and returns
 * consistent error responses without exposing internal details.
 * 
 * @module nexus/middleware/error-handler
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { bus } from '../../core/event-bus.js';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Global error handler - must be last middleware
 */
export const errorHandler: ErrorRequestHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Log the error
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  // Emit error event for monitoring
  bus.publish('nexus', 'nexus:error', {
    method: req.method,
    path: req.path,
    error: err.message,
    code: err.code,
    timestamp: Date.now(),
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Production: Don't expose stack traces
  const isDev = process.env['NODE_ENV'] === 'development';

  // Send response
  res.status(statusCode).json({
    ok: false,
    error: err.isOperational ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Not Found handler - for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async handler wrapper - catches async errors
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create operational error (safe to show to users)
 */
export class OperationalError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
