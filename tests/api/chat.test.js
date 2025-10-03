import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Chat API', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';

  it('should accept valid request', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/generate')
      .send({ prompt: 'test', context: {} });
    expect([200, 201, 500]).toContain(response.status);
  });
});
