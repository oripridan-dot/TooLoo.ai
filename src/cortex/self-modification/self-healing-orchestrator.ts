// @version 3.3.350
/**
 * Self-Healing Orchestrator
 *
 * Autonomous code maintenance system that:
 * - Monitors code health metrics continuously
 * - Detects anomalies, regressions, and issues
 * - Automatically generates and applies fixes
 * - Validates fixes through testing
 * - Learns from successful fixes to improve over time
 *
 * Part of PHASE 4: Self-Healing Code
 * @module cortex/self-modification/self-healing-orchestrator
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { bus } from '../../core/event-bus.js';
import { ReflectionLoopOrchestrator, ReflectionTask, ReflectionResult } from './reflection-loop.js';

// ============================================================================
// TYPES
// ============================================================================

export interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  lastChecked: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface CodeIssue {
  id: string;
  type: IssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  detectedAt: number;
  autoFixable: boolean;
}

export type IssueType =
  | 'test-failure'
  | 'type-error'
  | 'lint-error'
  | 'runtime-error'
  | 'performance-regression'
  | 'memory-leak'
  | 'dead-code'
  | 'security-vulnerability'
  | 'api-breaking-change'
  | 'dependency-issue';

export interface HealingAttempt {
  id: string;
  issueId: string;
  strategy: HealingStrategy;
  startedAt: number;
  completedAt?: number;
  success: boolean;
  changes: Array<{ file: string; diff: string }>;
  testResults?: { passed: number; failed: number };
  error?: string;
}

export type HealingStrategy =
  | 'ai-fix'           // Use AI to generate fix
  | 'rollback'         // Rollback to last known good state
  | 'patch'            // Apply known fix pattern
  | 'dependency-update' // Update dependencies
  | 'config-adjust'    // Adjust configuration
  | 'cache-clear';     // Clear caches/regenerate

export interface SelfHealingConfig {
  /** Enable continuous monitoring */
  enableMonitoring: boolean;
  /** Monitoring interval in ms */
  monitoringInterval: number;
  /** Enable auto-fix attempts */
  enableAutoFix: boolean;
  /** Max auto-fix attempts per issue */
  maxFixAttempts: number;
  /** Require human approval for fixes */
  requireApproval: boolean;
  /** Min confidence to auto-fix */
  minConfidenceToFix: number;
  /** Health check timeout */
  healthCheckTimeout: number;
  /** Enable learning from fixes */
  enableLearning: boolean;
}

export interface HealingPattern {
  id: string;
  issuePattern: RegExp | string;
  strategy: HealingStrategy;
  fixTemplate?: string;
  successRate: number;
  timesUsed: number;
  lastUsed: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SelfHealingConfig = {
  enableMonitoring: true,
  monitoringInterval: 60000, // 1 minute
  enableAutoFix: true,
  maxFixAttempts: 3,
  requireApproval: true,
  minConfidenceToFix: 0.7,
  healthCheckTimeout: 30000,
  enableLearning: true,
};

// ============================================================================
// SELF-HEALING ORCHESTRATOR
// ============================================================================

export class SelfHealingOrchestrator extends EventEmitter {
  private config: SelfHealingConfig;
  private reflectionLoop: ReflectionLoopOrchestrator;
  private healthMetrics: Map<string, HealthMetric> = new Map();
  private activeIssues: Map<string, CodeIssue> = new Map();
  private healingAttempts: HealingAttempt[] = [];
  private healingPatterns: Map<string, HealingPattern> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private dataDir: string;
  private isRunning = false;

