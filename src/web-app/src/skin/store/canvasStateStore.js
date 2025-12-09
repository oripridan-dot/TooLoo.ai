// @version 3.3.480
/**
 * Canvas State Store
 * 
 * Zustand store for the Living Canvas system.
 * Manages emotional state, particle systems, depth layers,
 * and performance budget controls.
 * 
 * Starts fresh each session - no persistence.
 * 
 * @module skin/store/canvasStateStore
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// EMOTION DEFINITIONS
// ============================================================================

export const CANVAS_EMOTIONS = {
  resting: {
    name: 'resting',
    primaryHue: 220,        // Deep blue
    secondaryHue: 260,      // Purple accent
    intensity: 0.15,        // Low energy
    waveSpeed: 0.3,
    particleDensity: 0.2,
    glowRadius: 0.3,
  },
  attentive: {
    name: 'attentive',
    primaryHue: 200,        // Cyan-blue
    secondaryHue: 240,      // Blue accent
    intensity: 0.3,
    waveSpeed: 0.5,
    particleDensity: 0.4,
    glowRadius: 0.4,
  },
  thinking: {
    name: 'thinking',
    primaryHue: 270,        // Purple
    secondaryHue: 300,      // Magenta accent
    intensity: 0.5,
    waveSpeed: 0.7,
    particleDensity: 0.6,
    glowRadius: 0.5,
  },
  creating: {
    name: 'creating',
    primaryHue: 45,         // Golden
    secondaryHue: 30,       // Orange accent
    intensity: 0.7,
    waveSpeed: 0.9,
    particleDensity: 0.8,
    glowRadius: 0.7,
  },
  excited: {
    name: 'excited',
    primaryHue: 160,        // Teal/Green
    secondaryHue: 120,      // Green accent
    intensity: 0.85,
    waveSpeed: 1.2,
    particleDensity: 0.9,
    glowRadius: 0.8,
  },
  accomplished: {
    name: 'accomplished',
    primaryHue: 140,        // Success green
    secondaryHue: 180,      // Cyan accent
    intensity: 0.6,
    waveSpeed: 0.4,
    particleDensity: 0.5,
    glowRadius: 0.9,
  },
  error: {
    name: 'error',
    primaryHue: 0,          // Red
    secondaryHue: 30,       // Orange accent
    intensity: 0.7,
    waveSpeed: 1.0,
    particleDensity: 0.3,
    glowRadius: 0.6,
  },
  resonating: {
    name: 'resonating',     // When user is actively typing
    primaryHue: 190,        // Bright cyan
    secondaryHue: 220,      // Blue accent
    intensity: 0.45,
    waveSpeed: 0.8,
    particleDensity: 0.5,
    glowRadius: 0.5,
  },
};

// ============================================================================
// PERFORMANCE PRESETS
// ============================================================================

export const PERFORMANCE_BUDGETS = {
  minimal: {
    name: 'Minimal',
    description: 'CSS-only, no particles',
    useWebGL: false,
    maxParticles: 0,
    enableBlur: false,
    enableGlow: false,
    enableParallax: false,
    fps: 30,
  },
  low: {
    name: 'Low',
    description: 'Light effects, few particles',
    useWebGL: false,
    maxParticles: 15,
    enableBlur: false,
    enableGlow: true,
    enableParallax: false,
    fps: 30,
  },
  balanced: {
    name: 'Balanced',
    description: 'Good visuals, moderate performance',
    useWebGL: true,
    maxParticles: 40,
    enableBlur: true,
    enableGlow: true,
    enableParallax: true,
    fps: 45,
  },
  high: {
    name: 'High',
    description: 'Full visual experience',
    useWebGL: true,
    maxParticles: 80,
    enableBlur: true,
    enableGlow: true,
    enableParallax: true,
    fps: 60,
  },
  ultra: {
    name: 'Ultra',
    description: 'Maximum fidelity',
    useWebGL: true,
    maxParticles: 150,
    enableBlur: true,
    enableGlow: true,
    enableParallax: true,
    fps: 60,
  },
};

// ============================================================================
// HELPER: Auto-detect recommended budget
// ============================================================================

function detectRecommendedBudget() {
  if (typeof navigator === 'undefined') return 'balanced';
  
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isMobile || cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'balanced';
  if (cores <= 8) return 'high';
  return 'ultra';
}

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useCanvasStore = create(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // EMOTION STATE
    // ========================================================================
    currentEmotion: 'resting',
    targetEmotion: 'resting',
    emotionBlend: 0,           // 0-1 transition progress
    emotionHistory: [],        // Last 10 emotions for smooth transitions
    
    // Computed emotion values (interpolated)
    computedEmotion: { ...CANVAS_EMOTIONS.resting },
    
    setEmotion: (emotion) => {
      const validEmotion = CANVAS_EMOTIONS[emotion] ? emotion : 'resting';
      const current = get().currentEmotion;
      
      if (current !== validEmotion) {
        set({
          targetEmotion: validEmotion,
          emotionBlend: 0,
          emotionHistory: [...get().emotionHistory, current].slice(-10),
        });
      }
    },
    
    // Called by animation loop to smoothly transition
    tickEmotionTransition: (deltaTime) => {
      const { currentEmotion, targetEmotion, emotionBlend } = get();
      
      if (currentEmotion === targetEmotion && emotionBlend >= 1) return;
      
      const transitionSpeed = 0.002; // ~500ms full transition
      const newBlend = Math.min(1, emotionBlend + deltaTime * transitionSpeed);
      
      // Interpolate emotion values
      const from = CANVAS_EMOTIONS[currentEmotion];
      const to = CANVAS_EMOTIONS[targetEmotion];
      const t = easeInOutCubic(newBlend);
      
      const computed = {
        name: newBlend > 0.5 ? to.name : from.name,
        primaryHue: lerp(from.primaryHue, to.primaryHue, t),
        secondaryHue: lerp(from.secondaryHue, to.secondaryHue, t),
        intensity: lerp(from.intensity, to.intensity, t),
        waveSpeed: lerp(from.waveSpeed, to.waveSpeed, t),
        particleDensity: lerp(from.particleDensity, to.particleDensity, t),
        glowRadius: lerp(from.glowRadius, to.glowRadius, t),
      };
      
      set({
        emotionBlend: newBlend,
        computedEmotion: computed,
        currentEmotion: newBlend >= 1 ? targetEmotion : currentEmotion,
      });
    },
    
    // ========================================================================
    // PERFORMANCE BUDGET
    // ========================================================================
    performanceBudget: detectRecommendedBudget(),
    customBudget: null,        // Override specific settings
    
    setPerformanceBudget: (budget) => {
      if (PERFORMANCE_BUDGETS[budget]) {
        set({ performanceBudget: budget, customBudget: null });
      }
    },
    
    setCustomBudget: (overrides) => {
      set({ customBudget: overrides });
    },
    
    // Get effective budget (preset + custom overrides)
    getEffectiveBudget: () => {
      const { performanceBudget, customBudget } = get();
      const preset = PERFORMANCE_BUDGETS[performanceBudget];
      return customBudget ? { ...preset, ...customBudget } : preset;
    },
    
    // ========================================================================
    // DEPTH & PARALLAX
    // ========================================================================
    mousePosition: { x: 0.5, y: 0.5 },  // Normalized 0-1
    focusDepth: 0,                       // -1 to 1 (back to front)
    activePanelId: null,
    
    setMousePosition: (x, y) => {
      set({ mousePosition: { x, y } });
    },
    
    setFocusDepth: (depth) => {
      set({ focusDepth: Math.max(-1, Math.min(1, depth)) });
    },
    
    setActivePanel: (panelId) => {
      set({ activePanelId: panelId });
    },
    
    // ========================================================================
    // CANVAS VISIBILITY
    // ========================================================================
    canvasEnabled: true,
    particlesEnabled: true,
    
    toggleCanvas: (enabled) => {
      set({ canvasEnabled: enabled ?? !get().canvasEnabled });
    },
    
    toggleParticles: (enabled) => {
      set({ particlesEnabled: enabled ?? !get().particlesEnabled });
    },
    
    // ========================================================================
    // ANIMATION FRAME TRACKING
    // ========================================================================
    lastFrameTime: 0,
    frameCount: 0,
    currentFps: 0,
    
    updateFrameStats: (timestamp) => {
      const { lastFrameTime, frameCount } = get();
      const deltaTime = timestamp - lastFrameTime;
      
      set({
        lastFrameTime: timestamp,
        frameCount: frameCount + 1,
        currentFps: deltaTime > 0 ? Math.round(1000 / deltaTime) : 60,
      });
      
      return deltaTime;
    },
    
    // ========================================================================
    // RESET (fresh start)
    // ========================================================================
    reset: () => {
      set({
        currentEmotion: 'resting',
        targetEmotion: 'resting',
        emotionBlend: 1,
        emotionHistory: [],
        computedEmotion: { ...CANVAS_EMOTIONS.resting },
        mousePosition: { x: 0.5, y: 0.5 },
        focusDepth: 0,
        activePanelId: null,
        frameCount: 0,
        currentFps: 0,
      });
    },
  }))
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================================================
// HOOKS FOR COMPONENTS
// ============================================================================

export function useCanvasEmotion() {
  return useCanvasStore((state) => ({
    emotion: state.computedEmotion,
    setEmotion: state.setEmotion,
    isTransitioning: state.currentEmotion !== state.targetEmotion,
  }));
}

export function useCanvasPerformance() {
  return useCanvasStore((state) => ({
    budget: state.performanceBudget,
    effective: state.getEffectiveBudget(),
    setBudget: state.setPerformanceBudget,
    setCustom: state.setCustomBudget,
    fps: state.currentFps,
  }));
}

export function useCanvasDepth() {
  return useCanvasStore((state) => ({
    mouse: state.mousePosition,
    depth: state.focusDepth,
    activePanel: state.activePanelId,
    setMouse: state.setMousePosition,
    setDepth: state.setFocusDepth,
    setActivePanel: state.setActivePanel,
  }));
}

export function useCanvasVisibility() {
  return useCanvasStore((state) => ({
    canvasEnabled: state.canvasEnabled,
    particlesEnabled: state.particlesEnabled,
    toggleCanvas: state.toggleCanvas,
    toggleParticles: state.toggleParticles,
  }));
}

export default useCanvasStore;
