// @version 2.1.28
/**
 * Cost Calculator Engine
 * Phase 3: Cost-Aware Optimization
 *
 * Calculates ROI, cost per capability, and efficiency metrics
 * to enable budget-conscious training decisions.
 */

export class CostCalculator {
  constructor() {
    // Provider cost registry ($/request or $/token)
    this.providers = {
      anthropic: { cost: 0.015, name: "Claude API", tier: "standard" },
      openai: { cost: 0.02, name: "GPT-4", tier: "premium" },
      gemini: { cost: 0.0125, name: "Google Gemini", tier: "standard" },
      deepseek: { cost: 0.008, name: "DeepSeek", tier: "economy" },
      "hf-local": { cost: 0, name: "Hugging Face Local", tier: "free" },
    };

    // Cohort budgets (monthly allocation per cohort)
    this.cohortBudgets = {
      default: { monthly: 10000, daily: 350 },
      premium: { monthly: 25000, daily: 850 },
      economy: { monthly: 2500, daily: 85 },
    };

    // Cost tracking per cohort
    this.cohortCosts = new Map(); // cohortId -> { spent, capabilitiesActivated, workflows }
    this.workflowCosts = new Map(); // workflowId -> { provider, cost, capabilityGain, roiScore }
  }

  /**
   * Get provider cost ($/request)
   */
  getProviderCost(provider) {
    return (this.providers[provider] || { cost: 0.01 }).cost;
  }

  /**
   * Calculate ROI: Capability Value / Provider Cost
   * Higher ROI = better efficiency
   */
  calculateROI(capabilityGain, providerCost) {
    if (providerCost === 0) return Number.MAX_VALUE; // Free providers are infinitely efficient
    return capabilityGain / (providerCost + 0.001); // Avoid division by zero
  }

  /**
   * Rank workflows by ROI (cost-aware)
   */
  rankByROI(workflows, providerRegistry = this.providers) {
    return workflows
      .map((wf) => {
        const provider = wf.provider || "anthropic";
        const cost = providerRegistry[provider]?.cost || 0.01;
        const gain = wf.expectedGain || 0.5;

        // Base ROI
        const roi = this.calculateROI(gain, cost);

        // Efficiency coefficient: boost cheap wins, penalize expensive
        const costTier =
          cost === 0
            ? 1.8
            : cost < 0.01
              ? 1.5
              : cost < 0.015
                ? 1.0
                : cost < 0.02
                  ? 0.8
                  : 0.5;

        const weightedROI = roi * costTier;

        return {
          ...wf,
          provider,
          cost,
          roi,
          costTier:
            cost === 0
              ? "free"
              : cost < 0.01
                ? "cheap"
                : cost < 0.015
                  ? "standard"
                  : "premium",
          weightedROI,
          efficiencyCoeff: costTier,
        };
      })
      .sort((a, b) => b.weightedROI - a.weightedROI);
  }

  /**
   * Filter workflows by budget
   */
  filterAffordable(workflows, budgetRemaining) {
    return workflows.filter((wf) => {
      const cost = wf.cost || this.getProviderCost(wf.provider);
      return cost <= budgetRemaining;
    });
  }

  /**
   * Find alternative providers for a workflow (cheaper option)
   */
  findCheaperAlternative(workflow, maxCost) {
    const originalCost = this.getProviderCost(workflow.provider);
    const cheaperalternatives = Object.entries(this.providers)
      .filter(([_, p]) => p.cost < originalCost && p.cost <= maxCost)
      .map(([prov, p]) => ({
        provider: prov,
        name: p.name,
        cost: p.cost,
        savings: originalCost - p.cost,
      }))
      .sort((a, b) => a.cost - b.cost);

    return cheaperalternatives.length > 0 ? cheaperalternatives[0] : null;
  }

  /**
   * Record workflow execution and cost
   */
  recordWorkflow(cohortId, workflowId, provider, cost, capabilityGain) {
    if (!this.cohortCosts.has(cohortId)) {
      this.cohortCosts.set(cohortId, {
        spent: 0,
        capabilitiesActivated: 0,
        workflows: [],
      });
    }

    const cohort = this.cohortCosts.get(cohortId);
    cohort.spent += cost;
    cohort.capabilitiesActivated += capabilityGain;
    cohort.workflows.push({
      workflowId,
      provider,
      cost,
      capabilityGain,
      timestamp: new Date().toISOString(),
      costPerCapability: capabilityGain > 0 ? cost / capabilityGain : cost,
    });

    this.workflowCosts.set(workflowId, {
      provider,
      cost,
      capabilityGain,
      roiScore: capabilityGain > 0 ? capabilityGain / cost : 0,
    });
  }

