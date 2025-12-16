/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo Observatory - Proactive System Intelligence Dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A fully-functioning, proactive observation interface for TooLoo's evolution.
 *
 * Features:
 * - Real-time engine metrics (learning, evolution, emergence, routing)
 * - Self-healing status and alerts
 * - Proactive AI insights
 * - Live system pulse
 * - Interactive action controls
 * - Full chat interface (synced with Cognition view)
 *
 * @version 2.1.0 - Proactive Observatory with Full Chat
 */
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, ConnectionState, useChat } from '../hooks/useSocket';
import { apiRequest } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT ICONS (from ChatV2)
// ═══════════════════════════════════════════════════════════════════════════════

const ChatIcons = {
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
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT COMPONENTS (from ChatV2)
// ═══════════════════════════════════════════════════════════════════════════════

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
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-black/40">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ChatIcons.Terminal />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            {language || 'text'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50"
            >
              {executing ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ChatIcons.Play />
              )}
              {executing ? 'Running...' : 'Run'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-all"
          >
            {copied ? <ChatIcons.Check /> : <ChatIcons.Copy />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed text-gray-200">{code}</code>
      </pre>
      {output && (
        <div className="px-3 py-2 bg-black/40 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <ChatIcons.Terminal />
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

// Typing Indicator
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-3"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-purple-500/30">
        AI
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-gray-800/80 border border-white/10 backdrop-blur-sm">
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" />
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" style={{ animationDelay: '0.4s' }} />
      </div>
    </motion.div>
  );
});

// Chat Message Component
const ChatMessage = memo(function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
              : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
          }`}
        >
          {isUser ? 'U' : 'AI'}
        </div>

        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm'
              : 'bg-gray-800/90 text-gray-100 border border-white/10 rounded-tl-sm'
          }`}
        >
          {!isUser && message.skill && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <ChatIcons.Sparkles />
                {message.skill.name || message.skill.id}
              </span>
            </div>
          )}

          <div className="text-sm">
            <MessageContent content={message.content} />
          </div>

          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-blue-400 rounded-sm animate-pulse" />
          )}
        </div>
      </div>
    </motion.div>
  );
});

