// @version 3.3.487
/**
 * Canvas Module Index
 * 
 * Exports all Living Canvas components and utilities.
 * 
 * @module skin/canvas
 */

// Main canvas component
export { default as LivingCanvas, CANVAS_EMOTIONS } from './LivingCanvas.jsx';

// Particle system
export { default as AmbientParticles } from './AmbientParticles.jsx';

// Depth and parallax
export { 
  default as DepthScene,
  ParallaxProvider,
  ParallaxLayer,
  BackgroundLayer,
  MidgroundLayer,
  ForegroundLayer,
  FloatingOrb,
  useParallax,
} from './DepthParallax.jsx';

// Socket bridge for backend state sync
export { default as CanvasSocketBridge, useCanvasSocketBridge } from './CanvasSocketBridge.jsx';

// Performance budget UI control
export { 
  default as PerformanceBudgetControl,
  PerformanceBudgetButton,
  PerformanceBudgetPanel,
  PerformanceBudgetDropdown,
  PerformanceBudgetSlider,
  BUDGET_LEVELS,
} from './PerformanceBudgetControl.jsx';

// Re-export store hooks for convenience
export {
  useCanvasStore,
  useCanvasEmotion,
  useCanvasPerformance,
  useCanvasDepth,
  useCanvasVisibility,
  CANVAS_EMOTIONS as EMOTIONS,
  PERFORMANCE_BUDGETS,
} from '../store/canvasStateStore.js';
