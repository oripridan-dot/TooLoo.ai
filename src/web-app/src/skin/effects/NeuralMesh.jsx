// @version 2.2.516
// TooLoo.ai Neural Mesh - PERFORMANCE OPTIMIZED
// Connected particles that form TooLoo's neural visualization
// Uses centralized animation manager and object pooling

import React, { useRef, useEffect, memo, useState, useCallback } from 'react';
import { useLiquidEngine, EMOTIONS } from './LiquidEngine';

// ============================================================================
// PERFORMANCE CONFIGURATION
// ============================================================================

const NEURAL_PERF = {
  // Maximum particles before quality reduction
  maxParticles: 80,
  // Connection distance reduction factor on low quality
  connectionQualityFactor: 0.7,
  // Skip connection checks for performance
  skipConnectionsOnLowFPS: true,
  // Minimum quality level to draw connections
  minQualityForConnections: 0.4,
};

// ============================================================================
// NEURAL MESH - Particle network visualization (OPTIMIZED)
// ============================================================================

export const NeuralMesh = memo(
  ({
    particleCount = 50,
    connectionDistance = 150,
    particleSize = { min: 2, max: 4 },
    speed = 0.5,
    mouseInfluence = 100,
    className = '',
  }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const { enabled, getPointer, getEmotionValues, getAnimationState, animationManager } =
      useLiquidEngine();
    const subscriberIdRef = useRef(`neural-mesh-${Date.now()}`);
    const rectRef = useRef(null);

    // Initialize particles with object pooling
    useEffect(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const effectiveCount = Math.min(particleCount, NEURAL_PERF.maxParticles);

      particlesRef.current = Array.from({ length: effectiveCount }, () => ({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: particleSize.min + Math.random() * (particleSize.max - particleSize.min),
        phase: Math.random() * Math.PI * 2,
      }));
    }, [particleCount, speed, particleSize.min, particleSize.max]);

    // Optimized animation using centralized manager
    useEffect(() => {
      if (!enabled || !canvasRef.current || !animationManager) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: true });

      // Handle resize with debounce
      let resizeTimeout;
      const resize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const dpr = Math.min(window.devicePixelRatio, 2); // Cap for performance
          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          rectRef.current = canvas.getBoundingClientRect();
        }, 100);
      };
      resize();
      window.addEventListener('resize', resize);

      // Subscribe to centralized animation manager
      const unsubscribe = animationManager.subscribe(
        subscriberIdRef.current,
        ({ frame, quality }) => {
          const w = canvas.offsetWidth;
          const h = canvas.offsetHeight;

          // Clear with slight fade for trail effect (optional, can remove for perf)
          ctx.clearRect(0, 0, w, h);

          const emotionVals = getEmotionValues();
          const { globalPulse } = getAnimationState();
          const particles = particlesRef.current;
          const pointer = getPointer();

          // Get canvas position for pointer interaction
          if (!rectRef.current) rectRef.current = canvas.getBoundingClientRect();
          const rect = rectRef.current;
          const mouseX = pointer.x - rect.left;
          const mouseY = pointer.y - rect.top;

          // Adjust connection distance based on quality
          const effectiveConnectionDistance =
            quality < 0.5
              ? connectionDistance * NEURAL_PERF.connectionQualityFactor
              : connectionDistance;

          // Skip connections on very low quality
          const drawConnections = quality >= NEURAL_PERF.minQualityForConnections;

          // Batch particle updates and drawing
          const len = particles.length;

          // Pre-calculate shared values
          const alpha = 0.3 + globalPulse * 0.3;
          const hue = emotionVals.hue;
          const sat = emotionVals.saturation;
          const energy = emotionVals.energy;
          const framePhase = frame * 0.01;

          for (let i = 0; i < len; i++) {
            const p = particles[i];

            // Mouse influence - only calculate if mouse is in canvas
            if (mouseX > 0 && mouseX < w && mouseY > 0 && mouseY < h) {
              const dx = mouseX - p.x;
              const dy = mouseY - p.y;
              const distSq = dx * dx + dy * dy;
              const influenceSq = mouseInfluence * mouseInfluence;

              if (distSq < influenceSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = ((mouseInfluence - dist) / mouseInfluence) * 0.5;
                p.vx -= (dx / dist) * force * energy;
                p.vy -= (dy / dist) * force * energy;
              }
            }

            // Organic motion
            p.vx += Math.sin(framePhase + p.phase) * 0.02 * energy;
            p.vy += Math.cos(framePhase + p.phase * 1.3) * 0.02 * energy;

            // Apply velocity
            p.x += p.vx;
            p.y += p.vy;

            // Dampen velocity
            p.vx *= 0.99;
            p.vy *= 0.99;

            // Wrap around edges
            if (p.x < 0) p.x = w;
            else if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            else if (p.y > h) p.y = 0;

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + globalPulse * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, ${sat}%, 60%, ${alpha})`;
            ctx.fill();

            // Draw connections (only check particles ahead to avoid duplicates)
            if (drawConnections) {
              const connectionDistSq = effectiveConnectionDistance * effectiveConnectionDistance;

              // Only check every other particle on lower quality
              const step = quality < 0.7 ? 2 : 1;

              for (let j = i + step; j < len; j += step) {
                const other = particles[j];
                const cdx = other.x - p.x;
                const cdy = other.y - p.y;
                const cdistSq = cdx * cdx + cdy * cdy;

                if (cdistSq < connectionDistSq) {
                  const cdist = Math.sqrt(cdistSq);
                  const connectionAlpha =
                    (1 - cdist / effectiveConnectionDistance) * 0.15 * (0.5 + globalPulse * 0.5);
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(other.x, other.y);
                  ctx.strokeStyle = `hsla(${hue}, ${sat}%, 60%, ${connectionAlpha})`;
                  ctx.lineWidth = 1;
                  ctx.stroke();
                }
              }
            }
          }

          // Draw mouse glow (simplified gradient)
          if (mouseX > 0 && mouseX < w && mouseY > 0 && mouseY < h) {
            const gradient = ctx.createRadialGradient(
              mouseX,
              mouseY,
              0,
              mouseX,
              mouseY,
              mouseInfluence
            );
            gradient.addColorStop(0, `hsla(${hue}, ${sat}%, 60%, 0.1)`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, mouseInfluence, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      );

      return () => {
        window.removeEventListener('resize', resize);
        clearTimeout(resizeTimeout);
        unsubscribe();
      };
    }, [
      enabled,
      animationManager,
      getPointer,
      getEmotionValues,
      getAnimationState,
      connectionDistance,
      mouseInfluence,
    ]);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ transform: 'translateZ(0)' }} // Force GPU layer
      />
    );
  }
);

NeuralMesh.displayName = 'NeuralMesh';

// ============================================================================
// SYNAPSE PULSE - Connection lines that pulse with data flow
// ============================================================================

export const SynapsePulse = memo(
  ({
    from, // { x, y } or ref to element
    to, // { x, y } or ref to element
    active = true,
    pulseSpeed = 2,
    className = '',
  }) => {
    const pathRef = useRef(null);
    const [pathD, setPathD] = useState('');
    const { enabled, getEmotionValues, globalPulse } = useLiquidEngine();

    // Calculate bezier curve between points
    useEffect(() => {
      const getPoint = (source) => {
        if (!source) return { x: 0, y: 0 };
        if (source.current) {
          const rect = source.current.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return source;
      };

      const fromPoint = getPoint(from);
      const toPoint = getPoint(to);

      // Calculate control points for curved path
      const midX = (fromPoint.x + toPoint.x) / 2;
      const midY = (fromPoint.y + toPoint.y) / 2;
      const offsetX = (toPoint.y - fromPoint.y) * 0.3;
      const offsetY = (fromPoint.x - toPoint.x) * 0.3;

      const d = `M ${fromPoint.x} ${fromPoint.y} Q ${midX + offsetX} ${midY + offsetY} ${toPoint.x} ${toPoint.y}`;
      setPathD(d);
    }, [from, to]);

    if (!enabled || !active || !pathD) return null;

    const emotionVals = getEmotionValues();

    return (
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible ${className}`}
      >
        <defs>
          <linearGradient id="synapse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              stopColor={`hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0)`}
            />
            <stop
              offset="50%"
              stopColor={`hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.8)`}
            />
            <stop
              offset="100%"
              stopColor={`hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0)`}
            />
          </linearGradient>
        </defs>

        {/* Background path */}
        <path
          d={pathD}
          fill="none"
          stroke={`hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.1)`}
          strokeWidth="2"
        />

        {/* Animated pulse */}
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke="url(#synapse-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: '20 80',
            strokeDashoffset: globalPulse * 100 * pulseSpeed,
            filter: `drop-shadow(0 0 4px hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 0.5))`,
          }}
        />
      </svg>
    );
  }
);

