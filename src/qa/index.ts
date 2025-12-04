// @version 2.2.662
/**
 * QA Guardian - TooLoo.ai's Autonomous Quality Assurance System
 *
 * The QA Guardian is the system's immune system - it continuously monitors,
 * validates, and maintains the entire TooLoo.ai platform.
 *
 * @module qa
 * @description Complete system integrity platform with:
 * - Frontend↔Backend wire verification
 * - Filesystem hygiene (duplicates, orphans, corruption)
 * - Core system integration via EventBus
 * - Autonomous AI agent for continuous maintenance
 * - Feature validation (quality, connectivity, performance)
 * - ZERO ERRORS policy enforcement
 * - Timestamp-based issue prioritization
 * - Autonomous fixing without manual intervention
 */

import { bus } from '../core/event-bus.js';
import { registry } from '../core/module-registry.js';

// Core modules
export { SchemaGuard } from './guards/schema-guard.js';
export { WireVerifier } from './wiring/wire-verifier.js';
export { FileSystemHygiene } from './hygiene/filesystem-hygiene.js';
export { LegacyHunter } from './hygiene/legacy-hunter.js';
export { SystemIntegrator } from './core/system-integrator.js';
export { QAGuardianAgent } from './agent/qa-guardian-agent.js';

// Feature Validation (NEW)
export {
  FeatureValidator,
  featureValidator,
  runValidation,
} from './validation/feature-validator.js';

// Autonomous fixing modules
export { IssueTracker, issueTracker } from './agent/issue-tracker.js';
export { AutonomousFixer, autonomousFixer } from './agent/autonomous-fixer.js';

// Types
export * from './types/index.js';

// Routes
export { default as qaRoutes } from './routes/qa.js';

/**
 * Initialize the QA Guardian system
 * This should be called during system bootstrap after core modules are ready
 */
export async function initQAGuardian(): Promise<void> {
  console.log('[QA Guardian] 🛡️ Initializing system integrity platform...');

  // Register with module registry
  registry.register({
    name: 'qa-guardian',
    version: '2.0.0',
    status: 'booting',
    meta: {
      description: 'Autonomous Quality Assurance System',
      capabilities: ['wire-verification', 'filesystem-hygiene', 'legacy-detection', 'auto-repair'],
    },
  });

  try {
    // Import and start the agent
    const { qaGuardianAgent } = await import('./agent/qa-guardian-agent.js');
    await qaGuardianAgent.start();

    registry.updateStatus('qa-guardian', 'ready');
    bus.publish('system', 'qa:guardian_ready', {
      timestamp: Date.now(),
      version: '2.0.0',
    });

    console.log('[QA Guardian] ✅ System integrity platform ready');
  } catch (error) {
    console.error('[QA Guardian] ❌ Failed to initialize:', error);
    registry.updateStatus('qa-guardian', 'error', { error: String(error) });
    throw error;
  }
}
