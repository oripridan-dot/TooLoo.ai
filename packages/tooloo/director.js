/**
 * Director Module for TooLoo.ai
 * Orchestrates multiple assistants, manages complex workflows, and makes
 * intelligent decisions about task execution and delegation.
 */

const EventEmitter = require('events');

/**
 * Task priorities
 */
const TaskPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

/**
 * Task statuses
 */
const TaskStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Task execution strategies
 */
const ExecutionStrategy = {
  SEQUENTIAL: 'sequential',     // Execute tasks one after another
  PARALLEL: 'parallel',         // Execute all tasks simultaneously
  PIPELINE: 'pipeline',         // Pass output of one task to next
  ADAPTIVE: 'adaptive',         // Director decides based on task characteristics
  REDUNDANT: 'redundant'        // Multiple assistants work on same task, take first/best result
};

/**
 * Task class - represents a unit of work
 */
class Task {
  constructor(config) {
    this.id = config.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type || 'general';
    this.description = config.description || '';
    this.input = config.input || {};
    this.output = null;
    this.status = TaskStatus.PENDING;
    this.priority = config.priority ?? TaskPriority.NORMAL;
    this.dependencies = config.dependencies || []; // Array of task IDs
    this.assignedTo = null; // Assistant ID
    this.retries = config.retries ?? 0;
    this.maxRetries = config.maxRetries ?? 2;
    this.timeout = config.timeout || 60000; // 60 seconds default
    this.metadata = config.metadata || {};
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
  }

  canExecute(completedTasks) {
    // Check if all dependencies are completed
    return this.dependencies.every(depId =>
      completedTasks.has(depId)
    );
  }

  markStarted(assignedTo) {
    this.status = TaskStatus.IN_PROGRESS;
    this.assignedTo = assignedTo;
    this.startedAt = new Date();
  }

  markCompleted(output) {
    this.status = TaskStatus.COMPLETED;
    this.output = output;
    this.completedAt = new Date();
  }

  markFailed(error) {
    this.status = TaskStatus.FAILED;
    this.error = error;
    this.completedAt = new Date();
  }

  getExecutionTime() {
    if (!this.startedAt) return 0;
    const end = this.completedAt || new Date();
    return end.getTime() - this.startedAt.getTime();
  }
}

/**
 * Workflow class - represents a collection of related tasks
 */
