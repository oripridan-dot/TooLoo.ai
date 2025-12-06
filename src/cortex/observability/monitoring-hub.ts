// @version 3.3.187
/**
 * MonitoringHub
 * Unified observability platform for TooLoo's growth and learning systems.
 *
 * Key capabilities:
 * - Unified metrics aggregation from all subsystems
 * - Real-time alert system with configurable thresholds
 * - Cross-system correlation analysis
 * - Historical trend analysis with forecasting
 * - WebSocket streaming for live dashboards
 * - Metric export and reporting
 *
 * Monitors:
 * - Learning: scheduler, reinforcement learner, patterns
 * - Emergence: predictor, amplifier, discoveries
 * - Exploration: lab, hypotheses, curiosity
 * - System: resources, health, performance
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type SystemComponent =
  | 'learning'
  | 'emergence'
  | 'exploration'
  | 'curiosity'
  | 'scheduler'
  | 'predictor'
  | 'growth-engine'
  | 'system';

export interface Metric {
  id: string;
  name: string;
  component: SystemComponent;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  labels: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface MetricSeries {
  name: string;
  component: SystemComponent;
  dataPoints: MetricDataPoint[];
  aggregation: AggregationConfig;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

export interface AggregationConfig {
  intervalMs: number;
  method: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';
  retentionMs: number;
}

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  component: SystemComponent;
  metric: string;
  condition: AlertCondition;
  currentValue: number;
  thresholdValue: number;
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'change' | 'absence';
  threshold: number;
  duration?: number; // How long condition must be true (ms)
  cooldown?: number; // Minimum time between alerts (ms)
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  component: SystemComponent;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  notifyChannels?: string[];
}

export interface MetricCorrelation {
  metricA: string;
  metricB: string;
  correlation: number;
  lag: number;
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  sampleCount: number;
  lastUpdated: Date;
}

export interface TrendForecast {
  metric: string;
  currentValue: number;
  forecastValue: number;
  forecastTime: Date;
  direction: 'up' | 'down' | 'stable';
  confidence: number;
  changePercent: number;
}

export interface SystemSnapshot {
  timestamp: Date;
  components: Record<SystemComponent, ComponentStatus>;
  metrics: Metric[];
  alerts: Alert[];
  health: OverallHealth;
}

export interface ComponentStatus {
  name: SystemComponent;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastUpdate: Date;
  metrics: Record<string, number>;
  issues: string[];
}

export interface OverallHealth {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  activeAlerts: number;
  components: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface MonitoringPolicy {
  // Collection
  collectionIntervalMs: number;
  retentionDays: number;
  maxDataPoints: number;

  // Aggregation
  aggregationIntervals: number[];
  defaultAggregation: AggregationConfig['method'];

  // Alerts
  alertsEnabled: boolean;
  maxActiveAlerts: number;
  alertCooldownMs: number;
  autoResolveMs: number;

  // Correlation
  correlationEnabled: boolean;
  correlationWindowMs: number;
  minCorrelationStrength: number;

  // Streaming
  streamingEnabled: boolean;
  streamingIntervalMs: number;
}

export interface MonitoringState {
  status: 'active' | 'paused' | 'degraded';
  lastCollection: Date;
  lastCorrelationUpdate: Date;
  subscribers: Set<string>;
  metrics: MonitoringMetrics;
}

export interface MonitoringMetrics {
  totalMetricsCollected: number;
  totalAlertsTriggered: number;
  totalAlertsSent: number;
  correlationsFound: number;
  streamingClients: number;
  dataPointsStored: number;
  storageUsedBytes: number;
}

// Default alert rules
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'learning-rate-low',
    name: 'Learning Rate Too Low',
    enabled: true,
    component: 'learning',
    metric: 'learning.effectiveRate',
    condition: { operator: '<', threshold: 0.05, duration: 300000 },
    severity: 'warning',
    annotations: { description: 'Learning rate has been below 0.05 for 5 minutes' },
  },
  {
    id: 'learning-rate-high',
    name: 'Learning Rate Spike',
    enabled: true,
    component: 'learning',
    metric: 'learning.effectiveRate',
    condition: { operator: '>', threshold: 0.5, duration: 60000 },
    severity: 'info',
    annotations: { description: 'Learning rate is elevated (boost active)' },
  },
  {
    id: 'emergence-prediction-accuracy',
    name: 'Low Prediction Accuracy',
    enabled: true,
    component: 'predictor',
    metric: 'predictor.accuracy',
    condition: { operator: '<', threshold: 0.3, duration: 600000 },
    severity: 'warning',
    annotations: { description: 'Emergence prediction accuracy below 30%' },
  },
  {
    id: 'curiosity-low',
    name: 'Low Curiosity Score',
    enabled: true,
    component: 'curiosity',
    metric: 'curiosity.totalScore',
    condition: { operator: '<', threshold: 0.2, duration: 600000 },
    severity: 'info',
    annotations: { description: 'System curiosity is low - consider exploration boost' },
  },
  {
    id: 'exploration-stalled',
    name: 'Exploration Stalled',
    enabled: true,
    component: 'exploration',
    metric: 'exploration.hypothesesActive',
    condition: { operator: '==', threshold: 0, duration: 1800000 },
    severity: 'warning',
    annotations: { description: 'No active hypotheses for 30 minutes' },
  },
  {
    id: 'scheduler-quota-exhausted',
    name: 'Scheduler Quota Exhausted',
    enabled: true,
    component: 'scheduler',
    metric: 'scheduler.quotaRemaining',
    condition: { operator: '<', threshold: 30, duration: 0 },
    severity: 'warning',
    annotations: { description: 'Daily learning quota nearly exhausted' },
  },
  {
    id: 'memory-high',
    name: 'High Memory Usage',
    enabled: true,
    component: 'system',
    metric: 'system.memoryUsage',
    condition: { operator: '>', threshold: 0.85, duration: 120000 },
    severity: 'critical',
    annotations: { description: 'System memory usage above 85%' },
  },
  {
    id: 'emergence-surge',
    name: 'Emergence Surge Detected',
    enabled: true,
    component: 'emergence',
    metric: 'emergence.recentCount',
    condition: { operator: '>', threshold: 5, duration: 60000 },
    severity: 'info',
    annotations: { description: 'Multiple emergence events in short time' },
  },
];

// ============================================================================
// MONITORING HUB
// ============================================================================

export class MonitoringHub {
  private static instance: MonitoringHub;

  private metricSeries: Map<string, MetricSeries> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private correlations: Map<string, MetricCorrelation> = new Map();
  private componentStatus: Map<SystemComponent, ComponentStatus> = new Map();
  private policy: MonitoringPolicy;
  private state: MonitoringState;
  private dataDir: string;
  private stateFile: string;
  private collectionInterval?: NodeJS.Timeout;
  private correlationInterval?: NodeJS.Timeout;
  private streamingInterval?: NodeJS.Timeout;
  private subscribers: Map<string, (data: unknown) => void> = new Map();

  private readonly MAX_ALERT_HISTORY = 1000;
  private readonly MAX_DATA_POINTS = 10000;
  private readonly COMPONENTS: SystemComponent[] = [
    'learning',
    'emergence',
    'exploration',
    'curiosity',
    'scheduler',
    'predictor',
    'system',
  ];

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'monitoring');
    this.stateFile = path.join(this.dataDir, 'monitoring-state.json');

    this.policy = {
      collectionIntervalMs: 10000, // 10 seconds
      retentionDays: 7,
      maxDataPoints: 10000,
      aggregationIntervals: [60000, 300000, 3600000], // 1min, 5min, 1hour
      defaultAggregation: 'avg',
      alertsEnabled: true,
      maxActiveAlerts: 100,
      alertCooldownMs: 300000, // 5 minutes
      autoResolveMs: 600000, // 10 minutes
      correlationEnabled: true,
      correlationWindowMs: 3600000, // 1 hour
      minCorrelationStrength: 0.5,
      streamingEnabled: true,
      streamingIntervalMs: 5000, // 5 seconds
    };

    this.state = {
      status: 'paused',
      lastCollection: new Date(),
      lastCorrelationUpdate: new Date(),
      subscribers: new Set(),
      metrics: {
        totalMetricsCollected: 0,
        totalAlertsTriggered: 0,
        totalAlertsSent: 0,
        correlationsFound: 0,
        streamingClients: 0,
        dataPointsStored: 0,
        storageUsedBytes: 0,
      },
    };

    // Initialize component status
    for (const component of this.COMPONENTS) {
      this.componentStatus.set(component, {
        name: component,
        status: 'unknown',
        lastUpdate: new Date(),
        metrics: {},
        issues: [],
      });
    }

    this.setupListeners();
  }

  static getInstance(): MonitoringHub {
    if (!MonitoringHub.instance) {
      MonitoringHub.instance = new MonitoringHub();
    }
    return MonitoringHub.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[MonitoringHub] Initializing unified monitoring system...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    // Load default alert rules if none exist
    if (this.alertRules.size === 0) {
      for (const rule of DEFAULT_ALERT_RULES) {
        this.alertRules.set(rule.id, rule);
      }
    }

    // Start monitoring
    this.start();

    bus.publish('system', 'hub:initialized', {
      policy: this.policy,
      alertRules: this.alertRules.size,
      components: this.COMPONENTS.length,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[MonitoringHub] Ready - ${this.alertRules.size} alert rules, ${this.COMPONENTS.length} components`
    );
  }

  private setupListeners(): void {
    // Learning system metrics
    bus.on('learning:reward_received', (event: SynapsysEvent) => {
      this.handleLearningEvent(event.payload as Record<string, unknown>);
    });

    bus.on('scheduler:window_started', (event: SynapsysEvent) => {
      this.handleSchedulerEvent(event.payload as Record<string, unknown>);
    });

    // Emergence system metrics
    bus.on('emergence:detected', (event: SynapsysEvent) => {
      this.handleEmergenceEvent(event.payload as Record<string, unknown>);
    });

    bus.on('prediction:created', (event: SynapsysEvent) => {
      this.handlePredictorEvent(event.payload as Record<string, unknown>);
    });

    // Exploration system metrics
    bus.on('hypothesis:validated', (event: SynapsysEvent) => {
      this.handleExplorationEvent(event.payload as Record<string, unknown>);
    });

    // Curiosity metrics
    bus.on('curiosity:signal', (event: SynapsysEvent) => {
      this.handleCuriosityEvent(event.payload as Record<string, unknown>);
    });

    // System metrics
    bus.on('system:health', (event: SynapsysEvent) => {
      this.handleSystemEvent(event.payload as Record<string, unknown>);
    });
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  start(): void {
    if (this.state.status === 'active') {
      return;
    }

    this.state.status = 'active';

    // Start collection cycle
    this.collectionInterval = setInterval(
      () => this.collectMetrics(),
      this.policy.collectionIntervalMs
    );

    // Start correlation analysis
    if (this.policy.correlationEnabled) {
      this.correlationInterval = setInterval(
        () => this.updateCorrelations(),
        this.policy.correlationWindowMs / 10
      );
    }

    // Start streaming
    if (this.policy.streamingEnabled) {
      this.streamingInterval = setInterval(
        () => this.broadcastUpdate(),
        this.policy.streamingIntervalMs
      );
    }

    // Initial collection
    this.collectMetrics();

    console.log('[MonitoringHub] ▶️ Monitoring started');
  }

  stop(): void {
    this.state.status = 'paused';

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    if (this.correlationInterval) {
      clearInterval(this.correlationInterval);
      this.correlationInterval = undefined;
    }

    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = undefined;
    }

    console.log('[MonitoringHub] ⏹️ Monitoring stopped');
  }

  // ============================================================================
  // METRIC COLLECTION
  // ============================================================================

  private async collectMetrics(): Promise<void> {
    const now = new Date();
    this.state.lastCollection = now;

    // Collect system metrics
    const systemMetrics = await this.collectSystemMetrics();
    for (const metric of systemMetrics) {
      this.recordMetric(metric);
    }

    // Check alert conditions
    if (this.policy.alertsEnabled) {
      this.checkAlertConditions();
    }

    // Auto-resolve old alerts
    this.autoResolveAlerts();

    this.state.metrics.totalMetricsCollected += systemMetrics.length;
  }

  private async collectSystemMetrics(): Promise<Metric[]> {
    const metrics: Metric[] = [];
    const now = new Date();

    try {
      const os = await import('os');

      // CPU usage
      const cpus = os.cpus();
      const avgIdle =
        cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0) /
        cpus.reduce((sum, cpu) => sum + Object.values(cpu.times).reduce((a, b) => a + b, 0), 0);

      metrics.push({
        id: `sys-cpu-${now.getTime()}`,
        name: 'system.cpuUsage',
        component: 'system',
        type: 'gauge',
        value: 1 - avgIdle,
        unit: 'percent',
        timestamp: now,
        labels: {},
      });

      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = (totalMem - freeMem) / totalMem;

      metrics.push({
        id: `sys-mem-${now.getTime()}`,
        name: 'system.memoryUsage',
        component: 'system',
        type: 'gauge',
        value: usedMem,
        unit: 'percent',
        timestamp: now,
        labels: {},
      });

      // Load average
      const loadAvg = (os.loadavg()[0] ?? 0) / cpus.length;
      metrics.push({
        id: `sys-load-${now.getTime()}`,
        name: 'system.loadAverage',
        component: 'system',
        type: 'gauge',
        value: loadAvg,
        unit: 'load',
        timestamp: now,
        labels: {},
      });

      // Uptime
      metrics.push({
        id: `sys-uptime-${now.getTime()}`,
        name: 'system.uptime',
        component: 'system',
        type: 'counter',
        value: process.uptime(),
        unit: 'seconds',
        timestamp: now,
        labels: {},
      });

      // Process memory
      const processMemory = process.memoryUsage();
      metrics.push({
        id: `sys-heap-${now.getTime()}`,
        name: 'system.heapUsed',
        component: 'system',
        type: 'gauge',
        value: processMemory.heapUsed / 1024 / 1024,
        unit: 'MB',
        timestamp: now,
        labels: {},
      });
    } catch (error) {
      console.error('[MonitoringHub] Failed to collect system metrics:', error);
    }

    return metrics;
  }

  recordMetric(metric: Metric): void {
    const seriesKey = metric.name;

    if (!this.metricSeries.has(seriesKey)) {
      this.metricSeries.set(seriesKey, {
        name: metric.name,
        component: metric.component,
        dataPoints: [],
        aggregation: {
          intervalMs: this.policy.aggregationIntervals[0] || 60000,
          method: this.policy.defaultAggregation,
          retentionMs: this.policy.retentionDays * 24 * 60 * 60 * 1000,
        },
      });
    }

    const series = this.metricSeries.get(seriesKey)!;
    series.dataPoints.push({
      timestamp: metric.timestamp,
      value: metric.value,
      labels: metric.labels,
    });

    // Trim old data points
    const cutoff = Date.now() - series.aggregation.retentionMs;
    series.dataPoints = series.dataPoints.filter((dp) => dp.timestamp.getTime() > cutoff);

    // Limit total data points
    if (series.dataPoints.length > this.policy.maxDataPoints) {
      series.dataPoints = series.dataPoints.slice(-this.policy.maxDataPoints);
    }

    this.state.metrics.dataPointsStored = this.getTotalDataPoints();

    // Update component status
    this.updateComponentStatus(metric);
  }

  private getTotalDataPoints(): number {
    let total = 0;
    for (const series of this.metricSeries.values()) {
      total += series.dataPoints.length;
    }
    return total;
  }

  private updateComponentStatus(metric: Metric): void {
    const status = this.componentStatus.get(metric.component);
    if (status) {
      status.lastUpdate = metric.timestamp;
      status.metrics[metric.name] = metric.value;

      // Determine health based on recent metrics
      if (status.status === 'unknown') {
        status.status = 'healthy';
      }
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private handleLearningEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['effectiveLearningRate'] !== undefined) {
      this.recordMetric({
        id: `learn-rate-${now.getTime()}`,
        name: 'learning.effectiveRate',
        component: 'learning',
        type: 'gauge',
        value: payload['effectiveLearningRate'] as number,
        unit: 'rate',
        timestamp: now,
        labels: {},
      });
    }

    if (payload['multiplier'] !== undefined) {
      this.recordMetric({
        id: `learn-mult-${now.getTime()}`,
        name: 'learning.multiplier',
        component: 'learning',
        type: 'gauge',
        value: payload['multiplier'] as number,
        unit: 'multiplier',
        timestamp: now,
        labels: {},
      });
    }

    if (payload['value'] !== undefined && payload['source'] === 'reward') {
      this.recordMetric({
        id: `learn-reward-${now.getTime()}`,
        name: 'learning.reward',
        component: 'learning',
        type: 'gauge',
        value: payload['value'] as number,
        unit: 'score',
        timestamp: now,
        labels: {
          source:
            ((payload['context'] as Record<string, unknown>)?.['taskType'] as string) || 'unknown',
        },
      });
    }
  }

  private handleSchedulerEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['scheduleType'] !== undefined) {
      this.recordMetric({
        id: `sched-active-${now.getTime()}`,
        name: 'scheduler.activeSchedules',
        component: 'scheduler',
        type: 'gauge',
        value: 1,
        unit: 'count',
        timestamp: now,
        labels: { type: payload['scheduleType'] as string },
      });
    }

    if (payload['durationMinutes'] !== undefined) {
      this.recordMetric({
        id: `sched-duration-${now.getTime()}`,
        name: 'scheduler.executionDuration',
        component: 'scheduler',
        type: 'gauge',
        value: payload['durationMinutes'] as number,
        unit: 'minutes',
        timestamp: now,
        labels: {},
      });
    }
  }

  private handleEmergenceEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['signature'] !== undefined) {
      const sig = payload['signature'] as Record<string, unknown>;
      this.recordMetric({
        id: `emerg-strength-${now.getTime()}`,
        name: 'emergence.strength',
        component: 'emergence',
        type: 'gauge',
        value: (sig['strength'] as number) || 0,
        unit: 'score',
        timestamp: now,
        labels: { type: (sig['type'] as string) || 'unknown' },
      });

      this.recordMetric({
        id: `emerg-count-${now.getTime()}`,
        name: 'emergence.recentCount',
        component: 'emergence',
        type: 'counter',
        value: 1,
        unit: 'count',
        timestamp: now,
        labels: {},
      });
    }
  }

  private handlePredictorEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['prediction'] !== undefined) {
      const pred = payload['prediction'] as Record<string, unknown>;
      this.recordMetric({
        id: `pred-conf-${now.getTime()}`,
        name: 'predictor.confidence',
        component: 'predictor',
        type: 'gauge',
        value: (pred['confidence'] as number) || 0,
        unit: 'score',
        timestamp: now,
        labels: { type: (pred['type'] as string) || 'unknown' },
      });
    }

    if (payload['accuracy'] !== undefined) {
      this.recordMetric({
        id: `pred-acc-${now.getTime()}`,
        name: 'predictor.accuracy',
        component: 'predictor',
        type: 'gauge',
        value: payload['accuracy'] as number,
        unit: 'percent',
        timestamp: now,
        labels: {},
      });
    }
  }

  private handleExplorationEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['hypothesesCount'] !== undefined) {
      this.recordMetric({
        id: `exp-hypo-${now.getTime()}`,
        name: 'exploration.hypothesesActive',
        component: 'exploration',
        type: 'gauge',
        value: payload['hypothesesCount'] as number,
        unit: 'count',
        timestamp: now,
        labels: {},
      });
    }

    if (payload['confidence'] !== undefined) {
      this.recordMetric({
        id: `exp-conf-${now.getTime()}`,
        name: 'exploration.confidence',
        component: 'exploration',
        type: 'gauge',
        value: payload['confidence'] as number,
        unit: 'score',
        timestamp: now,
        labels: {},
      });
    }
  }

  private handleCuriosityEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    if (payload['score'] !== undefined) {
      this.recordMetric({
        id: `cur-score-${now.getTime()}`,
        name: 'curiosity.totalScore',
        component: 'curiosity',
        type: 'gauge',
        value: payload['score'] as number,
        unit: 'score',
        timestamp: now,
        labels: { type: (payload['type'] as string) || 'unknown' },
      });
    }

    if (payload['dimensions'] !== undefined) {
      const dims = payload['dimensions'] as Record<string, number>;
      for (const [dim, value] of Object.entries(dims)) {
        this.recordMetric({
          id: `cur-dim-${dim}-${now.getTime()}`,
          name: `curiosity.dimension.${dim}`,
          component: 'curiosity',
          type: 'gauge',
          value,
          unit: 'score',
          timestamp: now,
          labels: { dimension: dim },
        });
      }
    }
  }

  private handleSystemEvent(payload: Record<string, unknown>): void {
    const now = new Date();

    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'number') {
        this.recordMetric({
          id: `sys-${key}-${now.getTime()}`,
          name: `system.${key}`,
          component: 'system',
          type: 'gauge',
          value,
          unit: 'value',
          timestamp: now,
          labels: {},
        });
      }
    }
  }

  // ============================================================================
  // ALERTING
  // ============================================================================

  private checkAlertConditions(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const series = this.metricSeries.get(rule.metric);
      if (!series || series.dataPoints.length === 0) continue;

      const currentValue = this.getLatestValue(series);
      const conditionMet = this.evaluateCondition(rule.condition, currentValue, series);

      if (conditionMet) {
        this.triggerAlert(rule, currentValue);
      } else {
        // Check if we should auto-resolve
        const existingAlert = this.activeAlerts.get(rule.id);
        if (existingAlert && existingAlert.status === 'active') {
          this.resolveAlert(rule.id, 'Condition no longer met');
        }
      }
    }
  }

  private getLatestValue(series: MetricSeries): number {
    const latest = series.dataPoints[series.dataPoints.length - 1];
    return latest?.value ?? 0;
  }

  private evaluateCondition(
    condition: AlertCondition,
    currentValue: number,
    series: MetricSeries
  ): boolean {
    let conditionMet = false;

    switch (condition.operator) {
      case '>':
        conditionMet = currentValue > condition.threshold;
        break;
      case '<':
        conditionMet = currentValue < condition.threshold;
        break;
      case '>=':
        conditionMet = currentValue >= condition.threshold;
        break;
      case '<=':
        conditionMet = currentValue <= condition.threshold;
        break;
      case '==':
        conditionMet = currentValue === condition.threshold;
        break;
      case '!=':
        conditionMet = currentValue !== condition.threshold;
        break;
      case 'change':
        const prevValue = series.dataPoints[series.dataPoints.length - 2]?.value ?? currentValue;
        const change = Math.abs(currentValue - prevValue);
        conditionMet = change > condition.threshold;
        break;
      case 'absence':
        const lastUpdate = series.dataPoints[series.dataPoints.length - 1]?.timestamp;
        if (lastUpdate) {
          conditionMet = Date.now() - lastUpdate.getTime() > condition.threshold;
        }
        break;
    }

    // Check duration if specified
    if (conditionMet && condition.duration) {
      const windowStart = Date.now() - condition.duration;
      const windowPoints = series.dataPoints.filter((dp) => dp.timestamp.getTime() > windowStart);

      // All points in window must meet condition
      conditionMet = windowPoints.every((dp) => {
        switch (condition.operator) {
          case '>':
            return dp.value > condition.threshold;
          case '<':
            return dp.value < condition.threshold;
          default:
            return true;
        }
      });
    }

    return conditionMet;
  }

  private triggerAlert(rule: AlertRule, currentValue: number): void {
    const existingAlert = this.activeAlerts.get(rule.id);

    // Check cooldown
    if (existingAlert) {
      const cooldown = rule.condition.cooldown ?? this.policy.alertCooldownMs;
      if (Date.now() - existingAlert.triggeredAt.getTime() < cooldown) {
        return; // Still in cooldown
      }
    }

    const alert: Alert = {
      id: `alert-${rule.id}-${Date.now()}`,
      name: rule.name,
      severity: rule.severity,
      status: 'active',
      component: rule.component,
      metric: rule.metric,
      condition: rule.condition,
      currentValue,
      thresholdValue: rule.condition.threshold,
      message: this.formatAlertMessage(rule, currentValue),
      triggeredAt: new Date(),
      metadata: { labels: rule.labels, annotations: rule.annotations },
    };

    this.activeAlerts.set(rule.id, alert);
    this.alertHistory.push(alert);
    this.state.metrics.totalAlertsTriggered++;

    // Trim history
    if (this.alertHistory.length > this.MAX_ALERT_HISTORY) {
      this.alertHistory = this.alertHistory.slice(-this.MAX_ALERT_HISTORY);
    }

    // Update component status
    const status = this.componentStatus.get(rule.component);
    if (status) {
      status.issues.push(alert.message);
      if (rule.severity === 'critical' || rule.severity === 'emergency') {
        status.status = 'unhealthy';
      } else if (rule.severity === 'warning') {
        status.status = status.status === 'healthy' ? 'degraded' : status.status;
      }
    }

    bus.publish('system', 'alert:triggered', {
      alert: this.sanitizeAlert(alert),
      timestamp: new Date().toISOString(),
    });

    console.log(`[MonitoringHub] 🚨 Alert: ${alert.name} (${alert.severity}) - ${alert.message}`);
  }

  private formatAlertMessage(rule: AlertRule, currentValue: number): string {
    const description = rule.annotations?.['description'] || '';
    return `${rule.metric}: ${currentValue.toFixed(2)} ${rule.condition.operator} ${rule.condition.threshold}. ${description}`;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string = 'system'): boolean {
    for (const [ruleId, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId || ruleId === alertId) {
        alert.status = 'acknowledged';
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = acknowledgedBy;

        bus.publish('system', 'alert:acknowledged', {
          alertId: alert.id,
          acknowledgedBy,
          timestamp: new Date().toISOString(),
        });

        return true;
      }
    }
    return false;
  }

  resolveAlert(alertIdOrRuleId: string, reason: string = 'Manually resolved'): boolean {
    const alert = this.activeAlerts.get(alertIdOrRuleId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertIdOrRuleId);

      // Update component status
      const status = this.componentStatus.get(alert.component);
      if (status) {
        status.issues = status.issues.filter((i) => i !== alert.message);
        if (status.issues.length === 0) {
          status.status = 'healthy';
        }
      }

      bus.publish('system', 'alert:resolved', {
        alertId: alert.id,
        reason,
        timestamp: new Date().toISOString(),
      });

      return true;
    }
    return false;
  }

  private autoResolveAlerts(): void {
    const now = Date.now();

    for (const [ruleId, alert] of this.activeAlerts.entries()) {
      if (alert.status !== 'active') continue;

      const age = now - alert.triggeredAt.getTime();
      if (age > this.policy.autoResolveMs) {
        this.resolveAlert(ruleId, 'Auto-resolved after timeout');
      }
    }
  }

  // ============================================================================
  // CORRELATION ANALYSIS
  // ============================================================================

  private updateCorrelations(): void {
    const seriesNames = Array.from(this.metricSeries.keys());
    this.state.lastCorrelationUpdate = new Date();

    for (let i = 0; i < seriesNames.length; i++) {
      for (let j = i + 1; j < seriesNames.length; j++) {
        const nameA = seriesNames[i];
        const nameB = seriesNames[j];
        if (!nameA || !nameB) continue;

        const seriesA = this.metricSeries.get(nameA)!;
        const seriesB = this.metricSeries.get(nameB)!;

        if (seriesA.dataPoints.length < 10 || seriesB.dataPoints.length < 10) {
          continue;
        }

        const correlation = this.calculateCorrelation(seriesA, seriesB);

        if (Math.abs(correlation.correlation) >= this.policy.minCorrelationStrength) {
          const key = `${nameA}|${nameB}`;
          this.correlations.set(key, correlation);
          this.state.metrics.correlationsFound = this.correlations.size;
        }
      }
    }
  }

  private calculateCorrelation(seriesA: MetricSeries, seriesB: MetricSeries): MetricCorrelation {
    // Align data points by time
    const aligned = this.alignSeries(seriesA.dataPoints, seriesB.dataPoints);

    if (aligned.length < 10) {
      return {
        metricA: seriesA.name,
        metricB: seriesB.name,
        correlation: 0,
        lag: 0,
        strength: 'weak',
        sampleCount: aligned.length,
        lastUpdated: new Date(),
      };
    }

    const valuesA = aligned.map((p) => p.a);
    const valuesB = aligned.map((p) => p.b);

    const correlation = this.pearsonCorrelation(valuesA, valuesB);
    const strength = this.getCorrelationStrength(correlation);

    return {
      metricA: seriesA.name,
      metricB: seriesB.name,
      correlation,
      lag: 0,
      strength,
      sampleCount: aligned.length,
      lastUpdated: new Date(),
    };
  }

  private alignSeries(
    pointsA: MetricDataPoint[],
    pointsB: MetricDataPoint[]
  ): { a: number; b: number }[] {
    const aligned: { a: number; b: number }[] = [];
    const tolerance = 5000; // 5 seconds

    for (const a of pointsA) {
      const match = pointsB.find(
        (b) => Math.abs(a.timestamp.getTime() - b.timestamp.getTime()) < tolerance
      );
      if (match) {
        aligned.push({ a: a.value, b: match.value });
      }
    }

    return aligned;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getCorrelationStrength(correlation: number): MetricCorrelation['strength'] {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'very_strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    return 'weak';
  }

  // ============================================================================
  // TREND FORECASTING
  // ============================================================================

  getForecast(metricName: string, forecastMs: number = 300000): TrendForecast | null {
    const series = this.metricSeries.get(metricName);
    if (!series || series.dataPoints.length < 5) {
      return null;
    }

    const values = series.dataPoints.map((dp) => dp.value);
    const times = series.dataPoints.map((dp) => dp.timestamp.getTime());

    // Simple linear regression
    const n = values.length;
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((total, xi, i) => total + xi * (values[i] ?? 0), 0);
    const sumX2 = times.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const currentValue = values[values.length - 1] ?? 0;
    const forecastTime = Date.now() + forecastMs;
    const forecastValue = slope * forecastTime + intercept;

    const changePercent =
      currentValue > 0 ? ((forecastValue - currentValue) / currentValue) * 100 : 0;

    return {
      metric: metricName,
      currentValue,
      forecastValue,
      forecastTime: new Date(forecastTime),
      direction: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'stable',
      confidence: Math.min(1, n / 50), // More data points = higher confidence
      changePercent,
    };
  }

  // ============================================================================
  // STREAMING
  // ============================================================================

  subscribe(id: string, callback: (data: unknown) => void): void {
    this.subscribers.set(id, callback);
    this.state.subscribers.add(id);
    this.state.metrics.streamingClients = this.subscribers.size;
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.state.subscribers.delete(id);
    this.state.metrics.streamingClients = this.subscribers.size;
  }

  private broadcastUpdate(): void {
    if (this.subscribers.size === 0) return;

    const snapshot = this.getSnapshot();

    for (const callback of this.subscribers.values()) {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('[MonitoringHub] Broadcast error:', error);
      }
    }
  }

  // ============================================================================
  // SNAPSHOTS & QUERIES
  // ============================================================================

  getSnapshot(): SystemSnapshot {
    return {
      timestamp: new Date(),
      components: Object.fromEntries(this.componentStatus) as Record<
        SystemComponent,
        ComponentStatus
      >,
      metrics: this.getRecentMetrics(60000), // Last minute
      alerts: Array.from(this.activeAlerts.values()),
      health: this.calculateHealth(),
    };
  }

  private calculateHealth(): OverallHealth {
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const status of this.componentStatus.values()) {
      switch (status.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
        case 'unknown':
          unhealthy++;
          break;
      }
    }

    const total = this.COMPONENTS.length;
    const score = Math.round((healthy * 100 + degraded * 50) / total);

    let overallStatus: OverallHealth['status'];
    if (score >= 90) overallStatus = 'excellent';
    else if (score >= 70) overallStatus = 'good';
    else if (score >= 50) overallStatus = 'fair';
    else if (score >= 30) overallStatus = 'poor';
    else overallStatus = 'critical';

    return {
      score,
      status: overallStatus,
      activeAlerts: this.activeAlerts.size,
      components: { healthy, degraded, unhealthy },
    };
  }

  getRecentMetrics(windowMs: number = 60000): Metric[] {
    const cutoff = Date.now() - windowMs;
    const metrics: Metric[] = [];

    for (const series of this.metricSeries.values()) {
      const recent = series.dataPoints.filter((dp) => dp.timestamp.getTime() > cutoff).slice(-1)[0];

      if (recent) {
        metrics.push({
          id: `${series.name}-${recent.timestamp.getTime()}`,
          name: series.name,
          component: series.component,
          type: 'gauge',
          value: recent.value,
          unit: 'value',
          timestamp: recent.timestamp,
          labels: recent.labels || {},
        });
      }
    }

    return metrics;
  }

  getMetricSeries(name: string): MetricSeries | undefined {
    return this.metricSeries.get(name);
  }

  getAllSeries(): MetricSeries[] {
    return Array.from(this.metricSeries.values());
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit: number = 50): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  getCorrelations(): MetricCorrelation[] {
    return Array.from(this.correlations.values());
  }

  getComponentStatus(component: SystemComponent): ComponentStatus | undefined {
    return this.componentStatus.get(component);
  }

  getAllComponentStatus(): Record<SystemComponent, ComponentStatus> {
    return Object.fromEntries(this.componentStatus) as Record<SystemComponent, ComponentStatus>;
  }

  // ============================================================================
  // ALERT RULE MANAGEMENT
  // ============================================================================

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.saveState();
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.saveState();
    return true;
  }

  deleteAlertRule(id: string): boolean {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.activeAlerts.delete(id);
      this.saveState();
    }
    return deleted;
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  enableAlertRule(id: string): boolean {
    const rule = this.alertRules.get(id);
    if (rule) {
      rule.enabled = true;
      this.saveState();
      return true;
    }
    return false;
  }

  disableAlertRule(id: string): boolean {
    const rule = this.alertRules.get(id);
    if (rule) {
      rule.enabled = false;
      this.saveState();
      return true;
    }
    return false;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private sanitizeAlert(alert: Alert): Partial<Alert> {
    return {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      status: alert.status,
      component: alert.component,
      metric: alert.metric,
      currentValue: alert.currentValue,
      thresholdValue: alert.thresholdValue,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async saveState(): Promise<void> {
    try {
      const data = {
        policy: this.policy,
        alertRules: Array.from(this.alertRules.entries()),
        alertHistory: this.alertHistory.slice(-100),
        correlations: Array.from(this.correlations.entries()),
        metrics: this.state.metrics,
        savedAt: new Date().toISOString(),
      };

      await fs.writeJson(this.stateFile, data, { spaces: 2 });
    } catch (error) {
      console.error('[MonitoringHub] Failed to save state:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        if (data.policy) {
          this.policy = { ...this.policy, ...data.policy };
        }

        if (data.alertRules) {
          this.alertRules = new Map(data.alertRules);
        }

        if (data.alertHistory) {
          this.alertHistory = data.alertHistory.map((a: Alert) => ({
            ...a,
            triggeredAt: new Date(a.triggeredAt),
            acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : undefined,
            resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : undefined,
          }));
        }

        if (data.correlations) {
          this.correlations = new Map(data.correlations);
        }

        if (data.metrics) {
          this.state.metrics = { ...this.state.metrics, ...data.metrics };
        }

        console.log(
          `[MonitoringHub] Loaded ${this.alertRules.size} alert rules, ${this.alertHistory.length} historical alerts`
        );
      }
    } catch (error) {
      console.error('[MonitoringHub] Failed to load state:', error);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getPolicy(): MonitoringPolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<MonitoringPolicy>): MonitoringPolicy {
    this.policy = { ...this.policy, ...updates };
    this.saveState();
    return this.policy;
  }

  getState(): MonitoringState {
    return { ...this.state };
  }

  getMetrics(): MonitoringMetrics {
    return { ...this.state.metrics };
  }
}

// Export singleton
export const monitoringHub = MonitoringHub.getInstance();
