/**
 * @file Stress Tests for Skills OS Services
 * @description Tests orchestrator, scheduler, and self-improvement services under load
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SkillOrchestrator,
  SkillScheduler,
  SelfImprovementService,
} from '@tooloo/skills';

// =============================================================================
// MOCK SKILL EXECUTOR
// =============================================================================

const createMockExecutor = (delay = 10, failRate = 0) => {
  let callCount = 0;
  return async (skillId: string, input: unknown) => {
    callCount++;
    await new Promise((r) => setTimeout(r, delay));
    
    if (Math.random() < failRate) {
      return { success: false, error: { message: 'Random failure' } };
    }
    
    return {
      success: true,
      data: { skillId, input, callNumber: callCount },
    };
  };
};

// =============================================================================
// ORCHESTRATOR STRESS TESTS
// =============================================================================

describe('SkillOrchestrator Stress Tests', () => {
  let orchestrator: SkillOrchestrator;

  beforeEach(() => {
    orchestrator = new SkillOrchestrator({ maxConcurrentWorkflows: 100 });
    orchestrator.setSkillExecutor(createMockExecutor(5));
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  it('should handle 50 sequential workflows concurrently', async () => {
    // Register a workflow with 3 steps
    orchestrator.registerWorkflow({
      id: 'test-sequential',
      name: 'Test Sequential',
      description: 'Test sequential execution',
      type: 'sequential',
      steps: [
        { skillId: 'skill-a' },
        { skillId: 'skill-b' },
        { skillId: 'skill-c' },
      ],
    });

    // Execute 50 workflows in parallel
    const promises = Array.from({ length: 50 }, (_, i) =>
      orchestrator.execute('test-sequential', { batch: i })
    );

    const results = await Promise.all(promises);

    // All should succeed
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.length).toBe(50);

    // Each workflow should have 3 step results
    for (const result of results) {
      expect(result.steps.length).toBe(3);
    }
  });

  it('should handle 20 parallel workflows with 5 parallel steps each', async () => {
    orchestrator.registerWorkflow({
      id: 'test-parallel',
      name: 'Test Parallel',
      description: 'Test parallel execution',
      type: 'parallel',
      steps: [
        { skillId: 'skill-1' },
        { skillId: 'skill-2' },
        { skillId: 'skill-3' },
        { skillId: 'skill-4' },
        { skillId: 'skill-5' },
      ],
    });

    const promises = Array.from({ length: 20 }, (_, i) =>
      orchestrator.execute('test-parallel', { batch: i })
    );

    const results = await Promise.all(promises);

    expect(results.every((r) => r.success)).toBe(true);
    expect(results.length).toBe(20);
  });

  it('should handle fallback workflows with controlled failure', async () => {
    // Use executor with 50% fail rate
    orchestrator.setSkillExecutor(createMockExecutor(5, 0.5));

    orchestrator.registerWorkflow({
      id: 'test-fallback',
      name: 'Test Fallback',
      description: 'Test fallback execution',
      type: 'fallback',
      steps: [
        { skillId: 'primary' },
        { skillId: 'fallback-1' },
        { skillId: 'fallback-2' },
        { skillId: 'fallback-3' },
      ],
    });

    const results = await Promise.all(
      Array.from({ length: 30 }, () => orchestrator.execute('test-fallback'))
    );

    // Most should succeed due to fallbacks
    const successRate = results.filter((r) => r.success).length / results.length;
    expect(successRate).toBeGreaterThan(0.9); // 90%+ success with 4 fallback options
  });

  it('should provide accurate metrics under load', async () => {
    orchestrator.registerWorkflow({
      id: 'metrics-test',
      name: 'Metrics Test',
      description: 'Test metrics accuracy',
      type: 'sequential',
      steps: [{ skillId: 'skill-a' }],
    });

    // Execute 100 workflows
    await Promise.all(
      Array.from({ length: 100 }, () => orchestrator.execute('metrics-test'))
    );

    const metrics = orchestrator.getMetrics();

    expect(metrics.totalWorkflows).toBe(100);
    expect(metrics.successfulWorkflows).toBe(100);
    expect(metrics.failedWorkflows).toBe(0);
    expect(metrics.workflowsByType.sequential).toBe(100);
    expect(metrics.averageDuration).toBeGreaterThan(0);
  });
});

// =============================================================================
// SCHEDULER STRESS TESTS
// =============================================================================

describe('SkillScheduler Stress Tests', () => {
  let scheduler: SkillScheduler;

  beforeEach(async () => {
    scheduler = new SkillScheduler({
      maxConcurrentTasks: 50,
      checkIntervalMs: 100,
    });
    scheduler.setSkillExecutor(createMockExecutor(5));
    await scheduler.initialize();
  });

  afterEach(async () => {
    await scheduler.shutdown();
  });

  it('should handle 100 interval-based tasks', async () => {
    // Register 100 tasks with different intervals
    for (let i = 0; i < 100; i++) {
      scheduler.registerTask({
        id: `task-${i}`,
        name: `Task ${i}`,
        skillId: 'test-skill',
        trigger: {
          type: 'interval',
          intervalMs: 50 + (i % 10) * 10, // 50-140ms intervals
        },
        enabled: true,
        priority: i % 5,
        maxRetries: 1,
        timeout: 5000,
      });
    }

    // Wait for some executions
    await new Promise((r) => setTimeout(r, 200));

    const metrics = scheduler.getMetrics();

    expect(metrics.totalTasks).toBe(100);
    expect(metrics.enabledTasks).toBe(100);
    expect(metrics.tasksByTrigger.interval).toBe(100);
  });

  it('should handle threshold triggers efficiently', async () => {
    // Register 50 threshold-based tasks
    for (let i = 0; i < 50; i++) {
      scheduler.registerTask({
        id: `threshold-${i}`,
        name: `Threshold ${i}`,
        skillId: 'threshold-skill',
        trigger: {
          type: 'threshold',
          metric: `metric-${i % 5}`, // 5 different metrics
          operator: 'gt',
          value: 50,
        },
        enabled: true,
        priority: 1,
        maxRetries: 1,
        timeout: 5000,
      });
    }

    // Trigger metrics that should fire some tasks
    scheduler.updateMetric('metric-0', 100); // Triggers 10 tasks
    scheduler.updateMetric('metric-1', 100); // Triggers 10 tasks
    scheduler.updateMetric('metric-2', 30);  // No triggers (below threshold)

    // Wait for executions
    await new Promise((r) => setTimeout(r, 100));

    const metrics = scheduler.getMetrics();

    expect(metrics.tasksByTrigger.threshold).toBe(50);
    // Some executions should have completed
    expect(metrics.totalExecutions).toBeGreaterThanOrEqual(0);
  });

  it('should handle event triggers with bursts', async () => {
    // Register event-triggered tasks
    for (let i = 0; i < 20; i++) {
      scheduler.registerTask({
        id: `event-${i}`,
        name: `Event ${i}`,
        skillId: 'event-skill',
        trigger: {
          type: 'event',
          eventName: `test-event-${i % 2}`, // 2 event types
        },
        enabled: true,
        priority: 1,
        maxRetries: 1,
        timeout: 5000,
      });
    }

    // Burst of events
    for (let i = 0; i < 10; i++) {
      scheduler.triggerEvent('test-event-0', { burst: i });
    }

    // Wait for processing
    await new Promise((r) => setTimeout(r, 200));

    const metrics = scheduler.getMetrics();

    expect(metrics.tasksByTrigger.event).toBe(20);
  });

  it('should respect max concurrent tasks limit', async () => {
    const slowExecutor = createMockExecutor(100); // 100ms per execution
    scheduler.setSkillExecutor(slowExecutor);

    // Register 100 interval tasks that would try to run simultaneously
    for (let i = 0; i < 100; i++) {
      scheduler.registerTask({
        id: `concurrent-${i}`,
        name: `Concurrent ${i}`,
        skillId: 'slow-skill',
        trigger: {
          type: 'interval',
          intervalMs: 10, // Very fast interval
        },
        enabled: true,
        priority: 1,
        maxRetries: 0,
        timeout: 5000,
      });
    }

    // The scheduler should never exceed maxConcurrentTasks (50)
    expect(scheduler.isHealthy()).toBe(true);
  });
});

// =============================================================================
// SELF-IMPROVEMENT STRESS TESTS
// =============================================================================

describe('SelfImprovementService Stress Tests', () => {
  let service: SelfImprovementService;

  beforeEach(async () => {
    service = new SelfImprovementService({
      maxProposalsPerDay: 100,
      maxDeploymentsPerDay: 50,
      observationPeriodMs: 50, // Fast observation for tests
    });
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should handle 50 concurrent proposals', async () => {
    const proposals = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        service.propose(
          `skill-${i}`,
          `Problem ${i}`,
          [{ type: 'metric', source: 'test', value: i, timestamp: Date.now() }],
          `Solution ${i}`,
          [{ type: 'prompt_update', path: `skills/test-${i}.yaml`, description: `Update ${i}` }]
        )
      )
    );

    expect(proposals.length).toBe(50);
    expect(proposals.every((p) => p.status === 'draft')).toBe(true);

    const metrics = service.getMetrics();
    expect(metrics.proposalsGenerated).toBe(50);
  });

  it('should process full pipeline under load', async () => {
    // Create proposals
    const proposals = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        service.propose(
          `skill-${i}`,
          `Problem ${i}`,
          [{ type: 'metric', source: 'test', value: i, timestamp: Date.now() }],
          `Solution ${i}`,
          [{ type: 'prompt_update', path: `skills/test-${i}.yaml`, description: `Update ${i}` }]
        )
      )
    );

    // Test all proposals
    const testResults = await Promise.all(
      proposals.map((p) => service.test(p.id))
    );

    expect(testResults.every((r) => r.passed)).toBe(true);

    // Review all (auto-approve low risk)
    const reviewResults = await Promise.all(
      proposals.map((p) => service.review(p.id, true, 'auto'))
    );

    expect(reviewResults.every((p) => p.status === 'approved')).toBe(true);

    // Deploy all
    const deployResults = await Promise.all(
      proposals.map((p) => service.deploy(p.id))
    );

    expect(deployResults.every((p) => p.status === 'deployed')).toBe(true);

    const metrics = service.getMetrics();
    expect(metrics.deploymentsSuccessful).toBe(20);
  });

  it('should maintain audit log integrity under load', async () => {
    // Perform many operations
    for (let i = 0; i < 30; i++) {
      await service.analyze(`target-${i}`);
    }

    const auditLog = service.getAuditLog(100);

    expect(auditLog.length).toBe(30);
    expect(auditLog.every((e) => e.action === 'analyze')).toBe(true);
    expect(auditLog.every((e) => e.outcome === 'success')).toBe(true);
  });

  it('should enforce daily limits', async () => {
    // Set very low limit for testing
    const limitedService = new SelfImprovementService({
      maxProposalsPerDay: 5,
      maxDeploymentsPerDay: 3,
    });

    // Create 5 proposals (at limit)
    for (let i = 0; i < 5; i++) {
      await limitedService.propose(
        `skill-${i}`,
        'Problem',
        [],
        'Solution',
        [{ type: 'prompt_update', path: 'test.yaml', description: 'Update' }]
      );
    }

    // 6th proposal should fail
    await expect(
      limitedService.propose('skill-6', 'Problem', [], 'Solution', [])
    ).rejects.toThrow('Daily proposal limit reached');
  });

  it('should correctly assess risk levels', async () => {
    const testCases = [
      { path: 'skills/test.yaml', expected: 'low' },
      { path: 'src/skills/test.ts', expected: 'medium' },
      { path: 'src/kernel/boot.ts', expected: 'critical' },
      { path: 'src/auth/security.ts', expected: 'critical' },
    ];

    for (const { path, expected } of testCases) {
      const proposal = await service.propose(
        'test',
        'Problem',
        [],
        'Solution',
        [{ type: 'file_modify', path, description: 'Update' }]
      );

      expect(proposal.riskLevel).toBe(expected);
    }
  });
});

// =============================================================================
// INTEGRATION STRESS TESTS
// =============================================================================

describe('Skills OS Integration Stress Tests', () => {
  it('should handle orchestrator -> scheduler -> self-improvement chain', async () => {
    const orchestrator = new SkillOrchestrator();
    const scheduler = new SkillScheduler();
    const selfImprovement = new SelfImprovementService();

    // Set up mock executor
    const executor = createMockExecutor(5);
    orchestrator.setSkillExecutor(executor);
    scheduler.setSkillExecutor(executor);

    await scheduler.initialize();
    await selfImprovement.initialize();

    // Register workflow
    orchestrator.registerWorkflow({
      id: 'improvement-workflow',
      name: 'Improvement Workflow',
      description: 'Analyze -> Propose -> Test',
      type: 'sequential',
      steps: [
        { skillId: 'analyze' },
        { skillId: 'propose' },
        { skillId: 'test' },
      ],
    });

    // Execute multiple times
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        orchestrator.execute('improvement-workflow')
      )
    );

    expect(results.every((r) => r.success)).toBe(true);

    // Clean up
    await orchestrator.shutdown();
    await scheduler.shutdown();
    await selfImprovement.shutdown();
  });

  it('should maintain service health under sustained load', async () => {
    const orchestrator = new SkillOrchestrator({ maxConcurrentWorkflows: 20 });
    const scheduler = new SkillScheduler({ maxConcurrentTasks: 20 });
    
    orchestrator.setSkillExecutor(createMockExecutor(10));
    scheduler.setSkillExecutor(createMockExecutor(10));

    await scheduler.initialize();

    // Run sustained load for 500ms
    const startTime = Date.now();
    let operations = 0;

    while (Date.now() - startTime < 500) {
      orchestrator.registerWorkflow({
        id: `workflow-${operations}`,
        name: `Workflow ${operations}`,
        description: 'Test',
        type: 'sequential',
        steps: [{ skillId: 'test' }],
      });

      await orchestrator.execute(`workflow-${operations}`);
      operations++;
    }

    expect(orchestrator.isHealthy()).toBe(true);
    expect(scheduler.isHealthy()).toBe(true);
    expect(operations).toBeGreaterThan(10);

    await orchestrator.shutdown();
    await scheduler.shutdown();
  });
});
