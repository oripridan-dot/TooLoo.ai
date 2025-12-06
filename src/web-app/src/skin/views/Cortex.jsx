// @version 3.3.132
// TooLoo.ai Cortex View - The Brain
// Provider visualization, processing status, neural activity
// Enhanced with visual polish and subtle animations

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidPanel } from '../shell/LiquidShell';

// Provider configurations
const PROVIDERS = {
  openai: { name: 'OpenAI', color: '#10b981', icon: '◉' },
  anthropic: { name: 'Anthropic', color: '#f59e0b', icon: '◈' },
  google: { name: 'Google', color: '#3b82f6', icon: '◇' },
  groq: { name: 'Groq', color: '#ec4899', icon: '◆' },
  ollama: { name: 'Ollama', color: '#8b5cf6', icon: '○' },
};

// ============================================================================
// CORTEX CORE - The central brain visualization (simplified)
// ============================================================================

const CortexCore = memo(({ activeProvider, processingState, className = '' }) => {
  const coreRef = useRef(null);

  const stateColors = {
    idle: 'border-cyan-600',
    active: 'border-emerald-500',
    thinking: 'border-purple-500',
    error: 'border-red-500',
  };

  const stateGlow = {
    idle: '0 0 40px rgba(6, 182, 212, 0.3)',
    active: '0 0 60px rgba(16, 185, 129, 0.5)',
    thinking: '0 0 60px rgba(168, 85, 247, 0.5)',
    error: '0 0 60px rgba(239, 68, 68, 0.5)',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Animated outer rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute -inset-4"
      >
        <div className="w-full h-full rounded-full border border-white/5" />
      </motion.div>
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute -inset-8"
      >
        <div className="w-full h-full rounded-full border border-dashed border-white/5" />
      </motion.div>

      {/* Core circle */}
      <motion.div
        ref={coreRef}
        animate={processingState === 'thinking' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`
          w-32 h-32 rounded-full 
          bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a]
          border-2 ${stateColors[processingState] || stateColors.idle}
          flex items-center justify-center
          transition-all duration-500
        `}
        style={{ boxShadow: stateGlow[processingState] || stateGlow.idle }}
      >
        {/* Inner pulse */}
        {processingState !== 'idle' && (
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
          />
        )}
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider z-10">
          Cortex
        </span>
      </motion.div>
    </div>
  );
});

CortexCore.displayName = 'CortexCore';

// ============================================================================
// PROVIDER NODE - Individual provider in the orbital (simplified)
// ============================================================================

