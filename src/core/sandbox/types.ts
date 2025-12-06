// @version 3.3.203
/**
 * Sandbox Types - Shared interfaces for sandbox implementations
 * 
 * Extracted to break circular dependency between docker-sandbox.ts and sandbox-manager.ts
 */

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  ok: boolean;
  timedOut?: boolean;
  resourceUsage?: ResourceUsage;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryUsedMB: number;
  memoryLimitMB: number;
  peakMemoryMB: number;
}

export interface SandboxOptions {
  id: string;
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  mode?: 'local' | 'docker';
  // Resource limits
  maxCpuPercent?: number; // Default 50%
  maxMemoryMB?: number; // Default 512MB
  maxProcesses?: number; // Default 100
}

export interface SandboxMetadata {
  id: string;
  createdAt: number;
  lastUsedAt: number;
  executionCount: number;
  totalDuration: number;
  mode: string;
}

export interface ISandbox {
  id: string;
  start(): Promise<void>;
  exec(command: string): Promise<ExecutionResult>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getMetadata(): SandboxMetadata;
  getResourceUsage(): Promise<ResourceUsage | null>;
}
