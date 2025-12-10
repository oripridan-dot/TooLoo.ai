// @version 3.3.350
/**
 * Encryption Manager - Security Hardening Layer
 *
 * Provides encryption services for sensitive data:
 * - API key storage and retrieval
 * - Secure configuration management
 * - Data-at-rest encryption
 * - Key derivation and rotation
 *
 * Part of PHASE 2: Security Hardening
 * @module core/security/encryption-manager
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { bus } from '../event-bus.js';

// ============================================================================
// TYPES
// ============================================================================

export interface EncryptedData {
  iv: string;
  authTag: string;
  data: string;
  algorithm: string;
  keyId: string;
}

export interface SecureConfig {
  apiKeys: Record<string, EncryptedData>;
  secrets: Record<string, EncryptedData>;
  metadata: {
    version: string;
    createdAt: string;
    lastModified: string;
    keyRotatedAt?: string;
  };
}

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  iterations?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_LENGTH = 32; // 256 bits
const DEFAULT_IV_LENGTH = 16; // 128 bits
const DEFAULT_SALT_LENGTH = 32;
const DEFAULT_ITERATIONS = 100000;
const SECURE_CONFIG_FILE = 'secure-config.enc.json';

// ============================================================================
// ENCRYPTION MANAGER CLASS
// ============================================================================

export class EncryptionManager {
  private masterKey: Buffer | null = null;
  private keyId: string = '';
  private configPath: string;
  private secureConfig: SecureConfig | null = null;
  private options: Required<EncryptionOptions>;

  constructor(dataDir?: string, options?: EncryptionOptions) {
    this.configPath = path.join(dataDir || process.cwd(), 'data', SECURE_CONFIG_FILE);
    this.options = {
      algorithm: options?.algorithm || DEFAULT_ALGORITHM,
      keyLength: options?.keyLength || DEFAULT_KEY_LENGTH,
      ivLength: options?.ivLength || DEFAULT_IV_LENGTH,
      saltLength: options?.saltLength || DEFAULT_SALT_LENGTH,
      iterations: options?.iterations || DEFAULT_ITERATIONS,
    };
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize encryption with master key
   * Key can come from:
   * 1. ENCRYPTION_KEY environment variable
   * 2. Derived from ENCRYPTION_PASSWORD + ENCRYPTION_SALT
   * 3. Auto-generated (development only)
   */
  async initialize(): Promise<boolean> {
    try {
      // Try environment key first
      const envKey = process.env['ENCRYPTION_KEY'];
      if (envKey) {
        this.masterKey = Buffer.from(envKey, 'hex');
        this.keyId = this.generateKeyId(this.masterKey);
        console.log('[EncryptionManager] ✓ Initialized with environment key');
        await this.loadSecureConfig();
        return true;
      }

      // Try password-based derivation
      const password = process.env['ENCRYPTION_PASSWORD'];
      const salt = process.env['ENCRYPTION_SALT'];
      if (password && salt) {
        this.masterKey = this.deriveKey(password, Buffer.from(salt, 'hex'));
        this.keyId = this.generateKeyId(this.masterKey);
        console.log('[EncryptionManager] ✓ Initialized with derived key');
        await this.loadSecureConfig();
        return true;
      }

      // Development: auto-generate key (silent in dev, warn in staging)
      if (process.env['NODE_ENV'] !== 'production') {
        // Silent in pure development
        const isQuietDev = !process.env['ENCRYPTION_KEY'] && process.env['NODE_ENV'] !== 'staging';
        if (!isQuietDev) {
          console.warn('[EncryptionManager] ⚠ No encryption key configured, generating ephemeral key');
        }
        this.masterKey = crypto.randomBytes(this.options.keyLength);
        this.keyId = this.generateKeyId(this.masterKey);
        
        // Only log DEV KEY if explicitly requested
        if (process.env['DEBUG_ENCRYPTION']) {
          console.log(`[EncryptionManager] DEV KEY: ${this.masterKey.toString('hex')}`);
        }
        
        this.secureConfig = this.createEmptyConfig();
        return true;
      }

      console.error('[EncryptionManager] ✗ No encryption key available in production');
      return false;

    } catch (error: any) {
      console.error(`[EncryptionManager] Initialization failed: ${error.message}`);
      return false;
    }
  }

  private generateKeyId(key: Buffer): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);
  }

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.options.iterations,
      this.options.keyLength,
      'sha512'
    );
  }

  private createEmptyConfig(): SecureConfig {
    return {
      apiKeys: {},
      secrets: {},
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };
  }

  // ===========================================================================
  // Core Encryption/Decryption
  // ===========================================================================

  /**
   * Encrypt plaintext data
   */
  encrypt(plaintext: string): EncryptedData {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    const iv = crypto.randomBytes(this.options.ivLength);
    const cipher = crypto.createCipheriv(this.options.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as crypto.CipherGCM).getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
      algorithm: this.options.algorithm,
      keyId: this.keyId,
    };
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(encrypted: EncryptedData): string {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    // Verify key ID matches
    if (encrypted.keyId !== this.keyId) {
      throw new Error('Key mismatch - data was encrypted with different key');
    }

    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = crypto.createDecipheriv(this.options.algorithm, this.masterKey, iv);
    
    (decipher as crypto.DecipherGCM).setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // ===========================================================================
  // API Key Management
  // ===========================================================================

  /**
   * Store an API key securely
   */
  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    if (!this.secureConfig) {
      throw new Error('Secure config not loaded');
    }

    this.secureConfig.apiKeys[provider] = this.encrypt(apiKey);
    this.secureConfig.metadata.lastModified = new Date().toISOString();
    
    await this.saveSecureConfig();
    
    bus.publish('system', 'encryption:key-stored', { provider });
    console.log(`[EncryptionManager] ✓ API key stored for ${provider}`);
  }

  /**
   * Retrieve an API key
   */
  getApiKey(provider: string): string | null {
    if (!this.secureConfig) {
      return null;
    }

    const encrypted = this.secureConfig.apiKeys[provider];
    if (!encrypted) {
      return null;
    }

    try {
      return this.decrypt(encrypted);
    } catch (error: any) {
      console.error(`[EncryptionManager] Failed to decrypt key for ${provider}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(provider: string): Promise<void> {
    if (!this.secureConfig) {
      throw new Error('Secure config not loaded');
    }

    delete this.secureConfig.apiKeys[provider];
    this.secureConfig.metadata.lastModified = new Date().toISOString();
    
    await this.saveSecureConfig();
    
    bus.publish('system', 'encryption:key-deleted', { provider });
    console.log(`[EncryptionManager] ✓ API key deleted for ${provider}`);
  }

  /**
   * List stored API key providers (not the keys themselves)
   */
  listApiKeyProviders(): string[] {
    return Object.keys(this.secureConfig?.apiKeys || {});
  }

  // ===========================================================================
  // Secret Management
  // ===========================================================================

  /**
   * Store a generic secret
   */
  async storeSecret(name: string, value: string): Promise<void> {
    if (!this.secureConfig) {
      throw new Error('Secure config not loaded');
    }

    this.secureConfig.secrets[name] = this.encrypt(value);
    this.secureConfig.metadata.lastModified = new Date().toISOString();
    
    await this.saveSecureConfig();
    console.log(`[EncryptionManager] ✓ Secret stored: ${name}`);
  }

  /**
   * Retrieve a secret
   */
  getSecret(name: string): string | null {
    const encrypted = this.secureConfig?.secrets[name];
    if (!encrypted) return null;
    
    try {
      return this.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // Configuration Persistence
  // ===========================================================================

  private async loadSecureConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.secureConfig = JSON.parse(data) as SecureConfig;
        console.log(`[EncryptionManager] ✓ Loaded secure config from ${this.configPath}`);
      } else {
        this.secureConfig = this.createEmptyConfig();
        console.log('[EncryptionManager] Created new secure config');
      }
    } catch (error: any) {
      console.error(`[EncryptionManager] Failed to load config: ${error.message}`);
      this.secureConfig = this.createEmptyConfig();
    }
  }

  private async saveSecureConfig(): Promise<void> {
    if (!this.secureConfig) return;

    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.secureConfig, null, 2),
        { mode: 0o600 } // Only owner can read/write
      );
    } catch (error: any) {
      console.error(`[EncryptionManager] Failed to save config: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================================
  // Key Rotation
  // ===========================================================================

  /**
   * Rotate encryption key - re-encrypts all stored data with new key
   */
  async rotateKey(newKey: Buffer): Promise<void> {
    if (!this.secureConfig || !this.masterKey) {
      throw new Error('Cannot rotate key - not initialized');
    }

    console.log('[EncryptionManager] Starting key rotation...');
    
    // Decrypt all data with old key
    const decryptedKeys: Record<string, string> = {};
    const decryptedSecrets: Record<string, string> = {};
    
    for (const [provider, encrypted] of Object.entries(this.secureConfig.apiKeys)) {
      decryptedKeys[provider] = this.decrypt(encrypted);
    }
    
    for (const [name, encrypted] of Object.entries(this.secureConfig.secrets)) {
      decryptedSecrets[name] = this.decrypt(encrypted);
    }
    
    // Switch to new key
    this.masterKey = newKey;
    this.keyId = this.generateKeyId(newKey);
    
    // Re-encrypt all data
    for (const [provider, key] of Object.entries(decryptedKeys)) {
      this.secureConfig.apiKeys[provider] = this.encrypt(key);
    }
    
    for (const [name, secret] of Object.entries(decryptedSecrets)) {
      this.secureConfig.secrets[name] = this.encrypt(secret);
    }
    
    this.secureConfig.metadata.lastModified = new Date().toISOString();
    this.secureConfig.metadata.keyRotatedAt = new Date().toISOString();
    
    await this.saveSecureConfig();
    
    bus.publish('system', 'encryption:key-rotated', { keyId: this.keyId });
    console.log('[EncryptionManager] ✓ Key rotation complete');
  }

  // ===========================================================================
  // Utility Functions
  // ===========================================================================

  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(DEFAULT_KEY_LENGTH).toString('hex');
  }

  /**
   * Generate a new salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(DEFAULT_SALT_LENGTH).toString('hex');
  }

  /**
   * Hash a value (one-way, for verification)
   */
  static hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate secure random string
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Check if encryption is properly configured
   */
  isConfigured(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Get encryption status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      keyId: this.keyId,
      storedProviders: this.listApiKeyProviders(),
      storedSecrets: Object.keys(this.secureConfig?.secrets || {}),
      lastModified: this.secureConfig?.metadata.lastModified,
      keyRotatedAt: this.secureConfig?.metadata.keyRotatedAt,
    };
  }
}

// Export singleton instance
export const encryptionManager = new EncryptionManager();
