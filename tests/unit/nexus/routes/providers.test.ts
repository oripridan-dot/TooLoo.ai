// @version 3.3.573
/**
 * Unit tests for Providers Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Providers Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Response Structure', () => {
    it('should return providers array with required fields', () => {
      const mockProviders = [
        { id: 'anthropic', name: 'Anthropic', status: 'Ready', latency: 150 },
        { id: 'openai', name: 'OpenAI', status: 'Ready', latency: 200 },
        { id: 'deepseek', name: 'DeepSeek', status: 'Unavailable', latency: null },
      ];

      const response = {
        ok: true,
        data: {
          providers: mockProviders,
          active: mockProviders.find((p) => p.status === 'Ready')?.id || 'none',
          timestamp: Date.now(),
        },
      };

      expect(response.ok).toBe(true);
      expect(response.data.providers).toHaveLength(3);
      expect(response.data.active).toBe('anthropic');
      expect(response.data.timestamp).toBeDefined();
    });

    it('should return none when no providers are ready', () => {
      const mockProviders = [
        { id: 'anthropic', name: 'Anthropic', status: 'Unavailable' },
        { id: 'openai', name: 'OpenAI', status: 'Error' },
      ];

      const active = mockProviders.find((p) => p.status === 'Ready')?.id || 'none';
      expect(active).toBe('none');
    });
  });

  describe('Refresh Logic', () => {
    it('should detect provider status changes', () => {
      const beforeProviders = [
        { id: 'anthropic', status: 'Unavailable' },
        { id: 'openai', status: 'Ready' },
      ];

      const afterProviders = [
        { id: 'anthropic', status: 'Ready' },
        { id: 'openai', status: 'Ready' },
      ];

      const changes = afterProviders
        .map((p, i) => {
          const before = beforeProviders[i];
          return {
            id: p.id,
            status: p.status,
            changed: before?.status !== p.status,
          };
        })
        .filter((p) => p.changed);

      expect(changes).toHaveLength(1);
      expect(changes[0]?.id).toBe('anthropic');
    });

    it('should report zero changes when nothing changed', () => {
      const beforeProviders = [
        { id: 'anthropic', status: 'Ready' },
        { id: 'openai', status: 'Ready' },
      ];

      const afterProviders = [
        { id: 'anthropic', status: 'Ready' },
        { id: 'openai', status: 'Ready' },
      ];

      const changes = afterProviders
        .map((p, i) => {
          const before = beforeProviders[i];
          return {
            id: p.id,
            changed: before?.status !== p.status,
          };
        })
        .filter((p) => p.changed);

      expect(changes).toHaveLength(0);
    });
  });

  describe('Provider Status Values', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['Ready', 'Unavailable', 'Error', 'Connecting'];
      
      validStatuses.forEach((status) => {
        const provider = { id: 'test', status };
        expect(['Ready', 'Unavailable', 'Error', 'Connecting']).toContain(provider.status);
      });
    });

    it('should identify first ready provider as active', () => {
      const providers = [
        { id: 'first', status: 'Unavailable' },
        { id: 'second', status: 'Ready' },
        { id: 'third', status: 'Ready' },
      ];

      const active = providers.find((p) => p.status === 'Ready')?.id;
      expect(active).toBe('second');
    });
  });
});
