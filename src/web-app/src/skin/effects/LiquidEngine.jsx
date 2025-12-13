// @version 2.2.516
// TooLoo.ai Liquid Skin Engine - PERFORMANCE OPTIMIZED
// Advanced visual effects: liquid glass, pointer aurora, emotional expression
// Uses refs instead of state for animation values to prevent React re-renders

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

const PERF_CONFIG = {
  // Target FPS - will throttle if needed
  targetFPS: 30,
  // Minimum FPS before quality reduction
  minFPS: 20,
  // Frame time budget (ms)
  frameBudget: 1000 / 30,
  // Enable FPS monitoring
  monitorFPS: true,
  // Auto-reduce quality on low FPS
  autoQuality: true,
};

// ============================================================================
// LIQUID ENGINE CONTEXT
// ============================================================================

const LiquidEngineContext = createContext(null);

// Emotional states that TooLoo can express
export const EMOTIONS = {
  neutral: { hue: 200, saturation: 70, energy: 0.3, pulse: 1.0 },
  thinking: { hue: 260, saturation: 80, energy: 0.6, pulse: 1.5 },
  excited: { hue: 45, saturation: 90, energy: 0.9, pulse: 2.0 },
  calm: { hue: 180, saturation: 60, energy: 0.2, pulse: 0.5 },
  alert: { hue: 0, saturation: 85, energy: 0.8, pulse: 2.5 },
  creative: { hue: 300, saturation: 85, energy: 0.7, pulse: 1.2 },
  processing: { hue: 190, saturation: 100, energy: 0.5, pulse: 1.8 },
  success: { hue: 145, saturation: 80, energy: 0.6, pulse: 1.0 },
  error: { hue: 0, saturation: 90, energy: 0.9, pulse: 3.0 },
};

// ============================================================================
// CENTRALIZED ANIMATION FRAME MANAGER - Prevents multiple RAF loops
// ============================================================================

class AnimationFrameManager {
  constructor() {
    this.subscribers = new Map();
    this.rafId = null;
    this.frame = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.fpsHistory = [];
    this.qualityLevel = 1.0; // 1.0 = full, 0.5 = reduced
  }

