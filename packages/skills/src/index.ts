/**
 * @tooloo/skills - Main Entry Point
 * Skill registry, loader, router, and definitions
 * 
 * @version 2.0.0-alpha.0
 */

// Types
export * from './types.js';

// Registry
export { SkillRegistry, skillRegistry } from './registry.js';

// Loader
export { 
  SkillLoader, 
  loadSkillsFromDirectory, 
  defineSkill,
  type SkillLoaderOptions,
} from './loader.js';

// Router (The "Root Skill" - embedding-based routing)
export {
  SkillRouter,
  type SkillEmbedding,
  type RoutingResult,
  type RouterConfig,
  type EmbedFunction,
  type LLMRouterFunction,
} from './router.js';

// Version
export const VERSION = '2.0.0-alpha.0';
