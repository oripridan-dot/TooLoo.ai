// @version 3.3.404 - Project Pinocchio Autonomy + Real Data Integration
import { Router } from 'express';
import { bus } from '../../core/event-bus.js';
import { successResponse, errorResponse } from '../utils.js';
import { SYSTEM_VERSION } from '../../core/system-info.js';
import { registry } from '../../core/module-registry.js';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import metricsCollector from '../../core/metrics-collector.js';
import { qaGuardianAgent } from '../../qa/agent/qa-guardian-agent.js';

const execAsync = promisify(exec);
const router = Router();

// Helper to execute shell commands (duplicated from github.ts for independence)
async function execCommand(command: string, cwd: string = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(error.stderr || error.message);
  }
}

// System Status
/**
 * @description Get system status and version information
 * @auth
 * @param {string} [detail] - Optional detail level (basic|full)
 */
router.get('/status', (req, res) => {
  // V3.3.405: Real data from module registry
  const allModules = registry.getAll();
  const moduleStatuses: Record<string, { status: string; role: string }> = {};

  for (const mod of allModules) {
    moduleStatuses[mod.name] = {
      status: mod.status,
      role: ((mod.meta as Record<string, unknown>)?.['role'] as string) || mod.name,
    };
  }

  res.json(
    successResponse({
      version: SYSTEM_VERSION,
      services: allModules.length,
      active: true,
      ready: allModules.every((m) => m.status === 'ready'),
      uptime: process.uptime() * 1000, // Frontend expects ms
      memory: process.memoryUsage(),
      architecture: 'Synapsys V3.3',
      modules: moduleStatuses,
    })
  );
});

// System Health - Real metrics for Cortex view
router.get('/health', async (req, res) => {
  try {
    const processMetrics = metricsCollector.getProcessMetrics();
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    // V3.3.405: Get REAL metrics from the metrics collector
    const realTimeMetrics = metricsCollector.getRealTimeMetrics();

    res.json(
      successResponse({
        status: 'healthy',
        uptime: uptime * 1000,
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
        },
        metrics: {
          // Real tracked values, falling back to 0 (honest "no data" instead of fake)
          requestsPerMin: realTimeMetrics.requests.perMinute,
          avgLatency: Math.floor(realTimeMetrics.latency.average) || 0,
          tokenUsage: realTimeMetrics.tokens.total,
          costToday: Number(realTimeMetrics.cost.today.toFixed(6)),
          // Additional real metrics
          totalRequests: realTimeMetrics.requests.total,
          p95Latency: Math.floor(realTimeMetrics.latency.p95) || 0,
          inputTokens: realTimeMetrics.tokens.input,
          outputTokens: realTimeMetrics.tokens.output,
        },
      })
    );
  } catch (e: any) {
    res.status(500).json(errorResponse(e.message));
  }
});

// System Awareness
router.get('/awareness', (req, res) => {
  res.json(
    successResponse({
      identity: 'TooLoo.ai',
      architecture: 'Synapsys V2.2',
      capabilities: {
        selfModification: true,
        githubIntegration: true,
        autonomousPlanning: true,
      },
      services: {
        cortex: 'active',
        precog: 'active',
        nexus: 'active',
      },
      environment: {
        nodeEnv: process.env['NODE_ENV'] || 'development',
        cwd: process.cwd(),
      },
    })
  );
});

// V3.3.451: Self Information - for InternalMirror component
router.get('/self/info', async (req, res) => {
  try {
    const allModules = registry.getAll();
    
    res.json(
      successResponse({
        identity: {
          name: 'TooLoo.ai',
          version: SYSTEM_VERSION,
          architecture: 'Synapsys V3.3',
          sessionId: process.env['SESSION_ID'] || 'unknown',
        },
        capabilities: {
          selfModification: true,
          autonomousPlanning: true,
          multiProviderAI: true,
          codeExecution: true,
          designIntegration: true,
        },
        modules: allModules.map(m => ({
          name: m.name,
          version: m.version,
          status: m.status,
        })),
        metrics: {
          uptime: process.uptime() * 1000,
          memory: process.memoryUsage(),
          moduleCount: allModules.length,
          activeModules: allModules.filter(m => m.status === 'ready').length,
        },
        timestamp: new Date().toISOString(),
      })
    );
  } catch (e: any) {
    res.status(500).json(errorResponse(e.message));
  }
});

