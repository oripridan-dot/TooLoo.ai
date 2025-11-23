import request from 'supertest';
import app from '../../src/server'; // Adjust the path as necessary

describe('Arena Integration Tests', () => {
  it('should create a tournament successfully', async () => {
    const response = await request(app)
      .post('/api/arena/tournaments')
      .send({
        name: 'Test Tournament',
        providers: ['anthropic', 'openai'],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Tournament');
  });

  it('should retrieve all tournaments', async () => {
    const response = await request(app)
      .get('/api/arena/tournaments');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should handle errors when creating a tournament with missing fields', async () => {
    const response = await request(app)
      .post('/api/arena/tournaments')
      .send({}); // Sending an empty body

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});