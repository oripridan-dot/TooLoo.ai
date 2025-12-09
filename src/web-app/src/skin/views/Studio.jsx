// @version 3.3.432
// TooLoo.ai Studio View - Design & Creation Space
// Visual design, generative UI, emergence tracking, Figma Make
// V3.3.425: Added Vibe Thief - extract design tokens from external websites
// V3.3.425: Added Live Design Wire - real-time generative design

import React, { memo, useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYNAPSYS_PRESETS, useSynapsynDNA } from '../synapsys';
import { LiquidPanel } from '../shell/LiquidShell';
import { io } from 'socket.io-client';

// Lazy load the showcase and FigmaCopilot for better initial load
const LiquidSkinShowcase = lazy(() => import('./LiquidSkinShowcase'));
const FigmaCopilot = lazy(() => import('../../components/FigmaCopilot'));

const API_BASE = '/api/v1';

// ============================================================================
// COLOR SWATCH - Interactive color picker swatch
// ============================================================================

const ColorSwatch = memo(({ hue, isSelected, onClick, size = 40 }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.2, y: -4 }}
      whileTap={{ scale: 0.9 }}
      className={`rounded-full transition-shadow ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${hue + 30}, 80%, 40%))`,
        boxShadow: isSelected ? `0 0 30px hsla(${hue}, 70%, 50%, 0.6), 0 4px 20px hsla(${hue}, 70%, 50%, 0.3)` : '0 2px 10px hsla(0, 0%, 0%, 0.3)',
      }}
    />
  );
});

ColorSwatch.displayName = 'ColorSwatch';

// ============================================================================
// PRESET CARD - Synapsys preset selector (simplified)
// ============================================================================

const PresetCard = memo(({ presetKey, preset, isActive, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        p-4 rounded-xl text-left transition-all relative overflow-hidden
        ${isActive 
          ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/10 border-2 border-cyan-500/50' 
          : 'bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20'}
      `}
    >
      {/* Active glow */}
      {isActive && (
        <motion.div
          layoutId="preset-glow"
          className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/5"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={isActive ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 rounded-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${preset.colors.primary}, ${preset.colors.saturation}%, 50%), hsl(${preset.colors.primary + 40}, ${preset.colors.saturation}%, 40%))`,
              boxShadow: isActive ? `0 0 20px hsla(${preset.colors.primary}, ${preset.colors.saturation}%, 50%, 0.4)` : 'none',
            }}
          />
          <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>{preset.name}</span>
          {isActive && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto text-cyan-400 text-xs"
            >
              ✓
            </motion.span>
          )}
        </div>
        <p className="text-xs text-gray-500">{preset.description}</p>
        
        {/* Visual indicators */}
        <div className="flex gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded-full ${preset.effects.orbs ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
            {preset.effects.orbs ? '●' : '○'} Orbs
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${preset.effects.aurora ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}>
            {preset.effects.aurora ? '●' : '○'} Aurora
          </span>
        </div>
      </div>
    </motion.button>
  );
});

PresetCard.displayName = 'PresetCard';

// ============================================================================
// INTENSITY SLIDER - Visual intensity control
// ============================================================================

const IntensitySlider = memo(({ value, onChange, label, min = 0, max = 1, step = 0.1 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-mono text-gray-300">{value.toFixed(1)}</span>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
});

IntensitySlider.displayName = 'IntensitySlider';

// ============================================================================
// EFFECT TOGGLE - Toggle switch for effects (simplified)
// ============================================================================

const EffectToggle = memo(({ label, enabled, onChange, icon }) => {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-all
        ${enabled ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 border border-white/10'}
      `}
    >
      <span className="text-lg">{icon}</span>
      <span className={`flex-1 text-sm ${enabled ? 'text-cyan-300' : 'text-gray-400'}`}>{label}</span>
      <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-cyan-500' : 'bg-white/20'}`}>
        <div 
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
          style={{ left: enabled ? 16 : 2 }}
        />
      </div>
    </button>
  );
});

