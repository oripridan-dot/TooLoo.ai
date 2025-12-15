/**
 * @file SelfHealingService - Autonomous Issue Detection and Recovery
 * @description Phase 9: Self-healing capabilities for Skills OS
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * This service provides:
 * - Health monitoring for all system components
 * - Automatic issue detection via pattern analysis
 * - Self-healing actions (restart, rollback, reconfigure)
 * - Escalation to human operators for critical issues
 * - Healing history and learning from past incidents
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

/** Severity levels for detected issues */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Current status of a monitored component */
export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Actions the self-healer can take */
export type HealingAction =
  | 'restart'
  | 'rollback'
  | 'reconfigure'
  | 'scale'
  | 'isolate'
  | 'notify'
  | 'escalate';

/** A detected system issue */
export interface DetectedIssue {
  id: string;
  component: string;
  type: string;
  severity: IssueSeverity;
  description: string;
  symptoms: string[];
  detectedAt: number;
  metrics?: Record<string, number>;
  suggestedActions: HealingAction[];
}

/** A healing attempt record */
export interface HealingAttempt {
  id: string;
  issueId: string;
  action: HealingAction;
  startedAt: number;
  completedAt?: number;
  success: boolean;
  error?: string;
  rollbackAvailable: boolean;
}

/** Component health check result */
export interface HealthCheckResult {
  component: string;
  status: ComponentStatus;
  latency: number;
  lastCheck: number;
  details?: Record<string, unknown>;
  issues?: string[];
}

/** Healing rule - defines automatic responses to issues */
export interface HealingRule {
  id: string;
  name: string;
  condition: IssueCondition;
  actions: HealingAction[];
  cooldownMs: number;
  maxAttempts: number;
  autoApprove: boolean;
  enabled: boolean;
}

/** Condition for matching issues */
export interface IssueCondition {
  component?: string | RegExp;
  type?: string | RegExp;
  severity?: IssueSeverity | IssueSeverity[];
  minSymptoms?: number;
}

/** Configuration for the self-healing service */
export interface SelfHealingConfig {
  /** Path to persist healing state */
  persistPath?: string;
  /** How often to run health checks (ms) */
  healthCheckIntervalMs: number;
  /** How long to wait before declaring a component unhealthy */
  unhealthyThresholdMs: number;
  /** Maximum healing attempts per issue before escalating */
  maxHealingAttempts: number;
  /** Cooldown between healing attempts (ms) */
  healingCooldownMs: number;
  /** Auto-approve healing actions for low/medium severity */
  autoApproveNonCritical: boolean;
  /** Enable metrics collection */
  enableMetrics: boolean;
}

/** Internal config with required fields */
interface InternalConfig {
  persistPath: string;
  healthCheckIntervalMs: number;
  unhealthyThresholdMs: number;
  maxHealingAttempts: number;
  healingCooldownMs: number;
  autoApproveNonCritical: boolean;
  enableMetrics: boolean;
}

/** Metrics for the healing service */
export interface HealingMetrics {
  totalIssuesDetected: number;
  totalHealingAttempts: number;
  successfulHealings: number;
  failedHealings: number;
  escalations: number;
  averageHealingTime: number;
  issuesByComponent: Record<string, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
}

// =============================================================================
// SELF-HEALING SERVICE
// =============================================================================

export class SelfHealingService extends EventEmitter {
  private config: InternalConfig;
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private componentStatus: Map<string, HealthCheckResult> = new Map();
  private activeIssues: Map<string, DetectedIssue> = new Map();
  private healingAttempts: HealingAttempt[] = [];
  private healingRules: Map<string, HealingRule> = new Map();
  private healingCooldowns: Map<string, number> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // Metrics
  private metrics: HealingMetrics = {
    totalIssuesDetected: 0,
    totalHealingAttempts: 0,
    successfulHealings: 0,
    failedHealings: 0,
    escalations: 0,
    averageHealingTime: 0,
    issuesByComponent: {},
    issuesBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
  };

