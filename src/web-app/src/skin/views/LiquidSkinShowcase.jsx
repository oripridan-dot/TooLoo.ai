// @version 2.2.600
// TooLoo.ai Liquid Skin Showcase
// Full immersive demo of Liquid Skin + SkinShell + Texture Engine
// Designed to be displayed in the Studio view

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LiquidEngineProvider,
  PointerAurora,
  LiquidGlass,
  EmotionalOrbs,
  BreathIndicator,
  LiquidSurface,
  NeuralMesh,
  DataFlow,
  ActivityRings,
  FPSMonitor,
  EMOTIONS,
  TextureEngineProvider,
  TextureLayer,
  ReactiveTextureSurface,
  TEXTURES,
  useTextureEngine,
  useLiquidEngine,
} from '../effects';
import { useSkinEmotion } from '../hooks';
import {
  TooLooPresenceProvider,
  useTooLooPresence,
  TooLooEye,
  TooLooBreath,
  TooLooStatus,
  PRESENCE_STATES,
} from '../TooLooPresence';

// ============================================================================
// COSMIC BACKGROUND - Deep space background for full effect
// ============================================================================

const CosmicBackground = memo(({ children }) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base gradient - deep space */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(88, 28, 135, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(15, 23, 42, 1) 0%, rgba(3, 7, 18, 1) 100%)
          `,
        }}
      />

      {/* Stars layer */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, white, transparent),
            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 90px 40px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 160px 120px, rgba(6, 182, 212, 0.8), transparent),
            radial-gradient(1px 1px at 200px 180px, white, transparent),
            radial-gradient(1.5px 1.5px at 240px 50px, rgba(139, 92, 246, 0.9), transparent),
            radial-gradient(1px 1px at 280px 150px, white, transparent),
            radial-gradient(1px 1px at 320px 90px, rgba(255,255,255,0.5), transparent)
          `,
          backgroundSize: '350px 200px',
        }}
      />

      {/* Nebula clouds */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse 800px 400px at 30% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 600px 300px at 70% 30%, rgba(6, 182, 212, 0.2) 0%, transparent 60%)
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

CosmicBackground.displayName = 'CosmicBackground';

// ============================================================================
// SHOWCASE PANEL - Liquid glass panel for sections
// ============================================================================

const ShowcasePanel = memo(({ title, subtitle, children, className = '', glow = true }) => {
  const { getEmotionValues } = useLiquidEngine() || { getEmotionValues: () => EMOTIONS.neutral };
  const emotionVals = getEmotionValues();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: glow 
          ? `0 0 40px hsla(${emotionVals?.hue || 200}, 70%, 50%, 0.1), 
             0 25px 50px -12px rgba(0, 0, 0, 0.5),
             inset 0 1px 0 rgba(255, 255, 255, 0.1)`
          : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Gradient border effect */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'xor',
          padding: '1px',
        }}
      />

      <div className="p-6">
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
});

ShowcasePanel.displayName = 'ShowcasePanel';

// ============================================================================
// EMOTION SWITCHER - Interactive emotion control
// ============================================================================

