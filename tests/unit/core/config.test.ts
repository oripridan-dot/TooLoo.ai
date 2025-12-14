// @version 3.3.577
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load default values when env vars are missing', async () => {
    // Clear relevant env vars
    delete process.env.WEB_PORT;
    delete process.env.NODE_ENV;

    const { config } = await import('../../../src/core/config');

    expect(config.WEB_PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
  });

  it('should load values from environment variables', async () => {
    process.env.WEB_PORT = '4000';
    process.env.NODE_ENV = 'production';
    process.env.OPENAI_API_KEY = 'sk-test';

    const { config } = await import('../../../src/core/config');

    expect(config.WEB_PORT).toBe(4000);
    expect(config.NODE_ENV).toBe('production');
    expect(config.OPENAI_API_KEY).toBe('sk-test');
  });

  it('should coerce numeric strings to numbers', async () => {
    process.env.TRAINING_PORT = '5000';
    
    const { config } = await import('../../../src/core/config');
    
    expect(config.TRAINING_PORT).toBe(5000);
    expect(typeof config.TRAINING_PORT).toBe('number');
  });
});
