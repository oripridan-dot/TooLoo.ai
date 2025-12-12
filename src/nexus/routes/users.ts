/**
 * @file Users Routes - User Profile & API Key Management
 * @module nexus/routes/users
 * @version 3.3.530
 * 
 * REST endpoints for user management, API key operations, and profile settings.
 * 
 * IMPORTANT: Static routes (/me, /me/keys) must be defined BEFORE parameterized 
 * routes (/:userId) to ensure correct routing!
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../auth/auth-service.js';
import { requireAuth, optionalAuth, requireScopes } from '../middleware/auth.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
  tier: z.enum(['free', 'pro', 'enterprise']).optional().default('free')
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  preferences: z.record(z.unknown()).optional()
});

const CreateAPIKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(50),
  scopes: z.array(z.string()).optional().default(['*']),
  expiresInDays: z.number().int().positive().max(365).optional(),
  rateLimit: z.number().int().positive().max(1000).optional()
});

// ─────────────────────────────────────────────────────────────────────────────
// Current User Routes (MUST be before /:userId to avoid route collision)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/users/me
 * Get current authenticated user's profile
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const limits = authService.getTierLimits(req.user.tier);
    
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        tier: req.user.tier,
        createdAt: req.user.createdAt,
        lastLoginAt: req.user.lastLoginAt,
        preferences: req.user.preferences
      },
      usage: req.user.usage,
      limits,
      apiKeyCount: req.user.apiKeys.length
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 */
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const input = UpdateUserSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({
        error: 'Validation error',
        details: input.error.errors
      });
      return;
    }
    
    // Users can't change their own tier (admin only)
    const updates = { ...input.data };
    delete (updates as any).tier;

    const user = await authService.updateUser(req.user.id, updates);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        preferences: user.preferences
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update profile',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/users/me/keys
 * List current user's API keys
 */
router.get('/me/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const keys = await authService.listUserAPIKeys(req.user.id);
    const limits = authService.getTierLimits(req.user.tier);

    res.json({
      success: true,
      count: keys.length,
      limit: limits.apiKeys,
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        usageCount: k.usageCount,
        rateLimit: k.rateLimit,
        scopes: k.scopes,
        active: k.active
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list API keys',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/users/me/keys
 * Generate a new API key
 */
router.post('/me/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const input = CreateAPIKeySchema.parse(req.body);
    
    const result = await authService.generateAPIKey(req.user.id, input.name, {
      scopes: input.scopes,
      expiresInDays: input.expiresInDays,
      rateLimit: input.rateLimit
    });

    if (!result.success) {
      res.status(400).json({
        error: 'Failed to create API key',
        message: result.error
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'API key created. Save this key securely - it will not be shown again!',
      key: result.key,
      keyId: result.keyId
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    res.status(500).json({
      error: 'Failed to create API key',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/users/me/keys/:keyId
 * Revoke an API key (permanent)
 */
router.delete('/me/keys/:keyId', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const success = await authService.revokeAPIKey(req.user.id, req.params.keyId);
    if (!success) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({
      success: true,
      message: 'API key revoked permanently'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to revoke API key',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/users/me/keys/:keyId/deactivate
 * Temporarily deactivate an API key
 */
router.post('/me/keys/:keyId/deactivate', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const success = await authService.deactivateAPIKey(req.user.id, req.params.keyId);
    if (!success) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({
      success: true,
      message: 'API key deactivated'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to deactivate API key',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/users/me/keys/:keyId/reactivate
 * Reactivate a deactivated API key
 */
router.post('/me/keys/:keyId/reactivate', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const success = await authService.reactivateAPIKey(req.user.id, req.params.keyId);
    if (!success) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({
      success: true,
      message: 'API key reactivated'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to reactivate API key',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/users/me/usage
 * Get detailed usage statistics for current user
 */
router.get('/me/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const usage = authService.getUserUsageStats(req.user.id);
    const limits = authService.getTierLimits(req.user.tier);

    if (!usage) {
      res.status(404).json({ error: 'Usage data not found' });
      return;
    }

    res.json({
      success: true,
      tier: req.user.tier,
      usage: {
        requests: {
          today: usage.requestsToday,
          thisMonth: usage.requestsThisMonth,
          limitPerDay: limits.requestsPerDay
        },
        tokens: {
          today: usage.tokensUsedToday,
          thisMonth: usage.tokensUsedThisMonth,
          limitPerDay: limits.tokensPerDay
        },
        lastResetDate: usage.lastResetDate
      },
      percentUsed: {
        requestsToday: Math.round((usage.requestsToday / limits.requestsPerDay) * 100),
        tokensToday: Math.round((usage.tokensUsedToday / limits.tokensPerDay) * 100)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get usage stats',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// User Admin Routes (Public - should be admin-only in production)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/users
 * Create a new user account
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateUserSchema.parse(req.body);
    const user = await authService.createUser(input.email, input.name, input.tier);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    res.status(400).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/users
 * List all users (Admin only)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await authService.listUsers();
    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        tier: u.tier,
        createdAt: u.createdAt,
        apiKeyCount: u.apiKeys.length
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list users',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/users/:userId
 * Get user by ID (Admin only)
 * 
 * NOTE: This route MUST be after /me routes to avoid collision!
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const user = await authService.getUser(req.params.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        apiKeyCount: user.apiKeys.length,
        usage: user.usage
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get user',
      message: error.message
    });
  }
});

export default router;
