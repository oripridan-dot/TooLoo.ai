// @version 2.3.0 - Emergence Room API Routes with events endpoint
import { Router } from 'express';
import type { Request, Response } from 'express';
import { cortex } from '../../cortex/index.js';
import { safetyPolicy } from '../../core/safety/safety-policy.js';
import { auditLogger } from '../../core/audit/audit-logger.js';
import { rollbackManager } from '../../core/safety/rollback-manager.js';

const router = Router();

/**
 * GET /api/v1/emergence/events
 * Get recent emergence events from EmergenceAmplifier
 * Used by Growth view for emergence timeline
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 20;
    const emergenceAmplifier = cortex.emergenceAmplifier;

    if (!emergenceAmplifier) {
      return res.json({
        success: true,
        data: {
          events: [],
          message: 'EmergenceAmplifier not initialized',
        },
      });
    }

    // Get recent emergences from the amplifier
    const metrics = emergenceAmplifier.getMetrics();
    const recentEmergences = metrics.recentEmergences || [];

    // Transform to frontend format
    const events = recentEmergences.slice(0, limit).map((emergence: any, index: number) => ({
      id: emergence.id || index,
      type: emergence.signature?.type || 'pattern',
      title: emergence.signature?.description?.split(':')[0] || 'Emergence detected',
      description: emergence.signature?.description || 'System detected emergent pattern',
      confidence: emergence.signature?.confidence || 0.7,
      strength: emergence.signature?.strength || 0.5,
      impact: emergence.impact || 'medium',
      domain: emergence.signature?.domain || 'general',
      time: emergence.triggeredAt ? formatTimeAgo(new Date(emergence.triggeredAt)) : 'just now',
      new: index === 0,
      visualTriggered: emergence.visualTriggered || false,
      persisted: emergence.persisted || false,
      artifactCount: emergence.artifacts?.length || 0,
      // Safety info (from v2.3.0 safety gates)
      safetyTier: (emergence as any).safetyTier || 'amplify',
      safetyConstraints: (emergence as any).safetyConstraints || [],
    }));

    // Also get safety state
    const safetyState = emergenceAmplifier.getSafetyState?.() || null;

    res.json({
      success: true,
      data: {
        events,
        total: recentEmergences.length,
        safetyState,
        metrics: {
          totalEmergences: metrics.totalEmergences || 0,
          byType: metrics.byType || {},
          byImpact: metrics.byImpact || {},
          detectionRate: metrics.detectionRate || 0,
        },
      },
    });
  } catch (error) {
    console.error('[EmergenceAPI] Events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergence events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper function for relative time
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * GET /api/v1/emergence/dashboard
 * Combined dashboard status for all emergence systems
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    // Access ExplorationEngine which has sandboxManager
    const explorationEngine = cortex.explorationEngine;
    const sandboxManager = explorationEngine?.['sandboxManager'];

    // Access circuit breaker from ExplorationEngine (if it exists)
    const circuitBreaker = (explorationEngine as any)?.circuitBreaker;

    const dashboard = {
      timestamp: Date.now(),
      exploration: {
        isRunning: explorationEngine ? (explorationEngine as any).isRunning || false : false,
        queueSize: explorationEngine
          ? explorationEngine.getArtifactQueue().filter((a: any) => a.status === 'pending').length
          : 0,
      },
      sandbox: {
        count: sandboxManager ? sandboxManager.getStats().sandboxes.length : 0,
        sandboxes: sandboxManager
          ? sandboxManager.getStats().sandboxes.map((sb: any) => ({
              id: sb.id,
              mode: sb.mode,
              createdAt: sb.createdAt,
              lastUsedAt: sb.lastUsedAt,
              executionCount: sb.executionCount,
              totalDuration: sb.totalDuration,
            }))
          : [],
      },
      circuit: circuitBreaker
        ? {
            state: circuitBreaker.getState(),
            metrics: circuitBreaker.getMetrics(),
            tripReason: (circuitBreaker as any).tripReason || null,
          }
        : null,
      safety: {
        experimentsToday: (safetyPolicy as any).experimentsToday || 0,
        activeHighRiskActions: (safetyPolicy as any).activeHighRiskActions || 0,
        timeSinceLastExperiment: (safetyPolicy as any).lastExperimentTime
          ? Date.now() - (safetyPolicy as any).lastExperimentTime
          : null,
      },
      audit: auditLogger.getRecent(20),
      artifacts: explorationEngine ? explorationEngine.getArtifactQueue() : [],
    };

    res.json(dashboard);
  } catch (error) {
    console.error('[EmergenceAPI] Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/emergence/sandbox
 * Detailed sandbox statistics
 */
