/**
 * useSmartStream.js - Progressive UX Response System
 * 
 * Provides smooth, readable streaming with:
 * - Quick initial response (TLDR first)
 * - Reading-time-aware pacing
 * - Background processing for heavy content
 * - Collapsible detail sections
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Average reading speed (words per minute)
const READING_SPEED_WPM = 250;
const WORDS_PER_CHUNK = 15; // ~3.6 seconds per chunk at reading speed

/**
 * Calculate display delay based on content length
 * Gives user time to read before showing more
 */
function calculateReadingDelay(text, speedMultiplier = 1.0) {
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  const minutesToRead = words / READING_SPEED_WPM;
  const msToRead = minutesToRead * 60 * 1000;
  // Add base delay + reading time, capped
  return Math.min(Math.max(50, msToRead * speedMultiplier), 2000);
}

/**
 * Parse response into progressive sections
 * Prioritizes showing quick answer first
 */
function parseProgressiveSections(content) {
  if (!content) return { quickAnswer: '', sections: [], background: [] };

  const lines = content.split('\n');
  const sections = [];
  let quickAnswer = '';
  let currentSection = null;
  let background = [];

  for (const line of lines) {
    // Detect section headers (##, ###, **Bold:**)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/) || line.match(/^\*\*(.+?):\*\*/);
    
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2] || headerMatch[1],
        content: '',
        priority: headerMatch[1]?.length === 1 ? 'high' : 'medium',
        collapsed: sections.length > 2, // Collapse after first 2 sections
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    } else {
      // First content before any header = quick answer
      if (line.trim() && !quickAnswer) {
        quickAnswer = line.trim();
      } else if (line.trim()) {
        quickAnswer += ' ' + line.trim();
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Identify background-processable content (code blocks, long sections)
  sections.forEach((section, i) => {
    const hasCode = section.content.includes('```');
    const isLong = section.content.length > 500;
    if (hasCode || isLong) {
      section.isHeavy = true;
      section.collapsed = true;
    }
  });

  return { quickAnswer: quickAnswer.slice(0, 200), sections, background };
}

/**
 * Smart streaming states
 */
export const StreamPhase = {
  IDLE: 'idle',
  THINKING: 'thinking',      // Initial processing indicator
  QUICK_ANSWER: 'quick',     // First fast response
  STREAMING: 'streaming',    // Main content streaming
  BACKGROUND: 'background',  // Heavy content loading in background
  COMPLETE: 'complete',
};

/**
 * useSmartStream - Progressive response rendering
 * 
 * Features:
 * - Shows "thinking" for 200-400ms (feels responsive)
 * - Displays quick answer immediately
 * - Streams main content at readable pace
 * - Defers heavy content (code, tables) to background
 */
export function useSmartStream(options = {}) {
  const {
    readingSpeedMultiplier = 1.0,
    showThinkingMs = 300,
    enableQuickAnswer = true,
    deferHeavyContent = true,
  } = options;

  const [phase, setPhase] = useState(StreamPhase.IDLE);
  const [displayedContent, setDisplayedContent] = useState('');
  const [quickAnswer, setQuickAnswer] = useState('');
  const [sections, setSections] = useState([]);
  const [backgroundQueue, setBackgroundQueue] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);

  const fullContentRef = useRef('');
  const streamIndexRef = useRef(0);
  const animationRef = useRef(null);

  /**
   * Start streaming a response
   */
  const startStream = useCallback(() => {
    setPhase(StreamPhase.THINKING);
    setDisplayedContent('');
    setQuickAnswer('');
    setSections([]);
    setProgressPercent(0);
    fullContentRef.current = '';
    streamIndexRef.current = 0;

    // Show thinking indicator briefly
    setTimeout(() => {
      setPhase(StreamPhase.QUICK_ANSWER);
    }, showThinkingMs);
  }, [showThinkingMs]);

  /**
   * Add chunk to stream
   */
  const addChunk = useCallback((chunk) => {
    fullContentRef.current += chunk;
    const full = fullContentRef.current;

    // Parse for quick answer
    if (phase === StreamPhase.QUICK_ANSWER || phase === StreamPhase.THINKING) {
      const parsed = parseProgressiveSections(full);
      
      if (parsed.quickAnswer && enableQuickAnswer) {
        setQuickAnswer(parsed.quickAnswer);
        setPhase(StreamPhase.STREAMING);
      }
    }

    // Update displayed content progressively
    const targetLength = full.length;
    const currentLength = streamIndexRef.current;
    
    // Calculate how much to show based on reading time
    const chunkSize = Math.max(10, Math.min(50, targetLength - currentLength));
    const newIndex = Math.min(currentLength + chunkSize, targetLength);
    
    streamIndexRef.current = newIndex;
    setDisplayedContent(full.slice(0, newIndex));
    setProgressPercent(Math.round((newIndex / targetLength) * 100));
  }, [phase, enableQuickAnswer]);

  /**
   * Complete the stream
   */
  const completeStream = useCallback(() => {
    const full = fullContentRef.current;
    setDisplayedContent(full);
    
    // Parse final sections
    const parsed = parseProgressiveSections(full);
    setSections(parsed.sections);
    
    // Queue heavy content for background processing
    if (deferHeavyContent) {
      const heavy = parsed.sections.filter(s => s.isHeavy);
      setBackgroundQueue(heavy);
    }
    
    setProgressPercent(100);
    setPhase(StreamPhase.COMPLETE);
  }, [deferHeavyContent]);

  /**
   * Reset stream state
   */
  const resetStream = useCallback(() => {
    setPhase(StreamPhase.IDLE);
    setDisplayedContent('');
    setQuickAnswer('');
    setSections([]);
    setBackgroundQueue([]);
    setProgressPercent(0);
    fullContentRef.current = '';
    streamIndexRef.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  /**
   * Toggle section collapse state
   */
  const toggleSection = useCallback((index) => {
    setSections(prev => prev.map((s, i) => 
      i === index ? { ...s, collapsed: !s.collapsed } : s
    ));
  }, []);

  return {
    phase,
    displayedContent,
    quickAnswer,
    sections,
    backgroundQueue,
    progressPercent,
    isStreaming: phase === StreamPhase.STREAMING || phase === StreamPhase.THINKING,
    isComplete: phase === StreamPhase.COMPLETE,
    startStream,
    addChunk,
    completeStream,
    resetStream,
    toggleSection,
  };
}

/**
 * useTypingEffect - Typewriter effect for quick answers
 * Makes responses feel more natural and alive
 */
export function useTypingEffect(text, options = {}) {
  const {
    speed = 30, // ms per character
    startDelay = 0,
    enabled = true,
  } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText(text || '');
      return;
    }

    setIsTyping(true);
    let index = 0;
    
    const startTyping = () => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
      
      return () => clearInterval(interval);
    };

    const timeout = setTimeout(startTyping, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay, enabled]);

  return { displayedText, isTyping };
}

/**
 * useReadingProgress - Track reading progress on long content
 */
export function useReadingProgress(contentRef) {
  const [progress, setProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    const element = contentRef?.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsReading(entry.isIntersecting);
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [contentRef]);

  useEffect(() => {
    const element = contentRef?.current;
    if (!element || !isReading) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const scrollProgress = scrollTop / (scrollHeight - clientHeight);
      setProgress(Math.round(scrollProgress * 100));
    };

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [contentRef, isReading]);

  return { progress, isReading };
}

export default useSmartStream;
