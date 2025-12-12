// @version 3.3.530
/**
 * @file Auth Service - API Key Authentication & User Session Management
 * @module nexus/auth
 * @version 3.3.530
 * 
 * Simple API key-based authentication for TooLoo.ai users.
 * Supports key generation, validation, and usage tracking.
 */

import { randomBytes, createHash } from 'crypto';
import { bus } from '../../core/event-bus.js';
import { fsManager } from '../../core/fs-manager.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface APIKey {
  /** Unique key ID (prefix of the full key) */
  id: string;
  /** Hashed API key (never store plaintext) */
  hashedKey: string;
  /** User ID this key belongs to */
  userId: string;
  /** Human-friendly name for this key */
  name: string;
  /** Key creation timestamp */
  createdAt: string;
  /** Last usage timestamp */
  lastUsedAt: string | null;
  /** Key expiration (null = never) */
  expiresAt: string | null;
  /** Usage count */
  usageCount: number;
  /** Rate limit per minute */
  rateLimit: number;
  /** Scopes/permissions */
  scopes: string[];
  /** Is this key active? */
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  apiKeys: string[]; // Key IDs only
  usage: UserUsage;
  preferences: Record<string, unknown>;
}

export interface UserUsage {
  requestsToday: number;
  requestsThisMonth: number;
  tokensUsedToday: number;
  tokensUsedThisMonth: number;
  lastResetDate: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  key?: APIKey;
  error?: string;
}

