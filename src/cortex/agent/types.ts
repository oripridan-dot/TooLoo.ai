// @version 3.3.13
/**
 * Agent Execution System - Types
 *
 * Core type definitions for the autonomous agent that enables
 * TooLoo to execute code, save artifacts, and manage processes
 * like this chat does.
 *
 * @module cortex/agent/types
 */

// ============= Task Types =============

export type TaskType =
  | 'generate' // Generate code from prompt
  | 'execute' // Execute code in sandbox
  | 'analyze' // Analyze code/files
  | 'fix' // Fix issues automatically
  | 'deploy' // Deploy artifacts
  | 'validate'; // Validate code/tests

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface AgentTask {
  id: string;
  type: TaskType;
  name: string;
  description?: string;
  input: TaskInput;
  options: TaskOptions;
  status: TaskStatus;
  result?: TaskResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface TaskInput {
  prompt?: string;
  code?: string;
  language?: string;
  files?: string[];
  template?: string;
  context?: Record<string, unknown>;
  // Deploy-specific fields
  target?: 'local' | 'docker' | 'git' | string;
  script?: string;
  directory?: string;
  buildCommand?: string;
  deployCommand?: string;
  environment?: Record<string, string>;
  dryRun?: boolean;
  // Docker-specific
  imageName?: string;
  containerName?: string;
  ports?: string[];
  volumes?: string[];
  // Git-specific
  branch?: string;
  remote?: string;
  commitMessage?: string;
}

export interface TaskOptions {
  saveArtifacts: boolean;
  autoApprove: boolean;
  sandbox: boolean;
  timeout?: number; // ms
  retries?: number;
  provider?: string; // AI provider to use
  model?: string; // Specific model
}

export interface TaskResult {
  success: boolean;
  output?: string;
  artifacts?: Artifact[];
  metrics?: TaskMetrics;
  logs?: string[];
}

export interface TaskMetrics {
  durationMs: number;
  tokensUsed?: number;
  costUsd?: number;
  memoryUsedMb?: number;
}

// ============= Artifact Types =============

export type ArtifactType =
  | 'code' // Source code file
  | 'component' // UI component
  | 'test' // Test file
  | 'config' // Configuration file
  | 'documentation' // Doc file
  | 'data' // Data/JSON file
  | 'binary'; // Binary file

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  description?: string;
  path?: string; // Relative path in artifacts dir
  content?: string; // For text artifacts
  language?: string;
  version: string;
  createdAt: Date;
  createdBy: string; // Task ID that created it
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface ArtifactVersion {
  version: string;
  content: string;
  createdAt: Date;
  diff?: string; // Diff from previous version
}

// ============= Process Types =============

export type ProcessStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface ProcessDefinition {
  id: string;
  name: string;
  description?: string;
  steps: ProcessStep[];
  onError: 'halt' | 'skip' | 'retry';
  maxRetries?: number;
  timeout?: number;
  variables?: Record<string, unknown>; // Shared state between steps
}

export interface ProcessStep {
  id: string;
  name: string;
  action: TaskType;
  input: TaskInput;
  dependsOn?: string[]; // Previous step IDs
  condition?: string; // JS expression to evaluate
  onSuccess?: string; // Next step ID
  onFailure?: string; // Step to run on failure
  timeout?: number;
}

export interface ProcessExecution {
  id: string;
  processId: string;
  processName: string;
  status: ProcessStatus;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  results: Map<string, TaskResult>;
  variables: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ============= Agent State =============

export interface AgentState {
  running: boolean;
  currentTask?: string;
  taskQueue: AgentTask[];
  completedTasks: AgentTask[];
  activeProcesses: ProcessExecution[];
  artifactCount: number;
  totalTasksExecuted: number;
  successRate: number;
  lastActivity: Date;
}

// ============= Execution Context =============

export interface ExecutionContext {
  taskId: string;
  processId?: string;
  stepId?: string;
  workingDir: string;
  env: Record<string, string>;
  timeout: number;
  sandbox: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  exitCode?: number;
  stderr?: string;
  durationMs: number;
  artifacts?: Artifact[];
}

// ============= Events =============

export type AgentEventType =
  | 'task:queued'
  | 'task:started'
  | 'task:progress'
  | 'task:completed'
  | 'task:failed'
  | 'process:started'
  | 'process:step:started'
  | 'process:step:completed'
  | 'process:completed'
  | 'process:failed'
  | 'artifact:created'
  | 'artifact:updated';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  taskId?: string;
  processId?: string;
  stepId?: string;
  artifactId?: string;
  data?: Record<string, unknown>;
}

// ============= Templates =============

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  template: string; // Handlebars/mustache template
  variables: TemplateVariable[];
  examples?: string[];
  tags?: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

// ============= Patterns =============

export interface CodePattern {
  id: string;
  name: string;
  description: string;
  type: 'structural' | 'behavioral' | 'creational';
  language: string;
  regex?: string;
  ast?: unknown; // AST pattern for matching
  frequency: number; // How often detected
  lastSeen: Date;
  examples: string[];
  suggestedTemplate?: string; // Template ID
}
