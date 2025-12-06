// @version 3.3.92
/**
 * TooLoo Self-Modification API Routes
 *
 * Allows TooLoo to read, edit, and create its own source code through the chat interface.
 * All modifications are logged, backed up, and can be reverted.
 *
 * ⚠️ This is a powerful capability that should be used responsibly!
 *
 * @module nexus/routes/self-mod
 */

import { Router, Request, Response } from 'express';
import { selfMod, SelfModificationEngine } from '../../cortex/motor/self-modification.js';
import { bus } from '../../core/event-bus.js';

const router = Router();

// Helpers
const successResponse = (data: any) => ({ ok: true, data });
const errorResponse = (message: string, code?: string) => ({ ok: false, error: message, code });

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * @route GET /api/v1/system/self/file
 * @description Read a file from TooLoo's codebase
 * @query path - Relative path to the file
 */
router.get('/file', async (req: Request, res: Response) => {
  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json(errorResponse('Path is required'));
  }

  console.log(`[SelfMod API] Reading file: ${filePath}`);
  const result = await selfMod.readFile(filePath);

  if (result.success) {
    res.json(
      successResponse({
        path: filePath,
        content: (result as any).content,
        message: result.message,
      })
    );
  } else {
    res.status(400).json(errorResponse(result.message, result.error));
  }
});

/**
 * @route GET /api/v1/system/self/files
 * @description List files in a directory
 * @query path - Relative directory path (default: src)
 */
router.get('/files', async (req: Request, res: Response) => {
  const dirPath = (req.query['path'] as string) || 'src';

  try {
    const files = await selfMod.listFiles(dirPath);
    res.json(
      successResponse({
        directory: dirPath,
        files,
        count: files.length,
      })
    );
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message));
  }
});

/**
 * @route GET /api/v1/system/self/search
 * @description Search for code in the codebase
 * @query pattern - Search pattern
 * @query regex - Whether pattern is regex (default: false)
 * @query filePattern - Glob pattern for files (default: *.ts)
 */
router.get('/search', async (req: Request, res: Response) => {
  const { pattern, regex, filePattern } = req.query;

  if (!pattern || typeof pattern !== 'string') {
    return res.status(400).json(errorResponse('Search pattern is required'));
  }

  const results = await selfMod.searchCode(pattern, {
    isRegex: regex === 'true',
    filePattern: (filePattern as string) || '*.ts',
  });

  res.json(
    successResponse({
      pattern,
      results,
      count: results.length,
    })
  );
});

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * @route POST /api/v1/system/self/edit
 * @description Edit a file by replacing specific code
 * @body filePath - Path to the file
 * @body oldCode - Exact code to replace (include context!)
 * @body newCode - New code to insert
 * @body reason - Why this change is being made
 */
router.post('/edit', async (req: Request, res: Response) => {
  const { filePath, oldCode, newCode, reason } = req.body;

  if (!filePath || !oldCode || newCode === undefined || !reason) {
    return res.status(400).json(errorResponse('Required: filePath, oldCode, newCode, reason'));
  }

  console.log(`[SelfMod API] Editing file: ${filePath}`);
  console.log(`[SelfMod API] Reason: ${reason}`);

  const result = await selfMod.editFile({
    filePath,
    oldCode,
    newCode,
    reason,
  });

  // Emit event for dashboard
  bus.publish('cortex', 'self-mod:api-edit', {
    filePath,
    reason,
    success: result.success,
    timestamp: new Date().toISOString(),
  });

  if (result.success) {
    res.json(
      successResponse({
        message: result.message,
        filePath: result.filePath,
        backup: result.backup,
        diff: result.diff,
      })
    );
  } else {
    res.status(400).json(errorResponse(result.message, result.error));
  }
});

/**
 * @route POST /api/v1/system/self/multi-edit
 * @description Apply multiple edits atomically
 * @body edits - Array of edit objects
 */
router.post('/multi-edit', async (req: Request, res: Response) => {
  const { edits } = req.body;

  if (!Array.isArray(edits) || edits.length === 0) {
    return res.status(400).json(errorResponse('Edits array is required'));
  }

  console.log(`[SelfMod API] Multi-edit: ${edits.length} edits`);

  const results = await selfMod.multiEdit(edits);
  const allSuccess = results.every((r) => r.success);

  res.json(
    allSuccess
      ? successResponse({ results })
      : {
          ok: false,
          results,
          message: 'Some edits failed - rolled back',
        }
  );
});

/**
 * @route POST /api/v1/system/self/create
 * @description Create a new file
 * @body path - Path for the new file
 * @body content - File content
 * @body reason - Why this file is being created
 */
