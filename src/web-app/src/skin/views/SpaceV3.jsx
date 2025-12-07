// @version 3.3.242
// TooLoo.ai Space V3 - Organized Intelligent Canvas
// ═══════════════════════════════════════════════════════════════════════════
// Features:
// - Cards organized logically by dimension (columns/clusters)
// - Brief panel with session summary and context
// - AI-generated suggestions for next actions
// - Real AI conversations in refinement mode
// - Beautiful, informative, simple card design
// - Contextual timeline awareness
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  memo,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UniversalInput from '../components/UniversalInput';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = '/api/v1';

// ============================================================================
// DIMENSION & PHASE CONFIGS
// ============================================================================

const DIMENSION_CONFIGS = {
  design: { 
    icon: '🎨', 
    color: '#f43f5e', 
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
    label: 'Design',
    description: 'Visual & UX approaches',
  },
  technical: { 
    icon: '⚙️', 
    color: '#06b6d4', 
    gradient: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20',
    label: 'Technical',
    description: 'Architecture & implementation',
  },
  user: { 
    icon: '👤', 
    color: '#a855f7', 
    gradient: 'from-purple-500/20 to-indigo-500/20',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    label: 'User',
    description: 'Experience & workflows',
  },
  business: { 
    icon: '💼', 
    color: '#f59e0b', 
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    label: 'Business',
    description: 'Value & strategy',
  },
  ethical: { 
    icon: '⚖️', 
    color: '#10b981', 
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    label: 'Ethical',
    description: 'Responsibility & impact',
  },
};

const PHASES = {
  discovery: { icon: '💡', color: '#f59e0b', label: 'Discovery', hint: 'Describe your vision' },
  exploration: { icon: '🔍', color: '#06b6d4', label: 'Exploration', hint: 'Explore options' },
  refinement: { icon: '✨', color: '#a855f7', label: 'Refinement', hint: 'Perfect your choices' },
  build: { icon: '🔨', color: '#10b981', label: 'Build', hint: 'Implement' },
  ship: { icon: '🚀', color: '#f43f5e', label: 'Ship', hint: 'Launch' },
};

// ============================================================================
// BRIEF PANEL - Session summary at top
// ============================================================================

