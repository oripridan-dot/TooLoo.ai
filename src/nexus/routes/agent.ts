// @version 3.3.196
/**
 * Agent API Routes
 *
 * REST API for the Agent Execution System.
 * Enables external systems and UI to submit tasks,
 * run processes, and manage artifacts.
 *
 * V3.3.54: Added POST /artifacts endpoint for creating artifacts from chat
 * V3.3.17: Integrated with System Execution Hub and Team Framework
 * - All tasks now go through team validation (executor + validator pairs)
 * - Cross-system execution support
 * V3.3.196: Added Smart Execution Orchestrator endpoints
 * - Full sprint-based execution with progress streaming
 * - Quality > Performance > Efficiency > Cost optimization
 *
 * @module nexus/routes/agent
 */

import { Router, Request, Response } from 'express';
import { executionAgent } from '../../cortex/agent/execution-agent.js';
import { taskProcessor } from '../../cortex/agent/task-processor.js';
import { artifactManager } from '../../cortex/agent/artifact-manager.js';
import { systemExecutionHub, teamRegistry, smartOrchestrator } from '../../cortex/agent/index.js';
import type { TaskType, TaskInput, ProcessDefinition } from '../../cortex/agent/types.js';

const router = Router();

// ============= Task Endpoints =============

/**
 * @route POST /api/v1/agent/task
 * @description Submit a task for execution
 * @param {string} type - Task type
 * @param {string} name - Task name
 * @param {object} input - Task input data
 * @param {string} [description] - Optional description
 * @param {object} [options] - Optional execution options
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
 * @route POST /api/v1/agent/task/team-execute
 * @description Execute a task with team validation (executor + validator pair)
 * V3.3.17: Uses System Execution Hub for quality-assured execution
 */