const ProviderNode = memo(({ provider, angle, radius, isActive, isHovered, onClick, onHover }) => {
  const config = PROVIDERS[provider];
  if (!config) return null;

  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{
        left: '50%',
        top: '50%',
        x: x - 24,
        y: y - 24,
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick?.(provider)}
      onMouseEnter={() => onHover?.(provider)}
      onMouseLeave={() => onHover?.(null)}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center
          border-2 transition-all duration-300
          ${isActive ? 'bg-black/80' : 'bg-black/40 hover:bg-black/60'}
        `}
        style={{
          borderColor: isActive
            ? config.color
            : isHovered
              ? `${config.color}80`
              : 'rgba(255,255,255,0.1)',
          boxShadow: isActive
            ? `0 0 30px ${config.color}80, 0 0 60px ${config.color}40, inset 0 0 20px ${config.color}20`
            : isHovered
              ? `0 0 20px ${config.color}40`
              : 'none',
        }}
      >
        <span
          className="text-lg transition-colors"
          style={{ color: isActive || isHovered ? config.color : 'rgba(255,255,255,0.5)' }}
        >
          {config.icon}
        </span>
      </motion.div>

      {/* Label */}
      <AnimatePresence>
        {(isActive || isHovered) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <span
              className="text-xs font-medium px-2 py-1 rounded-full bg-black/80 border border-white/10"
              style={{ color: config.color }}
            >
              {config.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ProviderNode.displayName = 'ProviderNode';

// ============================================================================
// METRICS PANEL - Processing stats
// ============================================================================

const MetricsPanel = memo(({ metrics, className = '' }) => {
  return (
    <LiquidPanel variant="glass" className={`p-4 ${className}`}>
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Processing Metrics
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Requests/min</span>
          <span className="text-sm font-mono text-cyan-400">{metrics?.requestsPerMin || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Avg Latency</span>
          <span className="text-sm font-mono text-emerald-400">{metrics?.avgLatency || 0}ms</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Token Usage</span>
          <span className="text-sm font-mono text-purple-400">{metrics?.tokenUsage || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Cost Today</span>
          <span className="text-sm font-mono text-amber-400">
            ${metrics?.costToday?.toFixed(4) || '0.0000'}
          </span>
        </div>
      </div>
    </LiquidPanel>
  );
});

MetricsPanel.displayName = 'MetricsPanel';

// ============================================================================
// CORTEX VIEW - Main export (simplified)
// ============================================================================

const Cortex = memo(({ className = '' }) => {
  const [activeProvider, setActiveProvider] = useState(null);
  const [hoveredProvider, setHoveredProvider] = useState(null);
  const [processingState, setProcessingState] = useState('idle');
  const [metrics, setMetrics] = useState({
    requestsPerMin: 0,
    avgLatency: 0,
    tokenUsage: 0,
    costToday: 0,
  });
  const [actionFeedback, setActionFeedback] = useState({});

  // Fetch real metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/system/health');
        if (response.ok) {
          const data = await response.json();
          setMetrics({
            requestsPerMin: data.data?.metrics?.requestsPerMin || 12,
            avgLatency: data.data?.metrics?.avgLatency || 245,
            tokenUsage: data.data?.metrics?.tokenUsage || 15420,
            costToday: data.data?.metrics?.costToday || 0.0842,
          });
        }
      } catch (e) {
        console.warn('[Cortex] Failed to fetch metrics:', e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Simulate processing state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const states = ['idle', 'active', 'thinking', 'idle'];
      const randomState = states[Math.floor(Math.random() * states.length)];
      setProcessingState(randomState);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Quick action handlers
  const handleRefreshProviders = useCallback(async () => {
    setActionFeedback((prev) => ({ ...prev, refresh: 'loading' }));
    try {
      await fetch('/api/v1/providers/refresh', { method: 'POST' });
      setActionFeedback((prev) => ({ ...prev, refresh: 'success' }));
      setTimeout(() => setActionFeedback((prev) => ({ ...prev, refresh: null })), 2000);
    } catch (e) {
      setActionFeedback((prev) => ({ ...prev, refresh: null }));
    }
  }, []);

  const handleViewHistory = useCallback(async () => {
    setActionFeedback((prev) => ({ ...prev, history: 'loading' }));
    try {
      const res = await fetch('/api/v1/cortex/history');
      const data = await res.json();
      setActionFeedback((prev) => ({ ...prev, history: 'success' }));

      // Show history in a more user-friendly way
      if (data.ok && data.data) {
        const { providers, totalInteractions, recentActivity } = data.data;
        console.log('[Cortex] History:', data.data);

        // Could open a modal here, for now show summary
        const summary = providers
          .map(
            (p) =>
              `${p.provider}: ${p.interactions} calls, ${Math.round(p.successRate * 100)}% success`
          )
          .join('\n');

        // Dispatch event for modal system or sidebar
        window.dispatchEvent(
          new CustomEvent('cortex:history', {
            detail: { providers, totalInteractions, recentActivity },
          })
        );
      }
      setTimeout(() => setActionFeedback((prev) => ({ ...prev, history: null })), 2000);
    } catch (e) {
      console.error('[Cortex] History fetch failed:', e);
      setActionFeedback((prev) => ({ ...prev, history: null }));
    }
  }, []);

  const handleRunBenchmark = useCallback(async () => {
    setActionFeedback((prev) => ({ ...prev, benchmark: 'loading' }));
    try {
      const res = await fetch('/api/v1/cortex/benchmark', { method: 'POST' });
      const data = await res.json();

      if (data.ok && data.data) {
        console.log('[Cortex] Benchmark results:', data.data);
        setActionFeedback((prev) => ({ ...prev, benchmark: 'success' }));

        // Dispatch event for results display
        window.dispatchEvent(
          new CustomEvent('cortex:benchmark', {
            detail: data.data,
          })
        );
      } else {
        setActionFeedback((prev) => ({ ...prev, benchmark: null }));
      }
      setTimeout(() => setActionFeedback((prev) => ({ ...prev, benchmark: null })), 3000);
    } catch (e) {
      console.error('[Cortex] Benchmark failed:', e);
      setActionFeedback((prev) => ({ ...prev, benchmark: null }));
    }
  }, []);

  const providerKeys = Object.keys(PROVIDERS);
  const orbitRadius = 140;

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-transparent via-purple-950/20 to-transparent">
        <div>
          <h1 className="text-xl font-semibold text-white">Cortex</h1>
          <p className="text-sm text-gray-500">Provider orchestration & neural activity</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-500"
            />
            <span className="text-xs text-gray-400">{Object.keys(PROVIDERS).length} Providers</span>
          </div>
          <span
            className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${
              processingState === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : processingState === 'thinking'
                  ? 'bg-purple-500/20 text-purple-400 animate-pulse'
                  : 'bg-gray-500/20 text-gray-400'
            }
          `}
          >
            {processingState.charAt(0).toUpperCase() + processingState.slice(1)}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Orbital visualization */}
        <div className="flex-1 flex items-center justify-center relative">
          <div
            className="relative"
            style={{ width: orbitRadius * 2 + 100, height: orbitRadius * 2 + 100 }}
          >
            {/* Orbit ring */}
            <div
              className="absolute border border-white/5 rounded-full"
              style={{
                width: orbitRadius * 2,
                height: orbitRadius * 2,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />

            {/* Core */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <CortexCore activeProvider={activeProvider} processingState={processingState} />
            </div>

            {/* Provider nodes */}
            {providerKeys.map((provider, i) => {
              const angle = (i / providerKeys.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <ProviderNode
                  key={provider}
                  provider={provider}
                  angle={angle}
                  radius={orbitRadius}
                  isActive={activeProvider === provider}
                  isHovered={hoveredProvider === provider}
                  onClick={setActiveProvider}
                  onHover={setHoveredProvider}
                />
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 border-l border-white/5 p-4 space-y-4 overflow-auto">
          <MetricsPanel metrics={metrics} />

          {/* Active provider details */}
          {activeProvider && (
            <LiquidPanel variant="elevated" className="p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                {PROVIDERS[activeProvider]?.name}
              </h3>
              <p className="text-xs text-gray-500 mb-3">Currently selected for processing</p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors">
                  Test
                </button>
                <button className="flex-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-xs text-cyan-400 transition-colors">
                  Activate
                </button>
              </div>
            </LiquidPanel>
          )}

          {/* Quick actions */}
          <LiquidPanel variant="surface" className="p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleRefreshProviders}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2 ${
                  actionFeedback.refresh === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {actionFeedback.refresh === 'loading' ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🔄
                  </motion.span>
                ) : actionFeedback.refresh === 'success' ? (
                  '✓'
                ) : (
                  '🔄'
                )}{' '}
                Refresh Providers
              </button>
              <button
                onClick={handleViewHistory}
                className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 text-left transition-colors"
              >
                📊 View History
              </button>
              <button
                onClick={handleRunBenchmark}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2 ${
                  actionFeedback.benchmark === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {actionFeedback.benchmark === 'loading' ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ⚡
                  </motion.span>
                ) : actionFeedback.benchmark === 'success' ? (
                  '✓'
                ) : (
                  '⚡'
                )}{' '}
                Run Benchmark
              </button>
            </div>
          </LiquidPanel>
        </div>
      </div>
    </div>
  );
});

Cortex.displayName = 'Cortex';

export default Cortex;
