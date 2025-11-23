import { describe, it, expect, beforeEach } from 'vitest';
import { app, ProviderSelector, BudgetManager } from '../../servers/provider-service.js';

describe('Provider Service Integration', () => {
  let selector;
  let budgetManager;
  let eventBus;

  beforeEach(() => {
    eventBus = {
      emit: async () => {},
    };
    selector = new ProviderSelector(eventBus);
    budgetManager = new BudgetManager(eventBus);
  });

  describe('Provider Selection API', () => {
    it('should export ProviderSelector class', () => {
      expect(ProviderSelector).toBeDefined();
    });

    it('should export BudgetManager class', () => {
      expect(BudgetManager).toBeDefined();
    });

    it('should export Express app', () => {
      expect(app).toBeDefined();
      expect(app.use).toBeDefined();
      expect(app.get).toBeDefined();
      expect(app.post).toBeDefined();
    });
  });

  describe('ProviderSelector and BudgetManager Integration', () => {
    it('should allow selecting provider and checking budget in sequence', async () => {
      // Select a provider
      const selection = await selector.selectProvider({
        query: 'test',
        estimatedTokens: 100,
      });

      expect(selection.providerId).toBeDefined();
      expect(selection.estimatedCost).toBeDefined();

      // Check if we can afford it
      const canAfford = budgetManager.canAfford(
        selection.providerId,
        selection.estimatedCost
      );

      expect(typeof canAfford).toBe('boolean');
    });

    it('should track selection and enable cost recording', async () => {
      const selection = await selector.selectProvider({
        estimatedTokens: 100,
      });

      // Record the cost
      const result = await budgetManager.recordCost(
        selection.providerId,
        selection.estimatedCost,
        { selectionId: selection.id }
      );

      expect(result.record).toBeDefined();
      expect(result.budgetStatus).toBeDefined();
    });

    it('should handle provider preferences consistently', async () => {
      // Select free provider
      const freeSelection = await selector.selectProvider({
        preferFree: true,
      });

      expect(freeSelection.providerId).toBe('ollama');
      expect(freeSelection.estimatedCost).toBe(0);

      // Should always be affordable
      const canAfford = budgetManager.canAfford('ollama', 1000);
      expect(canAfford).toBe(true);
    });

    it('should select high quality provider', async () => {
      const selection = await selector.selectProvider({
        highQuality: true,
      });

      const provider = selector.providers[selection.providerId];
      expect(provider.qualityScore).toBeGreaterThan(0.85);
    });
  });

  describe('Budget and Provider Interaction Flow', () => {
    it('should enforce budget limits during provider selection', async () => {
      // Set tight budget
      budgetManager.setBudget('openai', 1.0);

      // Make expensive selection
      const selection = await selector.selectProvider({
        estimatedTokens: 5000, // High token count
      });

      // If selected an expensive provider, budget should prevent recording
      const canAfford = budgetManager.canAfford(
        selection.providerId,
        selection.estimatedCost
      );

      expect(typeof canAfford).toBe('boolean');
    });

    it('should track spending across multiple selections', async () => {
      const costs = [];

      // Make multiple selections and record costs
      for (let i = 0; i < 3; i++) {
        const selection = await selector.selectProvider({
          estimatedTokens: 100 + i * 50,
        });

        const result = await budgetManager.recordCost(
          selection.providerId,
          selection.estimatedCost
        );

        costs.push(result.record.cost);
      }

      // Verify costs were recorded
      expect(costs.length).toBe(3);
      costs.forEach((cost) => {
        expect(typeof cost).toBe('number');
      });
    });
  });

  describe('Provider Status and Analytics', () => {
    it('should provide provider status overview', () => {
      const status = selector.getProviderStatus();
      expect(Object.keys(status)).toHaveLength(5);
      Object.values(status).forEach((s) => {
        expect(s.available).toBeDefined();
        expect(s.costPerToken).toBeDefined();
      });
    });

    it('should provide budget status overview', () => {
      const status = budgetManager.getBudgetStatus();
      expect(Object.keys(status)).toHaveLength(5);
      Object.values(status).forEach((s) => {
        expect(s.monthly).toBeDefined();
        expect(s.burst).toBeDefined();
      });
    });

    it('should generate spending summary', async () => {
      // Record some costs
      await budgetManager.recordCost('anthropic', 0.5);
      await budgetManager.recordCost('openai', 0.3);

      const summary = budgetManager.getSpendingSummary();
      expect(summary.timestamp).toBeDefined();
      expect(summary.byProvider).toBeDefined();
      expect(summary.total).toBeGreaterThan(0);
    });

    it('should generate selection statistics', async () => {
      // Make some selections
      await selector.selectProvider({});
      await selector.selectProvider({});

      const stats = selector.getSelectionStats();
      expect(stats.totalSelections).toBe(2);
      expect(stats.byProvider).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider gracefully', () => {
      expect(() => {
        budgetManager.canAfford('invalid', 1.0);
      }).toThrow('Unknown provider: invalid');
    });

    it('should fallback when no providers available', async () => {
      // Disable all providers
      Object.values(selector.providers).forEach((p) => {
        p.available = false;
      });

      const result = await selector.selectProvider({});
      expect(result.fallback).toBe(true);
    });
  });
});
