// @version 3.3.298
// TooLoo.ai Liquid Creation Space
// Where thought becomes visual reality
//
// This is not a chat - it's a manifestation engine.
// Every response emerges from TooLoo's thinking process,
// visualized through liquid glass, gestalt principles, and creative freedom.

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  useAnimationFrame,
} from 'framer-motion';

// ============================================================================
// GESTALT PRINCIPLES ENGINE
// Applies perceptual organization to visual elements
// ============================================================================

const GestaltPrinciples = {
  // Proximity: Elements close together are perceived as groups
  proximity: (elements, threshold = 50) => {
    const groups = [];
    const used = new Set();

    elements.forEach((el, i) => {
      if (used.has(i)) return;
      const group = [el];
      used.add(i);

      elements.forEach((other, j) => {
        if (i !== j && !used.has(j)) {
          const dist = Math.hypot(el.x - other.x, el.y - other.y);
          if (dist < threshold) {
            group.push(other);
            used.add(j);
          }
        }
      });

      if (group.length > 0) groups.push(group);
    });

    return groups;
  },

  // Continuity: Elements arranged in a line are perceived as related
  continuity: (start, end, steps = 8) => {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Bezier curve for smooth continuity
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * 20;
      points.push({ x, y, t });
    }
    return points;
  },

  // Figure-ground: Distinguish foreground from background
  figureGround: (depth = 0) => ({
    zIndex: 10 - depth,
    opacity: 1 - depth * 0.2,
    blur: depth * 2,
    scale: 1 - depth * 0.1,
  }),
};

// ============================================================================
// THOUGHT PARTICLE - Individual thought emerging from the void
// ============================================================================

const ThoughtParticle = memo(
  ({ x, y, delay = 0, size = 4, color = 'cyan', lifetime = 3, onComplete }) => {
    const colorMap = {
      cyan: ['#06B6D4', '#22D3EE'],
      purple: ['#8B5CF6', '#A78BFA'],
      pink: ['#EC4899', '#F472B6'],
      emerald: ['#10B981', '#34D399'],
      amber: ['#F59E0B', '#FBBF24'],
    };

    const [c1, c2] = colorMap[color] || colorMap.cyan;

    return (
      <motion.circle
        cx={x}
        cy={y}
        r={size}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.5, 1, 0.5, 0],
          opacity: [0, 1, 0.8, 0.4, 0],
          cy: [y, y - 30, y - 50, y - 80, y - 120],
        }}
        transition={{
          duration: lifetime,
          delay,
          ease: [0.4, 0, 0.2, 1],
        }}
        onAnimationComplete={onComplete}
      >
        <animate
          attributeName="fill"
          values={`${c1};${c2};${c1}`}
          dur="1s"
          repeatCount="indefinite"
        />
      </motion.circle>
    );
  }
);

// ============================================================================
// EMERGENCE FIELD - The void from which thoughts materialize
// ============================================================================

export const EmergenceField = memo(
  ({ isActive = false, intensity = 0.5, width = '100%', height = 200, className = '' }) => {
    const [particles, setParticles] = useState([]);
    const fieldRef = useRef(null);
    const particleIdRef = useRef(0);

    // Spawn particles when active
    useEffect(() => {
      if (!isActive) return;

      const spawn = () => {
        const rect = fieldRef.current?.getBoundingClientRect();
        if (!rect) return;

        const count = Math.floor(intensity * 5) + 1;
        const newParticles = [];

        for (let i = 0; i < count; i++) {
          newParticles.push({
            id: particleIdRef.current++,
            x: Math.random() * rect.width,
            y: rect.height - 20,
            delay: i * 0.1,
            size: 2 + Math.random() * 4,
            color: ['cyan', 'purple', 'pink'][Math.floor(Math.random() * 3)],
            lifetime: 2 + Math.random() * 2,
          });
        }

        setParticles((prev) => [...prev, ...newParticles]);
      };

      const interval = setInterval(spawn, 200 / intensity);
      spawn();

      return () => clearInterval(interval);
    }, [isActive, intensity]);

    // Remove completed particles
    const handleParticleComplete = useCallback((id) => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, []);

    return (
      <div
        ref={fieldRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {/* The void - liquid glass backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: isActive
              ? 'radial-gradient(ellipse at center bottom, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.05) 40%, transparent 70%)'
              : 'transparent',
          }}
          animate={{
            opacity: isActive ? [0.5, 1, 0.7, 1, 0.5] : 0,
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Particles SVG layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <g filter="url(#particleGlow)">
            <AnimatePresence>
              {particles.map((p) => (
                <ThoughtParticle
                  key={p.id}
                  {...p}
                  onComplete={() => handleParticleComplete(p.id)}
                />
              ))}
            </AnimatePresence>
          </g>
        </svg>

        {/* Horizon line - where thought meets reality */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), rgba(139, 92, 246, 0.5), transparent)',
          }}
          animate={{
            opacity: isActive ? [0.3, 0.8, 0.3] : 0.1,
            scaleX: isActive ? [0.8, 1, 0.8] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
    );
  }
);

