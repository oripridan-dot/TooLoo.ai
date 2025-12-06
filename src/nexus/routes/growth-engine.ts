// @version 3.3.188
/**
 * TooLoo.ai Synapsys V3.3.185
 * Growth Engine Routes - Unified Learning & Emergence Control Center
 * 
 * Provides comprehensive API for:
 * - Unified dashboard combining all growth metrics
 * - System-wide learning controls (pause/resume/boost/emergency)
 * - Scheduler management (windows, bursts, quiet periods)
 * - Emergence predictions and alerts
 * - Cross-system analytics and correlations
 * - Real-time streaming for live monitoring
 * 
 * This is the single entry point for the Growth Control Center UI.
 */

import { Router, Request, Response } from 'express';
import { bus } from '../../shared/bus.js';
import { ReinforcementLearner } from '../../cortex/learning/reinforcement-learner.js';
import { EmergenceCoordinator } from '../../cortex/discover/emergence-coordinator.js';
import { EmergenceAmplifier } from '../../cortex/discover/emergence-amplifier.js';
import { CuriosityEngine } from '../../cortex/exploration/curiosity-engine.js';
import { ExplorationEngine } from '../../cortex/exploration/lab.js';
import { LearningScheduler, ScheduleConfig, LearningGoal } from '../../precog/learning/learning-scheduler.js';
import { EmergencePredictor, PredictionTimeHorizon } from '../../cortex/discover/emergence-predictor.js';
import { MonitoringHub, AlertDefinition, AlertSeverity } from '../../cortex/observability/monitoring-hub.js';
import fs from 'fs-extra';
import path from 'path';

const router = Router();

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

let reinforcementLearner: ReinforcementLearner | null = null;
let emergenceCoordinator: EmergenceCoordinator | null = null;
let emergenceAmplifier: EmergenceAmplifier | null = null;
let curiosityEngine: CuriosityEngine | null = null;
let explorationEngine: ExplorationEngine | null = null;
let learningScheduler: LearningScheduler | null = null;
let emergencePredictor: EmergencePredictor | null = null;
let monitoringHub: MonitoringHub | null = null;

// Lazy initialization
async function getReinforcementLearner(): Promise<ReinforcementLearner> {
  if (!reinforcementLearner) {
    reinforcementLearner = new ReinforcementLearner();
  }
  return reinforcementLearner;
}

async function getEmergenceCoordinator(): Promise<EmergenceCoordinator> {
  if (!emergenceCoordinator) {
    emergenceCoordinator = new EmergenceCoordinator();
    await emergenceCoordinator.initialize();
  }
  return emergenceCoordinator;
}

async function getEmergenceAmplifier(): Promise<EmergenceAmplifier> {
  if (!emergenceAmplifier) {
    emergenceAmplifier = new EmergenceAmplifier();
    await emergenceAmplifier.initialize();
  }
  return emergenceAmplifier;
}

async function getCuriosityEngine(): Promise<CuriosityEngine> {
  if (!curiosityEngine) {
    curiosityEngine = new CuriosityEngine();
  }
  return curiosityEngine;
}

async function getExplorationEngine(): Promise<ExplorationEngine> {
  if (!explorationEngine) {
    explorationEngine = new ExplorationEngine();
  }
  return explorationEngine;
}

async function getLearningScheduler(): Promise<LearningScheduler> {
  if (!learningScheduler) {
    learningScheduler = new LearningScheduler();
    await learningScheduler.initialize();
  }
  return learningScheduler;
}

async function getEmergencePredictor(): Promise<EmergencePredictor> {
  if (!emergencePredictor) {
    emergencePredictor = new EmergencePredictor();
    await emergencePredictor.initialize();
  }
  return emergencePredictor;
}

async function getMonitoringHub(): Promise<MonitoringHub> {
  if (!monitoringHub) {
    monitoringHub = new MonitoringHub();
    await monitoringHub.initialize();
  }
  return monitoringHub;
}

// ============================================================================
// UNIFIED DASHBOARD
// ============================================================================