  subscribe(id, callback) {
    this.subscribers.set(id, callback);
    if (!this.rafId && this.subscribers.size > 0) {
      this.start();
    }
    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    this.subscribers.delete(id);
    if (this.subscribers.size === 0 && this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  start() {
    this.lastTime = performance.now();
    const loop = (timestamp) => {
      // Calculate FPS
      const delta = timestamp - this.lastTime;
      if (delta > 0) {
        const currentFPS = 1000 / delta;
        this.fpsHistory.push(currentFPS);
        if (this.fpsHistory.length > 30) this.fpsHistory.shift();
        this.fps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

        // Auto-adjust quality
        if (PERF_CONFIG.autoQuality) {
          if (this.fps < PERF_CONFIG.minFPS && this.qualityLevel > 0.3) {
            this.qualityLevel = Math.max(0.3, this.qualityLevel - 0.1);
          } else if (this.fps > 50 && this.qualityLevel < 1.0) {
            this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
          }
        }
      }
      this.lastTime = timestamp;

      // Throttle to target FPS
      if (delta < PERF_CONFIG.frameBudget * 0.8) {
        this.rafId = requestAnimationFrame(loop);
        return;
      }

      this.frame++;

      // Call all subscribers with shared frame data
      const frameData = {
        frame: this.frame,
        delta,
        fps: this.fps,
        quality: this.qualityLevel,
        timestamp,
      };

      this.subscribers.forEach((callback) => {
        try {
          callback(frameData);
        } catch (e) {
          console.error('[LiquidEngine] Animation callback error:', e);
        }
      });

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  getFPS() {
    return Math.round(this.fps);
  }

  getQuality() {
    return this.qualityLevel;
  }
}

// Singleton animation manager
const animationManager = new AnimationFrameManager();

// ============================================================================
// ACCESSIBILITY - Reduced Motion Support
// ============================================================================

/**
 * Hook to detect if user prefers reduced motion
 * Respects OS-level accessibility settings
 */
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is available (SSR safety)
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes (user might toggle setting while app is open)
    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Use modern addEventListener or fallback to deprecated addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
};

// ============================================================================
// POINTER TRACKER - Tracks mouse position globally using REFS (no re-renders)
// ============================================================================

const usePointerTracker = () => {
  // Use ref for pointer to avoid state updates
  const pointerRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const lastPos = useRef({ x: 0, y: 0, time: Date.now() });
  const throttleRef = useRef(null);

  useEffect(() => {
    const handleMove = (e) => {
      const now = Date.now();
      const dt = Math.max(1, now - lastPos.current.time);
      const x = e.clientX;
      const y = e.clientY;

      // Calculate velocity for momentum effects
      const vx = ((x - lastPos.current.x) / dt) * 16;
      const vy = ((y - lastPos.current.y) / dt) * 16;

      lastPos.current = { x, y, time: now };

      // Update ref directly - no state update, no re-render!
      pointerRef.current = { x, y, vx, vy };
    };

    // Throttled handler - max 60 updates/sec
    const throttledMove = (e) => {
      if (throttleRef.current) return;
      throttleRef.current = requestAnimationFrame(() => {
        handleMove(e);
        throttleRef.current = null;
      });
    };

    const handleTouch = (e) => {
      if (e.touches[0]) {
        throttledMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      }
    };

    window.addEventListener('mousemove', throttledMove, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('mousemove', throttledMove);
      window.removeEventListener('touchmove', handleTouch);
      if (throttleRef.current) cancelAnimationFrame(throttleRef.current);
    };
  }, []);

  // Return getter function instead of state
  return useCallback(() => pointerRef.current, []);
};

// ============================================================================
// LIQUID ENGINE PROVIDER - OPTIMIZED (uses refs, not state for animation)
// ============================================================================

export const LiquidEngineProvider = memo(({ children, enabled = true }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const getPointer = usePointerTracker();
  const [emotion, setEmotion] = useState('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState(1.0);

  // Combine user preference with prop - disable animations if user prefers reduced motion
  const effectiveEnabled = enabled && !prefersReducedMotion;

  // Use REFS for animation values to prevent React re-renders
  const animationStateRef = useRef({
    globalPulse: 0,
    ambientPhase: 0,
    frame: 0,
  });

  const emotionTransition = useRef({ from: 'neutral', to: 'neutral', progress: 1 });
  const subscriberIdRef = useRef(`liquid-engine-${Date.now()}`);

  // Centralized animation loop - NO state updates, uses refs
  useEffect(() => {
    if (!effectiveEnabled) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, ({ frame }) => {
      // Update animation state in ref - no re-render!
      animationStateRef.current.frame = frame;
      animationStateRef.current.globalPulse = Math.sin(frame * 0.02) * 0.5 + 0.5;
      animationStateRef.current.ambientPhase = frame * 0.01;
    });

    return unsubscribe;
  }, [enabled]);

  // Emotion transition system
  const transitionEmotion = useCallback((newEmotion, duration = 500) => {
    const startTime = Date.now();
    const from = emotionTransition.current.to;
    emotionTransition.current = { from, to: newEmotion, progress: 0 };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic
      emotionTransition.current.progress = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setEmotion(newEmotion);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Get interpolated emotion values - reads from refs, no state dependency
  const getEmotionValues = useCallback(() => {
    const { from, to, progress } = emotionTransition.current;
    const fromVals = EMOTIONS[from] || EMOTIONS.neutral;
    const toVals = EMOTIONS[to] || EMOTIONS.neutral;

    return {
      hue: fromVals.hue + (toVals.hue - fromVals.hue) * progress,
      saturation: fromVals.saturation + (toVals.saturation - fromVals.saturation) * progress,
      energy: fromVals.energy + (toVals.energy - fromVals.energy) * progress,
      pulse: fromVals.pulse + (toVals.pulse - fromVals.pulse) * progress,
    };
  }, []);

  // Get animation state from ref (for components that need it)
  const getAnimationState = useCallback(() => animationStateRef.current, []);

  // Get performance metrics
  const getPerformance = useCallback(
    () => ({
      fps: animationManager.getFPS(),
      quality: animationManager.getQuality(),
    }),
    []
  );

  // Provide getter function for pointer instead of state
  const value = useMemo(
    () => ({
      enabled: effectiveEnabled, // Respects prefers-reduced-motion
      prefersReducedMotion, // Expose for components that want to know
      getPointer, // Now a getter function
      pointer: getPointer(), // For backward compat (initial value)
      emotion,
      emotionIntensity,
      setEmotionIntensity,
      transitionEmotion,
      getEmotionValues,
      getAnimationState,
      getPerformance,
      // Backward compatibility - these now read from refs
      get globalPulse() {
        return animationStateRef.current.globalPulse;
      },
      get ambientPhase() {
        return animationStateRef.current.ambientPhase;
      },
      EMOTIONS,
      // Animation manager for components that want to subscribe
      animationManager,
    }),
    [
      effectiveEnabled,
      prefersReducedMotion,
      getPointer,
      emotion,
      emotionIntensity,
      transitionEmotion,
      getEmotionValues,
      getAnimationState,
      getPerformance,
    ]
  );

  return <LiquidEngineContext.Provider value={value}>{children}</LiquidEngineContext.Provider>;
});

LiquidEngineProvider.displayName = 'LiquidEngineProvider';

// Hook to use liquid engine
export const useLiquidEngine = () => {
  const context = useContext(LiquidEngineContext);
  if (!context) {
    // Return safe defaults if not in provider
    return {
      enabled: false,
      prefersReducedMotion: false,
      getPointer: () => ({ x: 0, y: 0, vx: 0, vy: 0 }),
      pointer: { x: 0, y: 0, vx: 0, vy: 0 },
      emotion: 'neutral',
      emotionIntensity: 1,
      setEmotionIntensity: () => {},
      transitionEmotion: () => {},
      getEmotionValues: () => EMOTIONS.neutral,
      getAnimationState: () => ({ globalPulse: 0, ambientPhase: 0, frame: 0 }),
      getPerformance: () => ({ fps: 60, quality: 1 }),
      globalPulse: 0,
      ambientPhase: 0,
      EMOTIONS,
      animationManager: null,
    };
  }
  return context;
};

// ============================================================================
// POINTER AURORA - Light that follows cursor (OPTIMIZED - uses RAF subscription)
// ============================================================================

export const PointerAurora = memo(({ size = 300, intensity = 0.6, blur = 80, className = '' }) => {
  const { getPointer, enabled, getEmotionValues, getAnimationState, animationManager } =
    useLiquidEngine();
  const elementRef = useRef(null);
  const smoothPosRef = useRef({ x: 0, y: 0 });
  const subscriberIdRef = useRef(`pointer-aurora-${Date.now()}`);

  // Use centralized animation manager instead of own RAF loop
  useEffect(() => {
    if (!enabled || !animationManager) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
      if (!elementRef.current) return;

      const pointer = getPointer();
      const { globalPulse } = getAnimationState();
      const emotionVals = getEmotionValues();

      // Smooth follow with easing
      smoothPosRef.current.x += (pointer.x - smoothPosRef.current.x) * 0.08;
      smoothPosRef.current.y += (pointer.y - smoothPosRef.current.y) * 0.08;

      const dynamicSize = size * (1 + globalPulse * emotionVals.energy * 0.3);
      const dynamicIntensity = intensity * (0.7 + globalPulse * 0.3);

      // Direct DOM manipulation - no React re-render!
      const el = elementRef.current;
      el.style.left = `${smoothPosRef.current.x - dynamicSize / 2}px`;
      el.style.top = `${smoothPosRef.current.y - dynamicSize / 2}px`;
      el.style.width = `${dynamicSize}px`;
      el.style.height = `${dynamicSize}px`;
      el.style.background = `radial-gradient(circle, 
        hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${dynamicIntensity}) 0%, 
        hsla(${emotionVals.hue + 30}, ${emotionVals.saturation}%, 50%, ${dynamicIntensity * 0.5}) 40%, 
        transparent 70%
      )`;
    });

    return unsubscribe;
  }, [enabled, animationManager, getPointer, getAnimationState, getEmotionValues, size, intensity]);

  if (!enabled) return null;

  return (
    <div
      ref={elementRef}
      className={`pointer-events-none fixed z-0 ${className}`}
      style={{
        filter: `blur(${blur}px)`,
        willChange: 'left, top, width, height, background',
        transform: 'translateZ(0)', // Force GPU layer
      }}
    />
  );
});

PointerAurora.displayName = 'PointerAurora';

// ============================================================================
// LIQUID GLASS - Refractive glass surface effect (OPTIMIZED)
// ============================================================================

export const LiquidGlass = memo(
  ({
    children,
    intensity = 0.5,
    refraction = true,
    ripple = true,
    glow = true,
    className = '',
    style = {},
    ...props
  }) => {
    const containerRef = useRef(null);
    const refractionRef = useRef(null);
    const glowRef = useRef(null);
    const rippleRef = useRef(null);
    const { getPointer, enabled, getEmotionValues, getAnimationState, animationManager } =
      useLiquidEngine();
    const localPointerRef = useRef({ x: 0.5, y: 0.5, inside: false });
    const subscriberIdRef = useRef(`liquid-glass-${Date.now()}`);

    // Use centralized animation for pointer tracking
    useEffect(() => {
      if (!enabled || !animationManager || !containerRef.current) return;

      const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const pointer = getPointer();
        const { ambientPhase } = getAnimationState();
        const emotionVals = getEmotionValues();

        const x = (pointer.x - rect.left) / rect.width;
        const y = (pointer.y - rect.top) / rect.height;
        const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

        localPointerRef.current = {
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          inside,
        };

        const lp = localPointerRef.current;

        // Calculate refraction offset
        const refractionX = refraction ? (lp.x - 0.5) * 10 * intensity : 0;
        const refractionY = refraction ? (lp.y - 0.5) * 10 * intensity : 0;
        const ambientX = Math.sin(ambientPhase) * 2 * intensity;
        const ambientY = Math.cos(ambientPhase * 1.3) * 2 * intensity;

        // Direct DOM updates
        if (refractionRef.current) {
          refractionRef.current.style.background = `
          radial-gradient(
            ellipse 100% 100% at ${lp.x * 100}% ${lp.y * 100}%,
            hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 70%, ${0.1 * intensity * (lp.inside ? 1 : 0.3)}) 0%,
            transparent 50%
          )
        `;
          refractionRef.current.style.transform = `translate(${refractionX + ambientX}px, ${refractionY + ambientY}px)`;
        }

        if (glowRef.current && glow) {
          glowRef.current.style.boxShadow = `
          inset 0 0 ${20 * intensity}px hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${0.1 * intensity}),
          0 0 ${30 * intensity}px hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 50%, ${0.05 * intensity * (lp.inside ? 2 : 1)})
        `;
        }

        if (rippleRef.current && ripple) {
          rippleRef.current.style.display = lp.inside ? 'block' : 'none';
          rippleRef.current.style.left = `${lp.x * 100}%`;
          rippleRef.current.style.top = `${lp.y * 100}%`;
          rippleRef.current.style.background = `radial-gradient(circle, 
          hsla(${emotionVals.hue}, 100%, 70%, 0.2) 0%, 
          transparent 70%
        )`;
        }
      });

      return unsubscribe;
    }, [
      enabled,
      animationManager,
      getPointer,
      getAnimationState,
      getEmotionValues,
      intensity,
      refraction,
      glow,
      ripple,
    ]);

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={style}
        {...props}
      >
        {/* Glass refraction layer */}
        <div
          ref={refractionRef}
          className="absolute inset-0 pointer-events-none z-0"
          style={{ transition: 'transform 0.1s ease-out', willChange: 'transform, background' }}
        />

        {/* Glow edge */}
        {glow && (
          <div
            ref={glowRef}
            className="absolute inset-0 pointer-events-none z-0 rounded-[inherit]"
            style={{ transition: 'box-shadow 0.3s', willChange: 'box-shadow' }}
          />
        )}

        {/* Ripple effect on hover */}
        {ripple && (
          <div
            ref={rippleRef}
            className="absolute pointer-events-none z-0"
            style={{
              display: 'none',
              width: 100,
              height: 100,
              marginLeft: -50,
              marginTop: -50,
              animation: 'liquid-ripple 1s ease-out infinite',
              filter: 'blur(10px)',
              willChange: 'left, top, background',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

LiquidGlass.displayName = 'LiquidGlass';

// ============================================================================
// EMOTIONAL ORBS - Floating orbs (OPTIMIZED - uses direct DOM manipulation)
// ============================================================================

export const EmotionalOrbs = memo(({ count = 5, size = { min: 20, max: 60 }, className = '' }) => {
  const { enabled, getEmotionValues, getAnimationState, animationManager } = useLiquidEngine();
  const containerRef = useRef(null);
  const orbsRef = useRef([]);
  const orbElementsRef = useRef([]);
  const subscriberIdRef = useRef(`emotional-orbs-${Date.now()}`);

  // Initialize orb positions once
  useEffect(() => {
    orbsRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: size.min + Math.random() * (size.max - size.min),
      speed: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count, size.min, size.max]);

  // Animation subscription
  useEffect(() => {
    if (!enabled || !animationManager) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
      const { ambientPhase, globalPulse } = getAnimationState();
      const emotionVals = getEmotionValues();

      orbsRef.current.forEach((orb, i) => {
        const el = orbElementsRef.current[i];
        if (!el) return;

        const x = orb.x + Math.sin(ambientPhase * orb.speed + orb.phase) * 10;
        const y = orb.y + Math.cos(ambientPhase * orb.speed * 0.7 + orb.phase) * 10;
        const scale = 1 + globalPulse * emotionVals.energy * 0.3;
        const opacity = 0.1 + globalPulse * 0.1;
        const orbSize = orb.size * scale;

        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.width = `${orbSize}px`;
        el.style.height = `${orbSize}px`;
        el.style.background = `radial-gradient(circle,
          hsla(${emotionVals.hue + orb.id * 20}, ${emotionVals.saturation}%, 60%, ${opacity}) 0%,
          hsla(${emotionVals.hue + orb.id * 20}, ${emotionVals.saturation}%, 40%, ${opacity * 0.5}) 50%,
          transparent 70%
        )`;
      });
    });

    return unsubscribe;
  }, [enabled, animationManager, getAnimationState, getEmotionValues]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {orbsRef.current.map((orb, i) => (
        <div
          key={orb.id}
          ref={(el) => (orbElementsRef.current[i] = el)}
          className="absolute rounded-full"
          style={{
            filter: `blur(${orb.size / 3}px)`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            willChange: 'left, top, width, height, background',
          }}
        />
      ))}
    </div>
  );
});

EmotionalOrbs.displayName = 'EmotionalOrbs';

// ============================================================================
// BREATH INDICATOR - Subtle breathing animation (OPTIMIZED)
// ============================================================================

export const BreathIndicator = memo(({ size = 'md', showPulse = true, className = '' }) => {
  const { enabled, getEmotionValues, getAnimationState, animationManager } = useLiquidEngine();
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const pulseRef = useRef(null);
  const subscriberIdRef = useRef(`breath-indicator-${Date.now()}`);

  const sizes = {
    sm: { outer: 24, inner: 8 },
    md: { outer: 36, inner: 12 },
    lg: { outer: 48, inner: 16 },
  };

  const s = sizes[size] || sizes.md;

  // Animation subscription
  useEffect(() => {
    if (!enabled || !animationManager) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
      const { globalPulse } = getAnimationState();
      const emotionVals = getEmotionValues();

      const breathScale = 1 + globalPulse * emotionVals.pulse * 0.2;
      const innerScale = 1 + (1 - globalPulse) * emotionVals.pulse * 0.3;

      if (outerRef.current) {
        outerRef.current.style.background = `radial-gradient(circle,
          hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.3) 0%,
          transparent 70%
        )`;
        outerRef.current.style.transform = `scale(${breathScale})`;
      }

      if (innerRef.current) {
        innerRef.current.style.background = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.8)`;
        innerRef.current.style.boxShadow = `0 0 ${s.inner}px hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.5)`;
        innerRef.current.style.transform = `scale(${innerScale})`;
      }

      if (pulseRef.current && showPulse) {
        pulseRef.current.style.border = `2px solid hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${globalPulse * 0.5})`;
        pulseRef.current.style.transform = `scale(${1 + (1 - globalPulse) * 2})`;
        pulseRef.current.style.opacity = globalPulse;
      }
    });

    return unsubscribe;
  }, [enabled, animationManager, getAnimationState, getEmotionValues, s.inner, showPulse]);

  if (!enabled) return null;

  return (
    <div className={`relative ${className}`} style={{ width: s.outer, height: s.outer }}>
      {/* Outer glow */}
      <div
        ref={outerRef}
        className="absolute inset-0 rounded-full"
        style={{ transition: 'transform 0.1s ease-out', willChange: 'transform, background' }}
      />

      {/* Inner core */}
      <div
        ref={innerRef}
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: s.inner,
          height: s.inner,
          marginLeft: -s.inner / 2,
          marginTop: -s.inner / 2,
          transition: 'transform 0.1s ease-out, background 0.3s, box-shadow 0.3s',
          willChange: 'transform, background, box-shadow',
        }}
      />

      {/* Pulse ring */}
      {showPulse && (
        <div
          ref={pulseRef}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: s.inner,
            height: s.inner,
            marginLeft: -s.inner / 2,
            marginTop: -s.inner / 2,
            transition: 'border-color 0.3s',
            willChange: 'transform, opacity, border',
          }}
        />
      )}
    </div>
  );
});

BreathIndicator.displayName = 'BreathIndicator';

// ============================================================================
// LIQUID SURFACE - Animated liquid background (OPTIMIZED)
// ============================================================================

export const LiquidSurface = memo(
  ({
    className = '',
    variant = 'subtle', // subtle, vibrant, neural
    animated = true,
  }) => {
    const { enabled, getEmotionValues, animationManager } = useLiquidEngine();
    const canvasRef = useRef(null);
    const subscriberIdRef = useRef(`liquid-surface-${Date.now()}`);

    useEffect(() => {
      if (!enabled || !animated || !canvasRef.current || !animationManager) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      let frame = 0;

      // Set canvas size
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio, 2); // Cap DPR for performance
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);
      };
      resize();
      window.addEventListener('resize', resize);

      const unsubscribe = animationManager.subscribe(subscriberIdRef.current, ({ quality }) => {
        frame++;

        // Skip frames on low quality
        if (quality < 0.5 && frame % 2 !== 0) return;

        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;

        ctx.clearRect(0, 0, w, h);

        const emotionVals = getEmotionValues();
        const intensity = variant === 'vibrant' ? 0.3 : variant === 'neural' ? 0.2 : 0.1;

        // Reduce blob count on low quality
        const blobCount = quality < 0.5 ? 2 : 3;

        // Draw liquid blobs
        for (let i = 0; i < blobCount; i++) {
          const x = w * (0.3 + 0.4 * Math.sin(frame * 0.005 + i * 2));
          const y = h * (0.3 + 0.4 * Math.cos(frame * 0.007 + i * 2));
          const radius = Math.min(w, h) * (0.2 + 0.1 * Math.sin(frame * 0.01 + i));

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(
            0,
            `hsla(${emotionVals.hue + i * 30}, ${emotionVals.saturation}%, 50%, ${intensity})`
          );
          gradient.addColorStop(
            0.5,
            `hsla(${emotionVals.hue + i * 30}, ${emotionVals.saturation}%, 40%, ${intensity * 0.5})`
          );
          gradient.addColorStop(1, 'transparent');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      return () => {
        window.removeEventListener('resize', resize);
        unsubscribe();
      };
    }, [enabled, animated, variant, getEmotionValues, animationManager]);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ filter: 'blur(40px)', transform: 'translateZ(0)' }}
      />
    );
  }
);

LiquidSurface.displayName = 'LiquidSurface';

// ============================================================================
// CSS KEYFRAMES (inject into document)
// ============================================================================

const injectLiquidStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('liquid-engine-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'liquid-engine-styles';
  styles.textContent = `
    @keyframes liquid-ripple {
      0% {
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
      }
    }

    @keyframes liquid-float {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
      }
      50% {
        transform: translateY(-20px) rotate(5deg);
      }
    }

    @keyframes liquid-morph {
      0%, 100% {
        border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
      }
      50% {
        border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
      }
    }

    @keyframes bounce-dot {
      0%, 100% {
        transform: translateY(0);
        opacity: 1;
      }
      50% {
        transform: translateY(-50%);
        opacity: 0.5;
      }
    }

    @keyframes bar-spin {
      0%, 100% {
        transform: scaleY(0.3);
      }
      50% {
        transform: scaleY(1);
      }
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(300%);
      }
    }
  `;
  document.head.appendChild(styles);
};

// Auto-inject styles
if (typeof window !== 'undefined') {
  injectLiquidStyles();
}

// ============================================================================
// FPS MONITOR - Debug overlay showing performance metrics
// ============================================================================

export const FPSMonitor = memo(
  ({
    show = false,
    position = 'bottom-right', // top-left, top-right, bottom-left, bottom-right
    className = '',
  }) => {
    const { getPerformance, animationManager } = useLiquidEngine();
    const elementRef = useRef(null);
    const subscriberIdRef = useRef(`fps-monitor-${Date.now()}`);
    const [isVisible, setIsVisible] = useState(show);

    // Toggle with keyboard shortcut (Ctrl+Shift+F)
    useEffect(() => {
      const handleKeydown = (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
          setIsVisible((prev) => !prev);
        }
      };
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    useEffect(() => {
      if (!isVisible || !animationManager) return;

      const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
        if (!elementRef.current) return;

        const perf = getPerformance();
        const fps = perf.fps;
        const quality = Math.round(perf.quality * 100);

        // Color based on FPS
        let color = '#22c55e'; // green
        if (fps < 30) color = '#f59e0b'; // yellow
        if (fps < 20) color = '#ef4444'; // red

        elementRef.current.innerHTML = `
        <div style="color: ${color}; font-weight: bold;">${fps} FPS</div>
        <div style="font-size: 10px; opacity: 0.7;">Quality: ${quality}%</div>
      `;
      });

      return unsubscribe;
    }, [isVisible, animationManager, getPerformance]);

    if (!isVisible) return null;

    const positions = {
      'top-left': { top: 8, left: 8 },
      'top-right': { top: 8, right: 8 },
      'bottom-left': { bottom: 8, left: 8 },
      'bottom-right': { bottom: 8, right: 8 },
    };

    return (
      <div
        ref={elementRef}
        className={`fixed z-[9999] bg-black/80 text-white px-2 py-1 rounded text-xs font-mono ${className}`}
        style={{
          ...positions[position],
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      >
        -- FPS
      </div>
    );
  }
);

FPSMonitor.displayName = 'FPSMonitor';

export default {
  LiquidEngineProvider,
  useLiquidEngine,
  PointerAurora,
  LiquidGlass,
  EmotionalOrbs,
  BreathIndicator,
  LiquidSurface,
  FPSMonitor,
  EMOTIONS,
  // Export animation manager for advanced usage
  animationManager,
};