EmergenceField.displayName = 'EmergenceField';

// ============================================================================
// THOUGHT STREAM - Visual representation of thinking process
// ============================================================================

export const ThoughtStream = memo(
  ({
    thoughts = [], // Array of { text, type, confidence }
    isActive = false,
    className = '',
  }) => {
    const streamRef = useRef(null);

    return (
      <motion.div
        ref={streamRef}
        className={`relative ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 1 : 0 }}
      >
        {/* Neural pathway visualization */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <defs>
            <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Flowing thought lines */}
          {[...Array(3)].map((_, i) => (
            <motion.path
              key={`thought-line-${i}`}
              d={`M0,${20 + i * 15} Q50,${10 + i * 15} 100,${20 + i * 15} T200,${20 + i * 15}`}
              stroke="url(#streamGrad)"
              strokeWidth="1"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: isActive ? 1 : 0,
                opacity: isActive ? 0.5 : 0,
              }}
              transition={{
                pathLength: { duration: 2, delay: i * 0.3 },
                opacity: { duration: 0.5 },
              }}
            />
          ))}
        </svg>

        {/* Thought bubbles */}
        <div className="flex flex-wrap gap-2 p-3">
          <AnimatePresence mode="popLayout">
            {thoughts.map((thought, i) => (
              <motion.span
                key={`${thought.text}-${i}`}
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: thought.confidence || 0.7, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: -10 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: i * 0.05,
                }}
                className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${thought.type === 'concept' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : ''}
                ${thought.type === 'connection' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : ''}
                ${thought.type === 'insight' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : ''}
                ${thought.type === 'question' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : ''}
              `}
              >
                {thought.type === 'question' && '? '}
                {thought.type === 'insight' && '💡 '}
                {thought.text}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }
);

ThoughtStream.displayName = 'ThoughtStream';

// ============================================================================
// MANIFESTATION CONTAINER - Where thought artifacts appear
// ============================================================================

export const ManifestationContainer = memo(
  ({
    children,
    isEmerging = false,
    emergenceProgress = 0, // 0 to 1
    variant = 'default', // default, insight, creation, analysis
    className = '',
  }) => {
    const variants = {
      default: {
        border: 'border-white/10',
        glow: 'rgba(255, 255, 255, 0.05)',
        accent: '#ffffff',
      },
      insight: {
        border: 'border-purple-500/30',
        glow: 'rgba(139, 92, 246, 0.1)',
        accent: '#8B5CF6',
      },
      creation: {
        border: 'border-cyan-500/30',
        glow: 'rgba(6, 182, 212, 0.1)',
        accent: '#06B6D4',
      },
      analysis: {
        border: 'border-emerald-500/30',
        glow: 'rgba(16, 185, 129, 0.1)',
        accent: '#10B981',
      },
    };

    const config = variants[variant] || variants.default;

    // Liquid glass effect with emergence animation
    const glassStyle = useMemo(
      () => ({
        background: `
      linear-gradient(135deg, 
        rgba(255, 255, 255, 0.03) 0%, 
        rgba(255, 255, 255, 0.01) 50%,
        ${config.glow} 100%)
    `,
        backdropFilter: `blur(${8 + emergenceProgress * 4}px)`,
        boxShadow: isEmerging
          ? `
      0 0 ${20 * emergenceProgress}px ${config.glow},
      inset 0 0 ${30 * emergenceProgress}px rgba(255, 255, 255, 0.02)
    `
          : 'none',
      }),
      [config, emergenceProgress, isEmerging]
    );

    return (
      <motion.div
        className={`relative rounded-2xl ${config.border} overflow-hidden ${className}`}
        style={glassStyle}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          borderColor: isEmerging
            ? `${config.accent}${Math.floor(emergenceProgress * 80)
                .toString(16)
                .padStart(2, '0')}`
            : undefined,
        }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* Emergence glow effect */}
        {isEmerging && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${config.glow} 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Top emergence line */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.accent}, transparent)`,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{
            scaleX: emergenceProgress,
            opacity: emergenceProgress * 0.8,
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>

        {/* Corner accents using Gestalt continuity */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <motion.path
            d="M0,20 Q0,0 20,0"
            stroke={config.accent}
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: emergenceProgress,
              opacity: emergenceProgress * 0.5,
            }}
          />
          <motion.path
            d="M100%,20 Q100%,0 calc(100% - 20),0"
            stroke={config.accent}
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: emergenceProgress,
              opacity: emergenceProgress * 0.5,
            }}
          />
        </svg>
      </motion.div>
    );
  }
);

ManifestationContainer.displayName = 'ManifestationContainer';

// ============================================================================
// ARTIFACT CARD - A crystallized piece of thought/insight
// ============================================================================

export const ArtifactCard = memo(
  ({
    type = 'insight', // insight, diagram, code, data, creative
    title,
    children,
    metadata = {},
    isNew = false,
    onInteract,
    className = '',
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const typeConfig = {
      insight: {
        icon: '💡',
        accent: 'purple',
        gradient: 'from-purple-500/20 to-purple-600/5',
      },
      diagram: {
        icon: '📊',
        accent: 'cyan',
        gradient: 'from-cyan-500/20 to-cyan-600/5',
      },
      code: {
        icon: '⚡',
        accent: 'emerald',
        gradient: 'from-emerald-500/20 to-emerald-600/5',
      },
      data: {
        icon: '📈',
        accent: 'blue',
        gradient: 'from-blue-500/20 to-blue-600/5',
      },
      creative: {
        icon: '🎨',
        accent: 'pink',
        gradient: 'from-pink-500/20 to-pink-600/5',
      },
    };

    const config = typeConfig[type] || typeConfig.insight;

    return (
      <motion.div
        className={`relative group ${className}`}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        whileHover={{ scale: 1.01, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* New indicator pulse */}
        {isNew && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Card content */}
        <div
          className={`
        relative rounded-xl overflow-hidden
        bg-gradient-to-br ${config.gradient}
        border border-${config.accent}-500/20
        backdrop-blur-sm
        transition-all duration-300
        ${isHovered ? `border-${config.accent}-500/40 shadow-lg shadow-${config.accent}-500/10` : ''}
      `}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
            <span className="text-xl">{config.icon}</span>
            <div className="flex-1 min-w-0">
              {title && <h4 className="text-sm font-medium text-white truncate">{title}</h4>}
              {metadata.source && <span className="text-xs text-gray-500">{metadata.source}</span>}
            </div>

            {/* Expand button */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isExpanded ? (
                  <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
            </motion.button>
          </div>

          {/* Content */}
          <motion.div className="px-4 py-3" animate={{ height: isExpanded ? 'auto' : 'auto' }}>
            {children}
          </motion.div>

          {/* Metadata footer */}
          {(metadata.timestamp || metadata.confidence) && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-xs text-gray-500">
              {metadata.timestamp && (
                <span>{new Date(metadata.timestamp).toLocaleTimeString()}</span>
              )}
              {metadata.confidence && (
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full bg-${config.accent}-400`} />
                  {Math.round(metadata.confidence * 100)}% confidence
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ArtifactCard.displayName = 'ArtifactCard';

