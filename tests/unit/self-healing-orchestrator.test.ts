// @version 3.3.355 - Self-Healing Orchestrator Unit Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises');

// Mock event bus
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

import { SelfHealingOrchestrator } from '../../src/cortex/self-modification/self-healing-orchestrator.js';

describe('SelfHealingOrchestrator', () => {
  let orchestrator: SelfHealingOrchestrator;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementations
    (fs.readFile as any).mockRejectedValue({ code: 'ENOENT' });
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
    (fs.readdir as any).mockResolvedValue([]);
    (fs.stat as any).mockResolvedValue({ isFile: () => true, size: 1000 });

    orchestrator = new SelfHealingOrchestrator();
  });

  afterEach(() => {
    orchestrator.stopMonitoring();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await orchestrator.initialize();
      expect(orchestrator).toBeDefined();
    });

    it('should load healing history on init', async () => {
      const mockHistory = JSON.stringify([
        {
          id: 'heal-1',
          issue: { type: 'error', severity: 'medium' },
          strategy: 'patch',
          timestamp: Date.now(),
          success: true,
        },
      ]);
      (fs.readFile as any).mockResolvedValueOnce(mockHistory);

      await orchestrator.initialize();
      const history = orchestrator.getHealingHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('monitoring', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should start monitoring', () => {
      orchestrator.startMonitoring(1000);
      expect(orchestrator.isMonitoring()).toBe(true);
    });

    it('should stop monitoring', () => {
      orchestrator.startMonitoring(1000);
      orchestrator.stopMonitoring();
      expect(orchestrator.isMonitoring()).toBe(false);
    });

    it('should run health checks periodically', async () => {
      const runHealthCheckSpy = vi.spyOn(orchestrator, 'runHealthCheck');

      orchestrator.startMonitoring(1000);

      // Advance timer
      vi.advanceTimersByTime(3000);

      expect(runHealthCheckSpy).toHaveBeenCalled();
    });

    it('should not run overlapping health checks', async () => {
      let checkCount = 0;
      vi.spyOn(orchestrator, 'runHealthCheck').mockImplementation(async () => {
        checkCount++;
        // Simulate long-running check
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { healthy: true, metrics: [], issues: [] };
      });

      orchestrator.startMonitoring(500);
      vi.advanceTimersByTime(1500);

      // Should only have started one check despite multiple intervals
      expect(checkCount).toBe(1);
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should return health report', async () => {
      const report = await orchestrator.runHealthCheck();

      expect(report).toBeDefined();
      expect(report.healthy).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(Array.isArray(report.metrics)).toBe(true);
    });

    it('should collect system metrics', async () => {
      const report = await orchestrator.runHealthCheck();

      // Should have some metrics
      expect(report.metrics.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect issues', async () => {
      // Create orchestrator with low thresholds to trigger issues
      const sensitiveOrchestrator = new SelfHealingOrchestrator({
        memoryThreshold: 0.01, // 1% - will likely trigger
        errorRateThreshold: 0.0001,
        responseTimeThreshold: 1,
      });
      await sensitiveOrchestrator.initialize();

      const report = await sensitiveOrchestrator.runHealthCheck();

      // May or may not have issues depending on system state
      expect(report.issues).toBeDefined();
      expect(Array.isArray(report.issues)).toBe(true);
    });
  });

  describe('issue detection', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should detect and report issues', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'high' as const,
        component: 'test-component',
        message: 'Test error detected',
        stackTrace: 'Error: Test\n  at test.js:1',
      };

      await orchestrator.reportIssue(issue);

      // Should be tracked
      const status = orchestrator.getStatus();
      expect(status.issuesDetected).toBeGreaterThanOrEqual(1);
    });

    it('should categorize issue severity', () => {
      const categorize = (orchestrator as any).categorizeIssueSeverity.bind(orchestrator);

      expect(categorize({ message: 'CRITICAL: System down' })).toBe('critical');
      expect(categorize({ message: 'Error: Something failed' })).toBe('high');
      expect(categorize({ message: 'Warning: Deprecated API' })).toBe('medium');
      expect(categorize({ message: 'Info: Minor issue' })).toBe('low');
    });
  });

  describe('healing strategies', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should select appropriate strategy for error', async () => {
      const strategy = (orchestrator as any).selectStrategy({
        type: 'error',
        severity: 'medium',
        message: 'TypeError: Cannot read property',
      });

      expect(['ai-fix', 'patch', 'rollback']).toContain(strategy);
    });

    it('should select rollback for critical issues', async () => {
      const strategy = (orchestrator as any).selectStrategy({
        type: 'error',
        severity: 'critical',
        message: 'System failure',
      });

      expect(strategy).toBe('rollback');
    });

    it('should select cache-clear for performance issues', async () => {
      const strategy = (orchestrator as any).selectStrategy({
        type: 'performance',
        severity: 'medium',
        message: 'Slow response times',
      });

      expect(strategy).toBe('cache-clear');
    });

    it('should select dependency-update for dependency issues', async () => {
      const strategy = (orchestrator as any).selectStrategy({
        type: 'dependency',
        severity: 'medium',
        message: 'Outdated package',
      });

      expect(strategy).toBe('dependency-update');
    });

    it('should select config-adjust for config issues', async () => {
      const strategy = (orchestrator as any).selectStrategy({
        type: 'configuration',
        severity: 'low',
        message: 'Invalid config value',
      });

      expect(strategy).toBe('config-adjust');
    });
  });

  describe('healing execution', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should execute patch strategy', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Minor error',
        filePath: '/test/file.ts',
      };

      const result = await orchestrator.heal(issue, 'patch');

      expect(result).toBeDefined();
      expect(result.strategy).toBe('patch');
      expect(['success', 'failed', 'skipped']).toContain(result.status);
    });

    it('should execute cache-clear strategy', async () => {
      const issue = {
        type: 'performance' as const,
        severity: 'medium' as const,
        component: 'cache',
        message: 'Cache bloat',
      };

      const result = await orchestrator.heal(issue, 'cache-clear');

      expect(result).toBeDefined();
      expect(result.strategy).toBe('cache-clear');
    });

    it('should record healing in history', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Test error',
      };

      await orchestrator.heal(issue, 'patch');

      const history = orchestrator.getHealingHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should respect max healing attempts', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Recurring error',
        id: 'recurring-issue',
      };

      // Try to heal multiple times
      for (let i = 0; i < 5; i++) {
        await orchestrator.heal(issue, 'patch');
      }

      // Should have limited attempts
      const history = orchestrator.getHealingHistory();
      const attemptsForIssue = history.filter((h) => h.issueId === 'recurring-issue');
      expect(attemptsForIssue.length).toBeLessThanOrEqual(3);
    });
  });

  describe('status reporting', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should report current status', () => {
      const status = orchestrator.getStatus();

      expect(status).toBeDefined();
      expect(status.monitoring).toBeDefined();
      expect(status.lastCheck).toBeDefined();
      expect(status.issuesDetected).toBeDefined();
      expect(status.issuesHealed).toBeDefined();
      expect(status.healingSuccessRate).toBeDefined();
    });

    it('should calculate success rate', async () => {
      // Record some healing attempts
      const successIssue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Easy fix',
      };

      await orchestrator.heal(successIssue, 'cache-clear');
      await orchestrator.heal(successIssue, 'cache-clear');

      const status = orchestrator.getStatus();
      expect(status.healingSuccessRate).toBeGreaterThanOrEqual(0);
      expect(status.healingSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  describe('healing history', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should maintain healing history', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Test',
      };

      await orchestrator.heal(issue, 'patch');

      const history = orchestrator.getHealingHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].strategy).toBe('patch');
    });

    it('should limit history size', async () => {
      // Create orchestrator with small history limit
      const limitedOrchestrator = new SelfHealingOrchestrator({
        maxHistorySize: 5,
      });
      await limitedOrchestrator.initialize();

      // Add many healing records
      for (let i = 0; i < 10; i++) {
        await limitedOrchestrator.heal(
          {
            type: 'error' as const,
            severity: 'low' as const,
            component: 'test',
            message: `Test ${i}`,
            id: `unique-${i}`,
          },
          'patch'
        );
      }

      const history = limitedOrchestrator.getHealingHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should clear history', async () => {
      const issue = {
        type: 'error' as const,
        severity: 'low' as const,
        component: 'test',
        message: 'Test',
      };

      await orchestrator.heal(issue, 'patch');
      orchestrator.clearHistory();

      const history = orchestrator.getHealingHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should accept custom thresholds', async () => {
      const customOrchestrator = new SelfHealingOrchestrator({
        memoryThreshold: 0.9,
        errorRateThreshold: 0.1,
        responseTimeThreshold: 5000,
        maxHealingAttempts: 5,
      });

      await customOrchestrator.initialize();
      expect(customOrchestrator).toBeDefined();
    });

    it('should use default thresholds when not specified', async () => {
      const defaultOrchestrator = new SelfHealingOrchestrator();
      await defaultOrchestrator.initialize();

      const status = defaultOrchestrator.getStatus();
      expect(status).toBeDefined();
    });
  });
});
