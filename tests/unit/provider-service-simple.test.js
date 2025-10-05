import { describe, it, expect } from 'vitest';
import { ProviderService } from '../../src/services/ProviderService.js';

describe('ProviderService Tests', () => {
  it('should import ProviderService', () => {
    expect(ProviderService).toBeDefined();
    expect(typeof ProviderService).toBe('function');
  });

  it('should create ProviderService instance with empty config', () => {
    const service = new ProviderService({});
    expect(service).toBeDefined();
  });

  it('should create ProviderService instance with providers', () => {
    const service = new ProviderService({
      openai: { apiKey: 'test-key', enabled: true }
    });
    expect(service).toBeDefined();
  });

  it('should have isProviderHealthy method', () => {
    const service = new ProviderService({});
    expect(typeof service.isProviderHealthy).toBe('function');
  });

  it('should have getMetrics method', () => {
    const service = new ProviderService({});
    expect(typeof service.getMetrics).toBe('function');
  });

  it('should have resetFailures method', () => {
    const service = new ProviderService({});
    expect(typeof service.resetFailures).toBe('function');
  });

  it('should get metrics object', () => {
    const service = new ProviderService({});
    const metrics = service.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics).toHaveProperty('totalRequests');
  });
});
