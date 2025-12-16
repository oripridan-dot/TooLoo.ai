/**
 * ComposingIndicator.jsx - Rich Loading Experience
 * 
 * Shows what TooLoo is doing while composing your response.
 * Instead of generic "thinking...", shows meaningful progress:
 * - Understanding your question
 * - Researching best approaches
 * - Generating visual content
 * - Composing response
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// COMPOSITION STAGES
// ============================================================================

const STAGES = [
  {
    id: 'understanding',
    label: 'Understanding your question',
    icon: '🧠',
    color: 'from-blue-500 to-cyan-500',
    duration: 800,
  },
  {
    id: 'researching',
    label: 'Researching best approaches',
    icon: '🔍',
    color: 'from-purple-500 to-pink-500',
    duration: 1200,
  },
  {
    id: 'analyzing',
    label: 'Analyzing solutions',
    icon: '⚡',
    color: 'from-amber-500 to-orange-500',
    duration: 1000,
  },
  {
    id: 'composing',
    label: 'Composing visual brief',
    icon: '🎨',
    color: 'from-emerald-500 to-teal-500',
    duration: 600,
  },
];

// ============================================================================
// ANIMATED ICONS
// ============================================================================

const PulsingRings = memo(function PulsingRings({ color }) {
  return (
    <div className="relative w-16 h-16">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${color}`}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{
            scale: [1, 1.5 + i * 0.3, 1],
            opacity: [0.6 - i * 0.2, 0, 0.6 - i * 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className={`absolute inset-3 rounded-full bg-gradient-to-br ${color} shadow-lg`} />
    </div>
  );
});

const FloatingParticles = memo(function FloatingParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full bg-white/20"
          style={{ left: `${p.x}%` }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{
            y: '-100%',
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
});

// ============================================================================
// STAGE INDICATOR
// ============================================================================

const StageIndicator = memo(function StageIndicator({ stage, isActive, isComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-white/10 border border-white/20' 
          : isComplete 
            ? 'bg-white/5 opacity-50'
            : 'opacity-30'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
        isActive 
          ? `bg-gradient-to-br ${stage.color} shadow-lg` 
          : 'bg-white/10'
      }`}>
        {isComplete ? '✓' : stage.icon}
      </div>
      <div className="flex-1">
        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {stage.label}
        </div>
        {isActive && (
          <motion.div
            className="h-1 mt-2 rounded-full bg-white/10 overflow-hidden"
            initial={{ width: 0 }}
          >
            <motion.div
              className={`h-full bg-gradient-to-r ${stage.color}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: stage.duration / 1000, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ComposingIndicator - Visual Loading Experience
 * 
 * Shows meaningful progress while TooLoo composes a response
 */
export const ComposingIndicator = memo(function ComposingIndicator({ 
  isActive = true,
  skill = null,
  compact = false,
}) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState([]);
  
  // Progress through stages
  useEffect(() => {
    if (!isActive) {
      setCurrentStageIndex(0);
      setCompletedStages([]);
      return;
    }
    
    const stage = STAGES[currentStageIndex];
    if (!stage) return;
    
    const timer = setTimeout(() => {
      setCompletedStages(prev => [...prev, stage.id]);
      if (currentStageIndex < STAGES.length - 1) {
        setCurrentStageIndex(prev => prev + 1);
      }
    }, stage.duration);
    
    return () => clearTimeout(timer);
  }, [isActive, currentStageIndex]);
  
  // Reset when deactivated
  useEffect(() => {
    if (!isActive) {
      setCurrentStageIndex(0);
      setCompletedStages([]);
    }
  }, [isActive]);
  
  const currentStage = STAGES[currentStageIndex];
  
  if (!isActive) return null;
  
  // Compact mode - just show current stage
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
      >
        <div className="relative">
          <PulsingRings color={currentStage?.color || 'from-blue-500 to-purple-500'} />
          <div className="absolute inset-0 flex items-center justify-center text-xl">
            {currentStage?.icon || '🧠'}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-white">
            {currentStage?.label || 'Thinking...'}
          </div>
          {skill && (
            <div className="text-xs text-gray-500 mt-0.5">
              Using {skill.name || skill.id}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  
  // Full mode - show all stages
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-6 overflow-hidden"
    >
      {/* Background effects */}
      <FloatingParticles />
      <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${currentStage?.color || 'from-blue-500 to-purple-500'} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <PulsingRings color={currentStage?.color || 'from-blue-500 to-purple-500'} />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">
              {currentStage?.icon || '🧠'}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              TooLoo is composing
            </h3>
            <p className="text-sm text-gray-400">
              Creating a visual brief for you...
            </p>
          </div>
        </div>
        
        {/* Stages */}
        <div className="space-y-2">
          {STAGES.map((stage, index) => (
            <StageIndicator
              key={stage.id}
              stage={stage}
              isActive={index === currentStageIndex}
              isComplete={completedStages.includes(stage.id)}
            />
          ))}
        </div>
        
        {/* Skill info */}
        {skill && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-gray-500">
            <span>Skill:</span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300">
              {skill.name || skill.id}
            </span>
            {skill.confidence && (
              <span className="text-emerald-400">
                {Math.round(skill.confidence * 100)}% match
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * MiniComposingIndicator - Inline composing indicator
 */
export const MiniComposingIndicator = memo(function MiniComposingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">Composing...</span>
    </motion.div>
  );
});

export default ComposingIndicator;
