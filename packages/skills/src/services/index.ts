/**
 * @file Services Index - Export all skill services
 * @version 1.2.0 - Phase 9: Autonomous Operation
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

// Phase 9: Self-Healing
export {
  SelfHealingService,
  getSelfHealingService,
  resetSelfHealingService,
  type IssueSeverity,
  type ComponentStatus,
  type HealingAction,
  type DetectedIssue,
  type HealingAttempt,
  type HealthCheckResult,
  type HealingRule,
  type IssueCondition,
  type SelfHealingConfig,
  type HealingMetrics,
} from './self-healing.js';

// Phase 9: Skill Synthesizer
export {
  SkillSynthesizer,
  getSkillSynthesizer,
  resetSkillSynthesizer,
  type CapabilityGap,
  type InteractionPattern,
  type SynthesizedSkill,
  type SkillSynthesizerConfig,
  type SynthesisMetrics,
} from './skill-synthesizer.js';

// Phase 9: Autonomous Learning Loop
export {
  AutonomousLearningLoop,
  getAutonomousLearningLoop,
  resetAutonomousLearningLoop,
  type CyclePhase,
  type LearningGoal,
  type KnowledgeItem,
  type LearningCycle,
  type AutonomousLearningConfig,
  type LearningMetrics as AutonomousLearningMetrics,
  type InteractionRecord,
} from './autonomous-learning.js';

// Phase 11: Safe Code Implementation
export {
  SafeImplementationService,
  getSafeImplementationService,
  type RiskLevel as ImplementationRiskLevel,
  type FileAction,
  type FileOperation,
  type ImplementationRequest,
  type PipelineState,
  type VerificationResult,
  type ImplementationResult,
} from './SafeImplementationService.js';