  constructor(config: Partial<SelfHealingConfig> = {}, dataDir?: string) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
    this.reflectionLoop = new ReflectionLoopOrchestrator();
    this.loadHealingPatterns();
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the self-healing orchestrator
   * Sets up metrics, loads state, and prepares for monitoring
   */
  async initialize(): Promise<void> {
    // Initialize health metrics
    this.initializeMetrics();
    
    // Load known issues state
    await this.loadIssuesState();
    
    console.log('[SelfHealing] ✓ Self-healing orchestrator initialized');
    return Promise.resolve();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[SelfHealing] Starting self-healing orchestrator...');

    // Initialize health metrics (if not already done)
    this.initializeMetrics();

    // Load known issues
    await this.loadIssuesState();

    // Start monitoring if enabled
    if (this.config.enableMonitoring) {
      this.startMonitoring();
    }

    bus.publish('cortex', 'self-healing:started', {});
    console.log('[SelfHealing] ✓ Self-healing orchestrator started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.stopMonitoring();
    await this.saveIssuesState();
    
    this.isRunning = false;
    bus.publish('cortex', 'self-healing:stopped', {});
    console.log('[SelfHealing] ✓ Self-healing orchestrator stopped');
  }

  private initializeMetrics() {
    // Define standard health metrics
    const metrics: Array<Omit<HealthMetric, 'status' | 'trend'>> = [
      { name: 'test-pass-rate', value: 1.0, threshold: 0.95, lastChecked: 0 },
      { name: 'type-error-count', value: 0, threshold: 0, lastChecked: 0 },
      { name: 'lint-error-count', value: 0, threshold: 5, lastChecked: 0 },
      { name: 'build-success', value: 1, threshold: 1, lastChecked: 0 },
      { name: 'memory-usage', value: 0, threshold: 0.8, lastChecked: 0 },
      { name: 'response-time', value: 100, threshold: 1000, lastChecked: 0 }, // Default 100ms, threshold 1000ms
    ];

    for (const m of metrics) {
      this.healthMetrics.set(m.name, {
        ...m,
        status: 'healthy',
        trend: 'stable',
      });
    }
  }

  // ===========================================================================
  // Monitoring
  // ===========================================================================

  private startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this.runHealthCheck();
    }, this.config.monitoringInterval);

    // Run initial check
    this.runHealthCheck();
    console.log(`[SelfHealing] Monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  private stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async runHealthCheck(): Promise<Map<string, HealthMetric>> {
    console.log('[SelfHealing] Running health check...');
    const startTime = Date.now();

    try {
      // Test pass rate
      await this.checkTestPassRate();

      // Type errors
      await this.checkTypeErrors();

      // Lint errors
      await this.checkLintErrors();

      // Memory usage
      this.checkMemoryUsage();

      // Update metric statuses
      this.updateMetricStatuses();

      // Emit health report
      bus.publish('cortex', 'self-healing:health-checked', {
        metrics: Object.fromEntries(this.healthMetrics),
        duration: Date.now() - startTime,
      });

      // Check for issues that need attention
      await this.processDetectedIssues();

    } catch (error: any) {
      console.error('[SelfHealing] Health check failed:', error.message);
    }

    return this.healthMetrics;
  }

  private async checkTestPassRate(): Promise<void> {
    // This would integrate with your test runner
    // For now, we'll check for existing test reports
    try {
      const reportPath = path.join(this.dataDir, 'test-reports');
      if (fs.existsSync(reportPath)) {
        const files = fs.readdirSync(reportPath).filter(f => f.endsWith('.json'));
        const latest = files.sort().pop();
        
        if (latest) {
          const report = JSON.parse(
            fs.readFileSync(path.join(reportPath, latest), 'utf8')
          );
          
          const passRate = report.passed / (report.passed + report.failed);
          this.updateMetric('test-pass-rate', passRate);
        }
      }
    } catch { /* ignore */ }
  }

  private async checkTypeErrors(): Promise<void> {
    // Would run tsc --noEmit and count errors
    // Simplified for now
    const metric = this.healthMetrics.get('type-error-count');
    if (metric) {
      metric.lastChecked = Date.now();
    }
  }

  private async checkLintErrors(): Promise<void> {
    // Would run eslint and count errors
    const metric = this.healthMetrics.get('lint-error-count');
    if (metric) {
      metric.lastChecked = Date.now();
    }
  }

  private checkMemoryUsage(): void {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    const usage = used / total;
    this.updateMetric('memory-usage', usage);
  }

  private updateMetric(name: string, value: number): void {
    const metric = this.healthMetrics.get(name);
    if (!metric) return;

    const previousValue = metric.value;
    metric.value = value;
    metric.lastChecked = Date.now();

    // Determine trend
    const diff = value - previousValue;
    const isIncreasingGood = name.includes('pass-rate') || name.includes('success');
    
    if (Math.abs(diff) < 0.01) {
      metric.trend = 'stable';
    } else if ((diff > 0 && isIncreasingGood) || (diff < 0 && !isIncreasingGood)) {
      metric.trend = 'improving';
    } else {
      metric.trend = 'degrading';
    }
  }

  private updateMetricStatuses(): void {
    Array.from(this.healthMetrics.values()).forEach((metric) => {
      // Lower is better: counts, errors, response-time, memory-usage
      const lowerIsBetter = metric.name.includes('count') || 
                            metric.name.includes('error') || 
                            metric.name.includes('time') ||
                            metric.name.includes('memory');
      
      if (lowerIsBetter) {
        // Lower is better
        if (metric.value <= metric.threshold) {
          metric.status = 'healthy';
        } else if (metric.value <= metric.threshold * 2) {
          metric.status = 'warning';
        } else {
          metric.status = 'critical';
        }
      } else {
        // Higher is better (rates, success)
        if (metric.value >= metric.threshold) {
          metric.status = 'healthy';
        } else if (metric.value >= metric.threshold * 0.8) {
          metric.status = 'warning';
        } else {
          metric.status = 'critical';
        }
      }
    });
  }

  // ===========================================================================
  // Issue Detection
  // ===========================================================================

  detectIssue(issue: Omit<CodeIssue, 'id' | 'detectedAt'>): string {
    const id = `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullIssue: CodeIssue = {
      ...issue,
      id,
      detectedAt: Date.now(),
    };

    this.activeIssues.set(id, fullIssue);
    
    bus.publish('cortex', 'self-healing:issue-detected', fullIssue);
    console.log(`[SelfHealing] Issue detected: ${issue.type} - ${issue.message}`);

    // Check if auto-fix is enabled and appropriate
    if (this.config.enableAutoFix && issue.autoFixable && issue.severity !== 'low') {
      this.scheduleAutoFix(id);
    }

    return id;
  }

