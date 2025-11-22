/**
 * Month 2: Provider Control API
 * 
 * Handles:
 * - Provider switching via natural language
 * - Cost/performance impact forecasting
 * - Provider status monitoring
 * - Failover strategies
 */

// ============================================================================
// PROVIDER MANAGEMENT
// ============================================================================

/**
 * Get current active provider
 */
export async function getActiveProvider() {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/active', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Switch to a different provider
 */
export async function switchProvider(providerName) {
  try {
    // Get current provider first
    const current = await getActiveProvider();
    
    // Validate provider
    const validProviders = ['anthropic', 'openai', 'gemini', 'deepseek', 'ollama'];
    if (!validProviders.includes(providerName.toLowerCase())) {
      throw new Error('Unknown provider: ' + providerName);
    }

    // Request switch via budget-server
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerName }),
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error('Failed to switch provider');
    }

    const data = await response.json();
    
    return {
      action: 'switch',
      from: current?.name || 'unknown',
      to: providerName,
      status: 'switched',
      details: data,
    };
  } catch (error) {
    return {
      action: 'switch',
      to: providerName,
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Get provider performance metrics
 */
export async function getProviderMetrics(providerName) {
  try {
    const response = await fetch(
      'http://127.0.0.1:3000/api/v1/reports/provider-' + providerName,
      { timeout: 2000 }
    );
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Get all providers and their status
 */
export async function getAllProvidersStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/status', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    
    return {
      timestamp: new Date().toISOString(),
      providers: data.active || [],
      summary: {
        available: data.available || 0,
        busy: data.busy || 0,
      },
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      providers: [],
    };
  }
}

// ============================================================================
// IMPACT FORECASTING
// ============================================================================

/**
 * Forecast impact of switching providers
 */
export async function forecastSwitchImpact(targetProvider) {
  try {
    const [current, metrics] = await Promise.all([
      getActiveProvider(),
      getProviderMetrics(targetProvider),
    ]);

    if (metrics.error) {
      throw new Error('Could not fetch target provider metrics');
    }

    // Compare latency
    const currentLatency = current?.latency || 0;
    const targetLatency = metrics.latency || 0;
    const latencyChange = ((targetLatency - currentLatency) / currentLatency) * 100;

    // Compare cost
    const currentCost = current?.costPerCall || 0;
    const targetCost = metrics.costPerCall || 0;
    const costChange = ((targetCost - currentCost) / currentCost) * 100;

    // Compare success rate
    const currentSuccess = current?.successRate || 0.99;
    const targetSuccess = metrics.successRate || 0.99;

    return {
      switchFrom: current?.name || 'unknown',
      switchTo: targetProvider,
      forecast: {
        latency: {
          current: currentLatency,
          target: targetLatency,
          changePercent: latencyChange.toFixed(1),
          assessment: latencyChange < -10 ? 'faster' : (latencyChange > 10 ? 'slower' : 'similar'),
        },
        cost: {
          current: currentCost,
          target: targetCost,
          changePercent: costChange.toFixed(1),
          assessment: costChange < -10 ? 'cheaper' : (costChange > 10 ? 'more expensive' : 'similar'),
        },
        reliability: {
          current: (currentSuccess * 100).toFixed(1) + '%',
          target: (targetSuccess * 100).toFixed(1) + '%',
        },
      },
      recommendation: generateRecommendation(latencyChange, costChange),
    };
  } catch (error) {
    return {
      switchTo: targetProvider,
      error: error.message,
    };
  }
}

/**
 * Generate recommendation based on impact
 */
function generateRecommendation(latencyChange, costChange) {
  if (latencyChange < -20 && costChange < 20) {
    return 'Highly recommended - significantly faster with acceptable cost';
  }
  if (costChange < -30) {
    return 'Recommended for cost optimization - similar performance, cheaper';
  }
  if (latencyChange > 30) {
    return 'Not recommended - significantly slower';
  }
  if (costChange > 50) {
    return 'Consider cost implications - 50% more expensive';
  }
  return 'Switch is viable - similar performance and cost';
}

// ============================================================================
// FAILOVER & POLICY
// ============================================================================

/**
 * Set provider policy (balanced, cost-optimized, latency-first, custom)
 */
export async function setProviderPolicy(policyName, config = {}) {
  try {
    const policies = {
      balanced: {
        maxLatency: 500,
        costLimit: 50,
        prioritize: 'balanced',
      },
      'cost-optimized': {
        maxLatency: 1000,
        costLimit: 20,
        prioritize: 'cost',
      },
      'latency-first': {
        maxLatency: 200,
        costLimit: 100,
        prioritize: 'latency',
      },
    };

    const policy = policies[policyName] || config;

    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy),
      timeout: 5000,
    });

    if (!response.ok) throw new Error('Failed to set policy');

    return {
      action: 'set_policy',
      policy: policyName,
      config: policy,
      status: 'applied',
    };
  } catch (error) {
    return {
      action: 'set_policy',
      policy: policyName,
      status: 'error',
      error: error.message,
    };
  }
}

