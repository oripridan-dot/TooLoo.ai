// @version 3.3.442
// TooLoo.ai ControlDeck - System Status Header
// ═══════════════════════════════════════════════════════════════════════════
// Top-bar "cockpit" showing orchestrator state at a glance
// Maps directly to: Precog router + Meta-learner calibration + Budget tracker
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useOrchestrator,
  useEvaluation,
  useUIMode,
  useConnection,
  useSystemState,
} from '../store/systemStateStore.js';

// ============================================================================
// PROVIDER ICONS / COLORS
// ============================================================================

const PROVIDER_CONFIG = {
  anthropic: {
    name: 'Claude',
    color: '#E97451',
    icon: '🧠',
    gradient: 'linear-gradient(135deg, #E97451 0%, #D35400 100%)',
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#4B7BEC',
    icon: '🌊',
    gradient: 'linear-gradient(135deg, #4B7BEC 0%, #3867D6 100%)',
  },
  openai: {
    name: 'GPT',
    color: '#10A37F',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #10A37F 0%, #0D8A6F 100%)',
  },
  gemini: {
    name: 'Gemini',
    color: '#886FBF',
    icon: '💎',
    gradient: 'linear-gradient(135deg, #886FBF 0%, #6B5B95 100%)',
  },
  ollama: {
    name: 'Ollama',
    color: '#6C757D',
    icon: '🦙',
    gradient: 'linear-gradient(135deg, #6C757D 0%, #495057 100%)',
  },
  default: {
    name: 'AI',
    color: '#9B59B6',
    icon: '🤖',
    gradient: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * ProviderBadge - Shows which LLM provider is currently active
 */
const ProviderBadge = ({ provider, model, isProcessing }) => {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.default;

  return (
    <motion.div
      className="provider-badge"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: config.gradient,
        color: '#fff',
        fontWeight: 500,
        fontSize: '13px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: '16px' }}>{config.icon}</span>
      <span>{config.name}</span>
      {model && (
        <span
          style={{
            fontSize: '11px',
            opacity: 0.8,
            padding: '2px 6px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
          }}
        >
          {model.split('/').pop()}
        </span>
      )}
      {isProcessing && (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ fontSize: '12px' }}
        >
          ⚙️
        </motion.span>
      )}
    </motion.div>
  );
};

/**
 * CostGauge - Visual budget/cost indicator
 */
const CostGauge = ({ currentCost, sessionCost, remainingBudget }) => {
  const budgetUsed = remainingBudget > 0 ? ((100 - remainingBudget) / 100) * 100 : 0;

  const getColor = () => {
    if (budgetUsed > 80) return '#E74C3C';
    if (budgetUsed > 60) return '#F39C12';
    return '#2ECC71';
  };

  return (
    <div
      className="cost-gauge"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '60px',
          height: '6px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${budgetUsed}%` }}
          style={{
            height: '100%',
            background: getColor(),
            borderRadius: '3px',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary, #888)',
          fontFamily: 'monospace',
        }}
      >
        ${sessionCost.toFixed(3)}
      </span>
    </div>
  );
};

/**
 * ConfidenceRing - SVG ring showing calibration/confidence level
 */
const ConfidenceRing = ({ score, level }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score);

  const getColor = () => {
    if (score > 0.8) return '#2ECC71';
    if (score > 0.6) return '#F39C12';
    return '#E74C3C';
  };

  return (
    <div
      className="confidence-ring"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        {/* Background circle */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <motion.circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Center text */}
        <text
          x="20"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary, #fff)"
          fontSize="10"
          fontWeight="600"
        >
          {Math.round(score * 100)}
        </text>
      </svg>
      <span
        style={{
          fontSize: '11px',
          color: getColor(),
          textTransform: 'uppercase',
          fontWeight: 500,
        }}
      >
        {level}
      </span>
    </div>
  );
};

/**
 * ModeTab - Individual mode selector tab
 */
const ModeTab = ({ mode, isActive, onClick, icon, label }) => {
  return (
    <motion.button
      onClick={() => onClick(mode)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        background: isActive ? 'var(--accent-primary, #9B59B6)' : 'rgba(255,255,255,0.05)',
        color: isActive ? '#fff' : 'var(--text-secondary, #888)',
        transition: 'all 0.2s ease',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
};

/**
 * ModeTabs - Mode selector component
 */
const ModeTabs = ({ currentMode, onModeChange }) => {
  const modes = [
    { mode: 'chat', icon: '💬', label: 'Chat' },
    { mode: 'planner', icon: '📋', label: 'Planner' },
    { mode: 'analysis', icon: '🔍', label: 'Analysis' },
    { mode: 'studio', icon: '🎨', label: 'Studio' },
  ];

  return (
    <div
      className="mode-tabs"
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
      }}
    >
      {modes.map((m) => (
        <ModeTab
          key={m.mode}
          mode={m.mode}
          isActive={currentMode === m.mode}
          onClick={onModeChange}
          icon={m.icon}
          label={m.label}
        />
      ))}
    </div>
  );
};

/**
 * ConnectionIndicator - Shows WebSocket status
 */
const ConnectionIndicator = ({ connected }) => {
  return (
    <motion.div
      animate={{
        scale: connected ? [1, 1.1, 1] : 1,
        opacity: connected ? 1 : 0.5,
      }}
      transition={{ repeat: connected ? Infinity : 0, duration: 2 }}
      style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: connected ? '#2ECC71' : '#E74C3C',
        boxShadow: connected ? '0 0 8px rgba(46,204,113,0.5)' : '0 0 8px rgba(231,76,60,0.5)',
      }}
      title={connected ? 'Connected to backend' : 'Disconnected'}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ControlDeck = () => {
  const orchestrator = useOrchestrator();
  const evaluation = useEvaluation();
  const uiMode = useUIMode();
  const connection = useConnection();
  const setUIMode = useSystemState((s) => s.setUIMode);
  const initializeConnection = useSystemState((s) => s.initializeConnection);

  // Initialize socket connection on mount
  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  const handleModeChange = (mode) => {
    setUIMode(mode);
  };

  return (
    <motion.header
      className="control-deck"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(15, 15, 20, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left Section: Provider + Cost */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ProviderBadge
          provider={orchestrator.activeProvider}
          model={orchestrator.providerModel}
          isProcessing={orchestrator.isProcessing}
        />
        <CostGauge
          currentCost={orchestrator.currentCost}
          sessionCost={orchestrator.sessionCost}
          remainingBudget={orchestrator.remainingBudget}
        />
      </div>

      {/* Center Section: Mode Tabs */}
      <ModeTabs currentMode={uiMode} onModeChange={handleModeChange} />

      {/* Right Section: Confidence + Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ConfidenceRing score={evaluation.calibrationScore} level={evaluation.confidenceLevel} />
        <ConnectionIndicator connected={connection.connected} />
      </div>
    </motion.header>
  );
};

export default ControlDeck;
