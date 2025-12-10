// @version 3.3.405 - Synapsys Cognitive Systems + AI Infrastructure Enhancement + Reflex Arc
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
import environmentHub from './core/environment-hub.js';
import { smartFS } from './core/fs-manager.js';
import { initQAGuardian } from './qa/index.js';
import { perfectionEnforcer } from './qa/guards/perfection-enforcer.js';
import { executionAgent } from './cortex/agent/execution-agent.js';
// V3.3.3: Synapsys Cognitive Systems
import { synapsysActivator } from './cortex/system-activator.js';
// V3.3.220: Design Cortex - Figma Integration
import { figmaBridge } from './cortex/design/index.js';
// V3.3.350: AI Infrastructure Enhancement - Phase 1-4
import { SmartRouter } from './precog/providers/smart-router.js';
import { OllamaProvider } from './precog/providers/ollama-provider.js';
import { EncryptionManager } from './core/security/encryption-manager.js';
import { DataEnrichmentPipeline } from './precog/engine/data-enrichment.js';
import { PluginManager } from './core/plugin-manager.js';
import { SelfHealingOrchestrator } from './cortex/self-modification/self-healing-orchestrator.js';
// V3.3.405: Reflex Arc - Spinal Cord
import { spinalCord } from './cortex/reflex/spinal-cord.js';

// Global instances for V3.3.350 modules
let smartRouter: SmartRouter | null = null;
let ollamaProvider: OllamaProvider | null = null;
let encryptionManager: EncryptionManager | null = null;
let dataEnrichment: DataEnrichmentPipeline | null = null;
let pluginManager: PluginManager | null = null;
let selfHealing: SelfHealingOrchestrator | null = null;

let heartbeatInterval: NodeJS.Timeout | null = null;

