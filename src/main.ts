// @version 3.3.1 - Architecture cleanup: moved nexus/engine to proper homes
import 'dotenv/config';
import * as readline from 'readline';
import { bus } from './core/event-bus.js';
import './core/quality/Critic.js'; // Initialize The Critic (Synapsys V3)
import { cortex } from './cortex/index.js';
import { precog } from './precog/index.js';
import { startNexus } from './nexus/index.js';
import { VersionManager } from './core/version-manager.js';
import { SYSTEM_VERSION, SYSTEM_ID, SYSTEM_NAME } from './core/system-info.js';
import { registry } from './core/module-registry.js';
import { smartFS } from './core/fs-manager.js';
import { initQAGuardian } from './qa/index.js';
import { perfectionEnforcer } from './qa/guards/perfection-enforcer.js';
import { executionAgent } from './cortex/agent/execution-agent.js';

let heartbeatInterval: NodeJS.Timeout | null = null;

function gracefulShutdown(reason: string = 'user request') {
  console.log(`\n[System] Shutting down... (${reason})`);
  registry.updateStatus('system', 'degraded', { shutdownReason: reason });

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  bus.publish('system', 'system:shutdown', { reason, timestamp: Date.now() });

  console.log('[System] Goodbye! 👋');
  process.exit(0);
}

async function bootstrap() {
  console.log('----------------------------------------');
  console.log(`   ${SYSTEM_NAME} V${SYSTEM_VERSION} • Synapsys Architecture    `);
  console.log(`   Session ID: ${SYSTEM_ID}`);
  console.log('----------------------------------------');

  // Global Error Handling
  process.on('uncaughtException', (err) => {
    console.error('[System] Uncaught Exception:', err);
    registry.updateStatus('system', 'error', { error: err.message });
  });

  // Graceful shutdown handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Register System Core
  registry.register({
    name: 'system',
    version: SYSTEM_VERSION,
    status: 'booting',
    meta: { id: SYSTEM_ID },
  });

  // Initialize Modules
  try {
    // Cleanup temp files on startup to prevent memory bloat
    await smartFS.cleanRecovery(5);
    console.log('[System] Startup cleanup complete.');

    await cortex.init();
    registry.updateStatus('cortex', 'ready');

    await precog.init();
    registry.updateStatus('precog', 'ready');

    await startNexus(); // Not async anymore, starts the server
    registry.updateStatus('nexus', 'ready');

    // Initialize Version Manager
    const versionManager = new VersionManager(bus, process.cwd());
    versionManager.start();

    // Initialize Agent Execution System (Synapsys V3.3)
    try {
      await executionAgent.initialize();
      executionAgent.start();
      registry.register({
        name: 'execution-agent',
        version: '3.3.0',
        status: 'ready',
        meta: { capabilities: ['generate', 'execute', 'analyze', 'fix', 'validate'] },
      });
      console.log('[System] Execution Agent activated.');
    } catch (agentError) {
      console.warn('[System] Execution Agent failed to initialize:', agentError);
    }

    // Initialize QA Guardian (Synapsys QA System)
    try {
      await initQAGuardian();
      registry.updateStatus('qa-guardian', 'ready');
      console.log('[System] QA Guardian activated.');
    } catch (qaError) {
      console.warn('[System] QA Guardian failed to initialize:', qaError);
      // Non-critical - continue boot
    }

    bus.publish('system', 'system:boot_complete', { version: SYSTEM_VERSION });
    registry.updateStatus('system', 'ready');
    console.log('[System] All systems nominal.');
    console.log('----------------------------------------');
    console.log('   Running in autonomous mode (no user input required)');
    console.log('   Press Ctrl+C to exit gracefully');
    console.log('----------------------------------------');

    // Run startup perfection check (non-blocking)
    setTimeout(async () => {
      try {
        console.log('\n[PerfectionEnforcer] Running startup quality scan...');
        const report = await perfectionEnforcer.enforce();

        if (report.missingEndpoints.length > 0 || report.summary.criticalStubs > 0) {
          console.log('\n' + '⚠'.repeat(30));
          console.log('[PerfectionEnforcer] ATTENTION - Issues detected:');
          if (report.missingEndpoints.length > 0) {
            console.log(`   ❌ ${report.missingEndpoints.length} missing API endpoint(s)`);
          }
          if (report.summary.criticalStubs > 0) {
            console.log(`   ⚠️  ${report.summary.criticalStubs} critical stub(s)`);
          }
          console.log(`   📊 Score: ${report.score}/100 (Grade: ${report.summary.healthGrade})`);
          console.log('   💡 Run: curl http://localhost:4000/api/v1/qa/perfection');
          console.log('⚠'.repeat(30) + '\n');
        } else {
          console.log(
            `[PerfectionEnforcer] ✅ All clear! Score: ${report.score}/100 (Grade: ${report.summary.healthGrade})`
          );
        }
      } catch (error) {
        console.warn('[PerfectionEnforcer] Startup check failed:', error);
      }
    }, 5000); // Run 5 seconds after boot

    // System Heartbeat (Sync Pulse)
    heartbeatInterval = setInterval(() => {
      bus.publish('system', 'system:heartbeat', {
        timestamp: Date.now(),
        uptime: process.uptime(),
        modules: registry.getAll(),
      });
    }, 5000);

    // NOTE: Removed interactive TTY listener to run in fully autonomous mode
    // The system no longer requires user input to keep running
    // All operations are automated and non-blocking
  } catch (error) {
    console.error('[System] Boot failed:', error);
    registry.updateStatus('system', 'error', { error: String(error) });
    process.exit(1);
  }
}

bootstrap();
