/**
 * @tooloo/skills - Main Entry Point
 * Skill registry, loader, router, tools, engines, services, and definitions
 *
 * @version 1.3.0
 * @skill-os true
 *
 * This package provides:
 * - Skill loading and registration
 * - Intent-based routing
 * - Tool execution (file, search, terminal)
 * - Native engines (learning, evolution, emergence, routing)
 * - Services (orchestrator, scheduler)
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

// Hot Reloader
export {
  SkillHotReloader,
  createHotReloader,
  type HotReloaderConfig,
  type LoadedSkill,
} from './hot-reloader.js';

// Tools
export * from './tools/index.js';

// Native Engines - NO LEGACY DEPENDENCIES
export * from './engines/index.js';

// Services - Orchestration & Scheduling
export * from './services/index.js';

// Version
export const VERSION = '1.3.0';
