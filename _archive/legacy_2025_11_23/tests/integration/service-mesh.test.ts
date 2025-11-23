import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for service communication
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Service Mesh Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should allow Brain service to communicate with Coach', async () => {
    // Simulate Brain service calling Coach service
    const brainPort = 3001;
    const coachPort = 3004;
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ready', advice: 'Focus on testing' })
    });

    // This represents the code running inside Brain Service
    const response = await fetch(`http://127.0.0.1:${coachPort}/api/v1/coach/advice`);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(`http://127.0.0.1:${coachPort}/api/v1/coach/advice`);
    expect(data).toEqual({ status: 'ready', advice: 'Focus on testing' });
  });

  it('should allow Hands service to request Budget approval', async () => {
    // Simulate Hands service calling Budget service
    const handsPort = 3006;
    const budgetPort = 3003;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approved: true, remaining: 100 })
    });

    // This represents code running inside Hands Service
    const response = await fetch(`http://127.0.0.1:${budgetPort}/api/v1/budget/request`, {
      method: 'POST',
      body: JSON.stringify({ cost: 5 })
    });
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      `http://127.0.0.1:${budgetPort}/api/v1/budget/request`,
      expect.objectContaining({
        method: 'POST',
        body: '{"cost":5}'
      })
    );
    expect(data.approved).toBe(true);
  });
});
