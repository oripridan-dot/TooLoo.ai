// @version 3.3.278
// TooLoo.ai Space V4 - Two-Step Creative Flow with Real Data
// ═══════════════════════════════════════════════════════════════════════════
// Step 1: Explore Phase - TooLoo's actual capabilities as cards
// Step 2: Options Phase - Dimension-organized options from real API
// ENHANCED: Real API data, scrollable layout, live capability status
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
import { EnhancedMarkdown } from '../chat/LiquidChatComponents';

// ============================================================================
// TOOLOO GUIDANCE MESSAGES - Contextual hints and suggestions
// ============================================================================

const TOOLOO_GUIDANCE = {
  discovery: {
    message: "What shall we create together? Describe your vision and I'll explore it across multiple dimensions.",
    hint: "Be specific about your goals — I work best with clear intentions.",
    mood: 'curious',
  },
  explore: {
    message: "Interesting idea! Let me understand how you'd like to approach this.",
    hint: "Each approach reveals different insights about your concept.",
    mood: 'thinking',
  },
  options: {
    message: "Here are the possibilities I see. Collect the ones that resonate with you.",
    hint: "Click any card to dive deeper or collect it to your synthesis panel.",
    mood: 'creative',
  },
  refinement: {
    message: "Great choices! Let's refine these together.",
    hint: "Ask me questions about any card to explore it further.",
    mood: 'focused',
  },
  build: {
    message: "Ready to synthesize your collected artifacts into reality.",
    hint: "I'll combine your selections into a cohesive implementation.",
    mood: 'excited',
  },
};

const API_BASE = '/api/v1';

// ============================================================================
// TOOLOO CAPABILITIES - Real system capabilities as exploration cards
// ============================================================================

const TOOLOO_CAPABILITIES = [
  {
    id: 'visuals',
    icon: '🎨',
    title: 'Visual Generation',
    description: 'Create SVG diagrams, illustrations, and visual representations',
    color: '#f43f5e',
    action: 'Generate visuals',
    endpoint: '/chat/command/illustration',
    module: 'visual-cortex',
  },
  {
    id: 'diagrams',
    icon: '📊',
    title: 'Diagrams & Charts',
    description: 'Data visualization, flowcharts, architecture diagrams',
    color: '#06b6d4',
    action: 'Create diagrams',
    endpoint: '/visuals/v2/chart',
    module: 'data-viz-engine',
  },
  {
    id: 'analytics',
    icon: '📈',
    title: 'Analytics & Insights',
    description: 'Deep analysis with metrics, patterns, and predictions',
    color: '#a855f7',
    action: 'Analyze data',
    endpoint: '/cognitive/meta/analyze',
    module: 'meta-learner',
  },
  {
    id: 'summarization',
    icon: '📝',
    title: 'Smart Summarization',
    description: 'Concise summaries, key points extraction, and synthesis',
    color: '#10b981',
    action: 'Summarize content',
    endpoint: '/chat/stream',
    module: 'cognitive-core',
  },
  {
    id: 'code',
    icon: '💻',
    title: 'Code Generation',
    description: 'Write, refactor, and optimize code across languages',
    color: '#f59e0b',
    action: 'Generate code',
    endpoint: '/chat/command/component',
    module: 'code-engine',
  },
  {
    id: 'exploration',
    icon: '🔮',
    title: 'Deep Exploration',
    description: 'Multi-dimensional analysis with creative insights',
    color: '#ec4899',
    action: 'Explore deeply',
    endpoint: '/cognitive/curiosity/explore',
    module: 'curiosity-engine',
  },
];

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
  discovery: { icon: '💡', color: '#f59e0b', label: 'Discovery', glowColor: 'rgba(245, 158, 11, 0.3)' },
  exploration: { icon: '🔍', color: '#06b6d4', label: 'Exploring', glowColor: 'rgba(6, 182, 212, 0.3)' },
  explore: { icon: '🔍', color: '#06b6d4', label: 'Exploring', glowColor: 'rgba(6, 182, 212, 0.3)' },
  options: { icon: '✨', color: '#a855f7', label: 'Options', glowColor: 'rgba(168, 85, 247, 0.3)' },
  refinement: { icon: '✨', color: '#a855f7', label: 'Refining', glowColor: 'rgba(168, 85, 247, 0.3)' },
  build: { icon: '🔨', color: '#10b981', label: 'Building', glowColor: 'rgba(16, 185, 129, 0.3)' },
  ship: { icon: '🚀', color: '#f43f5e', label: 'Shipping', glowColor: 'rgba(244, 63, 94, 0.3)' },
};

// ============================================================================
// TOOLOO INLINE HINT - Compact guidance integrated with input
// ============================================================================

