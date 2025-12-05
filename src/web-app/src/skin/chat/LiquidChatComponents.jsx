// @version 3.3.45
// TooLoo.ai Liquid Chat Components
// v3.3.44 - Enhanced EnhancedMarkdown to parse Python/Executor code formats
// v3.3.35 - Added Execute button for team-validated code execution in chat
// Rich visual display capabilities for chat responses
// Integrates liquid skin throughout the chat experience
// Enhanced with Visual Renderers for creative AI responses

import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useLiquidEngine, EMOTIONS } from '../effects/LiquidEngine';
import { useTooLooPresence, TooLooEye, TooLooBreath } from '../TooLooPresence';
import { LiquidGlass, BreathIndicator } from '../effects/LiquidEngine';
import { NeuralMesh, DataFlow, ActivityRings } from '../effects/NeuralMesh';
import ReactMarkdown from 'react-markdown';
import {
  SVGRenderer,
  ReactComponentRenderer,
  InfographicCard,
  AnimatedTimeline,
  ComparisonTable,
  MindMapNode,
  DocumentPreview,
  UniversalCodeSandbox,
} from './VisualRenderers';

// ============================================================================
// TOOLOO AVATAR - Animated presence indicator for chat
// ============================================================================

export const TooLooAvatar = memo(
  ({
    size = 40,
    state = 'idle', // idle, thinking, speaking, excited, success, error
    showBreath = true,
    showEye = true,
    className = '',
  }) => {
    const { getEmotionValues, animationManager } = useLiquidEngine();
    const avatarRef = useRef(null);
    const glowRef = useRef(null);

    const stateConfig = {
      idle: { pulse: 0.3, glow: 0.2, hueShift: 0 },
      thinking: { pulse: 0.8, glow: 0.5, hueShift: 60 },
      speaking: { pulse: 0.6, glow: 0.4, hueShift: 0 },
      excited: { pulse: 1.0, glow: 0.8, hueShift: -30 },
      success: { pulse: 0.5, glow: 0.6, hueShift: -55 },
      error: { pulse: 0.9, glow: 0.7, hueShift: -200 },
    };

    const config = stateConfig[state] || stateConfig.idle;

    useEffect(() => {
      if (!animationManager || !glowRef.current) return;

      const unsubscribe = animationManager.subscribe(`avatar-${Date.now()}`, ({ frame }) => {
        const emotionVals = getEmotionValues();
        const pulse = Math.sin(frame * 0.05 * config.pulse) * 0.5 + 0.5;
        const hue = emotionVals.hue + config.hueShift;

        if (glowRef.current) {
          glowRef.current.style.boxShadow = `
          0 0 ${20 * config.glow * (0.5 + pulse * 0.5)}px hsla(${hue}, 80%, 50%, ${0.3 * config.glow}),
          0 0 ${40 * config.glow * (0.5 + pulse * 0.5)}px hsla(${hue}, 80%, 50%, ${0.15 * config.glow})
        `;
          glowRef.current.style.background = `
          radial-gradient(circle at 30% 30%, 
            hsla(${hue}, 80%, 70%, 0.3) 0%, 
            hsla(${hue}, 70%, 50%, 0.1) 50%, 
            transparent 70%)
        `;
        }
      });

      return unsubscribe;
    }, [animationManager, getEmotionValues, config]);

    return (
      <div
        ref={avatarRef}
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Breath indicator background */}
        {showBreath && (
          <div className="absolute inset-0 flex items-center justify-center">
            <BreathIndicator size={size > 36 ? 'md' : 'sm'} showPulse={state === 'thinking'} />
          </div>
        )}

        {/* Main avatar circle */}
        <div
          ref={glowRef}
          className="relative rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            width: size * 0.8,
            height: size * 0.8,
            background: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          {showEye ? <TooLooEye size={size * 0.5} /> : <span className="text-lg">🤖</span>}
        </div>

        {/* State indicator ring */}
        {state !== 'idle' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor:
                state === 'error'
                  ? 'rgba(239, 68, 68, 0.5)'
                  : state === 'success'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : state === 'thinking'
                      ? 'rgba(139, 92, 246, 0.5)'
                      : 'rgba(6, 182, 212, 0.5)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    );
  }
);

TooLooAvatar.displayName = 'TooLooAvatar';

// ============================================================================
// LIQUID MESSAGE BUBBLE - Enhanced message with liquid skin effects
// ============================================================================

export const LiquidMessageBubble = memo(
  ({ message, isUser, isLatest, isStreaming, showAvatar = true, onReact, className = '' }) => {
    const { getEmotionValues, getAnimationState } = useLiquidEngine();
    const bubbleRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    // Determine avatar state
    const avatarState = isStreaming
      ? 'speaking'
      : message.error
        ? 'error'
        : isLatest
          ? 'idle'
          : 'idle';

    // Parse special content blocks from message
    const { textContent, specialBlocks } = useMemo(() => {
      const blocks = [];
      let text = message.content || '';

      // Extract code blocks
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(text)) !== null) {
        blocks.push({ type: 'code', language: match[1] || 'text', content: match[2] });
      }

      // Extract special TooLoo blocks (e.g., [[chart:...]], [[status:...]])
      const specialBlockRegex = /\[\[(\w+):([^\]]+)\]\]/g;
      while ((match = specialBlockRegex.exec(text)) !== null) {
        blocks.push({ type: match[1], content: match[2] });
        text = text.replace(match[0], '');
      }

      return { textContent: text, specialBlocks: blocks };
    }, [message.content]);

    return (
      <motion.div
        ref={bubbleRef}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group ${className}`}
      >
        {/* TooLoo Avatar (for AI messages) */}
        {!isUser && showAvatar && (
          <div className="flex-shrink-0 mr-3">
            <TooLooAvatar size={36} state={avatarState} showBreath={isStreaming} />
          </div>
        )}

        <div className="max-w-[80%] relative">
          {/* Main bubble with liquid glass effect */}
          <LiquidGlass
            intensity={isHovered ? 0.8 : 0.4}
            refraction={!isUser}
            ripple={!isUser && isLatest}
            glow={isLatest && !isUser}
            className={`
            px-4 py-3 rounded-2xl transition-all duration-300
            ${
              isUser
                ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-500/40 rounded-br-md'
                : 'bg-gradient-to-br from-purple-500/10 to-white/5 border border-white/20 rounded-bl-md'
            }
            ${isStreaming ? 'ring-2 ring-cyan-400/50' : ''}
          `}
          >
            {/* Message content */}
            <div className={`text-sm ${isUser ? 'text-cyan-100' : 'text-gray-200'}`}>
              {isUser ? (
                <p className="break-words">{message.content}</p>
              ) : (
                <EnhancedMarkdown content={textContent} isStreaming={isStreaming} />
              )}
            </div>

            {/* Special blocks (charts, status, etc.) */}
            {!isUser && specialBlocks.length > 0 && (
              <div className="mt-3 space-y-2">
                {specialBlocks.map((block, i) => (
                  <SpecialBlock key={i} block={block} />
                ))}
              </div>
            )}

            {/* Message metadata */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.provider && (
                <ProviderBadge provider={message.provider} model={message.model} />
              )}
              {isStreaming && <StreamingIndicator />}
            </div>
          </LiquidGlass>

          {/* Reaction buttons (shown on hover for AI messages) */}
          {!isUser && isHovered && !isStreaming && (
            <ReactionBar onReact={onReact} messageId={message.id} />
          )}
        </div>

        {/* User Avatar */}
        {isUser && showAvatar && (
          <div className="flex-shrink-0 ml-3">
            <div className="w-9 h-9 rounded-full bg-cyan-500/30 flex items-center justify-center">
              <span className="text-sm">👤</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

LiquidMessageBubble.displayName = 'LiquidMessageBubble';

// ============================================================================
// ENHANCED MARKDOWN - Rich markdown rendering with visual block support
// ============================================================================

export const EnhancedMarkdown = memo(({ content, isStreaming }) => {
  // Extract and render visual blocks (SVG, JSX, embedded code) separately
  const { textParts, visualBlocks } = useMemo(() => {
    const parts = [];
    const visuals = [];
    let processedContent = content || '';
    let lastIndex = 0;

    // PHASE 1: Extract embedded React code from various formats
    // Format 1: Python triple-quoted strings (react_code = """...""")
    const pythonReactRegex = /react_code\s*=\s*(?:"""|'''|")([\s\S]*?)(?:"""|'''|")/g;
    let match;
    
    // Collect all embedded code first
    const embeddedCode = [];
    while ((match = pythonReactRegex.exec(processedContent)) !== null) {
      const code = match[1].trim();
      if (code.includes('import React') || code.includes('useState') || code.includes('function') || code.includes('const')) {
        embeddedCode.push({ type: 'jsx', code, index: match.index, length: match[0].length });
      }
    }

    // Format 2: Executor/Validator comments with code blocks
    const executorRegex = /# (?:Executor|Validator)[^:]*:\s*\n([\s\S]*?)(?=\n#|$)/g;
    while ((match = executorRegex.exec(processedContent)) !== null) {
      const code = match[1].trim();
      if (code && !code.startsWith('import subprocess')) {
        embeddedCode.push({ type: 'text', code, index: match.index, length: match[0].length });
      }
    }

    // Reset for main parsing
    lastIndex = 0;

    // PHASE 2: Find SVG blocks - ```svg format
    const svgRegex = /```svg\n([\s\S]*?)```/g;
    while ((match = svgRegex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: processedContent.substring(lastIndex, match.index) });
      }
      visuals.push({ type: 'svg', code: match[1], index: parts.length });
      parts.push({ type: 'svg', code: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // PHASE 3: Find JSX/React blocks - ```jsx or ```react format
    const jsxRegex = /```(?:jsx|react|javascript)\n([\s\S]*?)```/g;
    processedContent = content || ''; // Reset
    while ((match = jsxRegex.exec(processedContent)) !== null) {
      // Check if this overlaps with already processed parts
      const alreadyProcessed = parts.some(p => 
        p.type !== 'text' && match.index >= lastIndex && match.index < lastIndex + (p.code?.length || 0)
      );
      
      if (!alreadyProcessed && match.index >= lastIndex) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: processedContent.substring(lastIndex, match.index) });
        }
        visuals.push({ type: 'jsx', code: match[1], index: parts.length });
        parts.push({ type: 'jsx', code: match[1] });
        lastIndex = match.index + match[0].length;
      }
    }

    // PHASE 4: Extract raw SVG code (not in code blocks)
    const rawSvgRegex = /(<svg[^>]*>[\s\S]*?<\/svg>)/gi;
    processedContent = content || '';
    while ((match = rawSvgRegex.exec(processedContent)) !== null) {
      const alreadyProcessed = parts.some(p => p.type === 'svg' && p.code === match[1]);
      if (!alreadyProcessed) {
        // Only add if it looks like a complete SVG
        if (match[1].includes('viewBox') || match[1].includes('width')) {
          visuals.push({ type: 'svg', code: match[1], index: parts.length, raw: true });
          // Don't add to parts - let it render inline for now
        }
      }
    }

    // Add remaining text
    if (lastIndex < (content?.length || 0)) {
      parts.push({ type: 'text', content: (content || '').substring(lastIndex) });
    }

    // If no visual blocks found, return all as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: content || '' });
    }

    return { textParts: parts, visualBlocks: visuals };
  }, [content]);

  return (
    <div className="prose prose-invert prose-sm max-w-none break-words">
      {textParts.map((part, index) => {
        if (part.type === 'svg') {
          return (
            <SVGRenderer
              key={`svg-${index}`}
              code={part.code}
              title="Generated Diagram"
              className="my-4"
            />
          );
        }

        if (part.type === 'jsx') {
          return (
            <ReactComponentRenderer
              key={`jsx-${index}`}
              code={part.code}
              title="Interactive Component"
              className="my-4"
            />
          );
        }

        // Render text as markdown
        return (
          <ReactMarkdown
            key={`text-${index}`}
            components={{
              // Code blocks with syntax highlighting
              code: ({ node, inline, className, children, ...props }) => {
                const language = className?.replace('language-', '') || 'text';

                return inline ? (
                  <code
                    className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <LiquidCodeBlock language={language} {...props}>
                    {children}
                  </LiquidCodeBlock>
                );
              },

              // Enhanced paragraphs with better readability
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 leading-relaxed text-gray-200 text-[15px]">
                  {children}
                </p>
              ),

              // Bold text stands out more
              strong: ({ children }) => (
                <strong className="font-bold text-white">{children}</strong>
              ),

              // Emphasized text with color
              em: ({ children }) => (
                <em className="italic text-cyan-200 not-italic font-medium">{children}</em>
              ),

              // Lists with enhanced visual markers
              ul: ({ children }) => (
                <ul className="list-none pl-0 mb-3 space-y-2">
                  {React.Children.map(children, (child) =>
                    React.isValidElement(child) ? (
                      <li className="flex items-start gap-2 text-[15px]">
                        <span className="text-cyan-400 mt-0.5 text-sm">●</span>
                        <span className="text-gray-200">{child.props.children}</span>
                      </li>
                    ) : (
                      child
                    )
                  )}
                </ul>
              ),

              ol: ({ children, start }) => {
                let counter = start || 1;
                return (
                  <ol className="list-none pl-0 mb-3 space-y-2">
                    {React.Children.map(children, (child) => {
                      if (React.isValidElement(child)) {
                        const num = counter++;
                        return (
                          <li className="flex items-start gap-3 text-[15px]">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center">
                              {num}
                            </span>
                            <span className="text-gray-200 pt-0.5">{child.props.children}</span>
                          </li>
                        );
                      }
                      return child;
                    })}
                  </ol>
                );
              },

              // Enhanced links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                >
                  {children}
                </a>
              ),

              // Blockquotes with liquid styling
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-purple-500/50 pl-4 py-1 my-2 bg-purple-500/10 rounded-r-lg italic text-gray-300">
                  {children}
                </blockquote>
              ),

              // Headers - Enhanced visual hierarchy
              h1: ({ children }) => (
                <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-3 mt-4 tracking-tight">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-white mb-2 mt-4 border-b border-white/10 pb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-cyan-300 mb-2 mt-3">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold text-purple-300 mb-1 mt-2 uppercase tracking-wide">
                  {children}
                </h4>
              ),

              // Tables with liquid glass
              table: ({ children }) => (
                <div className="overflow-x-auto my-2 rounded-lg border border-white/10">
                  <table className="w-full text-xs">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 bg-white/10 text-left font-medium text-gray-300 border-b border-white/10">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 border-b border-white/5 text-gray-400">{children}</td>
              ),

              // Horizontal rule
              hr: () => (
                <div className="my-4 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              ),
            }}
          >
            {part.content}
          </ReactMarkdown>
        );
      })}

      {/* Streaming cursor */}
      {isStreaming && (
        <motion.span
          className="inline-block w-2 h-4 bg-cyan-400 ml-1"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
});

