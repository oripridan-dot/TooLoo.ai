/**
 * @tooloo/api - RBAC Middleware
 * Role-Based Access Control for API endpoints
 *
 * Roles (from highest to lowest privilege):
 * - owner: Full access, can delete project and manage all settings
 * - admin: Can manage collaborators and settings, but can't delete project
 * - editor: Can create, read, update content, but can't manage settings
 * - viewer: Read-only access
 *
 * @version 1.0.0
 * @skill-os true
 */

import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest, User } from './auth.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Role hierarchy (higher number = more permissions)
 */
export type Role = 'owner' | 'admin' | 'editor' | 'viewer' | 'anonymous';

/**
 * Permission actions
 */
export type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'manage_settings'
  | 'manage_collaborators'
  | 'manage_project'
  | 'execute_code'
  | 'access_admin'
  | 'access_analytics';

/**
 * Resource types for permission checks
 */
export type ResourceType =
  | 'project'
  | 'skill'
  | 'chat'
  | 'file'
  | 'settings'
  | 'analytics'
  | 'admin'
  | 'execution';

/**
 * Extended request with RBAC info
 */
export interface RBACRequest extends AuthenticatedRequest {
  userRole?: Role;
  resourceId?: string;
  resourceType?: ResourceType;
  permissions?: Permission[];
}

// =============================================================================
// ROLE HIERARCHY & PERMISSIONS
// =============================================================================

/**
 * Role hierarchy levels (higher = more permissions)
 */
const ROLE_LEVELS: Record<Role, number> = {
  owner: 100,
  admin: 80,
  editor: 50,
  viewer: 20,
  anonymous: 0,
};

/**
 * Permissions granted to each role
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'read',
    'write',
    'delete',
    'manage_settings',
    'manage_collaborators',
    'manage_project',
    'execute_code',
    'access_admin',
    'access_analytics',
  ],
  admin: [
    'read',
    'write',
    'delete',
    'manage_settings',
    'manage_collaborators',
    'execute_code',
    'access_analytics',
  ],
  editor: ['read', 'write', 'execute_code'],
  viewer: ['read'],
  anonymous: [],
};

/**
 * Default permissions required for each resource type action
 */
const RESOURCE_PERMISSIONS: Record<ResourceType, Record<string, Permission[]>> = {
  project: {
    GET: ['read'],
    POST: ['write'],
    PUT: ['write'],
    PATCH: ['write'],
    DELETE: ['manage_project'],
  },
  skill: {
    GET: ['read'],
    POST: ['write', 'execute_code'],
    PUT: ['write'],
    PATCH: ['write'],
    DELETE: ['delete'],
  },
  chat: {
    GET: ['read'],
    POST: ['write'],
    DELETE: ['delete'],
  },
  file: {
    GET: ['read'],
    POST: ['write'],
    PUT: ['write'],
    PATCH: ['write'],
    DELETE: ['delete'],
  },
  settings: {
    GET: ['read', 'manage_settings'],
    PUT: ['manage_settings'],
    PATCH: ['manage_settings'],
  },
  analytics: {
    GET: ['access_analytics'],
  },
  admin: {
    GET: ['access_admin'],
    POST: ['access_admin'],
    PUT: ['access_admin'],
    DELETE: ['access_admin'],
  },
  execution: {
    POST: ['execute_code'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all required permissions
 */
export function roleHasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => roleHasPermission(role, p));
}

/**
 * Check if a role has any of the required permissions
 */
export function roleHasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => roleHasPermission(role, p));
}

/**
 * Compare two roles (returns positive if role1 > role2)
 */
