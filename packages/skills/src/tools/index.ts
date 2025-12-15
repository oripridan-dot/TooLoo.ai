/**
 * @tooloo/skills - Tools Index
 * Export all tool implementations and the executor
 *
 * @version 1.0.0
 * @skill-os true
 */

// Types
export * from './types.js';

// Executor
export {
  ToolExecutor,
  TimeoutError,
  getToolExecutor,
  createToolExecutor,
  type ToolExecutorConfig,
} from './executor.js';

// File Tools
export {
  fileReadTool,
  fileWriteTool,
  fileDeleteTool,
  listDirTool,
  fileTools,
  type FileDeleteParams,
  type FileDeleteResult,
  type ListDirParams,
  type ListDirResult,
  type DirEntry,
} from './file-tools.js';

// Search Tools
export { grepSearchTool, semanticSearchTool, searchTools } from './search-tools.js';

// Terminal Tools
export {
  terminalExecuteTool,
  checkCommandTool,
  commandRequiresApproval,
  terminalTools,
  type CheckCommandParams,
  type CheckCommandResult,
} from './terminal-tools.js';

// =============================================================================
// ALL TOOLS
// =============================================================================

import { fileTools } from './file-tools.js';
import { searchTools } from './search-tools.js';
import { terminalTools } from './terminal-tools.js';
import type { ToolImplementation } from './types.js';

/**
 * All built-in tools
 */
export const allTools: ToolImplementation<unknown, unknown>[] = [
  ...fileTools as ToolImplementation<unknown, unknown>[],
  ...searchTools as ToolImplementation<unknown, unknown>[],
  ...terminalTools as ToolImplementation<unknown, unknown>[],
];

/**
 * Register all built-in tools with the executor
 */
export function registerAllTools(executor: import('./executor.js').ToolExecutor): void {
  for (const tool of allTools) {
    executor.register(tool);
  }
}

// =============================================================================
// DEFAULT EXECUTOR WITH ALL TOOLS
// =============================================================================

import { getToolExecutor } from './executor.js';

/**
 * Get the default tool executor with all tools registered
 */
export function getDefaultToolExecutor(): import('./executor.js').ToolExecutor {
  const executor = getToolExecutor();

  // Only register if not already registered
  if (executor.listTools().length === 0) {
    registerAllTools(executor);
  }

  return executor;
}
