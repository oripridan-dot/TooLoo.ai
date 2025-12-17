/**
 * @file TooLoo Genesis - Evolution Process
 * @description Recursive self-improvement engine - TooLoo uses TooLoo to improve TooLoo
 * @version 1.0.0
 * @created 2025-12-16
 *
 * This is the heart of TooLoo's autonomous evolution. When something goes wrong
 * or an optimization opportunity is detected, this process:
 * 1. Analyzes the root cause using the evolution-architect skill
 * 2. Validates the proposed fix using the validator skill
 * 3. Executes the fix using the main ProcessPlanner (recursive!)
 * 4. Records the lesson for future learning
 */

import { EventEmitter } from 'events';
import { Brain } from '../brain.js';
import { ProcessPlanner } from '../process-planner.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import YAML from 'yaml';

// =============================================================================
// TYPES
// =============================================================================

export type EvolutionTrigger =
  | 'failure'
  | 'user_feedback'
  | 'periodic_optimization'
  | 'capability_gap'
  | 'performance_issue';

export interface EvolutionRequest {
  trigger: EvolutionTrigger;
  contextData: {
    error?: Error;
    errorLog?: string;
    stackTrace?: string;
    failedOperation?: string;
    userFeedback?: string;
    metrics?: Record<string, number>;
    missingCapability?: string;
    slowOperation?: string;
    [key: string]: unknown;
  };
  currentArchitecture?: string;
  evolutionBudget?: 'minimal' | 'moderate' | 'major';
  focusAreas?: Array<'reliability' | 'performance' | 'capabilities' | 'maintainability' | 'cost'>;
}

export interface EvolutionPlan {
  analysis: {
    rootCause: string;
    impactAssessment: string;
    currentGaps: string[];
  };
  strategy: 'repair' | 'enhance' | 'create_skill' | 'refactor' | 'no_action';
  reasoning: string;
  riskAssessment: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  evolutionPlan: {
    steps: Array<{
      order: number;
      action: string;
      target: string;
      expectedOutcome: string;
      rollbackPlan: string;
    }>;
    estimatedEffort: string;
    successCriteria: string[];
  };
  newSkillProposal?: {
    id: string;
    name: string;
    description: string;
    rationale: string;
    inputs: string[];
    outputs: string[];
    dependencies: string[];
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
  };
}

export interface ValidationResult {
  status: 'APPROVED' | 'REJECTED' | 'NEEDS_USER_INPUT' | 'NEEDS_MODIFICATION';
  reason: string;
  modifications?: string[];
  riskScore: number;
  safetyConcerns?: string[];
}

export interface EvolutionRecord {
  id: string;
  timestamp: Date;
  trigger: EvolutionTrigger;
  plan: EvolutionPlan;
  validation: ValidationResult;
  executionStatus: 'pending' | 'executing' | 'completed' | 'failed' | 'rejected';
  outcome?: {
    success: boolean;
    changes: string[];
    lessons: string[];
  };
}

export interface EvolutionMetrics {
  totalEvolutions: number;
  successfulEvolutions: number;
  failedEvolutions: number;
  rejectedEvolutions: number;
  skillsCreated: number;
  bugsFixed: number;
  performanceImprovements: number;
  averageRiskScore: number;
}

// =============================================================================
// THE EVOLUTION PROCESS
// =============================================================================

export class EvolutionProcess extends EventEmitter {
  private brain: Brain;
  private planner: ProcessPlanner;
  private evolutionJournalPath: string;
  private records: EvolutionRecord[] = [];
  private metrics: EvolutionMetrics;
  private isEvolving = false;
  private evolutionQueue: EvolutionRequest[] = [];

