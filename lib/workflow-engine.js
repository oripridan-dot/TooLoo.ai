import { v4 as uuidv4 } from 'uuid';

export class WorkflowEngine {
  constructor() {
    this.workflows = new Map();
    this.executionHistory = [];
    this.activeExecutions = new Map();
  }

  createWorkflow(name, description, steps) {
    const id = uuidv4();

    const workflow = {
      id,
      name,
      description,
      steps,
      createdAt: Date.now(),
      status: 'draft',
      version: 1,
    };

    // Validate workflow
    const validation = this.validateWorkflow(workflow);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors };
    }

    this.workflows.set(id, workflow);

    return {
      valid: true,
      workflowId: id,
      workflow,
    };
  }

  validateWorkflow(workflow) {
    const errors = [];

    if (!workflow.name || workflow.name.length === 0) {
      errors.push('Workflow must have a name');
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    for (const step of workflow.steps || []) {
      if (!step.id || !step.action) {
        errors.push('Each step must have an id and action');
      }

      if (step.dependencies && !Array.isArray(step.dependencies)) {
        errors.push(`Step ${step.id} has invalid dependencies`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const executionId = uuidv4();
    const execution = {
      id: executionId,
      workflowId,
      startTime: Date.now(),
      status: 'running',
      context,
      stepResults: {},
      errors: [],
    };

    this.activeExecutions.set(executionId, execution);

    // Execute steps in order with dependency tracking
    const executedSteps = new Set();

    for (const step of workflow.steps) {
      // Check dependencies
      if (step.dependencies && step.dependencies.length > 0) {
        const allDependenciesMet = step.dependencies.every((dep) => executedSteps.has(dep));
        if (!allDependenciesMet) {
          execution.errors.push(`Step ${step.id} dependencies not met`);
          continue;
        }
      }

      // Execute step
      const result = this.executeStep(step, execution.context, execution.stepResults);

      execution.stepResults[step.id] = result;
      if (result.success) {
        executedSteps.add(step.id);
      } else {
        if (step.continueOnError !== true) {
          execution.errors.push(`Step ${step.id} failed: ${result.error}`);
          break;
        }
      }
    }

    execution.endTime = Date.now();
    execution.status = execution.errors.length > 0 ? 'failed' : 'completed';
    execution.duration = execution.endTime - execution.startTime;

    this.executionHistory.push(execution);
    this.activeExecutions.delete(executionId);

    return {
      success: execution.errors.length === 0,
      executionId,
      status: execution.status,
      results: execution.stepResults,
      errors: execution.errors,
      duration: execution.duration,
    };
  }

  executeStep(step, context, previousResults) {
    try {
      // Simulate step execution
      const result = {
        stepId: step.id,
        action: step.action,
        timestamp: Date.now(),
        success: true,
        output: {},
      };

      // Perform action-specific logic
      if (step.action === 'fetch') {
        result.output.data = { mockData: 'Sample data from ' + (step.url || 'endpoint') };
      } else if (step.action === 'transform') {
        result.output.data = previousResults[step.inputFrom]?.output?.data || {};
      } else if (step.action === 'validate') {
        result.output.isValid = true;
      } else if (step.action === 'notify') {
        result.output.sent = true;
      } else {
        result.output.executed = true;
      }

      return result;
    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error.message,
      };
    }
  }

  getWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      stepCount: workflow.steps.length,
      status: workflow.status,
      version: workflow.version,
      createdAt: new Date(workflow.createdAt).toISOString(),
    };
  }

  updateWorkflow(workflowId, updates) {
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }

    const updated = {
      ...workflow,
      ...updates,
      version: workflow.version + 1,
    };

    const validation = this.validateWorkflow(updated);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    this.workflows.set(workflowId, updated);

    return { success: true, workflow: updated };
  }

  deleteWorkflow(workflowId) {
    const deleted = this.workflows.delete(workflowId);

    return { success: deleted };
  }

  getExecutionStatus(executionId) {
    const execution = this.executionHistory.find((e) => e.id === executionId);

    if (!execution) {
      return null;
    }

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startTime: new Date(execution.startTime).toISOString(),
      endTime: execution.endTime ? new Date(execution.endTime).toISOString() : null,
      duration: execution.duration,
      stepCount: Object.keys(execution.stepResults).length,
      errors: execution.errors,
    };
  }

  listWorkflows() {
    return Array.from(this.workflows.values()).map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      stepCount: workflow.steps.length,
      status: workflow.status,
      version: workflow.version,
    }));
  }

  getExecutionHistory(limit = 10) {
    return this.executionHistory
      .slice(-limit)
      .reverse()
      .map((execution) => ({
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        startTime: new Date(execution.startTime).toISOString(),
        duration: execution.duration,
        stepCount: Object.keys(execution.stepResults).length,
      }));
  }

  getWorkflowStats() {
    const totalWorkflows = this.workflows.size;
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter((e) => e.status === 'completed').length;
    const avgDuration = totalExecutions > 0 ? 
      (this.executionHistory.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions).toFixed(0) :
      0;

    return {
      totalWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate: totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(1) : 0,
      avgDuration: parseInt(avgDuration),
    };
  }

  clearHistory() {
    this.executionHistory = [];
  }
}

export default WorkflowEngine;
