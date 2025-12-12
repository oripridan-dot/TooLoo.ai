/**
 * @file Auth Service Unit Tests
 * @module tests/unit/nexus/auth
 * @version 3.3.530
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fs-manager before imports
vi.mock('../../../../src/core/fs-manager.js', () => ({
  fsManager: {
    readJSON: vi.fn().mockResolvedValue(null),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  },
  smartFS: {
    readJSON: vi.fn().mockResolvedValue(null),
    writeJSON: vi.fn().mockResolvedValue(undefined),
  },
  default: {
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

describe('Auth Service', () => {
  let authService: typeof import('../../../../src/nexus/auth/auth-service.js').authService;
  
  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../../src/nexus/auth/auth-service.js');
    authService = module.authService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Management', () => {
    it('should create a new user', async () => {
      const user = await authService.createUser('test@example.com', 'Test User', 'free');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.tier).toBe('free');
      expect(user.id).toMatch(/^user_[a-f0-9]+$/);
      expect(user.apiKeys).toEqual([]);
      expect(user.usage).toBeDefined();
    });

    it('should prevent duplicate emails', async () => {
      await authService.createUser('dup@example.com', 'First User');
      
      await expect(
        authService.createUser('dup@example.com', 'Second User')
      ).rejects.toThrow(/already exists/);
    });

    it('should get user by ID', async () => {
      const created = await authService.createUser('get@example.com', 'Get User');
      const fetched = await authService.getUser(created.id);
      
      expect(fetched).toBeDefined();
      expect(fetched?.email).toBe('get@example.com');
    });

    it('should get user by email', async () => {
      await authService.createUser('byemail@example.com', 'Email User');
      const fetched = await authService.getUserByEmail('byemail@example.com');
      
      expect(fetched).toBeDefined();
      expect(fetched?.name).toBe('Email User');
    });

    it('should update user', async () => {
      const user = await authService.createUser('update@example.com', 'Original Name');
      const updated = await authService.updateUser(user.id, { name: 'New Name' });
      
      expect(updated?.name).toBe('New Name');
    });

    it('should list all users', async () => {
      await authService.createUser('list1@example.com', 'User 1');
      await authService.createUser('list2@example.com', 'User 2');
      
      const users = await authService.listUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);
    });

    it('should default to free tier', async () => {
      const user = await authService.createUser('freetier@example.com', 'Free User');
      expect(user.tier).toBe('free');
    });

    it('should support different tiers', async () => {
      const proUser = await authService.createUser('pro@example.com', 'Pro User', 'pro');
      const enterpriseUser = await authService.createUser('ent@example.com', 'Enterprise User', 'enterprise');
      
      expect(proUser.tier).toBe('pro');
      expect(enterpriseUser.tier).toBe('enterprise');
    });
  });

  describe('API Key Generation', () => {
    it('should generate an API key', async () => {
      const user = await authService.createUser('keygen@example.com', 'Key Gen User');
      const result = await authService.generateAPIKey(user.id, 'Test Key');
      
      expect(result.success).toBe(true);
      expect(result.key).toMatch(/^tlai_[A-Za-z0-9_-]+$/);
      expect(result.keyId).toBeDefined();
    });

    it('should reject key generation for non-existent user', async () => {
      const result = await authService.generateAPIKey('fake-user-id', 'Test Key');
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
    });

    it('should enforce tier API key limits', async () => {
      const user = await authService.createUser('keylimit@example.com', 'Key Limit User', 'free');
      
      // Free tier allows 2 keys
      await authService.generateAPIKey(user.id, 'Key 1');
      await authService.generateAPIKey(user.id, 'Key 2');
      const result = await authService.generateAPIKey(user.id, 'Key 3');
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/limit reached/);
    });

    it('should support custom scopes', async () => {
      const user = await authService.createUser('scopes@example.com', 'Scoped User');
      const result = await authService.generateAPIKey(user.id, 'Scoped Key', {
        scopes: ['projects:read', 'chat:write']
      });
      
      expect(result.success).toBe(true);
    });

    it('should support key expiration', async () => {
      const user = await authService.createUser('expiring@example.com', 'Expiring User');
      const result = await authService.generateAPIKey(user.id, 'Expiring Key', {
        expiresInDays: 30
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('API Key Validation', () => {
    it('should validate a valid API key', async () => {
      const user = await authService.createUser('validate@example.com', 'Validate User');
      const generated = await authService.generateAPIKey(user.id, 'Valid Key');
      
      const result = await authService.validateAPIKey(generated.key!);
      
      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('validate@example.com');
    });

    it('should reject invalid key format', async () => {
      const result = await authService.validateAPIKey('not-a-valid-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid API key format/);
    });

    it('should reject unknown keys', async () => {
      const result = await authService.validateAPIKey('tlai_fakekey123456789012345678901234');
      
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid API key/);
    });

    it('should reject deactivated keys', async () => {
      const user = await authService.createUser('deactivate@example.com', 'Deactivate User');
      const generated = await authService.generateAPIKey(user.id, 'To Deactivate');
      
      await authService.deactivateAPIKey(user.id, generated.keyId!);
      
      const result = await authService.validateAPIKey(generated.key!);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/deactivated/);
    });

    it('should increment usage count on validation', async () => {
      const user = await authService.createUser('usagecount@example.com', 'Usage User');
      const generated = await authService.generateAPIKey(user.id, 'Usage Key');
      
      await authService.validateAPIKey(generated.key!);
      await authService.validateAPIKey(generated.key!);
      
      const keys = await authService.listUserAPIKeys(user.id);
      expect(keys[0].usageCount).toBe(2);
    });
  });

  describe('API Key Management', () => {
    it('should list user API keys without exposing hashes', async () => {
      const user = await authService.createUser('listkeys@example.com', 'List Keys User');
      await authService.generateAPIKey(user.id, 'Key A');
      await authService.generateAPIKey(user.id, 'Key B');
      
      const keys = await authService.listUserAPIKeys(user.id);
      
      expect(keys.length).toBe(2);
      expect(keys[0]).not.toHaveProperty('hashedKey');
    });

    it('should revoke API keys', async () => {
      const user = await authService.createUser('revoke@example.com', 'Revoke User');
      const generated = await authService.generateAPIKey(user.id, 'To Revoke');
      
      const success = await authService.revokeAPIKey(user.id, generated.keyId!);
      expect(success).toBe(true);
      
      const keys = await authService.listUserAPIKeys(user.id);
      expect(keys.length).toBe(0);
    });

    it('should deactivate and reactivate keys', async () => {
      const user = await authService.createUser('toggle@example.com', 'Toggle User');
      const generated = await authService.generateAPIKey(user.id, 'Toggle Key');
      
      // Deactivate
      await authService.deactivateAPIKey(user.id, generated.keyId!);
      let keys = await authService.listUserAPIKeys(user.id);
      expect(keys[0].active).toBe(false);
      
      // Reactivate
      await authService.reactivateAPIKey(user.id, generated.keyId!);
      keys = await authService.listUserAPIKeys(user.id);
      expect(keys[0].active).toBe(true);
    });

    it('should prevent revoking other users keys', async () => {
      const user1 = await authService.createUser('owner@example.com', 'Owner');
      const user2 = await authService.createUser('attacker@example.com', 'Attacker');
      
      const generated = await authService.generateAPIKey(user1.id, 'Owner Key');
      
      const success = await authService.revokeAPIKey(user2.id, generated.keyId!);
      expect(success).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    it('should record usage', async () => {
      const user = await authService.createUser('usage@example.com', 'Usage User');
      
      await authService.recordUsage(user.id, 1000);
      await authService.recordUsage(user.id, 500);
      
      const stats = authService.getUserUsageStats(user.id);
      expect(stats?.requestsToday).toBe(2);
      expect(stats?.tokensUsedToday).toBe(1500);
    });

    it('should check usage limits', async () => {
      const user = await authService.createUser('limits@example.com', 'Limits User', 'free');
      
      // Under limit
      let check = await authService.checkUsageLimits(user.id);
      expect(check.allowed).toBe(true);
    });

    it('should return tier limits', () => {
      const freeLimits = authService.getTierLimits('free');
      const proLimits = authService.getTierLimits('pro');
      const enterpriseLimits = authService.getTierLimits('enterprise');
      
      expect(freeLimits.requestsPerDay).toBeLessThan(proLimits.requestsPerDay);
      expect(proLimits.requestsPerDay).toBeLessThan(enterpriseLimits.requestsPerDay);
    });
  });
});
