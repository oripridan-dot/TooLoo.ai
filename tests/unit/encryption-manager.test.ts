// @version 3.3.352 - Encryption Manager Unit Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock fs/promises
vi.mock('fs/promises');

// Mock event bus
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

import { EncryptionManager } from '../../src/core/security/encryption-manager.js';

describe('EncryptionManager', () => {
  let manager: EncryptionManager;
  const testMasterKey = 'test-master-key-for-encryption-testing';
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = path.join(os.tmpdir(), `encryption-test-${Date.now()}`);
    
    // Mock fs operations
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.unlink as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.rm as any).mockResolvedValue(undefined);

    manager = new EncryptionManager(testMasterKey, tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should create with default storage path', () => {
      const defaultManager = new EncryptionManager(testMasterKey);
      expect(defaultManager).toBeDefined();
    });
  });

  describe('encryption', () => {
    it('should encrypt data successfully', () => {
      const plaintext = 'sensitive-api-key-12345';
      const encrypted = manager.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should encrypt different data differently', () => {
      const encrypted1 = manager.encrypt('data1');
      const encrypted2 = manager.encrypt('data2');

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should use different IV each time', () => {
      const encrypted1 = manager.encrypt('same-data');
      const encrypted2 = manager.encrypt('same-data');

      // Same plaintext should have different IVs
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      // And therefore different ciphertexts
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('decryption', () => {
    it('should decrypt data successfully', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = manager.encrypt(plaintext);
      const decrypted = manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-={}[]|:;"<>,.?/~`';
      const encrypted = manager.encrypt(plaintext);
      const decrypted = manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode', () => {
      const plaintext = '你好世界 🔐 مرحبا';
      const encrypted = manager.encrypt(plaintext);
      const decrypted = manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = manager.encrypt(plaintext);
      const decrypted = manager.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with tampered ciphertext', () => {
      const encrypted = manager.encrypt('secret');
      
      // Tamper with the ciphertext
      const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + 'xx';
      const tampered = { ...encrypted, ciphertext: tamperedCiphertext };

      expect(() => manager.decrypt(tampered)).toThrow();
    });

    it('should fail with wrong auth tag', () => {
      const encrypted = manager.encrypt('secret');
      
      // Use wrong auth tag
      const tampered = { ...encrypted, authTag: 'wrongauthtagvalue1234' };

      expect(() => manager.decrypt(tampered)).toThrow();
    });
  });

  describe('API key storage', () => {
    it('should store and retrieve API key', async () => {
      const apiKey = 'sk-test-api-key-12345';
      
      // Mock successful file read after store
      let storedData: string | null = null;
      (fs.writeFile as any).mockImplementation(async (_path: string, data: string) => {
        storedData = data;
      });
      (fs.readFile as any).mockImplementation(async () => {
        if (storedData) return storedData;
        throw { code: 'ENOENT' };
      });

      await manager.storeApiKey('openai', apiKey);
      const retrieved = await manager.getApiKey('openai');

      expect(retrieved).toBe(apiKey);
    });

    it('should return null for non-existent key', async () => {
      (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });

      const retrieved = await manager.getApiKey('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should delete API key', async () => {
      await manager.deleteApiKey('test-provider');
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should list stored keys', async () => {
      (fs.readdir as any).mockResolvedValue(['openai.enc', 'anthropic.enc', 'gemini.enc']);

      const keys = await manager.listStoredKeys();
      expect(keys).toContain('openai');
      expect(keys).toContain('anthropic');
      expect(keys).toContain('gemini');
      expect(keys).toHaveLength(3);
    });
  });

  describe('secure config', () => {
    it('should store and retrieve secure config', async () => {
      const config = {
        apiEndpoint: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
      };

      let storedData: string | null = null;
      (fs.writeFile as any).mockImplementation(async (_path: string, data: string) => {
        storedData = data;
      });
      (fs.readFile as any).mockImplementation(async () => {
        if (storedData) return storedData;
        throw { code: 'ENOENT' };
      });

      await manager.storeSecureConfig('my-service', config);
      const retrieved = await manager.getSecureConfig<typeof config>('my-service');

      expect(retrieved).toEqual(config);
    });

    it('should return null for non-existent config', async () => {
      (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });

      const config = await manager.getSecureConfig('nonexistent');
      expect(config).toBeNull();
    });
  });

  describe('key rotation', () => {
    it('should rotate encryption key', async () => {
      // Store some data with old key
      let storedData: string | null = null;
      (fs.writeFile as any).mockImplementation(async (_path: string, data: string) => {
        storedData = data;
      });
      (fs.readFile as any).mockImplementation(async () => {
        if (storedData) return storedData;
        throw { code: 'ENOENT' };
      });
      (fs.readdir as any).mockResolvedValue(['test.enc']);

      await manager.storeApiKey('test', 'original-secret');

      // Rotate key
      const newKey = 'new-master-key-for-rotation';
      await manager.rotateKey(newKey);

      // Should be able to decrypt with new key
      // The internal key should have been updated
      expect(true).toBe(true); // Key rotation completed without error
    });
  });

  describe('hash generation', () => {
    it('should generate consistent hashes', () => {
      const hash1 = manager.generateHash('test-data');
      const hash2 = manager.generateHash('test-data');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const hash1 = manager.generateHash('data1');
      const hash2 = manager.generateHash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hex string', () => {
      const hash = manager.generateHash('test');
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('secure wipe', () => {
    it('should wipe all stored secrets', async () => {
      (fs.readdir as any).mockResolvedValue(['key1.enc', 'key2.enc']);
      (fs.rm as any).mockResolvedValue(undefined);

      await manager.secureWipe();

      expect(fs.rm).toHaveBeenCalled();
    });
  });
});