/**
 * GET /api/v1/growth/dashboard
 * Returns comprehensive dashboard data combining all growth systems
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      rl,
      coordinator,
      amplifier,
      curiosity,
      exploration,
      scheduler,
      predictor,
      hub
    ] = await Promise.all([
      getReinforcementLearner(),
      getEmergenceCoordinator(),
      getEmergenceAmplifier(),
      getCuriosityEngine(),
      getExplorationEngine(),
      getLearningScheduler(),
      getEmergencePredictor(),
      getMonitoringHub()
    ]);

    // Gather all subsystem states
    const learningState = rl.getState();
    const coordinatorStats = coordinator.getStats();
    const amplifierStats = amplifier.getAmplificationStats();
    const curiosityState = curiosity.getState();
    const explorationStats = exploration.getStats();
    const schedulerStatus = scheduler.getStatus();
    const predictions = predictor.getPredictions();
    const activeAlerts = hub.getActiveAlerts();
    const correlations = hub.getCorrelations();

    // Calculate overall growth health score
    const healthScore = calculateOverallHealth({
      learningRate: learningState.state.epsilon,
      emergenceLevel: amplifierStats.emergenceLevel,
      curiosityDiversity: curiosityState.state.curiosity_scores ? 
        Object.values(curiosityState.state.curiosity_scores).reduce((a, b) => a + b, 0) / 7 : 0.5,
      explorationSuccess: explorationStats.hypotheses.successful / Math.max(explorationStats.hypotheses.total, 1),
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length
    });

    const dashboard = {
      timestamp: new Date().toISOString(),
      overallHealth: {
        score: healthScore,
        status: healthScore > 0.8 ? 'excellent' : healthScore > 0.6 ? 'good' : healthScore > 0.4 ? 'fair' : 'needs_attention',
        trend: 'stable' // Would calculate from history
      },
      
      systems: {
        learning: {
          status: learningState.isActive ? 'active' : 'paused',
          mode: learningState.mode,
          metrics: {
            totalEpisodes: learningState.state.total_episodes,
            successfulEpisodes: learningState.state.successful_episodes,
            explorationRate: learningState.state.epsilon,
            averageReward: calculateAverageReward(learningState.state.recent_rewards),
            qTableSize: learningState.state.q_table_size
          },
          controls: {
            canPause: learningState.isActive,
            canResume: !learningState.isActive,
            canBoost: learningState.mode !== 'boost',
            canStop: true
          }
        },

        emergence: {
          status: coordinatorStats.status,
          metrics: {
            totalSignals: amplifierStats.totalSignals,
            strongSignals: amplifierStats.strongSignals,
            emergenceLevel: amplifierStats.emergenceLevel,
            activePatterns: amplifierStats.patterns?.active || 0,
            knowledgeNodes: amplifierStats.knowledgeGraph?.nodes || 0
          },
          recentSignals: amplifierStats.recentSignals?.slice(0, 5) || []
        },

        curiosity: {
          status: 'active',
          metrics: {
            scores: curiosityState.state.curiosity_scores || {},
            topDimension: getTopCuriosityDimension(curiosityState.state.curiosity_scores),
            totalSuggestions: curiosityState.state.suggestions_generated || 0
          }
        },

        exploration: {
          status: 'active',
          metrics: {
            totalHypotheses: explorationStats.hypotheses.total,
            activeHypotheses: explorationStats.hypotheses.active,
            successRate: (explorationStats.hypotheses.successful / Math.max(explorationStats.hypotheses.total, 1) * 100).toFixed(1) + '%',
            experimentsRun: explorationStats.experiments.total
          }
        },

        scheduler: {
          status: schedulerStatus.status,
          currentWindow: schedulerStatus.currentWindow,
          upcomingWindows: schedulerStatus.upcomingWindows.slice(0, 3),
          activeGoals: schedulerStatus.goals.active
        },

        predictions: {
          count: predictions.length,
          highConfidence: predictions.filter(p => p.confidence > 0.7).length,
          imminent: predictions.filter(p => p.timeHorizon === 'immediate' || p.timeHorizon === 'short_term').length,
          topPrediction: predictions[0] || null
        },

        monitoring: {
          activeAlerts: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
          correlationsFound: correlations.length
        }
      },

      quickActions: [
        { id: 'boost_learning', label: 'Boost Learning', icon: '🚀', available: learningState.mode !== 'boost' },
        { id: 'pause_all', label: 'Pause All', icon: '⏸️', available: learningState.isActive },
        { id: 'resume_all', label: 'Resume All', icon: '▶️', available: !learningState.isActive },
        { id: 'clear_alerts', label: 'Clear Alerts', icon: '🔔', available: activeAlerts.length > 0 },
        { id: 'force_emergence_check', label: 'Check Emergence', icon: '✨', available: true },
        { id: 'generate_predictions', label: 'Refresh Predictions', icon: '🔮', available: true }
      ],

      alerts: activeAlerts.slice(0, 10),
      correlations: correlations.slice(0, 5)
    };

    res.json({ success: true, data: dashboard });

  } catch (error) {
    console.error('[GrowthEngine] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate dashboard'
    });
  }
});

// ============================================================================
// SYSTEM-WIDE CONTROLS
// ============================================================================

/**
 * POST /api/v1/growth/controls/:action
 * Execute system-wide control actions
 */
