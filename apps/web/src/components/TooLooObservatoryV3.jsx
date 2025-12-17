/**
 * TooLoo Observatory V3 - Real-Time System Monitor
 * 
 * A clean, data-driven dashboard showing:
 * - Genesis status and autonomous thinking cycles
 * - Real LLM provider status
 * - Skills and system metrics
 * - Live activity stream
 * 
 * @version 3.0.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, ConnectionState } from '../hooks/useSocket';
import { apiRequest } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely convert any value to a renderable string
 * Prevents "Objects are not valid as a React child" errors
 */
function safeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // Try to get a sensible string representation
    if (value.message) return String(value.message);
    if (value.text) return String(value.text);
    if (value.content) return String(value.content);
    if (value.description) return String(value.description);
    if (value.name) return String(value.name);
    try {
      return JSON.stringify(value).slice(0, 200);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

function formatUptime(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, label, pulse = false }) {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    warning: 'bg-yellow-500',
    idle: 'bg-blue-500',
    thinking: 'bg-purple-500',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.offline}`} />
        {pulse && (
          <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${colors[status] || colors.offline} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS CARD - The Brain Status
// ═══════════════════════════════════════════════════════════════════════════════

function GenesisCard({ genesis, onStart, onStop, skillCount }) {
  // Determine if Genesis is truly alive (not just mock mode)
  const isMockMode = genesis?.source === 'mock';
  const isRunning = genesis?.running || genesis?.isAlive;
  const isAlive = isRunning && !isMockMode;
  
  const phase = genesis?.mind?.phase || genesis?.mode || 'offline';
  const cycleNumber = genesis?.brain?.totalThoughts || genesis?.metrics?.thoughtCycles || 0;
  const uptime = genesis?.uptime || 0;
  const autonomyMode = genesis?.soul?.autonomyMode || genesis?.mode || 'guided';
  
  const phaseLabels = {
    'self-awareness': '🔍 Analyzing',
    'planning': '📋 Planning',
    'decision': '🎯 Deciding',
    'execution': '⚡ Executing',
    'observe': '👁️ Observing',
    'idle': '💭 Thinking',
    'offline': '😴 Sleeping',
  };
  
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl p-5 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <motion.div 
              className={`text-3xl ${isAlive ? '' : 'grayscale opacity-50'}`}
              animate={isAlive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🧠
            </motion.div>
            {isAlive && (
              <motion.div 
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Genesis</h2>
            <p className="text-xs text-gray-500">
              {genesis?.soul?.name || 'TooLoo'} • {isMockMode ? 'MOCK' : autonomyMode.toUpperCase()}
            </p>
          </div>
        </div>
        
        <button
          onClick={isAlive ? onStop : onStart}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isAlive
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
          }`}
        >
          {isAlive ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>
      
      {/* Mock mode notice */}
      {isMockMode && (
        <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-[10px] text-yellow-400 text-center">
            🔸 Mock Mode - Run <code className="bg-black/30 px-1 rounded">pnpm genesis:start</code> for full autonomy
          </p>
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-black/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{cycleNumber}</div>
          <div className="text-[10px] text-gray-500 uppercase">Thoughts</div>
        </div>
        <div className="bg-black/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{skillCount || genesis?.hands?.skillsLoaded || 0}</div>
          <div className="text-[10px] text-gray-500 uppercase">Skills</div>
        </div>
        <div className="bg-black/30 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-white">{formatUptime(uptime)}</div>
          <div className="text-[10px] text-gray-500 uppercase">Uptime</div>
        </div>
      </div>
      
      {/* Current Phase */}
      <div className="bg-black/20 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Current Phase</span>
          <motion.span 
            className="text-sm font-medium text-white"
            key={phase}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {phaseLabels[phase] || safeString(phase)}
          </motion.span>
        </div>
        
        {/* Phase progress bar */}
        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
            initial={{ width: '0%' }}
            animate={{ 
              width: isAlive ? '100%' : '0%',
              transition: { duration: isAlive ? 60 : 0.3, ease: 'linear' }
            }}
            key={cycleNumber}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM PROVIDERS CARD
// ═══════════════════════════════════════════════════════════════════════════════

function ProvidersCard({ providers, providersOnline }) {
  const providerInfo = {
    deepseek: { name: 'DeepSeek', icon: '🔷', color: 'text-blue-400' },
    anthropic: { name: 'Anthropic', icon: '🟣', color: 'text-purple-400' },
    openai: { name: 'OpenAI', icon: '🟢', color: 'text-green-400' },
    gemini: { name: 'Gemini', icon: '🔵', color: 'text-cyan-400' },
  };
  
  // Support both array of provider IDs and object with status
  const onlineProviders = Array.isArray(providers) 
    ? providers 
    : (typeof providersOnline === 'number' && providersOnline > 0)
      ? ['deepseek', 'anthropic', 'openai', 'gemini'].slice(0, providersOnline)
      : [];
  
  const onlineCount = onlineProviders.length;
  
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">LLM Providers</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          onlineCount === 4 ? 'bg-emerald-500/20 text-emerald-400' : 
          onlineCount > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {onlineCount}/4 Online
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {['deepseek', 'anthropic', 'openai', 'gemini'].map(id => {
          const info = providerInfo[id];
          const isOnline = onlineProviders.includes(id);
          
          return (
            <div 
              key={id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                isOnline ? 'bg-gray-800/50' : 'bg-gray-900/30 opacity-40'
              }`}
            >
              <span className="text-base">{info.icon}</span>
              <span className={`text-xs ${isOnline ? info.color : 'text-gray-600'}`}>
                {info.name}
              </span>
              {isOnline && (
                <div className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM METRICS CARD
// ═══════════════════════════════════════════════════════════════════════════════

function SystemMetricsCard({ health, pulse }) {
  const memoryUsed = pulse?.metrics?.memory?.used || 0;
  const memoryTotal = pulse?.metrics?.memory?.total || 1;
  const memoryPercent = pulse?.metrics?.memory?.percentage || 0;
  const activeSessions = pulse?.metrics?.sessions?.active || 0;
  
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">System</h3>
        <StatusBadge 
          status={health?.status === 'healthy' ? 'online' : 'warning'} 
          label={health?.status || 'Unknown'} 
        />
      </div>
      
      <div className="space-y-3">
        {/* Memory */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Memory</span>
            <span className="text-gray-400">{formatBytes(memoryUsed)} / {formatBytes(memoryTotal)}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${
                memoryPercent > 90 ? 'bg-red-500' : 
                memoryPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${memoryPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {/* Version & Sessions */}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Version</span>
          <span className="text-gray-400 font-mono">{health?.version || '?'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Active Sessions</span>
          <span className="text-gray-400">{activeSessions}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Uptime</span>
          <span className="text-gray-400">{formatUptime((health?.uptime || 0) * 1000)}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THINKING VISUALIZER - Shows what Genesis is thinking
// ═══════════════════════════════════════════════════════════════════════════════

function ThinkingVisualizer({ currentThought, currentPlan, currentDecision, phase }) {
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <motion.span 
          className="text-lg"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          💭
        </motion.span>
        <h3 className="text-sm font-medium text-gray-300">Live Thinking</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        {/* Current Thought */}
        {currentThought && (
          <motion.div 
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-blue-400">🔍 Analysis</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{safeString(currentThought)}</p>
          </motion.div>
        )}
        
        {/* Current Plan */}
        {currentPlan && (
          <motion.div 
            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-purple-400">📋 Plan</span>
            </div>
            <p className="text-xs text-gray-300 font-medium mb-1">{safeString(currentPlan.goal)}</p>
            {currentPlan.steps && (
              <div className="space-y-1">
                {currentPlan.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className={step.status === 'completed' ? 'text-emerald-400' : 'text-gray-500'}>
                      {step.status === 'completed' ? '✓' : '○'}
                    </span>
                    <span className="truncate">{safeString(step.description || step)}</span>
                  </div>
                ))}
                {currentPlan.steps.length > 3 && (
                  <span className="text-[10px] text-gray-500">+{currentPlan.steps.length - 3} more steps</span>
                )}
              </div>
            )}
          </motion.div>
        )}
        
        {/* Current Decision */}
        {currentDecision && (
          <motion.div 
            className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-amber-400">🎯 Decision</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{safeString(currentDecision)}</p>
          </motion.div>
        )}
        
        {/* Empty state */}
        {!currentThought && !currentPlan && !currentDecision && (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <span className="text-2xl mb-2 block">🌙</span>
              <p className="text-xs">Waiting for thoughts...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS VISUALIZATION - Visual flow with control panel
// ═══════════════════════════════════════════════════════════════════════════════

// Preset process stages for the Genesis thinking cycle
const GENESIS_PROCESS_STAGES = [
  { id: 'awareness', label: 'Self-Analysis', icon: '🔍', color: 'blue' },
  { id: 'planning', label: 'Planning', icon: '📋', color: 'purple' },
  { id: 'decision', label: 'Decision', icon: '🎯', color: 'amber' },
  { id: 'execution', label: 'Execution', icon: '⚡', color: 'emerald' },
  { id: 'reflection', label: 'Reflection', icon: '💭', color: 'cyan' },
];

// Map Genesis phases to process stages
const phaseToStage = {
  'self-awareness': 'awareness',
  'analyzing': 'awareness',
  'thinking': 'awareness',
  'planning': 'planning',
  'decision': 'decision',
  'deciding': 'decision',
  'executing': 'execution',
  'execution': 'execution',
  'awaiting-permission': 'execution',
  'reflecting': 'reflection',
  'reflection': 'reflection',
  'idle': null,
};

// Quick action buttons for different contexts
const QUICK_ACTIONS = {
  approval: [
    { id: 'approve', label: '✅ Approve', color: 'emerald', action: 'approve' },
    { id: 'approve-all', label: '✅✅ Approve All', color: 'green', action: 'approve-all' },
    { id: 'deny', label: '❌ Deny', color: 'red', action: 'deny' },
    { id: 'skip', label: '⏭️ Skip', color: 'gray', action: 'skip' },
  ],
  guidance: [
    { id: 'continue', label: '▶️ Continue', color: 'blue', action: 'continue' },
    { id: 'pause', label: '⏸️ Pause', color: 'amber', action: 'pause' },
    { id: 'reset', label: '🔄 Reset', color: 'gray', action: 'reset' },
  ],
  autonomy: [
    { id: 'observe', label: '👁️ Observe', color: 'gray', mode: 'observe' },
    { id: 'guided', label: '🎯 Guided', color: 'blue', mode: 'guided' },
    { id: 'collab', label: '🤝 Collab', color: 'purple', mode: 'collaborative' },
    { id: 'auto', label: '🚀 Auto', color: 'emerald', mode: 'autonomous' },
  ],
};

function ProcessStageNode({ stage, status, isActive, detail, onClick }) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
    amber: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/50' },
    emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/50' },
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/50' },
  };
  
  const colors = colorMap[stage.color] || colorMap.blue;
  
  return (
    <motion.div 
      className={`relative cursor-pointer transition-all duration-300 ${isActive ? 'scale-105' : 'scale-100'}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`
        relative p-2 rounded-lg border-2 transition-all duration-300
        ${status === 'completed' ? `${colors.bg} ${colors.border} opacity-60` : ''}
        ${status === 'active' ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}` : ''}
        ${status === 'pending' ? 'bg-gray-800/30 border-gray-700 opacity-40' : ''}
      `}>
        {status === 'active' && (
          <motion.div 
            className={`absolute inset-0 rounded-lg ${colors.border} border-2 opacity-50`}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <div className="text-lg text-center">{stage.icon}</div>
        <div className={`text-[9px] font-medium text-center ${status === 'active' ? colors.text : 'text-gray-500'}`}>
          {stage.label}
        </div>
      </div>
    </motion.div>
  );
}

function ProcessConnector({ isActive, isCompleted }) {
  return (
    <div className="flex items-center justify-center w-6 relative">
      <div className={`h-0.5 w-full transition-all duration-500 ${
        isCompleted ? 'bg-emerald-500' : isActive ? 'bg-blue-500' : 'bg-gray-700'
      }`} />
      {isActive && (
        <motion.div 
          className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full"
          animate={{ x: [-8, 8, -8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

function QuickActionButton({ action, onClick, disabled }) {
  const colorMap = {
    emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30',
    green: 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30',
    red: 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30',
    amber: 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30',
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400 hover:bg-purple-500/30',
    gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400 hover:bg-gray-500/30',
  };
  
  return (
    <motion.button
      onClick={() => onClick(action)}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`px-2 py-1 rounded border text-[10px] font-medium transition-all ${colorMap[action.color]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {action.label}
    </motion.button>
  );
}

function ProcessVisualization({ events, genesis, thinking, onSendCommand }) {
  const [commandText, setCommandText] = useState('');
  const [expandedContent, setExpandedContent] = useState(null);
  const [currentAutonomy, setCurrentAutonomy] = useState('guided');
  const contentRef = useRef(null);
  
  // Determine current stage from genesis phase
  const currentPhase = genesis?.mind?.phase || 'idle';
  const currentStageId = phaseToStage[currentPhase];
  const needsApproval = currentPhase === 'awaiting-permission';
  const pendingPermission = genesis?.mind?.pendingApprovals || genesis?.brain?.pendingApprovals;
  
  // Track cycle progress
  const currentCycle = genesis?.brain?.totalThoughts || 0;
  
  // Derive stage statuses
  const getStageStatus = (stageIndex, stageId) => {
    if (!currentStageId) return 'pending';
    const currentIndex = GENESIS_PROCESS_STAGES.findIndex(s => s.id === currentStageId);
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };
  
  // Get full detail for each stage
  const getStageDetail = (stageId) => {
    switch (stageId) {
      case 'awareness': return thinking?.thought;
      case 'planning': return thinking?.plan?.goal || (typeof thinking?.plan === 'string' ? thinking.plan : JSON.stringify(thinking?.plan, null, 2));
      case 'decision': return thinking?.decision;
      case 'execution': return genesis?.mind?.currentGoal;
      case 'reflection': return null;
      default: return null;
    }
  };
  
  // Handle quick action clicks
  const handleQuickAction = async (action) => {
    try {
      if (action.action === 'approve') {
        await apiRequest('/genesis/approve', { method: 'POST', body: JSON.stringify({ permissionId: 'current' }) });
      } else if (action.action === 'approve-all') {
        await apiRequest('/genesis/approve-all', { method: 'POST' });
      } else if (action.action === 'deny') {
        await apiRequest('/genesis/deny', { method: 'POST', body: JSON.stringify({ permissionId: 'current' }) });
      } else if (action.action === 'skip') {
        await apiRequest('/genesis/skip', { method: 'POST' });
      } else if (action.action === 'continue') {
        await apiRequest('/genesis/continue', { method: 'POST' });
      } else if (action.action === 'pause') {
        await apiRequest('/genesis/pause', { method: 'POST' });
      } else if (action.mode) {
        await apiRequest('/genesis/autonomy', { method: 'POST', body: JSON.stringify({ mode: action.mode }) });
        setCurrentAutonomy(action.mode);
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  };
  
  // Handle command submission
  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    
    try {
      await apiRequest('/genesis/command', {
        method: 'POST',
        body: JSON.stringify({ text: commandText }),
      });
      setCommandText('');
    } catch (err) {
      console.error('Command failed:', err);
    }
  };
  
  // Get the most relevant content to display
  const currentContent = thinking?.thought || thinking?.decision || thinking?.plan?.goal || genesis?.mind?.currentGoal;
  
  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 h-full flex flex-col">
      {/* Header with Autonomy Mode */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h3 className="text-xs font-medium text-gray-300">Process Control</h3>
        </div>
        <div className="flex items-center gap-1">
          {needsApproval && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded-full animate-pulse">
              🔒 Needs Approval
            </span>
          )}
        </div>
      </div>
      
      {/* Horizontal Process Flow */}
      <div className="px-3 py-2 border-b border-gray-800">
        <div className="flex items-center justify-center">
          {GENESIS_PROCESS_STAGES.map((stage, index) => {
            const status = getStageStatus(index, stage.id);
            const isLast = index === GENESIS_PROCESS_STAGES.length - 1;
            return (
              <React.Fragment key={stage.id}>
                <ProcessStageNode 
                  stage={stage}
                  status={status}
                  isActive={status === 'active'}
                  onClick={() => setExpandedContent(expandedContent === stage.id ? null : stage.id)}
                />
                {!isLast && <ProcessConnector isActive={status === 'active'} isCompleted={status === 'completed'} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Current Activity - FULL CONTENT (no truncation) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3" ref={contentRef}>
        {currentContent && (
          <motion.div 
            className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Current Activity</span>
              <span className="text-[10px] text-gray-600">Cycle #{currentCycle}</span>
            </div>
            <div className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">
              {safeString(currentContent)}
            </div>
          </motion.div>
        )}
        
        {/* Plan Steps (if available) - FULL CONTENT */}
        {thinking?.plan?.steps && thinking.plan.steps.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Plan Steps</div>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {thinking.plan.steps.map((step, i) => (
                <div 
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded text-[10px] ${
                    step.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    step.status === 'blocked' ? 'bg-red-500/10 border border-red-500/20' :
                    step.status === 'running' ? 'bg-blue-500/10 border border-blue-500/20' :
                    'bg-gray-800/30 border border-gray-700/30'
                  }`}
                >
                  <span className="flex-shrink-0">
                    {step.status === 'completed' ? '✅' : 
                     step.status === 'blocked' ? '🚫' : 
                     step.status === 'running' ? '▶️' : '⏳'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 break-words">{step.action || step.description || `Step ${i + 1}`}</div>
                    {step.zone && (
                      <span className={`inline-block mt-1 px-1 py-0.5 rounded text-[8px] ${
                        step.zone === 'green' ? 'bg-emerald-500/20 text-emerald-400' :
                        step.zone === 'yellow' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {step.zone} zone
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Permission Request Detail */}
        {needsApproval && (
          <motion.div 
            className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400">⚠️</span>
              <span className="text-xs text-amber-400 font-medium">Permission Required</span>
            </div>
            <p className="text-[11px] text-gray-300 mb-3">
              Genesis is waiting for approval to proceed with the current action.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.approval.map(action => (
                <QuickActionButton key={action.id} action={action} onClick={handleQuickAction} />
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Idle State */}
        {!currentStageId && !currentContent && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-600">
            <span className="text-2xl mb-2">🌙</span>
            <p className="text-xs">Genesis is idle</p>
          </div>
        )}
      </div>
      
      {/* Quick Actions Bar */}
      <div className="px-3 py-2 border-t border-gray-800">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[9px] text-gray-500">Autonomy:</span>
          {QUICK_ACTIONS.autonomy.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className={`px-2 py-0.5 rounded text-[9px] transition-all ${
                currentAutonomy === action.mode 
                  ? 'bg-blue-500/30 border border-blue-500/50 text-blue-400'
                  : 'bg-gray-800/50 border border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Command Input */}
      <div className="p-2 border-t border-gray-800">
        <form onSubmit={handleSendCommand} className="flex gap-2">
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            placeholder="Send command to Genesis..."
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
          >
            Send
          </motion.button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOALS QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

function GoalsQueue({ mind, onAddGoal }) {
  const [newGoal, setNewGoal] = useState('');
  const queueLength = mind?.queueLength || 0;
  const currentGoal = mind?.currentGoal;
  const goalsCompleted = mind?.goalsCompleted || 0;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (newGoal.trim()) {
      onAddGoal(newGoal.trim());
      setNewGoal('');
    }
  };
  
  return (
    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Goals</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{goalsCompleted} completed</span>
          {queueLength > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
              {queueLength} queued
            </span>
          )}
        </div>
      </div>
      
      {/* Current Goal */}
      {currentGoal && (
        <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <motion.div 
              className="w-2 h-2 bg-purple-500 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-[10px] text-purple-400 uppercase">Active Goal</span>
          </div>
          <p className="text-xs text-gray-300">{safeString(currentGoal)}</p>
        </div>
      )}
      
      {/* Add Goal Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Give TooLoo a goal..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={!newGoal.trim()}
          className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN OBSERVATORY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TooLooObservatory() {
  // Real data state
  const [genesis, setGenesis] = useState(null);
  const [health, setHealth] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [skillCount, setSkillCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [thinking, setThinking] = useState({
    thought: null,
    plan: null,
    decision: null,
  });
  
  // Connection state
  const { connectionState, emit, on } = useSocket({ autoConnect: true });
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const genesisWsRef = useRef(null);
  const [genesisConnected, setGenesisConnected] = useState(false);
  
  // Add event to stream
  const addEvent = useCallback((type, data, summary) => {
    setEvents(prev => [{
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      summary,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 100));
  }, []);
  
  // Handle Genesis events
  const handleGenesisEvent = useCallback((msg) => {
    const { type, data } = msg;
    
    switch (type) {
      case 'genesis:state':
        setGenesis(prev => ({ ...prev, ...data, isAlive: true }));
        break;
        
      case 'genesis:cycle:start':
        addEvent(type, data, `Cycle #${data?.cycleNumber} started`);
        break;
        
      case 'genesis:cycle:complete':
        addEvent(type, data, `Cycle #${data?.cycleNumber} complete: ${data?.actionTaken}`);
        break;
        
      case 'genesis:phase:change':
        addEvent(type, data, `Phase: ${data?.phase}`);
        break;
        
      case 'genesis:thought':
        setThinking(prev => ({ ...prev, thought: data?.content }));
        addEvent(type, data, data?.content?.slice(0, 60) + '...');
        break;
        
      case 'genesis:plan':
        setThinking(prev => ({ ...prev, plan: { goal: data?.goal, steps: data?.steps } }));
        addEvent(type, data, `Plan: ${data?.goal?.slice(0, 50)}...`);
        break;
        
      case 'genesis:decision':
        setThinking(prev => ({ ...prev, decision: data?.decision }));
        addEvent(type, data, `Decision: ${data?.decision?.slice(0, 50)}...`);
        break;
        
      case 'genesis:alive':
        setGenesis(prev => ({ ...prev, isAlive: true }));
        addEvent(type, data, 'Genesis is alive');
        break;
        
      case 'genesis:sleeping':
        setGenesis(prev => ({ ...prev, isAlive: false }));
        addEvent(type, data, 'Genesis is sleeping');
        break;
        
      case 'genesis:heartbeat':
        // Silent update - don't log heartbeats
        if (data?.metrics) {
          setGenesis(prev => ({ ...prev, ...data, isAlive: true }));
        }
        break;
        
      default:
        if (type?.startsWith('genesis:')) {
          addEvent(type, data, JSON.stringify(data || {}).slice(0, 50));
        }
    }
  }, [addEvent]);
  
  // Fetch initial data - optimized to avoid rate limiting
  // Skills are fetched only once since they don't change during runtime
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const skillsRes = await apiRequest('/skills').catch(() => null);
        if (skillsRes?.data) {
          setSkillCount(Array.isArray(skillsRes.data) ? skillsRes.data.length : 0);
        }
      } catch (e) {
        console.error('Failed to fetch skills:', e);
      }
    };
    fetchSkills(); // Only fetch once on mount
  }, []);

  // Poll for dynamic data (health, genesis, pulse) less frequently
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        // Fetch dynamic data in parallel - pulse contains most metrics
        const [healthRes, genesisRes, pulseRes] = await Promise.all([
          apiRequest('/health').catch(() => null),
          apiRequest('/genesis/state').catch(() => null),
          apiRequest('/observatory/pulse').catch(() => null),
        ]);
        
        if (healthRes?.data) setHealth(healthRes.data);
        if (genesisRes?.data) setGenesis(genesisRes.data);
        if (pulseRes?.data) setPulse(pulseRes.data);
      } catch (e) {
        console.error('Failed to fetch observatory data:', e);
      }
    };
    
    fetchDynamicData();
    // Poll every 30 seconds to stay well under rate limit (6 requests/min vs 20 limit)
    const interval = setInterval(fetchDynamicData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Socket.IO event listeners
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubGenesis = on('genesis:event', (data) => {
      if (data) {
        handleGenesisEvent(data);
        setGenesisConnected(true);
      }
    });
    
    const unsubStatus = on('system:status', (data) => {
      if (data) setHealth(prev => ({ ...prev, ...data }));
    });
    
    return () => {
      unsubGenesis?.();
      unsubStatus?.();
    };
  }, [isConnected, on, handleGenesisEvent]);
  
  // Direct WebSocket to Genesis (backup for local dev)
  useEffect(() => {
    const connectGenesisWs = () => {
      try {
        let wsUrl;
        const hostname = window.location.hostname;
        
        if (hostname.includes('github.dev') || hostname.includes('app.github.dev')) {
          // Codespaces - rely on Socket.IO relay instead
          return;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
          wsUrl = 'ws://localhost:4003';
        } else {
          return; // Use Socket.IO for production
        }
        
        const ws = new WebSocket(wsUrl);
        genesisWsRef.current = ws;
        
        ws.onopen = () => {
          setGenesisConnected(true);
          addEvent('genesis:alive', {}, 'Connected to Genesis WebSocket');
        };
        
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleGenesisEvent(msg);
          } catch (e) {
            console.error('Failed to parse Genesis message:', e);
          }
        };
        
        ws.onclose = () => {
          setGenesisConnected(false);
          setTimeout(connectGenesisWs, 5000);
        };
        
        ws.onerror = () => {
          setGenesisConnected(false);
        };
      } catch {
        setTimeout(connectGenesisWs, 5000);
      }
    };
    
    connectGenesisWs();
    
    return () => {
      if (genesisWsRef.current) {
        genesisWsRef.current.close();
      }
    };
  }, [handleGenesisEvent, addEvent]);
  
  // Actions
  const handleGenesisStart = async () => {
    try {
      await apiRequest('/genesis/start', { method: 'POST' });
      addEvent('genesis:alive', {}, 'Starting Genesis...');
    } catch (e) {
      console.error('Failed to start Genesis:', e);
    }
  };
  
  const handleGenesisStop = async () => {
    try {
      await apiRequest('/genesis/stop', { method: 'POST' });
      addEvent('genesis:sleeping', {}, 'Stopping Genesis...');
    } catch (e) {
      console.error('Failed to stop Genesis:', e);
    }
  };
  
  const handleAddGoal = async (goal) => {
    try {
      await apiRequest('/genesis/command', {
        method: 'POST',
        body: JSON.stringify({ command: goal }),
      });
      addEvent('goal:added', { goal }, `Goal added: ${goal}`);
    } catch (e) {
      console.error('Failed to add goal:', e);
    }
  };
  
  return (
    <div className="h-full bg-[#0a0a0f] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔭</span>
            <div>
              <h1 className="text-lg font-semibold text-white">Observatory</h1>
              <p className="text-xs text-gray-500">Real-time System Monitor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusBadge 
              status={genesisConnected ? 'online' : 'offline'} 
              label={genesisConnected ? 'Genesis Live' : 'Genesis Offline'}
              pulse={genesisConnected}
            />
            <StatusBadge 
              status={isConnected ? 'online' : 'offline'} 
              label={isConnected ? 'API Connected' : 'API Disconnected'}
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Genesis & System */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <GenesisCard 
            genesis={genesis} 
            onStart={handleGenesisStart} 
            onStop={handleGenesisStop}
            skillCount={skillCount || pulse?.metrics?.skills?.total}
          />
          
          <ProvidersCard 
            providers={genesis?.brain?.providersOnline} 
            providersOnline={pulse?.engines?.routing?.providersOnline ?? (health?.checks?.providers ? 4 : 0)}
          />
          
          <SystemMetricsCard health={health} pulse={pulse} />
          
          <GoalsQueue mind={genesis?.mind} onAddGoal={handleAddGoal} />
        </div>
        
        {/* Center Column - Thinking */}
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <ThinkingVisualizer 
            currentThought={thinking.thought}
            currentPlan={thinking.plan}
            currentDecision={thinking.decision}
            phase={genesis?.mind?.phase}
          />
        </div>
        
        {/* Right Column - Process Flow Visualization */}
        <div className="w-80 flex-shrink-0 border-l border-gray-800 p-4">
          <ProcessVisualization 
            events={events} 
            genesis={genesis} 
            thinking={thinking}
          />
        </div>
      </div>
      
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
