// @version 3.3.392
/**
 * System Execution Hub
 *
 * Connects the Execution Agent and Team Framework to ALL TooLoo systems:
 * - Synaptic (Chat): Execute code from conversation
 * - Creative Space: Bring creative ideas to life
 * - Learning/Growth: Execute learning experiments
 * - Emergence: Act on discovered opportunities
 * - Cortex: Core cognitive functions
 * - Projects: Project-scoped execution (V3.3.392)
 *
 * This is the central nervous system for execution across TooLoo.
 *
 * @module cortex/agent/system-hub
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import { v4 as uuidv4 } from 'uuid';
import {
  teamRegistry,
  teamExecutor,
  initializeTeamFramework,
  AgentTeam,
  TeamTaskResult,
} from './team-framework.js';
import { executionAgent } from './execution-agent.js';
import { projectManager } from '../project-manager-v2.js';
import type { TaskType, AgentTask } from './types.js';

// ============================================================================
// TYPES
// ============================================================================

export type SystemSource =
  | 'synaptic' // Chat interface
  | 'creative' // Creative space
  | 'growth' // Learning & monitoring
  | 'emergence' // DisCover/Emergence
  | 'cortex' // Core cortex
  | 'command' // Command center
  | 'studio' // Design studio
  | 'api' // External API
  | 'internal'; // System internal

export interface ExecutionRequest {
  id: string;
  source: SystemSource;
  type: TaskType;
  prompt: string;
  code?: string;
  files?: string[];
  context?: Record<string, unknown>;
  options?: ExecutionOptions;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  projectId?: string; // V3.3.392: Project-scoped execution
}

export interface ExecutionOptions {
  useTeam?: boolean;
  teamSpecialization?: string;
  maxIterations?: number;
  qualityThreshold?: number;
  timeout?: number;
  sandbox?: boolean;
  saveArtifacts?: boolean;
  autoApprove?: boolean;
  provider?: string;
  model?: string;
  projectId?: string; // V3.3.392: Project scope
}

export interface ExecutionResponse {
  requestId: string;
  success: boolean;
  output: string;
  artifacts?: any[];
  teamId?: string;
  iterations?: number;
  qualityScore?: number;
  durationMs: number;
  source: SystemSource;
  metadata?: Record<string, unknown>;
}

export interface SystemExecutionStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  bySource: Record<SystemSource, { total: number; success: number }>;
  byType: Record<TaskType, { total: number; success: number }>;
  avgDurationMs: number;
  avgQualityScore: number;
  activeTeams: number;
}

// ============================================================================
// SYSTEM EXECUTION HUB
// ============================================================================

export class SystemExecutionHub {
  private static instance: SystemExecutionHub;
  private initialized = false;
  private requestQueue: Map<string, ExecutionRequest> = new Map();
  private responseCache: Map<string, ExecutionResponse> = new Map();
  private stats: SystemExecutionStats;

  private constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      bySource: {} as Record<SystemSource, { total: number; success: number }>,
      byType: {} as Record<TaskType, { total: number; success: number }>,
      avgDurationMs: 0,
      avgQualityScore: 0,
      activeTeams: 0,
    };
  }

  static getInstance(): SystemExecutionHub {
    if (!SystemExecutionHub.instance) {
      SystemExecutionHub.instance = new SystemExecutionHub();
    }
    return SystemExecutionHub.instance;
  }

  /**
   * Initialize the hub and connect to all systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SystemExecutionHub] Initializing...');

    // Initialize team framework
    initializeTeamFramework();

    // Initialize execution agent
    await executionAgent.initialize();
    executionAgent.start();

    // Connect to all systems
    this.connectToSynaptic();
    this.connectToCreativeSpace();
    this.connectToGrowth();
    this.connectToEmergence();
    this.connectToCortex();
    this.connectToCommand();
    this.connectToStudio();

    // Setup response handlers
    this.setupResponseHandlers();

    this.initialized = true;
    bus.publish('system', 'execution:hub:ready', { timestamp: Date.now() });
    console.log('[SystemExecutionHub] ✅ Connected to all systems');
  }

  // ===========================================================================
  // SYSTEM CONNECTIONS
  // ===========================================================================

  /**
   * Connect to Synaptic (Chat) system
   */
  private connectToSynaptic(): void {
    // Handle execution requests from chat
    bus.on('synaptic:execute', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'synaptic',
        type: event.payload.type || 'execute',
        prompt: event.payload.message || event.payload.prompt,
        code: event.payload.code,
        context: event.payload.context,
        options: event.payload.options,
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'synaptic:execute:response', response);
    });

    // Handle code generation from chat
    bus.on('synaptic:generate', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'synaptic',
        type: 'generate',
        prompt: event.payload.prompt,
        context: event.payload.context,
        options: { useTeam: true, teamSpecialization: 'code-generation' },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'synaptic:generate:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Synaptic');
  }

  /**
   * Connect to Creative Space
   */
  private connectToCreativeSpace(): void {
    // Handle creative execution (crystallization)
    bus.on('creative:crystallize', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'creative',
        type: 'generate',
        prompt: event.payload.idea || event.payload.prompt,
        context: {
          mode: 'creative',
          theme: event.payload.theme,
          style: event.payload.style,
          ...event.payload.context,
        },
        options: {
          useTeam: true,
          teamSpecialization: event.payload.specialization || 'creative-generation',
          qualityThreshold: 0.85,
        },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'creative:crystallize:response', response);
    });

    // Handle component creation
    bus.on('creative:create_component', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'creative',
        type: 'generate',
        prompt: event.payload.description,
        context: {
          componentType: event.payload.type,
          framework: event.payload.framework || 'react',
          styling: event.payload.styling || 'tailwind',
        },
        options: {
          useTeam: true,
          teamSpecialization: 'ui-components',
        },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'creative:component:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Creative Space');
  }

  /**
   * Connect to Growth/Learning system
   */
  private connectToGrowth(): void {
    // Handle learning experiments
    bus.on('growth:experiment', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'growth',
        type: 'execute',
        prompt: event.payload.hypothesis,
        code: event.payload.code,
        context: {
          experimentType: event.payload.type,
          metrics: event.payload.metrics,
          baseline: event.payload.baseline,
        },
        options: {
          sandbox: true,
          useTeam: true,
          teamSpecialization: 'testing',
        },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'growth:experiment:response', response);
    });

    // Handle training tasks
    bus.on('growth:train', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'growth',
        type: 'execute',
        prompt: event.payload.trainingTask,
        context: event.payload.context,
        options: {
          useTeam: true,
          teamSpecialization: 'optimization',
          timeout: 120000, // 2 minutes for training
        },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'growth:train:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Growth');
  }

  /**
   * Connect to Emergence/DisCover system
   */
  private connectToEmergence(): void {
    // Handle emergence-triggered actions
    bus.on('emergence:action', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'emergence',
        type: event.payload.actionType || 'execute',
        prompt: event.payload.action,
        context: {
          emergenceId: event.payload.emergenceId,
          signal: event.payload.signal,
          confidence: event.payload.confidence,
        },
        options: {
          useTeam: true,
          sandbox: true, // Always sandbox emergence actions
          qualityThreshold: 0.9, // High quality for emergence
        },
        priority: 'high',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'emergence:action:response', response);
    });

    // Handle discovery validation
    bus.on('emergence:validate_discovery', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'emergence',
        type: 'validate',
        prompt: `Validate discovery: ${event.payload.discovery}`,
        code: event.payload.code,
        context: event.payload.context,
        options: {
          useTeam: true,
          teamSpecialization: 'validation',
        },
        priority: 'high',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'emergence:validation:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Emergence');
  }

  /**
   * Connect to Core Cortex
   */
  private connectToCortex(): void {
    // Handle direct cortex execution
    bus.on('cortex:execute:direct', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'cortex',
        type: event.payload.type || 'execute',
        prompt: event.payload.prompt,
        code: event.payload.code,
        files: event.payload.files,
        context: event.payload.context,
        options: event.payload.options,
        priority: event.payload.priority || 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'cortex:execute:response', response);
    });

    // Handle motor commands with team validation
    bus.on('cortex:motor:validated', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'cortex',
        type: 'execute',
        prompt: event.payload.command,
        context: { motor: true, ...event.payload.context },
        options: {
          useTeam: true,
          teamSpecialization: 'code-execution',
        },
        priority: 'high',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'cortex:motor:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Cortex');
  }

  /**
   * Connect to Command Center
   */
  private connectToCommand(): void {
    // Handle command execution
    bus.on('command:execute', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'command',
        type: event.payload.type || 'execute',
        prompt: event.payload.command,
        context: event.payload.context,
        options: {
          autoApprove: event.payload.autoApprove,
          sandbox: event.payload.sandbox !== false,
        },
        priority: 'high',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'command:execute:response', response);
    });

    // Handle deployment commands
    bus.on('command:deploy', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'command',
        type: 'deploy',
        prompt: event.payload.deployConfig,
        context: event.payload.context,
        options: {
          useTeam: true,
          teamSpecialization: 'deployment',
        },
        priority: 'critical',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'command:deploy:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Command');
  }

  /**
   * Connect to Studio
   */
  private connectToStudio(): void {
    // Handle design implementation
    bus.on('studio:implement', async (event: SynapsysEvent) => {
      const response = await this.handleExecution({
        id: event.payload.requestId || uuidv4(),
        source: 'studio',
        type: 'generate',
        prompt: event.payload.design,
        context: {
          designSystem: event.payload.designSystem,
          tokens: event.payload.tokens,
          specs: event.payload.specs,
        },
        options: {
          useTeam: true,
          teamSpecialization: 'ui-components',
          qualityThreshold: 0.9,
        },
        priority: 'normal',
        timestamp: new Date(),
      });

      bus.publish('cortex', 'studio:implement:response', response);
    });

    console.log('[SystemExecutionHub] Connected to Studio');
  }

  // ===========================================================================
  // CORE EXECUTION
  // ===========================================================================

  /**
   * Public API to submit an execution request
   */
  public async submitRequest(
    request: Omit<ExecutionRequest, 'id' | 'timestamp'> & { id?: string }
  ): Promise<ExecutionResponse> {
    return this.handleExecution({
      id: request.id || uuidv4(),
      timestamp: new Date(),
      ...request,
    });
  }

  /**
   * Handle an execution request
   */
  private async handleExecution(request: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();

    console.log(
      `[SystemExecutionHub] Handling ${request.type} from ${request.source}: ${request.prompt.slice(0, 50)}...`
    );

    // Update stats
    this.stats.totalRequests++;
    this.updateSourceStats(request.source, false);
    this.updateTypeStats(request.type, false);

    // Store request
    this.requestQueue.set(request.id, request);

    // Fetch project context if projectId is provided
    let projectContext: { name: string; description: string; settings: unknown } | null = null;
    if (request.projectId) {
      try {
        const project = await projectManager.getProject(request.projectId);
        if (project) {
          projectContext = {
            name: project.name,
            description: project.description || '',
            settings: project.settings || {},
          };
          console.log(`[SystemExecutionHub] Execution in project context: ${project.name}`);
        }
      } catch (err) {
        console.warn(`[SystemExecutionHub] Could not load project ${request.projectId}:`, err);
      }
    }

    try {
      let response: ExecutionResponse;

      // Use team execution if requested
      if (request.options?.useTeam !== false) {
        response = await this.executeWithTeam(request);
      } else {
        response = await this.executeDirect(request);
      }

      // Update success stats
      if (response.success) {
        this.stats.successfulRequests++;
        this.updateSourceStats(request.source, true);
        this.updateTypeStats(request.type, true);

        // Record execution to project activity if in project context
        if (request.projectId && projectContext) {
          try {
            await projectManager.addActivity(request.projectId, {
              type: 'execution',
              user: 'system',
              description: `Executed ${request.type}: ${request.prompt.slice(0, 100)}...`,
              metadata: {
                executionId: request.id,
                type: request.type,
                source: request.source,
                success: true,
                durationMs: response.durationMs,
                qualityScore: response.qualityScore,
              },
            });
          } catch (err) {
            console.warn(`[SystemExecutionHub] Could not record activity to project:`, err);
          }
        }
      } else {
        this.stats.failedRequests++;
      }

      // Update avg duration
      const totalDuration =
        this.stats.avgDurationMs * (this.stats.totalRequests - 1) + response.durationMs;
      this.stats.avgDurationMs = totalDuration / this.stats.totalRequests;

      // Update avg quality
      if (response.qualityScore !== undefined) {
        const totalQuality =
          this.stats.avgQualityScore * (this.stats.totalRequests - 1) + response.qualityScore;
        this.stats.avgQualityScore = totalQuality / this.stats.totalRequests;
      }

      // Cache response
      this.responseCache.set(request.id, response);

      return response;
    } catch (error) {
      this.stats.failedRequests++;

      const errorResponse: ExecutionResponse = {
        requestId: request.id,
        success: false,
        output: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
        source: request.source,
      };

      return errorResponse;
    } finally {
      // Clean up old requests
      this.requestQueue.delete(request.id);
    }
  }

  /**
   * Execute with team (executor + validator)
   */
  private async executeWithTeam(request: ExecutionRequest): Promise<ExecutionResponse> {
    const specialization = request.options?.teamSpecialization || this.inferSpecialization(request);

    const team = teamRegistry.findOrCreateTeam(specialization);
    this.stats.activeTeams = teamRegistry.getAllTeams().filter((t) => t.status !== 'idle').length;

    const result = await teamExecutor.executeWithTeam(team, {
      id: request.id,
      teamId: team.id,
      type: request.type,
      input: {
        prompt: request.prompt,
        context: request.context,
        qualityThreshold: request.options?.qualityThreshold,
        maxIterations: request.options?.maxIterations,
        source: request.source as any,
      },
      status: 'planning',
      iterations: [],
      currentIteration: 0,
      maxIterations: request.options?.maxIterations || 3,
      startedAt: new Date(),
    });

    return {
      requestId: request.id,
      success: result.success,
      output: result.output,
      artifacts: result.artifacts,
      teamId: team.id,
      iterations: result.iterations,
      qualityScore: result.qualityScore,
      durationMs: result.totalDurationMs,
      source: request.source,
      metadata: {
        validationReport: result.validationReport,
        teamName: team.name,
      },
    };
  }

  /**
   * Execute directly (no team)
   */
  private async executeDirect(request: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();

    const task = await executionAgent.submitTask({
      type: request.type,
      name: `Direct: ${request.prompt.slice(0, 50)}`,
      description: request.prompt,
      input: {
        prompt: request.prompt,
        code: request.code,
        files: request.files,
        context: request.context,
      },
      options: {
        saveArtifacts: request.options?.saveArtifacts ?? true,
        autoApprove: request.options?.autoApprove ?? false,
        sandbox: request.options?.sandbox ?? true,
        timeout: request.options?.timeout,
        provider: request.options?.provider,
        model: request.options?.model,
      },
    });

    // Wait for completion
    const result = await this.waitForTask(task.id, request.options?.timeout || 60000);

    return {
      requestId: request.id,
      success: result?.success || false,
      output: result?.output || 'Task failed or timed out',
      artifacts: result?.artifacts,
      durationMs: Date.now() - startTime,
      source: request.source,
    };
  }

  /**
   * Wait for task completion
   */
  private async waitForTask(taskId: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        const status = executionAgent.getTaskStatus(taskId);

        if (status?.status === 'completed' || status?.status === 'failed') {
          clearInterval(checkInterval);
          resolve(status.result);
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 500);
    });
  }

  /**
   * Infer specialization from request
   */
  private inferSpecialization(request: ExecutionRequest): string {
    const prompt = request.prompt.toLowerCase();

    if (prompt.includes('test')) return 'testing';
    if (prompt.includes('deploy')) return 'deployment';
    if (prompt.includes('component') || prompt.includes('ui')) return 'ui-components';
    if (prompt.includes('api')) return 'api-development';
    if (prompt.includes('database') || prompt.includes('sql')) return 'database';
    if (prompt.includes('security')) return 'security';
    if (prompt.includes('optim')) return 'optimization';

    const typeMap: Record<TaskType, string> = {
      generate: 'code-generation',
      execute: 'code-execution',
      analyze: 'code-analysis',
      fix: 'code-fixing',
      deploy: 'deployment',
      validate: 'validation',
      research: 'research',
    };

    return typeMap[request.type] || 'general';
  }

  private updateSourceStats(source: SystemSource, success: boolean): void {
    if (!this.stats.bySource[source]) {
      this.stats.bySource[source] = { total: 0, success: 0 };
    }
    this.stats.bySource[source].total++;
    if (success) {
      this.stats.bySource[source].success++;
    }
  }

  private updateTypeStats(type: TaskType, success: boolean): void {
    if (!this.stats.byType[type]) {
      this.stats.byType[type] = { total: 0, success: 0 };
    }
    this.stats.byType[type].total++;
    if (success) {
      this.stats.byType[type].success++;
    }
  }

  // ===========================================================================
  // RESPONSE HANDLERS
  // ===========================================================================

  private setupResponseHandlers(): void {
    // Handle team completions
    bus.on('team:task:completed', (event: SynapsysEvent) => {
      const { teamId, taskId, result } = event.payload;
      console.log(
        `[SystemExecutionHub] Team ${teamId} completed task ${taskId}: ${result.success ? '✅' : '❌'}`
      );
    });

    // Handle execution agent events
    bus.on('agent:task:completed', (event: SynapsysEvent) => {
      console.log(`[SystemExecutionHub] Agent completed task: ${event.payload.taskId}`);
    });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Get execution statistics
   */
  getStats(): SystemExecutionStats {
    this.stats.activeTeams = teamRegistry.getAllTeams().filter((t) => t.status !== 'idle').length;
    return { ...this.stats };
  }

  /**
   * Get all teams
   */
  getTeams(): AgentTeam[] {
    return teamRegistry.getAllTeams();
  }

  /**
   * Get cached response
   */
  getResponse(requestId: string): ExecutionResponse | undefined {
    return this.responseCache.get(requestId);
  }

  /**
   * Execute from API
   */
  async execute(request: Omit<ExecutionRequest, 'id' | 'timestamp'>): Promise<ExecutionResponse> {
    return this.handleExecution({
      ...request,
      id: uuidv4(),
      timestamp: new Date(),
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const systemExecutionHub = SystemExecutionHub.getInstance();

export async function initializeSystemExecutionHub(): Promise<void> {
  await systemExecutionHub.initialize();
}
