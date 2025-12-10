// @version 3.3.460
/**
 * Repository Automation Routes
 *
 * Exposes RepoAutoOrg functionality via REST API:
 * - GET /api/v1/repo/status - Get git status and pending changes
 * - POST /api/v1/repo/commit - Manual commit trigger
 * - POST /api/v1/repo/branch - Create a new branch
 * - GET /api/v1/repo/stats - Get automation statistics
 * - POST /api/v1/repo/config - Update automation config
 *
 * @module nexus/routes/repo
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { repoAutoOrg } from '../../cortex/automation/repo-auto-org.js';

const router = Router();
const execAsync = promisify(exec);
const workspaceRoot = process.cwd();

/**
 * GET /api/v1/repo/status
 * Get current git status and pending changes
 */
router.get('/status', async (_req, res) => {
  try {
    // Get git status
    const { stdout: gitStatus } = await execAsync('git status --short', { cwd: workspaceRoot });
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspaceRoot,
    });
    const { stdout: lastCommit } = await execAsync(
      'git log -1 --format="%H %s" 2>/dev/null || echo "No commits"',
      { cwd: workspaceRoot }
    );

    // Get pending changes from RepoAutoOrg
    const pendingChanges = repoAutoOrg.getPendingChanges();

    res.json({
      ok: true,
      data: {
        branch: branch.trim(),
        status: gitStatus.trim().split('\n').filter(Boolean),
        lastCommit: lastCommit.trim(),
        pendingChanges,
        autoOrgEnabled: true,
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
 * POST /api/v1/repo/commit
 * Manually trigger a commit
 */
router.post('/commit', async (req, res) => {
  try {
    const { message, files } = req.body;

    const success = await repoAutoOrg.commitNow(message, files);

    res.json({
      ok: true,
      data: {
        committed: success,
        message: success ? 'Changes committed successfully' : 'No changes to commit',
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
 * POST /api/v1/repo/branch
 * Create a new branch
 */
router.post('/branch', async (req, res) => {
  try {
    const { name, type = 'feature', base } = req.body;

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: 'Branch name is required',
      });
    }

    let success: boolean;
    if (type === 'feature') {
      success = await repoAutoOrg.createFeatureBranch(name);
    } else if (type === 'fix') {
      success = await repoAutoOrg.createFixBranch(name);
    } else {
      success = await repoAutoOrg.createBranch(name, base);
    }

    res.json({
      ok: true,
      data: {
        created: success,
        branchName: type !== 'custom' ? `${type}/${name}` : name,
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
 * GET /api/v1/repo/stats
 * Get automation statistics
 */
router.get('/stats', (_req, res) => {
  try {
    const stats = repoAutoOrg.getStats();

    res.json({
      ok: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/repo/config
 * Update RepoAutoOrg configuration
 */
router.post('/config', (req, res) => {
  try {
    const { enabled, autoCommit, autoBranch, autoPR, minChangesForPR, scopeDetectionEnabled } =
      req.body;

    const config: Record<string, any> = {};
    if (typeof enabled === 'boolean') config['enabled'] = enabled;
    if (typeof autoCommit === 'boolean') config['autoCommit'] = autoCommit;
    if (typeof autoBranch === 'boolean') config['autoBranch'] = autoBranch;
    if (typeof autoPR === 'boolean') config['autoPR'] = autoPR;
    if (typeof minChangesForPR === 'number') config['minChangesForPR'] = minChangesForPR;
    if (typeof scopeDetectionEnabled === 'boolean')
      config['scopeDetectionEnabled'] = scopeDetectionEnabled;

    repoAutoOrg.setConfig(config);

    res.json({
      ok: true,
      data: {
        message: 'Configuration updated',
        config,
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
 * POST /api/v1/repo/detect-scope
 * Analyze files and detect their scope
 */
router.post('/detect-scope', (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({
        ok: false,
        error: 'Files array is required',
      });
    }

    const scope = repoAutoOrg.detectScope(files);

    res.json({
      ok: true,
      data: scope,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/repo/diff
 * Get git diff for pending changes
 */
router.get('/diff', async (_req, res) => {
  try {
    const { stdout: diff } = await execAsync('git diff --stat', { cwd: workspaceRoot });
    const { stdout: fullDiff } = await execAsync('git diff', { cwd: workspaceRoot });

    res.json({
      ok: true,
      data: {
        summary: diff.trim(),
        full: fullDiff.substring(0, 10000), // Limit size
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
 * POST /api/v1/repo/analyze
 * Analyze a feature description and generate an organization plan
 *
 * This is the "Real Hands" endpoint - gives TooLoo the ability to plan
 * repository organization based on natural language descriptions.
 *
 * Body:
 * - description: string - Natural language description of the feature/task
 *
 * Returns:
 * - featureName: generated feature name (kebab-case)
 * - branchName: suggested branch name
 * - suggestedStructure: array of files/directories to create
 * - commands: git commands to execute the plan
 * - scope: detected change scope (type, domain, impact)
 */
router.post('/analyze', (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Description is required and must be a string',
      });
    }

    // Generate the organization plan
    const plan = repoAutoOrg.generateOrganizationPlan(description);

    res.json({
      ok: true,
      data: {
        ...plan,
        // Include execution hint for UI
        executeCommand: `bash -c "${plan.commands.createBranch}"`,
        message: `Generated plan for "${plan.featureName}" in domain "${plan.scope.domain}"`,
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