export function compareRoles(role1: Role, role2: Role): number {
  return ROLE_LEVELS[role1] - ROLE_LEVELS[role2];
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Get required permissions for a resource/method combination
 */
export function getRequiredPermissions(
  resourceType: ResourceType,
  method: string
): Permission[] {
  return RESOURCE_PERMISSIONS[resourceType]?.[method.toUpperCase()] ?? ['read'];
}

// =============================================================================
// IN-MEMORY ROLE STORE (Replace with DB in production)
// =============================================================================

/**
 * User roles per project (projectId -> userId -> role)
 */
const projectRoles = new Map<string, Map<string, Role>>();

/**
 * Global user roles (for admin access)
 */
const globalRoles = new Map<string, Role>();

/**
 * Set a user's role for a project
 */
export function setProjectRole(projectId: string, userId: string, role: Role): void {
  if (!projectRoles.has(projectId)) {
    projectRoles.set(projectId, new Map());
  }
  projectRoles.get(projectId)!.set(userId, role);
}

/**
 * Get a user's role for a project
 */
export function getProjectRole(projectId: string, userId: string): Role {
  return projectRoles.get(projectId)?.get(userId) ?? 'anonymous';
}

/**
 * Set a user's global role
 */
export function setGlobalRole(userId: string, role: Role): void {
  globalRoles.set(userId, role);
}

/**
 * Get a user's global role
 */
export function getGlobalRole(userId: string): Role {
  return globalRoles.get(userId) ?? 'anonymous';
}

/**
 * Remove a user's role from a project
 */
export function removeProjectRole(projectId: string, userId: string): void {
  projectRoles.get(projectId)?.delete(userId);
}

// Initialize default admin user
setGlobalRole('user_test_001', 'admin');

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Extract resource info from request path
 */
function extractResourceInfo(req: Request): { resourceType?: ResourceType; resourceId?: string } {
  const path = req.path.toLowerCase();
  
  // Match common API patterns
  if (path.includes('/projects/')) {
    const match = path.match(/\/projects\/([^/]+)/);
    return { resourceType: 'project', resourceId: match?.[1] };
  }
  if (path.includes('/skills/')) {
    const match = path.match(/\/skills\/([^/]+)/);
    return { resourceType: 'skill', resourceId: match?.[1] };
  }
  if (path.includes('/chat')) {
    return { resourceType: 'chat' };
  }
  if (path.includes('/vision') || path.includes('/execute') || path.includes('/sandbox')) {
    return { resourceType: 'execution' };
  }
  if (path.includes('/settings')) {
    return { resourceType: 'settings' };
  }
  if (path.includes('/analytics') || path.includes('/metrics') || path.includes('/observatory')) {
    return { resourceType: 'analytics' };
  }
  if (path.includes('/admin') || path.includes('/system')) {
    return { resourceType: 'admin' };
  }

  return {};
}

/**
 * Create RBAC middleware with custom configuration
 */
export function createRBACMiddleware(options: {
  /** Resource type to check (auto-detected if not provided) */
  resourceType?: ResourceType;
  /** Required permissions (auto-detected from method if not provided) */
  requiredPermissions?: Permission[];
  /** Whether to allow anonymous access */
  allowAnonymous?: boolean;
  /** Custom permission check function */
  customCheck?: (req: RBACRequest) => boolean | Promise<boolean>;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rbacReq = req as RBACRequest;
    const userId = rbacReq.user?.id;

    // Extract resource info
    const { resourceType, resourceId } = extractResourceInfo(req);
    rbacReq.resourceType = options.resourceType ?? resourceType;
    rbacReq.resourceId = resourceId;

    // Determine user's role
    let userRole: Role = 'anonymous';
    
    if (userId) {
      // Check project-specific role first
      if (resourceId) {
        userRole = getProjectRole(resourceId, userId);
      }
      
      // Fall back to global role if no project role
      if (userRole === 'anonymous') {
        userRole = getGlobalRole(userId);
      }
      
      // Default authenticated users to viewer if no role assigned
      if (userRole === 'anonymous') {
        userRole = 'viewer';
      }
    }

    rbacReq.userRole = userRole;
    rbacReq.permissions = getRolePermissions(userRole);

    // Check if anonymous access is allowed
    if (userRole === 'anonymous' && !options.allowAnonymous) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource',
        },
      });
      return;
    }

    // Determine required permissions
    const requiredPermissions =
      options.requiredPermissions ??
      (rbacReq.resourceType
        ? getRequiredPermissions(rbacReq.resourceType, req.method)
        : ['read']);

    // Check permissions
    const hasPermission = roleHasAllPermissions(userRole, requiredPermissions);

    // Custom check if provided
    if (options.customCheck) {
      const customResult = await options.customCheck(rbacReq);
      if (!customResult) {
        res.status(403).json({
          ok: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to perform this action',
            details: {
              userRole,
              requiredPermissions,
              yourPermissions: rbacReq.permissions,
            },
          },
        });
        return;
      }
    } else if (!hasPermission) {
      res.status(403).json({
        ok: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action',
          details: {
            userRole,
            requiredPermissions,
            yourPermissions: rbacReq.permissions,
          },
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific role (or higher)
 */
export function requireRole(minimumRole: Role) {
  return createRBACMiddleware({
    customCheck: (req) => compareRoles(req.userRole ?? 'anonymous', minimumRole) >= 0,
  });
}

/**
 * Require specific permissions
 */
export function requirePermissions(...permissions: Permission[]) {
  return createRBACMiddleware({
    requiredPermissions: permissions,
  });
}

/**
 * Require admin access
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Require owner access
 */
export function requireOwner() {
  return requireRole('owner');
}

/**
 * Allow any authenticated user
 */
export function requireAuthenticated() {
  return createRBACMiddleware({
    allowAnonymous: false,
    requiredPermissions: [], // Any authenticated user
    customCheck: (req) => !!req.user,
  });
}

/**
 * RBAC middleware for automatic permission checking
 * Uses resource type detection and method-based permissions
 */
export const rbacMiddleware = createRBACMiddleware({
  allowAnonymous: false,
});

/**
 * Lenient RBAC that allows anonymous read access
 */
export const rbacReadAllowAnonymous = createRBACMiddleware({
  allowAnonymous: true,
});

// =============================================================================
// EXPORTS
// =============================================================================

export default {
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
};
