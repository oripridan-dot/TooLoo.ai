// @version 3.3.489
// TooLoo.ai Synapsys DNA - Rapid Configuration System
// Single source of truth for orchestrated, sweeping changes across the entire liquid skin
// Change one value → cascades everywhere instantly
// Updated: Added Living Canvas configuration blocks

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// SYNAPSYS PRESETS - Complete personality/mood configurations
// ============================================================================

export const SYNAPSYS_PRESETS = {
  // === MOOD PRESETS === (Optimized for performance)
  zen: {
    name: 'Zen',
    description: 'Calm, minimal, meditative',
    liquid: { intensity: 0.15, blur: 40, orbCount: 1, orbSize: { min: 60, max: 100 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.2, pulseStrength: 0.3, eyeTracking: 0.2 },
    colors: { primary: 180, saturation: 40, energy: 0.15 },
    motion: { speed: 0.3, spring: 0.2, damping: 0.9 },
    effects: { aurora: false, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'calm', budget: 'minimal', particles: 0, depth: false, waveIntensity: 0.2 },
  },

  balanced: {
    name: 'Balanced',
    description: 'Default TooLoo experience',
    liquid: { intensity: 0.3, blur: 30, orbCount: 2, orbSize: { min: 40, max: 80 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.4, pulseStrength: 0.4, eyeTracking: 0.4 },
    colors: { primary: 200, saturation: 60, energy: 0.3 },
    motion: { speed: 0.6, spring: 0.4, damping: 0.7 },
    effects: { aurora: true, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'neutral', budget: 'balanced', particles: 30, depth: true, waveIntensity: 0.5 },
  },

  immersive: {
    name: 'Immersive',
    description: 'Full visual experience',
    liquid: { intensity: 0.5, blur: 40, orbCount: 3, orbSize: { min: 50, max: 100 } },
    texture: { pattern: 'noise', opacity: 0.03, scale: 1 },
    presence: { breathRate: 0.6, pulseStrength: 0.6, eyeTracking: 0.6 },
    colors: { primary: 260, saturation: 70, energy: 0.5 },
    motion: { speed: 0.8, spring: 0.5, damping: 0.6 },
    effects: { aurora: true, orbs: true, mesh: false, particles: false },
    canvas: { emotion: 'curious', budget: 'maximum', particles: 100, depth: true, waveIntensity: 0.8 },
  },

  // === ACTIVITY PRESETS ===
  focus: {
    name: 'Focus',
    description: 'Deep work mode - minimal distractions',
    liquid: { intensity: 0.1, blur: 20, orbCount: 0, orbSize: { min: 0, max: 0 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.2, pulseStrength: 0.2, eyeTracking: 0.1 },
    colors: { primary: 200, saturation: 30, energy: 0.1 },
    motion: { speed: 0.2, spring: 0.2, damping: 0.95 },
    effects: { aurora: false, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'calm', budget: 'minimal', particles: 0, depth: false, waveIntensity: 0.1 },
  },

  creative: {
    name: 'Creative',
    description: 'Inspiring and energetic',
    liquid: { intensity: 0.4, blur: 35, orbCount: 2, orbSize: { min: 40, max: 80 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.5, pulseStrength: 0.5, eyeTracking: 0.5 },
    colors: { primary: 300, saturation: 70, energy: 0.5 },
    motion: { speed: 0.7, spring: 0.5, damping: 0.6 },
    effects: { aurora: true, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'creating', budget: 'balanced', particles: 50, depth: true, waveIntensity: 0.6 },
  },

  thinking: {
    name: 'Thinking',
    description: 'TooLoo is processing something complex',
    liquid: { intensity: 0.35, blur: 30, orbCount: 2, orbSize: { min: 40, max: 60 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.8, pulseStrength: 0.5, eyeTracking: 0.4 },
    colors: { primary: 260, saturation: 60, energy: 0.4 },
    motion: { speed: 1.0, spring: 0.4, damping: 0.7 },
    effects: { aurora: true, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'thinking', budget: 'balanced', particles: 40, depth: true, waveIntensity: 0.7 },
  },

  // === SPECIAL PRESETS ===
  emergence: {
    name: 'Emergence',
    description: 'TooLoo achieved something significant',
    liquid: { intensity: 0.6, blur: 30, orbCount: 4, orbSize: { min: 50, max: 100 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 1.0, pulseStrength: 0.7, eyeTracking: 0.7 },
    colors: { primary: 45, saturation: 80, energy: 0.7 },
    motion: { speed: 1.2, spring: 0.6, damping: 0.5 },
    effects: { aurora: true, orbs: true, mesh: false, particles: false },
    canvas: { emotion: 'excited', budget: 'maximum', particles: 100, depth: true, waveIntensity: 1.0 },
  },

  alert: {
    name: 'Alert',
    description: 'Something requires attention',
    liquid: { intensity: 0.4, blur: 25, orbCount: 2, orbSize: { min: 50, max: 80 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 1.2, pulseStrength: 0.6, eyeTracking: 0.7 },
    colors: { primary: 0, saturation: 70, energy: 0.6 },
    motion: { speed: 1.5, spring: 0.7, damping: 0.4 },
    effects: { aurora: true, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'alert', budget: 'balanced', particles: 60, depth: true, waveIntensity: 0.9 },
  },

  night: {
    name: 'Night',
    description: 'Low-light optimized',
    liquid: { intensity: 0.15, blur: 30, orbCount: 1, orbSize: { min: 60, max: 100 } },
    texture: { pattern: 'none', opacity: 0, scale: 1 },
    presence: { breathRate: 0.2, pulseStrength: 0.2, eyeTracking: 0.3 },
    colors: { primary: 240, saturation: 30, energy: 0.1 },
    motion: { speed: 0.3, spring: 0.2, damping: 0.9 },
    effects: { aurora: false, orbs: false, mesh: false, particles: false },
    canvas: { emotion: 'calm', budget: 'minimal', particles: 10, depth: false, waveIntensity: 0.15 },
  },
};

// ============================================================================
// COMPUTED HELPERS - Derive full config from partial inputs
// ============================================================================

/**
 * Interpolate between two presets
 */
export function interpolatePresets(presetA, presetB, t) {
  const a = SYNAPSYS_PRESETS[presetA] || SYNAPSYS_PRESETS.balanced;
  const b = SYNAPSYS_PRESETS[presetB] || SYNAPSYS_PRESETS.balanced;
  
  const lerp = (x, y, t) => x + (y - x) * t;
  
  return {
    name: t < 0.5 ? a.name : b.name,
    description: t < 0.5 ? a.description : b.description,
    liquid: {
      intensity: lerp(a.liquid.intensity, b.liquid.intensity, t),
      blur: lerp(a.liquid.blur, b.liquid.blur, t),
      orbCount: Math.round(lerp(a.liquid.orbCount, b.liquid.orbCount, t)),
      orbSize: {
        min: lerp(a.liquid.orbSize.min, b.liquid.orbSize.min, t),
        max: lerp(a.liquid.orbSize.max, b.liquid.orbSize.max, t),
      },
    },
    texture: {
      pattern: t < 0.5 ? a.texture.pattern : b.texture.pattern,
      opacity: lerp(a.texture.opacity, b.texture.opacity, t),
      scale: lerp(a.texture.scale, b.texture.scale, t),
    },
    presence: {
      breathRate: lerp(a.presence.breathRate, b.presence.breathRate, t),
      pulseStrength: lerp(a.presence.pulseStrength, b.presence.pulseStrength, t),
      eyeTracking: lerp(a.presence.eyeTracking, b.presence.eyeTracking, t),
    },
    colors: {
      primary: lerp(a.colors.primary, b.colors.primary, t),
      saturation: lerp(a.colors.saturation, b.colors.saturation, t),
      energy: lerp(a.colors.energy, b.colors.energy, t),
    },
    motion: {
      speed: lerp(a.motion.speed, b.motion.speed, t),
      spring: lerp(a.motion.spring, b.motion.spring, t),
      damping: lerp(a.motion.damping, b.motion.damping, t),
    },
    effects: {
      aurora: a.effects.aurora || b.effects.aurora,
      orbs: a.effects.orbs || b.effects.orbs,
      mesh: a.effects.mesh || b.effects.mesh,
      particles: a.effects.particles || b.effects.particles,
    },
  };
}

/**
 * Generate CSS variables from current DNA state
 */
export function generateDNAVariables(dna) {
  return {
    // Liquid
    '--synapsys-liquid-intensity': dna.liquid.intensity,
    '--synapsys-liquid-blur': `${dna.liquid.blur}px`,
    '--synapsys-orb-count': dna.liquid.orbCount,
    '--synapsys-orb-min': `${dna.liquid.orbSize.min}px`,
    '--synapsys-orb-max': `${dna.liquid.orbSize.max}px`,
    
    // Texture
    '--synapsys-texture-opacity': dna.texture.opacity,
    '--synapsys-texture-scale': dna.texture.scale,
    
    // Presence
    '--synapsys-breath-rate': dna.presence.breathRate,
    '--synapsys-pulse-strength': dna.presence.pulseStrength,
    '--synapsys-eye-tracking': dna.presence.eyeTracking,
    
    // Colors
    '--synapsys-hue': dna.colors.primary,
    '--synapsys-saturation': `${dna.colors.saturation}%`,
    '--synapsys-energy': dna.colors.energy,
    '--synapsys-primary': `hsl(${dna.colors.primary}, ${dna.colors.saturation}%, 60%)`,
    '--synapsys-primary-muted': `hsla(${dna.colors.primary}, ${dna.colors.saturation}%, 60%, 0.2)`,
    '--synapsys-primary-glow': `0 0 20px hsla(${dna.colors.primary}, ${dna.colors.saturation}%, 60%, 0.3)`,
    
    // Motion
    '--synapsys-speed': dna.motion.speed,
    '--synapsys-spring': dna.motion.spring,
    '--synapsys-damping': dna.motion.damping,
    '--synapsys-transition': `${200 / dna.motion.speed}ms`,
  };
}

// ============================================================================
// SYNAPSYS DNA STORE - Central reactive state
// ============================================================================

export const useSynapsynDNA = create(
  subscribeWithSelector((set, get) => ({
    // === CURRENT STATE ===
    preset: 'balanced',
    custom: null, // Override preset with custom values
    transitionProgress: 1, // 0-1 during transitions
    transitionFrom: null,
    
    // === COMPUTED DNA (the actual values everything reads) ===
    get dna() {
      const state = get();
      if (state.custom) {
        return state.custom;
      }
      if (state.transitionFrom && state.transitionProgress < 1) {
        return interpolatePresets(state.transitionFrom, state.preset, state.transitionProgress);
      }
      return SYNAPSYS_PRESETS[state.preset] || SYNAPSYS_PRESETS.balanced;
    },
    
    // === ACTIONS ===
    
    /**
     * Apply a preset instantly
     */
    applyPreset: (presetKey) => {
      if (!SYNAPSYS_PRESETS[presetKey]) return;
      set({
        preset: presetKey,
        custom: null,
        transitionProgress: 1,
        transitionFrom: null,
      });
    },
    
    /**
     * Transition smoothly to a preset
     */
    transitionTo: (presetKey, duration = 500) => {
      if (!SYNAPSYS_PRESETS[presetKey]) return;
      
      const currentPreset = get().preset;
      if (currentPreset === presetKey) return;
      
      set({
        transitionFrom: currentPreset,
        preset: presetKey,
        transitionProgress: 0,
        custom: null,
      });
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        set({ transitionProgress: eased });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          set({ transitionFrom: null });
        }
      };
      requestAnimationFrame(animate);
    },
    
    /**
     * Override specific DNA values (partial update)
     */
    override: (partial) => {
      const state = get();
      const currentDNA = state.custom || SYNAPSYS_PRESETS[state.preset] || SYNAPSYS_PRESETS.balanced;
      
      // Deep merge partial into current
      const merged = deepMerge(currentDNA, partial);
      set({ custom: merged });
    },
    
    /**
     * Reset to preset defaults (clear custom overrides)
     */
    reset: () => {
      set({ custom: null, transitionProgress: 1, transitionFrom: null });
    },
    
    /**
     * Rapid bulk update - change multiple aspects at once
     */
    bulkUpdate: (updates) => {
      const state = get();
      const currentDNA = state.custom || SYNAPSYS_PRESETS[state.preset] || SYNAPSYS_PRESETS.balanced;
      
      set({ custom: deepMerge(currentDNA, updates) });
    },
    
    /**
     * Quick intensity dial - scales all visual intensity at once
     */
    setIntensityDial: (value) => {
      // value: 0-1, scales liquid, texture, presence proportionally
      const base = SYNAPSYS_PRESETS[get().preset] || SYNAPSYS_PRESETS.balanced;
      
      get().override({
        liquid: {
          intensity: base.liquid.intensity * value,
          orbCount: Math.max(1, Math.round(base.liquid.orbCount * value)),
        },
        texture: {
          opacity: base.texture.opacity * value,
        },
        presence: {
          pulseStrength: base.presence.pulseStrength * value,
        },
        colors: {
          energy: base.colors.energy * value,
        },
      });
    },
    
    /**
     * Quick color shift - change primary hue while maintaining relationships
     */
    setColorShift: (hue) => {
      get().override({
        colors: { primary: hue },
      });
    },
    
    /**
     * Quick motion scale - speed up/slow down all animations
     */
    setMotionScale: (scale) => {
      const base = SYNAPSYS_PRESETS[get().preset] || SYNAPSYS_PRESETS.balanced;
      get().override({
        motion: {
          speed: base.motion.speed * scale,
        },
        presence: {
          breathRate: base.presence.breathRate * scale,
        },
      });
    },
    
    /**
     * Toggle individual effects
     */
    toggleEffect: (effectName, enabled) => {
      get().override({
        effects: { [effectName]: enabled },
      });
    },
    
    /**
     * Get CSS variables for current state
     */
    getCSSVariables: () => {
      return generateDNAVariables(get().dna);
    },
    
    /**
     * Inject CSS variables into document
     */
    injectCSS: () => {
      const vars = get().getCSSVariables();
      const root = document.documentElement;
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(key, String(value));
      });
    },
  }))
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  }
  
  return output;
}

// ============================================================================
// REACT HOOKS FOR SYNAPSYS DNA
// ============================================================================

/**
 * Hook to get current DNA with auto-subscription to changes
 */
export function useDNA() {
  return useSynapsynDNA((state) => state.dna);
}

/**
 * Hook to get specific DNA section
 */
export function useDNASection(section) {
  return useSynapsynDNA((state) => state.dna?.[section]);
}

/**
 * Get actions directly from store (stable reference - doesn't cause re-renders)
 */
export function getDNAActions() {
  return useSynapsynDNA.getState();
}

/**
 * Hook for DNA actions - STABLE version that returns functions directly
 * These are stable because Zustand actions are the same function reference
 */
export function useDNAActions() {
  const applyPreset = useSynapsynDNA((state) => state.applyPreset);
  const transitionTo = useSynapsynDNA((state) => state.transitionTo);
  const override = useSynapsynDNA((state) => state.override);
  const reset = useSynapsynDNA((state) => state.reset);
  const bulkUpdate = useSynapsynDNA((state) => state.bulkUpdate);
  const setIntensityDial = useSynapsynDNA((state) => state.setIntensityDial);
  const setColorShift = useSynapsynDNA((state) => state.setColorShift);
  const setMotionScale = useSynapsynDNA((state) => state.setMotionScale);
  const toggleEffect = useSynapsynDNA((state) => state.toggleEffect);
  const injectCSS = useSynapsynDNA((state) => state.injectCSS);
  
  return { applyPreset, transitionTo, override, reset, bulkUpdate, setIntensityDial, setColorShift, setMotionScale, toggleEffect, injectCSS };
}

/**
 * Hook for preset info - individual subscriptions for stability
 */
export function usePresetInfo() {
  const currentPreset = useSynapsynDNA((state) => state.preset);
  const transitionProgress = useSynapsynDNA((state) => state.transitionProgress);
  const hasCustomOverrides = useSynapsynDNA((state) => state.custom !== null);
  
  return {
    currentPreset,
    isTransitioning: transitionProgress < 1,
    transitionProgress,
    hasCustomOverrides,
    availablePresets: Object.keys(SYNAPSYS_PRESETS),
  };
}

// ============================================================================
// SAFE PRIMITIVE HOOKS - Use these for reactive values without infinite loops
// These select PRIMITIVE values only, so they don't trigger unnecessary re-renders
// ============================================================================

/**
 * Get primary color hue (number) - safe for reactive use
 */
export function usePrimaryHue() {
  return useSynapsynDNA((state) => state.dna?.colors?.primary ?? 200);
}

/**
 * Get saturation (number) - safe for reactive use
 */
export function useSaturation() {
  return useSynapsynDNA((state) => state.dna?.colors?.saturation ?? 60);
}

/**
 * Get energy level (number) - safe for reactive use
 */
export function useEnergy() {
  return useSynapsynDNA((state) => state.dna?.colors?.energy ?? 0.3);
}

/**
 * Get liquid intensity (number) - safe for reactive use
 */
export function useLiquidIntensity() {
  return useSynapsynDNA((state) => state.dna?.liquid?.intensity ?? 0.3);
}

/**
 * Get blur amount (number) - safe for reactive use
 */
export function useBlurAmount() {
  return useSynapsynDNA((state) => state.dna?.liquid?.blur ?? 30);
}

/**
 * Get breath rate (number) - safe for reactive use
 */
export function useBreathRate() {
  return useSynapsynDNA((state) => state.dna?.presence?.breathRate ?? 0.4);
}

/**
 * Get motion speed (number) - safe for reactive use
 */
export function useMotionSpeed() {
  return useSynapsynDNA((state) => state.dna?.motion?.speed ?? 0.6);
}

/**
 * Get specific effect enabled state (boolean) - safe for reactive use
 */
export function useEffectEnabled(effectName) {
  return useSynapsynDNA((state) => state.dna?.effects?.[effectName] ?? false);
}

/**
 * Get current preset name (string) - safe for reactive use
 */
export function useCurrentPreset() {
  return useSynapsynDNA((state) => state.preset ?? 'balanced');
}

/**
 * Get orb count (number) - safe for reactive use
 */
export function useOrbCount() {
  return useSynapsynDNA((state) => state.dna?.liquid?.orbCount ?? 2);
}

export default useSynapsynDNA;
