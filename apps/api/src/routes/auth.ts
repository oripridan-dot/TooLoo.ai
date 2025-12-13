/**
 * @tooloo/api - Authentication Routes
 *
 * @version 2.0.0-alpha.0
 */

import { Router, Request, Response, IRouter } from 'express';
import { authService, requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router: IRouter = Router();

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * POST /api/v2/auth/register
 * Register a new user
 */
router.post('/register', (req: Request, res: Response) => {
  const { email, name, password } = req.body;

  // Validation
  if (!email || !name || !password) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email, name, and password are required',
      },
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      },
    });
  }

  try {
    const { user, apiKey } = authService.register(email, name, password);

    res.status(201).json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          createdAt: user.createdAt.toISOString(),
        },
        apiKey, // Only shown once at registration
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({
      ok: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message,
      },
    });
  }
});

/**
 * POST /api/v2/auth/login
 * Login and get session token
 */
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
  }

  try {
    const { user, sessionToken } = authService.login(email, password);

    // Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          lastLogin: user.lastLogin?.toISOString(),
        },
        sessionToken, // Also return in body for SPA use
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({
      ok: false,
      error: {
        code: 'LOGIN_FAILED',
        message,
      },
    });
  }
});

// =============================================================================
// PROTECTED ROUTES
// =============================================================================

/**
 * POST /api/v2/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // Get session token from cookie or header
  const sessionToken = req.cookies?.session;

  if (sessionToken) {
    authService.logout(sessionToken);
    res.clearCookie('session');
  }

  res.json({
    ok: true,
    data: { message: 'Logged out successfully' },
  });
});

/**
 * GET /api/v2/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  res.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
      // Don't expose full API key
      hasApiKey: !!user.apiKey,
    },
  });
});

/**
 * POST /api/v2/auth/regenerate-key
 * Regenerate API key
 */
router.post('/regenerate-key', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const newKey = authService.regenerateApiKey(req.user!.id);

  if (!newKey) {
    return res.status(500).json({
      ok: false,
      error: {
        code: 'KEY_GENERATION_FAILED',
        message: 'Failed to regenerate API key',
      },
    });
  }

  res.json({
    ok: true,
    data: {
      apiKey: newKey,
      message: 'API key regenerated. The old key is now invalid.',
    },
  });
});

/**
 * GET /api/v2/auth/users
 * List all users (admin endpoint)
 */
router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // In production, check for admin role
  if (req.user!.tier !== 'enterprise') {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }

  const usersList = authService.listUsers();

  res.json({
    ok: true,
    data: usersList,
  });
});

export default router;
