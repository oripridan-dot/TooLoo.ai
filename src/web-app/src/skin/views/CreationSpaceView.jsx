// @version 3.3.39
// TooLoo.ai LIQUID CREATION SPACE - Multi-Artifact Visual Canvas
// ═══════════════════════════════════════════════════════════════════════════
// v3.3.39 - FREE MOVEMENT: Drag artifacts anywhere with momentum & persistence
// Generates MULTIPLE visual artifacts per prompt with intelligent follow-ups
// Each selection influences the next set of artifacts - contextual creativity
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useSkinEmotion } from '../hooks';
import { PointerAurora, LiquidSurface, EmotionalOrbs } from '../effects';
import { TooLooAvatar, SVGRenderer } from '../chat';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE = '/api/v1/chat';

// ============================================================================
// ARTIFACT TYPES - Different visual manifestations
// ============================================================================

const ARTIFACT_TYPES = {
  diagram: { icon: '📊', label: 'Diagram', color: 'cyan' },
  illustration: { icon: '🎨', label: 'Illustration', color: 'purple' },
  infographic: { icon: '📈', label: 'Infographic', color: 'emerald' },
  mindmap: { icon: '🧠', label: 'Mind Map', color: 'pink' },
  flowchart: { icon: '🔀', label: 'Flowchart', color: 'amber' },
  timeline: { icon: '📅', label: 'Timeline', color: 'blue' },
  comparison: { icon: '⚖️', label: 'Comparison', color: 'rose' },
  concept: { icon: '💡', label: 'Concept', color: 'yellow' },
};

// ============================================================================
// GENERATE ARTIFACT VARIATIONS - Creates multiple visual options
// ============================================================================

const generateArtifactVariations = (prompt, context = []) => {
  // Analyze prompt to determine best artifact types
  const promptLower = prompt.toLowerCase();
  const variations = [];
  
  // Keywords to artifact type mapping
  const keywords = {
    diagram: ['structure', 'architecture', 'system', 'components', 'relationship'],
    illustration: ['draw', 'visualize', 'picture', 'image', 'scene', 'creative'],
    infographic: ['data', 'statistics', 'numbers', 'facts', 'info'],
    mindmap: ['ideas', 'brainstorm', 'concepts', 'thoughts', 'explore'],
    flowchart: ['process', 'steps', 'flow', 'how to', 'procedure', 'algorithm'],
    timeline: ['history', 'evolution', 'timeline', 'events', 'progress', 'phases'],
    comparison: ['compare', 'versus', 'difference', 'vs', 'pros cons', 'between'],
    concept: ['explain', 'what is', 'concept', 'understand', 'theory'],
  };
  
  // Score each type based on prompt
  const scores = {};
  Object.entries(keywords).forEach(([type, words]) => {
    scores[type] = words.filter(w => promptLower.includes(w)).length;
  });
  
  // Get top 4 types (or random if no matches)
  let topTypes = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type]) => type);
  
  // If no strong matches, pick diverse defaults
  if (topTypes.every(t => scores[t] === 0)) {
    topTypes = ['concept', 'diagram', 'mindmap', 'illustration'];
  }
  
  // Consider context from previous selections
  if (context.length > 0) {
    const lastSelection = context[context.length - 1];
    // Suggest complementary types
    const complements = {
      diagram: ['flowchart', 'mindmap'],
      illustration: ['concept', 'infographic'],
      infographic: ['comparison', 'timeline'],
      mindmap: ['diagram', 'concept'],
      flowchart: ['timeline', 'diagram'],
      timeline: ['infographic', 'comparison'],
      comparison: ['infographic', 'diagram'],
      concept: ['illustration', 'mindmap'],
    };
    const suggested = complements[lastSelection.type] || [];
    suggested.forEach(s => {
      if (!topTypes.includes(s)) {
        topTypes[topTypes.length - 1] = s;
      }
    });
  }
  
  // Generate variations
  topTypes.forEach((type, index) => {
    const config = ARTIFACT_TYPES[type];
    variations.push({
      id: `${Date.now()}-${index}`,
      type,
      ...config,
      title: generateArtifactTitle(prompt, type),
      description: generateArtifactDescription(prompt, type),
      preview: generateArtifactPreview(type),
    });
  });
  
  return variations;
};

// Generate contextual title
const generateArtifactTitle = (prompt, type) => {
  const templates = {
    diagram: ['System Overview', 'Architecture View', 'Component Structure', 'Relationship Map'],
    illustration: ['Visual Story', 'Creative Vision', 'Artistic Interpretation', 'Scene Render'],
    infographic: ['Data Snapshot', 'Key Insights', 'Facts at a Glance', 'Numbers That Matter'],
    mindmap: ['Idea Expansion', 'Concept Web', 'Thought Network', 'Brain Dump'],
    flowchart: ['Process Flow', 'Step-by-Step', 'Decision Tree', 'Workflow Guide'],
    timeline: ['Journey Through Time', 'Evolution Path', 'Milestone Map', 'Progress Tracker'],
    comparison: ['Side by Side', 'The Breakdown', 'Pros & Cons', 'Feature Matrix'],
    concept: ['Core Idea', 'Explained Simply', 'The Big Picture', 'Understanding'],
  };
  const options = templates[type] || ['Artifact'];
  return options[Math.floor(Math.random() * options.length)];
};