SynapsePulse.displayName = 'SynapsePulse';

// ============================================================================
// DATA FLOW - Visual representation of data moving through system (OPTIMIZED)
// ============================================================================

export const DataFlow = memo(
  ({
    direction = 'horizontal', // horizontal, vertical, circular
    speed = 1,
    density = 5,
    className = '',
  }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const { enabled, getEmotionValues, getAnimationState, animationManager } = useLiquidEngine();
    const subscriberIdRef = useRef(`data-flow-${Date.now()}`);

    useEffect(() => {
      if (!enabled || !canvasRef.current || !animationManager) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: true });

      let resizeTimeout;
      const resize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const dpr = Math.min(window.devicePixelRatio, 2);
          canvas.width = canvas.offsetWidth * dpr;
          canvas.height = canvas.offsetHeight * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }, 100);
      };
      resize();
      window.addEventListener('resize', resize);

      // Initialize flow particles
      particlesRef.current = Array.from({ length: density * 10 }, (_, i) => ({
        pos: Math.random(),
        lane: Math.floor(Math.random() * density),
        speed: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.4,
      }));

      const unsubscribe = animationManager.subscribe(subscriberIdRef.current, ({ quality }) => {
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        ctx.clearRect(0, 0, w, h);

        const emotionVals = getEmotionValues();
        const { globalPulse } = getAnimationState();
        const particles = particlesRef.current;

        // Skip some particles on low quality
        const step = quality < 0.5 ? 2 : 1;

        for (let i = 0; i < particles.length; i += step) {
          const p = particles[i];

          // Update position
          p.pos += p.speed * speed * 0.005 * (1 + emotionVals.energy);
          if (p.pos > 1) p.pos = 0;

          // Calculate position based on direction
          let x, y;
          if (direction === 'horizontal') {
            x = p.pos * w;
            y = (p.lane + 0.5) * (h / density);
          } else if (direction === 'vertical') {
            x = (p.lane + 0.5) * (w / density);
            y = p.pos * h;
          } else {
            const angle = p.pos * Math.PI * 2 + (p.lane / density) * Math.PI * 2;
            const radius = Math.min(w, h) * 0.3 + p.lane * 10;
            x = w / 2 + Math.cos(angle) * radius;
            y = h / 2 + Math.sin(angle) * radius;
          }

          // Simplified drawing on low quality
          if (quality < 0.6) {
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${p.alpha * (0.5 + globalPulse * 0.5)})`;
            ctx.fill();
          } else {
            // Draw particle with gradient
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
            gradient.addColorStop(
              0,
              `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${p.alpha * (0.5 + globalPulse * 0.5)})`
            );
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(x, y, p.size * (1 + globalPulse * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          }
        }
      });

      return () => {
        window.removeEventListener('resize', resize);
        clearTimeout(resizeTimeout);
        unsubscribe();
      };
    }, [enabled, animationManager, direction, speed, density, getEmotionValues, getAnimationState]);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ transform: 'translateZ(0)' }}
      />
    );
  }
);

DataFlow.displayName = 'DataFlow';

// ============================================================================
// ACTIVITY RINGS - Concentric rings showing activity levels
// ============================================================================

export const ActivityRings = memo(
  ({
    rings = [
      { value: 0.7, label: 'Neural' },
      { value: 0.5, label: 'Memory' },
      { value: 0.9, label: 'Process' },
    ],
    size = 120,
    thickness = 8,
    gap = 4,
    className = '',
  }) => {
    const { enabled, getEmotionValues, globalPulse } = useLiquidEngine();

    if (!enabled) {
      // Fallback static render
      return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
          {rings.map((ring, i) => {
            const radius = (size - thickness) / 2 - i * (thickness + gap);
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - ring.value);

            return (
              <svg key={i} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={thickness}
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={`hsl(${180 + i * 30}, 70%, 50%)`}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
            );
          })}
        </div>
      );
    }

    const emotionVals = getEmotionValues();

    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        {rings.map((ring, i) => {
          const radius = (size - thickness) / 2 - i * (thickness + gap);
          const circumference = 2 * Math.PI * radius;
          const animatedValue = ring.value * (0.9 + globalPulse * 0.1 * emotionVals.energy);
          const offset = circumference * (1 - animatedValue);
          const hue = emotionVals.hue + i * 30;

          return (
            <svg key={i} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={thickness}
              />
              {/* Active ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`hsla(${hue}, ${emotionVals.saturation}%, 55%, 0.9)`}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                  filter: `drop-shadow(0 0 ${4 + globalPulse * 4}px hsla(${hue}, ${emotionVals.saturation}%, 55%, 0.5))`,
                  transition: 'stroke-dashoffset 0.3s ease-out',
                }}
              />
            </svg>
          );
        })}

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div
              className="text-lg font-bold"
              style={{ color: `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, 1)` }}
            >
              {Math.round((rings.reduce((acc, r) => acc + r.value, 0) / rings.length) * 100)}%
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Activity</div>
          </div>
        </div>
      </div>
    );
  }
);

ActivityRings.displayName = 'ActivityRings';

export default {
  NeuralMesh,
  SynapsePulse,
  DataFlow,
  ActivityRings,
};
