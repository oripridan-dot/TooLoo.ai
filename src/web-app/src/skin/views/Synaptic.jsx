// @version 3.3.73
// TooLoo.ai Synaptic View - Conversation & Neural Activity
// FULLY WIRED - Real AI backend, live thought stream, all buttons functional
// Connected to /api/v1/chat/stream for streaming responses
// Enhanced with Liquid Skin visual capabilities
// V3.3.68: Model selection, thinking process, large preview mode

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidPanel } from '../shell/LiquidShell';
import { useSkinEmotion, useChatEmotion } from '../hooks';
import { useSynapsynDNA, SYNAPSYS_PRESETS } from '../synapsys/SynapysDNA';
import { useLiquidEngine, PointerAurora, LiquidSurface, EmotionalOrbs } from '../effects';
import { DataFlow } from '../effects/NeuralMesh';
import ReactMarkdown from 'react-markdown';
import { 
  TooLooAvatar, 
  LiquidMessageBubble, 
  LiquidThinkingIndicator, 
  WelcomeMessage,
  ProviderBadge,
} from '../chat';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = '/api/v1/chat';

// ============================================================================
// AI MODEL DEFINITIONS - Full provider + model selection
// ============================================================================

const AI_MODELS = {
  auto: { provider: null, model: null, label: '🤖 Auto (TooLoo Selects)', description: 'Let TooLoo choose the best model' },
  // Gemini models
  'gemini-3-pro': { provider: 'gemini', model: 'gemini-3-pro-preview', label: '✨ Gemini 3 Pro', description: 'Advanced reasoning & speed' },
  'gemini-flash': { provider: 'gemini', model: 'gemini-2.0-flash-exp', label: '⚡ Gemini Flash', description: 'Ultra-fast responses' },
  // Claude models  
  'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4.5', label: '🎭 Claude Sonnet 4.5', description: 'Balanced performance' },
  'claude-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229', label: '🧠 Claude Opus', description: 'Deep reasoning' },
  // OpenAI models
  'gpt-5': { provider: 'openai', model: 'gpt-5', label: '🌟 GPT-5', description: 'Latest generation' },
  'gpt-4o': { provider: 'openai', model: 'gpt-4o', label: '💫 GPT-4o', description: 'Optimized performance' },
  // DeepSeek
  'deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat', label: '🔮 DeepSeek Chat', description: 'Cost-effective coding' },
};

// ============================================================================
// CUSTOM HOOK - Chat API with streaming support
// ============================================================================

