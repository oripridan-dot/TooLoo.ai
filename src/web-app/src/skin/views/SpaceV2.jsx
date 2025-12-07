// @version 3.3.219
// TooLoo.ai Space V2 - Infinite Canvas with Free-Moving Cards
// ═══════════════════════════════════════════════════════════════════════════
// Combines:
// - Free-moving draggable cards with momentum (from CreationSpace)
// - Multi-dimensional thinking (from Flow system)
// - Real AI conversations in refinement mode
// - Contextual timeline awareness
// - Production-quality output pipeline
// ═══════════════════════════════════════════════════════════════════════════

import React, {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import UniversalInput from '../components/UniversalInput';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = '/api/v1';

// ============================================================================
// DIMENSION & PHASE CONFIGS
// ============================================================================

const DIMENSION_CONFIGS = {
  design: { icon: '🎨', color: '#f43f5e', gradient: 'from-rose-500 to-pink-500', label: 'Design' },
  technical: { icon: '⚙️', color: '#06b6d4', gradient: 'from-cyan-500 to-blue-500', label: 'Technical' },
  user: { icon: '👤', color: '#a855f7', gradient: 'from-purple-500 to-indigo-500', label: 'User' },
  business: { icon: '💼', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500', label: 'Business' },
  ethical: { icon: '⚖️', color: '#10b981', gradient: 'from-emerald-500 to-green-500', label: 'Ethical' },
};

const PHASES = {
  discovery: { icon: '💡', color: '#f59e0b', label: 'Discovery' },
  exploration: { icon: '🔍', color: '#06b6d4', label: 'Exploration' },
  refinement: { icon: '✨', color: '#a855f7', label: 'Refinement' },
  build: { icon: '🔨', color: '#10b981', label: 'Build' },
  ship: { icon: '🚀', color: '#f43f5e', label: 'Ship' },
};

// ============================================================================
// FLOATING OPTION CARD - Free-moving with momentum
// ============================================================================

const FloatingCard = memo(({
  card,
  position,
  isExpanded,
  isFocused,
  onToggle,
  onFocus,
  onPositionChange,
  onRefine,
  isProcessing,
}) => {
  const [localPos, setLocalPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [refineMessage, setRefineMessage] = useState('');
  const rafRef = useRef(null);
  
  const config = DIMENSION_CONFIGS[card.dimension] || DIMENSION_CONFIGS.technical;

  // Sync with external position
  useEffect(() => {
    if (!isDragging) setLocalPos(position);
  }, [position, isDragging]);

  // Apply momentum
  useEffect(() => {
    if (isDragging || (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1)) return;

    const animate = () => {
      setVelocity(v => ({ x: v.x * 0.95, y: v.y * 0.95 }));
      setLocalPos(prev => {
        const newX = prev.x + velocity.x;
        const newY = prev.y + velocity.y;
        const padding = 100;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        
        let boundedX = Math.max(padding, Math.min(maxX, newX));
        let boundedY = Math.max(padding, Math.min(maxY, newY));
        
        // Bounce off edges
        if (newX < padding || newX > maxX) {
          setVelocity(v => ({ ...v, x: -v.x * 0.5 }));
        }
        if (newY < padding || newY > maxY) {
          setVelocity(v => ({ ...v, y: -v.y * 0.5 }));
        }
        
        return { ...prev, x: boundedX, y: boundedY };
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [isDragging, velocity]);

  const handleDragStart = () => {
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
  };

  const handleDrag = (_, info) => {
    setLocalPos(prev => ({
      ...prev,
      x: prev.x + info.delta.x,
      y: prev.y + info.delta.y,
    }));
    setVelocity({ x: info.delta.x * 1.5, y: info.delta.y * 1.5 });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onPositionChange?.({ ...localPos, id: card.id });
  };

  const handleRefineSubmit = () => {
    if (refineMessage.trim()) {
      onRefine?.(card.id, refineMessage);
      setRefineMessage('');
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`absolute ${isDragging ? 'cursor-grabbing z-50' : 'cursor-grab z-30'}`}
      style={{
        left: localPos.x,
        top: localPos.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0, rotate: -10 }}
      animate={{
        scale: isFocused ? 1.05 : 1,
        opacity: 1,
        rotate: 0,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.08, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
    >
      {/* Card container */}
      <motion.div
        layout
        className={`
          relative rounded-2xl overflow-hidden backdrop-blur-xl
          bg-gradient-to-br from-gray-900/90 to-gray-800/90
          border-2 transition-colors duration-300 shadow-2xl
          ${isFocused ? 'border-white/30' : 'border-white/10'}
          ${isExpanded ? 'w-[380px]' : 'w-64'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDragging) onFocus?.(card.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggle?.(card.id);
        }}
      >
        {/* Dimension color bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${config.color}, ${config.color}88)` }}
        />

        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.icon}</span>
              <div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: `${config.color}20`, color: config.color }}
                >
                  {config.label}
                </span>
              </div>
            </div>
            
            {/* Confidence badge */}
            {card.confidence && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${card.confidence * 100}%`,
                      background: config.color,
                    }}
                  />
                </div>
                <span>{Math.round(card.confidence * 100)}%</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-white mt-2">{card.title}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{card.description}</p>
        </div>

        {/* Tags */}
        {card.tags?.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1">
            {card.tags.slice(0, isExpanded ? 10 : 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-xs text-gray-500">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expanded content with refinement */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10"
            >
              {/* Full content */}
              {card.content && (
                <div className="p-4 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {card.content}
                  </pre>
                </div>
              )}

              {/* Refinement chat */}
              <div className="p-4 pt-0">
                {/* Previous refinements */}
                {card.refinements?.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                    {card.refinements.map((ref, i) => (
                      <div
                        key={i}
                        className={`text-sm p-2 rounded-lg ${
                          ref.role === 'user'
                            ? 'bg-cyan-500/10 text-cyan-300 ml-4'
                            : 'bg-white/5 text-gray-300 mr-4'
                        }`}
                      >
                        {ref.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Refine input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={refineMessage}
                    onChange={(e) => setRefineMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
                    placeholder="Refine this option..."
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                    disabled={isProcessing}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefineSubmit}
                    disabled={!refineMessage.trim() || isProcessing}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      refineMessage.trim() && !isProcessing
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isProcessing ? '...' : '→'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collect button */}
        <div className="absolute top-4 right-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${card.collected
                ? 'bg-emerald-500 text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }
            `}
          >
            {card.collected ? '✓' : '+'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});

FloatingCard.displayName = 'FloatingCard';

// ============================================================================
// COSMIC CENTER - The TooLoo presence at canvas center
// ============================================================================

const CosmicCenter = memo(({ isActive, isThinking, phase }) => {
  const controls = useAnimation();
  const phaseConfig = PHASES[phase] || PHASES.discovery;

  useEffect(() => {
    if (isThinking) {
      controls.start({
        scale: [1, 1.2, 1],
        transition: { duration: 1.5, repeat: Infinity },
      });
    } else {
      controls.stop();
      controls.set({ scale: 1 });
    }
  }, [isThinking, controls]);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
      animate={controls}
    >
      {/* Outer rings */}
      <motion.div
        className="absolute -inset-20 rounded-full opacity-20"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(6,182,212,0.3), transparent, rgba(139,92,246,0.3), transparent)',
        }}
      />

      {/* Phase ring */}
      <motion.div
        className="absolute -inset-12 rounded-full border-2 opacity-30"
        style={{ borderColor: phaseConfig.color }}
        animate={{ scale: isActive ? [1, 1.1, 1] : 1 }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Core */}
      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 flex items-center justify-center shadow-2xl">
        <div className="text-center">
          <span className="text-4xl">👁</span>
          <div className="mt-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${phaseConfig.color}20`, color: phaseConfig.color }}
            >
              {phaseConfig.label}
            </span>
          </div>
        </div>

        {/* Thinking pulse */}
        <AnimatePresence>
          {isThinking && (
            <>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-cyan-500/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

CosmicCenter.displayName = 'CosmicCenter';

// ============================================================================
// TIMELINE INDICATOR - Shows session progress
// ============================================================================

const TimelineIndicator = memo(({ phase, decisions, artifacts }) => {
  const phases = Object.entries(PHASES);
  const currentIndex = phases.findIndex(([key]) => key === phase);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-4 py-2">
        {phases.map(([key, config], index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <React.Fragment key={key}>
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-full transition-all
                  ${isCurrent ? 'bg-white/10' : ''}
                `}
              >
                <span className={isCurrent ? '' : 'opacity-50'}>{config.icon}</span>
                {isCurrent && (
                  <span className="text-xs font-medium text-white">{config.label}</span>
                )}
              </div>
              {index < phases.length - 1 && (
                <div className={`w-6 h-0.5 ${isPast ? 'bg-gray-500' : 'bg-gray-700'}`} />
              )}
            </React.Fragment>
          );
        })}
        
        {/* Stats */}
        <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-3 text-xs text-gray-400">
          <span>📝 {decisions} decisions</span>
          <span>📦 {artifacts} artifacts</span>
        </div>
      </div>
    </div>
  );
});

TimelineIndicator.displayName = 'TimelineIndicator';

// ============================================================================
// TOOLOO SPACE V2 - Main Canvas
// ============================================================================

const TooLooSpaceV2 = memo(() => {
  // Session state
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('discovery');
  const [isThinking, setIsThinking] = useState(false);
  const [inputRoute, setInputRoute] = useState('main');
  const [focusedTarget, setFocusedTarget] = useState(null);
  
  // Cards state
  const [cards, setCards] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [focusedCard, setFocusedCard] = useState(null);
  const [positions, setPositions] = useState({});
  
  // Collected & decisions
  const [collected, setCollected] = useState([]);
  const [decisions, setDecisions] = useState([]);

  // Generate random position around center
  const generatePosition = useCallback((index, total) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = 250 + Math.random() * 100;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      scale: 0.9 + Math.random() * 0.2,
    };
  }, []);

  // Handle main prompt submission
  const handleSubmit = useCallback(async ({ message, route, context }) => {
    setIsThinking(true);
    
    try {
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

      // If routing to refinement, send to chat with context
      if (route === 'refinement' && context) {
        await handleRefine(context.id, message);
        return;
      }

      // Generate exploration cards based on prompt
      // In real implementation, this would call AI to generate options
      setTimeout(() => {
        const newCards = generateMockCards(message);
        const newPositions = {};
        
        newCards.forEach((card, i) => {
          newPositions[card.id] = generatePosition(i, newCards.length);
        });
        
        setCards(prev => [...prev, ...newCards]);
        setPositions(prev => ({ ...prev, ...newPositions }));
        setPhase('exploration');
        setIsThinking(false);
      }, 1500);

    } catch (error) {
      console.error('Submit failed:', error);
      setIsThinking(false);
    }
  }, [session, generatePosition]);

  // Handle card refinement with real AI
  const handleRefine = useCallback(async (cardId, message) => {
    setIsThinking(true);
    
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    try {
      // Call streaming chat API with refinement context
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
            refinements: [
              ...(c.refinements || []),
              { role: 'user', content: message },
              { role: 'assistant', content: fullContent || 'Refined based on your feedback.' },
            ],
          };
        }
        return c;
      }));

    } catch (error) {
      console.error('Refine failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [cards, session]);

  // Handle position changes
  const handlePositionChange = useCallback((newPos) => {
    setPositions(prev => ({
      ...prev,
      [newPos.id]: { x: newPos.x, y: newPos.y },
    }));
  }, []);

  // Handle card focus for routable input
  const handleCardFocus = useCallback((cardId) => {
    const card = cards.find(c => c.id === cardId);
    setFocusedCard(cardId);
    if (card) {
      setInputRoute('refinement');
      setFocusedTarget({ type: 'option', id: cardId, title: card.title });
    }
  }, [cards]);

  // Clear focus
  const handleClearFocus = useCallback(() => {
    setFocusedCard(null);
    setInputRoute('main');
    setFocusedTarget(null);
  }, []);

  return (
    <div
      className="h-full w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden relative"
      onClick={handleClearFocus}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Timeline */}
      <TimelineIndicator
        phase={phase}
        decisions={decisions.length}
        artifacts={collected.length}
      />

      {/* Cosmic center */}
      <CosmicCenter
        isActive={cards.length > 0}
        isThinking={isThinking}
        phase={phase}
      />

      {/* Floating cards */}
      <AnimatePresence>
        {cards.map(card => (
          <FloatingCard
            key={card.id}
            card={card}
            position={positions[card.id] || { x: window.innerWidth / 2, y: window.innerHeight / 2 }}
            isExpanded={expandedCard === card.id}
            isFocused={focusedCard === card.id}
            onToggle={(id) => setExpandedCard(expandedCard === id ? null : id)}
            onFocus={handleCardFocus}
            onPositionChange={handlePositionChange}
            onRefine={handleRefine}
            isProcessing={isThinking}
          />
        ))}
      </AnimatePresence>

      {/* Fixed input at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
        <UniversalInput
          route={inputRoute}
          onSubmit={handleSubmit}
          onRouteChange={(route) => {
            if (route === 'main') handleClearFocus();
            setInputRoute(route);
          }}
          isProcessing={isThinking}
          targetContext={focusedTarget}
          sessionPhase={phase}
        />
      </div>

      {/* Empty state */}
      {cards.length === 0 && !isThinking && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">What are we building?</h2>
          <p className="text-gray-500">Type below to start exploring your idea from multiple dimensions</p>
        </div>
      )}
    </div>
  );
});

TooLooSpaceV2.displayName = 'TooLooSpaceV2';

// ============================================================================
// MOCK DATA GENERATOR - Replace with real AI
// ============================================================================

const generateMockCards = (prompt) => {
  const dimensions = ['design', 'technical', 'user'];
  const cards = [];
  
  dimensions.forEach((dim, di) => {
    const optionsPerDim = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < optionsPerDim; i++) {
      cards.push({
        id: `card-${Date.now()}-${di}-${i}`,
        dimension: dim,
        title: getMockTitle(dim, i),
        description: getMockDescription(dim),
        confidence: 0.6 + Math.random() * 0.35,
        tags: getMockTags(dim),
        content: `// ${dim.toUpperCase()} OPTION ${i + 1}\n// Based on: "${prompt}"\n\n// Implementation details would go here...`,
        refinements: [],
        collected: false,
      });
    }
  });
  
  return cards;
};

const getMockTitle = (dim, i) => {
  const titles = {
    design: ['Minimalist Approach', 'Bold & Expressive', 'Enterprise Feel', 'Playful UI'],
    technical: ['React + TypeScript', 'Server Components', 'GraphQL API', 'Edge Functions'],
    user: ['Quick Actions First', 'Guided Experience', 'Power User Mode', 'Accessible Design'],
  };
  return titles[dim]?.[i] || `Option ${i + 1}`;
};

const getMockDescription = (dim) => {
  const descs = {
    design: 'Clean, modern visual approach with focus on usability',
    technical: 'Scalable architecture with type safety and performance',
    user: 'User-centered approach prioritizing key workflows',
  };
  return descs[dim] || 'Exploring this dimension';
};

const getMockTags = (dim) => {
  const tags = {
    design: ['ui', 'ux', 'visual', 'modern'],
    technical: ['typescript', 'react', 'performance', 'scalable'],
    user: ['accessibility', 'workflow', 'efficiency'],
  };
  return tags[dim]?.slice(0, 2 + Math.floor(Math.random() * 2)) || [];
};

export default TooLooSpaceV2;
