// @version 3.3.234
// TooLoo.ai Space V4 - Professional Intelligent Canvas
// ═══════════════════════════════════════════════════════════════════════════
// Features:
// - Professional, polished UI design
// - Real chat interface in cards with conversation history
// - Dimension-specific AI responses with direction suggestions
// - Expandable cards (modal/fullscreen mode) with TooLoo suggestions
// - Smooth animations and transitions
// - Better UX patterns
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = '/api/v1';

// ============================================================================
// DIMENSION CONFIGS - Professional styling
// ============================================================================

const DIMENSION_CONFIGS = {
  design: { 
    icon: '🎨', 
    color: '#f43f5e',
    lightColor: '#fda4af',
    gradient: 'from-rose-500/10 to-pink-500/10',
    solidGradient: 'from-rose-500 to-pink-500',
    border: 'border-rose-500/20',
    label: 'Design',
    description: 'Visual & UX approaches',
    systemPrompt: 'You are a design expert. Focus on visual aesthetics, user experience, UI patterns, accessibility, and design systems. Provide specific, actionable design recommendations.',
    suggestionPrefix: 'This design direction focuses on',
  },
  technical: { 
    icon: '⚙️', 
    color: '#06b6d4',
    lightColor: '#67e8f9',
    gradient: 'from-cyan-500/10 to-blue-500/10',
    solidGradient: 'from-cyan-500 to-blue-500',
    border: 'border-cyan-500/20',
    label: 'Technical',
    description: 'Architecture & implementation',
    systemPrompt: 'You are a technical architect. Focus on code architecture, performance, scalability, security, and best practices. Provide specific implementation guidance with code examples when helpful.',
    suggestionPrefix: 'This technical approach implements',
  },
  user: { 
    icon: '👤', 
    color: '#a855f7',
    lightColor: '#d8b4fe',
    gradient: 'from-purple-500/10 to-indigo-500/10',
    solidGradient: 'from-purple-500 to-indigo-500',
    border: 'border-purple-500/20',
    label: 'User Experience',
    description: 'Workflows & journeys',
    systemPrompt: 'You are a UX researcher and product designer. Focus on user needs, workflows, pain points, and user journeys. Provide insights about user behavior and practical UX improvements.',
    suggestionPrefix: 'This user experience path provides',
  },
  business: { 
    icon: '💼', 
    color: '#f59e0b',
    lightColor: '#fcd34d',
    gradient: 'from-amber-500/10 to-orange-500/10',
    solidGradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/20',
    label: 'Business',
    description: 'Value & strategy',
    systemPrompt: 'You are a business strategist. Focus on market fit, value proposition, revenue models, and competitive advantage. Provide actionable business insights and growth strategies.',
    suggestionPrefix: 'This business strategy delivers',
  },
  ethical: { 
    icon: '⚖️', 
    color: '#10b981',
    lightColor: '#6ee7b7',
    gradient: 'from-emerald-500/10 to-green-500/10',
    solidGradient: 'from-emerald-500 to-green-500',
    border: 'border-emerald-500/20',
    label: 'Ethics',
    description: 'Responsibility & impact',
    systemPrompt: 'You are an ethics advisor. Focus on privacy, accessibility, inclusivity, environmental impact, and responsible AI. Provide thoughtful guidance on ethical considerations.',
    suggestionPrefix: 'This ethical consideration addresses',
  },
};

const PHASES = {
  discovery: { icon: '💡', color: '#f59e0b', label: 'Discovery' },
  exploration: { icon: '🔍', color: '#06b6d4', label: 'Exploring' },
  refinement: { icon: '✨', color: '#a855f7', label: 'Refining' },
  build: { icon: '🔨', color: '#10b981', label: 'Building' },
  ship: { icon: '🚀', color: '#f43f5e', label: 'Shipping' },
};

// ============================================================================
// HEADER BAR - Clean, minimal top bar
// ============================================================================

