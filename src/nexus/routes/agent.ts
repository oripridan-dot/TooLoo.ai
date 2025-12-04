// @version 2.2.677
/**
 * Agent API Routes
 *
 * REST API for the Agent Execution System.
 * Enables external systems and UI to submit tasks,
 * run processes, and manage artifacts.
 *
 * @module nexus/routes/agent
 */

import { Router, Request, Response } from 'express';
import { executionAgent } from '../../cortex/agent/execution-agent.js';
import { taskProcessor } from '../../cortex/agent/task-processor.js';
import { artifactManager } from '../../cortex/agent/artifact-manager.js';
import type { TaskType, TaskInput, ProcessDefinition } from '../../cortex/agent/types.js';

const router = Router();

// ============= Task Endpoints =============

/**
 * @route POST /api/v1/agent/task
 * @description Submit a task for execution
 */
router.post('/task', async (req: Request, res: Response) => {
  try {
    const { type, name, description, input, options } = req.body as {
      type: TaskType;
      name: string;
      description?: string;
      input: TaskInput;
      options?: Record<string, unknown>;
    };

    if (!type || !name || !input) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: type, name, input',
      });
      return;
    }

    const task = await executionAgent.submitTask({
      type,
      name,
      description,
      input,
      options,
    });

    res.json({
      ok: true,
      data: {
        taskId: task.id,
        status: task.status,
        message: 'Task queued successfully',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route POST /api/v1/agent/task/execute
 * @description Execute a task immediately (synchronous)
 */
router.post('/task/execute', async (req: Request, res: Response) => {
  try {
    const { type, name, description, input, options } = req.body as {
      type: TaskType;
      name: string;
      description?: string;
      input: TaskInput;
      options?: Record<string, unknown>;
    };

    if (!type || !name || !input) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: type, name, input',
      });
      return;
    }

    // Create task
    const task = taskProcessor.createTask({
      type,
      name,
      description,
      input,
      options: { ...options, autoApprove: true },
    });

    // Start and execute immediately
    taskProcessor.startTask(task.id);
    const result = await executionAgent.executeTask(task);
    taskProcessor.completeTask(task.id, result);

    res.json({
      ok: result.success,
      data: {
        taskId: task.id,
        result,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      error: errMsg,
    });
  }
});

/**
 * @route GET /api/v1/agent/task/:taskId
 * @description Get task details
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  try {
    const task = taskProcessor.getTask(req.params.taskId);

    if (!task) {
      res.status(404).json({
        ok: false,
        error: 'Task not found',
      });
      return;
    }

    res.json({
      ok: true,
      data: task,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/v1/agent/task/:taskId
 * @description Cancel a pending task
 */
router.delete('/task/:taskId', (req: Request, res: Response) => {
  try {
    const cancelled = taskProcessor.cancelTask(req.params.taskId);

    res.json({
      ok: cancelled,
      message: cancelled ? 'Task cancelled' : 'Could not cancel task',
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============= Queue Endpoints =============

/**
 * @route GET /api/v1/agent/queue
 * @description Get current task queue
 */
router.get('/queue', (_req: Request, res: Response) => {
  try {
    const queue = taskProcessor.getQueue();
    const status = taskProcessor.getQueueStatus();

    res.json({
      ok: true,
      data: {
        ...status,
        tasks: queue,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/v1/agent/queue
 * @description Clear pending tasks from queue
 */
router.delete('/queue', (_req: Request, res: Response) => {
  try {
    const cleared = taskProcessor.clearQueue();

    res.json({
      ok: true,
      data: {
        clearedCount: cleared,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============= History Endpoints =============

/**
 * @route GET /api/v1/agent/history
 * @description Get task history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = taskProcessor.getHistory(limit);

    res.json({
      ok: true,
      data: {
        tasks: history,
        count: history.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============= Process Endpoints =============

/**
 * @route POST /api/v1/agent/process
 * @description Run a multi-step process
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const definition = req.body as ProcessDefinition;

    if (!definition.id || !definition.name || !definition.steps) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: id, name, steps',
      });
      return;
    }

    const execution = await executionAgent.runProcess(definition);

    res.json({
      ok: execution.status === 'completed',
      data: {
        executionId: execution.id,
        processName: execution.processName,
        status: execution.status,
        completedSteps: execution.completedSteps,
        failedSteps: execution.failedSteps,
        error: execution.error,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============= Artifact Endpoints =============

/**
 * @route GET /api/v1/agent/artifacts
 * @description List artifacts
 */
router.get('/artifacts', async (req: Request, res: Response) => {
  try {
    const { type, language, tags, limit } = req.query;

    const artifacts = await artifactManager.listArtifacts({
      type: type as any,
      language: language as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      ok: true,
      data: {
        artifacts,
        count: artifacts.length,
        stats: artifactManager.getStats(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/agent/artifacts/:artifactId
 * @description Get artifact details
 */
router.get('/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const artifact = await artifactManager.getArtifact(req.params.artifactId);

    if (!artifact) {
      res.status(404).json({
        ok: false,
        error: 'Artifact not found',
      });
      return;
    }

    res.json({
      ok: true,
      data: artifact,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/agent/artifacts/:artifactId/versions
 * @description Get artifact version history
 */
router.get('/artifacts/:artifactId/versions', async (req: Request, res: Response) => {
  try {
    const versions = await artifactManager.getVersions(req.params.artifactId);

    res.json({
      ok: true,
      data: {
        versions,
        count: versions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/v1/agent/artifacts/:artifactId
 * @description Delete an artifact
 */
router.delete('/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const deleted = await artifactManager.deleteArtifact(req.params.artifactId);

    res.json({
      ok: deleted,
      message: deleted ? 'Artifact deleted' : 'Artifact not found',
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============= Agent Control Endpoints =============

/**
 * @route GET /api/v1/agent/status
 * @description Get agent status and state
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const state = executionAgent.getState();
    const stats = taskProcessor.getStats();

    res.json({
      ok: true,
      data: {
        running: state.running,
        currentTask: state.currentTask,
        queueLength: state.taskQueue.length,
        activeProcesses: state.activeProcesses.length,
        artifactCount: state.artifactCount,
        stats: {
          totalProcessed: stats.totalProcessed,
          successRate: stats.successRate,
          averageDurationMs: stats.averageDurationMs,
          byType: stats.byType,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/v1/agent/start
 * @description Start the agent execution loop
 */
router.post('/start', (_req: Request, res: Response) => {
  try {
    executionAgent.start();

    res.json({
      ok: true,
      message: 'Agent started',
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/v1/agent/stop
 * @description Stop the agent execution loop
 */
router.post('/stop', (_req: Request, res: Response) => {
  try {
    executionAgent.stop();

    res.json({
      ok: true,
      message: 'Agent stopped',
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