// ============================================================================
// LIQUID RESPONSE SURFACE - The canvas where responses materialize
// ============================================================================

export const LiquidResponseSurface = memo(
  ({
    children,
    isThinking = false,
    thinkingPhase = 'idle', // idle, connecting, analyzing, creating, emerging
    emotionalState = 'neutral',
    className = '',
  }) => {
    const surfaceRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
      const updateDimensions = () => {
        if (surfaceRef.current) {
          setDimensions({
            width: surfaceRef.current.offsetWidth,
            height: surfaceRef.current.offsetHeight,
          });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Phase-based visual configuration
    const phaseConfig = {
      idle: {
        bgOpacity: 0,
        meshOpacity: 0,
        particleCount: 0,
      },
      connecting: {
        bgOpacity: 0.05,
        meshOpacity: 0.3,
        particleCount: 10,
      },
      analyzing: {
        bgOpacity: 0.08,
        meshOpacity: 0.5,
        particleCount: 20,
      },
      creating: {
        bgOpacity: 0.12,
        meshOpacity: 0.7,
        particleCount: 30,
      },
      emerging: {
        bgOpacity: 0.15,
        meshOpacity: 0.8,
        particleCount: 15,
      },
    };

    const config = phaseConfig[thinkingPhase] || phaseConfig.idle;

    return (
      <motion.div
        ref={surfaceRef}
        className={`relative min-h-[200px] ${className}`}
        style={{
          background: `radial-gradient(ellipse at center, rgba(139, 92, 246, ${config.bgOpacity}) 0%, transparent 70%)`,
        }}
      >
        {/* Neural mesh background */}
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: config.meshOpacity * 0.3 }}
        >
          <defs>
            <pattern
              id="neuralMesh"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="rgba(139, 92, 246, 0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neuralMesh)" />

          {/* Dynamic connection lines during thinking */}
          {isThinking && (
            <g opacity={config.meshOpacity * 0.5}>
              {[...Array(5)].map((_, i) => (
                <motion.line
                  key={`connection-line-${i}`}
                  x1={`${10 + i * 20}%`}
                  y1="50%"
                  x2={`${20 + i * 20}%`}
                  y2="50%"
                  stroke="url(#streamGrad)"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  animate={{
                    pathLength: [0, 1, 0],
                    y1: ['45%', '55%', '45%'],
                    y2: ['55%', '45%', '55%'],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                />
              ))}
            </g>
          )}
        </motion.svg>

        {/* Phase indicator */}
        {thinkingPhase !== 'idle' && (
          <motion.div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-xs text-gray-300 capitalize">{thinkingPhase}...</span>
          </motion.div>
        )}

        {/* Content layer */}
        <div className="relative z-10">{children}</div>

        {/* Emergence field at bottom */}
        {isThinking && (
          <EmergenceField
            isActive={true}
            intensity={config.particleCount / 30}
            height={100}
            className="absolute bottom-0 left-0 right-0"
          />
        )}
      </motion.div>
    );
  }
);

LiquidResponseSurface.displayName = 'LiquidResponseSurface';

// ============================================================================
// STANDBY PRESENCE - TooLoo at rest, ready to awaken
// ============================================================================

export const StandbyPresence = memo(({ isActive = false, onActivate, className = '' }) => {
  const [breathPhase, setBreathPhase] = useState(0);

  // Gentle breathing animation
  useEffect(() => {
    if (isActive) return;

    const interval = setInterval(() => {
      setBreathPhase((prev) => (prev + 0.05) % (Math.PI * 2));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  const breathScale = 1 + Math.sin(breathPhase) * 0.05;
  const breathGlow = 0.3 + Math.sin(breathPhase) * 0.2;

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onActivate}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer breathing ring */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(139, 92, 246, ${breathGlow * 0.3}) 0%, transparent 70%)`,
          transform: `scale(${breathScale})`,
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute w-24 h-24 rounded-full border border-purple-500/20"
        animate={
          isActive
            ? {
                scale: [1, 2, 1],
                opacity: [0.5, 0, 0.5],
              }
            : {
                scale: breathScale,
              }
        }
        transition={
          isActive
            ? {
                duration: 1.5,
                repeat: Infinity,
              }
            : {
                duration: 0.05,
              }
        }
      />

      {/* Core presence */}
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.2) 100%)`,
          boxShadow: `
            0 0 ${20 * breathGlow}px rgba(139, 92, 246, ${breathGlow}),
            inset 0 0 20px rgba(255, 255, 255, 0.1)
          `,
        }}
        animate={
          isActive
            ? {
                scale: [1, 1.1, 1],
              }
            : {
                scale: breathScale * 0.98,
              }
        }
        transition={
          isActive
            ? {
                duration: 0.5,
                repeat: Infinity,
              }
            : {
                duration: 0.05,
              }
        }
      >
        {/* Eye */}
        <motion.div
          className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-200"
          animate={
            isActive
              ? {
                  scale: [1, 0.9, 1],
                }
              : {
                  opacity: [0.8, 1, 0.8],
                }
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500"
            animate={{
              scale: isActive ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
          />
        </motion.div>
      </motion.div>

      {/* Activation hint */}
      {!isActive && (
        <motion.p
          className="absolute -bottom-8 text-xs text-gray-500"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Tap to activate
        </motion.p>
      )}
    </motion.div>
  );
});

StandbyPresence.displayName = 'StandbyPresence';

// ============================================================================
// CREATIVE COMPOSITION - Multi-artifact layout with gestalt grouping
// ============================================================================

export const CreativeComposition = memo(
  ({
    artifacts = [], // Array of artifact components
    layout = 'flow', // flow, grid, radial, cascade
    className = '',
  }) => {
    const layoutStyles = {
      flow: 'flex flex-wrap gap-4',
      grid: 'grid grid-cols-2 gap-4',
      radial: 'relative', // Uses absolute positioning
      cascade: 'space-y-4',
    };

    if (layout === 'radial' && artifacts.length > 0) {
      const centerX = 50;
      const centerY = 50;
      const radius = 35;

      return (
        <div className={`relative w-full min-h-[400px] ${className}`}>
          {/* Center hub */}
          <div
            className="absolute w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"
            style={{
              left: `calc(${centerX}% - 40px)`,
              top: `calc(${centerY}% - 40px)`,
            }}
          >
            <span className="text-2xl">🧠</span>
          </div>

          {/* Radially positioned artifacts */}
          {artifacts.map((artifact, i) => {
            const angle = (i / artifacts.length) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            return (
              <motion.div
                key={`artifact-circle-${i}`}
                className="absolute w-48"
                style={{
                  left: `calc(${x}% - 96px)`,
                  top: `calc(${y}% - 40px)`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                {artifact}
              </motion.div>
            );
          })}

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {artifacts.map((_, i) => {
              const angle = (i / artifacts.length) * Math.PI * 2 - Math.PI / 2;
              const x = centerX + Math.cos(angle) * (radius * 0.6);
              const y = centerY + Math.sin(angle) * (radius * 0.6);

              return (
                <motion.line
                  key={`artifact-line-${i}`}
                  x1={`${centerX}%`}
                  y1={`${centerY}%`}
                  x2={`${x}%`}
                  y2={`${y}%`}
                  stroke="rgba(139, 92, 246, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                />
              );
            })}
          </svg>
        </div>
      );
    }

    return (
      <div className={`${layoutStyles[layout]} ${className}`}>
        {artifacts.map((artifact, i) => (
          <motion.div
            key={`artifact-list-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {artifact}
          </motion.div>
        ))}
      </div>
    );
  }
);

CreativeComposition.displayName = 'CreativeComposition';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  EmergenceField,
  ThoughtStream,
  ManifestationContainer,
  ArtifactCard,
  LiquidResponseSurface,
  StandbyPresence,
  CreativeComposition,
  GestaltPrinciples,
};
