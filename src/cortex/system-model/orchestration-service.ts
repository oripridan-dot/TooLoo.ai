import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { EventBus } from '../lib/event-bus.js';
import { IntentRouter } from '../lib/intent-router.js';
import { WorkflowEngine } from '../lib/workflow-engine.js';
import { TaskScheduler } from '../lib/task-scheduler.js';

const app = express();
const eventBus = new EventBus();
const intentRouter = new IntentRouter();
const workflowEngine = new WorkflowEngine();
const taskScheduler = new TaskScheduler();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Register with event bus
await eventBus.initialize();

// Subscribe to system events
eventBus.subscribe('system.*', (event) => {
  console.log(`[Orchestration] System event: ${event.type}`);
});

// Intent endpoints
app.post('/api/v1/intent/parse', (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'userInput required' });
  }

  const result = intentRouter.parseIntent(userInput);

  eventBus.emit({
    type: 'orchestration.intent_parsed',
    metadata: { intentId: result.intentId, confidence: result.confidence },
  });

  res.json(result);
});

app.get('/api/v1/intent/:intentId', (req, res) => {
  const { intentId } = req.params;
  const classification = intentRouter.classifyIntent(intentId);

  if (!classification) {
    return res.status(404).json({ error: 'Intent not found' });
  }

  res.json(classification);
});

app.post('/api/v1/intent/:intentId/extract', (req, res) => {
  const { intentId } = req.params;
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: 'userInput required' });
  }

  const parameters = intentRouter.extractParameters(userInput, intentId);

  res.json({ intentId, parameters });
});

app.post('/api/v1/intent/:intentId/validate', (req, res) => {
  const { intentId } = req.params;
  const { parameters } = req.body;

  if (!parameters) {
    return res.status(400).json({ error: 'parameters required' });
  }

  const validation = intentRouter.validateIntent(intentId, parameters);

  res.json(validation);
});

app.get('/api/v1/intent/priority/:intentId', (req, res) => {
  const { intentId } = req.params;
  const priority = intentRouter.getIntentPriority(intentId);

  if (!priority) {
    return res.status(404).json({ error: 'Intent not found' });
  }

  res.json(priority);
});

app.get('/api/v1/intents', (req, res) => {
  const intents = intentRouter.getAllIntents();

  res.json({ intents, total: intents.length });
});

app.get('/api/v1/intents/recent', (req, res) => {
  const { limit } = req.query;
  const recent = intentRouter.getRecentIntents(parseInt(limit) || 10);

  res.json({ recent });
});

app.get('/api/v1/intents/distribution', (req, res) => {
  const distribution = intentRouter.getIntentDistribution();

  res.json({ distribution });
});

app.get('/api/v1/intents/stats', (req, res) => {
  const stats = intentRouter.getIntentConfidenceStats();

  res.json(stats);
});

// Workflow endpoints
app.post('/api/v1/workflow/create', (req, res) => {
  const { name, description, steps } = req.body;

  if (!name || !steps) {
    return res.status(400).json({ error: 'name and steps required' });
  }

  const result = workflowEngine.createWorkflow(name, description || '', steps);

  if (!result.valid) {
    return res.status(400).json({ valid: false, errors: result.errors });
  }

  eventBus.emit({
    type: 'orchestration.workflow_created',
    metadata: { workflowId: result.workflowId, name },
  });

  res.json(result);
});

app.post('/api/v1/workflow/:workflowId/execute', (req, res) => {
  const { workflowId } = req.params;
  const { context } = req.body;

  const result = workflowEngine.executeWorkflow(workflowId, context || {});

  if (!result.success) {
    return res.status(400).json(result);
  }

  eventBus.emit({
    type: 'orchestration.workflow_executed',
    metadata: { workflowId, executionId: result.executionId, status: result.status },
  });

  res.json(result);
});

app.get('/api/v1/workflow/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const workflow = workflowEngine.getWorkflow(workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
});

app.put('/api/v1/workflow/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const result = workflowEngine.updateWorkflow(workflowId, req.body);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

app.delete('/api/v1/workflow/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const result = workflowEngine.deleteWorkflow(workflowId);

  res.json(result);
});

app.get('/api/v1/workflows', (req, res) => {
  const workflows = workflowEngine.listWorkflows();

  res.json({ workflows, total: workflows.length });
});

app.get('/api/v1/workflow/:workflowId/execution/:executionId', (req, res) => {
  const { executionId } = req.params;
  const status = workflowEngine.getExecutionStatus(executionId);

  if (!status) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json(status);
});

app.get('/api/v1/workflow/executions/history', (req, res) => {
  const { limit } = req.query;
  const history = workflowEngine.getExecutionHistory(parseInt(limit) || 10);

  res.json({ history });
});

app.get('/api/v1/workflow/stats', (req, res) => {
  const stats = workflowEngine.getWorkflowStats();

  res.json(stats);
});

// Task scheduling endpoints
app.post('/api/v1/task/schedule', (req, res) => {
  const { taskName, action, schedule, metadata } = req.body;

  if (!taskName || !action || !schedule) {
    return res.status(400).json({ error: 'taskName, action, and schedule required' });
  }

  const result = taskScheduler.scheduleTask(taskName, action, schedule, metadata || {});

  eventBus.emit({
    type: 'orchestration.task_scheduled',
    metadata: { taskId: result.taskId, taskName },
  });

  res.json(result);
});

app.post('/api/v1/task/:taskId/execute', (req, res) => {
  const { taskId } = req.params;
  const result = taskScheduler.executeTask(taskId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  eventBus.emit({
    type: 'orchestration.task_executed',
    metadata: { taskId, executionId: result.executionId },
  });

  res.json(result);
});

app.get('/api/v1/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = taskScheduler.getTask(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

app.put('/api/v1/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const result = taskScheduler.updateTask(taskId, req.body);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

app.post('/api/v1/task/:taskId/enable', (req, res) => {
  const { taskId } = req.params;
  const result = taskScheduler.enableTask(taskId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

app.post('/api/v1/task/:taskId/disable', (req, res) => {
  const { taskId } = req.params;
  const result = taskScheduler.disableTask(taskId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

app.delete('/api/v1/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const result = taskScheduler.deleteTask(taskId);

  res.json(result);
});

app.get('/api/v1/tasks', (req, res) => {
  const tasks = taskScheduler.listTasks();

  res.json({ tasks, total: tasks.length });
});

app.get('/api/v1/tasks/due', (req, res) => {
  const dueTasks = taskScheduler.getDueTasksIds();

  res.json({ dueTasks });
});

app.get('/api/v1/task/:taskId/history', (req, res) => {
  const { taskId } = req.params;
  const { limit } = req.query;
  const history = taskScheduler.getExecutionHistory(taskId, parseInt(limit) || 10);

  res.json({ history });
});

app.get('/api/v1/task/schedule/stats', (req, res) => {
  const stats = taskScheduler.getScheduleStats();

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestration-service', timestamp: new Date().toISOString() });
});

// System status
app.get('/api/v1/system/status', (req, res) => {
  res.json({
    service: 'orchestration-service',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const handleShutdown = async () => {
  console.log('Orchestration Service: Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

const PORT = process.env.ORCHESTRATION_PORT || 3100;
app.listen(PORT, () => {
  console.log(`Orchestration Service listening on port ${PORT}`);
});

export default app;
