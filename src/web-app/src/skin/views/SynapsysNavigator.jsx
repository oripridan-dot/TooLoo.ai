// @version 2.0.NaN
/**
 * Synapsys Navigator - The Cognitive Operating System Interface
 * 
 * Not just a chat UI - a portal into TooLoo's cognitive universe.
 * 
 * @version 2.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemState } from '../store/systemStateStore';
import './SynapsysNavigator.css';

// =============================================================================
// COGNITIVE STATE TYPES
// =============================================================================

const CognitiveState = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  REASONING: 'reasoning',
  EXECUTING: 'executing',
  REFLECTING: 'reflecting',
};

const InteractionMode = {
  EXPLORE: 'explore',
  FOCUS: 'focus',
  COLLABORATE: 'collaborate',
};

// =============================================================================
// NEURAL PARTICLE SYSTEM
// =============================================================================

const NeuralParticle = ({ delay, duration }) => {
  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  
  return (
    <motion.div
      className="neural-particle"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.6, 0],
        scale: [0, 1.5, 0],
        x: [randomX, randomX + (Math.random() - 0.5) * 50],
        y: [randomY, randomY + (Math.random() - 0.5) * 50],
      }}
      transition={{
        duration: duration || 3,
        delay: delay || 0,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
      style={{
        position: 'absolute',
        left: `${randomX}%`,
        top: `${randomY}%`,
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        background: 'var(--synapse-glow)',
      }}
    />
  );
};

// =============================================================================
// COGNITIVE CANVAS - THE BRAIN VISUALIZATION
// =============================================================================

const CognitiveCanvas = ({ state, thoughtStream, agents }) => {
  const canvasRef = useRef(null);
  
  // Generate particles based on cognitive state
  const particleCount = state === CognitiveState.PROCESSING ? 30 : 
                        state === CognitiveState.REASONING ? 20 : 10;
  
  return (
    <div className={`cognitive-canvas state-${state}`} ref={canvasRef}>
      {/* Neural network background */}
      <div className="neural-network">
        {[...Array(particleCount)].map((_, i) => (
          <NeuralParticle 
            key={i} 
            delay={i * 0.1} 
            duration={2 + Math.random() * 2}
          />
        ))}
      </div>
      
      {/* Thought stream visualization */}
      <AnimatePresence mode="popLayout">
        {thoughtStream.map((thought, index) => (
          <motion.div
            key={thought.id}
            className="thought-bubble"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <span className="thought-icon">{thought.icon}</span>
            <span className="thought-text">{thought.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Active agents visualization */}
      <div className="active-agents">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            className={`agent-node ${agent.active ? 'active' : ''}`}
            initial={{ scale: 0 }}
            animate={{ 
              scale: agent.active ? 1.2 : 1,
              boxShadow: agent.active 
                ? '0 0 20px var(--synapse-glow)' 
                : '0 0 5px rgba(0,0,0,0.3)'
            }}
            transition={{ duration: 0.3 }}
          >
            <span className="agent-icon">{agent.icon}</span>
            <span className="agent-name">{agent.name}</span>
          </motion.div>
        ))}
      </div>
      
      {/* Central brain core */}
      <motion.div 
        className="brain-core"
        animate={{
          scale: state === CognitiveState.PROCESSING ? [1, 1.1, 1] : 1,
          boxShadow: state === CognitiveState.PROCESSING 
            ? ['0 0 30px var(--synapse-glow)', '0 0 60px var(--synapse-glow)', '0 0 30px var(--synapse-glow)']
            : '0 0 20px var(--synapse-glow)',
        }}
        transition={{
          duration: 1.5,
          repeat: state === CognitiveState.PROCESSING ? Infinity : 0,
        }}
      >
        <span className="core-text">🧠</span>
      </motion.div>
    </div>
  );
};

// =============================================================================
// CONTEXTUAL INPUT ZONE
// =============================================================================

