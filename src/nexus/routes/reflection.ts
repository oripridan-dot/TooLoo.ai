// @version 3.3.195
/* eslint-disable no-console */
/**
 * TooLoo Reflection API Routes
 *
 * HTTP API for the reflection sandbox and autonomous development system.
 * Provides endpoints for:
 *
 * - Sandbox lifecycle management (start, stop, status)
 * - Reflection task execution (execute→test→refine loop)
 * - Handoff artifact management (prepare, review, execute)
 * - Session management and history
 *
 * @module nexus/routes/reflection
 */

import { Router, Request, Response } from 'express';
import { reflectionSandbox } from '../../cortex/self-modification/reflection-sandbox.js';
import { reflectionLoop } from '../../cortex/self-modification/reflection-loop.js';
import { handoffProtocol, ReviewResult } from '../../cortex/self-modification/handoff-protocol.js';
import { autonomousMod, parseCodeSuggestions } from '../../cortex/motor/autonomous-modifier.js';

const router = Router();

// ============================================================================
// HELPERS
// ============================================================================

function successResponse(data: unknown) {
  return { success: true, data };
}

function errorResponse(message: string, details?: unknown) {
  return { success: false, error: message, details };
}

// ============================================================================
// SANDBOX LIFECYCLE
// ============================================================================

/**
 * @route GET /api/v1/reflection/sandbox/status
 * @description Get current sandbox status
 */
router.get('/sandbox/status', async (_req: Request, res: Response) => {
  try {
    const state = reflectionSandbox.getState();
    res.json(successResponse(state));
  } catch (error) {
    console.error('[Reflection API] Status error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get status'));
  }
});

/**
 * @route POST /api/v1/reflection/sandbox/start
 * @description Start the reflection sandbox
 */
router.post('/sandbox/start', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Starting sandbox...');
    await reflectionSandbox.start();
    const state = reflectionSandbox.getState();
    res.json(
      successResponse({
        message: 'Sandbox started',
        state,
      })
    );
  } catch (error) {
    console.error('[Reflection API] Start error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to start sandbox'));
  }
});

/**
 * @route POST /api/v1/reflection/sandbox/stop
 * @description Stop the reflection sandbox (container persists)
 */
router.post('/sandbox/stop', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Stopping sandbox...');
    await reflectionSandbox.stop();
    res.json(successResponse({ message: 'Sandbox stopped' }));
  } catch (error) {
    console.error('[Reflection API] Stop error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to stop sandbox'));
  }
});

/**
 * @route POST /api/v1/reflection/sandbox/destroy
 * @description Destroy the sandbox completely (removes container and volume)
 */
router.post('/sandbox/destroy', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Destroying sandbox...');
    await reflectionSandbox.destroy();
    res.json(successResponse({ message: 'Sandbox destroyed' }));
  } catch (error) {
    console.error('[Reflection API] Destroy error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to destroy sandbox'));
  }
});

/**
 * @route POST /api/v1/reflection/sandbox/sync
 * @description Sync files from host to sandbox
 * @body paths - Optional array of specific paths to sync
 */
router.post('/sandbox/sync', async (req: Request, res: Response) => {
  const { paths } = req.body;

  try {
    console.log('[Reflection API] Syncing sandbox...');
    await reflectionSandbox.syncFromHost(paths);
    res.json(
      successResponse({
        message: 'Sandbox synced',
        paths: paths || 'all',
      })
    );
  } catch (error) {
    console.error('[Reflection API] Sync error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to sync sandbox'));
  }
});

/**
 * @route POST /api/v1/reflection/sandbox/exec
 * @description Execute a command in the sandbox
 * @body command - Command to execute
 * @body timeout - Optional timeout in ms
 */
router.post('/sandbox/exec', async (req: Request, res: Response) => {
  const { command, timeout } = req.body;

  if (!command) {
    return res.status(400).json(errorResponse('Command is required'));
  }

  try {
    const result = await reflectionSandbox.execInContainer(command, { timeout });
    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Exec error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Command execution failed'));
  }
});

// ============================================================================
// REFLECTION TASKS
// ============================================================================

/**
 * @route POST /api/v1/reflection/execute
 * @description Execute a reflection task (execute→test→refine loop)
 * @body objective - What to accomplish
 * @body targetFiles - Array of files to modify
 * @body context - Code or context for the task
 * @body maxIterations - Optional max refinement iterations
 * @body autoPromote - Optional auto-promote on success
 */
router.post('/execute', async (req: Request, res: Response) => {
  const { objective, targetFiles, context, maxIterations, autoPromote } = req.body;

  if (!objective) {
    return res.status(400).json(errorResponse('Objective is required'));
  }

  try {
    console.log(`[Reflection API] Executing task: ${objective}`);

    const result = await reflectionLoop.execute({
      objective,
      targetFiles: targetFiles || [],
      context: context || '',
      maxIterations,
      autoPromote,
    });

    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Execute error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Task execution failed'));
  }
});

/**
 * @route POST /api/v1/reflection/execute-sandboxed
 * @description Execute code suggestions through sandboxed modification flow
 * @body aiResponse - AI response containing code blocks
 * @body sessionId - Session ID for tracking
 * @body objective - Optional objective description
 */
