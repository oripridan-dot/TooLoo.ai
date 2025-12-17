/**
 * @tooloo/api - API Key Scopes
 * Scope-based permissions for API keys
 *
 * Scopes define what operations an API key can perform.
 * This enables fine-grained access control beyond tier-based limits.
 *
 * @version 1.0.0
 * @skill-os true
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import type { User, AuthenticatedRequest } from './auth.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Available API key scopes
 */
export type ApiKeyScope =
  // Read operations
  | 'read:chat'
  | 'read:skills'
  | 'read:projects'
  | 'read:analytics'
  | 'read:files'
  // Write operations
  | 'write:chat'
  | 'write:skills'
  | 'write:projects'
  | 'write:files'
  // Execute operations
  | 'execute:skills'
  | 'execute:sandbox'
  | 'execute:vision'
  // Admin operations
  | 'admin:users'
  | 'admin:settings'
  | 'admin:system';

/**
 * Scope groups for convenience
 */
export type ScopeGroup = 'all' | 'read' | 'write' | 'execute' | 'admin';

/**
 * API key with scopes
 */
export interface ScopedApiKey {
  /** The API key itself */
  key: string;
  /** User ID that owns this key */
  userId: string;
  /** Name/description for the key */
  name: string;
  /** Scopes granted to this key */
  scopes: ApiKeyScope[];
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp (null = never expires) */
  expiresAt: Date | null;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Whether the key is active */
  active: boolean;
  /** IP whitelist (empty = allow all) */
  ipWhitelist: string[];
  /** Rate limit override (null = use tier default) */
  rateLimitOverride?: number;
}

/**
 * Request with scoped API key info
 */
export interface ScopedAuthRequest extends AuthenticatedRequest {
  apiKeyScopes?: ApiKeyScope[];
  scopedApiKey?: ScopedApiKey;
}

// =============================================================================
// SCOPE DEFINITIONS
// =============================================================================

/**
 * All available scopes
 */
export const ALL_SCOPES: ApiKeyScope[] = [
  'read:chat',
  'read:skills',
  'read:projects',
  'read:analytics',
  'read:files',
  'write:chat',
  'write:skills',
  'write:projects',
  'write:files',
  'execute:skills',
  'execute:sandbox',
  'execute:vision',
  'admin:users',
  'admin:settings',
  'admin:system',
];

/**
 * Scope groups for easy assignment
 */
export const SCOPE_GROUPS: Record<ScopeGroup, ApiKeyScope[]> = {
  all: ALL_SCOPES,
  read: ['read:chat', 'read:skills', 'read:projects', 'read:analytics', 'read:files'],
  write: ['write:chat', 'write:skills', 'write:projects', 'write:files'],
  execute: ['execute:skills', 'execute:sandbox', 'execute:vision'],
  admin: ['admin:users', 'admin:settings', 'admin:system'],
};

/**
 * Default scopes by tier
 */
export const DEFAULT_SCOPES_BY_TIER: Record<'free' | 'pro' | 'enterprise', ApiKeyScope[]> = {
  free: ['read:chat', 'read:skills', 'write:chat', 'execute:skills'],
  pro: [
    'read:chat',
    'read:skills',
    'read:projects',
    'read:analytics',
    'read:files',
    'write:chat',
    'write:skills',
    'write:projects',
    'write:files',
    'execute:skills',
    'execute:sandbox',
    'execute:vision',
  ],
  enterprise: ALL_SCOPES,
};

/**
 * Scope descriptions for documentation
 */
export const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, string> = {
  'read:chat': 'Read chat history and messages',
  'read:skills': 'List and view skill definitions',
  'read:projects': 'Read project metadata and content',
  'read:analytics': 'Access analytics and metrics',
  'read:files': 'Read files in project workspace',
  'write:chat': 'Send chat messages',
  'write:skills': 'Create and modify skills',
  'write:projects': 'Create and modify projects',
  'write:files': 'Create and modify files',
  'execute:skills': 'Execute skills',
  'execute:sandbox': 'Run code in sandbox',
  'execute:vision': 'Use vision/image analysis',
  'admin:users': 'Manage users',
  'admin:settings': 'Manage system settings',
  'admin:system': 'Full system administration',
};

// =============================================================================
// IN-MEMORY STORE (Replace with DB in production)
// =============================================================================

const scopedApiKeys = new Map<string, ScopedApiKey>();

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

/**
 * Generate a scoped API key
 */
