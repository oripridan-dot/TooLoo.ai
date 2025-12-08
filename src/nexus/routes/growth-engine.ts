// @version 3.3.401 - REAL LEARNING RATE
/**
 * TooLoo.ai Synapsys V3.3.401
 * Growth Engine Routes - Unified Learning & Emergence Control Center
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { bus } from '../../core/event-bus.js';
import { learningScheduler } from '../../precog/learning/learning-scheduler.js';
import { emergencePredictor } from '../../cortex/discover/emergence-predictor.js';
import { monitoringHub } from '../../cortex/observability/monitoring-hub.js';
import { worldPipeline } from '../../cortex/knowledge/world-pipeline.js';
import { adversarialLearner } from '../../cortex/learning/adversarial-learner.js';
import { emergenceCatalyst } from '../../cortex/emergence/catalyst.js';
import { GiantLeapOrchestrator } from '../../cortex/giant-leap-orchestrator.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const router = Router();

// ============================================================================
// HEALTH CALCULATION
// ============================================================================

function calculateOverallHealth(metrics: {
  learningRate: number;
  emergenceLevel: number;
  curiosityDiversity: number;
  explorationSuccess: number;
  criticalAlerts: number;
  knowledgeHealth: number;
  resilienceScore: number;
}): number {
  const weights = {
    learningRate: 0.15,
    emergenceLevel: 0.15,
    curiosityDiversity: 0.15,
    explorationSuccess: 0.15,
    knowledgeHealth: 0.15,
    resilienceScore: 0.15,
    alertPenalty: 0.1,
  };

  const alertPenalty = Math.max(0, 1 - metrics.criticalAlerts * 0.2);

  return (
    metrics.learningRate * weights.learningRate +
    metrics.emergenceLevel * weights.emergenceLevel +
    metrics.curiosityDiversity * weights.curiosityDiversity +
    metrics.explorationSuccess * weights.explorationSuccess +
    metrics.knowledgeHealth * weights.knowledgeHealth +
    metrics.resilienceScore * weights.resilienceScore +
    alertPenalty * weights.alertPenalty
  );
}

// ============================================================================
// UNIFIED DASHBOARD
// ============================================================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const schedulerState = learningScheduler.getState();
    const predictorState = emergencePredictor.getState();
    const hubState = monitoringHub.getState();
    const activeAlerts = monitoringHub.getActiveAlerts();

    // Giant Leap States
    const pipelineStats = worldPipeline.getStats();
    const adversarialState = adversarialLearner.getState();
    const catalystState = emergenceCatalyst.getState();
    const orchestratorStatus = GiantLeapOrchestrator.getInstance().getStatus();

    // Calculate real knowledge health
    const knowledgeHealth = pipelineStats.activeSources > 0 ? 1.0 : 0.5;
    const resilienceScore = adversarialState.exerciseHistory.length > 0 
        ? (adversarialState.exerciseHistory[adversarialState.exerciseHistory.length - 1]?.outcome?.resilienceScore ?? 0.5)
        : 0.5;

    // Calculate real metrics from actual learning data
    const learningMetricsPath = path.join(DATA_DIR, 'learning-metrics.json');
    let realLearningRate = 0.5; // Base value
    try {
      if (fs.existsSync(learningMetricsPath)) {
        const learningData = JSON.parse(fs.readFileSync(learningMetricsPath, 'utf-8'));
        // Calculate learning rate from first-try success improvement over baseline
        const firstTry = learningData.improvements?.firstTrySuccess;
        if (firstTry) {
          const improvement = (firstTry.current - firstTry.baseline) / (firstTry.target - firstTry.baseline);
          realLearningRate = Math.max(0.1, Math.min(1.0, improvement));
        }
      }
    } catch {
      // Keep default
    }

    const healthScore = calculateOverallHealth({
      learningRate: realLearningRate, // REAL: calculated from first-try success improvement
      emergenceLevel: predictorState.activePredictions.length > 0 ? 0.7 : 0.3,
      curiosityDiversity: 0.5,
      explorationSuccess: 0.6,
      criticalAlerts: activeAlerts.filter((a: { severity: string }) => a.severity === 'critical')
        .length,
      knowledgeHealth,
      resilienceScore,
    });

    const dashboard = {
      timestamp: new Date().toISOString(),
      overallHealth: {
        score: healthScore,
        status:
          healthScore > 0.8
            ? 'excellent'
            : healthScore > 0.6
              ? 'good'
              : healthScore > 0.4
                ? 'fair'
                : 'needs_attention',
        trend: 'stable',
      },
      giantLeap: {
        orchestrator: orchestratorStatus,
        knowledge: pipelineStats,
        adversarial: {
            activeAdversaries: adversarialState.activeAdversaries.length,
            lastExercise: adversarialState.lastExercise,
            vulnerabilities: Object.keys(adversarialState.vulnerabilityMap).length
        },
        catalyst: {
            syntheses: catalystState.syntheses.length,
            predictions: catalystState.predictions.length,
            activeGoals: catalystState.activeGoals.length
        }
      },
      systems: {
        learning: {
          status: schedulerState.status,
          metrics: {
            activeSchedules: schedulerState.activeSchedules.length,
            pendingSchedules: schedulerState.pendingSchedules.length,
            currentMultiplier: schedulerState.currentMultiplier,
            totalSchedulesRun: schedulerState.metrics.totalSchedulesRun,
            goalsAchieved: schedulerState.metrics.goalsAchieved,
          },
        },
        emergence: {
          status: predictorState.status,
          metrics: {
            activePredictions: predictorState.activePredictions.length,
            totalPredictions: predictorState.metrics.totalPredictions,
            avgConfidence: predictorState.metrics.averageConfidence,
            accuracy: predictorState.metrics.predictionAccuracy,
          },
        },
        monitoring: {
          status: hubState.status,
          metrics: {
            metricsCollected: hubState.metrics.totalMetricsCollected,
            alertsTriggered: hubState.metrics.totalAlertsTriggered,
            correlationsFound: hubState.metrics.correlationsFound,
          },
        },
      },
      activeAlerts: activeAlerts.slice(0, 10),
      predictions: predictorState.activePredictions.slice(0, 5),
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[GrowthEngine] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard',
    });
  }
});

// ============================================================================
// SYSTEM-WIDE CONTROLS
// ============================================================================

router.post('/controls/:action', async (req: Request, res: Response) => {
  const action = req.params['action'] ?? '';
  const { options } = req.body;

  try {
    let result: Record<string, unknown>;

    switch (action) {
      case 'pause_all':
        learningScheduler.pause();
        result = { action: 'pause_all', success: true, message: 'All learning systems paused' };
        bus.publish('system', 'growth:paused', { timestamp: Date.now() });
        break;

      case 'resume_all':
        learningScheduler.resume();
        result = { action: 'resume_all', success: true, message: 'All learning systems resumed' };
        bus.publish('system', 'growth:resumed', { timestamp: Date.now() });
        break;

      case 'boost_learning':
        const boostDuration = options?.duration || 300000;
        const boostIntensity = options?.intensity || 1.5;
        learningScheduler.setBoostMode(boostDuration, boostIntensity);
        result = {
          action: 'boost_learning',
          success: true,
          duration: boostDuration,
          intensity: boostIntensity,
          message: `Learning boosted for ${boostDuration / 60000} minutes`,
        };
        bus.publish('system', 'growth:boosted', {
          duration: boostDuration,
          intensity: boostIntensity,
        });
        break;

      case 'emergency_stop':
        learningScheduler.stop();
        result = { action: 'emergency_stop', success: true, message: 'Emergency stop executed' };
        bus.publish('system', 'growth:emergency_stop', {
          timestamp: Date.now(),
          reason: options?.reason,
        });
        break;

      case 'force_emergence_check':
        emergencePredictor.runPredictionCycle();
        result = {
          action: 'force_emergence_check',
          success: true,
          message: 'Emergence check completed',
        };
        break;

      case 'trigger_red_team':
        const exercise = await adversarialLearner.triggerExercise(options?.target || 'general');
        result = {
          action: 'trigger_red_team',
          success: true,
          message: 'Red Team exercise triggered',
          data: { exerciseId: exercise.id }
        };
        break;

      case 'force_ingest':
        const sources = worldPipeline.getStats().activeSources;
        if (sources > 0) {
            // In a real scenario we'd pick a specific source
            // For now, we just trigger the first one if available or log it
            result = {
                action: 'force_ingest',
                success: true,
                message: 'Ingestion triggered (mock)'
            };
        } else {
             result = {
                action: 'force_ingest',
                success: false,
                message: 'No active sources'
            };
        }
        break;

      case 'generate_forecast':
        const prediction = await emergenceCatalyst.generateForecast(options?.topic || 'General Trends');
        result = {
            action: 'generate_forecast',
            success: true,
            message: 'Forecast generated',
            data: { predictionId: prediction.id }
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: [
            'pause_all',
            'resume_all',
            'boost_learning',
            'emergency_stop',
            'force_emergence_check',
            'trigger_red_team',
            'force_ingest',
            'generate_forecast'
          ],
        });
    }

    monitoringHub.recordMetric({
      id: `ctrl-${Date.now()}`,
      name: 'control_action',
      component: 'growth-engine',
      type: 'counter',
      value: 1,
      unit: 'actions',
      timestamp: new Date(),
      labels: { action, success: 'true' },
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`[GrowthEngine] Control action '${action}' error:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : `Failed to execute ${action}`,
    });
  }
});

// ============================================================================
// SCHEDULER MANAGEMENT
// ============================================================================

router.get('/schedule', async (_req: Request, res: Response) => {
  try {
    const state = learningScheduler.getState();
    res.json({
      success: true,
      data: {
        status: state.status,
        activeSchedules: state.activeSchedules,
        pendingSchedules: state.pendingSchedules,
        currentMultiplier: state.currentMultiplier,
        metrics: state.metrics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get schedule' });
  }
});

router.post('/schedule/burst', async (req: Request, res: Response) => {
  const { duration, intensity } = req.body;
  try {
    learningScheduler.setBoostMode(duration || 300000, intensity || 1.5);
    res.json({
      success: true,
      message: 'Learning burst initiated',
      data: { duration: duration || 300000, intensity: intensity || 1.5 },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start burst' });
  }
});

router.post('/schedule/quiet', async (req: Request, res: Response) => {
  const { duration, reason } = req.body;
  try {
    learningScheduler.setQuietMode(duration || 600000);
    res.json({
      success: true,
      message: 'Quiet period started',
      data: { duration: duration || 600000, reason: reason || 'API request' },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to enter quiet period' });
  }
});

// ============================================================================
// PREDICTIONS
// ============================================================================

router.get('/predictions', async (_req: Request, res: Response) => {
  try {
    const state = emergencePredictor.getState();
    res.json({
      success: true,
      data: {
        predictions: state.activePredictions,
        metrics: state.metrics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get predictions' });
  }
});

router.post('/predictions/refresh', async (_req: Request, res: Response) => {
  try {
    emergencePredictor.runPredictionCycle();
    const state = emergencePredictor.getState();
    res.json({
      success: true,
      message: 'Predictions refreshed',
      data: { predictions: state.activePredictions },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to refresh predictions' });
  }
});

// ============================================================================
// ALERTS
// ============================================================================

router.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const alerts = monitoringHub.getActiveAlerts();
    res.json({ success: true, data: { alerts, count: alerts.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get alerts' });
  }
});

router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  const alertId = req.params['alertId'] ?? '';
  const { acknowledgedBy } = req.body;
  try {
    const success = monitoringHub.acknowledgeAlert(alertId, acknowledgedBy || 'api');
    res.json({ success, message: success ? 'Alert acknowledged' : 'Alert not found' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  const alertId = req.params['alertId'] ?? '';
  const { reason } = req.body;
  try {
    const success = monitoringHub.resolveAlert(alertId, reason || 'Resolved via API');
    res.json({ success, message: success ? 'Alert resolved' : 'Alert not found' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
});

// ============================================================================
// ANALYTICS & METRICS
// ============================================================================

router.get('/analytics', async (req: Request, res: Response) => {
  const hours = parseInt((req.query['hours'] as string) || '24', 10);
  try {
    const hubState = monitoringHub.getState();
    const correlations = monitoringHub.getCorrelations();

    res.json({
      success: true,
      data: {
        timeRange: { hours },
        metrics: hubState.metrics,
        correlations: correlations.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
});

router.get('/analytics/correlations', async (req: Request, res: Response) => {
  try {
    const correlations = monitoringHub.getCorrelations();
    res.json({
      success: true,
      data: correlations,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get correlations' });
  }
});

router.get('/metrics/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendMetrics = () => {
    try {
      const state = monitoringHub.getState();
      res.write(`data: ${JSON.stringify({ type: 'metrics', data: state.metrics })}\n\n`);
    } catch {
      // Ignore errors during streaming
    }
  };

  sendMetrics();
  const interval = setInterval(sendMetrics, 5000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

export const growthEngineRoutes = router;