export interface KeyGenerationResult {
  success: boolean;
  key?: string; // Full plaintext key (only returned once!)
  keyId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DATA_DIR = 'data';
const USERS_FILE = 'users.json';
const API_KEYS_FILE = 'api-keys.json';

const TIER_LIMITS = {
  free: { requestsPerDay: 100, tokensPerDay: 50000, apiKeys: 2 },
  pro: { requestsPerDay: 1000, tokensPerDay: 500000, apiKeys: 10 },
  enterprise: { requestsPerDay: 10000, tokensPerDay: 5000000, apiKeys: 50 }
};

const DEFAULT_RATE_LIMIT = 60; // requests per minute
const KEY_PREFIX = 'tlai_'; // TooLoo AI

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────────────────

class AuthService {
  private users: Map<string, User> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private keyHashIndex: Map<string, string> = new Map(); // hash -> keyId
  private initialized = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadUsers();
      await this.loadAPIKeys();
      this.initialized = true;
      console.log(`[AuthService] Initialized with ${this.users.size} users, ${this.apiKeys.size} API keys`);
    } catch (error) {
      console.error('[AuthService] Initialization error:', error);
      // Initialize with empty state
      this.users = new Map();
      this.apiKeys = new Map();
      this.keyHashIndex = new Map();
      this.initialized = true;
    }
  }

  private async loadUsers(): Promise<void> {
    const data = await fsManager.readJSON<{ users: User[] }>(DATA_DIR, USERS_FILE);
    if (data?.users) {
      for (const user of data.users) {
        this.users.set(user.id, user);
      }
    }
  }

  private async loadAPIKeys(): Promise<void> {
    const data = await fsManager.readJSON<{ keys: APIKey[] }>(DATA_DIR, API_KEYS_FILE);
    if (data?.keys) {
      for (const key of data.keys) {
        this.apiKeys.set(key.id, key);
        this.keyHashIndex.set(key.hashedKey, key.id);
      }
    }
  }

  private async saveUsers(): Promise<void> {
    await fsManager.writeJSON(DATA_DIR, USERS_FILE, {
      users: Array.from(this.users.values()),
      lastUpdated: new Date().toISOString()
    });
  }

  private async saveAPIKeys(): Promise<void> {
    await fsManager.writeJSON(DATA_DIR, API_KEYS_FILE, {
      keys: Array.from(this.apiKeys.values()),
      lastUpdated: new Date().toISOString()
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Key Generation & Hashing
  // ─────────────────────────────────────────────────────────────────────────

  private generateKey(): string {
    const randomPart = randomBytes(24).toString('base64url');
    return `${KEY_PREFIX}${randomPart}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private extractKeyId(key: string): string {
    // Use first 8 chars after prefix as ID
    return key.slice(KEY_PREFIX.length, KEY_PREFIX.length + 8);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User Management
  // ─────────────────────────────────────────────────────────────────────────

  async createUser(email: string, name: string, tier: User['tier'] = 'free'): Promise<User> {
    await this.initialize();

    // Check if user already exists
    const existing = Array.from(this.users.values()).find(u => u.email === email);
    if (existing) {
      throw new Error(`User with email ${email} already exists`);
    }

    const userId = `user_${randomBytes(8).toString('hex')}`;
    const user: User = {
      id: userId,
      email,
      name,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      tier,
      apiKeys: [],
      usage: {
        requestsToday: 0,
        requestsThisMonth: 0,
        tokensUsedToday: 0,
        tokensUsedThisMonth: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      preferences: {}
    };

    this.users.set(userId, user);
    await this.saveUsers();

    bus.publish('auth', 'user:created', { userId, email });
    console.log(`[AuthService] Created user: ${email}`);

    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    await this.initialize();
    return this.users.get(userId) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.initialize();
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  async updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'tier' | 'preferences'>>): Promise<User | null> {
    await this.initialize();
    
    const user = this.users.get(userId);
    if (!user) return null;

    if (updates.name) user.name = updates.name;
    if (updates.tier) user.tier = updates.tier;
    if (updates.preferences) user.preferences = { ...user.preferences, ...updates.preferences };

    await this.saveUsers();
    return user;
  }

  async listUsers(): Promise<User[]> {
    await this.initialize();
    return Array.from(this.users.values());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API Key Management
  // ─────────────────────────────────────────────────────────────────────────

  async generateAPIKey(
    userId: string,
    name: string,
    options: { scopes?: string[]; expiresInDays?: number; rateLimit?: number } = {}
  ): Promise<KeyGenerationResult> {
    await this.initialize();

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check tier limits
    const limits = TIER_LIMITS[user.tier];
    if (user.apiKeys.length >= limits.apiKeys) {
      return { success: false, error: `API key limit reached for ${user.tier} tier (max ${limits.apiKeys})` };
    }

    // Generate key
    const plainKey = this.generateKey();
    const keyId = this.extractKeyId(plainKey);
    const hashedKey = this.hashKey(plainKey);

    const apiKey: APIKey = {
      id: keyId,
      hashedKey,
      userId,
      name,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: options.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      usageCount: 0,
      rateLimit: options.rateLimit || DEFAULT_RATE_LIMIT,
      scopes: options.scopes || ['*'],
      active: true
    };

    this.apiKeys.set(keyId, apiKey);
    this.keyHashIndex.set(hashedKey, keyId);
    user.apiKeys.push(keyId);

    await Promise.all([this.saveAPIKeys(), this.saveUsers()]);

    bus.publish('auth', 'apikey:created', { userId, keyId, name });
    console.log(`[AuthService] Created API key '${name}' for user ${userId}`);

    return { success: true, key: plainKey, keyId };
  }

  async validateAPIKey(key: string): Promise<AuthResult> {
    await this.initialize();

    if (!key || !key.startsWith(KEY_PREFIX)) {
      return { success: false, error: 'Invalid API key format' };
    }

    const hashedKey = this.hashKey(key);
    const keyId = this.keyHashIndex.get(hashedKey);

    if (!keyId) {
      return { success: false, error: 'Invalid API key' };
    }

    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      return { success: false, error: 'API key not found' };
    }

    // Check if key is active
    if (!apiKey.active) {
      return { success: false, error: 'API key is deactivated' };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return { success: false, error: 'API key has expired' };
    }

    // Get user
    const user = this.users.get(apiKey.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Update usage stats
    apiKey.lastUsedAt = new Date().toISOString();
    apiKey.usageCount++;
    await this.saveAPIKeys();

    return { success: true, user, key: apiKey };
  }

  async revokeAPIKey(userId: string, keyId: string): Promise<boolean> {
    await this.initialize();

    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      return false;
    }

    const user = this.users.get(userId);
    if (user) {
      user.apiKeys = user.apiKeys.filter(k => k !== keyId);
    }

    this.keyHashIndex.delete(apiKey.hashedKey);
    this.apiKeys.delete(keyId);

    await Promise.all([this.saveAPIKeys(), this.saveUsers()]);

    bus.publish('auth', 'apikey:revoked', { userId, keyId });
    console.log(`[AuthService] Revoked API key ${keyId} for user ${userId}`);

    return true;
  }

  async listUserAPIKeys(userId: string): Promise<Omit<APIKey, 'hashedKey'>[]> {
    await this.initialize();

    const user = this.users.get(userId);
    if (!user) return [];

    return user.apiKeys
      .map(keyId => this.apiKeys.get(keyId))
      .filter((key): key is APIKey => key !== undefined)
      .map(({ hashedKey, ...rest }) => rest); // Never expose hashed keys
  }

  async deactivateAPIKey(userId: string, keyId: string): Promise<boolean> {
    await this.initialize();

    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      return false;
    }

    apiKey.active = false;
    await this.saveAPIKeys();

    bus.publish('auth', 'apikey:deactivated', { userId, keyId });
    return true;
  }

  async reactivateAPIKey(userId: string, keyId: string): Promise<boolean> {
    await this.initialize();

    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      return false;
    }

    apiKey.active = true;
    await this.saveAPIKeys();

    bus.publish('auth', 'apikey:reactivated', { userId, keyId });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Usage Tracking
  // ─────────────────────────────────────────────────────────────────────────

  async recordUsage(userId: string, tokens: number = 0): Promise<void> {
    await this.initialize();

    const user = this.users.get(userId);
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Reset daily counters if new day
    if (user.usage.lastResetDate !== today) {
      user.usage.requestsToday = 0;
      user.usage.tokensUsedToday = 0;
      user.usage.lastResetDate = today;

      // Check for month reset
      const lastReset = new Date(user.usage.lastResetDate);
      const now = new Date();
      if (lastReset.getMonth() !== now.getMonth()) {
        user.usage.requestsThisMonth = 0;
        user.usage.tokensUsedThisMonth = 0;
      }
    }

    user.usage.requestsToday++;
    user.usage.requestsThisMonth++;
    user.usage.tokensUsedToday += tokens;
    user.usage.tokensUsedThisMonth += tokens;

    await this.saveUsers();
  }

  async checkUsageLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    await this.initialize();

    const user = this.users.get(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const limits = TIER_LIMITS[user.tier];
    
    if (user.usage.requestsToday >= limits.requestsPerDay) {
      return { allowed: false, reason: `Daily request limit reached (${limits.requestsPerDay})` };
    }

    if (user.usage.tokensUsedToday >= limits.tokensPerDay) {
      return { allowed: false, reason: `Daily token limit reached (${limits.tokensPerDay})` };
    }

    return { allowed: true };
  }

  getUserUsageStats(userId: string): UserUsage | null {
    const user = this.users.get(userId);
    return user?.usage || null;
  }

  getTierLimits(tier: User['tier']) {
    return TIER_LIMITS[tier];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const authService = new AuthService();
export default authService;