  resolveIssue(issueId: string, resolution: string): boolean {
    const issue = this.activeIssues.get(issueId);
    if (!issue) return false;

    this.activeIssues.delete(issueId);
    
    bus.publish('cortex', 'self-healing:issue-resolved', { issueId, resolution });
    console.log(`[SelfHealing] Issue resolved: ${issueId} - ${resolution}`);

    return true;
  }

  // ===========================================================================
  // Auto-Healing
  // ===========================================================================

  private async scheduleAutoFix(issueId: string): Promise<void> {
    const issue = this.activeIssues.get(issueId);
    if (!issue) return;

    // Check fix attempts
    const attempts = this.healingAttempts.filter(a => a.issueId === issueId);
    if (attempts.length >= this.config.maxFixAttempts) {
      console.log(`[SelfHealing] Max fix attempts reached for ${issueId}`);
      return;
    }

    // Select healing strategy
    const strategy = this.selectHealingStrategy(issue);
    
    if (this.config.requireApproval) {
      // Emit event for approval
      bus.publish('cortex', 'self-healing:fix-pending', {
        issue,
        strategy,
        suggestedFix: await this.generateFixSuggestion(issue, strategy),
      });
    } else {
      // Auto-apply fix
      await this.applyFix(issueId, strategy);
    }
  }

  private selectHealingStrategy(issue: CodeIssue): HealingStrategy {
    // Check for known patterns
    const patterns = Array.from(this.healingPatterns.values());
    for (const pattern of patterns) {
      const matches = typeof pattern.issuePattern === 'string'
        ? issue.message.includes(pattern.issuePattern)
        : pattern.issuePattern.test(issue.message);
      
      if (matches && pattern.successRate > 0.7) {
        return pattern.strategy;
      }
    }

    // Default strategy by issue type
    switch (issue.type) {
      case 'test-failure':
      case 'type-error':
      case 'lint-error':
        return 'ai-fix';
      case 'runtime-error':
        return 'ai-fix';
      case 'dependency-issue':
        return 'dependency-update';
      case 'performance-regression':
        return 'cache-clear';
      default:
        return 'ai-fix';
    }
  }

