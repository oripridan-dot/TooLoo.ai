/**
 * @file Native Engines Index
 * @description Exports all native Skills OS engines
 * @version 1.2.1
 * @skill-os true
 *
 * These engines are built natively for Skills OS.
 * They have ZERO dependencies on legacy src/cortex or src/precog code.
 */

// Types
export * from './types.js';

// Learning Engine
export { LearningEngine, getLearningEngine, resetLearningEngine } from './learning-engine.js';

// Evolution Engine
export { EvolutionEngine, getEvolutionEngine, resetEvolutionEngine } from './evolution-engine.js';

// Emergence Engine
export { EmergenceEngine, getEmergenceEngine, resetEmergenceEngine } from './emergence-engine.js';

// Routing Engine
export { RoutingEngine, getRoutingEngine, resetRoutingEngine } from './routing-engine.js';

// =============================================================================
// ENGINE INITIALIZATION
// =============================================================================

import { getLearningEngine } from './learning-engine.js';
import { getEvolutionEngine } from './evolution-engine.js';
import { getEmergenceEngine } from './emergence-engine.js';
import { getRoutingEngine } from './routing-engine.js';
import type {
  ILearningEngine,
  IEvolutionEngine,
  IEmergenceEngine,
  IRoutingEngine,
} from './types.js';

export interface EngineConfig {
  dataDir?: string;
}

export interface EngineServices {
  learning: ILearningEngine;
  evolution: IEvolutionEngine;
  emergence: IEmergenceEngine;
  routing: IRoutingEngine;
}

/**
 * Initialize all engines and return the services interface
 */
export async function initializeEngines(config?: EngineConfig): Promise<EngineServices> {
  const dataDir = config?.dataDir ?? './data/engines';

  console.log('[Engines] Initializing native Skills OS engines...');

  // Initialize each engine
  const learning = getLearningEngine({
    persistPath: `${dataDir}/learning-state.json`,
    autoSaveInterval: 60000,
  });

  const evolution = getEvolutionEngine({
    persistPath: `${dataDir}/evolution-state.json`,
  });

  const emergence = getEmergenceEngine({
    persistPath: `${dataDir}/emergence-state.json`,
  });

  const routing = getRoutingEngine();

  // Initialize all
  await Promise.all([
    learning.initialize(),
    evolution.initialize(),
    emergence.initialize(),
    routing.initialize(),
  ]);

  console.log('[Engines] ✅ All native engines initialized');

  return {
    learning,
    evolution,
    emergence,
    routing,
  };
}

/**
 * Shutdown all engines
 */
export async function shutdownEngines(engines: EngineServices): Promise<void> {
  console.log('[Engines] Shutting down native engines...');

  await Promise.all([
    engines.learning.shutdown(),
    engines.evolution.shutdown(),
    engines.emergence.shutdown(),
    engines.routing.shutdown(),
  ]);

  console.log('[Engines] ✅ All engines shut down');
}

/**
 * Get engine health summary
 */
export function getEngineHealth(engines: EngineServices): Record<string, boolean> {
  return {
    learning: engines.learning.isHealthy(),
    evolution: engines.evolution.isHealthy(),
    emergence: engines.emergence.isHealthy(),
    routing: engines.routing.isHealthy(),
  };
}

/**
 * Get combined engine metrics
 */
export function getEngineMetrics(engines: EngineServices) {
  return {
    learning: engines.learning.getMetrics(),
    evolution: engines.evolution.getMetrics(),
    emergence: engines.emergence.getMetrics(),
    routing: engines.routing.getMetrics(),
  };
}
