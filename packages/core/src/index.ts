/**
 * @tooloo/core - Main Entry Point
 * The Soul of TooLoo.ai Synapsys V2
 * 
 * @version 2.0.0-alpha.0
 * @description Core types, context management, and typed event system
 */

// Types - The foundational data structures
export * from './types.js';

// Events - Typed pub/sub system
export * from './events/index.js';

// Context - TooLooContext factory and mutations
export * from './context/index.js';

// Re-export commonly used items at top level
export {
  // Event system
  eventBus,
  emit,
  on,
  createCorrelationId,
  TypedEventBus,
} from './events/index.js';

export {
  // Context factory
  createContext,
  withIntent,
  withSkills,
  withRouting,
  withMessage,
  withStage,
  withError,
  withResponse,
} from './context/index.js';

// Version
export const VERSION = '2.0.0-alpha.0';
