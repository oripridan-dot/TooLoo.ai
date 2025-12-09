// @version 3.3.425
// TooLoo.ai Synapsys Conductor - Orchestrates rapid changes across all systems
// Bridges SynapysDNA with LiquidEngine, TextureEngine, and TooLooPresence
// Phase 3 of "Sentient Partner" Protocol - The Focus Director
// V3.3.425: Added Bio-Feedback Loop - responds to MetaLearner cognitive state changes

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useSynapsynDNA, SYNAPSYS_PRESETS } from './SynapysDNA';
import { io } from 'socket.io-client';

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

  // ==========================================================================
  // BIO-FEEDBACK LOOP - V3.3.425
  // Responds to MetaLearner cognitive state changes with visual feedback
  // ==========================================================================

  useEffect(() => {
    // Connect to Socket.IO for real-time cognitive state updates
    const socket = io('/', { 
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    // Listen for cognitive state changes from MetaLearner
    const handleCognitiveStateChange = (data) => {
      const { velocity, cognitiveLoad, trigger } = data;

      console.log('[SynapysConductor] Cognitive state change:', { velocity: velocity?.trend, cognitiveLoad, trigger });

      // Hyperfocus Mode: High velocity (accelerating) = Golden Ripples
      if (velocity?.trend === 'accelerating') {
        console.log('[SynapysConductor] Triggering Hyperfocus Mode (accelerating velocity)');
        playEmergence(2000); // Golden ripples effect
        
        // Brief pulse to signal positive flow state
        getActions().override({
          colors: { energy: 0.9 },
          liquid: { intensity: 0.8 },
        });
        setTimeout(() => getActions().reset(), 1500);
      }

      // Focus Mode: High cognitive load (>0.8) = Dim/Minimal
      if (cognitiveLoad > 0.8) {
        console.log('[SynapysConductor] Triggering Focus Mode (high cognitive load)');
        getActions().transitionTo('focus', 800);
        
        // Dim background, reduce visual noise
        window.dispatchEvent(new CustomEvent('tooloo:mood', { detail: { mood: 'focused' } }));
      }

      // Creative Mode: Low cognitive load (<0.2) = Vibrant
      if (cognitiveLoad < 0.2) {
        console.log('[SynapysConductor] Triggering Creative Mode (low cognitive load)');
        getActions().transitionTo('creative', 1000);
        
        // Brighten UI, enable creative elements
        window.dispatchEvent(new CustomEvent('tooloo:mood', { detail: { mood: 'creative' } }));
      }

      // Support Mode: Stalled or decelerating velocity
      if (velocity?.trend === 'stalled' || velocity?.trend === 'decelerating') {
        console.log('[SynapysConductor] Triggering Support Mode (velocity stalled/decelerating)');
        
        // Brighten UI, offer suggestions
        getActions().transitionTo('balanced', 600);
        
        // Trigger suggestion pulse
        window.dispatchEvent(new CustomEvent('suggestion:ready', {
          detail: { 
            type: 'support', 
            message: 'Tooloo noticed you might be stuck. Need help?',
            priority: 'medium'
          }
        }));
      }
    };

    socket.on('meta:cognitive_state_change', handleCognitiveStateChange);

    // Also listen via synapsys:event for fallback
    socket.on('synapsys:event', (event) => {
      if (event.type === 'meta:cognitive_state_change') {
        handleCognitiveStateChange(event.payload);
      }
    });

    return () => {
      socket.off('meta:cognitive_state_change', handleCognitiveStateChange);
      socket.disconnect();
    };
  }, []);

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
    <SynapysConductorContext.Provider value={rapidAPI}>{children}</SynapysConductorContext.Provider>
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

  if (hue >= 0 && hue < 30) return 'alert'; // Red
  if (hue >= 30 && hue < 60) return 'excited'; // Orange/Yellow
  if (hue >= 60 && hue < 150) return 'success'; // Green
  if (hue >= 150 && hue < 200) return 'calm'; // Cyan
  if (hue >= 200 && hue < 260) return 'thinking'; // Blue
  if (hue >= 260 && hue < 320) return 'creative'; // Purple/Magenta
  if (hue >= 320) return 'alert'; // Back to red

  return 'neutral';
}

// ============================================================================
// FOCUS DIRECTOR - Sophisticated attention orchestration (Phase 3)
// ============================================================================

const FocusDirectorContext = createContext(null);

/**
 * FocusDirector - Guides attention without annoying popups
 * Uses visual language: Spotlight, Peripheral Pulse, Zoom Transitions
 */
export function FocusDirector({ children }) {
  const [spotlight, setSpotlight] = useState(null);
  const [peripheralPulse, setPeripheralPulse] = useState(null);
  const [zoomTarget, setZoomTarget] = useState(null);
  const [attentionMode, setAttentionMode] = useState('normal'); // normal, focused, alert
  const spotlightTimeoutRef = useRef(null);
  const pulseTimeoutRef = useRef(null);

  // Listen for system events that require attention direction
  useEffect(() => {
    // Listen for errors that need spotlight
    const handleError = (event) => {
      const { file, line, message, x, y } = event?.detail || {};
      
      // Clear any existing spotlight
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current);
      }

      // Activate spotlight on error location
      setSpotlight({
        type: 'error',
        file,
        line,
        message,
        x: x || 50,
        y: y || 50,
        radius: 150,
      });

      // Darken surroundings
      setAttentionMode('focused');

      // Auto-dismiss after 5 seconds
      spotlightTimeoutRef.current = setTimeout(() => {
        setSpotlight(null);
        setAttentionMode('normal');
      }, 5000);

      // Change mood to alert
      window.dispatchEvent(new CustomEvent('tooloo:mood', { detail: { mood: 'alert' } }));
    };

    // Listen for suggestions that need peripheral pulse
    const handleSuggestion = (event) => {
      const { type, message, priority } = event?.detail || {};

      // Clear any existing pulse
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }

      // Activate peripheral pulse (Gold for suggestions)
      setPeripheralPulse({
        type: type || 'suggestion',
        message: message || 'Tooloo has a suggestion',
        priority: priority || 'medium',
        position: 'bottom-right',
        color: priority === 'high' ? 'amber' : 'gold',
      });

      // Dispatch to Deep Canvas
      window.dispatchEvent(new CustomEvent('tooloo:suggestion'));

      // Auto-dismiss after 8 seconds
      pulseTimeoutRef.current = setTimeout(() => {
        setPeripheralPulse(null);
      }, 8000);
    };

    // Listen for view mode changes for zoom transitions
    const handleViewChange = (event) => {
      const { from, to, targetNode } = event?.detail || {};

      // Animate zoom transition
      if (from === 'planning' && to === 'coding') {
        // Zoom INTO the specific node
        setZoomTarget({
          type: 'zoom-in',
          node: targetNode,
          duration: 800,
        });
      } else if (from === 'coding' && to === 'planning') {
        // Zoom OUT to see full picture
        setZoomTarget({
          type: 'zoom-out',
          duration: 600,
        });
      }

      // Clear zoom target after animation
      setTimeout(() => setZoomTarget(null), 1000);
    };

    // Listen for focus requests
    const handleFocusRequest = (event) => {
      const { target, type, duration } = event?.detail || {};

      if (type === 'spotlight') {
        setSpotlight({
          type: 'highlight',
          x: target?.x || 50,
          y: target?.y || 50,
          radius: target?.radius || 100,
        });

        if (duration) {
          setTimeout(() => setSpotlight(null), duration);
        }
      }
    };

    window.addEventListener('tooloo:error', handleError);
    window.addEventListener('suggestion:ready', handleSuggestion);
    window.addEventListener('tooloo:viewchange', handleViewChange);
    window.addEventListener('tooloo:focusrequest', handleFocusRequest);

    return () => {
      window.removeEventListener('tooloo:error', handleError);
      window.removeEventListener('suggestion:ready', handleSuggestion);
      window.removeEventListener('tooloo:viewchange', handleViewChange);
      window.removeEventListener('tooloo:focusrequest', handleFocusRequest);

      if (spotlightTimeoutRef.current) clearTimeout(spotlightTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  // Clear spotlight
  const clearSpotlight = useCallback(() => {
    setSpotlight(null);
    setAttentionMode('normal');
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current);
    }
  }, []);

  // Clear peripheral pulse
  const clearPulse = useCallback(() => {
    setPeripheralPulse(null);
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
  }, []);

  // Trigger spotlight manually
  const triggerSpotlight = useCallback((options) => {
    setSpotlight(options);
    setAttentionMode(options.mode || 'focused');

    if (options.duration) {
      spotlightTimeoutRef.current = setTimeout(() => {
        setSpotlight(null);
        setAttentionMode('normal');
      }, options.duration);
    }
  }, []);

  // Trigger peripheral pulse manually
  const triggerPulse = useCallback((options) => {
    setPeripheralPulse(options);

    if (options.duration) {
      pulseTimeoutRef.current = setTimeout(() => {
        setPeripheralPulse(null);
      }, options.duration);
    }
  }, []);

  const contextValue = useMemo(() => ({
    spotlight,
    peripheralPulse,
    zoomTarget,
    attentionMode,
    clearSpotlight,
    clearPulse,
    triggerSpotlight,
    triggerPulse,
    setAttentionMode,
  }), [spotlight, peripheralPulse, zoomTarget, attentionMode, clearSpotlight, clearPulse, triggerSpotlight, triggerPulse]);

  return (
    <FocusDirectorContext.Provider value={contextValue}>
      {children}
    </FocusDirectorContext.Provider>
  );
}

