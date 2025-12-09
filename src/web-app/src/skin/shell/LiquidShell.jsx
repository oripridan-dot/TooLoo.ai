// @version 3.3.420
// TooLoo.ai LiquidShell - The "Deep Canvas" Architecture
// Full-viewport wrapper with Z-Index Layered Architecture for sophisticated visual communication
// Phase 1 of "Sentient Partner" Protocol

import React, { memo, useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSynapsynDNA } from '../synapsys';

// ============================================================================
// DEEP CANVAS CONTEXT - Coordinates all layers
// ============================================================================

const DeepCanvasContext = createContext(null);

export const useDeepCanvas = () => {
  const context = useContext(DeepCanvasContext);
  if (!context) {
    return {
      mood: 'calm',
      viewMode: 'micro',
      hoveredDependency: null,
      setHoveredDependency: () => {},
      toggleViewMode: () => {},
      setMood: () => {},
      focusTarget: null,
      setFocusTarget: () => {},
      suggestionPulse: false,
    };
  }
  return context;
};

// ============================================================================
// LAYER 1: SUBCONSCIOUS (z-0) - The mood backdrop
// Renders mood-driven visual expression
// ============================================================================

const SubconsciousLayer = memo(({ mood = 'calm', intensity = 0.5 }) => {
  const moodColors = {
    calm: { hue: 200, saturation: 40, energy: 0.2, pulse: 0.5 },
    thinking: { hue: 260, saturation: 70, energy: 0.5, pulse: 1.2 },
    alert: { hue: 0, saturation: 80, energy: 0.8, pulse: 2.0 },
    celebration: { hue: 45, saturation: 90, energy: 1.0, pulse: 2.5 },
    creative: { hue: 300, saturation: 75, energy: 0.6, pulse: 1.0 },
    focused: { hue: 220, saturation: 60, energy: 0.4, pulse: 0.8 },
  };

  const moodConfig = moodColors[mood] || moodColors.calm;
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const frameRef = useRef(0);

  // Animated mood background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      frameRef.current++;
      const { hue, saturation, energy, pulse } = moodConfig;
      
      // Clear with subtle fade
      ctx.fillStyle = `rgba(10, 10, 10, ${0.1 + (1 - intensity) * 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw mood gradients
      const time = frameRef.current * 0.01 * pulse;
      const centerX = canvas.width * (0.5 + Math.sin(time * 0.3) * 0.1);
      const centerY = canvas.height * (0.7 + Math.cos(time * 0.2) * 0.1);
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, canvas.width * 0.6
      );
      
      const alpha = energy * intensity * 0.15;
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, 50%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue + 20}, ${saturation - 10}%, 30%, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mood, intensity, moodConfig]);

  return (
    <motion.div
      className="absolute inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
});

SubconsciousLayer.displayName = 'SubconsciousLayer';

// ============================================================================
// LAYER 2: CONTEXT (z-10) - Dependency visualization
// Shows file dependencies as faint connecting lines behind work
// ============================================================================

const ContextLayer = memo(({ 
  dependencies = [], 
  hoveredDependency, 
  onHoverDependency,
  viewMode = 'micro',
  visible = true,
}) => {
  const [nodes, setNodes] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const frameRef = useRef(0);
  
  // Generate node positions from dependencies
  useEffect(() => {
    if (dependencies.length === 0) {
      // Demo mode: generate sample nodes
      const demoNodes = Array.from({ length: 8 }, (_, i) => ({
        id: `node-${i}`,
        name: `module-${i}`,
        x: 0.1 + (i % 4) * 0.25 + Math.random() * 0.1,
        y: 0.2 + Math.floor(i / 4) * 0.4 + Math.random() * 0.1,
        connections: i === 0 ? [] : [Math.floor(Math.random() * i)],
        type: i < 3 ? 'core' : i < 6 ? 'feature' : 'utility',
        vx: (Math.random() - 0.5) * 0.0002,
        vy: (Math.random() - 0.5) * 0.0002,
      }));
      setNodes(demoNodes);
    } else {
      setNodes(dependencies);
    }
  }, [dependencies]);

  // Animate neural mesh
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      frameRef.current++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const opacity = viewMode === 'macro' ? 0.8 : (hoveredDependency !== null ? 0.6 : 0.3);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Gentle drift
        node.x += node.vx || 0;
        node.y += node.vy || 0;
        
        // Bounce off edges
        if (node.x < 0.05 || node.x > 0.95) node.vx = -(node.vx || 0);
        if (node.y < 0.05 || node.y > 0.95) node.vy = -(node.vy || 0);

        const x = node.x * w;
        const y = node.y * h;
        const isHighlighted = hoveredDependency === node.id;

        // Draw connections
        node.connections?.forEach((targetIdx) => {
          const target = nodes[targetIdx];
          if (!target) return;

          const tx = target.x * w;
          const ty = target.y * h;
          const targetHighlighted = hoveredDependency === target.id;

          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = (isHighlighted || targetHighlighted)
            ? `rgba(56, 189, 248, ${opacity})`
            : `rgba(100, 100, 150, ${opacity * 0.3})`;
          ctx.lineWidth = (isHighlighted || targetHighlighted) ? 2 : 1;
          ctx.setLineDash((isHighlighted || targetHighlighted) ? [] : [4, 4]);
          ctx.stroke();
        });

        // Draw node
        const typeColors = {
          core: [56, 189, 248],
          feature: [168, 85, 247],
          utility: [74, 222, 128],
        };
        const color = typeColors[node.type] || typeColors.utility;
        const size = isHighlighted ? 8 : 5;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(',')}, ${opacity})`;
        ctx.fill();

        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(x, y, size + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color.join(',')}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.stroke();

          ctx.font = '10px monospace';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, x, y - 15);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, viewMode, hoveredDependency]);

  // Handle mouse hover for node detection
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || viewMode !== 'macro') return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    let found = null;
    for (const node of nodes) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < 0.03) {
        found = node.id;
        break;
      }
    }
    onHoverDependency?.(found);
  }, [nodes, viewMode, onHoverDependency]);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverDependency?.(null)}
      style={{ pointerEvents: viewMode === 'macro' ? 'auto' : 'none' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
});

