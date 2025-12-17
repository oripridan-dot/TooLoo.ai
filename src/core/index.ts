/**
 * @file TooLoo Genesis - Core Module Index
 * @description Exports all Genesis components
 * @version 1.0.0
 * @created 2025-12-16
 */

// The Brain - LLM abstraction with cognitive operations
export { Brain, brain } from './brain.js';
export type {
  ThoughtResult,
  PlanResult,
  PlanStep,
  ValidationResult,
  ValidationIssue,
  ReflectionResult,
  BrainConfig,
  Soul,
} from './brain.js';

// The Mind - Process planning and autonomous execution
export { ProcessPlanner, getProcessPlanner } from './process-planner.js';
export type {
  ProcessPhase,
  Goal,
  ProcessState,
  ProcessHistoryEntry,
  StepResult,
  PermissionRequest,
  ProcessMetrics,
  PlannerConfig,
} from './process-planner.js';

// The Hands - Skills execution and file operations
export { SkillsMaster, getSkillsMaster } from './skills-master.js';
export type {
  SkillDefinition,
  ActionResult,
  FileOperation,
  TerminalOperation,
  SkillsConfig,
} from './skills-master.js';

// The Boot - Genesis startup and lifecycle
export { GenesisBoot, getGenesis } from './boot.js';
export type { GenesisState } from './boot.js';

// Default export - the Genesis singleton
import { getGenesis } from './boot.js';
export default getGenesis;
