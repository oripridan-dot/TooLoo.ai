// @version 2.3.0 - Added Perfection Enforcer
/**
 * QA Guardian API Routes
 *
 * Exposes the QA Guardian system through REST endpoints.
 * All routes are under /api/v1/qa/*
 *
 * @module qa/routes/qa
 */

import { Router, Request, Response } from 'express';
import { qaGuardianAgent } from '../agent/qa-guardian-agent.js';
import { wireVerifier } from '../wiring/wire-verifier.js';
import { filesystemHygiene } from '../hygiene/filesystem-hygiene.js';
import { legacyHunter } from '../hygiene/legacy-hunter.js';
import { systemIntegrator } from '../core/system-integrator.js';
import { schemaGuard } from '../guards/schema-guard.js';
import { issueTracker } from '../agent/issue-tracker.js';
import { autonomousFixer } from '../agent/autonomous-fixer.js';
import { perfectionEnforcer } from '../guards/perfection-enforcer.js';

const router = Router();

// ============= Dashboard =============

/**
 * @route GET /api/v1/qa/dashboard
 * @description Get QA Guardian dashboard overview with structured data
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const status = await qaGuardianAgent.quickHealthCheck();
    const agentStatus = qaGuardianAgent.getStatus();

    // Get structured data from last reports
    const wiringReport = wireVerifier.getLastReport();
    const hygieneReport = filesystemHygiene.getLastReport();
    const legacyReport = legacyHunter.getLastReport();

    // Build structured metrics for UI
    const metrics = {
      wiring: wiringReport
        ? {
            connected: wiringReport.matched,
            issues: wiringReport.mismatches.length,
            coverage: wiringReport.coverage,
            total: wiringReport.matched + wiringReport.mismatches.length,
          }
        : { connected: 0, issues: 0, coverage: 0, total: 0 },
      hygiene: hygieneReport
        ? {
            duplicates: hygieneReport.duplicates.count,
            orphans: hygieneReport.orphans.count,
            corrupted: hygieneReport.corruption.count,
            unusedConfig: hygieneReport.unusedConfig.count,
            total:
              hygieneReport.duplicates.count +
              hygieneReport.orphans.count +
              hygieneReport.corruption.count +
              hygieneReport.unusedConfig.count,
          }
        : {
            duplicates: 0,
            orphans: 0,
            corrupted: 0,
            unusedConfig: 0,
            total: 0,
          },
      legacy: legacyReport
        ? {
            todos: legacyReport.todos.count,
            deadExports: legacyReport.deadExports.count,
            deprecated: legacyReport.deprecatedUsage.count,
            total:
              legacyReport.todos.count +
              legacyReport.deadExports.count +
              legacyReport.deprecatedUsage.count,
          }
        : { todos: 0, deadExports: 0, deprecated: 0, total: 0 },
    };

    res.json({
      ok: true,
      data: {
        ...status,
        metrics,
        agent: agentStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Dashboard failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/status
 * @description Get quick system status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await qaGuardianAgent.quickHealthCheck();

    res.json({
      ok: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
});

// ============= Reports =============

/**
 * @route GET /api/v1/qa/report/full
 * @description Run and return full system check
 */