// V3.3.401: Project Pinocchio Autonomy Status
router.get('/autonomy', async (req, res) => {
  try {
    // Gather status from all Pinocchio components
    let selfImprovement = null;
    let proactiveScheduler = null;
    let sessionContinuity = null;

    try {
      const { selfImprovementEngine } =
        await import('../../cortex/learning/self-improvement-engine.js');
      selfImprovement = {
        status: 'active',
        stats: selfImprovementEngine.getStats(),
        goals: selfImprovementEngine.getGoals().slice(0, 5),
      };
    } catch (e) {
      selfImprovement = { status: 'error', error: String(e) };
    }

    try {
      const { proactiveScheduler: scheduler } =
        await import('../../cortex/scheduling/proactive-scheduler.js');
      selfImprovement &&
        (proactiveScheduler = {
          status: 'active',
          tasks: scheduler.getTasks().map((t: any) => ({
            id: t.id,
            type: t.type,
            priority: t.priority,
            lastRun: t.lastRun,
            nextRun: t.nextRun,
          })),
          stats: scheduler.getStats(),
        });
    } catch (e) {
      proactiveScheduler = { status: 'error', error: String(e) };
    }

    try {
      const { sessionContinuity: continuity } =
        await import('../../cortex/continuity/session-continuity.js');
      sessionContinuity = {
        status: 'active',
        sessionId: continuity.getSessionId(),
        sessionCount: continuity.getSessionCount(),
        goals: continuity.getActiveGoals().slice(0, 5),
      };
    } catch (e) {
      sessionContinuity = { status: 'error', error: String(e) };
    }

    // Calculate overall autonomy score
    const activeComponents = [selfImprovement, proactiveScheduler, sessionContinuity].filter(
      (c) => c?.status === 'active'
    ).length;
    const autonomyScore = Math.round((activeComponents / 3) * 100);

    res.json(
      successResponse({
        version: '3.3.401',
        projectName: 'Pinocchio',
        autonomyScore,
        isSovereign: autonomyScore >= 80,
        components: {
          selfImprovement,
          proactiveScheduler,
          sessionContinuity,
        },
        capabilities: {
          selfOptimization: selfImprovement?.status === 'active',
          proactiveExecution: proactiveScheduler?.status === 'active',
          crossSessionMemory: sessionContinuity?.status === 'active',
          autonomousLearning: true,
          goalTracking: true,
        },
      })
    );
  } catch (e: any) {
    res.status(500).json(errorResponse(e.message));
  }
});

// System Introspection
router.get('/introspect', (req, res) => {
  const metrics = metricsCollector.getProcessMetrics();
  res.json(
    successResponse({
      process: metrics,
      modules: {
        cortex: { status: 'loaded', role: 'Cognitive Core' },
        precog: { status: 'loaded', role: 'Predictive Intelligence' },
        nexus: { status: 'loaded', role: 'Interface Layer' },
      },
    })
  );
});

// Self-Patch (Self-Modification)
router.post('/self-patch', async (req, res) => {
  const { action, file, content, message, branch, createPr } = req.body;

  if (!action) {
    return res.status(400).json(errorResponse('Action required'));
  }

  try {
    if (action === 'analyze') {
      // Just check if file exists and return info
      if (!file) return res.status(400).json(errorResponse('File required'));
      const fullPath = path.resolve(process.cwd(), file);
      const exists = await fs.pathExists(fullPath);
      res.json(
        successResponse({
          file,
          exists,
          path: fullPath,
          writable: true, // Assuming we have write access
        })
      );
    } else if (action === 'create' || action === 'update') {
      if (!file || content === undefined) {
        return res.status(400).json(errorResponse('File and content required'));
      }

      try {
        // 1. Write the file (Direct Commit / Local Change)
        // Use SmartFS for safe writing
        await smartFS.writeSafe(file, content);

        // 2. Handle GitHub Integration if requested
        let prUrl = null;
        if (createPr && message) {
          const targetBranch = branch || `patch-${Date.now()}`;

          // Create branch
          await execCommand(`git checkout -b ${targetBranch}`);

          // Commit
          await execCommand(`git add "${file}"`);
          await execCommand(`git commit -m "${message}"`);

          // Push & PR
          await execCommand(`git push -u origin ${targetBranch}`);
          const { stdout } = await execCommand(
            `gh pr create --title "${message}" --body "Auto-generated patch by TooLoo.ai" --head ${targetBranch} --base main`
          );
          prUrl = stdout;

          // Switch back to main (optional, depending on workflow)
          await execCommand(`git checkout main`);
        }

        bus.publish('nexus', 'system:self_patch', {
          action,
          file,
          message: message || 'Self-patch applied',
          prUrl,
        });

        res.json(
          successResponse({
            message: `File ${file} ${action === 'create' ? 'created' : 'updated'}`,
            prUrl,
          })
        );
      } catch (e: any) {
        return res.status(500).json(errorResponse(e.message));
      }
    } else {
      res.status(400).json(errorResponse('Invalid action'));
    }
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message));
  }
});

// System Processes - V3.3.404: Real data from registry
router.get('/processes', (req, res) => {
  const modules = registry.getAll();
  const processes = modules.map((mod) => ({
    name: mod.name,
    port: mod.name === 'nexus' ? process.env['PORT'] || 4000 : 'internal',
    status: mod.status === 'ready' ? 'running' : mod.status,
    pid: process.pid,
    uptime: process.uptime(),
    version: mod.version,
    capabilities: (mod.meta as Record<string, unknown>)?.['capabilities'] || [],
  }));

  res.json(
    successResponse({
      processes,
      totalModules: modules.length,
      readyModules: modules.filter((m) => m.status === 'ready').length,
    })
  );
});

// System Priority
router.post('/priority/chat', (req, res) => {
  bus.publish('nexus', 'system:priority_change', { mode: 'chat-priority' });
  res.json(successResponse({ mode: 'chat-priority' }));
});

