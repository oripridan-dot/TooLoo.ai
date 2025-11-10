import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRouter } from '../lib/intent-router.js';
import { WorkflowEngine } from '../lib/workflow-engine.js';
import { TaskScheduler } from '../lib/task-scheduler.js';

describe('IntentRouter', () => {
  let router;

  beforeEach(() => {
    router = new IntentRouter();
  });

  it('should parse simple intent', () => {
    const result = router.parseIntent('I want to learn about JavaScript');

    expect(result.intentId).toBe('learn');
    expect(parseFloat(result.confidence)).toBeGreaterThan(0);
    expect(result.parameters).toBeDefined();
  });

  it('should parse challenge intent', () => {
    const result = router.parseIntent('Can I take a quiz?');

    expect(result.intentId).toBe('challenge');
    expect(parseFloat(result.confidence)).toBeGreaterThan(0);
  });

  it('should parse review intent', () => {
    const result = router.parseIntent('Let me review my progress');

    expect(result.intentId).toBe('review');
    expect(parseFloat(result.confidence)).toBeGreaterThan(0);
  });

  it('should extract parameters from intent', () => {
    const params = router.extractParameters('Learn JavaScript at intermediate level', 'learn');

    expect(params).toBeDefined();
    expect(typeof params).toBe('object');
  });

  it('should validate intent', () => {
    const validation = router.validateIntent('learn', { topic: 'Python', level: 'beginner', duration: '30 minutes' });

    expect(validation.valid).toBe(true);
  });

  it('should classify intent', () => {
    const classification = router.classifyIntent('learn');

    expect(classification).toBeDefined();
    expect(classification.name).toBe('Learning Intent');
    expect(classification.parameters.length).toBeGreaterThan(0);
  });

  it('should get intent priority', () => {
    const priority = router.getIntentPriority('learn');

    expect(priority).toBeDefined();
    expect(priority.level).toBeGreaterThan(0);
  });

  it('should track recent intents', () => {
    router.parseIntent('learn something');
    router.parseIntent('take a test');
    router.parseIntent('check my stats');

    const recent = router.getRecentIntents(10);

    expect(recent.length).toBe(3);
    expect(recent[0].userInput).toBeDefined();
  });

  it('should get intent distribution', () => {
    router.parseIntent('learn');
    router.parseIntent('learn more');
    router.parseIntent('take a test');

    const distribution = router.getIntentDistribution();

    expect(distribution.learn).toBeGreaterThanOrEqual(2);
  });

  it('should calculate confidence stats', () => {
    router.parseIntent('learn Python');
    router.parseIntent('quiz time');
    router.parseIntent('show results');

    const stats = router.getIntentConfidenceStats();

    expect(stats.avgConfidence).toBeGreaterThan(0);
    expect(stats.minConfidence).toBeGreaterThan(0);
    expect(stats.maxConfidence).toBeGreaterThan(0);
  });

  it('should list all intents', () => {
    const intents = router.getAllIntents();

    expect(intents.length).toBeGreaterThan(0);
    expect(intents[0].name).toBeDefined();
    expect(intents[0].priority).toBeDefined();
  });

  it('should clear intent history', () => {
    router.parseIntent('learn');
    router.clearHistory();

    const recent = router.getRecentIntents();

    expect(recent.length).toBe(0);
  });
});

describe('WorkflowEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it('should create a workflow', () => {
    const steps = [
      { id: 'step1', action: 'fetch', url: 'http://example.com' },
      { id: 'step2', action: 'transform', inputFrom: 'step1' },
    ];

    const result = engine.createWorkflow('Test Workflow', 'A test workflow', steps);

    expect(result.valid).toBe(true);
    expect(result.workflowId).toBeDefined();
  });

  it('should validate workflow', () => {
    const invalidWorkflow = {
      name: '',
      steps: [],
    };

    const validation = engine.validateWorkflow(invalidWorkflow);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should execute a workflow', () => {
    const steps = [
      { id: 'step1', action: 'fetch' },
      { id: 'step2', action: 'validate' },
    ];

    const workflow = engine.createWorkflow('Test', 'Test', steps);
    const execution = engine.executeWorkflow(workflow.workflowId);

    expect(execution.success).toBe(true);
    expect(execution.executionId).toBeDefined();
    expect(execution.status).toBe('completed');
  });

  it('should get workflow', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const created = engine.createWorkflow('Test', 'Test', steps);

    const workflow = engine.getWorkflow(created.workflowId);

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Test');
  });

  it('should update workflow', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const created = engine.createWorkflow('Original', 'Original', steps);

    const updated = engine.updateWorkflow(created.workflowId, { name: 'Updated' });

    expect(updated.success).toBe(true);
    expect(updated.workflow.name).toBe('Updated');
    expect(updated.workflow.version).toBe(2);
  });

  it('should delete workflow', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const created = engine.createWorkflow('Test', 'Test', steps);

    const result = engine.deleteWorkflow(created.workflowId);

    expect(result.success).toBe(true);
  });

  it('should get execution status', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const workflow = engine.createWorkflow('Test', 'Test', steps);
    const execution = engine.executeWorkflow(workflow.workflowId);

    const status = engine.getExecutionStatus(execution.executionId);

    expect(status).toBeDefined();
    expect(status.status).toBe('completed');
  });

  it('should list workflows', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    engine.createWorkflow('Workflow1', 'Test1', steps);
    engine.createWorkflow('Workflow2', 'Test2', steps);

    const workflows = engine.listWorkflows();

    expect(workflows.length).toBe(2);
  });

  it('should get execution history', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const workflow = engine.createWorkflow('Test', 'Test', steps);

    engine.executeWorkflow(workflow.workflowId);
    engine.executeWorkflow(workflow.workflowId);

    const history = engine.getExecutionHistory(5);

    expect(history.length).toBe(2);
  });

  it('should calculate workflow stats', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    const workflow = engine.createWorkflow('Test', 'Test', steps);

    engine.executeWorkflow(workflow.workflowId);

    const stats = engine.getWorkflowStats();

    expect(stats.totalWorkflows).toBeGreaterThan(0);
    expect(stats.totalExecutions).toBeGreaterThan(0);
  });
});