// Generate description
const generateArtifactDescription = (prompt, type) => {
  const templates = {
    diagram: `Visual structure showing how elements connect and interact`,
    illustration: `Creative artistic representation bringing the concept to life`,
    infographic: `Data-rich visual with key statistics and insights`,
    mindmap: `Branching exploration of related ideas and concepts`,
    flowchart: `Step-by-step process visualization with decision points`,
    timeline: `Chronological view of events, phases, or evolution`,
    comparison: `Clear side-by-side analysis of options or features`,
    concept: `Simplified explanation focusing on core understanding`,
  };
  return templates[type] || 'A unique visual perspective';
};

// Generate SVG preview for artifact type
const generateArtifactPreview = (type) => {
  const previews = {
    diagram: `<svg viewBox="0 0 100 100"><rect x="35" y="10" width="30" height="20" rx="3" fill="#06b6d4" opacity="0.6"/><rect x="10" y="70" width="25" height="20" rx="3" fill="#06b6d4" opacity="0.4"/><rect x="65" y="70" width="25" height="20" rx="3" fill="#06b6d4" opacity="0.4"/><line x1="50" y1="30" x2="22" y2="70" stroke="#06b6d4" stroke-width="2" opacity="0.5"/><line x1="50" y1="30" x2="77" y2="70" stroke="#06b6d4" stroke-width="2" opacity="0.5"/></svg>`,
    illustration: `<svg viewBox="0 0 100 100"><circle cx="30" cy="40" r="15" fill="#a855f7" opacity="0.5"/><circle cx="70" cy="50" r="20" fill="#ec4899" opacity="0.4"/><path d="M10 80 Q50 50 90 80" stroke="#a855f7" stroke-width="3" fill="none" opacity="0.6"/></svg>`,
    infographic: `<svg viewBox="0 0 100 100"><rect x="10" y="60" width="15" height="30" fill="#10b981" opacity="0.7"/><rect x="30" y="40" width="15" height="50" fill="#10b981" opacity="0.8"/><rect x="50" y="20" width="15" height="70" fill="#10b981" opacity="0.9"/><rect x="70" y="50" width="15" height="40" fill="#10b981" opacity="0.6"/></svg>`,
    mindmap: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="12" fill="#ec4899" opacity="0.7"/><circle cx="25" cy="30" r="8" fill="#ec4899" opacity="0.4"/><circle cx="75" cy="25" r="8" fill="#ec4899" opacity="0.4"/><circle cx="20" cy="70" r="8" fill="#ec4899" opacity="0.4"/><circle cx="80" cy="65" r="8" fill="#ec4899" opacity="0.4"/><line x1="50" y1="50" x2="25" y2="30" stroke="#ec4899" stroke-width="2" opacity="0.5"/><line x1="50" y1="50" x2="75" y2="25" stroke="#ec4899" stroke-width="2" opacity="0.5"/><line x1="50" y1="50" x2="20" y2="70" stroke="#ec4899" stroke-width="2" opacity="0.5"/><line x1="50" y1="50" x2="80" y2="65" stroke="#ec4899" stroke-width="2" opacity="0.5"/></svg>`,
    flowchart: `<svg viewBox="0 0 100 100"><rect x="35" y="5" width="30" height="15" rx="2" fill="#f59e0b" opacity="0.6"/><polygon points="50,30 65,45 50,60 35,45" fill="#f59e0b" opacity="0.5"/><rect x="35" y="70" width="30" height="15" rx="2" fill="#f59e0b" opacity="0.6"/><line x1="50" y1="20" x2="50" y2="30" stroke="#f59e0b" stroke-width="2"/><line x1="50" y1="60" x2="50" y2="70" stroke="#f59e0b" stroke-width="2"/></svg>`,
    timeline: `<svg viewBox="0 0 100 100"><line x1="10" y1="50" x2="90" y2="50" stroke="#3b82f6" stroke-width="3" opacity="0.5"/><circle cx="20" cy="50" r="6" fill="#3b82f6" opacity="0.8"/><circle cx="45" cy="50" r="6" fill="#3b82f6" opacity="0.8"/><circle cx="70" cy="50" r="6" fill="#3b82f6" opacity="0.8"/><rect x="15" y="25" width="10" height="15" rx="2" fill="#3b82f6" opacity="0.4"/><rect x="40" y="60" width="10" height="15" rx="2" fill="#3b82f6" opacity="0.4"/><rect x="65" y="25" width="10" height="15" rx="2" fill="#3b82f6" opacity="0.4"/></svg>`,
    comparison: `<svg viewBox="0 0 100 100"><rect x="10" y="20" width="35" height="60" rx="4" fill="#f43f5e" opacity="0.4"/><rect x="55" y="20" width="35" height="60" rx="4" fill="#06b6d4" opacity="0.4"/><line x1="50" y1="15" x2="50" y2="85" stroke="white" stroke-width="2" opacity="0.3" stroke-dasharray="4"/></svg>`,
    concept: `<svg viewBox="0 0 100 100"><circle cx="50" cy="35" r="20" fill="#eab308" opacity="0.3"/><path d="M40 55 L40 70 L60 70 L60 55" fill="#eab308" opacity="0.5"/><line x1="50" y1="70" x2="50" y2="85" stroke="#eab308" stroke-width="3" opacity="0.6"/><line x1="40" y1="80" x2="60" y2="80" stroke="#eab308" stroke-width="3" opacity="0.6"/></svg>`,
  };
  return previews[type] || previews.concept;
};

// ============================================================================
// CUSTOM HOOK - Creative API with emergence tracking
// ============================================================================

const useCreativeAPI = () => {
  const sendMessage = useCallback(async (message, options = {}) => {
    const { 
      onChunk, 
      onThought, 
      onComplete, 
      onError, 
      onProviderChange,
      mode = 'quick', 
      sessionId 
    } = options;
    
    try {
      onThought?.({ phase: 'gathering', intensity: 0.3 });
      
      const response = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode, sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      onThought?.({ phase: 'connecting', intensity: 0.5 });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let metadata = {};

      if (!reader) throw new Error('No response body');

      onThought?.({ phase: 'forming', intensity: 0.7 });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.chunk) {
              fullContent += data.chunk;
              onChunk?.(data.chunk, fullContent);
            }
            if (data.provider || data.model) {
              onProviderChange?.({ provider: data.provider, model: data.model });
            }
            if (data.done) {
              metadata = { provider: data.provider, model: data.model, cost_usd: data.cost_usd };
            }
          } catch (e) { /* skip */ }
        }
      }

      onThought?.({ phase: 'crystallized', intensity: 1.0 });
      onComplete?.(fullContent, metadata);
      return { content: fullContent, metadata };
    } catch (error) {
      onThought?.({ phase: 'dispersed', intensity: 0 });
      onError?.(error);
      throw error;
    }
  }, []);

  return { sendMessage };
};

// ============================================================================
// COSMIC CORE - The center point of all creations
// ============================================================================

const CosmicCore = memo(({ isActive, intensity = 0.5, isCreating = false }) => {
  const controls = useAnimation();
  
  useEffect(() => {
    if (isCreating) {
      controls.start({
        scale: [1, 1.3, 1],
        boxShadow: [
          '0 0 40px 20px rgba(6, 182, 212, 0.3)',
          '0 0 80px 40px rgba(139, 92, 246, 0.4)',
          '0 0 40px 20px rgba(6, 182, 212, 0.3)',
        ],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      });
    } else {
      controls.start({
        scale: 1,
        boxShadow: '0 0 30px 15px rgba(6, 182, 212, 0.2)',
        transition: { duration: 0.5 }
      });
    }
  }, [isCreating, controls]);
  
  return (
    <motion.div 
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
      animate={controls}
    >
      {/* Outer glow rings */}
      <motion.div
        className="absolute -inset-16 rounded-full opacity-20"
        animate={{
          rotate: 360,
          scale: isActive ? [1, 1.1, 1] : 1,
        }}
        transition={{ rotate: { duration: 30, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }}
        style={{
          background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.3), transparent, rgba(139, 92, 246, 0.3), transparent)',
        }}
      />
      
      {/* Middle ring */}
      <motion.div
        className="absolute -inset-8 rounded-full opacity-30"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          background: 'conic-gradient(from 180deg, transparent, rgba(236, 72, 153, 0.4), transparent)',
          filter: 'blur(8px)',
        }}
      />
      
      {/* Core avatar */}
      <motion.div
        className="relative w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 
                   flex items-center justify-center border border-cyan-500/40 backdrop-blur-xl"
        whileHover={{ scale: 1.1 }}
      >
        <TooLooAvatar 
          size={64} 
          state={isCreating ? 'thinking' : isActive ? 'active' : 'idle'} 
          showBreath={!isCreating}
        />
        
        {/* Pulse rings when active */}
        <AnimatePresence>
          {isActive && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-cyan-500/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: i * 0.6,
                    ease: 'easeOut' 
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

CosmicCore.displayName = 'CosmicCore';

// ============================================================================
// THOUGHT NEBULA - Background particle effect
// ============================================================================

const ThoughtNebula = memo(({ intensity = 0.5, count = 50 }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  }, [count]);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(6, 182, 212, ${p.opacity * intensity}) 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            opacity: [p.opacity * intensity, p.opacity * intensity * 1.5, p.opacity * intensity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

ThoughtNebula.displayName = 'ThoughtNebula';

// ============================================================================
// FLOATING CREATION ARTIFACT - Individual creation in space
// v3.3.33 - Enhanced free movement with velocity, boundary bounce, and persistence
// ============================================================================

const FloatingArtifact = memo(({ 
  creation, 
  position, 
  isExpanded, 
  onToggle,
  onDrag,
  isFocused = false,
  onPositionChange, // New: callback to persist position changes
}) => {
  const [localPos, setLocalPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);
  
  const summary = useMemo(() => {
    const text = creation.content || '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  }, [creation.content]);
  
  // Sync with external position changes
  useEffect(() => {
    if (!isDragging) {
      setLocalPos(position);
    }
  }, [position, isDragging]);
  
  // Apply momentum/drift when not dragging
  useEffect(() => {
    if (isDragging || (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1)) {
      return;
    }
    
    const animate = () => {
      setVelocity(v => ({
        x: v.x * 0.95, // Friction
        y: v.y * 0.95,
      }));
      
      setLocalPos(prev => {
        const newX = prev.x + velocity.x;
        const newY = prev.y + velocity.y;
        
        // Soft boundary bounce at screen edges with some padding
        const padding = 100;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        
        let boundedX = newX;
        let boundedY = newY;
        let bounceX = velocity.x;
        let bounceY = velocity.y;
        
        if (newX < padding) { boundedX = padding; bounceX = Math.abs(velocity.x) * 0.5; }
        if (newX > maxX) { boundedX = maxX; bounceX = -Math.abs(velocity.x) * 0.5; }
        if (newY < padding) { boundedY = padding; bounceY = Math.abs(velocity.y) * 0.5; }
        if (newY > maxY) { boundedY = maxY; bounceY = -Math.abs(velocity.y) * 0.5; }
        
        if (bounceX !== velocity.x || bounceY !== velocity.y) {
          setVelocity({ x: bounceX, y: bounceY });
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
    // Track velocity for momentum
    setVelocity({ x: info.delta.x, y: info.delta.y });
    onDrag?.(_, info);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    // Persist position if callback provided
    onPositionChange?.({ ...localPos, id: creation.id });
  };
  
  const providerGradient = useMemo(() => {
    const p = (creation.metadata?.provider || '').toLowerCase();
    if (p.includes('gemini')) return 'from-blue-500/30 to-blue-600/10';
    if (p.includes('claude')) return 'from-orange-500/30 to-orange-600/10';
    if (p.includes('gpt') || p.includes('openai')) return 'from-emerald-500/30 to-emerald-600/10';
    if (p.includes('deepseek')) return 'from-purple-500/30 to-purple-600/10';
    return 'from-cyan-500/30 to-purple-600/10';
  }, [creation.metadata?.provider]);
  
  return (
    <motion.div
      drag
      dragMomentum={true}
      dragElastic={0.15}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`absolute z-30 ${isDragging ? 'cursor-grabbing z-50' : 'cursor-grab'}`}
      style={{
        left: localPos.x,
        top: localPos.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isFocused ? 1.1 : position.scale || 1, 
        opacity: 1,
        rotate: isExpanded ? 0 : (position.rotation || 0) * 0.1,
      }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      whileHover={{ scale: (position.scale || 1) * 1.05 }}
      whileDrag={{ scale: 1.1, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onToggle?.(); }}
    >
      {/* Connector line to center */}
      <svg 
        className="absolute pointer-events-none" 
        style={{ 
          left: '50%', 
          top: '50%',
          width: Math.abs(localPos.x) * 2 + 200,
          height: Math.abs(localPos.y) * 2 + 200,
          transform: 'translate(-50%, -50%)',
          zIndex: -1,
        }}
      >
        <motion.line
          x1="50%"
          y1="50%"
          x2={localPos.x}
          y2={localPos.y}
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="1"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
      </svg>
      
      {/* Artifact container */}
      <motion.div
        className={`
          relative rounded-2xl overflow-hidden backdrop-blur-xl
          bg-gradient-to-br ${providerGradient}
          border border-white/10 shadow-2xl
          ${isExpanded ? 'w-[400px] max-h-[500px]' : 'w-48 h-48'}
          transition-all duration-300
        `}
        layout
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
        />
        
        {/* Content */}
        <div className="relative p-4 h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <span className="text-xs">✦</span>
              </motion.div>
              <span className="text-xs text-gray-400 font-medium">
                {creation.metadata?.provider || 'AI'}
              </span>
            </div>
            <motion.button
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isExpanded ? '−' : '+'}
            </motion.button>
          </div>
          
          {/* Prompt preview */}
          <div className="mb-2">
            <p className="text-xs text-cyan-400/80 truncate">{creation.prompt}</p>
          </div>
          
          {/* Content */}
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-y-auto max-h-[380px] pr-2 custom-scrollbar"
              >
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {creation.content}
                </pre>
                
                {/* Metadata footer */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
                  <span>{creation.metadata?.model}</span>
                  {creation.metadata?.cost_usd && (
                    <span className="text-cyan-400">${creation.metadata.cost_usd.toFixed(4)}</span>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.p
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-gray-300 line-clamp-4"
              >
                {summary}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        
        {/* Glow effect */}
        {isFocused && (
          <motion.div
            className="absolute -inset-1 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 20px rgba(6, 182, 212, 0.3)',
                '0 0 40px rgba(139, 92, 246, 0.3)',
                '0 0 20px rgba(6, 182, 212, 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );
});

FloatingArtifact.displayName = 'FloatingArtifact';

// ============================================================================
// EMERGENCE PORTAL - Where new creations materialize
// ============================================================================

const EmergencePortal = memo(({ isActive, content, progress = 0, provider }) => {
  if (!isActive) return null;
  
  return (
    <motion.div
      className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-40"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      {/* Portal ring */}
      <motion.div
        className="relative w-64 h-64 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, 
              rgba(6, 182, 212, 0.6) 0deg, 
              rgba(139, 92, 246, 0.4) ${progress * 360}deg, 
              rgba(255, 255, 255, 0.05) ${progress * 360}deg
            )`,
            filter: 'blur(4px)',
          }}
        />
      </motion.div>
      
      {/* Inner content area */}
      <div className="absolute inset-8 rounded-full bg-black/80 backdrop-blur-xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center p-4">
        {/* Materializing indicator */}
        <motion.div
          className="mb-3"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-3xl">✧</span>
        </motion.div>
        
        <p className="text-sm text-cyan-400 text-center mb-2">Materializing...</p>
        
        {provider && (
          <p className="text-xs text-gray-500">{provider}</p>
        )}
        
        {/* Progress bar */}
        <div className="w-full mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
          />
        </div>
        
        {/* Content preview */}
        {content && (
          <motion.div
            className="mt-3 text-xs text-gray-400 text-center max-h-20 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
          >
            {content.substring(0, 100)}...
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

EmergencePortal.displayName = 'EmergencePortal';

// ============================================================================
// PROMPT CONSTELLATION - The input interface as a floating element
// ============================================================================

const PromptConstellation = memo(({ 
  value, 
  onChange, 
  onSubmit, 
  isProcessing = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <motion.div 
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 ${className}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute -inset-4 rounded-3xl pointer-events-none"
        animate={isFocused ? {
          boxShadow: [
            '0 0 40px 10px rgba(6, 182, 212, 0.15)',
            '0 0 60px 20px rgba(139, 92, 246, 0.1)',
            '0 0 40px 10px rgba(6, 182, 212, 0.15)',
          ],
        } : {
          boxShadow: '0 0 30px 5px rgba(6, 182, 212, 0.08)',
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      <div className="relative flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10">
        {/* TooLoo mini avatar */}
        <motion.div
          animate={isProcessing ? { 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          } : {}}
          transition={{ duration: 2, repeat: isProcessing ? Infinity : 0 }}
        >
          <TooLooAvatar size={32} state={isProcessing ? 'thinking' : 'idle'} />
        </motion.div>
        
        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && value.trim() && onSubmit?.()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isProcessing}
          placeholder="What shall TooLoo manifest?"
          className="w-80 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
        />
        
        {/* Submit */}
        <motion.button
          onClick={onSubmit}
          disabled={!value.trim() || isProcessing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            px-4 py-2 rounded-xl text-sm font-medium
            ${value.trim() && !isProcessing
              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
              : 'bg-white/10 text-gray-500'}
          `}
        >
          {isProcessing ? '✧' : '✨'} {isProcessing ? 'Manifesting' : 'Manifest'}
        </motion.button>
      </div>
    </motion.div>
  );
});

PromptConstellation.displayName = 'PromptConstellation';

// ============================================================================
// ARTIFACT CARD - Selectable artifact option
// ============================================================================

const ArtifactCard = memo(({ artifact, onSelect, isSelected, delay = 0 }) => {
  const colorMap = {
    cyan: { bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/40', glow: 'shadow-cyan-500/30' },
    purple: { bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/40', glow: 'shadow-purple-500/30' },
    emerald: { bg: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/30' },
    pink: { bg: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/40', glow: 'shadow-pink-500/30' },
    amber: { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/40', glow: 'shadow-amber-500/30' },
    blue: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/40', glow: 'shadow-blue-500/30' },
    rose: { bg: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/40', glow: 'shadow-rose-500/30' },
    yellow: { bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/30' },
  };
  
  const colors = colorMap[artifact.color] || colorMap.cyan;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ delay: delay * 0.1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(artifact)}
      className={`
        relative cursor-pointer rounded-2xl overflow-hidden backdrop-blur-xl
        bg-gradient-to-br ${colors.bg} border ${colors.border}
        ${isSelected ? `ring-2 ring-white/50 shadow-lg ${colors.glow}` : ''}
        transition-shadow duration-300 w-48
      `}
    >
      {/* Preview SVG */}
      <div className="h-28 flex items-center justify-center p-4 relative overflow-hidden">
        <div 
          className="w-20 h-20"
          dangerouslySetInnerHTML={{ __html: artifact.preview }}
        />
        
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
      </div>
      
      {/* Info */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{artifact.icon}</span>
          <span className="text-sm font-medium text-white">{artifact.title}</span>
        </div>
        <p className="text-xs text-gray-400 line-clamp-2">{artifact.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">{artifact.label}</span>
          <motion.span 
            className="text-xs text-cyan-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Select →
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
});

ArtifactCard.displayName = 'ArtifactCard';

// ============================================================================
// ARTIFACT SELECTION PANEL - Shows multiple artifact options
// ============================================================================

const ArtifactSelectionPanel = memo(({ 
  artifacts, 
  onSelect, 
  prompt, 
  isGenerating = false,
  onCancel,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative z-10 max-w-4xl w-full px-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <span className="text-4xl">✨</span>
          </motion.div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Choose Your Artifact
          </h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            For: <span className="text-cyan-400">"{prompt}"</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Each option creates a unique visual perspective
          </p>
        </div>
        
        {/* Artifact options */}
        <div className="flex flex-wrap justify-center gap-4">
          <AnimatePresence>
            {artifacts.map((artifact, index) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onSelect={onSelect}
                delay={index}
              />
            ))}
          </AnimatePresence>
        </div>
        
        {/* Cancel button */}
        <div className="text-center mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel & Start Over
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
});

ArtifactSelectionPanel.displayName = 'ArtifactSelectionPanel';

// ============================================================================
// COMPLETED ARTIFACT - A finalized visual artifact in the cosmos
// ============================================================================

// ============================================================================
// COMPLETED ARTIFACT - Interactive artifact with free movement
// v3.3.33 - Enhanced with drag-anywhere, momentum, and position persistence
// ============================================================================

const CompletedArtifact = memo(({ 
  artifact, 
  position, 
  isExpanded, 
  onToggle,
  onFollowUp,
  onPositionChange,
}) => {
  const [localPos, setLocalPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);
  
  const colorMap = {
    cyan: 'from-cyan-500/30 to-cyan-600/10',
    purple: 'from-purple-500/30 to-purple-600/10',
    emerald: 'from-emerald-500/30 to-emerald-600/10',
    pink: 'from-pink-500/30 to-pink-600/10',
    amber: 'from-amber-500/30 to-amber-600/10',
    blue: 'from-blue-500/30 to-blue-600/10',
    rose: 'from-rose-500/30 to-rose-600/10',
    yellow: 'from-yellow-500/30 to-yellow-600/10',
  };
  
  const gradient = colorMap[artifact.color] || colorMap.cyan;
  
  // Sync with external position updates (when not dragging)
  useEffect(() => {
    if (!isDragging) {
      setLocalPos(position);
    }
  }, [position, isDragging]);
  
  // Apply momentum/drift when released
  useEffect(() => {
    if (isDragging || (Math.abs(velocity.x) < 0.5 && Math.abs(velocity.y) < 0.5)) {
      return;
    }
    
    const animate = () => {
      setVelocity(v => ({
        x: v.x * 0.92, // Smooth friction
        y: v.y * 0.92,
      }));
      
      setLocalPos(prev => {
        // Soft boundaries with bounce
        const padding = 120;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let bounceX = velocity.x;
        let bounceY = velocity.y;
        
        // Bounce off edges with dampening
        if (newX < padding) { newX = padding; bounceX = Math.abs(velocity.x) * 0.6; }
        if (newX > maxX) { newX = maxX; bounceX = -Math.abs(velocity.x) * 0.6; }
        if (newY < padding) { newY = padding; bounceY = Math.abs(velocity.y) * 0.6; }
        if (newY > maxY) { newY = maxY; bounceY = -Math.abs(velocity.y) * 0.6; }
        
        if (bounceX !== velocity.x || bounceY !== velocity.y) {
          setVelocity({ x: bounceX, y: bounceY });
        }
        
        return { x: newX, y: newY };
      });
      
      if (Math.abs(velocity.x) > 0.5 || Math.abs(velocity.y) > 0.5) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    
    rafRef.current = requestAnimationFrame(animate);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [isDragging, velocity]);
  
  const handleDragStart = () => {
    setIsDragging(true);
    setVelocity({ x: 0, y: 0 });
  };
  
  const handleDrag = (_, info) => {
    const newPos = {
      x: localPos.x + info.delta.x,
      y: localPos.y + info.delta.y,
    };
    setLocalPos(newPos);
    // Track velocity for momentum effect
    setVelocity({ x: info.delta.x * 0.8, y: info.delta.y * 0.8 });
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    // Persist new position
    onPositionChange?.({ ...localPos, id: artifact.id });
  };
  
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`absolute z-20 ${isDragging ? 'cursor-grabbing z-50' : 'cursor-grab'}`}
      style={{
        left: localPos.x,
        top: localPos.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: isDragging ? 1.08 : 1.05 }}
      whileDrag={{ 
        scale: 1.08, 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.3)',
        zIndex: 100,
      }}
    >
      {/* Connector to center */}
      <svg 
        className="absolute pointer-events-none opacity-30"
        style={{
          left: '50%',
          top: '50%',
          width: 400,
          height: 400,
          transform: 'translate(-50%, -50%)',
          zIndex: -1,
        }}
      >
        <line
          x1="200"
          y1="200"
          x2="200"
          y2="200"
          stroke="rgba(6, 182, 212, 0.3)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>
      
      <motion.div
        layout
        onClick={(e) => { e.stopPropagation(); if (!isDragging) onToggle?.(); }}
        className={`
          rounded-2xl overflow-hidden backdrop-blur-xl
          bg-gradient-to-br ${gradient} border border-white/20
          ${isExpanded ? 'w-96' : 'w-56'}
          transition-all duration-300 shadow-xl
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">{artifact.icon}</span>
            <span className="text-sm font-medium text-white">{artifact.title}</span>
          </div>
          <span className="text-xs text-gray-500">{artifact.type}</span>
        </div>
        
        {/* Preview / Content */}
        <div className={`${isExpanded ? 'p-4' : 'p-3'}`}>
          {!isExpanded ? (
            <div className="flex items-center justify-center h-24">
              <div 
                className="w-16 h-16"
                dangerouslySetInnerHTML={{ __html: artifact.preview }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Full preview */}
              <div className="flex items-center justify-center h-32 bg-black/20 rounded-lg">
                <div 
                  className="w-24 h-24"
                  dangerouslySetInnerHTML={{ __html: artifact.preview }}
                />
              </div>
              
              {/* Content */}
              {artifact.content && (
                <div className="max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">
                    {artifact.content}
                  </pre>
                </div>
              )}
              
              {/* Prompt */}
              <div className="text-xs text-gray-500 border-t border-white/10 pt-2">
                <span className="text-gray-400">Prompt:</span> {artifact.prompt}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); onFollowUp(artifact); }}
                  className="flex-1 px-3 py-2 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
                >
                  ✨ Explore Further
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 text-xs bg-white/10 text-gray-400 rounded-lg hover:bg-white/20"
                >
                  📋 Copy
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

CompletedArtifact.displayName = 'CompletedArtifact';

// ============================================================================
// FOLLOW-UP SUGGESTIONS - Smart suggestions based on selected artifact
// ============================================================================

const FollowUpSuggestions = memo(({ artifact, onSelect, visible }) => {
  const suggestions = useMemo(() => {
    if (!artifact) return [];
    
    const typeBasedSuggestions = {
      diagram: [
        `Zoom into the ${artifact.title} details`,
        'Show the connections between components',
        'Add implementation timeline',
      ],
      illustration: [
        'Make it more detailed',
        'Show alternative perspective',
        'Add annotations',
      ],
      infographic: [
        'Break down the largest segment',
        'Compare with industry benchmarks',
        'Show trend over time',
      ],
      mindmap: [
        'Expand the most important branch',
        'Add pros and cons',
        'Show relationships between nodes',
      ],
      flowchart: [
        'Add error handling paths',
        'Show parallel processes',
        'Simplify for beginners',
      ],
      timeline: [
        'Add more milestones',
        'Show dependencies',
        'Highlight critical path',
      ],
      comparison: [
        'Add more criteria',
        'Show cost analysis',
        'Include user reviews',
      ],
      concept: [
        'Explain with an analogy',
        'Show real-world example',
        'List prerequisites',
      ],
    };
    
    return typeBasedSuggestions[artifact.type] || [
      'Tell me more',
      'Show another perspective',
      'Make it simpler',
    ];
  }, [artifact]);
  
  if (!visible || !artifact) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex gap-2 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10">
        <span className="text-xs text-gray-500 self-center mr-2">Follow up:</span>
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

FollowUpSuggestions.displayName = 'FollowUpSuggestions';

// ============================================================================
// CREATION SPACE VIEW - Main VISUAL CANVAS Component
// ============================================================================

const CreationSpaceView = memo(({ className = '' }) => {
  // Canvas refs
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // Session state
  const [sessionId] = useState(() => `cosmos-${Date.now()}`);
  const [selectionHistory, setSelectionHistory] = useState([]);
  
  // Artifact state
  const [completedArtifacts, setCompletedArtifacts] = useState([]);
  const [pendingArtifacts, setPendingArtifacts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [lastSelectedArtifact, setLastSelectedArtifact] = useState(null);
  
  // Input state
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  
  // Hooks
  const { sendMessage } = useCreativeAPI();
  const { setAppState, flashEmotion } = useSkinEmotion();
  
  // Update canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;
  
  // Calculate position for new artifact
  const getArtifactPosition = useCallback((index) => {
    const PHI = 1.618033988749;
    const angle = index * (2 * Math.PI / PHI);
    const radius = 200 + (index * 30);
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  }, [centerX, centerY]);
  
  // Handle initial prompt - generate artifact options
  const handleManifest = useCallback(() => {
    if (!input.trim() || isGenerating) return;
    
    const prompt = input.trim();
    setCurrentPrompt(prompt);
    setInput('');
    setIsGenerating(true);
    setAppState('processing');
    
    // Generate artifact variations based on prompt and history
    setTimeout(() => {
      const variations = generateArtifactVariations(prompt, selectionHistory);
      setPendingArtifacts(variations);
      setShowSelection(true);
      setIsGenerating(false);
      setAppState('idle');
    }, 800); // Quick generation
  }, [input, isGenerating, selectionHistory, setAppState]);
  
  // Handle artifact selection - create the actual content
  const handleArtifactSelect = useCallback(async (artifact) => {
    setShowSelection(false);
    setIsGenerating(true);
    setAppState('processing');
    
    try {
      // Build context-aware prompt
      const contextPrompt = `Create a ${artifact.type} visualization for: "${currentPrompt}". 
        Style: ${artifact.label}. Focus on ${artifact.title}.
        ${selectionHistory.length > 0 ? `Previous context: ${selectionHistory.map(h => h.type).join(' → ')}` : ''}`;
      
      await sendMessage(contextPrompt, {
        sessionId,
        onComplete: (content, metadata) => {
          const position = getArtifactPosition(completedArtifacts.length);
          
          const newArtifact = {
            ...artifact,
            content,
            metadata,
            prompt: currentPrompt,
            position,
            timestamp: Date.now(),
          };
          
          setCompletedArtifacts(prev => [...prev, newArtifact]);
          setSelectionHistory(prev => [...prev, { type: artifact.type, prompt: currentPrompt }]);
          setLastSelectedArtifact(newArtifact);
          setExpandedId(newArtifact.id);
          
          flashEmotion('success');
          setAppState('success');
          setTimeout(() => setAppState('idle'), 1500);
        },
        onError: (error) => {
          console.error('[CreationSpace] Error:', error);
          flashEmotion('error');
          setAppState('error');
        },
      });
    } finally {
      setIsGenerating(false);
      setPendingArtifacts([]);
      setCurrentPrompt('');
    }
  }, [currentPrompt, sessionId, selectionHistory, completedArtifacts.length, getArtifactPosition, sendMessage, flashEmotion, setAppState]);
  
  // Handle follow-up suggestion
  const handleFollowUp = useCallback((suggestion) => {
    setInput(suggestion);
  }, []);
  
  // Handle follow-up from artifact
  const handleArtifactFollowUp = useCallback((artifact) => {
    const followUpPrompts = {
      diagram: `Expand on the ${artifact.title} - show more detail`,
      illustration: `Create a variation of ${artifact.title}`,
      infographic: `Dive deeper into the data from ${artifact.title}`,
      mindmap: `Expand the branches of ${artifact.title}`,
      flowchart: `Add more steps to ${artifact.title}`,
      timeline: `Show what comes next after ${artifact.title}`,
      comparison: `Add more dimensions to ${artifact.title}`,
      concept: `Explain ${artifact.title} with examples`,
    };
    setInput(followUpPrompts[artifact.type] || `Tell me more about ${artifact.title}`);
  }, []);
  
  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setShowSelection(false);
    setPendingArtifacts([]);
    setCurrentPrompt('');
  }, []);
  
  // Handle artifact position change (free movement)
  const handlePositionChange = useCallback((newPosition) => {
    setCompletedArtifacts(prev => prev.map(artifact => 
      artifact.id === newPosition.id 
        ? { ...artifact, position: { x: newPosition.x, y: newPosition.y } }
        : artifact
    ));
  }, []);
  
  return (
    <div className={`h-full w-full relative overflow-hidden bg-black ${className}`}>
      {/* Background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10, 10, 20, 1) 0%, rgba(0, 0, 5, 1) 100%)',
          }}
        />
        <ThoughtNebula intensity={isGenerating ? 0.8 : 0.4} count={60} />
        <LiquidSurface variant="ethereal" animated={true} />
        <PointerAurora size={300} intensity={0.2} blur={150} className="opacity-40" />
      </div>
      
      {/* Main Canvas */}
      <div ref={canvasRef} className="absolute inset-0 z-10">
        {/* Cosmic Core */}
        <CosmicCore 
          isActive={completedArtifacts.length > 0 || isGenerating} 
          isCreating={isGenerating}
        />
        
        {/* Completed Artifacts - Freely draggable */}
        <AnimatePresence>
          {completedArtifacts.map((artifact) => (
            <CompletedArtifact
              key={artifact.id}
              artifact={artifact}
              position={artifact.position}
              isExpanded={expandedId === artifact.id}
              onToggle={() => setExpandedId(prev => prev === artifact.id ? null : artifact.id)}
              onFollowUp={handleArtifactFollowUp}
              onPositionChange={handlePositionChange}
            />
          ))}
        </AnimatePresence>
        
        {/* Orbital guides */}
        {completedArtifacts.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none opacity-10">
            {[1, 2, 3].map((ring) => (
              <ellipse
                key={ring}
                cx={centerX}
                cy={centerY}
                rx={200 + ring * 60}
                ry={150 + ring * 45}
                fill="none"
                stroke="rgba(6, 182, 212, 0.3)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
            ))}
          </svg>
        )}
      </div>
      
      {/* Artifact Selection Panel */}
      <AnimatePresence>
        {showSelection && (
          <ArtifactSelectionPanel
            artifacts={pendingArtifacts}
            onSelect={handleArtifactSelect}
            prompt={currentPrompt}
            isGenerating={isGenerating}
            onCancel={handleCancelSelection}
          />
        )}
      </AnimatePresence>
      
      {/* Empty State */}
      <AnimatePresence>
        {completedArtifacts.length === 0 && !showSelection && !isGenerating && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              ✨
            </motion.div>
            <motion.p
              className="text-gray-400 text-lg mb-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              The cosmos awaits your vision
            </motion.p>
            <p className="text-gray-500 text-sm mb-6">
              Describe what you want to visualize
            </p>
            
            {/* Quick starters */}
            <div className="flex gap-2 pointer-events-auto">
              {['Explain machine learning', 'Compare frameworks', 'Show a process'].map((starter) => (
                <motion.button
                  key={starter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setInput(starter)}
                  className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white border border-white/10"
                >
                  {starter}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <motion.h1 
            className="text-lg font-light text-white/80"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            Creation Space
          </motion.h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            VISUAL
          </span>
        </div>
        <span className="text-xs text-gray-500 pointer-events-auto">
          {completedArtifacts.length} artifact{completedArtifacts.length !== 1 ? 's' : ''} created
        </span>
      </div>
      
      {/* Follow-up Suggestions */}
      <FollowUpSuggestions
        artifact={lastSelectedArtifact}
        onSelect={handleFollowUp}
        visible={completedArtifacts.length > 0 && !showSelection && !isGenerating}
      />
      
      {/* Input */}
      <PromptConstellation
        value={input}
        onChange={setInput}
        onSubmit={handleManifest}
        isProcessing={isGenerating}
      />
    </div>
  );
});

CreationSpaceView.displayName = 'CreationSpaceView';

export default CreationSpaceView;
