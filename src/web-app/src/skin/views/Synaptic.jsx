// @version 3.3.292
// TooLoo.ai Synaptic View - Conversation & Neural Activity
// FULLY WIRED - Real AI backend, live thought stream, all buttons functional
// Connected to /api/v1/chat/stream for streaming responses
// Enhanced with Liquid Skin visual capabilities
// V3.3.200: Added Test Prompts panel with auto-refresh
// V3.3.120: Reader-centric scroll - user stays at top while content streams below
// V3.3.107: Stable streaming - removed layout animations, folded sections, cleaned imports

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// THINKING STAGES - Dynamic stage definitions with descriptions
// ============================================================================

const THINKING_STAGES = {
  connecting: {
    icon: '🔌',
    title: 'Connecting',
    description: 'Establishing secure connection to TooLoo neural network...',
    color: 'cyan',
  },
  analyzing: {
    icon: '🔍',
    title: 'Analyzing Request',
    description: 'Understanding your query and identifying key requirements...',
    color: 'purple',
  },
  routing: {
    icon: '🧭',
    title: 'Routing',
    description: 'Selecting optimal AI model and processing pathway...',
    color: 'blue',
  },
  processing: {
    icon: '⚡',
    title: 'Processing',
    description: 'Generating response with selected AI model...',
    color: 'amber',
  },
  enhancing: {
    icon: '✨',
    title: 'Enhancing',
    description: 'Refining and optimizing the response for clarity...',
    color: 'emerald',
  },
  streaming: {
    icon: '📡',
    title: 'Streaming',
    description: 'Delivering response in real-time...',
    color: 'cyan',
  },
  complete: {
    icon: '✅',
    title: 'Complete',
    description: 'Response delivered successfully!',
    color: 'emerald',
  },
};
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidPanel } from '../shell/LiquidShell';
import { useSkinEmotion, useChatEmotion } from '../hooks';
import { useSynapsynDNA } from '../synapsys/SynapysDNA';
import { useLiquidEngine, PointerAurora, LiquidSurface, EmotionalOrbs } from '../effects';
import { TooLooAvatar, LiquidMessageBubble, WelcomeMessage, ProviderBadge } from '../chat';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = '/api/v1/chat';

// ============================================================================
// AI MODEL DEFINITIONS - Full provider + model selection
// ============================================================================

const AI_MODELS = {
  auto: {
    provider: null,
    model: null,
    label: '🤖 Auto (TooLoo Selects)',
    description: 'Let TooLoo choose the best model',
  },
  // Gemini models
  'gemini-3-pro': {
    provider: 'gemini',
    model: 'gemini-3-pro-preview',
    label: '✨ Gemini 3 Pro',
    description: 'Advanced reasoning & speed',
  },
  'gemini-flash': {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    label: '⚡ Gemini Flash',
    description: 'Ultra-fast responses',
  },
  // Claude models
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
    label: '🎭 Claude Sonnet 4.5',
    description: 'Balanced performance',
  },
  'claude-opus': {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    label: '🧠 Claude Opus',
    description: 'Deep reasoning',
  },
  // OpenAI models
  'gpt-5': {
    provider: 'openai',
    model: 'gpt-5',
    label: '🌟 GPT-5',
    description: 'Latest generation',
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    label: '💫 GPT-4o',
    description: 'Optimized performance',
  },
  // DeepSeek
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    label: '🔮 DeepSeek Chat',
    description: 'Cost-effective coding',
  },
};

// ============================================================================
// CUSTOM HOOK - Chat API with streaming support
// ============================================================================

