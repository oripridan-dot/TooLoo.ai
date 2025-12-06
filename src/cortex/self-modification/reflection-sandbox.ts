// @version 3.3.195
/* eslint-disable no-console */
/**
 * TooLoo Reflection Sandbox Manager
 *
 * Provides a persistent, isolated Docker container where TooLoo can safely
 * experiment with modifications to its own codebase. The sandbox maintains
 * a full mirror of the TooLoo workspace on a detached git branch, enabling:
 *
 * - Full code execution and testing without affecting production
 * - Iterative refinement cycles (execute→test→refine)
 * - Git-based atomic changes with easy diff generation
 * - Safe self-reflection and autonomous development
 *
 * Architecture:
 * - Persistent Docker container (survives between sessions)
 * - Writable overlay filesystem on workspace clone
 * - Detached git branch for isolated commits
 * - Full TooLoo system mirror for integration testing
 *
 * @module cortex/self-modification/reflection-sandbox
 */

import { exec, ExecException } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { bus } from '../../core/event-bus.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectionSandboxConfig {
  /** Unique identifier for this sandbox instance */
  id: string;
  /** Docker image to use (should be Node.js compatible) */
  image: string;
  /** Container name prefix */
  containerPrefix: string;
  /** Maximum memory in MB */
  maxMemoryMB: number;
  /** Maximum CPU percentage */
  maxCpuPercent: number;
  /** Workspace root to mirror */
  workspaceRoot: string;
  /** Mount point inside container */
  mountPoint: string;
  /** Timeout for operations in ms */
  operationTimeout: number;
  /** Git branch name for sandbox work */
  sandboxBranch: string;
  /** Enable network access (for npm install etc) */
  enableNetwork: boolean;
  /** Auto-start TooLoo server in sandbox */
  autoStartServer: boolean;
  /** Port for sandbox TooLoo server */
  sandboxServerPort: number;
}

export interface SandboxState {
  id: string;
  containerId: string | null;
  status: 'stopped' | 'starting' | 'running' | 'error';
  gitBranch: string | null;
  gitCommit: string | null;
  createdAt: number;
  lastUsedAt: number;
  executionCount: number;
  serverRunning: boolean;
  serverPort: number | null;
  error: string | null;
}

export interface SandboxExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  timedOut: boolean;
}

export interface ModificationPreview {
  filePath: string;
  diff: string;
  linesAdded: number;
  linesRemoved: number;
  testResults: TestResult | null;
}

export interface TestResult {
  passed: boolean;
  total: number;
  failed: number;
  skipped: number;
  duration: number;
  output: string;
  failures: Array<{
    name: string;
    error: string;
  }>;
}

export interface ReflectionSession {
  id: string;
  sandboxId: string;
  startedAt: number;
  purpose: string;
  modifications: ModificationPreview[];
  iterations: number;
  status: 'active' | 'completed' | 'failed' | 'promoted';
  finalCommit: string | null;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ReflectionSandboxConfig = {
  id: 'reflection-main',
  image: 'node:20-bookworm', // Full Debian for git, build tools
  containerPrefix: 'tooloo-reflection',
  maxMemoryMB: 2048, // 2GB for full TooLoo mirror
  maxCpuPercent: 80,
  workspaceRoot: process.cwd(),
  mountPoint: '/workspace',
  operationTimeout: 300000, // 5 minutes
  sandboxBranch: 'reflection/sandbox',
  enableNetwork: true, // Need for npm install
  autoStartServer: false, // Start on demand
  sandboxServerPort: 4100,
};

// ============================================================================
// REFLECTION SANDBOX MANAGER
// ============================================================================

export class ReflectionSandboxManager extends EventEmitter {
  private config: ReflectionSandboxConfig;
  private state: SandboxState;
  private stateFile: string;
  private sessions: Map<string, ReflectionSession> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<ReflectionSandboxConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stateFile = path.join(this.config.workspaceRoot, 'data', 'reflection-sandbox-state.json');
    this.state = this.createInitialState();
  }

  private createInitialState(): SandboxState {
    return {
      id: this.config.id,
      containerId: null,
      status: 'stopped',
      gitBranch: null,
      gitCommit: null,
      createdAt: 0,
      lastUsedAt: 0,
      executionCount: 0,
      serverRunning: false,
      serverPort: null,
      error: null,
    };
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ReflectionSandbox] Initializing...');

