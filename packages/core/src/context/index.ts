/**
 * @tooloo/core - Context Module
 * Re-exports all context-related functionality
 * 
 * @version 2.0.0-alpha.0
 */

export {
  createContext,
  createEmptyMemoryState,
  createEmptyRoutingState,
  withIntent,
  withSkills,
  withRouting,
  withMessage,
  withStage,
  withError,
  withResponse,
  getExecutionTime,
  hasErrors,
  hasFatalErrors,
  getRemainingTokens,
  serializeContext,
  type CreateContextOptions,
} from './factory.js';
