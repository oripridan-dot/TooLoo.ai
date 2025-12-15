/**
 * @file SelfImprovementService - Safe autonomous evolution pipeline
 * @version 1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * Implements the 5-stage self-improvement pipeline:
 * 1. ANALYZE - Identify weaknesses and opportunities
 * 2. PROPOSE - Generate improvement proposals
 * 3. TEST - Validate changes in sandbox
 * 4. REVIEW - Approve or reject proposals
 * 5. DEPLOY - Apply changes with monitoring
 *
 * Key safety features:
 * - Risk-based approval workflow
 * - Automatic rollback on failure
 * - Full audit logging
 * - Human escalation for critical changes
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// =============================================================================
// TYPES
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProposalStatus = 'draft' | 'testing' | 'pending_review' | 'approved' | 'deployed' | 'rolled_back' | 'rejected';

export interface ImprovementProposal {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: ProposalStatus;

  // Problem identification
  target: string; // Skill ID, 'system', 'prompts', etc.
  problem: string;
  evidence: Evidence[];

  // Proposed solution
  solution: string;
  changes: ProposedChange[];
  expectedImprovement: string;
  riskLevel: RiskLevel;

  // Testing results
  testResults?: TestResults;

  // Review
  reviewedAt?: number;
  reviewedBy?: string; // 'auto' or user ID
  reviewNotes?: string;

  // Deployment
  deployedAt?: number;
  rollbackPlan: string;
  backup?: Backup;

  // Metrics
  preDeployMetrics?: Record<string, number>;
  postDeployMetrics?: Record<string, number>;
}

export interface Evidence {
  type: 'metric' | 'error' | 'pattern' | 'feedback';
  source: string;
  value: unknown;
  timestamp: number;
}

export interface ProposedChange {
  type: 'file_modify' | 'file_create' | 'file_delete' | 'config_change' | 'prompt_update';
  path: string;
  description: string;
  before?: string;
  after?: string;
}

export interface TestResults {
  passed: boolean;
  testCount: number;
  passedCount: number;
  failedCount: number;
  coverage?: number;
  regressions: string[];
  improvements: string[];
  duration: number;
}

export interface Backup {
  id: string;
  createdAt: number;
  files: Array<{ path: string; content: string }>;
}

export interface AnalysisResult {
  timestamp: number;
  overallHealth: number;
  skills: SkillAnalysis[];
  opportunities: Opportunity[];
  warnings: string[];
}

export interface SkillAnalysis {
  skillId: string;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  trend: 'improving' | 'stable' | 'declining';
  issues: string[];
}

export interface Opportunity {
  type: 'performance' | 'reliability' | 'capability' | 'efficiency';
  target: string;
  description: string;
  priority: number;
  estimatedImpact: string;
}

export interface SelfImprovementConfig {
  maxProposalsPerDay: number;
  maxDeploymentsPerDay: number;
  minTestCoverage: number;
  maxRollbackRate: number;
  observationPeriodMs: number;
  autoApproveRiskLevel: RiskLevel;
  persistPath?: string;
}

export interface SelfImprovementMetrics {
  proposalsGenerated: number;
  proposalsApproved: number;
  deploymentsSuccessful: number;
  rollbacksTriggered: number;
  lastAnalysis?: number;
  systemHealthDelta: number;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  target?: string;
  proposalId?: string;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending';
}

export interface DailyStats {
  proposals: number;
  deployments: number;
  date: string;
}

// =============================================================================
// SELF IMPROVEMENT SERVICE
// =============================================================================

export class SelfImprovementService extends EventEmitter {
  private config: Required<SelfImprovementConfig>;
  private proposals: Map<string, ImprovementProposal> = new Map();
  private auditLog: AuditEntry[] = [];
  private metrics: SelfImprovementMetrics;
  private dailyStats: DailyStats;

  constructor(config: Partial<SelfImprovementConfig> = {}) {
    super();

    this.config = {
      maxProposalsPerDay: config.maxProposalsPerDay ?? 10,
      maxDeploymentsPerDay: config.maxDeploymentsPerDay ?? 5,
      minTestCoverage: config.minTestCoverage ?? 0.8,
      maxRollbackRate: config.maxRollbackRate ?? 0.2,
      observationPeriodMs: config.observationPeriodMs ?? 3600000, // 1 hour
      autoApproveRiskLevel: config.autoApproveRiskLevel ?? 'low',
      persistPath: config.persistPath ?? '',
    };

    this.metrics = {
      proposalsGenerated: 0,
      proposalsApproved: 0,
      deploymentsSuccessful: 0,
      rollbacksTriggered: 0,
      systemHealthDelta: 0,
    };

    this.dailyStats = {
      proposals: 0,
      deployments: 0,
      date: new Date().toISOString().split('T')[0]!,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. ANALYZE Phase
  // ---------------------------------------------------------------------------

  /**
   * Analyze system performance and identify improvement opportunities
   */
  async analyze(target?: string): Promise<AnalysisResult> {
    const auditId = this.audit('analyze', target);

    try {
      const result: AnalysisResult = {
        timestamp: Date.now(),
        overallHealth: 0,
        skills: [],
        opportunities: [],
        warnings: [],
      };

      // In a real implementation, this would:
      // 1. Query metrics from all skills via context.services.engines.learning
      // 2. Calculate trends and identify declining performance
      // 3. Detect error patterns via context.services.engines.emergence
      // 4. Generate prioritized improvement opportunities

      // For now, emit an event for the kernel to handle
      this.emit('analysis:requested', { target, auditId });

      // Mock analysis result
      result.overallHealth = 0.85;
      result.opportunities = [
        {
          type: 'performance',
          target: target ?? 'system',
          description: 'Analysis complete - real metrics would be gathered from engines',
          priority: 1,
          estimatedImpact: 'Baseline established for future comparisons',
        },
      ];

      this.metrics.lastAnalysis = Date.now();
      this.updateAudit(auditId, 'success', { result });

      return result;
    } catch (error) {
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. PROPOSE Phase
  // ---------------------------------------------------------------------------

  /**
   * Generate an improvement proposal
   */
  async propose(
    target: string,
    problem: string,
    evidence: Evidence[],
    solution: string,
    changes: ProposedChange[]
  ): Promise<ImprovementProposal> {
    // Check daily limit
    this.resetDailyStatsIfNeeded();
    if (this.dailyStats.proposals >= this.config.maxProposalsPerDay) {
      throw new Error(`Daily proposal limit reached (${this.config.maxProposalsPerDay})`);
    }

    const auditId = this.audit('propose', target);

    try {
      const riskLevel = this.assessRisk(changes);

      const proposal: ImprovementProposal = {
        id: randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'draft',
        target,
        problem,
        evidence,
        solution,
        changes,
        expectedImprovement: `Address: ${problem}`,
        riskLevel,
        rollbackPlan: this.generateRollbackPlan(changes),
      };

      this.proposals.set(proposal.id, proposal);
      this.dailyStats.proposals++;
      this.metrics.proposalsGenerated++;

      this.emit('proposal:created', { proposal, auditId });
      this.updateAudit(auditId, 'success', { proposalId: proposal.id, riskLevel });

      return proposal;
    } catch (error) {
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Assess the risk level of proposed changes
   */
  private assessRisk(changes: ProposedChange[]): RiskLevel {
    let maxRisk: RiskLevel = 'low';

    for (const change of changes) {
      let changeRisk: RiskLevel = 'low';

      // Risk assessment rules
      if (change.path.includes('kernel') || change.path.includes('boot')) {
        changeRisk = 'critical';
      } else if (change.path.includes('security') || change.path.includes('auth')) {
        changeRisk = 'critical';
      } else if (change.type === 'file_delete') {
        changeRisk = 'high';
      } else if (change.path.includes('schema') || change.path.includes('types')) {
        changeRisk = 'high';
      } else if (change.type === 'file_create') {
        changeRisk = 'medium';
      } else if (change.path.endsWith('.yaml') || change.path.includes('prompts')) {
        changeRisk = 'low';
      } else if (change.type === 'file_modify') {
        changeRisk = 'medium';
      }

      // Update max risk
      if (this.riskToNumber(changeRisk) > this.riskToNumber(maxRisk)) {
        maxRisk = changeRisk;
      }
    }

    return maxRisk;
  }

  private riskToNumber(risk: RiskLevel): number {
    switch (risk) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      case 'critical': return 4;
    }
  }

  /**
   * Generate a rollback plan for the changes
   */
  private generateRollbackPlan(changes: ProposedChange[]): string {
    const steps: string[] = [];

    for (const change of changes) {
      switch (change.type) {
        case 'file_modify':
          steps.push(`Restore ${change.path} from backup`);
          break;
        case 'file_create':
          steps.push(`Delete ${change.path}`);
          break;
        case 'file_delete':
          steps.push(`Restore ${change.path} from backup`);
          break;
        case 'config_change':
          steps.push(`Revert config at ${change.path} to previous value`);
          break;
        case 'prompt_update':
          steps.push(`Restore previous prompt in ${change.path}`);
          break;
      }
    }

    return steps.join('\n');
  }

  // ---------------------------------------------------------------------------
  // 3. TEST Phase
  // ---------------------------------------------------------------------------

  /**
   * Test a proposal in sandbox environment
   */
  async test(proposalId: string): Promise<TestResults> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const auditId = this.audit('test', proposal.target, proposalId);

    try {
      proposal.status = 'testing';
      proposal.updatedAt = Date.now();

      // In a real implementation, this would:
      // 1. Create a sandbox environment
      // 2. Apply the proposed changes
      // 3. Run relevant tests
      // 4. Measure performance changes
      // 5. Check for regressions

      this.emit('test:started', { proposalId, auditId });

      // Mock test execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      const results: TestResults = {
        passed: true,
        testCount: 10,
        passedCount: 10,
        failedCount: 0,
        coverage: 0.85,
        regressions: [],
        improvements: ['Performance improved by estimated margin'],
        duration: 100,
      };

      proposal.testResults = results;
      proposal.status = results.passed ? 'pending_review' : 'draft';
      proposal.updatedAt = Date.now();

      this.emit('test:completed', { proposalId, results, auditId });
      this.updateAudit(auditId, results.passed ? 'success' : 'failure', { results });

      return results;
    } catch (error) {
      proposal.status = 'draft';
      proposal.updatedAt = Date.now();
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. REVIEW Phase
  // ---------------------------------------------------------------------------

  /**
   * Review a proposal and approve/reject
   */
  async review(
    proposalId: string,
    approved: boolean,
    reviewedBy: string = 'auto',
    notes?: string
  ): Promise<ImprovementProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending_review') {
      throw new Error(`Proposal ${proposalId} is not pending review (status: ${proposal.status})`);
    }

    const auditId = this.audit('review', proposal.target, proposalId);

    try {
      // Check if auto-approval is allowed for this risk level
      if (reviewedBy === 'auto' && 
          this.riskToNumber(proposal.riskLevel) > this.riskToNumber(this.config.autoApproveRiskLevel)) {
        throw new Error(`Auto-approval not allowed for ${proposal.riskLevel} risk (requires human review)`);
      }

      proposal.reviewedAt = Date.now();
      proposal.reviewedBy = reviewedBy;
      proposal.reviewNotes = notes;
      proposal.status = approved ? 'approved' : 'rejected';
      proposal.updatedAt = Date.now();

      if (approved) {
        this.metrics.proposalsApproved++;
      }

      this.emit('review:completed', {
        proposalId,
        approved,
        reviewedBy,
        riskLevel: proposal.riskLevel,
        auditId,
      });
      this.updateAudit(auditId, 'success', { approved, reviewedBy });

      return proposal;
    } catch (error) {
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. DEPLOY Phase
  // ---------------------------------------------------------------------------

  /**
   * Deploy an approved proposal
   */
  async deploy(proposalId: string): Promise<ImprovementProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'approved') {
      throw new Error(`Proposal ${proposalId} is not approved (status: ${proposal.status})`);
    }

    // Check daily limit
    this.resetDailyStatsIfNeeded();
    if (this.dailyStats.deployments >= this.config.maxDeploymentsPerDay) {
      throw new Error(`Daily deployment limit reached (${this.config.maxDeploymentsPerDay})`);
    }

    const auditId = this.audit('deploy', proposal.target, proposalId);

    try {
      // Create backup
      proposal.backup = await this.createBackup(proposal.changes);

      // Capture pre-deployment metrics
      proposal.preDeployMetrics = await this.captureMetrics();

      this.emit('deploy:started', { proposalId, auditId });

      // In a real implementation, this would:
      // 1. Apply all changes atomically
      // 2. Verify changes were applied correctly
      // 3. Start observation period

      // Mock deployment
      await new Promise((resolve) => setTimeout(resolve, 100));

      proposal.deployedAt = Date.now();
      proposal.status = 'deployed';
      proposal.updatedAt = Date.now();

      this.dailyStats.deployments++;
      this.metrics.deploymentsSuccessful++;

      // Start observation period
      this.startObservation(proposalId);

      this.emit('deploy:completed', { proposalId, auditId });
      this.updateAudit(auditId, 'success', { deployedAt: proposal.deployedAt });

      return proposal;
    } catch (error) {
      // Attempt automatic rollback
      if (proposal.backup) {
        await this.rollback(proposalId);
      }
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Rollback a deployed proposal
   */
  async rollback(proposalId: string): Promise<ImprovementProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'deployed') {
      throw new Error(`Proposal ${proposalId} is not deployed (status: ${proposal.status})`);
    }

    if (!proposal.backup) {
      throw new Error(`No backup available for proposal ${proposalId}`);
    }

    const auditId = this.audit('rollback', proposal.target, proposalId);

    try {
      this.emit('rollback:started', { proposalId, auditId });

      // In a real implementation, this would:
      // 1. Stop any running processes
      // 2. Restore all files from backup
      // 3. Verify restoration

      // Mock rollback
      await new Promise((resolve) => setTimeout(resolve, 100));

      proposal.status = 'rolled_back';
      proposal.updatedAt = Date.now();

      this.metrics.rollbacksTriggered++;

      // Check if rollback rate is too high
      const rollbackRate = this.metrics.rollbacksTriggered / 
        (this.metrics.deploymentsSuccessful + this.metrics.rollbacksTriggered);
      
      if (rollbackRate > this.config.maxRollbackRate) {
        this.emit('safety:pause', {
          reason: `Rollback rate (${(rollbackRate * 100).toFixed(1)}%) exceeds threshold`,
          auditId,
        });
      }

      this.emit('rollback:completed', { proposalId, auditId });
      this.updateAudit(auditId, 'success', { rolledBackAt: proposal.updatedAt });

      return proposal;
    } catch (error) {
      this.updateAudit(auditId, 'failure', { error: (error as Error).message });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Observation & Monitoring
  // ---------------------------------------------------------------------------

  /**
   * Start observation period after deployment
   */
  private startObservation(proposalId: string): void {
    setTimeout(async () => {
      const proposal = this.proposals.get(proposalId);
      if (!proposal || proposal.status !== 'deployed') return;

      try {
        // Capture post-deployment metrics
        proposal.postDeployMetrics = await this.captureMetrics();

        // Compare metrics
        const healthDelta = this.calculateHealthDelta(
          proposal.preDeployMetrics ?? {},
          proposal.postDeployMetrics
        );

        this.metrics.systemHealthDelta = healthDelta;

        // If health decreased significantly, trigger rollback
        if (healthDelta < -0.1) {
          console.warn(`[SelfImprovement] Health decreased by ${(-healthDelta * 100).toFixed(1)}%, triggering rollback`);
          await this.rollback(proposalId);
          return;
        }

        this.emit('observation:completed', {
          proposalId,
          healthDelta,
          preMetrics: proposal.preDeployMetrics,
          postMetrics: proposal.postDeployMetrics,
        });
      } catch (error) {
        console.error('[SelfImprovement] Observation failed:', error);
      }
    }, this.config.observationPeriodMs);
  }

  /**
   * Create backup of files to be changed
   */
  private async createBackup(changes: ProposedChange[]): Promise<Backup> {
    const backup: Backup = {
      id: randomUUID(),
      createdAt: Date.now(),
      files: [],
    };

    // In a real implementation, this would read and store file contents
    for (const change of changes) {
      if (change.type !== 'file_create') {
        backup.files.push({
          path: change.path,
          content: change.before ?? '',
        });
      }
    }

    return backup;
  }

  /**
   * Capture current system metrics
   */
  private async captureMetrics(): Promise<Record<string, number>> {
    // In a real implementation, this would query the metrics service
    return {
      successRate: 0.95,
      avgResponseTime: 150,
      errorRate: 0.05,
      skillsActive: 26,
    };
  }

  /**
   * Calculate health delta between two metric sets
   */
  private calculateHealthDelta(
    before: Record<string, number>,
    after: Record<string, number>
  ): number {
    // Simple health score calculation
    const beforeScore = (before['successRate'] ?? 1) - (before['errorRate'] ?? 0);
    const afterScore = (after['successRate'] ?? 1) - (after['errorRate'] ?? 0);

    return afterScore - beforeScore;
  }

  // ---------------------------------------------------------------------------
  // Query Methods
  // ---------------------------------------------------------------------------

  /**
   * Get a proposal by ID
   */
  getProposal(proposalId: string): ImprovementProposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * List all proposals
   */
  listProposals(status?: ProposalStatus): ImprovementProposal[] {
    const proposals = Array.from(this.proposals.values());
    if (status) {
      return proposals.filter((p) => p.status === status);
    }
    return proposals;
  }

  /**
   * Get metrics
   */
  getMetrics(): SelfImprovementMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit log
   */
  getAuditLog(limit = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get status summary
   */
  getStatus(): {
    metrics: SelfImprovementMetrics;
    dailyStats: DailyStats;
    proposalCounts: Record<ProposalStatus, number>;
  } {
    const proposalCounts: Record<ProposalStatus, number> = {
      draft: 0,
      testing: 0,
      pending_review: 0,
      approved: 0,
      deployed: 0,
      rolled_back: 0,
      rejected: 0,
    };

    for (const proposal of Array.from(this.proposals.values())) {
      proposalCounts[proposal.status]++;
    }

    return {
      metrics: this.metrics,
      dailyStats: { ...this.dailyStats },
      proposalCounts,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Reset daily stats if it's a new day
   */
  private resetDailyStatsIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0]!;
    if (this.dailyStats.date !== today) {
      this.dailyStats = { proposals: 0, deployments: 0, date: today };
    }
  }

  /**
   * Create an audit entry
   */
  private audit(action: string, target?: string, proposalId?: string): string {
    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: Date.now(),
      action,
      target,
      proposalId,
      details: {},
      outcome: 'pending',
    };

    this.auditLog.push(entry);
    return entry.id;
  }

  /**
   * Update an audit entry
   */
  private updateAudit(
    auditId: string,
    outcome: 'success' | 'failure',
    details: Record<string, unknown>
  ): void {
    const entry = this.auditLog.find((e) => e.id === auditId);
    if (entry) {
      entry.outcome = outcome;
      entry.details = { ...entry.details, ...details };
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    console.log('[SelfImprovement] 🚀 Initializing...');
    // Load persisted state if needed
    console.log('[SelfImprovement] ✅ Ready');
  }

  async shutdown(): Promise<void> {
    console.log('[SelfImprovement] 🛑 Shutting down...');
    // Persist state if needed
    console.log('[SelfImprovement] ✅ Shutdown complete');
  }

  isHealthy(): boolean {
    const rollbackRate = this.metrics.deploymentsSuccessful > 0
      ? this.metrics.rollbacksTriggered / (this.metrics.deploymentsSuccessful + this.metrics.rollbacksTriggered)
      : 0;
    
    return rollbackRate <= this.config.maxRollbackRate;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let selfImprovementInstance: SelfImprovementService | null = null;

export function getSelfImprovementService(
  config?: Partial<SelfImprovementConfig>
): SelfImprovementService {
  if (!selfImprovementInstance) {
    selfImprovementInstance = new SelfImprovementService(config);
  }
  return selfImprovementInstance;
}

export default SelfImprovementService;