router.post('/controls/:action', async (req: Request, res: Response) => {
  const { action } = req.params;
  const { options } = req.body;

  try {
    const rl = await getReinforcementLearner();
    const scheduler = await getLearningScheduler();
    const hub = await getMonitoringHub();

    let result: any;

    switch (action) {
      case 'pause_all':
        rl.pause();
        scheduler.pause();
        result = { 
          action: 'pause_all', 
          success: true, 
          message: 'All learning systems paused' 
        };
        bus.publish('growth:paused', { timestamp: Date.now() });
        break;

      case 'resume_all':
        rl.resume();
        scheduler.resume();
        result = { 
          action: 'resume_all', 
          success: true, 
          message: 'All learning systems resumed' 
        };
        bus.publish('growth:resumed', { timestamp: Date.now() });
        break;

      case 'boost_learning':
        const boostDuration = options?.duration || 300000; // 5 minutes default
        const boostIntensity = options?.intensity || 1.5;
        rl.boost(boostDuration);
        await scheduler.startBurstLearning(boostDuration, boostIntensity);
        result = { 
          action: 'boost_learning', 
          success: true, 
          duration: boostDuration,
          intensity: boostIntensity,
          message: `Learning boosted for ${boostDuration / 60000} minutes` 
        };
        bus.publish('growth:boosted', { duration: boostDuration, intensity: boostIntensity });
        break;

      case 'emergency_stop':
        rl.emergencyStop();
        scheduler.stop();
        result = { 
          action: 'emergency_stop', 
          success: true, 
          message: 'Emergency stop executed - all learning halted' 
        };
        bus.publish('growth:emergency_stop', { timestamp: Date.now(), reason: options?.reason });
        break;

      case 'reset_exploration':
        const resetEpsilon = options?.epsilon || 0.3;
        rl.resetExploration(resetEpsilon);
        result = { 
          action: 'reset_exploration', 
          success: true, 
          epsilon: resetEpsilon,
          message: `Exploration reset to epsilon=${resetEpsilon}` 
        };
        break;

      case 'clear_alerts':
        const clearedCount = hub.clearAlerts(options?.severity);
        result = { 
          action: 'clear_alerts', 
          success: true, 
          cleared: clearedCount,
          message: `Cleared ${clearedCount} alerts` 
        };
        break;

      case 'force_emergence_check':
        const coordinator = await getEmergenceCoordinator();
        await coordinator.runCycle();
        result = { 
          action: 'force_emergence_check', 
          success: true, 
          message: 'Emergence check cycle completed' 
        };
        break;

      case 'set_mode':
        if (!options?.mode || !['normal', 'boost', 'conserve', 'exploration'].includes(options.mode)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid mode. Must be: normal, boost, conserve, or exploration'
          });
        }
        rl.setMode(options.mode);
        result = { 
          action: 'set_mode', 
          success: true, 
          mode: options.mode,
          message: `Learning mode set to ${options.mode}` 
        };
        bus.publish('growth:mode_changed', { mode: options.mode });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: [
            'pause_all', 'resume_all', 'boost_learning', 'emergency_stop',
            'reset_exploration', 'clear_alerts', 'force_emergence_check', 'set_mode'
          ]
        });
    }

    // Log the action
    hub.recordMetric('control_action', 1, { action, success: true });

    res.json({ success: true, data: result });

  } catch (error) {
    console.error(`[GrowthEngine] Control action '${action}' error:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : `Failed to execute ${action}`
    });
  }
});

// ============================================================================
// SCHEDULER MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/growth/schedule
 * Get current schedule configuration and status
 */
router.get('/schedule', async (_req: Request, res: Response) => {
  try {
    const scheduler = await getLearningScheduler();
    const status = scheduler.getStatus();

    res.json({
      success: true,
      data: {
        status: status.status,
        currentWindow: status.currentWindow,
        nextWindow: status.nextWindow,
        upcomingWindows: status.upcomingWindows,
        goals: status.goals,
        stats: status.stats
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Schedule error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get schedule'
    });
  }
});

/**
 * POST /api/v1/growth/schedule/configure
 * Update schedule configuration
 */
router.post('/schedule/configure', async (req: Request, res: Response) => {
  const { config } = req.body;

  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Configuration object required'
    });
  }

  try {
    const scheduler = await getLearningScheduler();
    scheduler.configure(config as ScheduleConfig);

    res.json({
      success: true,
      message: 'Schedule configuration updated',
      data: scheduler.getStatus()
    });

  } catch (error) {
    console.error('[GrowthEngine] Schedule configure error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure schedule'
    });
  }
});

/**
 * POST /api/v1/growth/schedule/burst
 * Trigger immediate learning burst
 */
router.post('/schedule/burst', async (req: Request, res: Response) => {
  const { duration, intensity } = req.body;

  try {
    const scheduler = await getLearningScheduler();
    await scheduler.startBurstLearning(duration || 300000, intensity || 1.5);

    res.json({
      success: true,
      message: 'Learning burst initiated',
      data: {
        duration: duration || 300000,
        intensity: intensity || 1.5,
        endTime: new Date(Date.now() + (duration || 300000)).toISOString()
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Burst error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start burst'
    });
  }
});

/**
 * POST /api/v1/growth/schedule/quiet
 * Enter quiet learning period
 */
router.post('/schedule/quiet', async (req: Request, res: Response) => {
  const { duration, reason } = req.body;

  try {
    const scheduler = await getLearningScheduler();
    await scheduler.enterQuietPeriod(duration || 1800000, reason || 'manual_request');

    res.json({
      success: true,
      message: 'Quiet period started',
      data: {
        duration: duration || 1800000,
        reason: reason || 'manual_request',
        endTime: new Date(Date.now() + (duration || 1800000)).toISOString()
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Quiet period error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start quiet period'
    });
  }
});

/**
 * POST /api/v1/growth/schedule/goal
 * Add a learning goal
 */
router.post('/schedule/goal', async (req: Request, res: Response) => {
  const goal = req.body as LearningGoal;

  if (!goal.id || !goal.name || !goal.targetMetric) {
    return res.status(400).json({
      success: false,
      error: 'Goal requires id, name, and targetMetric'
    });
  }

  try {
    const scheduler = await getLearningScheduler();
    scheduler.addGoal(goal);

    res.json({
      success: true,
      message: 'Learning goal added',
      data: goal
    });

  } catch (error) {
    console.error('[GrowthEngine] Add goal error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add goal'
    });
  }
});

/**
 * DELETE /api/v1/growth/schedule/goal/:goalId
 * Remove a learning goal
 */
router.delete('/schedule/goal/:goalId', async (req: Request, res: Response) => {
  const { goalId } = req.params;

  try {
    const scheduler = await getLearningScheduler();
    const removed = scheduler.removeGoal(goalId);

    if (removed) {
      res.json({
        success: true,
        message: `Goal '${goalId}' removed`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Goal '${goalId}' not found`
      });
    }

  } catch (error) {
    console.error('[GrowthEngine] Remove goal error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove goal'
    });
  }
});

