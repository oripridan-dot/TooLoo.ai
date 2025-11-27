// @version 2.2.1
import { EventEmitter } from 'events';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface SandboxOptions {
  id: string;
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface ISandbox {
  id: string;
  start(): Promise<void>;
  exec(command: string): Promise<ExecutionResult>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export class SandboxManager extends EventEmitter {
  private sandboxes: Map<string, ISandbox> = new Map();

  constructor() {
    super();
  }

  async createSandbox(options: SandboxOptions): Promise<ISandbox> {
    // TODO: Implement DockerSandbox or ProcessSandbox
    throw new Error("Method not implemented.");
  }

  getSandbox(id: string): ISandbox | undefined {
    return this.sandboxes.get(id);
  }

  async terminateAll(): Promise<void> {
    for (const sandbox of this.sandboxes.values()) {
      await sandbox.stop();
    }
    this.sandboxes.clear();
  }
}
