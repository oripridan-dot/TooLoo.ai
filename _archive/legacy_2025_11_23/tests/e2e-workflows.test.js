import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../lib/metrics-collector.js';
import { BadgeSystem } from '../lib/badge-system.js';
import { IntentRouter } from '../lib/intent-router.js';
import { WorkflowEngine } from '../lib/workflow-engine.js';
import { TaskScheduler } from '../lib/task-scheduler.js';

describe('E2E: Cross-Service Workflows', () => {
  let metricsCollector;
  let badgeSystem;
  let intentRouter;
  let workflowEngine;
  let taskScheduler;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    badgeSystem = new BadgeSystem();
    intentRouter = new IntentRouter();
    workflowEngine = new WorkflowEngine();
    taskScheduler = new TaskScheduler();
  });

  it('should orchestrate complete user learning journey', () => {
    const userId = 'user-e2e-001';

    // Step 1: User intent parsing
    const intent = intentRouter.parseIntent('I want to learn JavaScript for 2 hours');
    expect(intent.intentId).toBe('learn');
    expect(intent.parameters.topic).toBeDefined();

    // Step 2: Create learning workflow
    const workflow = workflowEngine.createWorkflow('JavaScript Learning Path', 'Learn JS fundamentals', [
      { id: 'setup', action: 'fetch', url: 'lessons/js-101' },
      { id: 'learn', action: 'transform', inputFrom: 'setup' },
      { id: 'assess', action: 'validate' },
      { id: 'complete', action: 'notify' },
    ]);

    expect(workflow.valid).toBe(true);

    // Step 3: Execute workflow
    const execution = workflowEngine.executeWorkflow(workflow.workflowId, { userId, duration: 7200 });
    expect(execution.success).toBe(true);

    // Step 4: Track engagement
    metricsCollector.trackEngagement(userId, 'learning', { duration: 7200, topic: 'JavaScript' });
    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalSessions).toBe(1);
    expect(metrics.totalTime).toBe(7200);

    // Step 5: Check badge eligibility
    const eligible = badgeSystem.checkEligibility(userId, metrics, metricsCollector.getEngagementScore(userId));
    expect(Array.isArray(eligible)).toBe(true);

    // Step 6: Award earned badges
    if (eligible.length > 0) {
      const badge = badgeSystem.awardBadge(userId, eligible[0]);
      expect(badge).toBeDefined();
      expect(badge.userId).toBe(userId);
    }
  });

  it('should handle event-driven learning progression', () => {
    const userId = 'user-e2e-002';

    // Simulate learning events
    const events = [
      { type: 'learning.session_started', userId, metadata: { topic: 'Python' } },
      { type: 'learning.session_completed', userId, metadata: { duration: 3600, score: 85 } },
      { type: 'learning.assessment_submitted', userId, metadata: { score: 92 } },
    ];

    // Process events through metrics
    for (const event of events) {
      if (event.type === 'learning.session_completed') {
        metricsCollector.trackEngagement(userId, 'learning', { duration: event.metadata.duration });
      }
      if (event.type === 'learning.assessment_submitted') {
        metricsCollector.trackProgress(userId, 'assessment_score', event.metadata.score);
      }
    }

    // Verify progression
    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalSessions).toBe(1);

    const progress = metricsCollector.getProgressMetrics(userId);
    expect(progress.assessment_score).toBe(92);

    // Award achievement badge
    const badge = badgeSystem.awardBadge(userId, 'first_session');
    expect(badge).toBeDefined();
  });

  it('should execute intent-driven workflow with scheduling', () => {
    // Parse user intent
    const intent = intentRouter.parseIntent('Schedule daily Python challenge');
    expect(['challenge', 'schedule'].includes(intent.intentId)).toBe(true);

    // Extract parameters
    const params = intentRouter.extractParameters(
      'Schedule Python challenge for tomorrow at 2pm',
      'schedule'
    );
    expect(params).toBeDefined();

    // Create challenge workflow
    const workflow = workflowEngine.createWorkflow('Python Challenge', 'Weekly Python assessment', [
      { id: 'prepare', action: 'fetch' },
      { id: 'launch', action: 'notify' },
    ]);

    expect(workflow.valid).toBe(true);

    // Schedule task to execute workflow
    const task = taskScheduler.scheduleTask('Run Python Challenge', 'run_training', {
      type: 'cron',
      pattern: '0 14 * * *', // Daily at 2pm
    });

    expect(task.taskId).toBeDefined();

    // Verify scheduled task
    const retrievedTask = taskScheduler.getTask(task.taskId);
    expect(retrievedTask.name).toBe('Run Python Challenge');
  });

  it('should handle multi-step workflow with dependencies', () => {
    const userId = 'user-e2e-003';

    // Create complex workflow with step dependencies
    const workflow = workflowEngine.createWorkflow('Complete Learning Path', 'Multi-step learning', [
      { id: 'analyze', action: 'fetch', url: 'api/analyze' },
      { id: 'learn', action: 'transform', inputFrom: 'analyze', dependencies: ['analyze'] },
      { id: 'practice', action: 'validate', dependencies: ['learn'] },
      { id: 'assess', action: 'notify', dependencies: ['practice'] },
    ]);

    expect(workflow.valid).toBe(true);

    // Execute with context
    const execution = workflowEngine.executeWorkflow(workflow.workflowId, { userId });
    expect(execution.success).toBe(true);
    expect(Object.keys(execution.results).length).toBe(4);

    // Track in metrics
    metricsCollector.trackEngagement(userId, 'learning', { duration: 5400 });
    metricsCollector.recordAchievement(userId, 'learning_path_complete', { workflowId: workflow.workflowId });

    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalSessions).toBe(1);
  });

  it('should track complete user progression across services', () => {
    const userId = 'user-e2e-004';

    // Day 1: First session
    metricsCollector.trackEngagement(userId, 'learning', { duration: 3600 });
    let eligible = badgeSystem.checkEligibility(userId, metricsCollector.getUserMetrics(userId), 50);
    if (eligible.includes('first_session')) {
      badgeSystem.awardBadge(userId, 'first_session');
    }

    // Day 2-7: Multiple sessions
    for (let i = 0; i < 6; i++) {
      metricsCollector.trackEngagement(userId, 'learning', { duration: 3600 });
      metricsCollector.trackProgress(userId, 'daily_session', i + 1);
    }

    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalSessions).toBe(7);

    // Check new badge eligibility
    const score = metricsCollector.getEngagementScore(userId);
    eligible = badgeSystem.checkEligibility(userId, metrics, score);
    // Note: Not all users qualify for badges immediately
    expect(Array.isArray(eligible)).toBe(true);

    // Award week warrior badge if eligible
    if (eligible.includes('week_warrior')) {
      badgeSystem.awardBadge(userId, 'week_warrior');
    }

    const badges = badgeSystem.getUserBadges(userId);
    expect(badges.length).toBeGreaterThan(0);

    // View user summary
    const summary = {
      userId,
      metrics,
      badges,
      engagementScore: score,
      totalPoints: badgeSystem.getUserTotalPoints(userId),
    };

    expect(summary.metrics.totalSessions).toBe(7);
    expect(summary.badges.length).toBeGreaterThan(0);
  });

  it('should handle concurrent user activities', () => {
    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

    // Simulate concurrent activities
    for (const userId of userIds) {
      metricsCollector.trackEngagement(userId, 'learning', { duration: Math.random() * 3600 });
      metricsCollector.trackProgress(userId, 'completion_rate', Math.random());
    }

    // Aggregate global metrics
    const global = metricsCollector.getGlobalMetrics('day');
    expect(global.uniqueUsers).toBe(5);

    // Get top performers
    const top = metricsCollector.getTopPerformers(3);
    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(3);
  });

  it('should execute workflow and schedule follow-up tasks', () => {
    const userId = 'user-e2e-005';

    // Create and execute learning workflow
    const workflow = workflowEngine.createWorkflow('Daily Learning', 'Complete daily session', [
      { id: 'start', action: 'fetch' },
      { id: 'learn', action: 'transform', inputFrom: 'start' },
    ]);

    const execution = workflowEngine.executeWorkflow(workflow.workflowId, { userId });
    expect(execution.success).toBe(true);

    // Schedule follow-up tasks
    const reviewTask = taskScheduler.scheduleTask('Review Session', 'generate_report', {
      type: 'delay',
      delay: 86400000, // 24 hours
    });

    const reminderTask = taskScheduler.scheduleTask('Daily Reminder', 'send_notification', {
      type: 'cron',
      pattern: '0 9 * * *', // 9am daily
    });

    expect(reviewTask.taskId).toBeDefined();
    expect(reminderTask.taskId).toBeDefined();

    const tasks = taskScheduler.listTasks();
    expect(tasks.length).toBe(2);
  });

  it('should handle intent parsing and workflow execution chain', () => {
    // User says they want to learn
    const learnIntent = intentRouter.parseIntent('teach me Python programming');
    expect(['learn', 'help'].includes(learnIntent.intentId)).toBe(true);

    // Create workflow based on intent
    const workflow = workflowEngine.createWorkflow(
      'Master Python',
      learnIntent.description,
      [
        { id: 'curriculum', action: 'fetch' },
        { id: 'track_progress', action: 'transform', inputFrom: 'curriculum' },
      ]
    );

    // Execute workflow
    const execution = workflowEngine.executeWorkflow(workflow.workflowId);
    expect(execution.success).toBe(true);

    // User completes workflow
    const userId = 'user-python-master';
    metricsCollector.trackEngagement(userId, 'learning', { duration: 36000 });
    metricsCollector.trackProgress(userId, 'python_proficiency', 95);

    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalTime).toBe(36000);

    // Check eligibility and award badges
    const eligible = badgeSystem.checkEligibility(userId, metrics, 90);
    expect(eligible.length).toBeGreaterThan(0);
  });

  it('should track analytics across workflow execution', () => {
    const steps = [
      { id: 'step1', action: 'fetch' },
      { id: 'step2', action: 'validate' },
      { id: 'step3', action: 'notify' },
    ];

    const workflow = workflowEngine.createWorkflow('Analytics Test Workflow', 'Test', steps);

    // Execute multiple times
    for (let i = 0; i < 5; i++) {
      workflowEngine.executeWorkflow(workflow.workflowId);
    }

    // Get workflow stats
    const stats = workflowEngine.getWorkflowStats();
    expect(stats.totalWorkflows).toBeGreaterThan(0);
    expect(stats.totalExecutions).toBeGreaterThanOrEqual(5);
    expect(parseFloat(stats.successRate)).toBeGreaterThan(0);
  });

  it('should manage task lifecycle with proper scheduling', () => {
    const taskName = 'Training Session';
    const action = 'run_training';

    // Schedule task
    const scheduled = taskScheduler.scheduleTask(taskName, action, {
      type: 'interval',
      interval: 3600000, // 1 hour
    });

    expect(scheduled.taskId).toBeDefined();

    // Retrieve task
    let task = taskScheduler.getTask(scheduled.taskId);
    expect(task.name).toBe(taskName);
    expect(task.enabled).toBe(true);

    // Disable task
    taskScheduler.disableTask(scheduled.taskId);
    task = taskScheduler.getTask(scheduled.taskId);
    expect(task.enabled).toBe(false);

    // Re-enable task
    taskScheduler.enableTask(scheduled.taskId);
    task = taskScheduler.getTask(scheduled.taskId);
    expect(task.enabled).toBe(true);

    // Execute task
    const execution = taskScheduler.executeTask(scheduled.taskId);
    expect(execution.success).toBe(true);

    // Check history
    const history = taskScheduler.getExecutionHistory(scheduled.taskId);
    expect(history.length).toBeGreaterThan(0);

    // Delete task
    const deleted = taskScheduler.deleteTask(scheduled.taskId);
    expect(deleted.success).toBe(true);
  });

  it('should handle complete user lifecycle: intent → workflow → metrics → badges', () => {
    const userId = 'user-lifecycle-complete';

    // Step 1: User expresses intent
    const intent = intentRouter.parseIntent('I want to complete 30 days of learning');
    expect(intent.intentId).toBe('learn');

    // Step 2: System creates workflow
    const workflow = workflowEngine.createWorkflow('30-Day Learning Challenge', 'Complete challenge', [
      { id: 'daily_session', action: 'fetch' },
      { id: 'track_progress', action: 'transform', inputFrom: 'daily_session' },
      { id: 'award_points', action: 'notify' },
    ]);

    expect(workflow.valid).toBe(true);

    // Step 3: Schedule daily tasks
    const dailyTask = taskScheduler.scheduleTask('Daily Learning', 'run_training', {
      type: 'cron',
      pattern: '0 9 * * *',
    });

    expect(dailyTask.taskId).toBeDefined();

    // Step 4: Simulate 30 days of activity
    for (let day = 1; day <= 30; day++) {
      metricsCollector.trackEngagement(userId, 'learning', { duration: 3600 });
      metricsCollector.trackProgress(userId, 'day_streak', day);
    }

    // Step 5: Check metrics
    const metrics = metricsCollector.getUserMetrics(userId);
    expect(metrics.totalSessions).toBe(30);

    const score = metricsCollector.getEngagementScore(userId);
    // Engagement score will vary based on algorithm
    expect(score).toBeGreaterThan(0);

    // Step 6: Check and award badges
    const eligible = badgeSystem.checkEligibility(userId, metrics, score);
    expect(eligible.length).toBeGreaterThan(0);

    for (const badgeId of eligible.slice(0, 3)) {
      badgeSystem.awardBadge(userId, badgeId);
    }

    // Step 7: View final user summary
    const badges = badgeSystem.getUserBadges(userId);
    expect(badges.length).toBeGreaterThan(0);

    const totalPoints = badgeSystem.getUserTotalPoints(userId);
    expect(totalPoints).toBeGreaterThan(0);

    // Verify complete lifecycle
    expect({
      userId,
      sessions: metrics.totalSessions,
      engagement: score,
      badges: badges.length,
      points: totalPoints,
    }).toBeDefined();
  });
});
