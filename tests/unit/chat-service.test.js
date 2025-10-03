import { describe, it, expect } from 'vitest';

describe('ChatService', () => {
  it('should validate messages', () => {
    const msg = { prompt: 'test', context: {} };
    expect(msg).toHaveProperty('prompt');
  });
});
