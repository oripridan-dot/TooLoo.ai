// @version 3.3.196
/* eslint-disable no-console */
/**
 * TooLoo Smart Execution Orchestrator
 *
 * The brain of TooLoo's intelligent execution process. This orchestrator:
 *
 * 1. UNDERSTANDS - Analyzes the task deeply before execution
 * 2. PLANS - Creates optimal execution strategy with sprints
 * 3. EXECUTES - Runs with continuous quality monitoring
 * 4. COMMUNICATES - Shares progress in human-friendly language
 * 5. VALIDATES - Multi-phase quality gates (quality > performance > efficiency > cost)
 * 6. ADAPTS - Self-corrects based on feedback
 *
 * Priority Order: Quality > Performance > Efficiency > Cost
 *
 * This makes TooLoo's execution FAR superior to any single AI model because:
 * - Multi-stage validation ensures correctness
 * - Intelligent retry with learning from failures
 * - Real-time progress sharing keeps humans informed
 * - Cost-aware execution optimizes resource usage
 *
 * @module cortex/agent/smart-execution-orchestrator
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../core/event-bus.js';
import { executionAgent } from './execution-agent.js';
import { teamRegistry, teamExecutor } from './team-framework.js';
import type { TaskType, TaskResult, Artifact } from './types.js';

// ============================================================================
// TYPES - Execution Sprint System
// ============================================================================

/**
 * Priority weights for optimization decisions
 * Quality > Performance > Efficiency > Cost
 */
export interface OptimizationPriorities {
  quality: number;      // Weight: 0.4 (highest priority)
  performance: number;  // Weight: 0.3
  efficiency: number;   // Weight: 0.2
  cost: number;         // Weight: 0.1 (lowest priority)
}

export const DEFAULT_PRIORITIES: OptimizationPriorities = {
  quality: 0.4,
  performance: 0.3,
  efficiency: 0.2,
  cost: 0.1,
};

/**
 * Execution phases - each task goes through these stages
 */
export type ExecutionPhase =
  | 'understanding'    // Deep analysis of the task
  | 'planning'         // Strategy and sprint creation
  | 'preparing'        // Resource allocation, team formation
  | 'executing'        // Active execution
  | 'validating'       // Quality checks
  | 'refining'         // Improvements based on validation
  | 'finalizing'       // Cleanup and artifact packaging
  | 'completed'        // Done
  | 'failed';          // Error state

/**
 * Human-readable status update
 */
export interface HumanStatusUpdate {
  /** Short summary for UI display */
  summary: string;
  /** Detailed explanation of what's happening */
  detail: string;
  /** Current progress (0-100) */
  progress: number;
  /** Current phase */
  phase: ExecutionPhase;
  /** Emoji for visual feedback */
  emoji: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Key metrics */
  metrics?: {
    qualityScore?: number;
    performanceMs?: number;
    tokensUsed?: number;
    estimatedCost?: number;
  };
  /** Suggestions or next steps */
  nextSteps?: string[];
}

/**
 * A single sprint within the execution
 */
export interface ExecutionSprint {
  /** Sprint ID */
  id: string;
  /** Sprint number (1-based) */
  number: number;
  /** Sprint objective */
  objective: string;
  /** Sprint status */
  status: 'pending' | 'running' | 'validating' | 'passed' | 'failed' | 'skipped';
  /** Tasks within this sprint */
  tasks: SprintTask[];
  /** Sprint duration in ms */
  durationMs: number;
  /** Sprint start time */
  startedAt?: Date;
  /** Sprint end time */
  completedAt?: Date;
  /** Quality score achieved */
  qualityScore: number;
  /** Validation results */
  validationResults?: ValidationResult[];
}

export interface SprintTask {
  /** Task ID */
  id: string;
  /** Task type */
  type: TaskType;
  /** Task description */
  description: string;
  /** Task status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Task result */
  result?: TaskResult;
  /** Duration in ms */
  durationMs: number;
}

