// @version 3.3.494
/**
 * PerformanceBudgetControl.jsx
 * TooLoo.ai Living Canvas - Performance Budget UI Control
 * 
 * User-facing control for adjusting Living Canvas performance levels.
 * Integrates into sidebar with smooth animated feedback.
 * 
 * @version 1.0.0
 * @module skin/canvas/PerformanceBudgetControl
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCanvasStore, PERFORMANCE_BUDGETS } from '../store/canvasStateStore';

// Budget level configurations
const BUDGET_LEVELS = {
  minimal: {
    label: 'Minimal',
    icon: '🌙',
    description: 'Battery saver - static background only',
    color: 'from-gray-600 to-gray-700',
    activeColor: 'from-gray-500 to-gray-600',
    textColor: 'text-gray-300',
  },
  balanced: {
    label: 'Balanced',
    icon: '⚡',
    description: 'Smooth animations with moderate effects',
    color: 'from-cyan-600 to-purple-600',
    activeColor: 'from-cyan-500 to-purple-500',
    textColor: 'text-cyan-300',
  },
  maximum: {
    label: 'Maximum',
    icon: '✨',
    description: 'Full Living Canvas experience',
    color: 'from-purple-600 to-pink-600',
    activeColor: 'from-purple-500 to-pink-500',
    textColor: 'text-purple-300',
  },
};

/**
 * Compact button version for sidebar
 */
export function PerformanceBudgetButton({ onClick, className = '' }) {
  const budget = useCanvasStore((s) => s.performanceBudget);
  // Map to our 3-tier display levels
  const displayLevel = budget === 'minimal' || budget === 'low' ? 'minimal' 
    : budget === 'high' || budget === 'ultra' ? 'maximum' : 'balanced';
  const config = BUDGET_LEVELS[displayLevel];
  
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${config.color} 
                  hover:${config.activeColor} transition-all duration-300 ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-medium text-white/90">{config.label}</span>
    </motion.button>
  );
}

/**
 * Full control panel for settings
 */
export function PerformanceBudgetPanel({ onClose, className = '' }) {
  const budget = useCanvasStore((s) => s.performanceBudget);
  const customBudget = useCanvasStore((s) => s.customBudget);
  const setPerformanceBudget = useCanvasStore((s) => s.setPerformanceBudget);
  const [hoveredLevel, setHoveredLevel] = useState(null);
  
  // Compute effective budget
  const effective = useMemo(() => {
    const preset = PERFORMANCE_BUDGETS[budget] || PERFORMANCE_BUDGETS.balanced;
    return customBudget ? { ...preset, ...customBudget } : preset;
  }, [budget, customBudget]);
  
  // Map to our 3-tier display levels
  const displayLevel = budget === 'minimal' || budget === 'low' ? 'minimal' 
    : budget === 'high' || budget === 'ultra' ? 'maximum' : 'balanced';
  
  const handleSelect = (level) => {
    // Map 3-tier to actual budget levels
    const budgetMap = { minimal: 'minimal', balanced: 'balanced', maximum: 'high' };
    setPerformanceBudget(budgetMap[level]);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 
                  shadow-2xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <h3 className="text-sm font-semibold text-white">Living Canvas</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Budget Options */}
      <div className="p-3 space-y-2">
        {Object.entries(BUDGET_LEVELS).map(([level, config]) => {
          const isActive = displayLevel === level;
          const isHovered = hoveredLevel === level;
          
          return (
            <motion.button
              key={level}
              onClick={() => handleSelect(level)}
              onMouseEnter={() => setHoveredLevel(level)}
              onMouseLeave={() => setHoveredLevel(null)}
              className={`w-full p-3 rounded-lg text-left transition-all duration-200
                         ${isActive 
                           ? `bg-gradient-to-r ${config.activeColor} shadow-lg` 
                           : 'bg-white/5 hover:bg-white/10'}`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${isActive ? 'text-white' : config.textColor}`}>
                    {config.label}
                  </div>
                  <div className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                    {config.description}
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <span className="text-white text-sm">✓</span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {/* Stats Preview */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20">
        <div className="grid grid-cols-3 gap-2 text-center">
          <StatPreview 
            label="Particles"
            value={effective.maxParticles || 0}
            active={effective.maxParticles > 0}
          />
          <StatPreview 
            label="Parallax"
            value={effective.enableParallax ? 'On' : 'Off'}
            active={effective.enableParallax}
          />
          <StatPreview 
            label="FPS"
            value={effective.fps || 60}
            active={true}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Stat preview item
 */
function StatPreview({ label, value, active }) {
  return (
    <div className="space-y-1">
      <div className={`text-xs ${active ? 'text-cyan-400' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-sm font-mono ${active ? 'text-white' : 'text-gray-600'}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Dropdown version for toolbar
 */
export function PerformanceBudgetDropdown({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={`relative ${className}`}>
      <PerformanceBudgetButton onClick={() => setIsOpen(!isOpen)} />
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <div className="absolute top-full right-0 mt-2 z-50 w-72">
              <PerformanceBudgetPanel onClose={() => setIsOpen(false)} />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline slider version
 */
export function PerformanceBudgetSlider({ className = '' }) {
  const budget = useCanvasStore((s) => s.performanceBudget);
  const setPerformanceBudget = useCanvasStore((s) => s.setPerformanceBudget);
  
  const levels = ['minimal', 'balanced', 'maximum'];
  // Map actual budget to display level
  const displayLevel = budget === 'minimal' || budget === 'low' ? 'minimal' 
    : budget === 'high' || budget === 'ultra' ? 'maximum' : 'balanced';
  const currentIndex = levels.indexOf(displayLevel);
  
  const handleChange = (e) => {
    const index = parseInt(e.target.value, 10);
    const level = levels[index];
    // Map display to actual budget
    const budgetMap = { minimal: 'minimal', balanced: 'balanced', maximum: 'high' };
    setPerformanceBudget(budgetMap[level]);
  };
  
  const config = BUDGET_LEVELS[displayLevel];
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Canvas Quality</span>
        <span className={config.textColor}>{config.icon} {config.label}</span>
      </div>
      
      <div className="relative">
        {/* Track background */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full bg-gradient-to-r ${config.color}`}
            initial={false}
            animate={{ width: `${((currentIndex + 1) / levels.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        
        {/* Input slider (invisible, for interaction) */}
        <input
          type="range"
          min={0}
          max={levels.length - 1}
          value={currentIndex}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {/* Markers */}
        <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
          {levels.map((level, i) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-full -mt-0.5 transition-colors
                         ${i <= currentIndex ? 'bg-white shadow-glow' : 'bg-gray-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Full settings section component
 */
export default function PerformanceBudgetControl({ variant = 'panel', ...props }) {
  switch (variant) {
    case 'button':
      return <PerformanceBudgetButton {...props} />;
    case 'dropdown':
      return <PerformanceBudgetDropdown {...props} />;
    case 'slider':
      return <PerformanceBudgetSlider {...props} />;
    case 'panel':
    default:
      return <PerformanceBudgetPanel {...props} />;
  }
}

// Named exports for flexibility
export { BUDGET_LEVELS };
