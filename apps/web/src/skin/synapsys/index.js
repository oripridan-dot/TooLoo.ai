// @version 3.3.588
// TooLoo.ai Synapsys Module Index
// Re-exports all Synapsys system components
// Phase 3 of "Sentient Partner" Protocol
// V3.3.588: Added CognitiveBridge for backend-to-DNA wiring

// Core DNA System - Single source of truth
export {
  useSynapsynDNA,
  useDNA,
  useDNASection,
  useDNAActions,
  usePresetInfo,
  SYNAPSYS_PRESETS,
  interpolatePresets,
  generateDNAVariables,
  // Safe primitive hooks for reactive use without infinite loops
  usePrimaryHue,
  useSaturation,
  useEnergy,
  useLiquidIntensity,
  useBlurAmount,
  useBreathRate,
  useMotionSpeed,
  useEffectEnabled,
  useCurrentPreset,
  useOrbCount,
} from './SynapysDNA';

// Cognitive Bridge - Connects backend events to DNA state
export { CognitiveBridge } from './CognitiveBridge';

// Conductor - Orchestrates all visual systems
export {
  SynapysConductor,
  useSynapsynConductor,
  useRapidSkin,
  // Phase 3: Focus Director - Sophisticated attention orchestration
  FocusDirector,
  useFocusDirector,
  // Phase 4: Initiative State - Process awareness
  InitiativeProvider,
  useInitiativeState,
  INITIATIVE_MODES,
} from './SynapysConductor';