  /**
   * Get metrics for a cohort
   */
  getMetrics(cohortId) {
    const cohort = this.cohortCosts.get(cohortId) || {
      spent: 0,
      capabilitiesActivated: 0,
      workflows: [],
    };

    const budget = this.cohortBudgets.default; // Could be per-cohort later
    const costPerCapability =
      cohort.capabilitiesActivated > 0
        ? cohort.spent / cohort.capabilitiesActivated
        : 0;

    // Calculate provider distribution
    const providerDistribution = {};
    cohort.workflows.forEach((wf) => {
      if (!providerDistribution[wf.provider]) {
        providerDistribution[wf.provider] = { count: 0, spent: 0 };
      }
      providerDistribution[wf.provider].count++;
      providerDistribution[wf.provider].spent += wf.cost;
    });

    return {
      cohortId,
      totalSpent: cohort.spent,
      budgetRemaining: budget.monthly - cohort.spent,
      budgetUtilization: Math.round((cohort.spent / budget.monthly) * 100),
      capabilitiesActivated: cohort.capabilitiesActivated,
      workflowsExecuted: cohort.workflows.length,
      costPerCapability,
      avgCostPerWorkflow:
        cohort.workflows.length > 0
          ? cohort.spent / cohort.workflows.length
          : 0,
      providerDistribution,
      providerCount: Object.keys(providerDistribution).length,
      efficiency: costPerCapability > 0 ? 100 / costPerCapability : 0, // Higher is better
    };
  }

  /**
   * Compare efficiency vs baseline
   */
  getEfficiencyGain(cohortId, baselineCostPerCapability = 200) {
    const metrics = this.getMetrics(cohortId);
    if (metrics.costPerCapability === 0) return 0;
    return (baselineCostPerCapability / metrics.costPerCapability).toFixed(2);
  }

  /**
   * Get provider efficiency rankings
   */
  getProviderEfficiency(workflows = []) {
    const stats = {};

    workflows.forEach((wf) => {
      const provider = wf.provider || "anthropic";
      if (!stats[provider]) {
        stats[provider] = {
          provider,
          count: 0,
          totalCost: 0,
          totalGain: 0,
          avgROI: 0,
        };
      }
      stats[provider].count++;
      stats[provider].totalCost += wf.cost || this.getProviderCost(provider);
      stats[provider].totalGain += wf.expectedGain || 0.5;
    });

    return Object.values(stats)
      .map((s) => ({
        ...s,
        avgROI: s.totalGain > 0 ? s.totalGain / s.totalCost : 0,
        name: this.providers[s.provider]?.name || s.provider,
      }))
      .sort((a, b) => b.avgROI - a.avgROI);
  }

  /**
   * Suggest budget policy for cohort
   */
  suggestBudgetPolicy(cohortId, metrics) {
    const utilizationRate = metrics.budgetUtilization / 100;

    // If overspending, reduce budget or increase efficiency
    if (utilizationRate > 0.9) {
      return {
        action: "reduce-or-optimize",
        message: "Budget nearly exhausted, consider cheaper providers",
        suggestion:
          "Switch to economy providers or increase capability value targets",
      };
    }

    // If underspending, could allocate more for training
    if (utilizationRate < 0.4) {
      return {
        action: "increase-allocation",
        message: "Budget underutilized, can allocate more to training",
        suggestion: "Increase monthly budget or train more cohorts",
      };
    }

    // If balanced and efficient
    if (metrics.costPerCapability < 150) {
      return {
        action: "maintain",
        message: "Budget and efficiency are well-balanced",
        suggestion: "Continue current strategy, monitor for improvements",
      };
    }

    return {
      action: "optimize",
      message: "Review provider mix for efficiency gains",
    };
  }

  /**
   * Export all metrics for reporting
   */
  export() {
    const allMetrics = {};
    for (const [cohortId] of this.cohortCosts) {
      allMetrics[cohortId] = this.getMetrics(cohortId);
    }
    return {
      providers: this.providers,
      cohortBudgets: this.cohortBudgets,
      cohortMetrics: allMetrics,
      providerStats: this.getProviderEfficiency(),
    };
  }
}

export default CostCalculator;
