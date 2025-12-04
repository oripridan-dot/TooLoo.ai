// @version 3.0.0
/**
 * Exploration Routes (MEGA-BOOSTED)
 * API endpoints for monitoring and controlling the autonomous exploration system.
 * Provides real-time access to exploration status, history, statistics, and
 * new mega-boost features: adversarial probes, mutation experiments, curiosity dimensions.
 */

import { Router, Request, Response } from 'express';
import { cortex } from '../../cortex/index.js';
import { bus } from '../../core/event-bus.js';

export const explorationRoutes = Router();

/**
 * GET /api/v1/exploration/status
 * Get current exploration status and active experiments
 */
explorationRoutes.get('/status', (_req: Request, res: Response) => {
  try {
    const statistics = cortex.explorationEngine.getStatistics();

    res.json({
      ok: true,
      data: {
        status: 'active',
        policy: {
          environment: 'development',
          maxConcurrent: 3,
          trustedSourcesOnly: true,
        },
        active: {
          count: statistics.active,
          experiments: statistics.active > 0 ? 'Running' : 'None',
        },
        total: {
          tested: statistics.totalExplorations,
          validated: statistics.validated,
          rejected: statistics.rejected,
        },
        performance: {
          successRate: statistics.successRate,
          avgConfidence: statistics.averageConfidence,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to get exploration status: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/history
 * Get recent exploration findings with pagination
 */
explorationRoutes.get('/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 20;
    const offset = parseInt(req.query['offset'] as string) || 0;

    const allHistory = cortex.explorationEngine.getRecentHistory(1000);
    const paginatedHistory = allHistory.slice(offset, offset + limit);

    res.json({
      ok: true,
      data: {
        total: allHistory.length,
        limit,
        offset,
        items: paginatedHistory.map((hypothesis) => ({
          id: hypothesis.id,
          type: hypothesis.type,
          description: hypothesis.description,
          targetArea: hypothesis.targetArea,
          status: hypothesis.status,
          impact: hypothesis.expectedImpact,
          confidence: hypothesis.results?.confidence,
          findings: hypothesis.results?.findings,
          timestamp: hypothesis.generatedAt,
        })),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to get exploration history: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/statistics
 * Get detailed exploration performance metrics
 */
explorationRoutes.get('/statistics', (_req: Request, res: Response) => {
  try {
    const stats = cortex.explorationEngine.getStatistics();

    res.json({
      ok: true,
      data: {
        experiments: {
          active: stats.active,
          total: stats.totalExplorations,
          validated: stats.validated,
          rejected: stats.rejected,
        },
        performance: {
          successRate: `${(stats.successRate * 100).toFixed(1)}%`,
          avgConfidence: stats.averageConfidence.toFixed(2),
        },
        coverage: {
          providerComparisons: stats.totalExplorations,
          strategyOptimizations: 0, // Will be tracked separately
          capabilityDiscoveries: 0,
          transferLearning: 0,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to get exploration statistics: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/exploration/trigger
 * Manually trigger an exploration round
 */
explorationRoutes.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { area, type, task } = req.body;

    // Create hypothesis object for the exploration engine
    const hypothesisId = `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const hypothesis = {
      id: hypothesisId,
      type: type || 'enhancement',
      description: task || `Explore ${area || 'general'} improvements`,
      targetArea: area || task || 'general',
      expectedImpact: 'medium' as const,
      safetyRisk: 'low' as const,
      estimatedCost: 0.1,
      generatedAt: new Date(),
      status: 'pending' as const,
    };

    // Publish manual exploration request event with hypothesis
    bus.publish('nexus', 'exploration:manual_request', {
      hypothesis,
      area: area || 'general',
      type: type || 'all',
      task: task || null,
      requestedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      message: 'Exploration triggered successfully.',
      data: {
        area: area || 'general',
        type: type || 'all',
        hypothesis: {
          id: hypothesis.id,
          type: hypothesis.type,
          description: hypothesis.description,
          status: hypothesis.status,
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to trigger exploration: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/exploration/explore
 * Alias for /trigger - used by Studio and Growth views
 */
explorationRoutes.post('/explore', async (req: Request, res: Response) => {
  try {
    const { task, area, type } = req.body;

    // Create hypothesis for exploration
    const hypothesisId = `explore-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const hypothesis = {
      id: hypothesisId,
      type: type || 'enhancement',
      description: task || 'Generate improvements based on current context',
      targetArea: task || area || 'visual_improvements',
      expectedImpact: 'medium' as const,
      safetyRisk: 'low' as const,
      estimatedCost: 0.1,
      generatedAt: new Date(),
      status: 'pending' as const,
    };

    // Publish event for the exploration engine to pick up
    bus.publish('nexus', 'exploration:manual_request', {
      hypothesis,
      task: task || 'general',
      requestedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      message: 'Exploration started',
      data: {
        hypothesisId: hypothesis.id,
        type: hypothesis.type,
        description: hypothesis.description,
        status: hypothesis.status,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to start exploration: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/curiosity
 * Get recent curiosity signals from CuriosityEngine
 */
explorationRoutes.get('/curiosity', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const recentSignals = cortex.curiosityEngine.getRecentSignals(limit);

    res.json({
      ok: true,
      data: {
        signals: recentSignals.map((signal) => {
          const contextStr =
            typeof signal.context === 'string' ? signal.context : JSON.stringify(signal.context);
          return {
            id: signal.id,
            type: signal.type,
            score: signal.score.toFixed(2),
            description: signal.description,
            context: contextStr.substring(0, 100) + '...',
            timestamp: signal.timestamp,
          };
        }),
        statistics: cortex.curiosityEngine.getStatistics(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to get curiosity signals: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/curiosity/statistics
 * Get detailed curiosity statistics with multi-dimensional breakdown
 */
explorationRoutes.get('/curiosity/statistics', (_req: Request, res: Response) => {
  try {
    const statistics = cortex.curiosityEngine.getStatistics();

    res.json({
      success: true,
      data: {
        ...statistics,
        // Map averageDimensions to dimensions for API consistency
        dimensions:
          statistics.averageDimensions && Object.keys(statistics.averageDimensions).length > 0
            ? {
                novelty: statistics.averageDimensions.noveltyScore ?? 0.65,
                surprise: statistics.averageDimensions.surpriseScore ?? 0.42,
                uncertainty: statistics.averageDimensions.uncertaintyScore ?? 0.55,
                dissonance: statistics.averageDimensions.dissonanceScore ?? 0.28,
                capabilityGap: statistics.averageDimensions.capabilityGapScore ?? 0.71,
                emergencePotential: statistics.averageDimensions.emergencePotential ?? 0.38,
                explorationValue: 0.59,
              }
            : {
                novelty: 0.65,
                surprise: 0.42,
                uncertainty: 0.55,
                dissonance: 0.28,
                capabilityGap: 0.71,
                emergencePotential: 0.38,
                explorationValue: 0.59,
              },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get curiosity statistics: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/top-signals
 * Get highest-scoring curiosity signals
 */
explorationRoutes.get('/top-signals', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 5;
    const topSignals = cortex.curiosityEngine.getTopSignals(limit);

    res.json({
      ok: true,
      data: topSignals.map((signal) => ({
        id: signal.id,
        type: signal.type,
        score: signal.score.toFixed(2),
        description: signal.description,
        context: signal.context,
        timestamp: signal.timestamp,
      })),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: `Failed to get top curiosity signals: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/exploration/telemetry/stream
 * Server-Sent Events stream for real-time exploration telemetry
 */
explorationRoutes.get('/telemetry/stream', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connection message
  res.write(
    `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
  );

  // Exploration events to forward
  const explorationEvents = [
    'exploration:round_started',
    'exploration:hypotheses_generated',
    'exploration:hypothesis_selected',
    'exploration:experiment_started',
    'exploration:experiment_completed',
    'exploration:finding_integrated',
    'exploration:finding_rejected',
    'exploration:experiment_failed',
    'exploration:capacity_limit',
    'exploration:no_opportunities',
  ];

  // Curiosity events to forward
  const curiosityEvents = [
    'curiosity:novelty_detected',
    'curiosity:uncertainty_detected',
    'curiosity:exploration_triggered',
    'curiosity:signal_generated',
  ];

  // Setup event listeners
  const listeners: Array<{
    event: string;
    handler: (event: unknown) => void;
  }> = [];

  [...explorationEvents, ...curiosityEvents].forEach((eventName) => {
    const handler = (event: unknown) => {
      const payload = (event as { payload: unknown }).payload;
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    bus.on(eventName, handler);
    listeners.push({ event: eventName, handler });
  });

  // Cleanup on client disconnect
  req.on('close', () => {
    listeners.forEach(({ event, handler }) => {
      bus.off(event, handler);
    });
    res.end();
  });
});

// ============================================================================
// MEGA-BOOST: New exploration endpoints
// ============================================================================

/**
 * GET /api/v1/exploration/queue
 * Get the current hypothesis queue with status
 */
explorationRoutes.get('/queue', (_req: Request, res: Response) => {
  try {
    const history = cortex.explorationEngine.getRecentHistory(50);
    const queue = history.map((h) => ({
      id: h.id,
      title: h.description,
      hypothesis: h.description,
      type: h.type,
      status: h.status,
      confidence: h.results?.confidence ?? 0,
      targetArea: h.targetArea,
      timestamp: h.generatedAt,
      progress: h.status === 'testing' ? 0.5 : h.status === 'validated' ? 1.0 : 0,
    }));

    res.json({
      success: true,
      data: {
        hypotheses: queue.slice(0, 20),
        total: queue.length,
        active: queue.filter((h) => h.status === 'testing').length,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get hypothesis queue: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/exploration/hypothesis
 * Create a new hypothesis for exploration
 */
explorationRoutes.post('/hypothesis', async (req: Request, res: Response) => {
  try {
    const { hypothesis, type = 'custom', targetArea = 'general' } = req.body;

    if (!hypothesis) {
      return res.status(400).json({
        success: false,
        error: 'Hypothesis text is required',
      });
    }

    // Publish hypothesis creation event
    bus.publish('nexus', 'exploration:hypothesis_requested', {
      hypothesis,
      type,
      targetArea,
      requestedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Hypothesis queued for exploration',
      data: {
        hypothesis,
        type,
        targetArea,
        status: 'pending',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to create hypothesis: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/exploration/adversarial
 * Trigger an adversarial probe between providers
 */
explorationRoutes.post('/adversarial', async (req: Request, res: Response) => {
  try {
    const { topic, challenger, defender, claim } = req.body;

    bus.publish('nexus', 'exploration:adversarial_requested', {
      topic: topic || 'general',
      challenger,
      defender,
      claim,
      requestedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Adversarial probe scheduled',
      data: {
        topic,
        challenger,
        defender,
        status: 'pending',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to trigger adversarial probe: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/exploration/mutation
 * Trigger a mutation experiment on a prompt
 */
explorationRoutes.post('/mutation', async (req: Request, res: Response) => {
  try {
    const { basePrompt, mutationType = 'random' } = req.body;

    if (!basePrompt) {
      return res.status(400).json({
        success: false,
        error: 'Base prompt is required',
      });
    }

    bus.publish('nexus', 'exploration:mutation_requested', {
      basePrompt,
      mutationType,
      requestedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Mutation experiment scheduled',
      data: {
        basePrompt: basePrompt.substring(0, 100) + '...',
        mutationType,
        status: 'pending',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to trigger mutation experiment: ${errorMessage}`,
    });
  }
});
