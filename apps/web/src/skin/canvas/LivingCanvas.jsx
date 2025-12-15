// @version 3.3.492
/**
 * Living Canvas
 * 
 * The universal emotional background layer for TooLoo.ai.
 * Renders behind all views as a living, breathing backdrop
 * that responds to the AI's cognitive and emotional state.
 * 
 * Features:
 * - Adaptive gradient mesh that shifts with AI mood
 * - WebGL acceleration (with CSS fallback)
 * - Performance-aware rendering based on budget
 * - Smooth emotional transitions
 * 
 * @module skin/canvas/LivingCanvas
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useCanvasStore, 
  CANVAS_EMOTIONS,
  PERFORMANCE_BUDGETS,
} from '../store/canvasStateStore';
import AmbientParticles from './AmbientParticles';

// ============================================================================
// WEBGL GRADIENT RENDERER
// ============================================================================

class GradientRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.uniforms = {};
    this.animationId = null;
    this.startTime = Date.now();
    
    this.init();
  }
  
  init() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: false,
      });
      
      if (!this.gl) throw new Error('WebGL not supported');
      
      this.createShaders();
      this.createBuffers();
    } catch (e) {
      console.warn('[LivingCanvas] WebGL init failed, falling back to CSS:', e.message);
      this.gl = null;
    }
  }
  
  createShaders() {
    const gl = this.gl;
    
    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    
    // Fragment shader - emotional gradient with waves
    const fsSource = `
      precision mediump float;
      varying vec2 v_uv;
      
      uniform float u_time;
      uniform float u_primaryHue;
      uniform float u_secondaryHue;
      uniform float u_intensity;
      uniform float u_waveSpeed;
      uniform float u_glowRadius;
      uniform vec2 u_mouse;
      
      // HSL to RGB conversion
      vec3 hsl2rgb(float h, float s, float l) {
        float c = (1.0 - abs(2.0 * l - 1.0)) * s;
        float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
        float m = l - c / 2.0;
        vec3 rgb;
        if (h < 60.0) rgb = vec3(c, x, 0.0);
        else if (h < 120.0) rgb = vec3(x, c, 0.0);
        else if (h < 180.0) rgb = vec3(0.0, c, x);
        else if (h < 240.0) rgb = vec3(0.0, x, c);
        else if (h < 300.0) rgb = vec3(x, 0.0, c);
        else rgb = vec3(c, 0.0, x);
        return rgb + m;
      }
      
      void main() {
        vec2 uv = v_uv;
        float time = u_time * u_waveSpeed;
        
        // Create flowing waves
        float wave1 = sin(uv.x * 3.0 + time * 0.5) * 0.5 + 0.5;
        float wave2 = sin(uv.y * 2.5 - time * 0.3) * 0.5 + 0.5;
        float wave3 = sin((uv.x + uv.y) * 2.0 + time * 0.4) * 0.5 + 0.5;
        
        // Combine waves
        float waveCombo = (wave1 + wave2 + wave3) / 3.0;
        
        // Mouse influence (subtle attraction)
        float mouseDist = distance(uv, u_mouse);
        float mouseInfluence = smoothstep(0.5, 0.0, mouseDist) * u_glowRadius;
        
        // Mix primary and secondary hues based on waves
        float hueMix = waveCombo * 0.3 + mouseInfluence * 0.2;
        float hue = mix(u_primaryHue, u_secondaryHue, hueMix);
        
        // Saturation varies with intensity
        float sat = 0.4 + u_intensity * 0.3;
        
        // Lightness: dark base with glowing areas
        float baseLightness = 0.03; // Almost black base
        float glowLightness = 0.08 + u_intensity * 0.12;
        float lightness = mix(baseLightness, glowLightness, waveCombo * u_intensity + mouseInfluence);
        
        // Center glow
        float centerDist = distance(uv, vec2(0.5, 0.5));
        float centerGlow = smoothstep(0.8, 0.2, centerDist) * u_glowRadius * 0.5;
        lightness += centerGlow * 0.05;
        
        vec3 color = hsl2rgb(hue, sat, lightness);
        
        // Add subtle vignette
        float vignette = smoothstep(1.4, 0.5, centerDist);
        color *= vignette;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);
    
    // Get uniform locations
    this.uniforms = {
      time: gl.getUniformLocation(this.program, 'u_time'),
      primaryHue: gl.getUniformLocation(this.program, 'u_primaryHue'),
      secondaryHue: gl.getUniformLocation(this.program, 'u_secondaryHue'),
      intensity: gl.getUniformLocation(this.program, 'u_intensity'),
      waveSpeed: gl.getUniformLocation(this.program, 'u_waveSpeed'),
      glowRadius: gl.getUniformLocation(this.program, 'u_glowRadius'),
      mouse: gl.getUniformLocation(this.program, 'u_mouse'),
    };
  }
  
  createBuffers() {
    const gl = this.gl;
    
    // Full-screen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  }
  
  render(emotion, mouse) {
    if (!this.gl) return;
    
    const gl = this.gl;
    const time = (Date.now() - this.startTime) / 1000;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.02, 0.02, 0.03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Set uniforms
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform1f(this.uniforms.primaryHue, emotion.primaryHue);
    gl.uniform1f(this.uniforms.secondaryHue, emotion.secondaryHue);
    gl.uniform1f(this.uniforms.intensity, emotion.intensity);
    gl.uniform1f(this.uniforms.waveSpeed, emotion.waveSpeed);
    gl.uniform1f(this.uniforms.glowRadius, emotion.glowRadius);
    gl.uniform2f(this.uniforms.mouse, mouse.x, 1 - mouse.y);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  resize(width, height) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}

// ============================================================================
// CSS FALLBACK GRADIENT
// ============================================================================

function CSSGradientLayer({ emotion }) {
  // Debug: More visible gradients for testing
  const gradientStyle = useMemo(() => {
    const primary = `hsl(${emotion.primaryHue}, 60%, ${15 + emotion.intensity * 15}%)`;
    const secondary = `hsl(${emotion.secondaryHue}, 55%, ${12 + emotion.intensity * 12}%)`;
    const dark = 'hsl(0, 0%, 3%)';
    
    console.log('[CSSGradientLayer] Rendering with emotion:', emotion.name, { primaryHue: emotion.primaryHue });
    
    return {
      background: `
        radial-gradient(ellipse at 30% 20%, ${primary} 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, ${secondary} 0%, transparent 50%),
        radial-gradient(ellipse at 50% 50%, ${primary} 0%, transparent 70%),
        ${dark}
      `,
      transition: 'background 1.5s ease-in-out',
    };
  }, [emotion.primaryHue, emotion.secondaryHue, emotion.intensity, emotion.name]);
  
  return (
    <motion.div
      className="absolute inset-0"
      style={gradientStyle}
      animate={{
        opacity: [0.8, 1, 0.9, 1],
      }}
      transition={{
        duration: 4 / emotion.waveSpeed,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ============================================================================
// PERFORMANCE CONTROLS OVERLAY
// ============================================================================

function PerformanceControls({ isOpen, onClose }) {
  // Use individual selectors to avoid object recreation
  const budget = useCanvasStore((s) => s.performanceBudget);
  const customBudget = useCanvasStore((s) => s.customBudget);
  const setBudget = useCanvasStore((s) => s.setPerformanceBudget);
  const fps = useCanvasStore((s) => s.currentFps);
  const canvasEnabled = useCanvasStore((s) => s.canvasEnabled);
  const particlesEnabled = useCanvasStore((s) => s.particlesEnabled);
  const toggleCanvas = useCanvasStore((s) => s.toggleCanvas);
  const toggleParticles = useCanvasStore((s) => s.toggleParticles);
  
  // Compute effective locally
  const effective = useMemo(() => {
    const preset = PERFORMANCE_BUDGETS[budget] || PERFORMANCE_BUDGETS.balanced;
    return customBudget ? { ...preset, ...customBudget } : preset;
  }, [budget, customBudget]);
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 right-4 z-50 bg-black/80 backdrop-blur-md rounded-lg p-4 border border-white/10 text-white min-w-[280px]"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-white/90">🎨 Canvas Settings</h3>
        <button 
          onClick={onClose}
          className="text-white/50 hover:text-white text-lg"
        >
          ×
        </button>
      </div>
      
      {/* FPS Display */}
      <div className="mb-4 text-xs text-white/50">
        Current FPS: <span className="text-white/90">{fps}</span>
      </div>
      
      {/* Master Toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white/70">Canvas Enabled</span>
        <button
          onClick={() => toggleCanvas()}
          className={`w-12 h-6 rounded-full transition-colors ${
            canvasEnabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            canvasEnabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {/* Particles Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-white/70">Particles</span>
        <button
          onClick={() => toggleParticles()}
          className={`w-12 h-6 rounded-full transition-colors ${
            particlesEnabled ? 'bg-green-500' : 'bg-white/20'
          }`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            particlesEnabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      {/* Performance Budget */}
      <div className="space-y-2">
        <span className="text-sm text-white/70">Performance Budget</span>
        <div className="grid grid-cols-5 gap-1">
          {['minimal', 'low', 'balanced', 'high', 'ultra'].map((level) => (
            <button
              key={level}
              onClick={() => setBudget(level)}
              className={`py-1 px-1 text-xs rounded transition-colors ${
                budget === level
                  ? 'bg-cyan-500/80 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {level.charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-1">
          {effective.description}
        </p>
      </div>
      
      {/* Budget Details */}
      <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50 space-y-1">
        <div className="flex justify-between">
          <span>WebGL</span>
          <span>{effective.useWebGL ? '✓' : '✗'}</span>
        </div>
        <div className="flex justify-between">
          <span>Max Particles</span>
          <span>{effective.maxParticles}</span>
        </div>
        <div className="flex justify-between">
          <span>Blur Effects</span>
          <span>{effective.enableBlur ? '✓' : '✗'}</span>
        </div>
        <div className="flex justify-between">
          <span>Parallax</span>
          <span>{effective.enableParallax ? '✓' : '✗'}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN LIVING CANVAS COMPONENT
// ============================================================================

export default function LivingCanvas() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  
  // Use individual selectors to avoid creating new objects on every render
  const emotion = useCanvasStore((s) => s.computedEmotion);
  const canvasEnabled = useCanvasStore((s) => s.canvasEnabled);
  const particlesEnabled = useCanvasStore((s) => s.particlesEnabled);
  const mousePosition = useCanvasStore((s) => s.mousePosition);
  const setMousePosition = useCanvasStore((s) => s.setMousePosition);
  const tickEmotionTransition = useCanvasStore((s) => s.tickEmotionTransition);
  const updateFrameStats = useCanvasStore((s) => s.updateFrameStats);
  const performanceBudget = useCanvasStore((s) => s.performanceBudget);
  const customBudget = useCanvasStore((s) => s.customBudget);
  
  // Compute effective budget locally (stable reference via useMemo)
  const effective = useMemo(() => {
    const preset = PERFORMANCE_BUDGETS[performanceBudget] || PERFORMANCE_BUDGETS.balanced;
    return customBudget ? { ...preset, ...customBudget } : preset;
  }, [performanceBudget, customBudget]);
  
  const [showControls, setShowControls] = React.useState(false);
  
  // Store current values in refs for animation loop (avoids dependency changes)
  const emotionRef = useRef(emotion);
  const mouseRef = useRef(mousePosition);
  const effectiveRef = useRef(effective);
  
  // Keep refs up to date
  useEffect(() => { emotionRef.current = emotion; }, [emotion]);
  useEffect(() => { mouseRef.current = mousePosition; }, [mousePosition]);
  useEffect(() => { effectiveRef.current = effective; }, [effective]);
  
  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasEnabled || !effective.useWebGL || !canvasRef.current) {
      return;
    }
    
    rendererRef.current = new GradientRenderer(canvasRef.current);
    
    // Handle resize
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [canvasEnabled, effective.useWebGL]);
  
  // Animation loop - uses refs to avoid dependency changes causing restarts
  useEffect(() => {
    if (!canvasEnabled) return;
    
    let lastTime = performance.now();
    
    const animate = (timestamp) => {
      const deltaTime = timestamp - lastTime;
      const targetFrameTime = 1000 / (effectiveRef.current?.fps || 60);
      
      // Frame rate limiting
      if (deltaTime >= targetFrameTime) {
        lastTime = timestamp - (deltaTime % targetFrameTime);
        
        // Update emotion transitions
        tickEmotionTransition(deltaTime);
        updateFrameStats(timestamp);
        
        // Render WebGL using ref values (current state without dependency)
        if (rendererRef.current && effectiveRef.current?.useWebGL) {
          rendererRef.current.render(emotionRef.current, mouseRef.current);
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasEnabled, tickEmotionTransition, updateFrameStats]);
  
  // Mouse tracking
  const handleMouseMove = useCallback((e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition(x, y);
  }, [setMousePosition]);
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);
  
  // Keyboard shortcut for controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '`' && e.ctrlKey) {
        setShowControls((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Debug: Log mount and budget info
  useEffect(() => {
    console.log('[LivingCanvas] Mounted', { 
      canvasEnabled, 
      budget: performanceBudget, 
      useWebGL: effective.useWebGL,
      emotion: emotion?.name 
    });
  }, [canvasEnabled, performanceBudget, effective.useWebGL, emotion]);
  
  if (!canvasEnabled) {
    return (
      <div 
        className="fixed inset-0 bg-[#050505]"
        style={{ zIndex: -1 }}
        onDoubleClick={() => setShowControls(true)}
      >
        <AnimatePresence>
          <PerformanceControls isOpen={showControls} onClose={() => setShowControls(false)} />
        </AnimatePresence>
      </div>
    );
  }
  
  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
      onDoubleClick={() => setShowControls(true)}
    >
      {/* WebGL Canvas */}
      {effective.useWebGL ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: canvasEnabled ? 1 : 0 }}
        />
      ) : (
        <CSSGradientLayer emotion={emotion} />
      )}
      
      {/* Ambient Particles */}
      {particlesEnabled && effective.maxParticles > 0 && (
        <AmbientParticles 
          emotion={emotion}
          maxParticles={effective.maxParticles}
          mousePosition={mousePosition}
        />
      )}
      
      {/* Subtle noise overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      
      {/* Performance Controls Overlay */}
      <AnimatePresence>
        <PerformanceControls isOpen={showControls} onClose={() => setShowControls(false)} />
      </AnimatePresence>
      
      {/* Hint for controls */}
      <div className="absolute bottom-2 left-2 text-white/20 text-xs pointer-events-none">
        Ctrl+` or double-click for canvas settings
      </div>
    </div>
  );
}

// Export emotion setter for external use
export { CANVAS_EMOTIONS };