// ============================================================================
// EMERGENCE PREDICTIONS
// ============================================================================

/**
 * GET /api/v1/growth/predictions
 * Get emergence predictions
 */
router.get('/predictions', async (req: Request, res: Response) => {
  const horizon = req.query.horizon as PredictionTimeHorizon | undefined;
  const minConfidence = parseFloat(req.query.minConfidence as string) || 0;

  try {
    const predictor = await getEmergencePredictor();
    let predictions = predictor.getPredictions();

    // Filter by horizon if specified
    if (horizon) {
      predictions = predictions.filter(p => p.timeHorizon === horizon);
    }

    // Filter by confidence
    predictions = predictions.filter(p => p.confidence >= minConfidence);

    res.json({
      success: true,
      data: {
        total: predictions.length,
        predictions,
        lastUpdated: predictor.getLastUpdateTime()
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Predictions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get predictions'
    });
  }
});

/**
 * POST /api/v1/growth/predictions/refresh
 * Force regenerate predictions
 */
router.post('/predictions/refresh', async (_req: Request, res: Response) => {
  try {
    const predictor = await getEmergencePredictor();
    await predictor.generatePredictions();
    const predictions = predictor.getPredictions();

    res.json({
      success: true,
      message: 'Predictions refreshed',
      data: {
        total: predictions.length,
        predictions
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Prediction refresh error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh predictions'
    });
  }
});

/**
 * GET /api/v1/growth/predictions/:predictionId
 * Get detailed prediction information
 */
router.get('/predictions/:predictionId', async (req: Request, res: Response) => {
  const { predictionId } = req.params;

  try {
    const predictor = await getEmergencePredictor();
    const predictions = predictor.getPredictions();
    const prediction = predictions.find(p => p.id === predictionId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: `Prediction '${predictionId}' not found`
      });
    }

    res.json({
      success: true,
      data: prediction
    });

  } catch (error) {
    console.error('[GrowthEngine] Get prediction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get prediction'
    });
  }
});