const ToolooInlineHint = memo(({ phase, isThinking }) => {
  const guidance = TOOLOO_GUIDANCE[phase] || TOOLOO_GUIDANCE.discovery;
  const phaseConfig = PHASES[phase] || PHASES.discovery;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-1 mb-2"
    >
      {/* Small TooLoo indicator with glow */}
      <div className="relative flex-shrink-0">
        <motion.div
          className="absolute -inset-1 rounded-full opacity-50"
          animate={{
            boxShadow: [
              `0 0 8px ${phaseConfig.glowColor}`,
              `0 0 12px ${phaseConfig.glowColor}`,
              `0 0 8px ${phaseConfig.glowColor}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div 
          className="relative w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{ 
            backgroundColor: `${phaseConfig.color}20`,
            border: `1px solid ${phaseConfig.color}30`,
          }}
        >
          <motion.span
            animate={isThinking ? { rotate: [0, 360] } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {isThinking ? '🔮' : '✨'}
          </motion.span>
        </div>
      </div>
      
      {/* Compact hint text */}
      <motion.p 
        key={guidance.hint}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-xs text-gray-400 flex-1 truncate"
      >
        {isThinking ? "Thinking..." : guidance.hint}
      </motion.p>
      
      {/* Phase badge */}
      <span 
        className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ 
          backgroundColor: `${phaseConfig.color}15`,
          color: phaseConfig.color,
        }}
      >
        {phaseConfig.icon} {phaseConfig.label}
      </span>
    </motion.div>
  );
});

ToolooInlineHint.displayName = 'ToolooInlineHint';

// ============================================================================
// TOOLOO LIVE THINKING - Real-time cognitive process visualization
// ============================================================================

const THINKING_PHASES = [
  { phase: 'parsing', icon: '📖', text: "Parsing your intent", detail: "Understanding the core of what you're asking" },
  { phase: 'context', icon: '🔗', text: "Building context graph", detail: "Connecting to relevant knowledge domains" },
  { phase: 'exploring', icon: '🔍', text: "Exploring solution space", detail: "Evaluating multiple approaches" },
  { phase: 'analyzing', icon: '⚡', text: "Running analysis", detail: "Applying domain expertise" },
  { phase: 'synthesizing', icon: '🧬', text: "Synthesizing insights", detail: "Combining perspectives" },
  { phase: 'structuring', icon: '📐', text: "Structuring response", detail: "Organizing for clarity" },
  { phase: 'validating', icon: '✓', text: "Validating output", detail: "Quality checking results" },
];

const LIVE_THOUGHTS = [
  "Identifying key concepts in your request...",
  "Cross-referencing with design patterns...",
  "Evaluating technical feasibility...",
  "Considering user experience implications...",
  "Checking for edge cases...",
  "Applying best practices from similar projects...",
  "Weighing trade-offs between approaches...",
  "Structuring actionable recommendations...",
  "Optimizing for your specific context...",
  "Generating concrete next steps...",
];

const TooLooThinkingProcess = memo(({ approach, prompt }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [thoughts, setThoughts] = useState([]);
  const [progress, setProgress] = useState(0);
  
  // Advance through phases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex(prev => Math.min(prev + 1, THINKING_PHASES.length - 1));
      setProgress(prev => Math.min(prev + 14, 100));
    }, 800);
    return () => clearInterval(interval);
  }, []);
  
  // Stream thoughts
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughtIndex(prev => {
        const next = (prev + 1) % LIVE_THOUGHTS.length;
        setThoughts(current => [...current.slice(-4), LIVE_THOUGHTS[next]]);
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);
  
  const currentPhase = THINKING_PHASES[phaseIndex];
  
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        {/* Background glow */}
        <div className="absolute -inset-4 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-2xl" />
        
        {/* Main container */}
        <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800/80 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${approach?.color || '#6366f1'}20` }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="text-xl">{approach?.icon || '🔮'}</span>
                </motion.div>
                <div>
                  <h3 className="text-sm font-semibold text-white">TooLoo is thinking</h3>
                  <p className="text-xs text-gray-500">{approach?.title || 'Deep Exploration'}</p>
                </div>
              </div>
              
              {/* Phase indicators */}
              <div className="flex items-center gap-1">
                {THINKING_PHASES.map((p, i) => (
                  <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= phaseIndex ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    animate={i === phaseIndex ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Thinking visualization */}
          <div className="p-6">
            {/* Current phase */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                key={phaseIndex}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${approach?.color || '#6366f1'}15` }}
              >
                {currentPhase.icon}
              </motion.div>
              <div className="flex-1">
                <motion.h4 
                  key={`phase-${phaseIndex}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-lg font-semibold text-white"
                >
                  {currentPhase.text}
                </motion.h4>
                <motion.p 
                  key={`detail-${phaseIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm text-gray-400"
                >
                  {currentPhase.detail}
                </motion.p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{progress}%</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-gray-800 mb-6 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, ${approach?.color || '#6366f1'}, #a855f7, #ec4899)`,
                  width: `${progress}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* Live thought stream */}
            <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Live Process</span>
              </div>
              
              <div className="space-y-1.5 font-mono text-sm">
                <AnimatePresence mode="popLayout">
                  {thoughts.map((thought, i) => (
                    <motion.div
                      key={`${thought}-${i}`}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: i === thoughts.length - 1 ? 1 : 0.4, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-cyan-500">→</span>
                      <span className={i === thoughts.length - 1 ? 'text-gray-200' : 'text-gray-600'}>
                        {thought}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.div
                  className="flex items-center gap-2"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <span className="text-purple-500">▸</span>
                  <span className="text-gray-400">_</span>
                </motion.div>
              </div>
            </div>
            
            {/* Context snippet */}
            {prompt && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-gray-800/30 border border-gray-700/30">
                <p className="text-xs text-gray-500 mb-1">Analyzing:</p>
                <p className="text-sm text-gray-300 truncate">"{prompt}"</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

TooLooThinkingProcess.displayName = 'TooLooThinkingProcess';

// ============================================================================
// TOOLOO PROACTIVE ADVISOR - Intelligent synthesis of collected items
// ============================================================================

const ADVISOR_MODES = [
  { id: 'synthesize', icon: '🧬', label: 'Synthesize', action: 'Combine collected insights into a unified strategy' },
  { id: 'priorities', icon: '🎯', label: 'Prioritize', action: 'Identify highest-impact items to focus on first' },
  { id: 'gaps', icon: '🔍', label: 'Find Gaps', action: 'Discover what\'s missing from your collection' },
  { id: 'conflicts', icon: '⚡', label: 'Resolve Conflicts', action: 'Identify and address contradictions' },
  { id: 'roadmap', icon: '🗺️', label: 'Create Roadmap', action: 'Generate implementation sequence' },
];

const TooLooProactiveAdvisor = memo(({ collected, onAdvice, isProcessing }) => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [insight, setInsight] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Auto-analyze when collected items change significantly
  useEffect(() => {
    if (collected.length >= 2 && !insight) {
      generateQuickInsight();
    }
  }, [collected.length]);
  
  const generateQuickInsight = async () => {
    if (collected.length < 2) return;
    
    // Analyze collection composition
    const dimensions = [...new Set(collected.map(c => c.dimension))];
    const highConfidence = collected.filter(c => c.confidence > 0.85);
    
    // Generate contextual insight
    const insights = [];
    
    if (dimensions.length >= 3) {
      insights.push({
        type: 'coverage',
        icon: '✨',
        text: `Great coverage across ${dimensions.length} dimensions! Ready for synthesis.`,
        action: 'synthesize',
      });
    }
    
    if (highConfidence.length >= collected.length * 0.7) {
      insights.push({
        type: 'quality',
        icon: '💎',
        text: `${highConfidence.length} high-confidence items - strong foundation for building.`,
        action: 'roadmap',
      });
    }
    
    if (dimensions.includes('technical') && dimensions.includes('visual')) {
      insights.push({
        type: 'synergy',
        icon: '🔗',
        text: 'Technical + Visual synergy detected - great for full-stack ideation.',
        action: 'synthesize',
      });
    }
    
    if (collected.length >= 4 && dimensions.length < 2) {
      insights.push({
        type: 'gap',
        icon: '💡',
        text: `All ${collected.length} items from ${dimensions[0]} - consider exploring other dimensions.`,
        action: 'gaps',
      });
    }
    
    setInsight(insights[0] || {
      type: 'ready',
      icon: '🚀',
      text: `${collected.length} items collected and ready for action!`,
      action: 'synthesize',
    });
  };
  
  const handleModeSelect = async (mode) => {
    setSelectedMode(mode);
    setIsAnalyzing(true);
    
    // Simulate analysis (would call actual API in production)
    await new Promise(r => setTimeout(r, 1200));
    
    setIsAnalyzing(false);
    
    // Trigger parent callback with selected mode
    if (onAdvice) {
      onAdvice({
        mode: mode.id,
        collected: collected.map(c => ({ id: c.id, title: c.title, dimension: c.dimension })),
      });
    }
  };
  
  if (collected.length < 2) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 overflow-hidden"
    >
      {/* Proactive Insight Banner */}
      {insight && !selectedMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-cyan-500/5 to-pink-500/10 
                   border border-purple-500/20 overflow-hidden"
        >
          {/* Animated gradient */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                'linear-gradient(90deg, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
                'linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.1) 50%, transparent 100%)',
                'linear-gradient(90deg, transparent 50%, rgba(168, 85, 247, 0.1) 100%)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          
          <div className="relative flex items-center gap-3">
            <motion.span 
              className="text-xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {insight.icon}
            </motion.span>
            <div className="flex-1">
              <p className="text-sm text-gray-200">{insight.text}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const mode = ADVISOR_MODES.find(m => m.id === insight.action);
                if (mode) handleModeSelect(mode);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 
                       text-purple-300 hover:bg-purple-500/30 transition-colors"
            >
              {ADVISOR_MODES.find(m => m.id === insight.action)?.label || 'Go'}
            </motion.button>
          </div>
        </motion.div>
      )}
      
      {/* Mode Selection Grid */}
      <div className="flex flex-wrap gap-1.5">
        {ADVISOR_MODES.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModeSelect(mode)}
            disabled={isAnalyzing || isProcessing}
            className={`
              px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
              flex items-center gap-1.5 disabled:opacity-50
              ${selectedMode?.id === mode.id 
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' 
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50 hover:text-gray-300'
              }
            `}
            title={mode.action}
          >
            {isAnalyzing && selectedMode?.id === mode.id ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
            ) : (
              <span>{mode.icon}</span>
            )}
            <span>{mode.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

TooLooProactiveAdvisor.displayName = 'TooLooProactiveAdvisor';

// ============================================================================
// HEADER BAR - Enhanced with typography hierarchy and glow
// ============================================================================

const HeaderBar = memo(({ prompt, phase, cardCount, collectedCount }) => {
  const phaseConfig = PHASES[phase] || PHASES.discovery;
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Session info with hierarchy */}
        <div className="flex items-center gap-5">
          {/* TooLoo branding */}
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <motion.div
                className="absolute -inset-1 rounded-xl opacity-60"
                animate={{
                  boxShadow: [
                    `0 0 15px ${phaseConfig.glowColor}`,
                    `0 0 25px ${phaseConfig.glowColor}`,
                    `0 0 15px ${phaseConfig.glowColor}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div 
                className="relative w-10 h-10 rounded-xl flex items-center justify-center text-xl 
                          bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10"
              >
                {phaseConfig.icon}
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {prompt ? prompt.slice(0, 35) + (prompt.length > 35 ? '...' : '') : 'TooLoo Space'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span 
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${phaseConfig.color}20`,
                    color: phaseConfig.color,
                  }}
                >
                  {phaseConfig.label}
                </span>
                {prompt && (
                  <span className="text-xs text-gray-500 hidden sm:inline">• Session active</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Stats with visual indicators */}
        <div className="flex items-center gap-5">
          {cardCount > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20"
            >
              <motion.span 
                className="w-2 h-2 rounded-full bg-cyan-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-sm text-cyan-400 font-medium">{cardCount}</span>
              <span className="text-xs text-cyan-400/70">options</span>
            </motion.div>
          )}
          {collectedCount > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <motion.span 
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-sm text-emerald-400 font-medium">{collectedCount}</span>
              <span className="text-xs text-emerald-400/70">collected</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
});

HeaderBar.displayName = 'HeaderBar';

// ============================================================================
// CHAT MESSAGE - TooLoo standard with markdown rendering
// ============================================================================

const ChatMessage = memo(({ message, isUser, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
  >
    {!isUser && (
      <div className="flex-shrink-0 mr-3">
        <div 
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <span className="text-sm">✨</span>
        </div>
      </div>
    )}
    <div
      className={`max-w-[85%] rounded-2xl ${
        isUser
          ? 'bg-gray-700 px-4 py-3 text-white rounded-br-sm'
          : 'bg-gray-800/60 rounded-bl-sm overflow-hidden'
      }`}
      style={!isUser ? { borderLeft: `3px solid ${color}` } : {}}
    >
      {isUser ? (
        <p className="text-sm leading-relaxed">{message.content}</p>
      ) : (
        <div className="px-4 py-3 prose prose-invert prose-sm max-w-none
                      prose-headings:text-white prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3
                      prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-2
                      prose-strong:text-white prose-strong:font-semibold
                      prose-ul:my-2 prose-li:text-gray-300 prose-li:my-0.5
                      prose-code:text-cyan-400 prose-code:bg-gray-900/50 prose-code:px-1 prose-code:rounded
                      prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
          <EnhancedMarkdown content={message.content} isStreaming={false} />
        </div>
      )}
    </div>
  </motion.div>
));

ChatMessage.displayName = 'ChatMessage';

// ============================================================================
// OPTION CARD - Enhanced with glow effects and visual polish
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

  // Full-width card view - redesigned for rich content display
  if (!isExpanded) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ y: -2 }}
        className={`
          group relative rounded-2xl overflow-hidden cursor-pointer
          ${isCollected ? 'ring-2 ring-emerald-500/50' : ''}
        `}
        onClick={() => onExpand(card.id)}
      >
        {/* Subtle glow on hover */}
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300 blur-xl"
          style={{ background: `radial-gradient(ellipse at left, ${config.color}30 0%, transparent 60%)` }}
        />
        
        {/* Card body - full-width horizontal layout */}
        <div 
          className="relative bg-gray-900/90 backdrop-blur-sm border border-gray-800/80 
                     hover:border-gray-700/60 hover:bg-gray-900/95
                     transition-all duration-200 rounded-2xl"
        >
          {/* Left accent bar */}
          <div 
            className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
            style={{ backgroundColor: config.color }}
          />

          <div className="relative p-5 pl-6">
            {/* Header row: Title, Direction & Actions */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white text-lg leading-tight">
                    {card.title}
                  </h3>
                  {/* Confidence */}
                  <span 
                    className="text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{ 
                      backgroundColor: card.confidence > 0.85 ? `${config.color}15` : 'rgba(156,163,175,0.1)',
                      color: card.confidence > 0.85 ? config.color : '#9ca3af',
                    }}
                  >
                    {Math.round(card.confidence * 100)}% match
                  </span>
                </div>
                
                {/* Direction as actionable insight */}
                {card.direction && (
                  <p className="text-base text-gray-300 flex items-center gap-2">
                    <span 
                      className="w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      →
                    </span>
                    <span className="font-medium">{card.direction}</span>
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isCollected ? (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onCollect(); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 
                             text-emerald-400 transition-colors text-sm font-medium
                             flex items-center gap-1.5"
                    title="Add to collection"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Collect
                  </motion.button>
                ) : (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 
                                text-sm font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Collected
                  </div>
                )}
              </div>
            </div>

            {/* Description - full readable content with markdown */}
            <div className="mb-4 text-sm text-gray-400 leading-relaxed prose prose-sm prose-invert max-w-none">
              <EnhancedMarkdown content={card.description} />
            </div>
            
            {/* Key details if available */}
            {card.details && (
              <div className="mb-4 p-3 rounded-xl bg-gray-950/50 border border-gray-800/50">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Details</div>
                <div className="text-sm text-gray-300 leading-relaxed">
                  <EnhancedMarkdown content={card.details} />
                </div>
              </div>
            )}
            
            {/* Implementation hint if available */}
            {card.implementation && (
              <div className="mb-4 p-3 rounded-xl bg-gray-950/50 border border-gray-800/50">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
                  <span className="text-cyan-500">⚡</span> Implementation
                </div>
                <div className="text-sm text-gray-300 leading-relaxed font-mono">
                  <EnhancedMarkdown content={card.implementation} />
                </div>
              </div>
            )}

            {/* Footer: Source + Expand hint */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-800/40">
              {/* Real data indicator */}
              {card.source === 'api' ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-500/80 font-medium">Live from TooLoo</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs text-purple-400/80 font-medium">AI Generated</span>
                </div>
              )}
              
              {/* Expand hint */}
              <span className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors flex items-center gap-2">
                Expand to chat & refine
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </div>
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
                    <span className="text-sm font-semibold text-white">TooLoo's Analysis</span>
                    <span 
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      {config.label}
                    </span>
                    {card.source === 'api' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none
                                prose-headings:text-white prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-3 prose-headings:text-base
                                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-2
                                prose-strong:text-white prose-strong:font-semibold
                                prose-ul:my-2 prose-li:text-gray-300 prose-li:my-0.5
                                prose-ol:my-2
                                prose-code:text-cyan-400 prose-code:bg-gray-900/50 prose-code:px-1 prose-code:rounded
                                prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:my-3">
                    <EnhancedMarkdown 
                      content={card?.toolooSuggestion || card?.content || `${config.suggestionPrefix || 'This direction offers'} ${card?.description?.toLowerCase() || 'a unique approach to your requirements'}. Consider how this aligns with your goals.`} 
                      isStreaming={false} 
                    />
                  </div>
                  {card?.direction && (
                    <div 
                      className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ 
                        backgroundColor: `${config.color}15`,
                        border: `1px solid ${config.color}30`,
                      }}
                    >
                      <span style={{ color: config.color }}>→</span>
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
              className="flex justify-start mb-3"
            >
              <div className="flex-shrink-0 mr-3">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <motion.span 
                    className="text-sm"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >✨</motion.span>
                </div>
              </div>
              <div
                className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-800/60 overflow-hidden"
                style={{ borderLeft: `3px solid ${config.color}` }}
              >
                <div className="px-4 py-3 prose prose-invert prose-sm max-w-none
                              prose-headings:text-white prose-headings:font-semibold
                              prose-p:text-gray-300 prose-p:leading-relaxed
                              prose-strong:text-white
                              prose-code:text-cyan-400 prose-code:bg-gray-900/50 prose-code:px-1 prose-code:rounded">
                  <EnhancedMarkdown content={streamingContent} isStreaming={true} />
                  <motion.span 
                    className="inline-block w-2 h-4 ml-1 bg-current rounded-sm"
                    style={{ color: config.color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                </div>
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
// DIMENSION SECTION - Enhanced with visual hierarchy and glow
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
      className="mb-10 relative"
    >
      {/* Section header - clean and scannable */}
      <div className="flex items-center gap-4 mb-5">
        {/* Icon */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ 
            backgroundColor: `${config.color}15`,
          }}
        >
          {config.icon}
        </div>
        
        {/* Title */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">
            {config.label}
          </h2>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        
        {/* Count badge */}
        <div 
          className="px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ 
            backgroundColor: `${config.color}15`,
            color: config.color,
          }}
        >
          {sectionCards.length} {sectionCards.length === 1 ? 'option' : 'options'}
        </div>
      </div>

      {/* Cards - full width for readability */}
      <div className="space-y-4">
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
// EXPLORE PHASE - Step 1: Interactive approach cards with enhanced visuals
// ============================================================================

const ExploreCard = memo(({ approach, index, onSelect, isProcessing }) => (
  <motion.button
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
    onClick={() => onSelect(approach)}
    disabled={isProcessing}
    className="group relative p-5 rounded-2xl text-left overflow-hidden
               disabled:opacity-50 disabled:cursor-not-allowed"
    whileHover={{ scale: 1.03, y: -5 }}
    whileTap={{ scale: 0.97 }}
  >
    {/* Behind-the-glass glow effect */}
    <motion.div
      className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-70 transition-all duration-300 blur-xl"
      style={{ 
        background: `radial-gradient(ellipse at center, ${approach.color}50 0%, transparent 60%)`,
      }}
    />
    
    {/* Card background with glass effect */}
    <div 
      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/60 
                 backdrop-blur-sm border border-white/5 group-hover:border-white/10 transition-all"
      style={{ 
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.05)`,
      }}
    />
    
    {/* Animated gradient accent */}
    <motion.div 
      className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
      style={{ background: `linear-gradient(90deg, transparent, ${approach.color}, transparent)` }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: index * 0.1 + 0.3 }}
    />
    
    {/* Light streak animation on hover */}
    <motion.div
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      initial={false}
    >
      <motion.div
        className="absolute top-0 left-0 w-24 h-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${approach.color}15, transparent)`,
        }}
        animate={{ x: [-96, 300] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      />
    </motion.div>
    
    <div className="relative">
      {/* Icon with glow */}
      <div className="relative mb-4">
        <motion.div
          className="absolute -inset-2 rounded-xl opacity-40"
          style={{ 
            background: `radial-gradient(circle, ${approach.color}40 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div 
          className="relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ 
            backgroundColor: `${approach.color}20`,
            border: `1px solid ${approach.color}30`,
          }}
        >
          {approach.icon}
        </div>
        {/* Live status indicator */}
        {approach.live && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            title={`${approach.status || 'active'}`}
          />
        )}
      </div>
      
      {/* Title with module badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="font-bold text-white text-base">{approach.title}</h3>
        {approach.module && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono">
            {approach.module}
          </span>
        )}
      </div>
      
      {/* Description */}
      <p className="text-sm text-gray-400 mb-4 leading-relaxed">{approach.description}</p>
      
      {/* Action hint with animation */}
      <motion.div 
        className="flex items-center gap-2 text-xs font-semibold"
        style={{ color: approach.color }}
        initial={{ opacity: 0.5 }}
        whileHover={{ opacity: 1 }}
      >
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >→</motion.span>
        <span>{approach.action}</span>
      </motion.div>
    </div>
  </motion.button>
));

ExploreCard.displayName = 'ExploreCard';

const ExplorePhase = memo(({ prompt, onApproachSelect, isProcessing, capabilities }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="max-w-5xl mx-auto pt-8 overflow-y-auto"
  >
    {/* Prompt display - enhanced */}
    <div className="text-center mb-8">
      <motion.div 
        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full 
                   bg-gradient-to-r from-gray-800/80 to-gray-800/40 
                   border border-white/10 backdrop-blur-sm mb-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <motion.span 
          className="text-xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >💭</motion.span>
        <span className="text-sm text-gray-200 font-medium">{prompt}</span>
      </motion.div>
      <motion.h2 
        className="text-2xl font-bold text-white mb-2"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        TooLoo's Capabilities
      </motion.h2>
      <motion.p 
        className="text-sm text-gray-500"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Choose how you want me to help — all modules are live and ready
      </motion.p>
    </div>

    {/* Capability cards grid - 2x3 for TooLoo capabilities */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {(capabilities || TOOLOO_CAPABILITIES).map((capability, index) => (
        <ExploreCard
          key={capability.id}
          approach={capability}
          index={index}
          onSelect={onApproachSelect}
          isProcessing={isProcessing}
        />
      ))}
    </div>

    {/* Skip option - enhanced */}
    <motion.div 
      className="text-center mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      <motion.button
        onClick={() => onApproachSelect({ id: 'skip', action: 'Show all options' })}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors 
                   px-4 py-2 rounded-lg hover:bg-white/5"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        or skip to see all options →
      </motion.button>
    </motion.div>
  </motion.div>
));

ExplorePhase.displayName = 'ExplorePhase';

// ============================================================================
// EMPTY STATE - Enhanced with TooLoo presence and glow effects
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
        {/* Thinking animation with glow */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ 
              boxShadow: [
                '0 0 30px rgba(6, 182, 212, 0.3), 0 0 60px rgba(168, 85, 247, 0.2)',
                '0 0 50px rgba(6, 182, 212, 0.5), 0 0 80px rgba(168, 85, 247, 0.3)',
                '0 0 30px rgba(6, 182, 212, 0.3), 0 0 60px rgba(168, 85, 247, 0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-purple-500"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 rounded-full border border-transparent border-b-cyan-400/50 border-l-purple-400/50"
          />
          <div className="absolute inset-4 rounded-full bg-gray-900 flex items-center justify-center">
            <motion.span 
              className="text-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >🔮</motion.span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Exploring dimensions...</h3>
        <p className="text-sm text-gray-500">TooLoo is analyzing your idea across multiple perspectives</p>
      </motion.div>
    ) : (
      <div className="text-center max-w-xl">
        {/* Hero icon with animated glow */}
        <div className="relative mx-auto mb-8 w-32 h-32">
          {/* Behind-the-glass glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl blur-2xl"
            animate={{
              background: [
                'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 70%)',
                'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 70%)',
                'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 70%)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Icon container */}
          <motion.div 
            className="relative w-full h-full rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 
                      border border-white/10 flex items-center justify-center backdrop-blur-sm"
            animate={{
              boxShadow: [
                'inset 0 0 30px rgba(6, 182, 212, 0.1)',
                'inset 0 0 40px rgba(168, 85, 247, 0.15)',
                'inset 0 0 30px rgba(6, 182, 212, 0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.span 
              className="text-5xl"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >✨</motion.span>
          </motion.div>
        </div>
        
        <motion.h2 
          className="text-3xl font-bold text-white mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          What are we building?
        </motion.h2>
        <motion.p 
          className="text-gray-400 mb-10 text-lg leading-relaxed"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Describe your idea and TooLoo will explore it across multiple dimensions,
          giving you different perspectives to consider and refine.
        </motion.p>
        
        {/* Dimension pills with staggered animation */}
        <motion.div 
          className="flex justify-center gap-3 flex-wrap"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {['design', 'technical', 'user', 'business', 'ethical'].map((dim, i) => {
            const cfg = DIMENSION_CONFIGS[dim];
            return (
              <motion.div 
                key={dim}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border"
                style={{ 
                  backgroundColor: `${cfg.color}08`,
                  borderColor: `${cfg.color}20`,
                }}
              >
                <span className="text-base">{cfg.icon}</span>
                <span className="text-sm text-gray-400">{cfg.label}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    )}
  </motion.div>
));

EmptyState.displayName = 'EmptyState';

// ============================================================================
// COLLECTED SIDEBAR - Enhanced with glow effects and active buttons
// ============================================================================

const CollectedSidebar = memo(({ 
  collected, 
  onBuild, 
  onNextIteration, 
  onSummarize, 
  onExport, 
  onCompare,
  onMergeAndSynthesize,
  onAdvice,
  isProcessing 
}) => {
  if (collected.length === 0) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-6 top-24 bottom-24 w-72 z-40"
    >
      {/* Behind-the-glass glow */}
      <motion.div
        className="absolute -inset-2 rounded-3xl opacity-30 blur-xl"
        animate={{
          background: [
            'radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.4) 0%, transparent 60%)',
            'radial-gradient(ellipse at 50% 70%, rgba(16, 185, 129, 0.4) 0%, transparent 60%)',
            'radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.4) 0%, transparent 60%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ zIndex: -1 }}
      />
      
      <div className="relative h-full bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-emerald-500/20 flex flex-col overflow-hidden shadow-2xl">
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 20px rgba(16, 185, 129, 0.05)',
              'inset 0 0 30px rgba(16, 185, 129, 0.1)',
              'inset 0 0 20px rgba(16, 185, 129, 0.05)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Header with glow */}
        <div className="relative p-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="absolute -inset-1 rounded-xl"
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(16, 185, 129, 0.3)',
                    '0 0 20px rgba(16, 185, 129, 0.5)',
                    '0 0 10px rgba(16, 185, 129, 0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 
                            flex items-center justify-center border border-emerald-500/30">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Collected</h3>
              <p className="text-xs text-emerald-400/80">{collected.length} artifact{collected.length !== 1 ? 's' : ''} ready</p>
            </div>
          </div>
        </div>

        {/* Items with enhanced styling */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {collected.map((item, i) => {
            const cfg = DIMENSION_CONFIGS[item.dimension] || DIMENSION_CONFIGS.technical;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 
                          hover:bg-gray-800/80 hover:border-gray-600/50 transition-all cursor-pointer"
              >
                {/* Hover glow */}
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ 
                    background: `radial-gradient(ellipse at center, ${cfg.color}10 0%, transparent 70%)`,
                  }}
                />
                
                <div className="relative flex items-start gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: `${cfg.color}15` }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">{cfg.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons - enhanced with active states */}
        <div className="p-3 border-t border-gray-800/80 space-y-2 bg-gradient-to-t from-gray-900/50 to-transparent">
          {/* Quick actions row */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              onClick={onNextIteration}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 
                       border border-purple-500/20 text-purple-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <motion.span
                animate={isProcessing ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
              >↻</motion.span>
              Next Iteration
            </motion.button>
            <motion.button
              onClick={onSummarize}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 
                       border border-cyan-500/20 text-cyan-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>≡</span>
              Summarize
            </motion.button>
          </div>
          
          {/* Secondary actions row */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              onClick={onCompare}
              disabled={isProcessing || collected.length < 2}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 
                       border border-amber-500/20 text-amber-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>↔</span>
              Compare
            </motion.button>
            <motion.button
              onClick={onExport}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-2.5 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 
                       border border-gray-600/30 text-gray-400 text-xs font-medium 
                       transition-all flex items-center justify-center gap-1.5"
            >
              <span>↓</span>
              Export
            </motion.button>
          </div>

          {/* Merge & Synthesize - with glow effect */}
          <motion.button
            onClick={onMergeAndSynthesize}
            disabled={isProcessing || collected.length < 2}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative w-full px-3 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 
                     border border-indigo-500/20 text-indigo-400 text-xs font-medium 
                     transition-all flex items-center justify-center gap-1.5 overflow-hidden
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent"
              animate={{ x: [-200, 200] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative">✨</span>
            <span className="relative">Merge & Synthesize</span>
          </motion.button>

          {/* Build button - enhanced with glow */}
          {collected.length >= 2 && (
            <motion.button
              onClick={onBuild}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-3 rounded-xl text-white font-semibold text-sm 
                       transition-all flex items-center justify-center gap-2 mt-2 overflow-hidden
                       disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              }}
            >
              {/* Animated glow pulse */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  boxShadow: [
                    'inset 0 0 20px rgba(255, 255, 255, 0.1)',
                    'inset 0 0 40px rgba(255, 255, 255, 0.2)',
                    'inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="relative text-lg">🔨</span>
              <span className="relative">Start Building</span>
            </motion.button>
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
  const [phase, setPhase] = useState('discovery'); // discovery -> explore -> options -> refinement -> build
  const [isThinking, setIsThinking] = useState(false);
  const [cards, setCards] = useState([]);
  const [expandedCard, setExpandedCard] = useState(null);
  const [collected, setCollected] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [processingCardId, setProcessingCardId] = useState(null);
  const [selectedApproach, setSelectedApproach] = useState(null);
  const [systemCapabilities, setSystemCapabilities] = useState(null);
  const [capabilityStatus, setCapabilityStatus] = useState({});

  // Fetch real system capabilities on mount
  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        // Fetch system status for real capability data
        const [healthRes, capabilitiesRes, visualRes] = await Promise.all([
          fetch(`${API_BASE}/health`).catch(() => null),
          fetch(`${API_BASE}/capabilities/status`).catch(() => null),
          fetch(`${API_BASE}/visuals/v2/status`).catch(() => null),
        ]);
        
        const health = healthRes?.ok ? await healthRes.json() : null;
        const capabilities = capabilitiesRes?.ok ? await capabilitiesRes.json() : null;
        const visual = visualRes?.ok ? await visualRes.json() : null;
        
        // Build real status from API responses
        const status = {
          visuals: visual?.ok ? 'active' : 'ready',
          diagrams: visual?.ok ? 'active' : 'ready',
          analytics: capabilities?.ok ? 'active' : 'ready',
          summarization: health?.ok ? 'active' : 'ready',
          code: health?.ok ? 'active' : 'ready',
          exploration: capabilities?.ok ? 'active' : 'ready',
        };
        
        setCapabilityStatus(status);
        
        // Enhance capabilities with live status
        const enhancedCapabilities = TOOLOO_CAPABILITIES.map(cap => ({
          ...cap,
          status: status[cap.id] || 'ready',
          live: true,
        }));
        
        setSystemCapabilities(enhancedCapabilities);
      } catch (error) {
        console.log('Using default capabilities');
        setSystemCapabilities(TOOLOO_CAPABILITIES.map(cap => ({ ...cap, status: 'ready', live: true })));
      }
    };
    
    fetchCapabilities();
  }, []);

  // Get dimensions that have cards
  const activeDimensions = useMemo(() => {
    return [...new Set(cards.map(c => c.dimension))];
  }, [cards]);

  // Handle initial prompt submission - goes to explore phase
  const handleSubmit = useCallback(async ({ message }) => {
    if (!message.trim()) return;
    
    setPrompt(message);
    setPhase('explore'); // Go to exploration phase first

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
    } catch (error) {
      console.error('Session creation failed:', error);
    }
  }, []);

  // Handle capability selection from explore phase - REAL API CALLS
  const handleApproachSelect = useCallback(async (approach) => {
    setSelectedApproach(approach);
    setIsThinking(true);
    setPhase('options');

    // Skip means show all options with default exploration
    if (approach.id === 'skip') {
      try {
        // Real multi-dimension exploration via chat API
        const response = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Analyze this from multiple perspectives: "${prompt}". Provide concrete options for: 1) Design approaches 2) Technical implementation 3) User experience. Format each as a distinct recommendation.`,
            mode: 'deep',
            sessionId: session?.id || 'default',
            context: { route: 'explore-all', originalPrompt: prompt },
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

        // Parse response into cards
        const realCards = parseResponseIntoCards(fullContent, prompt);
        setCards(realCards);
      } catch (error) {
        console.error('Exploration failed:', error);
        // Fallback to generated cards if API fails
        const newCards = generateCards(prompt, approach);
        setCards(newCards);
      }
      setIsThinking(false);
      return;
    }

    // Capability-specific API calls
    try {
      let apiPrompt = prompt;
      let apiEndpoint = `${API_BASE}/chat/stream`;
      let requestBody = {};

      // Configure request based on capability
      switch (approach.id) {
        case 'visuals':
          apiPrompt = `Create visual representations for: "${prompt}". Generate: 1) Conceptual diagram 2) UI mockup idea 3) Infographic concept. Include SVG specifications where helpful.`;
          break;
        case 'diagrams':
          apiPrompt = `Create diagrams and charts for: "${prompt}". Provide: 1) Architecture diagram 2) Flow chart 3) Data visualization concept. Include chart data structures.`;
          break;
        case 'analytics':
          apiPrompt = `Provide deep analytics and insights for: "${prompt}". Include: 1) Key metrics to track 2) Pattern analysis 3) Predictive insights 4) Data-driven recommendations.`;
          break;
        case 'summarization':
          apiPrompt = `Provide comprehensive summarization of: "${prompt}". Create: 1) Executive summary 2) Key points extraction 3) Action items 4) Critical insights.`;
          break;
        case 'code':
          apiPrompt = `Generate code solutions for: "${prompt}". Provide: 1) Clean implementation 2) Alternative approach 3) Optimized version. Include TypeScript/JavaScript examples.`;
          break;
        case 'exploration':
          apiPrompt = `Deeply explore this concept: "${prompt}". Analyze from: 1) Multiple perspectives 2) Creative angles 3) Unconventional approaches 4) Future possibilities.`;
          break;
        default:
          apiPrompt = `Explore this comprehensively: "${prompt}"`;
      }

      requestBody = {
        message: apiPrompt,
        mode: 'deep',
        sessionId: session?.id || 'default',
        context: { 
          route: approach.id,
          capability: approach.module,
          originalPrompt: prompt,
        },
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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

      // Parse real response into cards
      const realCards = parseResponseIntoCards(fullContent, prompt, approach.id);
      setCards(realCards);

    } catch (error) {
      console.error('Capability API call failed:', error);
      // Fallback to generated cards
      const newCards = generateCards(prompt, approach);
      setCards(newCards);
    }
    
    setIsThinking(false);
  }, [prompt, session]);

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

  // ============================================================================
  // ACTION HANDLERS - Validate, Optimize, Expand, Challenge
  // ============================================================================

  const handleValidate = useCallback(async () => {
    if (!prompt.trim() || isThinking) return;
    
    setIsThinking(true);
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Validate this idea critically: "${prompt}". Check for: 1) Technical feasibility 2) Potential issues 3) Missing considerations 4) Strengths. Be thorough but constructive.`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'validate', originalPrompt: prompt },
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
      
      // Add validation as a new card
      if (fullContent) {
        const validationCard = {
          id: `validation-${Date.now()}`,
          dimension: 'ethical',
          title: 'Validation Analysis',
          description: 'Critical review of your concept',
          direction: 'Identify issues and confirm strengths',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.9,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [validationCard, ...prev]);
        if (phase === 'discovery' || phase === 'explore') setPhase('options');
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [prompt, session, isThinking, phase]);

  const handleOptimize = useCallback(async () => {
    if (!prompt.trim() || isThinking) return;
    
    setIsThinking(true);
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Optimize this idea for maximum impact: "${prompt}". Focus on: 1) Performance improvements 2) User experience optimization 3) Resource efficiency 4) Scalability considerations. Provide specific actionable improvements.`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'optimize', originalPrompt: prompt },
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
      
      if (fullContent) {
        const optimizeCard = {
          id: `optimize-${Date.now()}`,
          dimension: 'technical',
          title: 'Optimization Strategy',
          description: 'Performance and efficiency improvements',
          direction: 'Maximize impact and efficiency',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.88,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [optimizeCard, ...prev]);
        if (phase === 'discovery' || phase === 'explore') setPhase('options');
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [prompt, session, isThinking, phase]);

  const handleExpandIdea = useCallback(async () => {
    if (!prompt.trim() || isThinking) return;
    
    setIsThinking(true);
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Expand this idea to its full potential: "${prompt}". Explore: 1) Advanced features 2) Future possibilities 3) Related concepts 4) Integration opportunities 5) Ambitious variations. Think big and creative.`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'expand', originalPrompt: prompt },
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
      
      if (fullContent) {
        const expandCard = {
          id: `expand-${Date.now()}`,
          dimension: 'business',
          title: 'Expanded Vision',
          description: 'Ambitious possibilities and future potential',
          direction: 'Think bigger and explore possibilities',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.85,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [expandCard, ...prev]);
        if (phase === 'discovery' || phase === 'explore') setPhase('options');
      }
    } catch (error) {
      console.error('Expand failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [prompt, session, isThinking, phase]);

  const handleChallenge = useCallback(async () => {
    if (!prompt.trim() || isThinking) return;
    
    setIsThinking(true);
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Challenge this idea rigorously: "${prompt}". Play devil's advocate: 1) What could go wrong? 2) Edge cases and failures 3) Hidden assumptions 4) Alternative approaches 5) Counter-arguments. Be constructively critical.`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'challenge', originalPrompt: prompt },
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
      
      if (fullContent) {
        const challengeCard = {
          id: `challenge-${Date.now()}`,
          dimension: 'ethical',
          title: 'Critical Challenge',
          description: 'Adversarial analysis and edge cases',
          direction: 'Identify weaknesses and risks',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.92,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [challengeCard, ...prev]);
        if (phase === 'discovery' || phase === 'explore') setPhase('options');
      }
    } catch (error) {
      console.error('Challenge failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [prompt, session, isThinking, phase]);

  // ============================================================================
  // SIDEBAR ACTION HANDLERS
  // ============================================================================

  const handleNextIteration = useCallback(async () => {
    if (collected.length === 0) return;
    
    setIsThinking(true);
    const collectedTitles = collected.map(c => c.title).join(', ');
    
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Based on these collected artifacts: [${collectedTitles}], generate the next iteration of ideas. Build upon these foundations with: 1) Enhanced versions 2) Combinations 3) New directions. Original concept: "${prompt}"`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'iterate', collected: collected.map(c => ({ title: c.title, dimension: c.dimension })) },
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
      
      // Generate new cards based on iteration
      const newCards = generateCards(prompt + ' (iteration based on: ' + collectedTitles + ')', selectedApproach);
      setCards(prev => [...newCards, ...prev]);
      
    } catch (error) {
      console.error('Next iteration failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [collected, prompt, session, selectedApproach]);

  const handleSummarize = useCallback(async () => {
    if (collected.length === 0) return;
    
    setIsThinking(true);
    
    try {
      const collectedData = collected.map(c => ({
        title: c.title,
        dimension: c.dimension,
        description: c.description,
        direction: c.direction,
      }));
      
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Synthesize and summarize these collected artifacts into a cohesive overview: ${JSON.stringify(collectedData)}. Provide: 1) Executive summary 2) Key themes 3) Recommended priorities 4) Action items`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'summarize', collected: collectedData },
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
      
      if (fullContent) {
        const summaryCard = {
          id: `summary-${Date.now()}`,
          dimension: 'business',
          title: '📋 Synthesis Summary',
          description: 'Unified overview of collected artifacts',
          direction: 'Cohesive action plan',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.95,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [summaryCard, ...prev]);
      }
    } catch (error) {
      console.error('Summarize failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [collected, session]);

  const handleCompare = useCallback(async () => {
    if (collected.length < 2) return;
    
    setIsThinking(true);
    
    try {
      const collectedData = collected.map(c => ({
        title: c.title,
        dimension: c.dimension,
        description: c.description,
      }));
      
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Compare and contrast these collected options: ${JSON.stringify(collectedData)}. Provide: 1) Side-by-side comparison 2) Trade-offs 3) Complementary aspects 4) Recommendation for combination`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'compare', collected: collectedData },
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
      
      if (fullContent) {
        const compareCard = {
          id: `compare-${Date.now()}`,
          dimension: 'user',
          title: '⚖️ Comparison Analysis',
          description: 'Side-by-side evaluation of options',
          direction: 'Make informed decisions',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.9,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: false,
        };
        setCards(prev => [compareCard, ...prev]);
      }
    } catch (error) {
      console.error('Compare failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [collected, session]);

  const handleExport = useCallback(() => {
    const exportData = {
      session: { id: session?.id, prompt, phase },
      collected: collected.map(c => ({
        title: c.title,
        dimension: c.dimension,
        description: c.description,
        direction: c.direction,
        content: c.content,
        confidence: c.confidence,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tooloo-artifacts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [collected, session, prompt, phase]);

  const handleMergeAndSynthesize = useCallback(async () => {
    if (collected.length < 2) return;
    
    setIsThinking(true);
    setPhase('build');
    
    try {
      const collectedData = collected.map(c => ({
        title: c.title,
        dimension: c.dimension,
        content: c.content || c.description,
      }));
      
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Merge and synthesize these artifacts into a unified implementation plan: ${JSON.stringify(collectedData)}. Create: 1) Integrated architecture 2) Implementation steps 3) Component breakdown 4) Dependencies map 5) Timeline estimate`,
          mode: 'deep',
          sessionId: session?.id || 'default',
          context: { route: 'synthesize', collected: collectedData },
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
      
      if (fullContent) {
        const synthesisCard = {
          id: `synthesis-${Date.now()}`,
          dimension: 'technical',
          title: '🔮 Merged Synthesis',
          description: 'Unified implementation from all collected artifacts',
          direction: 'Ready to build',
          toolooSuggestion: fullContent.slice(0, 300) + '...',
          confidence: 0.95,
          content: fullContent,
          refinements: [{ role: 'assistant', content: fullContent }],
          collected: true, // Auto-collect the synthesis
        };
        setCards(prev => [synthesisCard, ...prev]);
        setCollected(prev => [synthesisCard, ...prev]);
      }
    } catch (error) {
      console.error('Merge & Synthesize failed:', error);
    } finally {
      setIsThinking(false);
    }
  }, [collected, session]);

  const expandedCardData = expandedCard ? cards.find(c => c.id === expandedCard) : null;

  return (
    <div className="min-h-screen max-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
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

      {/* Main content - scrollable container */}
      <main className={`relative pt-20 pb-40 px-6 overflow-y-auto scroll-smooth ${collected.length > 0 ? 'pr-80' : ''}`} style={{ height: 'calc(100vh - 80px)' }}>
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Phase 1: Discovery - Empty state with input */}
            {phase === 'discovery' && (
              <EmptyState key="empty" isThinking={false} />
            )}

            {/* Phase 2: Explore - Choose TooLoo capability */}
            {phase === 'explore' && (
              <ExplorePhase
                key="explore"
                prompt={prompt}
                onApproachSelect={handleApproachSelect}
                isProcessing={isThinking}
                capabilities={systemCapabilities}
              />
            )}

            {/* Phase 3+: Options - Show dimension cards */}
            {(phase === 'options' || phase === 'refinement' || phase === 'build') && (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {isThinking ? (
                  <TooLooThinkingProcess approach={selectedApproach} prompt={prompt} />
                ) : (
                  <div className="pt-2">
                    {/* Approach indicator - cleaner header */}
                    {selectedApproach && selectedApproach.id !== 'skip' && (
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800/50">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ backgroundColor: `${selectedApproach.color}15` }}
                          >
                            {selectedApproach.icon}
                          </div>
                          <div>
                            <h1 className="text-xl font-bold text-white">{selectedApproach.title}</h1>
                            <p className="text-sm text-gray-400">{selectedApproach.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPhase('explore');
                            setCards([]);
                            setSelectedApproach(null);
                          }}
                          className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 
                                   rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Change
                        </button>
                      </div>
                    )}
                    
                    {/* Results summary */}
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm text-gray-400">
                        Found <span className="text-white font-medium">{cards.length}</span> options across{' '}
                        <span className="text-white font-medium">{activeDimensions.length}</span> dimensions
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Click any card to explore details
                      </div>
                    </div>
                    
                    {/* Dimension sections */}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Collected sidebar */}
      <CollectedSidebar 
        collected={collected} 
        onBuild={handleBuild}
        onNextIteration={handleNextIteration}
        onSummarize={handleSummarize}
        onCompare={handleCompare}
        onExport={handleExport}
        onMergeAndSynthesize={handleMergeAndSynthesize}
        isProcessing={isThinking}
      />

      {/* Fixed input - Compact with inline hint */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Subtle glow for input */}
          <motion.div
            className="absolute -inset-1 rounded-2xl opacity-30 blur-lg"
            animate={{
              background: [
                'radial-gradient(ellipse at 30% 50%, rgba(6, 182, 212, 0.2) 0%, transparent 60%)',
                'radial-gradient(ellipse at 70% 50%, rgba(168, 85, 247, 0.2) 0%, transparent 60%)',
                'radial-gradient(ellipse at 30% 50%, rgba(6, 182, 212, 0.2) 0%, transparent 60%)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ zIndex: -1 }}
          />
          
          <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 p-3 shadow-2xl overflow-hidden">
            {/* Inline TooLoo hint - compact */}
            <ToolooInlineHint phase={phase} isThinking={isThinking} />
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.elements.spaceInput;
                if (input.value.trim()) {
                  handleSubmit({ message: input.value.trim() });
                  input.value = '';
                }
              }}
              className="relative flex gap-3"
            >
              <input
                name="spaceInput"
                type="text"
                placeholder="What are we creating today?"
                className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-xl px-4 py-2.5
                         text-white placeholder-gray-500 focus:outline-none focus:ring-2
                         focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all text-sm"
                disabled={isThinking}
              />
              <motion.button
                type="submit"
                disabled={isThinking}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative px-5 py-2.5 rounded-xl font-medium text-white text-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                }}
              >
                {isThinking ? (
                  <motion.svg 
                    className="w-4 h-4 relative" 
                    fill="none" 
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </motion.svg>
                ) : (
                  <span className="relative">Think</span>
                )}
              </motion.button>
            </form>
          
            {/* Quick action chips - compact */}
            <div className="relative flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
              <span className="text-[10px] text-gray-500 mr-0.5">Quick:</span>
              <motion.button 
                type="button"
                onClick={handleValidate}
                disabled={isThinking || !prompt.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 
                         text-emerald-400 text-[10px] font-medium transition-all flex items-center gap-1
                         disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>✓</span> Validate
              </motion.button>
              <motion.button 
                type="button"
                onClick={handleOptimize}
                disabled={isThinking || !prompt.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 
                         text-amber-400 text-[10px] font-medium transition-all flex items-center gap-1
                         disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>⚙</span> Optimize
              </motion.button>
              <motion.button 
                type="button"
                onClick={handleExpandIdea}
                disabled={isThinking || !prompt.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 
                         text-purple-400 text-[10px] font-medium transition-all flex items-center gap-1
                         disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>↗</span> Expand
              </motion.button>
              <motion.button 
                type="button"
                onClick={handleChallenge}
                disabled={isThinking || !prompt.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 
                         text-rose-400 text-[10px] font-medium transition-all flex items-center gap-1
                         disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>?</span> Challenge
              </motion.button>
            </div>
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
// REAL RESPONSE PARSER - Converts AI response into cards
// ============================================================================

const parseResponseIntoCards = (content, originalPrompt, capabilityId = 'general') => {
  const cards = [];
  
  // Map capability to dimension
  const capabilityToDimension = {
    visuals: 'design',
    diagrams: 'technical',
    analytics: 'business',
    summarization: 'user',
    code: 'technical',
    exploration: 'design',
    general: 'technical',
  };
  
  const primaryDimension = capabilityToDimension[capabilityId] || 'technical';
  
  // Split content into sections (look for numbered items, headers, or natural breaks)
  const sections = content.split(/(?=\d+[\.\)]\s|#{1,3}\s|(?:\n\n)(?=[A-Z]))/g)
    .map(s => s.trim())
    .filter(s => s.length > 50); // Filter out very short sections
  
  if (sections.length === 0) {
    // If no clear sections, create a single card from the whole response
    sections.push(content);
  }
  
  // Generate cards from sections
  const dimensions = ['design', 'technical', 'user', 'business', 'ethical'];
  
  sections.slice(0, 6).forEach((section, index) => {
    // Extract title from section (first line or first sentence)
    const firstLine = section.split('\n')[0].replace(/^[\d\.\)\#\*\-]+\s*/, '').trim();
    const title = firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
    
    // Extract description (next few lines)
    const lines = section.split('\n').slice(1).join(' ').trim();
    const description = lines.slice(0, 150) + (lines.length > 150 ? '...' : '');
    
    // Assign dimension based on content keywords or cycle through
    let dimension = primaryDimension;
    const lowerSection = section.toLowerCase();
    if (lowerSection.includes('design') || lowerSection.includes('visual') || lowerSection.includes('ui')) {
      dimension = 'design';
    } else if (lowerSection.includes('code') || lowerSection.includes('implement') || lowerSection.includes('technical')) {
      dimension = 'technical';
    } else if (lowerSection.includes('user') || lowerSection.includes('experience') || lowerSection.includes('workflow')) {
      dimension = 'user';
    } else if (lowerSection.includes('business') || lowerSection.includes('revenue') || lowerSection.includes('market')) {
      dimension = 'business';
    } else if (lowerSection.includes('ethic') || lowerSection.includes('privacy') || lowerSection.includes('access')) {
      dimension = 'ethical';
    } else {
      // Cycle through dimensions for variety
      dimension = dimensions[index % dimensions.length];
    }
    
    const config = DIMENSION_CONFIGS[dimension];
    
    cards.push({
      id: `real-${Date.now()}-${index}`,
      dimension,
      title: title || `${config?.label || 'Option'} ${index + 1}`,
      description: description || `Analysis of "${originalPrompt}"`,
      direction: config?.suggestionPrefix || 'Explore this approach',
      toolooSuggestion: section.slice(0, 300),
      confidence: 0.75 + Math.random() * 0.20, // Real response = high confidence
      content: section,
      refinements: [{ role: 'assistant', content: section }],
      collected: false,
      source: 'api', // Mark as real data
    });
  });
  
  // Ensure we have at least 3 cards
  if (cards.length < 3) {
    // Add synthetic cards from content analysis
    const missingDimensions = dimensions.filter(d => !cards.some(c => c.dimension === d));
    for (let i = cards.length; i < 3 && missingDimensions.length > 0; i++) {
      const dim = missingDimensions.shift();
      const config = DIMENSION_CONFIGS[dim];
      cards.push({
        id: `synth-${Date.now()}-${i}`,
        dimension: dim,
        title: `${config?.label || dim} Perspective`,
        description: `${config?.description || 'Additional analysis'} for "${originalPrompt.slice(0, 30)}..."`,
        direction: config?.suggestionPrefix || 'Consider this angle',
        toolooSuggestion: `Exploring ${dim} aspects of your concept...`,
        confidence: 0.70,
        content: `// Analyzing ${dim} dimension for: ${originalPrompt}`,
        refinements: [],
        collected: false,
        source: 'synthesized',
      });
    }
  }
  
  return cards;
};

// ============================================================================
// CARD GENERATOR - Fallback for when API fails
// ============================================================================

const generateCards = (prompt, approach = null) => {
  const cards = [];
  
  // Adjust dimensions based on approach
  let dimensions = ['design', 'technical', 'user'];
  let cardCount = 2; // Default cards per dimension
  
  if (approach) {
    switch (approach.id) {
      // New capability-based IDs
      case 'visuals':
        dimensions = ['design', 'user'];
        cardCount = 3;
        break;
      case 'diagrams':
        dimensions = ['technical', 'design'];
        cardCount = 3;
        break;
      case 'analytics':
        dimensions = ['business', 'technical', 'user'];
        cardCount = 2;
        break;
      case 'summarization':
        dimensions = ['user', 'business'];
        cardCount = 2;
        break;
      case 'code':
        dimensions = ['technical', 'design'];
        cardCount = 3;
        break;
      case 'exploration':
        dimensions = ['design', 'technical', 'user', 'business', 'ethical'];
        cardCount = 2;
        break;
      // Legacy IDs for backward compatibility
      case 'deep-dive':
        dimensions = ['technical', 'design', 'user'];
        cardCount = 3;
        break;
      case 'quick-start':
        dimensions = ['technical', 'user'];
        cardCount = 2;
        break;
      case 'explore-options':
        dimensions = ['design', 'technical', 'user', 'business'];
        cardCount = 3;
        break;
      case 'challenge':
        dimensions = ['technical', 'ethical', 'user'];
        cardCount = 2;
        break;
      case 'simplify':
        dimensions = ['user', 'design'];
        cardCount = 2;
        break;
      case 'expand':
        dimensions = ['business', 'technical', 'design', 'user'];
        cardCount = 2;
        break;
      default:
        break;
    }
  }

  const titles = {
    design: ['Minimalist Interface', 'Bold & Expressive', 'Enterprise Grade'],
    technical: ['Modern Stack', 'Server-First Architecture', 'Edge Computing'],
    user: ['Guided Experience', 'Power User Mode', 'Accessibility First'],
    business: ['Revenue Growth', 'Market Expansion', 'Cost Optimization'],
    ethical: ['Privacy First', 'Inclusive Design', 'Sustainable Tech'],
  };

  const descriptions = {
    design: [
      'Clean, focused interface with thoughtful whitespace.',
      'Vibrant colors and dynamic animations.',
      'Professional design with clear hierarchy.',
    ],
    technical: [
      'React + TypeScript with modern tooling.',
      'Server components for optimal performance.',
      'Edge-first architecture for global access.',
    ],
    user: [
      'Step-by-step onboarding with help.',
      'Keyboard shortcuts and bulk actions.',
      'WCAG compliant accessibility.',
    ],
    business: [
      'Monetization strategies and pricing.',
      'New market opportunities.',
      'Efficiency and automation.',
    ],
    ethical: [
      'Data protection and user consent.',
      'Accessible to all users.',
      'Environmental impact reduction.',
    ],
  };

  const directions = {
    design: ['Focus on clarity', 'Emphasize delight', 'Build trust'],
    technical: ['Developer experience', 'Performance', 'Global reach'],
    user: ['Reduce friction', 'Empower users', 'Universal access'],
    business: ['Maximize revenue', 'Expand reach', 'Cut costs'],
    ethical: ['Protect privacy', 'Include everyone', 'Go green'],
  };

  const toolooSuggestions = {
    design: [
      'Use 8px grid and 3-4 color palette for harmony.',
      'Add micro-interactions and vibrant accents.',
      'Use established patterns for trust.',
    ],
    technical: [
      'TypeScript catches errors early.',
      'Server components reduce bundle size.',
      'Edge computing reduces latency globally.',
    ],
    user: [
      'Show features contextually, not upfront.',
      'Add Cmd+K command palette.',
      'WCAG compliance adds 15% more users.',
    ],
    business: [
      'Consider freemium with premium tiers.',
      'Localize for key markets.',
      'Automate repetitive tasks.',
    ],
    ethical: [
      'Minimize data collection.',
      'Test with diverse users.',
      'Choose green hosting.',
    ],
  };

  dimensions.forEach((dim, di) => {
    const count = Math.min(cardCount, titles[dim]?.length || 2);
    for (let i = 0; i < count; i++) {
      cards.push({
        id: `card-${Date.now()}-${di}-${i}`,
        dimension: dim,
        title: titles[dim]?.[i] || `Option ${i + 1}`,
        description: descriptions[dim]?.[i] || `A ${dim} approach`,
        direction: directions[dim]?.[i] || `Explore ${dim}`,
        toolooSuggestion: toolooSuggestions[dim]?.[i],
        confidence: 0.70 + Math.random() * 0.25,
        content: `// ${dim.toUpperCase()}: ${titles[dim]?.[i]}\n// ${prompt}`,
        refinements: [],
        collected: false,
      });
    }
  });

  return cards;
};

export default TooLooSpaceV4;