router.post('/create', async (req: Request, res: Response) => {
  const { path: filePath, content, reason } = req.body;

  if (!filePath || content === undefined || !reason) {
    return res.status(400).json(errorResponse('Required: path, content, reason'));
  }

  console.log(`[SelfMod API] Creating file: ${filePath}`);

  const result = await selfMod.createFile(filePath, content, reason);

  if (result.success) {
    res.json(
      successResponse({
        message: result.message,
        filePath: result.filePath,
      })
    );
  } else {
    res.status(400).json(errorResponse(result.message, result.error));
  }
});

/**
 * @route DELETE /api/v1/system/self/file
 * @description Delete a file (with backup)
 * @body path - Path to delete
 * @body reason - Why this file is being deleted
 */
router.delete('/file', async (req: Request, res: Response) => {
  const { path: filePath, reason } = req.body;

  if (!filePath || !reason) {
    return res.status(400).json(errorResponse('Required: path, reason'));
  }

  const result = await selfMod.deleteFile(filePath, reason);

  if (result.success) {
    res.json(
      successResponse({
        message: result.message,
        backup: result.backup,
      })
    );
  } else {
    res.status(400).json(errorResponse(result.message, result.error));
  }
});

// ============================================================================
// GIT OPERATIONS
// ============================================================================

/**
 * @route GET /api/v1/system/self/git/status
 * @description Get current git status
 */
router.get('/git/status', async (_req: Request, res: Response) => {
  const status = await selfMod.getGitStatus();
  res.json(successResponse({ status }));
});

/**
 * @route GET /api/v1/system/self/git/diff
 * @description Get git diff
 * @query path - Optional file path
 */
router.get('/git/diff', async (req: Request, res: Response) => {
  const filePath = req.query['path'] as string | undefined;
  const diff = await selfMod.getGitDiff(filePath);
  res.json(successResponse({ diff }));
});

/**
 * @route POST /api/v1/system/self/git/commit
 * @description Commit changes
 * @body message - Commit message
 */
router.post('/git/commit', async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('Commit message is required'));
  }

  const result = await selfMod.commitChanges(message);

  if (result.success) {
    res.json(successResponse({ message: result.message }));
  } else {
    res.status(400).json(errorResponse(result.message));
  }
});

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

/**
 * @route GET /api/v1/system/self/backups
 * @description List available backups
 */
router.get('/backups', async (_req: Request, res: Response) => {
  const backups = await selfMod.listBackups();
  res.json(successResponse({ backups }));
});

/**
 * @route POST /api/v1/system/self/restore
 * @description Restore from backup
 * @body backupPath - Path to backup file
 */
router.post('/restore', async (req: Request, res: Response) => {
  const { backupPath } = req.body;

  if (!backupPath) {
    return res.status(400).json(errorResponse('Backup path is required'));
  }

  const result = await selfMod.restoreBackup(backupPath);

  if (result.success) {
    res.json(successResponse({ message: result.message }));
  } else {
    res.status(400).json(errorResponse(result.message));
  }
});

// ============================================================================
// TESTING
// ============================================================================

/**
 * @route POST /api/v1/system/self/test
 * @description Run tests after modifications
 * @body pattern - Optional test pattern
 */
router.post('/test', async (req: Request, res: Response) => {
  const { pattern } = req.body;

  console.log('[SelfMod API] Running tests...');
  const result = await selfMod.runTests(pattern);

  res.json(
    successResponse({
      passed: result.passed,
      message: result.message,
    })
  );
});

// ============================================================================
// MODIFICATION LOG
// ============================================================================

/**
 * @route GET /api/v1/system/self/log
 * @description Get modification history
 */
router.get('/log', (_req: Request, res: Response) => {
  const log = selfMod.getModificationLog();
  res.json(successResponse({ log }));
});

// ============================================================================
// CAPABILITIES INFO
// ============================================================================

/**
 * @route GET /api/v1/system/self/capabilities
 * @description Get info about self-modification capabilities
 */
router.get('/capabilities', (_req: Request, res: Response) => {
  res.json(
    successResponse({
      capabilities: [
        { name: 'readFile', description: 'Read source code files' },
        { name: 'editFile', description: 'Edit files with find/replace' },
        { name: 'createFile', description: 'Create new files' },
        { name: 'deleteFile', description: 'Delete files (with backup)' },
        { name: 'searchCode', description: 'Search codebase for patterns' },
        { name: 'listFiles', description: 'List files in directories' },
        { name: 'gitCommit', description: 'Commit changes to git' },
        { name: 'runTests', description: 'Run tests after changes' },
        { name: 'restoreBackup', description: 'Restore from backups' },
      ],
      safetyFeatures: [
        'Automatic backups before edits',
        'Protected directories (node_modules, .git)',
        'Critical file warnings',
        'Atomic multi-edit with rollback',
        'Full modification log',
      ],
      version: '3.3.90',
    })
  );
});

export default router;
