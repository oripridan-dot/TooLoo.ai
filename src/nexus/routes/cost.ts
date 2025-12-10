// @version 3.3.404
/**
 * Cost & Decision Transparency API
 *
 * Exposes TooLoo's intelligent provider selection decisions and cost tracking
 * to give users visibility into how TooLoo orchestrates AI providers.
 *
 * V3.3.404: Added persistence to data/decisions.json
 */
import { Router } from 'express';
import { precog } from '../../precog/index.js';
import fs from 'fs-extra';
import path from 'path';

const router = Router();

// Decision history (in-memory, persists during session)
interface Decision {
  id: string;
  timestamp: string;
  taskType: string;
  detectedDomain: string;
  selectedProvider: string;
  selectedModel: string;
  reasoning: string;
  costEstimate: number;
  complexity: string;
}

const decisions: Decision[] = [];
const MAX_DECISIONS = 100;
const DECISIONS_FILE = path.join(process.cwd(), 'data', 'decisions.json');

// V3.3.404: Load decisions from file on startup
(async () => {
  try {
    if (await fs.pathExists(DECISIONS_FILE)) {
      const data = await fs.readJson(DECISIONS_FILE);
      if (Array.isArray(data)) {
        decisions.push(...data.slice(0, MAX_DECISIONS));
        console.log(`[Cost] Loaded ${decisions.length} decisions from disk`);
      }
    }
  } catch (err) {
    console.warn('[Cost] Could not load decisions from disk:', err);
  }
})();

/**
 * V3.3.404: Persist decisions to disk (async, non-blocking)
 */
async function persistDecisions(): Promise<void> {
  try {
    await fs.ensureDir(path.dirname(DECISIONS_FILE));
    await fs.writeJson(DECISIONS_FILE, decisions.slice(0, MAX_DECISIONS), { spaces: 2 });
  } catch (err) {
    console.error('[Cost] Failed to persist decisions:', err);
  }
}

/**
 * Record a provider selection decision
 * Called internally by chat/generate endpoints
 */
export function recordDecision(decision: Omit<Decision, 'id' | 'timestamp'>) {
  const entry: Decision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...decision,
  };

  decisions.unshift(entry);

  // Keep only recent decisions
  if (decisions.length > MAX_DECISIONS) {
    decisions.splice(MAX_DECISIONS);
  }

  // V3.3.404: Persist to disk (non-blocking)
  persistDecisions();

  return entry;
}

/**
 * GET /api/v1/cost/summary
 * Returns aggregate cost and usage statistics
 */
router.get('/summary', (req, res) => {
  try {
    // Access costCalculator via providers engine
    const metrics = (precog.providers as any).costCalculator?.export?.() || {
      providers: {},
      cohortBudgets: { default: { monthly: 10000, daily: 350 } },
      cohortMetrics: {},
      modelPricing: {},
    };

    // Get default cohort metrics
    const defaultMetrics = (precog.providers as any).costCalculator?.getMetrics?.('default') || {
      totalSpent: 0,
      budgetRemaining: 10000,
      budgetUtilization: 0,
      workflowsExecuted: 0,
      providerDistribution: {},
      avgCostPerWorkflow: 0,
    };

    res.json({
      ok: true,
      data: {
        session: {
          totalSpent: defaultMetrics.totalSpent,
          budgetRemaining: defaultMetrics.budgetRemaining,
          budgetUtilization: defaultMetrics.budgetUtilization,
          requestCount: defaultMetrics.workflowsExecuted,
          avgCostPerRequest: defaultMetrics.avgCostPerWorkflow,
        },
        providerDistribution: defaultMetrics.providerDistribution,
        providers: metrics.providers,
        budgets: metrics.cohortBudgets,
        recentDecisions: decisions.slice(0, 10),
        timestamp: Date.now(),
      },
    });
  } catch (e: any) {
    console.error('[Cost] Summary error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/cost/decisions
 * Returns recent provider selection decisions with reasoning
 */
router.get('/decisions', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 100);

    res.json({
      ok: true,
      data: {
        decisions: decisions.slice(0, limit),
        total: decisions.length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/cost/pricing
 * Returns current model pricing information
 */
router.get('/pricing', (req, res) => {
  try {
    const metrics = (precog.providers as any).costCalculator?.export?.() || {};

    res.json({
      ok: true,
      data: {
        modelPricing: metrics.modelPricing || {},
        providers: metrics.providers || {},
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
