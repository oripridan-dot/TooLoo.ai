// @version 2.2.563
// TooLoo.ai LiquidShell - The Viewport IS TooLoo
// Full-viewport wrapper - ULTRA Lightweight version - NO reactive hooks

import React, { memo, useEffect, useRef } from 'react';
import { useSynapsynDNA } from '../synapsys';

// ============================================================================
// VIEWPORT EDGE - The breathing border that shows TooLoo is alive (CSS only)
// ============================================================================

export const ViewportEdge = memo(({ className = '' }) => {
  const edgeRef = useRef(null);
  const frameRef = useRef(0);
  const animationRef = useRef(null);

  useEffect(() => {
    // Read DNA imperatively - no reactive subscription
    const getDNA = () => useSynapsynDNA.getState();
    
    const animate = () => {
      frameRef.current += 1;
      
      if (edgeRef.current && frameRef.current % 3 === 0) {
        const state = getDNA();
        const colors = state.colors || {};
        const presence = state.presence || {};
        
        const breathRate = presence.breathRate || 0.4;
        const pulseStrength = presence.pulseStrength || 0.4;
        const energy = colors.energy || 0.3;
        const hue = colors.primary || 200;
        
        const breath = Math.sin(frameRef.current * 0.01 * breathRate) * 0.5 + 0.5;
        const intensity = 0.02 + breath * 0.03 * pulseStrength * energy;
        const glowSize = 20 + breath * 15 * pulseStrength;
        
        edgeRef.current.style.boxShadow = `
          inset 0 ${glowSize}px ${glowSize}px -${glowSize}px hsla(${hue}, 60%, 50%, ${intensity}),
          inset 0 -${glowSize}px ${glowSize}px -${glowSize}px hsla(${hue}, 60%, 50%, ${intensity}),
          inset ${glowSize}px 0 ${glowSize}px -${glowSize}px hsla(${hue}, 60%, 50%, ${intensity}),
          inset -${glowSize}px 0 ${glowSize}px -${glowSize}px hsla(${hue}, 60%, 50%, ${intensity})
        `;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={edgeRef}
      className={`fixed inset-0 pointer-events-none z-[100] ${className}`}
      style={{ willChange: 'box-shadow' }}
    />
  );
});

ViewportEdge.displayName = 'ViewportEdge';

// ============================================================================
// LIQUID SHELL - The main viewport wrapper (simplified - no effects)
// ============================================================================

export const LiquidShell = memo(({ 
  children,
  showEdge = true,
  className = '',
}) => {
  // Inject CSS variables on mount
  useEffect(() => {
    useSynapsynDNA.getState().injectCSS();
  }, []);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#0a0a0a] ${className}`}>
      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
      
      {/* Viewport edge breathing */}
      {showEdge && <ViewportEdge />}
    </div>
  );
});

LiquidShell.displayName = 'LiquidShell';

// ============================================================================
// LIQUID PANEL - A panel that responds to DNA (simplified)
// ============================================================================

export const LiquidPanel = memo(({
  children,
  variant = 'surface', // surface, elevated, glass
  className = '',
  style = {},
  ...props
}) => {
  const baseStyles = {
    surface: 'bg-[#0f1117] border-white/5',
    elevated: 'bg-[#151820] border-white/10',
    glass: 'bg-white/5 backdrop-blur-xl border-white/10',
  };

  return (
    <div
      className={`
        rounded-xl border transition-all duration-300
        ${baseStyles[variant] || baseStyles.surface}
        ${className}
      `}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

LiquidPanel.displayName = 'LiquidPanel';

// ============================================================================
// LIQUID TRANSITION - Simple CSS transition between views
// ============================================================================

export const LiquidTransition = memo(({ 
  children, 
  viewKey,
  className = '' 
}) => {
  const containerRef = useRef(null);
  const prevKeyRef = useRef(viewKey);

  useEffect(() => {
    if (viewKey !== prevKeyRef.current && containerRef.current) {
      const el = containerRef.current;
      
      // Simple fade transition
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      
      requestAnimationFrame(() => {
        el.style.transition = 'all 300ms ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
      
      prevKeyRef.current = viewKey;
    }
  }, [viewKey]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full ${className}`}
    >
      {children}
    </div>
  );
});

LiquidTransition.displayName = 'LiquidTransition';

export default LiquidShell;