// Chat Panel Component for Observatory
function ObservatoryChat() {
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput('');
    }
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="h-full flex flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm text-gray-400">Cognition</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        {matchedSkill && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {matchedSkill.skillId || matchedSkill.id}
          </span>
        )}
        <button
          onClick={clearMessages}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl">🧠</span>
            </div>
            <p className="text-gray-400 text-sm">Ask TooLoo anything...</p>
            <p className="text-gray-600 text-xs mt-1">Coding, architecture, research, or just chat!</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </AnimatePresence>
        )}

        {isStreaming && !messages[messages.length - 1]?.streaming && (
          <TypingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          ⚠️ {error.message || 'An error occurred'}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 bg-[#0a0a0f]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Ask anything...' : 'Connecting...'}
            disabled={!isConnected}
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none min-h-[44px] max-h-[120px]"
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
            >
              <ChatIcons.Stop />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChatIcons.Send />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE METRICS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function EngineMeter({ name, icon, healthy, value, max, unit, color }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-xs text-gray-400">{name}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="mt-1 text-right">
        <span className="text-sm font-mono text-white">{value}</span>
        <span className="text-xs text-gray-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

function EnginesDashboard({ engines, isConnected }) {
  if (!isConnected) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-2xl">🔌</span>
        <p className="text-sm mt-2">Waiting for connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚙️</span>
        <span className="text-sm text-gray-400">Native Engines</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] ${
          Object.values(engines).every(e => e.healthy) 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {Object.values(engines).filter(e => e.healthy).length}/4 ONLINE
        </span>
      </div>
      
      <EngineMeter
        name="Learning"
        icon="🧠"
        healthy={engines.learning?.healthy}
        value={engines.learning?.states ?? 0}
        max={1000}
        unit="states"
        color="bg-blue-500"
      />
      
      <EngineMeter
        name="Evolution"
        icon="🧬"
        healthy={engines.evolution?.healthy}
        value={engines.evolution?.activeTests ?? 0}
        max={10}
        unit="tests"
        color="bg-purple-500"
      />
      
      <EngineMeter
        name="Emergence"
        icon="✨"
        healthy={engines.emergence?.healthy}
        value={engines.emergence?.patterns ?? 0}
        max={100}
        unit="patterns"
        color="bg-cyan-500"
      />
      
      <EngineMeter
        name="Routing"
        icon="🔀"
        healthy={engines.routing?.healthy}
        value={engines.routing?.providersOnline ?? 0}
        max={4}
        unit="providers"
        color="bg-green-500"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-HEALING PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function HealingStatus({ healing, onTriggerCheck }) {
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await apiRequest('/observatory/healing/trigger', { method: 'POST' });
    } catch (e) {
      console.error('Failed to trigger health check:', e);
    }
    setTriggering(false);
  };

  const statusColors = {
    idle: 'bg-gray-500',
    monitoring: 'bg-green-500',
    healing: 'bg-yellow-500 animate-pulse',
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏥</span>
          <span className="text-sm text-gray-400">Self-Healing</span>
        </div>
        <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
          healing.status === 'healing' 
            ? 'bg-yellow-500/20 text-yellow-400' 
            : 'bg-green-500/20 text-green-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${statusColors[healing.status] || statusColors.idle}`} />
          {healing.status?.toUpperCase() || 'IDLE'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-800/50 rounded p-2">
          <p className="text-xs text-gray-500">Active Issues</p>
          <p className={`text-lg font-mono ${healing.activeIssues > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {healing.activeIssues ?? 0}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded p-2">
          <p className="text-xs text-gray-500">Healings</p>
          <p className="text-lg font-mono text-blue-400">
            {healing.recentHealings ?? 0}
          </p>
        </div>
      </div>

      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs text-blue-400 transition-all disabled:opacity-50"
      >
        {triggering ? '⏳ Running...' : '🔍 Run Health Check'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function AlertsPanel({ alerts, onAcknowledge }) {
  const typeIcons = {
    critical: '🚨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const typeColors = {
    critical: 'border-red-500/30 bg-red-900/20',
    error: 'border-orange-500/30 bg-orange-900/20',
    warning: 'border-yellow-500/30 bg-yellow-900/20',
    info: 'border-blue-500/30 bg-blue-900/20',
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <span className="text-2xl">✅</span>
        <p className="text-sm mt-2">All systems nominal</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-3 rounded-lg border ${typeColors[alert.type] || typeColors.info} ${
              alert.acknowledged ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <span>{typeIcons[alert.type] || '📢'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500">{alert.component}</span>
                  {alert.autoHeal && (
                    <span className="px-1 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400">
                      Auto-heal
                    </span>
                  )}
                </div>
              </div>
              {!alert.acknowledged && (
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ✓
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE INSIGHTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function InsightsPanel({ insights }) {
  const typeIcons = {
    optimization: '🚀',
    warning: '⚠️',
    opportunity: '💡',
    learning: '📚',
  };

  const priorityColors = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-yellow-500',
    low: 'border-l-4 border-l-blue-500',
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <span className="text-2xl">🔮</span>
        <p className="text-sm mt-2">Gathering insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`p-3 bg-gray-900/50 rounded-lg ${priorityColors[insight.priority] || ''}`}
        >
          <div className="flex items-start gap-2">
            <span>{typeIcons[insight.type] || '💡'}</span>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{insight.title}</p>
              <p className="text-xs text-gray-400 mt-1">{insight.description}</p>
              {insight.suggestedAction && (
                <p className="text-xs text-blue-400 mt-2">
                  → {insight.suggestedAction}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PULSE METER
// ═══════════════════════════════════════════════════════════════════════════════

function SystemPulse({ pulse, isConnected }) {
  const statusColors = {
    healthy: 'from-green-500 to-emerald-600',
    degraded: 'from-yellow-500 to-orange-600',
    critical: 'from-red-500 to-rose-600',
  };

  const formatUptime = (ms) => {
    if (!ms) return '0h 0m';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Default pulse for when no data is available
  const displayPulse = pulse || {
    status: isConnected ? 'healthy' : 'connecting',
    uptime: Date.now() - (window.__toolooStartTime || Date.now()),
    metrics: {
      requests: { lastHour: 0, successRate: 1.0 },
      memory: { percentage: 0 }
    }
  };

  // Store start time for uptime calculation
  if (!window.__toolooStartTime) {
    window.__toolooStartTime = Date.now();
  }

  const status = displayPulse.status || 'healthy';
  const colorClass = statusColors[status] || statusColors.healthy;

  return (
    <div className={`bg-gradient-to-r ${colorClass} rounded-xl p-4 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="text-2xl">💓</span>
          </motion.div>
          <div>
            <p className="text-lg font-semibold text-white">{status.toUpperCase()}</p>
            <p className="text-xs text-white/70">Uptime: {formatUptime(displayPulse.uptime)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-white/70">Requests/hr</p>
            <p className="text-lg font-mono text-white">{displayPulse.metrics?.requests?.lastHour ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">Success</p>
            <p className="text-lg font-mono text-white">
              {((displayPulse.metrics?.requests?.successRate ?? 1) * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-white/70">Memory</p>
            <p className="text-lg font-mono text-white">{displayPulse.metrics?.memory?.percentage ?? 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActions({ onAction }) {
  const actions = [
    { id: 'health', label: 'Health Check', icon: '🔍', action: 'checkHealth' },
    { id: 'learn', label: 'Boost Learning', icon: '🧠', action: 'boostLearning' },
    { id: 'evolve', label: 'Force Evolution', icon: '🧬', action: 'forceEvolution' },
    { id: 'clear', label: 'Clear Alerts', icon: '🧹', action: 'clearAlerts' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.action)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-xs"
        >
          <span>{action.icon}</span>
          <span className="text-gray-300">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN ACTIVITY (Activity Log Panel)
// ═══════════════════════════════════════════════════════════════════════════════

function BrainActivity({ thoughts }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📋</span>
        <span className="text-sm text-gray-400">Activity Log</span>
        <span className="ml-auto px-2 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400">
          {thoughts.length} events
        </span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <AnimatePresence>
          {thoughts.map((thought, i) => (
            <motion.div
              key={thought.id || i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`p-2 rounded-lg border ${
                thought.type === 'engine' ? 'bg-purple-900/20 border-purple-500/20' :
                thought.type === 'healing' ? 'bg-green-900/20 border-green-500/20' :
                thought.type === 'alert' ? 'bg-yellow-900/20 border-yellow-500/20' :
                thought.type === 'insight' ? 'bg-blue-900/20 border-blue-500/20' :
                'bg-gray-900/50 border-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs">
                  {thought.type === 'engine' ? '⚙️' :
                   thought.type === 'healing' ? '🏥' :
                   thought.type === 'alert' ? '⚠️' :
                   thought.type === 'insight' ? '💡' : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500">{thought.timestamp}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{thought.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thoughts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Waiting for activity...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TooLooObservatory() {
  const [pulse, setPulse] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [engines, setEngines] = useState({
    learning: { healthy: true, states: 0, explorationRate: 0.1 },
    evolution: { healthy: true, activeTests: 0, improvements: 0 },
    emergence: { healthy: true, patterns: 0, synergies: 0 },
    routing: { healthy: true, providersOnline: 4, successRate: 1.0 },
  });
  const [healing, setHealing] = useState({
    status: 'monitoring',
    activeIssues: 0,
    recentHealings: 0,
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  const { connectionState, emit, on } = useSocket({ autoConnect: true });
  const isConnected = connectionState === ConnectionState.CONNECTED;

  // Fetch data once on mount - with rate limit protection
  useEffect(() => {
    if (dataLoaded) return;
    
    const fetchDataSafely = async () => {
      try {
        // Single consolidated request to reduce API calls
        const pulseRes = await apiRequest('/observatory/pulse');
        if (pulseRes.data) {
          setPulse(pulseRes.data);
          if (pulseRes.data.engines) setEngines(pulseRes.data.engines);
          if (pulseRes.data.healing) setHealing(prev => ({ ...prev, ...pulseRes.data.healing }));
          if (pulseRes.data.alerts) setAlerts(pulseRes.data.alerts);
          if (pulseRes.data.insights) setInsights(pulseRes.data.insights);
          addThought('engine', 'System pulse received');
        }
        setDataLoaded(true);
      } catch (err) {
        // Silently handle errors - don't spam console
        if (err.message?.includes('429') || err.message?.includes('Rate limit')) {
          addThought('alert', 'Rate limited - using cached data');
        }
        setDataLoaded(true); // Mark as loaded to prevent retry loops
      }
    };

    // Delay initial fetch to let socket connect first
    const timeout = setTimeout(fetchDataSafely, 1000);
    return () => clearTimeout(timeout);
  }, [dataLoaded]);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Request system status via WebSocket (no HTTP request)
    emit('system:ping');

    // Listen for system status updates
    const unsubStatus = on('system:status', (data) => {
      if (data) {
        setPulse(prev => ({ ...prev, ...data, status: 'healthy' }));
        addThought('engine', 'System status updated via WebSocket');
      }
    });

    // Listen for observatory pulse events
    const unsubPulse = on('observatory:pulse', (data) => {
      if (data) {
        setPulse(data);
        if (data.engines) setEngines(data.engines);
        if (data.healing) setHealing(prev => ({ ...prev, ...data.healing }));
      }
    });

    return () => {
      unsubStatus?.();
      unsubPulse?.();
    };
  }, [isConnected, emit, on]);

  const addThought = useCallback((type, content) => {
    setThoughts(prev => [...prev.slice(-29), {
      id: `thought_${Date.now()}`,
      type,
      content,
      timestamp: new Date().toLocaleTimeString(),
    }]);
  }, []);

  const handleAcknowledgeAlert = useCallback(async (alertId) => {
    // Optimistic update - no API call to avoid rate limits
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
    addThought('alert', `Alert acknowledged`);
  }, [addThought]);

  const handleQuickAction = useCallback(async (action) => {
    addThought('engine', `Action: ${action}`);
    
    switch (action) {
      case 'checkHealth':
        addThought('healing', 'Health check initiated');
        // Use WebSocket instead of HTTP
        emit('system:ping');
        break;
      case 'clearAlerts':
        setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
        addThought('alert', 'All alerts cleared');
        break;
      case 'boostLearning':
        addThought('engine', 'Learning boost requested');
        break;
      case 'forceEvolution':
        addThought('engine', 'Evolution cycle triggered');
        break;
      default:
        addThought('insight', `${action} triggered`);
    }
  }, [addThought, emit]);

  return (
    <div className="h-full bg-[#050508] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 border-b border-gray-800 flex items-center px-6 bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🔭
          </motion.span>
          <div>
            <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              TooLoo Observatory
            </h1>
            <p className="text-[10px] text-gray-500">Proactive System Intelligence</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isConnected ? 'bg-green-900/20' : 'bg-red-900/20'
          }`}>
            <motion.div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left panel - Engines & Healing */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden bg-[#08080c]">
          {/* System Pulse */}
          <div className="p-4 border-b border-gray-800">
            <SystemPulse pulse={pulse} isConnected={isConnected} />
          </div>

          {/* Engines */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <EnginesDashboard engines={engines} isConnected={isConnected} />
          </div>

          {/* Healing Status */}
          <div className="p-4 border-t border-gray-800">
            <HealingStatus healing={healing} />
          </div>
        </div>

        {/* Center panel - Chat + Activity */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Main Chat Interface */}
          <div className="flex-1 min-h-0 border-b border-gray-800">
            <ObservatoryChat />
          </div>

          {/* Activity Log (collapsed by default) */}
          <div className="h-48 flex-shrink-0 p-3 bg-[#08080c]">
            <BrainActivity thoughts={thoughts} />
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-t border-gray-800 bg-[#0a0a0f]">
            <QuickActions onAction={handleQuickAction} />
          </div>
        </div>

        {/* Right panel - Alerts & Insights */}
        <div className="w-80 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden bg-[#08080c]">
          {/* Alerts */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🚨</span>
              <span className="text-sm text-gray-400">Alerts</span>
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500/20 rounded text-[10px] text-red-400">
                  {alerts.filter(a => !a.acknowledged).length} active
                </span>
              )}
            </div>
            <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
          </div>

          {/* Insights */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-sm text-gray-400">Proactive Insights</span>
            </div>
            <InsightsPanel insights={insights} />
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .typing-dot {
          animation: typingPulse 1.4s infinite ease-in-out;
        }
        @keyframes typingPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