/**
 * Hook to access Focus Director
 */
export function useFocusDirector() {
  const context = useContext(FocusDirectorContext);
  if (!context) {
    return {
      spotlight: null,
      peripheralPulse: null,
      zoomTarget: null,
      attentionMode: 'normal',
      clearSpotlight: () => {},
      clearPulse: () => {},
      triggerSpotlight: () => {},
      triggerPulse: () => {},
      setAttentionMode: () => {},
    };
  }
  return context;
}

// ============================================================================
// INITIATIVE STATE - Process awareness for reversed workflow
// ============================================================================

const InitiativeStateContext = createContext(null);

/**
 * Initiative States for "Reversed" Workflow (Phase 4)
 * - Director Mode: User leads, Tooloo fixes errors silently
 * - Partner Mode: User paused, Tooloo offers suggestions
 * - Agent Mode: Tooloo leads, user observes
 */
export const INITIATIVE_MODES = {
  DIRECTOR: 'director', // User typing/designing - Tooloo stays silent
  PARTNER: 'partner',   // User paused >10s - Tooloo offers suggestions
  AGENT: 'agent',       // User handed over control - Tooloo executes
};

export function InitiativeProvider({ children }) {
  const [mode, setMode] = useState(INITIATIVE_MODES.DIRECTOR);
  const [lastUserAction, setLastUserAction] = useState(Date.now());
  const [autoSuggestionEnabled, setAutoSuggestionEnabled] = useState(true);
  const idleTimerRef = useRef(null);
  const IDLE_THRESHOLD = 10000; // 10 seconds

  // Track user activity
  useEffect(() => {
    const handleUserActivity = () => {
      setLastUserAction(Date.now());
      
      // If in Partner or Agent mode and user starts acting, switch to Director
      if (mode !== INITIATIVE_MODES.DIRECTOR) {
        setMode(INITIATIVE_MODES.DIRECTOR);
        
        // Notify UI of mode change
        window.dispatchEvent(new CustomEvent('tooloo:initiative', {
          detail: { mode: INITIATIVE_MODES.DIRECTOR, reason: 'user_activity' }
        }));
      }

      // Reset idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // Set new idle timer for Partner mode
      if (autoSuggestionEnabled) {
        idleTimerRef.current = setTimeout(() => {
          if (mode === INITIATIVE_MODES.DIRECTOR) {
            setMode(INITIATIVE_MODES.PARTNER);
            
            // Notify UI of mode change
            window.dispatchEvent(new CustomEvent('tooloo:initiative', {
              detail: { mode: INITIATIVE_MODES.PARTNER, reason: 'user_idle' }
            }));

            // Trigger peripheral pulse to offer suggestions
            window.dispatchEvent(new CustomEvent('suggestion:ready', {
              detail: { type: 'idle', message: 'Tooloo has some suggestions...', priority: 'low' }
            }));
          }
        }, IDLE_THRESHOLD);
      }
    };

    // Track keyboard and mouse activity
    const events = ['keydown', 'mousedown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Initial activity check
    handleUserActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [mode, autoSuggestionEnabled]);

  // Listen for explicit mode changes
  useEffect(() => {
    const handleModeRequest = (event) => {
      const { mode: requestedMode, reason } = event?.detail || {};
      
      if (Object.values(INITIATIVE_MODES).includes(requestedMode)) {
        setMode(requestedMode);
        
        // Update mood based on mode
        const moodMap = {
          [INITIATIVE_MODES.DIRECTOR]: 'focused',
          [INITIATIVE_MODES.PARTNER]: 'calm',
          [INITIATIVE_MODES.AGENT]: 'thinking',
        };
        
        window.dispatchEvent(new CustomEvent('tooloo:mood', {
          detail: { mood: moodMap[requestedMode] }
        }));
      }
    };

    window.addEventListener('tooloo:setinitiative', handleModeRequest);
    return () => window.removeEventListener('tooloo:setinitiative', handleModeRequest);
  }, []);

  // Enter Agent mode (Tooloo takes control)
  const enterAgentMode = useCallback((options = {}) => {
    setMode(INITIATIVE_MODES.AGENT);
    
    window.dispatchEvent(new CustomEvent('tooloo:initiative', {
      detail: { mode: INITIATIVE_MODES.AGENT, reason: 'user_handoff', ...options }
    }));

    window.dispatchEvent(new CustomEvent('tooloo:mood', {
      detail: { mood: 'thinking' }
    }));
  }, []);

  // Exit Agent mode
  const exitAgentMode = useCallback(() => {
    setMode(INITIATIVE_MODES.DIRECTOR);
    
    window.dispatchEvent(new CustomEvent('tooloo:initiative', {
      detail: { mode: INITIATIVE_MODES.DIRECTOR, reason: 'agent_complete' }
    }));

    window.dispatchEvent(new CustomEvent('tooloo:mood', {
      detail: { mood: 'calm' }
    }));
  }, []);

  const contextValue = useMemo(() => ({
    mode,
    setMode,
    lastUserAction,
    autoSuggestionEnabled,
    setAutoSuggestionEnabled,
    enterAgentMode,
    exitAgentMode,
    isDirector: mode === INITIATIVE_MODES.DIRECTOR,
    isPartner: mode === INITIATIVE_MODES.PARTNER,
    isAgent: mode === INITIATIVE_MODES.AGENT,
  }), [mode, lastUserAction, autoSuggestionEnabled, enterAgentMode, exitAgentMode]);

  return (
    <InitiativeStateContext.Provider value={contextValue}>
      {children}
    </InitiativeStateContext.Provider>
  );
}

/**
 * Hook to access Initiative State
 */
export function useInitiativeState() {
  const context = useContext(InitiativeStateContext);
  if (!context) {
    return {
      mode: INITIATIVE_MODES.DIRECTOR,
      setMode: () => {},
      lastUserAction: Date.now(),
      autoSuggestionEnabled: true,
      setAutoSuggestionEnabled: () => {},
      enterAgentMode: () => {},
      exitAgentMode: () => {},
      isDirector: true,
      isPartner: false,
      isAgent: false,
    };
  }
  return context;
}

export default SynapysConductor;
