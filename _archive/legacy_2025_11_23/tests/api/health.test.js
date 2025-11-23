import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Health Endpoint', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';

  it('should return 200 OK', async () => {
    const response = await request(API_BASE).get('/api/v1/health').expect(200);
    expect(response.body).toHaveProperty('status');
  });

  it('should include system info', async () => {
    const response = await request(API_BASE).get('/api/v1/health').expect(200);
    expect(response.body).toHaveProperty('system');
  });
});