export function generateScopedApiKey(
  userId: string,
  name: string,
  scopes: ApiKeyScope[],
  options: {
    expiresInDays?: number;
    ipWhitelist?: string[];
    rateLimitOverride?: number;
  } = {}
): ScopedApiKey {
  // Generate a unique key with scope prefix
  const scopePrefix = scopes.includes('admin:system')
    ? 'tlai_admin_'
    : scopes.some((s) => s.startsWith('write:') || s.startsWith('execute:'))
      ? 'tlai_full_'
      : 'tlai_read_';

  const randomPart = crypto.randomBytes(24).toString('base64url');
  const key = `${scopePrefix}${randomPart}`;

  const scopedKey: ScopedApiKey = {
    key,
    userId,
    name,
    scopes,
    createdAt: new Date(),
    expiresAt: options.expiresInDays
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null,
    active: true,
    ipWhitelist: options.ipWhitelist ?? [],
    rateLimitOverride: options.rateLimitOverride,
  };

  scopedApiKeys.set(key, scopedKey);
  return scopedKey;
}

/**
 * Get a scoped API key
 */
export function getScopedApiKey(key: string): ScopedApiKey | undefined {
  return scopedApiKeys.get(key);
}

/**
 * List all API keys for a user
 */
export function listUserApiKeys(userId: string): ScopedApiKey[] {
  return Array.from(scopedApiKeys.values()).filter((k) => k.userId === userId);
}

/**
 * Revoke an API key
 */
export function revokeApiKey(key: string): boolean {
  const apiKey = scopedApiKeys.get(key);
  if (!apiKey) return false;

  apiKey.active = false;
  return true;
}

/**
 * Delete an API key
 */
export function deleteApiKey(key: string): boolean {
  return scopedApiKeys.delete(key);
}

/**
 * Update API key scopes
 */
export function updateApiKeyScopes(key: string, scopes: ApiKeyScope[]): boolean {
  const apiKey = scopedApiKeys.get(key);
  if (!apiKey) return false;

  apiKey.scopes = scopes;
  return true;
}

/**
 * Check if a key has a specific scope
 */
export function keyHasScope(key: string, scope: ApiKeyScope): boolean {
  const apiKey = scopedApiKeys.get(key);
  if (!apiKey || !apiKey.active) return false;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return false;
  }

  return apiKey.scopes.includes(scope);
}

/**
 * Check if a key has all required scopes
 */
export function keyHasAllScopes(key: string, scopes: ApiKeyScope[]): boolean {
  return scopes.every((scope) => keyHasScope(key, scope));
}

/**
 * Check if a key has any of the required scopes
 */
export function keyHasAnyScope(key: string, scopes: ApiKeyScope[]): boolean {
  return scopes.some((scope) => keyHasScope(key, scope));
}

/**
 * Validate API key and return validation result
 */
export function validateScopedApiKey(
  key: string,
  clientIp?: string
): {
  valid: boolean;
  reason?: string;
  apiKey?: ScopedApiKey;
} {
  const apiKey = scopedApiKeys.get(key);

  if (!apiKey) {
    return { valid: false, reason: 'API key not found' };
  }

  if (!apiKey.active) {
    return { valid: false, reason: 'API key has been revoked' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, reason: 'API key has expired' };
  }

  // IP whitelist check
  if (apiKey.ipWhitelist.length > 0 && clientIp) {
    if (!apiKey.ipWhitelist.includes(clientIp)) {
      return { valid: false, reason: 'IP address not in whitelist' };
    }
  }

  // Update last used
  apiKey.lastUsedAt = new Date();

  return { valid: true, apiKey };
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Extract client IP from request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0];
    return first ? first.trim() : 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Middleware to validate scoped API key and attach scopes to request
 */
export function validateApiKeyScopes(req: Request, res: Response, next: NextFunction): void {
  const scopedReq = req as ScopedAuthRequest;

  // Check if there's an API key in the request
  const apiKey = scopedReq.apiKey;
  if (!apiKey) {
    // No API key, continue (auth middleware handles this)
    next();
    return;
  }

  // Check if it's a scoped key
  const scopedKey = getScopedApiKey(apiKey);
  if (!scopedKey) {
    // Not a scoped key, might be a legacy key
    // Default to tier-based scopes
    if (scopedReq.user) {
      scopedReq.apiKeyScopes = DEFAULT_SCOPES_BY_TIER[scopedReq.user.tier];
    }
    next();
    return;
  }

  // Validate the scoped key
  const validation = validateScopedApiKey(apiKey, getClientIp(req));
  if (!validation.valid) {
    res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_API_KEY',
        message: validation.reason,
      },
    });
    return;
  }

  scopedReq.scopedApiKey = validation.apiKey;
  scopedReq.apiKeyScopes = validation.apiKey!.scopes;

  next();
}