  constructor(brain: Brain, planner: ProcessPlanner) {
    super();
    this.brain = brain;
    this.planner = planner;
    this.evolutionJournalPath = join(process.cwd(), 'soul', 'evolution.yaml');
    this.metrics = this.createInitialMetrics();

    // Load existing records
    this.loadEvolutionJournal();

    // Wire up automatic triggers
    this.setupAutomaticTriggers();
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  private createInitialMetrics(): EvolutionMetrics {
    return {
      totalEvolutions: 0,
      successfulEvolutions: 0,
      failedEvolutions: 0,
      rejectedEvolutions: 0,
      skillsCreated: 0,
      bugsFixed: 0,
      performanceImprovements: 0,
      averageRiskScore: 0,
    };
  }

  private loadEvolutionJournal(): void {
    try {
      if (existsSync(this.evolutionJournalPath)) {
        const content = readFileSync(this.evolutionJournalPath, 'utf-8');
        const journal = YAML.parse(content);
        if (journal?.records) {
          this.records = journal.records;
        }
        if (journal?.metrics) {
          this.metrics = { ...this.metrics, ...journal.metrics };
        }
        console.log(`[Evolution] Loaded ${this.records.length} evolution records`);
      }
    } catch (error) {
      console.warn('[Evolution] Failed to load evolution journal:', error);
    }
  }

  private saveEvolutionJournal(): void {
    try {
      const dir = dirname(this.evolutionJournalPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const journal = {
        name: 'TooLoo Evolution Journal',
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        metrics: this.metrics,
        records: this.records.slice(-100), // Keep last 100 records
      };

      writeFileSync(this.evolutionJournalPath, YAML.stringify(journal), 'utf-8');
    } catch (error) {
      console.error('[Evolution] Failed to save evolution journal:', error);
    }
  }

  private setupAutomaticTriggers(): void {
    // Listen for process failures
    this.planner.on('mind:goal-failed', async (data) => {
      console.log('[Evolution] 🚨 Detected goal failure, triggering evolution...');
      await this.evolve({
        trigger: 'failure',
        contextData: {
          failedOperation: data.goal?.description,
          error: data.error,
          errorLog: data.error?.message,
          stackTrace: data.error?.stack,
        },
      });
    });

    // Listen for repeated low confidence
    this.brain.on('brain:low-confidence', async (data) => {
      // Only trigger evolution if confidence is very low and it's repeated
      if (data.confidence < 0.5) {
        console.log('[Evolution] 🔍 Detected capability gap (low confidence)...');
        await this.evolve({
          trigger: 'capability_gap',
          contextData: {
            missingCapability: data.task,
            metrics: { confidence: data.confidence },
          },
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // MAIN EVOLUTION LOOP
  // ---------------------------------------------------------------------------

  /**
   * Main entry point for evolution
   * Recursive: Uses ProcessPlanner to execute evolution plans
   */
  async evolve(request: EvolutionRequest): Promise<EvolutionRecord | null> {
    console.log(`[Evolution] 🧬 Evolution triggered: ${request.trigger}`);
    this.emit('evolution:started', { trigger: request.trigger });

    // Prevent infinite recursion
    if (this.isEvolving) {
      console.log('[Evolution] ⏸️ Already evolving, queueing request...');
      this.evolutionQueue.push(request);
      return null;
    }

    this.isEvolving = true;
    const recordId = `evo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // 1. ANALYZE: Use evolution-architect skill to plan the improvement
      console.log('[Evolution] 📐 Step 1: Analyzing with Evolution Architect...');
      const plan = await this.analyzeWithArchitect(request);

      if (plan.strategy === 'no_action') {
        console.log('[Evolution] ✅ No action needed:', plan.reasoning);
        this.isEvolving = false;
        return null;
      }

      // 2. VALIDATE: Use validator skill to check the plan
      console.log('[Evolution] 🛡️ Step 2: Validating evolution plan...');
      const validation = await this.validatePlan(plan, request);

      // Create record
      const record: EvolutionRecord = {
        id: recordId,
        timestamp: new Date(),
        trigger: request.trigger,
        plan,
        validation,
        executionStatus: 'pending',
      };

      // Check validation status
      if (validation.status === 'REJECTED') {
        console.log('[Evolution] ❌ Plan rejected:', validation.reason);
        record.executionStatus = 'rejected';
        this.metrics.rejectedEvolutions++;
        this.records.push(record);
        this.saveEvolutionJournal();
        this.emit('evolution:rejected', { record, reason: validation.reason });
        this.isEvolving = false;
        return record;
      }

      if (validation.status === 'NEEDS_USER_INPUT') {
        console.log('[Evolution] ⏳ Waiting for user approval...');
        // Emit event for UI to show approval request
        this.emit('evolution:needs-approval', {
          record,
          validation,
          plan,
        });
        // Store for later approval
        record.executionStatus = 'pending';
        this.records.push(record);
        this.saveEvolutionJournal();
        this.isEvolving = false;
        return record;
      }

      // 3. EXECUTE: Use ProcessPlanner to execute the evolution plan
      console.log('[Evolution] ⚡ Step 3: Executing evolution plan...');
      record.executionStatus = 'executing';

      const outcome = await this.executePlan(plan, request);

      record.executionStatus = outcome.success ? 'completed' : 'failed';
      record.outcome = outcome;

      // 4. UPDATE METRICS
      this.metrics.totalEvolutions++;
      if (outcome.success) {
        this.metrics.successfulEvolutions++;
        if (plan.strategy === 'repair') this.metrics.bugsFixed++;
        if (plan.strategy === 'create_skill') this.metrics.skillsCreated++;
        if (plan.strategy === 'enhance') this.metrics.performanceImprovements++;
      } else {
        this.metrics.failedEvolutions++;
      }
      this.metrics.averageRiskScore =
        (this.metrics.averageRiskScore * (this.metrics.totalEvolutions - 1) +
          validation.riskScore) /
        this.metrics.totalEvolutions;

      this.records.push(record);
      this.saveEvolutionJournal();

      console.log(
        `[Evolution] ${outcome.success ? '✅' : '❌'} Evolution ${outcome.success ? 'completed' : 'failed'}`
      );
      this.emit('evolution:completed', { record, outcome });

      this.isEvolving = false;

      // Process queued requests
      if (this.evolutionQueue.length > 0) {
        const nextRequest = this.evolutionQueue.shift()!;
        setTimeout(() => this.evolve(nextRequest), 1000);
      }

      return record;
    } catch (error) {
      console.error('[Evolution] 💀 Evolution failed:', error);
      this.metrics.failedEvolutions++;
      this.emit('evolution:error', { error });
      this.isEvolving = false;
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // ANALYSIS
  // ---------------------------------------------------------------------------

  private async analyzeWithArchitect(request: EvolutionRequest): Promise<EvolutionPlan> {
    const systemPrompt = `You are the Evolution Architect for TooLoo Genesis.
Your job is to analyze issues and design improvements.

Current System Architecture:
- Kernel: Skills OS with registry, router, executor
- Core: Brain (LLM), ProcessPlanner (Mind), SkillsMaster (Hands)
- Skills: YAML-defined capabilities in /skills directory
- Soul: Values and autonomy rules in /soul/destiny.yaml

Analyze the trigger and propose an evolution strategy.`;

    const userPrompt = `EVOLUTION REQUEST:
Trigger: ${request.trigger}

Context Data:
${JSON.stringify(request.contextData, null, 2)}

Evolution Budget: ${request.evolutionBudget ?? 'moderate'}
Focus Areas: ${request.focusAreas?.join(', ') ?? 'reliability, performance'}

Provide your analysis and evolution plan in JSON format.`;

    const result = await this.brain.think(
      userPrompt,
      systemPrompt,
      { temperature: 0.4, provider: 'anthropic' }
    );

    // Parse the JSON response
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          analysis: {
            rootCause: parsed.analysis?.root_cause ?? parsed.analysis?.rootCause ?? 'Unknown',
            impactAssessment:
              parsed.analysis?.impact_assessment ?? parsed.analysis?.impactAssessment ?? 'Unknown',
            currentGaps: parsed.analysis?.current_gaps ?? parsed.analysis?.currentGaps ?? [],
          },
          strategy: parsed.strategy ?? 'no_action',
          reasoning: parsed.reasoning ?? 'No reasoning provided',
          riskAssessment: parsed.risk_assessment ?? parsed.riskAssessment ?? 'medium',
          evolutionPlan: {
            steps: (parsed.evolution_plan?.steps ?? parsed.evolutionPlan?.steps ?? []).map(
              (s: any) => ({
                order: s.order ?? 0,
                action: s.action ?? '',
                target: s.target ?? '',
                expectedOutcome: s.expected_outcome ?? s.expectedOutcome ?? '',
                rollbackPlan: s.rollback_plan ?? s.rollbackPlan ?? 'Revert changes',
              })
            ),
            estimatedEffort:
              parsed.evolution_plan?.estimated_effort ??
              parsed.evolutionPlan?.estimatedEffort ??
              'Unknown',
            successCriteria:
              parsed.evolution_plan?.success_criteria ??
              parsed.evolutionPlan?.successCriteria ??
              [],
          },
          newSkillProposal: parsed.new_skill_proposal ?? parsed.newSkillProposal,
        };
      }
    } catch (parseError) {
      console.warn('[Evolution] Failed to parse architect response, using defaults');
    }

    // Fallback plan
    return {
      analysis: {
        rootCause: 'Unable to determine root cause',
        impactAssessment: 'Unknown impact',
        currentGaps: [],
      },
      strategy: 'no_action',
      reasoning: 'Failed to analyze the issue',
      riskAssessment: 'medium',
      evolutionPlan: {
        steps: [],
        estimatedEffort: 'Unknown',
        successCriteria: [],
      },
    };
  }

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  private async validatePlan(
    plan: EvolutionPlan,
    request: EvolutionRequest
  ): Promise<ValidationResult> {
    const systemPrompt = `You are the Validator for TooLoo Genesis.
Your job is to validate evolution plans before they are executed.

This is a SELF-MODIFICATION request. Be EXTRA careful.
TooLoo is about to modify its own code/skills.

Risk Tolerance: LOW (be conservative)`;

    const userPrompt = `VALIDATE THIS EVOLUTION PLAN:

Strategy: ${plan.strategy}
Risk Assessment: ${plan.riskAssessment}
Reasoning: ${plan.reasoning}

Steps:
${plan.evolutionPlan.steps.map((s) => `${s.order}. ${s.action} → ${s.target}`).join('\n')}

Original Trigger: ${request.trigger}
Context: ${JSON.stringify(request.contextData).slice(0, 500)}

Respond with JSON: { status, reason, modifications, riskScore, safetyConcerns }`;

    const result = await this.brain.think(
      userPrompt,
      systemPrompt,
      { temperature: 0.2, provider: 'anthropic' }
    );

    // Parse the JSON response
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          status: parsed.status ?? 'NEEDS_USER_INPUT',
          reason: parsed.reason ?? 'Validation result unclear',
          modifications: parsed.modifications ?? [],
          riskScore: parsed.risk_score ?? parsed.riskScore ?? 50,
          safetyConcerns: parsed.safety_concerns ?? parsed.safetyConcerns ?? [],
        };
      }
    } catch (parseError) {
      console.warn('[Evolution] Failed to parse validation response');
    }

    // Conservative fallback
    return {
      status: 'NEEDS_USER_INPUT',
      reason: 'Unable to validate automatically',
      riskScore: 70,
      safetyConcerns: ['Validation parsing failed'],
    };
  }

  // ---------------------------------------------------------------------------
  // EXECUTION
  // ---------------------------------------------------------------------------

  private async executePlan(
    plan: EvolutionPlan,
    request: EvolutionRequest
  ): Promise<{ success: boolean; changes: string[]; lessons: string[] }> {
    const changes: string[] = [];
    const lessons: string[] = [];

    try {
      // Convert evolution steps to a goal for ProcessPlanner
      const goalDescription = `SYSTEM EVOLUTION (${plan.strategy}): ${plan.reasoning}
      
Steps:
${plan.evolutionPlan.steps.map((s) => `${s.order}. ${s.action}`).join('\n')}

Success Criteria:
${plan.evolutionPlan.successCriteria.join('\n')}`;

      // Use the planner to execute (RECURSIVE: TooLoo uses TooLoo!)
      this.planner.addGoal(goalDescription, {
        source: 'self-generated',
        priority: plan.riskAssessment === 'critical' ? 'critical' : 'high',
        context: `Evolution trigger: ${request.trigger}`,
      });

      // Wait for the goal to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => {
            reject(new Error('Evolution execution timeout'));
          },
          5 * 60 * 1000
        ); // 5 minute timeout

        const onComplete = (data: any) => {
          if (data.goal?.description.includes('SYSTEM EVOLUTION')) {
            clearTimeout(timeout);
            changes.push(...(data.results?.map((r: any) => r.action) ?? []));
            resolve();
          }
        };

        const onFailed = (data: any) => {
          if (data.goal?.description.includes('SYSTEM EVOLUTION')) {
            clearTimeout(timeout);
            reject(new Error(data.error?.message ?? 'Evolution execution failed'));
          }
        };

        this.planner.once('mind:goal-completed', onComplete);
        this.planner.once('mind:goal-failed', onFailed);
      });

      // Record lessons
      lessons.push(`Trigger: ${request.trigger} → Strategy: ${plan.strategy} → SUCCESS`);
      lessons.push(`Root cause identified: ${plan.analysis.rootCause}`);

      return { success: true, changes, lessons };
    } catch (error) {
      lessons.push(`Trigger: ${request.trigger} → Strategy: ${plan.strategy} → FAILED`);
      lessons.push(`Error: ${(error as Error).message}`);
      return { success: false, changes, lessons };
    }
  }

  // ---------------------------------------------------------------------------
  // MANUAL CONTROLS
  // ---------------------------------------------------------------------------

  /**
   * Approve a pending evolution
   */
  async approveEvolution(recordId: string): Promise<boolean> {
    const record = this.records.find((r) => r.id === recordId && r.executionStatus === 'pending');
    if (!record) {
      console.warn('[Evolution] No pending evolution found with ID:', recordId);
      return false;
    }

    console.log('[Evolution] ✅ Evolution approved by user');

    // Execute the plan
    this.isEvolving = true;
    record.executionStatus = 'executing';

    const outcome = await this.executePlan(record.plan, {
      trigger: record.trigger,
      contextData: {},
    });

    record.executionStatus = outcome.success ? 'completed' : 'failed';
    record.outcome = outcome;

    // Update metrics
    this.metrics.totalEvolutions++;
    if (outcome.success) {
      this.metrics.successfulEvolutions++;
    } else {
      this.metrics.failedEvolutions++;
    }

    this.saveEvolutionJournal();
    this.isEvolving = false;

    this.emit('evolution:completed', { record, outcome });
    return outcome.success;
  }

  /**
   * Reject a pending evolution
   */
  rejectEvolution(recordId: string): boolean {
    const record = this.records.find((r) => r.id === recordId && r.executionStatus === 'pending');
    if (!record) {
      console.warn('[Evolution] No pending evolution found with ID:', recordId);
      return false;
    }

    console.log('[Evolution] ❌ Evolution rejected by user');
    record.executionStatus = 'rejected';
    this.metrics.rejectedEvolutions++;
    this.saveEvolutionJournal();
    this.emit('evolution:rejected', { record, reason: 'Rejected by user' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // PERIODIC OPTIMIZATION
  // ---------------------------------------------------------------------------

  /**
   * Start periodic self-optimization
   */
  startPeriodicOptimization(intervalMs: number = 3600000): void {
    console.log(
      `[Evolution] ⏰ Starting periodic optimization (every ${intervalMs / 60000} minutes)`
    );

    setInterval(async () => {
      console.log('[Evolution] 🔄 Running periodic optimization...');

      await this.evolve({
        trigger: 'periodic_optimization',
        contextData: {
          metrics: this.metrics as unknown as Record<string, number>,
        },
        evolutionBudget: 'minimal',
        focusAreas: ['performance', 'reliability'],
      });
    }, intervalMs);
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getMetrics(): EvolutionMetrics {
    return { ...this.metrics };
  }

  getRecords(limit: number = 10): EvolutionRecord[] {
    return this.records.slice(-limit);
  }

  getPendingEvolutions(): EvolutionRecord[] {
    return this.records.filter((r) => r.executionStatus === 'pending');
  }

  isCurrentlyEvolving(): boolean {
    return this.isEvolving;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let evolutionProcess: EvolutionProcess | null = null;

export function getEvolutionProcess(brain: Brain, planner: ProcessPlanner): EvolutionProcess {
  if (!evolutionProcess) {
    evolutionProcess = new EvolutionProcess(brain, planner);
  }
  return evolutionProcess;
}

export default EvolutionProcess;
