// @version 2.2.565
// TooLoo.ai Synapsys Module Index
// Re-exports all Synapsys system components

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

// Conductor - Orchestrates all visual systems
export {
  SynapysConductor,
  useSynapsynConductor,
  useRapidSkin,
} from './SynapysConductor';
