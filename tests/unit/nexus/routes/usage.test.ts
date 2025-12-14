// @version 3.3.573
/**
 * @file Usage Routes Unit Tests
 * @module tests/unit/nexus/routes/usage
 * @version 3.3.530
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Mock auth service
const mockAuthService = {
  getUserUsageStats: vi.fn(),
  getTierLimits: vi.fn(),
  listUserAPIKeys: vi.fn(),
  checkUsageLimits: vi.fn(),
};

vi.mock('../../../../src/nexus/auth/auth-service.js', () => ({
  authService: mockAuthService
}));

// Mock auth middleware
vi.mock('../../../../src/nexus/middleware/auth.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { 
      id: 'test-user', 
      email: 'test@example.com', 
      tier: 'pro', 
      apiKeys: [],
      usage: {
        requestsToday: 50,
        requestsThisMonth: 500,
        tokensUsedToday: 25000,
        tokensUsedThisMonth: 250000,
        lastResetDate: '2025-01-01'
      }
    };
    req.isAuthenticated = true;
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => next(),
}));

// Mock fs-manager
vi.mock('../../../../src/core/fs-manager.js', () => ({
  fsManager: {
    readJSON: vi.fn().mockResolvedValue(null),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
}));

// Mock metrics collector
vi.mock('../../../../src/core/metrics-collector.js', () => ({
  metricsCollector: {
    getMetrics: vi.fn().mockReturnValue({})
  }
}));

describe('Usage Routes', () => {
  let app: Express;
  
  beforeEach(async () => {
    vi.resetModules();
    
    app = express();
    app.use(express.json());
    
    const { default: usageRoutes } = await import('../../../../src/nexus/routes/usage.js');
    app.use('/api/v1/usage', usageRoutes);
    
    // Reset mocks
    Object.values(mockAuthService).forEach(fn => fn.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/usage/dashboard', () => {
    it('should return dashboard data for authenticated user', async () => {
      mockAuthService.getUserUsageStats.mockReturnValue({
        requestsToday: 50,
        tokensUsedToday: 25000
      });
      mockAuthService.getTierLimits.mockReturnValue({
        requestsPerDay: 1000,
        tokensPerDay: 500000,
        apiKeys: 10
      });
      mockAuthService.listUserAPIKeys.mockResolvedValue([
        { id: 'key1', name: 'Key 1' },
        { id: 'key2', name: 'Key 2' }
      ]);

      const response = await request(app)
        .get('/api/v1/usage/dashboard')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.user.tier).toBe('pro');
      expect(response.body.dashboard.percentUsed.requests).toBe(5);
    });
  });

  describe('GET /api/v1/usage/summary', () => {
    it('should return quick usage summary', async () => {
      mockAuthService.getUserUsageStats.mockReturnValue({
        requestsToday: 100,
        tokensUsedToday: 50000
      });
      mockAuthService.getTierLimits.mockReturnValue({
        requestsPerDay: 1000,
        tokensPerDay: 500000
      });

      const response = await request(app)
        .get('/api/v1/usage/summary')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.requests.used).toBe(100);
      expect(response.body.requests.limit).toBe(1000);
      expect(response.body.requests.percent).toBe(10);
      expect(response.body.tokens.percent).toBe(10);
    });
  });

  describe('GET /api/v1/usage/history', () => {
    it('should return usage history', async () => {
      const response = await request(app)
        .get('/api/v1/usage/history')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.days).toBe(7);
      expect(response.body.history).toHaveLength(7);
    });

    it('should accept days parameter', async () => {
      const response = await request(app)
        .get('/api/v1/usage/history?days=14')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.days).toBe(14);
      expect(response.body.history).toHaveLength(14);
    });

    it('should cap days at 30', async () => {
      const response = await request(app)
        .get('/api/v1/usage/history?days=100')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.days).toBe(30);
    });
  });

  describe('GET /api/v1/usage/tiers', () => {
    it('should return tier information (public endpoint)', async () => {
      mockAuthService.getTierLimits.mockImplementation((tier: string) => {
        const limits: Record<string, any> = {
          free: { requestsPerDay: 100, tokensPerDay: 50000, apiKeys: 2 },
          pro: { requestsPerDay: 1000, tokensPerDay: 500000, apiKeys: 10 },
          enterprise: { requestsPerDay: 10000, tokensPerDay: 5000000, apiKeys: 50 }
        };
        return limits[tier];
      });

      const response = await request(app).get('/api/v1/usage/tiers');

      expect(response.status).toBe(200);
      expect(response.body.tiers).toHaveLength(3);
      expect(response.body.tiers[0].id).toBe('free');
      expect(response.body.tiers[1].id).toBe('pro');
      expect(response.body.tiers[2].id).toBe('enterprise');
      expect(response.body.tiers[0].price).toBe(0);
      expect(response.body.tiers[1].price).toBe(29);
    });
  });

  describe('GET /api/v1/usage/keys', () => {
    it('should return API key analytics', async () => {
      mockAuthService.listUserAPIKeys.mockResolvedValue([
        { id: 'key1', name: 'Production', active: true, usageCount: 100, lastUsedAt: new Date().toISOString() },
        { id: 'key2', name: 'Development', active: true, usageCount: 50, lastUsedAt: null },
        { id: 'key3', name: 'Old Key', active: false, usageCount: 10, lastUsedAt: null },
      ]);

      const response = await request(app)
        .get('/api/v1/usage/keys')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.totalKeys).toBe(3);
      expect(response.body.activeKeys).toBe(2);
      expect(response.body.totalUsage).toBe(160);
      // Should be sorted by usage count descending
      expect(response.body.keys[0].name).toBe('Production');
    });
  });

  describe('GET /api/v1/usage/status', () => {
    it('should return system status (public endpoint)', async () => {
      const response = await request(app).get('/api/v1/usage/status');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('operational');
      expect(response.body.version).toBe('3.3.530');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.api).toBe('operational');
    });
  });

  describe('GET /api/v1/usage/quota', () => {
    it('should return quota status when allowed', async () => {
      mockAuthService.checkUsageLimits.mockResolvedValue({ allowed: true });
      mockAuthService.getUserUsageStats.mockReturnValue({
        requestsToday: 100,
        tokensUsedToday: 50000
      });
      mockAuthService.getTierLimits.mockReturnValue({
        requestsPerDay: 1000,
        tokensPerDay: 500000
      });

      const response = await request(app)
        .get('/api/v1/usage/quota')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(true);
      expect(response.body.remaining.requests).toBe(900);
      expect(response.body.remaining.tokens).toBe(450000);
    });

    it('should return quota status when exceeded', async () => {
      mockAuthService.checkUsageLimits.mockResolvedValue({ 
        allowed: false, 
        reason: 'Daily request limit reached' 
      });
      mockAuthService.getUserUsageStats.mockReturnValue({
        requestsToday: 1000,
        tokensUsedToday: 50000
      });
      mockAuthService.getTierLimits.mockReturnValue({
        requestsPerDay: 1000,
        tokensPerDay: 500000
      });

      const response = await request(app)
        .get('/api/v1/usage/quota')
        .set('Authorization', 'Bearer test-key');

      expect(response.status).toBe(200);
      expect(response.body.allowed).toBe(false);
      expect(response.body.reason).toMatch(/limit reached/);
      expect(response.body.remaining.requests).toBe(0);
    });
  });
});