router.get('/report/full', async (_req: Request, res: Response) => {
  try {
    const report = await qaGuardianAgent.runFullCheck();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Full check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/report/weekly
 * @description Generate weekly integrity report
 */
router.get('/report/weekly', async (_req: Request, res: Response) => {
  try {
    const report = await qaGuardianAgent.generateWeeklyReport();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Weekly report failed',
    });
  }
});

// ============= Wire Verification =============

/**
 * @route GET /api/v1/qa/wiring
 * @description Get wire verification report
 */
router.get('/wiring', async (_req: Request, res: Response) => {
  try {
    const report = await wireVerifier.verify();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Wire check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/wiring/summary
 * @description Get wire verification summary
 */
router.get('/wiring/summary', (_req: Request, res: Response) => {
  const lastReport = wireVerifier.getLastReport();

  if (!lastReport) {
    res.json({
      ok: true,
      data: {
        message: 'No wiring report available. Run /api/v1/qa/wiring first.',
        summary: wireVerifier.getSummary(),
      },
    });
    return;
  }

  res.json({
    ok: true,
    data: {
      summary: wireVerifier.getSummary(),
      matched: lastReport.matched,
      mismatches: lastReport.mismatches.length,
      coverage: lastReport.coverage,
      lastCheck: lastReport.timestamp,
    },
  });
});

// ============= Filesystem Hygiene =============

/**
 * @route GET /api/v1/qa/hygiene
 * @description Run filesystem hygiene checks
 */
router.get('/hygiene', async (_req: Request, res: Response) => {
  try {
    const report = await filesystemHygiene.runAllChecks();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Hygiene check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/hygiene/duplicates
 * @description Find duplicate files
 */
router.get('/hygiene/duplicates', async (_req: Request, res: Response) => {
  try {
    const duplicates = await filesystemHygiene.findDuplicates();

    res.json({
      ok: true,
      data: {
        count: duplicates.length,
        duplicates,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Duplicate check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/hygiene/orphans
 * @description Find orphan files
 */
router.get('/hygiene/orphans', async (_req: Request, res: Response) => {
  try {
    const orphans = await filesystemHygiene.findOrphans();

    res.json({
      ok: true,
      data: {
        count: orphans.length,
        orphans,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Orphan check failed',
    });
  }
});

// ============= Legacy Detection =============

/**
 * @route GET /api/v1/qa/legacy
 * @description Run legacy code detection
 */
router.get('/legacy', async (_req: Request, res: Response) => {
  try {
    const report = await legacyHunter.runAllScans();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Legacy scan failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/legacy/todos
 * @description Get all TODO/FIXME markers
 */
router.get('/legacy/todos', async (_req: Request, res: Response) => {
  try {
    const todos = await legacyHunter.findTODOs();

    res.json({
      ok: true,
      data: {
        count: todos.length,
        todos,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'TODO scan failed',
    });
  }
});

// ============= System Integration =============

/**
 * @route GET /api/v1/qa/systems
 * @description Get core system wiring status
 */
router.get('/systems', (_req: Request, res: Response) => {
  try {
    const status = systemIntegrator.getWiringStatus();

    res.json({
      ok: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'System check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/systems/events
 * @description Get event flow metrics
 */
router.get('/systems/events', (req: Request, res: Response) => {
  try {
    const minutesStr = req.query['minutes'] as string | undefined;
    const minutes = minutesStr ? parseInt(minutesStr, 10) : 5;
    const flow = systemIntegrator.getEventFlow(minutes);

    res.json({
      ok: true,
      data: flow,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Event flow failed',
    });
  }
});

// ============= Schema Validation =============

/**
 * @route GET /api/v1/qa/schemas/violations
 * @description Get schema violation history
 */
router.get('/schemas/violations', (_req: Request, res: Response) => {
  try {
    const violations = schemaGuard.getViolations();
    const stats = schemaGuard.getStats();

    res.json({
      ok: true,
      data: {
        stats,
        violations,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to get violations',
    });
  }
});

// ============= Actions =============

/**
 * @route GET /api/v1/qa/actions/pending
 * @description Get pending actions requiring approval
 */
router.get('/actions/pending', (_req: Request, res: Response) => {
  try {
    const pending = qaGuardianAgent.getPendingActions();

    res.json({
      ok: true,
      data: {
        count: pending.length,
        actions: pending,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to get actions',
    });
  }
});

/**
 * @route GET /api/v1/qa/actions/history
 * @description Get action history
 */
router.get('/actions/history', (req: Request, res: Response) => {
  try {
    const limitStr = req.query['limit'] as string | undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const history = qaGuardianAgent.getActionHistory(limit);

    res.json({
      ok: true,
      data: {
        count: history.length,
        actions: history,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
    });
  }
});

/**
 * @route POST /api/v1/qa/actions/approve
 * @description Approve a pending action
 */
router.post('/actions/approve', (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;

    if (!actionId) {
      res.status(400).json({
        ok: false,
        error: 'actionId is required',
      });
      return;
    }

    const success = qaGuardianAgent.approveAction(actionId);

    res.json({
      ok: success,
      message: success ? 'Action approved' : 'Action not found or already processed',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Approval failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/actions/reject
 * @description Reject a pending action
 */
router.post('/actions/reject', (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;

    if (!actionId) {
      res.status(400).json({
        ok: false,
        error: 'actionId is required',
      });
      return;
    }

    const success = qaGuardianAgent.rejectAction(actionId);

    res.json({
      ok: success,
      message: success ? 'Action rejected' : 'Action not found or already processed',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Rejection failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/actions/execute
 * @description Execute a specific action by ID
 */
router.post('/actions/execute', async (req: Request, res: Response) => {
  try {
    const { actionId } = req.body;

    if (!actionId) {
      res.status(400).json({
        ok: false,
        error: 'actionId is required',
      });
      return;
    }

    const actions = qaGuardianAgent.getActionHistory();
    const action = actions.find((a) => a.id === actionId);

    if (!action) {
      res.status(404).json({
        ok: false,
        error: 'Action not found',
      });
      return;
    }

    const result = await qaGuardianAgent.executeAction(action);

    res.json({
      ok: result.success,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    });
  }
});

// ============= Agent Control =============

/**
 * @route GET /api/v1/qa/agent/status
 * @description Get agent status
 */
router.get('/agent/status', (_req: Request, res: Response) => {
  try {
    const status = qaGuardianAgent.getStatus();

    res.json({
      ok: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/agent/start
 * @description Start the QA Guardian agent
 */
router.post('/agent/start', async (_req: Request, res: Response) => {
  try {
    await qaGuardianAgent.start();

    res.json({
      ok: true,
      message: 'Agent started',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Start failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/agent/stop
 * @description Stop the QA Guardian agent
 */
router.post('/agent/stop', (_req: Request, res: Response) => {
  try {
    qaGuardianAgent.stop();

    res.json({
      ok: true,
      message: 'Agent stopped',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Stop failed',
    });
  }
});

// ============= Live Activity & Fix History (Autonomous UI) =============

/**
 * @route GET /api/v1/qa/activity
 * @description Get real-time activity stream for autonomous UI
 */
router.get('/activity', async (_req: Request, res: Response) => {
  try {
    const fixerStatus = autonomousFixer.getStatus();
    const allOpenIssues = issueTracker.getAllOpenIssues();
    const fixingIssues = issueTracker.getFixingIssues();
    const autoFixableQueue = issueTracker.getPrioritizedIssues();
    const recentFixes = issueTracker.getFixLogs(20);
    const stats = issueTracker.getStats();

    res.json({
      ok: true,
      data: {
        fixer: {
          isFixing: fixerStatus.isFixing,
          currentFix: fixerStatus.currentFix,
          queueLength: autoFixableQueue.length,
        },
        issues: {
          open: allOpenIssues.length,
          fixing: fixingIssues.length,
          // Show all open issues for visibility, but mark which are auto-fixable
          queue: allOpenIssues.slice(0, 15).map((issue) => ({
            ...issue,
            autoFixable: ['duplicate', 'orphan', 'corruption'].includes(issue.type),
          })),
        },
        recentFixes,
        stats,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Activity fetch failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/issues
 * @description Get all tracked issues with timestamps and priorities
 */
router.get('/issues', async (_req: Request, res: Response) => {
  try {
    const allIssues = issueTracker.getAllOpenIssues();
    const stats = issueTracker.getStats();

    res.json({
      ok: true,
      data: {
        issues: allIssues.map((issue) => ({
          ...issue,
          autoFixable: ['duplicate', 'orphan', 'corruption'].includes(issue.type),
        })),
        stats,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Issues fetch failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/fixes/history
 * @description Get fix history for the fix history tab
 */
router.get('/fixes/history', async (req: Request, res: Response) => {
  try {
    const limitStr = req.query['limit'] as string | undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const logs = issueTracker.getFixLogs(limit);

    res.json({
      ok: true,
      data: {
        fixes: logs,
        total: logs.length,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'History fetch failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/issues/:id/ignore
 * @description Mark an issue as ignored (won't be auto-fixed)
 */
router.post('/issues/:id/ignore', async (req: Request, res: Response) => {
  try {
    const issueId = req.params['id'] ?? '';
    issueTracker.ignoreIssue(issueId);

    res.json({
      ok: true,
      message: `Issue ${issueId} ignored`,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Ignore failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/fix-all
 * @description Run aggressive fix cycle to resolve all auto-fixable issues
 */
router.post('/fix-all', async (_req: Request, res: Response) => {
  try {
    const stats = issueTracker.getStats();
    const startTime = Date.now();
    const allResults: Array<{ success: boolean; issueId?: string }> = [];

    console.log(`[QA Fix-All] 🚀 Starting aggressive fix cycle for ${stats.open} open issues...`);

    // Keep fixing until no more auto-fixable issues
    let iteration = 0;
    const maxIterations = 50; // Safety limit

    while (iteration < maxIterations) {
      const queue = issueTracker.getPrioritizedIssues();
      if (queue.length === 0) break;

      // Process larger batches (10 at a time)
      const results = await autonomousFixer.processQueue(10);
      allResults.push(...results);

      iteration++;
      console.log(`[QA Fix-All] Iteration ${iteration}: Fixed ${results.length} issues`);

      // Small delay to prevent overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;
    const successCount = allResults.filter((r) => r.success).length;
    const finalStats = issueTracker.getStats();

    console.log(
      `[QA Fix-All] ✅ Complete: ${successCount}/${allResults.length} fixes in ${duration}ms`
    );

    res.json({
      ok: true,
      data: {
        totalFixed: successCount,
        totalAttempted: allResults.length,
        iterations: iteration,
        duration,
        remaining: finalStats.open,
        results: allResults.slice(-20), // Last 20 results
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Fix-all failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/cleanup
 * @description Clean up stale issues (files that no longer exist) and reset to fresh state
 */
router.post('/cleanup', async (_req: Request, res: Response) => {
  try {
    console.log('[QA Cleanup] 🧹 Starting intelligent cleanup...');

    const beforeStats = issueTracker.getStats();

    // Clean up stale issues for files that no longer exist
    const cleanedCount = await issueTracker.cleanupStaleIssues();

    const afterStats = issueTracker.getStats();

    console.log(
      `[QA Cleanup] ✅ Removed ${cleanedCount} stale issues (${beforeStats.open} → ${afterStats.open})`
    );

    res.json({
      ok: true,
      data: {
        cleaned: cleanedCount,
        before: beforeStats,
        after: afterStats,
        message: `Cleaned ${cleanedCount} stale issues referencing non-existent files`,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/reset
 * @description Reset all QA data and start fresh (nuclear option)
 */
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    console.log('[QA Reset] 🔄 Resetting all QA data...');

    // Clear all tracked issues
    issueTracker.reset();

    // Force fresh scans
    await wireVerifier.verify();
    await filesystemHygiene.runAllChecks();
    await legacyHunter.runAllScans();

    const newStats = issueTracker.getStats();

    console.log(`[QA Reset] ✅ Reset complete. Fresh issues: ${newStats.open}`);

    res.json({
      ok: true,
      data: {
        message: 'QA data reset and fresh scan complete',
        stats: newStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Reset failed',
    });
  }
});

// ============= API Schema =============

import { apiSchemaGenerator } from '../schema/api-schema-generator.js';

/**
 * @route GET /api/v1/qa/schema
 * @description Generate and return OpenAPI schema for all routes
 */
router.get('/schema', async (_req: Request, res: Response) => {
  try {
    const spec = await apiSchemaGenerator.generate();
    res.json({
      ok: true,
      data: spec,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Schema generation failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/schema/breaking
 * @description Check for breaking API changes against saved spec
 */
router.get('/schema/breaking', async (_req: Request, res: Response) => {
  try {
    const specPath = 'docs/openapi.json';
    const changes = await apiSchemaGenerator.detectBreakingChanges(specPath);

    res.json({
      ok: true,
      data: {
        compatible: changes.compatible,
        breaking: changes.breaking,
        additions: changes.additions,
        message: changes.compatible
          ? 'No breaking changes detected'
          : `${changes.breaking.length} breaking changes found`,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Breaking change detection failed',
    });
  }
});

/**
 * @route POST /api/v1/qa/schema/save
 * @description Save current API schema to docs/openapi.json
 */
router.post('/schema/save', async (_req: Request, res: Response) => {
  try {
    const filePath = await apiSchemaGenerator.generateAndSave();

    res.json({
      ok: true,
      data: {
        message: 'API schema saved successfully',
        path: filePath,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Schema save failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/metrics
 * @description Get QA metrics with trend analysis
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = qaGuardianAgent.getMetrics();

    res.json({
      ok: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Metrics retrieval failed',
    });
  }
});

// ============= Perfection Enforcer =============

/**
 * @route GET /api/v1/qa/perfection
 * @description Run comprehensive perfection check
 */
router.get('/perfection', async (_req: Request, res: Response) => {
  try {
    const report = await perfectionEnforcer.enforce();

    res.json({
      ok: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Perfection check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/perfection/stubs
 * @description Get all stub/placeholder implementations
 */
router.get('/perfection/stubs', async (_req: Request, res: Response) => {
  try {
    const report = await perfectionEnforcer.enforce();

    res.json({
      ok: true,
      data: {
        total: report.stubs.length,
        critical: report.stubs.filter((s) => s.severity === 'critical'),
        high: report.stubs.filter((s) => s.severity === 'high'),
        medium: report.stubs.filter((s) => s.severity === 'medium'),
        low: report.stubs.filter((s) => s.severity === 'low'),
        byType: {
          placeholder: report.stubs.filter((s) => s.type === 'placeholder').length,
          stub: report.stubs.filter((s) => s.type === 'stub').length,
          todo: report.stubs.filter((s) => s.type === 'todo').length,
          simulated: report.stubs.filter((s) => s.type === 'simulated').length,
          mock: report.stubs.filter((s) => s.type === 'mock').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Stub check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/perfection/missing-endpoints
 * @description Get frontend API calls without backend handlers
 */
router.get('/perfection/missing-endpoints', async (_req: Request, res: Response) => {
  try {
    const report = await perfectionEnforcer.enforce();

    res.json({
      ok: true,
      data: {
        total: report.missingEndpoints.length,
        endpoints: report.missingEndpoints,
        recommendations: report.recommendations.filter((r) => r.includes('endpoint')),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Missing endpoints check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/perfection/incomplete
 * @description Get incomplete features by completion score
 */
router.get('/perfection/incomplete', async (_req: Request, res: Response) => {
  try {
    const report = await perfectionEnforcer.enforce();

    res.json({
      ok: true,
      data: {
        total: report.incompleteFeatures.length,
        features: report.incompleteFeatures,
        lowestScoring: report.incompleteFeatures.slice(0, 5).map((f) => ({
          name: f.name,
          score: f.completionScore,
          blockers: f.blockers.length,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Incomplete features check failed',
    });
  }
});

/**
 * @route GET /api/v1/qa/perfection/score
 * @description Get quick perfection score
 */
router.get('/perfection/score', async (_req: Request, res: Response) => {
  try {
    const lastReport = perfectionEnforcer.getLastReport();

    if (lastReport) {
      res.json({
        ok: true,
        data: {
          score: lastReport.score,
          grade: lastReport.summary.healthGrade,
          summary: lastReport.summary,
          lastCheck: lastReport.timestamp,
        },
      });
    } else {
      // Run a fresh check
      const report = await perfectionEnforcer.enforce();
      res.json({
        ok: true,
        data: {
          score: report.score,
          grade: report.summary.healthGrade,
          summary: report.summary,
          lastCheck: report.timestamp,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Score check failed',
    });
  }
});

export default router;