class Workflow {
  constructor(config) {
    this.id = config.id || `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.name = config.name || 'Unnamed Workflow';
    this.description = config.description || '';
    this.tasks = []; // Array of Task objects
    this.strategy = config.strategy || ExecutionStrategy.SEQUENTIAL;
    this.status = TaskStatus.PENDING;
    this.result = null;
    this.metadata = config.metadata || {};
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
  }

  addTask(task) {
    if (!(task instanceof Task)) {
      task = new Task(task);
    }
    this.tasks.push(task);
    return task;
  }

  getTasks(status = null) {
    if (!status) return this.tasks;
    return this.tasks.filter(t => t.status === status);
  }

  getProgress() {
    const total = this.tasks.length;
    if (total === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = this.tasks.filter(t =>
      t.status === TaskStatus.COMPLETED
    ).length;

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }

  isCompleted() {
    return this.tasks.every(t =>
      t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED
    );
  }

  hasFailed() {
    return this.tasks.some(t => t.status === TaskStatus.FAILED);
  }
}

/**
 * Director class - The orchestration brain
 * Manages multiple assistants and coordinates complex workflows
 */
class Director extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = config.id || `director-${Date.now()}`;
    this.name = config.name || 'TooLoo Director';

    // Assistant management
    this.assistants = new Map(); // assistantId -> Assistant instance
    this.assistantCapabilities = new Map(); // assistantId -> capabilities array

    // Task and workflow management
    this.tasks = new Map(); // taskId -> Task
    this.workflows = new Map(); // workflowId -> Workflow
    this.taskQueue = []; // Priority queue of tasks

    // Execution settings
    this.maxConcurrentTasks = config.maxConcurrentTasks || 3;
    this.currentExecutingTasks = new Set();
    this.completedTasks = new Set();

    // Decision-making
    this.selectionStrategy = config.selectionStrategy || 'capability_match';
    this.loadBalancing = config.loadBalancing !== false;

    // Statistics
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalWorkflows: 0,
      completedWorkflows: 0,
      avgTaskExecutionTime: 0,
      totalExecutionTime: 0
    };

    // Start processing loop
    this.isProcessing = false;
  }

  /**
   * Register an assistant with the director
   */
  registerAssistant(assistant, capabilities = []) {
    this.assistants.set(assistant.id, assistant);
    this.assistantCapabilities.set(assistant.id, capabilities);

    // Listen to assistant events
    assistant.on('request:complete', (data) => {
      this.emit('assistant:completed', {
        assistantId: assistant.id,
        data
      });
    });

    assistant.on('request:error', (data) => {
      this.emit('assistant:error', {
        assistantId: assistant.id,
        data
      });
    });

    this.emit('assistant:registered', {
      assistantId: assistant.id,
      capabilities
    });

    return assistant;
  }

  /**
   * Unregister an assistant
   */
  unregisterAssistant(assistantId) {
    this.assistants.delete(assistantId);
    this.assistantCapabilities.delete(assistantId);

    this.emit('assistant:unregistered', { assistantId });
  }

  /**
   * Create and submit a task
   */
  submitTask(taskConfig) {
    const task = new Task(taskConfig);
    this.tasks.set(task.id, task);
    this.stats.totalTasks++;

    task.status = TaskStatus.QUEUED;
    this.taskQueue.push(task);
    this.sortTaskQueue();

    this.emit('task:submitted', { task });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return task;
  }

  /**
   * Create and submit a workflow
   */
  submitWorkflow(workflowConfig) {
    const workflow = new Workflow(workflowConfig);
    this.workflows.set(workflow.id, workflow);
    this.stats.totalWorkflows++;

    this.emit('workflow:submitted', { workflow });

    // Submit all workflow tasks
    workflow.tasks.forEach(task => {
      this.tasks.set(task.id, task);
      this.stats.totalTasks++;
      task.status = TaskStatus.QUEUED;
      this.taskQueue.push(task);
    });

    this.sortTaskQueue();

    if (!this.isProcessing) {
      this.startProcessing();
    }

    return workflow;
  }

  /**
   * Sort task queue by priority
   */
  sortTaskQueue() {
    this.taskQueue.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Earlier created tasks first
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Start the task processing loop
   */
  async startProcessing() {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.emit('processing:started');

    while (this.taskQueue.length > 0 || this.currentExecutingTasks.size > 0) {
      // Process tasks while we have capacity
      while (
        this.currentExecutingTasks.size < this.maxConcurrentTasks &&
        this.taskQueue.length > 0
      ) {
        const task = this.getNextExecutableTask();

        if (!task) break; // No executable tasks available

        await this.executeTask(task);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
    this.emit('processing:completed');
  }

  /**
   * Get the next task that can be executed
   */
  getNextExecutableTask() {
    for (let i = 0; i < this.taskQueue.length; i++) {
      const task = this.taskQueue[i];

      // Check if dependencies are met
      if (task.canExecute(this.completedTasks)) {
        // Remove from queue and return
        this.taskQueue.splice(i, 1);
        return task;
      }
    }

    return null;
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    this.currentExecutingTasks.add(task.id);

    // Select best assistant for this task
    const assistant = this.selectAssistant(task);

    if (!assistant) {
      task.markFailed(new Error('No suitable assistant available'));
      this.currentExecutingTasks.delete(task.id);
      this.emit('task:failed', { task, reason: 'no_assistant' });
      return;
    }

    task.markStarted(assistant.id);
    this.emit('task:started', { task, assistantId: assistant.id });

    try {
      // Execute task with timeout
      const result = await Promise.race([
        this.executeTaskWithAssistant(task, assistant),
        this.createTaskTimeout(task)
      ]);

      task.markCompleted(result);
      this.completedTasks.add(task.id);
      this.stats.completedTasks++;

      // Update execution time stats
      const execTime = task.getExecutionTime();
      this.stats.totalExecutionTime += execTime;
      this.stats.avgTaskExecutionTime =
        this.stats.totalExecutionTime / this.stats.completedTasks;

      this.emit('task:completed', { task, result });

      // Check if workflow is completed
      this.checkWorkflowCompletion(task);

    } catch (error) {
      // Handle retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = TaskStatus.QUEUED;
        this.taskQueue.unshift(task); // Add to front of queue
        this.emit('task:retry', { task, attempt: task.retries, error });
      } else {
        task.markFailed(error);
        this.stats.failedTasks++;
        this.emit('task:failed', { task, error });

        // Check workflow failure
        this.checkWorkflowCompletion(task);
      }
    } finally {
      this.currentExecutingTasks.delete(task.id);
    }
  }

  /**
   * Execute task with a specific assistant
   */
  async executeTaskWithAssistant(task, assistant) {
    // Build prompt from task
    const prompt = this.buildTaskPrompt(task);

    // Chat with assistant
    const response = await assistant.chat(prompt, {
      maxTokens: 4000,
      context: {
        taskId: task.id,
        taskType: task.type
      }
    });

    return {
      content: response.response.content,
      metadata: {
        provider: response.response.provider,
        usage: response.response.usage,
        assistantId: assistant.id
      }
    };
  }

  /**
   * Create a timeout promise for a task
   */
  createTaskTimeout(task) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task timeout after ${task.timeout}ms`));
      }, task.timeout);
    });
  }

  /**
   * Build a prompt from a task
   */
  buildTaskPrompt(task) {
    let prompt = task.description;

    if (task.input && Object.keys(task.input).length > 0) {
      prompt += '\n\nInput:\n';
      prompt += JSON.stringify(task.input, null, 2);
    }

    // Include dependency outputs
    if (task.dependencies.length > 0) {
      prompt += '\n\nContext from previous tasks:\n';
      task.dependencies.forEach(depId => {
        const depTask = this.tasks.get(depId);
        if (depTask && depTask.output) {
          prompt += `\n[Task ${depId}]: ${JSON.stringify(depTask.output)}`;
        }
      });
    }

    return prompt;
  }

  /**
   * Select the best assistant for a task
   */
  selectAssistant(task) {
    const availableAssistants = Array.from(this.assistants.values());

    if (availableAssistants.length === 0) {
      return null;
    }

    // Strategy: Capability matching
    if (this.selectionStrategy === 'capability_match') {
      // Find assistants with matching capabilities
      const matchingAssistants = availableAssistants.filter(assistant => {
        const capabilities = this.assistantCapabilities.get(assistant.id) || [];
        return capabilities.length === 0 || capabilities.includes(task.type);
      });

      if (matchingAssistants.length > 0) {
        return this.loadBalancing
          ? this.selectLeastBusyAssistant(matchingAssistants)
          : matchingAssistants[0];
      }
    }

    // Strategy: Round-robin or least busy
    return this.loadBalancing
      ? this.selectLeastBusyAssistant(availableAssistants)
      : availableAssistants[0];
  }

  /**
   * Select the assistant with the least current load
   */
  selectLeastBusyAssistant(assistants) {
    // Count tasks currently assigned to each assistant
    const loads = new Map();

    for (const assistant of assistants) {
      loads.set(assistant.id, 0);
    }

    for (const taskId of this.currentExecutingTasks) {
      const task = this.tasks.get(taskId);
      if (task && task.assignedTo) {
        const current = loads.get(task.assignedTo) || 0;
        loads.set(task.assignedTo, current + 1);
      }
    }

    // Find assistant with minimum load
    let minLoad = Infinity;
    let selectedAssistant = assistants[0];

    for (const assistant of assistants) {
      const load = loads.get(assistant.id);
      if (load < minLoad) {
        minLoad = load;
        selectedAssistant = assistant;
      }
    }

    return selectedAssistant;
  }

  /**
   * Check if a workflow is completed
   */
  checkWorkflowCompletion(task) {
    // Find workflow containing this task
    for (const workflow of this.workflows.values()) {
      if (workflow.tasks.some(t => t.id === task.id)) {
        if (workflow.isCompleted()) {
          workflow.status = TaskStatus.COMPLETED;
          workflow.completedAt = new Date();
          this.stats.completedWorkflows++;

          this.emit('workflow:completed', { workflow });
        } else if (workflow.hasFailed()) {
          workflow.status = TaskStatus.FAILED;
          workflow.completedAt = new Date();

          this.emit('workflow:failed', { workflow });
        }
        break;
      }
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all tasks with optional filter
   */
  getTasks(filter = {}) {
    let tasks = Array.from(this.tasks.values());

    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }

    if (filter.type) {
      tasks = tasks.filter(t => t.type === filter.type);
    }

    if (filter.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === filter.assignedTo);
    }

    return tasks;
  }

  /**
   * Get director statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredAssistants: this.assistants.size,
      queuedTasks: this.taskQueue.length,
      executingTasks: this.currentExecutingTasks.size,
      activeWorkflows: this.workflows.size,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
      throw new Error(`Cannot cancel task in ${task.status} state`);
    }

    task.status = TaskStatus.CANCELLED;

    // Remove from queue if queued
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emit('task:cancelled', { task });

    return task;
  }

  /**
   * Pause processing
   */
  pause() {
    this.isProcessing = false;
    this.emit('processing:paused');
  }

  /**
   * Resume processing
   */
  resume() {
    if (!this.isProcessing && (this.taskQueue.length > 0 || this.currentExecutingTasks.size > 0)) {
      this.startProcessing();
    }
  }

  /**
   * Clear all completed tasks and workflows
   */
  clearCompleted() {
    // Clear completed tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
        this.tasks.delete(taskId);
      }
    }

    // Clear completed workflows
    for (const [workflowId, workflow] of this.workflows.entries()) {
      if (workflow.status === TaskStatus.COMPLETED || workflow.status === TaskStatus.FAILED) {
        this.workflows.delete(workflowId);
      }
    }

    this.completedTasks.clear();

    this.emit('cleanup:completed');
  }
}

module.exports = {
  Director,
  Task,
  Workflow,
  TaskPriority,
  TaskStatus,
  ExecutionStrategy
};