ContextLayer.displayName = 'ContextLayer';

// ============================================================================
// LAYER 3: WORK SURFACE (z-20) - Glassmorphism content area
// Supports zoom in (Micro) and zoom out (Macro) transitions
// ============================================================================

const WorkSurfaceLayer = memo(({ 
  children, 
  viewMode = 'micro',
  dimmed = false,
  focusTarget = null,
}) => {
  const scale = viewMode === 'micro' ? 1 : 0.85;
  const y = viewMode === 'micro' ? 0 : -20;

  return (
    <motion.div
      className="absolute inset-0 z-20"
      animate={{ 
        scale,
        y,
      }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
      }}
    >
      {/* Glassmorphism container */}
      <div 
        className={`
          relative w-full h-full transition-all duration-500
          ${dimmed ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}
        `}
      >
        {/* Focus spotlight effect */}
        <AnimatePresence>
          {focusTarget && (
            <motion.div
              className="absolute inset-0 z-30 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: `radial-gradient(circle at ${focusTarget.x || 50}% ${focusTarget.y || 50}%, 
                  transparent 0%, 
                  transparent 100px, 
                  rgba(0,0,0,0.7) 200px)`,
              }}
            />
          )}
        </AnimatePresence>
        
        {/* Content */}
        {children}
      </div>
    </motion.div>
  );
});

WorkSurfaceLayer.displayName = 'WorkSurfaceLayer';

// ============================================================================
// LAYER 4: CONSCIOUSNESS (z-50) - Sentinel HUD overlay
// High-level awareness indicators and suggestion pulse
// ============================================================================

const ConsciousnessLayer = memo(({ 
  mood = 'calm',
  suggestionPulse = false,
  systemStatus = 'online',
}) => {
  const [pulseActive, setPulseActive] = useState(false);
  
  useEffect(() => {
    if (suggestionPulse) {
      setPulseActive(true);
      const timer = setTimeout(() => setPulseActive(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [suggestionPulse]);

  const statusColors = {
    online: 'bg-emerald-500',
    thinking: 'bg-cyan-500',
    processing: 'bg-blue-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4">
        {/* System status indicator */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className={`w-2 h-2 rounded-full ${statusColors[systemStatus]} animate-pulse`} />
          <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
            {systemStatus}
          </span>
        </div>
        
        {/* Mood indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-mono">MOOD:</span>
          <span className="text-xs text-cyan-400 font-mono uppercase">{mood}</span>
        </div>
      </div>
      
      {/* Suggestion pulse - bottom right corner (Gold peripheral pulse) */}
      <AnimatePresence>
        {pulseActive && (
          <motion.div
            className="absolute bottom-8 right-8 pointer-events-auto cursor-pointer"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%)',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 0.3, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-amber-300 text-lg">
              💡
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ConsciousnessLayer.displayName = 'ConsciousnessLayer';

// ============================================================================
// VIEWPORT EDGE - The breathing border that shows TooLoo is alive (CSS only)
// ============================================================================

export const ViewportEdge = memo(({ className = '', mood = 'calm' }) => {
  const edgeRef = useRef(null);
  const frameRef = useRef(0);
  const animationRef = useRef(null);

  const moodHues = {
    calm: 200,
    thinking: 260,
    alert: 0,
    celebration: 45,
    creative: 300,
    focused: 220,
  };

  useEffect(() => {
    // Read DNA imperatively - no reactive subscription
    const getDNA = () => useSynapsynDNA.getState();
    const baseHue = moodHues[mood] || 200;
    
    const animate = () => {
      frameRef.current += 1;
      
      if (edgeRef.current && frameRef.current % 3 === 0) {
        const state = getDNA();
        const colors = state.colors || {};
        const presence = state.presence || {};
        
        const breathRate = presence.breathRate || 0.4;
        const pulseStrength = presence.pulseStrength || 0.4;
        const energy = colors.energy || 0.3;
        const hue = baseHue;
        
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
  }, [mood]);

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
// LIQUID SHELL - The Deep Canvas with all 4 layers
// ============================================================================

export const LiquidShell = memo(({ 
  children,
  showEdge = true,
  className = '',
  initialMood = 'calm',
  dependencies = [],
}) => {
  // Deep Canvas state
  const [mood, setMood] = useState(initialMood);
  const [viewMode, setViewMode] = useState('micro'); // 'micro' | 'macro'
  const [hoveredDependency, setHoveredDependency] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [suggestionPulse, setSuggestionPulse] = useState(false);
  const [systemStatus, setSystemStatus] = useState('online');

  // Toggle between micro (coding) and macro (planning) views
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'micro' ? 'macro' : 'micro'));
  }, []);

  // Trigger suggestion pulse
  const triggerSuggestionPulse = useCallback(() => {
    setSuggestionPulse(true);
    setTimeout(() => setSuggestionPulse(false), 100);
  }, []);

  // Listen for system events
  useEffect(() => {
    // Listen for mood changes from bus
    const handleMoodChange = (event) => {
      if (event?.detail?.mood) {
        setMood(event.detail.mood);
      }
    };
    
    // Listen for suggestion ready events
    const handleSuggestion = () => {
      triggerSuggestionPulse();
    };
    
    // Listen for focus requests
    const handleFocus = (event) => {
      if (event?.detail) {
        setFocusTarget(event.detail);
        setTimeout(() => setFocusTarget(null), 3000);
      }
    };

    window.addEventListener('tooloo:mood', handleMoodChange);
    window.addEventListener('tooloo:suggestion', handleSuggestion);
    window.addEventListener('tooloo:focus', handleFocus);

    // Inject CSS variables on mount
    useSynapsynDNA.getState().injectCSS();

    return () => {
      window.removeEventListener('tooloo:mood', handleMoodChange);
      window.removeEventListener('tooloo:suggestion', handleSuggestion);
      window.removeEventListener('tooloo:focus', handleFocus);
    };
  }, [triggerSuggestionPulse]);

  // Keyboard shortcuts for view mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleViewMode();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleViewMode]);

  // Context value
  const contextValue = {
    mood,
    setMood,
    viewMode,
    toggleViewMode,
    hoveredDependency,
    setHoveredDependency,
    focusTarget,
    setFocusTarget,
    suggestionPulse,
    triggerSuggestionPulse,
    systemStatus,
    setSystemStatus,
  };

  return (
    <DeepCanvasContext.Provider value={contextValue}>
      <div className={`relative w-full h-screen overflow-hidden bg-[#0a0a0a] ${className}`}>
        {/* Layer 1: Subconscious (z-0) - Mood backdrop */}
        <SubconsciousLayer mood={mood} intensity={viewMode === 'macro' ? 0.7 : 0.4} />
        
        {/* Layer 2: Context (z-10) - Dependency visualization */}
        <ContextLayer 
          dependencies={dependencies}
          hoveredDependency={hoveredDependency}
          onHoverDependency={setHoveredDependency}
          viewMode={viewMode}
          visible={true}
        />
        
        {/* Layer 3: Work Surface (z-20) - Content area */}
        <WorkSurfaceLayer 
          viewMode={viewMode}
          dimmed={hoveredDependency !== null}
          focusTarget={focusTarget}
        >
          {children}
        </WorkSurfaceLayer>
        
        {/* Layer 4: Consciousness (z-50) - HUD overlay */}
        <ConsciousnessLayer 
          mood={mood}
          suggestionPulse={suggestionPulse}
          systemStatus={systemStatus}
        />
        
        {/* Viewport edge breathing (highest z-index) */}
        {showEdge && <ViewportEdge mood={mood} />}
      </div>
    </DeepCanvasContext.Provider>
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
// LIQUID TRANSITION - View transition with zoom effect
// ============================================================================

export const LiquidTransition = memo(({ 
  children, 
  viewKey,
  className = '' 
}) => {
  const containerRef = useRef(null);
  const prevKeyRef = useRef(viewKey);
  const { viewMode } = useDeepCanvas();

  useEffect(() => {
    if (viewKey !== prevKeyRef.current && containerRef.current) {
      const el = containerRef.current;
      
      // Zoom transition effect based on view mode
      el.style.opacity = '0';
      el.style.transform = viewMode === 'macro' 
        ? 'scale(0.95) translateY(-10px)' 
        : 'scale(1.02) translateY(10px)';
      
      requestAnimationFrame(() => {
        el.style.transition = 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.opacity = '1';
        el.style.transform = 'scale(1) translateY(0)';
      });
      
      prevKeyRef.current = viewKey;
    }
  }, [viewKey, viewMode]);

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
