/**
 * SmartMessage.jsx - Progressive Response Renderer
 * 
 * Renders AI responses with:
 * - Quick TLDR shown first
 * - Smooth content reveal
 * - Collapsible sections for long content
 * - Background processing indicator
 * - Reading-friendly pacing
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Icons
const ChevronIcon = ({ isOpen }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Extract quick summary from content
 * Gets first meaningful sentence or TLDR
 */
function extractQuickSummary(content) {
  if (!content) return null;
  
  // Look for explicit TLDR or summary
  const tldrMatch = content.match(/(?:TL;?DR|Summary|Quick answer)[:\s]*([^\n]+)/i);
  if (tldrMatch) return tldrMatch[1].trim();
  
  // Get first sentence (up to period, question mark, or exclamation)
  const firstSentence = content.match(/^[^.!?\n]+[.!?]?/);
  if (firstSentence && firstSentence[0].length > 10) {
    return firstSentence[0].trim();
  }
  
  // Fallback: first 120 chars
  return content.slice(0, 120).trim() + (content.length > 120 ? '...' : '');
}

/**
 * Parse content into collapsible sections
 */
function parseCollapsibleSections(content) {
  if (!content) return [];
  
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let quickContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect markdown headers
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    const boldMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)/);
    
    if (h2Match || h3Match) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: h2Match ? 'h2' : 'h3',
        title: (h2Match || h3Match)[1],
        content: '',
        hasCode: false,
        lineCount: 0,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
      currentSection.lineCount++;
      if (line.includes('```')) currentSection.hasCode = true;
    } else {
      quickContent += line + '\n';
    }
  }
  
  if (currentSection) sections.push(currentSection);
  
  return { quickContent: quickContent.trim(), sections };
}

/**
 * Quick Answer Badge - Shows instant response
 */
const QuickAnswerBadge = memo(function QuickAnswerBadge({ summary, isComplete }) {
  if (!summary) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
          Quick Answer
        </span>
        {isComplete ? (
          <span className="text-emerald-400"><CheckIcon /></span>
        ) : (
          <SpinnerIcon />
        )}
      </div>
      <p className="text-sm text-gray-200 leading-relaxed">{summary}</p>
    </motion.div>
  );
});

/**
 * Collapsible Section - For detailed content
 */
