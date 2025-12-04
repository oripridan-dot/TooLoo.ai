// @version 3.3.16
/**
 * Execution Agent - Core Autonomous Execution Loop
 *
 * The heart of TooLoo's self-execution capability.
 * Enables TooLoo to receive structured input, execute code,
 * save artifacts, and manage its own processes - like this chat does.
 *
 * @module cortex/agent/execution-agent
 */

import { bus } from '../../core/event-bus.js';
import { precog } from '../../precog/index.js';
import { taskProcessor, TaskProcessor } from './task-processor.js';
import { artifactManager, ArtifactManager } from './artifact-manager.js';
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
  private activeProcesses: Map<string, ProcessExecution> = new Map();
  private processInterval: NodeJS.Timeout | null = null;
  private totalTasksExecuted = 0;
  private successfulTasks = 0;

  constructor() {
    this.processor = taskProcessor;
    this.artifacts = artifactManager;
    this.setupEventListeners();
    console.log('[ExecutionAgent] Initialized');
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await this.artifacts.initialize();
    console.log('[ExecutionAgent] Agent ready');
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
        system: 'You are a code analysis expert. Provide detailed analysis including:\n1. Code quality assessment\n2. Potential issues\n3. Improvement suggestions\n4. Architecture observations',
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
      dryRun = false
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
        artifacts: [{
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
          }
        }]
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
      return { success: false, stdout: '', stderr: 'No Docker image specified', output: 'No Docker image specified' };
    }

    logs.push(`Building Docker image: ${imageName}`);
    
    // Build the image
    const buildResult = await this.runShellCommand(
      `docker build -t ${imageName} .`,
      workDir,
      {}
    );
    
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

  private async runInSandbox(
    code: string,
    language: string,
    timeout: number = 10000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let command: string;
      let args: string[];

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          command = 'node';
          args = ['-e', code];
          break;
        case 'typescript':
        case 'ts':
          command = 'npx';
          args = ['tsx', '-e', code];
          break;
        case 'python':
        case 'py':
          command = 'python3';
          args = ['-c', code];
          break;
        default:
          resolve({
            success: false,
            output: `Unsupported language: ${language}`,
            durationMs: Date.now() - startTime,
          });
          return;
      }

      let output = '';
      let stderr = '';

      const proc = spawn(command, args, {
        timeout,
        cwd: process.cwd(),
      });

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        resolve({
          success: exitCode === 0,
          output: output || stderr,
          exitCode: exitCode || 0,
          stderr,
          durationMs: Date.now() - startTime,
        });
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          output: error.message,
          durationMs: Date.now() - startTime,
        });
      });
    });
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
  }
}

// Singleton export
export const executionAgent = new ExecutionAgent();
