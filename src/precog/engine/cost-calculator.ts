// @version 3.0.0
/**
 * Cost Calculator Engine
 * Phase 3: Cost-Aware Optimization
 * V3: Per-response cost tracking with model-specific pricing
 *
 * Calculates ROI, cost per capability, and efficiency metrics
 * to enable budget-conscious training decisions.
 */

// V3: Model-specific pricing (per 1K tokens)
const MODEL_PRICING = {
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'o1-preview': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
  'dall-e-3': { fixed: 0.04 }, // Per image

  // Anthropic
  'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // Google
  'gemini-2.0-flash': { input: 0.0, output: 0.0 }, // Free tier
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-3-pro-preview': { input: 0.00125, output: 0.005 },

  // DeepSeek
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'deepseek-coder': { input: 0.00014, output: 0.00028 },
};

export class CostCalculator {
  private providers: Record<string, { cost: number; name: string; tier: string }>;
  private cohortBudgets: Record<string, { monthly: number; daily: number }>;
  private cohortCosts: Map<
    string,
    { spent: number; capabilitiesActivated: number; workflows: any[] }
  >;
  private workflowCosts: Map<
    string,
    { provider: string; cost: number; capabilityGain: number; roiScore: number }
  >;

  // V3: Per-request cost tracking
  private requestCosts: Map<string, RequestCostRecord>;

  constructor() {
    // Provider cost registry ($/request or $/token)
    this.providers = {
      anthropic: { cost: 0.015, name: 'Claude API', tier: 'standard' },
      openai: { cost: 0.02, name: 'GPT-4', tier: 'premium' },
      gemini: { cost: 0.0125, name: 'Google Gemini', tier: 'standard' },
      deepseek: { cost: 0.008, name: 'DeepSeek', tier: 'economy' },
      'hf-local': { cost: 0, name: 'Hugging Face Local', tier: 'free' },
    };

    // Cohort budgets (monthly allocation per cohort)
    this.cohortBudgets = {
      default: { monthly: 10000, daily: 350 },
      premium: { monthly: 25000, daily: 850 },
      economy: { monthly: 2500, daily: 85 },
    };

    // Cost tracking per cohort
    this.cohortCosts = new Map();
    this.workflowCosts = new Map();

    // V3: Initialize request cost tracking
    this.requestCosts = new Map();
  }

  /**
   * Get provider cost ($/request)
   */
  getProviderCost(provider: string): number {
    const providerData = this.providers[provider];
    return providerData ? providerData.cost : 0.01;
  }