router.post('/task/team-execute', async (req: Request, res: Response) => {
  try {
    const { type, prompt, code, context, options } = req.body as {
      type: TaskType;
      prompt: string;
      code?: string;
      context?: Record<string, unknown>;
      options?: {
        source?: string;
        useTeam?: boolean;
        teamSpecialization?: string;
        qualityThreshold?: number;
        maxIterations?: number;
      };
    };

    if (!type || !prompt) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: type, prompt',
      });
      return;
    }

    // Execute through System Execution Hub with team validation
    const response = await systemExecutionHub.execute({
      source: (options?.source as any) || 'api',
      type,
      prompt,
      code,
      context,
      options: {
        useTeam: options?.useTeam !== false, // Default to team execution
        teamSpecialization: options?.teamSpecialization,
        qualityThreshold: options?.qualityThreshold || 0.8,
        maxIterations: options?.maxIterations || 3,
        saveArtifacts: true,
      },
      priority: 'normal',
    });

    res.json({
      ok: response.success,
      data: {
        requestId: response.requestId,
        output: response.output,
        artifacts: response.artifacts,
        teamId: response.teamId,
        iterations: response.iterations,
        qualityScore: response.qualityScore,
        durationMs: response.durationMs,
        metadata: response.metadata,
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
 * @route GET /api/v1/agent/teams
 * @description Get all active agent teams
 * V3.3.17: Shows executor+validator team pairs
 */
router.get('/teams', (_req: Request, res: Response) => {
  try {
    const teams = teamRegistry.getAllTeams();
    const stats = systemExecutionHub.getStats();

    res.json({
      ok: true,
      data: {
        teams: teams.map((t) => ({
          id: t.id,
          name: t.name,
          specialization: t.purpose,
          status: t.status,
          roles: {
            executor: t.executor,
            validator: t.validator,
          },
          metrics: t.metrics,
        })),
        stats,
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
 * @route GET /api/v1/agent/task/:taskId
 * @description Get task details
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  try {
    const task = taskProcessor.getTask(req.params['taskId'] || '');

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
    const cancelled = taskProcessor.cancelTask(req.params['taskId'] || '');

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
    const limit = parseInt(req.query['limit'] as string) || 50;
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
 * @route POST /api/v1/agent/artifacts
 * @description Create a new artifact
 */
router.post('/artifacts', async (req: Request, res: Response) => {
  try {
    const { type, name, content, language, description, metadata, tags } = req.body;

    if (!type || !content) {
      res.status(400).json({
        ok: false,
        error: 'Missing required fields: type, content',
      });
      return;
    }

    const artifact = await artifactManager.createArtifact({
      type,
      name: name || `artifact-${Date.now()}`,
      content,
      language,
      description,
      createdBy: 'chat-ui',
      metadata,
      tags,
    });

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
    const artifact = await artifactManager.getArtifact(req.params['artifactId'] || '');

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
    const versions = await artifactManager.getVersions(req.params['artifactId'] || '');

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
    const deleted = await artifactManager.deleteArtifact(req.params['artifactId'] || '');

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

// ============= Execution Dashboard =============

/**
 * @route GET /api/v1/agent/dashboard
 * @description Get comprehensive execution activity across all systems
 * Shows all executed code, artifacts, teams, and system-wide metrics
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    // Get agent state
    const agentState = executionAgent.getState();

    // Get all teams
    const teams = teamRegistry.getAllTeams();

    // Get system hub stats
    const hubStats = systemExecutionHub.getStats();

    // Get artifacts
    const artifactStats = artifactManager.getStats();
    const recentArtifacts = await artifactManager.listArtifacts({ limit: 10 });

    // Get task history
    const taskHistory = taskProcessor.getHistory(20);

    // Get queue status
    const queueStatus = taskProcessor.getQueueStatus();

    // Build comprehensive dashboard
    const dashboard = {
      // Overall Status
      status: {
        agentRunning: agentState.running,
        currentTask: agentState.currentTask,
        queueLength: queueStatus.pending,
        activeTeams: teams.filter((t) => t.status !== 'idle').length,
        totalTeams: teams.length,
      },

      // Execution Metrics
      metrics: {
        totalTasksExecuted: agentState.totalTasksExecuted,
        successRate: (agentState.successRate * 100).toFixed(1) + '%',
        totalArtifacts: artifactStats.totalArtifacts,
        hubRequests: hubStats.totalRequests,
        hubSuccessRate:
          hubStats.totalRequests > 0
            ? ((hubStats.successfulRequests / hubStats.totalRequests) * 100).toFixed(1) + '%'
            : 'N/A',
        avgDurationMs: hubStats.avgDurationMs.toFixed(0),
        avgQualityScore: hubStats.avgQualityScore.toFixed(2),
      },

      // Recent Executions (Last 10 tasks)
      recentExecutions: taskHistory.map((task) => ({
        id: task.id,
        type: task.type,
        name: task.name,
        status: task.status,
        success: task.result?.success,
        duration: task.result?.metrics?.durationMs,
        output:
          task.result?.output?.substring(0, 200) +
          ((task.result?.output?.length || 0) > 200 ? '...' : ''),
        completedAt: task.completedAt,
      })),

      // Recent Artifacts (Code generated/executed)
      recentArtifacts: recentArtifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        name: artifact.name,
        description: artifact.description,
        language: artifact.language,
        contentPreview:
          artifact.content?.substring(0, 300) +
          ((artifact.content?.length || 0) > 300 ? '...' : ''),
        createdAt: artifact.createdAt,
        tags: artifact.tags,
      })),

      // Active Teams
      activeTeams: teams
        .filter((t) => t.status !== 'idle')
        .map((team) => ({
          id: team.id,
          name: team.name,
          specialization: team.purpose,
          status: team.status,
          currentTask: team.currentTask,
          metrics: team.metrics,
        })),

      // By Source Breakdown (which systems are using execution)
      bySource: hubStats.bySource,

      // By Type Breakdown (what kinds of tasks)
      byType: hubStats.byType,

      // Current Queue
      queue:
        queueStatus.pending > 0
          ? taskProcessor.getQueue().map((task) => ({
              id: task.id,
              type: task.type,
              name: task.name,
              status: task.status,
              priority: (task as any).priority,
              createdAt: task.createdAt,
            }))
          : [],
    };

    res.json({
      ok: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/v1/agent/executions
 * @description Get detailed execution logs with full code content
 */
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query['limit'] as string) || 20;
    const includeCode = req.query['includeCode'] !== 'false';

    // Get task history
    const taskHistory = taskProcessor.getHistory(limit);

    // Get artifacts for code content
    const artifactsList = await artifactManager.listArtifacts({ limit: limit * 2 });

    // Build detailed executions list
    const executions = taskHistory.map((task) => {
      // Find related artifacts
      const relatedArtifacts = task.result?.artifacts || [];
      const artifactDetails = relatedArtifacts
        .map((artifact) => {
          return {
            id: artifact.id,
            type: artifact.type,
            name: artifact.name,
            language: artifact.language,
            content: artifact.content,
            path: artifact.path,
          };
        })
        .filter(Boolean);

      return {
        id: task.id,
        type: task.type,
        name: task.name,
        description: task.description,
        status: task.status,
        input: {
          prompt: task.input?.prompt?.substring(0, 500),
          code: includeCode ? task.input?.code : task.input?.code ? '[code present]' : undefined,
          language: task.input?.language,
        },
        result: {
          success: task.result?.success,
          output: task.result?.output,
          logs: task.result?.logs,
          metrics: task.result?.metrics,
        },
        artifacts: artifactDetails,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
      };
    });

    res.json({
      ok: true,
      data: {
        executions,
        count: executions.length,
        hasMore: taskHistory.length >= limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SMART EXECUTION ORCHESTRATOR ENDPOINTS - V3.3.196
// Intelligent execution with human-friendly progress and sprint-based approach
// ============================================================================

/**
 * @route POST /api/v1/agent/smart-execute
 * @description Execute a task with full smart orchestration
 * Uses sprint-based execution with quality > performance > efficiency > cost optimization
 * Returns detailed progress updates and comprehensive results
 */
router.post('/smart-execute', async (req: Request, res: Response) => {
  try {
    const {
      objective,
      type = 'execute',
      code,
      language,
      context,
      priorities,
      qualityThreshold = 0.85,
      maxSprints = 5,
      timeout = 120000,
      verbose = true,
    } = req.body;

    if (!objective && !code) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: objective or code',
      });
      return;
    }

    console.log(`[Agent API] Smart execution request: ${objective?.substring(0, 100) || 'code execution'}...`);

    const response = await smartOrchestrator.execute({
      objective: objective || `Execute ${language || 'code'}: ${code?.substring(0, 100)}...`,
      type: type as TaskType,
      code,
      language,
      context,
      priorities,
      qualityThreshold,
      maxSprints,
      timeout,
      verbose,
    });

    res.json({
      ok: response.success,
      data: {
        id: response.id,
        success: response.success,
        output: response.output,
        sprints: response.sprints.map((s) => ({
          number: s.number,
          objective: s.objective,
          status: s.status,
          qualityScore: s.qualityScore,
          durationMs: s.durationMs,
        })),
        totalSprints: response.totalSprints,
        qualityScore: response.qualityScore,
        artifacts: response.artifacts,
        totalDurationMs: response.totalDurationMs,
        finalStatus: response.finalStatus,
        optimization: response.optimization,
        teamId: response.teamId,
        recommendations: response.recommendations,
        errors: response.errors,
      },
    });
  } catch (error: any) {
    console.error('[Agent API] Smart execution error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/v1/agent/smart-execute/stream
 * @description Execute with streaming progress updates (Server-Sent Events)
 * Real-time human-friendly status updates throughout execution
 */
router.post('/smart-execute/stream', async (req: Request, res: Response) => {
  try {
    const {
      objective,
      type = 'execute',
      code,
      language,
      context,
      priorities,
      qualityThreshold = 0.85,
      maxSprints = 5,
      timeout = 120000,
    } = req.body;

    if (!objective && !code) {
      res.status(400).json({
        ok: false,
        error: 'Missing required field: objective or code',
      });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const executionId = `smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Subscribe to progress updates
    smartOrchestrator.subscribeToProgress(executionId, (update) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    });

    // Start execution
    const response = await smartOrchestrator.execute({
      id: executionId,
      objective: objective || `Execute ${language || 'code'}: ${code?.substring(0, 100)}...`,
      type: type as TaskType,
      code,
      language,
      context,
      priorities,
      qualityThreshold,
      maxSprints,
      timeout,
      verbose: true,
      streamProgress: true,
    });

    // Send final result
    res.write(`event: complete\n`);
    res.write(`data: ${JSON.stringify({
      success: response.success,
      output: response.output,
      qualityScore: response.qualityScore,
      totalSprints: response.totalSprints,
      totalDurationMs: response.totalDurationMs,
      recommendations: response.recommendations,
    })}\n\n`);

    res.end();
  } catch (error: any) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * @route GET /api/v1/agent/smart-execute/active
 * @description Get all active smart executions
 */
router.get('/smart-execute/active', (_req: Request, res: Response) => {
  try {
    const active = smartOrchestrator.getActiveExecutions();

    res.json({
      ok: true,
      data: {
        executions: active.map((e) => ({
          id: e.id,
          objective: e.objective?.substring(0, 200),
          type: e.type,
          qualityThreshold: e.qualityThreshold,
          maxSprints: e.maxSprints,
        })),
        count: active.length,
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
 * @route GET /api/v1/agent/smart-execute/history
 * @description Get smart execution history
 */
router.get('/smart-execute/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query['limit'] as string) || '20', 10);
    const history = smartOrchestrator.getExecutionHistory(limit);

    res.json({
      ok: true,
      data: {
        executions: history.map((h) => ({
          id: h.id,
          success: h.success,
          qualityScore: h.qualityScore,
          totalSprints: h.totalSprints,
          totalDurationMs: h.totalDurationMs,
          finalStatus: h.finalStatus,
          recommendations: h.recommendations,
        })),
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

export default router;
