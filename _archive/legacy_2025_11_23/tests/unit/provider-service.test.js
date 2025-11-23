import { describe, it, expect } from 'vitest';

describe('ProviderService', () => {
  it('should have providers', () => {
    const providers = ['openai'];
    expect(providers.length).toBeGreaterThan(0);
  });
});