const CollapsibleSection = memo(function CollapsibleSection({ 
  title, 
  content, 
  hasCode, 
  lineCount,
  defaultOpen = false,
  isLoading = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const shouldCollapse = lineCount > 5 || hasCode;
  
  if (!shouldCollapse) {
    // Render inline for short sections
    return (
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">{title}</h3>
        <div className="text-sm text-gray-400 whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
  
  return (
    <div className="mb-3 rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronIcon isOpen={isOpen} />
          <span className="text-sm font-medium text-gray-300">{title}</span>
          {hasCode && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">code</span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {isOpen ? 'collapse' : `${lineCount} lines`}
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 text-sm text-gray-400 whitespace-pre-wrap border-t border-white/5 pt-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <SpinnerIcon />
                  <span>Loading details...</span>
                </div>
              ) : (
                content
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Background Processing Indicator
 */
const BackgroundIndicator = memo(function BackgroundIndicator({ items, onComplete }) {
  const [completed, setCompleted] = useState(0);
  
  useEffect(() => {
    if (items.length === 0) return;
    
    // Simulate background processing completion
    const interval = setInterval(() => {
      setCompleted(prev => {
        const next = prev + 1;
        if (next >= items.length) {
          clearInterval(interval);
          onComplete?.();
        }
        return next;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [items.length, onComplete]);
  
  if (items.length === 0 || completed >= items.length) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mt-3 p-2 rounded-lg bg-white/5 border border-white/10"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <SpinnerIcon />
          <span>Processing additional content...</span>
        </div>
        <span className="text-gray-500">{completed}/{items.length}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${(completed / items.length) * 100}%` }}
        />
      </div>
    </motion.div>
  );
});

/**
 * SmartMessageContent - Progressive content renderer
 */
export const SmartMessageContent = memo(function SmartMessageContent({ 
  content, 
  isStreaming = false,
  showQuickAnswer = true,
  collapseThreshold = 10, // Lines before collapsing
}) {
  const [showAll, setShowAll] = useState(false);
  const [backgroundItems, setBackgroundItems] = useState([]);
  
  // Parse content into sections
  const { quickContent, sections } = useMemo(
    () => parseCollapsibleSections(content),
    [content]
  );
  
  // Extract quick summary for immediate display
  const quickSummary = useMemo(
    () => showQuickAnswer ? extractQuickSummary(content) : null,
    [content, showQuickAnswer]
  );
  
  // Determine if content is "heavy" (long or has code)
  const isHeavyContent = useMemo(() => {
    const totalLines = content?.split('\n').length || 0;
    const hasMultipleCodeBlocks = (content?.match(/```/g) || []).length > 2;
    return totalLines > 20 || hasMultipleCodeBlocks;
  }, [content]);
  
  // Progressive reveal - start with quick answer, then expand
  const [revealStage, setRevealStage] = useState(0);
  
  useEffect(() => {
    if (isStreaming) {
      setRevealStage(0);
      return;
    }
    
    // Progressive reveal stages
    const timers = [
      setTimeout(() => setRevealStage(1), 100),  // Quick answer
      setTimeout(() => setRevealStage(2), 400),  // First section
      setTimeout(() => setRevealStage(3), 800),  // All sections visible (collapsed)
    ];
    
    return () => timers.forEach(clearTimeout);
  }, [isStreaming, content]);
  
  // Handle background processing completion
  const handleBackgroundComplete = useCallback(() => {
    setBackgroundItems([]);
  }, []);
  
  return (
    <div className="smart-message-content">
      {/* Quick Answer - Shows immediately */}
      <AnimatePresence>
        {revealStage >= 1 && quickSummary && !isStreaming && isHeavyContent && (
          <QuickAnswerBadge 
            summary={quickSummary} 
            isComplete={revealStage >= 3} 
          />
        )}
      </AnimatePresence>
      
      {/* Quick content (before any headers) */}
      {quickContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed mb-4"
        >
          {quickContent}
        </motion.div>
      )}
      
      {/* Collapsible sections */}
      <AnimatePresence>
        {revealStage >= 2 && sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CollapsibleSection
              title={section.title}
              content={section.content}
              hasCode={section.hasCode}
              lineCount={section.lineCount}
              defaultOpen={index === 0 || section.lineCount <= 5}
              isLoading={isStreaming && index === sections.length - 1}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Background processing indicator */}
      <AnimatePresence>
        {backgroundItems.length > 0 && (
          <BackgroundIndicator 
            items={backgroundItems} 
            onComplete={handleBackgroundComplete}
          />
        )}
      </AnimatePresence>
      
      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-2 h-5 ml-1 bg-blue-400 rounded-sm animate-pulse" />
      )}
    </div>
  );
});

/**
 * Thinking Indicator - Modern, smooth animation
 */
export const ThinkingIndicator = memo(function ThinkingIndicator({ message = "Thinking" }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div className="relative w-8 h-8">
        {/* Pulsing rings */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-purple-500/30"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.2, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="absolute inset-0 rounded-full bg-blue-500/30"
        />
        {/* Center dot */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
      </div>
      
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-400">{message}</span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-gray-400"
        >.</motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          className="text-gray-400"
        >.</motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          className="text-gray-400"
        >.</motion.span>
      </div>
    </motion.div>
  );
});

/**
 * ReadTimeEstimate - Shows estimated reading time
 */
export const ReadTimeEstimate = memo(function ReadTimeEstimate({ content }) {
  const estimate = useMemo(() => {
    if (!content) return null;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? '<1 min read' : `${minutes} min read`;
  }, [content]);
  
  if (!estimate) return null;
  
  return (
    <span className="text-xs text-gray-500 flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {estimate}
    </span>
  );
});

export default SmartMessageContent;
