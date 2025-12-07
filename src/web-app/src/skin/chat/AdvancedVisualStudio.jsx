// @version 3.3.300
// TooLoo.ai Advanced Visual Studio
// Human-like illustration components with intelligent rendering
// Features: Scene generation, artistic effects, interactive visuals

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

// ============================================================================
// INTELLIGENT SCENE RENDERER - Generates human-like illustrations
// ============================================================================

export const IntelligentScene = memo(
  ({
    prompt,
    style = 'gradient-flow',
    mood = 'inspiring',
    width = 800,
    height = 500,
    animated = true,
    interactive = true,
    className = '',
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredElement, setHoveredElement] = useState(null);
    const containerRef = useRef(null);

    // Color palettes for different moods
    const palettes = {
      inspiring: { primary: ['#06B6D4', '#8B5CF6', '#EC4899'], accent: ['#F59E0B', '#10B981'] },
      calm: { primary: ['#94A3B8', '#64748B', '#475569'], accent: ['#06B6D4', '#14B8A6'] },
      energetic: { primary: ['#F43F5E', '#EC4899', '#F97316'], accent: ['#FBBF24', '#A855F7'] },
      futuristic: { primary: ['#06B6D4', '#8B5CF6', '#22D3EE'], accent: ['#A855F7', '#EC4899'] },
      professional: { primary: ['#1E293B', '#334155', '#475569'], accent: ['#06B6D4', '#10B981'] },
    };

    const colors = palettes[mood] || palettes.inspiring;
    const [p1, p2, p3] = colors.primary;
    const [a1, a2] = colors.accent;

    useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }, []);

    // Generate scene based on style
    const renderScene = () => {
      switch (style) {
        case 'neon-glow':
          return <NeonGlowScene colors={colors} animated={animated} />;
        case 'isometric':
          return <IsometricScene colors={colors} animated={animated} />;
        case 'gradient-flow':
          return <GradientFlowScene colors={colors} animated={animated} />;
        case 'geometric':
          return <GeometricScene colors={colors} animated={animated} />;
        case 'organic':
          return <OrganicScene colors={colors} animated={animated} />;
        case 'data-art':
          return <DataArtScene colors={colors} animated={animated} prompt={prompt} />;
        default:
          return <GradientFlowScene colors={colors} animated={animated} />;
      }
    };

    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-2xl bg-[#0a0a0f] ${className}`}
        style={{ width, minHeight: height }}
      >
        {/* Loading shimmer */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        {/* Main scene */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ minHeight: height }}
        >
          {/* Gradient definitions */}
          <defs>
            <radialGradient id="bgGrad" cx="50%" cy="40%" r="80%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </radialGradient>

            <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={p1} stopOpacity="0.8" />
              <stop offset="100%" stopColor={p2} stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="secondaryGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={p2} stopOpacity="0.7" />
              <stop offset="100%" stopColor={p3} stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="accentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={a1} stopOpacity="0.6" />
              <stop offset="100%" stopColor={a2} stopOpacity="0.2" />
            </linearGradient>

            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={p1} stopOpacity="0.4" />
              <stop offset="100%" stopColor={p1} stopOpacity="0" />
            </radialGradient>

            {/* Filters */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="softBlur">
              <feGaussianBlur stdDeviation="15" />
            </filter>

            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#bgGrad)" />

          {/* Ambient glow */}
          <ellipse
            cx={width * 0.3}
            cy={height * 0.3}
            rx="200"
            ry="150"
            fill="url(#glowGrad)"
            opacity="0.5"
          />
          <ellipse
            cx={width * 0.7}
            cy={height * 0.7}
            rx="150"
            ry="120"
            fill="url(#glowGrad)"
            opacity="0.3"
          />

          {/* Scene content */}
          {renderScene()}
        </svg>

        {/* Interactive overlay */}
        {interactive && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-xs text-gray-400 hover:text-white transition-colors"
            >
              ↻ Regenerate
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-white/10 backdrop-blur-sm text-xs text-gray-400 hover:text-white transition-colors"
            >
              ↓ Download
            </motion.button>
          </div>
        )}
      </motion.div>
    );
  }
);

IntelligentScene.displayName = 'IntelligentScene';

