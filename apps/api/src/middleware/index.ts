/**
 * @tooloo/api - Middleware Index
 * Export all middleware
 *
 * @version 2.0.2
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

export {
  createRBACMiddleware,
  requireRole,
  requirePermissions,
  requireAdmin,
  requireOwner,
  requireAuthenticated,
  rbacMiddleware,
  rbacReadAllowAnonymous,
  roleHasPermission,
  roleHasAllPermissions,
  roleHasAnyPermission,
  compareRoles,
  getRolePermissions,
  getRequiredPermissions,
  setProjectRole,
  getProjectRole,
  setGlobalRole,
  getGlobalRole,
  removeProjectRole,
  type Role,
  type Permission,
  type ResourceType,
  type RBACRequest,
} from './rbac.js';

export {
  ALL_SCOPES,
  SCOPE_GROUPS,
  DEFAULT_SCOPES_BY_TIER,
  SCOPE_DESCRIPTIONS,
  generateScopedApiKey,
  getScopedApiKey,
  listUserApiKeys,
  revokeApiKey,
  deleteApiKey,
  updateApiKeyScopes,
  keyHasScope,
  keyHasAllScopes,
  keyHasAnyScope,
  validateScopedApiKey,
  validateApiKeyScopes,
  requireScopes,
  requireAnyScope,
  autoScopeCheck,
  type ApiKeyScope,
  type ScopeGroup,
  type ScopedApiKey,
  type ScopedAuthRequest,
} from './api-key-scopes.js';