const HeaderBar = memo(({ prompt, phase, cardCount, collectedCount }) => {
  const phaseConfig = PHASES[phase] || PHASES.discovery;
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Session info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${phaseConfig.color}20` }}
            >
              {phaseConfig.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {prompt ? prompt.slice(0, 40) + (prompt.length > 40 ? '...' : '') : 'New Session'}
              </div>
              <div className="text-xs text-gray-500">{phaseConfig.label}</div>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-4">
          {cardCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              {cardCount} options
            </div>
          )}
          {collectedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {collectedCount} collected
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
});

HeaderBar.displayName = 'HeaderBar';

// ============================================================================
// CHAT MESSAGE - Individual message in card chat
// ============================================================================

const ChatMessage = memo(({ message, isUser, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
        isUser
          ? 'bg-gray-700 text-white rounded-br-md'
          : 'bg-gray-800/80 text-gray-200 rounded-bl-md'
      }`}
      style={!isUser ? { borderLeft: `2px solid ${color}` } : {}}
    >
      {message.content}
    </div>
  </motion.div>
));

ChatMessage.displayName = 'ChatMessage';

// ============================================================================
// OPTION CARD - Professional card with real chat
// ============================================================================

const OptionCard = memo(({
  card,
  index,
  isExpanded,
  isCollected,
  onExpand,
  onCollect,
  onChat,
  isProcessing,
  streamingContent,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const config = DIMENSION_CONFIGS[card.dimension] || DIMENSION_CONFIGS.technical;
  
  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current && isExpanded) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [card.refinements, streamingContent, isExpanded]);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim() && !isProcessing) {
      onChat(chatInput);
      setChatInput('');
    }
  };

  // Compact view (in grid)
  if (!isExpanded) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: index * 0.03 }}
        className={`
          group relative bg-gray-900/60 backdrop-blur-sm rounded-2xl 
          border ${config.border} overflow-hidden cursor-pointer
          hover:bg-gray-900/80 hover:border-opacity-40 transition-all duration-200
          ${isCollected ? 'ring-1 ring-emerald-500/30' : ''}
        `}
        onClick={() => onExpand(card.id)}
      >
        {/* Gradient accent line */}
        <div 
          className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.solidGradient}`}
        />

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-2">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${config.color}15` }}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm leading-tight mb-0.5">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-1">
                {config.label}
              </p>
            </div>
            {/* Confidence */}
            <div 
              className="px-2 py-1 rounded-lg text-xs font-medium"
              style={{ 
                backgroundColor: `${config.color}15`,
                color: card.confidence > 0.8 ? config.color : '#9ca3af'
              }}
            >
              {Math.round(card.confidence * 100)}%
            </div>
          </div>

          {/* Direction badge - the optional direction */}
          {card.direction && (
            <div 
              className="mb-2 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
              style={{ 
                backgroundColor: `${config.color}08`,
                border: `1px solid ${config.color}25`,
              }}
            >
              <span style={{ color: config.color }}>→</span>
              <span className="text-gray-300">{card.direction}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">
            {card.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {card.refinements?.length > 0 && (
                <span className="text-xs text-gray-500">
                  💬 {Math.floor(card.refinements.length / 2)} messages
                </span>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isCollected && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCollect(); }}
                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 
                           text-emerald-400 transition-colors"
                  title="Collect"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onExpand(card.id); }}
                className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 
                         text-gray-400 transition-colors"
                title="Expand"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collected badge */}
          {isCollected && (
            <div className="absolute top-3 right-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Expanded view (modal)
  return null; // Rendered via ExpandedCardModal
});

OptionCard.displayName = 'OptionCard';

// ============================================================================
// EXPANDED CARD MODAL - Full chat interface
// ============================================================================

