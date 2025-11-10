import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderSelector } from '../../lib/provider-selector.js';

describe('ProviderSelector', () => {
  let selector;
  let eventBus;

  beforeEach(() => {
    // Mock event bus
    eventBus = {
      emit: async () => {},
    };
    selector = new ProviderSelector(eventBus);
  });

  describe('initialization', () => {
    it('should initialize with all providers', () => {
      expect(selector.providers).toBeDefined();
      expect(Object.keys(selector.providers)).toHaveLength(5);
      expect(selector.providers.ollama).toBeDefined();
      expect(selector.providers.anthropic).toBeDefined();
      expect(selector.providers.openai).toBeDefined();
      expect(selector.providers.gemini).toBeDefined();
      expect(selector.providers.deepseek).toBeDefined();
    });

    it('should initialize provider stats', () => {
      expect(selector.providerStats).toBeDefined();
      Object.keys(selector.providerStats).forEach((providerId) => {
        const stats = selector.providerStats[providerId];
        expect(stats.requestCount).toBe(0);
        expect(stats.successCount).toBe(0);
        expect(stats.failureCount).toBe(0);
        expect(stats.recentSuccessRate).toBe(1.0);
      });
    });

    it('should have correct provider configurations', () => {
      const provider = selector.providers.anthropic;
      expect(provider.id).toBe('anthropic');
      expect(provider.name).toBeDefined();
      expect(provider.endpoint).toBeDefined();
      expect(provider.models).toEqual(expect.any(Array));
      expect(provider.costPerToken).toBeGreaterThanOrEqual(0);
      expect(provider.qualityScore).toBeGreaterThan(0);
      expect(provider.qualityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('selectProvider', () => {
    it('should select a provider', async () => {
      const result = await selector.selectProvider({
        query: 'test query',
        focusArea: 'javascript',
        estimatedTokens: 100,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.providerId).toBeDefined();
      expect(result.provider).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it('should prefer free providers when requested', async () => {
      const result = await selector.selectProvider({
        query: 'test',
        preferFree: true,
      });

      // Ollama is free and should be preferred
      expect(result.providerId).toBe('ollama');
      expect(result.estimatedCost).toBe(0);
    });

    it('should prefer high quality providers when requested', async () => {
      const result = await selector.selectProvider({
        query: 'test',
        highQuality: true,
      });

      // Should pick high quality provider (likely Anthropic)
      const provider = selector.providers[result.providerId];
      expect(provider.qualityScore).toBeGreaterThan(0.85);
    });

    it('should handle no available providers gracefully', async () => {
      // Mark all as unavailable
      Object.values(selector.providers).forEach((p) => {
        p.available = false;
      });

      const result = await selector.selectProvider({
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.fallback).toBe(true);
    });

    it('should calculate estimated cost correctly', async () => {
      const tokens = 1000;
      const result = await selector.selectProvider({
        estimatedTokens: tokens,
        focusArea: 'general',
      });

      const provider = result.provider;
      const expectedCost = provider.costPerToken * tokens;
      expect(result.estimatedCost).toBeCloseTo(expectedCost, 6);
    });
  });

  describe('provider scoring', () => {
    it('should score providers based on multiple factors', async () => {
      const selection1 = await selector.selectProvider({
        estimatedTokens: 100,
        preferFree: false,
      });

      const selection2 = await selector.selectProvider({
        estimatedTokens: 100,
        highQuality: false,
      });

      // Both should return valid scores
      expect(selection1.score).toBeGreaterThan(0);
      expect(selection2.score).toBeGreaterThan(0);
    });

    it('should rank cheaper providers higher when budget is tight', async () => {
      // Try with preferFree
      const cheap = await selector.selectProvider({
        estimatedTokens: 1000,
        preferFree: true,
      });

      expect(cheap.providerId).toBe('ollama');
    });
  });

  describe('updateProviderStatus', () => {
    it('should update provider availability', () => {
      const providerId = 'anthropic';
      selector.updateProviderStatus(providerId, {
        available: false,
      });

      expect(selector.providers[providerId].available).toBe(false);
    });

    it('should update success rate', () => {
      const providerId = 'anthropic';
      const stats = selector.providerStats[providerId];

      selector.updateProviderStatus(providerId, { success: true });
      expect(stats.requestCount).toBe(1);
      expect(stats.successCount).toBe(1);

      selector.updateProviderStatus(providerId, { success: false });
      expect(stats.requestCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.recentSuccessRate).toBe(0.5);
    });

    it('should update uptime', () => {
      const providerId = 'openai';
      selector.updateProviderStatus(providerId, {
        uptime: 0.95,
      });

      expect(selector.providerStats[providerId].uptime).toBe(0.95);
    });

    it('should update response time', () => {
      const providerId = 'gemini';
      selector.updateProviderStatus(providerId, {
        responseTime: 250,
      });

      expect(selector.providerStats[providerId].avgResponseTime).toBe(250);
    });
  });

  describe('getProviderStatus', () => {
    it('should return status for all providers', () => {
      const status = selector.getProviderStatus();

      expect(Object.keys(status)).toHaveLength(5);
      Object.values(status).forEach((providerStatus) => {
        expect(providerStatus.name).toBeDefined();
        expect(providerStatus.available).toBeDefined();
        expect(providerStatus.costPerToken).toBeGreaterThanOrEqual(0);
        expect(providerStatus.qualityScore).toBeDefined();
        expect(providerStatus.requestCount).toBeDefined();
      });
    });
  });

  describe('selection history and analytics', () => {
    it('should track selection history', async () => {
      await selector.selectProvider({ query: 'test1' });
      await selector.selectProvider({ query: 'test2' });
      await selector.selectProvider({ query: 'test3' });

      expect(selector.selectionHistory).toHaveLength(3);
    });

    it('should record cost history', async () => {
      const tokens = 500;
      const selection = await selector.selectProvider({
        estimatedTokens: tokens,
      });

      const history = selector.costHistory.get(selection.providerId);
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should calculate cost summary', async () => {
      await selector.selectProvider({ estimatedTokens: 100 });
      await selector.selectProvider({ estimatedTokens: 200 });

      const summary = selector.getCostSummary();
      expect(summary).toBeDefined();
      Object.values(summary).forEach((providerSummary) => {
        expect(providerSummary.provider).toBeDefined();
        expect(providerSummary.requestCount).toBeGreaterThanOrEqual(0);
        expect(providerSummary.totalCost).toBeDefined();
      });
    });

    it('should track selection statistics', async () => {
      await selector.selectProvider({});
      await selector.selectProvider({});
      await selector.selectProvider({});

      const stats = selector.getSelectionStats();
      expect(stats.totalSelections).toBe(3);
      expect(stats.byProvider).toBeDefined();
      expect(stats.avgScores).toBeDefined();
    });
  });

  describe('getCostSummary', () => {
    it('should return cost data for all providers', async () => {
      await selector.selectProvider({ estimatedTokens: 100 });
      const summary = selector.getCostSummary();

      expect(summary).toBeDefined();
      Object.values(summary).forEach((providerSummary) => {
        expect(providerSummary.provider).toBeDefined();
        expect(providerSummary.requestCount).toBeGreaterThanOrEqual(0);
        expect(providerSummary.totalTokens).toBeGreaterThanOrEqual(0);
        expect(providerSummary.avgCostPerRequest).toBeDefined();
      });
    });
  });

  describe('getSelectionStats', () => {
    it('should return selection statistics', async () => {
      await selector.selectProvider({});
      await selector.selectProvider({});

      const stats = selector.getSelectionStats();
      expect(stats.totalSelections).toBe(2);
      expect(stats.byProvider).toBeDefined();
      expect(stats.avgScores).toBeDefined();
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      await selector.selectProvider({});
      expect(selector.selectionHistory.length).toBeGreaterThan(0);

      selector.resetStats();
      expect(selector.selectionHistory).toHaveLength(0);
      expect(selector.costHistory.size).toBe(0);
      Object.values(selector.providerStats).forEach((stats) => {
        expect(stats.requestCount).toBe(0);
      });
    });
  });
});
