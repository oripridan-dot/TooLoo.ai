// @version 3.3.181
/**
 * TooLoo Autonomous Modification API Routes
 *
 * Endpoints for managing TooLoo's self-modification capabilities:
 * - Process AI responses for code suggestions
 * - Approve/reject pending modifications
 * - Get modification history
 * - Direct modification API
 *
 * @module nexus/routes/autonomous-mod
 */

import { Router, Request, Response } from 'express';
import { autonomousMod, parseCodeSuggestions } from '../../cortex/motor/autonomous-modifier.js';
import { bus } from '../../core/event-bus.js';

const router = Router();

// Helpers
const successResponse = (data: any) => ({ ok: true, data });
const errorResponse = (message: string, code?: string) => ({
  ok: false,
  error: message,
  code,
});

// ============================================================================
// AI RESPONSE PROCESSING
// ============================================================================

/**
 * @route POST /api/v1/system/autonomous/process
 * @description Process an AI response and extract/apply code modifications
 * @body response - The AI-generated response text
 * @body sessionId - Session identifier for approval workflow
 * @body userQuery - Original user query for context
 * @body autoApply - Whether to auto-apply approved changes (default: true)
 */
router.post('/process', async (req: Request, res: Response) => {
  const { response, sessionId, userQuery, autoApply = true } = req.body;

  if (!response) {
    return res.status(400).json(errorResponse('Required: response'));
  }

  console.log('[AutonomousMod API] Processing AI response...');

  try {
    // First, just parse to show what was found
    const suggestions = parseCodeSuggestions(response);

    if (suggestions.length === 0) {
      return res.json(
        successResponse({
          found: 0,
          message: 'No code suggestions found in response',
          applied: 0,
        })
      );
    }

    if (!autoApply) {
      // Just return what was found without applying
      return res.json(
        successResponse({
          found: suggestions.length,
          suggestions: suggestions.map((s) => ({
            filePath: s.filePath,
            operation: s.operation,
            language: s.language,
            confidence: s.confidence,
            reason: s.reason,
            codePreview: s.code.substring(0, 200) + (s.code.length > 200 ? '...' : ''),
          })),
          message: 'Modifications parsed but not applied (autoApply=false)',
        })
      );
    }

    // Process and apply
    const result = await autonomousMod.processAIResponse(response, {
      sessionId: sessionId || `auto-${Date.now()}`,
      userQuery: userQuery || 'AI response processing',
    });

    res.json(
      successResponse({
        found: suggestions.length,
        applied: result.applied,
        failed: result.failed,
        rolledBack: result.rolledBack,
        validationPassed: result.validationPassed,
        testsPassed: result.testsPassed,
        error: result.error,
        results: result.results.map((r) => ({
          filePath: r.suggestion.filePath,
          operation: r.suggestion.operation,
          success: r.result.success,
          message: r.result.message,
          backup: r.result.backup,
        })),
      })
    );
  } catch (error: any) {
    console.error('[AutonomousMod API] Error:', error);
    res.status(500).json(errorResponse(error.message, 'PROCESS_ERROR'));
  }
});

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

/**
 * @route GET /api/v1/system/autonomous/pending
 * @description Get pending modifications awaiting approval
 * @query sessionId - Session to get pending mods for
 */
router.get('/pending', (req: Request, res: Response) => {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json(errorResponse('Required query: sessionId'));
  }

  const pending = autonomousMod.getPendingApprovals(sessionId);

  res.json(
    successResponse({
      sessionId,
      count: pending.length,
      pending: pending.map((s) => ({
        filePath: s.filePath,
        operation: s.operation,
        language: s.language,
        confidence: s.confidence,
        reason: s.reason,
        codePreview: s.code.substring(0, 500) + (s.code.length > 500 ? '...' : ''),
        oldCodePreview: s.oldCode
          ? s.oldCode.substring(0, 200) + (s.oldCode.length > 200 ? '...' : '')
          : undefined,
      })),
    })
  );
});

/**
 * @route POST /api/v1/system/autonomous/approve
 * @description Approve pending modifications
 * @body sessionId - Session with pending mods
 * @body files - Array of file paths to approve, or "all"
 */
router.post('/approve', async (req: Request, res: Response) => {
  const { sessionId, files } = req.body;

  if (!sessionId) {
    return res.status(400).json(errorResponse('Required: sessionId'));
  }

  console.log(`[AutonomousMod API] Approving modifications for session ${sessionId}`);

  try {
    const result = await autonomousMod.approveModifications(
      sessionId,
      files === 'all' ? 'all' : files || 'all'
    );

    res.json(
      successResponse({
        applied: result.applied,
        failed: result.failed,
        rolledBack: result.rolledBack,
        validationPassed: result.validationPassed,
        testsPassed: result.testsPassed,
        error: result.error,
      })
    );
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message, 'APPROVE_ERROR'));
  }
});

/**
 * @route POST /api/v1/system/autonomous/reject
 * @description Reject pending modifications
 * @body sessionId - Session with pending mods
 */
router.post('/reject', (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json(errorResponse('Required: sessionId'));
  }

  autonomousMod.rejectModifications(sessionId);

  res.json(successResponse({ message: 'Modifications rejected', sessionId }));
});

