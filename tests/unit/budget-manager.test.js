import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetManager } from '../../lib/budget-manager.js';

describe('BudgetManager', () => {
  let manager;
  let eventBus;

  beforeEach(() => {
    // Mock event bus
    eventBus = {
      emit: async () => {},
    };
    manager = new BudgetManager(eventBus, {
      defaultBudget: 10.0,
    });
  });

  describe('initialization', () => {
    it('should initialize with default budgets', () => {
      expect(manager.budgets).toBeDefined();
      expect(manager.budgets.ollama).toBeDefined();
      expect(manager.budgets.anthropic).toBeDefined();
      expect(manager.budgets.openai).toBeDefined();
      expect(manager.budgets.gemini).toBeDefined();
      expect(manager.budgets.deepseek).toBeDefined();
    });

    it('should initialize spending tracker', () => {
      expect(manager.spending).toBeDefined();
      Object.values(manager.spending).forEach((spend) => {
        expect(spend.monthlySpent).toBe(0);
        expect(spend.burstSpent).toBe(0);
        expect(spend.totalSpent).toBe(0);
        expect(spend.requestCount).toBe(0);
      });
    });

    it('should set correct budget amounts', () => {
      const anthropic = manager.budgets.anthropic;
      expect(anthropic.monthlyBudget).toBeGreaterThan(0);
      expect(anthropic.burstBudget).toBeGreaterThan(0);
      expect(anthropic.active).toBe(true);
    });

    it('should set ollama as free', () => {
      expect(manager.budgets.ollama.monthlyBudget).toBe(0);
      expect(manager.budgets.ollama.burstBudget).toBe(0);
    });
  });

  describe('canAfford', () => {
    it('should allow free providers', () => {
      const canAfford = manager.canAfford('ollama', 100);
      expect(canAfford).toBe(true);
    });

    it('should check affordability against monthly budget', () => {
      const budget = manager.budgets.anthropic.monthlyBudget;
      const canAffordSmall = manager.canAfford('anthropic', budget * 0.5);
      expect(canAffordSmall).toBe(true);

      const canAffordLarge = manager.canAfford('anthropic', budget * 2);
      expect(canAffordLarge).toBe(false);
    });

    it('should allow burst when requested and affordable', () => {
      const burstBudget = manager.budgets.anthropic.burstBudget;
      const cost = burstBudget * 0.5; // Half of burst budget

      const canAfford = manager.canAfford('anthropic', cost, true);
      expect(canAfford).toBe(true);
    });

    it('should reject invalid provider', () => {
      expect(() => {
        manager.canAfford('invalid-provider', 10);
      }).toThrow('Unknown provider: invalid-provider');
    });

    it('should return false for inactive providers', () => {
      manager.budgets.openai.active = false;
      const canAfford = manager.canAfford('openai', 5);
      expect(canAfford).toBe(false);
    });
  });

  describe('recordCost', () => {
    it('should record cost and update spending', async () => {
      const before = manager.spending.anthropic.monthlySpent;
      const cost = 1.5;

      await manager.recordCost('anthropic', cost);

      const after = manager.spending.anthropic.monthlySpent;
      expect(after).toBeCloseTo(before + cost, 2);
    });

    it('should increment request count', async () => {
      const before = manager.spending.anthropic.requestCount;
      await manager.recordCost('anthropic', 0.5);
      const after = manager.spending.anthropic.requestCount;

      expect(after).toBe(before + 1);
    });

    it('should store cost record', async () => {
      const cost = 2.0;
      const record = await manager.recordCost('gemini', cost);

      expect(record.record).toBeDefined();
      expect(record.record.cost).toBe(cost);
      expect(record.record.providerId).toBe('gemini');
      expect(record.record.timestamp).toBeDefined();
    });

    it('should include metadata in record', async () => {
      const metadata = { requestId: 'test-123', tokens: 500 };
      const result = await manager.recordCost('openai', 0.1, metadata);

      expect(result.record.metadata).toEqual(metadata);
    });

    it('should emit budget.exceeded alert when limit is hit', async () => {
      const budget = manager.budgets.anthropic.monthlyBudget;
      const cost = budget + 1;

      const result = await manager.recordCost('anthropic', cost);
      expect(result.alert).toBeDefined();
      expect(result.alert.type).toBe('budget.exceeded');
    });

    it('should emit budget.warning alert at 90% usage', async () => {
      const budget = manager.budgets.openai.monthlyBudget;
      const cost = budget * 0.91;

      let warnings = 0;
      eventBus.emit = async (event) => {
        if (event.type === 'provider.budget.warning') {
          warnings++;
        }
      };

      await manager.recordCost('openai', cost);
      expect(warnings).toBeGreaterThan(0);
    });

    it('should reject invalid provider', async () => {
      expect(async () => {
        await manager.recordCost('invalid', 1.0);
      }).rejects.toThrow('Unknown provider: invalid');
    });
  });

  describe('getBudgetForProvider', () => {
    it('should return budget status for provider', () => {
      const status = manager.getBudgetForProvider('anthropic');

      expect(status).toBeDefined();
      expect(status.provider).toBe('anthropic');
      expect(status.monthly).toBeDefined();
      expect(status.burst).toBeDefined();
      expect(status.total).toBeDefined();
      expect(status.status).toBe('active');
    });

    it('should show correct remaining amounts', async () => {
      const before = manager.getBudgetForProvider('gemini');
      const initialRemaining = before.monthly.remaining;

      await manager.recordCost('gemini', 0.5);

      const after = manager.getBudgetForProvider('gemini');
      expect(after.monthly.remaining).toBeLessThan(initialRemaining);
    });

    it('should calculate percentage used', async () => {
      const budget = manager.budgets.deepseek.monthlyBudget;
      await manager.recordCost('deepseek', budget * 0.5);

      const status = manager.getBudgetForProvider('deepseek');
      expect(status.monthly.percentUsed).toBe(50);
    });

    it('should return status "exceeded" when over budget', async () => {
      const budget = manager.budgets.anthropic.monthlyBudget;
      await manager.recordCost('anthropic', budget * 1.5);

      const status = manager.getBudgetForProvider('anthropic');
      expect(status.status).toBe('exceeded');
    });

    it('should return null for invalid provider', () => {
      const status = manager.getBudgetForProvider('invalid');
      expect(status).toBeNull();
    });
  });

  describe('getBudgetStatus', () => {
    it('should return status for all providers', () => {
      const status = manager.getBudgetStatus();

      expect(Object.keys(status)).toHaveLength(5);
      Object.values(status).forEach((providerStatus) => {
        expect(providerStatus.provider).toBeDefined();
        expect(providerStatus.monthly).toBeDefined();
        expect(providerStatus.burst).toBeDefined();
        expect(providerStatus.status).toBeDefined();
      });
    });
  });

  describe('getBudgetStatus integration', () => {
    it('should reflect spending across all providers', async () => {
      await manager.recordCost('anthropic', 1.0);
      await manager.recordCost('openai', 0.5);
      await manager.recordCost('gemini', 2.0);

      const status = manager.getBudgetStatus();
      expect(status.anthropic.monthly.spent).toBeCloseTo(1.0, 1);
      expect(status.openai.monthly.spent).toBeCloseTo(0.5, 1);
      expect(status.gemini.monthly.spent).toBeCloseTo(2.0, 1);
    });
  });

  describe('getCostRecords', () => {
    it('should return cost records for provider', async () => {
      await manager.recordCost('anthropic', 1.0);
      await manager.recordCost('anthropic', 0.5);

      const records = manager.getCostRecords('anthropic');
      expect(records).toHaveLength(2);
      expect(records[0].providerId).toBe('anthropic');
      expect(records[1].providerId).toBe('anthropic');
    });

    it('should filter records by date', async () => {
      const now = Date.now();
      await manager.recordCost('openai', 1.0);

      const records = manager.getCostRecords('openai', {
        since: now - 1000,
      });

      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe('getAlerts', () => {
    it('should return empty alerts initially', () => {
      const alerts = manager.getAlerts();
      expect(alerts).toEqual([]);
    });

    it('should return recent alerts', async () => {
      const budget = manager.budgets.anthropic.monthlyBudget;
      await manager.recordCost('anthropic', budget + 1);

      const alerts = manager.getAlerts(10);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('budget.exceeded');
    });

    it('should limit returned alerts', async () => {
      // Record many alerts
      for (let i = 0; i < 20; i++) {
        await manager.recordCost('gemini', 0.01);
      }

      const alerts = manager.getAlerts(5);
      expect(alerts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('setBudget', () => {
    it('should update budget for provider', () => {
      manager.setBudget('openai', 50.0, 10.0);

      expect(manager.budgets.openai.monthlyBudget).toBe(50.0);
      expect(manager.budgets.openai.burstBudget).toBe(10.0);
    });

    it('should update only monthly if burst not provided', () => {
      const oldBurst = manager.budgets.gemini.burstBudget;
      manager.setBudget('gemini', 25.0);

      expect(manager.budgets.gemini.monthlyBudget).toBe(25.0);
      expect(manager.budgets.gemini.burstBudget).toBe(oldBurst);
    });

    it('should throw for invalid provider', () => {
      expect(() => {
        manager.setBudget('invalid', 10.0);
      }).toThrow('Unknown provider: invalid');
    });
  });

  describe('setProviderActive', () => {
    it('should disable provider', () => {
      manager.setProviderActive('anthropic', false);
      expect(manager.budgets.anthropic.active).toBe(false);
    });

    it('should re-enable provider', () => {
      manager.setProviderActive('openai', false);
      manager.setProviderActive('openai', true);
      expect(manager.budgets.openai.active).toBe(true);
    });

    it('should affect affordability checks', () => {
      manager.setProviderActive('gemini', false);
      const canAfford = manager.canAfford('gemini', 1.0);
      expect(canAfford).toBe(false);
    });
  });

  describe('getSpendingSummary', () => {
    it('should return spending summary', async () => {
      await manager.recordCost('anthropic', 1.0);
      await manager.recordCost('openai', 0.5);

      const summary = manager.getSpendingSummary();
      expect(summary).toBeDefined();
      expect(summary.timestamp).toBeDefined();
      expect(summary.byProvider).toBeDefined();
      expect(summary.total).toBeCloseTo(1.5, 1);
      expect(summary.averagePerProvider).toBeGreaterThan(0);
    });
  });

  describe('resetSpending', () => {
    it('should reset spending for provider', async () => {
      await manager.recordCost('anthropic', 5.0);
      expect(manager.spending.anthropic.monthlySpent).toBeGreaterThan(0);

      manager.resetSpending('anthropic');
      expect(manager.spending.anthropic.monthlySpent).toBe(0);
    });

    it('should reset spending for all when no provider specified', async () => {
      await manager.recordCost('anthropic', 1.0);
      await manager.recordCost('openai', 2.0);

      manager.resetSpending();
      expect(manager.spending.anthropic.monthlySpent).toBe(0);
      expect(manager.spending.openai.monthlySpent).toBe(0);
    });

    it('should not affect budgets', async () => {
      const originalBudget = manager.budgets.gemini.monthlyBudget;
      manager.resetSpending('gemini');
      expect(manager.budgets.gemini.monthlyBudget).toBe(originalBudget);
    });
  });

  describe('monthly budget reset', () => {
    it('should reset monthly spending when month changes', async () => {
      // Record cost
      await manager.recordCost('anthropic', 1.0);
      expect(manager.spending.anthropic.monthlySpent).toBe(1.0);

      // Manually advance month start
      manager.spending.anthropic.monthStart = Date.now() - 31 * 24 * 60 * 60 * 1000;

      // Check budget - should trigger reset
      const status = manager.getBudgetForProvider('anthropic');
      expect(status.monthly.spent).toBe(0);
    });
  });
});