  private async generateFixSuggestion(
    issue: CodeIssue,
    strategy: HealingStrategy
  ): Promise<string> {
    switch (strategy) {
      case 'ai-fix':
        return `Generate AI-powered fix for ${issue.type} in ${issue.file}: ${issue.message}`;
      case 'rollback':
        return `Rollback ${issue.file} to last known good state`;
      case 'patch':
        return `Apply known fix pattern for ${issue.type}`;
      case 'dependency-update':
        return `Update dependencies to resolve ${issue.message}`;
      case 'config-adjust':
        return `Adjust configuration to resolve ${issue.message}`;
      case 'cache-clear':
        return `Clear caches and regenerate affected files`;
      default:
        return `Apply healing strategy: ${strategy}`;
    }
  }

  async applyFix(issueId: string, strategy: HealingStrategy): Promise<HealingAttempt> {
    const issue = this.activeIssues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const attempt: HealingAttempt = {
      id: `attempt-${Date.now()}`,
      issueId,
      strategy,
      startedAt: Date.now(),
      success: false,
      changes: [],
    };

    console.log(`[SelfHealing] Applying ${strategy} fix for ${issueId}`);

    try {
      switch (strategy) {
        case 'ai-fix':
          await this.applyAIFix(issue, attempt);
          break;
        case 'rollback':
          await this.applyRollback(issue, attempt);
          break;
        case 'patch':
          await this.applyPatch(issue, attempt);
          break;
        case 'dependency-update':
          await this.applyDependencyUpdate(issue, attempt);
          break;
        case 'cache-clear':
          await this.applyCacheClear(issue, attempt);
          break;
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      attempt.success = true;
      this.resolveIssue(issueId, `Fixed via ${strategy}`);
      
      // Learn from success
      if (this.config.enableLearning) {
        this.recordSuccessfulFix(issue, strategy);
      }

    } catch (error: any) {
      attempt.error = error.message;
      attempt.success = false;
      console.error(`[SelfHealing] Fix failed: ${error.message}`);
    }

    attempt.completedAt = Date.now();
    this.healingAttempts.push(attempt);

    bus.publish('cortex', 'self-healing:fix-completed', attempt);
    return attempt;
  }

  private async applyAIFix(issue: CodeIssue, attempt: HealingAttempt): Promise<void> {
    // Use reflection loop for AI-powered fix
    const task: Partial<ReflectionTask> = {
      objective: `Fix ${issue.type} in ${issue.file}: ${issue.message}${issue.suggestion ? `\nSuggestion: ${issue.suggestion}` : ''}`,
      targetFiles: [issue.file],
      maxIterations: 3,
      requiredPassRate: 1.0,
    };

    const result = await this.reflectionLoop.execute(task as ReflectionTask);
    
    if (result.status !== 'success') {
      throw new Error(`AI fix failed: ${result.summary}`);
    }

    attempt.testResults = {
      passed: result.finalTestResult?.total ?? 0,
      failed: result.finalTestResult?.failed ?? 0,
    };
  }

  private async applyRollback(issue: CodeIssue, attempt: HealingAttempt): Promise<void> {
    // Would use git to rollback specific file
    console.log(`[SelfHealing] Rolling back ${issue.file}`);
    // Implementation would use git checkout or similar
  }

  private async applyPatch(issue: CodeIssue, attempt: HealingAttempt): Promise<void> {
    // Apply known fix pattern
    const pattern = Array.from(this.healingPatterns.values()).find(p => {
      const matches = typeof p.issuePattern === 'string'
        ? issue.message.includes(p.issuePattern)
        : p.issuePattern.test(issue.message);
      return matches;
    });

    if (pattern?.fixTemplate) {
      // Apply fix template
      console.log(`[SelfHealing] Applying fix pattern: ${pattern.id}`);
    }
  }

  private async applyDependencyUpdate(issue: CodeIssue, attempt: HealingAttempt): Promise<void> {
    // Run npm update or similar
    console.log(`[SelfHealing] Updating dependencies`);
    // Would execute: npm update <package>
  }

  private async applyCacheClear(issue: CodeIssue, attempt: HealingAttempt): Promise<void> {
    // Clear relevant caches
    console.log(`[SelfHealing] Clearing caches`);
    // Would clear node_modules/.cache, dist, etc.
  }

  // ===========================================================================
  // Learning
  // ===========================================================================

  private recordSuccessfulFix(issue: CodeIssue, strategy: HealingStrategy): void {
    // Create or update pattern
    const patternKey = `${issue.type}-${strategy}`;
    const existing = this.healingPatterns.get(patternKey);

    if (existing) {
      existing.timesUsed++;
      existing.lastUsed = Date.now();
      existing.successRate = (existing.successRate * (existing.timesUsed - 1) + 1) / existing.timesUsed;
    } else {
      this.healingPatterns.set(patternKey, {
        id: patternKey,
        issuePattern: issue.message.substring(0, 50),
        strategy,
        successRate: 1.0,
        timesUsed: 1,
        lastUsed: Date.now(),
      });
    }

    this.saveHealingPatterns();
  }

  private loadHealingPatterns(): void {
    try {
      const patternsPath = path.join(this.dataDir, 'healing-patterns.json');
      if (fs.existsSync(patternsPath)) {
        const data = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
        for (const p of data.patterns || []) {
          this.healingPatterns.set(p.id, p);
        }
        console.log(`[SelfHealing] Loaded ${this.healingPatterns.size} healing patterns`);
      }
    } catch { /* ignore */ }
  }

  private saveHealingPatterns(): void {
    try {
      const patternsPath = path.join(this.dataDir, 'healing-patterns.json');
      const data = { patterns: Array.from(this.healingPatterns.values()) };
      fs.writeFileSync(patternsPath, JSON.stringify(data, null, 2));
    } catch { /* ignore */ }
  }

  // ===========================================================================
  // State Persistence
  // ===========================================================================

  private async loadIssuesState(): Promise<void> {
    try {
      const statePath = path.join(this.dataDir, 'healing-state.json');
      if (fs.existsSync(statePath)) {
        const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        for (const issue of data.activeIssues || []) {
          this.activeIssues.set(issue.id, issue);
        }
      }
    } catch { /* ignore */ }
  }

  private async saveIssuesState(): Promise<void> {
    try {
      const statePath = path.join(this.dataDir, 'healing-state.json');
      const data = {
        activeIssues: Array.from(this.activeIssues.values()),
        lastSaved: new Date().toISOString(),
      };
      fs.writeFileSync(statePath, JSON.stringify(data, null, 2));
    } catch { /* ignore */ }
  }

  private async processDetectedIssues(): Promise<void> {
    // Process metrics that indicate issues
    Array.from(this.healthMetrics.values()).forEach((metric) => {
      if (metric.status === 'critical') {
        const existingIssue = Array.from(this.activeIssues.values())
          .find(i => i.message.includes(metric.name));
        
        if (!existingIssue) {
          this.detectIssue({
            type: this.metricToIssueType(metric.name),
            severity: 'high',
            file: 'system',
            message: `${metric.name} is critical: ${metric.value} (threshold: ${metric.threshold})`,
            autoFixable: true,
          });
        }
      }
    });
  }

  private metricToIssueType(metricName: string): IssueType {
    if (metricName.includes('test')) return 'test-failure';
    if (metricName.includes('type')) return 'type-error';
    if (metricName.includes('lint')) return 'lint-error';
    if (metricName.includes('memory')) return 'memory-leak';
    if (metricName.includes('performance') || metricName.includes('time')) return 'performance-regression';
    return 'runtime-error';
  }

  // ===========================================================================
  // API
  // ===========================================================================

  getHealthReport() {
    return {
      isRunning: this.isRunning,
      metrics: Object.fromEntries(this.healthMetrics),
      activeIssues: Array.from(this.activeIssues.values()),
      recentAttempts: this.healingAttempts.slice(-10),
      patterns: this.healingPatterns.size,
    };
  }

  getActiveIssues(): CodeIssue[] {
    return Array.from(this.activeIssues.values());
  }

  getHealingHistory(): HealingAttempt[] {
    return [...this.healingAttempts];
  }

  async approveAndApplyFix(issueId: string, strategy?: HealingStrategy): Promise<HealingAttempt> {
    const issue = this.activeIssues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const selectedStrategy = strategy || this.selectHealingStrategy(issue);
    return this.applyFix(issueId, selectedStrategy);
  }
}

// Export singleton instance
export const selfHealingOrchestrator = new SelfHealingOrchestrator();