EffectToggle.displayName = 'EffectToggle';

// ============================================================================
// EMERGENCE ITEM - Artifact/creation preview
// ============================================================================

const EmergenceItem = memo(({ item, onApprove, onReject }) => {
  return (
    <LiquidPanel variant="glass" className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <span className="text-lg">{item.icon}</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white">{item.title}</h4>
          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onApprove}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs transition-colors"
            >
              ✓ Apply
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs transition-colors"
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      </div>
    </LiquidPanel>
  );
});

EmergenceItem.displayName = 'EmergenceItem';

// ============================================================================
// STUDIO VIEW - Main export (fully wired)
// ============================================================================

const Studio = memo(({ className = '' }) => {
  const [activePreset, setActivePreset] = useState('balanced');
  const [localIntensity, setLocalIntensity] = useState(0.5);
  const [localHue, setLocalHue] = useState(200);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [effects, setEffects] = useState({
    aurora: true,
    orbs: true,
    mesh: false,
    particles: false,
  });

  const [emergences, setEmergences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  
  // NEW: Tab state for switching between Studio, Liquid Skin Showcase, and Figma Copilot
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'showcase' | 'figma'

  // V3.3.425: Vibe Thief state
  const [vibeUrl, setVibeUrl] = useState('');
  const [vibeLoading, setVibeLoading] = useState(false);
  const [vibeError, setVibeError] = useState(null);
  const [extractedTokens, setExtractedTokens] = useState(null);

  // V3.3.425: Live Design Wire state
  const [designPrompt, setDesignPrompt] = useState('');
  const [generatedSvg, setGeneratedSvg] = useState(null);
  const [designLoading, setDesignLoading] = useState(false);
  const socketRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Fetch emergence artifacts from API
  const fetchEmergences = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/emergence/dashboard`);
      const data = await res.json();
      if (data.artifacts) {
        const pending = data.artifacts
          .filter(a => a.status === 'pending')
          .map((artifact, i) => ({
            id: artifact.id,
            icon: artifact.type === 'code' ? '💻' : 
                  artifact.type === 'style' ? '🎨' : 
                  artifact.type === 'optimization' ? '⚡' : '✨',
            title: artifact.name || `Artifact ${i + 1}`,
            description: artifact.description || 'Generated by exploration engine',
          }));
        setEmergences(pending.length > 0 ? pending : [
          { id: 'demo-1', icon: '🎨', title: 'New color scheme detected', description: 'Based on your usage patterns' },
          { id: 'demo-2', icon: '⚡', title: 'Performance optimization', description: 'Suggested effect reduction' },
          { id: 'demo-3', icon: '✨', title: 'Animation enhancement', description: 'Smoother transition curves' },
        ]);
      }
    } catch (error) {
      console.error('[Studio] Failed to fetch emergences:', error);
      // Use demo data on error
      setEmergences([
        { id: 'demo-1', icon: '🎨', title: 'New color scheme detected', description: 'Based on your usage patterns' },
        { id: 'demo-2', icon: '⚡', title: 'Performance optimization', description: 'Suggested effect reduction' },
        { id: 'demo-3', icon: '✨', title: 'Animation enhancement', description: 'Smoother transition curves' },
      ]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchEmergences();
  }, [fetchEmergences]);

  // ==========================================================================
  // LIVE DESIGN WIRE - V3.3.425
  // Real-time generative design via WebSocket
  // ==========================================================================

  useEffect(() => {
    // Connect to Socket.IO for visual streaming
    const socket = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    // Listen for visual stream results
    socket.on('visual:stream:result', (data) => {
      console.log('[LiveDesign] Received result:', data.success);
      setDesignLoading(false);
      
      if (data.success && data.svg) {
        setGeneratedSvg(data.svg);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Debounced design prompt handler
  const handleDesignPromptChange = useCallback((value) => {
    setDesignPrompt(value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't send if prompt is too short
    if (value.trim().length < 5) {
      return;
    }

    // Debounce 500ms
    debounceTimerRef.current = setTimeout(() => {
      if (socketRef.current && value.trim()) {
        console.log('[LiveDesign] Sending prompt:', value);
        setDesignLoading(true);
        
        socketRef.current.emit('visual:stream', {
          prompt: value,
          type: 'svg',
          subtype: 'background',
          requestId: `design-${Date.now()}`,
        });
      }
    }, 500);
  }, []);

  const handlePresetChange = useCallback((presetKey) => {
    setActivePreset(presetKey);
    // Use getState() for imperative access - no re-renders
    const actions = useSynapsynDNA.getState();
    actions.applyPreset?.(presetKey);
    
    // Update local state to reflect preset
    const preset = SYNAPSYS_PRESETS[presetKey];
    if (preset) {
      setLocalHue(preset.colors.primary);
      setLocalIntensity(preset.intensity.visual);
      setEffects({
        aurora: preset.effects.aurora,
        orbs: preset.effects.orbs,
        mesh: preset.effects.mesh || false,
        particles: preset.effects.particles || false,
      });
    }
  }, []);

  const handleIntensityChange = useCallback((value) => {
    setLocalIntensity(value);
    const dna = useSynapsynDNA.getState();
    dna.setIntensity?.('visual', value);
  }, []);

  const handleMotionSpeedChange = useCallback((value) => {
    setMotionSpeed(value);
    const dna = useSynapsynDNA.getState();
    dna.setIntensity?.('motion', value);
  }, []);

  const handleColorChange = useCallback((hue) => {
    setLocalHue(hue);
    const dna = useSynapsynDNA.getState();
    dna.setColor?.('primary', hue);
  }, []);

  const handleEffectToggle = useCallback((effect, enabled) => {
    setEffects(prev => ({ ...prev, [effect]: enabled }));
    const dna = useSynapsynDNA.getState();
    dna.setEffect?.(effect, enabled);
  }, []);

  const handleApproveEmergence = useCallback(async (item) => {
    try {
      // Try real API first
      const res = await fetch(`${API_BASE}/emergence/artifacts/${item.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        console.log('[Studio] Artifact approved:', item.title);
      }
    } catch (error) {
      console.log('[Studio] Approved (local):', item.title);
    }
    // Remove from list
    setEmergences(prev => prev.filter(e => e.id !== item.id));
  }, []);

  const handleRejectEmergence = useCallback(async (item) => {
    try {
      // Try real API first
      const res = await fetch(`${API_BASE}/emergence/artifacts/${item.id}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        console.log('[Studio] Artifact rejected:', item.title);
      }
    } catch (error) {
      console.log('[Studio] Rejected (local):', item.title);
    }
    // Remove from list
    setEmergences(prev => prev.filter(e => e.id !== item.id));
  }, []);

  const handlePreview = useCallback(() => {
    setPreviewActive(true);
    setTimeout(() => setPreviewActive(false), 2000);
  }, []);

  const handleEmerge = useCallback(async () => {
    setLoading(true);
    try {
      // Trigger exploration to generate new artifacts
      const res = await fetch(`${API_BASE}/exploration/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'generate_visual_improvements' }),
      });
      const data = await res.json();
      console.log('[Studio] Emergence triggered:', data);
      
      // Refresh emergences after delay
      setTimeout(fetchEmergences, 2000);
    } catch (error) {
      console.error('[Studio] Emerge failed:', error);
    }
    setLoading(false);
  }, [fetchEmergences]);

  const handleQuickMood = useCallback((mood) => {
    const moodToPreset = {
      zen: 'zen',
      creative: 'creative',
      immersive: 'immersive',
    };
    const presetKey = moodToPreset[mood] || 'balanced';
    handlePresetChange(presetKey);
  }, [handlePresetChange]);

  // ==========================================================================
  // VIBE THIEF - V3.3.425
  // Extract design tokens from external websites and apply them as presets
  // ==========================================================================

  const handleVibeTheft = useCallback(async () => {
    if (!vibeUrl.trim()) {
      setVibeError('Please enter a URL to analyze');
      return;
    }

    // Validate URL format
    try {
      new URL(vibeUrl);
    } catch (e) {
      setVibeError('Invalid URL format. Please include http:// or https://');
      return;
    }

    setVibeLoading(true);
    setVibeError(null);
    setExtractedTokens(null);

    try {
      console.log('[VibeThief] Analyzing:', vibeUrl);

      // Call the research task to extract design tokens
      const res = await fetch(`${API_BASE}/agent/task/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'research',
          name: 'Vibe Thief - Extract Design Tokens',
          input: {
            url: vibeUrl,
            goal: 'Extract color palette, typography, and layout spacing tokens',
            extractDesignTokens: true,
          },
          options: {
            autoApprove: true,
          },
        }),
      });

      const data = await res.json();

      if (!data.ok || !data.data?.result?.success) {
        throw new Error(data.error || data.data?.result?.output || 'Failed to extract design tokens');
      }

      // Parse the extracted tokens from the LLM response
      const output = data.data.result.output;
      let tokens;

      try {
        // Try to extract JSON from the response
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          tokens = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON tokens found in response');
        }
      } catch (parseError) {
        console.warn('[VibeThief] Could not parse tokens as JSON:', parseError);
        // Store raw output for display
        setVibeError('Could not parse design tokens. Raw analysis shown below.');
        setExtractedTokens({ raw: output });
        return;
      }

      console.log('[VibeThief] Extracted tokens:', tokens);
      setExtractedTokens(tokens);

      // Convert extracted tokens to a Synapsys preset and apply
      if (tokens.colors?.primary) {
        const primaryHex = tokens.colors.primary;
        const hue = hexToHue(primaryHex);
        
        if (hue !== null) {
          handleColorChange(hue);
          
          // Apply as temporary preset
          const actions = useSynapsynDNA.getState();
          actions.override({
            colors: {
              primary: hue,
              secondary: (hue + 180) % 360, // Complementary
              accent: (hue + 60) % 360, // Analogous
            },
          });
          
          console.log('[VibeThief] Applied vibe with hue:', hue);
        }
      }

    } catch (error) {
      console.error('[VibeThief] Failed:', error);
      setVibeError(error.message || 'Failed to analyze website');
    } finally {
      setVibeLoading(false);
    }
  }, [vibeUrl, handleColorChange]);

  // Helper: Convert hex color to hue value
  const hexToHue = (hex) => {
    try {
      // Remove # if present
      hex = hex.replace('#', '');
      
      // Parse RGB
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      
      let hue = 0;
      if (delta !== 0) {
        if (max === r) {
          hue = ((g - b) / delta) % 6;
        } else if (max === g) {
          hue = (b - r) / delta + 2;
        } else {
          hue = (r - g) / delta + 4;
        }
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
      }
      
      return hue;
    } catch (e) {
      return null;
    }
  };

  // Color palette
  const colorHues = [0, 30, 60, 120, 180, 200, 260, 300, 330];

  // If figma tab is active, render the FigmaCopilot
  if (activeTab === 'figma') {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Tab Header */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 bg-gradient-to-r from-transparent via-purple-950/10 to-transparent">
          <button
            onClick={() => setActiveTab('studio')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
          >
            ← Back to Studio
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">🎨 Figma Copilot</h1>
            <p className="text-xs text-gray-500">Design to code in one click</p>
          </div>
        </div>
        
        {/* FigmaCopilot Content */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
                />
                <p className="text-gray-400">Loading Figma Copilot...</p>
              </div>
            </div>
          }>
            <FigmaCopilot />
          </Suspense>
        </div>
      </div>
    );
  }

  // If showcase tab is active, render the full showcase
  if (activeTab === 'showcase') {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Tab Header */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 bg-gradient-to-r from-transparent via-cyan-950/10 to-transparent">
          <button
            onClick={() => setActiveTab('studio')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"
          >
            ← Back to Studio
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">💧 Liquid Skin Showcase</h1>
            <p className="text-xs text-gray-500">Full immersive demonstration</p>
          </div>
        </div>
        
        {/* Showcase Content */}
        <div className="flex-1 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full mx-auto mb-4"
                />
                <p className="text-gray-400">Loading Liquid Skin Showcase...</p>
              </div>
            </div>
          }>
            <LiquidSkinShowcase />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Preview overlay */}
      <AnimatePresence>
        {previewActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, hsla(${localHue}, 70%, 50%, 0.3) 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-transparent via-rose-950/10 to-transparent">
        <div>
          <h1 className="text-xl font-semibold text-white">Studio</h1>
          <p className="text-sm text-gray-500">Design & visual customization</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('figma')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 text-sm font-medium transition-colors border border-purple-500/30"
          >
            🎨 Figma Copilot
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('showcase')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-300 text-sm font-medium transition-colors border border-cyan-500/30"
          >
            💧 Liquid Skin Demo
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePreview}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors border border-white/10"
          >
            💫 Preview
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEmerge}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/30 to-rose-500/30 hover:from-purple-500/40 hover:to-rose-500/40 text-white text-sm transition-colors border border-purple-500/30 disabled:opacity-50"
          >
            {loading ? '⟳ Emerging...' : '✨ Emerge'}
          </motion.button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Presets */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Presets</h2>
            <div className="grid gap-3">
              {Object.entries(SYNAPSYS_PRESETS).slice(0, 6).map(([key, preset]) => (
                <PresetCard
                  key={key}
                  presetKey={key}
                  preset={preset}
                  isActive={activePreset === key}
                  onClick={() => handlePresetChange(key)}
                />
              ))}
            </div>
          </div>

          {/* Middle column - Controls */}
          <div className="space-y-6">
            {/* Color palette */}
            <LiquidPanel variant="elevated" className="p-4">
              <h3 className="text-sm font-medium text-white mb-4">Color Palette</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {colorHues.map((hue) => (
                  <ColorSwatch
                    key={hue}
                    hue={hue}
                    isSelected={Math.abs(localHue - hue) < 15}
                    onClick={() => handleColorChange(hue)}
                  />
                ))}
              </div>
            </LiquidPanel>

            {/* Intensity controls */}
            <LiquidPanel variant="surface" className="p-4 space-y-4">
              <h3 className="text-sm font-medium text-white mb-2">Intensity Controls</h3>
              <IntensitySlider
                label="Visual Intensity"
                value={localIntensity}
                onChange={handleIntensityChange}
              />
              <IntensitySlider
                label="Motion Speed"
                value={motionSpeed}
                onChange={handleMotionSpeedChange}
                min={0.2}
                max={2}
              />
            </LiquidPanel>

            {/* Effect toggles */}
            <LiquidPanel variant="surface" className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-white mb-2">Effects</h3>
              <EffectToggle
                label="Pointer Aurora"
                icon="🌈"
                enabled={effects.aurora}
                onChange={(v) => handleEffectToggle('aurora', v)}
              />
              <EffectToggle
                label="Emotional Orbs"
                icon="🔮"
                enabled={effects.orbs}
                onChange={(v) => handleEffectToggle('orbs', v)}
              />
              <EffectToggle
                label="Neural Mesh"
                icon="🕸️"
                enabled={effects.mesh}
                onChange={(v) => handleEffectToggle('mesh', v)}
              />
              <EffectToggle
                label="Particles"
                icon="✨"
                enabled={effects.particles}
                onChange={(v) => handleEffectToggle('particles', v)}
              />
            </LiquidPanel>

            {/* V3.3.425: Live Design Wire - Real-time generative design */}
            <LiquidPanel variant="elevated" className="p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                🎨 Live Design
                <span className="text-xs text-gray-500 font-normal">Sketch with words</span>
                {designLoading && (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block text-cyan-400"
                  >
                    ⟳
                  </motion.span>
                )}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={designPrompt}
                  onChange={(e) => handleDesignPromptChange(e.target.value)}
                  placeholder="Describe a visual... (e.g., 'gradient wave')"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                
                {/* Live SVG Preview Canvas */}
                <div className="relative w-full h-32 rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                  {generatedSvg ? (
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: generatedSvg }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                      {designPrompt.length > 4 
                        ? 'Generating...' 
                        : 'Type to see real-time preview'}
                    </div>
                  )}
                  
                  {/* Loading overlay */}
                  {designLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50"
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  💡 Try: "wavy gradient", "neural mesh", "particle explosion"
                </p>
              </div>
            </LiquidPanel>
          </div>

          {/* Right column - Emergence queue */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Emergence Queue</h2>
            <div className="space-y-3">
              <AnimatePresence>
                {emergences.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <EmergenceItem
                      item={item}
                      onApprove={() => handleApproveEmergence(item)}
                      onReject={() => handleRejectEmergence(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {emergences.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  No pending emergences. Click "Emerge" to generate new ideas!
                </p>
              )}
            </div>

            {/* Quick mood buttons */}
            <LiquidPanel variant="glass" className="p-4">
              <h3 className="text-sm font-medium text-white mb-3">Quick Moods</h3>
              <div className="grid grid-cols-3 gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickMood('zen')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    activePreset === 'zen' 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  🧘 Zen
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickMood('creative')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    activePreset === 'creative' 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  🎨 Creative
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickMood('immersive')}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    activePreset === 'immersive' 
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  🌌 Immersive
                </motion.button>
              </div>
            </LiquidPanel>

            {/* V3.3.425: Vibe Thief - Extract design from websites */}
            <LiquidPanel variant="elevated" className="p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                🎭 Vibe Thief
                <span className="text-xs text-gray-500 font-normal">Steal design vibes from any website</span>
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={vibeUrl}
                    onChange={(e) => setVibeUrl(e.target.value)}
                    placeholder="Paste URL to analyze..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                    disabled={vibeLoading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVibeTheft}
                    disabled={vibeLoading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 hover:from-purple-500/40 hover:to-pink-500/40 text-purple-300 text-sm transition-colors border border-purple-500/30 disabled:opacity-50 whitespace-nowrap"
                  >
                    {vibeLoading ? '⟳' : '🎨'} Steal
                  </motion.button>
                </div>

                {/* Error message */}
                {vibeError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-rose-400"
                  >
                    ⚠️ {vibeError}
                  </motion.p>
                )}

                {/* Extracted tokens preview */}
                {extractedTokens && !extractedTokens.raw && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-white/5 border border-emerald-500/20"
                  >
                    <p className="text-xs text-emerald-400 mb-2">✓ Design tokens extracted!</p>
                    
                    {/* Color preview */}
                    {extractedTokens.colors && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(extractedTokens.colors).slice(0, 5).map(([name, color]) => (
                          <div key={name} className="flex items-center gap-1">
                            <div 
                              className="w-4 h-4 rounded-full border border-white/20"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-gray-400">{name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Raw output for unparseable responses */}
                {extractedTokens?.raw && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-white/5 border border-amber-500/20 max-h-40 overflow-auto"
                  >
                    <p className="text-xs text-amber-400 mb-2">Raw analysis:</p>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">{extractedTokens.raw.substring(0, 500)}...</pre>
                  </motion.div>
                )}
              </div>
            </LiquidPanel>
          </div>
        </div>
      </div>
    </div>
  );
});

Studio.displayName = 'Studio';

export default Studio;
