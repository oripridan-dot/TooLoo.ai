import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// This test will need to be updated once we extract the server into a testable module
// For now, it documents the expected behavior

describe('Health Endpoint', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';

  it('should return 200 OK with status information', async () => {
    const response = await request(API_BASE)
      .get('/api/v1/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('should include environment information', async () => {
    const response = await request(API_BASE)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toHaveProperty('environment');
    expect(response.body.environment).toHaveProperty('nodeVersion');
    expect(response.body.environment).toHaveProperty('platform');
  });

  it('should respond within acceptable latency', async () => {
    const start = Date.now();
    await request(API_BASE)
      .get('/api/v1/health')
      .expect(200);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // Should respond in < 500ms
  });
});

describe('Health Endpoint - Error Cases', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';

  it('should handle invalid routes gracefully', async () => {
    const response = await request(API_BASE)
      .get('/api/v1/invalid-endpoint')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