const ExpandedCardModal = memo(({
  card,
  onClose,
  onCollect,
  onChat,
  isProcessing,
  streamingContent,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const config = DIMENSION_CONFIGS[card?.dimension] || DIMENSION_CONFIGS.technical;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [card?.refinements, streamingContent]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [card?.id]);

  if (!card) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim() && !isProcessing) {
      onChat(card.id, chatInput);
      setChatInput('');
    }
  };

  const messages = card.refinements || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl h-[80vh] bg-gray-900 rounded-3xl 
                   border border-gray-800 overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 p-5 border-b border-gray-800"
          style={{ background: `linear-gradient(135deg, ${config.color}10 0%, transparent 50%)` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${config.color}20` }}
              >
                {config.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">{card.title}</h2>
                <p className="text-sm text-gray-400">{card.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(card.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!card.collected && (
                <button
                  onClick={() => onCollect(card.id)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 
                           text-emerald-400 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Collect
                </button>
              )}
              {card.collected && (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  ✓ Collected
                </span>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* TooLoo Suggestion - always shown at the start */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-4"
          >
            <div 
              className="p-4 rounded-2xl border"
              style={{ 
                background: `linear-gradient(135deg, ${config.color}08 0%, transparent 60%)`,
                borderColor: `${config.color}20`,
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${config.color}30 0%, ${config.color}10 100%)` }}
                >
                  <span className="text-lg">✨</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white">TooLoo Suggestion</span>
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {card?.toolooSuggestion || `${config.suggestionPrefix || 'This direction offers'} ${card?.description?.toLowerCase() || 'a unique approach to your requirements'}. Consider how this aligns with your goals.`}
                  </p>
                  {card?.direction && (
                    <div 
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        backgroundColor: `${config.color}15`,
                        border: `1px solid ${config.color}30`,
                      }}
                    >
                      <span style={{ color: config.color }}>Direction:</span>
                      <span className="text-gray-200">{card.direction}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Initial context if no messages yet */}
          {messages.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Ask questions, request changes, or dive deeper into this {config.label.toLowerCase()} approach.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              isUser={msg.role === 'user'}
              color={config.color}
            />
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md text-sm bg-gray-800/80 text-gray-200"
                style={{ borderLeft: `2px solid ${config.color}` }}
              >
                {streamingContent}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-gray-400 animate-pulse" />
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900/50">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask about this ${config.label.toLowerCase()} approach...`}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 focus:outline-none focus:ring-2
                       focus:border-transparent transition-all"
              style={{ '--tw-ring-color': config.color }}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !chatInput.trim()}
              className="px-5 py-3 rounded-xl font-medium text-white transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:opacity-90 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.lightColor} 100%)` }}
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
});

ExpandedCardModal.displayName = 'ExpandedCardModal';

// ============================================================================
// DIMENSION SECTION - Horizontal card row per dimension
// ============================================================================

