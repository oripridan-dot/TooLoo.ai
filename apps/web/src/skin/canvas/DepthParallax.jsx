// @version 3.3.483
/**
 * Depth Parallax System
 * 
 * Creates a 3-layer depth effect that responds to mouse
 * movement and focus, giving the UI a sense of spatial depth.
 * 
 * Layers:
 * - Background (z: -2): Slow movement, distant feel
 * - Midground (z: -1): Medium movement, floating elements
 * - Foreground (z: 0): UI layer, subtle movement
 * 
 * @module skin/canvas/DepthParallax
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useCanvasStore } from '../store/canvasStateStore';

// ============================================================================
// PARALLAX CONTEXT
// ============================================================================

const ParallaxContext = createContext({
  mouseX: { get: () => 0.5 },
  mouseY: { get: () => 0.5 },
  enabled: true,
});

export function useParallax() {
  return useContext(ParallaxContext);
}

// ============================================================================
// PARALLAX PROVIDER
// ============================================================================

export function ParallaxProvider({ children, enabled = true }) {
  const mousePosition = useCanvasStore((s) => s.mousePosition);
  const setMousePosition = useCanvasStore((s) => s.setMousePosition);
  
  // Create spring-animated mouse values for smooth parallax
  const mouseX = useSpring(mousePosition.x, { stiffness: 50, damping: 20 });
  const mouseY = useSpring(mousePosition.y, { stiffness: 50, damping: 20 });
  
  // Update spring targets when mouse moves
  React.useEffect(() => {
    mouseX.set(mousePosition.x);
    mouseY.set(mousePosition.y);
  }, [mousePosition.x, mousePosition.y, mouseX, mouseY]);
  
  const contextValue = useMemo(() => ({
    mouseX,
    mouseY,
    enabled,
  }), [mouseX, mouseY, enabled]);
  
  return (
    <ParallaxContext.Provider value={contextValue}>
      {children}
    </ParallaxContext.Provider>
  );
}

// ============================================================================
// PARALLAX LAYER COMPONENT
// ============================================================================

export function ParallaxLayer({ 
  children, 
  depth = 0,           // -1 (back) to 1 (front)
  intensity = 1,       // Multiplier for parallax effect
  rotateIntensity = 0, // 0-1 for 3D rotation effect
  className = '',
  style = {},
}) {
  const { mouseX, mouseY, enabled } = useParallax();
  
  // Calculate movement based on depth
  // Negative depth = moves opposite to mouse (background)
  // Positive depth = moves with mouse (foreground)
  const moveMultiplier = depth * intensity * (enabled ? 1 : 0);
  const maxMove = 30; // Maximum pixels of movement
  
  // Transform mouse position (0-1) to movement (-maxMove to maxMove)
  const x = useTransform(mouseX, [0, 1], [maxMove * moveMultiplier, -maxMove * moveMultiplier]);
  const y = useTransform(mouseY, [0, 1], [maxMove * moveMultiplier, -maxMove * moveMultiplier]);
  
  // Optional 3D rotation
  const rotateX = useTransform(mouseY, [0, 1], [5 * rotateIntensity, -5 * rotateIntensity]);
  const rotateY = useTransform(mouseX, [0, 1], [-5 * rotateIntensity, 5 * rotateIntensity]);
  
  // Scale slightly based on depth for enhanced depth perception
  const scale = 1 + (depth * 0.02);
  
  return (
    <motion.div
      className={className}
      style={{
        x,
        y,
        rotateX,
        rotateY,
        scale,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// DEPTH LAYERS (Pre-configured)
// ============================================================================

export function BackgroundLayer({ children, className = '', style = {} }) {
  return (
    <ParallaxLayer 
      depth={-1} 
      intensity={0.8}
      className={className}
      style={style}
    >
      {children}
    </ParallaxLayer>
  );
}

export function MidgroundLayer({ children, className = '', style = {} }) {
  return (
    <ParallaxLayer 
      depth={-0.5} 
      intensity={0.5}
      className={className}
      style={style}
    >
      {children}
    </ParallaxLayer>
  );
}

export function ForegroundLayer({ children, className = '', style = {} }) {
  return (
    <ParallaxLayer 
      depth={0.2} 
      intensity={0.3}
      rotateIntensity={0.1}
      className={className}
      style={style}
    >
      {children}
    </ParallaxLayer>
  );
}

// ============================================================================
// FLOATING ORB (Decorative element)
// ============================================================================

export function FloatingOrb({ 
  size = 100, 
  color = 'cyan',
  blur = 40,
  depth = -0.5,
  position = { top: '20%', left: '20%' },
  pulseSpeed = 4,
}) {
  const { enabled } = useParallax();
  
  const colorMap = {
    cyan: 'rgba(0, 243, 255, 0.15)',
    purple: 'rgba(188, 19, 254, 0.15)',
    gold: 'rgba(255, 215, 0, 0.12)',
    green: 'rgba(10, 255, 10, 0.12)',
    pink: 'rgba(255, 105, 180, 0.12)',
  };
  
  const orbColor = colorMap[color] || color;
  
  return (
    <ParallaxLayer depth={depth} intensity={0.6}>
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`,
          filter: `blur(${blur}px)`,
          ...position,
        }}
        animate={enabled ? {
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        } : {}}
        transition={{
          duration: pulseSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </ParallaxLayer>
  );
}

// ============================================================================
// DEPTH SCENE (Combines all layers)
// ============================================================================

export function DepthScene({ children, showOrbs = true }) {
  const budget = useCanvasStore((s) => s.getEffectiveBudget());
  const enabled = budget.enableParallax;
  
  return (
    <ParallaxProvider enabled={enabled}>
      <div className="relative w-full h-full" style={{ perspective: '1000px' }}>
        {/* Decorative orbs in background */}
        {showOrbs && enabled && (
          <>
            <FloatingOrb 
              size={300} 
              color="purple" 
              blur={60} 
              depth={-1}
              position={{ top: '10%', left: '10%' }}
              pulseSpeed={6}
            />
            <FloatingOrb 
              size={200} 
              color="cyan" 
              blur={50} 
              depth={-0.8}
              position={{ top: '60%', right: '15%' }}
              pulseSpeed={5}
            />
            <FloatingOrb 
              size={150} 
              color="gold" 
              blur={40} 
              depth={-0.6}
              position={{ bottom: '20%', left: '30%' }}
              pulseSpeed={4}
            />
          </>
        )}
        
        {/* Main content */}
        {children}
      </div>
    </ParallaxProvider>
  );
}

export default DepthScene;
