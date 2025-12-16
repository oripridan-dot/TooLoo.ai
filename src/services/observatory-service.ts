/**
 * @file ObservatoryService - Proactive System Intelligence
 * @description Aggregates metrics, detects anomalies, and generates proactive insights
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-16
 *
 * This service provides:
 * - Real-time metric aggregation from all engines
 * - Anomaly detection using statistical analysis
 * - Proactive insight generation based on patterns
 * - Trend analysis and forecasting
 * - Alert management and escalation
 */

import { EventEmitter } from 'events';
import { kernel } from '../../kernel/kernel.js';
import { createSkillEngineService } from '../../skills/engine-service.js';

// =============================================================================
// TYPES
// =============================================================================

export type InsightType = 'optimization' | 'warning' | 'opportunity' | 'learning';
export type InsightPriority = 'low' | 'medium' | 'high';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: InsightPriority;
  actionable: boolean;
  suggestedAction?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  component: string;
  message: string;
  timestamp: number;
  autoHeal: boolean;
  acknowledged: boolean;
  resolvedAt?: number;
}

export interface MetricSnapshot {
  timestamp: number;
  engines: {
    learning: { qTableSize: number; explorationRate: number; totalRewards: number };
    evolution: { activeTests: number; completedTests: number; improvementsDeployed: number };
    emergence: { totalPatterns: number; totalSynergies: number; signalCount: number };
    routing: { totalRequests: number; successRate: number; averageLatency: number };
  };
  system: {
    memoryUsage: number;
    cpuUsage?: number;
    activeSessions: number;
    requestRate: number;
  };
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: string;
}

export interface ObservatoryConfig {
  /** How often to collect metrics (ms) */
  collectionIntervalMs: number;
  /** How many snapshots to keep for trend analysis */
  maxSnapshots: number;
  /** Threshold for anomaly detection (standard deviations) */
  anomalyThreshold: number;
  /** Enable automatic insight generation */
  autoInsights: boolean;
  /** Enable trend-based alerts */
  trendAlerts: boolean;
}

// =============================================================================
// OBSERVATORY SERVICE
// =============================================================================

export class ObservatoryService extends EventEmitter {
  private config: Required<ObservatoryConfig>;
  private snapshots: MetricSnapshot[] = [];
  private insights: Insight[] = [];
  private alerts: Alert[] = [];
  private collectionInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(config: Partial<ObservatoryConfig> = {}) {
    super();
    this.config = {
      collectionIntervalMs: config.collectionIntervalMs ?? 30000, // 30 seconds
      maxSnapshots: config.maxSnapshots ?? 100,
      anomalyThreshold: config.anomalyThreshold ?? 2.0,
      autoInsights: config.autoInsights ?? true,
      trendAlerts: config.trendAlerts ?? true,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Observatory] 🔭 Initializing proactive observatory...');

    // Start metric collection
    this.startCollection();

    // Generate initial insights
    if (this.config.autoInsights) {
      await this.generateInsights();
    }

    this.initialized = true;
    this.emit('initialized');
    console.log('[Observatory] ✅ Observatory ready');
  }

  async shutdown(): Promise<void> {
    console.log('[Observatory] 🛑 Shutting down...');

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    this.initialized = false;
    console.log('[Observatory] ✅ Shutdown complete');
  }

  // ---------------------------------------------------------------------------
  // Metric Collection
  // ---------------------------------------------------------------------------

