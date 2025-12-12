// @version 3.3.218
// TooLoo.ai Universal Input - Routable intelligent input component
// Routes to any context in the app: main space, refinement card, dimension, build
// Shows contextual hints based on routing target

import React, { memo, useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// ROUTE CONFIGS - Context-aware hints and behaviors
// ============================================================================

const ROUTE_CONFIGS = {
  main: {
    placeholder: 'What are we creating today?',
    icon: '👁',
    color: 'cyan',
    gradient: 'from-cyan-500 to-purple-500',
    hint: 'Start with an idea, I\'ll explore it from multiple dimensions',
  },
  refinement: {
    placeholder: 'Refine this option...',
    icon: '✨',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    hint: 'Tell me how to improve this specific option',
  },
  dimension: {
    placeholder: 'Explore this dimension deeper...',
    icon: '🔍',
    color: 'emerald',
    gradient: 'from-emerald-500 to-cyan-500',
    hint: 'Ask questions specific to this dimension',
  },
  build: {
    placeholder: 'Build instruction...',
    icon: '🔨',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    hint: 'Production-quality output with validation',
  },
  ship: {
    placeholder: 'Final touches...',
    icon: '🚀',
    color: 'rose',
    gradient: 'from-rose-500 to-red-500',
    hint: 'QA validated and ready to ship',
  },
};

// ============================================================================
// UNIVERSAL INPUT COMPONENT
// ============================================================================

const UniversalInput = forwardRef(({
  route = 'main',
  onSubmit,
  onRouteChange,
  isProcessing = false,
  targetContext = null, // { type: 'option' | 'dimension', id, title }
  sessionPhase = 'discovery',
  className = '',
}, ref) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  const config = ROUTE_CONFIGS[route] || ROUTE_CONFIGS.main;
  
  // Forward ref
  useEffect(() => {
    if (ref) {
      ref.current = inputRef.current;
    }
  }, [ref]);
  
  // Auto-focus when route changes
  useEffect(() => {
    if (route !== 'main') {
      inputRef.current?.focus();
    }
  }, [route]);
  
  const handleSubmit = useCallback(() => {
    if (message.trim() && !isProcessing) {
      onSubmit({
        message: message.trim(),
        route,
        context: targetContext,
        phase: sessionPhase,
      });
      setMessage('');
    }
  }, [message, isProcessing, onSubmit, route, targetContext, sessionPhase]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to return to main route
    if (e.key === 'Escape' && route !== 'main') {
      onRouteChange?.('main');
    }
  }, [handleSubmit, route, onRouteChange]);
  
  return (
    <div className={`relative ${className}`}>
      {/* Route indicator when not main */}
      <AnimatePresence>
        {route !== 'main' && targetContext && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-8 left-0 right-0 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full bg-${config.color}-500`} />
              <span className="text-gray-400">
                Focused on: <span className="text-white">{targetContext.title}</span>
              </span>
            </div>
            <button
              onClick={() => onRouteChange?.('main')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ✕ Clear focus
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main input container */}
      <motion.div
        layout
        className={`
          relative rounded-2xl overflow-hidden
          bg-black/30 backdrop-blur-xl
          border transition-colors duration-300
          ${isFocused 
            ? `border-${config.color}-500/50 shadow-lg shadow-${config.color}-500/10` 
            : 'border-white/10'
          }
        `}
      >
        {/* Gradient glow when focused */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`}
            />
          )}
        </AnimatePresence>
        
        {/* Input row */}
        <div className="relative flex items-center gap-3 p-4">
          {/* Route icon */}
          <motion.div
            key={route}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              bg-gradient-to-br ${config.gradient} bg-opacity-20
            `}
          >
            <span className="text-lg">{config.icon}</span>
          </motion.div>
          
          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={config.placeholder}
            disabled={isProcessing}
            className={`
              flex-1 bg-transparent text-white text-lg
              placeholder:text-gray-600 focus:outline-none
              ${isProcessing ? 'opacity-50' : ''}
            `}
          />
          
          {/* Submit button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!message.trim() || isProcessing}
            className={`
              px-5 py-2.5 rounded-xl font-medium transition-all
              ${message.trim() && !isProcessing
                ? `bg-gradient-to-r ${config.gradient} text-white`
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  ⟳
                </motion.span>
                <span>Processing</span>
              </div>
            ) : (
              route === 'build' ? 'Build' : route === 'ship' ? 'Ship' : 'Think'
            )}
          </motion.button>
        </div>
        
        {/* Contextual hint */}
        <AnimatePresence>
          {isFocused && !message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-3"
            >
              <p className="text-sm text-gray-500">
                💡 {config.hint}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Phase indicator */}
        {sessionPhase && sessionPhase !== 'discovery' && (
          <div className="absolute top-2 right-2">
            <span className={`
              px-2 py-0.5 rounded-full text-xs
              bg-${config.color}-500/20 text-${config.color}-400
            `}>
              {sessionPhase}
            </span>
          </div>
        )}
      </motion.div>
      
      {/* Quick actions based on phase */}
      <AnimatePresence>
        {isFocused && route === 'main' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {sessionPhase === 'discovery' && (
              <>
                <QuickAction icon="🎨" label="Design focus" onClick={() => setMessage(m => m + ' [focus:design]')} />
                <QuickAction icon="⚙️" label="Technical focus" onClick={() => setMessage(m => m + ' [focus:technical]')} />
                <QuickAction icon="👤" label="User focus" onClick={() => setMessage(m => m + ' [focus:user]')} />
              </>
            )}
            {sessionPhase === 'exploration' && (
              <>
                <QuickAction icon="➕" label="More options" onClick={() => setMessage('Show me more options')} />
                <QuickAction icon="🔄" label="Different angle" onClick={() => setMessage('Explore a different angle')} />
              </>
            )}
            {(sessionPhase === 'build' || sessionPhase === 'refinement') && (
              <>
                <QuickAction icon="✅" label="Validate" onClick={() => setMessage('Validate this')} />
                <QuickAction icon="🔧" label="Optimize" onClick={() => setMessage('Optimize for production')} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

UniversalInput.displayName = 'UniversalInput';

// Quick action button
const QuickAction = memo(({ icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-sm transition-colors"
  >
    <span>{icon}</span>
    <span>{label}</span>
  </motion.button>
));

QuickAction.displayName = 'QuickAction';

export default UniversalInput;
export { UniversalInput, ROUTE_CONFIGS };
