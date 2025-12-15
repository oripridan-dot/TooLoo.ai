/**
 * @file Services Index - Export all skill services
 * @version 1.1.0
 * @skill-os true
 */

// Orchestrator
export {
  SkillOrchestrator,
  getSkillOrchestrator,
  type CompositionType,
  type WorkflowStep,
  type WorkflowDefinition,
  type WorkflowContext,
  type StepResult,
  type WorkflowResult,
  type WorkflowError,
  type OrchestratorConfig,
  type OrchestratorMetrics,
  type SkillExecutor as OrchestratorSkillExecutor,
} from './orchestrator.js';

// Scheduler
export {
  SkillScheduler,
  getSkillScheduler,
  type TriggerType,
  type ScheduledTask,
  type TriggerConfig,
  type TaskExecution,
  type SchedulerConfig,
  type SchedulerMetrics,
  type SkillExecutor as SchedulerSkillExecutor,
} from './scheduler.js';

// Self-Improvement
export {
  SelfImprovementService,
  getSelfImprovementService,
  type RiskLevel,
  type ProposalStatus,
  type ImprovementProposal,
  type Evidence,
  type ProposedChange,
  type TestResults as ImprovementTestResults,  // Renamed to avoid conflict with engines
  type Backup,
  type AnalysisResult,
  type SkillAnalysis,
  type Opportunity,
  type SelfImprovementConfig,
  type SelfImprovementMetrics,
  type AuditEntry,
  type DailyStats,
} from './self-improvement.js';