EnhancedMarkdown.displayName = 'EnhancedMarkdown';

// ============================================================================
// LIQUID CODE BLOCK - Syntax highlighted code with copy & execute buttons
// v3.3.33 - Added Execute button for team-validated code execution
// ============================================================================

// Execution languages that can be run
const EXECUTABLE_LANGUAGES = [
  'javascript',
  'js',
  'typescript',
  'ts',
  'python',
  'py',
  'shell',
  'bash',
  'sh',
];

export const LiquidCodeBlock = memo(({ language, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const codeString = String(children).replace(/\n$/, '');

  // Determine if this code can be executed
  const canExecute = EXECUTABLE_LANGUAGES.includes((language || '').toLowerCase());

  // Map language to execution type
  const getExecutionType = () => {
    const lang = (language || '').toLowerCase();
    if (['javascript', 'js'].includes(lang)) return 'javascript';
    if (['typescript', 'ts'].includes(lang)) return 'typescript';
    if (['python', 'py'].includes(lang)) return 'python';
    if (['shell', 'bash', 'sh'].includes(lang)) return 'shell';
    return 'typescript';
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (executing) return;

    setExecuting(true);
    setExecutionResult(null);

    try {
      const response = await fetch('/api/v1/agent/task/team-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: `Execute the following ${language} code`,
          code: codeString,
          language: getExecutionType(),
          specialization: 'code-execution',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setExecutionResult({
          success: true,
          output: result.data?.output || result.data?.result || 'Execution completed',
          qualityScore: result.data?.qualityScore || result.data?.quality_score,
          executedBy: result.data?.team || result.data?.executor,
          validatedBy: result.data?.validatedBy,
        });
      } else {
        setExecutionResult({
          success: false,
          error: result.error || 'Execution failed',
        });
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err.message || 'Failed to execute code',
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/10">
        <span className="text-xs text-gray-500 font-mono">{language}</span>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className={`text-xs px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                executing
                  ? 'bg-purple-500/20 text-purple-300 cursor-wait'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
              }`}
            >
              {executing ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ⚡
                  </motion.span>
                  Running...
                </>
              ) : (
                <>▶ Execute</>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <pre className="bg-black/40 p-4 overflow-x-auto text-xs">
        <code className={`language-${language} text-gray-300 font-mono`} {...props}>
          {children}
        </code>
      </pre>

      {/* Execution result panel */}
      <AnimatePresence>
        {executionResult && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div
              className={`p-3 ${executionResult.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}
            >
              {/* Result header */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-medium ${executionResult.success ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {executionResult.success ? '✓ Execution Successful' : '✕ Execution Failed'}
                </span>
                {executionResult.qualityScore && (
                  <span className="text-xs text-cyan-400">
                    Quality: {(executionResult.qualityScore * 100).toFixed(0)}%
                  </span>
                )}
                <button
                  onClick={() => setExecutionResult(null)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Output/Error content */}
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {executionResult.success ? executionResult.output : executionResult.error}
              </pre>

              {/* Team info */}
              {executionResult.executedBy && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-500">
                  Executed by: <span className="text-purple-400">{executionResult.executedBy}</span>
                  {executionResult.validatedBy && (
                    <>
                      {' '}
                      • Validated by:{' '}
                      <span className="text-cyan-400">{executionResult.validatedBy}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5" />
      </div>
    </div>
  );
});

LiquidCodeBlock.displayName = 'LiquidCodeBlock';

// ============================================================================
// SPECIAL BLOCKS - Charts, Status, Progress, etc.
// ============================================================================

const SpecialBlock = memo(({ block }) => {
  switch (block.type) {
    case 'status':
      return <StatusBlock content={block.content} />;
    case 'progress':
      return <ProgressBlock content={block.content} />;
    case 'chart':
      return <ChartBlock content={block.content} />;
    case 'activity':
      return <ActivityBlock content={block.content} />;
    case 'card':
      return <InfoCard content={block.content} />;
    case 'emotion':
      return <EmotionDisplay content={block.content} />;
    default:
      return null;
  }
});

SpecialBlock.displayName = 'SpecialBlock';

// Status indicator block
const StatusBlock = memo(({ content }) => {
  const [status, message] = content.split('|');
  const statusColors = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    info: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
    processing: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
    processing: '⟳',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusColors[status] || statusColors.info}`}
    >
      <span className={status === 'processing' ? 'animate-spin' : ''}>
        {icons[status] || icons.info}
      </span>
      <span className="text-sm">{message}</span>
    </motion.div>
  );
});

// Progress bar block
const ProgressBlock = memo(({ content }) => {
  const [label, valueStr] = content.split('|');
  const value = parseFloat(valueStr) || 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-cyan-400 font-mono">{value}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
});

// Chart/visualization block
const ChartBlock = memo(({ content }) => {
  const [type, dataStr] = content.split('|');

  // Parse simple data format: "label1:value1,label2:value2"
  const data =
    dataStr?.split(',').map((item) => {
      const [label, value] = item.split(':');
      return { label, value: parseFloat(value) || 0 };
    }) || [];

  if (type === 'bars') {
    const maxValue = Math.max(...data.map((d) => d.value));
    return (
      <div className="space-y-2 p-3 bg-black/20 rounded-lg">
        {data.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{item.label}</span>
              <span className="text-gray-300">{item.value}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, hsl(${180 + i * 30}, 70%, 50%), hsl(${200 + i * 30}, 70%, 50%))`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default to activity rings
  return (
    <div className="flex justify-center p-4">
      <ActivityRings
        rings={data.map((d, i) => ({ value: d.value / 100, label: d.label }))}
        size={100}
      />
    </div>
  );
});

// Activity/neural visualization block
const ActivityBlock = memo(({ content }) => {
  return (
    <div className="relative h-24 rounded-lg overflow-hidden bg-black/30">
      <DataFlow direction="horizontal" speed={1} density={5} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">{content}</span>
      </div>
    </div>
  );
});

// Info card block
const InfoCard = memo(({ content }) => {
  const [title, description, icon] = content.split('|');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10"
    >
      <div className="flex items-start gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    </motion.div>
  );
});

// Emotion display block
const EmotionDisplay = memo(({ content }) => {
  const [emotion, intensityStr] = content.split('|');
  const intensity = parseFloat(intensityStr) || 0.5;
  const emotionData = EMOTIONS[emotion] || EMOTIONS.neutral;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20">
      <motion.div
        className="w-12 h-12 rounded-full"
        style={{
          background: `radial-gradient(circle, hsla(${emotionData.hue}, ${emotionData.saturation}%, 60%, ${intensity}) 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div>
        <div className="text-sm font-medium text-white capitalize">{emotion}</div>
        <div className="text-xs text-gray-400">Intensity: {Math.round(intensity * 100)}%</div>
      </div>
    </div>
  );
});

// ============================================================================
// PROVIDER LOGO - Official SVG logos for AI providers
// ============================================================================

const ProviderLogoSVG = memo(({ provider, size = 14, className = '' }) => {
  const normalizedProvider = (provider || '').toLowerCase();

  // Official-style SVG logos
  if (normalizedProvider.includes('gemini')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4" />
        <path d="M2 17L12 22L22 17" stroke="#4285F4" strokeWidth="2" fill="none" />
        <path d="M2 12L12 17L22 12" stroke="#4285F4" strokeWidth="2" fill="none" />
      </svg>
    );
  }

  if (normalizedProvider.includes('claude') || normalizedProvider.includes('anthropic')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="#D97706" />
        <path
          d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="14" r="2" fill="white" />
      </svg>
    );
  }

  if (normalizedProvider.includes('gpt') || normalizedProvider.includes('openai')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M22.28 9.82a5.98 5.98 0 00-.52-4.91 6.05 6.05 0 00-6.51-2.9A6.07 6.07 0 004.98 4.18a5.98 5.98 0 00-4 2.9 6.05 6.05 0 00.74 7.1 5.98 5.98 0 00.51 4.91 6.05 6.05 0 006.52 2.9 5.98 5.98 0 004.5 2.01 6.06 6.06 0 005.77-4.21 5.99 5.99 0 004-2.9 6.06 6.06 0 00-.75-7.07z"
          fill="#10B981"
        />
      </svg>
    );
  }

  if (normalizedProvider.includes('deepseek')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#7C3AED" />
        <path d="M12 6L6 12L12 18L18 12L12 6Z" fill="white" />
        <circle cx="12" cy="12" r="2" fill="#7C3AED" />
      </svg>
    );
  }

  // TooLoo / default
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#06B6D4" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4" fill="#06B6D4" />
      <circle cx="12" cy="12" r="1.5" fill="white" />
    </svg>
  );
});

ProviderLogoSVG.displayName = 'ProviderLogoSVG';

// ============================================================================
// PROVIDER BADGE - Shows which AI provider generated the response
// Real provider names and model identifiers
// ============================================================================

export const ProviderBadge = memo(({ provider, model }) => {
  // Normalize provider and model names for lookup
  const normalizedProvider = (provider || '').toLowerCase();
  const normalizedModel = (model || '').toLowerCase();

  // Real provider configurations with actual model names
  const providerConfig = {
    // Google Gemini models
    'gemini-2.5-flash': {
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      displayName: 'Gemini 2.5 Flash',
      company: 'Google',
    },
    'gemini-2.5-pro': {
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      displayName: 'Gemini 2.5 Pro',
      company: 'Google',
    },
    'gemini-3-pro': {
      color: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      displayName: 'Gemini 3 Pro',
      company: 'Google',
    },
    gemini: {
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      displayName: 'Gemini',
      company: 'Google',
    },

    // Anthropic Claude models
    'claude-sonnet-4': {
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      displayName: 'Claude Sonnet 4',
      company: 'Anthropic',
    },
    'claude-sonnet-4.5': {
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      displayName: 'Claude Sonnet 4.5',
      company: 'Anthropic',
    },
    'claude-opus-4': {
      color: 'bg-orange-600/20 text-orange-300 border-orange-500/30',
      displayName: 'Claude Opus 4',
      company: 'Anthropic',
    },
    'claude-haiku': {
      color: 'bg-orange-400/20 text-orange-300 border-orange-400/30',
      displayName: 'Claude Haiku',
      company: 'Anthropic',
    },
    claude: {
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      displayName: 'Claude',
      company: 'Anthropic',
    },
    anthropic: {
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      displayName: 'Claude',
      company: 'Anthropic',
    },

    // OpenAI models
    'gpt-4o': {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      displayName: 'GPT-4o',
      company: 'OpenAI',
    },
    'gpt-4-turbo': {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      displayName: 'GPT-4 Turbo',
      company: 'OpenAI',
    },
    'gpt-4': {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      displayName: 'GPT-4',
      company: 'OpenAI',
    },
    'gpt-5': {
      color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
      displayName: 'GPT-5',
      company: 'OpenAI',
    },
    o1: {
      color: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
      displayName: 'o1',
      company: 'OpenAI',
    },
    openai: {
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      displayName: 'OpenAI',
      company: 'OpenAI',
    },

    // DeepSeek models
    'deepseek-v3': {
      color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      displayName: 'DeepSeek V3',
      company: 'DeepSeek',
    },
    'deepseek-coder': {
      color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      displayName: 'DeepSeek Coder',
      company: 'DeepSeek',
    },
    deepseek: {
      color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      displayName: 'DeepSeek',
      company: 'DeepSeek',
    },

    // TooLoo (orchestrator)
    tooloo: {
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      displayName: 'TooLoo',
      company: 'Synapsys',
    },
    synapsys: {
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      displayName: 'Synapsys',
      company: 'TooLoo',
    },

    // System/default
    system: {
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      displayName: 'System',
      company: '',
    },
  };

  // Find best matching config
  const findConfig = () => {
    // Check model first for specific match
    for (const [key, config] of Object.entries(providerConfig)) {
      if (normalizedModel.includes(key) || normalizedProvider.includes(key)) {
        return config;
      }
    }
    // Fallback matches
    if (normalizedProvider.includes('gemini') || normalizedModel.includes('gemini'))
      return providerConfig.gemini;
    if (normalizedProvider.includes('claude') || normalizedProvider.includes('anthropic'))
      return providerConfig.claude;
    if (normalizedProvider.includes('gpt') || normalizedProvider.includes('openai'))
      return providerConfig.openai;
    if (normalizedProvider.includes('deepseek')) return providerConfig.deepseek;
    if (normalizedProvider.includes('tooloo')) return providerConfig.tooloo;
    return providerConfig.system;
  };

  const config = findConfig();

  // Format model name for display
  const formatModelName = () => {
    if (model) {
      // Clean up model name - capitalize properly
      return model
        .replace(/-/g, ' ')
        .replace(/(\d+\.?\d*)/g, ' $1')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .replace(/Gpt/g, 'GPT')
        .replace(/Ai/g, 'AI')
        .trim();
    }
    return config.displayName;
  };

  const displayName = model ? formatModelName() : config.displayName;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-xs px-2.5 py-1 rounded-full border ${config.color} flex items-center gap-1.5 font-medium`}
    >
      <ProviderLogoSVG provider={provider || model} size={14} />
      <span>{displayName}</span>
      {config.company && <span className="text-[10px] opacity-60">• {config.company}</span>}
    </motion.span>
  );
});

ProviderBadge.displayName = 'ProviderBadge';

// ============================================================================
// STREAMING INDICATOR - Shows real-time streaming state
// ============================================================================

export const StreamingIndicator = memo(() => {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-cyan-400"
            animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span className="text-xs text-cyan-400">streaming</span>
    </div>
  );
});

StreamingIndicator.displayName = 'StreamingIndicator';

// ============================================================================
// REACTION BAR - Quick reactions for messages
// ============================================================================

const ReactionBar = memo(({ onReact, messageId }) => {
  const reactions = [
    { emoji: '👍', label: 'Helpful' },
    { emoji: '❤️', label: 'Love it' },
    { emoji: '🤔', label: 'Interesting' },
    { emoji: '📋', label: 'Copy' },
    { emoji: '🔄', label: 'Regenerate' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="absolute -bottom-8 left-0 flex gap-1 p-1 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10"
    >
      {reactions.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => onReact?.(messageId, emoji)}
          title={label}
          className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
});

ReactionBar.displayName = 'ReactionBar';

// ============================================================================
// LIQUID THINKING INDICATOR - Enhanced thinking state visualization
// ============================================================================

export const LiquidThinkingIndicator = memo(({ stage = 'thinking', showNeural = true }) => {
  const stages = {
    connecting: {
      text: 'Connecting to neural network...',
      color: 'amber',
      icon: '🔗',
    },
    thinking: {
      text: 'TooLoo is thinking...',
      color: 'purple',
      icon: '🧠',
    },
    analyzing: {
      text: 'Analyzing your request...',
      color: 'cyan',
      icon: '🔍',
    },
    generating: {
      text: 'Generating response...',
      color: 'emerald',
      icon: '✨',
    },
    creating: {
      text: 'Creating something new...',
      color: 'pink',
      icon: '🎨',
    },
  };

  const config = stages[stage] || stages.thinking;

  const colorClasses = {
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start mb-4"
    >
      <div className="flex items-start gap-3">
        <TooLooAvatar size={36} state="thinking" showBreath />

        <div
          className={`px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-br border ${colorClasses[config.color]}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{config.icon}</span>

            {/* Neural visualization */}
            {showNeural && (
              <div className="w-16 h-8 relative overflow-hidden rounded">
                <DataFlow direction="horizontal" speed={2} density={3} />
              </div>
            )}

            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className={`w-2 h-2 rounded-full bg-${config.color}-400`}
                  style={{ backgroundColor: `var(--${config.color}-400, #a855f7)` }}
                />
              ))}
            </div>

            <span className="text-xs text-gray-300">{config.text}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

LiquidThinkingIndicator.displayName = 'LiquidThinkingIndicator';

// ============================================================================
// WELCOME MESSAGE - Rich welcome with TooLoo presence
// ============================================================================

export const WelcomeMessage = memo(({ onQuickAction }) => {
  const visualCapabilities = [
    { icon: '📊', label: 'Charts & Graphs', desc: 'Bar, line, pie charts', color: 'cyan' },
    { icon: '🔄', label: 'Diagrams', desc: 'Flow & architecture', color: 'purple' },
    { icon: '📅', label: 'Timelines', desc: 'Visual histories', color: 'emerald' },
    { icon: '🎨', label: 'Infographics', desc: 'Data visualization', color: 'pink' },
    { icon: '⚡', label: 'Animations', desc: 'Dynamic visuals', color: 'amber' },
    { icon: '🧩', label: 'Components', desc: 'Live React code', color: 'blue' },
  ];

  const quickActions = [
    {
      icon: '📈',
      label: 'Visualize data',
      action: 'Create a chart showing monthly sales growth',
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      icon: '🔮',
      label: 'Explain with diagrams',
      action: 'Draw a diagram explaining how React works',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '📊',
      label: 'Build infographic',
      action: 'Create an infographic about AI trends',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: '🎭',
      label: 'Surprise me!',
      action: 'Show me something creative and unexpected',
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  const colorClasses = {
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    pink: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-8 px-6"
    >
      {/* TooLoo presence with enhanced visuals */}
      <div className="relative mb-6">
        <TooLooAvatar size={80} state="idle" showBreath showEye />
        <motion.div
          className="absolute -inset-6 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2), rgba(6, 182, 212, 0.2))',
          }}
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            scale: { duration: 3, repeat: Infinity },
          }}
        />
        <motion.div
          className="absolute -inset-2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Welcome text */}
      <h2 className="text-2xl font-bold text-white mb-2">
        Welcome to{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse">
          TooLoo
        </span>
      </h2>
      <p className="text-gray-400 text-center max-w-lg mb-4">
        I'm your AI companion with <span className="text-cyan-400">visual superpowers</span>. I
        don't just talk — I <span className="text-purple-400">draw</span>,{' '}
        <span className="text-pink-400">animate</span>, and{' '}
        <span className="text-emerald-400">visualize</span>.
      </p>

      {/* Visual capabilities showcase */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-lg">
        {visualCapabilities.map(({ icon, label, desc, color }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.05, y: -2 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClasses[color]} text-xs`}
          >
            <span>{icon}</span>
            <span className="font-medium">{label}</span>
          </motion.div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

      {/* Quick action buttons - enhanced */}
      <p className="text-sm text-gray-500 mb-3">Try something visual:</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {quickActions.map(({ icon, label, action, gradient }) => (
          <motion.button
            key={label}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onQuickAction?.(action)}
            className="relative flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left overflow-hidden group"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
            />
            <span className="text-xl relative z-10">{icon}</span>
            <span className="text-sm text-gray-300 relative z-10">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Inspiration hint */}
      <motion.p
        className="text-xs text-gray-600 mt-6 text-center"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        ✨ Ask me anything and I'll find the best way to show you
      </motion.p>
    </motion.div>
  );
});

WelcomeMessage.displayName = 'WelcomeMessage';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  TooLooAvatar,
  LiquidMessageBubble,
  LiquidThinkingIndicator,
  WelcomeMessage,
  EnhancedMarkdown,
  LiquidCodeBlock,
  ProviderBadge,
  StreamingIndicator,
  UniversalCodeSandbox,
};