// ============================================================================
// ALERTS MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/growth/alerts
 * Get alerts with filtering
 */
router.get('/alerts', async (req: Request, res: Response) => {
  const severity = req.query.severity as AlertSeverity | undefined;
  const acknowledged = req.query.acknowledged === 'true';
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const hub = await getMonitoringHub();
    let alerts = hub.getActiveAlerts();

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    // Filter by acknowledgment status
    if (req.query.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }

    // Limit results
    alerts = alerts.slice(0, limit);

    res.json({
      success: true,
      data: {
        total: alerts.length,
        alerts
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Alerts error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get alerts'
    });
  }
});

/**
 * POST /api/v1/growth/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { note } = req.body;

  try {
    const hub = await getMonitoringHub();
    const acknowledged = hub.acknowledgeAlert(alertId, note);

    if (acknowledged) {
      res.json({
        success: true,
        message: `Alert '${alertId}' acknowledged`
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Alert '${alertId}' not found`
      });
    }

  } catch (error) {
    console.error('[GrowthEngine] Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
    });
  }
});

/**
 * POST /api/v1/growth/alerts/definition
 * Add custom alert definition
 */
router.post('/alerts/definition', async (req: Request, res: Response) => {
  const definition = req.body as AlertDefinition;

  if (!definition.id || !definition.name || !definition.metric) {
    return res.status(400).json({
      success: false,
      error: 'Alert definition requires id, name, and metric'
    });
  }

  try {
    const hub = await getMonitoringHub();
    hub.addAlertDefinition(definition);

    res.json({
      success: true,
      message: 'Alert definition added',
      data: definition
    });

  } catch (error) {
    console.error('[GrowthEngine] Add alert definition error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add alert definition'
    });
  }
});

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * GET /api/v1/growth/analytics/correlations
 * Get metric correlations
 */