const EmotionSwitcher = memo(() => {
  const { setEmotionDirect, currentEmotion, flashEmotion } = useSkinEmotion();
  const { transitionTo, presenceState } = useTooLooPresence();

  const emotions = [
    { key: 'neutral', label: 'Neutral', icon: '😐', color: 'cyan', presence: 'attentive' },
    { key: 'thinking', label: 'Thinking', icon: '🤔', color: 'purple', presence: 'thinking' },
    { key: 'excited', label: 'Excited', icon: '🎉', color: 'amber', presence: 'excited' },
    { key: 'calm', label: 'Calm', icon: '😌', color: 'sky', presence: 'resting' },
    { key: 'creative', label: 'Creative', icon: '🎨', color: 'pink', presence: 'creating' },
    { key: 'processing', label: 'Processing', icon: '⚡', color: 'blue', presence: 'thinking' },
    { key: 'success', label: 'Success', icon: '✅', color: 'emerald', presence: 'accomplished' },
    { key: 'alert', label: 'Alert', icon: '⚠️', color: 'red', presence: 'concerned' },
  ];

  const handleEmotionChange = useCallback((emotion, presence) => {
    setEmotionDirect(emotion);
    transitionTo(presence);
  }, [setEmotionDirect, transitionTo]);

  const colorClasses = {
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-cyan-500/20',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-purple-500/20',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20',
    sky: 'bg-sky-500/20 text-sky-400 border-sky-500/50 shadow-sky-500/20',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/50 shadow-pink-500/20',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-blue-500/20',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/20',
    red: 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-500/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <TooLooEye size={32} />
        <div>
          <div className="text-sm text-gray-400">Current State</div>
          <div className="text-white font-medium capitalize">{currentEmotion}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {emotions.map(({ key, label, icon, color, presence }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleEmotionChange(key, presence)}
            className={`
              px-3 py-2 rounded-xl text-sm font-medium transition-all border
              ${currentEmotion === key 
                ? `${colorClasses[color]} shadow-lg` 
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }
            `}
          >
            <span className="text-lg mr-1">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </motion.button>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => flashEmotion('excited', 1000)}
        className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-pink-500/20 hover:from-amber-500/30 hover:via-orange-500/30 hover:to-pink-500/30 text-white font-medium transition-all border border-amber-500/30"
      >
        ✨ Flash Excitement Burst
      </motion.button>
    </div>
  );
});

EmotionSwitcher.displayName = 'EmotionSwitcher';

// ============================================================================
// TEXTURE GALLERY - Interactive texture explorer
// ============================================================================

const TextureGallery = memo(({ activeTexture, onTextureChange, intensity, onIntensityChange }) => {
  const textureGroups = {
    'Organic': ['noise', 'grain', 'perlin', 'cellular'],
    'Geometric': ['grid', 'dots', 'hexgrid', 'circuits'],
    'Abstract': ['plasma', 'waves', 'aurora', 'nebula'],
  };

  return (
    <div className="space-y-4">
      {Object.entries(textureGroups).map(([group, textures]) => (
        <div key={group}>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{group}</div>
          <div className="flex flex-wrap gap-2">
            {textures.map((tex) => (
              <motion.button
                key={tex}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTextureChange(tex)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${activeTexture === tex 
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }
                `}
              >
                {TEXTURES[tex]?.name || tex}
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Intensity</span>
          <span className="text-sm text-purple-400 font-mono">{intensity.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={intensity}
          onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgba(139, 92, 246, 0.5) ${intensity * 50}%, rgba(255,255,255,0.1) ${intensity * 50}%)`,
          }}
        />
      </div>
    </div>
  );
});

TextureGallery.displayName = 'TextureGallery';

// ============================================================================
// EFFECT CONTROLS - Toggle visual effects
// ============================================================================

const EffectControls = memo(({ effects, onToggle }) => {
  const effectList = [
    { key: 'aurora', label: 'Pointer Aurora', icon: '🌈', description: 'Light follows cursor' },
    { key: 'orbs', label: 'Emotional Orbs', icon: '🔮', description: 'Floating mood indicators' },
    { key: 'surface', label: 'Liquid Surface', icon: '💧', description: 'Animated background' },
    { key: 'mesh', label: 'Neural Mesh', icon: '🕸️', description: 'Interactive particle network' },
    { key: 'texture', label: 'Texture Layer', icon: '🎨', description: 'Dynamic patterns' },
  ];

  return (
    <div className="space-y-2">
      {effectList.map(({ key, label, icon, description }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onToggle(key)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
            ${effects[key] 
              ? 'bg-cyan-500/20 border border-cyan-500/30' 
              : 'bg-white/5 border border-white/10'
            }
          `}
        >
          <span className="text-xl">{icon}</span>
          <div className="flex-1 text-left">
            <div className={`text-sm font-medium ${effects[key] ? 'text-cyan-300' : 'text-gray-300'}`}>
              {label}
            </div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${effects[key] ? 'bg-cyan-500' : 'bg-white/20'}`}>
            <motion.div 
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
              animate={{ left: effects[key] ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.button>
      ))}
    </div>
  );
});

EffectControls.displayName = 'EffectControls';

// ============================================================================
// TOOLOO PRESENCE DISPLAY - Shows TooLoo's current state
// ============================================================================

const TooLooPresenceDisplay = memo(() => {
  const { presenceState, currentMood, activityLevel, isUserPresent, learningActive } = useTooLooPresence();
  const state = PRESENCE_STATES[presenceState];

  return (
    <div className="space-y-4">
      {/* Main presence indicator */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <TooLooEye size={64} />
          <TooLooBreath size={80} className="absolute -inset-2 opacity-50" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{state?.name || 'Unknown'}</div>
          <TooLooStatus className="text-gray-400" />
        </div>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Activity Level</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                animate={{ width: `${activityLevel * 100}%` }}
              />
            </div>
            <span className="text-xs text-cyan-400 font-mono">{Math.round(activityLevel * 100)}%</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Mood</div>
          <div className="text-sm text-white font-medium capitalize mt-1">{currentMood}</div>
        </div>

        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">User Present</div>
          <div className={`text-sm font-medium mt-1 ${isUserPresent ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isUserPresent ? '✓ Yes' : '○ Away'}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Learning</div>
          <div className={`text-sm font-medium mt-1 ${learningActive ? 'text-purple-400' : 'text-gray-500'}`}>
            {learningActive ? '⚡ Active' : '○ Idle'}
          </div>
        </div>
      </div>

      {/* Breath indicator showcase */}
      <div className="flex items-center justify-center gap-6 py-4 bg-white/5 rounded-xl">
        <div className="text-center">
          <BreathIndicator size="sm" />
          <div className="text-[10px] text-gray-500 mt-2">Small</div>
        </div>
        <div className="text-center">
          <BreathIndicator size="md" />
          <div className="text-[10px] text-gray-500 mt-2">Medium</div>
        </div>
        <div className="text-center">
          <BreathIndicator size="lg" />
          <div className="text-[10px] text-gray-500 mt-2">Large</div>
        </div>
      </div>
    </div>
  );
});

TooLooPresenceDisplay.displayName = 'TooLooPresenceDisplay';

// ============================================================================
// NEURAL MESH DEMO - Interactive particle network
// ============================================================================

const NeuralMeshDemo = memo(({ enabled }) => {
  if (!enabled) {
    return (
      <div className="h-48 flex items-center justify-center bg-black/30 rounded-xl">
        <span className="text-gray-500 text-sm">Enable Neural Mesh to see the effect</span>
      </div>
    );
  }

  return (
    <div className="relative h-48 rounded-xl overflow-hidden bg-black/30">
      <NeuralMesh
        particleCount={80}
        connectionDistance={100}
        mouseInfluence={120}
      />
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
          Move cursor to interact with particles
        </span>
      </div>
    </div>
  );
});

NeuralMeshDemo.displayName = 'NeuralMeshDemo';

// ============================================================================
// INTELLIGENT RAPID SKIN CHANGER - Shows skins morphing through states
// ============================================================================

const IntelligentSkinChanger = memo(() => {
  const { transitionEmotion, getEmotionValues, animationManager } = useLiquidEngine();
  const { transitionTo } = useTooLooPresence();
  const [currentSkin, setCurrentSkin] = useState(0);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5x, 1x, 2x, 4x
  const [mode, setMode] = useState('sequence'); // sequence, random, reactive, chaos
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const transitionCountRef = useRef(0);

  // Skin definitions with emotional profiles
  const skins = [
    { name: 'Zen Flow', emotion: 'calm', presence: 'resting', color: 'from-cyan-500 to-teal-400', icon: '🧘' },
    { name: 'Neural Fire', emotion: 'thinking', presence: 'thinking', color: 'from-purple-500 to-indigo-500', icon: '🧠' },
    { name: 'Creative Storm', emotion: 'creative', presence: 'creating', color: 'from-pink-500 to-rose-500', icon: '🎨' },
    { name: 'Electric Pulse', emotion: 'processing', presence: 'processing', color: 'from-blue-500 to-cyan-400', icon: '⚡' },
    { name: 'Amber Dream', emotion: 'excited', presence: 'excited', color: 'from-amber-500 to-orange-500', icon: '✨' },
    { name: 'Deep Ocean', emotion: 'neutral', presence: 'attentive', color: 'from-blue-600 to-indigo-600', icon: '🌊' },
    { name: 'Success Glow', emotion: 'success', presence: 'accomplished', color: 'from-emerald-500 to-green-400', icon: '🎯' },
    { name: 'Alert Mode', emotion: 'alert', presence: 'concerned', color: 'from-red-500 to-rose-600', icon: '🚨' },
  ];

  // Intelligent skin selection based on mode
  const getNextSkin = useCallback(() => {
    switch (mode) {
      case 'random':
        return Math.floor(Math.random() * skins.length);
      case 'reactive': {
        // Bias towards calm states after alert, thinking after calm, etc.
        const transitions = {
          calm: [1, 2, 5], // thinking, creative, ocean
          thinking: [0, 3, 2], // zen, electric, creative
          creative: [4, 6, 1], // amber, success, thinking
          processing: [6, 0, 2], // success, zen, creative
          excited: [6, 2, 0], // success, creative, zen
          neutral: [1, 2, 3], // thinking, creative, electric
          success: [0, 5, 2], // zen, ocean, creative
          alert: [0, 5, 1], // zen, ocean, thinking
        };
        const emotion = skins[currentSkin].emotion;
        const options = transitions[emotion] || [0, 1, 2];
        return options[Math.floor(Math.random() * options.length)];
      }
      case 'chaos': {
        // Fast random with bias towards contrast
        const contrastMap = { 0: 7, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 7, 7: 0 };
        return Math.random() > 0.3 ? contrastMap[currentSkin] : Math.floor(Math.random() * skins.length);
      }
      default: // sequence
        return (currentSkin + 1) % skins.length;
    }
  }, [currentSkin, mode, skins.length]);

  // Apply skin transition
  const changeSkin = useCallback((index) => {
    const skin = skins[index];
    setCurrentSkin(index);
    transitionEmotion(skin.emotion, 300 / speed);
    transitionTo(skin.presence);
    transitionCountRef.current++;
  }, [skins, transitionEmotion, transitionTo, speed]);

  // Auto-mode cycling
  useEffect(() => {
    if (!isAutoMode) return;

    const interval = setInterval(() => {
      const next = getNextSkin();
      changeSkin(next);
    }, 1500 / speed);

    return () => clearInterval(interval);
  }, [isAutoMode, speed, getNextSkin, changeSkin]);

  // Canvas visualization of transitions
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const emotionVals = getEmotionValues();

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    // Draw morphing background
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 40%, 0.3)`);
    gradient.addColorStop(0.5, `hsla(${emotionVals.hue + 30}, ${emotionVals.saturation}%, 50%, 0.4)`);
    gradient.addColorStop(1, `hsla(${emotionVals.hue + 60}, ${emotionVals.saturation}%, 40%, 0.3)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Draw flowing waves
    const time = Date.now() * 0.001;
    ctx.strokeStyle = `hsla(${emotionVals.hue}, 80%, 60%, 0.5)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w; x += 5) {
      const y = h / 2 + Math.sin(x * 0.02 + time * emotionVals.pulse) * 20 * emotionVals.energy;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [currentSkin, getEmotionValues]);

  const currentSkinData = skins[currentSkin];
  const speedLabels = { 0.5: '0.5x', 1: '1x', 2: '2x', 4: '4x' };

  return (
    <div className="space-y-4">
      {/* Live Preview Canvas */}
      <div className="relative h-32 rounded-xl overflow-hidden bg-black/30">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {/* Current skin overlay */}
        <motion.div
          key={currentSkin}
          className={`absolute inset-0 bg-gradient-to-br ${currentSkinData.color} opacity-30`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 0.3 / speed }}
        />

        {/* Center indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            key={currentSkin}
            className="text-center"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.2 / speed }}
          >
            <span className="text-4xl">{currentSkinData.icon}</span>
            <div className="text-sm font-semibold text-white mt-1">{currentSkinData.name}</div>
            <div className="text-[10px] text-gray-400">#{transitionCountRef.current} transitions</div>
          </motion.div>
        </div>
      </div>

      {/* Skin Grid - Click to select */}
      <div className="grid grid-cols-4 gap-2">
        {skins.map((skin, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              changeSkin(i);
              setIsAutoMode(false);
            }}
            className={`
              relative p-2 rounded-lg text-center transition-all overflow-hidden
              ${currentSkin === i 
                ? 'ring-2 ring-white/50 shadow-lg' 
                : 'bg-white/5 hover:bg-white/10'}
            `}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${skin.color} ${currentSkin === i ? 'opacity-30' : 'opacity-0'}`} />
            <span className="relative text-lg">{skin.icon}</span>
            <div className="relative text-[9px] text-gray-400 mt-0.5 truncate">{skin.name}</div>
          </motion.button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Auto Mode Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAutoMode(!isAutoMode)}
          className={`
            flex-1 py-2 rounded-lg text-sm font-medium transition-all
            ${isAutoMode 
              ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-300 border border-cyan-500/50' 
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}
          `}
        >
          {isAutoMode ? '⏸ Pause' : '▶ Auto Cycle'}
        </motion.button>

        {/* Speed Control */}
        <select
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-cyan-500/50"
        >
          {Object.entries(speedLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Mode Control */}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-cyan-500/50"
        >
          <option value="sequence">Sequence</option>
          <option value="random">Random</option>
          <option value="reactive">Smart Flow</option>
          <option value="chaos">Chaos</option>
        </select>
      </div>

      {/* Mode description */}
      <div className="text-xs text-gray-500 text-center">
        {mode === 'sequence' && '→ Cycles through skins in order'}
        {mode === 'random' && '🎲 Random skin selection'}
        {mode === 'reactive' && '🧠 Intelligently flows based on current mood'}
        {mode === 'chaos' && '💥 High-contrast rapid switching'}
      </div>
    </div>
  );
});

IntelligentSkinChanger.displayName = 'IntelligentSkinChanger';

// ============================================================================
// ACTIVITY RINGS DEMO
// ============================================================================

const ActivityRingsDemo = memo(() => {
  const [rings, setRings] = useState([
    { value: 0.85, label: 'Neural' },
    { value: 0.6, label: 'Memory' },
    { value: 0.95, label: 'Process' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRings(prev => prev.map(ring => ({
        ...ring,
        value: Math.max(0.1, Math.min(1, ring.value + (Math.random() - 0.5) * 0.1))
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <ActivityRings rings={rings} size={120} />
      <div className="flex gap-4 mt-4">
        {rings.map((ring, i) => (
          <div key={i} className="text-center">
            <div className="text-xs text-gray-500">{ring.label}</div>
            <div className="text-sm text-cyan-400 font-mono">{Math.round(ring.value * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
});

ActivityRingsDemo.displayName = 'ActivityRingsDemo';

// ============================================================================
// REACTIVE SURFACE DEMO
// ============================================================================

const ReactiveSurfaceDemo = memo(({ texture }) => {
  return (
    <ReactiveTextureSurface
      texture={texture}
      intensity={0.8}
      pointerInfluence={150}
      className="p-6 bg-black/30 rounded-xl min-h-[120px]"
    >
      <div className="text-center">
        <p className="text-gray-300 text-sm">
          Move your cursor here
        </p>
        <p className="text-gray-500 text-xs mt-1">
          The texture responds to your pointer position
        </p>
      </div>
    </ReactiveTextureSurface>
  );
});

ReactiveSurfaceDemo.displayName = 'ReactiveSurfaceDemo';

// ============================================================================
// MAIN SHOWCASE COMPONENT
// ============================================================================

const LiquidSkinShowcase = memo(({ className = '' }) => {
  // Effect states
  const [effects, setEffects] = useState({
    aurora: true,
    orbs: true,
    surface: false,
    mesh: false,
    texture: true,
  });

  // Texture controls
  const [activeTexture, setActiveTexture] = useState('aurora');
  const [textureIntensity, setTextureIntensity] = useState(0.8);
  const [dynamicTexture, setDynamicTexture] = useState(true);

  const toggleEffect = useCallback((key) => {
    setEffects(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <LiquidEngineProvider enabled={true}>
      <TooLooPresenceProvider>
        <TextureEngineProvider enabled={effects.texture}>
          <CosmicBackground>
            {/* GLOBAL EFFECTS LAYER */}
            {effects.aurora && <PointerAurora size={400} intensity={0.7} blur={100} />}
            {effects.orbs && <EmotionalOrbs count={6} size={{ min: 40, max: 100 }} />}
            {effects.surface && <LiquidSurface variant="vibrant" animated />}
            
            {/* TEXTURE LAYER */}
            {effects.texture && (
              <TextureLayer 
                texture={dynamicTexture ? undefined : activeTexture} 
                intensity={textureIntensity} 
                scale={1.5}
              />
            )}

            {/* FPS MONITOR */}
            <FPSMonitor position="top-right" />

            {/* MAIN CONTENT */}
            <div className={`relative z-10 p-6 ${className}`}>
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    TooLoo's Liquid Skin
                  </span>
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  An immersive, living interface that breathes, reacts, and expresses emotion.
                  <br />
                  <span className="text-cyan-400/80">"Not a UI, it's TooLoo's skin"</span>
                </p>
              </motion.div>

              {/* Main Grid */}
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column - Emotions & Presence */}
                <div className="space-y-6">
                  <ShowcasePanel title="🎭 Emotional Expression" subtitle="Control TooLoo's mood and presence">
                    <EmotionSwitcher />
                  </ShowcasePanel>

                  <ShowcasePanel title="👁️ TooLoo's Presence" subtitle="Soul indicators and awareness">
                    <TooLooPresenceDisplay />
                  </ShowcasePanel>
                </div>

                {/* Center Column - Visual Effects */}
                <div className="space-y-6">
                  <ShowcasePanel 
                    title="🎭 Intelligent Skin Changer" 
                    subtitle="Watch skins morph and flow dynamically"
                    glow={true}
                  >
                    <IntelligentSkinChanger />
                  </ShowcasePanel>

                  <ShowcasePanel title="🧠 Neural Mesh" subtitle="Interactive particle network" glow={effects.mesh}>
                    <NeuralMeshDemo enabled={effects.mesh} />
                  </ShowcasePanel>

                  <ShowcasePanel title="📊 Activity Rings" subtitle="System metrics visualization">
                    <ActivityRingsDemo />
                  </ShowcasePanel>

                  <ShowcasePanel title="✨ Reactive Surface" subtitle="Texture responds to pointer">
                    <ReactiveSurfaceDemo texture={activeTexture} />
                  </ShowcasePanel>
                </div>

                {/* Right Column - Controls */}
                <div className="space-y-6">
                  <ShowcasePanel title="⚙️ Effect Controls" subtitle="Toggle visual layers">
                    <EffectControls effects={effects} onToggle={toggleEffect} />
                  </ShowcasePanel>

                  <ShowcasePanel title="🎨 Texture Engine" subtitle="Dynamic pattern library">
                    <TextureGallery 
                      activeTexture={activeTexture}
                      onTextureChange={(tex) => {
                        setActiveTexture(tex);
                        setDynamicTexture(false);
                      }}
                      intensity={textureIntensity}
                      onIntensityChange={setTextureIntensity}
                    />
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dynamicTexture}
                          onChange={(e) => setDynamicTexture(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 accent-purple-500"
                        />
                        <div>
                          <span className="text-sm text-gray-300">Auto-sync with Emotion</span>
                          <p className="text-xs text-gray-500">Texture follows mood changes</p>
                        </div>
                      </label>
                    </div>
                  </ShowcasePanel>

                  {/* Data Flow Preview */}
                  <ShowcasePanel title="📡 Data Flow" subtitle="Information stream visualization">
                    <div className="relative h-24 rounded-xl overflow-hidden bg-black/30">
                      <DataFlow direction="horizontal" speed={1.2} density={5} />
                    </div>
                  </ShowcasePanel>
                </div>
              </div>

              {/* Footer */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center"
              >
                <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                  <TooLooEye size={24} />
                  <span className="text-sm text-gray-400">
                    TooLoo.ai v3.0 • Liquid Skin Engine • Texture System • Presence Framework
                  </span>
                  <span className="text-xs text-gray-600">Press Ctrl+Shift+F for FPS</span>
                </div>
              </motion.div>
            </div>
          </CosmicBackground>
        </TextureEngineProvider>
      </TooLooPresenceProvider>
    </LiquidEngineProvider>
  );
});

LiquidSkinShowcase.displayName = 'LiquidSkinShowcase';

export default LiquidSkinShowcase;
