import { describe, it, expect } from 'vitest';
import { HealthCheckService } from '../../src/services/HealthCheckService.js';

describe('HealthCheckService', () => {
  it('should create health check service', () => {
    const service = new HealthCheckService();
    expect(service).toBeDefined();
  });

  it('should have runChecks method', () => {
    const service = new HealthCheckService();
    expect(typeof service.runChecks).toBe('function');
  });

  it('should return health status from runChecks', async () => {
    const service = new HealthCheckService();
    const health = await service.runChecks();
    
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('checks');
  });
  
  it('should have liveness check', async () => {
    const service = new HealthCheckService();
    const liveness = await service.liveness();
    
    expect(liveness).toHaveProperty('status');
    expect(liveness.status).toBe('alive');
  });

  it('should have readiness check', async () => {
    const service = new HealthCheckService();
    const readiness = await service.readiness();
    
    expect(readiness).toHaveProperty('status');
  });
});
