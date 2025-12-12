/**
 * @tooloo/api - Rate Limiter Middleware
 * Implements tiered rate limiting based on API key tier
 *
 * @version 2.0.0-alpha.0
 */

import { Request, Response, NextFunction } from 'express';

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitConfig {
  /** Requests per minute for free tier */
  freeRpm: number;
  /** Requests per minute for pro tier */
  proRpm: number;
  /** Requests per minute for enterprise tier */
  enterpriseRpm: number;
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs: number;
  /** Skip rate limiting for these paths */
  skipPaths: string[];
  /** Whether to include rate limit headers in response */
  headers: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  tier: 'free' | 'pro' | 'enterprise' | 'unlimited';
}

interface RateLimitEntry {
  count: number;
  reset: number;
  tier: 'free' | 'pro' | 'enterprise' | 'unlimited';
}

// =============================================================================
// RATE LIMITER
// =============================================================================

const DEFAULT_CONFIG: RateLimitConfig = {
  freeRpm: 20,
  proRpm: 100,
  enterpriseRpm: 1000,
  windowMs: 60000,
  skipPaths: ['/health', '/api/v2/health'],
  headers: true,
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.reset < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Get rate limit for a given tier
 */
function getLimitForTier(
  tier: 'free' | 'pro' | 'enterprise' | 'unlimited',
  config: RateLimitConfig
): number {
  switch (tier) {
    case 'unlimited':
      return Infinity;
    case 'enterprise':
      return config.enterpriseRpm;
    case 'pro':
      return config.proRpm;
    case 'free':
    default:
      return config.freeRpm;
  }
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | undefined {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended for production)
  if (typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }

  return undefined;
}

/**
 * Get tier from API key (mock implementation - replace with real lookup)
 */
function getTierFromApiKey(apiKey: string | undefined): 'free' | 'pro' | 'enterprise' | 'unlimited' {
  if (!apiKey) {
    return 'free';
  }

  // Development/test keys
  if (apiKey.startsWith('tlai_dev_')) {
    return 'unlimited';
  }

  // Enterprise keys
  if (apiKey.startsWith('tlai_ent_')) {
    return 'enterprise';
  }

  // Pro keys
  if (apiKey.startsWith('tlai_pro_')) {
    return 'pro';
  }

  // Default to free tier
  return 'free';
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request): string {
  // Use API key if available
  const apiKey = extractApiKey(req);
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Fall back to IP address
  const ip =
    req.ip ||
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Check and update rate limit for a client
 */
function checkRateLimit(
  clientId: string,
  tier: 'free' | 'pro' | 'enterprise' | 'unlimited',
  config: RateLimitConfig
): RateLimitInfo {
  const now = Date.now();
  const limit = getLimitForTier(tier, config);
  const windowEnd = now + config.windowMs;

  // Get or create entry
  let entry = rateLimitStore.get(clientId);

  // Reset if window has expired
  if (!entry || entry.reset < now) {
    entry = {
      count: 0,
      reset: windowEnd,
      tier,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Increment count
  entry.count++;

  // Calculate remaining
  const remaining = Math.max(0, limit - entry.count);

  return {
    limit,
    remaining,
    reset: new Date(entry.reset),
    tier,
  };
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    // Skip rate limiting for certain paths
    if (finalConfig.skipPaths.some(path => req.path.startsWith(path))) {
      next();
      return;
    }

    // Get client identifier and tier
    const clientId = getClientId(req);
    const apiKey = extractApiKey(req);
    const tier = getTierFromApiKey(apiKey);

    // Check rate limit
    const info = checkRateLimit(clientId, tier, finalConfig);

    // Add rate limit headers
    if (finalConfig.headers) {
      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', info.reset.toISOString());
      res.setHeader('X-RateLimit-Tier', info.tier);
    }

    // Check if over limit
    if (info.remaining <= 0 && info.tier !== 'unlimited') {
      res.status(429).json({
        ok: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Limit: ${info.limit} requests per minute.`,
          details: {
            limit: info.limit,
            reset: info.reset.toISOString(),
            tier: info.tier,
            upgradeUrl: 'https://tooloo.ai/pricing',
          },
        },
      });
      return;
    }

    // Attach rate limit info to request for use in handlers
    (req as any).rateLimit = info;

    next();
  };
}

/**
 * Get current rate limit stats
 */
export function getRateLimitStats(): {
  totalClients: number;
  byTier: Record<string, number>;
} {
  const stats = {
    totalClients: rateLimitStore.size,
    byTier: {
      free: 0,
      pro: 0,
      enterprise: 0,
      unlimited: 0,
    },
  };

  for (const entry of rateLimitStore.values()) {
    stats.byTier[entry.tier]++;
  }

  return stats;
}

/**
 * Clear rate limit for a specific client
 */
export function clearRateLimit(clientId: string): boolean {
  return rateLimitStore.delete(clientId);
}

/**
 * Clear all rate limits
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
