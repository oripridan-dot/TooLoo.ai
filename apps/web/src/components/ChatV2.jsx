/**
 * ChatV2.jsx - Enhanced Chat Interface
 * Modern, visually stunning chat with all the bells and whistles
 *
 * Features:
 * - Glassmorphism design
 * - Markdown rendering with syntax highlighting
 * - Message reactions & editing
 * - File attachments with drag & drop
 * - Voice input/output
 * - Search functionality
 * - Code execution preview
 * - Typing indicators
 * - Theme support
 *
 * @version 4.0.0
 */

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useSocket';

// Icons as SVG components
const Icons = {
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Stop: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Play: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Mic: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  MicOff: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Attach: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Terminal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  ),
  ThumbsUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  ThumbsDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  ),
  Heart: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
};

// Reaction options
const REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '👎', label: 'Dislike' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '😂', label: 'Laugh' },
];

// Simple markdown parser for code blocks
function parseMarkdown(text) {
  if (!text) return [{ type: 'text', content: '' }];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'text', content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

// Format inline text
function formatInlineText(text) {
  if (!text) return text;
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-sm">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return text;
}

// Code Block Component
const CodeBlock = memo(function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    if (!['javascript', 'js'].includes(language?.toLowerCase())) return;
    setExecuting(true);
    try {
      // Provide common stub variables for example code snippets
      // This allows demo code to run without "undefined" errors
      const sandbox = `
        const firstInteraction = true;
        const deepDive = false;
        const showBriefIntro = () => console.log("Brief intro shown");
        const showDetailedInfo = () => console.log("Detailed info shown");
        const user = { name: "Demo User", preferences: {} };
        const context = { topic: "demo", history: [] };
        const data = [];
        const items = ["item1", "item2", "item3"];
        const result = null;
      `;
      const wrappedCode = `${sandbox}\n${code}`;
      
      // Capture console.log output
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' '));
      
      try {
        const result = new Function(wrappedCode)();
        console.log = originalLog;
        
        if (logs.length > 0) {
          setOutput(logs.join('\n'));
        } else {
          setOutput(String(result ?? 'undefined'));
        }
      } finally {
        console.log = originalLog;
      }
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
    setExecuting(false);
  };

  const canExecute = ['javascript', 'js'].includes(language?.toLowerCase());

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icons.Terminal />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            {language || 'text'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50"
            >
              {executing ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icons.Play />
              )}
              {executing ? 'Running...' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
          >
            {copied ? <Icons.Check /> : <Icons.Copy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Code content */}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed text-gray-200">{code}</code>
      </pre>
      
      {/* Output */}
      {output && (
        <div className="px-4 py-3 bg-black/40 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Icons.Terminal />
            <span>Output</span>
          </div>
          <pre className={`text-sm font-mono ${output.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
});

// Typing Indicator
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-4"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30">
        AI
      </div>
      <div className="flex items-center gap-1.5 px-5 py-4 rounded-2xl bg-gray-800/80 border border-white/10 backdrop-blur-sm">
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: '0.4s' }} />
      </div>
    </motion.div>
  );
});

// Message Content Renderer
const MessageContent = memo(function MessageContent({ content }) {
  const parts = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="message-content">
      {parts.map((part, index) => (
        part.type === 'code' ? (
          <CodeBlock key={index} code={part.content} language={part.language} />
        ) : (
          <div
            key={index}
            className="whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatInlineText(part.content) }}
          />
        )
      ))}
    </div>
  );
});

// File Attachment Preview
const FileAttachment = memo(function FileAttachment({ file, onRemove }) {
  const isImage = file.type?.startsWith('image/');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 group"
    >
      {isImage && file.preview ? (
        <img src={file.preview} alt={file.name} className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
          <Icons.Attach />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{file.name}</div>
        <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(file)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <Icons.X />
        </button>
      )}
    </motion.div>
  );
});

// Message Component
const Message = memo(function Message({ message, onReact, onEdit }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [reactions, setReactions] = useState(message.reactions || {});

  const handleReaction = (emoji) => {
    setReactions(prev => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1
    }));
    onReact?.(message.id, emoji);
  };

  const handleSaveEdit = () => {
    onEdit?.(message.id, editContent);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}
      onMouseEnter={() => !isStreaming && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg flex-shrink-0 ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/30'
              : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-purple-500/30'
          }`}
        >
          {isUser ? 'U' : 'AI'}
          {!isUser && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900 shadow-lg shadow-emerald-500/50" />
          )}
        </motion.div>

        {/* Message bubble */}
        <div className="flex flex-col gap-1.5">
          <motion.div
            whileHover={{ y: -1 }}
            className={`relative px-5 py-4 rounded-2xl shadow-xl ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
                : 'bg-gray-800/90 backdrop-blur-sm text-gray-100 border border-white/10 rounded-tl-sm'
            }`}
            style={{
              boxShadow: isUser
                ? '0 10px 40px -10px rgba(59, 130, 246, 0.5)'
                : '0 10px 40px -10px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Skill badge */}
            {!isUser && message.skill && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30">
                  <Icons.Sparkles />
                  {message.skill.name || message.skill.id}
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round((message.skill.confidence || 0) * 100)}% match
                </span>
              </div>
            )}

            {/* Editing mode */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-xl bg-black/30 border border-white/20 text-white text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[15px]">
                <MessageContent content={message.content} />
              </div>
            )}

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-5 ml-1 bg-blue-400 rounded-sm animate-pulse" />
            )}

            {/* File attachments */}
            {message.files?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                {message.files.map((file, i) => (
                  <FileAttachment key={i} file={file} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Meta info row */}
          <div className={`flex items-center gap-3 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs text-gray-500">
              {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {message.edited && <span className="ml-1 italic">(edited)</span>}
            </span>

            {/* Reactions display */}
            {Object.keys(reactions).length > 0 && (
              <div className="flex gap-1">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <span
                    key={emoji}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white/10 border border-white/10"
                  >
                    {emoji} {count}
                  </span>
                ))}
              </div>
            )}

            {/* Token usage */}
            {message.usage && (
              <span className="text-xs text-gray-600">
                {message.usage.totalTokens} tokens
              </span>
            )}
          </div>

          {/* Action buttons on hover */}
          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`flex items-center gap-1 ${isUser ? 'justify-end' : ''}`}
              >
                {isUser && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all"
                    title="Edit"
                  >
                    <Icons.Edit />
                  </button>
                )}
                {REACTIONS.slice(0, 4).map(reaction => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(reaction.emoji)}
                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:scale-125 transition-all"
                    title={reaction.label}
                  >
                    {reaction.emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

// Skill Indicator Badge
const SkillIndicator = memo(function SkillIndicator({ skill }) {
  if (!skill) return null;

  const confidence = skill.confidence || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
    >
      <div
        className={`w-2 h-2 rounded-full ${
          confidence > 0.8 ? 'bg-emerald-500 shadow-emerald-500/50' : 
          confidence > 0.5 ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-red-500 shadow-red-500/50'
        } shadow-[0_0_8px]`}
      />
      <span className="text-sm text-gray-300 font-medium">{skill.skillId || skill.id}</span>
      <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
    </motion.div>
  );
});

// Connection Status
const ConnectionStatus = memo(function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full transition-all ${
          isConnected
            ? 'bg-emerald-500 shadow-[0_0_10px] shadow-emerald-500/60 animate-pulse'
            : 'bg-red-500 shadow-[0_0_10px] shadow-red-500/60'
        }`}
      />
      <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
        {isConnected ? 'Online' : 'Offline'}
      </span>
    </div>
  );
});

