// @version 2.1.11
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import ProviderSelector from '../lib/provider-selector.js';
import BudgetManager from '../lib/budget-manager.js';

const app = express();
const PORT = process.env.PROVIDER_PORT || 3200;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Initialize services
let eventBus = null;
let providerSelector = null;
let budgetManager = null;

/**
 * Initialize services with Event Bus
 */
async function initializeServices(bus) {
  eventBus = bus;
  providerSelector = new ProviderSelector(eventBus);
  budgetManager = new BudgetManager(eventBus);

  // Subscribe to training events
  if (eventBus) {
    await eventBus.subscribe('training.started', async (event) => {
      console.log('[Provider Service] Received training.started event:', event.type);
      // Could trigger provider selection here if needed
    });

    await eventBus.subscribe('training.completed', async (event) => {
      console.log('[Provider Service] Received training.completed event:', event.type);
    });
  }

  console.log('[Provider Service] Services initialized');
}

/**
 * GET /health - Service health check
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'provider', uptime: process.uptime() });
});

/**
 * POST /api/v1/providers/select
 * Select best provider for a query
 */
app.post('/api/v1/providers/select', async (req, res) => {
  try {
    const {
      query = '',
      focusArea = 'general',
      estimatedTokens = 500,
      preferFree = false,
      highQuality = false,
    } = req.body;

    // Try to select a provider
    const selection = await providerSelector.selectProvider({
      query,
      focusArea,
      estimatedTokens,
      preferFree,
      highQuality,
    });

    // Check budget
    const canAfford = budgetManager.canAfford(
      selection.providerId,
      selection.estimatedCost
    );

    if (!canAfford) {
      // Try to find cheaper alternative
      const providers = Object.values(providerSelector.providers)
        .filter((p) => p.available)
        .sort((a, b) => a.costPerToken - b.costPerToken);

      for (const provider of providers) {
        const cost = provider.costPerToken * estimatedTokens;
        if (budgetManager.canAfford(provider.id, cost)) {
          selection.providerId = provider.id;
          selection.provider = provider;
          selection.estimatedCost = cost;
          break;
        }
      }
    }

    res.json({
      success: true,
      selection: {
        selectionId: selection.id,
        providerId: selection.providerId,
        provider: {
          id: selection.provider.id,
          name: selection.provider.name,
          endpoint: selection.provider.endpoint,
          model: selection.provider.models[0],
        },
        estimatedCost: selection.estimatedCost,
        score: selection.score,
      },
      budgetStatus: budgetManager.getBudgetForProvider(selection.providerId),
    });
  } catch (error) {
    console.error('Provider selection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/providers/status
 * Get status of all providers
 */
app.get('/api/v1/providers/status', (req, res) => {
  try {
    const status = providerSelector.getProviderStatus();
    res.json({
      success: true,
      timestamp: Date.now(),
      providers: status,
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/providers/costs
 * Get cost summary by provider
 */
app.get('/api/v1/providers/costs', (req, res) => {
  try {
    const summary = providerSelector.getCostSummary();
    res.json({
      success: true,
      timestamp: Date.now(),
      costs: summary,
    });
  } catch (error) {
    console.error('Cost summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/budget/check
 * Check if budget can afford a cost
 */
app.post('/api/v1/budget/check', (req, res) => {
  try {
    const { providerId, estimatedCost, useBurst = false } = req.body;

    if (!providerId || estimatedCost === undefined) {
      return res.status(400).json({
        success: false,
        error: 'providerId and estimatedCost required',
      });
    }

    const canAfford = budgetManager.canAfford(providerId, estimatedCost, useBurst);
    const budgetStatus = budgetManager.getBudgetForProvider(providerId);

    res.json({
      success: true,
      providerId,
      estimatedCost,
      canAfford,
      budgetStatus,
    });
  } catch (error) {
    console.error('Budget check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/budget/record-cost
 * Record actual cost for a provider
 */
app.post('/api/v1/budget/record-cost', async (req, res) => {
  try {
    const { providerId, actualCost, metadata = {} } = req.body;

    if (!providerId || actualCost === undefined) {
      return res.status(400).json({
        success: false,
        error: 'providerId and actualCost required',
      });
    }

    const result = await budgetManager.recordCost(providerId, actualCost, metadata);

    res.json({
      success: true,
      record: result.record,
      alert: result.alert,
      budgetStatus: result.budgetStatus,
    });
  } catch (error) {
    console.error('Record cost error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/budget/status
 * Get budget consumption report
 */
app.get('/api/v1/budget/status', (req, res) => {
  try {
    const status = budgetManager.getBudgetStatus();
    const summary = budgetManager.getSpendingSummary();

    res.json({
      success: true,
      timestamp: Date.now(),
      budgets: status,
      summary,
    });
  } catch (error) {
    console.error('Budget status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/providers/selections
 * Get provider selection statistics
 */
app.get('/api/v1/providers/selections', (req, res) => {
  try {
    const stats = providerSelector.getSelectionStats();
    res.json({
      success: true,
      timestamp: Date.now(),
      selections: stats,
    });
  } catch (error) {
    console.error('Selections error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/budget/alerts
 * Get recent budget alerts
 */
app.get('/api/v1/budget/alerts', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const alerts = budgetManager.getAlerts(limit);

    res.json({
      success: true,
      timestamp: Date.now(),
      alerts,
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/providers/health
 * Service health check
 */
app.get('/api/v1/providers/health', (req, res) => {
  const status = providerSelector.getProviderStatus();
  const availableCount = Object.values(status).filter((p) => p.available).length;

  res.json({
    status: 'healthy',
    service: 'provider-service',
    port: PORT,
    timestamp: Date.now(),
    providers: {
      total: Object.keys(status).length,
      available: availableCount,
    },
  });
});

/**
 * GET /api/v1/system/info
 * System information
 */
app.get('/api/v1/system/info', (req, res) => {
  res.json({
    service: 'provider-service',
    port: PORT,
    version: '1.0.0',
    endpoints: [
      'POST /api/v1/providers/select - Select best provider',
      'GET /api/v1/providers/status - Provider status',
      'GET /api/v1/providers/costs - Cost summary',
      'GET /api/v1/providers/selections - Selection stats',
      'POST /api/v1/budget/check - Check budget availability',
      'POST /api/v1/budget/record-cost - Record actual cost',
      'GET /api/v1/budget/status - Budget status report',
      'GET /api/v1/budget/alerts - Recent alerts',
      'GET /api/v1/providers/health - Service health',
      'GET /api/v1/system/info - This endpoint',
    ],
  });
});

/**
 * Error handler
 */
app.use((err, req, res) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

/**
 * Start server
 */
function start(bus) {
  return new Promise((resolve, reject) => {
    initializeServices(bus)
      .then(() => {
        const server = app.listen(PORT, () => {
          console.log(`[Provider Service] Listening on port ${PORT}`);
          resolve(server);
        });

        // Graceful shutdown
        const shutdown = async () => {
          console.log('[Provider Service] Shutting down gracefully...');
          server.close(() => {
            console.log('[Provider Service] Closed');
            process.exit(0);
          });

          // Force exit after 5 seconds
          setTimeout(() => {
            console.error('[Provider Service] Forced exit after timeout');
            process.exit(1);
          }, 5000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
      })
      .catch(reject);
  });
}

export { app, start, ProviderSelector, BudgetManager };

// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start(null).catch((err) => {
    console.error('Startup error:', err);
    process.exit(1);
  });
}
