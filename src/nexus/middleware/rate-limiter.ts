// @version 1.0.0
/**
 * Rate Limiting Middleware
 * 
 * Production hardening: Protects API endpoints from abuse.
 * Different limits for different endpoint types.
 * 
 * @module nexus/middleware/rate-limiter
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limit: 100 requests per minute
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many requests, please try again later.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    // Use forwarded IP in production, fallback to direct IP
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  },
});

// Chat/Generate rate limit: 30 requests per minute (LLM-heavy)
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many LLM requests. Please wait before sending more.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  },
});

// Vision/OCR rate limit: 10 requests per minute (resource-heavy)
export const visionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many vision requests. Please wait before capturing more.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  },
});

// Auth/Login rate limit: 5 requests per minute (security-sensitive)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many authentication attempts. Please wait.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  },
});

// Skip rate limiting for health checks
export const skipHealthCheck = (req: Request, _res: Response) => {
  return req.path === '/health' || req.path === '/api/v1/health';
};

// Combined limiter with skip logic
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipHealthCheck,
  message: {
    ok: false,
    error: 'Rate limit exceeded.',
    retryAfter: 60,
  },
  keyGenerator: (req: Request) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
  },
});