  /**
   * V3: Calculate cost for a specific model and token count
   */
  calculateModelCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];

    if (!pricing) {
      // Fall back to provider-level pricing
      console.warn(`[CostCalculator] Unknown model: ${model}, using default pricing`);
      return 0.015; // Default per-request cost
    }

    if ('fixed' in pricing) {
      return pricing.fixed;
    }

    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * V3: Start tracking a request
   */
  startRequest(requestId: string, sessionId?: string): void {
    this.requestCosts.set(requestId, {
      requestId,
      sessionId,
      startTime: Date.now(),
      providers: [],
      totalCost: 0,
      totalLatency: 0,
    });
  }

  /**
   * V3: Record a provider call within a request
   */
  recordProviderCall(
    requestId: string,
    provider: string,
    model: string,
    options: {
      inputTokens?: number;
      outputTokens?: number;
      latencyMs?: number;
      success?: boolean;
      role?: string;
    } = {}
  ): number {
    const record = this.requestCosts.get(requestId);
    if (!record) {
      console.warn(`[CostCalculator] Unknown request: ${requestId}`);
      return 0;
    }

    const cost =
      options.inputTokens && options.outputTokens
        ? this.calculateModelCost(model, options.inputTokens, options.outputTokens)
        : this.getProviderCost(provider);

    record.providers.push({
      provider,
      model,
      cost,
      latencyMs: options.latencyMs || 0,
      success: options.success ?? true,
      role: options.role || 'generator',
      tokens: {
        input: options.inputTokens || 0,
        output: options.outputTokens || 0,
      },
    });

    record.totalCost += cost;
    record.totalLatency += options.latencyMs || 0;

    return cost;
  }

  /**
   * V3: Complete and finalize a request
   */
  completeRequest(requestId: string): RequestCostRecord | null {
    const record = this.requestCosts.get(requestId);
    if (!record) return null;

    record.endTime = Date.now();
    record.totalLatency = record.endTime - record.startTime;

    // Keep record for reporting (could implement TTL cleanup)
    return record;
  }

  /**
   * V3: Get cost summary for a request
   */
  getRequestCostSummary(requestId: string): {
    totalCost: number;
    costBreakdown: Record<string, number>;
    providers: string[];
    models: string[];
  } | null {
    const record = this.requestCosts.get(requestId);
    if (!record) return null;

    const costBreakdown: Record<string, number> = {};
    const providers: string[] = [];
    const models: string[] = [];

    for (const p of record.providers) {
      const key = `${p.provider}_${p.role}`;
      costBreakdown[key] = (costBreakdown[key] || 0) + p.cost;

      if (!providers.includes(p.provider)) providers.push(p.provider);
      if (!models.includes(p.model)) models.push(p.model);
    }

    return {
      totalCost: record.totalCost,
      costBreakdown,
      providers,
      models,
    };
  }

  /**
   * V3: Format cost for display
   */
  formatCost(cost: number): string {
    if (cost < 0.001) return '<$0.001';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(3)}`;
  }

  /**
   * V3: Get aggregate stats for a session
   */
  getSessionStats(sessionId: string): {
    requestCount: number;
    totalCost: number;
    avgCostPerRequest: number;
    providerDistribution: Record<string, number>;
  } {
    let requestCount = 0;
    let totalCost = 0;
    const providerDistribution: Record<string, number> = {};

    for (const record of this.requestCosts.values()) {
      if (record.sessionId === sessionId) {
        requestCount++;
        totalCost += record.totalCost;

        for (const p of record.providers) {
          providerDistribution[p.provider] = (providerDistribution[p.provider] || 0) + 1;
        }
      }
    }

    return {
      requestCount,
      totalCost,
      avgCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
      providerDistribution,
    };
  }

  /**
   * Calculate ROI: Capability Value / Provider Cost
   * Higher ROI = better efficiency
   */
  calculateROI(capabilityGain: number, providerCost: number): number {
    if (providerCost === 0) return Number.MAX_VALUE;
    return capabilityGain / (providerCost + 0.001);
  }

  /**
   * Rank workflows by ROI (cost-aware)
   */
  rankByROI(workflows: any[], providerRegistry = this.providers): any[] {
    return workflows
      .map((wf) => {
        const provider = wf.provider || 'anthropic';
        const providerData = providerRegistry[provider];
        const cost = providerData?.cost ?? 0.01;
        const gain = wf.expectedGain || 0.5;

        const roi = this.calculateROI(gain, cost);

        const costTier =
          cost === 0 ? 1.8 : cost < 0.01 ? 1.5 : cost < 0.015 ? 1.0 : cost < 0.02 ? 0.8 : 0.5;

        const weightedROI = roi * costTier;

        return {
          ...wf,
          provider,
          cost,
          roi,
          costTier:
            cost === 0 ? 'free' : cost < 0.01 ? 'cheap' : cost < 0.015 ? 'standard' : 'premium',
          weightedROI,
          efficiencyCoeff: costTier,
        };
      })
      .sort((a, b) => b.weightedROI - a.weightedROI);
  }

  /**
   * Filter workflows by budget
   */
  filterAffordable(workflows: any[], budgetRemaining: number): any[] {
    return workflows.filter((wf) => {
      const cost = wf.cost || this.getProviderCost(wf.provider);
      return cost <= budgetRemaining;
    });
  }

  /**
   * Find alternative providers for a workflow (cheaper option)
   */
  findCheaperAlternative(
    workflow: any,
    maxCost: number
  ): { provider: string; name: string; cost: number; savings: number } | null {
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

    const firstAlternative = cheaperalternatives[0];
    return firstAlternative ?? null;
  }

  /**
   * Record workflow execution and cost
   */
  recordWorkflow(
    cohortId: string,
    workflowId: string,
    provider: string,
    cost: number,
    capabilityGain: number
  ): void {
    if (!this.cohortCosts.has(cohortId)) {
      this.cohortCosts.set(cohortId, {
        spent: 0,
        capabilitiesActivated: 0,
        workflows: [],
      });
    }

    const cohort = this.cohortCosts.get(cohortId)!;
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
  getMetrics(cohortId: string): any {
    const cohort = this.cohortCosts.get(cohortId) || {
      spent: 0,
      capabilitiesActivated: 0,
      workflows: [],
    };

    const budget = this.cohortBudgets['default'] ?? { monthly: 10000, daily: 350 };
    const costPerCapability =
      cohort.capabilitiesActivated > 0 ? cohort.spent / cohort.capabilitiesActivated : 0;

    const providerDistribution: Record<string, { count: number; spent: number }> = {};
    cohort.workflows.forEach((wf) => {
      const providerDist = providerDistribution[wf.provider];
      if (!providerDist) {
        providerDistribution[wf.provider] = { count: 0, spent: 0 };
      }
      providerDistribution[wf.provider]!.count++;
      providerDistribution[wf.provider]!.spent += wf.cost;
    });

    return {
      cohortId,
      totalSpent: cohort.spent,
      budgetRemaining: budget.monthly - cohort.spent,
      budgetUtilization: Math.round((cohort.spent / budget.monthly) * 100),
      capabilitiesActivated: cohort.capabilitiesActivated,
      workflowsExecuted: cohort.workflows.length,
      costPerCapability,
      avgCostPerWorkflow: cohort.workflows.length > 0 ? cohort.spent / cohort.workflows.length : 0,
      providerDistribution,
      providerCount: Object.keys(providerDistribution).length,
      efficiency: costPerCapability > 0 ? 100 / costPerCapability : 0,
    };
  }

  /**
   * Export all metrics for reporting
   */
  export(): any {
    const allMetrics: Record<string, any> = {};
    for (const [cohortId] of this.cohortCosts) {
      allMetrics[cohortId] = this.getMetrics(cohortId);
    }
    return {
      providers: this.providers,
      cohortBudgets: this.cohortBudgets,
      cohortMetrics: allMetrics,
      modelPricing: MODEL_PRICING,
    };
  }
}

// V3: Request cost record type
interface RequestCostRecord {
  requestId: string;
  sessionId?: string;
  startTime: number;
  endTime?: number;
  providers: {
    provider: string;
    model: string;
    cost: number;
    latencyMs: number;
    success: boolean;
    role: string;
    tokens: { input: number; output: number };
  }[];
  totalCost: number;
  totalLatency: number;
}

export default CostCalculator;