const BriefPanel = memo(({ 
  prompt, 
  phase, 
  cardCount, 
  collectedCount,
  suggestions,
  onSuggestionClick,
}) => {
  const phaseConfig = PHASES[phase] || PHASES.discovery;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-4 right-4 z-40 pointer-events-none"
    >
      <div className="max-w-6xl mx-auto">
        {/* Main brief card */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-4 pointer-events-auto">
          <div className="flex items-start gap-4">
            {/* Phase indicator */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${phaseConfig.color}20` }}
            >
              {phaseConfig.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Prompt summary */}
              {prompt ? (
                <h2 className="text-lg font-medium text-white truncate mb-1">
                  {prompt}
                </h2>
              ) : (
                <h2 className="text-lg font-medium text-gray-500 italic">
                  What are we building today?
                </h2>
              )}
              
              {/* Status row */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${phaseConfig.color}15`, color: phaseConfig.color }}
                >
                  {phaseConfig.label}
                </span>
                {cardCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">{cardCount}</span> options
                  </span>
                )}
                {collectedCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span>✓</span> {collectedCount} collected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions row */}
          {suggestions && suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-xs text-gray-500 flex-shrink-0">Suggestions:</span>
                {suggestions.map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className="flex-shrink-0 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 
                             rounded-lg text-sm text-gray-300 hover:text-white transition-colors
                             border border-gray-700/50 hover:border-gray-600/50"
                  >
                    {suggestion.icon && <span className="mr-1.5">{suggestion.icon}</span>}
                    {suggestion.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

BriefPanel.displayName = 'BriefPanel';

// ============================================================================
// DIMENSION COLUMN - Groups cards by dimension
// ============================================================================

const DimensionColumn = memo(({ 
  dimension, 
  cards, 
  isExpanded,
  focusedCard,
  onCardClick,
  onCardFocus,
  onCollect,
  onRefine,
  isProcessing,
}) => {
  const config = DIMENSION_CONFIGS[dimension] || DIMENSION_CONFIGS.technical;
  const columnCards = cards.filter(c => c.dimension === dimension);
  
  if (columnCards.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-w-[280px] max-w-[380px]"
    >
      {/* Dimension header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xl">{config.icon}</span>
        <span className="text-sm font-medium text-gray-400">{config.label}</span>
        <span className="text-xs text-gray-600 ml-auto">{columnCards.length}</span>
      </div>

      {/* Cards stack */}
      <div className="space-y-3">
        {columnCards.map((card, index) => (
          <OptionCard
            key={card.id}
            card={card}
            index={index}
            isFocused={focusedCard === card.id}
            isCollected={card.collected}
            onClick={() => onCardClick(card.id)}
            onFocus={() => onCardFocus(card.id)}
            onCollect={() => onCollect(card.id)}
            onRefine={(msg) => onRefine(card.id, msg)}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </motion.div>
  );
});

DimensionColumn.displayName = 'DimensionColumn';

// ============================================================================
// OPTION CARD - Clean, informative design
// ============================================================================

const OptionCard = memo(({
  card,
  index,
  isFocused,
  isCollected,
  onClick,
  onFocus,
  onCollect,
  onRefine,
  isProcessing,
}) => {
  const [localMessage, setLocalMessage] = useState('');
  const config = DIMENSION_CONFIGS[card.dimension] || DIMENSION_CONFIGS.technical;
  
  const handleRefineSubmit = (e) => {
    e.preventDefault();
    if (localMessage.trim() && onRefine) {
      onRefine(localMessage);
      setLocalMessage('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        relative bg-gradient-to-br ${config.gradient} backdrop-blur-sm
        rounded-xl border ${config.border} overflow-hidden
        transition-all duration-300 cursor-pointer group
        ${isFocused 
          ? `ring-2 ring-offset-2 ring-offset-gray-900 shadow-lg ${config.glow}` 
          : 'hover:shadow-md'
        }
      `}
      style={isFocused ? { ringColor: config.color } : {}}
    >
      {/* Card content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-white text-sm leading-snug pr-2">
            {card.title}
          </h3>
          {/* Confidence badge */}
          <div 
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${config.color}20`, 
              color: card.confidence > 0.8 ? config.color : '#9ca3af' 
            }}
          >
            {Math.round(card.confidence * 100)}%
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
          {card.description}
        </p>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {card.tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="px-1.5 py-0.5 bg-gray-800/50 rounded text-xs text-gray-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Refinements preview */}
        {card.refinements && card.refinements.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800/30">
            <div className="text-xs text-gray-500 mb-1">
              {card.refinements.length / 2} refinement{card.refinements.length > 2 ? 's' : ''}
            </div>
            <div className="text-xs text-gray-400 line-clamp-2 italic">
              "{card.refinements[card.refinements.length - 1]?.content?.slice(0, 80)}..."
            </div>
          </div>
        )}

        {/* Collected indicator */}
        {isCollected && (
          <div className="mt-2 pt-2 border-t border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span>✓</span> Collected as artifact
            </div>
          </div>
        )}
      </div>

      {/* Focused state: inline refine */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-800/30 bg-gray-900/50"
          >
            <form onSubmit={handleRefineSubmit} className="p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localMessage}
                  onChange={(e) => setLocalMessage(e.target.value)}
                  placeholder="Refine this option..."
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2
                           text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1"
                  style={{ focusRingColor: config.color }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !localMessage.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: config.color, color: 'white' }}
                >
                  {isProcessing ? '...' : '→'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Collect button */}
        {!isCollected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCollect?.();
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center
                     bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400
                     transition-all"
            title="Collect as artifact"
          >
            <span className="text-xs">⚑</span>
          </button>
        )}
        {/* Focus/expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFocus?.();
          }}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all
            ${isFocused ? 'bg-white/20' : 'bg-gray-800/50 hover:bg-gray-700/50'}
          `}
        >
          <span className="text-xs">{isFocused ? '✓' : '+'}</span>
        </button>
      </div>

      {/* Collected badge */}
      {isCollected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
                      bg-emerald-500/30 text-emerald-400">
          <span className="text-xs">✓</span>
        </div>
      )}
    </motion.div>
  );
});

OptionCard.displayName = 'OptionCard';

// ============================================================================
// EMPTY STATE - Beautiful first impression
// ============================================================================

const EmptyState = memo(({ isThinking }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center h-full"
  >
    {isThinking ? (
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-center"
      >
        <div className="text-5xl mb-4">🌀</div>
        <div className="text-gray-400">Exploring dimensions...</div>
      </motion.div>
    ) : (
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-6xl mb-6"
        >
          ✨
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-3">
          What shall we create?
        </h2>
        <p className="text-gray-500 mb-6">
          Describe your idea below. TooLoo will explore it across multiple dimensions
          and present organized options for you to refine.
        </p>
        <div className="flex justify-center gap-6 text-sm text-gray-600">
          {Object.entries(DIMENSION_CONFIGS).slice(0, 3).map(([key, dim]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span>{dim.icon}</span>
              <span>{dim.label}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// PHASE INDICATOR - Compact timeline at bottom-left
// ============================================================================

const PhaseIndicator = memo(({ phase, decisions, collected }) => {
  const phases = Object.entries(PHASES);
  const currentIndex = phases.findIndex(([key]) => key === phase);

  return (
    <div className="fixed bottom-6 left-6 z-30">
      <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm rounded-full px-3 py-2 border border-gray-800/50">
        {phases.map(([key, config], index) => (
          <div key={key} className="flex items-center">
            <div 
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${index <= currentIndex 
                  ? 'text-white' 
                  : 'text-gray-600'
                }
              `}
              style={index <= currentIndex ? { backgroundColor: `${config.color}40` } : {}}
              title={config.label}
            >
              {config.icon}
            </div>
            {index < phases.length - 1 && (
              <div 
                className={`w-3 h-0.5 mx-0.5 ${index < currentIndex ? 'bg-gray-600' : 'bg-gray-800'}`}
              />
            )}
          </div>
        ))}
        
        {/* Stats */}
        {(decisions > 0 || collected > 0) && (
          <div className="ml-2 pl-2 border-l border-gray-700 flex items-center gap-2 text-xs">
            {decisions > 0 && <span className="text-amber-400">{decisions} ✓</span>}
            {collected > 0 && <span className="text-emerald-400">{collected} ⚑</span>}
          </div>
        )}
      </div>
    </div>
  );
});

PhaseIndicator.displayName = 'PhaseIndicator';

// ============================================================================
// MAIN COMPONENT - TooLoo Space V3
// ============================================================================

const TooLooSpaceV3 = memo(() => {
  // Session state
  const [session, setSession] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState('discovery');
  const [isThinking, setIsThinking] = useState(false);
  const [inputRoute, setInputRoute] = useState('main');
  const [focusedTarget, setFocusedTarget] = useState(null);
  
  // Cards state
  const [cards, setCards] = useState([]);
  const [focusedCard, setFocusedCard] = useState(null);
  
  // Collected & decisions
  const [collected, setCollected] = useState([]);
  const [decisions, setDecisions] = useState([]);

  // Generate contextual suggestions
  const suggestions = useMemo(() => {
    if (cards.length === 0) return [];
    
    const baseSuggestions = [];
    const dimensions = [...new Set(cards.map(c => c.dimension))];
    
    // Phase-specific suggestions
    if (phase === 'exploration') {
      baseSuggestions.push(
        { icon: '🔍', label: 'Explore more dimensions', action: 'explore' },
        { icon: '✨', label: 'Refine top options', action: 'refine' },
      );
      
      if (dimensions.length < 3) {
        const missing = Object.keys(DIMENSION_CONFIGS).find(d => !dimensions.includes(d));
        if (missing) {
          baseSuggestions.push({
            icon: DIMENSION_CONFIGS[missing].icon,
            label: `Add ${DIMENSION_CONFIGS[missing].label} perspective`,
            action: 'add-dimension',
            dimension: missing,
          });
        }
      }
    }
    
    if (phase === 'refinement') {
      baseSuggestions.push(
        { icon: '📦', label: 'Collect best options', action: 'collect' },
        { icon: '🔨', label: 'Start building', action: 'build' },
      );
    }
    
    // Card-specific suggestions
    const highConfidenceCards = cards.filter(c => c.confidence > 0.85);
    if (highConfidenceCards.length > 0) {
      baseSuggestions.push({
        icon: '⭐',
        label: `${highConfidenceCards.length} high-confidence option${highConfidenceCards.length > 1 ? 's' : ''}`,
        action: 'highlight-best',
      });
    }
    
    return baseSuggestions.slice(0, 4);
  }, [cards, phase]);

  // Handle main prompt submission
  const handleSubmit = useCallback(async ({ message, route, context }) => {
    setIsThinking(true);
    
    try {
      // Save prompt for brief
      if (!prompt && message) setPrompt(message);

      // Create or update session
      if (!session) {
        const response = await fetch(`${API_BASE}/flow/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Session ${Date.now()}`,
            projectId: 'default',
            initialPrompt: message,
          }),
        });
        const data = await response.json();
        if (data.ok) setSession(data.session);
      }

      // If routing to refinement, handle card refinement
      if (route === 'refinement' && context?.id) {
        await handleRefine(context.id, message);
        return;
      }

      // Generate exploration cards (mock for now, would call AI)
      setTimeout(() => {
        const newCards = generateExplorationCards(message);
        setCards(prev => [...prev, ...newCards]);
        setPhase('exploration');
        setIsThinking(false);
      }, 1500);

    } catch (error) {
      console.error('Submit failed:', error);
      setIsThinking(false);
    }
  }, [session, prompt]);

  // Handle card refinement with real AI
  const handleRefine = useCallback(async (cardId, message) => {
    setIsThinking(true);
    
    const card = cards.find(c => c.id === cardId);
    if (!card) {
      setIsThinking(false);
      return;
    }

    try {
      // Call streaming chat API
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
            cardContent: card.content,
            cardTitle: card.title,
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
            if (data.chunk) fullContent += data.chunk;
          } catch {}
        }
      }

      // Update card with refinement
      setCards(prev => prev.map(c => {
        if (c.id === cardId) {
          return {
            ...c,
            confidence: Math.min(0.98, c.confidence + 0.05),
            refinements: [
              ...(c.refinements || []),
              { role: 'user', content: message },
              { role: 'assistant', content: fullContent || 'Refined based on your feedback.' },
            ],
          };
        }
        return c;
      }));
      
      // Progress to refinement phase if we have refinements
      if (phase === 'exploration') {
        setPhase('refinement');
      }

    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [cards, session, phase]);

  // Handle collecting a card as an artifact
  const handleCollect = useCallback(async (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.collected) return;

    try {
      // Call the artifact creation API
      const response = await fetch(`${API_BASE}/agent/artifacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.title,
          type: card.dimension === 'design' ? 'component' : 'code',
          content: card.content || `// ${card.title}\n// ${card.description}\n\n${JSON.stringify(card, null, 2)}`,
          metadata: {
            dimension: card.dimension,
            confidence: card.confidence,
            tags: card.tags,
            refinements: card.refinements?.length || 0,
            sessionId: session?.id,
            collectedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();
      
      if (data.ok || data.artifact) {
        // Update card as collected
        setCards(prev => prev.map(c => {
          if (c.id === cardId) {
            return { ...c, collected: true, artifactId: data.artifact?.id };
          }
          return c;
        }));
        
        // Add to collected list
        setCollected(prev => [...prev, { 
          ...card, 
          collected: true, 
          artifactId: data.artifact?.id,
          collectedAt: new Date().toISOString(),
        }]);

        // Also record in flow session if exists
        if (session?.id) {
          await fetch(`${API_BASE}/flow/sessions/${session.id}/collect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              optionId: cardId,
              nodeId: card.dimension,
            }),
          }).catch(() => {}); // Non-critical
        }
      }
    } catch (error) {
      console.error('Collect failed:', error);
    }
  }, [cards, session]);

  // Handle card focus for routable input
  const handleCardFocus = useCallback((cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (focusedCard === cardId) {
      // Toggle off
      setFocusedCard(null);
      setInputRoute('main');
      setFocusedTarget(null);
    } else {
      setFocusedCard(cardId);
      if (card) {
        setInputRoute('refinement');
        setFocusedTarget({ type: 'option', id: cardId, title: card.title });
      }
    }
  }, [cards, focusedCard]);

  // Handle card click (expand/details)
  const handleCardClick = useCallback((cardId) => {
    // For now, just focus
    handleCardFocus(cardId);
  }, [handleCardFocus]);

  // Clear focus when clicking background
  const handleBackgroundClick = useCallback(() => {
    setFocusedCard(null);
    setInputRoute('main');
    setFocusedTarget(null);
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion) => {
    console.log('Suggestion clicked:', suggestion);
    // Could route to specific actions here
  }, []);

  // Group cards by dimension for display
  const activeDimensions = useMemo(() => {
    return [...new Set(cards.map(c => c.dimension))];
  }, [cards]);

  return (
    <div
      className="h-full w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden relative"
      onClick={handleBackgroundClick}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Brief panel */}
      {(cards.length > 0 || prompt) && (
        <BriefPanel
          prompt={prompt}
          phase={phase}
          cardCount={cards.length}
          collectedCount={collected.length}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
        />
      )}

      {/* Phase indicator */}
      <PhaseIndicator
        phase={phase}
        decisions={decisions.length}
        collected={collected.length}
      />

      {/* Main content area */}
      <div className="h-full pt-32 pb-24 px-6 overflow-auto">
        {cards.length === 0 ? (
          <EmptyState isThinking={isThinking} />
        ) : (
          /* Organized columns by dimension */
          <motion.div 
            layout
            className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-center"
          >
            {activeDimensions.map(dimension => (
              <DimensionColumn
                key={dimension}
                dimension={dimension}
                cards={cards}
                focusedCard={focusedCard}
                onCardClick={handleCardClick}
                onCardFocus={handleCardFocus}
                onCollect={handleCollect}
                onRefine={handleRefine}
                isProcessing={isThinking}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Collected artifacts panel */}
      <AnimatePresence>
        {collected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-4 top-32 bottom-24 w-72 z-40"
          >
            <div className="h-full bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-emerald-500/20 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">⚑</span>
                  <span className="font-medium text-white">Collected</span>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {collected.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Artifacts ready for build phase</p>
              </div>

              {/* Collected items */}
              <div className="flex-1 overflow-auto p-3 space-y-2">
                {collected.map((item, i) => {
                  const config = DIMENSION_CONFIGS[item.dimension] || DIMENSION_CONFIGS.technical;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-3 rounded-lg bg-gradient-to-br ${config.gradient} border ${config.border}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                          <p className="text-xs text-gray-400 truncate">{item.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{Math.round(item.confidence * 100)}%</span>
                            {item.refinements?.length > 0 && (
                              <span className="text-xs text-purple-400">
                                +{item.refinements.length / 2} refined
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Build action */}
              {collected.length >= 2 && (
                <div className="p-3 border-t border-gray-800/50">
                  <button
                    onClick={() => setPhase('build')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg
                             text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🔨</span> Start Building
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed input at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
        <UniversalInput
          route={inputRoute}
          onSubmit={handleSubmit}
          onRouteChange={(route) => {
            if (route === 'main') handleBackgroundClick();
            setInputRoute(route);
          }}
          isProcessing={isThinking}
          targetContext={focusedTarget}
          sessionPhase={phase}
        />
      </div>
    </div>
  );
});

TooLooSpaceV3.displayName = 'TooLooSpaceV3';

// ============================================================================
// CARD GENERATOR - Replace with real AI
// ============================================================================

const generateExplorationCards = (prompt) => {
  const dimensions = ['design', 'technical', 'user'];
  const cards = [];
  
  dimensions.forEach((dim, di) => {
    const optionsPerDim = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < optionsPerDim; i++) {
      cards.push({
        id: `card-${Date.now()}-${di}-${i}`,
        dimension: dim,
        title: getCardTitle(dim, i),
        description: getCardDescription(dim, prompt),
        confidence: 0.65 + Math.random() * 0.30,
        tags: getCardTags(dim),
        content: `// ${dim.toUpperCase()} APPROACH ${i + 1}\n// Context: "${prompt}"\n\n// Implementation...`,
        refinements: [],
        collected: false,
      });
    }
  });
  
  return cards;
};

const getCardTitle = (dim, i) => {
  const titles = {
    design: ['Minimalist & Clean', 'Bold & Expressive', 'Enterprise Grade', 'Playful Modern'],
    technical: ['Type-Safe Stack', 'Server Components', 'Edge-First', 'Progressive Enhancement'],
    user: ['Quick Actions', 'Guided Flow', 'Power User', 'Accessible First'],
    business: ['Growth Focus', 'Enterprise Ready', 'Startup Lean', 'Platform Play'],
    ethical: ['Privacy First', 'Sustainable', 'Inclusive', 'Transparent'],
  };
  return titles[dim]?.[i] || `Option ${i + 1}`;
};

const getCardDescription = (dim, prompt) => {
  const shortPrompt = prompt?.slice(0, 30) || 'your idea';
  const descs = {
    design: `Clean, modern visual approach for ${shortPrompt}. Focuses on clarity and usability.`,
    technical: `Scalable architecture with type safety. Optimized for ${shortPrompt}.`,
    user: `User-centered design prioritizing key workflows and accessibility.`,
    business: `Strategic approach balancing value delivery with sustainable growth.`,
    ethical: `Responsible implementation considering impact and inclusivity.`,
  };
  return descs[dim] || 'Exploring this dimension for your project.';
};

const getCardTags = (dim) => {
  const tags = {
    design: ['ui', 'ux', 'visual', 'modern', 'clean'],
    technical: ['typescript', 'react', 'performance', 'scalable', 'secure'],
    user: ['accessibility', 'workflow', 'efficiency', 'intuitive'],
    business: ['growth', 'metrics', 'value', 'strategy'],
    ethical: ['privacy', 'sustainable', 'inclusive'],
  };
  const dimTags = tags[dim] || [];
  return dimTags.slice(0, 2 + Math.floor(Math.random() * 2));
};

export default TooLooSpaceV3;
