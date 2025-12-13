/**
 * @tooloo/api - Authentication Middleware & Service
 * JWT-based authentication for V2 API
 *
 * @version 2.0.0-alpha.0
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  apiKey?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  apiKey?: string;
}

// =============================================================================
// IN-MEMORY USER STORE (Replace with DB in production)
// =============================================================================

const users = new Map<string, User>();
const apiKeys = new Map<string, string>(); // apiKey -> userId
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

// Create a default test user
const testUser: User = {
  id: 'user_test_001',
  email: 'test@tooloo.ai',
  name: 'Test User',
  tier: 'pro',
  apiKey: 'tlai_pro_test123456789',
  createdAt: new Date(),
};
users.set(testUser.id, testUser);
apiKeys.set(testUser.apiKey!, testUser.id);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a random API key with prefix
 */
function generateApiKey(tier: 'free' | 'pro' | 'enterprise' = 'free'): string {
  const prefix =
    tier === 'enterprise' ? 'tlai_ent_' : tier === 'pro' ? 'tlai_pro_' : 'tlai_';
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

/**
 * Generate a session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a password (simple for demo - use bcrypt in production)
 * @internal Reserved for production implementation
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// =============================================================================
// AUTHENTICATION SERVICE
// =============================================================================

export const authService = {
  /**
   * Register a new user
   */
  register(
    email: string,
    name: string,
    _password: string,
    tier: 'free' | 'pro' | 'enterprise' = 'free'
  ): { user: User; apiKey: string } {
    // Check if email already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
    const apiKey = generateApiKey(tier);

    const user: User = {
      id: userId,
      email,
      name,
      tier,
      apiKey,
      createdAt: new Date(),
    };

    users.set(userId, user);
    apiKeys.set(apiKey, userId);

    return { user, apiKey };
  },

  /**
   * Login and create session
   */
  login(email: string, _password: string): { user: User; sessionToken: string } {
    // Find user by email
    const foundUser = Array.from(users.values()).find(u => u.email === email);

    if (!foundUser) {
      throw new Error('Invalid credentials');
    }

    // In production, verify password with bcrypt
    // For demo, just create session

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    sessions.set(sessionToken, { userId: foundUser.id, expiresAt });

    // Update last login
    foundUser.lastLogin = new Date();

    return { user: foundUser, sessionToken };
  },

  /**
   * Logout and invalidate session
   */
  logout(sessionToken: string): boolean {
    return sessions.delete(sessionToken);
  },

  /**
   * Get user by session token
   */
  getUserBySession(sessionToken: string): User | undefined {
    const session = sessions.get(sessionToken);
    if (!session) return undefined;

    // Check expiration
    if (session.expiresAt < new Date()) {
      sessions.delete(sessionToken);
      return undefined;
    }

    return users.get(session.userId);
  },

  /**
   * Get user by API key
   */
  getUserByApiKey(apiKey: string): User | undefined {
    const userId = apiKeys.get(apiKey);
    if (!userId) return undefined;
    return users.get(userId);
  },

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | undefined {
    return users.get(userId);
  },

  /**
   * Regenerate API key for user
   */
  regenerateApiKey(userId: string): string | undefined {
    const user = users.get(userId);
    if (!user) return undefined;

    // Remove old key
    if (user.apiKey) {
      apiKeys.delete(user.apiKey);
    }

    // Generate new key
    const newKey = generateApiKey(user.tier);
    user.apiKey = newKey;
    apiKeys.set(newKey, userId);

    return newKey;
  },

  /**
   * List all users (admin only)
   */
  listUsers(): User[] {
    return Array.from(users.values()).map(u => ({
      ...u,
      apiKey: u.apiKey ? `${u.apiKey.slice(0, 12)}...` : undefined, // Mask API key
    }));
  },
};

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Extract authentication from request
 */
function extractAuth(req: Request): { type: 'apiKey' | 'session'; value: string } | null {
  // Check Authorization header for Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Check if it's an API key or session token
    if (token.startsWith('tlai_')) {
      return { type: 'apiKey', value: token };
    }
    return { type: 'session', value: token };
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return { type: 'apiKey', value: apiKeyHeader };
  }

  // Check cookies for session
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    return { type: 'session', value: sessionCookie };
  }

  return null;
}

/**
 * Authentication middleware - optional auth
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const auth = extractAuth(req);

  if (auth) {
    if (auth.type === 'apiKey') {
      const user = authService.getUserByApiKey(auth.value);
      if (user) {
        req.user = user;
        req.apiKey = auth.value;
      }
    } else {
      const user = authService.getUserBySession(auth.value);
      if (user) {
        req.user = user;
      }
    }
  }

  next();
}

/**
 * Authentication middleware - required auth
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const auth = extractAuth(req);

  if (!auth) {
    res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  let user: User | undefined;

  if (auth.type === 'apiKey') {
    user = authService.getUserByApiKey(auth.value);
    if (user) {
      req.apiKey = auth.value;
    }
  } else {
    user = authService.getUserBySession(auth.value);
  }

  if (!user) {
    res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_AUTH',
        message: 'Invalid or expired authentication',
      },
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Require specific tier
 */
export function requireTier(...tiers: Array<'free' | 'pro' | 'enterprise'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!tiers.includes(req.user.tier)) {
      res.status(403).json({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: `This endpoint requires ${tiers.join(' or ')} tier`,
        },
      });
      return;
    }

    next();
  };
}
