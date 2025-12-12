/**
 * @file Auth Middleware - API Key Authentication for Protected Routes
 * @module nexus/middleware/auth
 * @version 3.3.530
 * 
 * Validates API keys and attaches user context to requests.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, User, APIKey } from '../auth/auth-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: Omit<APIKey, 'hashedKey'>;
      isAuthenticated?: boolean;
    }
  }
}

export interface AuthOptions {
  /** If true, request fails without valid auth. If false, just attaches user if present */
  required?: boolean;
  /** Required scopes for this endpoint */
  scopes?: string[];
  /** Skip auth for certain paths */
  skipPaths?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractAPIKey(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended, but supported)
  if (typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }

  return null;
}

function hasRequiredScopes(keyScopes: string[], requiredScopes: string[]): boolean {
  // Wildcard scope grants all permissions
  if (keyScopes.includes('*')) return true;
  
  // Check each required scope
  return requiredScopes.every(required => {
    // Direct match
    if (keyScopes.includes(required)) return true;
    
    // Check wildcard patterns (e.g., 'projects:*' matches 'projects:read')
    const requiredParts = required.split(':');
    return keyScopes.some(scope => {
      const scopeParts = scope.split(':');
      if (scopeParts.length !== requiredParts.length) return false;
      return scopeParts.every((part, i) => part === '*' || part === requiredParts[i]);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates auth middleware with specified options
 */
export function createAuthMiddleware(options: AuthOptions = {}) {
  const { required = false, scopes = [], skipPaths = [] } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip auth for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const apiKey = extractAPIKey(req);

    // No key provided
    if (!apiKey) {
      if (required) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Please provide an API key via Authorization header (Bearer token) or X-API-Key header'
        });
        return;
      }
      req.isAuthenticated = false;
      return next();
    }

    // Validate key
    const result = await authService.validateAPIKey(apiKey);

    if (!result.success) {
      if (required) {
        res.status(401).json({
          error: 'Invalid API key',
          message: result.error
        });
        return;
      }
      req.isAuthenticated = false;
      return next();
    }

    // Check scopes
    if (scopes.length > 0 && result.key) {
      if (!hasRequiredScopes(result.key.scopes, scopes)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          message: `This endpoint requires scopes: ${scopes.join(', ')}`
        });
        return;
      }
    }

    // Check usage limits
    if (result.user) {
      const limitCheck = await authService.checkUsageLimits(result.user.id);
      if (!limitCheck.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: limitCheck.reason,
          tier: result.user.tier
        });
        return;
      }
    }

    // Attach user and key to request (without hashedKey)
    req.user = result.user;
    req.apiKey = result.key ? { ...result.key, hashedKey: undefined } as any : undefined;
    req.isAuthenticated = true;

    // Record usage
    if (result.user) {
      authService.recordUsage(result.user.id).catch(err => {
        console.error('[AuthMiddleware] Failed to record usage:', err);
      });
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-configured Middleware Instances
// ─────────────────────────────────────────────────────────────────────────────

/** Require authentication - fails without valid API key */
export const requireAuth = createAuthMiddleware({ required: true });

/** Optional authentication - attaches user if key provided */
export const optionalAuth = createAuthMiddleware({ required: false });

/** Require authentication with specific scopes */
export function requireScopes(...scopes: string[]) {
  return createAuthMiddleware({ required: true, scopes });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting Middleware
// ─────────────────────────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Per-key rate limiting middleware
 * Uses the key's configured rate limit
 */
export function keyRateLimit() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if no API key
    if (!req.apiKey?.id) {
      return next();
    }

    const keyId = req.apiKey.id;
    const rateLimit = req.apiKey.rateLimit || 60;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    let entry = rateLimitStore.get(keyId);
    
    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(keyId, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > rateLimit) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `API key rate limit is ${rateLimit} requests per minute`,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      });
      return;
    }

    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup (for long-running servers)
// ─────────────────────────────────────────────────────────────────────────────

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export default { createAuthMiddleware, requireAuth, optionalAuth, requireScopes, keyRateLimit };