export interface ValidationResult {
  /** Validator name */
  validator: string;
  /** Passed? */
  passed: boolean;
  /** Score (0-1) */
  score: number;
  /** Issues found */
  issues: string[];
  /** Suggestions */
  suggestions: string[];
}

/**
 * Full execution request
 */
export interface SmartExecutionRequest {
  /** Unique execution ID */
  id?: string;
  /** What the user wants to accomplish */
  objective: string;
  /** Task type */
  type: TaskType;
  /** Code to execute (if applicable) */
  code?: string;
  /** Language */
  language?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Priority overrides */
  priorities?: Partial<OptimizationPriorities>;
  /** Quality threshold (default 0.85) */
  qualityThreshold?: number;
  /** Max sprints to attempt */
  maxSprints?: number;
  /** Timeout in ms */
  timeout?: number;
  /** Enable verbose progress updates */
  verbose?: boolean;
  /** Stream progress updates */
  streamProgress?: boolean;
}

/**
 * Full execution response
 */
export interface SmartExecutionResponse {
  /** Execution ID */
  id: string;
  /** Success status */
  success: boolean;
  /** Final output */
  output: string;
  /** All sprints */
  sprints: ExecutionSprint[];
  /** Total sprints */
  totalSprints: number;
  /** Final quality score */
  qualityScore: number;
  /** Artifacts produced */
  artifacts: Artifact[];
  /** Total duration in ms */
  totalDurationMs: number;
  /** Final status update */
  finalStatus: HumanStatusUpdate;
  /** Optimization metrics */
  optimization: {
    qualityScore: number;
    performanceMs: number;
    efficiencyRatio: number;  // output quality / resources used
    estimatedCost: number;
  };
  /** Team that executed */
  teamId?: string;
  /** Errors encountered */
  errors: string[];
  /** Recommendations for future */
  recommendations: string[];
}

/**
 * Progress callback for streaming updates
 */
export type ProgressCallback = (update: HumanStatusUpdate) => void;

// ============================================================================
// SMART EXECUTION ORCHESTRATOR
// ============================================================================

export class SmartExecutionOrchestrator extends EventEmitter {
  private static instance: SmartExecutionOrchestrator;
  private activeExecutions: Map<string, SmartExecutionRequest> = new Map();
  private executionHistory: SmartExecutionResponse[] = [];
  private progressCallbacks: Map<string, ProgressCallback[]> = new Map();

  // Configuration
  private readonly DEFAULT_QUALITY_THRESHOLD = 0.85;
  private readonly DEFAULT_MAX_SPRINTS = 5;
  private readonly DEFAULT_TIMEOUT = 120000; // 2 minutes
  private readonly MAX_HISTORY = 100;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  static getInstance(): SmartExecutionOrchestrator {
    if (!SmartExecutionOrchestrator.instance) {
      SmartExecutionOrchestrator.instance = new SmartExecutionOrchestrator();
    }
    return SmartExecutionOrchestrator.instance;
  }

  // --------------------------------------------------------------------------
  // EVENT SETUP
  // --------------------------------------------------------------------------

  private setupEventListeners(): void {
    // Listen for external execution requests
    bus.on('smart:execute', async (event) => {
      const response = await this.execute(event.payload);
      bus.publish('cortex', 'smart:execute:response', response);
    });

    // Listen for progress subscription requests
    bus.on('smart:subscribe', (event) => {
      const { executionId, callback } = event.payload;
      this.subscribeToProgress(executionId, callback);
    });
  }

  // --------------------------------------------------------------------------
  // MAIN EXECUTION FLOW
  // --------------------------------------------------------------------------

