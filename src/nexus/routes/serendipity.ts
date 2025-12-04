// @version 2.2.646
/**
 * Serendipity Routes
 * API endpoints for the Serendipity Injector - controlled randomness system
 * for enabling unexpected discoveries and breakthroughs.
 */

import { Router, Request, Response } from 'express';
import { bus } from '../../core/event-bus.js';

export const serendipityRoutes = Router();

// Lazy import to avoid circular dependencies
let serendipityInjector: any = null;

const getSerendipityInjector = async () => {
  if (!serendipityInjector) {
    try {
      const module = await import('../../precog/engine/serendipity-injector.js');
      serendipityInjector = module.serendipityInjector;
      await serendipityInjector.initialize();
    } catch (error) {
      console.warn('[SerendipityRoutes] Serendipity Injector not available:', error);
    }
  }
  return serendipityInjector;
};

/**
 * GET /api/v1/serendipity/metrics
 * Get serendipity engine metrics and discovery statistics
 */
serendipityRoutes.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.json({
        success: true,
        data: {
          totalInjections: 0,
          byType: {},
          positiveOutcomes: 0,
          negativeOutcomes: 0,
          discoveries: 0,
          discoveryRate: 0,
          message: 'Serendipity Injector not initialized',
        },
      });
    }

    const metrics = injector.getMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get serendipity metrics: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/serendipity/discoveries
 * Get recent serendipity discoveries
 */
serendipityRoutes.get('/discoveries', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 20;
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.json({
        success: true,
        data: {
          discoveries: [],
          total: 0,
        },
      });
    }

    const discoveries = injector.getDiscoveries(limit);

    res.json({
      success: true,
      data: {
        discoveries,
        total: discoveries.length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get serendipity discoveries: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/serendipity/config
 * Get current serendipity configuration
 */
serendipityRoutes.get('/config', async (_req: Request, res: Response) => {
  try {
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          wildcardProbability: 0.1,
          temperatureVariation: true,
          promptMutationProbability: 0.08,
          mutationStrength: 'moderate',
        },
      });
    }

    const config = injector.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get serendipity config: ${errorMessage}`,
    });
  }
});

/**
 * PUT /api/v1/serendipity/config
 * Update serendipity configuration
 */
serendipityRoutes.put('/config', async (req: Request, res: Response) => {
  try {
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.status(503).json({
        success: false,
        error: 'Serendipity Injector not available',
      });
    }

    const updates = req.body;
    injector.updateConfig(updates);

    res.json({
      success: true,
      message: 'Configuration updated',
      data: injector.getConfig(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to update serendipity config: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/serendipity/toggle
 * Enable or disable the serendipity engine
 */
serendipityRoutes.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.status(503).json({
        success: false,
        error: 'Serendipity Injector not available',
      });
    }

    injector.setEnabled(enabled);

    bus.publish('nexus', 'serendipity:toggled', {
      enabled,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Serendipity engine ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        enabled,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to toggle serendipity: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/serendipity/inject
 * Manually trigger a serendipity injection for testing
 */
serendipityRoutes.post('/inject', async (req: Request, res: Response) => {
  try {
    const { type = 'wildcard' } = req.body;
    const injector = await getSerendipityInjector();

    if (!injector) {
      return res.status(503).json({
        success: false,
        error: 'Serendipity Injector not available',
      });
    }

    let result;

    switch (type) {
      case 'wildcard':
        result = injector.maybeInjectWildcard(
          'openai',
          ['openai', 'anthropic', 'gemini', 'deepseek'],
          { manual: true }
        );
        break;
      case 'temperature':
        result = injector.applyTemperatureVariation(0.7, { manual: true });
        break;
      case 'mutation':
        result = injector.maybeInjectPromptMutation('Write a function to sort an array', {
          manual: true,
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown injection type: ${type}`,
        });
    }

    res.json({
      success: true,
      message: `Serendipity injection attempted`,
      data: {
        type,
        result,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to inject serendipity: ${errorMessage}`,
    });
  }
});
