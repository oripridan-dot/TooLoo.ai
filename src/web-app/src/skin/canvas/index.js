// @version 1.0.0
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