// ============================================================================
// DIRECT MODIFICATION
// ============================================================================

/**
 * @route POST /api/v1/system/autonomous/apply
 * @description Directly apply a code modification
 * @body filePath - Target file path
 * @body code - New code content
 * @body operation - 'create', 'edit', or 'replace'
 * @body oldCode - Code to replace (for edit operation)
 * @body reason - Reason for modification
 * @body skipValidation - Skip TypeScript/test validation
 */
router.post('/apply', async (req: Request, res: Response) => {
  const { filePath, code, operation, oldCode, reason, skipValidation } = req.body;

  if (!filePath || !code || !operation) {
    return res.status(400).json(errorResponse('Required: filePath, code, operation'));
  }

  if (!['create', 'edit', 'replace'].includes(operation)) {
    return res.status(400).json(errorResponse('operation must be: create, edit, or replace'));
  }

  console.log(`[AutonomousMod API] Direct ${operation} on ${filePath}`);

  try {
    const result = await autonomousMod.applyDirectModification(filePath, code, operation, {
      oldCode,
      reason,
      skipValidation,
    });

    if (result.success) {
      res.json(successResponse(result));
    } else {
      res.status(400).json(errorResponse(result.message, result.error));
    }
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message, 'APPLY_ERROR'));
  }
});

// ============================================================================
// CONFIGURATION & STATUS
// ============================================================================

/**
 * @route GET /api/v1/system/autonomous/config
 * @description Get current autonomous modification configuration
 */
router.get('/config', (_req: Request, res: Response) => {
  const config = autonomousMod.getConfig();

  res.json(
    successResponse({
      ...config,
      protectedPatterns: config.protectedPatterns.map((p) => p.toString()),
    })
  );
});

/**
 * @route PUT /api/v1/system/autonomous/config
 * @description Update autonomous modification configuration
 * @body autoApplyLowRisk - Auto-apply low-risk changes
 * @body runTestsAfterMod - Run tests after modifications
 * @body typeCheckBeforeMod - TypeScript check before/after
 * @body autoRollbackOnFailure - Auto-rollback on failures
 * @body maxBatchSize - Max files per batch
 * @body minAutoApplyConfidence - Min confidence for auto-apply (0-1)
 */
router.put('/config', (req: Request, res: Response) => {
  const updates = req.body;

  // Validate numeric fields
  if (
    updates.maxBatchSize !== undefined &&
    (updates.maxBatchSize < 1 || updates.maxBatchSize > 50)
  ) {
    return res.status(400).json(errorResponse('maxBatchSize must be 1-50'));
  }

  if (
    updates.minAutoApplyConfidence !== undefined &&
    (updates.minAutoApplyConfidence < 0 || updates.minAutoApplyConfidence > 1)
  ) {
    return res.status(400).json(errorResponse('minAutoApplyConfidence must be 0-1'));
  }

  autonomousMod.updateConfig(updates);

  res.json(
    successResponse({
      message: 'Configuration updated',
      config: autonomousMod.getConfig(),
    })
  );
});

/**
 * @route GET /api/v1/system/autonomous/history
 * @description Get modification history
 * @query limit - Number of recent entries (default: 20)
 */
router.get('/history', (req: Request, res: Response) => {
  const limitParam = req.query['limit'];
  const limit = parseInt(typeof limitParam === 'string' ? limitParam : '20') || 20;
  const history = autonomousMod.getHistory().slice(-limit);

  res.json(
    successResponse({
      count: history.length,
      history: history.map((h) => ({
        success: h.success,
        applied: h.applied,
        failed: h.failed,
        rolledBack: h.rolledBack,
        validationPassed: h.validationPassed,
        testsPassed: h.testsPassed,
        files: h.results.map((r) => r.suggestion.filePath),
      })),
    })
  );
});

/**
 * @route GET /api/v1/system/autonomous/capabilities
 * @description Get info about autonomous modification capabilities
 */
router.get('/capabilities', (_req: Request, res: Response) => {
  res.json(
    successResponse({
      version: '3.3.181',
      capabilities: [
        {
          name: 'processAIResponse',
          description: 'Parse AI responses and extract code modifications',
        },
        { name: 'autoApply', description: 'Automatically apply low-risk modifications' },
        { name: 'approvalWorkflow', description: 'Queue risky changes for human approval' },
        { name: 'typeScriptValidation', description: 'Pre/post modification TypeScript checking' },
        { name: 'testValidation', description: 'Run tests after modifications' },
        { name: 'autoRollback', description: 'Automatic rollback on validation failures' },
        { name: 'directModification', description: 'Direct API for code changes' },
      ],
      safetyFeatures: [
        'Risk assessment for all modifications',
        'Protected file patterns',
        'Confidence threshold filtering',
        'Automatic backups via SelfModificationEngine',
        'TypeScript compilation validation',
        'Test suite validation',
        'Atomic batch operations with rollback',
        'Full audit trail',
      ],
      supportedOperations: ['create', 'edit', 'replace'],
      supportedPatterns: [
        'Explicit file path in code block header',
        'File creation suggestions',
        'Edit with old/new code blocks',
        'File path in code comments',
      ],
    })
  );
});

export default router;