// Search Modal
const SearchModal = memo(function SearchModal({ isOpen, onClose, messages, onSelect }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return messages.filter(m => m.content?.toLowerCase().includes(lowerQuery)).slice(0, 10);
  }, [messages, query]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Icons.Search />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base"
          />
          <kbd className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400 border border-white/10">ESC</kbd>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto">
          {filteredMessages.length > 0 ? (
            filteredMessages.map(message => (
              <button
                key={message.id}
                onClick={() => { onSelect?.(message); onClose(); }}
                className="w-full px-5 py-4 text-left hover:bg-white/5 border-b border-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${message.role === 'user' ? 'text-blue-400' : 'text-purple-400'}`}>
                    {message.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-xs text-gray-600">
                    {message.timestamp?.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{message.content}</p>
              </button>
            ))
          ) : query.trim() ? (
            <div className="px-5 py-12 text-center text-gray-500">No messages found</div>
          ) : (
            <div className="px-5 py-12 text-center text-gray-500">Start typing to search</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

// Voice Control
const VoiceControl = memo(function VoiceControl({ onTranscript, disabled }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) onTranscript?.(finalTranscript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => recognitionRef.current?.stop();
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return null;

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      className={`p-3 rounded-xl transition-all ${
        isListening
          ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/20 animate-pulse'
          : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 border border-white/10'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isListening ? 'Stop listening' : 'Voice input'}
    >
      {isListening ? <Icons.MicOff /> : <Icons.Mic />}
    </button>
  );
});

// Welcome Screen
const WelcomeScreen = memo(function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mb-8"
      >
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/40 animate-float">
            <span className="text-6xl">🧠</span>
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50"
          >
            <Icons.Sparkles />
          </motion.div>
        </div>
      </motion.div>
      
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
      >
        Welcome to TooLoo.ai
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-gray-400 max-w-md mb-10 text-lg"
      >
        Your intelligent coding assistant powered by advanced AI.
        Ask anything about code, architecture, or get help with your projects!
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-4 max-w-xl w-full"
      >
        {[
          { icon: '💻', label: 'Write Code', desc: 'Generate functions & classes', gradient: 'from-blue-500/20 to-cyan-500/20' },
          { icon: '🔍', label: 'Review Code', desc: 'Get expert feedback', gradient: 'from-purple-500/20 to-pink-500/20' },
          { icon: '🏗️', label: 'Architecture', desc: 'Design systems & APIs', gradient: 'from-orange-500/20 to-yellow-500/20' },
          { icon: '📚', label: 'Learn', desc: 'Understand concepts', gradient: 'from-emerald-500/20 to-teal-500/20' },
        ].map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br ${item.gradient} border border-white/10 hover:border-white/20 cursor-pointer transition-all group`}
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <div className="text-left">
              <div className="font-semibold text-white">{item.label}</div>
              <div className="text-sm text-gray-400">{item.desc}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

// Main Chat Component
export default function ChatV2() {
  const {
    messages,
    isStreaming,
    matchedSkill,
    error,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useChat({ stream: true });

  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File handling
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).map(file => ({
      file, name: file.name, size: file.size, type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files).map(file => ({
      file, name: file.name, size: file.size, type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setFiles(prev => [...prev, ...selectedFiles]);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((fileToRemove) => {
    setFiles(prev => prev.filter(f => f !== fileToRemove));
    if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
  }, []);

  // Submit
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if ((input.trim() || files.length > 0) && !isStreaming) {
      sendMessage(input, { files });
      setInput('');
      setFiles([]);
    }
  }, [input, files, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowSearch(true); }
  }, [handleSubmit]);

  const handleVoiceTranscript = useCallback((transcript) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowSearch(true); }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div 
      className="flex flex-col h-full bg-gray-950 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-4 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-xl border-2 border-dashed border-blue-500 rounded-3xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Icons.Attach />
            </div>
            <p className="text-xl font-semibold text-white mb-2">Drop files here</p>
            <p className="text-gray-400">Images, documents, code files</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gray-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-2xl">🧠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TooLoo Chat</h1>
            <ConnectionStatus isConnected={isConnected} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {matchedSkill && <SkillIndicator skill={matchedSkill} />}
          
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <Icons.Search />
            <span className="text-sm hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/10">⌘K</kbd>
          </button>
          
          <button
            onClick={clearMessages}
            className="px-4 py-2.5 text-sm rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map(message => (
              <Message key={message.id} message={message} />
            ))}
          </AnimatePresence>
        )}
        
        {isStreaming && !messages[messages.length - 1]?.streaming && (
          <TypingIndicator />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-6 mb-4 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3"
          >
            <span className="text-xl">⚠️</span>
            <span>{error.message || 'An error occurred'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pb-3 flex flex-wrap gap-2"
          >
            {files.map((file, i) => (
              <FileAttachment key={i} file={file} onRemove={removeFile} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="relative z-10 p-4 border-t border-white/5 bg-gray-900/50 backdrop-blur-xl">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          {/* File upload */}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            title="Attach files"
          >
            <Icons.Attach />
          </button>

          {/* Main input */}
          <div className="flex-1 flex items-end rounded-2xl bg-gray-800/80 border border-white/10 focus-within:border-blue-500/50 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Ask me anything...' : 'Connecting...'}
              disabled={!isConnected}
              rows={1}
              className="flex-1 px-5 py-4 bg-transparent text-white placeholder-gray-500 outline-none resize-none min-h-[56px] max-h-[200px] text-[15px]"
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
            
            {/* Code insert button */}
            <button
              type="button"
              onClick={() => setInput(prev => prev + '```typescript\n\n```')}
              className="p-2 mr-2 mb-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all"
              title="Insert code block"
            >
              <Icons.Code />
            </button>
          </div>

          {/* Voice input */}
          <VoiceControl onTranscript={handleVoiceTranscript} disabled={!isConnected || isStreaming} />

          {/* Send/Stop button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all"
            >
              <Icons.Stop />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isConnected || (!input.trim() && files.length === 0)}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              <Icons.Send />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 max-w-4xl mx-auto text-xs text-gray-500">
          <span>Press Enter to send • Shift+Enter for new line</span>
          <span className="flex items-center gap-1.5">
            <Icons.Sparkles />
            Powered by TooLoo.ai Skills OS
          </span>
        </div>
      </form>

      {/* Search Modal */}
      <AnimatePresence>
        <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} messages={messages} />
      </AnimatePresence>
    </div>
  );
}