router.get('/analytics/correlations', async (_req: Request, res: Response) => {
  try {
    const hub = await getMonitoringHub();
    const correlations = hub.getCorrelations();

    res.json({
      success: true,
      data: correlations
    });

  } catch (error) {
    console.error('[GrowthEngine] Correlations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get correlations'
    });
  }
});

/**
 * GET /api/v1/growth/analytics/metrics/:metricName
 * Get historical data for a specific metric
 */
router.get('/analytics/metrics/:metricName', async (req: Request, res: Response) => {
  const { metricName } = req.params;
  const hours = parseInt(req.query.hours as string) || 24;

  try {
    const hub = await getMonitoringHub();
    const metrics = hub.getMetricHistory(metricName, hours * 60 * 60 * 1000);

    res.json({
      success: true,
      data: {
        metricName,
        period: `${hours} hours`,
        dataPoints: metrics.length,
        metrics
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Metric history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metric history'
    });
  }
});

/**
 * GET /api/v1/growth/analytics/summary
 * Get analytics summary across all systems
 */
router.get('/analytics/summary', async (req: Request, res: Response) => {
  const period = req.query.period as string || '24h';

  try {
    const [rl, amplifier, exploration, scheduler, predictor] = await Promise.all([
      getReinforcementLearner(),
      getEmergenceAmplifier(),
      getExplorationEngine(),
      getLearningScheduler(),
      getEmergencePredictor()
    ]);

    const learningState = rl.getState();
    const amplifierStats = amplifier.getAmplificationStats();
    const explorationStats = exploration.getStats();
    const schedulerStatus = scheduler.getStatus();
    const predictions = predictor.getPredictions();

    const summary = {
      period,
      timestamp: new Date().toISOString(),
      
      learning: {
        episodesCompleted: learningState.state.total_episodes,
        successRate: (learningState.state.successful_episodes / Math.max(learningState.state.total_episodes, 1) * 100).toFixed(1) + '%',
        currentExplorationRate: (learningState.state.epsilon * 100).toFixed(1) + '%',
        averageReward: calculateAverageReward(learningState.state.recent_rewards),
        mode: learningState.mode
      },

      emergence: {
        totalSignals: amplifierStats.totalSignals,
        strongSignals: amplifierStats.strongSignals,
        emergenceLevel: amplifierStats.emergenceLevel,
        recentBreakthroughs: amplifierStats.recentSignals?.filter((s: any) => s.strength > 0.8).length || 0
      },

      exploration: {
        hypothesesGenerated: explorationStats.hypotheses.total,
        experimentsRun: explorationStats.experiments.total,
        successRate: (explorationStats.hypotheses.successful / Math.max(explorationStats.hypotheses.total, 1) * 100).toFixed(1) + '%'
      },

      scheduling: {
        windowsCompleted: schedulerStatus.stats.windowsCompleted,
        goalsAchieved: schedulerStatus.goals.achieved,
        currentWindow: schedulerStatus.currentWindow?.type || 'none'
      },

      predictions: {
        activePredictions: predictions.length,
        highConfidence: predictions.filter(p => p.confidence > 0.7).length,
        averageConfidence: predictions.length > 0 ?
          (predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(1) + '%' : '0%'
      }
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('[GrowthEngine] Analytics summary error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary'
    });
  }
});

// ============================================================================
// STREAMING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/growth/stream
 * Server-Sent Events stream for real-time updates
 */
router.get('/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Set up event listeners
  const eventTypes = [
    'learning:episode_complete',
    'learning:reward',
    'learning:mode_changed',
    'emergence:signal_detected',
    'emergence:pattern_identified',
    'exploration:hypothesis_created',
    'exploration:experiment_complete',
    'growth:paused',
    'growth:resumed',
    'growth:boosted',
    'alert:triggered',
    'prediction:new'
  ];

  const handlers: Map<string, (data: any) => void> = new Map();

  eventTypes.forEach(eventType => {
    const handler = (data: any) => {
      const message = {
        type: eventType,
        data,
        timestamp: Date.now()
      };
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    };
    handlers.set(eventType, handler);
    bus.on(eventType, handler);
  });

  // Periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
    handlers.forEach((handler, eventType) => {
      bus.off(eventType, handler);
    });
  });
});

