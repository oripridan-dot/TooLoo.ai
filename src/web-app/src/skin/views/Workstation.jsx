// @version 3.3.463
// TooLoo.ai Workstation View - The 4-Panel Unified Development Interface
// Phase 2d: The "Face" of TooLoo - making it feel like a real product
// V3.3.462: Added Auto-Structure button for repo organization
//
// Panels:
// 1. TaskBoard - DAG visualization of current task decomposition
// 2. ChatPanel - Intent Bus interface for natural language commands
// 3. ContextPanel - Vision context display (screenshots, OCR text)
// 4. ArtifactsPanel - Artifact ledger browser with version history

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiquidPanel } from '../shell/LiquidShell';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const PANEL_LAYOUTS = {
  default: { taskBoard: 25, chat: 35, context: 20, artifacts: 20 },
  taskFocus: { taskBoard: 40, chat: 30, context: 15, artifacts: 15 },
  chatFocus: { taskBoard: 15, chat: 50, context: 15, artifacts: 20 },
  contextFocus: { taskBoard: 20, chat: 25, context: 35, artifacts: 20 },
};

// ============================================================================
// TASK BOARD PANEL - DAG Visualization
// ============================================================================

const TaskNode = memo(({ task, depth = 0 }) => {
  const statusColors = {
    pending: 'border-gray-500 bg-gray-900/50',
    running: 'border-cyan-500 bg-cyan-900/30 animate-pulse',
    complete: 'border-emerald-500 bg-emerald-900/30',
    failed: 'border-red-500 bg-red-900/30',
  };

  const statusIcons = {
    pending: '○',
    running: '◐',
    complete: '●',
    failed: '✕',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.1 }}
      className="relative"
      style={{ marginLeft: depth * 16 }}
    >
      {/* Connection line */}
      {depth > 0 && (
        <div className="absolute -left-4 top-3 w-3 h-px bg-white/20" />
      )}
      
      <div
        className={`
          px-3 py-2 rounded-lg border text-sm mb-2
          ${statusColors[task.status] || statusColors.pending}
          transition-all duration-300
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{statusIcons[task.status] || '○'}</span>
          <span className="text-white/90 font-medium truncate">{task.name}</span>
        </div>
        {task.estimatedTime && (
          <div className="text-xs text-white/50 mt-1">
            Est: {task.estimatedTime}
          </div>
        )}
      </div>

      {/* Child tasks */}
      {task.children?.map((child, idx) => (
        <TaskNode key={child.id || idx} task={child} depth={depth + 1} />
      ))}
    </motion.div>
  );
});

TaskNode.displayName = 'TaskNode';

const TaskBoardPanel = memo(({ tasks = [], currentGoal, onTaskSelect, onAutoStructure, isStructuring }) => {
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [featurePrompt, setFeaturePrompt] = useState('');
  const [structureResult, setStructureResult] = useState(null);

  const handleAutoStructure = async () => {
    if (!featurePrompt.trim()) return;
    setStructureResult(null);
    const result = await onAutoStructure?.(featurePrompt);
    if (result) {
      setStructureResult(result);
    }
  };

  return (
    <LiquidPanel
      title="Task Board"
      icon="📊"
      className="h-full"
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStructureModal(true)}
            className="text-xs px-2 py-1 rounded bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/50 transition-colors"
          >
            🏗️ Auto-Structure
          </button>
          <span className="text-xs text-white/50">{tasks.length} tasks</span>
        </div>
      }
    >
      <div className="p-4 h-full overflow-auto">
        {/* Auto-Structure Modal */}
        <AnimatePresence>
          {showStructureModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowStructureModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 border border-emerald-500/30 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto"
              >
                <h3 className="text-lg font-semibold text-emerald-400 mb-4">🏗️ Auto-Structure Feature</h3>
                <p className="text-white/60 text-sm mb-4">
                  Describe a feature you want to add, and TooLoo will analyze your codebase and suggest the file structure.
                </p>
                <textarea
                  value={featurePrompt}
                  onChange={(e) => setFeaturePrompt(e.target.value)}
                  placeholder="e.g., Add a billing page with Stripe integration for subscription management"
                  className="w-full h-24 px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 resize-none mb-4"
                />
                <div className="flex justify-end gap-2 mb-4">
                  <button
                    onClick={() => setShowStructureModal(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAutoStructure}
                    disabled={!featurePrompt.trim() || isStructuring}
                    className="px-4 py-2 rounded-lg bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/50 disabled:opacity-50"
                  >
                    {isStructuring ? 'Analyzing...' : 'Analyze & Structure'}
                  </button>
                </div>
                
                {/* Results */}
                {structureResult && (
                  <div className="mt-4 p-4 rounded-lg bg-black/40 border border-emerald-500/20">
                    <h4 className="text-sm font-semibold text-emerald-400 mb-2">📁 Suggested Structure</h4>
                    {structureResult.plan?.files?.map((file, idx) => (
                      <div key={idx} className="text-sm text-white/70 py-1 flex items-center gap-2">
                        <span className="text-emerald-400">{file.action === 'create' ? '+' : '~'}</span>
                        <code className="text-cyan-300">{file.path}</code>
                        <span className="text-white/40 text-xs">({file.reason})</span>
                      </div>
                    ))}
                    {structureResult.plan?.summary && (
                      <p className="text-xs text-white/50 mt-3 pt-3 border-t border-white/10">
                        {structureResult.plan.summary}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {currentGoal && (
          <div className="mb-4 p-3 rounded-lg bg-purple-900/30 border border-purple-500/30">
            <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">
              Current Goal
            </div>
            <div className="text-white/90">{currentGoal}</div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-2xl mb-2">📋</div>
            <div>No tasks in queue</div>
            <div className="text-xs mt-1">Use the chat to start a new task</div>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task, idx) => (
              <TaskNode key={task.id || idx} task={task} />
            ))}
          </div>
        )}
      </div>
    </LiquidPanel>
  );
});

TaskBoardPanel.displayName = 'TaskBoardPanel';

// ============================================================================
// CHAT PANEL - Intent Bus Interface
// ============================================================================

const ChatMessage = memo(({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`
          max-w-[80%] px-4 py-2 rounded-2xl text-sm
          ${isUser 
            ? 'bg-cyan-600/30 border border-cyan-500/30 text-white' 
            : 'bg-white/5 border border-white/10 text-white/90'}
        `}
      >
        {message.content}
        {message.timestamp && (
          <div className="text-xs text-white/30 mt-1 text-right">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';

const ChatPanel = memo(({ messages = [], onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage?.(input.trim());
      setInput('');
    }
  };

  return (
    <LiquidPanel
      title="Chat"
      icon="💬"
      className="h-full flex flex-col"
      headerActions={
        isProcessing && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs text-cyan-400"
          >
            Processing...
          </motion.div>
        )
      }
    >
      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-2xl mb-2">👋</div>
            <div>Start a conversation</div>
            <div className="text-xs mt-1">Tell TooLoo what you want to build</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage key={msg.id || idx} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you like to build?"
            disabled={isProcessing}
            className="
              flex-1 px-4 py-2 rounded-xl
              bg-black/40 border border-white/10
              text-white placeholder-white/30
              focus:outline-none focus:border-cyan-500/50
              disabled:opacity-50
            "
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="
              px-4 py-2 rounded-xl
              bg-cyan-600/30 border border-cyan-500/30
              text-cyan-400 font-medium
              hover:bg-cyan-600/50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Send
          </button>
        </div>
      </form>
    </LiquidPanel>
  );
});

ChatPanel.displayName = 'ChatPanel';

// ============================================================================
// CONTEXT PANEL - Vision Display
// ============================================================================

const ContextPanel = memo(({ visionContext, onCaptureRequest }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      await onCaptureRequest?.();
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <LiquidPanel
      title="Context"
      icon="👁"
      className="h-full flex flex-col"
      headerActions={
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          className="
            text-xs px-2 py-1 rounded
            bg-white/5 border border-white/10
            hover:bg-white/10 transition-colors
            disabled:opacity-50
          "
        >
          {isCapturing ? 'Capturing...' : 'Capture'}
        </button>
      }
    >
      <div className="flex-1 overflow-auto p-4">
        {!visionContext ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-2xl mb-2">👁</div>
            <div>No vision context</div>
            <div className="text-xs mt-1">Click Capture to take a screenshot</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Screenshot preview */}
            {visionContext.imagePath && (
              <div className="rounded-lg overflow-hidden border border-white/10">
                <img
                  src={`/data/screenshots/${visionContext.imagePath.split('/').pop()}`}
                  alt="Screen capture"
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* OCR Results */}
            {visionContext.extractedText?.length > 0 && (
              <div>
                <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                  Extracted Text ({visionContext.extractedText.length} blocks)
                </div>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {visionContext.extractedText.map((text, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-white/70 p-2 rounded bg-white/5"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence */}
            {visionContext.ocrConfidence && (
              <div className="text-xs text-white/40">
                OCR Confidence: {visionContext.ocrConfidence.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>
    </LiquidPanel>
  );
});

ContextPanel.displayName = 'ContextPanel';

// ============================================================================
// ARTIFACTS PANEL - Ledger Browser
// ============================================================================

const ArtifactItem = memo(({ artifact, isSelected, onClick }) => {
  const typeIcons = {
    code: '📄',
    documentation: '📝',
    config: '⚙️',
    test: '🧪',
    visual: '🎨',
    data: '📊',
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={() => onClick?.(artifact)}
      className={`
        p-3 rounded-lg cursor-pointer transition-colors mb-2
        ${isSelected 
          ? 'bg-cyan-900/30 border border-cyan-500/30' 
          : 'bg-white/5 border border-white/5 hover:bg-white/10'}
      `}
    >
      <div className="flex items-center gap-2">
        <span>{typeIcons[artifact.type] || '📄'}</span>
        <span className="text-sm text-white/90 truncate flex-1">
          {artifact.name}
        </span>
        {artifact.versions?.length > 1 && (
          <span className="text-xs text-white/40">
            v{artifact.versions.length}
          </span>
        )}
      </div>
      {artifact.description && (
        <div className="text-xs text-white/50 mt-1 truncate">
          {artifact.description}
        </div>
      )}
    </motion.div>
  );
});

ArtifactItem.displayName = 'ArtifactItem';

const ArtifactsPanel = memo(({ artifacts = [], onArtifactSelect, selectedArtifact }) => {
  const [filter, setFilter] = useState('all');

  const filteredArtifacts = filter === 'all' 
    ? artifacts 
    : artifacts.filter(a => a.type === filter);

  return (
    <LiquidPanel
      title="Artifacts"
      icon="📦"
      className="h-full flex flex-col"
      headerActions={
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="
            text-xs px-2 py-1 rounded
            bg-black/40 border border-white/10
            text-white/70
          "
        >
          <option value="all">All</option>
          <option value="code">Code</option>
          <option value="documentation">Docs</option>
          <option value="test">Tests</option>
          <option value="config">Config</option>
        </select>
      }
    >
      <div className="flex-1 overflow-auto p-4">
        {filteredArtifacts.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <div className="text-2xl mb-2">📦</div>
            <div>No artifacts yet</div>
            <div className="text-xs mt-1">Generated files will appear here</div>
          </div>
        ) : (
          <div>
            {filteredArtifacts.map((artifact, idx) => (
              <ArtifactItem
                key={artifact.id || idx}
                artifact={artifact}
                isSelected={selectedArtifact?.id === artifact.id}
                onClick={onArtifactSelect}
              />
            ))}
          </div>
        )}
      </div>
    </LiquidPanel>
  );
});

ArtifactsPanel.displayName = 'ArtifactsPanel';

// ============================================================================
// MAIN WORKSTATION VIEW
// ============================================================================

const Workstation = memo(() => {
  // State
  const [layout, setLayout] = useState(PANEL_LAYOUTS.default);
  const [tasks, setTasks] = useState([]);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visionContext, setVisionContext] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch orchestrator status
        const statusRes = await fetch('/api/v1/orchestrator/status');
        const statusData = await statusRes.json();
        if (statusData.ok && statusData.data?.status) {
          setTasks(statusData.data.status.planQueue?.map((goal, idx) => ({
            id: `task-${idx}`,
            name: goal,
            status: idx === 0 ? 'running' : 'pending',
          })) || []);
          setCurrentGoal(statusData.data.status.currentFocus);
        }

        // Fetch artifacts
        const artifactsRes = await fetch('/api/v1/agent/artifacts');
        const artifactsData = await artifactsRes.json();
        if (artifactsData.ok && artifactsData.data) {
          setArtifacts(artifactsData.data);
        }
      } catch (error) {
        console.error('[Workstation] Failed to fetch initial data:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content) => {
    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send to orchestrator queue
      const response = await fetch('/api/v1/orchestrator/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: content }),
      });
      const data = await response.json();

      // Add system response
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: data.ok 
          ? `Task added to queue: "${content}"\n\nQueue now has ${data.data?.queue?.length || 1} items.`
          : `Failed to add task: ${data.error}`,
        timestamp: Date.now(),
      }]);

      // Update tasks
      if (data.ok && data.data?.queue) {
        setTasks(data.data.queue.map((goal, idx) => ({
          id: `task-${idx}`,
          name: goal,
          status: idx === 0 ? 'running' : 'pending',
        })));
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle vision capture
  const handleCaptureRequest = useCallback(async () => {
    try {
      const url = prompt('Enter URL to capture (or leave empty for localhost):');
      const targetUrl = url || 'http://localhost:5173';

      const response = await fetch('/api/v1/orchestrator/vision/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await response.json();

      if (data.ok && data.data?.visionContext) {
        setVisionContext(data.data.visionContext);
      }
    } catch (error) {
      console.error('[Workstation] Vision capture failed:', error);
    }
  }, []);

  return (
    <div className="h-full w-full bg-[#0a0a0a] p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Workstation</h1>
          <span className="text-xs text-white/40 px-2 py-1 rounded bg-white/5">
            Phase 2d
          </span>
        </div>
        <div className="flex gap-2">
          {Object.keys(PANEL_LAYOUTS).map((layoutKey) => (
            <button
              key={layoutKey}
              onClick={() => setLayout(PANEL_LAYOUTS[layoutKey])}
              className={`
                text-xs px-3 py-1 rounded
                ${layout === PANEL_LAYOUTS[layoutKey]
                  ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}
              `}
            >
              {layoutKey}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Panel Grid */}
      <div className="h-[calc(100%-60px)] grid grid-cols-4 gap-4">
        <div style={{ gridColumn: `span 1` }}>
          <TaskBoardPanel
            tasks={tasks}
            currentGoal={currentGoal}
          />
        </div>
        <div style={{ gridColumn: `span 1` }}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        </div>
        <div style={{ gridColumn: `span 1` }}>
          <ContextPanel
            visionContext={visionContext}
            onCaptureRequest={handleCaptureRequest}
          />
        </div>
        <div style={{ gridColumn: `span 1` }}>
          <ArtifactsPanel
            artifacts={artifacts}
            selectedArtifact={selectedArtifact}
            onArtifactSelect={setSelectedArtifact}
          />
        </div>
      </div>
    </div>
  );
});

Workstation.displayName = 'Workstation';

export default Workstation;