const useChatAPI = () => {
  const sendMessage = useCallback(async (message, options = {}) => {
    const {
      onChunk,
      onThought,
      onStageChange,
      onComplete,
      onError,
      mode = 'quick',
      sessionId,
      provider,
      model,
    } = options;

    try {
      // V3.3.198: Emit initial connection thought (kept minimal)
      onThought?.('🔌 Connecting to TooLoo API...');
      onStageChange?.('connecting');

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
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              throw new Error(data.error);
            }

            // V3.3.198: Handle REAL thinking events from backend (MINIMAL UX)
            // Only show essential status updates, not verbose process details
            if (data.thinking) {
              const { stage, message: thinkingMsg, type } = data.thinking;

              // V3.3.198: Only show critical thinking events, skip verbose ones
              const isEssential =
                stage === 'processing' || stage === 'complete' || type === 'error';
              if (
                isEssential &&
                thinkingMsg &&
                !thinkingMsg.includes('Analyzing') &&
                !thinkingMsg.includes('Evaluating')
              ) {
                onThought?.(thinkingMsg, type);
              }

              // Map backend stages to frontend stages
              const stageMap = {
                analyzing: 'analyzing',
                routing: 'routing',
                processing: 'processing',
                streaming: 'streaming',
                complete: 'complete',
              };
              if (stageMap[stage]) {
                onStageChange?.(stageMap[stage]);
              }
            }

            // V3.3.198: Skip verbose meta info - only show on explicit visual mode
            if (data.meta) {
              // Skip persona and visual mode announcements for cleaner UX
              // The UI already shows provider info elsewhere
            }

            // Visual enhancement notification (only for explicit visual requests)
            if (data.visualEnhanced) {
              // V3.3.198: Silent - visual enhancement is internal detail
            }

            if (data.chunk) {
              fullContent += data.chunk;
              onChunk?.(data.chunk, fullContent);
              // Switch to streaming stage when we get first chunk
              onStageChange?.('streaming');
            }

            if (data.done) {
              metadata = {
                provider: data.provider,
                model: data.model,
                cost_usd: data.cost_usd,
                reasoning: data.reasoning,
              };
              // V3.3.198: Silent completion - UI shows provider badge instead
              // Only emit thought on error or explicit cost display request
              onStageChange?.('complete');
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

const MessageBubble = memo(
  ({ message, isUser, isLatest, isStreaming, onReact, fullWidth = false }) => {
    // Use the enhanced LiquidMessageBubble from chat module
    return (
      <LiquidMessageBubble
        message={message}
        isUser={isUser}
        isLatest={isLatest}
        isStreaming={isStreaming}
        showAvatar={true}
        onReact={onReact}
        fullWidth={fullWidth}
      />
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// INLINE PROCESS PANEL - Calm, controlled thinking indicator
// v3.3.95 - Ultra minimal: single line status, no jumping, smooth progress
// ============================================================================

const InlineProcessPanel = memo(
  ({
    thoughts = [],
    isActive = false,
    currentStage = 'connecting',
    provider,
    model,
    modelLabel,
  }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef(Date.now());

    // Timer for elapsed time
    useEffect(() => {
      if (!isActive) {
        startTimeRef.current = Date.now();
        setElapsedTime(0);
        return;
      }
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }, [isActive]);

    // Get current stage info
    const stageInfo = THINKING_STAGES[currentStage] || THINKING_STAGES.processing;

    // Stage order for progress calculation
    const stageOrder = [
      'connecting',
      'analyzing',
      'routing',
      'processing',
      'streaming',
      'complete',
    ];
    const currentIndex = stageOrder.indexOf(currentStage);
    const progress = ((currentIndex + 1) / stageOrder.length) * 100;

    // Get latest thought (just one)
    const latestThought = thoughts[thoughts.length - 1]?.text || '';

    return (
      <div className="w-full mb-3">
        {/* Single compact status bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#0a0a0a]/60 border border-white/5">
          {/* Subtle breathing dot */}
          <span
            className={`w-2 h-2 rounded-full ${
              currentStage === 'complete'
                ? 'bg-emerald-400'
                : currentStage === 'streaming'
                  ? 'bg-cyan-400'
                  : 'bg-white/40'
            } ${isActive && currentStage !== 'complete' ? 'animate-pulse' : ''}`}
          />

          {/* Stage icon + name */}
          <span className="text-sm text-gray-300">
            {stageInfo.icon} {stageInfo.title}
          </span>

          {/* Mini progress bar */}
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-32">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Timer */}
          <span className="text-xs text-gray-500 tabular-nums min-w-[32px]">{elapsedTime}s</span>

          {/* Provider badge (optional) */}
          {modelLabel && (
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-white/5">
              {modelLabel}
            </span>
          )}
        </div>

        {/* Latest thought - single line, no jumping */}
        {latestThought && (
          <p className="text-[11px] text-gray-500 mt-1.5 px-4 truncate">{latestThought}</p>
        )}
      </div>
    );
  }
);

InlineProcessPanel.displayName = 'InlineProcessPanel';

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
            opacity: isActive ? [0.5, 1, 0.5] : [0.2, 0.4, 0.2],
          }}
          transition={{ duration: isActive ? 1 : 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        />
        <motion.div
          animate={{
            scaleX: isActive ? [0.5, 1, 0.5] : [0.3, 0.5, 0.3],
            opacity: isActive ? [0.4, 0.8, 0.4] : [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: isActive ? 1.2 : 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
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
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4" />
        <path d="M2 17L12 22L22 17" stroke="#4285F4" strokeWidth="2" />
        <path d="M2 12L12 17L22 12" stroke="#4285F4" strokeWidth="2" />
      </svg>
    ),
    claude: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="#D97706" />
        <path
          d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="2" fill="white" />
      </svg>
    ),
    openai: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z"
          fill="#10B981"
        />
      </svg>
    ),
    'gpt-4': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z"
          fill="#10B981"
        />
      </svg>
    ),
    deepseek: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#7C3AED" />
        <path d="M12 6L6 12L12 18L18 12L12 6Z" fill="white" />
        <circle cx="12" cy="12" r="2" fill="#7C3AED" />
      </svg>
    ),
    tooloo: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="#06B6D4" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="#06B6D4" />
        <circle cx="12" cy="12" r="1.5" fill="white" />
      </svg>
    ),
  };

  // Match provider to logo
  let logo = logos.tooloo;
  if (normalizedProvider.includes('gemini')) logo = logos.gemini;
  else if (normalizedProvider.includes('claude') || normalizedProvider.includes('anthropic'))
    logo = logos.claude;
  else if (normalizedProvider.includes('gpt') || normalizedProvider.includes('openai'))
    logo = logos.openai;
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
    const successCount = thoughts.filter((t) => t.type === 'success').length;
    const errorCount = thoughts.filter((t) => t.type === 'error').length;
    const totalCount = thoughts.length;
    const latestCost = thoughts
      .find((t) => t.text?.includes('Cost:'))
      ?.text?.match(/\$[\d.]+/)?.[0];
    const provider = thoughts
      .find((t) => t.text?.includes('Response from'))
      ?.text?.match(/from (\w+)/)?.[1];

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
            <span className="text-[9px] text-cyan-400 uppercase tracking-wider animate-pulse">
              Live
            </span>
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
      <div
        ref={containerRef}
        className="space-y-1.5 max-h-32 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        <AnimatePresence mode="popLayout">
          {thoughts.slice(-8).map((thought, i) => (
            <motion.div
              key={thought.id || `thought-${thought.timestamp || Date.now()}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-[11px] py-1 px-2 rounded bg-white/5 min-w-0"
            >
              <span
                className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                  thought.type === 'success'
                    ? 'bg-emerald-400'
                    : thought.type === 'error'
                      ? 'bg-red-400'
                      : 'bg-purple-400'
                }`}
              />
              <span className="text-gray-400 truncate flex-1 min-w-0" title={thought.text}>
                {thought.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {thoughts.length === 0 && (
          <p className="text-xs text-gray-600 italic text-center py-4">
            Awaiting neural activity...
          </p>
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

const ThoughtStreamBorder = memo(
  ({
    thoughts = [],
    isActive = false,
    activeProviders = [], // Array of {provider, model} being used
    className = '',
  }) => {
    return (
      <div className={`relative ${className}`}>
        {/* Simple border - no animation */}
        <div
          className={`absolute inset-0 rounded-xl pointer-events-none border transition-colors duration-300 ${
            isActive ? 'border-white/20' : 'border-white/5'
          }`}
        />

        {/* Content area with provider info */}
        <div className="relative z-10 flex items-center justify-between px-3 py-1.5 min-h-[28px]">
          {/* Left side: Current thought/status */}
          {isActive && thoughts.length > 0 ? (
            <span className="text-[10px] text-gray-400 truncate max-w-[50%]">
              {thoughts[thoughts.length - 1]?.text}
            </span>
          ) : isActive ? (
            <span className="text-[10px] text-gray-500">Processing...</span>
          ) : (
            <span className="text-[10px] text-gray-600">Ready</span>
          )}

          {/* Right side: Active providers during processing */}
          {isActive && activeProviders.length > 0 && (
            <div className="flex items-center gap-1.5">
              {activeProviders.map((p, i) => (
                <div
                  key={p.provider || i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-white/5 text-gray-400 border border-white/10"
                >
                  <span>{p.model || p.provider}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

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
// INPUT BORDER ANIMATION - Simple, quiet border for input section
// ============================================================================

const InputBorderAnimation = memo(({ isActive = false }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-xl transition-all duration-300 border ${
        isActive ? 'border-white/20' : 'border-white/5'
      }`}
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

  return <span className={`${sizeClass} rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />;
});

StatusLight.displayName = 'StatusLight';

// ============================================================================
// QUICK ACTION BUTTON - Reusable button with feedback
// ============================================================================

const QuickActionButton = memo(
  ({ icon, label, onClick, loading = false, success = false, disabled = false }) => {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`
        w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 flex items-center gap-2
        ${
          success
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : disabled
              ? 'bg-white/3 text-gray-600 cursor-not-allowed'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
        }
      `}
      >
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
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
  }
);

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
      active:
        'bg-purple-500/30 text-purple-300 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20',
      inactive: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
    },
    focus: {
      active:
        'bg-amber-500/30 text-amber-300 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20',
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
                  {selectedModel === key && <span className="text-cyan-400 text-sm">✓</span>}
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
// TEST PROMPTS PANEL - V3.3.200
// Quick test prompts with auto-refresh and categories
// ============================================================================

// Test prompts data - organized by category
const TEST_PROMPTS_DATA = {
  execution: {
    icon: '⚡',
    label: 'Execution',
    prompts: [
      { text: 'console.log(2 + 2)', desc: 'Simple math' },
      { text: 'fibonacci(10)', desc: 'Fibonacci test' },
      { text: 'Array.from({length: 5}, (_, i) => i * 2)', desc: 'Array ops' },
    ],
  },
  code: {
    icon: '💻',
    label: 'Code Gen',
    prompts: [
      { text: 'Create a function that reverses a string', desc: 'String util' },
      { text: 'Write a React button component', desc: 'React comp' },
      { text: 'Generate a REST API endpoint for users', desc: 'API code' },
    ],
  },
  creative: {
    icon: '🎨',
    label: 'Creative',
    prompts: [
      { text: 'Visualize a neural network diagram', desc: 'SVG diagram' },
      { text: 'Create a progress bar chart for 75%', desc: 'Chart' },
      { text: 'Design a loading animation', desc: 'Animation' },
    ],
  },
  reasoning: {
    icon: '🧠',
    label: 'Reasoning',
    prompts: [
      { text: 'Explain how async/await works', desc: 'Concept' },
      { text: 'Compare REST vs GraphQL', desc: 'Compare' },
      { text: 'Analyze this codebase structure', desc: 'Analysis' },
    ],
  },
  quick: {
    icon: '🚀',
    label: 'Quick',
    prompts: [
      { text: 'What time is it?', desc: 'Time query' },
      { text: 'Generate a UUID', desc: 'UUID' },
      { text: 'Random number between 1-100', desc: 'Random' },
    ],
  },
};

const TestPromptsPanel = memo(({ onSelectPrompt, isDisabled = false }) => {
  const [activeCategory, setActiveCategory] = useState('execution');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh prompts every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get current category prompts
  const category = TEST_PROMPTS_DATA[activeCategory];
  const prompts = category?.prompts || [];

  return (
    <LiquidPanel variant="surface" className="p-3">
      {/* Header with auto-refresh toggle */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Test Prompts</h3>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
            autoRefresh
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-white/5 text-gray-500 hover:text-gray-400'
          }`}
          title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        >
          {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none">
        {Object.entries(TEST_PROMPTS_DATA).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`flex-shrink-0 px-2 py-1 rounded text-[10px] transition-all ${
              activeCategory === key
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-400'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Prompts list */}
      <div className="space-y-1.5" key={refreshKey}>
        {prompts.map((prompt, i) => (
          <motion.button
            key={`${activeCategory}-${i}-${refreshKey}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => !isDisabled && onSelectPrompt?.(prompt.text)}
            disabled={isDisabled}
            className={`w-full text-left p-2 rounded-lg transition-all group ${
              isDisabled
                ? 'opacity-50 cursor-not-allowed bg-white/3'
                : 'bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent cursor-pointer'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-600 group-hover:text-cyan-400 transition-colors text-sm flex-shrink-0">
                →
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 group-hover:text-white transition-colors truncate">
                  {prompt.text}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">{prompt.desc}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick refresh button */}
      <button
        onClick={() => setRefreshKey((k) => k + 1)}
        className="w-full mt-2 py-1.5 rounded text-[10px] text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-1"
      >
        <span>🔄</span>
        <span>Refresh Prompts</span>
      </button>
    </LiquidPanel>
  );
});

TestPromptsPanel.displayName = 'TestPromptsPanel';

// ============================================================================
// PREVIEW SIZE TOGGLE - Large preview option
// ============================================================================

const PreviewSizeToggle = memo(({ largePreview, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all
        ${
          largePreview
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
        }
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
    <LiquidPanel
      variant="elevated"
      className="p-4 bg-gradient-to-br from-cyan-950/30 to-purple-950/20 border border-cyan-500/20"
    >
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
      <div
        ref={containerRef}
        className="space-y-2 max-h-64 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        <AnimatePresence mode="popLayout">
          {thoughts.map((thought, i) => (
            <motion.div
              key={thought.id || `step-${thought.timestamp || Date.now()}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className={`
                flex items-start gap-2 text-xs py-2 px-3 rounded-lg
                ${
                  thought.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : thought.type === 'error'
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-white/5 border border-white/10'
                }
              `}
            >
              <span
                className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5 ${
                  thought.type === 'success'
                    ? 'bg-emerald-400'
                    : thought.type === 'error'
                      ? 'bg-red-400'
                      : 'bg-cyan-400'
                }`}
              />
              <span
                className={`flex-1 ${
                  thought.type === 'success'
                    ? 'text-emerald-300'
                    : thought.type === 'error'
                      ? 'text-red-300'
                      : 'text-gray-300'
                }`}
              >
                {thought.text}
              </span>
              <span className="text-gray-600 text-[9px] flex-shrink-0">
                {new Date(thought.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {thoughts.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">🧠</div>
            <p className="text-xs text-gray-500">Send a message to see TooLoo's thinking process</p>
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
      content:
        "Hello! I'm TooLoo, your AI companion. I'm connected to multiple AI providers and ready to help you with anything. How can I assist you today?",
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

  // UI Preferences - Controllable from within TooLoo
  const [uiPreferences, setUiPreferences] = useState(() => {
    // Load saved preferences from localStorage
    try {
      const saved = localStorage.getItem('tooloo-ui-preferences');
      return saved
        ? JSON.parse(saved)
        : {
            showLargePreviewToggle: false, // Hidden by default as requested
            showModelSelector: true,
            showStatusIndicator: true,
            compactMode: false,
          };
    } catch {
      return {
        showLargePreviewToggle: false,
        showModelSelector: true,
        showStatusIndicator: true,
        compactMode: false,
      };
    }
  });

  // Save UI preferences when they change
  useEffect(() => {
    localStorage.setItem('tooloo-ui-preferences', JSON.stringify(uiPreferences));
  }, [uiPreferences]);

  // Function to update UI preferences (can be called from within TooLoo)
  const updateUiPreference = useCallback((key, value) => {
    setUiPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('tooloo-ui-preferences', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Listen for UI preference changes from other components (e.g., Command view)
  useEffect(() => {
    const handlePrefsChange = (e) => {
      if (e.detail) {
        setUiPreferences(e.detail);
      }
    };
    window.addEventListener('tooloo-ui-prefs-changed', handlePrefsChange);
    return () => window.removeEventListener('tooloo-ui-prefs-changed', handlePrefsChange);
  }, []);

  // Thought stream state
  const [thoughts, setThoughts] = useState([]);
  const [thoughtIdCounter, setThoughtIdCounter] = useState(0);

  // Active providers during processing
  const [activeProviders, setActiveProviders] = useState([]);

  // Current thinking stage for InlineProcessPanel
  const [currentStage, setCurrentStage] = useState('connecting');

  // UI state
  const [status, setStatus] = useState('idle');
  const [tokenCount, setTokenCount] = useState(0);
  const [actionFeedback, setActionFeedback] = useState({});
  const [currentMood, setCurrentMood] = useState('balanced');
  const [showMoreBelow, setShowMoreBelow] = useState(false); // For floating "writing" indicator

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const userScrolledRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  // Hooks
  const { sendMessage: sendToAPI } = useChatAPI();
  const { setAppState, flashEmotion } = useSkinEmotion();
  const { transitionTo, applyPreset } = useSynapsynDNA.getState();

  // Use chat emotion sync
  useChatEmotion(isStreaming, false, input.length > 0);

  // Helper to add thoughts
  const addThought = useCallback((text, type = 'info') => {
    setThoughtIdCounter((prev) => {
      const newId = prev + 1;
      setThoughts((thoughts) => [
        ...thoughts.slice(-10),
        { id: newId, text, type, time: Date.now() },
      ]);
      return newId;
    });
  }, []);

  // Detect user scroll - if user scrolls up, show floating indicator
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      userScrolledRef.current = !isNearBottom;
      setShowMoreBelow(!isNearBottom && isStreaming);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isStreaming]);

  // Hide "more below" when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      setShowMoreBelow(false);
    }
  }, [isStreaming]);

  // Smart scroll: only scroll on NEW messages, not during streaming updates
  // Let user read from top while content streams below
  useEffect(() => {
    const newMessageCount = messages.length;
    const isNewMessage = newMessageCount > lastMessageCountRef.current;
    lastMessageCountRef.current = newMessageCount;

    // Only auto-scroll when:
    // 1. A new message is added (user sent or AI started responding)
    // 2. User hasn't manually scrolled up
    // 3. NOT during streaming content updates
    if (isNewMessage && !userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Only trigger on message count change, not content updates

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

    // Reset scroll state when user sends a new message
    userScrolledRef.current = false;

    const userMessage = {
      id: Date.now(),
      content: input.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setStatus('thinking');
    setAppState('processing');
    setActiveProviders([]); // Reset active providers
    setCurrentStage('connecting'); // Start with connecting stage
    setThoughts([]); // Clear previous thoughts

    // Get selected model config
    const modelConfig = AI_MODELS[selectedModel] || AI_MODELS.auto;

    // V3.3.198: Minimal initial thought - silent processing
    // Don't add verbose "Sending: ..." thought

    // Show initial provider info
    if (selectedModel !== 'auto') {
      setActiveProviders([
        {
          provider: modelConfig.provider || 'TooLoo',
          model: modelConfig.model || 'Auto',
        },
      ]);
    }

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

      setMessages((prev) => [...prev, streamingMessage]);
      setStreamingMessageId(streamingMsgId);

      await sendToAPI(userMessage.content, {
        mode: 'quick',
        sessionId,
        provider: modelConfig.provider, // Pass selected provider
        model: modelConfig.model, // Pass selected model
        // V3.3.80: Real-time stage updates from backend
        onStageChange: (stage) => {
          setCurrentStage(stage);
          // Update UI state based on stage
          if (stage === 'streaming') {
            setIsThinking(false);
            setIsStreaming(true);
            setStatus('streaming');
            setAppState('streaming');
          } else if (stage === 'complete') {
            // Will be handled in onComplete
          }
        },
        onThought: (text, type = 'info') => {
          // Emit thinking steps from API - these are REAL events now
          addThought(text, type);
        },
        onChunk: (chunk, fullContent) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === streamingMsgId ? { ...msg, content: fullContent } : msg))
          );
        },
        onComplete: (fullContent, metadata) => {
          // Update message with actual provider/model info
          const provider = metadata.provider || 'TooLoo';
          const model = metadata.model || provider;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMsgId ? { ...msg, content: fullContent, provider, model } : msg
            )
          );

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
      setMessages((prev) => [
        ...prev.filter((msg) => msg.id !== streamingMsgId),
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
  }, [
    input,
    isThinking,
    isStreaming,
    sessionId,
    selectedModel,
    sendToAPI,
    setAppState,
    flashEmotion,
    addThought,
  ]);

  // ============================================================================
  // SELF-MODIFICATION API - TooLoo can modify its own UI
  // Exposed to window for internal access
  // ============================================================================

  useEffect(() => {
    // Expose self-modification API to window for internal TooLoo commands
    window.toolooUI = {
      // UI Preferences
      setPreference: (key, value) => {
        updateUiPreference(key, value);
        return `✅ UI preference '${key}' set to ${value}`;
      },
      getPreferences: () => uiPreferences,

      // Quick toggles
      showLargePreview: () => updateUiPreference('showLargePreviewToggle', true),
      hideLargePreview: () => updateUiPreference('showLargePreviewToggle', false),
      showModelSelector: () => updateUiPreference('showModelSelector', true),
      hideModelSelector: () => updateUiPreference('showModelSelector', false),
      enableCompactMode: () => updateUiPreference('compactMode', true),
      disableCompactMode: () => updateUiPreference('compactMode', false),

      // Get current state
      getCurrentModel: () => selectedModel,
      setModel: (model) => setSelectedModel(model),

      // Messages
      addSystemMessage: (content) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content,
            isUser: false,
            timestamp: Date.now(),
            provider: 'System',
          },
        ]);
      },

      // Clear
      clearChat: () => setMessages([]),

      // Mood
      setMood: (mood) => setCurrentMood(mood),
    };

    return () => {
      delete window.toolooUI;
    };
  }, [uiPreferences, selectedModel, updateUiPreference]);

  // ============================================================================
  // QUICK ACTIONS - Copy, Clear, Export
  // ============================================================================

  const handleCopyChat = useCallback(async () => {
    setActionFeedback((prev) => ({ ...prev, copy: 'loading' }));
    addThought('Copying chat to clipboard...');

    try {
      const chatText = messages
        .map((msg) => `[${msg.isUser ? 'You' : 'TooLoo'}] ${msg.content}`)
        .join('\n\n');

      await navigator.clipboard.writeText(chatText);

      setActionFeedback((prev) => ({ ...prev, copy: 'success' }));
      addThought('Chat copied to clipboard', 'success');
      flashEmotion('success');

      setTimeout(() => setActionFeedback((prev) => ({ ...prev, copy: null })), 2000);
    } catch (error) {
      addThought('Failed to copy chat', 'error');
      setActionFeedback((prev) => ({ ...prev, copy: null }));
    }
  }, [messages, addThought, flashEmotion]);

  const handleClearHistory = useCallback(() => {
    setActionFeedback((prev) => ({ ...prev, clear: 'loading' }));
    addThought('Clearing chat history...');

    setTimeout(() => {
      setMessages([
        {
          id: Date.now(),
          content: "Chat cleared. I'm ready for a fresh conversation!",
          isUser: false,
          timestamp: Date.now(),
          provider: 'TooLoo',
        },
      ]);
      setThoughts([]);
      setTokenCount(0);

      setActionFeedback((prev) => ({ ...prev, clear: 'success' }));
      addThought('History cleared', 'success');

      setTimeout(() => setActionFeedback((prev) => ({ ...prev, clear: null })), 2000);
    }, 300);
  }, [addThought]);

  const handleExportSession = useCallback(() => {
    setActionFeedback((prev) => ({ ...prev, export: 'loading' }));
    addThought('Exporting session data...');

    try {
      const sessionData = {
        sessionId,
        exportedAt: new Date().toISOString(),
        duration: Date.now() - sessionStart,
        tokenCount,
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          provider: msg.provider,
        })),
        thoughts: thoughts.map((t) => t.text),
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

      setActionFeedback((prev) => ({ ...prev, export: 'success' }));
      addThought('Session exported successfully', 'success');
      flashEmotion('success');

      setTimeout(() => setActionFeedback((prev) => ({ ...prev, export: null })), 2000);
    } catch (error) {
      addThought('Failed to export session', 'error');
      setActionFeedback((prev) => ({ ...prev, export: null }));
    }
  }, [sessionId, sessionStart, tokenCount, messages, thoughts, addThought, flashEmotion]);

  // ============================================================================
  // MOOD CONTROLS - Zen, Create, Focus
  // ============================================================================

  const handleMoodChange = useCallback(
    (mood) => {
      setCurrentMood(mood);
      transitionTo(mood, 600);

      const moodMessages = {
        zen: 'Entering Zen mode - calm and focused...',
        creative: 'Activating Creative mode - let imagination flow...',
        focus: 'Focus mode engaged - minimal distractions...',
      };

      addThought(moodMessages[mood] || `Mood: ${mood}`);
    },
    [transitionTo, addThought]
  );

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
    // If action is a full prompt string (from Visual Cortex 2.0 buttons), use it directly
    if (action && action.length > 20) {
      setInput(action);
      inputRef.current?.focus();
      return;
    }

    // Legacy predefined actions
    const actionMessages = {
      brainstorm: "Let's brainstorm some ideas together! What topic would you like to explore?",
      write: "I'd love to help you write something. What would you like to create?",
      analyze: "I can help analyze code or data. Share what you'd like me to look at.",
      creative: "Let's get creative! Tell me about your creative project or idea.",
    };

    setInput(actionMessages[action] || action || '');
    inputRef.current?.focus();
  }, []);

  // ============================================================================
  // MESSAGE REACTION HANDLER
  // ============================================================================

  const handleMessageReaction = useCallback(
    (messageId, reaction) => {
      if (reaction === '📋') {
        // Copy message
        const msg = messages.find((m) => m.id === messageId);
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
    },
    [messages, addThought, flashEmotion]
  );

  // Check if we should show welcome message (only initial message from TooLoo)
  const showWelcome = messages.length === 1 && !messages[0].isUser;

  return (
    <div className={`h-full w-full flex relative overflow-hidden ${className}`}>
      {/* Background liquid effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <LiquidSurface variant="subtle" animated={isStreaming || isThinking} />
        {(isStreaming || isThinking) && (
          <EmotionalOrbs count={3} size={{ min: 30, max: 80 }} className="opacity-30" />
        )}
      </div>

      {/* Subtle aurora effect */}
      <PointerAurora size={200} intensity={0.2} blur={100} className="opacity-50" />

      {/* Main chat area - takes full width on mobile, leaves room for sidebar on xl */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full">
        {/* Header with liquid glass effect - Responsive layout */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5 bg-gradient-to-r from-transparent via-cyan-950/20 to-transparent backdrop-blur-sm flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <TooLooAvatar
                size={36}
                state={isStreaming ? 'speaking' : isThinking ? 'thinking' : 'idle'}
                showBreath={false}
              />
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                  Synaptic
                  <StatusLight status={status} size="sm" />
                </h1>
                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">
                  Neural conversation interface
                </p>
              </div>
            </div>

            {/* Model Selection & Controls - Responsive */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              {/* Model Selector */}
              {uiPreferences.showModelSelector && (
                <ModelSelector
                  selectedModel={selectedModel}
                  onChange={setSelectedModel}
                  disabled={isThinking || isStreaming}
                />
              )}

              {/* Large Preview Toggle - Only shown if preference enabled */}
              {uiPreferences.showLargePreviewToggle && (
                <div className="hidden sm:block">
                  <PreviewSizeToggle
                    largePreview={largePreview}
                    onToggle={() => setLargePreview(!largePreview)}
                  />
                </div>
              )}

              {/* Status indicator - Simplified on mobile */}
              {uiPreferences.showStatusIndicator && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                  <StatusLight
                    status={isStreaming ? 'streaming' : isThinking ? 'thinking' : 'active'}
                  />
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {isStreaming ? 'Streaming...' : isThinking ? 'Processing...' : 'Ready'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selected model info bar - Hidden on mobile */}
          {selectedModel !== 'auto' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-gray-500 hidden sm:flex"
            >
              <span>Using:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {AI_MODELS[selectedModel]?.label}
              </span>
              <span className="text-gray-600 hidden md:inline">•</span>
              <span className="hidden md:inline">{AI_MODELS[selectedModel]?.description}</span>
            </motion.div>
          )}
        </div>

        {/* Messages area - Reader-centric: user stays at top, content streams below */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 overflow-auto scroll-smooth relative ${largePreview ? 'p-4 md:p-8' : 'p-3 md:p-6'}`}
        >
          {showWelcome ? (
            <WelcomeMessage onQuickAction={handleQuickAction} />
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isUser={msg.isUser}
                  isLatest={i === messages.length - 1 && !msg.isUser}
                  isStreaming={msg.id === streamingMessageId}
                  onReact={handleMessageReaction}
                  fullWidth={largePreview}
                />
              ))}
              {/* Show InlineProcessPanel during thinking only (not streaming - it's distracting) */}
              {isThinking && !isStreaming && (
                <InlineProcessPanel
                  key="process-panel"
                  thoughts={thoughts}
                  isActive={true}
                  currentStage={currentStage}
                  provider={lastUsedProvider || AI_MODELS[selectedModel]?.provider}
                  model={AI_MODELS[selectedModel]?.model}
                  modelLabel={AI_MODELS[selectedModel]?.label}
                />
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating "writing" indicator - shows when streaming and user scrolled up */}
        <AnimatePresence>
          {showMoreBelow && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => {
                userScrolledRef.current = false;
                setShowMoreBelow(false);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="fixed bottom-32 right-8 z-50 px-4 py-2 rounded-full bg-[#0a0a0a]/90 border border-cyan-500/30 text-cyan-400 text-sm backdrop-blur-sm hover:bg-cyan-500/10 transition-colors flex items-center gap-2 shadow-lg"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Writing... ↓
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input with ThoughtStream Border wrapping the entire input area */}
        <div className="px-3 md:px-6 py-3 md:py-4 border-t border-white/5 flex-shrink-0">
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

            {/* Input row - Quiet, honest design with larger text */}
            <div className="flex gap-2 md:gap-3 p-2 md:p-3 bg-[#050505] rounded-b-xl">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="What would you like to explore?"
                disabled={isThinking || isStreaming}
                className="flex-1 px-4 md:px-5 py-3 md:py-4 rounded-xl bg-white/5 border border-white/10 
                           text-white placeholder-gray-500 text-base md:text-lg
                           focus:outline-none focus:border-white/20 focus:bg-white/[0.03]
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking || isStreaming}
                className={`
                px-5 md:px-7 py-3 md:py-4 rounded-xl font-medium text-base
                transition-all duration-200 flex items-center gap-2
                ${
                  input.trim() && !isThinking && !isStreaming
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                }
              `}
              >
                {isThinking || isStreaming ? <span className="animate-pulse">...</span> : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side panel - Shows on xl screens (1280px+), hidden below */}
      <div className="w-72 xl:w-80 border-l border-white/5 p-3 xl:p-4 space-y-3 xl:space-y-4 overflow-auto hidden xl:flex xl:flex-col flex-shrink-0">
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
                {selectedModel === 'auto'
                  ? 'Auto'
                  : AI_MODELS[selectedModel]?.label.split(' ').slice(1).join(' ')}
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

        {/* Test Prompts Panel - V3.3.200 */}
        <TestPromptsPanel
          onSelectPrompt={(prompt) => {
            setInput(prompt);
            // Optionally auto-send after short delay
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 100);
          }}
          isDisabled={isThinking || isStreaming}
        />

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
            {['gemini', 'claude', 'gpt-4', 'deepseek'].map((provider) => (
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