  private startCollection(): void {
    // Collect immediately
    this.collectMetrics();

    // Then at intervals
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionIntervalMs);
  }

  private async collectMetrics(): Promise<void> {
    try {
      const snapshot = await this.captureSnapshot();
      this.snapshots.push(snapshot);

      // Keep only maxSnapshots
      if (this.snapshots.length > this.config.maxSnapshots) {
        this.snapshots.shift();
      }

      // Analyze for anomalies
      this.detectAnomalies(snapshot);

      // Update trends
      if (this.config.trendAlerts) {
        this.analyzeTrends();
      }

      // Generate new insights periodically
      if (this.config.autoInsights && this.snapshots.length % 10 === 0) {
        await this.generateInsights();
      }

      this.emit('snapshot', snapshot);
    } catch (e) {
      console.error('[Observatory] Metric collection failed:', e);
    }
  }

  private async captureSnapshot(): Promise<MetricSnapshot> {
    let engines = {
      learning: { qTableSize: 0, explorationRate: 0.1, totalRewards: 0 },
      evolution: { activeTests: 0, completedTests: 0, improvementsDeployed: 0 },
      emergence: { totalPatterns: 0, totalSynergies: 0, signalCount: 0 },
      routing: { totalRequests: 0, successRate: 1.0, averageLatency: 0 },
    };

    try {
      const context = (kernel as any).context;
      const service = createSkillEngineService(context);
      const metrics = service.getAllMetrics();

      engines = {
        learning: {
          qTableSize: metrics.learning.qTableSize ?? 0,
          explorationRate: metrics.learning.explorationRate ?? 0.1,
          totalRewards: metrics.learning.totalRewards ?? 0,
        },
        evolution: {
          activeTests: metrics.evolution.activeTests ?? 0,
          completedTests: metrics.evolution.completedTests ?? 0,
          improvementsDeployed: metrics.evolution.improvementsDeployed ?? 0,
        },
        emergence: {
          totalPatterns: metrics.emergence.totalPatterns ?? 0,
          totalSynergies: metrics.emergence.totalSynergies ?? 0,
          signalCount: metrics.emergence.signalCount ?? 0,
        },
        routing: {
          totalRequests: metrics.routing.totalRequests ?? 0,
          successRate: metrics.routing.successRate ?? 1.0,
          averageLatency: metrics.routing.averageLatency ?? 0,
        },
      };
    } catch (e) {
      // Use defaults
    }

    const memUsage = process.memoryUsage();
    const memoryStats = kernel.getMemoryStats?.() ?? { activeSessions: 0 };

    return {
      timestamp: Date.now(),
      engines,
      system: {
        memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        activeSessions: memoryStats.activeSessions,
        requestRate: this.calculateRequestRate(),
      },
    };
  }

  private calculateRequestRate(): number {
    if (this.snapshots.length < 2) return 0;

    const recent = this.snapshots.slice(-5);
    const totalRequests = recent.reduce(
      (sum, s) => sum + s.engines.routing.totalRequests,
      0
    );
    const timeSpan =
      recent[recent.length - 1].timestamp - recent[0].timestamp;

    return timeSpan > 0 ? (totalRequests / timeSpan) * 60000 : 0; // requests per minute
  }

  // ---------------------------------------------------------------------------
  // Anomaly Detection
  // ---------------------------------------------------------------------------

  private detectAnomalies(snapshot: MetricSnapshot): void {
    if (this.snapshots.length < 10) return; // Need history for detection

    // Check memory usage
    const memoryHistory = this.snapshots.map((s) => s.system.memoryUsage);
    const memoryAnomaly = this.isAnomaly(
      snapshot.system.memoryUsage,
      memoryHistory
    );
    if (memoryAnomaly) {
      this.addAlert({
        severity: 'warning',
        component: 'system',
        message: `Memory usage anomaly detected: ${snapshot.system.memoryUsage.toFixed(1)}%`,
        autoHeal: false,
      });
    }

    // Check success rate drop
    const successHistory = this.snapshots.map((s) => s.engines.routing.successRate);
    const successAnomaly = this.isAnomaly(
      snapshot.engines.routing.successRate,
      successHistory,
      'below'
    );
    if (successAnomaly && snapshot.engines.routing.successRate < 0.9) {
      this.addAlert({
        severity: 'error',
        component: 'routing',
        message: `Success rate dropped to ${(snapshot.engines.routing.successRate * 100).toFixed(1)}%`,
        autoHeal: true,
      });
    }

    // Check latency spike
    const latencyHistory = this.snapshots.map((s) => s.engines.routing.averageLatency);
    const latencyAnomaly = this.isAnomaly(
      snapshot.engines.routing.averageLatency,
      latencyHistory
    );
    if (latencyAnomaly && snapshot.engines.routing.averageLatency > 2000) {
      this.addAlert({
        severity: 'warning',
        component: 'routing',
        message: `High latency detected: ${snapshot.engines.routing.averageLatency}ms`,
        autoHeal: false,
      });
    }
  }

  private isAnomaly(
    value: number,
    history: number[],
    direction: 'above' | 'below' | 'both' = 'above'
  ): boolean {
    if (history.length < 5) return false;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance =
      history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      history.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return false;

    const zScore = (value - mean) / stdDev;

    switch (direction) {
      case 'above':
        return zScore > this.config.anomalyThreshold;
      case 'below':
        return zScore < -this.config.anomalyThreshold;
      case 'both':
        return Math.abs(zScore) > this.config.anomalyThreshold;
    }
  }

  // ---------------------------------------------------------------------------
  // Trend Analysis
  // ---------------------------------------------------------------------------

  private analyzeTrends(): void {
    if (this.snapshots.length < 20) return;

    const trends = this.calculateTrends();

    // Generate alerts for significant trends
    for (const trend of trends) {
      if (Math.abs(trend.changePercent) > 20) {
        const direction = trend.direction === 'up' ? 'increased' : 'decreased';
        const priority: InsightPriority =
          Math.abs(trend.changePercent) > 50 ? 'high' : 'medium';

        this.addInsight({
          type: 'warning',
          title: `${trend.metric} Trend Alert`,
          description: `${trend.metric} has ${direction} by ${Math.abs(trend.changePercent).toFixed(0)}% over the ${trend.period}`,
          priority,
          actionable: true,
          suggestedAction: `Review ${trend.metric} performance and adjust if needed`,
        });
      }
    }
  }

  private calculateTrends(): Trend[] {
    const trends: Trend[] = [];
    const recent = this.snapshots.slice(-20);
    const old = this.snapshots.slice(0, 20);

    if (recent.length < 5 || old.length < 5) return trends;

    // Calculate average metrics for each period
    const recentAvg = this.averageSnapshot(recent);
    const oldAvg = this.averageSnapshot(old);

    // Compare key metrics
    const metrics = [
      { name: 'Success Rate', recent: recentAvg.routing.successRate, old: oldAvg.routing.successRate },
      { name: 'Latency', recent: recentAvg.routing.averageLatency, old: oldAvg.routing.averageLatency },
      { name: 'Q-Table Size', recent: recentAvg.learning.qTableSize, old: oldAvg.learning.qTableSize },
      { name: 'Patterns', recent: recentAvg.emergence.totalPatterns, old: oldAvg.emergence.totalPatterns },
    ];

    for (const metric of metrics) {
      if (metric.old === 0) continue;
      const changePercent = ((metric.recent - metric.old) / metric.old) * 100;
      const direction: Trend['direction'] =
        changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

      trends.push({
        metric: metric.name,
        direction,
        changePercent,
        period: 'last hour',
      });
    }

    return trends;
  }

  private averageSnapshot(snapshots: MetricSnapshot[]): {
    routing: { successRate: number; averageLatency: number };
    learning: { qTableSize: number };
    emergence: { totalPatterns: number };
  } {
    const n = snapshots.length;
    if (n === 0) {
      return {
        routing: { successRate: 0, averageLatency: 0 },
        learning: { qTableSize: 0 },
        emergence: { totalPatterns: 0 },
      };
    }

    return {
      routing: {
        successRate:
          snapshots.reduce((s, x) => s + x.engines.routing.successRate, 0) / n,
        averageLatency:
          snapshots.reduce((s, x) => s + x.engines.routing.averageLatency, 0) / n,
      },
      learning: {
        qTableSize:
          snapshots.reduce((s, x) => s + x.engines.learning.qTableSize, 0) / n,
      },
      emergence: {
        totalPatterns:
          snapshots.reduce((s, x) => s + x.engines.emergence.totalPatterns, 0) / n,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Insight Generation
  // ---------------------------------------------------------------------------

  async generateInsights(): Promise<void> {
    const newInsights: Omit<Insight, 'id' | 'timestamp'>[] = [];

    // Get current state
    const latest = this.snapshots[this.snapshots.length - 1];
    if (!latest) return;

    // Learning insights
    if (latest.engines.learning.explorationRate > 0.2) {
      newInsights.push({
        type: 'learning',
        title: 'High Exploration Mode',
        description: `Learning engine is exploring with ${(latest.engines.learning.explorationRate * 100).toFixed(0)}% exploration rate. System is discovering new optimal strategies.`,
        priority: 'low',
        actionable: false,
      });
    }

    if (latest.engines.learning.qTableSize > 500) {
      newInsights.push({
        type: 'opportunity',
        title: 'Rich Learning Data',
        description: `Q-table has ${latest.engines.learning.qTableSize} states. Consider consolidating learned patterns into new skills.`,
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Review learned strategies for skill synthesis opportunities',
      });
    }

    // Evolution insights
    if (latest.engines.evolution.activeTests > 0) {
      newInsights.push({
        type: 'optimization',
        title: 'A/B Tests Running',
        description: `${latest.engines.evolution.activeTests} active experiments optimizing skill performance.`,
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Monitor test results for winning strategies',
      });
    }

    if (latest.engines.evolution.improvementsDeployed > 0) {
      newInsights.push({
        type: 'optimization',
        title: 'Improvements Deployed',
        description: `${latest.engines.evolution.improvementsDeployed} successful optimizations have been deployed.`,
        priority: 'low',
        actionable: false,
      });
    }

    // Emergence insights
    if (latest.engines.emergence.totalPatterns > 10) {
      newInsights.push({
        type: 'opportunity',
        title: 'Behavioral Patterns Detected',
        description: `Emergence engine has identified ${latest.engines.emergence.totalPatterns} usage patterns. Consider creating specialized skills.`,
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Review patterns and create targeted skills',
      });
    }

    if (latest.engines.emergence.totalSynergies > 5) {
      newInsights.push({
        type: 'opportunity',
        title: 'Skill Synergies Found',
        description: `${latest.engines.emergence.totalSynergies} skill combinations work better together. Consider orchestrating these skills.`,
        priority: 'medium',
        actionable: true,
        suggestedAction: 'Create orchestration rules for synergistic skills',
      });
    }

    // System insights
    if (latest.system.memoryUsage > 70) {
      newInsights.push({
        type: 'warning',
        title: 'High Memory Usage',
        description: `Memory usage at ${latest.system.memoryUsage.toFixed(1)}%. Consider clearing caches or restarting services.`,
        priority: 'high',
        actionable: true,
        suggestedAction: 'Clear memory caches or restart low-priority services',
      });
    }

    // Add new insights (avoid duplicates by title)
    for (const insight of newInsights) {
      const exists = this.insights.some(
        (i) =>
          i.title === insight.title &&
          Date.now() - i.timestamp < 3600000 // Within last hour
      );
      if (!exists) {
        this.addInsight(insight);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Alert & Insight Management
  // ---------------------------------------------------------------------------

  private addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newAlert: Alert = {
      ...alert,
      id,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.unshift(newAlert);
    if (this.alerts.length > 100) this.alerts.pop();

    this.emit('alert', newAlert);
    return id;
  }

  private addInsight(insight: Omit<Insight, 'id' | 'timestamp'>): string {
    const id = `insight_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newInsight: Insight = {
      ...insight,
      id,
      timestamp: Date.now(),
    };

    this.insights.unshift(newInsight);
    if (this.insights.length > 50) this.insights.pop();

    this.emit('insight', newInsight);
    return id;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.emit('alert:resolved', alert);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getAlerts(includeAcknowledged = false): Alert[] {
    if (includeAcknowledged) return [...this.alerts];
    return this.alerts.filter((a) => !a.acknowledged);
  }

  getInsights(limit = 15): Insight[] {
    return this.insights.slice(0, limit);
  }

  getSnapshots(limit = 50): MetricSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  getLatestSnapshot(): MetricSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  getTrends(): Trend[] {
    return this.calculateTrends();
  }

  getStats() {
    return {
      snapshotCount: this.snapshots.length,
      activeAlerts: this.alerts.filter((a) => !a.acknowledged).length,
      totalAlerts: this.alerts.length,
      insightCount: this.insights.length,
      oldestSnapshot: this.snapshots[0]?.timestamp ?? null,
      newestSnapshot: this.snapshots[this.snapshots.length - 1]?.timestamp ?? null,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: ObservatoryService | null = null;

export function getObservatoryService(
  config?: Partial<ObservatoryConfig>
): ObservatoryService {
  if (!instance) {
    instance = new ObservatoryService(config);
  }
  return instance;
}

export function resetObservatoryService(): void {
  instance?.shutdown();
  instance = null;
}

export default ObservatoryService;
