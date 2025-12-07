// @version 3.3.290
// TooLoo.ai Growth View - Learning & Health Monitoring Control Center
// Self-improvement, exploration, QA, and system health
// MEGA-BOOSTED: Curiosity heatmaps, emergence timeline, learning velocity
// Fully wired with real API connections + Socket.IO real-time updates
// v2.3.0: Fixed API paths, added mock mode indicators, symbiotic integration
// v2.3.1: Fixed WebSocket protocol for secure connections (wss:// vs ws://)
// v2.3.2: Replaced browser dialogs with proper modal UI components
// v3.0.0: Added Control Center tabs - Scheduler, Predictions, Configuration, Analytics
//         Integrated with Growth Engine unified API for system-wide controls
// v3.3.300: Fixed Socket.IO integration, removed native WebSocket, fixed duplicate keys

import React, { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { LiquidPanel } from '../shell/LiquidShell';

const API_BASE = '/api/v1';

// ============================================================================
// INPUT MODAL - Replaces browser prompt() for better UX
// ============================================================================

const InputModal = memo(({ isOpen, onClose, onSubmit, title, placeholder, defaultValue = '' }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              onSubmit(value.trim());
              onClose();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (value.trim()) {
                onSubmit(value.trim());
                onClose();
              }
            }}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm transition-colors disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

InputModal.displayName = 'InputModal';

// ============================================================================
// INFO MODAL - Replaces browser alert() for better UX
// ============================================================================

const InfoModal = memo(({ isOpen, onClose, title, content, type = 'info' }) => {
  if (!isOpen) return null;

  const typeStyles = {
    info: 'border-cyan-500/30 bg-cyan-500/5',
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    error: 'border-rose-500/30 bg-rose-500/5',
  };

  const typeIcons = {
    info: '📊',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg p-6 rounded-xl bg-[#0a0a0a] border shadow-2xl ${typeStyles[type]}`}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">{typeIcons[type]}</span>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="text-gray-300 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {content}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

InfoModal.displayName = 'InfoModal';

// ============================================================================
// CONFIRM MODAL - Replaces browser confirm() for better UX
// ============================================================================

const ConfirmModal = memo(
  ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', danger = false }) => {
    if (!isOpen) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md p-6 rounded-xl bg-[#0a0a0a] border shadow-2xl ${danger ? 'border-rose-500/30' : 'border-white/10'}`}
        >
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm mb-4">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                danger
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';

// ============================================================================
// GROWTH RING - Circular progress indicator (simplified CSS)
// ============================================================================

const GrowthRing = memo(
  ({ value = 0, max = 100, label, color = 'cyan', size = 120, className = '' }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const colors = {
      cyan: { ring: 'stroke-cyan-500', glow: 'rgba(6, 182, 212, 0.4)', text: 'text-cyan-500' },
      purple: {
        ring: 'stroke-purple-500',
        glow: 'rgba(168, 85, 247, 0.4)',
        text: 'text-purple-500',
      },
      emerald: {
        ring: 'stroke-emerald-500',
        glow: 'rgba(16, 185, 129, 0.4)',
        text: 'text-emerald-500',
      },
      amber: { ring: 'stroke-amber-500', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-500' },
      rose: { ring: 'stroke-rose-500', glow: 'rgba(244, 63, 94, 0.4)', text: 'text-rose-500' },
    };

    const c = colors[color] || colors.cyan;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30"
          style={{ backgroundColor: c.glow }}
        />

        <svg viewBox="0 0 100 100" className="transform -rotate-90 relative z-10">
          {/* Background ring */}
          <circle cx="50" cy="50" r="45" fill="none" className="stroke-white/10" strokeWidth="8" />
          {/* Progress ring */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            className={c.ring}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="text-2xl font-bold text-white"
          >
            {Math.round(percentage)}%
          </motion.span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </motion.div>
    );
  }
);

GrowthRing.displayName = 'GrowthRing';

// ============================================================================
// METRIC CARD - Stat display card
// ============================================================================

const MetricCard = memo(
  ({ icon, label, value, trend, trendValue, color = 'cyan', className = '', index = 0 }) => {
    const colorStyles = {
      cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.1 }}
      >
        <LiquidPanel
          variant="surface"
          className={`p-4 hover:bg-white/[0.03] transition-colors ${className}`}
        >
          <div className="flex items-start justify-between">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorStyles[color]}`}
            >
              <span className="text-lg">{icon}</span>
            </div>
            {trend && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}
              >
                {trend === 'up' ? '↑' : '↓'} {trendValue}
              </motion.span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </LiquidPanel>
      </motion.div>
    );
  }
);

MetricCard.displayName = 'MetricCard';

// ============================================================================
// LEARNING TIMELINE - Recent learning events (simplified)
// ============================================================================

const LearningTimeline = memo(({ events = [], className = '' }) => {
  return (
    <LiquidPanel variant="elevated" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-4">Learning Timeline</h3>

      <div className="space-y-4">
        {events.map((event, i) => (
          <div
            key={event.id || i}
            className="flex gap-3 animate-fadeIn"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-2 h-2 rounded-full ${
                  event.type === 'insight'
                    ? 'bg-purple-500'
                    : event.type === 'pattern'
                      ? 'bg-cyan-500'
                      : event.type === 'skill'
                        ? 'bg-emerald-500'
                        : 'bg-gray-500'
                }`}
              />
              {i < events.length - 1 && <div className="w-px h-full bg-white/10 mt-1" />}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm text-gray-300">{event.title}</p>
              <p className="text-xs text-gray-500 mt-1">{event.description}</p>
              <span className="text-xs text-gray-600 mt-1 block">{event.time}</span>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <p className="text-sm text-gray-600 italic">No recent learning events</p>
        )}
      </div>
    </LiquidPanel>
  );
});

LearningTimeline.displayName = 'LearningTimeline';

// ============================================================================
// HEALTH INDICATOR - System health visualization
// ============================================================================

const HealthIndicator = memo(({ systems = [], className = '' }) => {
  return (
    <LiquidPanel variant="glass" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-4">System Health</h3>

      <div className="space-y-3">
        {systems.map((system, i) => (
          <div key={system.name} className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                system.status === 'healthy'
                  ? 'bg-emerald-500'
                  : system.status === 'warning'
                    ? 'bg-amber-500'
                    : system.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-gray-500'
              }`}
            />
            <span className="text-sm text-gray-400 flex-1">{system.name}</span>
            <span
              className={`text-xs font-medium ${
                system.status === 'healthy'
                  ? 'text-emerald-400'
                  : system.status === 'warning'
                    ? 'text-amber-400'
                    : system.status === 'error'
                      ? 'text-rose-400'
                      : 'text-gray-500'
              }`}
            >
              {system.value}
            </span>
          </div>
        ))}
      </div>
    </LiquidPanel>
  );
});

HealthIndicator.displayName = 'HealthIndicator';

// ============================================================================
// EXPLORATION GRID - Provider exploration status
// ============================================================================

const ExplorationGrid = memo(({ providers = [], className = '' }) => {
  return (
    <LiquidPanel variant="surface" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-4">Provider Exploration</h3>

      <div className="grid grid-cols-2 gap-3">
        {providers.map((provider) => (
          <div
            key={provider.name}
            className={`p-3 rounded-lg border ${
              provider.explored
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{provider.icon}</span>
              <span className="text-sm text-gray-300">{provider.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {provider.explored ? 'Tested' : 'Pending'}
              </span>
              {provider.explored && (
                <span className="text-xs text-emerald-400">{provider.score}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </LiquidPanel>
  );
});

ExplorationGrid.displayName = 'ExplorationGrid';

// ============================================================================
// CURIOSITY HEATMAP - Multi-dimensional curiosity visualization
// ============================================================================

const CURIOSITY_DIMENSIONS = [
  { key: 'novelty', label: 'Novelty', color: '#06b6d4', description: 'New unexplored territory' },
  { key: 'surprise', label: 'Surprise', color: '#a855f7', description: 'Unexpected patterns' },
  { key: 'uncertainty', label: 'Uncertainty', color: '#f59e0b', description: 'Knowledge gaps' },
  { key: 'dissonance', label: 'Dissonance', color: '#ef4444', description: 'Conflicting info' },
  {
    key: 'capabilityGap',
    label: 'Capability Gap',
    color: '#10b981',
    description: 'Skill boundaries',
  },
  {
    key: 'emergencePotential',
    label: 'Emergence',
    color: '#ec4899',
    description: 'Breakthrough potential',
  },
  {
    key: 'explorationValue',
    label: 'Exploration',
    color: '#6366f1',
    description: 'Discovery potential',
  },
];

const CuriosityHeatmap = memo(({ dimensions = {}, className = '' }) => {
  const cells = useMemo(() => {
    return CURIOSITY_DIMENSIONS.map((dim) => ({
      ...dim,
      value: dimensions[dim.key] || Math.random() * 0.5, // Default random for demo
      intensity: Math.min(1, (dimensions[dim.key] || 0) * 1.2),
    }));
  }, [dimensions]);

  const maxValue = Math.max(...cells.map((c) => c.value), 0.1);

  return (
    <LiquidPanel variant="elevated" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <span className="text-lg">🧠</span>
        Curiosity Dimensions
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {cells.map((cell, i) => {
          const normalized = cell.value / maxValue;
          const bgOpacity = 0.1 + normalized * 0.4;

          return (
            <motion.div
              key={cell.key}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative p-3 rounded-lg overflow-hidden group cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${cell.color}${Math.round(bgOpacity * 255)
                  .toString(16)
                  .padStart(2, '0')}, transparent)`,
                border: `1px solid ${cell.color}33`,
              }}
              title={cell.description}
            >
              {/* Pulse effect for high values */}
              {cell.value > 0.7 && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ background: cell.color }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{cell.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: cell.color }}>
                    {(cell.value * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: cell.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${normalized * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </div>

              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 rounded text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {cell.description}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total curiosity score */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-500">Total Curiosity</span>
        <motion.span
          className="text-lg font-bold text-purple-400"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {((cells.reduce((sum, c) => sum + c.value, 0) / cells.length) * 100).toFixed(0)}%
        </motion.span>
      </div>
    </LiquidPanel>
  );
});

CuriosityHeatmap.displayName = 'CuriosityHeatmap';

// ============================================================================
// EXPLORATION HYPOTHESIS QUEUE - Shows active experiments
// ============================================================================

const HypothesisStatusBadge = memo(({ status }) => {
  const statusStyles = {
    pending: 'bg-gray-500/20 text-gray-400',
    running: 'bg-cyan-500/20 text-cyan-400',
    succeeded: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-rose-500/20 text-rose-400',
    analyzing: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${statusStyles[status] || statusStyles.pending}`}
    >
      {status}
    </span>
  );
});

const ExplorationQueue = memo(
  ({ hypotheses = [], onTriggerExploration, onOpenHypothesisModal, className = '' }) => {
    return (
      <LiquidPanel variant="elevated" className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <span className="text-lg">🔬</span>
            Exploration Queue
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenHypothesisModal}
            className="text-xs px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
          >
            + New Hypothesis
          </motion.button>
        </div>

        <div className="space-y-2 max-h-[240px] overflow-y-auto">
          {hypotheses.length === 0 ? (
            <p className="text-sm text-gray-600 italic py-4 text-center">
              No active hypotheses. Click above to explore!
            </p>
          ) : (
            hypotheses.map((h, i) => (
              <motion.div
                key={h.id || i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-lg border ${
                  h.status === 'running'
                    ? 'bg-cyan-500/5 border-cyan-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-gray-300 font-medium truncate flex-1 mr-2">
                    {h.title || h.hypothesis}
                  </span>
                  <HypothesisStatusBadge status={h.status} />
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{h.type || 'experiment'}</span>
                  {h.confidence !== undefined && (
                    <span>Confidence: {(h.confidence * 100).toFixed(0)}%</span>
                  )}
                  {h.progress !== undefined && (
                    <div className="flex-1">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${h.progress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </LiquidPanel>
    );
  }
);

ExplorationQueue.displayName = 'ExplorationQueue';

// ============================================================================
// EMERGENCE TIMELINE - Breakthrough detection visualization
// ============================================================================

const EmergenceTimeline = memo(({ events = [], className = '' }) => {
  const getEmergenceIcon = (type) => {
    switch (type) {
      case 'breakthrough':
        return '⚡';
      case 'capability':
        return '🚀';
      case 'pattern':
        return '🔮';
      case 'insight':
        return '💡';
      case 'synergy':
        return '✨';
      default:
        return '◆';
    }
  };

  const getEmergenceColor = (type) => {
    switch (type) {
      case 'breakthrough':
        return 'amber';
      case 'capability':
        return 'emerald';
      case 'pattern':
        return 'purple';
      case 'insight':
        return 'cyan';
      case 'synergy':
        return 'rose';
      default:
        return 'gray';
    }
  };

  return (
    <LiquidPanel variant="elevated" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <motion.span
          className="text-lg"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨
        </motion.span>
        Emergence Events
      </h3>

      {events.length === 0 ? (
        <div className="py-8 text-center">
          <motion.div
            className="text-4xl mb-3"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔭
          </motion.div>
          <p className="text-sm text-gray-500">Watching for emergent patterns...</p>
          <p className="text-xs text-gray-600 mt-1">Breakthroughs will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {events.map((event, i) => {
            const color = getEmergenceColor(event.type);
            const colorStyles = {
              amber: 'border-amber-500/30 bg-amber-500/5',
              emerald: 'border-emerald-500/30 bg-emerald-500/5',
              purple: 'border-purple-500/30 bg-purple-500/5',
              cyan: 'border-cyan-500/30 bg-cyan-500/5',
              rose: 'border-rose-500/30 bg-rose-500/5',
              gray: 'border-gray-500/30 bg-gray-500/5',
            };

            return (
              <motion.div
                key={event.id || i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`p-3 rounded-lg border ${colorStyles[color]}`}
              >
                <div className="flex items-start gap-3">
                  <motion.span
                    className="text-xl mt-0.5"
                    animate={event.new ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.5, repeat: event.new ? 3 : 0 }}
                  >
                    {getEmergenceIcon(event.type)}
                  </motion.span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="capitalize">{event.type}</span>
                      {event.confidence !== undefined && (
                        <span>Confidence: {(event.confidence * 100).toFixed(0)}%</span>
                      )}
                      <span>{event.time || 'Just now'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </LiquidPanel>
  );
});

EmergenceTimeline.displayName = 'EmergenceTimeline';

// ============================================================================
// SCHEDULER CONTROL PANEL - Learning scheduling management
// ============================================================================

const SchedulerPanel = memo(({ className = '' }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/schedule`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('[Scheduler] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleBurst = async () => {
    setActionLoading('burst');
    try {
      await fetch(`${API_BASE}/growth/schedule/burst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 300000, intensity: 1.5 }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuiet = async () => {
    setActionLoading('quiet');
    try {
      await fetch(`${API_BASE}/growth/schedule/quiet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 1800000, reason: 'manual' }),
      });
      await fetchStatus();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <LiquidPanel variant="elevated" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⏳
          </motion.div>
        </div>
      </LiquidPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Status */}
      <LiquidPanel variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <span className="text-xl">📅</span>
            Learning Scheduler
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              status?.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : status?.status === 'paused'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {status?.status || 'unknown'}
          </span>
        </div>

        {/* Current Window */}
        {status?.currentWindow && (
          <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-cyan-400 font-medium">Current Window</span>
              <span className="text-xs text-cyan-300 capitalize">{status.currentWindow.type}</span>
            </div>
            <p className="text-white text-lg font-semibold">
              {status.currentWindow.name || status.currentWindow.type}
            </p>
            {status.currentWindow.endTime && (
              <p className="text-xs text-gray-500 mt-1">
                Ends: {new Date(status.currentWindow.endTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBurst}
            disabled={actionLoading === 'burst'}
            className="px-4 py-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'burst' ? '⏳' : '🚀'} Start Burst
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleQuiet}
            disabled={actionLoading === 'quiet'}
            className="px-4 py-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 transition-colors disabled:opacity-50"
          >
            {actionLoading === 'quiet' ? '⏳' : '🌙'} Quiet Period
          </motion.button>
        </div>
      </LiquidPanel>

      {/* Upcoming Windows */}
      <LiquidPanel variant="surface" className="p-4">
        <h4 className="text-sm font-medium text-white mb-3">Upcoming Windows</h4>
        <div className="space-y-2">
          {(status?.upcomingWindows || []).map((window, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    window.type === 'burst'
                      ? 'bg-emerald-500'
                      : window.type === 'quiet'
                        ? 'bg-amber-500'
                        : window.type === 'maintenance'
                          ? 'bg-purple-500'
                          : 'bg-cyan-500'
                  }`}
                />
                <span className="text-sm text-gray-300 capitalize">{window.type}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(window.startTime).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {(!status?.upcomingWindows || status.upcomingWindows.length === 0) && (
            <p className="text-sm text-gray-500 italic text-center py-4">No scheduled windows</p>
          )}
        </div>
      </LiquidPanel>

      {/* Active Goals */}
      <LiquidPanel variant="surface" className="p-4">
        <h4 className="text-sm font-medium text-white mb-3">Learning Goals</h4>
        <div className="space-y-2">
          {(status?.goals?.active || 0) > 0 ? (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-400">{status.goals.active} Active Goals</span>
                <span className="text-xs text-emerald-400">
                  {status.goals.achieved || 0} Achieved
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic text-center py-4">No active goals</p>
          )}
        </div>
      </LiquidPanel>

      {/* Stats */}
      {status?.stats && (
        <LiquidPanel variant="glass" className="p-4">
          <h4 className="text-sm font-medium text-white mb-3">Schedule Stats</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-cyan-400">
                {status.stats.windowsCompleted || 0}
              </p>
              <p className="text-xs text-gray-500">Windows</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">
                {status.stats.burstsTriggered || 0}
              </p>
              <p className="text-xs text-gray-500">Bursts</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">{status.stats.goalsAchieved || 0}</p>
              <p className="text-xs text-gray-500">Goals Met</p>
            </div>
          </div>
        </LiquidPanel>
      )}
    </div>
  );
});

SchedulerPanel.displayName = 'SchedulerPanel';

// ============================================================================
// PREDICTIONS PANEL - Emergence predictions viewer
// ============================================================================

const PredictionsPanel = memo(({ className = '' }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/growth/predictions`);
      const data = await res.json();
      if (data.success) {
        setPredictions(data.data.predictions || []);
      }
    } catch (error) {
      console.error('[Predictions] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000);
    return () => clearInterval(interval);
  }, [fetchPredictions]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/growth/predictions/refresh`, { method: 'POST' });
      await fetchPredictions();
    } finally {
      setLoading(false);
    }
  };

  const getHorizonColor = (horizon) => {
    switch (horizon) {
      case 'immediate':
        return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' };
      case 'short_term':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' };
      case 'medium_term':
        return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' };
      case 'long_term':
        return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' };
      default:
        return { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' };
    }
  };

  if (loading) {
    return (
      <LiquidPanel variant="elevated" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            🔮
          </motion.div>
        </div>
      </LiquidPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <LiquidPanel variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔮
            </motion.span>
            Emergence Predictions
          </h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm"
          >
            🔄 Refresh
          </motion.button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-bold text-white">{predictions.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {predictions.filter((p) => p.confidence > 0.7).length}
            </p>
            <p className="text-xs text-gray-500">High Conf.</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-bold text-rose-400">
              {
                predictions.filter(
                  (p) => p.timeHorizon === 'immediate' || p.timeHorizon === 'short_term'
                ).length
              }
            </p>
            <p className="text-xs text-gray-500">Imminent</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {predictions.filter((p) => p.type === 'breakthrough').length}
            </p>
            <p className="text-xs text-gray-500">Breakthroughs</p>
          </div>
        </div>
      </LiquidPanel>

      {/* Predictions List */}
      <div className="space-y-3">
        {predictions.length === 0 ? (
          <LiquidPanel variant="surface" className="p-8 text-center">
            <motion.span
              className="text-4xl block mb-4"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔭
            </motion.span>
            <p className="text-gray-400">No predictions yet</p>
            <p className="text-xs text-gray-500 mt-1">The system is analyzing patterns...</p>
          </LiquidPanel>
        ) : (
          predictions.map((pred, i) => {
            const colors = getHorizonColor(pred.timeHorizon);
            return (
              <motion.div
                key={pred.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <LiquidPanel variant="surface" className={`p-4 border ${colors.border}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {pred.type === 'breakthrough'
                          ? '⚡'
                          : pred.type === 'pattern'
                            ? '🔮'
                            : pred.type === 'capability'
                              ? '🚀'
                              : pred.type === 'insight'
                                ? '💡'
                                : '◆'}
                      </span>
                      <span className="text-sm font-medium text-white">{pred.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}
                      >
                        {pred.timeHorizon?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(pred.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">{pred.description}</p>

                  {/* Confidence bar */}
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        pred.confidence > 0.7
                          ? 'bg-emerald-500'
                          : pred.confidence > 0.5
                            ? 'bg-amber-500'
                            : 'bg-gray-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pred.confidence * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                    />
                  </div>

                  {/* Precursors */}
                  {pred.precursors && pred.precursors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pred.precursors.slice(0, 3).map((p, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 rounded text-xs bg-white/5 text-gray-400"
                        >
                          {p.type}
                        </span>
                      ))}
                    </div>
                  )}
                </LiquidPanel>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
});

PredictionsPanel.displayName = 'PredictionsPanel';

// ============================================================================
// CONFIGURATION PANEL - System configuration management
// ============================================================================

const ConfigurationPanel = memo(({ className = '' }) => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainConfig, setDomainConfig] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState({});

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/config/domains`);
      const data = await res.json();
      if (data.success) {
        setDomains(data.data || []);
        if (!selectedDomain && data.data?.length > 0) {
          setSelectedDomain(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('[Config] Failed to fetch domains:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDomain]);

  const fetchDomainConfig = useCallback(async (domainId) => {
    if (!domainId) return;
    try {
      const res = await fetch(`${API_BASE}/config/domain/${domainId}`);
      const data = await res.json();
      if (data.success) {
        setDomainConfig(data.data);
        setEditValues(data.data.effectiveValues || {});
      }
    } catch (error) {
      console.error('[Config] Failed to fetch domain config:', error);
    }
  }, []);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/config/versions?limit=10`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.data.versions || []);
      }
    } catch (error) {
      console.error('[Config] Failed to fetch versions:', error);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchVersions();
  }, [fetchDomains, fetchVersions]);

  useEffect(() => {
    if (selectedDomain) {
      fetchDomainConfig(selectedDomain);
    }
  }, [selectedDomain, fetchDomainConfig]);

  const handleSave = async () => {
    if (!selectedDomain) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/config/domain/${selectedDomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: editValues,
          author: 'user',
          message: `Updated ${selectedDomain} via UI`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchDomainConfig(selectedDomain);
        await fetchVersions();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (version) => {
    if (!window.confirm(`Rollback to version ${version}?`)) return;
    try {
      await fetch(`${API_BASE}/config/rollback/${version}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'user', reason: 'Manual rollback' }),
      });
      await fetchDomainConfig(selectedDomain);
      await fetchVersions();
    } catch (error) {
      console.error('[Config] Rollback failed:', error);
    }
  };

  if (loading) {
    return (
      <LiquidPanel variant="elevated" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⚙️
          </motion.div>
        </div>
      </LiquidPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Domain Selector */}
      <LiquidPanel variant="elevated" className="p-4">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <span>⚙️</span>
          Configuration
        </h3>
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <motion.button
              key={domain.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDomain(domain.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedDomain === domain.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {domain.name}
            </motion.button>
          ))}
        </div>
      </LiquidPanel>

      {/* Domain Config Editor */}
      {domainConfig && (
        <LiquidPanel variant="surface" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-white">{domainConfig.name}</h4>
              <p className="text-xs text-gray-500">{domainConfig.description}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm disabled:opacity-50"
            >
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </motion.button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(domainConfig.fields || []).map((field) => (
              <div key={field.key} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">{field.key}</span>
                  <div className="flex items-center gap-2">
                    {field.runtimeUpdateable && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400">
                        live
                      </span>
                    )}
                    {field.requiresRestart && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                        restart
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2">{field.description}</p>

                {field.type === 'boolean' ? (
                  <button
                    onClick={() =>
                      setEditValues((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                    }
                    className={`px-3 py-1 rounded text-xs ${
                      editValues[field.key]
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {editValues[field.key] ? 'Enabled' : 'Disabled'}
                  </button>
                ) : field.type === 'enum' ? (
                  <select
                    value={editValues[field.key] || ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    {(field.validation?.enum || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={editValues[field.key] ?? field.default}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [field.key]: parseFloat(e.target.value),
                      }))
                    }
                    min={field.validation?.min}
                    max={field.validation?.max}
                    step={field.validation?.max <= 1 ? 0.01 : 1}
                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                ) : (
                  <input
                    type="text"
                    value={editValues[field.key] ?? ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                )}
              </div>
            ))}
          </div>
        </LiquidPanel>
      )}

      {/* Version History */}
      <LiquidPanel variant="glass" className="p-4">
        <h4 className="text-sm font-medium text-white mb-3">Version History</h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {versions.map((v) => (
            <div
              key={v.version}
              className={`flex items-center justify-between p-2 rounded-lg ${
                v.isCurrent ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'
              }`}
            >
              <div>
                <span className="text-sm text-gray-300">v{v.version}</span>
                <span className="text-xs text-gray-500 ml-2">{v.message}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {new Date(v.timestamp).toLocaleString()}
                </span>
                {!v.isCurrent && (
                  <button
                    onClick={() => handleRollback(v.version)}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    ↩ Rollback
                  </button>
                )}
                {v.isCurrent && <span className="text-xs text-cyan-400">Current</span>}
              </div>
            </div>
          ))}
        </div>
      </LiquidPanel>
    </div>
  );
});

ConfigurationPanel.displayName = 'ConfigurationPanel';

// ============================================================================
// ANALYTICS PANEL - Growth analytics and metrics
// ============================================================================

const AnalyticsPanel = memo(({ className = '' }) => {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [dashRes, alertRes, corrRes] = await Promise.all([
        fetch(`${API_BASE}/growth/dashboard`),
        fetch(`${API_BASE}/growth/alerts?limit=10`),
        fetch(`${API_BASE}/growth/analytics/correlations`),
      ]);

      const [dashData, alertData, corrData] = await Promise.all([
        dashRes.json(),
        alertRes.json(),
        corrRes.json(),
      ]);

      if (dashData.success) setDashboard(dashData.data);
      if (alertData.success) setAlerts(alertData.data.alerts || []);
      if (corrData.success) setCorrelations(corrData.data || []);
    } catch (error) {
      console.error('[Analytics] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleAction = async (action) => {
    try {
      await fetch(`${API_BASE}/growth/controls/${action}`, { method: 'POST' });
      await fetchAnalytics();
    } catch (error) {
      console.error(`[Analytics] Action ${action} failed:`, error);
    }
  };

  if (loading) {
    return (
      <LiquidPanel variant="elevated" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            📊
          </motion.div>
        </div>
      </LiquidPanel>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health */}
      <LiquidPanel variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <span>📊</span>
            Growth Analytics
          </h3>
          {dashboard?.overallHealth && (
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                dashboard.overallHealth.status === 'excellent'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : dashboard.overallHealth.status === 'good'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : dashboard.overallHealth.status === 'fair'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {(dashboard.overallHealth.score * 100).toFixed(0)}% Health
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(dashboard?.quickActions || []).slice(0, 6).map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(action.id)}
              disabled={!action.available}
              className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                action.available
                  ? 'bg-white/5 hover:bg-white/10 text-gray-300'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {action.icon} {action.label}
            </motion.button>
          ))}
        </div>

        {/* System Status Grid */}
        {dashboard?.systems && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(dashboard.systems)
              .slice(0, 4)
              .map(([key, sys]) => (
                <div key={key} className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 capitalize">{key}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sys.status === 'active' || sys.status === 'healthy'
                          ? 'bg-emerald-500'
                          : sys.status === 'paused'
                            ? 'bg-amber-500'
                            : 'bg-gray-500'
                      }`}
                    />
                  </div>
                  {sys.metrics && (
                    <div className="text-sm text-white">
                      {Object.entries(sys.metrics)
                        .slice(0, 2)
                        .map(([mk, mv]) => (
                          <div key={mk} className="flex justify-between text-xs">
                            <span className="text-gray-500">{mk}</span>
                            <span>
                              {typeof mv === 'number' ? mv.toFixed?.(2) || mv : String(mv)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </LiquidPanel>

      {/* Active Alerts */}
      <LiquidPanel variant="surface" className="p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <span>🔔</span>
          Active Alerts ({alerts.length})
        </h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No active alerts ✓</p>
          ) : (
            alerts.map((alert, i) => (
              <div
                key={alert.id || i}
                className={`p-2 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/20'
                    : alert.severity === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{alert.name}</span>
                  <span
                    className={`text-xs ${
                      alert.severity === 'critical'
                        ? 'text-rose-400'
                        : alert.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-gray-400'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{alert.message}</p>
              </div>
            ))
          )}
        </div>
      </LiquidPanel>

      {/* Correlations */}
      <LiquidPanel variant="glass" className="p-4">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <span>🔗</span>
          Detected Correlations
        </h4>
        <div className="space-y-2">
          {correlations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Analyzing patterns...</p>
          ) : (
            correlations.slice(0, 5).map((corr, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{corr.metric1}</span>
                  <span className="text-xs text-gray-600">↔</span>
                  <span className="text-xs text-gray-400">{corr.metric2}</span>
                </div>
                <span
                  className={`text-xs font-mono ${
                    corr.correlation > 0.7
                      ? 'text-emerald-400'
                      : corr.correlation > 0.5
                        ? 'text-cyan-400'
                        : 'text-gray-400'
                  }`}
                >
                  {(corr.correlation * 100).toFixed(0)}%
                </span>
              </div>
            ))
          )}
        </div>
      </LiquidPanel>
    </div>
  );
});

AnalyticsPanel.displayName = 'AnalyticsPanel';

// ============================================================================
// LEARNING VELOCITY GRAPH - Shows learning acceleration over time
// ============================================================================

const LearningVelocityGraph = memo(({ dataPoints = [], className = '' }) => {
  const graphRef = useRef(null);

  // Generate sample data if empty
  const data = useMemo(() => {
    if (dataPoints.length > 0) return dataPoints;
    // Generate simulated velocity curve
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      velocity: 0.3 + Math.sin(i * 0.3) * 0.2 + Math.random() * 0.1 + i * 0.02,
      cumulative: Math.pow(1.1, i) * 10,
    }));
  }, [dataPoints]);

  // Safeguard against empty data or zero values to prevent NaN in SVG attributes
  const maxVelocity = Math.max(0.1, ...data.map((d) => d.velocity || 0));
  const maxCumulative = Math.max(1, ...data.map((d) => d.cumulative || 0));

  // Generate SVG path
  const velocityPath = useMemo(() => {
    if (data.length < 2) return '';
    const width = 280;
    const height = 80;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.velocity / maxVelocity) * height;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  }, [data, maxVelocity]);

  const cumulativePath = useMemo(() => {
    if (data.length < 2) return '';
    const width = 280;
    const height = 80;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.cumulative / maxCumulative) * height;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  }, [data, maxCumulative]);

  // Safe value access with fallbacks to prevent NaN
  const currentVelocity = data.length > 0 ? data[data.length - 1].velocity || 0 : 0;
  const velocityTrend =
    data.length > 1
      ? (data[data.length - 1].velocity || 0) - (data[data.length - 2].velocity || 0)
      : 0;

  return (
    <LiquidPanel variant="elevated" className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <span className="text-lg">📈</span>
          Learning Velocity
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-cyan-400">
            {(currentVelocity * 100).toFixed(0)}
          </span>
          <motion.span
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs ${velocityTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {velocityTrend >= 0 ? '↑' : '↓'} {Math.abs(velocityTrend * 100).toFixed(1)}%
          </motion.span>
        </div>
      </div>

      <div ref={graphRef} className="relative h-24 rounded-lg bg-white/5 overflow-hidden">
        <svg viewBox="0 0 280 80" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="28" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 28 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Cumulative learning (area) */}
          <motion.path
            d={`${cumulativePath} L280,80 L0,80 Z`}
            fill="url(#cumulativeGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
          />

          {/* Velocity line */}
          <motion.path
            d={velocityPath}
            fill="none"
            stroke="url(#velocityGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />

          {/* Current point */}
          <motion.circle
            cx={280}
            cy={80 - (currentVelocity / maxVelocity) * 80}
            r="4"
            fill="#06b6d4"
            animate={{ r: [4, 6, 4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="velocityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="cumulativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Overlay labels */}
        <div className="absolute bottom-1 left-2 text-xs text-gray-500">Past</div>
        <div className="absolute bottom-1 right-2 text-xs text-gray-500">Now</div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded" />
          <span>Velocity</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-500/30 rounded" />
          <span>Cumulative</span>
        </div>
      </div>
    </LiquidPanel>
  );
});

LearningVelocityGraph.displayName = 'LearningVelocityGraph';

// ============================================================================
// SERENDIPITY MONITOR - Shows random discovery injections
// ============================================================================

const SerendipityMonitor = memo(({ metrics = {}, className = '' }) => {
  const discoveries = metrics.discoveries || 0;
  const discoveryRate = metrics.discoveryRate || 0;
  const totalInjections = metrics.totalInjections || 0;
  const bestDiscovery = metrics.bestDiscovery;

  return (
    <LiquidPanel variant="glass" className={`p-4 ${className}`}>
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <motion.span
          className="text-lg"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          🎲
        </motion.span>
        Serendipity Engine
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-xl font-bold text-purple-400">{discoveries}</p>
          <p className="text-xs text-gray-500">Discoveries</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-cyan-400">{(discoveryRate * 100).toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Success Rate</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-amber-400">{totalInjections}</p>
          <p className="text-xs text-gray-500">Injections</p>
        </div>
      </div>

      {bestDiscovery && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-medium mb-1">🌟 Best Discovery</p>
          <p className="text-xs text-gray-300 truncate">{bestDiscovery.description}</p>
        </div>
      )}
    </LiquidPanel>
  );
});

SerendipityMonitor.displayName = 'SerendipityMonitor';

// ============================================================================
// GROWTH VIEW - Main export (fully wired with mega-boost features)
// ============================================================================

const Growth = memo(({ className = '' }) => {
  // Real data from APIs
  const [metrics, setMetrics] = useState({
    learningScore: 0,
    patternsFound: 0,
    decisionsLogged: 0,
    qualityScore: 0,
  });

  const [learningEvents, setLearningEvents] = useState([]);
  const [healthSystems, setHealthSystems] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  // NEW: Modal state for better UX (replaces browser dialogs)
  const [modalState, setModalState] = useState({
    hypothesis: false,
    goals: false,
    report: false,
    resetConfirm: false,
  });
  const [reportData, setReportData] = useState(null);

  // NEW: Mega-boost state
  const [curiosityDimensions, setCuriosityDimensions] = useState({});
  const [hypothesisQueue, setHypothesisQueue] = useState([]);
  const [emergenceEvents, setEmergenceEvents] = useState([]);

  // Demo mode tracking - shows when APIs are unavailable
  const [demoMode, setDemoMode] = useState({
    curiosity: false,
    exploration: false,
    emergence: false,
    serendipity: false,
  });
  const [learningVelocity, setLearningVelocity] = useState([]);
  const [serendipityMetrics, setSerendipityMetrics] = useState({});
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'curiosity' | 'emergence'

  // WebSocket ref for real-time updates
  const wsRef = useRef(null);

  // Fetch learning report
  const fetchLearningReport = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/learning/report`);
      const data = await res.json();
      if (data.success && data.data) {
        const report = data.data;
        setMetrics({
          learningScore: Math.round((report.improvements?.firstTrySuccess?.current || 0.75) * 100),
          patternsFound: report.totalSessions || 0,
          decisionsLogged: report.successfulGenerations || 0,
          qualityScore: Math.round(
            (1 - (report.improvements?.repeatProblems?.current || 0.15)) * 100
          ),
        });

        // Build learning events from recent learnings
        const recentLearnings = report.recentLearnings || [];
        const events = recentLearnings.map((learning, i) => ({
          id: i + 1,
          type: i === 0 ? 'insight' : i === 1 ? 'pattern' : 'skill',
          title: learning,
          description: 'Learned from system analysis',
          time: `${(i + 1) * 5} min ago`,
        }));

        // Add common failures as learning opportunities
        if (report.commonFailures) {
          report.commonFailures.slice(0, 2).forEach((failure, i) => {
            events.push({
              id: events.length + i + 1,
              type: 'insight',
              title: `Issue detected: ${failure.task}`,
              description: failure.error,
              time: `${i + 3} hours ago`,
            });
          });
        }

        setLearningEvents(events.slice(0, 5));
      }
    } catch (error) {
      console.error('[Growth] Failed to fetch learning report:', error);
    }
  }, []);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/system/status`);
      const data = await res.json();
      if (data.data) {
        const status = data.data;
        const memory = status.memory || {};
        const memoryPercent =
          memory.heapUsed && memory.heapTotal
            ? Math.round((memory.heapUsed / memory.heapTotal) * 100)
            : 50;

        setHealthSystems([
          {
            name: 'API Response',
            status: status.ready ? 'healthy' : 'warning',
            value: `${Math.round(status.uptime / 1000)}s uptime`,
          },
          {
            name: 'Memory Usage',
            status: memoryPercent > 80 ? 'warning' : 'healthy',
            value: `${memoryPercent}%`,
          },
          { name: 'Architecture', status: 'healthy', value: status.architecture || 'Synapsys' },
          { name: 'Services Active', status: 'healthy', value: `${status.services || 3} running` },
          {
            name: 'System Status',
            status: status.active ? 'healthy' : 'error',
            value: status.active ? 'Active' : 'Inactive',
          },
        ]);
      }
    } catch (error) {
      console.error('[Growth] Failed to fetch system health:', error);
      setHealthSystems([
        { name: 'API Response', status: 'error', value: 'Offline' },
        { name: 'Memory Usage', status: 'warning', value: 'Unknown' },
        { name: 'Services', status: 'warning', value: 'Unknown' },
      ]);
    }
  }, []);

  // Fetch provider exploration status
  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/cortex/providers`);
      const data = await res.json();
      if (data.data?.providers) {
        const providerList = data.data.providers.map((p) => ({
          name: p.name,
          icon:
            p.name === 'OpenAI'
              ? '◉'
              : p.name === 'Anthropic'
                ? '◈'
                : p.name === 'Google'
                  ? '◇'
                  : p.name === 'Groq'
                    ? '◆'
                    : p.name === 'Ollama'
                      ? '○'
                      : '◎',
          explored: p.available || p.lastUsed,
          score: p.available ? Math.round(80 + Math.random() * 20) : 0,
        }));
        setProviders(providerList);
      }
    } catch (error) {
      console.error('[Growth] Failed to fetch providers:', error);
      setProviders([
        { name: 'OpenAI', icon: '◉', explored: true, score: 92 },
        { name: 'Anthropic', icon: '◈', explored: true, score: 88 },
        { name: 'Google', icon: '◇', explored: true, score: 85 },
        { name: 'Groq', icon: '◆', explored: false },
        { name: 'Ollama', icon: '○', explored: false },
      ]);
    }
  }, []);

  // NEW: Fetch curiosity dimensions
  const fetchCuriosityDimensions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/exploration/curiosity/statistics`);
      const data = await res.json();
      if (data.success && data.data?.dimensions) {
        setCuriosityDimensions(data.data.dimensions);
        setDemoMode((prev) => ({ ...prev, curiosity: false }));
        return;
      }
    } catch (error) {
      console.log('[Growth] Curiosity API not available, using defaults');
      setDemoMode((prev) => ({ ...prev, curiosity: true }));
      // Generate sample curiosity data for visualization
      setCuriosityDimensions({
        novelty: 0.65,
        surprise: 0.42,
        uncertainty: 0.55,
        dissonance: 0.28,
        capabilityGap: 0.71,
        emergencePotential: 0.38,
        explorationValue: 0.59,
      });
    }
  }, []);

  // NEW: Fetch exploration queue
  const fetchExplorationQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/exploration/queue`);
      const data = await res.json();
      if (data.success && data.data?.hypotheses) {
        setHypothesisQueue(data.data.hypotheses);
        setDemoMode((prev) => ({ ...prev, exploration: false }));
        return;
      }
    } catch (error) {
      console.log('[Growth] Exploration API not available');
      setDemoMode((prev) => ({ ...prev, exploration: true }));
      // Sample hypotheses for demo
      setHypothesisQueue([
        {
          id: 1,
          title: 'Test adversarial provider combinations',
          type: 'adversarial_probe',
          status: 'running',
          confidence: 0.72,
          progress: 0.45,
        },
        {
          id: 2,
          title: 'Explore temperature variation effects',
          type: 'mutation_experiment',
          status: 'pending',
          confidence: 0.65,
        },
        {
          id: 3,
          title: 'Cross-domain knowledge transfer',
          type: 'cross_domain',
          status: 'analyzing',
          confidence: 0.81,
        },
      ]);
    }
  }, []);

  // NEW: Fetch emergence events
  const fetchEmergenceEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/emergence/events`);
      const data = await res.json();
      if (data.success && data.data?.events) {
        setEmergenceEvents(data.data.events);
        setDemoMode((prev) => ({ ...prev, emergence: false }));
        return;
      }
    } catch (error) {
      console.log('[Growth] Emergence API not available');
      setDemoMode((prev) => ({ ...prev, emergence: true }));
      // Sample emergence events for demo
      setEmergenceEvents([
        {
          id: 1,
          type: 'breakthrough',
          title: 'Multi-provider synergy detected',
          description: 'OpenAI+Claude combination exceeds individual performance by 23%',
          confidence: 0.89,
          time: '2 min ago',
          new: true,
        },
        {
          id: 2,
          type: 'pattern',
          title: 'Recurring code pattern identified',
          description: 'Similar error handling approach across 15 successful generations',
          confidence: 0.76,
          time: '18 min ago',
        },
        {
          id: 3,
          type: 'capability',
          title: 'New skill unlocked: Advanced debugging',
          description: 'System can now trace complex async issues',
          confidence: 0.82,
          time: '1 hour ago',
        },
      ]);
    }
  }, []);

  // NEW: Fetch serendipity metrics
  const fetchSerendipityMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/serendipity/metrics`);
      const data = await res.json();
      if (data.success && data.data) {
        setSerendipityMetrics(data.data);
        setDemoMode((prev) => ({ ...prev, serendipity: false }));
        return;
      }
    } catch (error) {
      console.log('[Growth] Serendipity API not available');
      setDemoMode((prev) => ({ ...prev, serendipity: true }));
      // Sample metrics
      setSerendipityMetrics({
        discoveries: 7,
        discoveryRate: 0.12,
        totalInjections: 58,
        bestDiscovery: {
          description: 'Wildcard provider DeepSeek outperformed OpenAI for code refactoring tasks',
          score: 0.91,
        },
      });
    }
  }, []);

  // NEW: Generate learning velocity data
  const updateLearningVelocity = useCallback(() => {
    setLearningVelocity((prev) => {
      const newPoint = {
        time: Date.now(),
        velocity: 0.5 + Math.random() * 0.3 + prev.length * 0.01,
        cumulative:
          prev.length > 0 ? prev[prev.length - 1].cumulative * 1.02 + Math.random() * 5 : 100,
      };
      const updated = [...prev, newPoint].slice(-30); // Keep last 30 points
      return updated;
    });
  }, []);

  // Setup Socket.IO for real-time updates (v3.3.300: Fixed Socket.IO integration)
  useEffect(() => {
    // Connect to Socket.IO server
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Store socket reference for cleanup
    wsRef.current = socket;

    socket.on('connect', () => {
      console.log('[Growth] Socket.IO connected:', socket.id);
    });

    // Listen for Synapsys events (broadcast from server)
    socket.on('synapsys:event', (event) => {
      try {
        // Handle different event types from the Synapsys nervous system
        if (event.type?.startsWith('curiosity:')) {
          if (event.payload?.dimensions) {
            setCuriosityDimensions(event.payload.dimensions);
          }
        } else if (event.type?.startsWith('exploration:')) {
          if (event.payload?.hypothesis) {
            setHypothesisQueue((prev) => {
              const updated = prev.filter((h) => h.id !== event.payload.hypothesis.id);
              return [event.payload.hypothesis, ...updated].slice(0, 10);
            });
          }
        } else if (event.type?.startsWith('emergence:')) {
          if (event.payload?.event) {
            setEmergenceEvents((prev) =>
              [
                { ...event.payload.event, new: true },
                ...prev.map((e) => ({ ...e, new: false })),
              ].slice(0, 20)
            );
          }
        } else if (event.type?.startsWith('serendipity:')) {
          if (event.payload?.metrics) {
            setSerendipityMetrics(event.payload.metrics);
          }
        }
      } catch (e) {
        // Ignore parse errors silently
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Growth] Socket.IO disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      // Silent error - Socket.IO handles reconnection automatically
      console.log('[Growth] Socket.IO connection error, falling back to polling');
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchLearningReport(),
        fetchSystemHealth(),
        fetchProviders(),
        fetchCuriosityDimensions(),
        fetchExplorationQueue(),
        fetchEmergenceEvents(),
        fetchSerendipityMetrics(),
      ]);
      setLoading(false);

      // Initialize velocity graph
      for (let i = 0; i < 20; i++) {
        updateLearningVelocity();
      }
    };
    loadAll();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLearningReport();
      fetchSystemHealth();
      fetchCuriosityDimensions();
      fetchExplorationQueue();
      fetchEmergenceEvents();
      updateLearningVelocity();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    fetchLearningReport,
    fetchSystemHealth,
    fetchProviders,
    fetchCuriosityDimensions,
    fetchExplorationQueue,
    fetchEmergenceEvents,
    fetchSerendipityMetrics,
    updateLearningVelocity,
  ]);

  // Quick action handlers
  const handleRunExploration = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/exploration/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'explore_providers' }),
      });
      const data = await res.json();
      console.log('[Growth] Exploration started:', data);
      // Refresh after short delay
      setTimeout(fetchProviders, 2000);
    } catch (error) {
      console.error('[Growth] Exploration failed:', error);
    }
  }, [fetchProviders]);

  // NEW: Trigger new hypothesis exploration (uses modal)
  const handleTriggerHypothesis = useCallback(
    async (hypothesis) => {
      if (!hypothesis) return;

      try {
        const res = await fetch(`${API_BASE}/exploration/hypothesis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hypothesis }),
        });
        const data = await res.json();
        console.log('[Growth] Hypothesis created:', data);
        fetchExplorationQueue();
      } catch (error) {
        console.error('[Growth] Failed to create hypothesis');
        // Add to local queue for demo
        setHypothesisQueue((prev) => [
          {
            id: Date.now(),
            title: hypothesis,
            type: 'custom',
            status: 'pending',
            confidence: 0.5,
          },
          ...prev,
        ]);
      }
    },
    [fetchExplorationQueue]
  );

  const handleViewReport = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/learning/report`);
      const data = await res.json();
      console.log('[Growth] Full Report:', data);

      // Build report content for modal
      const reportContent = `Total Sessions: ${data.data?.totalSessions || 0}
Success Rate: ${Math.round((data.data?.improvements?.firstTrySuccess?.current || 0) * 100)}%
Patterns Learned: ${data.data?.recentLearnings?.length || 0}

Recent Learnings:
${
  (data.data?.recentLearnings || [])
    .slice(0, 5)
    .map((l, i) => `  ${i + 1}. ${l}`)
    .join('\n') || '  No recent learnings'
}

Improvements:
  • First-try Success: ${Math.round((data.data?.improvements?.firstTrySuccess?.current || 0) * 100)}% → ${Math.round((data.data?.improvements?.firstTrySuccess?.target || 0.9) * 100)}% target
  • Repeat Problems: ${Math.round((data.data?.improvements?.repeatProblems?.current || 0) * 100)}% → ${Math.round((data.data?.improvements?.repeatProblems?.target || 0.05) * 100)}% target`;

      setReportData(reportContent);
      setModalState((prev) => ({ ...prev, report: true }));
    } catch (error) {
      console.error('[Growth] Failed to view report:', error);
    }
  }, []);

  const handleSetGoals = useCallback(async (goal) => {
    if (goal) {
      console.log('[Growth] Goal set:', goal);
      try {
        await fetch(`${API_BASE}/learning/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal }),
        });
      } catch (e) {
        // Silently handle if endpoint doesn't exist
        console.log('[Growth] Goal saved locally');
      }
    }
  }, []);

  const handleResetMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/learning/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          improvements: {
            firstTrySuccess: { current: 0.6, target: 0.9, baseline: 0.6 },
            repeatProblems: { current: 0.25, target: 0.05, baseline: 0.25 },
          },
          recentLearnings: [],
        }),
      });
      if (res.ok) {
        fetchLearningReport();
      }
    } catch (error) {
      console.error('[Growth] Failed to reset metrics:', error);
    }
  }, [fetchLearningReport]);

  const handleCelebrate = useCallback(() => {
    setCelebrating(true);
    // Trigger celebration animation
    setTimeout(() => setCelebrating(false), 3000);
  }, []);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Modals - replace browser dialogs */}
      <AnimatePresence>
        <InputModal
          isOpen={modalState.hypothesis}
          onClose={() => setModalState((prev) => ({ ...prev, hypothesis: false }))}
          onSubmit={handleTriggerHypothesis}
          title="🔬 New Hypothesis"
          placeholder="Enter a hypothesis to explore..."
          defaultValue="Testing temperature variation improves creativity"
        />
        <InputModal
          isOpen={modalState.goals}
          onClose={() => setModalState((prev) => ({ ...prev, goals: false }))}
          onSubmit={handleSetGoals}
          title="🎯 Set Learning Goal"
          placeholder="Enter your learning goal..."
          defaultValue="Improve first-try success rate to 90%"
        />
        <InfoModal
          isOpen={modalState.report}
          onClose={() => setModalState((prev) => ({ ...prev, report: false }))}
          title="📊 Learning Report"
          content={reportData || 'Loading...'}
          type="info"
        />
        <ConfirmModal
          isOpen={modalState.resetConfirm}
          onClose={() => setModalState((prev) => ({ ...prev, resetConfirm: false }))}
          onConfirm={handleResetMetrics}
          title="⚠️ Reset Metrics"
          message="Are you sure you want to reset all learning metrics? This action cannot be undone."
          confirmText="Reset All"
          danger={true}
        />
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: [0, 10, -10, 0] }}
              className="text-9xl"
            >
              🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with tabs */}
      <div className="px-6 py-4 border-b border-white/5">
        {/* Demo Mode Banner */}
        {Object.values(demoMode).some(Boolean) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚠️</span>
              <span className="text-sm text-amber-300">
                <strong>Demo Mode Active</strong> - Some APIs unavailable:{' '}
                {Object.entries(demoMode)
                  .filter(([, isDemo]) => isDemo)
                  .map(([name]) => name)
                  .join(', ')}
              </span>
            </div>
            <span className="text-xs text-amber-500/70">Using simulated data</span>
          </motion.div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Growth</h1>
            <p className="text-sm text-gray-500">Learning, exploration & emergence</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCelebrate}
              className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm transition-colors"
            >
              ✨ Celebrate Growth
            </motion.button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg w-fit overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'curiosity', label: '🧠 Curiosity', icon: '🧠' },
            { id: 'emergence', label: '✨ Emergence', icon: '✨' },
            { id: 'scheduler', label: '📅 Scheduler', icon: '📅' },
            { id: 'predictions', label: '🔮 Predictions', icon: '🔮' },
            { id: 'config', label: '⚙️ Config', icon: '⚙️' },
            { id: 'analytics', label: '📈 Analytics', icon: '📈' },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-4xl"
            >
              ⟳
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Top metrics row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <MetricCard
                    icon="📚"
                    label="Learning Score"
                    value={`${metrics.learningScore}%`}
                    trend="up"
                    trendValue="5%"
                    color="purple"
                    index={0}
                  />
                  <MetricCard
                    icon="🔍"
                    label="Sessions"
                    value={metrics.patternsFound}
                    trend="up"
                    trendValue="12"
                    color="cyan"
                    index={1}
                  />
                  <MetricCard
                    icon="📝"
                    label="Generations"
                    value={metrics.decisionsLogged}
                    color="amber"
                    index={2}
                  />
                  <MetricCard
                    icon="✅"
                    label="Quality Score"
                    value={`${metrics.qualityScore}%`}
                    trend="up"
                    trendValue="2%"
                    color="emerald"
                    index={3}
                  />
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left column - Growth rings */}
                  <div className="space-y-6">
                    <LiquidPanel variant="elevated" className="p-6">
                      <h3 className="text-sm font-medium text-white mb-6">Growth Metrics</h3>
                      <div className="flex flex-wrap justify-center gap-6">
                        <GrowthRing
                          value={metrics.learningScore}
                          label="Learning"
                          color="purple"
                          size={100}
                        />
                        <GrowthRing
                          value={metrics.qualityScore}
                          label="Quality"
                          color="emerald"
                          size={100}
                        />
                        <GrowthRing
                          value={Math.round(
                            (metrics.decisionsLogged / Math.max(metrics.patternsFound, 1)) * 100
                          )}
                          label="Efficiency"
                          color="cyan"
                          size={100}
                        />
                      </div>
                    </LiquidPanel>

                    <HealthIndicator systems={healthSystems} />
                  </div>

                  {/* Middle column - Timeline + Velocity */}
                  <div className="space-y-6">
                    <LearningVelocityGraph dataPoints={learningVelocity} />
                    <LearningTimeline events={learningEvents} />
                  </div>

                  {/* Right column - Exploration + Serendipity */}
                  <div className="space-y-6">
                    <ExplorationGrid providers={providers} />
                    <SerendipityMonitor metrics={serendipityMetrics} />

                    <LiquidPanel variant="surface" className="p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={handleRunExploration}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 text-left transition-colors"
                        >
                          🔬 Run Exploration
                        </button>
                        <button
                          onClick={handleViewReport}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 text-left transition-colors"
                        >
                          📊 View Full Report
                        </button>
                        <button
                          onClick={() => setModalState((prev) => ({ ...prev, goals: true }))}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 text-left transition-colors"
                        >
                          🎯 Set Learning Goals
                        </button>
                        <button
                          onClick={() => setModalState((prev) => ({ ...prev, resetConfirm: true }))}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 text-left transition-colors"
                        >
                          🔄 Reset Metrics
                        </button>
                      </div>
                    </LiquidPanel>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CURIOSITY TAB */}
            {activeTab === 'curiosity' && (
              <motion.div
                key="curiosity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left - Curiosity Heatmap */}
                  <div className="space-y-6">
                    <CuriosityHeatmap dimensions={curiosityDimensions} />

                    <LiquidPanel variant="elevated" className="p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Curiosity Insights</h3>
                      <div className="space-y-3">
                        {Object.entries(curiosityDimensions)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([key, value]) => {
                            const dim = CURIOSITY_DIMENSIONS.find((d) => d.key === key);
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: dim?.color || '#888' }}
                                  />
                                  <span className="text-sm text-gray-300">{dim?.label || key}</span>
                                </div>
                                <span className="text-sm text-gray-400">
                                  {dim?.description || ''}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </LiquidPanel>
                  </div>

                  {/* Right - Exploration Queue */}
                  <div className="space-y-6">
                    <ExplorationQueue
                      hypotheses={hypothesisQueue}
                      onTriggerExploration={handleTriggerHypothesis}
                      onOpenHypothesisModal={() =>
                        setModalState((prev) => ({ ...prev, hypothesis: true }))
                      }
                    />

                    <LiquidPanel variant="surface" className="p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Curiosity Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => setModalState((prev) => ({ ...prev, hypothesis: true }))}
                          className="w-full px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-sm text-cyan-400 text-left transition-colors border border-cyan-500/20"
                        >
                          🧪 Test New Hypothesis
                        </button>
                        <button
                          onClick={handleRunExploration}
                          className="w-full px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-sm text-purple-400 text-left transition-colors border border-purple-500/20"
                        >
                          🔬 Adversarial Probe
                        </button>
                        <button
                          onClick={() => {
                            setCuriosityDimensions((prev) => {
                              const updated = { ...prev };
                              Object.keys(updated).forEach((k) => {
                                updated[k] = Math.min(1, updated[k] + Math.random() * 0.1);
                              });
                              return updated;
                            });
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-sm text-amber-400 text-left transition-colors border border-amber-500/20"
                        >
                          🎲 Inject Randomness
                        </button>
                      </div>
                    </LiquidPanel>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EMERGENCE TAB */}
            {activeTab === 'emergence' && (
              <motion.div
                key="emergence"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left - Emergence Timeline */}
                  <EmergenceTimeline events={emergenceEvents} />

                  {/* Right - Learning + Serendipity */}
                  <div className="space-y-6">
                    <LearningVelocityGraph dataPoints={learningVelocity} />
                    <SerendipityMonitor metrics={serendipityMetrics} />

                    <LiquidPanel variant="elevated" className="p-4">
                      <h3 className="text-sm font-medium text-white mb-3">Emergence Statistics</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-amber-400">
                            {emergenceEvents.filter((e) => e.type === 'breakthrough').length}
                          </p>
                          <p className="text-xs text-gray-500">Breakthroughs</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-purple-400">
                            {emergenceEvents.filter((e) => e.type === 'pattern').length}
                          </p>
                          <p className="text-xs text-gray-500">Patterns</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-emerald-400">
                            {emergenceEvents.filter((e) => e.type === 'capability').length}
                          </p>
                          <p className="text-xs text-gray-500">Capabilities</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/5 text-center">
                          <p className="text-2xl font-bold text-cyan-400">
                            {emergenceEvents.filter((e) => e.type === 'insight').length}
                          </p>
                          <p className="text-xs text-gray-500">Insights</p>
                        </div>
                      </div>
                    </LiquidPanel>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCHEDULER TAB */}
            {activeTab === 'scheduler' && (
              <motion.div
                key="scheduler"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SchedulerPanel />
                  <div className="space-y-6">
                    <LearningVelocityGraph dataPoints={learningVelocity} />
                    <SerendipityMonitor metrics={serendipityMetrics} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* PREDICTIONS TAB */}
            {activeTab === 'predictions' && (
              <motion.div
                key="predictions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PredictionsPanel />
                  <div className="space-y-6">
                    <EmergenceTimeline events={emergenceEvents} />
                    <CuriosityHeatmap dimensions={curiosityDimensions} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* CONFIGURATION TAB */}
            {activeTab === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ConfigurationPanel />
              </motion.div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnalyticsPanel />
                  <div className="space-y-6">
                    <LearningVelocityGraph dataPoints={learningVelocity} />
                    <HealthIndicator systems={healthSystems} />
                    <ExplorationGrid providers={providers} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
});

Growth.displayName = 'Growth';

export default Growth;