// ============================================================================
// SUBSYSTEM ACCESS
// ============================================================================

/**
 * GET /api/v1/growth/learning/state
 * Get detailed reinforcement learning state
 */
router.get('/learning/state', async (_req: Request, res: Response) => {
  try {
    const rl = await getReinforcementLearner();
    const state = rl.getState();

    res.json({
      success: true,
      data: state
    });

  } catch (error) {
    console.error('[GrowthEngine] Learning state error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get learning state'
    });
  }
});

/**
 * GET /api/v1/growth/emergence/signals
 * Get recent emergence signals
 */
router.get('/emergence/signals', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const amplifier = await getEmergenceAmplifier();
    const stats = amplifier.getAmplificationStats();

    res.json({
      success: true,
      data: {
        emergenceLevel: stats.emergenceLevel,
        totalSignals: stats.totalSignals,
        strongSignals: stats.strongSignals,
        recentSignals: stats.recentSignals?.slice(0, limit) || []
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Emergence signals error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get emergence signals'
    });
  }
});

/**
 * GET /api/v1/growth/curiosity/scores
 * Get curiosity dimension scores
 */
router.get('/curiosity/scores', async (_req: Request, res: Response) => {
  try {
    const curiosity = await getCuriosityEngine();
    const state = curiosity.getState();

    res.json({
      success: true,
      data: {
        scores: state.state.curiosity_scores || {},
        topDimension: getTopCuriosityDimension(state.state.curiosity_scores),
        suggestionsGenerated: state.state.suggestions_generated || 0
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Curiosity scores error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get curiosity scores'
    });
  }
});

/**
 * GET /api/v1/growth/exploration/hypotheses
 * Get exploration hypotheses
 */
router.get('/exploration/hypotheses', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;

  try {
    const exploration = await getExplorationEngine();
    const stats = exploration.getStats();
    let hypotheses = exploration.getHypotheses();

    // Filter by status if provided
    if (status) {
      hypotheses = hypotheses.filter(h => h.status === status);
    }

    res.json({
      success: true,
      data: {
        stats: stats.hypotheses,
        hypotheses
      }
    });

  } catch (error) {
    console.error('[GrowthEngine] Exploration hypotheses error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get hypotheses'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateOverallHealth(factors: {
  learningRate: number;
  emergenceLevel: number;
  curiosityDiversity: number;
  explorationSuccess: number;
  criticalAlerts: number;
}): number {
  const weights = {
    learningRate: 0.2,
    emergenceLevel: 0.25,
    curiosityDiversity: 0.2,
    explorationSuccess: 0.25,
    alertPenalty: 0.1
  };

  let score = 0;
  
  // Learning rate contribution (higher epsilon = more exploration = good early, less good later)
  score += factors.learningRate * weights.learningRate;
  
  // Emergence level (0-1 scale, higher is better)
  score += factors.emergenceLevel * weights.emergenceLevel;
  
  // Curiosity diversity (balanced scores across dimensions is good)
  score += factors.curiosityDiversity * weights.curiosityDiversity;
  
  // Exploration success rate
  score += factors.explorationSuccess * weights.explorationSuccess;
  
  // Penalty for critical alerts
  const alertPenalty = Math.min(factors.criticalAlerts * 0.15, 0.5);
  score -= alertPenalty * weights.alertPenalty;

  return Math.max(0, Math.min(1, score));
}

function calculateAverageReward(recentRewards: number[] | undefined): number {
  if (!recentRewards || recentRewards.length === 0) return 0;
  return recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
}

function getTopCuriosityDimension(scores: Record<string, number> | undefined): string {
  if (!scores) return 'unknown';
  
  let topDimension = 'unknown';
  let topScore = 0;
  
  for (const [dimension, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topDimension = dimension;
    }
  }
  
  return topDimension;
}

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { router as growthEngineRoutes };
