// @version 3.3.196
/**
 * Agent Execution System - Main Export
 *
 * TooLoo's autonomous execution capability that enables the system
 * to receive structured input, execute code, save artifacts,
 * and manage its own processes.
 *
 * V3.3.17 additions:
 * - Team Framework: Automatic agent pairing (executor + validator)
 * - System Hub: Connects execution to all TooLoo systems
 *
 * V3.3.23 additions:
 * - Collaboration Hub: Inter-agent communication and knowledge sharing
 *
 * V3.3.196 additions:
 * - Smart Execution Orchestrator: Intelligent execution with sprints,
 *   human-friendly progress, and quality>performance>efficiency>cost optimization
 *
 * @module cortex/agent
 */

// Core execution
export { ExecutionAgent, executionAgent } from './execution-agent.js';
export { TaskProcessor, taskProcessor } from './task-processor.js';
export { ArtifactManager, artifactManager } from './artifact-manager.js';

// Team Framework - Automatic agent pairing
export {
  TeamRegistry,
  TeamExecutor,
  teamRegistry,
  teamExecutor,
  initializeTeamFramework,
  type AgentTeam,
  type TeamTask,
  type TeamTaskResult,
  type AgentRole,
  type ValidationResult,
} from './team-framework.js';

// System Execution Hub - Connects to all systems
export {
  SystemExecutionHub,
  systemExecutionHub,
  initializeSystemExecutionHub,
  type SystemSource,
  type ExecutionRequest,
  type ExecutionResponse,
  type SystemExecutionStats,
} from './system-hub.js';

// Collaboration Hub - Inter-agent communication
export {
  CollaborationHub,
  collaborationHub,
  type AgentMessage,
  type SharedKnowledge,
  type CollaborationMetrics,
  type SkillComplementarity,
  type TeamRecommendation,
} from './collaboration-hub.js';

// Smart Execution Orchestrator - Intelligent execution with human-friendly progress
export {
  SmartExecutionOrchestrator,
  smartOrchestrator,
  type SmartExecutionRequest,
  type SmartExecutionResponse,
  type HumanStatusUpdate,
  type ExecutionSprint,
  type OptimizationPriorities,
  type ExecutionPhase,
  type ProgressCallback,
} from './smart-execution-orchestrator.js';

// Automated Execution Pipeline - Streamlined self-correcting execution
export {
  AutomatedExecutionPipeline,
  automatedPipeline,
  type ExecutionInput,
  type ExecutionOutput,
} from './automated-execution-pipeline.js';

// Types
export * from './types.js';
