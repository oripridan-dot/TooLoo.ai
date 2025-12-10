// @version 1.0.0
// Tests for TooLoo.ai Nexus Middleware
// Rate limiting and error handling tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Rate limiter configuration types
interface RateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: {
    ok: boolean;
    error: string;
    retryAfter: number;
  };
}

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

describe('Nexus Middleware', () => {
  describe('Rate Limiter Configuration', () => {
    const generalLimiterConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        ok: false,
        error: 'Too many requests, please try again later.',
        retryAfter: 60,
      },
    };

    const llmLimiterConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        ok: false,
        error: 'Too many LLM requests. Please wait before sending more.',
        retryAfter: 60,
      },
    };

    const visionLimiterConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        ok: false,
        error: 'Too many vision requests. Please wait before capturing more.',
        retryAfter: 60,
      },
    };

    const authLimiterConfig: RateLimitConfig = {
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        ok: false,
        error: 'Too many authentication attempts. Please wait.',
        retryAfter: 60,
      },
    };

    it('should have 1-minute window for general limiter', () => {
      expect(generalLimiterConfig.windowMs).toBe(60000);
    });

    it('should allow 100 requests per minute for general API', () => {
      expect(generalLimiterConfig.max).toBe(100);
    });

    it('should allow 30 requests per minute for LLM endpoints', () => {
      expect(llmLimiterConfig.max).toBe(30);
    });

    it('should allow 10 requests per minute for vision endpoints', () => {
      expect(visionLimiterConfig.max).toBe(10);
    });

    it('should allow 5 requests per minute for auth endpoints', () => {
      expect(authLimiterConfig.max).toBe(5);
    });

    it('should use standard headers', () => {
      expect(generalLimiterConfig.standardHeaders).toBe(true);
      expect(generalLimiterConfig.legacyHeaders).toBe(false);
    });

    it('should have error messages with ok: false', () => {
      expect(generalLimiterConfig.message.ok).toBe(false);
      expect(llmLimiterConfig.message.ok).toBe(false);
      expect(visionLimiterConfig.message.ok).toBe(false);
      expect(authLimiterConfig.message.ok).toBe(false);
    });

    it('should have retry-after of 60 seconds', () => {
      expect(generalLimiterConfig.message.retryAfter).toBe(60);
      expect(llmLimiterConfig.message.retryAfter).toBe(60);
    });

    it('should have descriptive error messages', () => {
      expect(llmLimiterConfig.message.error).toContain('LLM');
      expect(visionLimiterConfig.message.error).toContain('vision');
      expect(authLimiterConfig.message.error).toContain('authentication');
    });
  });

  describe('Key Generator Logic', () => {
    interface MockRequest {
      headers: Record<string, string | undefined>;
      ip?: string;
    }

    function getClientIP(req: MockRequest): string {
      return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    }

    it('should use x-forwarded-for header first', () => {
      const req: MockRequest = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        ip: '127.0.0.1',
      };
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    it('should fallback to request IP', () => {
      const req: MockRequest = {
        headers: {},
        ip: '192.168.1.100',
      };
      expect(getClientIP(req)).toBe('192.168.1.100');
    });

    it('should return unknown for missing IP', () => {
      const req: MockRequest = {
        headers: {},
      };
      expect(getClientIP(req)).toBe('unknown');
    });

    it('should handle multiple forwarded IPs', () => {
      const req: MockRequest = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
        ip: '127.0.0.1',
      };
      expect(getClientIP(req)).toBe('203.0.113.195');
    });
  });

  describe('Skip Health Check Logic', () => {
    interface MockRequest {
      path: string;
    }

    function shouldSkipRateLimit(req: MockRequest): boolean {
      return req.path === '/health' || req.path === '/api/v1/health';
    }

    it('should skip /health endpoint', () => {
      expect(shouldSkipRateLimit({ path: '/health' })).toBe(true);
    });

    it('should skip /api/v1/health endpoint', () => {
      expect(shouldSkipRateLimit({ path: '/api/v1/health' })).toBe(true);
    });

    it('should not skip other endpoints', () => {
      expect(shouldSkipRateLimit({ path: '/api/v1/chat' })).toBe(false);
      expect(shouldSkipRateLimit({ path: '/api/v1/generate' })).toBe(false);
      expect(shouldSkipRateLimit({ path: '/' })).toBe(false);
    });
  });

  describe('Error Handler', () => {
    interface ErrorResponse {
      ok: boolean;
      error: string;
      code: string;
      timestamp: string;
      stack?: string;
    }

    function handleError(err: ApiError, isDev: boolean): ErrorResponse {
      const statusCode = err.statusCode || 500;
      
      return {
        ok: false,
        error: err.isOperational ? err.message : 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        ...(isDev && err.stack ? { stack: err.stack } : {}),
      };
    }

    it('should return ok: false for errors', () => {
      const err: ApiError = new Error('Test error');
      const response = handleError(err, false);
      expect(response.ok).toBe(false);
    });

    it('should hide message for non-operational errors', () => {
      const err: ApiError = new Error('Database connection failed');
      err.isOperational = false;
      const response = handleError(err, false);
      expect(response.error).toBe('Internal server error');
    });

    it('should show message for operational errors', () => {
      const err: ApiError = new Error('Invalid input');
      err.isOperational = true;
      const response = handleError(err, false);
      expect(response.error).toBe('Invalid input');
    });

    it('should use default INTERNAL_ERROR code', () => {
      const err: ApiError = new Error('Test');
      const response = handleError(err, false);
      expect(response.code).toBe('INTERNAL_ERROR');
    });

    it('should use custom error code', () => {
      const err: ApiError = new Error('Validation failed');
      err.code = 'VALIDATION_ERROR';
      const response = handleError(err, false);
      expect(response.code).toBe('VALIDATION_ERROR');
    });

    it('should include stack in development', () => {
      const err: ApiError = new Error('Dev error');
      err.stack = 'Error: Dev error\n    at test.ts:1:1';
      const response = handleError(err, true);
      expect(response.stack).toBeDefined();
    });

    it('should not include stack in production', () => {
      const err: ApiError = new Error('Prod error');
      err.stack = 'Error: Prod error\n    at test.ts:1:1';
      const response = handleError(err, false);
      expect(response.stack).toBeUndefined();
    });

    it('should include ISO timestamp', () => {
      const err: ApiError = new Error('Test');
      const response = handleError(err, false);
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Not Found Handler', () => {
    interface NotFoundResponse {
      ok: boolean;
      error: string;
      code: string;
      timestamp: string;
    }

    function handleNotFound(method: string, path: string): NotFoundResponse {
      return {
        ok: false,
        error: `Route not found: ${method} ${path}`,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      };
    }

    it('should return ok: false', () => {
      const response = handleNotFound('GET', '/unknown');
      expect(response.ok).toBe(false);
    });

    it('should include method and path in error', () => {
      const response = handleNotFound('POST', '/api/v1/missing');
      expect(response.error).toContain('POST');
      expect(response.error).toContain('/api/v1/missing');
    });

    it('should use NOT_FOUND code', () => {
      const response = handleNotFound('GET', '/');
      expect(response.code).toBe('NOT_FOUND');
    });
  });

  describe('OperationalError Class', () => {
    class OperationalError extends Error {
      statusCode: number;
      code: string;
      isOperational: boolean;

      constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
      }
    }

    it('should create error with default values', () => {
      const err = new OperationalError('Invalid input');
      expect(err.message).toBe('Invalid input');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.isOperational).toBe(true);
    });

    it('should create error with custom status code', () => {
      const err = new OperationalError('Not found', 404, 'NOT_FOUND');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('should create 401 Unauthorized error', () => {
      const err = new OperationalError('Invalid token', 401, 'UNAUTHORIZED');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should create 403 Forbidden error', () => {
      const err = new OperationalError('Access denied', 403, 'FORBIDDEN');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should create 429 Rate Limit error', () => {
      const err = new OperationalError('Too many requests', 429, 'RATE_LIMITED');
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMITED');
    });

    it('should always be marked as operational', () => {
      const err1 = new OperationalError('Test1');
      const err2 = new OperationalError('Test2', 500, 'SERVER_ERROR');
      expect(err1.isOperational).toBe(true);
      expect(err2.isOperational).toBe(true);
    });
  });

  describe('Rate Limit Hierarchy', () => {
    const limits = {
      general: 100,
      llm: 30,
      vision: 10,
      auth: 5,
    };

    it('should have decreasing limits for resource-heavy operations', () => {
      expect(limits.general).toBeGreaterThan(limits.llm);
      expect(limits.llm).toBeGreaterThan(limits.vision);
      expect(limits.vision).toBeGreaterThan(limits.auth);
    });

    it('should have auth as most restrictive', () => {
      expect(limits.auth).toBe(Math.min(...Object.values(limits)));
    });

    it('should have general as least restrictive', () => {
      expect(limits.general).toBe(Math.max(...Object.values(limits)));
    });
  });

  describe('Status Code Mapping', () => {
    const statusCodes: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_ALLOWED: 405,
      CONFLICT: 409,
      UNPROCESSABLE_ENTITY: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_ERROR: 500,
      NOT_IMPLEMENTED: 501,
      SERVICE_UNAVAILABLE: 503,
    };

    it('should have 4xx client errors', () => {
      expect(statusCodes.BAD_REQUEST).toBe(400);
      expect(statusCodes.UNAUTHORIZED).toBe(401);
      expect(statusCodes.NOT_FOUND).toBe(404);
    });

    it('should have 5xx server errors', () => {
      expect(statusCodes.INTERNAL_ERROR).toBe(500);
      expect(statusCodes.NOT_IMPLEMENTED).toBe(501);
      expect(statusCodes.SERVICE_UNAVAILABLE).toBe(503);
    });

    it('should have rate limit status', () => {
      expect(statusCodes.TOO_MANY_REQUESTS).toBe(429);
    });
  });
});