const ContextualInput = ({ mode, onSubmit, onModeChange, isProcessing }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const inputRef = useRef(null);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSubmit(input, attachments);
      setInput('');
      setAttachments([]);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };
  
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
  };
  
  return (
    <motion.div 
      className={`contextual-input mode-${mode}`}
      layout
    >
      {/* Mode selector */}
      <div className="mode-selector">
        {Object.values(InteractionMode).map((m) => (
          <motion.button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => onModeChange(m)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {m === InteractionMode.EXPLORE && '🔍'}
            {m === InteractionMode.FOCUS && '🎯'}
            {m === InteractionMode.COLLABORATE && '🤝'}
            <span>{m}</span>
          </motion.button>
        ))}
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === InteractionMode.EXPLORE 
                ? "What should we explore together?" 
                : mode === InteractionMode.FOCUS 
                ? "What task needs my full attention?"
                : "What should we build together?"
            }
            disabled={isProcessing}
            rows={1}
          />
          
          {/* Attachment preview */}
          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map((file, i) => (
                <span key={i} className="attachment-chip">
                  📎 {file.name}
                  <button onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="input-actions">
          <label className="upload-btn">
            📁
            <input type="file" multiple onChange={handleFileUpload} hidden />
          </label>
          
          <motion.button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isProcessing}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isProcessing ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⚙️
              </motion.span>
            ) : (
              '🚀'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

// =============================================================================
// ARTIFACT PANEL
// =============================================================================

const ArtifactPanel = ({ artifacts, onSelect }) => {
  return (
    <div className="artifact-panel">
      <h3>🎨 Artifacts</h3>
      <div className="artifact-list">
        <AnimatePresence>
          {artifacts.map((artifact) => (
            <motion.div
              key={artifact.id}
              className="artifact-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => onSelect(artifact)}
              whileHover={{ scale: 1.02 }}
            >
              <span className="artifact-icon">
                {artifact.type === 'code' && '💻'}
                {artifact.type === 'document' && '📄'}
                {artifact.type === 'design' && '🎨'}
                {artifact.type === 'data' && '📊'}
              </span>
              <div className="artifact-info">
                <span className="artifact-name">{artifact.name}</span>
                <span className="artifact-type">{artifact.language || artifact.type}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {artifacts.length === 0 && (
          <div className="empty-state">No artifacts yet. Start creating!</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CONVERSATION STREAM
// =============================================================================

const ConversationStream = ({ messages, isTyping }) => {
  const streamRef = useRef(null);
  
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="conversation-stream" ref={streamRef}>
      <AnimatePresence>
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id || index}
            className={`message ${msg.role}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🧠'}
            </div>
            <div className="message-content">
              {msg.role === 'assistant' && msg.provider && (
                <span className="provider-badge">{msg.provider}</span>
              )}
              <div className="message-text">{msg.content}</div>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="tool-calls">
                  {msg.toolCalls.map((tool, i) => (
                    <div key={i} className={`tool-call ${tool.result?.success ? 'success' : 'error'}`}>
                      🔧 {tool.name}: {tool.result?.output || tool.result?.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {isTyping && (
        <motion.div
          className="typing-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </motion.div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN SYNAPSYS NAVIGATOR COMPONENT
// =============================================================================

export const SynapsysNavigator = () => {
  // Get socket from system state store
  const socket = useSystemState((state) => state.connection?.socket);
  
  // State
  const [cognitiveState, setCognitiveState] = useState(CognitiveState.IDLE);
  const [interactionMode, setInteractionMode] = useState(InteractionMode.EXPLORE);
  const [messages, setMessages] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [thoughtStream, setThoughtStream] = useState([]);
  const [activeAgents, setActiveAgents] = useState([
    { id: 'gemini', name: 'Gemini', icon: '💎', active: false },
    { id: 'anthropic', name: 'Claude', icon: '🎭', active: false },
    { id: 'deepseek', name: 'DeepSeek', icon: '🔮', active: false },
    { id: 'openai', name: 'GPT-4', icon: '🤖', active: false },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  
  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    
    socket.on('cognitive:state', (state) => {
      setCognitiveState(state);
    });
    
    socket.on('thought:stream', (thought) => {
      setThoughtStream((prev) => [...prev.slice(-5), thought]);
    });
    
    socket.on('agent:active', ({ agentId, active }) => {
      setActiveAgents((prev) => 
        prev.map((a) => a.id === agentId ? { ...a, active } : a)
      );
    });
    
    socket.on('artifact:created', (artifact) => {
      setArtifacts((prev) => [...prev, artifact]);
    });
    
    return () => {
      socket.off('cognitive:state');
      socket.off('thought:stream');
      socket.off('agent:active');
      socket.off('artifact:created');
    };
  }, [socket]);
  
  // Message submission
  const handleSubmit = useCallback(async (message, attachments) => {
    setIsProcessing(true);
    setCognitiveState(CognitiveState.PROCESSING);
    
    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    
    // Add thinking thought
    setThoughtStream((prev) => [
      ...prev, 
      { id: Date.now(), icon: '🤔', text: 'Processing your request...' }
    ]);
    
    try {
      const response = await fetch('/api/v1/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          mode: interactionMode,
          enableTools: true,
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Add assistant message
        const assistantMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.data.response,
          provider: data.data.provider,
          toolCalls: data.data.toolCalls,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        
        // Update active agent
        if (data.data.provider) {
          setActiveAgents((prev) => 
            prev.map((a) => ({ ...a, active: a.id === data.data.provider }))
          );
        }
        
        // Add completion thought
        setThoughtStream((prev) => [
          ...prev, 
          { id: Date.now(), icon: '✅', text: 'Response complete' }
        ]);
        
        setCognitiveState(CognitiveState.REFLECTING);
        setTimeout(() => setCognitiveState(CognitiveState.IDLE), 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setThoughtStream((prev) => [
        ...prev, 
        { id: Date.now(), icon: '❌', text: `Error: ${error.message}` }
      ]);
      setCognitiveState(CognitiveState.IDLE);
    } finally {
      setIsProcessing(false);
    }
  }, [interactionMode]);
  
  return (
    <div className={`synapsys-navigator mode-${interactionMode}`}>
      {/* Header */}
      <header className="navigator-header">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="logo">🧠</span> Synapsys Navigator
        </motion.h1>
        <div className="status-bar">
          <span className={`status-indicator ${cognitiveState}`}>
            {cognitiveState === CognitiveState.IDLE && '💤 Idle'}
            {cognitiveState === CognitiveState.PROCESSING && '⚡ Processing'}
            {cognitiveState === CognitiveState.REASONING && '🧠 Reasoning'}
            {cognitiveState === CognitiveState.EXECUTING && '🔨 Executing'}
            {cognitiveState === CognitiveState.REFLECTING && '💭 Reflecting'}
          </span>
        </div>
      </header>
      
      {/* Main content area */}
      <main className="navigator-main">
        {/* Left: Cognitive Canvas */}
        <section className="canvas-section">
          <CognitiveCanvas 
            state={cognitiveState}
            thoughtStream={thoughtStream}
            agents={activeAgents}
          />
        </section>
        
        {/* Center: Conversation */}
        <section className="conversation-section">
          <ConversationStream 
            messages={messages}
            isTyping={isProcessing}
          />
          <ContextualInput
            mode={interactionMode}
            onSubmit={handleSubmit}
            onModeChange={setInteractionMode}
            isProcessing={isProcessing}
          />
        </section>
        
        {/* Right: Artifacts */}
        <section className="artifacts-section">
          <ArtifactPanel 
            artifacts={artifacts}
            onSelect={setSelectedArtifact}
          />
        </section>
      </main>
      
      {/* Artifact viewer modal */}
      <AnimatePresence>
        {selectedArtifact && (
          <motion.div
            className="artifact-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedArtifact(null)}
          >
            <motion.div
              className="artifact-viewer"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>{selectedArtifact.name}</h3>
              <pre><code>{selectedArtifact.content}</code></pre>
              <button onClick={() => setSelectedArtifact(null)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SynapsysNavigator;
