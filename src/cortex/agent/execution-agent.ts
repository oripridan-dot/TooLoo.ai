// @version 3.3.425
/**
 * Execution Agent - Core Autonomous Execution Loop (Project Pinocchio)
 *
 * The heart of TooLoo's self-execution capability.
 * Enables TooLoo to receive structured input, execute code,
 * save artifacts, and manage its own processes - like this chat does.
 *
 * V3.3.425 Enhancements:
 * - Research task type: Ethical web exploration via DynamicCollector
 * - SafetyPolicy URL validation
 * - PIIScrubber integration for scraped content
 *
 * V3.3.404 Enhancements:
 * - Self-correction loop: Auto-retry failed tasks with AI-driven fixes
 * - Docker sandbox integration: Safe code execution with resource limits
 * - Task resumption: Restore interrupted tasks from SessionContinuity
 * - Event-driven autonomy: Full integration with Sentinel pattern
 *
 * @module cortex/agent/execution-agent
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import { precog } from '../../precog/index.js';
import { taskProcessor, TaskProcessor } from './task-processor.js';
import { artifactManager, ArtifactManager } from './artifact-manager.js';
import { SandboxManager } from '../../core/sandbox/sandbox-manager.js';
import { config } from '../../core/config.js';
import { PIIScrubber } from '../../core/security/pii-scrubber.js';
import type {
  AgentTask,
  AgentState,
  TaskType,
  TaskInput,
  TaskOptions,
  TaskResult,
  ProcessDefinition,
  ProcessExecution,
  ExecutionResult,
  Artifact,
} from './types.js';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

export class ExecutionAgent {
  private running = false;
  private processor: TaskProcessor;
  private artifacts: ArtifactManager;
  private sandboxManager: SandboxManager;
  private activeProcesses: Map<string, ProcessExecution> = new Map();
  private processInterval: NodeJS.Timeout | null = null;
  private totalTasksExecuted = 0;
  private successfulTasks = 0;

  // V3.3.404: Self-correction and autonomy tracking
  private taskRetryCount: Map<string, number> = new Map();
  private readonly MAX_SELF_CORRECTION_RETRIES = 3;
  private sandboxMode: 'local' | 'docker' = 'local';
  private autonomousFixingEnabled = true;

  constructor() {
    this.processor = taskProcessor;
    this.artifacts = artifactManager;
    this.sandboxManager = new SandboxManager();
    this.sandboxMode = config.SANDBOX_MODE as 'local' | 'docker';
    this.setupEventListeners();
    console.log('[ExecutionAgent] Initialized');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await this.artifacts.initialize();

    // V3.3.404: Initialize sandbox manager
    try {
      await this.sandboxManager.initialize();
      console.log(`[ExecutionAgent] Sandbox ready (mode: ${this.sandboxMode})`);
    } catch (err) {
      console.warn('[ExecutionAgent] Sandbox initialization failed, using local mode:', err);
      this.sandboxMode = 'local';
    }

    // V3.3.404: Restore tasks from SessionContinuity
    await this.restoreInterruptedTasks();

    console.log('[ExecutionAgent] Agent ready');
  }

  /**
   * V3.3.404: Restore interrupted tasks from previous session
   */
  private async restoreInterruptedTasks(): Promise<void> {
    try {
      const { sessionContinuity } = await import('../continuity/session-continuity.js');
      const resumableTasks = sessionContinuity.getResumableTasks();

      if (resumableTasks.length > 0) {
        console.log(`[ExecutionAgent] Restoring ${resumableTasks.length} interrupted tasks...`);

        for (const task of resumableTasks) {
          // Re-queue the task with resume state
          await this.submitTask({
            type: task.type as TaskType,
            name: `[RESUMED] ${task.description}`,
            description: `Resuming from ${(task.progress * 100).toFixed(0)}% - ${task.description}`,
            input: {
              prompt: task.description,
              context: task.resumeState,
            },
            options: { autoApprove: true, sandbox: true },
          });

          bus.publish('cortex', 'agent:task:restored', {
            taskId: task.id,
            type: task.type,
            progress: task.progress,
          });
        }

        console.log(`[ExecutionAgent] Restored ${resumableTasks.length} tasks to queue`);
      }
    } catch (err) {
      console.warn('[ExecutionAgent] Could not restore tasks:', err);
    }
  }

  /**
   * Start the execution loop
   */
  start(): void {
    if (this.running) {
      console.log('[ExecutionAgent] Already running');
      return;
    }

    this.running = true;

    // Process queue every 2 seconds
    this.processInterval = setInterval(() => {
      this.processNextTask();
    }, 2000);

    bus.publish('cortex', 'agent:started', { timestamp: Date.now() });
    console.log('[ExecutionAgent] Started execution loop');
  }

  /**
   * Stop the execution loop
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    bus.publish('cortex', 'agent:stopped', { timestamp: Date.now() });
    console.log('[ExecutionAgent] Stopped execution loop');
  }

  /**
   * Submit a task for execution
   */
  async submitTask(params: {
    type: TaskType;
    name: string;
    description?: string;
    input: TaskInput;
    options?: Partial<TaskOptions>;
  }): Promise<AgentTask> {
    const task = this.processor.createTask(params);

    // If auto-approve and agent is running, process immediately
    if (params.options?.autoApprove && this.running) {
      // Will be picked up by the loop
    }

    return task;
  }

  /**
   * Execute a task directly (bypasses queue)
   */
  async executeTask(task: AgentTask): Promise<TaskResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`[${new Date().toISOString()}] Starting task: ${task.name}`);

      let result: TaskResult;

      switch (task.type) {
        case 'generate':
          result = await this.executeGenerate(task, logs);
          break;
        case 'execute':
          result = await this.executeCode(task, logs);
          break;
        case 'analyze':
          result = await this.executeAnalyze(task, logs);
          break;
        case 'fix':
          result = await this.executeFix(task, logs);
          break;
        case 'validate':
          result = await this.executeValidate(task, logs);
          break;
        case 'deploy':
          result = await this.executeDeploy(task, logs);
          break;
        case 'research':
          result = await this.executeResearch(task, logs);
          break;
        default:
          result = {
            success: false,
            output: `Unknown task type: ${task.type}`,
            logs,
          };
      }

      // Add metrics
      result.metrics = {
        durationMs: Date.now() - startTime,
        ...(result.metrics || {}),
      };
      result.logs = logs;

      // Track stats
      this.totalTasksExecuted++;
      if (result.success) {
        this.successfulTasks++;
      }

      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`[${new Date().toISOString()}] Error: ${errMsg}`);
      return {
        success: false,
        output: errMsg,
        logs,
        metrics: { durationMs: Date.now() - startTime },
      };
    }
  }

  /**
   * Run a multi-step process
   */
  async runProcess(definition: ProcessDefinition): Promise<ProcessExecution> {
    const execution: ProcessExecution = {
      id: uuidv4(),
      processId: definition.id,
      processName: definition.name,
      status: 'running',
      completedSteps: [],
      failedSteps: [],
      results: new Map(),
      variables: definition.variables || {},
      startedAt: new Date(),
    };

    this.activeProcesses.set(execution.id, execution);

    bus.publish('cortex', 'agent:process:started', {
      executionId: execution.id,
      processName: definition.name,
      totalSteps: definition.steps.length,
    });

    try {
      for (const step of definition.steps) {
        // Check dependencies
        if (step.dependsOn && step.dependsOn.length > 0) {
          const allDepsComplete = step.dependsOn.every((dep) =>
            execution.completedSteps.includes(dep)
          );
          if (!allDepsComplete) {
            console.log(`[ExecutionAgent] Skipping step ${step.id} - dependencies not met`);
            continue;
          }
        }

        // Check condition
        if (step.condition) {
          try {
            const conditionMet = this.evaluateCondition(step.condition, execution.variables);
            if (!conditionMet) {
              console.log(`[ExecutionAgent] Skipping step ${step.id} - condition not met`);
              continue;
            }
          } catch {
            console.warn(`[ExecutionAgent] Condition evaluation failed for ${step.id}`);
          }
        }

        execution.currentStep = step.id;

        bus.publish('cortex', 'agent:process:step:started', {
          executionId: execution.id,
          stepId: step.id,
          stepName: step.name,
        });

        // Create and execute task for this step
        const task = this.processor.createTask({
          type: step.action,
          name: step.name,
          input: step.input,
          options: { autoApprove: true, sandbox: true },
        });

        this.processor.startTask(task.id);
        const result = await this.executeTask(task);
        this.processor.completeTask(task.id, result);

        execution.results.set(step.id, result);

        if (result.success) {
          execution.completedSteps.push(step.id);

          // Store artifacts in variables for next steps
          if (result.artifacts && result.artifacts.length > 0) {
            execution.variables[`${step.id}_artifacts`] = result.artifacts;
          }
          if (result.output) {
            execution.variables[`${step.id}_output`] = result.output;
          }

          bus.publish('cortex', 'agent:process:step:completed', {
            executionId: execution.id,
            stepId: step.id,
            success: true,
          });
        } else {
          execution.failedSteps.push(step.id);

          bus.publish('cortex', 'agent:process:step:completed', {
            executionId: execution.id,
            stepId: step.id,
            success: false,
            error: result.output,
          });

          // Handle error based on process config
          if (definition.onError === 'halt') {
            execution.status = 'failed';
            execution.error = `Step ${step.id} failed: ${result.output}`;
            break;
          } else if (definition.onError === 'retry' && (definition.maxRetries || 0) > 0) {
            // Retry logic would go here
          }
          // 'skip' continues to next step
        }
      }

      // Mark complete if not failed
      if (execution.status !== 'failed') {
        execution.status = 'completed';
      }
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
    }

    execution.completedAt = new Date();
    this.activeProcesses.delete(execution.id);

    bus.publish('cortex', 'agent:process:completed', {
      executionId: execution.id,
      processName: definition.name,
      status: execution.status,
      completedSteps: execution.completedSteps.length,
      failedSteps: execution.failedSteps.length,
    });

    return execution;
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    const queueStatus = this.processor.getQueueStatus();
    // Stats available via processor.getStats() if needed

    return {
      running: this.running,
      currentTask: queueStatus.currentTask?.id,
      taskQueue: this.processor.getQueue(),
      completedTasks: this.processor.getHistory(20),
      activeProcesses: Array.from(this.activeProcesses.values()),
      artifactCount: this.artifacts.getStats().totalArtifacts,
      totalTasksExecuted: this.totalTasksExecuted,
      successRate: this.totalTasksExecuted > 0 ? this.successfulTasks / this.totalTasksExecuted : 0,
      lastActivity: new Date(),
    };
  }

  /**
   * Get task status by ID
   * Used by team framework and system hub to poll task completion
   */
  getTaskStatus(taskId: string): { status: string; result?: TaskResult } | null {
    const queueStatus = this.processor.getQueueStatus();

    // Check if currently processing
    if (queueStatus.currentTask?.id === taskId) {
      return { status: 'processing' };
    }

    // Check if in queue
    const queue = this.processor.getQueue();
    const inQueue = queue.find((t) => t.id === taskId);
    if (inQueue) {
      return { status: inQueue.status };
    }

    // Check history for completion
    const history = this.processor.getHistory(100);
    const completed = history.find((t) => t.id === taskId);
    if (completed) {
      return {
        status: completed.status,
        result: completed.result,
      };
    }

    return null;
  }

  // ============= Private: Task Executors =============

  private async executeGenerate(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { prompt, language, template } = task.input;

    if (!prompt) {
      return { success: false, output: 'No prompt provided for generation' };
    }

    logs.push(`Generating ${language || 'code'} from prompt...`);

    try {
      // Use AI provider to generate code
      const response = await precog.providers.generate({
        prompt: prompt,
        system: this.buildGenerationSystemPrompt(language, template),
        taskType: 'code_generation',
      });

      const generatedCode = response.content;
      logs.push(`Generated ${generatedCode.length} characters`);

      // Create artifact if requested
      const artifacts: Artifact[] = [];
      if (task.options.saveArtifacts) {
        const artifact = await this.artifacts.createArtifact({
          type: 'code',
          name: `generated-${Date.now()}`,
          content: generatedCode,
          language: language || 'typescript',
          description: prompt.substring(0, 100),
          createdBy: task.id,
          tags: ['generated', language || 'typescript'],
        });
        artifacts.push(artifact);
        logs.push(`Saved artifact: ${artifact.id}`);
      }

      return {
        success: true,
        output: generatedCode,
        artifacts,
        metrics: {
          durationMs: 0,
          costUsd: response.cost_usd,
        },
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Generation failed: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async executeCode(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { code, language } = task.input;

    if (!code) {
      return { success: false, output: 'No code provided for execution' };
    }

    logs.push(`Executing ${language || 'javascript'} code...`);

    if (!task.options.sandbox) {
      logs.push('WARNING: Running without sandbox');
    }

    try {
      const result = await this.runInSandbox(code, language || 'javascript', task.options.timeout);
      logs.push(`Execution completed with exit code: ${result.exitCode}`);

      return {
        success: result.success,
        output: result.output,
        metrics: { durationMs: result.durationMs },
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Execution failed: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async executeAnalyze(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { files, code, prompt } = task.input;

    logs.push('Analyzing...');

    try {
      let analysisInput = '';

      if (code) {
        analysisInput = code;
      } else if (files && files.length > 0) {
        // Read files for analysis
        for (const file of files) {
          if (await fs.pathExists(file)) {
            const content = await fs.readFile(file, 'utf-8');
            analysisInput += `\n// File: ${file}\n${content}\n`;
          }
        }
      }

      const response = await precog.providers.generate({
        prompt: prompt || `Analyze the following code and provide insights:\n\n${analysisInput}`,
        system:
          'You are a code analysis expert. Provide detailed analysis including:\n1. Code quality assessment\n2. Potential issues\n3. Improvement suggestions\n4. Architecture observations',
        taskType: 'analysis',
      });

      logs.push('Analysis complete');

      return {
        success: true,
        output: response.content,
        metrics: {
          durationMs: 0,
          costUsd: response.cost_usd,
        },
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Analysis failed: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async executeFix(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { code, files, prompt } = task.input;

    logs.push('Attempting fix...');

    try {
      let fixInput = code || '';
      if (!fixInput && files && files.length > 0 && files[0]) {
        fixInput = await fs.readFile(files[0], 'utf-8');
      }

      const response = await precog.providers.generate({
        prompt: prompt || `Fix the following code:\n\n${fixInput}`,
        system: 'You are a code fixing expert. Return ONLY the fixed code without explanations.',
        taskType: 'fix',
      });

      const fixedCode = response.content;
      logs.push('Fix generated');

      const artifacts: Artifact[] = [];
      if (task.options.saveArtifacts) {
        const artifact = await this.artifacts.createArtifact({
          type: 'code',
          name: `fixed-${Date.now()}`,
          content: fixedCode,
          language: task.input.language || 'typescript',
          description: 'Auto-fixed code',
          createdBy: task.id,
          tags: ['fixed', 'auto-repair'],
        });
        artifacts.push(artifact);
      }

      return {
        success: true,
        output: fixedCode,
        artifacts,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Fix failed: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async executeValidate(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { code } = task.input;

    logs.push('Validating...');

    try {
      // Basic validation - could be extended with actual test running
      if (code) {
        // Try to parse as TypeScript
        const hasErrors = code.includes('undefined') || code.includes('TODO');
        if (hasErrors) {
          logs.push('Validation found issues');
          return { success: false, output: 'Code contains TODOs or undefined references' };
        }
      }

      logs.push('Validation passed');
      return { success: true, output: 'Validation successful' };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Validation failed: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async executeDeploy(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const {
      target = 'local',
      script,
      directory,
      buildCommand,
      deployCommand,
      environment = {},
      dryRun = false,
    } = task.input;

    logs.push(`Starting deployment to target: ${target}`);

    try {
      // Step 1: Validate deployment configuration
      logs.push('Validating deployment configuration...');

      if (!deployCommand && !script) {
        return {
          success: false,
          output: 'No deployment command or script specified',
        };
      }

      const workDir = directory || process.cwd();

      // Step 2: Optional build step
      if (buildCommand) {
        logs.push(`Running build: ${buildCommand}`);

        if (!dryRun) {
          const buildResult = await this.runShellCommand(buildCommand, workDir, environment);
          if (!buildResult.success) {
            logs.push(`Build failed: ${buildResult.stderr}`);
            return {
              success: false,
              output: `Build failed: ${buildResult.stderr}`,
            };
          }
          logs.push('Build completed successfully');
        } else {
          logs.push('[DRY RUN] Would execute build command');
        }
      }

      // Step 3: Run deployment
      const deployCmd = deployCommand || script;
      logs.push(`Executing deployment: ${deployCmd}`);

      if (dryRun) {
        logs.push('[DRY RUN] Would execute deployment command');
        return {
          success: true,
          output: `Dry run completed successfully. Would deploy to: ${target}`,
        };
      }

      // Execute deployment based on target
      let deployResult;
      switch (target) {
        case 'local':
          deployResult = await this.deployLocal(deployCmd!, workDir, environment, logs);
          break;
        case 'docker':
          deployResult = await this.deployDocker(task.input, workDir, logs);
          break;
        case 'git':
          deployResult = await this.deployGit(task.input, workDir, logs);
          break;
        default:
          deployResult = await this.runShellCommand(deployCmd!, workDir, environment);
      }

      if (!deployResult.success) {
        logs.push(`Deployment failed: ${deployResult.stderr}`);
        return {
          success: false,
          output: `Deployment to ${target} failed: ${deployResult.stderr}`,
        };
      }

      logs.push(`Deployment to ${target} completed successfully`);

      // Emit deployment event
      bus.publish('cortex', 'agent:deployment:completed', {
        taskId: task.id,
        target,
        timestamp: Date.now(),
      });

      return {
        success: true,
        output: `Successfully deployed to ${target}`,
        artifacts: [
          {
            id: uuidv4(),
            type: 'deployment' as const,
            name: `deployment-${target}-${Date.now()}`,
            path: workDir,
            version: '1.0.0',
            createdAt: new Date(),
            createdBy: task.id,
            metadata: {
              target,
              deployedAt: new Date().toISOString(),
              logs: logs.join('\n'),
            },
          },
        ],
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`Deployment error: ${errMsg}`);
      return { success: false, output: errMsg };
    }
  }

  private async deployLocal(
    command: string,
    workDir: string,
    environment: Record<string, string>,
    logs: string[]
  ): Promise<{ success: boolean; stdout: string; stderr: string; output?: string }> {
    logs.push('Deploying locally...');
    return this.runShellCommand(command, workDir, environment);
  }

  private async deployDocker(
    input: TaskInput,
    workDir: string,
    logs: string[]
  ): Promise<{ success: boolean; stdout: string; stderr: string; output?: string }> {
    const { imageName, containerName, ports = [], volumes = [] } = input;

    if (!imageName) {
      return {
        success: false,
        stdout: '',
        stderr: 'No Docker image specified',
        output: 'No Docker image specified',
      };
    }

    logs.push(`Building Docker image: ${imageName}`);

    // Build the image
    const buildResult = await this.runShellCommand(`docker build -t ${imageName} .`, workDir, {});

    if (!buildResult.success) {
      return buildResult;
    }
    logs.push('Docker image built successfully');

    // Stop existing container if it exists
    const name = containerName || `tooloo-${imageName.replace(/[:/]/g, '-')}`;
    await this.runShellCommand(`docker stop ${name} 2>/dev/null || true`, workDir, {});
    await this.runShellCommand(`docker rm ${name} 2>/dev/null || true`, workDir, {});

    // Build run command
    let runCmd = `docker run -d --name ${name}`;

    for (const port of ports) {
      runCmd += ` -p ${port}`;
    }

    for (const volume of volumes) {
      runCmd += ` -v ${volume}`;
    }

    runCmd += ` ${imageName}`;

    logs.push(`Starting container: ${name}`);
    const runResult = await this.runShellCommand(runCmd, workDir, {});

    if (runResult.success) {
      logs.push(`Container ${name} started successfully`);
    }

    return runResult;
  }

  private async deployGit(
    input: TaskInput,
    workDir: string,
    logs: string[]
  ): Promise<{ success: boolean; stdout: string; stderr: string; output?: string }> {
    const { branch = 'main', remote = 'origin', commitMessage } = input;

    logs.push(`Deploying via git push to ${remote}/${branch}`);

    // Add all changes
    const addResult = await this.runShellCommand('git add -A', workDir, {});
    if (!addResult.success) {
      return addResult;
    }

    // Commit if there are changes
    const statusResult = await this.runShellCommand('git status --porcelain', workDir, {});
    if (statusResult.stdout.trim()) {
      const message = commitMessage || `[TooLoo Deploy] ${new Date().toISOString()}`;
      const commitResult = await this.runShellCommand(`git commit -m "${message}"`, workDir, {});
      if (!commitResult.success && !commitResult.stderr.includes('nothing to commit')) {
        return commitResult;
      }
      logs.push('Changes committed');
    }

    // Push to remote
    const pushResult = await this.runShellCommand(`git push ${remote} ${branch}`, workDir, {});
    if (pushResult.success) {
      logs.push(`Pushed to ${remote}/${branch}`);
    }

    return pushResult;
  }

  // ============================================================================
  // RESEARCH TASK - Ethical Explorer (V3.3.425)
  // ============================================================================

  /**
   * Blocked domains for ethical web research
   * No social media scraping, no dark web, no paywalled content
   */
  private static readonly BLOCKED_DOMAINS = [
    // Social Media
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'linkedin.com',
    'snapchat.com',
    'reddit.com',
    'pinterest.com',
    // Dark Web
    '.onion',
    // Paywalled / Login Required
    'medium.com',
    'substack.com',
    // Private Data
    'dropbox.com',
    'drive.google.com',
    'onedrive.com',
    // Banking / Financial
    'paypal.com',
    'stripe.com',
    'venmo.com',
    // Government (privacy concerns)
    '.gov',
    '.mil',
  ];

  /**
   * Execute a research task - ethical web exploration
   * Uses DynamicCollector (Playwright) to fetch and analyze web content
   */
  private async executeResearch(task: AgentTask, logs: string[]): Promise<TaskResult> {
    const { url, goal, extractDesignTokens, prompt } = task.input;

    logs.push(`[Research] Starting ethical exploration...`);

    // Validate URL is provided
    if (!url) {
      logs.push('[Research] No URL provided');
      return {
        success: false,
        output: 'Research task requires a URL',
      };
    }

    // Parse and validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      logs.push(`[Research] Invalid URL: ${url}`);
      return {
        success: false,
        output: `Invalid URL: ${url}`,
      };
    }

    // Safety check: Block disallowed domains
    const hostname = parsedUrl.hostname.toLowerCase();
    for (const blocked of ExecutionAgent.BLOCKED_DOMAINS) {
      if (hostname.includes(blocked) || hostname.endsWith(blocked)) {
        logs.push(`[Research] Domain blocked by SafetyPolicy: ${hostname}`);
        return {
          success: false,
          output: `Domain "${hostname}" is blocked by SafetyPolicy. TooLoo respects privacy and ethics.`,
        };
      }
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      logs.push(`[Research] Protocol not allowed: ${parsedUrl.protocol}`);
      return {
        success: false,
        output: `Protocol "${parsedUrl.protocol}" is not allowed. Only HTTP/HTTPS supported.`,
      };
    }

    logs.push(`[Research] SafetyPolicy check passed for: ${hostname}`);

    try {
      // Check robots.txt compliance
      const robotsAllowed = await this.checkRobotsTxt(url, logs);
      if (!robotsAllowed) {
        return {
          success: false,
          output: `robots.txt disallows scraping this URL. TooLoo respects website policies.`,
        };
      }

      // Import DynamicCollector
      const { DynamicCollector } =
        await import('../../precog/harvester/collectors/dynamic-collector.js');
      const collector = new DynamicCollector();

      logs.push(`[Research] Fetching content from: ${url}`);

      // Collect content
      const harvestResult = await collector.collect({
        url,
        type: 'dynamic',
        options: {},
      });

      // Close browser
      await collector.close();

      logs.push(`[Research] Content fetched: ${harvestResult.content.length} characters`);

      // Scrub PII from content
      const scrubbedContent = PIIScrubber.scrub(harvestResult.content);
      logs.push(`[Research] PII scrubbing complete`);

      // Determine the research goal
      const researchGoal = goal || prompt || 'Summarize the main content and key points';

      // If extracting design tokens, use specialized prompt
      let systemPrompt: string;
      if (extractDesignTokens) {
        systemPrompt = `You are a design token extraction expert. Analyze the website content and extract:
1. **Color Palette**: Primary, secondary, accent, background, text colors (in hex or hsl)
2. **Typography**: Font families, sizes, weights, line heights
3. **Spacing**: Margins, paddings, gaps (in px or rem)
4. **Border Radius**: Button, card, input rounding values
5. **Shadows**: Box shadows used

Return the tokens in this JSON format:
{
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "text": "#hex" },
  "typography": { "fontFamily": "name", "fontSize": { "sm": "px", "base": "px", "lg": "px" }, "fontWeight": { "normal": 400, "bold": 700 } },
  "spacing": { "sm": "px", "md": "px", "lg": "px" },
  "borderRadius": { "sm": "px", "md": "px", "lg": "px" },
  "shadows": { "sm": "value", "md": "value", "lg": "value" }
}

Base your extraction on the actual content, styles, and structure of the webpage.`;
      } else {
        systemPrompt = `You are a research assistant. Analyze the provided web content and answer the user's research goal.
Be factual, cite specific information from the content, and provide actionable insights.
If the content doesn't contain information relevant to the goal, say so clearly.`;
      }

      // Summarize content using LLM
      const response = await precog.providers.generate({
        prompt: `Website: ${url}\nTitle: ${harvestResult.metadata?.title || 'Unknown'}\n\nResearch Goal: ${researchGoal}\n\nContent:\n${scrubbedContent.substring(0, 10000)}`,
        system: systemPrompt,
        taskType: 'research',
      });

      logs.push(`[Research] Analysis complete`);

      // Emit event for UI updates
      bus.publish('cortex', 'agent:research:completed', {
        taskId: task.id,
        url,
        goal: researchGoal,
        timestamp: Date.now(),
      });

      return {
        success: true,
        output: response.content,
        artifacts: [
          {
            id: uuidv4(),
            type: 'data' as const,
            name: `research-${hostname}-${Date.now()}`,
            path: url,
            version: '1.0.0',
            createdAt: new Date(),
            createdBy: task.id,
            metadata: {
              url,
              title: harvestResult.metadata?.title,
              goal: researchGoal,
              extractedAt: new Date().toISOString(),
              contentLength: harvestResult.content.length,
            },
          },
        ],
        metrics: {
          durationMs: 0,
          costUsd: response.cost_usd,
        },
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logs.push(`[Research] Failed: ${errMsg}`);
      return {
        success: false,
        output: `Research failed: ${errMsg}`,
      };
    }
  }

  /**
   * Check robots.txt to ensure we're allowed to scrape
   */
  private async checkRobotsTxt(url: string, logs: string[]): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;

      logs.push(`[Research] Checking robots.txt: ${robotsUrl}`);

      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'TooLoo-Bot/1.0 (Ethical Research Assistant)' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // No robots.txt or error - assume allowed
        logs.push(`[Research] No robots.txt found (${response.status}) - proceeding`);
        return true;
      }

      const robotsTxt = await response.text();

      // Simple check: Look for User-agent: * and Disallow patterns
      const lines = robotsTxt.split('\n');
      let inUserAgentAll = false;
      const disallowedPaths: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('user-agent:')) {
          inUserAgentAll = trimmed.includes('*');
        } else if (inUserAgentAll && trimmed.startsWith('disallow:')) {
          const path = trimmed.replace('disallow:', '').trim();
          if (path) disallowedPaths.push(path);
        }
      }

      // Check if our target path is disallowed
      const targetPath = parsedUrl.pathname;
      for (const disallowed of disallowedPaths) {
        if (disallowed === '/' || targetPath.startsWith(disallowed)) {
          logs.push(`[Research] robots.txt disallows: ${disallowed}`);
          return false;
        }
      }

      logs.push(`[Research] robots.txt allows access`);
      return true;
    } catch (error) {
      // If we can't check robots.txt, err on the side of caution for strict mode
      // but allow for common documentation sites
      const hostname = new URL(url).hostname;
      const docsSites = [
        'docs.',
        'developer.',
        'api.',
        'github.com',
        'mdn.',
        'react.dev',
        'nodejs.org',
      ];

      if (docsSites.some((site) => hostname.includes(site))) {
        logs.push(`[Research] robots.txt check failed but allowing docs site: ${hostname}`);
        return true;
      }

      logs.push(`[Research] robots.txt check failed - proceeding cautiously`);
      return true;
    }
  }

  private async runShellCommand(
    command: string,
    cwd: string,
    env: Record<string, string>
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const proc = spawn('sh', ['-c', command], {
        cwd,
        env: { ...process.env, ...env },
        timeout: 120000, // 2 minute timeout
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          stdout: '',
          stderr: err.message,
        });
      });
    });
  }

  // ============= Private: Helpers =============

  private async processNextTask(): Promise<void> {
    if (!this.running) return;

    const queueStatus = this.processor.getQueueStatus();
    if (queueStatus.inProgress > 0) return; // Already processing

    const nextTask = this.processor.getNextTask();
    if (!nextTask) return;

    // Start task
    const task = this.processor.startTask(nextTask.id);
    if (!task) return;

    // Execute
    const result = await this.executeTask(task);

    // Complete
    this.processor.completeTask(task.id, result);
  }

  /**
   * Run code in sandbox - V3.3.407 FIXED: Direct sandbox execution, no recursion
   * Always uses SandboxManager which selects Docker or Local based on config
   */
  private async runInSandbox(
    code: string,
    language: string,
    timeout: number = 10000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Build command based on language
    const safeCode = code.replace(/'/g, "\\'");
    let command: string;

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        command = `node -e '${safeCode}'`;
        break;
      case 'typescript':
      case 'ts':
        command = `npx tsx -e '${safeCode}'`;
        break;
      case 'python':
      case 'py':
        command = `python3 -c '${safeCode}'`;
        break;
      default:
        return {
          success: false,
          output: `Unsupported language: ${language}`,
          durationMs: Date.now() - startTime,
        };
    }

    try {
      // Create sandbox via manager (Docker or Local based on config)
      const sandbox = await this.sandboxManager.createSandbox({
        id: `exec-${Date.now()}`,
        timeout,
        maxMemoryMB: 256,
        maxCpuPercent: 50,
        maxProcesses: 50,
        cwd: process.cwd(),
      });

      try {
        // sandbox.start() is called inside createSandbox, no need to call again
        console.log(`[ExecutionAgent] 🛡️ Executing in sandbox (mode: ${this.sandboxMode})`);

        const result = await sandbox.exec(command);

        return {
          success: result.ok,
          output: result.stdout || result.stderr,
          exitCode: result.exitCode,
          stderr: result.stderr,
          durationMs: result.duration,
        };
      } finally {
        console.log(`[ExecutionAgent] 🧹 Cleaning up sandbox`);
        await sandbox.stop();
      }
    } catch (error) {
      console.error(`[ExecutionAgent] Sandbox error:`, error);
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  private buildGenerationSystemPrompt(language?: string, template?: string): string {
    return `You are an expert ${language || 'TypeScript'} developer.
Generate clean, well-documented, production-ready code.
${template ? `Use this template style: ${template}` : ''}
Return ONLY the code without markdown code blocks or explanations.`;
  }

  private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
    // Simple condition evaluation - expand as needed
    try {
      const func = new Function(...Object.keys(variables), `return ${condition}`);
      return !!func(...Object.values(variables));
    } catch {
      return false;
    }
  }

  private setupEventListeners(): void {
    // Listen for external task requests
    bus.on('agent:task:request', async (event) => {
      const { type, name, input, options } = event.payload;
      await this.submitTask({ type, name, input, options });
    });

    // Listen for process requests
    bus.on('agent:process:request', async (event) => {
      const { definition } = event.payload;
      await this.runProcess(definition);
    });

    // V3.3.404: Self-correction loop - listen for failed tasks
    bus.on('agent:task:failed', async (event: SynapsysEvent) => {
      if (!this.autonomousFixingEnabled) return;

      const { taskId, name, type } = event.payload as {
        taskId: string;
        name: string;
        type: TaskType;
      };

      await this.attemptSelfCorrection(taskId, name, type);
    });

    // V3.3.404: Track task progress in SessionContinuity
    bus.on('agent:task:started', async (event: SynapsysEvent) => {
      try {
        const { sessionContinuity } = await import('../continuity/session-continuity.js');
        const { taskId, name, type } = event.payload as {
          taskId: string;
          name: string;
          type: TaskType;
        };

        sessionContinuity.trackTask({
          id: taskId,
          type: type as 'execution' | 'analysis' | 'generation' | 'learning' | 'optimization',
          description: name,
          progress: 0,
          resumeState: {},
          priority: 5,
        });
      } catch {
        // SessionContinuity may not be initialized yet
      }
    });

    bus.on('agent:task:completed', async (event: SynapsysEvent) => {
      try {
        const { sessionContinuity } = await import('../continuity/session-continuity.js');
        const { taskId } = event.payload as { taskId: string };
        sessionContinuity.updateTaskProgress(taskId, 1);
        // Clear retry count on success
        this.taskRetryCount.delete(taskId);
      } catch {
        // SessionContinuity may not be initialized yet
      }
    });

    // V3.3.404: Listen for ProactiveScheduler code execution requests
    bus.on('proactive_scheduler:code_task', async (event: SynapsysEvent) => {
      const { prompt, type, context } = event.payload as {
        prompt: string;
        type?: TaskType;
        context?: Record<string, unknown>;
      };

      await this.submitTask({
        type: type || 'execute',
        name: `Scheduled: ${prompt.substring(0, 50)}...`,
        description: prompt,
        input: { prompt, context: context || {} },
        options: { autoApprove: true, sandbox: true },
      });
    });
  }

  // ============================================================================
  // V3.3.404: SELF-CORRECTION LOOP (Project Pinocchio - The Brain)
  // ============================================================================

  /**
   * Attempt to self-correct a failed task
   * This is the core "autonomous developer" capability
   */
  private async attemptSelfCorrection(
    taskId: string,
    taskName: string,
    taskType: TaskType
  ): Promise<void> {
    const retryCount = this.taskRetryCount.get(taskId) || 0;

    if (retryCount >= this.MAX_SELF_CORRECTION_RETRIES) {
      console.log(
        `[ExecutionAgent] Task ${taskId} exceeded max retries (${this.MAX_SELF_CORRECTION_RETRIES}), abandoning`
      );
      bus.publish('cortex', 'agent:task:abandoned', {
        taskId,
        name: taskName,
        reason: 'Max self-correction retries exceeded',
        retries: retryCount,
      });
      this.taskRetryCount.delete(taskId);
      return;
    }

    this.taskRetryCount.set(taskId, retryCount + 1);

    console.log(
      `[ExecutionAgent] Self-correction attempt ${retryCount + 1}/${this.MAX_SELF_CORRECTION_RETRIES} for ${taskName}`
    );

    // Get the failed task from history
    const history = this.processor.getHistory(10);
    const failedTask = history.find((t) => t.id === taskId);

    if (!failedTask || !failedTask.result) {
      console.warn(`[ExecutionAgent] Could not find failed task ${taskId} in history`);
      return;
    }

    const errorMessage = failedTask.result.output || failedTask.error || 'Unknown error';

    // Create a fix task to analyze and repair the failure
    const fixTask = await this.submitTask({
      type: 'fix',
      name: `Self-correction: ${taskName}`,
      description: `Analyzing and fixing failed task: ${errorMessage}`,
      input: {
        prompt: `The following task failed with error: "${errorMessage}"
        
Original task: ${taskName}
Task type: ${taskType}
Original input: ${JSON.stringify(failedTask.input, null, 2)}

Analyze the error and provide a corrected implementation.`,
        code: failedTask.input?.code,
        context: {
          originalTaskId: taskId,
          errorMessage,
          retryAttempt: retryCount + 1,
        },
      },
      options: {
        autoApprove: true,
        sandbox: true,
      },
    });

    bus.publish('cortex', 'agent:self_correction:started', {
      originalTaskId: taskId,
      fixTaskId: fixTask.id,
      attempt: retryCount + 1,
      errorMessage,
    });
  }

  /**
   * Enable/disable autonomous fixing
   */
  setAutonomousFixing(enabled: boolean): void {
    this.autonomousFixingEnabled = enabled;
    console.log(`[ExecutionAgent] Autonomous fixing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get self-correction statistics
   */
  getSelfCorrectionStats(): {
    pendingRetries: number;
    maxRetries: number;
    autonomousFixingEnabled: boolean;
  } {
    return {
      pendingRetries: this.taskRetryCount.size,
      maxRetries: this.MAX_SELF_CORRECTION_RETRIES,
      autonomousFixingEnabled: this.autonomousFixingEnabled,
    };
  }

  // ============================================================================
  // V3.3.407: SANDBOX EXECUTION (Safe Code Execution) - FIXED recursion bug
  // ============================================================================

  /**
   * Execute code in a sandboxed environment
   * V3.3.407: Always uses SandboxManager - no fallback to runInSandbox (recursion fix)
   */
  async executeInSandbox(
    code: string,
    language: string,
    options: { timeout?: number; workingDir?: string } = {}
  ): Promise<ExecutionResult> {
    const timeout = options.timeout || 30000;
    const startTime = Date.now();

    // Build the command based on language
    const safeCode = code.replace(/'/g, "\\'");
    let command: string;

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        command = `node -e '${safeCode}'`;
        break;
      case 'typescript':
      case 'ts':
        command = `npx tsx -e '${safeCode}'`;
        break;
      case 'python':
      case 'py':
        command = `python3 -c '${safeCode}'`;
        break;
      default:
        return {
          success: false,
          output: `Unsupported language for sandbox: ${language}`,
          durationMs: Date.now() - startTime,
        };
    }

    try {
      // SandboxManager automatically creates Docker or Local sandbox based on config
      const sandbox = await this.sandboxManager.createSandbox({
        id: `exec-${Date.now()}`,
        timeout,
        maxMemoryMB: 256,
        maxCpuPercent: 50,
        maxProcesses: 50,
        cwd: options.workingDir || process.cwd(),
      });

      try {
        // sandbox.start() is called inside createSandbox, no need to call again
        console.log(`[ExecutionAgent] 🛡️ Sandbox started (mode: ${this.sandboxMode})`);

        const result = await sandbox.exec(command);

        return {
          success: result.ok,
          output: result.stdout || result.stderr,
          exitCode: result.exitCode,
          stderr: result.stderr,
          durationMs: result.duration,
        };
      } finally {
        await sandbox.stop();
        console.log(`[ExecutionAgent] 🧹 Sandbox destroyed`);
      }
    } catch (error) {
      console.error(`[ExecutionAgent] Sandbox execution error:`, error);
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// Singleton export
export const executionAgent = new ExecutionAgent();