router.post('/execute-sandboxed', async (req: Request, res: Response) => {
  const { aiResponse, sessionId, objective, maxIterations, autoPromote } = req.body;

  if (!aiResponse) {
    return res.status(400).json(errorResponse('aiResponse is required'));
  }

  try {
    // Parse code suggestions from AI response
    const suggestions = parseCodeSuggestions(aiResponse);

    if (suggestions.length === 0) {
      return res.json(
        successResponse({
          message: 'No code suggestions found in response',
          suggestions: [],
        })
      );
    }

    console.log(`[Reflection API] Sandboxed execute: ${suggestions.length} suggestions`);

    // Execute through sandboxed flow
    const result = await autonomousMod.sandboxedApply(suggestions, {
      sessionId: sessionId || 'api',
      userQuery: objective || 'API request',
      objective,
      maxIterations,
      autoPromote,
    });

    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Sandboxed execute error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Sandboxed execution failed'));
  }
});

/**
 * @route GET /api/v1/reflection/tasks
 * @description Get active reflection tasks
 */
router.get('/tasks', async (_req: Request, res: Response) => {
  try {
    const tasks = reflectionLoop.getActiveTasks();
    res.json(successResponse({ tasks }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get tasks'));
  }
});

/**
 * @route GET /api/v1/reflection/result/:taskId
 * @description Get result for a reflection task
 */
router.get('/result/:taskId', async (req: Request, res: Response) => {
  const taskId = req.params['taskId'] || '';

  try {
    const result = reflectionLoop.getResult(taskId);
    if (!result) {
      return res.status(404).json(errorResponse('Task not found'));
    }
    res.json(successResponse(result));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get result'));
  }
});

/**
 * @route GET /api/v1/reflection/diff/:taskId
 * @description Get diff for a completed task
 */
router.get('/diff/:taskId', async (req: Request, res: Response) => {
  const taskId = req.params['taskId'] || '';

  try {
    const diff = await reflectionLoop.getDiff(taskId);
    if (!diff) {
      return res.status(404).json(errorResponse('Diff not found'));
    }
    res.json(successResponse({ diff }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get diff'));
  }
});

// ============================================================================
// HANDOFF MANAGEMENT
// ============================================================================

/**
 * @route POST /api/v1/reflection/handoff/prepare
 * @description Prepare a handoff artifact from a reflection result
 * @body taskId - Task ID to prepare handoff for
 * @body objective - Optional objective override
 */
router.post('/handoff/prepare', async (req: Request, res: Response) => {
  const { taskId, objective, metadata } = req.body;

  if (!taskId) {
    return res.status(400).json(errorResponse('taskId is required'));
  }

  try {
    const result = reflectionLoop.getResult(taskId);
    if (!result) {
      return res.status(404).json(errorResponse('Task result not found'));
    }

    if (!result.readyForPromotion) {
      return res.status(400).json(
        errorResponse('Task is not ready for promotion', {
          status: result.status,
          summary: result.summary,
        })
      );
    }

    const artifact = await handoffProtocol.prepare(result, { objective, metadata });
    res.json(successResponse(artifact));
  } catch (error) {
    console.error('[Reflection API] Prepare handoff error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to prepare handoff'));
  }
});

/**
 * @route GET /api/v1/reflection/handoff/pending
 * @description Get pending handoff artifacts
 */
router.get('/handoff/pending', async (_req: Request, res: Response) => {
  try {
    const artifacts = handoffProtocol.getPendingArtifacts();
    res.json(successResponse({ artifacts }));
  } catch (error) {
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : 'Failed to get pending artifacts')
      );
  }
});

/**
 * @route GET /api/v1/reflection/handoff/:artifactId
 * @description Get a specific handoff artifact
 */
router.get('/handoff/:artifactId', async (req: Request, res: Response) => {
  const artifactId = req.params['artifactId'] || '';

  try {
    const artifact = handoffProtocol.getArtifact(artifactId);
    if (!artifact) {
      return res.status(404).json(errorResponse('Artifact not found'));
    }
    res.json(successResponse(artifact));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get artifact'));
  }
});

/**
 * @route POST /api/v1/reflection/handoff/:artifactId/review
 * @description Review a handoff artifact
 * @body approved - Whether to approve
 * @body reviewer - Reviewer identifier
 * @body comments - Review comments
 * @body approvedFiles - Optional array of specific files to approve
 */
router.post('/handoff/:artifactId/review', async (req: Request, res: Response) => {
  const artifactId = req.params['artifactId'] || '';
  const { approved, reviewer, comments, approvedFiles } = req.body;

  if (approved === undefined) {
    return res.status(400).json(errorResponse('approved is required'));
  }

  try {
    const review: ReviewResult = {
      approved,
      reviewer: reviewer || 'api',
      timestamp: Date.now(),
      comments: comments || '',
      approvedFiles,
    };

    const artifact = await handoffProtocol.review(artifactId, review);
    res.json(successResponse(artifact));
  } catch (error) {
    console.error('[Reflection API] Review error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to review artifact'));
  }
});

