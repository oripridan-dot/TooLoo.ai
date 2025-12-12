/**
 * @tooloo/evals - Main Entry Point
 * Cognitive Unit Testing harness
 * 
 * @version 2.0.0-alpha.0
 */

// Types
export * from './types.js';

// Loader
export {
  loadGoldenInputs,
  loadGoldenInputById,
  getGoldenInputsSummary,
  type LoadOptions,
} from './loader.js';

// Evaluator
export {
  CognitiveEvaluator,
} from './evaluator.js';

// Version
export const VERSION = '2.0.0-alpha.0';
