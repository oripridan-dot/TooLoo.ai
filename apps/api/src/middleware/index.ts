/**
 * @tooloo/api - Middleware Index
 * Export all middleware
 *
 * @version 2.0.0-alpha.0
 */

export {
  createRateLimiter,
  getRateLimitStats,
  clearRateLimit,
  clearAllRateLimits,
  type RateLimitConfig,
  type RateLimitInfo,
} from './rate-limiter.js';

export {
  authService,
  optionalAuth,
  requireAuth,
  requireTier,
  type User,
  type AuthenticatedRequest,
} from './auth.js';