/**
 * @route POST /api/v1/reflection/handoff/:artifactId/execute
 * @description Execute a handoff (apply to production)
 * @body skipApprovalCheck - Optional skip approval check
 */
router.post('/handoff/:artifactId/execute', async (req: Request, res: Response) => {
  const artifactId = req.params['artifactId'] || '';
  const { skipApprovalCheck } = req.body;

  try {
    console.log(`[Reflection API] Executing handoff: ${artifactId}`);
    const result = await handoffProtocol.execute(artifactId, { skipApprovalCheck });
    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Execute handoff error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to execute handoff'));
  }
});

/**
 * @route POST /api/v1/reflection/handoff/:artifactId/rollback
 * @description Rollback a completed handoff
 */
router.post('/handoff/:artifactId/rollback', async (req: Request, res: Response) => {
  const artifactId = req.params['artifactId'] || '';

  try {
    console.log(`[Reflection API] Rolling back handoff: ${artifactId}`);
    const result = await handoffProtocol.rollback(artifactId);
    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Rollback error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to rollback'));
  }
});

/**
 * @route GET /api/v1/reflection/handoff/history
 * @description Get handoff history
 */
router.get('/handoff/history', async (_req: Request, res: Response) => {
  try {
    const history = handoffProtocol.getHistory();
    res.json(successResponse({ history }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get history'));
  }
});

// ============================================================================
// TESTING IN SANDBOX
// ============================================================================

/**
 * @route POST /api/v1/reflection/test
 * @description Run tests in the sandbox
 * @body pattern - Optional test pattern/grep
 */
router.post('/test', async (req: Request, res: Response) => {
  const { pattern } = req.body;

  try {
    console.log('[Reflection API] Running tests in sandbox...');
    const result = await reflectionSandbox.runTests(pattern);
    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] Test error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : 'Tests failed'));
  }
});

/**
 * @route POST /api/v1/reflection/typecheck
 * @description Run TypeScript check in sandbox
 */
router.post('/typecheck', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Running TypeScript check in sandbox...');
    const result = await reflectionSandbox.typeCheck();
    res.json(successResponse(result));
  } catch (error) {
    console.error('[Reflection API] TypeCheck error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'TypeScript check failed'));
  }
});

// ============================================================================
// FILE OPERATIONS IN SANDBOX
// ============================================================================

/**
 * @route GET /api/v1/reflection/file
 * @description Read a file from sandbox
 * @query path - File path (relative)
 */
router.get('/file', async (req: Request, res: Response) => {
  const filePath = req.query['path'] as string;

  if (!filePath) {
    return res.status(400).json(errorResponse('path query parameter is required'));
  }

  try {
    const content = await reflectionSandbox.readFile(filePath);
    res.json(successResponse({ path: filePath, content }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to read file'));
  }
});

/**
 * @route POST /api/v1/reflection/file
 * @description Write a file to sandbox
 * @body path - File path (relative)
 * @body content - File content
 */
router.post('/file', async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;

  if (!filePath || content === undefined) {
    return res.status(400).json(errorResponse('path and content are required'));
  }

  try {
    await reflectionSandbox.writeFile(filePath, content);
    res.json(successResponse({ message: 'File written', path: filePath }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to write file'));
  }
});

/**
 * @route POST /api/v1/reflection/commit
 * @description Commit current changes in sandbox
 * @body message - Commit message
 */
router.post('/commit', async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('message is required'));
  }

  try {
    const commitHash = await reflectionSandbox.commit(message);
    res.json(successResponse({ commitHash, message }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to commit'));
  }
});

/**
 * @route GET /api/v1/reflection/diff
 * @description Get diff of uncommitted changes in sandbox
 * @query path - Optional specific file path
 */
router.get('/diff', async (req: Request, res: Response) => {
  const filePath = req.query['path'] as string | undefined;

  try {
    const diff = await reflectionSandbox.getDiff(filePath);
    res.json(successResponse({ diff }));
  } catch (error) {
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to get diff'));
  }
});

// ============================================================================
// SERVER MANAGEMENT IN SANDBOX
// ============================================================================

/**
 * @route POST /api/v1/reflection/server/start
 * @description Start TooLoo server in sandbox
 */
router.post('/server/start', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Starting server in sandbox...');
    await reflectionSandbox.startServer();
    const state = reflectionSandbox.getState();
    res.json(
      successResponse({
        message: 'Server started',
        port: state.serverPort,
      })
    );
  } catch (error) {
    console.error('[Reflection API] Start server error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to start server'));
  }
});

/**
 * @route POST /api/v1/reflection/server/stop
 * @description Stop TooLoo server in sandbox
 */
router.post('/server/stop', async (_req: Request, res: Response) => {
  try {
    console.log('[Reflection API] Stopping server in sandbox...');
    await reflectionSandbox.stopServer();
    res.json(successResponse({ message: 'Server stopped' }));
  } catch (error) {
    console.error('[Reflection API] Stop server error:', error);
    res
      .status(500)
      .json(errorResponse(error instanceof Error ? error.message : 'Failed to stop server'));
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
export { router as reflectionRoutes };
