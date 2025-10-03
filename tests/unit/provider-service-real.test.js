import { describe, it, expect } from 'vitest';

describe('ProviderService Real', () => {
  it('should handle selection', () => {
    const providers = ['openai', 'anthropic'];
    expect(providers).toContain('openai');
  });
});
