// @version 3.3.142
// TooLoo.ai Synapsys Conductor - Orchestrates rapid changes across all systems
// Bridges SynapysDNA with LiquidEngine, TextureEngine, and TooLooPresence

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSynapsynDNA, SYNAPSYS_PRESETS } from './SynapysDNA';

// ============================================================================
// SYNAPSYS CONDUCTOR CONTEXT
// ============================================================================

const SynapysConductorContext = createContext(null);

// Get actions directly from store (stable reference)
const getActions = () => useSynapsynDNA.getState();

/**
 * SynapysConductor - The maestro that orchestrates all visual systems
 * 
 * Responsibilities:
 * 1. Sync DNA changes to LiquidEngine emotions
 * 2. Sync DNA changes to TextureEngine patterns
 * 3. Sync DNA changes to TooLooPresence states
 * 4. Handle timed sequences (emergence events, alerts)
 * 5. Provide rapid-change API to components
 */
export function SynapysConductor({ children, liquidEngine, textureEngine, presenceSystem }) {
  const sequenceRef = useRef(null);
  const lastSyncRef = useRef(null);
  const initializedRef = useRef(false);

  // Subscribe to DNA changes without causing re-renders
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Initial CSS injection
    getActions().injectCSS();
    
    // Subscribe to store changes
    const unsubscribe = useSynapsynDNA.subscribe(
      (state) => state.dna,
      (dna, prevDna) => {
        // Skip if same object reference (no actual change)
        if (dna === prevDna) return;
        
        // Create a simple hash to detect meaningful changes
        const hash = `${dna?.colors?.primary}-${dna?.liquid?.intensity}-${dna?.texture?.pattern}`;
        if (hash === lastSyncRef.current) return;
        lastSyncRef.current = hash;

        // Inject updated CSS variables
        getActions().injectCSS();

        // Sync to LiquidEngine if provided
        if (liquidEngine?.transitionEmotion) {
          const emotionFromHue = mapHueToEmotion(dna.colors.primary);
          liquidEngine.transitionEmotion(emotionFromHue, 300);
          
          if (liquidEngine.setEmotionIntensity) {
            liquidEngine.setEmotionIntensity(dna.colors.energy);
          }
        }

        // Sync to TextureEngine if provided
        if (textureEngine?.setPattern) {
          textureEngine.setPattern(dna.texture.pattern);
          textureEngine.setOpacity?.(dna.texture.opacity);
          textureEngine.setScale?.(dna.texture.scale);
        }

        // Sync to Presence system if provided
        if (presenceSystem?.setBreathRate) {
          presenceSystem.setBreathRate(dna.presence.breathRate);
          presenceSystem.setPulseStrength?.(dna.presence.pulseStrength);
          presenceSystem.setEyeTracking?.(dna.presence.eyeTracking);
        }
      },
      { fireImmediately: true }
    );

    return () => {
      initializedRef.current = false;
      unsubscribe();
    };
  }, [liquidEngine, textureEngine, presenceSystem]);

  // === ORCHESTRATED SEQUENCES ===

  /**
   * Play an emergence sequence - dramatic visual event
   */
  const playEmergence = useCallback((duration = 3000) => {
    if (sequenceRef.current) {
      cancelAnimationFrame(sequenceRef.current);
    }

    const state = getActions();
    const originalPreset = state.preset;
    
    // Phase 1: Build up (0-30%)
    state.transitionTo('emergence', duration * 0.3);
    
    // Phase 2: Peak (30-70%) - hold
    setTimeout(() => {
      // Optionally trigger additional effects here
    }, duration * 0.3);
    
    // Phase 3: Resolve (70-100%)
    setTimeout(() => {
      getActions().transitionTo(originalPreset, duration * 0.3);
    }, duration * 0.7);
  }, []);

  /**
   * Play an alert sequence
   */
  const playAlert = useCallback((duration = 2000) => {
    const state = getActions();
    const originalPreset = state.preset;
    
    state.transitionTo('alert', 200);
    
    setTimeout(() => {
      getActions().transitionTo(originalPreset, duration - 200);
    }, duration * 0.6);
  }, []);

  /**
   * Play a thinking sequence
   */
  const playThinking = useCallback((autoRevert = true, duration = null) => {
    const state = getActions();
    const originalPreset = state.preset;
    
    state.transitionTo('thinking', 300);
    
    if (autoRevert && duration) {
      setTimeout(() => {
        getActions().transitionTo(originalPreset, 500);
      }, duration);
    }
    
    // Return stop function
    return () => {
      getActions().transitionTo(originalPreset, 500);
    };
  }, []);

  /**
   * Pulse - quick intensity spike
   */
  const pulse = useCallback((intensity = 1.2, duration = 300) => {
    const state = getActions();
    const originalDNA = state.dna;
    
    state.override({
      liquid: { intensity: originalDNA.liquid.intensity * intensity },
      colors: { energy: Math.min(1, originalDNA.colors.energy * intensity) },
      presence: { pulseStrength: Math.min(1, originalDNA.presence.pulseStrength * intensity) },
    });
    
    setTimeout(() => {
      getActions().reset();
    }, duration);
  }, []);

  /**
   * Color wave - sweep through hues
   */
  const colorWave = useCallback((duration = 2000) => {
    const startTime = Date.now();
    const startHue = getActions().dna.colors.primary;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        getActions().setColorShift(startHue);
        return;
      }
      
      const hue = (startHue + progress * 360) % 360;
      getActions().setColorShift(hue);
      
      sequenceRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (sequenceRef.current) {
        cancelAnimationFrame(sequenceRef.current);
        getActions().setColorShift(startHue);
      }
    };
  }, []);

  // === RAPID CHANGE API === (Stable - no dependencies that change)

  const rapidAPI = useMemo(() => {
    return {
      // Presets - access via getState to ensure stability
      applyPreset: (p) => getActions().applyPreset(p),
      transitionTo: (p, d) => getActions().transitionTo(p, d),
      presets: SYNAPSYS_PRESETS,
      
      // Quick dials
      setIntensity: (v) => getActions().setIntensityDial(v),
      setColor: (v) => getActions().setColorShift(v),
      setSpeed: (v) => getActions().setMotionScale(v),
      
      // Granular control
      override: (o) => getActions().override(o),
      bulkUpdate: (u) => getActions().bulkUpdate(u),
      reset: () => getActions().reset(),
      
      // Effect toggles
      toggleAurora: (on) => getActions().toggleEffect('aurora', on),
      toggleOrbs: (on) => getActions().toggleEffect('orbs', on),
      toggleMesh: (on) => getActions().toggleEffect('mesh', on),
      toggleParticles: (on) => getActions().toggleEffect('particles', on),
      
      // Sequences - now fully activated
      playEmergence,
      playAlert,
      playThinking,
      pulse,
      colorWave,
      
      // Current state
      getCurrentDNA: () => useSynapsynDNA.getState().dna,
      getCurrentPreset: () => useSynapsynDNA.getState().preset,
      isTransitioning: () => useSynapsynDNA.getState().transitionProgress < 1,
    };
  }, []); // Empty deps - all functions use getActions() internally

  return (
    <SynapysConductorContext.Provider value={rapidAPI}>
      {children}
    </SynapysConductorContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access the Synapsys Conductor API
 */
export function useSynapsynConductor() {
  const context = useContext(SynapysConductorContext);
  if (!context) {
    console.warn('[SynapysConductor] Not in conductor context, returning no-op API');
    return {
      applyPreset: () => {},
      transitionTo: () => {},
      presets: SYNAPSYS_PRESETS,
      setIntensity: () => {},
      setColor: () => {},
      setSpeed: () => {},
      override: () => {},
      bulkUpdate: () => {},
      reset: () => {},
      toggleAurora: () => {},
      toggleOrbs: () => {},
      toggleMesh: () => {},
      toggleParticles: () => {},
      playEmergence: () => {},
      playAlert: () => {},
      playThinking: () => () => {},
      pulse: () => {},
      colorWave: () => () => {},
      getCurrentDNA: () => SYNAPSYS_PRESETS.balanced,
      getCurrentPreset: () => 'balanced',
      isTransitioning: () => false,
    };
  }
  return context;
}

/**
 * Shorthand hook for common rapid actions - uses getState for stability
 */
export function useRapidSkin() {
  // Return stable function references that access conductor via getState
  return {
    // One-liner mood shifts
    goZen: () => useSynapsynDNA.getState().transitionTo('zen'),
    goFocus: () => useSynapsynDNA.getState().transitionTo('focus'),
    goCreative: () => useSynapsynDNA.getState().transitionTo('creative'),
    goImmersive: () => useSynapsynDNA.getState().transitionTo('immersive'),
    goBalanced: () => useSynapsynDNA.getState().transitionTo('balanced'),
    
    // Quick effects - now fully activated
    emerge: () => {
      const state = useSynapsynDNA.getState();
      const originalPreset = state.preset;
      state.transitionTo('creative', 500);
      setTimeout(() => useSynapsynDNA.getState().transitionTo(originalPreset, 500), 2000);
    },
    alert: () => {
      const state = useSynapsynDNA.getState();
      const originalPreset = state.preset;
      state.transitionTo('focus', 200);
      setTimeout(() => useSynapsynDNA.getState().transitionTo(originalPreset, 800), 1000);
    },
    think: () => {
      const state = useSynapsynDNA.getState();
      state.transitionTo('zen', 300);
      return () => useSynapsynDNA.getState().transitionTo('balanced', 500);
    },
    pulse: () => {
      const state = useSynapsynDNA.getState();
      const dna = state.dna;
      state.override({
        liquid: { intensity: Math.min(1, dna.liquid.intensity * 1.3) },
        colors: { energy: Math.min(1, dna.colors.energy * 1.3) },
      });
      setTimeout(() => useSynapsynDNA.getState().reset(), 300);
    },
    
    // Dials (0-1)
    intensity: (v) => useSynapsynDNA.getState().setIntensityDial(v),
    color: (v) => useSynapsynDNA.getState().setColorShift(v),
    speed: (v) => useSynapsynDNA.getState().setMotionScale(v),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map a hue value to an emotion name
 */
function mapHueToEmotion(hue) {
  // Normalize hue to 0-360
  hue = ((hue % 360) + 360) % 360;
  
  if (hue >= 0 && hue < 30) return 'alert';      // Red
  if (hue >= 30 && hue < 60) return 'excited';   // Orange/Yellow
  if (hue >= 60 && hue < 150) return 'success';  // Green
  if (hue >= 150 && hue < 200) return 'calm';    // Cyan
  if (hue >= 200 && hue < 260) return 'thinking'; // Blue
  if (hue >= 260 && hue < 320) return 'creative'; // Purple/Magenta
  if (hue >= 320) return 'alert';                // Back to red
  
  return 'neutral';
}

export default SynapysConductor;