    // Load persisted state
    await this.loadState();

    // Check if container still exists
    if (this.state.containerId) {
      const exists = await this.containerExists(this.state.containerId);
      if (!exists) {
        console.log('[ReflectionSandbox] Previous container no longer exists, resetting state');
        this.state = this.createInitialState();
        await this.saveState();
      } else {
        // Check if container is running
        const running = await this.isContainerRunning(this.state.containerId);
        this.state.status = running ? 'running' : 'stopped';
      }
    }

    this.initialized = true;
    console.log(`[ReflectionSandbox] Initialized. Status: ${this.state.status}`);
  }

  // --------------------------------------------------------------------------
  // STATE PERSISTENCE
  // --------------------------------------------------------------------------

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const saved = await fs.readJson(this.stateFile);
        this.state = { ...this.createInitialState(), ...saved };
      }
    } catch (error) {
      console.error('[ReflectionSandbox] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.stateFile));
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (error) {
      console.error('[ReflectionSandbox] Failed to save state:', error);
    }
  }

  // --------------------------------------------------------------------------
  // DOCKER OPERATIONS
  // --------------------------------------------------------------------------

  private async containerExists(containerId: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`docker inspect ${containerId}`, (error) => {
        resolve(!error);
      });
    });
  }

  private async isContainerRunning(containerId: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`docker inspect -f '{{.State.Running}}' ${containerId}`, (error, stdout) => {
        resolve(!error && stdout.trim() === 'true');
      });
    });
  }

  /**
   * Start the persistent reflection sandbox
   */
  async start(): Promise<void> {
    await this.initialize();

    if (this.state.status === 'running') {
      console.log('[ReflectionSandbox] Already running');
      return;
    }

    console.log('[ReflectionSandbox] Starting sandbox...');
    this.state.status = 'starting';
    this.emit('status', this.state.status);

    try {
      // If container exists but stopped, start it
      if (this.state.containerId) {
        console.log(`[ReflectionSandbox] Starting existing container: ${this.state.containerId}`);
        await this.execHost(`docker start ${this.state.containerId}`);
        this.state.status = 'running';
        this.state.lastUsedAt = Date.now();
        await this.saveState();
        this.emit('started', this.state);
        return;
      }

      // Create new container
      await this.createContainer();

      // Clone workspace into container
      await this.cloneWorkspace();

      // Setup git branch
      await this.setupGitBranch();

      // Install dependencies
      await this.installDependencies();

      this.state.status = 'running';
      this.state.createdAt = Date.now();
      this.state.lastUsedAt = Date.now();
      await this.saveState();

      bus.publish('cortex', 'reflection:sandbox_started', {
        sandboxId: this.state.id,
        containerId: this.state.containerId,
        branch: this.state.gitBranch,
      });

      this.emit('started', this.state);
      console.log('[ReflectionSandbox] ✓ Sandbox started');
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : String(error);
      await this.saveState();
      this.emit('error', error);
      throw error;
    }
  }

  private async createContainer(): Promise<void> {
    const containerName = `${this.config.containerPrefix}-${this.config.id}`;

    // Build docker run command
    const args = [
      'run',
      '-d', // Detached
      '-t', // TTY for interactive commands
      '--name',
      containerName,
      '--memory',
      `${this.config.maxMemoryMB}m`,
      '--cpu-shares',
      Math.floor((this.config.maxCpuPercent / 100) * 1024).toString(),
      '--pids-limit',
      '500', // Allow more processes for full system
    ];

    // Network access for npm
    if (this.config.enableNetwork) {
      args.push('--network', 'bridge');
    } else {
      args.push('--network', 'none');
    }

    // Port mapping for sandbox server
    if (this.config.autoStartServer) {
      args.push('-p', `${this.config.sandboxServerPort}:4000`);
    }

    // Volume for persistent workspace
    const volumeName = `${containerName}-workspace`;
    await this.execHost(`docker volume create ${volumeName}`).catch(() => {});
    args.push('-v', `${volumeName}:${this.config.mountPoint}`);

    // Working directory
    args.push('-w', this.config.mountPoint);

    // Image and command (keep running)
    args.push(this.config.image, 'tail', '-f', '/dev/null');

    console.log(`[ReflectionSandbox] Creating container: ${containerName}`);
    const result = await this.execHost(`docker ${args.join(' ')}`);
    this.state.containerId = result.trim();

    // Install git and other tools
    await this.execInContainer('apt-get update && apt-get install -y git rsync');

    console.log(`[ReflectionSandbox] Container created: ${this.state.containerId}`);
  }

  private async cloneWorkspace(): Promise<void> {
    console.log('[ReflectionSandbox] Cloning workspace into sandbox...');

    // Create archive of workspace (excluding node_modules, .git objects to save space)
    const archivePath = '/tmp/tooloo-workspace.tar.gz';

    // Create tarball on host
    const excludes = [
      '--exclude=node_modules',
      '--exclude=.git/objects',
      '--exclude=data/artifacts',
      '--exclude=temp',
      '--exclude=dist',
    ].join(' ');

    await this.execHost(`tar -czf ${archivePath} ${excludes} -C ${this.config.workspaceRoot} .`);

    // Copy tarball to container
    await this.execHost(`docker cp ${archivePath} ${this.state.containerId}:/tmp/workspace.tar.gz`);

    // Extract in container
    await this.execInContainer(`tar -xzf /tmp/workspace.tar.gz -C ${this.config.mountPoint}`);

    // Copy .git separately (we need it for branching)
    await this.execHost(
      `docker cp ${this.config.workspaceRoot}/.git ${this.state.containerId}:${this.config.mountPoint}/`
    );

    // Cleanup
    await this.execHost(`rm ${archivePath}`);

    console.log('[ReflectionSandbox] ✓ Workspace cloned');
  }

  private async setupGitBranch(): Promise<void> {
    console.log('[ReflectionSandbox] Setting up detached git branch...');

    // Configure git
    await this.execInContainer('git config user.email "tooloo@reflection.sandbox"');
    await this.execInContainer('git config user.name "TooLoo Reflection"');

    // Get current commit
    const currentCommit = await this.execInContainer('git rev-parse HEAD');
    this.state.gitCommit = currentCommit.stdout.trim();

    // Create or checkout sandbox branch
    const branchName = `${this.config.sandboxBranch}-${Date.now()}`;
    try {
      await this.execInContainer(`git checkout -b ${branchName}`);
    } catch {
      // Branch might exist, try checkout
      await this.execInContainer(`git checkout ${branchName}`);
    }

    this.state.gitBranch = branchName;
    console.log(`[ReflectionSandbox] ✓ Git branch: ${branchName}`);
  }

  private async installDependencies(): Promise<void> {
    console.log('[ReflectionSandbox] Installing dependencies...');

    // Install npm dependencies
    const result = await this.execInContainer('npm install', {
      timeout: 300000, // 5 min for npm install
    });

    if (result.exitCode !== 0) {
      console.warn('[ReflectionSandbox] npm install had issues:', result.stderr);
    }

    console.log('[ReflectionSandbox] ✓ Dependencies installed');
  }

  // --------------------------------------------------------------------------
  // EXECUTION
  // --------------------------------------------------------------------------

  private async execHost(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: this.config.operationTimeout }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Host command failed: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Execute a command inside the sandbox container
   */
  async execInContainer(
    command: string,
    options: { timeout?: number; cwd?: string } = {}
  ): Promise<SandboxExecResult> {
    if (!this.state.containerId || this.state.status !== 'running') {
      throw new Error('Sandbox not running');
    }

    const timeout = options.timeout || this.config.operationTimeout;
    const cwd = options.cwd || this.config.mountPoint;
    const startTime = Date.now();

    this.state.lastUsedAt = Date.now();
    this.state.executionCount++;

    return new Promise((resolve) => {
      const dockerCmd = `docker exec -w ${cwd} ${this.state.containerId} sh -c "${command.replace(/"/g, '\\"')}"`;

      exec(dockerCmd, { timeout }, (error: ExecException | null, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const timedOut = error?.killed ?? false;

        resolve({
          success: !error || error.code === 0,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode: error?.code ?? 0,
          duration,
          timedOut,
        });
      });
    });
  }

  // --------------------------------------------------------------------------
  // FILE OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Write a file in the sandbox
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    if (!this.state.containerId || this.state.status !== 'running') {
      throw new Error('Sandbox not running');
    }

    // Write to temp file on host, then copy
    const tempFile = `/tmp/sandbox-write-${uuidv4()}`;
    await fs.writeFile(tempFile, content);

    const targetPath = path.join(this.config.mountPoint, relativePath);
    await this.execHost(`docker exec ${this.state.containerId} mkdir -p $(dirname ${targetPath})`);
    await this.execHost(`docker cp ${tempFile} ${this.state.containerId}:${targetPath}`);
    await fs.unlink(tempFile);

    console.log(`[ReflectionSandbox] Wrote file: ${relativePath}`);
  }

  /**
   * Read a file from the sandbox
   */
  async readFile(relativePath: string): Promise<string> {
    if (!this.state.containerId || this.state.status !== 'running') {
      throw new Error('Sandbox not running');
    }

    const result = await this.execInContainer(`cat ${relativePath}`);
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.stderr}`);
    }
    return result.stdout;
  }

  /**
   * Get diff of changes in sandbox
   */
  async getDiff(relativePath?: string): Promise<string> {
    const pathArg = relativePath || '';
    const result = await this.execInContainer(`git diff HEAD -- ${pathArg}`);
    return result.stdout;
  }

  /**
   * Commit current changes in sandbox
   */
  async commit(message: string): Promise<string> {
    await this.execInContainer('git add -A');
    await this.execInContainer(`git commit -m "${message.replace(/"/g, '\\"')}" --allow-empty`);
    const result = await this.execInContainer('git rev-parse HEAD');
    const commitHash = result.stdout.trim();
    this.state.gitCommit = commitHash;
    await this.saveState();
    return commitHash;
  }

  // --------------------------------------------------------------------------
  // TESTING
  // --------------------------------------------------------------------------

  /**
   * Run tests in the sandbox
   */
  async runTests(pattern?: string): Promise<TestResult> {
    console.log('[ReflectionSandbox] Running tests...');

    const cmd = pattern
      ? `npm test -- --grep "${pattern}" --reporter=json 2>&1 || true`
      : 'npm test -- --reporter=json 2>&1 || true';

    const result = await this.execInContainer(cmd, { timeout: 180000 });

    // Parse test output
    const testResult: TestResult = {
      passed: result.exitCode === 0,
      total: 0,
      failed: 0,
      skipped: 0,
      duration: result.duration,
      output: result.stdout + result.stderr,
      failures: [],
    };

    // Try to extract test counts from output
    const passMatch = result.stdout.match(/(\d+)\s*passing/);
    const failMatch = result.stdout.match(/(\d+)\s*failing/);
    const skipMatch = result.stdout.match(/(\d+)\s*pending/);

    if (passMatch && passMatch[1]) testResult.total += parseInt(passMatch[1], 10);
    if (failMatch && failMatch[1]) {
      testResult.failed = parseInt(failMatch[1], 10);
      testResult.total += testResult.failed;
      testResult.passed = false;
    }
    if (skipMatch && skipMatch[1]) {
      testResult.skipped = parseInt(skipMatch[1], 10);
      testResult.total += testResult.skipped;
    }

    console.log(
      `[ReflectionSandbox] Tests: ${testResult.total - testResult.failed}/${testResult.total} passed`
    );

    return testResult;
  }

  /**
   * Run TypeScript compilation check
   */
  async typeCheck(): Promise<{ passed: boolean; errors: string }> {
    const result = await this.execInContainer('npx tsc --noEmit 2>&1 || true');
    const passed = result.exitCode === 0 && !result.stdout.includes('error TS');
    return {
      passed,
      errors: passed ? '' : result.stdout,
    };
  }

  // --------------------------------------------------------------------------
  // SERVER MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Start TooLoo server in sandbox
   */
  async startServer(): Promise<void> {
    if (this.state.serverRunning) {
      console.log('[ReflectionSandbox] Server already running');
      return;
    }

    console.log('[ReflectionSandbox] Starting TooLoo server in sandbox...');

    // Start server in background
    await this.execInContainer('nohup npm run dev > /tmp/server.log 2>&1 &', { timeout: 10000 });

    // Wait for server to start
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await this.execInContainer(
        'curl -s http://localhost:4000/api/v1/health || true'
      );
      if (check.stdout.includes('ok') || check.stdout.includes('success')) {
        this.state.serverRunning = true;
        this.state.serverPort = this.config.sandboxServerPort;
        await this.saveState();
        console.log('[ReflectionSandbox] ✓ Server started');
        return;
      }
      attempts++;
    }

    throw new Error('Server failed to start within timeout');
  }

  /**
   * Stop TooLoo server in sandbox
   */
  async stopServer(): Promise<void> {
    if (!this.state.serverRunning) return;

    // Use safe kill pattern (NOT pkill -f node!)
    await this.execInContainer('pkill -f "tsx.*main" || true');
    await this.execInContainer('pkill -f "vite" || true');

    this.state.serverRunning = false;
    this.state.serverPort = null;
    await this.saveState();

    console.log('[ReflectionSandbox] Server stopped');
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Start a new reflection session
   */
  async startSession(purpose: string): Promise<ReflectionSession> {
    await this.start(); // Ensure sandbox is running

    const session: ReflectionSession = {
      id: uuidv4(),
      sandboxId: this.state.id,
      startedAt: Date.now(),
      purpose,
      modifications: [],
      iterations: 0,
      status: 'active',
      finalCommit: null,
    };

    this.sessions.set(session.id, session);

    bus.publish('cortex', 'reflection:session_started', {
      sessionId: session.id,
      purpose,
      sandboxId: this.state.id,
    });

    console.log(`[ReflectionSandbox] Session started: ${session.id}`);
    return session;
  }

  /**
   * Get current session
   */
  getSession(sessionId: string): ReflectionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Complete a session with final commit
   */
  async completeSession(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const commitHash = await this.commit(`Reflection session: ${session.purpose}`);
    session.finalCommit = commitHash;
    session.status = 'completed';

    bus.publish('cortex', 'reflection:session_completed', {
      sessionId,
      commitHash,
      modifications: session.modifications.length,
      iterations: session.iterations,
    });

    return commitHash;
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Stop the sandbox (container keeps running for persistence)
   */
  async stop(): Promise<void> {
    if (!this.state.containerId) return;

    await this.stopServer();

    console.log('[ReflectionSandbox] Stopping sandbox...');
    await this.execHost(`docker stop ${this.state.containerId}`).catch(() => {});
    this.state.status = 'stopped';
    await this.saveState();

    this.emit('stopped', this.state);
    console.log('[ReflectionSandbox] Sandbox stopped (container persisted)');
  }

  /**
   * Destroy the sandbox completely
   */
  async destroy(): Promise<void> {
    if (!this.state.containerId) return;

    console.log('[ReflectionSandbox] Destroying sandbox...');

    await this.stopServer();

    // Remove container
    await this.execHost(`docker rm -f ${this.state.containerId}`).catch(() => {});

    // Remove volume
    const volumeName = `${this.config.containerPrefix}-${this.config.id}-workspace`;
    await this.execHost(`docker volume rm ${volumeName}`).catch(() => {});

    this.state = this.createInitialState();
    await this.saveState();

    this.emit('destroyed');
    console.log('[ReflectionSandbox] Sandbox destroyed');
  }

  /**
   * Get current state
   */
  getState(): SandboxState {
    return { ...this.state };
  }

  /**
   * Sync changes from host to sandbox
   */
  async syncFromHost(paths?: string[]): Promise<void> {
    console.log('[ReflectionSandbox] Syncing from host...');

    if (paths && paths.length > 0) {
      // Sync specific files
      for (const p of paths) {
        const srcPath = path.join(this.config.workspaceRoot, p);
        const destPath = path.join(this.config.mountPoint, p);
        if (await fs.pathExists(srcPath)) {
          await this.execHost(`docker cp ${srcPath} ${this.state.containerId}:${destPath}`);
        }
      }
    } else {
      // Full re-clone
      await this.cloneWorkspace();
    }

    console.log('[ReflectionSandbox] ✓ Sync complete');
  }

  /**
   * Get changes ready for promotion to host
   */
  async getPromotionPackage(): Promise<{
    diff: string;
    files: string[];
    commit: string;
    testResult: TestResult;
  }> {
    const diff = await this.getDiff();
    const filesResult = await this.execInContainer('git diff --name-only HEAD');
    const files = filesResult.stdout.trim().split('\n').filter(Boolean);
    const testResult = await this.runTests();

    return {
      diff,
      files,
      commit: this.state.gitCommit || '',
      testResult,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const reflectionSandbox = new ReflectionSandboxManager();
export default ReflectionSandboxManager;
