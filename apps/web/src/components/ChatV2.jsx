/**
 * ChatV2.jsx
 * V2 Chat component with streaming support via Socket.IO
 *
 * @version 2.0.0-alpha.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../hooks/useSocket';

// Message component
function Message({ message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
      >
        {/* Skill badge for assistant messages */}
        {!isUser && message.skill && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">
              {message.skill.name || message.skill.id}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round((message.skill.confidence || 0) * 100)}% confidence
            </span>
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
          )}
        </div>

        {/* Usage info */}
        {message.usage && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
            Tokens: {message.usage.totalTokens}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-500 mt-1">
          {message.timestamp?.toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}

// Skill indicator
function SkillIndicator({ skill }) {
  if (!skill) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700"
    >
      <div
        className={`w-2 h-2 rounded-full ${
          skill.confidence > 0.8
            ? 'bg-green-500'
            : skill.confidence > 0.5
            ? 'bg-yellow-500'
            : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-300">{skill.skillId || skill.id}</span>
      <span className="text-xs text-gray-500">
        {Math.round((skill.confidence || 0) * 100)}%
      </span>
    </motion.div>
  );
}

// Connection status
function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

// Main Chat component
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle submit
  const handleSubmit = e => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage(input);
      setInput('');
    }
  };

  // Handle key press
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">TooLoo Chat</h1>
          <ConnectionStatus isConnected={isConnected} />
        </div>
        <div className="flex items-center gap-2">
          {matchedSkill && <SkillIndicator skill={matchedSkill} />}
          <button
            onClick={clearMessages}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-medium mb-2">Welcome to TooLoo.ai V2</h2>
            <p className="text-sm text-center max-w-md">
              Ask me anything! I can help with coding, analysis, research, and more.
              Your messages stream in real-time.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map(message => (
              <Message key={message.id} message={message} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-t border-red-700">
          <p className="text-sm text-red-300">
            {error.message || 'An error occurred'}
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            disabled={!isConnected}
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isConnected || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
}