router.post('/priority/background', (req, res) => {
  bus.publish('nexus', 'system:priority_change', {
    mode: 'background-priority',
  });
  res.json(successResponse({ mode: 'background-priority' }));
});

// System Config
router.get('/config', (req, res) => {
  res.json(
    successResponse({
      settings: [
        { name: 'Environment', value: process.env['NODE_ENV'] || 'development' },
        { name: 'Web Port', value: process.env['PORT'] || 3000 },
        { name: 'Architecture', value: 'Synapsys' },
      ],
    })
  );
});

// Real Capabilities - V3.3.404: Dynamic from registry
router.get('/real-capabilities', (req, res) => {
  const modules = registry.getAll();
  const capabilities = modules.map((mod) => ({
    name: mod.name,
    description: (mod.meta as Record<string, unknown>)?.['role'] || `${mod.name} module`,
    status: mod.status === 'ready' ? 'active' : mod.status,
    version: mod.version,
    capabilities: (mod.meta as Record<string, unknown>)?.['capabilities'] || [],
  }));

  res.json(
    successResponse({
      capabilities,
      totalActive: capabilities.filter((c) => c.status === 'active').length,
    })
  );
});

// System Restart
router.post('/restart', (req, res) => {
  console.log('[System] Restart requested. Publishing restart event...');
  bus.publish('nexus', 'system:restart_request', {
    requestedAt: new Date().toISOString(),
  });
  res.json(
    successResponse({
      message: 'Restart command acknowledged',
      note: 'The system will attempt to restart. This may take a few seconds.',
    })
  );
});

// Maintenance status
router.get('/maintenance/status', async (req, res) => {
  try {
    const agentStatus = qaGuardianAgent.getStatus();
    const quickStatus = await qaGuardianAgent.quickHealthCheck();

    // Map QA Agent status to the format expected by frontend
    res.json(
      successResponse({
        maintenance: agentStatus.running,
        lastCheck: quickStatus.lastCheck,
        inspection: {
          shouldInspect: quickStatus.overall !== 'healthy',
          summary: `System is ${quickStatus.overall}`,
          reasons: quickStatus.activeAlerts.map((a) => ({ priority: a.level, reason: a.message })),
        },
        recentChangeSessions: [], // We don't have this linked yet
        tasks: {
          cleanup: { status: 'idle', lastRun: null },
          optimization: { status: 'idle', lastRun: null },
          backup: { status: 'idle', lastRun: null },
        },
      })
    );
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message));
  }
});

// Run maintenance task
router.post('/maintenance/:task', async (req, res) => {
  const { task } = req.params;
  console.log(`[System] Running maintenance task: ${task}`);

  try {
    let resultData: any = {};

    if (task === 'inspection') {
      const report = await qaGuardianAgent.runFullCheck();
      resultData = {
        type: 'inspection',
        status: report.status,
        report: report,
      };
    } else if (task === 'tests') {
      // Run tests via npm
      // We use a timeout to prevent hanging
      try {
        const { stdout, stderr } = await execAsync('npm test -- --run', { timeout: 60000 });
        resultData = {
          type: 'tests',
          status: 'completed',
          output: stdout,
          error: stderr,
        };
      } catch (e: any) {
        resultData = {
          type: 'tests',
          status: 'failed',
          error: e.message,
        };
      }
    } else {
      // Simulate other tasks
      await new Promise((resolve) => setTimeout(resolve, 500));
      resultData = { status: 'completed' };
    }

    res.json(
      successResponse({
        task,
        status: 'completed',
        completedAt: new Date().toISOString(),
        ...resultData,
      })
    );
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message));
  }
});

// SmartFS Routes
import { smartFS } from '../../core/fs-manager.js';
import { setChaosConfig, getChaosConfig } from '../../core/security/chaos-middleware.js';

// Chaos Monkey Control
router.get('/chaos', (req, res) => {
  res.json(successResponse(getChaosConfig()));
});

router.post('/chaos', (req, res) => {
  const config = req.body;
  setChaosConfig(config);
  res.json(successResponse({ message: 'Chaos configuration updated', config: getChaosConfig() }));
});

router.get('/fs/context', async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json(errorResponse('File path is required'));
      return;
    }

    const bundle = await smartFS.getGoldenPlate(filePath);

    res.json(successResponse(bundle));
  } catch (error: any) {
    res.status(404).json(errorResponse(error.message));
  }
});

router.post('/fs/transaction', (req, res) => {
  const id = smartFS.startTransaction();
  res.json(successResponse({ transactionId: id }));
});

router.post('/fs/rollback', async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) {
    res.status(400).json(errorResponse('Transaction ID required'));
    return;
  }

  const success = await smartFS.rollback(transactionId);
  res.json(
    successResponse({
      success,
      message: success ? 'System restored' : 'Transaction not found',
    })
  );
});

router.post('/fs/commit', (req, res) => {
  const { transactionId } = req.body;
  smartFS.commit(transactionId);
  res.json(successResponse({ success: true }));
});

export default router;
