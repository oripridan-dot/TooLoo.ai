// @version 3.3.446
// TooLoo.ai Projection Interface - Component Index
// ═══════════════════════════════════════════════════════════════════════════
// Export all Projection Interface components for easy integration
// ═══════════════════════════════════════════════════════════════════════════

// Store
export { 
  useSystemState, 
  useOrchestrator, 
  useSkills, 
  useKnowledge, 
  useEvaluation, 
  useModality, 
  useUIMode, 
  useConnection,
  selectIsProcessing,
  selectConfidence,
  selectActiveProvider,
  selectRetrievedContext,
  selectSegments,
} from './store/systemStateStore.js';

// Components
export { ControlDeck } from './components/ControlDeck.jsx';
export { KnowledgeRail } from './components/KnowledgeRail.jsx';
export { SegmentationSidebar } from './components/SegmentationSidebar.jsx';
export { ModeLayout } from './components/ModeLayout.jsx';
