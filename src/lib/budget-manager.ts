import { v4 as uuidv4 } from 'uuid';

/**
 * BudgetManager - Tracks and enforces provider budgets
 *
 * Features:
 * - Per-provider budget limits
 * - Cost tracking and reporting
 * - Burst capacity management
 * - Budget exhaustion alerts
 */
export class BudgetManager {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      defaultBudget: 10.0, // $10 default per provider
      ...config,
    };

    // Initialize budgets
    this.budgets = this.initializeBudgets();
    this.spending = this.initializeSpending();
    this.costRecords = new Map();
    this.alerts = [];

    // Bind methods
    this.canAfford = this.canAfford.bind(this);
    this.recordCost = this.recordCost.bind(this);
    this.getBudgetStatus = this.getBudgetStatus.bind(this);
  }

  /**
   * Initialize budget allocation by provider
   * @private
   */
  initializeBudgets() {
    return {
      ollama: {
        provider: 'ollama',
        monthlyBudget: 0, // Free (local)
        burstBudget: 0,
        active: true,
      },
      anthropic: {
        provider: 'anthropic',
        monthlyBudget: this.config.defaultBudget * 3, // $30/month for quality
        burstBudget: this.config.defaultBudget, // $10 burst
        active: true,
      },
      openai: {
        provider: 'openai',
        monthlyBudget: this.config.defaultBudget * 2, // $20/month
        burstBudget: this.config.defaultBudget, // $10 burst
        active: true,
      },
      gemini: {
        provider: 'gemini',
        monthlyBudget: this.config.defaultBudget * 2.5, // $25/month
        burstBudget: this.config.defaultBudget, // $10 burst
        active: true,
      },
      deepseek: {
        provider: 'deepseek',
        monthlyBudget: this.config.defaultBudget * 5, // $50/month (cheap)
        burstBudget: this.config.defaultBudget * 2, // $20 burst
        active: true,
      },
    };
  }

  /**
   * Initialize spending tracker
   * @private
   */
  initializeSpending() {
    const spending = {};
    Object.keys(this.budgets).forEach((providerId) => {
      spending[providerId] = {
        monthlySpent: 0,
        burstSpent: 0,
        totalSpent: 0,
        requestCount: 0,
        monthStart: this.getMonthStart(),
        lastUpdated: Date.now(),
      };
    });
    return spending;
  }

  /**
   * Get start of current month (for monthly budget reset)
   * @private
   */
  getMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  /**
   * Check if provider budget can afford an estimated cost
   * @param {string} providerId - Provider ID
   * @param {number} estimatedCost - Estimated cost in dollars
   * @param {boolean} useBurst - Allow using burst budget
   * @returns {boolean} True if affordable
   */
  canAfford(providerId, estimatedCost, useBurst = false) {
    if (!this.budgets[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const budget = this.budgets[providerId];
    const spending = this.spending[providerId];

    if (!budget.active) {
      return false;
    }

    // Free providers are always affordable
    if (budget.monthlyBudget === 0 && budget.burstBudget === 0) {
      return true;
    }

    // Reset monthly budget if month changed
    if (Date.now() - spending.monthStart > 30 * 24 * 60 * 60 * 1000) {
      spending.monthlySpent = 0;
      spending.monthStart = this.getMonthStart();
    }

    const monthlyRemaining = budget.monthlyBudget - spending.monthlySpent;

    // Check monthly budget first
    if (estimatedCost > monthlyRemaining) {
      if (!useBurst) {
        return false;
      }

      // Try burst budget
      const burstRemaining = budget.burstBudget - spending.burstSpent;
      return estimatedCost <= burstRemaining;
    }

    return true;
  }

  /**
   * Record actual cost for a provider request
   * @param {string} providerId - Provider ID
   * @param {number} actualCost - Actual cost in dollars
   * @param {Object} metadata - Request metadata
   * @returns {Object} Cost record
   */
  async recordCost(providerId, actualCost, metadata = {}) {
    if (!this.budgets[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const budget = this.budgets[providerId];
    const spending = this.spending[providerId];

    // Reset monthly if needed
    if (Date.now() - spending.monthStart > 30 * 24 * 60 * 60 * 1000) {
      spending.monthlySpent = 0;
      spending.monthStart = this.getMonthStart();
    }

    // Update spending
    spending.monthlySpent += actualCost;
    spending.burstSpent += actualCost;
    spending.totalSpent += actualCost;
    spending.requestCount++;
    spending.lastUpdated = Date.now();

    // Create cost record
    const record = {
      id: uuidv4(),
      timestamp: Date.now(),
      providerId,
      cost: actualCost,
      monthlyTotal: spending.monthlySpent,
      burstTotal: spending.burstSpent,
      metadata,
    };

    // Store record
    if (!this.costRecords.has(providerId)) {
      this.costRecords.set(providerId, []);
    }
    this.costRecords.get(providerId).push(record);

    // Keep only recent records (last 1000)
    const records = this.costRecords.get(providerId);
    if (records.length > 1000) {
      records.shift();
    }

    // Check for budget exceeded
    const monthlyRemaining = budget.monthlyBudget - spending.monthlySpent;
    let alert = null;

    if (monthlyRemaining < 0) {
      alert = {
        type: 'budget.exceeded',
        severity: 'critical',
        providerId,
        budgetLimit: budget.monthlyBudget,
        spent: spending.monthlySpent,
        excess: Math.abs(monthlyRemaining),
        timestamp: Date.now(),
      };

      // Emit event
      if (this.eventBus) {
        await this.eventBus.emit({
          type: 'provider.budget.exceeded',
          aggregateId: providerId,
          data: alert,
        });
      }

      this.alerts.push(alert);
    } else if (monthlyRemaining < budget.monthlyBudget * 0.1) {
      // Warning: less than 10% remaining
      alert = {
        type: 'budget.warning',
        severity: 'warning',
        providerId,
        budgetLimit: budget.monthlyBudget,
        spent: spending.monthlySpent,
        remaining: monthlyRemaining,
        percentUsed: ((spending.monthlySpent / budget.monthlyBudget) * 100).toFixed(1),
        timestamp: Date.now(),
      };

      // Emit event
      if (this.eventBus) {
        await this.eventBus.emit({
          type: 'provider.budget.warning',
          aggregateId: providerId,
          data: alert,
        });
      }

      this.alerts.push(alert);
    }

    return {
      record,
      alert,
      budgetStatus: this.getBudgetForProvider(providerId),
    };
  }

  /**
   * Get budget status for a specific provider
   * @param {string} providerId - Provider ID
   */
  getBudgetForProvider(providerId) {
    const budget = this.budgets[providerId];
    const spending = this.spending[providerId];

    if (!budget) {
      return null;
    }

    // Reset monthly if needed
    if (Date.now() - spending.monthStart > 30 * 24 * 60 * 60 * 1000) {
      spending.monthlySpent = 0;
      spending.monthStart = this.getMonthStart();
    }

    const monthlyRemaining = budget.monthlyBudget - spending.monthlySpent;
    const burstRemaining = budget.burstBudget - spending.burstSpent;

    return {
      provider: budget.provider,
      monthly: {
        limit: budget.monthlyBudget,
        spent: parseFloat(spending.monthlySpent.toFixed(4)),
        remaining: parseFloat(monthlyRemaining.toFixed(4)),
        percentUsed: parseFloat(((spending.monthlySpent / budget.monthlyBudget) * 100).toFixed(1)),
      },
      burst: {
        limit: budget.burstBudget,
        spent: parseFloat(spending.burstSpent.toFixed(4)),
        remaining: parseFloat(burstRemaining.toFixed(4)),
        percentUsed: parseFloat(((spending.burstSpent / budget.burstBudget) * 100).toFixed(1)),
      },
      total: {
        spent: parseFloat(spending.totalSpent.toFixed(4)),
        requestCount: spending.requestCount,
        avgCostPerRequest: parseFloat(
          (spending.totalSpent / (spending.requestCount || 1)).toFixed(6)
        ),
      },
      status: monthlyRemaining > 0 ? 'active' : 'exceeded',
      lastUpdated: new Date(spending.lastUpdated).toISOString(),
    };
  }

  /**
   * Get budget status for all providers
   */
  getBudgetStatus() {
    const status = {};
    Object.keys(this.budgets).forEach((providerId) => {
      status[providerId] = this.getBudgetForProvider(providerId);
    });
    return status;
  }

  /**
   * Get all cost records for a provider
   * @param {string} providerId - Provider ID
   * @param {Object} options - Filter options
   * @returns {Array} Cost records
   */
  getCostRecords(providerId, options = {}) {
    const records = this.costRecords.get(providerId) || [];

    // Filter by date range if provided
    if (options.since) {
      return records.filter((r) => r.timestamp >= options.since);
    }

    return records;
  }

  /**
   * Get recent alerts
   * @param {number} limit - Number of recent alerts to return
   */
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  /**
   * Set budget for a provider
   * @param {string} providerId - Provider ID
   * @param {number} monthlyBudget - Monthly budget in dollars
   * @param {number} burstBudget - Burst budget in dollars
   */
  setBudget(providerId, monthlyBudget, burstBudget = null) {
    if (!this.budgets[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    this.budgets[providerId].monthlyBudget = monthlyBudget;
    if (burstBudget !== null) {
      this.budgets[providerId].burstBudget = burstBudget;
    }
  }

  /**
   * Enable/disable a provider
   * @param {string} providerId - Provider ID
   * @param {boolean} active - Enable or disable
   */
  setProviderActive(providerId, active) {
    if (this.budgets[providerId]) {
      this.budgets[providerId].active = active;
    }
  }

  /**
   * Get spending summary for reporting
   */
  getSpendingSummary() {
    const summary = {
      timestamp: Date.now(),
      byProvider: {},
      total: 0,
      averagePerProvider: 0,
    };

    Object.entries(this.spending).forEach(([providerId, spending]) => {
      summary.byProvider[providerId] = {
        provider: providerId,
        monthly: spending.monthlySpent,
        burst: spending.burstSpent,
        total: spending.totalSpent,
        requests: spending.requestCount,
      };
      summary.total += spending.totalSpent;
    });

    const activeProviders = Object.keys(this.budgets).filter((p) => this.budgets[p].active);
    summary.averagePerProvider = parseFloat((summary.total / (activeProviders.length || 1)).toFixed(4));

    return summary;
  }

  /**
   * Reset spending (for testing or monthly refresh)
   * @param {string} providerId - Provider ID, or null for all
   */
  resetSpending(providerId = null) {
    if (providerId) {
      this.spending[providerId] = {
        monthlySpent: 0,
        burstSpent: 0,
        totalSpent: 0,
        requestCount: 0,
        monthStart: this.getMonthStart(),
        lastUpdated: Date.now(),
      };
    } else {
      this.spending = this.initializeSpending();
    }
  }
}

export default BudgetManager;
