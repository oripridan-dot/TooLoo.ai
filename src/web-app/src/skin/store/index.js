// @version 3.3.603
/**
 * Skin Store Index
 * 
 * Exports all Zustand stores for the Living Canvas system.
 * 
 * @module skin/store
 */

// Canvas emotional/visual state
export { 
  useCanvasStore,
  CANVAS_EMOTIONS,
  PERFORMANCE_BUDGETS,
} from './canvasStateStore';

// Project-centric state (4-layer architecture)
export {
  default as useProjectStore,
  selectProjectId,
  selectMetadata,
  selectConversation,
  selectActiveIntent,
  selectCommandPalette,
  selectTaskGraph,
  selectCurrentExecution,
  selectArtifacts,
  selectActiveArtifact,
  selectSystemMetrics,
  selectQAStatus,
  selectAlerts,
  selectSyncState,
} from './projectStateStore.js';

// System-wide state
export { 
  default as useSystemStore, 
  selectIsProcessing,
  selectConfidence,
  selectActiveProvider,
  selectEvaluation,
  selectRetrievedContext,
  selectSegments
} from './systemStateStore';