// ============================================================================
// NEON GLOW SCENE - Cyberpunk aesthetic
// ============================================================================

const NeonGlowScene = memo(({ colors, animated }) => {
  const [p1, p2, p3] = colors.primary;

  return (
    <g filter="url(#glow)">
      {/* Neon rings */}
      <circle cx="400" cy="250" r="120" fill="none" stroke={p1} strokeWidth="3" opacity="0.9">
        {animated && (
          <animate attributeName="r" values="120;125;120" dur="3s" repeatCount="indefinite" />
        )}
      </circle>
      <circle cx="400" cy="250" r="90" fill="none" stroke={p2} strokeWidth="2" opacity="0.7" />
      <circle cx="400" cy="250" r="60" fill="none" stroke={p3} strokeWidth="2" opacity="0.5" />

      {/* Neon lines */}
      <line x1="50" y1="80" x2="300" y2="80" stroke={p1} strokeWidth="2" opacity="0.8" />
      <line x1="500" y1="420" x2="750" y2="420" stroke={p2} strokeWidth="2" opacity="0.8" />
      <line x1="100" y1="350" x2="250" y2="350" stroke={p3} strokeWidth="1.5" opacity="0.6" />
      <line x1="550" y1="130" x2="700" y2="130" stroke={p1} strokeWidth="1.5" opacity="0.6" />

      {/* Center glow */}
      <circle cx="400" cy="250" r="30" fill={p1} opacity="0.3" />
      <circle cx="400" cy="250" r="15" fill={p1} opacity="0.5" />
      <circle cx="400" cy="250" r="6" fill="white" opacity="0.9" />

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <circle
          key={`particle-${i}`}
          cx={100 + Math.random() * 600}
          cy={80 + Math.random() * 340}
          r={2 + Math.random() * 2}
          fill={[p1, p2, p3][i % 3]}
          opacity="0.6"
        >
          {animated && (
            <>
              <animate
                attributeName="opacity"
                values="0.6;0.2;0.6"
                dur={`${3 + Math.random() * 2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values={`${80 + Math.random() * 340};${70 + Math.random() * 340};${80 + Math.random() * 340}`}
                dur={`${4 + Math.random() * 3}s`}
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      ))}
    </g>
  );
});

// ============================================================================
// GRADIENT FLOW SCENE - Dreamy organic blobs
// ============================================================================

const GradientFlowScene = memo(({ colors, animated }) => {
  const [p1, p2, p3] = colors.primary;
  const [a1] = colors.accent;

  return (
    <g>
      {/* Flowing blobs with blur */}
      <g filter="url(#softBlur)">
        <ellipse cx="200" cy="200" rx="150" ry="120" fill="url(#primaryGrad)" opacity="0.6">
          {animated && (
            <>
              <animate attributeName="rx" values="150;170;150" dur="6s" repeatCount="indefinite" />
              <animate attributeName="ry" values="120;100;120" dur="5s" repeatCount="indefinite" />
            </>
          )}
        </ellipse>

        <ellipse cx="550" cy="300" rx="130" ry="160" fill="url(#secondaryGrad)" opacity="0.5">
          {animated && (
            <>
              <animate attributeName="rx" values="130;150;130" dur="5s" repeatCount="indefinite" />
              <animate attributeName="cy" values="300;280;300" dur="7s" repeatCount="indefinite" />
            </>
          )}
        </ellipse>

        <ellipse cx="350" cy="150" rx="100" ry="80" fill="url(#accentGrad)" opacity="0.4">
          {animated && (
            <animate attributeName="ry" values="80;95;80" dur="4s" repeatCount="indefinite" />
          )}
        </ellipse>
      </g>

      {/* Crisp accent elements */}
      <g filter="url(#glow)">
        <circle
          cx="400"
          cy="250"
          r="60"
          fill="none"
          stroke={p1}
          strokeWidth="2"
          strokeDasharray="8 4"
        />
        <circle
          cx="400"
          cy="250"
          r="40"
          fill="none"
          stroke={p2}
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Central focus */}
        <circle cx="400" cy="250" r="20" fill={p1} opacity="0.8" />
        <circle cx="400" cy="250" r="8" fill="white" opacity="0.95" />
      </g>

      {/* Flow curves */}
      <g stroke={p1} strokeWidth="1" fill="none" opacity="0.3">
        <path d="M80,350 Q200,250 400,300 T720,250">
          {animated && (
            <animate
              attributeName="d"
              values="M80,350 Q200,250 400,300 T720,250;M80,330 Q200,270 400,280 T720,270;M80,350 Q200,250 400,300 T720,250"
              dur="8s"
              repeatCount="indefinite"
            />
          )}
        </path>
        <path d="M80,150 Q250,100 400,150 T720,120" />
      </g>
    </g>
  );
});

// ============================================================================
// ISOMETRIC SCENE - 3D cube structures
// ============================================================================

const IsometricScene = memo(({ colors, animated }) => {
  const [p1, p2, p3] = colors.primary;

  const renderCube = (x, y, size, color1, color2, delay = 0) => {
    const h = size * 0.866;
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Top face */}
        <polygon
          points={`0,${-h} ${size / 2},${-h - size / 4} ${size},${-h} ${size / 2},${-h + size / 4}`}
          fill={color1}
          opacity="0.9"
        >
          {animated && (
            <animate
              attributeName="opacity"
              values="0.9;0.7;0.9"
              dur="3s"
              begin={`${delay}s`}
              repeatCount="indefinite"
            />
          )}
        </polygon>
        {/* Left face */}
        <polygon
          points={`0,${-h} ${size / 2},${-h + size / 4} ${size / 2},${size / 4} 0,0`}
          fill={color2}
          opacity="0.7"
        />
        {/* Right face */}
        <polygon
          points={`${size},${-h} ${size / 2},${-h + size / 4} ${size / 2},${size / 4} ${size},0`}
          fill={color1}
          opacity="0.5"
        />
      </g>
    );
  };

  return (
    <g transform="translate(400, 280)">
      {/* Grid lines */}
      <g stroke={p1} strokeOpacity="0.08" strokeWidth="1">
        {[...Array(12)].map((_, i) => {
          const offset = (i - 6) * 35;
          return (
            <line
              key={`grid-line-${i}`}
              x1={offset - 180}
              y1={offset / 2 + 90}
              x2={offset + 180}
              y2={offset / 2 - 90}
            />
          );
        })}
      </g>

      {/* Cubes */}
      {renderCube(-80, 20, 90, p1, p2, 0)}
      {renderCube(30, -20, 70, p2, p3, 0.3)}
      {renderCube(-30, 60, 55, p3, p1, 0.6)}
      {renderCube(70, 30, 45, p1, p3, 0.9)}

      {/* Floating orb */}
      <g filter="url(#glow)">
        <circle cx="0" cy="-120" r="25" fill={p1} opacity="0.6">
          {animated && (
            <animate attributeName="cy" values="-120;-135;-120" dur="4s" repeatCount="indefinite" />
          )}
        </circle>
        <circle cx="0" cy="-120" r="12" fill="white" opacity="0.8">
          {animated && (
            <animate attributeName="cy" values="-120;-135;-120" dur="4s" repeatCount="indefinite" />
          )}
        </circle>
      </g>
    </g>
  );
});

// ============================================================================
// GEOMETRIC SCENE - Abstract shapes
// ============================================================================

const GeometricScene = memo(({ colors, animated }) => {
  const [p1, p2, p3] = colors.primary;
  const [a1, a2] = colors.accent;

  return (
    <g>
      {/* Main shapes */}
      <polygon points="400,60 500,220 300,220" fill={p1} opacity="0.8">
        {animated && (
          <animate attributeName="opacity" values="0.8;0.6;0.8" dur="4s" repeatCount="indefinite" />
        )}
      </polygon>

      <circle cx="220" cy="320" r="70" fill={p2} opacity="0.7" />

      <rect
        x="500"
        y="270"
        width="110"
        height="110"
        rx="8"
        fill={p3}
        opacity="0.8"
        transform="rotate(15 555 325)"
      />

      {/* Accent shapes */}
      <polygon points="130,120 165,180 95,180" fill={a1} opacity="0.6" />
      <circle cx="670" cy="150" r="35" fill={a2} opacity="0.5" />
      <rect
        x="100"
        y="380"
        width="60"
        height="60"
        rx="4"
        fill={p1}
        opacity="0.4"
        transform="rotate(-10 130 410)"
      />

      {/* Connecting lines */}
      <g stroke={p1} strokeWidth="2" fill="none" opacity="0.4">
        <line x1="400" y1="150" x2="260" y2="270" />
        <line x1="400" y1="150" x2="540" y2="310" />
        <line x1="290" y1="320" x2="510" y2="330" />
      </g>

      {/* Decorative dots */}
      {[...Array(20)].map((_, i) => (
        <circle
          key={`deco-dot-${i}`}
          cx={50 + Math.random() * 700}
          cy={50 + Math.random() * 400}
          r={2 + Math.random() * 3}
          fill={[p1, p2, p3, a1, a2][i % 5]}
          opacity="0.5"
        />
      ))}
    </g>
  );
});

// ============================================================================
// ORGANIC SCENE - Nature-inspired flowing shapes
// ============================================================================

const OrganicScene = memo(({ colors, animated }) => {
  const [p1, p2, p3] = colors.primary;

  return (
    <g>
      {/* Organic blobs */}
      <path
        d="M150,200 Q200,100 300,150 T450,180 Q500,220 450,280 T300,320 Q200,350 150,280 T150,200"
        fill="url(#primaryGrad)"
        opacity="0.6"
      >
        {animated && (
          <animate
            attributeName="d"
            values="M150,200 Q200,100 300,150 T450,180 Q500,220 450,280 T300,320 Q200,350 150,280 T150,200;M160,190 Q210,110 310,160 T460,170 Q510,210 460,290 T310,330 Q210,340 160,290 T160,190;M150,200 Q200,100 300,150 T450,180 Q500,220 450,280 T300,320 Q200,350 150,280 T150,200"
            dur="10s"
            repeatCount="indefinite"
          />
        )}
      </path>

      <path
        d="M500,150 Q600,100 650,180 T700,280 Q680,350 600,380 T480,340 Q420,300 450,220 T500,150"
        fill="url(#secondaryGrad)"
        opacity="0.5"
      />

      {/* Vine-like curves */}
      <g stroke={p1} strokeWidth="2" fill="none" opacity="0.4">
        <path d="M100,400 Q200,350 300,380 Q400,420 500,360 Q600,300 700,350">
          {animated && (
            <animate
              attributeName="d"
              values="M100,400 Q200,350 300,380 Q400,420 500,360 Q600,300 700,350;M100,390 Q200,360 300,370 Q400,410 500,370 Q600,310 700,340;M100,400 Q200,350 300,380 Q400,420 500,360 Q600,300 700,350"
              dur="8s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </g>

      {/* Organic dots (like seeds/pollen) */}
      {[...Array(25)].map((_, i) => {
        const x = 100 + Math.random() * 600;
        const y = 100 + Math.random() * 300;
        return (
          <circle
            key={`organic-dot-${i}`}
            cx={x}
            cy={y}
            r={3 + Math.random() * 4}
            fill={[p1, p2, p3][i % 3]}
            opacity={0.3 + Math.random() * 0.3}
          >
            {animated && (
              <animate
                attributeName="r"
                values={`${3 + Math.random() * 4};${4 + Math.random() * 3};${3 + Math.random() * 4}`}
                dur={`${3 + Math.random() * 2}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        );
      })}
    </g>
  );
});

