// @version 3.3.453
// TooLoo.ai Skin - Main Entry Point
// Liquid Synapsys V1 - The viewport IS TooLoo
// Exports all skin infrastructure including liquid effects, textures, presence, Synapsys DNA, shell, views, and app

// === MAIN APP - Complete TooLoo Application ===
export { TooLooApp } from './app';

// === SYNAPSYS DNA - Rapid Configuration System ===
// Single source of truth for orchestrated changes across all visual systems
export {
  // DNA Store
  useSynapsynDNA,
  useDNA,
  useDNASection,
  useDNAActions,
  usePresetInfo,
  SYNAPSYS_PRESETS,
  interpolatePresets,
  generateDNAVariables,
  // Conductor
  SynapysConductor,
  useSynapsynConductor,
  useRapidSkin,
} from './synapsys';

// === LIQUID SHELL - Full viewport wrapper ===
export { LiquidShell, ViewportEdge, LiquidPanel, LiquidTransition } from './shell';

// === VIEWS - The 6 main TooLoo views ===
export { Cortex, Synaptic, Growth, Studio, Command, Workstation, VIEWS, VIEW_COMPONENTS } from './views';

// === CHAT COMPONENTS - Rich visual chat with liquid skin ===
export {
  TooLooAvatar,
  LiquidMessageBubble,
  LiquidThinkingIndicator,
  WelcomeMessage,
  EnhancedMarkdown,
  LiquidCodeBlock,
  ProviderBadge,
  StreamingIndicator,
} from './chat';

// Layout Engine (legacy - use LiquidShell for new apps)
export { SkinShell, SkinLayoutContext, useSkinLayout, LAYOUT_PRESETS } from './SkinShell';

// State Management
export { useSkinStore } from './store';

// Design Tokens
export { default as tokens, generateCSSVariables } from './tokens';

// Primitives - re-export all
export * from './primitives';

// TooLoo Presence System - Makes TooLoo feel like SOMEONE
export {
  TooLooPresenceProvider,
  useTooLooPresence,
  TooLooEye,
  TooLooBreath,
  TooLooStatus,
  PRESENCE_STATES,
  MICRO_EXPRESSIONS,
  PERSONALITY,
} from './TooLooPresence';

// Liquid Effects - The "Truly Liquid Skin"
export {
  LiquidEngineProvider,
  useLiquidEngine,
  PointerAurora,
  LiquidGlass,
  EmotionalOrbs,
  BreathIndicator,
  LiquidSurface,
  FPSMonitor,
  EMOTIONS,
  NeuralMesh,
  SynapsePulse,
  DataFlow,
  ActivityRings,
} from './effects';

// Texture Engine - Dynamic reactive textures
export {
  TextureEngineProvider,
  useTextureEngine,
  TextureLayer,
  TextureOverlay,
  ReactiveTextureSurface,
  TexturePresets,
  TEXTURES,
} from './effects';

// Emotion Hooks - Bridge app state to liquid visuals
export { useSkinEmotion, useProcessingEmotion, useChatEmotion } from './hooks';

// Generative UI
export {
  ComponentPreview,
  ComponentGenerator,
  DesignInstruction,
  COMPONENT_GENERATION_PROMPT,
  generateComponentCode,
} from './GenerativeUI';

// V3.3.441: Projection Interface - Backend-first UI architecture
export {
  // Store - Single source of truth for backend state
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
  // Components - Projection Interface building blocks
  ControlDeck,
  KnowledgeRail,
  SegmentationSidebar,
  ModeLayout,
} from './projection';

// Registry (JSON import requires bundler support)
// import registry from './registry.json';
// export { registry };