router.get('/sandbox', (_req: Request, res: Response) => {
  try {
    const explorationEngine = cortex.explorationEngine;
    const sandboxManager = explorationEngine?.['sandboxManager'];

    if (!sandboxManager) {
      return res.json({
        active: 0,
        sandboxes: [],
        limits: { max: 20, maxAge: 3600000, maxIdle: 600000 },
      });
    }

    const stats = sandboxManager.getStats();

    res.json({
      active: stats.sandboxes.length,
      sandboxes: stats.sandboxes.map((sb: any) => ({
        id: sb.id,
        mode: sb.mode,
        createdAt: sb.createdAt,
        lastUsedAt: sb.lastUsedAt,
        executionCount: sb.executionCount,
        totalDuration: sb.totalDuration,
        age: Date.now() - sb.createdAt,
        idle: Date.now() - sb.lastUsedAt,
      })),
      limits: {
        max: 20,
        maxAge: 3600000, // 1 hour
        maxIdle: 600000, // 10 minutes
      },
    });
  } catch (error) {
    console.error('[EmergenceAPI] Sandbox stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch sandbox stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/emergence/circuit
 * Circuit breaker status and metrics
 */
router.get('/circuit', (_req: Request, res: Response) => {
  try {
    const explorationEngine = cortex.explorationEngine;
    const circuitBreaker = (explorationEngine as any)?.circuitBreaker;

    if (!circuitBreaker) {
      return res.json({
        state: 'UNKNOWN',
        message: 'Circuit breaker not initialized',
      });
    }

    res.json({
      state: circuitBreaker.getState(),
      metrics: circuitBreaker.getMetrics(),
      tripReason: (circuitBreaker as any).tripReason || null,
      config: {
        failureThreshold: 5,
        errorRateThreshold: 0.5,
        safetyScoreThreshold: 0.3,
        maxHighRiskActions: 3,
        memoryThreshold: 0.85,
        resetTimeout: 300000, // 5 minutes
      },
    });
  } catch (error) {
    console.error('[EmergenceAPI] Circuit status error:', error);
    res.status(500).json({
      error: 'Failed to fetch circuit status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/emergence/circuit/reset
 * Manually reset the circuit breaker
 */
router.post('/circuit/reset', (_req: Request, res: Response) => {
  try {
    const explorationEngine = cortex.explorationEngine;
    const circuitBreaker = (explorationEngine as any)?.circuitBreaker;

    if (!circuitBreaker) {
      return res.status(404).json({
        error: 'Circuit breaker not found',
      });
    }

    circuitBreaker.reset();

    res.json({
      success: true,
      status: {
        state: circuitBreaker.getState(),
        metrics: circuitBreaker.getMetrics(),
      },
      message: 'Circuit breaker manually reset',
    });
  } catch (error) {
    console.error('[EmergenceAPI] Circuit reset error:', error);
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/emergence/audit
 * Query audit log with filters
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const { limit = '50', actor, actionType, outcome, riskLevel, since } = req.query;

    const filters: any = {};
    if (actor) filters.actor = actor as string;
    if (actionType) filters.actionType = actionType as string;
    if (outcome) filters.outcome = outcome as string;
    if (riskLevel) filters.riskLevel = riskLevel as string;
    if (since) filters.since = parseInt(since as string, 10);

    const entries = await auditLogger.query(filters);
    const limitNum = parseInt(limit as string, 10);

    res.json({
      total: entries.length,
      entries: entries.slice(0, limitNum),
      filters,
    });
  } catch (error) {
    console.error('[EmergenceAPI] Audit query error:', error);
    res.status(500).json({
      error: 'Failed to query audit log',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/emergence/safety
 * Current safety policy status
 */
router.get('/safety', (_req: Request, res: Response) => {
  try {
    res.json({
      experimentsToday: (safetyPolicy as any).experimentsToday || 0,
      activeHighRiskActions: (safetyPolicy as any).activeHighRiskActions || 0,
      lastExperimentTime: (safetyPolicy as any).lastExperimentTime || null,
      timeSinceLastExperiment: (safetyPolicy as any).lastExperimentTime
        ? Date.now() - (safetyPolicy as any).lastExperimentTime
        : null,
      limits: {
        maxExperimentsPerDay: 50,
        experimentCooldown: 60000, // 60 seconds
        maxConcurrentHighRisk: 1,
      },
    });
  } catch (error) {
    console.error('[EmergenceAPI] Safety status error:', error);
    res.status(500).json({
      error: 'Failed to fetch safety status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/emergence/snapshots
 * List available rollback snapshots
 */
router.get('/snapshots', async (_req: Request, res: Response) => {
  try {
    const snapshots = await rollbackManager.listSnapshots();

    res.json({
      count: snapshots.length,
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        description: snapshot.description,
        gitCommit: snapshot.gitCommit,
        hasFileBackup: snapshot.backupPath ? true : false,
        fileCount: snapshot.scope?.length || 0,
      })),
    });
  } catch (error) {
    console.error('[EmergenceAPI] Snapshots list error:', error);
    res.status(500).json({
      error: 'Failed to list snapshots',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/emergence/approve/:id
 * Approve a pending experiment (human-in-the-loop)
 */
router.post('/approve/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing experiment ID' });
    }
    const explorationEngine = cortex.explorationEngine;

    if (explorationEngine) {
      const approved = await explorationEngine.approveExperiment(id);
      if (approved) {
        auditLogger.log({
          actor: 'human-operator',
          action: `Approved experiment ${id}`,
          actionType: 'approve_experiment',
          outcome: 'success',
          riskLevel: 'HIGH',
          duration: 0,
          metadata: { experimentId: id },
          scope: ['exploration'],
          safetyScore: 1.0,
          rollbackAvailable: false,
        });

        res.json({
          success: true,
          experimentId: id,
          message: 'Experiment approved and queued for execution',
        });
        return;
      }
    }

    res.status(404).json({
      error: 'Experiment not found or not pending',
    });
  } catch (error) {
    console.error('[EmergenceAPI] Approve error:', error);
    res.status(500).json({
      error: 'Failed to approve experiment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/emergence/artifacts/:id/approve
 * Approve an artifact from exploration
 */
router.post('/artifacts/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing artifact ID' });
    }
    const explorationEngine = cortex.explorationEngine;

    if (explorationEngine) {
      const approved = explorationEngine.approveArtifact(id);
      if (approved) {
        auditLogger.log({
          actor: 'human-operator',
          action: `Approved artifact ${id}`,
          actionType: 'approve_artifact',
          outcome: 'success',
          riskLevel: 'MEDIUM',
          duration: 0,
          metadata: { artifactId: id },
          scope: ['exploration'],
          safetyScore: 1.0,
          rollbackAvailable: false,
        });

        res.json({
          success: true,
          artifactId: id,
          message: 'Artifact approved',
        });
        return;
      }
    }

    res.status(404).json({
      error: 'Artifact not found',
    });
  } catch (error) {
    console.error('[EmergenceAPI] Artifact approve error:', error);
    res.status(500).json({
      error: 'Failed to approve artifact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/emergence/artifacts/:id/reject
 * Reject an artifact from exploration
 */
router.post('/artifacts/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing artifact ID' });
    }
    const explorationEngine = cortex.explorationEngine;

    if (explorationEngine) {
      const rejected = explorationEngine.rejectArtifact(id);
      if (rejected) {
        auditLogger.log({
          actor: 'human-operator',
          action: `Rejected artifact ${id}`,
          actionType: 'reject_artifact',
          outcome: 'success',
          riskLevel: 'LOW',
          duration: 0,
          metadata: { artifactId: id },
          scope: ['exploration'],
          safetyScore: 1.0,
          rollbackAvailable: false,
        });

        res.json({
          success: true,
          artifactId: id,
          message: 'Artifact rejected',
        });
        return;
      }
    }

    res.status(404).json({
      error: 'Artifact not found',
    });
  } catch (error) {
    console.error('[EmergenceAPI] Artifact reject error:', error);
    res.status(500).json({
      error: 'Failed to reject artifact',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
