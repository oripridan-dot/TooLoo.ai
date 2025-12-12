// @version 3.3.547
/**
 * Rate Limiting Middleware
 * 
 * Production hardening: Protects API endpoints from abuse.
 * Different limits for different endpoint types.
 * Tier-aware rate limiting based on user subscription.
 * 
 * V3.3.550: Added tier-based rate limiting with billing integration
 * 
 * @module nexus/middleware/rate-limiter
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_PLANS, SubscriptionTier, billingService } from '../billing/billing-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TierRateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerDay: number;
}

// Daily usage tracking per user
const dailyUsage = new Map<string, { requests: number; tokens: number; date: string }>();

// ─────────────────────────────────────────────────────────────────────────────
// Tier-Based Limits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get rate limits based on subscription tier
 */
export function getTierLimits(tier: SubscriptionTier): TierRateLimitConfig {
  const plan = SUBSCRIPTION_PLANS[tier];
  const requestsPerDay = plan?.limits?.requestsPerDay ?? 100;
  
  // Calculate per-minute rate based on daily limit
  // Free: 100/day = ~7/min, Pro: 10K/day = ~700/min, Unlimited: unlimited/min
  const requestsPerMinute = requestsPerDay === Infinity 
    ? 1000 
    : Math.max(10, Math.ceil(requestsPerDay / 144)); // 144 = minutes in a day / 10

  return {
    requestsPerMinute,
    requestsPerDay,
    tokensPerDay: plan?.limits?.tokensPerDay ?? 10_000
  };
}

/**
 * Get user's current daily usage
 */
export function getDailyUsage(userId: string): { requests: number; tokens: number } {
  const today = new Date().toISOString().split('T')[0];
  const usage = dailyUsage.get(userId);
  
  // Reset if it's a new day
  if (!usage || usage.date !== today) {
    return { requests: 0, tokens: 0 };
  }
  
  return { requests: usage.requests, tokens: usage.tokens };
}

/**
 * Record usage for a user
 */
export function recordUsage(userId: string, requests: number = 1, tokens: number = 0): void {
  const today = new Date().toISOString().split('T')[0];
  const existing = dailyUsage.get(userId);
  
  if (!existing || existing.date !== today) {
    // New day, reset counter
    dailyUsage.set(userId, { requests, tokens, date: today });
  } else {
    existing.requests += requests;
    existing.tokens += tokens;
  }

  // Also record to billing service for metering
  billingService.recordUsage(userId, requests, tokens).catch(err => {
    console.error('[RateLimiter] Failed to record usage to billing:', err);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getKeyFromRequest(req: Request): string {
  // Use user ID if authenticated, otherwise use IP
  const userId = (req as any).user?.id;
  if (userId) return `user:${userId}`;
  return `ip:${(req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown'}`;
}

function getUserTier(req: Request): SubscriptionTier {
  const user = (req as any).user;
  // Map 'enterprise' to 'unlimited' for backwards compatibility
  if (user?.tier === 'enterprise') return 'unlimited';
  return user?.tier || 'free';
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard Rate Limiters (IP-based, for unauthenticated requests)
// ─────────────────────────────────────────────────────────────────────────────

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