/**
 * Create middleware to require specific scopes
 */
export function requireScopes(...scopes: ApiKeyScope[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const scopedReq = req as ScopedAuthRequest;

    // Get scopes from request
    const keyScopes = scopedReq.apiKeyScopes;

    if (!keyScopes) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key required',
        },
      });
      return;
    }

    // Check if key has all required scopes
    const hasAllScopes = scopes.every((scope) => keyScopes.includes(scope));

    if (!hasAllScopes) {
      res.status(403).json({
        ok: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `This endpoint requires scopes: ${scopes.join(', ')}`,
          details: {
            required: scopes,
            granted: keyScopes,
          },
        },
      });
      return;
    }

    next();
  };
}

/**
 * Create middleware to require any of the specified scopes
 */
export function requireAnyScope(...scopes: ApiKeyScope[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const scopedReq = req as ScopedAuthRequest;

    const keyScopes = scopedReq.apiKeyScopes;

    if (!keyScopes) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key required',
        },
      });
      return;
    }

    const hasAnyScope = scopes.some((scope) => keyScopes.includes(scope));

    if (!hasAnyScope) {
      res.status(403).json({
        ok: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: `This endpoint requires one of: ${scopes.join(', ')}`,
          details: {
            required: scopes,
            granted: keyScopes,
          },
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that maps endpoint patterns to required scopes
 */
export function autoScopeCheck(req: Request, res: Response, next: NextFunction): void {
  const scopedReq = req as ScopedAuthRequest;
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();

  // Determine required scopes based on path and method
  let requiredScopes: ApiKeyScope[] = [];

  // Chat endpoints
  if (path.includes('/chat')) {
    requiredScopes = method === 'GET' ? ['read:chat'] : ['write:chat'];
  }
  // Skills endpoints
  else if (path.includes('/skills')) {
    if (method === 'GET') {
      requiredScopes = ['read:skills'];
    } else if (path.includes('/execute')) {
      requiredScopes = ['execute:skills'];
    } else {
      requiredScopes = ['write:skills'];
    }
  }
  // Projects endpoints
  else if (path.includes('/projects')) {
    requiredScopes = method === 'GET' ? ['read:projects'] : ['write:projects'];
  }
  // Vision endpoints
  else if (path.includes('/vision')) {
    requiredScopes = ['execute:vision'];
  }
  // Sandbox endpoints
  else if (path.includes('/sandbox') || path.includes('/execute')) {
    requiredScopes = ['execute:sandbox'];
  }
  // Analytics endpoints
  else if (
    path.includes('/analytics') ||
    path.includes('/metrics') ||
    path.includes('/observatory')
  ) {
    requiredScopes = ['read:analytics'];
  }
  // Admin endpoints
  else if (path.includes('/admin') || path.includes('/system')) {
    requiredScopes = ['admin:system'];
  }

  // If no specific scope required, allow
  if (requiredScopes.length === 0) {
    next();
    return;
  }

  // Check scopes
  const keyScopes = scopedReq.apiKeyScopes ?? [];

  // For authenticated requests with no scoped key, use tier defaults
  if (keyScopes.length === 0 && scopedReq.user) {
    scopedReq.apiKeyScopes = DEFAULT_SCOPES_BY_TIER[scopedReq.user.tier];
  }

  const hasScope = requiredScopes.some((scope) => (scopedReq.apiKeyScopes ?? []).includes(scope));

  if (!hasScope) {
    res.status(403).json({
      ok: false,
      error: {
        code: 'INSUFFICIENT_SCOPES',
        message: `This endpoint requires one of: ${requiredScopes.join(', ')}`,
        details: {
          required: requiredScopes,
          granted: scopedReq.apiKeyScopes ?? [],
        },
      },
    });
    return;
  }

  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Constants
  ALL_SCOPES,
  SCOPE_GROUPS,
  DEFAULT_SCOPES_BY_TIER,
  SCOPE_DESCRIPTIONS,
  // Key management
  generateScopedApiKey,
  getScopedApiKey,
  listUserApiKeys,
  revokeApiKey,
  deleteApiKey,
  updateApiKeyScopes,
  // Validation
  keyHasScope,
  keyHasAllScopes,
  keyHasAnyScope,
  validateScopedApiKey,
  // Middleware
  validateApiKeyScopes,
  requireScopes,
  requireAnyScope,
  autoScopeCheck,
};