  constructor(config: SelfHealingConfig) {
    super();
    this.config = {
      persistPath: config.persistPath ?? './data/self-healing.json',
      healthCheckIntervalMs: config.healthCheckIntervalMs,
      unhealthyThresholdMs: config.unhealthyThresholdMs,
      maxHealingAttempts: config.maxHealingAttempts,
      healingCooldownMs: config.healingCooldownMs,
      autoApproveNonCritical: config.autoApproveNonCritical,
      enableMetrics: config.enableMetrics,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SelfHealing] 🏥 Initializing self-healing service...');

    // Load persisted state
    await this.loadState();

    // Register default healing rules
    this.registerDefaultRules();

    // Start health check loop
    this.startHealthChecks();

    this.initialized = true;
    this.emit('initialized');
    console.log('[SelfHealing] ✅ Self-healing service ready');
  }

  async shutdown(): Promise<void> {
    console.log('[SelfHealing] 🛑 Shutting down self-healing service...');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Persist state
    await this.saveState();

    this.initialized = false;
    this.emit('shutdown');
    console.log('[SelfHealing] ✅ Self-healing service shutdown complete');
  }

  isHealthy(): boolean {
    return this.initialized;
  }

  // ---------------------------------------------------------------------------
  // Health Check Management
  // ---------------------------------------------------------------------------

  /**
   * Register a health check for a component
   */
  registerHealthCheck(
    component: string,
    check: () => Promise<HealthCheckResult>
  ): void {
    this.healthChecks.set(component, check);
    console.log(`[SelfHealing] 📋 Registered health check: ${component}`);
  }

  /**
   * Unregister a health check
   */
  unregisterHealthCheck(component: string): void {
    this.healthChecks.delete(component);
    this.componentStatus.delete(component);
  }

  /**
   * Run health check for a specific component
   */
  async checkComponent(component: string): Promise<HealthCheckResult> {
    const check = this.healthChecks.get(component);
    if (!check) {
      return {
        component,
        status: 'unknown',
        latency: 0,
        lastCheck: Date.now(),
        issues: ['No health check registered'],
      };
    }

    const start = Date.now();
    try {
      const result = await check();
      result.latency = Date.now() - start;
      result.lastCheck = Date.now();
      this.componentStatus.set(component, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        component,
        status: 'unhealthy',
        latency: Date.now() - start,
        lastCheck: Date.now(),
        issues: [error instanceof Error ? error.message : 'Health check failed'],
      };
      this.componentStatus.set(component, result);
      return result;
    }
  }