// ============================================================================
// DATA ART SCENE - Artistic data visualization
// ============================================================================

const DataArtScene = memo(({ colors, animated, prompt }) => {
  const [p1, p2, p3] = colors.primary;
  const [a1, a2] = colors.accent;

  // Generate pseudo-random but deterministic data based on prompt
  const generateData = () => {
    const seed = prompt ? prompt.length : 42;
    return [...Array(12)].map((_, i) => ({
      value: 30 + ((seed * (i + 1) * 7) % 70),
      color: [p1, p2, p3, a1, a2][i % 5],
    }));
  };

  const data = generateData();
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <g>
      {/* Bar chart as art */}
      <g transform="translate(100, 400)">
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * 280;
          const barWidth = 40;
          const x = i * 52;

          return (
            <g key={i}>
              <rect
                x={x}
                y={-barHeight}
                width={barWidth}
                height={barHeight}
                fill={d.color}
                opacity="0.8"
                rx="4"
              >
                {animated && (
                  <animate
                    attributeName="height"
                    values={`0;${barHeight}`}
                    dur="1s"
                    begin={`${i * 0.1}s`}
                    fill="freeze"
                  />
                )}
              </rect>

              {/* Glow effect */}
              <rect
                x={x}
                y={-barHeight}
                width={barWidth}
                height={barHeight}
                fill={d.color}
                opacity="0.3"
                rx="4"
                filter="url(#glow)"
              />
            </g>
          );
        })}
      </g>

      {/* Connecting lines between bars */}
      <g stroke={p1} strokeWidth="1" fill="none" opacity="0.3">
        <path
          d={`M120,${400 - (data[0].value / maxValue) * 280} ${data
            .slice(1)
            .map((d, i) => `L${172 + i * 52},${400 - (d.value / maxValue) * 280}`)
            .join(' ')}`}
        />
      </g>

      {/* Floating data points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={120 + i * 52}
          cy={400 - (d.value / maxValue) * 280 - 10}
          r="4"
          fill="white"
          opacity="0.9"
        >
          {animated && (
            <animate
              attributeName="opacity"
              values="0.9;0.5;0.9"
              dur="2s"
              begin={`${i * 0.2}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}
    </g>
  );
});

// ============================================================================
// ARTISTIC IMAGE PLACEHOLDER - For when real images would be shown
// ============================================================================

export const ArtisticPlaceholder = memo(
  ({ subject = 'abstract', width = 400, height = 300, mood = 'inspiring', className = '' }) => {
    const palettes = {
      inspiring: ['#06B6D4', '#8B5CF6', '#EC4899'],
      calm: ['#94A3B8', '#64748B', '#475569'],
      energetic: ['#F43F5E', '#EC4899', '#F97316'],
    };

    const colors = palettes[mood] || palettes.inspiring;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative overflow-hidden rounded-xl bg-[#0a0a0f] ${className}`}
        style={{ width, height }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <defs>
            <linearGradient id="placeholderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors[0]} stopOpacity="0.3" />
              <stop offset="50%" stopColor={colors[1]} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors[2]} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <rect width={width} height={height} fill="#0a0a0f" />
          <rect width={width} height={height} fill="url(#placeholderGrad)" />

          {/* Abstract pattern */}
          <circle
            cx={width * 0.3}
            cy={height * 0.4}
            r={height * 0.25}
            fill={colors[0]}
            opacity="0.2"
          />
          <circle
            cx={width * 0.7}
            cy={height * 0.6}
            r={height * 0.2}
            fill={colors[1]}
            opacity="0.15"
          />

          {/* Icon */}
          <g transform={`translate(${width / 2 - 20}, ${height / 2 - 20})`}>
            <rect
              x="0"
              y="0"
              width="40"
              height="40"
              rx="8"
              fill="none"
              stroke={colors[0]}
              strokeWidth="2"
              opacity="0.5"
            />
            <circle cx="14" cy="14" r="5" fill={colors[0]} opacity="0.5" />
            <path
              d="M8,32 L16,22 L24,28 L32,18"
              stroke={colors[1]}
              strokeWidth="2"
              fill="none"
              opacity="0.5"
            />
          </g>
        </svg>

        {/* Label */}
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">🎨 {subject}</span>
        </div>
      </motion.div>
    );
  }
);

ArtisticPlaceholder.displayName = 'ArtisticPlaceholder';

// ============================================================================
// VISUAL THINKING INDICATOR - Shows AI is creating visuals
// ============================================================================

export const VisualThinkingIndicator = memo(({ message = 'Creating visual...' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl"
    >
      {/* Animated icon */}
      <div className="relative w-8 h-8">
        <motion.div
          className="absolute inset-0 rounded-lg bg-purple-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg">🎨</span>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm text-purple-300 font-medium">{message}</p>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

VisualThinkingIndicator.displayName = 'VisualThinkingIndicator';

export default {
  IntelligentScene,
  ArtisticPlaceholder,
  VisualThinkingIndicator,
};
