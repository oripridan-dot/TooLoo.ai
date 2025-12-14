// @version 3.3.573
/**
 * @file Auth Middleware Unit Tests
 * @module tests/unit/nexus/middleware/auth
 * @version 3.3.530
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock auth service
const mockValidateAPIKey = vi.fn();
const mockCheckUsageLimits = vi.fn();
const mockRecordUsage = vi.fn();

vi.mock('../../../../src/nexus/auth/auth-service.js', () => ({
  authService: {
    validateAPIKey: mockValidateAPIKey,
    checkUsageLimits: mockCheckUsageLimits,
    recordUsage: mockRecordUsage,
  }
}));

describe('Auth Middleware', () => {
  let createAuthMiddleware: typeof import('../../../../src/nexus/middleware/auth.js').createAuthMiddleware;
  let requireAuth: typeof import('../../../../src/nexus/middleware/auth.js').requireAuth;
  let optionalAuth: typeof import('../../../../src/nexus/middleware/auth.js').optionalAuth;
  let requireScopes: typeof import('../../../../src/nexus/middleware/auth.js').requireScopes;
  let keyRateLimit: typeof import('../../../../src/nexus/middleware/auth.js').keyRateLimit;
  
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  
  beforeEach(async () => {
    vi.resetModules();
    
    const module = await import('../../../../src/nexus/middleware/auth.js');
    createAuthMiddleware = module.createAuthMiddleware;
    requireAuth = module.requireAuth;
    optionalAuth = module.optionalAuth;
    requireScopes = module.requireScopes;
    keyRateLimit = module.keyRateLimit;
    
    mockReq = {
      headers: {},
      query: {},
      path: '/test'
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    
    mockNext = vi.fn();
    
    mockValidateAPIKey.mockReset();
    mockCheckUsageLimits.mockReset();
    mockRecordUsage.mockReset();
    
    // Default mock for recordUsage to prevent unhandled promise rejection
    mockRecordUsage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Extraction', () => {
    it('should extract API key from Bearer token', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_test123' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'free' },
        key: { scopes: ['*'], rateLimit: 60, id: 'key1' }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockValidateAPIKey).toHaveBeenCalledWith('tlai_test123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract API key from X-API-Key header', async () => {
      mockReq.headers = { 'x-api-key': 'tlai_header123' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'free' },
        key: { scopes: ['*'], rateLimit: 60, id: 'key1' }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockValidateAPIKey).toHaveBeenCalledWith('tlai_header123');
    });

    it('should extract API key from query parameter', async () => {
      mockReq.query = { api_key: 'tlai_query123' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'free' },
        key: { scopes: ['*'], rateLimit: 60, id: 'key1' }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockValidateAPIKey).toHaveBeenCalledWith('tlai_query123');
    });
  });

  describe('Required Authentication', () => {
    it('should reject request without API key when required', async () => {
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Authentication required'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key when required', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_invalid' };
      mockValidateAPIKey.mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid API key'
      }));
    });

    it('should allow valid API key when required', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', email: 'test@example.com', tier: 'pro' },
        key: { id: 'key1', scopes: ['*'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).user.email).toBe('test@example.com');
      expect((mockReq as any).isAuthenticated).toBe(true);
    });
  });

  describe('Optional Authentication', () => {
    it('should allow request without API key when optional', async () => {
      const middleware = createAuthMiddleware({ required: false });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).isAuthenticated).toBe(false);
    });

    it('should attach user when valid key provided', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'free' },
        key: { scopes: ['*'], rateLimit: 60, id: 'key1' }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ required: false });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).user).toBeDefined();
      expect((mockReq as any).isAuthenticated).toBe(true);
    });

    it('should continue without user when invalid key provided', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_invalid' };
      mockValidateAPIKey.mockResolvedValue({
        success: false,
        error: 'Invalid API key'
      });
      
      const middleware = createAuthMiddleware({ required: false });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as any).isAuthenticated).toBe(false);
    });
  });

  describe('Scope Checking', () => {
    it('should allow wildcard scope', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'pro' },
        key: { id: 'key1', scopes: ['*'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ 
        required: true, 
        scopes: ['projects:read', 'chat:write'] 
      });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when missing required scope', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'pro' },
        key: { id: 'key1', scopes: ['projects:read'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ 
        required: true, 
        scopes: ['admin:delete'] 
      });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Insufficient permissions'
      }));
    });

    it('should allow matching scope', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'pro' },
        key: { id: 'key1', scopes: ['projects:read', 'chat:write'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      
      const middleware = createAuthMiddleware({ 
        required: true, 
        scopes: ['projects:read'] 
      });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Usage Limits', () => {
    it('should reject when usage limit exceeded', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user1', tier: 'free' },
        key: { id: 'key1', scopes: ['*'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ 
        allowed: false, 
        reason: 'Daily request limit reached' 
      });
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Rate limit exceeded'
      }));
    });

    it('should record usage on successful auth', async () => {
      mockReq.headers = { authorization: 'Bearer tlai_valid' };
      mockValidateAPIKey.mockResolvedValue({
        success: true,
        user: { id: 'user123', tier: 'pro' },
        key: { id: 'key1', scopes: ['*'], rateLimit: 60 }
      });
      mockCheckUsageLimits.mockResolvedValue({ allowed: true });
      mockRecordUsage.mockResolvedValue(undefined);
      
      const middleware = createAuthMiddleware({ required: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Wait for async recordUsage call
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockRecordUsage).toHaveBeenCalledWith('user123');
    });
  });

  describe('Skip Paths', () => {
    it('should skip auth for specified paths', async () => {
      mockReq.path = '/health';
      
      const middleware = createAuthMiddleware({ 
        required: true, 
        skipPaths: ['/health', '/status'] 
      });
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockValidateAPIKey).not.toHaveBeenCalled();
    });
  });

  describe('Pre-configured Middleware', () => {
    it('requireAuth should be pre-configured', () => {
      expect(requireAuth).toBeDefined();
      expect(typeof requireAuth).toBe('function');
    });

    it('optionalAuth should be pre-configured', () => {
      expect(optionalAuth).toBeDefined();
      expect(typeof optionalAuth).toBe('function');
    });

    it('requireScopes should return middleware', () => {
      const middleware = requireScopes('admin:read', 'admin:write');
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Rate Limiting', () => {
    it('should set rate limit headers', async () => {
      mockReq.apiKey = { id: 'key1', rateLimit: 100 } as any;
      
      const middleware = keyRateLimit();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip rate limiting without API key', async () => {
      const middleware = keyRateLimit();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });
});