const useChatAPI = () => {
  const sendMessage = useCallback(async (message, options = {}) => {
    const { onChunk, onThought, onComplete, onError, mode = 'quick', sessionId, provider, model } = options;
    
    try {
      // Emit thinking step
      onThought?.('🔌 Connecting to TooLoo API...');
      
      const response = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode,
          sessionId,
          provider, // Pass selected provider
          model, // Pass selected model
        }),
      });
      
      onThought?.(provider ? `🎯 Routing to ${provider}/${model}...` : '🤖 Auto-selecting best model...');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let metadata = {};

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            // Emit meta info as thinking steps
            if (data.meta) {
              if (data.meta.persona) onThought?.(`🎭 Persona: ${data.meta.persona}`);
              if (data.meta.visualEnabled) onThought?.(`🎨 Visual mode: ${data.meta.visualType || 'enabled'}`);
            }
            
            // Visual enhancement notification
            if (data.visualEnhanced) {
              onThought?.(`✨ Enhanced for ${data.visualType || 'visual'} generation`);
            }
            
            if (data.chunk) {
              fullContent += data.chunk;
              onChunk?.(data.chunk, fullContent);
            }
            
            if (data.done) {
              metadata = {
                provider: data.provider,
                model: data.model,
                cost_usd: data.cost_usd,
                reasoning: data.reasoning,
              };
              const displayModel = data.model || data.provider || 'default';
              onThought?.(`✅ Completed via ${data.provider}`, 'success');
              if (data.cost_usd) onThought?.(`💰 Cost: $${data.cost_usd.toFixed(4)}`);
              if (data.reasoning) onThought?.(`📝 ${data.reasoning}`);
            }
          } catch (e) {
            // Skip malformed lines
          }
        }
      }

      onComplete?.(fullContent, metadata);
      return { content: fullContent, metadata };
    } catch (error) {
      onError?.(error);
      throw error;
    }
  }, []);

  // Non-streaming fallback
  const sendMessageSync = useCallback(async (message, options = {}) => {
    const { mode = 'quick', sessionId } = options;
    
    const response = await fetch(`${API_BASE}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.data?.response || data.response,
      metadata: {
        provider: data.data?.provider || data.provider,
        model: data.data?.model || data.model,
      },
    };
  }, []);

  return { sendMessage, sendMessageSync };
};

// ============================================================================
// MESSAGE BUBBLE - Enhanced with Liquid Skin (wraps LiquidMessageBubble)
// ============================================================================

const MessageBubble = memo(({ message, isUser, isLatest, isStreaming, onReact }) => {
  // Use the enhanced LiquidMessageBubble from chat module
  return (
    <LiquidMessageBubble
      message={message}
      isUser={isUser}
      isLatest={isLatest}
      isStreaming={isStreaming}
      showAvatar={true}
      onReact={onReact}
    />
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// THINKING INDICATOR - Enhanced with Liquid Skin (wraps LiquidThinkingIndicator)
// ============================================================================

const ThinkingIndicator = memo(({ stage = 'thinking' }) => {
  // Use the enhanced LiquidThinkingIndicator from chat module
  return <LiquidThinkingIndicator stage={stage} showNeural={true} />;
});

ThinkingIndicator.displayName = 'ThinkingIndicator';

// ============================================================================
// NEURAL PULSE - Side panel showing brain activity
// ============================================================================

const NeuralPulse = memo(({ isActive = false, className = '' }) => {
  return (
    <div className={`relative h-20 overflow-hidden ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ 
            scaleX: isActive ? [0.3, 1, 0.3] : [0.5, 0.7, 0.5], 
            opacity: isActive ? [0.5, 1, 0.5] : [0.2, 0.4, 0.2] 
          }}
          transition={{ duration: isActive ? 1 : 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        />
        <motion.div
          animate={{ 
            scaleX: isActive ? [0.5, 1, 0.5] : [0.3, 0.5, 0.3], 
            opacity: isActive ? [0.4, 0.8, 0.4] : [0.1, 0.3, 0.1] 
          }}
          transition={{ duration: isActive ? 1.2 : 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"
        />
      </div>
      {/* Subtle glow orb */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: isActive ? 1.5 : 4, repeat: Infinity, ease: 'linear' }}
        className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full blur-lg ${isActive ? 'bg-cyan-400/50' : 'bg-cyan-500/20'}`}
      />
    </div>
  );
});

NeuralPulse.displayName = 'NeuralPulse';

// ============================================================================
// PROVIDER LOGOS - Official SVG logos for AI providers
// ============================================================================

const ProviderLogo = memo(({ provider, size = 14, className = '' }) => {
  const normalizedProvider = (provider || '').toLowerCase();
  
  // Official-style SVG logos
  const logos = {
    gemini: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4"/>
        <path d="M2 17L12 22L22 17" stroke="#4285F4" strokeWidth="2"/>
        <path d="M2 12L12 17L22 12" stroke="#4285F4" strokeWidth="2"/>
      </svg>
    ),
    claude: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="#D97706"/>
        <path d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="14" r="2" fill="white"/>
      </svg>
    ),
    openai: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" fill="#10B981"/>
      </svg>
    ),
    'gpt-4': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" fill="#10B981"/>
      </svg>
    ),
    deepseek: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#7C3AED"/>
        <path d="M12 6L6 12L12 18L18 12L12 6Z" fill="white"/>
        <circle cx="12" cy="12" r="2" fill="#7C3AED"/>
      </svg>
    ),
    tooloo: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="#06B6D4" strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" fill="#06B6D4"/>
        <circle cx="12" cy="12" r="1.5" fill="white"/>
      </svg>
    ),
  };

  // Match provider to logo
  let logo = logos.tooloo;
  if (normalizedProvider.includes('gemini')) logo = logos.gemini;
  else if (normalizedProvider.includes('claude') || normalizedProvider.includes('anthropic')) logo = logos.claude;
  else if (normalizedProvider.includes('gpt') || normalizedProvider.includes('openai')) logo = logos.openai;
  else if (normalizedProvider.includes('deepseek')) logo = logos.deepseek;
  else if (normalizedProvider.includes('tooloo')) logo = logos.tooloo;

  return logo;
});

ProviderLogo.displayName = 'ProviderLogo';

// ============================================================================
// THOUGHT STREAM - Enhanced with infographic data
// ============================================================================

const ThoughtStream = memo(({ thoughts = [], isActive = false, stats = {}, className = '' }) => {
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new thoughts
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thoughts]);

  // Calculate stats from thoughts
  const thoughtStats = useMemo(() => {
    const successCount = thoughts.filter(t => t.type === 'success').length;
    const errorCount = thoughts.filter(t => t.type === 'error').length;
    const totalCount = thoughts.length;
    const latestCost = thoughts.find(t => t.text?.includes('Cost:'))?.text?.match(/\$[\d.]+/)?.[0];
    const provider = thoughts.find(t => t.text?.includes('Response from'))?.text?.match(/from (\w+)/)?.[1];
    
    return { successCount, errorCount, totalCount, latestCost, provider };
  }, [thoughts]);

  return (
    <LiquidPanel variant="glass" className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Neural Activity
        </h3>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-[9px] text-cyan-400 uppercase tracking-wider animate-pulse">Live</span>
          )}
        </div>
      </div>

      {/* Stats Bar - Infographic */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-lg bg-black/30">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{thoughtStats.totalCount}</div>
          <div className="text-[9px] text-gray-500 uppercase">Steps</div>
        </div>
        <div className="text-center border-x border-white/10">
          <div className="text-lg font-bold text-emerald-400">{thoughtStats.successCount}</div>
          <div className="text-[9px] text-gray-500 uppercase">Success</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-400">{thoughtStats.latestCost || '-'}</div>
          <div className="text-[9px] text-gray-500 uppercase">Cost</div>
        </div>
      </div>

      {/* Progress indicator */}
      {isActive && (
        <div className="mb-3">
          <div className="flex justify-between text-[9px] text-gray-500 mb-1">
            <span>Processing</span>
            <span className="text-cyan-400">Active</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              animate={{ width: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Active Provider */}
      {thoughtStats.provider && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/5">
          <ProviderLogo provider={thoughtStats.provider} size={16} />
          <span className="text-xs text-gray-300">{thoughtStats.provider}</span>
          <span className="text-[9px] text-gray-500 ml-auto">Active Provider</span>
        </div>
      )}
      
      {/* Thought list */}
      <div ref={containerRef} className="space-y-1.5 max-h-32 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <AnimatePresence mode="popLayout">
          {thoughts.slice(-8).map((thought, i) => (
            <motion.div
              key={thought.id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-[11px] py-1 px-2 rounded bg-white/5 min-w-0"
            >
              <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                thought.type === 'success' ? 'bg-emerald-400' : 
                thought.type === 'error' ? 'bg-red-400' : 'bg-purple-400'
              }`} />
              <span className="text-gray-400 truncate flex-1 min-w-0" title={thought.text}>
                {thought.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {thoughts.length === 0 && (
          <p className="text-xs text-gray-600 italic text-center py-4">Awaiting neural activity...</p>
        )}
      </div>
    </LiquidPanel>
  );
});

ThoughtStream.displayName = 'ThoughtStream';

// ============================================================================
// SESSION TIMER - Live duration counter
// ============================================================================

const SessionTimer = memo(({ startTime }) => {
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="text-gray-300 font-mono">{duration}</span>;
});

SessionTimer.displayName = 'SessionTimer';

// ============================================================================
// THOUGHT STREAM BORDER - Animated border around input with provider info
// ============================================================================

const ThoughtStreamBorder = memo(({ 
  thoughts = [], 
  isActive = false, 
  activeProviders = [], // Array of {provider, model} being used
  className = '' 
}) => {
  const containerRef = useRef(null);
  
  // Border animation position (0-360 degrees around the perimeter)
  const [borderAngle, setBorderAngle] = useState(0);

  // Animate the pulse around the border
  useEffect(() => {
    const speed = isActive ? 3 : 0.5; // Faster when active
    const interval = setInterval(() => {
      setBorderAngle(prev => (prev + speed) % 360);
    }, 20);

    return () => clearInterval(interval);
  }, [isActive]);

  // Border thickness based on state
  const borderThickness = isActive ? 3 : 1;

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* Animated border wrapper - always visible, intensity changes */}
      <div 
        className="absolute rounded-xl pointer-events-none transition-all duration-300"
        style={{
          inset: `-${borderThickness}px`,
          background: `conic-gradient(from ${borderAngle}deg at 50% 50%, 
            ${isActive ? 'rgba(6,182,212,0.9)' : 'rgba(6,182,212,0.3)'} 0deg, 
            ${isActive ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0.2)'} 90deg, 
            ${isActive ? 'rgba(6,182,212,0.9)' : 'rgba(6,182,212,0.3)'} 180deg, 
            ${isActive ? 'rgba(139,92,246,0.9)' : 'rgba(139,92,246,0.2)'} 270deg,
            ${isActive ? 'rgba(6,182,212,0.9)' : 'rgba(6,182,212,0.3)'} 360deg
          )`,
          opacity: isActive ? 1 : 0.6,
        }}
      />
      
      {/* Inner mask to show only the border */}
      <div 
        className="absolute rounded-xl pointer-events-none"
        style={{
          inset: '0px',
          background: '#050505',
        }}
      />

      {/* Content area with provider info */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 min-h-[28px]">
        {/* Left side: Current thought/status */}
        <AnimatePresence mode="wait">
          {isActive && thoughts.length > 0 ? (
            <motion.span
              key={thoughts[thoughts.length - 1]?.id || 'thought'}
              className="text-[10px] text-cyan-400/80 truncate max-w-[40%] font-mono"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {thoughts[thoughts.length - 1]?.text}
            </motion.span>
          ) : isActive ? (
            <motion.span
              className="text-[10px] text-gray-500 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Processing...
            </motion.span>
          ) : (
            <span className="text-[10px] text-gray-600 font-mono">Ready • TooLoo</span>
          )}
        </AnimatePresence>

        {/* Right side: Active providers during processing */}
        <AnimatePresence>
          {isActive && activeProviders.length > 0 && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {activeProviders.map((p, i) => (
                <motion.div
                  key={p.provider || i}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium"
                  style={{
                    background: getProviderColor(p.provider).bg,
                    color: getProviderColor(p.provider).text,
                    border: `1px solid ${getProviderColor(p.provider).border}`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProviderLogo provider={p.provider} size={12} />
                  <span>{p.model || p.provider}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shimmer overlay when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </div>
  );
});

// Helper functions for provider styling
const getProviderColor = (provider) => {
  const colors = {
    gemini: { bg: 'rgba(66,133,244,0.2)', text: '#4285F4', border: 'rgba(66,133,244,0.4)' },
    claude: { bg: 'rgba(217,119,6,0.2)', text: '#D97706', border: 'rgba(217,119,6,0.4)' },
    'gpt-4': { bg: 'rgba(16,185,129,0.2)', text: '#10B981', border: 'rgba(16,185,129,0.4)' },
    'gpt-4o': { bg: 'rgba(16,185,129,0.2)', text: '#10B981', border: 'rgba(16,185,129,0.4)' },
    openai: { bg: 'rgba(16,185,129,0.2)', text: '#10B981', border: 'rgba(16,185,129,0.4)' },
    deepseek: { bg: 'rgba(124,58,237,0.2)', text: '#7C3AED', border: 'rgba(124,58,237,0.4)' },
    tooloo: { bg: 'rgba(6,182,212,0.2)', text: '#06B6D4', border: 'rgba(6,182,212,0.4)' },
  };
  const key = (provider || '').toLowerCase();
  if (key.includes('gemini')) return colors.gemini;
  if (key.includes('claude') || key.includes('anthropic')) return colors.claude;
  if (key.includes('gpt') || key.includes('openai')) return colors.openai;
  if (key.includes('deepseek')) return colors.deepseek;
  return colors.tooloo;
};

ThoughtStreamBorder.displayName = 'ThoughtStreamBorder';

// ============================================================================
// INPUT BORDER ANIMATION - Wraps entire input section with animated border
// ============================================================================

const InputBorderAnimation = memo(({ isActive = false }) => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const speed = isActive ? 4 : 0.8;
    const interval = setInterval(() => {
      setAngle(prev => (prev + speed) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, [isActive]);

  const thickness = isActive ? 3 : 1;

  return (
    <div 
      className="absolute pointer-events-none rounded-xl transition-all duration-300"
      style={{
        inset: `-${thickness}px`,
        background: `conic-gradient(from ${angle}deg at 50% 50%, 
          ${isActive ? 'rgba(6,182,212,0.95)' : 'rgba(6,182,212,0.25)'} 0deg, 
          ${isActive ? 'rgba(139,92,246,0.95)' : 'rgba(139,92,246,0.15)'} 90deg, 
          ${isActive ? 'rgba(6,182,212,0.95)' : 'rgba(6,182,212,0.25)'} 180deg, 
          ${isActive ? 'rgba(139,92,246,0.95)' : 'rgba(139,92,246,0.15)'} 270deg,
          ${isActive ? 'rgba(6,182,212,0.95)' : 'rgba(6,182,212,0.25)'} 360deg
        )`,
      }}
    />
  );
});

InputBorderAnimation.displayName = 'InputBorderAnimation';

// ============================================================================
// STATUS LIGHT - Visual feedback indicator
// ============================================================================

const StatusLight = memo(({ status = 'idle', size = 'sm' }) => {
  const statusConfig = {
    idle: { color: 'bg-gray-500', pulse: false },
    active: { color: 'bg-emerald-500', pulse: true },
    thinking: { color: 'bg-purple-500', pulse: true },
    streaming: { color: 'bg-cyan-400', pulse: true },
    error: { color: 'bg-red-500', pulse: false },
    success: { color: 'bg-emerald-400', pulse: false },
  };

  const { color, pulse } = statusConfig[status] || statusConfig.idle;
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className={`${sizeClass} rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
  );
});

StatusLight.displayName = 'StatusLight';

// ============================================================================
// QUICK ACTION BUTTON - Reusable button with feedback
// ============================================================================

const QuickActionButton = memo(({ icon, label, onClick, loading = false, success = false, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 flex items-center gap-2
        ${success 
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
          : disabled 
            ? 'bg-white/3 text-gray-600 cursor-not-allowed'
            : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'}
      `}
    >
      {loading ? (
        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          ⏳
        </motion.span>
      ) : success ? (
        <span>✓</span>
      ) : (
        <span>{icon}</span>
      )}
      <span>{label}</span>
    </button>
  );
});

QuickActionButton.displayName = 'QuickActionButton';

// ============================================================================
// MOOD BUTTON - Quick mood preset button
// ============================================================================

const MoodButton = memo(({ preset, icon, label, isActive, onClick }) => {
  // Use static classes to ensure Tailwind JIT includes them
  const presetStyles = {
    zen: {
      active: 'bg-cyan-500/30 text-cyan-300 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20',
      inactive: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400',
    },
    creative: {
      active: 'bg-purple-500/30 text-purple-300 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20',
      inactive: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
    },
    focus: {
      active: 'bg-amber-500/30 text-amber-300 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20',
      inactive: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
    },
  };
  
  const styles = presetStyles[preset] || presetStyles.zen;

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 p-2 rounded-lg text-xs transition-all duration-300 flex items-center justify-center gap-1
        ${isActive ? styles.active : styles.inactive}
      `}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
});

MoodButton.displayName = 'MoodButton';

// ============================================================================
// MODEL SELECTOR - Dropdown for selecting AI models
// ============================================================================

const ModelSelector = memo(({ selectedModel, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = AI_MODELS[selectedModel] || AI_MODELS.auto;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
          bg-white/5 border border-white/10
        `}
      >
        <span className="text-gray-300">{currentModel.label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-500"
        >
          ▼
        </motion.span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 w-64 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="max-h-80 overflow-auto">
              {Object.entries(AI_MODELS).map(([key, model]) => (
                <button
                  key={key}
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-4 py-3 text-left transition-colors flex items-start gap-3
                    ${selectedModel === key ? 'bg-cyan-500/20 border-l-2 border-cyan-500' : 'hover:bg-white/5'}
                  `}
                >
                  <span className="text-lg flex-shrink-0">{model.label.split(' ')[0]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {model.label.split(' ').slice(1).join(' ')}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{model.description}</div>
                  </div>
                  {selectedModel === key && (
                    <span className="text-cyan-400 text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector';

// ============================================================================
// PREVIEW SIZE TOGGLE - Large preview option
// ============================================================================

const PreviewSizeToggle = memo(({ largePreview, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all
        ${largePreview 
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
          : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}
      `}
      title={largePreview ? 'Disable large preview' : 'Enable large preview'}
    >
      <span>{largePreview ? '🖼️' : '🔲'}</span>
      <span>Large Preview</span>
    </button>
  );
});

PreviewSizeToggle.displayName = 'PreviewSizeToggle';

// ============================================================================
// THINKING PROCESS PANEL - Detailed process visualization
// ============================================================================

const ThinkingProcessPanel = memo(({ thoughts = [], isActive = false, provider, model }) => {
  const containerRef = useRef(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <LiquidPanel variant="elevated" className="p-4 bg-gradient-to-br from-cyan-950/30 to-purple-950/20 border border-cyan-500/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          🧠 TooLoo Process
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-cyan-400 text-xs"
            >
              • Live
            </motion.span>
          )}
        </h3>
        {provider && (
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {provider}
          </span>
        )}
      </div>
      
      {/* Progress bar when active */}
      {isActive && (
        <div className="mb-3">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: '50%' }}
            />
          </div>
          <p className="text-[10px] text-cyan-400 mt-1 text-center">Processing your request...</p>
        </div>
      )}
      
      {/* Thought steps */}
      <div ref={containerRef} className="space-y-2 max-h-64 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <AnimatePresence mode="popLayout">
          {thoughts.map((thought, i) => (
            <motion.div
              key={thought.id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className={`
                flex items-start gap-2 text-xs py-2 px-3 rounded-lg
                ${thought.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : thought.type === 'error' 
                    ? 'bg-red-500/10 border border-red-500/30' 
                    : 'bg-white/5 border border-white/10'}
              `}
            >
              <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5 ${
                thought.type === 'success' ? 'bg-emerald-400' : 
                thought.type === 'error' ? 'bg-red-400' : 'bg-cyan-400'
              }`} />
              <span className={`flex-1 ${
                thought.type === 'success' ? 'text-emerald-300' : 
                thought.type === 'error' ? 'text-red-300' : 'text-gray-300'
              }`}>{thought.text}</span>
              <span className="text-gray-600 text-[9px] flex-shrink-0">
                {new Date(thought.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {thoughts.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">🧠</div>
            <p className="text-xs text-gray-500">
              Send a message to see TooLoo's thinking process
            </p>
          </div>
        )}
      </div>
    </LiquidPanel>
  );
});

ThinkingProcessPanel.displayName = 'ThinkingProcessPanel';

// ============================================================================
// SYNAPTIC VIEW - Main export (FULLY WIRED)
// ============================================================================

const Synaptic = memo(({ className = '' }) => {
  // Session state
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [sessionStart] = useState(() => Date.now());
  
  // Chat state
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      content: "Hello! I'm TooLoo, your AI companion. I'm connected to multiple AI providers and ready to help you with anything. How can I assist you today?", 
      isUser: false, 
      timestamp: Date.now() - 60000,
      provider: 'TooLoo',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  
  // Model selection state (NEW)
  const [selectedModel, setSelectedModel] = useState('auto');
  const [largePreview, setLargePreview] = useState(false);
  const [lastUsedProvider, setLastUsedProvider] = useState(null);
  
  // Thought stream state
  const [thoughts, setThoughts] = useState([]);
  const [thoughtIdCounter, setThoughtIdCounter] = useState(0);
  
  // Active providers during processing
  const [activeProviders, setActiveProviders] = useState([]);
  
  // UI state
  const [status, setStatus] = useState('idle');
  const [tokenCount, setTokenCount] = useState(0);
  const [actionFeedback, setActionFeedback] = useState({});
  const [currentMood, setCurrentMood] = useState('balanced');
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Hooks
  const { sendMessage: sendToAPI } = useChatAPI();
  const { setAppState, flashEmotion } = useSkinEmotion();
  const { transitionTo, applyPreset } = useSynapsynDNA.getState();
  
  // Use chat emotion sync
  useChatEmotion(isStreaming, false, input.length > 0);

  // Helper to add thoughts
  const addThought = useCallback((text, type = 'info') => {
    setThoughtIdCounter(prev => {
      const newId = prev + 1;
      setThoughts(thoughts => [...thoughts.slice(-10), { id: newId, text, type, time: Date.now() }]);
      return newId;
    });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Estimate tokens from message content
  const estimateTokens = useCallback((content) => {
    return Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
  }, []);

  // Update token count when messages change
  useEffect(() => {
    const total = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
    setTokenCount(total);
  }, [messages, estimateTokens]);

  // ============================================================================
  // SEND MESSAGE - Core chat functionality with model selection
  // ============================================================================
  
  const handleSend = useCallback(async () => {
    if (!input.trim() || isThinking || isStreaming) return;

    const userMessage = {
      id: Date.now(),
      content: input.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setStatus('thinking');
    setAppState('processing');
    setActiveProviders([]); // Reset active providers
    
    // Get selected model config
    const modelConfig = AI_MODELS[selectedModel] || AI_MODELS.auto;
    
    // Initial thoughts with model info
    addThought(`📥 Received: "${input.substring(0, 40)}${input.length > 40 ? '...' : ''}"`);
    
    if (selectedModel === 'auto') {
      addThought('🤖 Auto mode: TooLoo selecting optimal model...');
    } else {
      addThought(`🎯 Using ${modelConfig.label} (${modelConfig.description})`);
    }
    
    // Show orchestration in border
    setActiveProviders([{ 
      provider: modelConfig.provider || 'TooLoo', 
      model: modelConfig.model || 'Auto-selecting...' 
    }]);

    const streamingMsgId = Date.now() + 1;
    
    try {
      // Create placeholder for streaming response
      const streamingMessage = {
        id: streamingMsgId,
        content: '',
        isUser: false,
        timestamp: Date.now(),
        provider: null,
        model: null,
      };
      
      setMessages(prev => [...prev, streamingMessage]);
      setStreamingMessageId(streamingMsgId);
      setIsThinking(false);
      setIsStreaming(true);
      setStatus('streaming');
      setAppState('streaming');
      
      // Add streaming start thought
      addThought('📡 Stream connected, receiving response...', 'success');

      await sendToAPI(userMessage.content, {
        mode: 'quick',
        sessionId,
        provider: modelConfig.provider, // Pass selected provider
        model: modelConfig.model, // Pass selected model
        onThought: (text, type = 'info') => {
          // Emit thinking steps from API
          addThought(text, type);
        },
        onChunk: (chunk, fullContent) => {
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMsgId 
              ? { ...msg, content: fullContent }
              : msg
          ));
        },
        onComplete: (fullContent, metadata) => {
          // Update message with actual provider/model info
          const provider = metadata.provider || 'TooLoo';
          const model = metadata.model || provider;
          
          setMessages(prev => prev.map(msg => 
            msg.id === streamingMsgId 
              ? { ...msg, content: fullContent, provider, model }
              : msg
          ));
          
          // Update last used provider
          setLastUsedProvider(provider);
          
          // Show which provider actually handled the request
          setActiveProviders([{ provider, model }]);
          
          setIsStreaming(false);
          setStreamingMessageId(null);
          setStatus('success');
          flashEmotion('success');
          
          // Clear active providers after a delay
          setTimeout(() => {
            setActiveProviders([]);
            setStatus('idle');
          }, 2000);
        },
        onError: (error) => {
          throw error;
        },
      });
    } catch (error) {
      console.error('[Synaptic] Send error:', error);
      
      addThought(`❌ Error: ${error.message}`, 'error');
      setActiveProviders([]);
      
      // Remove failed streaming message and add error message
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== streamingMsgId),
        {
          id: Date.now(),
          content: `I encountered an error: ${error.message}. Please try again.`,
          isUser: false,
          timestamp: Date.now(),
          provider: 'System',
        },
      ]);
      
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
      setStatus('error');
      flashEmotion('error');
      
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [input, isThinking, isStreaming, sessionId, selectedModel, sendToAPI, setAppState, flashEmotion, addThought]);

  // ============================================================================
  // QUICK ACTIONS - Copy, Clear, Export
  // ============================================================================
  
  const handleCopyChat = useCallback(async () => {
    setActionFeedback(prev => ({ ...prev, copy: 'loading' }));
    addThought('Copying chat to clipboard...');
    
    try {
      const chatText = messages
        .map(msg => `[${msg.isUser ? 'You' : 'TooLoo'}] ${msg.content}`)
        .join('\n\n');
      
      await navigator.clipboard.writeText(chatText);
      
      setActionFeedback(prev => ({ ...prev, copy: 'success' }));
      addThought('Chat copied to clipboard', 'success');
      flashEmotion('success');
      
      setTimeout(() => setActionFeedback(prev => ({ ...prev, copy: null })), 2000);
    } catch (error) {
      addThought('Failed to copy chat', 'error');
      setActionFeedback(prev => ({ ...prev, copy: null }));
    }
  }, [messages, addThought, flashEmotion]);

  const handleClearHistory = useCallback(() => {
    setActionFeedback(prev => ({ ...prev, clear: 'loading' }));
    addThought('Clearing chat history...');
    
    setTimeout(() => {
      setMessages([{
        id: Date.now(),
        content: "Chat cleared. I'm ready for a fresh conversation!",
        isUser: false,
        timestamp: Date.now(),
        provider: 'TooLoo',
      }]);
      setThoughts([]);
      setTokenCount(0);
      
      setActionFeedback(prev => ({ ...prev, clear: 'success' }));
      addThought('History cleared', 'success');
      
      setTimeout(() => setActionFeedback(prev => ({ ...prev, clear: null })), 2000);
    }, 300);
  }, [addThought]);

  const handleExportSession = useCallback(() => {
    setActionFeedback(prev => ({ ...prev, export: 'loading' }));
    addThought('Exporting session data...');
    
    try {
      const sessionData = {
        sessionId,
        exportedAt: new Date().toISOString(),
        duration: Date.now() - sessionStart,
        tokenCount,
        messageCount: messages.length,
        messages: messages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          provider: msg.provider,
        })),
        thoughts: thoughts.map(t => t.text),
      };
      
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tooloo-session-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setActionFeedback(prev => ({ ...prev, export: 'success' }));
      addThought('Session exported successfully', 'success');
      flashEmotion('success');
      
      setTimeout(() => setActionFeedback(prev => ({ ...prev, export: null })), 2000);
    } catch (error) {
      addThought('Failed to export session', 'error');
      setActionFeedback(prev => ({ ...prev, export: null }));
    }
  }, [sessionId, sessionStart, tokenCount, messages, thoughts, addThought, flashEmotion]);

  // ============================================================================
  // MOOD CONTROLS - Zen, Create, Focus
  // ============================================================================
  
  const handleMoodChange = useCallback((mood) => {
    setCurrentMood(mood);
    transitionTo(mood, 600);
    
    const moodMessages = {
      zen: 'Entering Zen mode - calm and focused...',
      creative: 'Activating Creative mode - let imagination flow...',
      focus: 'Focus mode engaged - minimal distractions...',
    };
    
    addThought(moodMessages[mood] || `Mood: ${mood}`);
  }, [transitionTo, addThought]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSend();
      }
      // Escape to focus input
      if (e.key === 'Escape') {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  // ============================================================================
  // QUICK ACTION HANDLER - For welcome message quick actions
  // ============================================================================
  
  const handleQuickAction = useCallback((action) => {
    const actionMessages = {
      brainstorm: "Let's brainstorm some ideas together! What topic would you like to explore?",
      write: "I'd love to help you write something. What would you like to create?",
      analyze: "I can help analyze code or data. Share what you'd like me to look at.",
      creative: "Let's get creative! Tell me about your creative project or idea.",
    };
    
    setInput(actionMessages[action] || '');
    inputRef.current?.focus();
  }, []);

  // ============================================================================
  // MESSAGE REACTION HANDLER
  // ============================================================================
  
  const handleMessageReaction = useCallback((messageId, reaction) => {
    if (reaction === '📋') {
      // Copy message
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        navigator.clipboard.writeText(msg.content);
        addThought('Message copied to clipboard', 'success');
        flashEmotion('success');
      }
    } else if (reaction === '🔄') {
      // Regenerate (would need backend support)
      addThought('Regeneration requested');
    } else {
      // Other reactions - log for analytics
      addThought(`Reaction ${reaction} on message`);
    }
  }, [messages, addThought, flashEmotion]);

  // Check if we should show welcome message (only initial message from TooLoo)
  const showWelcome = messages.length === 1 && !messages[0].isUser;

  return (
    <div className={`h-full flex relative ${className}`}>
      {/* Background liquid effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <LiquidSurface variant="subtle" animated={isStreaming || isThinking} />
        {(isStreaming || isThinking) && (
          <EmotionalOrbs count={3} size={{ min: 30, max: 80 }} className="opacity-30" />
        )}
      </div>

      {/* Subtle aurora effect */}
      <PointerAurora size={200} intensity={0.2} blur={100} className="opacity-50" />
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header with liquid glass effect - Now includes Model Selector & Preview Toggle */}
        <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-transparent via-cyan-950/20 to-transparent backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TooLooAvatar 
                size={40} 
                state={isStreaming ? 'speaking' : isThinking ? 'thinking' : 'idle'} 
                showBreath={false}
              />
              <div>
                <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                  Synaptic
                  <StatusLight status={status} size="sm" />
                </h1>
                <p className="text-sm text-gray-500">Neural conversation interface</p>
              </div>
            </div>
            
            {/* Model Selection & Controls */}
            <div className="flex items-center gap-3">
              {/* Model Selector */}
              <ModelSelector 
                selectedModel={selectedModel}
                onChange={setSelectedModel}
                disabled={isThinking || isStreaming}
              />
              
              {/* Large Preview Toggle */}
              <PreviewSizeToggle
                largePreview={largePreview}
                onToggle={() => setLargePreview(!largePreview)}
              />
              
              {/* Status indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <StatusLight status={isStreaming ? 'streaming' : isThinking ? 'thinking' : 'active'} />
                <span className="text-xs text-gray-400">
                  {isStreaming ? 'Streaming...' : isThinking ? 'Processing...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Selected model info bar */}
          {selectedModel !== 'auto' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 text-xs text-gray-500"
            >
              <span>Using:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {AI_MODELS[selectedModel]?.label}
              </span>
              <span className="text-gray-600">•</span>
              <span>{AI_MODELS[selectedModel]?.description}</span>
            </motion.div>
          )}
        </div>

        {/* Messages area with enhanced visuals - Large preview support */}
        <div className={`flex-1 overflow-auto ${largePreview ? 'p-8' : 'p-6'}`}>
          {showWelcome ? (
            <WelcomeMessage onQuickAction={handleQuickAction} />
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isUser={msg.isUser}
                  isLatest={i === messages.length - 1 && !msg.isUser}
                  isStreaming={msg.id === streamingMessageId}
                  onReact={handleMessageReaction}
                />
              ))}
              {isThinking && <ThinkingIndicator key="thinking" stage="connecting" />}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input with ThoughtStream Border wrapping the entire input area */}
        <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
          {/* Border wraps both status bar and input */}
          <div className="relative">
            {/* Animated border around entire input section */}
            <InputBorderAnimation isActive={isThinking || isStreaming} />
            
            {/* Status bar above input */}
            <ThoughtStreamBorder 
              thoughts={thoughts} 
              isActive={isThinking || isStreaming}
              activeProviders={activeProviders}
              className="rounded-t-xl"
            />
            
            {/* Input row */}
            <div className="flex gap-3 p-3 bg-[#050505] rounded-b-xl">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message... (Enter to send)"
                disabled={isThinking || isStreaming}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                           text-white placeholder-gray-500 text-sm
                           focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isThinking || isStreaming}
              className={`
                px-6 py-3 rounded-xl font-medium text-sm
                transition-all duration-200 flex items-center gap-2
                ${input.trim() && !isThinking && !isStreaming
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'}
              `}
            >
              {isThinking || isStreaming ? (
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  ⏳
                </motion.span>
              ) : (
                'Send'
              )}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel - Enhanced with ThinkingProcessPanel */}
      <div className="w-80 border-l border-white/5 p-4 space-y-4 overflow-auto hidden lg:flex lg:flex-col flex-shrink-0">
        {/* TooLoo Thinking Process Panel - NEW */}
        <ThinkingProcessPanel 
          thoughts={thoughts} 
          isActive={isThinking || isStreaming}
          provider={lastUsedProvider}
          model={selectedModel !== 'auto' ? AI_MODELS[selectedModel]?.model : null}
        />
        
        {/* Session Info */}
        <LiquidPanel variant="surface" className="p-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Session Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Messages</span>
              <span className="text-gray-300 font-mono">{messages.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Tokens</span>
              <span className="text-gray-300 font-mono">~{tokenCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Duration</span>
              <SessionTimer startTime={sessionStart} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Model</span>
              <span className="text-cyan-400 text-xs truncate max-w-[120px]">
                {selectedModel === 'auto' ? 'Auto' : AI_MODELS[selectedModel]?.label.split(' ').slice(1).join(' ')}
              </span>
            </div>
          </div>
        </LiquidPanel>

        <LiquidPanel variant="surface" className="p-4">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <QuickActionButton
              icon="📋"
              label="Copy Chat"
              onClick={handleCopyChat}
              loading={actionFeedback.copy === 'loading'}
              success={actionFeedback.copy === 'success'}
            />
            <QuickActionButton
              icon="🗑️"
              label="Clear History"
              onClick={handleClearHistory}
              loading={actionFeedback.clear === 'loading'}
              success={actionFeedback.clear === 'success'}
            />
            <QuickActionButton
              icon="💾"
              label="Export Session"
              onClick={handleExportSession}
              loading={actionFeedback.export === 'loading'}
              success={actionFeedback.export === 'success'}
            />
          </div>
        </LiquidPanel>

        {/* Quick Mood Buttons */}
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs text-gray-500 mb-2">Quick Mood</p>
          <div className="flex gap-2">
            <MoodButton
              preset="zen"
              icon="🧘"
              label="Zen"
              isActive={currentMood === 'zen'}
              onClick={() => handleMoodChange('zen')}
            />
            <MoodButton
              preset="creative"
              icon="🎨"
              label="Create"
              isActive={currentMood === 'creative'}
              onClick={() => handleMoodChange('creative')}
            />
            <MoodButton
              preset="focus"
              icon="⚡"
              label="Focus"
              isActive={currentMood === 'focus'}
              onClick={() => handleMoodChange('focus')}
            />
          </div>
        </div>
        
        {/* Provider Status */}
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs text-gray-500 mb-2">AI Providers</p>
          <div className="flex flex-wrap gap-1">
            {['gemini', 'claude', 'gpt-4', 'deepseek'].map(provider => (
              <span 
                key={provider}
                className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {provider}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

Synaptic.displayName = 'Synaptic';

export default Synaptic;