  /**
   * Execute a task with full smart orchestration
   */
  async execute(request: SmartExecutionRequest): Promise<SmartExecutionResponse> {
    const executionId = request.id || uuidv4();
    const startTime = Date.now();

    // Initialize execution
    const fullRequest: SmartExecutionRequest = {
      ...request,
      id: executionId,
      qualityThreshold: request.qualityThreshold || this.DEFAULT_QUALITY_THRESHOLD,
      maxSprints: request.maxSprints || this.DEFAULT_MAX_SPRINTS,
      timeout: request.timeout || this.DEFAULT_TIMEOUT,
      priorities: { ...DEFAULT_PRIORITIES, ...request.priorities },
    };

    this.activeExecutions.set(executionId, fullRequest);
    const sprints: ExecutionSprint[] = [];
    const errors: string[] = [];

    console.log(`\n[SmartOrchestrator] ═══════════════════════════════════════════`);
    console.log(`[SmartOrchestrator] 🚀 Starting Smart Execution: ${executionId}`);
    console.log(`[SmartOrchestrator] Objective: ${fullRequest.objective.substring(0, 100)}...`);
    console.log(`[SmartOrchestrator] ═══════════════════════════════════════════\n`);

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 1: UNDERSTANDING
      // ═══════════════════════════════════════════════════════════════════════
      this.emitProgress(executionId, {
        summary: 'Understanding your request...',
        detail: 'Analyzing the objective, identifying requirements, and determining the best approach.',
        progress: 5,
        phase: 'understanding',
        emoji: '🧠',
      });

      const analysis = await this.analyzeTask(fullRequest);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 2: PLANNING
      // ═══════════════════════════════════════════════════════════════════════
      this.emitProgress(executionId, {
        summary: 'Creating execution plan...',
        detail: `Breaking down into ${analysis.suggestedSprints} sprints. Each sprint focuses on a specific aspect for optimal quality.`,
        progress: 15,
        phase: 'planning',
        emoji: '📋',
        nextSteps: analysis.phases,
      });

      const plan = this.createExecutionPlan(fullRequest, analysis);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 3: PREPARING
      // ═══════════════════════════════════════════════════════════════════════
      this.emitProgress(executionId, {
        summary: 'Assembling execution team...',
        detail: 'Selecting the best agents for this task. Forming executor+validator pairs for quality assurance.',
        progress: 20,
        phase: 'preparing',
        emoji: '👥',
      });

      const team = await this.prepareTeam(fullRequest, analysis);

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 4: EXECUTING (Sprint Loop)
      // ═══════════════════════════════════════════════════════════════════════
      let currentQuality = 0;
      let lastOutput: TaskResult | null = null;

      for (let sprintNum = 1; sprintNum <= plan.sprints.length; sprintNum++) {
        const sprintDef = plan.sprints[sprintNum - 1];
        if (!sprintDef) continue;
        
        const sprint: ExecutionSprint = {
          id: uuidv4(),
          number: sprintNum,
          objective: sprintDef.objective,
          status: 'running',
          tasks: [],
          durationMs: 0,
          startedAt: new Date(),
          qualityScore: 0,
        };

        sprints.push(sprint);

        const progressBase = 20 + (60 * (sprintNum - 1)) / plan.sprints.length;
        const progressIncrement = 60 / plan.sprints.length;

        this.emitProgress(executionId, {
          summary: `Sprint ${sprintNum}/${plan.sprints.length}: ${sprintDef.objective}`,
          detail: sprintDef.description,
          progress: progressBase,
          phase: 'executing',
          emoji: '⚡',
          estimatedTimeRemaining: (plan.sprints.length - sprintNum + 1) * 15,
        });

        try {
          // Execute sprint
          const sprintResult = await this.executeSprint(
            fullRequest,
            sprint,
            team,
            lastOutput,
            (progress) => {
              this.emitProgress(executionId, {
                ...progress,
                progress: progressBase + (progressIncrement * progress.progress) / 100,
              });
            }
          );

          sprint.completedAt = new Date();
          sprint.durationMs = Date.now() - sprint.startedAt!.getTime();
          sprint.qualityScore = sprintResult.qualityScore;
          sprint.status = sprintResult.passed ? 'passed' : 'failed';
          sprint.validationResults = sprintResult.validations;

          lastOutput = sprintResult.result;
          currentQuality = sprintResult.qualityScore;

          // Check if we've met quality threshold
          if (sprintResult.passed && currentQuality >= fullRequest.qualityThreshold!) {
            this.emitProgress(executionId, {
              summary: `Quality threshold met! (${(currentQuality * 100).toFixed(1)}%)`,
              detail: 'All validation checks passed. Moving to finalization.',
              progress: 85,
              phase: 'validating',
              emoji: '✅',
              metrics: {
                qualityScore: currentQuality,
                performanceMs: Date.now() - startTime,
              },
            });
            break;
          }

          // If sprint failed and we have more sprints, emit refinement status
          if (!sprintResult.passed && sprintNum < plan.sprints.length) {
            this.emitProgress(executionId, {
              summary: `Refining approach for Sprint ${sprintNum + 1}...`,
              detail: `Sprint ${sprintNum} achieved ${(currentQuality * 100).toFixed(1)}% quality. Analyzing issues and preparing improvements.`,
              progress: progressBase + progressIncrement - 2,
              phase: 'refining',
              emoji: '🔄',
              nextSteps: sprintResult.validations
                .filter((v) => !v.passed)
                .map((v) => v.suggestions[0])
                .filter((s): s is string => Boolean(s)),
            });
          }
        } catch (sprintError: any) {
          sprint.status = 'failed';
          sprint.completedAt = new Date();
          sprint.durationMs = Date.now() - sprint.startedAt!.getTime();
          errors.push(`Sprint ${sprintNum}: ${sprintError.message}`);

          console.error(`[SmartOrchestrator] Sprint ${sprintNum} error:`, sprintError);
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 5: FINALIZING
      // ═══════════════════════════════════════════════════════════════════════
      this.emitProgress(executionId, {
        summary: 'Finalizing results...',
        detail: 'Packaging output, generating artifacts, and preparing summary.',
        progress: 95,
        phase: 'finalizing',
        emoji: '📦',
      });

      const totalDurationMs = Date.now() - startTime;
      const success = currentQuality >= fullRequest.qualityThreshold!;

      // Calculate optimization metrics
      const optimization = this.calculateOptimization(
        fullRequest,
        sprints,
        currentQuality,
        totalDurationMs
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        fullRequest,
        sprints,
        currentQuality,
        optimization
      );

      // Build final response
      const response: SmartExecutionResponse = {
        id: executionId,
        success,
        output: lastOutput?.output || '',
        sprints,
        totalSprints: sprints.length,
        qualityScore: currentQuality,
        artifacts: lastOutput?.artifacts || [],
        totalDurationMs,
        finalStatus: {
          summary: success
            ? `✅ Completed successfully with ${(currentQuality * 100).toFixed(1)}% quality`
            : `⚠️ Completed with ${(currentQuality * 100).toFixed(1)}% quality (below ${(fullRequest.qualityThreshold! * 100).toFixed(0)}% threshold)`,
          detail: success
            ? `Task completed in ${sprints.length} sprint(s) over ${(totalDurationMs / 1000).toFixed(1)}s. All quality gates passed.`
            : `Task completed in ${sprints.length} sprint(s) but did not meet quality threshold. Consider reviewing the output.`,
          progress: 100,
          phase: 'completed',
          emoji: success ? '🎉' : '⚠️',
          metrics: {
            qualityScore: currentQuality,
            performanceMs: totalDurationMs,
            estimatedCost: optimization.estimatedCost,
          },
        },
        optimization,
        teamId: team.id,
        errors,
        recommendations,
      };

      // Emit completion
      this.emitProgress(executionId, response.finalStatus);

      // Store in history
      this.executionHistory.push(response);
      if (this.executionHistory.length > this.MAX_HISTORY) {
        this.executionHistory.shift();
      }

      // Cleanup
      this.activeExecutions.delete(executionId);
      this.progressCallbacks.delete(executionId);

      // Publish completion event
      bus.publish('cortex', 'smart:execution:completed', {
        executionId,
        success,
        qualityScore: currentQuality,
        durationMs: totalDurationMs,
      });

      console.log(`\n[SmartOrchestrator] ═══════════════════════════════════════════`);
      console.log(`[SmartOrchestrator] ${success ? '✅' : '⚠️'} Execution Complete: ${executionId}`);
      console.log(`[SmartOrchestrator] Quality: ${(currentQuality * 100).toFixed(1)}%`);
      console.log(`[SmartOrchestrator] Sprints: ${sprints.length}`);
      console.log(`[SmartOrchestrator] Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
      console.log(`[SmartOrchestrator] ═══════════════════════════════════════════\n`);

      return response;
    } catch (error: any) {
      // Handle critical failure
      const totalDurationMs = Date.now() - startTime;

      const response: SmartExecutionResponse = {
        id: executionId,
        success: false,
        output: '',
        sprints,
        totalSprints: sprints.length,
        qualityScore: 0,
        artifacts: [],
        totalDurationMs,
        finalStatus: {
          summary: '❌ Execution failed',
          detail: `An error occurred: ${error.message}`,
          progress: 100,
          phase: 'failed',
          emoji: '❌',
        },
        optimization: {
          qualityScore: 0,
          performanceMs: totalDurationMs,
          efficiencyRatio: 0,
          estimatedCost: 0,
        },
        errors: [...errors, error.message],
        recommendations: ['Review the error message and try again', 'Consider breaking the task into smaller parts'],
      };

      this.emitProgress(executionId, response.finalStatus);
      this.activeExecutions.delete(executionId);

      return response;
    }
  }

  // --------------------------------------------------------------------------
  // TASK ANALYSIS
  // --------------------------------------------------------------------------

  private async analyzeTask(request: SmartExecutionRequest): Promise<TaskAnalysis> {
    const objective = request.objective.toLowerCase();

    // Determine complexity based on content
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
    let suggestedSprints = 2;
    const phases: string[] = [];

    // Code execution analysis
    if (request.code) {
      const codeLength = request.code.length;
      const hasMultipleFunctions = (request.code.match(/function|=>|def |class /g) || []).length > 3;
      const hasAsync = request.code.includes('async') || request.code.includes('await');
      const hasImports = request.code.includes('import') || request.code.includes('require');

      if (codeLength > 500 || hasMultipleFunctions) {
        complexity = 'complex';
        suggestedSprints = 3;
      } else if (codeLength < 100 && !hasAsync && !hasImports) {
        complexity = 'simple';
        suggestedSprints = 1;
      }

      phases.push('Code validation');
      phases.push('Safe execution');
      if (complexity !== 'simple') {
        phases.push('Output verification');
      }
    }

    // Generation analysis
    if (request.type === 'generate') {
      phases.push('Requirement analysis');
      phases.push('Code generation');
      phases.push('Quality validation');

      if (objective.includes('api') || objective.includes('service')) {
        complexity = 'complex';
        suggestedSprints = 3;
      }
    }

    // Analysis tasks
    if (request.type === 'analyze') {
      phases.push('Deep analysis');
      phases.push('Pattern recognition');
      phases.push('Recommendation generation');
    }

    // Determine best provider based on task
    let suggestedProvider = 'deepseek'; // Default cost-effective
    if (complexity === 'complex') {
      suggestedProvider = 'anthropic'; // Claude for complex reasoning
    } else if (request.type === 'generate' && objective.includes('creative')) {
      suggestedProvider = 'openai'; // GPT for creative tasks
    }

    return {
      complexity,
      suggestedSprints: Math.min(suggestedSprints, request.maxSprints || this.DEFAULT_MAX_SPRINTS),
      phases,
      suggestedProvider,
      estimatedDurationMs: suggestedSprints * 10000, // Rough estimate
      riskFactors: this.identifyRisks(request),
    };
  }

  private identifyRisks(request: SmartExecutionRequest): string[] {
    const risks: string[] = [];

    if (request.code && request.code.includes('eval(')) {
      risks.push('Code contains eval() - potential security risk');
    }
    if (request.code && (request.code.includes('rm -rf') || request.code.includes('del /f'))) {
      risks.push('Code contains destructive file operations');
    }
    if (request.timeout && request.timeout < 10000) {
      risks.push('Short timeout may cause premature termination');
    }

    return risks;
  }

  // --------------------------------------------------------------------------
  // EXECUTION PLANNING
  // --------------------------------------------------------------------------

  private createExecutionPlan(
    request: SmartExecutionRequest,
    analysis: TaskAnalysis
  ): ExecutionPlan {
    const sprints: SprintDefinition[] = [];

    // First sprint: Initial execution
    sprints.push({
      objective: 'Initial execution',
      description: `Execute the ${request.type} task and establish baseline quality.`,
      tasks: [
        {
          type: request.type,
          description: request.objective,
        },
      ],
    });

    // Additional sprints for refinement
    if (analysis.suggestedSprints > 1) {
      sprints.push({
        objective: 'Quality refinement',
        description: 'Analyze initial results and refine for better quality.',
        tasks: [
          {
            type: 'validate',
            description: 'Validate and improve output quality',
          },
        ],
      });
    }

    if (analysis.suggestedSprints > 2) {
      sprints.push({
        objective: 'Optimization pass',
        description: 'Optimize for performance and efficiency.',
        tasks: [
          {
            type: 'analyze',
            description: 'Optimize output for performance',
          },
        ],
      });
    }

    return {
      sprints,
      totalEstimatedMs: analysis.estimatedDurationMs,
      strategy: analysis.complexity === 'simple' ? 'direct' : 'iterative',
    };
  }

  // --------------------------------------------------------------------------
  // TEAM PREPARATION
  // --------------------------------------------------------------------------

  private async prepareTeam(
    request: SmartExecutionRequest,
    analysis: TaskAnalysis
  ): Promise<{ id: string; name: string }> {
    // Determine specialization
    let specialization = 'general';

    switch (request.type) {
      case 'execute':
        specialization = 'code-execution';
        break;
      case 'generate':
        specialization = 'code-generation';
        break;
      case 'analyze':
        specialization = 'code-analysis';
        break;
      case 'fix':
        specialization = 'code-fixing';
        break;
      case 'validate':
        specialization = 'validation';
        break;
    }

    // Find or create appropriate team
    const team = teamRegistry.findOrCreateTeam(specialization);

    console.log(`[SmartOrchestrator] Team assigned: ${team.name} (${team.id})`);

    return { id: team.id, name: team.name };
  }

  // --------------------------------------------------------------------------
  // SPRINT EXECUTION
  // --------------------------------------------------------------------------

  private async executeSprint(
    request: SmartExecutionRequest,
    sprint: ExecutionSprint,
    team: { id: string; name: string },
    previousResult: TaskResult | null,
    onProgress: ProgressCallback
  ): Promise<SprintResult> {
    const startTime = Date.now();

    onProgress({
      summary: `Executing ${sprint.objective}...`,
      detail: 'Running task through executor agent.',
      progress: 20,
      phase: 'executing',
      emoji: '⚙️',
    });

    // Build execution input
    let prompt = request.objective;
    if (previousResult && sprint.number > 1) {
      prompt = `REFINEMENT TASK:
Previous output achieved ${((sprint.qualityScore || 0) * 100).toFixed(1)}% quality.
Please improve upon the previous result:

${previousResult.output?.substring(0, 1000)}

Original objective: ${request.objective}

Focus on improving:
1. Correctness and accuracy
2. Code quality and best practices
3. Performance optimization
4. Clear documentation`;
    }

    // Execute through team framework
    const teamInstance = teamRegistry.getTeam(team.id);
    if (!teamInstance) {
      throw new Error(`Team ${team.id} not found`);
    }

    onProgress({
      summary: 'Running execution...',
      detail: `Team ${team.name} is processing the task.`,
      progress: 40,
      phase: 'executing',
      emoji: '🔄',
    });

    const teamResult = await teamExecutor.executeWithTeam(teamInstance, {
      id: sprint.id,
      teamId: team.id,
      type: request.type,
      input: {
        prompt,
        context: request.context,
        qualityThreshold: request.qualityThreshold,
        maxIterations: 3,
        source: 'api' as const,
      },
      status: 'planning',
      iterations: [],
      currentIteration: 0,
      maxIterations: 3,
      startedAt: new Date(),
    });

    onProgress({
      summary: 'Validating results...',
      detail: 'Running quality checks and validation.',
      progress: 70,
      phase: 'validating',
      emoji: '🔍',
    });

    // Run additional validations
    const validations = await this.runValidations(request, teamResult);

    const qualityScore = this.calculateQualityScore(teamResult, validations);
    const passed = qualityScore >= (request.qualityThreshold || this.DEFAULT_QUALITY_THRESHOLD);

    onProgress({
      summary: passed ? 'Sprint passed!' : 'Sprint needs refinement',
      detail: `Quality score: ${(qualityScore * 100).toFixed(1)}%`,
      progress: 100,
      phase: passed ? 'validating' : 'refining',
      emoji: passed ? '✓' : '🔄',
      metrics: { qualityScore },
    });

    return {
      result: {
        success: teamResult.success,
        output: teamResult.output,
        artifacts: teamResult.artifacts,
      },
      qualityScore,
      passed,
      validations,
      durationMs: Date.now() - startTime,
    };
  }

  // --------------------------------------------------------------------------
  // VALIDATION
  // --------------------------------------------------------------------------

  private async runValidations(
    request: SmartExecutionRequest,
    result: any
  ): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = [];

    // 1. Quality validation (highest priority)
    validations.push({
      validator: 'quality',
      passed: result.qualityScore >= 0.7,
      score: result.qualityScore || 0,
      issues: result.validationReport?.issues?.map((i: any) => i.description) || [],
      suggestions: result.validationReport?.suggestions || [],
    });

    // 2. Completeness validation
    const completenessScore = result.output && result.output.length > 10 ? 0.9 : 0.3;
    validations.push({
      validator: 'completeness',
      passed: completenessScore >= 0.7,
      score: completenessScore,
      issues: completenessScore < 0.7 ? ['Output seems incomplete'] : [],
      suggestions: completenessScore < 0.7 ? ['Ensure all requirements are addressed'] : [],
    });

    // 3. Code-specific validation
    if (request.type === 'execute' || request.type === 'generate') {
      const codeValid = !result.output?.includes('Error:') && !result.output?.includes('error:');
      validations.push({
        validator: 'code-safety',
        passed: codeValid,
        score: codeValid ? 0.9 : 0.4,
        issues: codeValid ? [] : ['Output contains errors'],
        suggestions: codeValid ? [] : ['Review and fix errors in the output'],
      });
    }

    return validations;
  }

  private calculateQualityScore(result: any, validations: ValidationResult[]): number {
    // Weighted average of validation scores
    // Quality > Performance > Efficiency > Cost
    const weights = {
      quality: 0.4,
      completeness: 0.3,
      'code-safety': 0.3,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const v of validations) {
      const weight = weights[v.validator as keyof typeof weights] || 0.2;
      weightedSum += v.score * weight;
      totalWeight += weight;
    }

    // Include team result quality if available
    if (result.qualityScore) {
      weightedSum += result.qualityScore * 0.3;
      totalWeight += 0.3;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  // --------------------------------------------------------------------------
  // OPTIMIZATION METRICS
  // --------------------------------------------------------------------------

  private calculateOptimization(
    request: SmartExecutionRequest,
    sprints: ExecutionSprint[],
    qualityScore: number,
    durationMs: number
  ): SmartExecutionResponse['optimization'] {
    // Efficiency = quality achieved / resources used (time, iterations)
    const iterations = sprints.reduce((sum, s) => sum + (s.validationResults?.length || 1), 0);
    const efficiencyRatio = qualityScore / (iterations * (durationMs / 10000));

    // Rough cost estimate based on tokens (simplified)
    const estimatedTokens = sprints.length * 2000;
    const estimatedCost = estimatedTokens * 0.00001; // Very rough estimate

    return {
      qualityScore,
      performanceMs: durationMs,
      efficiencyRatio: Math.min(efficiencyRatio, 1),
      estimatedCost,
    };
  }

  // --------------------------------------------------------------------------
  // RECOMMENDATIONS
  // --------------------------------------------------------------------------

  private generateRecommendations(
    request: SmartExecutionRequest,
    sprints: ExecutionSprint[],
    qualityScore: number,
    optimization: SmartExecutionResponse['optimization']
  ): string[] {
    const recommendations: string[] = [];

    if (qualityScore < (request.qualityThreshold || 0.85)) {
      recommendations.push('Consider breaking the task into smaller, more focused objectives');
      recommendations.push('Add more context or examples to improve understanding');
    }

    if (sprints.length >= (request.maxSprints || this.DEFAULT_MAX_SPRINTS)) {
      recommendations.push('Task may be too complex - consider splitting into multiple requests');
    }

    if (optimization.performanceMs > 60000) {
      recommendations.push('Long execution time detected - pre-processing could help');
    }

    if (sprints.some((s) => s.status === 'failed')) {
      const failures = sprints.filter((s) => s.status === 'failed');
      recommendations.push(`${failures.length} sprint(s) failed - review error messages for insights`);
    }

    return recommendations;
  }

  // --------------------------------------------------------------------------
  // PROGRESS MANAGEMENT
  // --------------------------------------------------------------------------

  private emitProgress(executionId: string, update: HumanStatusUpdate): void {
    // Log to console
    console.log(`[SmartOrchestrator] [${update.phase}] ${update.emoji} ${update.summary}`);

    // Emit event
    this.emit('progress', { executionId, update });
    bus.publish('cortex', 'smart:progress', { executionId, update });

    // Call registered callbacks
    const callbacks = this.progressCallbacks.get(executionId);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(update);
        } catch (e) {
          console.error('[SmartOrchestrator] Progress callback error:', e);
        }
      });
    }
  }

  subscribeToProgress(executionId: string, callback: ProgressCallback): void {
    const callbacks = this.progressCallbacks.get(executionId) || [];
    callbacks.push(callback);
    this.progressCallbacks.set(executionId, callbacks);
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  getActiveExecutions(): SmartExecutionRequest[] {
    return Array.from(this.activeExecutions.values());
  }

  getExecutionHistory(limit = 20): SmartExecutionResponse[] {
    return this.executionHistory.slice(-limit);
  }

  getExecution(id: string): SmartExecutionRequest | undefined {
    return this.activeExecutions.get(id);
  }
}

// ============================================================================
// SUPPORTING TYPES (internal)
// ============================================================================

interface TaskAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedSprints: number;
  phases: string[];
  suggestedProvider: string;
  estimatedDurationMs: number;
  riskFactors: string[];
}

interface ExecutionPlan {
  sprints: SprintDefinition[];
  totalEstimatedMs: number;
  strategy: 'direct' | 'iterative';
}

interface SprintDefinition {
  objective: string;
  description: string;
  tasks: Array<{ type: TaskType; description: string }>;
}

interface SprintResult {
  result: TaskResult;
  qualityScore: number;
  passed: boolean;
  validations: ValidationResult[];
  durationMs: number;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const smartOrchestrator = SmartExecutionOrchestrator.getInstance();
export default SmartExecutionOrchestrator;