describe('TaskScheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  it('should schedule a task', () => {
    const result = scheduler.scheduleTask('Test Task', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    expect(result.taskId).toBeDefined();
    expect(result.name).toBe('Test Task');
  });

  it('should calculate next run for delay schedule', () => {
    const result = scheduler.scheduleTask('Test', 'run_training', {
      type: 'delay',
      delay: 5000,
    });

    expect(result.nextRun).toBeDefined();
  });

  it('should execute a task', () => {
    const task = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const result = scheduler.executeTask(task.taskId);

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('should get task', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const task = scheduler.getTask(created.taskId);

    expect(task).toBeDefined();
    expect(task.name).toBe('Test');
  });

  it('should update task', () => {
    const created = scheduler.scheduleTask('Original', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const result = scheduler.updateTask(created.taskId, { name: 'Updated' });

    expect(result.success).toBe(true);
  });

  it('should disable task', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const result = scheduler.disableTask(created.taskId);

    expect(result.success).toBe(true);

    const task = scheduler.getTask(created.taskId);
    expect(task.enabled).toBe(false);
  });

  it('should enable task', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    scheduler.disableTask(created.taskId);
    const result = scheduler.enableTask(created.taskId);

    expect(result.success).toBe(true);

    const task = scheduler.getTask(created.taskId);
    expect(task.enabled).toBe(true);
  });

  it('should delete task', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const result = scheduler.deleteTask(created.taskId);

    expect(result.success).toBe(true);
  });

  it('should list tasks', () => {
    scheduler.scheduleTask('Task1', 'run_training', { type: 'delay', delay: 1000 });
    scheduler.scheduleTask('Task2', 'generate_report', { type: 'delay', delay: 2000 });

    const tasks = scheduler.listTasks();

    expect(tasks.length).toBe(2);
  });

  it('should identify due tasks', () => {
    const pastDate = new Date(Date.now() - 10000).toISOString();
    scheduler.scheduleTask('Due Task', 'run_training', {
      type: 'once',
      at: pastDate,
    });

    const dueTasks = scheduler.getDueTasksIds();

    expect(dueTasks.length).toBeGreaterThan(0);
  });

  it('should get execution history', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    scheduler.executeTask(created.taskId);

    const history = scheduler.getExecutionHistory(created.taskId, 10);

    expect(history.length).toBeGreaterThan(0);
  });

  it('should calculate schedule stats', () => {
    scheduler.scheduleTask('Task1', 'run_training', { type: 'delay', delay: 1000 });
    scheduler.scheduleTask('Task2', 'generate_report', { type: 'delay', delay: 2000 });

    const stats = scheduler.getScheduleStats();

    expect(stats.totalTasks).toBe(2);
    expect(stats.enabledTasks).toBeGreaterThan(0);
  });

  it('should reschedule task', () => {
    const created = scheduler.scheduleTask('Test', 'run_training', {
      type: 'once',
      at: new Date().toISOString(),
    });

    const result = scheduler.rescheduleTask(created.taskId, {
      type: 'delay',
      delay: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.nextRun).toBeDefined();
  });
});

describe('Orchestration Integration', () => {
  let router;
  let engine;
  let scheduler;

  beforeEach(() => {
    router = new IntentRouter();
    engine = new WorkflowEngine();
    scheduler = new TaskScheduler();
  });

  it('should orchestrate complete workflow from intent', () => {
    const intent = router.parseIntent('I want to learn Python');

    expect(intent.intentId).toBe('learn');

    const workflow = engine.createWorkflow('Learn Python', 'Python learning path', [
      { id: 'step1', action: 'fetch' },
      { id: 'step2', action: 'validate' },
    ]);

    expect(workflow.valid).toBe(true);

    const execution = engine.executeWorkflow(workflow.workflowId);

    expect(execution.success).toBe(true);
  });

  it('should schedule tasks for workflow', () => {
    const steps = [{ id: 'step1', action: 'fetch' }];
    engine.createWorkflow('Test', 'Test', steps);

    const task = scheduler.scheduleTask('Execute Workflow', 'run_training', {
      type: 'cron',
      pattern: '0 * * * *',
    });

    expect(task.taskId).toBeDefined();

    const due = scheduler.getDueTasksIds();
    expect(typeof due).toBe('object');
  });
});