const DimensionSection = memo(({
  dimension,
  cards,
  expandedCard,
  onExpand,
  onCollect,
  onChat,
  isProcessing,
}) => {
  const config = DIMENSION_CONFIGS[dimension] || DIMENSION_CONFIGS.technical;
  const sectionCards = cards.filter(c => c.dimension === dimension);

  if (sectionCards.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <span className="text-lg">{config.icon}</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{config.label}</h2>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
        <div className="ml-auto px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-500">
          {sectionCards.length}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionCards.map((card, index) => (
          <OptionCard
            key={card.id}
            card={card}
            index={index}
            isExpanded={expandedCard === card.id}
            isCollected={card.collected}
            onExpand={onExpand}
            onCollect={() => onCollect(card.id)}
            onChat={(msg) => onChat(card.id, msg)}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </motion.section>
  );
});

DimensionSection.displayName = 'DimensionSection';

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState = memo(({ isThinking }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center min-h-[60vh]"
  >
    {isThinking ? (
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-center"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500"
          />
          <div className="absolute inset-2 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-2xl">🔮</span>
          </div>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Exploring dimensions...</h3>
        <p className="text-sm text-gray-500">TooLoo is analyzing your idea</p>
      </motion.div>
    ) : (
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
          <span className="text-4xl">✨</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">What are we building?</h2>
        <p className="text-gray-400 mb-8">
          Describe your idea and TooLoo will explore it across multiple dimensions,
          giving you different perspectives to consider and refine.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          {['design', 'technical', 'user'].map(dim => {
            const cfg = DIMENSION_CONFIGS[dim];
            return (
              <div 
                key={dim}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: `${cfg.color}10` }}
              >
                <span>{cfg.icon}</span>
                <span className="text-sm text-gray-400">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// COLLECTED SIDEBAR
// ============================================================================

const CollectedSidebar = memo(({ collected, onBuild, onNextIteration, onSummarize, onExport, onCompare }) => {
  if (collected.length === 0) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-6 top-24 bottom-24 w-64 z-40"
    >
      <div className="h-full bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-white">Collected</div>
              <div className="text-xs text-gray-500">{collected.length} artifacts</div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {collected.map((item, i) => {
            const cfg = DIMENSION_CONFIGS[item.dimension] || DIMENSION_CONFIGS.technical;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">{cfg.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="p-3 border-t border-gray-800 space-y-2">
          {/* Quick actions row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onNextIteration}
              className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 
                       border border-purple-500/20 text-purple-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5"
            >
              <span>↻</span>
              Next Iteration
            </button>
            <button
              onClick={onSummarize}
              className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 
                       border border-cyan-500/20 text-cyan-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5"
            >
              <span>≡</span>
              Summarize
            </button>
          </div>
          
          {/* Secondary actions row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCompare}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 
                       border border-amber-500/20 text-amber-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5"
            >
              <span>↔</span>
              Compare
            </button>
            <button
              onClick={onExport}
              className="px-3 py-2 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 
                       border border-gray-600/30 text-gray-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5"
            >
              <span>↓</span>
              Export
            </button>
          </div>

          {/* Merge & Synthesize */}
          <button
            onClick={() => console.log('Merge artifacts')}
            className="w-full px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 
                     border border-indigo-500/20 text-indigo-400 text-xs font-medium 
                     transition-all flex items-center justify-center gap-1.5"
          >
            <span>✨</span>
            Merge & Synthesize
          </button>

          {/* Build button - only show when 2+ collected */}
          {collected.length >= 2 && (
            <button
              onClick={onBuild}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500
                       text-white font-medium text-sm hover:opacity-90 transition-opacity
                       flex items-center justify-center gap-2 mt-2"
            >
              <span>🔨</span>
              Start Building
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
});

CollectedSidebar.displayName = 'CollectedSidebar';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TooLooSpaceV4 = memo(() => {
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState('discovery');
  const [isThinking, setIsThinking] = useState(false);
  const [cards, setCards] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [collected, setCollected] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [processingCardId, setProcessingCardId] = useState(null);

  // Get dimensions that have cards
  const activeDimensions = useMemo(() => {
    return [...new Set(cards.map(c => c.dimension))];
  }, [cards]);

  // Handle initial prompt submission
  const handleSubmit = useCallback(async ({ message }) => {
    if (!message.trim()) return;
    
    setIsThinking(true);
    setPrompt(message);

    try {
      // Create session
      const response = await fetch(`${API_BASE}/flow/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Session ${Date.now()}`,
          initialPrompt: message,
        }),
      });
      const data = await response.json();
      if (data.ok) setSession(data.session);

      // Generate cards (simulated - would call AI)
      setTimeout(() => {
        const newCards = generateCards(message);
        setCards(newCards);
        setPhase('exploration');
        setIsThinking(false);
      }, 2000);
    } catch (error) {
      console.error('Submit failed:', error);
      setIsThinking(false);
    }
  }, []);

  // Handle chat with a specific card
  const handleChat = useCallback(async (cardId, message) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setProcessingCardId(cardId);
    setStreamingContent('');

    // Add user message immediately
    setCards(prev => prev.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          refinements: [...(c.refinements || []), { role: 'user', content: message }],
        };
      }
      return c;
    }));

    const config = DIMENSION_CONFIGS[card.dimension] || DIMENSION_CONFIGS.technical;

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode: 'quick',
          sessionId: session?.id || 'default',
          context: {
            route: 'refinement',
            cardId,
            cardTitle: card.title,
            cardDescription: card.description,
            dimension: card.dimension,
            systemPrompt: config.systemPrompt,
          },
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) {
              fullContent += data.chunk;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      // Finalize message
      setCards(prev => prev.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            confidence: Math.min(0.98, c.confidence + 0.03),
            refinements: [
              ...(c.refinements || []),
              { role: 'assistant', content: fullContent || 'I understand. Let me refine this approach.' },
            ],
          };
        }
        return c;
      }));

      if (phase === 'exploration') setPhase('refinement');

    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setProcessingCardId(null);
      setStreamingContent('');
    }
  }, [cards, session, phase]);

  // Handle collect
  const handleCollect = useCallback(async (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.collected) return;

    try {
      const response = await fetch(`${API_BASE}/agent/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.title,
          type: card.dimension === 'design' ? 'component' : 'code',
          content: card.content || JSON.stringify(card, null, 2),
          metadata: {
            dimension: card.dimension,
            confidence: card.confidence,
            sessionId: session?.id,
          },
        }),
      });

      const data = await response.json();

      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, collected: true, artifactId: data.artifact?.id } : c
      ));

      setCollected(prev => [...prev, { ...card, collected: true }]);

    } catch (error) {
      console.error('Collect failed:', error);
    }
  }, [cards, session]);

  // Handle expand card
  const handleExpand = useCallback((cardId) => {
    setExpandedCard(cardId === expandedCard ? null : cardId);
  }, [expandedCard]);

  // Handle build
  const handleBuild = useCallback(() => {
    setPhase('build');
  }, []);

  const expandedCardData = expandedCard ? cards.find(c => c.id === expandedCard) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 40%)`,
          }}
        />
      </div>

      {/* Header */}
      <HeaderBar
        prompt={prompt}
        phase={phase}
        cardCount={cards.length}
        collectedCount={collected.length}
      />

      {/* Main content */}
      <main className={`relative pt-20 pb-32 px-6 ${collected.length > 0 ? 'pr-80' : ''}`}>
        <div className="max-w-6xl mx-auto">
          {cards.length === 0 ? (
            <EmptyState isThinking={isThinking} />
          ) : (
            <div className="pt-8">
              {activeDimensions.map(dimension => (
                <DimensionSection
                  key={dimension}
                  dimension={dimension}
                  cards={cards}
                  expandedCard={expandedCard}
                  onExpand={handleExpand}
                  onCollect={handleCollect}
                  onChat={handleChat}
                  isProcessing={processingCardId !== null}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Collected sidebar */}
      <CollectedSidebar 
        collected={collected} 
        onBuild={handleBuild}
        onNextIteration={() => {
          setPhase('exploration');
          // Generate new variations based on collected
          console.log('Next iteration with:', collected);
        }}
        onSummarize={() => {
          console.log('Summarizing artifacts:', collected);
        }}
        onCompare={() => {
          console.log('Comparing artifacts:', collected);
        }}
        onExport={() => {
          const exportData = JSON.stringify(collected, null, 2);
          const blob = new Blob([exportData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tooloo-artifacts-${Date.now()}.json`;
          a.click();
        }}
      />

      {/* Fixed input - Chat style */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-800 p-3 shadow-2xl"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.elements.spaceInput;
              if (input.value.trim()) {
                handleSubmit({ message: input.value.trim() });
                input.value = '';
              }
            }}
            className="flex gap-3"
          >
            <input
              name="spaceInput"
              type="text"
              placeholder="What are we creating today?"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 focus:outline-none focus:ring-2
                       focus:ring-cyan-500/50 focus:border-transparent transition-all"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={isThinking}
              className="px-5 py-3 rounded-xl font-medium text-white transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:opacity-90 active:scale-95
                       bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {isThinking ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span>Think</span>
              )}
            </button>
          </form>
          
          {/* Quick action chips */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
            <button 
              type="button"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 
                       text-emerald-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              onClick={() => console.log('Validate')}
            >
              <span>✓</span> Validate
            </button>
            <button 
              type="button"
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 
                       text-amber-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              onClick={() => console.log('Optimize')}
            >
              <span>⚙</span> Optimize
            </button>
            <button 
              type="button"
              className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 
                       text-purple-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              onClick={() => console.log('Expand')}
            >
              <span>↗</span> Expand
            </button>
            <button 
              type="button"
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 
                       text-rose-400 text-xs font-medium transition-colors flex items-center gap-1.5"
              onClick={() => console.log('Challenge')}
            >
              <span>?</span> Challenge
            </button>
          </div>
        </motion.div>
      </div>

      {/* Expanded card modal */}
      <AnimatePresence>
        {expandedCardData && (
          <ExpandedCardModal
            card={expandedCardData}
            onClose={() => setExpandedCard(null)}
            onCollect={handleCollect}
            onChat={handleChat}
            isProcessing={processingCardId === expandedCardData.id}
            streamingContent={processingCardId === expandedCardData.id ? streamingContent : ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

TooLooSpaceV4.displayName = 'TooLooSpaceV4';

// ============================================================================
// CARD GENERATOR
// ============================================================================

const generateCards = (prompt) => {
  const dimensions = ['design', 'technical', 'user'];
  const cards = [];

  const titles = {
    design: ['Minimalist Interface', 'Bold & Expressive', 'Enterprise Grade'],
    technical: ['Modern Stack', 'Server-First Architecture', 'Edge Computing'],
    user: ['Guided Experience', 'Power User Mode', 'Accessibility First'],
  };

  const descriptions = {
    design: [
      'Clean, focused interface with thoughtful whitespace and subtle interactions.',
      'Vibrant colors and dynamic animations to engage and delight users.',
      'Professional, trustworthy design with clear hierarchy and patterns.',
    ],
    technical: [
      'React + TypeScript with modern tooling for type safety and DX.',
      'Server components and streaming for optimal performance.',
      'Edge-first architecture for global low-latency access.',
    ],
    user: [
      'Step-by-step onboarding with contextual help throughout.',
      'Keyboard shortcuts, bulk actions, and advanced filters.',
      'WCAG compliant with screen reader support and high contrast.',
    ],
  };

  // Suggested directions for each option
  const directions = {
    design: [
      'Focus on clarity and simplicity',
      'Emphasize engagement and delight',
      'Build trust through professionalism',
    ],
    technical: [
      'Prioritize developer experience and type safety',
      'Optimize for performance and scalability',
      'Enable global reach with low latency',
    ],
    user: [
      'Reduce friction for new users',
      'Empower experienced users',
      'Ensure universal accessibility',
    ],
  };

  // TooLoo suggestions per option
  const toolooSuggestions = {
    design: [
      'This minimalist approach creates breathing room for your content. Consider using a 8px grid system and a limited color palette of 3-4 colors to maintain visual harmony.',
      'Bold design choices can differentiate your product. Consider using micro-interactions on key actions and a vibrant accent color to guide user attention.',
      'Enterprise users expect familiarity and trust. This approach uses established patterns like left-nav, data tables, and clear action hierarchies.',
    ],
    technical: [
      'Modern tooling with TypeScript provides excellent IDE support and catches errors early. This stack works well with teams of all sizes.',
      'Server-first architecture reduces client bundle size and improves SEO. Consider React Server Components with streaming for optimal perceived performance.',
      'Edge computing puts your code closer to users worldwide. This is ideal for latency-sensitive applications or global audiences.',
    ],
    user: [
      'Progressive onboarding reduces cognitive load. Show features contextually as users need them rather than front-loading all information.',
      'Power users appreciate efficiency. Consider implementing vim-style keyboard navigation and command palette (Cmd+K) patterns.',
      'Accessibility is both ethical and practical. WCAG compliance opens your product to 15% more users and improves SEO.',
    ],
  };

  dimensions.forEach((dim, di) => {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count && i < 3; i++) {
      cards.push({
        id: `card-${Date.now()}-${di}-${i}`,
        dimension: dim,
        title: titles[dim][i] || `Option ${i + 1}`,
        description: descriptions[dim][i] || `A ${dim} approach for: ${prompt}`,
        direction: directions[dim][i] || `Explore this ${dim} direction`,
        toolooSuggestion: toolooSuggestions[dim][i],
        confidence: 0.70 + Math.random() * 0.25,
        content: `// ${dim.toUpperCase()}: ${titles[dim][i]}\n// ${prompt}`,
        refinements: [],
        collected: false,
      });
    }
  });

  return cards;
};

export default TooLooSpaceV4;
