// @version 2.2.654
/**
 * Suggestions API Routes
 * Endpoints for actionable suggestion management and GitHub integration
 */

import { Router, Request, Response } from 'express';
import { suggestionAggregator } from '../../cortex/discover/suggestion-aggregator.js';
import { bus } from '../../core/event-bus.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const suggestionsRoutes = Router();

/**
 * GET /api/v1/suggestions
 * Get all pending suggestions
 */
suggestionsRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const suggestions = suggestionAggregator.getPendingSuggestions();
    const statistics = suggestionAggregator.getStatistics();

    res.json({
      success: true,
      data: {
        suggestions,
        statistics,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get suggestions: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/suggestions/all
 * Get all suggestions (including dismissed, executed, expired)
 */
suggestionsRoutes.get('/all', async (_req: Request, res: Response) => {
  try {
    const suggestions = suggestionAggregator.getAllSuggestions();
    const statistics = suggestionAggregator.getStatistics();

    res.json({
      success: true,
      data: {
        suggestions,
        statistics,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get all suggestions: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/suggestions/:id
 * Get a specific suggestion by ID
 */
suggestionsRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID is required' });
    }
    const suggestion = suggestionAggregator.getSuggestion(id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get suggestion: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/suggestions/:id/dismiss
 * Dismiss a suggestion
 */
suggestionsRoutes.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID is required' });
    }
    const success = suggestionAggregator.dismissSuggestion(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    res.json({
      success: true,
      message: 'Suggestion dismissed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to dismiss suggestion: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/suggestions/:id/review
 * Mark a suggestion as reviewed
 */
suggestionsRoutes.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID is required' });
    }
    const success = suggestionAggregator.markReviewed(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    res.json({
      success: true,
      message: 'Suggestion marked as reviewed',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to mark suggestion reviewed: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/suggestions/:id/execute
 * Execute a GitHub action from a suggestion
 */
suggestionsRoutes.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID is required' });
    }
    const { actionType } = req.body;

    const suggestion = suggestionAggregator.getSuggestion(id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    const githubAction = suggestion.githubActions.find((a) => a.type === actionType);

    if (!githubAction) {
      return res.status(400).json({
        success: false,
        error: `Action type "${actionType}" not found in suggestion`,
      });
    }

    // Execute the GitHub action
    const result = await executeGitHubAction(githubAction);

    if (result.success) {
      suggestionAggregator.markExecuted(id);

      bus.publish('nexus', 'suggestion:github_action_executed', {
        suggestionId: id,
        actionType,
        result: result.data,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to execute action: ${errorMessage}`,
    });
  }
});

/**
 * POST /api/v1/suggestions/:id/action/:actionId
 * Execute a suggestion action (non-GitHub)
 */
suggestionsRoutes.post('/:id/action/:actionId', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    const actionId = req.params['actionId'];
    if (!id || !actionId) {
      return res.status(400).json({ success: false, error: 'ID and actionId are required' });
    }

    const suggestion = suggestionAggregator.getSuggestion(id);

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        error: 'Suggestion not found',
      });
    }

    const action = suggestion.suggestions.find((a) => a.id === actionId);

    if (!action) {
      return res.status(400).json({
        success: false,
        error: `Action "${actionId}" not found in suggestion`,
      });
    }

    // Execute the action based on type
    switch (action.type) {
      case 'automated':
        if (action.action) {
          // Publish the action event
          bus.publish('cortex', action.action, {
            suggestionId: id,
            actionId,
            source: suggestion.source,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'exploration':
        // Trigger exploration
        bus.publish('cortex', 'exploration:manual_request', {
          suggestionId: id,
          actionId,
          area: suggestion.tags[2] || 'general',
          type: 'hypothesis',
          requestedAt: new Date().toISOString(),
        });
        break;

      default:
        // Manual actions just mark as reviewed
        suggestionAggregator.markReviewed(id);
    }

    res.json({
      success: true,
      message: `Action "${action.label}" triggered`,
      actionType: action.type,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to execute action: ${errorMessage}`,
    });
  }
});

/**
 * GET /api/v1/suggestions/statistics
 * Get suggestion statistics
 */
suggestionsRoutes.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const statistics = suggestionAggregator.getStatistics();

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: `Failed to get statistics: ${errorMessage}`,
    });
  }
});

// ============================================================================
// GITHUB ACTION EXECUTOR
// ============================================================================

interface GitHubActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

async function executeGitHubAction(action: {
  type: string;
  data: Record<string, unknown>;
}): Promise<GitHubActionResult> {
  try {
    switch (action.type) {
      case 'create_issue': {
        const { title, body, labels } = action.data;
        const labelsArg = (labels as string[])?.length
          ? `--label "${(labels as string[]).join(',')}"`
          : '';

        const cmd = `gh issue create --title "${title}" --body "${escapeForShell(body as string)}" ${labelsArg}`;
        const { stdout } = await execAsync(cmd);

        return {
          success: true,
          data: {
            issueUrl: stdout.trim(),
            action: 'create_issue',
          },
        };
      }

      case 'create_branch': {
        const { branchName } = action.data;

        // Create branch from current HEAD
        const cmd = `git checkout -b "${branchName}"`;
        await execAsync(cmd);

        return {
          success: true,
          data: {
            branchName,
            action: 'create_branch',
          },
        };
      }

      case 'commit_file': {
        const { filePath, content, commitMessage } = action.data;

        // Write the file
        const fs = await import('fs-extra');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), filePath as string);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content as string);

        // Stage and commit
        await execAsync(`git add "${filePath}"`);
        await execAsync(`git commit -m "${commitMessage}"`);

        return {
          success: true,
          data: {
            filePath,
            commitMessage,
            action: 'commit_file',
          },
        };
      }

      case 'create_pr': {
        const { title, body, branchName } = action.data;

        // Push branch and create PR
        await execAsync(`git push -u origin "${branchName}"`);
        const cmd = `gh pr create --title "${title}" --body "${escapeForShell(body as string)}"`;
        const { stdout } = await execAsync(cmd);

        return {
          success: true,
          data: {
            prUrl: stdout.trim(),
            action: 'create_pr',
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function escapeForShell(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n');
}

export default suggestionsRoutes;