/**
 * Configure failover chain
 */
export async function setFailoverChain(providers) {
  try {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error('Failover chain requires at least one provider');
    }

    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/failover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain: providers }),
      timeout: 5000,
    });

    if (!response.ok) throw new Error('Failed to set failover chain');

    return {
      action: 'set_failover',
      chain: providers,
      status: 'applied',
    };
  } catch (error) {
    return {
      action: 'set_failover',
      status: 'error',
      error: error.message,
    };
  }
}

// ============================================================================
// PROVIDER COMPARISON
// ============================================================================

/**
 * Compare two providers
 */
export async function compareProviders(provider1, provider2) {
  try {
    const [metrics1, metrics2] = await Promise.all([
      getProviderMetrics(provider1),
      getProviderMetrics(provider2),
    ]);

    if (metrics1.error || metrics2.error) {
      throw new Error('Could not fetch provider metrics');
    }

    return {
      comparison: {
        providers: [provider1, provider2],
        metrics: {
          latency: {
            [provider1]: metrics1.latency,
            [provider2]: metrics2.latency,
            faster: metrics1.latency < metrics2.latency ? provider1 : provider2,
          },
          cost: {
            [provider1]: metrics1.costPerCall,
            [provider2]: metrics2.costPerCall,
            cheaper: metrics1.costPerCall < metrics2.costPerCall ? provider1 : provider2,
          },
          reliability: {
            [provider1]: (metrics1.successRate * 100).toFixed(1) + '%',
            [provider2]: (metrics2.successRate * 100).toFixed(1) + '%',
            more_reliable: metrics1.successRate > metrics2.successRate ? provider1 : provider2,
          },
          calls: {
            [provider1]: metrics1.totalCalls || 0,
            [provider2]: metrics2.totalCalls || 0,
          },
        },
      },
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// API HANDLERS (for Express/server integration)
// ============================================================================

/**
 * POST /api/v1/provider/switch
 */
export async function handleSwitchProvider(req, res) {
  try {
    const { provider } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'Provider name required' });
    }
    const result = await switchProvider(provider);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/provider/active
 */
export async function handleGetActiveProvider(req, res) {
  try {
    const provider = await getActiveProvider();
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/provider/status
 */
export async function handleGetProvidersStatus(req, res) {
  try {
    const status = await getAllProvidersStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/provider/forecast
 */
export async function handleForecastSwitchImpact(req, res) {
  try {
    const { provider } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'Target provider required' });
    }
    const forecast = await forecastSwitchImpact(provider);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/provider/:name/metrics
 */
export async function handleGetProviderMetrics(req, res) {
  try {
    const { name } = req.params;
    const metrics = await getProviderMetrics(name);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/provider/policy
 */
export async function handleSetProviderPolicy(req, res) {
  try {
    const { policy, config } = req.body;
    if (!policy) {
      return res.status(400).json({ error: 'Policy name required' });
    }
    const result = await setProviderPolicy(policy, config);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/provider/compare
 */
export async function handleCompareProviders(req, res) {
  try {
    const { provider1, provider2 } = req.body;
    if (!provider1 || !provider2) {
      return res.status(400).json({ error: 'Two providers required' });
    }
    const comparison = await compareProviders(provider1, provider2);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Health check
 */
export function handleHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'provider-control-api',
    timestamp: new Date().toISOString(),
  });
}