function gracefulShutdown(reason: string = 'user request') {
  console.log(`\n[System] Shutting down... (${reason})`);
  registry.updateStatus('system', 'degraded', { shutdownReason: reason });

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // V3.3.350: Stop AI Infrastructure modules
  if (selfHealing) {
    selfHealing.stop();
    console.log('[System] Self-Healing Orchestrator stopped.');
  }

  // V3.3.401: Graceful shutdown of Pinocchio components
  (async () => {
    try {
      // Save session continuity state
      const { sessionContinuity } = await import('./cortex/continuity/session-continuity.js');
      await sessionContinuity.shutdown();

      // Stop proactive scheduler
      const { proactiveScheduler } = await import('./cortex/scheduling/proactive-scheduler.js');
      await proactiveScheduler.shutdown();

      // Save self-improvement state
      const { selfImprovementEngine } =
        await import('./cortex/learning/self-improvement-engine.js');
      await selfImprovementEngine.shutdown();

      console.log('[System] Pinocchio components saved state.');
    } catch (err) {
      console.warn('[System] Error during Pinocchio shutdown:', err);
    }
  })();

  bus.publish('system', 'system:shutdown', { reason, timestamp: Date.now() });

  console.log('[System] Goodbye! 👋');
  // Give async operations a moment to complete
  setTimeout(() => process.exit(0), 500);
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
    environmentHub.registerComponent('cortex', cortex, ['intent', 'memory', 'planning', 'motor']);

    await precog.init();
    registry.updateStatus('precog', 'ready');
    environmentHub.registerComponent('precog', precog, ['routing', 'synthesis', 'providers']);

    await startNexus(); // Not async anymore, starts the server
    registry.updateStatus('nexus', 'ready');
    environmentHub.registerComponent('nexus', null, ['api', 'websocket', 'events']);

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

    // V3.3.3: Activate all Synapsys cognitive systems (learning, emergence, knowledge boost)
    try {
      console.log('\n[System] Activating Synapsys Cognitive Systems...');
      const activatorState = await synapsysActivator.activate({
        enableEmergence: true,
        enableLearning: true,
        enableKnowledgeBoost: true,
        autoBoostOnLowHealth: true,
      });

      registry.register({
        name: 'synapsys-cognitive',
        version: '3.3.3',
        status: 'ready',
        meta: {
          systemsOnline: Object.values(activatorState.systems).filter((s) => s.status === 'online')
            .length,
          overallHealth: activatorState.overallHealth,
        },
      });

      console.log(
        `[System] Synapsys Cognitive Systems: ${Math.round(activatorState.overallHealth * 100)}% health`
      );
    } catch (synapsysError) {
      console.warn('[System] Synapsys cognitive systems partial activation:', synapsysError);
      // Non-critical - continue boot
    }

    // V3.3.220: Initialize Design Cortex (Figma Integration)
    try {
      const figmaToken = process.env['FIGMA_ACCESS_TOKEN'];
      if (figmaToken) {
        figmaBridge.initialize(figmaToken);
        registry.register({
          name: 'design-cortex',
          version: '3.3.220',
          status: 'ready',
          meta: {
            figmaConnected: true,
            capabilities: ['figma-import', 'design-to-code', 'design-tokens', 'component-analysis'],
          },
        });
        console.log('[System] Design Cortex activated with Figma integration.');
      } else {
        registry.register({
          name: 'design-cortex',
          version: '3.3.220',
          status: 'degraded',
          meta: {
            figmaConnected: false,
            reason: 'FIGMA_ACCESS_TOKEN not set',
          },
        });
        console.log('[System] Design Cortex activated (Figma not configured).');
      }
    } catch (designError) {
      console.warn('[System] Design Cortex failed to initialize:', designError);
    }

    // V3.3.350: Initialize AI Infrastructure Enhancement Modules
    try {
      console.log('\n[System] Initializing AI Infrastructure Enhancement (V3.3.350)...');

      // Phase 1: Smart Router - Dynamic API Selection
      smartRouter = new SmartRouter();
      await smartRouter.initialize();
      registry.register({
        name: 'smart-router',
        version: '3.3.350',
        status: 'ready',
        meta: {
          capabilities: ['multi-provider', 'dynamic-routing', 'cost-optimization', 'latency-aware'],
        },
      });
      console.log('[System] Smart Router activated.');

      // Phase 2: Ollama Provider - Local AI (optional - silently skip if not available)
      // Note: OllamaProvider uses environment variables for URL configuration
      ollamaProvider = new OllamaProvider();
      const ollamaOnline = await ollamaProvider.isOnline();
      const ollamaUrl = process.env['OLLAMA_URL'] || 'http://localhost:11434';
      registry.register({
        name: 'ollama-provider',
        version: '3.3.350',
        status: ollamaOnline ? 'ready' : 'degraded',
        meta: {
          url: ollamaUrl,
          online: ollamaOnline,
          capabilities: ['local-inference', 'streaming', 'embeddings', 'model-management'],
        },
      });
      if (ollamaOnline) {
        console.log('[System] Ollama Provider connected (local AI available).');
      }
      // Silently skip logging if offline - it's expected when Ollama isn't installed

      // Phase 2: Encryption Manager - Security Hardening
      const encryptionKey =
        process.env['ENCRYPTION_MASTER_KEY'] || process.env['SESSION_SECRET'] || 'default-dev-key';
      encryptionManager = new EncryptionManager(encryptionKey);
      await encryptionManager.initialize();
      registry.register({
        name: 'encryption-manager',
        version: '3.3.350',
        status: 'ready',
        meta: {
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2',
          capabilities: ['api-key-encryption', 'secure-config', 'key-rotation'],
        },
      });
      console.log('[System] Encryption Manager activated.');

      // Phase 3: Data Enrichment Pipeline
      dataEnrichment = new DataEnrichmentPipeline();
      await dataEnrichment.initialize();
      registry.register({
        name: 'data-enrichment',
        version: '3.3.350',
        status: 'ready',
        meta: { capabilities: ['context-augmentation', 'knowledge-base', 'relevance-scoring'] },
      });
      console.log('[System] Data Enrichment Pipeline activated.');

      // Phase 3: Plugin Manager - Ecosystem Extensions
      pluginManager = new PluginManager(process.cwd());
      await pluginManager.initialize();
      const loadedPlugins = pluginManager.listPlugins();
      registry.register({
        name: 'plugin-manager',
        version: '3.3.350',
        status: 'ready',
        meta: {
          pluginsLoaded: loadedPlugins.length,
          capabilities: ['plugin-lifecycle', 'hook-system', 'dependency-resolution'],
        },
      });
      console.log(`[System] Plugin Manager activated (${loadedPlugins.length} plugins loaded).`);

      // Phase 4: Self-Healing Orchestrator
      selfHealing = new SelfHealingOrchestrator();
      await selfHealing.initialize();
      await selfHealing.start(); // Use public start method which starts monitoring
      registry.register({
        name: 'self-healing',
        version: '3.3.350',
        status: 'ready',
        meta: {
          monitoringInterval: 60000,
          capabilities: ['health-monitoring', 'auto-repair', 'rollback', 'ai-fix'],
        },
      });
      console.log('[System] Self-Healing Orchestrator activated.');

      // Register components with environment hub
      environmentHub.registerComponent('smart-router', smartRouter, ['routing', 'multi-provider']);
      environmentHub.registerComponent('encryption', encryptionManager, ['security', 'api-keys']);
      environmentHub.registerComponent('data-enrichment', dataEnrichment, ['context', 'knowledge']);
      environmentHub.registerComponent('plugins', pluginManager, ['extensions', 'hooks']);
      environmentHub.registerComponent('self-healing', selfHealing, ['monitoring', 'repair']);

      console.log('[System] AI Infrastructure Enhancement V3.3.350 fully activated.');
    } catch (infraError) {
      console.warn('[System] AI Infrastructure Enhancement partial activation:', infraError);
      // Non-critical - continue boot
    }

    // V3.3.401: Project Pinocchio - Autonomous AI Infrastructure
    // Separated from main infrastructure to ensure independent loading
    try {
      console.log('\n[System] Initializing Project Pinocchio (V3.3.401)...');

      // Pinocchio Phase 1: Self-Improvement Engine - Autonomous Learning
      const { selfImprovementEngine } =
        await import('./cortex/learning/self-improvement-engine.js');
      await selfImprovementEngine.initialize();
      registry.register({
        name: 'self-improvement',
        version: '3.3.401',
        status: 'ready',
        meta: {
          capabilities: [
            'prompt-optimization',
            'ab-testing',
            'goal-tracking',
            'performance-trends',
          ],
        },
      });
      console.log('[Pinocchio] Self-Improvement Engine activated.');

      // Pinocchio Phase 2: Proactive Task Scheduler - Autonomous Task Initiation
      const { proactiveScheduler } = await import('./cortex/scheduling/proactive-scheduler.js');
      await proactiveScheduler.initialize();
      registry.register({
        name: 'proactive-scheduler',
        version: '3.3.401',
        status: 'ready',
        meta: {
          tasks: proactiveScheduler.getTasks().length,
          capabilities: [
            'scheduled-tasks',
            'event-triggered',
            'opportunity-detection',
            'background-processing',
          ],
        },
      });
      console.log('[Pinocchio] Proactive Scheduler activated.');

      // Pinocchio Phase 3: Session Continuity - Cross-Session Persistence
      const { sessionContinuity } = await import('./cortex/continuity/session-continuity.js');
      const continuityReport = await sessionContinuity.initialize();
      registry.register({
        name: 'session-continuity',
        version: '3.3.401',
        status: 'ready',
        meta: {
          sessionId: sessionContinuity.getSessionId(),
          sessionCount: sessionContinuity.getSessionCount(),
          continuityScore: continuityReport.continuityScore,
          capabilities: [
            'session-persistence',
            'task-resumption',
            'context-preservation',
            'goal-tracking',
          ],
        },
      });
      console.log('[Pinocchio] Session Continuity Manager activated.');

      // V3.3.405: Pinocchio Phase 4 - Reflex Arc (Spinal Cord)
      // Immediate file change response system for self-healing
      spinalCord.start();
      console.log('[Pinocchio] Spinal Cord (Reflex Arc) activated.');

      console.log('[System] Project Pinocchio V3.3.405 fully activated - TooLoo is now sovereign.');
    } catch (pinocchioError) {
      console.warn('[System] Project Pinocchio partial activation:', pinocchioError);
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
