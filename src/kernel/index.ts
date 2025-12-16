/**
 * @file TooLoo.ai Skills OS - Kernel Index
 * @description Main entry point for the Skills OS kernel
 * @version 1.2.0
 * @skill-os true
 */

// Core types
export * from './types.js';

// Registry
export { registry, SkillRegistry, type RegistryStats } from './registry.js';

// Router
export {
  router,
  SkillRouter,
  createKeywordClassifier,
  defaultClassifiers,
  type RouteResult,
  type RouterConfig,
} from './router.js';

// Kernel
export { kernel, Kernel, SkillNotFoundError, RequirementError } from './kernel.js';

// Server
export { createKernelRouter, kernelErrorHandler, startKernelServer } from './server.js';

// Worker Pool
export {
  WorkerPool,
  getWorkerPool,
  createWorkerPool,
  type WorkerTask,
  type WorkerResult,
  type WorkerPoolConfig,
} from './worker-pool.js';

// Orchestrator Bridge - Seamless Kernel → Orchestrator integration
export {
  orchestratorBridge,
  OrchestratorBridge,
  type BridgeConfig,
  type BridgeState,
  type LLMCompletionResult,
} from './orchestrator-bridge.js';

// Re-export defineSkill helper for convenience
export { defineSkill } from './types.js';
