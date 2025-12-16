/**
 * @tooloo/api - Observatory Routes
 * Real-time system observability with proactive insights
 *
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-16
 *
 * Provides:
 * - /pulse: Real-time system heartbeat with all metrics
 * - /alerts: Active alerts and warnings
 * - /insights: AI-generated proactive insights
 * - /engines: Engine-specific metrics
 * - /healing: Self-healing status
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Orchestrator } from '@tooloo/engine';
import { kernel } from '../../../../src/kernel/kernel.js';
import { createSkillEngineService } from '../../../../src/skills/engine-service.js';
import {
  getSelfHealingService,
  type DetectedIssue,
  type HealingAttempt,
} from '@tooloo/skills';

// =============================================================================
// TYPES
// =============================================================================

interface SystemPulse {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  metrics: {
    requests: { total: number; lastHour: number; successRate: number };
    latency: { p50: number; p95: number; p99: number };
    memory: { used: number; total: number; percentage: number };
    skills: { active: number; total: number };
    sessions: { active: number };
  };
  engines: {
    learning: { healthy: boolean; states: number; explorationRate: number };
    evolution: { healthy: boolean; activeTests: number; improvements: number };
    emergence: { healthy: boolean; patterns: number; synergies: number };
    routing: { healthy: boolean; providersOnline: number; successRate: number };
  };
  healing: {
    status: 'idle' | 'monitoring' | 'healing';
    activeIssues: number;
    recentHealings: number;
  };
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical' | 'info';
  component: string;
  message: string;
  timestamp: string;
  autoHeal?: boolean;
  acknowledged?: boolean;
}

interface ProactiveInsight {
  id: string;
  type: 'optimization' | 'warning' | 'opportunity' | 'learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
  timestamp: string;
}

// =============================================================================
// STATE
// =============================================================================

// In-memory alert store (would be persisted in production)
const alerts: Alert[] = [];
const insights: ProactiveInsight[] = [];
const startTime = Date.now();

// Request metrics (simple in-memory tracking)
const requestMetrics = {
  total: 0,
  success: 0,
  hourlyBuckets: new Map<number, { total: number; success: number }>(),
  latencies: [] as number[],
};

// Track request
export function trackRequest(success: boolean, latency: number): void {
  requestMetrics.total++;
  if (success) requestMetrics.success++;

  // Keep last 1000 latencies for percentile calculation
  requestMetrics.latencies.push(latency);
  if (requestMetrics.latencies.length > 1000) {
    requestMetrics.latencies.shift();
  }

  // Hourly bucket
  const hour = Math.floor(Date.now() / 3600000);
  const bucket = requestMetrics.hourlyBuckets.get(hour) ?? { total: 0, success: 0 };
  bucket.total++;
  if (success) bucket.success++;
  requestMetrics.hourlyBuckets.set(hour, bucket);

  // Clean old buckets (keep last 24 hours)
  const cutoff = hour - 24;
  for (const [key] of requestMetrics.hourlyBuckets) {
    if (key < cutoff) requestMetrics.hourlyBuckets.delete(key);
  }
}

// Add alert
export function addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): string {
  const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newAlert: Alert = {
    ...alert,
    id,
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };
  alerts.unshift(newAlert);

  // Keep last 100 alerts
  if (alerts.length > 100) alerts.pop();

  return id;
}

// Add insight
export function addInsight(insight: Omit<ProactiveInsight, 'id' | 'timestamp'>): string {
  const id = `insight_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newInsight: ProactiveInsight = {
    ...insight,
    id,
    timestamp: new Date().toISOString(),
  };
  insights.unshift(newInsight);

  // Keep last 50 insights
  if (insights.length > 50) insights.pop();

  return id;
}

// Calculate percentile from sorted array
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

// =============================================================================
// FACTORY
// =============================================================================

export function createObservatoryRouter(orchestrator: Orchestrator): Router {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /observatory/pulse - Real-time system heartbeat
  // -------------------------------------------------------------------------
  router.get('/pulse', (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Get engine services
      let engines = {
        learning: { healthy: false, states: 0, explorationRate: 0 },
        evolution: { healthy: false, activeTests: 0, improvements: 0 },
        emergence: { healthy: false, patterns: 0, synergies: 0 },
        routing: { healthy: false, providersOnline: 0, successRate: 0 },
      };

      try {
        const context = (kernel as any).context;
        const service = createSkillEngineService(context);
        const metrics = service.getAllMetrics();
        const health = service.getEngineHealth();

        engines = {
          learning: {
            healthy: health.engines.learning,
            states: metrics.learning.totalStates ?? 0,
            explorationRate: metrics.learning.explorationRate ?? 0.1,
          },
          evolution: {
            healthy: health.engines.evolution,
            activeTests: metrics.evolution.activeTests ?? 0,
            improvements: metrics.evolution.totalIterations ?? 0,
          },
          emergence: {
            healthy: health.engines.emergence,
            patterns: metrics.emergence.totalPatterns ?? 0,
            synergies: metrics.emergence.totalSynergies ?? 0,
          },
          routing: {
            healthy: health.engines.routing,
            providersOnline: metrics.routing.providersOnline ?? 0,
            successRate: metrics.routing.successRate ?? 1.0,
          },
        };
      } catch (e) {
        // Engines not available - use defaults
      }

      // Get healing status
      let healingStatus: SystemPulse['healing'] = {
        status: 'idle',
        activeIssues: 0,
        recentHealings: 0,
      };

      try {
        const healingService = getSelfHealingService();
        const healingMetrics = healingService.getMetrics?.() ?? {
          totalIssuesDetected: 0,
          totalHealingAttempts: 0,
        };
        const activeIssues = healingService.getActiveIssues?.() ?? [];

        healingStatus = {
          status: activeIssues.length > 0 ? 'healing' : 'monitoring',
          activeIssues: activeIssues.length,
          recentHealings: healingMetrics.totalHealingAttempts,
        };
      } catch (e) {
        // Self-healing not initialized
      }

      // Get memory stats
      const memoryStats = kernel.getMemoryStats?.() ?? {
        activeSessions: 0,
        totalMemories: 0,
        byTier: { session: 0, 'short-term': 0 },
      };

      // Calculate request metrics
      const currentHour = Math.floor(Date.now() / 3600000);
      const hourBucket = requestMetrics.hourlyBuckets.get(currentHour) ?? { total: 0, success: 0 };
      const successRate =
        requestMetrics.total > 0 ? requestMetrics.success / requestMetrics.total : 1.0;

      // Memory usage
      const memUsage = process.memoryUsage();

      // Determine overall status
      const allEnginesHealthy = Object.values(engines).every((e) => e.healthy);
      const noActiveIssues = healingStatus.activeIssues === 0;
      const goodSuccessRate = successRate > 0.9;

      let status: SystemPulse['status'] = 'healthy';
      if (!allEnginesHealthy || !goodSuccessRate) status = 'degraded';
      if (healingStatus.activeIssues > 3 || successRate < 0.7) status = 'critical';

      const pulse: SystemPulse = {
        timestamp: new Date().toISOString(),
        status,
        uptime: Date.now() - startTime,
        metrics: {
          requests: {
            total: requestMetrics.total,
            lastHour: hourBucket.total,
            successRate: Number(successRate.toFixed(3)),
          },
          latency: {
            p50: percentile(requestMetrics.latencies, 50),
            p95: percentile(requestMetrics.latencies, 95),
            p99: percentile(requestMetrics.latencies, 99),
          },
          memory: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: Number(((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)),
          },
          skills: {
            active: 0, // Would come from orchestrator
            total: 0, // Orchestrator skills count
          },
          sessions: {
            active: memoryStats.activeSessions,
          },
        },
        engines,
        healing: healingStatus,
      };

      res.json({
        success: true,
        data: pulse,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /observatory/alerts - Active alerts and warnings
  // -------------------------------------------------------------------------
  router.get('/alerts', (_req: Request, res: Response) => {
    // Also generate real-time alerts from engine status
    const liveAlerts: Alert[] = [...alerts];

    try {
      const healingService = getSelfHealingService();
      const activeIssues = healingService.getActiveIssues?.() ?? [];

      // Convert active issues to alerts
      for (const issue of activeIssues) {
        if (!liveAlerts.find((a) => a.id === `issue_${issue.id}`)) {
          liveAlerts.unshift({
            id: `issue_${issue.id}`,
            type: issue.severity === 'critical' ? 'critical' : issue.severity === 'high' ? 'error' : 'warning',
            component: issue.component,
            message: issue.description,
            timestamp: new Date(issue.detectedAt).toISOString(),
            autoHeal: issue.suggestedActions?.length > 0,
            acknowledged: false,
          });
        }
      }
    } catch (e) {
      // Self-healing not available
    }

    res.json({
      success: true,
      data: {
        alerts: liveAlerts.slice(0, 20),
        total: liveAlerts.length,
        unacknowledged: liveAlerts.filter((a) => !a.acknowledged).length,
      },
    });
  });

  // -------------------------------------------------------------------------
  // POST /observatory/alerts/:id/acknowledge - Acknowledge an alert
  // -------------------------------------------------------------------------
  router.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
    const { id } = req.params;
    const alert = alerts.find((a) => a.id === id);

    if (alert) {
      alert.acknowledged = true;
      res.json({ success: true, data: alert });
    } else {
      res.status(404).json({ success: false, error: 'Alert not found' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /observatory/insights - Proactive AI insights
  // -------------------------------------------------------------------------
  router.get('/insights', (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate real-time insights based on current state
      const liveInsights: ProactiveInsight[] = [...insights];

      // Check engine metrics for optimization opportunities
      try {
        const context = (kernel as any).context;
        const service = createSkillEngineService(context);
        const metrics = service.getAllMetrics();

        // High exploration rate insight
        if ((metrics.learning.explorationRate ?? 0) > 0.2) {
          const existingInsight = liveInsights.find((i) => i.id.startsWith('exploration_'));
          if (!existingInsight) {
            liveInsights.unshift({
              id: `exploration_${Date.now()}`,
              type: 'learning',
              title: 'High Exploration Mode',
              description: `Learning engine is in exploration mode (${((metrics.learning.explorationRate ?? 0) * 100).toFixed(0)}%). System is actively discovering optimal strategies.`,
              priority: 'low',
              actionable: false,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Active A/B tests
        if ((metrics.evolution.activeTests ?? 0) > 0) {
          const existingInsight = liveInsights.find((i) => i.id.startsWith('abtest_'));
          if (!existingInsight) {
            liveInsights.unshift({
              id: `abtest_${Date.now()}`,
              type: 'optimization',
              title: 'A/B Tests Running',
              description: `${metrics.evolution.activeTests} active experiments are optimizing skill performance.`,
              priority: 'medium',
              actionable: true,
              suggestedAction: 'Review test results in the Evolution dashboard',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Pattern detection
        if ((metrics.emergence.totalPatterns ?? 0) > 5) {
          const existingInsight = liveInsights.find((i) => i.id.startsWith('patterns_'));
          if (!existingInsight) {
            liveInsights.unshift({
              id: `patterns_${Date.now()}`,
              type: 'opportunity',
              title: 'Behavioral Patterns Detected',
              description: `Emergence engine has identified ${metrics.emergence.totalPatterns} usage patterns. Consider creating specialized skills.`,
              priority: 'medium',
              actionable: true,
              suggestedAction: 'Review patterns and create targeted skills',
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        // Engine insights not available
      }

      // Request rate insights
      const currentHour = Math.floor(Date.now() / 3600000);
      const hourBucket = requestMetrics.hourlyBuckets.get(currentHour);
      if (hourBucket && hourBucket.total > 100) {
        const existingInsight = liveInsights.find((i) => i.id.startsWith('highload_'));
        if (!existingInsight) {
          liveInsights.unshift({
            id: `highload_${Date.now()}`,
            type: 'warning',
            title: 'High Request Volume',
            description: `${hourBucket.total} requests in the last hour. Monitor system resources.`,
            priority: 'medium',
            actionable: false,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.json({
        success: true,
        data: {
          insights: liveInsights.slice(0, 15),
          total: liveInsights.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /observatory/engines/:engine - Detailed engine metrics
  // -------------------------------------------------------------------------
  router.get('/engines/:engine', (req: Request, res: Response, next: NextFunction) => {
    try {
      const engine = req.params['engine'] ?? '';
      const validEngines = ['learning', 'evolution', 'emergence', 'routing'];

      if (!validEngines.includes(engine)) {
        res.status(400).json({
          success: false,
          error: `Invalid engine. Must be one of: ${validEngines.join(', ')}`,
        });
        return;
      }

      const context = (kernel as any).context;
      const service = createSkillEngineService(context);

      let data: any = {};

      switch (engine) {
        case 'learning':
          data = service.getLearningStatus();
          break;
        case 'evolution':
          data = service.getEvolutionStatus();
          break;
        case 'emergence':
          // Use emergence summary from service
          data = service.getEmergenceSummary();
          break;
        case 'routing':
          data = {
            ...service.getAllMetrics().routing,
            providers: context?.services?.engines?.routing?.getProviderHealth?.() ?? {},
          };
          break;
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // GET /observatory/healing - Self-healing status and history
  // -------------------------------------------------------------------------
  router.get('/healing', (_req: Request, res: Response, next: NextFunction) => {
    try {
      let healingData = {
        status: 'unavailable',
        initialized: false,
        activeIssues: [] as DetectedIssue[],
        recentAttempts: [] as HealingAttempt[],
        metrics: {
          totalIssuesDetected: 0,
          totalHealingAttempts: 0,
          successfulHealings: 0,
          failedHealings: 0,
          escalations: 0,
        },
      };

      try {
        const healingService = getSelfHealingService();
        const metrics = healingService.getMetrics?.();
        const activeIssues = healingService.getActiveIssues?.() ?? [];
        const history = healingService.getHealingHistory?.() ?? [];

        healingData = {
          status: activeIssues.length > 0 ? 'healing' : 'monitoring',
          initialized: true,
          activeIssues,
          recentAttempts: history.slice(0, 10),
          metrics: metrics ?? healingData.metrics,
        };
      } catch (e) {
        // Self-healing service not initialized
      }

      res.json({
        success: true,
        data: healingData,
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------------------------------------------------------
  // POST /observatory/healing/trigger - Manually trigger health check
  // -------------------------------------------------------------------------
  router.post('/healing/trigger', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Return success - the healing service will run its own checks
      // This endpoint signals intent rather than direct execution
      res.json({
        success: true,
        message: 'Health check requested',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createObservatoryRouter;