  /**
   * Run all health checks
   */
  async checkAllComponents(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    
    const checks = Array.from(this.healthChecks.keys()).map(async (component) => {
      const result = await this.checkComponent(component);
      results.set(component, result);
      return result;
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * Get current status of all components
   */
  getComponentStatus(): Map<string, HealthCheckResult> {
    return new Map(this.componentStatus);
  }

  // ---------------------------------------------------------------------------
  // Issue Detection
  // ---------------------------------------------------------------------------

  /**
   * Start the health check loop
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthCheckCycle();
    }, this.config.healthCheckIntervalMs);

    // Run immediately
    this.runHealthCheckCycle();
  }

  /**
   * Run a full health check cycle
   */
  private async runHealthCheckCycle(): Promise<void> {
    const results = await this.checkAllComponents();

    for (const [component, result] of results) {
      if (result.status === 'unhealthy' || result.status === 'degraded') {
        await this.detectIssues(result);
      } else {
        // Clear any resolved issues for this component
        this.clearResolvedIssues(component);
      }
    }
  }

  /**
   * Detect issues from a health check result
   */
  private async detectIssues(result: HealthCheckResult): Promise<void> {
    // Check if we already have an active issue for this component
    const existingIssue = this.findActiveIssue(result.component);
    if (existingIssue) {
      // Update existing issue
      existingIssue.symptoms = result.issues ?? [];
      return;
    }

    // Create new issue
    const issue: DetectedIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      component: result.component,
      type: result.status === 'unhealthy' ? 'failure' : 'degradation',
      severity: result.status === 'unhealthy' ? 'high' : 'medium',
      description: `Component ${result.component} is ${result.status}`,
      symptoms: result.issues ?? [],
      detectedAt: Date.now(),
      metrics: result.details as Record<string, number> | undefined,
      suggestedActions: this.suggestActions(result),
    };

    this.activeIssues.set(issue.id, issue);
    this.metrics.totalIssuesDetected++;
    this.metrics.issuesByComponent[issue.component] =
      (this.metrics.issuesByComponent[issue.component] ?? 0) + 1;
    this.metrics.issuesBySeverity[issue.severity]++;

    this.emit('issue:detected', issue);
    console.log(`[SelfHealing] ⚠️ Issue detected: ${issue.description}`);

    // Try to auto-heal
    await this.tryAutoHeal(issue);
  }

  /**
   * Find an active issue for a component
   */
  private findActiveIssue(component: string): DetectedIssue | undefined {
    for (const issue of this.activeIssues.values()) {
      if (issue.component === component) {
        return issue;
      }
    }
    return undefined;
  }

  /**
   * Clear resolved issues for a component
   */
  private clearResolvedIssues(component: string): void {
    for (const [id, issue] of this.activeIssues) {
      if (issue.component === component) {
        this.activeIssues.delete(id);
        this.emit('issue:resolved', issue);
        console.log(`[SelfHealing] ✅ Issue resolved: ${issue.description}`);
      }
    }
  }

  /**
   * Suggest healing actions based on health check result
   */
  private suggestActions(result: HealthCheckResult): HealingAction[] {
    const actions: HealingAction[] = [];

    if (result.status === 'unhealthy') {
      actions.push('restart');
      if (result.latency > this.config.unhealthyThresholdMs) {
        actions.push('scale');
      }
    }

    if (result.status === 'degraded') {
      actions.push('reconfigure');
    }

    // Always suggest notify for tracking
    actions.push('notify');

    return actions;
  }

  // ---------------------------------------------------------------------------
  // Healing Actions
  // ---------------------------------------------------------------------------

  /**
   * Register a healing rule
   */
  registerHealingRule(rule: HealingRule): void {
    this.healingRules.set(rule.id, rule);
    console.log(`[SelfHealing] 📋 Registered healing rule: ${rule.name}`);
  }

  /**
   * Try to auto-heal an issue
   */
  private async tryAutoHeal(issue: DetectedIssue): Promise<boolean> {
    // Find matching rules
    const matchingRules = this.findMatchingRules(issue);

    for (const rule of matchingRules) {
      if (!rule.autoApprove && !this.canAutoApprove(issue)) {
        // Escalate to human
        this.escalate(issue);
        return false;
      }

      // Check cooldown
      if (this.isInCooldown(issue, rule)) {
        continue;
      }

      // Execute healing actions
      for (const action of rule.actions) {
        const success = await this.executeHealingAction(issue, action);
        if (success) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find rules matching an issue
   */
  private findMatchingRules(issue: DetectedIssue): HealingRule[] {
    const matching: HealingRule[] = [];

    for (const rule of this.healingRules.values()) {
      if (!rule.enabled) continue;
      if (this.matchesCondition(issue, rule.condition)) {
        matching.push(rule);
      }
    }

    return matching;
  }

  /**
   * Check if an issue matches a condition
   */
  private matchesCondition(issue: DetectedIssue, condition: IssueCondition): boolean {
    if (condition.component) {
      if (condition.component instanceof RegExp) {
        if (!condition.component.test(issue.component)) return false;
      } else if (issue.component !== condition.component) {
        return false;
      }
    }

    if (condition.type) {
      if (condition.type instanceof RegExp) {
        if (!condition.type.test(issue.type)) return false;
      } else if (issue.type !== condition.type) {
        return false;
      }
    }

    if (condition.severity) {
      const severities = Array.isArray(condition.severity)
        ? condition.severity
        : [condition.severity];
      if (!severities.includes(issue.severity)) return false;
    }

    if (condition.minSymptoms && issue.symptoms.length < condition.minSymptoms) {
      return false;
    }

    return true;
  }

  /**
   * Check if auto-approval is allowed
   */
  private canAutoApprove(issue: DetectedIssue): boolean {
    if (!this.config.autoApproveNonCritical) return false;
    return issue.severity === 'low' || issue.severity === 'medium';
  }

  /**
   * Check if a healing action is in cooldown
   */
  private isInCooldown(issue: DetectedIssue, rule: HealingRule): boolean {
    const key = `${issue.component}:${rule.id}`;
    const lastAttempt = this.healingCooldowns.get(key);
    if (!lastAttempt) return false;
    return Date.now() - lastAttempt < rule.cooldownMs;
  }

  /**
   * Execute a healing action
   */
  async executeHealingAction(
    issue: DetectedIssue,
    action: HealingAction
  ): Promise<boolean> {
    const attempt: HealingAttempt = {
      id: `heal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      issueId: issue.id,
      action,
      startedAt: Date.now(),
      success: false,
      rollbackAvailable: false,
    };

    this.metrics.totalHealingAttempts++;
    this.emit('healing:started', { issue, action });
    console.log(`[SelfHealing] 🔧 Executing healing action: ${action} for ${issue.component}`);

    try {
      switch (action) {
        case 'restart':
          await this.performRestart(issue.component);
          break;
        case 'rollback':
          await this.performRollback(issue.component);
          attempt.rollbackAvailable = true;
          break;
        case 'reconfigure':
          await this.performReconfigure(issue.component);
          break;
        case 'scale':
          await this.performScale(issue.component);
          break;
        case 'isolate':
          await this.performIsolate(issue.component);
          break;
        case 'notify':
          await this.performNotify(issue);
          break;
        case 'escalate':
          this.escalate(issue);
          break;
      }

      attempt.success = true;
      attempt.completedAt = Date.now();
      this.metrics.successfulHealings++;
      this.updateAverageHealingTime(attempt.completedAt - attempt.startedAt);

      // Set cooldown
      const cooldownKey = `${issue.component}:${action}`;
      this.healingCooldowns.set(cooldownKey, Date.now());

      this.emit('healing:completed', { issue, action, success: true });
      console.log(`[SelfHealing] ✅ Healing action successful: ${action}`);

      return true;
    } catch (error) {
      attempt.success = false;
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      attempt.completedAt = Date.now();
      this.metrics.failedHealings++;

      this.emit('healing:failed', { issue, action, error });
      console.error(`[SelfHealing] ❌ Healing action failed: ${action}`, error);

      return false;
    } finally {
      this.healingAttempts.push(attempt);
    }
  }

  // ---------------------------------------------------------------------------
  // Healing Action Implementations (Override in subclass or provide handlers)
  // ---------------------------------------------------------------------------

  /** Handlers for healing actions - set these to customize behavior */
  public handlers: {
    restart?: (component: string) => Promise<void>;
    rollback?: (component: string) => Promise<void>;
    reconfigure?: (component: string) => Promise<void>;
    scale?: (component: string) => Promise<void>;
    isolate?: (component: string) => Promise<void>;
    notify?: (issue: DetectedIssue) => Promise<void>;
  } = {};

  private async performRestart(component: string): Promise<void> {
    if (this.handlers.restart) {
      await this.handlers.restart(component);
    } else {
      // Default: emit event for external handling
      this.emit('action:restart', { component });
    }
  }

  private async performRollback(component: string): Promise<void> {
    if (this.handlers.rollback) {
      await this.handlers.rollback(component);
    } else {
      this.emit('action:rollback', { component });
    }
  }

  private async performReconfigure(component: string): Promise<void> {
    if (this.handlers.reconfigure) {
      await this.handlers.reconfigure(component);
    } else {
      this.emit('action:reconfigure', { component });
    }
  }

  private async performScale(component: string): Promise<void> {
    if (this.handlers.scale) {
      await this.handlers.scale(component);
    } else {
      this.emit('action:scale', { component });
    }
  }

  private async performIsolate(component: string): Promise<void> {
    if (this.handlers.isolate) {
      await this.handlers.isolate(component);
    } else {
      this.emit('action:isolate', { component });
    }
  }

  private async performNotify(issue: DetectedIssue): Promise<void> {
    if (this.handlers.notify) {
      await this.handlers.notify(issue);
    } else {
      this.emit('action:notify', { issue });
    }
  }

  /**
   * Escalate an issue to human operators
   */
  escalate(issue: DetectedIssue): void {
    this.metrics.escalations++;
    this.emit('issue:escalated', issue);
    console.log(`[SelfHealing] 🚨 Issue escalated: ${issue.description}`);
  }

  // ---------------------------------------------------------------------------
  // Default Rules
  // ---------------------------------------------------------------------------

  private registerDefaultRules(): void {
    // Rule 1: Restart on service failure
    this.registerHealingRule({
      id: 'restart-on-failure',
      name: 'Restart on Service Failure',
      condition: {
        type: 'failure',
        severity: ['high', 'critical'],
      },
      actions: ['restart', 'notify'],
      cooldownMs: 60000, // 1 minute
      maxAttempts: 3,
      autoApprove: false,
      enabled: true,
    });

    // Rule 2: Reconfigure on degradation
    this.registerHealingRule({
      id: 'reconfigure-on-degradation',
      name: 'Reconfigure on Degradation',
      condition: {
        type: 'degradation',
        severity: ['low', 'medium'],
      },
      actions: ['reconfigure', 'notify'],
      cooldownMs: 300000, // 5 minutes
      maxAttempts: 2,
      autoApprove: true,
      enabled: true,
    });

    // Rule 3: Escalate critical issues
    this.registerHealingRule({
      id: 'escalate-critical',
      name: 'Escalate Critical Issues',
      condition: {
        severity: 'critical',
      },
      actions: ['notify', 'escalate'],
      cooldownMs: 0,
      maxAttempts: 1,
      autoApprove: true,
      enabled: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Metrics & State
  // ---------------------------------------------------------------------------

  private updateAverageHealingTime(duration: number): void {
    const totalAttempts = this.metrics.successfulHealings;
    const currentAvg = this.metrics.averageHealingTime;
    this.metrics.averageHealingTime =
      (currentAvg * (totalAttempts - 1) + duration) / totalAttempts;
  }

  getMetrics(): HealingMetrics {
    return { ...this.metrics };
  }

  getActiveIssues(): DetectedIssue[] {
    return Array.from(this.activeIssues.values());
  }

  getHealingHistory(limit = 100): HealingAttempt[] {
    return this.healingAttempts.slice(-limit);
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    // In production, load from persistPath
    // For now, start fresh
  }

  private async saveState(): Promise<void> {
    // In production, save to persistPath
    // For now, skip
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: SelfHealingService | null = null;

export function getSelfHealingService(config?: SelfHealingConfig): SelfHealingService {
  if (!instance) {
    instance = new SelfHealingService(config ?? {
      healthCheckIntervalMs: 30000,
      unhealthyThresholdMs: 5000,
      maxHealingAttempts: 3,
      healingCooldownMs: 60000,
      autoApproveNonCritical: true,
      enableMetrics: true,
    });
  }
  return instance;
}

export function resetSelfHealingService(): void {
  instance = null;
}

export default SelfHealingService;
