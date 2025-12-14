// @version 3.3.576
/**
 * @tooloo/engine - Main Entry Point
 * The Orchestration Engine - Routes requests, executes skills, manages context
 *
 * @version 2.0.0-alpha.0
 */

// Types
export * from './types.js';

// Orchestrator
export {
  Orchestrator,
  createOrchestrator,
  type OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from './orchestrator.js';

// Routing Engine
export {
  RoutingEngine,
  createRoutingEngine,
  DEFAULT_ROUTING_CONFIG,
} from './routing-engine.js';

// Skill Executor
export {
  SkillExecutor,
  createSkillExecutor,
  DEFAULT_EXECUTOR_CONFIG,
} from './skill-executor.js';

// Context Builder
export {
  ContextBuilder,
  createContextBuilder,
} from './context-builder.js';

// Tools
export {
  // Registry
  ToolRegistry,
  toolRegistry,
  createToolRegistry,
  type ToolRegistryConfig,
  type AuditEntry,
  
  // File System Tools
  FileTools,
  fileWrite,
  fileRead,
  fileDelete,
  fileList,
  fileExists,
  fileMove,
  setProjectRoot,
  getProjectRoot,
  SecurityError,
  FileOperationError,
  
  // Schemas
  FileWriteSchema,
  FileReadSchema,
  FileDeleteSchema,
  FileListSchema,
  FileExistsSchema,
  FileMoveSchema,
  
  // Types
  type FileToolName,
  type FileWriteInput,
  type FileReadInput,
  type FileDeleteInput,
  type FileListInput,
  type FileExistsInput,
  type FileMoveInput,
} from './tools/index.js';

// Version
export const VERSION = '2.0.0-alpha.0';
