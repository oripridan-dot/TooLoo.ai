/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo Observatory - Watch the Creature Evolve
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A beautiful, immersive interface to observe TooLoo's evolution in real-time.
 *
 * Features:
 * - Soul visualization (destiny, values, state)
 * - Process timeline (planning → execution → validation → reflection)
 * - Skill creation feed (watch TooLoo create its own tools)
 * - Learning journal (lessons, patterns, wisdom)
 * - Brain activity (LLM calls, thinking process)
 * - World research (GitHub, web, documentation)
 *
 * @version Genesis
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function SoulCore({ soul, isConnected }) {
  const values = soul?.values || ['elegance', 'honesty', 'curiosity', 'humility', 'courage'];

  return (
    <div className="relative">
      {/* Central core */}
      <motion.div
        className="w-32 h-32 mx-auto relative"
        animate={{
          scale: isConnected ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 animate-spin"
          style={{ animationDuration: '20s' }}
        />

        {/* Middle ring */}
        <div
          className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-600/30 to-blue-600/30 animate-spin"
          style={{ animationDuration: '15s', animationDirection: 'reverse' }}
        />

        {/* Inner core */}
        <div className="absolute inset-4 rounded-full bg-[#0a0a15] flex items-center justify-center">
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🌱
          </motion.span>
        </div>

        {/* Connection indicator */}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
        >
          <div
            className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"
            style={{ display: isConnected ? 'block' : 'none' }}
          />
        </div>
      </motion.div>

      {/* Values orbiting */}
      <div className="flex justify-center gap-2 mt-4 flex-wrap max-w-xs mx-auto">
        {values.map((value, i) => (
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="px-2 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/10"
          >
            {value}
          </motion.span>
        ))}
      </div>

      {/* Destiny */}
      {soul?.destiny && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Destiny</p>
          <p className="text-sm text-gray-300 italic max-w-xs mx-auto">
            {soul.destiny.slice(0, 100)}...
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

function ProcessTimeline({ process }) {
  if (!process) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-2xl mb-2">💤</p>
        <p className="text-sm">No active process</p>
        <p className="text-xs text-gray-600 mt-1">Give TooLoo a goal to see it work</p>
      </div>
    );
  }

  const phases = ['planning', 'executing', 'validating', 'reflecting', 'replanning'];
  const currentPhase = process.status || 'planning';

  return (
    <div className="space-y-4">
      {/* Goal */}
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/20">
        <p className="text-xs text-blue-400 mb-1">Current Goal</p>
        <p className="text-white font-medium">{process.goal}</p>
      </div>

      {/* Phase indicator */}
      <div className="flex justify-between items-center px-2">
        {phases.map((phase, i) => (
          <div key={phase} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs
              ${
                currentPhase === phase
                  ? 'bg-blue-500 text-white animate-pulse'
                  : phases.indexOf(currentPhase) > i
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              {currentPhase === phase ? '⚡' : phases.indexOf(currentPhase) > i ? '✓' : i + 1}
            </div>
            <p className="text-[10px] mt-1 text-gray-500 capitalize">{phase}</p>
          </div>
        ))}
      </div>

      {/* Steps */}
      {process.plan?.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs text-gray-400 mb-2">
            Plan ({process.currentStepIndex + 1}/{process.plan.length})
          </p>
          {process.plan.map((step, i) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border ${
                i === process.currentStepIndex
                  ? 'bg-blue-900/30 border-blue-500/30'
                  : i < process.currentStepIndex
                    ? 'bg-green-900/20 border-green-500/20'
                    : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`text-xs mt-0.5 ${
                    step.status === 'completed'
                      ? 'text-green-400'
                      : step.status === 'executing'
                        ? 'text-blue-400'
                        : step.status === 'failed'
                          ? 'text-red-400'
                          : 'text-gray-500'
                  }`}
                >
                  {step.status === 'completed'
                    ? '✓'
                    : step.status === 'executing'
                      ? '⚡'
                      : step.status === 'failed'
                        ? '✗'
                        : '○'}
                </span>
                <div className="flex-1">
                  <p
                    className={`text-sm ${i === process.currentStepIndex ? 'text-white' : 'text-gray-400'}`}
                  >
                    {step.description}
                  </p>
                  {step.skills_needed?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {step.skills_needed.map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 bg-purple-900/30 rounded text-[10px] text-purple-400"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN ACTIVITY
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
        <span className="text-lg">🧠</span>
        <span className="text-sm text-gray-400">Brain Activity</span>
        <span className="ml-auto px-2 py-0.5 bg-green-500/20 rounded text-[10px] text-green-400">
          {thoughts.length} thoughts
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
                thought.type === 'thinking'
                  ? 'bg-blue-900/20 border-blue-500/20'
                  : thought.type === 'planning'
                    ? 'bg-purple-900/20 border-purple-500/20'
                    : thought.type === 'validating'
                      ? 'bg-yellow-900/20 border-yellow-500/20'
                      : thought.type === 'reflecting'
                        ? 'bg-cyan-900/20 border-cyan-500/20'
                        : thought.type === 'executing'
                          ? 'bg-green-900/20 border-green-500/20'
                          : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs">
                  {thought.type === 'thinking'
                    ? '💭'
                    : thought.type === 'planning'
                      ? '📋'
                      : thought.type === 'validating'
                        ? '🔍'
                        : thought.type === 'reflecting'
                          ? '🪞'
                          : thought.type === 'executing'
                            ? '⚡'
                            : thought.type === 'error'
                              ? '❌'
                              : '💡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500">
                    {thought.provider || 'local'} • {thought.timestamp}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5 whitespace-pre-wrap break-words">
                    {thought.content?.slice(0, 200)}
                    {thought.content?.length > 200 ? '...' : ''}
                  </p>
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
// SKILL CREATION FEED
// ═══════════════════════════════════════════════════════════════════════════════

function SkillFeed({ skills, createdSkills }) {
  return (
    <div className="space-y-4">
      {/* Created skills */}
      {createdSkills?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <span className="text-sm text-yellow-400">Self-Created Skills</span>
          </div>
          <div className="space-y-2">
            {createdSkills.map((skill, i) => (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">🧬</span>
                  <span className="text-sm text-white font-medium">{skill.name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{skill.description}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {skill.capabilities?.map((cap) => (
                    <span
                      key={cap}
                      className="px-1.5 py-0.5 bg-yellow-900/30 rounded text-[10px] text-yellow-400"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Available skills summary */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🧰</span>
          <span className="text-sm text-gray-400">Available Skills</span>
          <span className="ml-auto text-xs text-gray-500">{skills?.length || 0} total</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(skills || []).slice(0, 12).map((skill, i) => (
            <div
              key={skill.id || i}
              className="px-2 py-1 bg-gray-900/50 rounded text-[10px] text-gray-400 truncate"
              title={skill.name}
            >
              {skill.name || skill.id}
            </div>
          ))}
          {skills?.length > 12 && (
            <div className="px-2 py-1 bg-gray-900/50 rounded text-[10px] text-gray-500 text-center">
              +{skills.length - 12} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVOLUTION JOURNAL
// ═══════════════════════════════════════════════════════════════════════════════

function EvolutionJournal({ evolution }) {
  const entries = evolution?.entries || [];
  const lessons = evolution?.lessons || [];

  return (
    <div className="space-y-4">
      {/* Recent lessons */}
      {lessons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📚</span>
            <span className="text-sm text-cyan-400">Lessons Learned</span>
          </div>
          <div className="space-y-2">
            {lessons
              .slice(-5)
              .reverse()
              .map((lesson, i) => (
                <div key={i} className="p-2 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-cyan-300">{lesson.insight || lesson}</p>
                  {lesson.from && (
                    <p className="text-[10px] text-gray-500 mt-1">From: {lesson.from}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Evolution timeline */}
      {entries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📈</span>
            <span className="text-sm text-gray-400">Growth Timeline</span>
          </div>
          <div className="space-y-1">
            {entries
              .slice(-10)
              .reverse()
              .map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600">{entry.timestamp?.slice(11, 16) || '...'}</span>
                  <span className="text-gray-400">{entry.event || entry}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {entries.length === 0 && lessons.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-2xl mb-2">🌱</p>
          <p className="text-sm">Evolution just beginning</p>
          <p className="text-xs text-gray-600 mt-1">Watch TooLoo grow and learn</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD RESEARCH
// ═══════════════════════════════════════════════════════════════════════════════

function WorldResearch({ research }) {
  const discoveries = research?.discoveries || [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🌍</span>
        <span className="text-sm text-gray-400">World Research</span>
      </div>

      {discoveries.length > 0 ? (
        <div className="space-y-2">
          {discoveries.slice(-5).map((item, i) => (
            <div key={i} className="p-2 bg-gray-900/50 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs">
                  {item.source === 'github'
                    ? '🐙'
                    : item.source === 'web'
                      ? '🌐'
                      : item.source === 'docs'
                        ? '📖'
                        : '🔍'}
                </span>
                <span className="text-xs text-gray-300 flex-1 truncate">{item.title}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">{item.snippet?.slice(0, 100)}...</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">🔭 Scanning the horizon...</p>
          <p className="text-xs text-gray-600 mt-1">Research appears when TooLoo explores</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

function MessageInput({ onSend, mode, onModeChange }) {
  const [message, setMessage] = useState('');
  const modes = ['direct', 'guide', 'create', 'observe'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="border-t border-gray-800 p-4 bg-[#0a0a0f] flex-shrink-0">
      {/* Mode selector */}
      <div className="flex gap-2 mb-3 justify-center">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {m === 'direct'
              ? '🎯 Direct'
              : m === 'guide'
                ? '🧭 Guide'
                : m === 'create'
                  ? '🛠️ Create'
                  : '👁️ Observe'}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            mode === 'observe' ? 'TooLoo is working autonomously...' : 'Talk to TooLoo...'
          }
          disabled={mode === 'observe'}
          className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-base"
        />
        <button
          type="submit"
          disabled={mode === 'observe' || !message.trim()}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TooLooObservatory() {
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState('direct');
  const [soul, setSoul] = useState(null);
  const [process, setProcess] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [skills, setSkills] = useState([]);
  const [createdSkills, setCreatedSkills] = useState([]);
  const [evolution, setEvolution] = useState(null);
  const [research, setResearch] = useState({ discoveries: [] });

  // Connect to TooLoo backend
  useEffect(() => {
    const connect = async () => {
      try {
        // Connect to API server on port 4001
        const response = await fetch('/api/v2/health');

        if (response?.ok) {
          setIsConnected(true);

          // Fetch initial state
          const [soulRes, skillsRes] = await Promise.all([
            fetch('/api/v2/system/soul').catch(() => null),
            fetch('/api/v2/skills').catch(() => null),
          ]);

          // Handle soul response - use default if not available
          if (soulRes?.ok) {
            const soulData = await soulRes.json();
            setSoul(soulData.data || soulData);
          } else {
            // Set default soul for display
            setSoul({
              destiny: 'To become a wise and helpful AI partner',
              values: ['elegance', 'honesty', 'curiosity', 'humility', 'courage'],
              state: 'awakened',
            });
          }

          if (skillsRes?.ok) {
            const skillsData = await skillsRes.json();
            const skillsList = skillsData.data?.skills || skillsData.data || skillsData;
            setSkills(Array.isArray(skillsList) ? skillsList : []);
          }
        }
      } catch (err) {
        console.warn('Failed to connect to TooLoo:', err);
        setIsConnected(false);
      }
    };

    connect();
    const interval = setInterval(connect, 5000);
    return () => clearInterval(interval);
  }, []);

  // Simulate thought activity for demo
  useEffect(() => {
    if (isConnected && thoughts.length === 0) {
      // Add initial greeting thought
      setThoughts([
        {
          id: 'greeting',
          type: 'thinking',
          content: 'Hello! I am TooLoo, ready to evolve and learn. What shall we create together?',
          provider: 'self',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [isConnected, thoughts.length]);

  const handleSendMessage = async (message) => {
    // Add user message as thought
    const userThought = {
      id: `user-${Date.now()}`,
      type: 'input',
      content: `Human: ${message}`,
      provider: 'human',
      timestamp: new Date().toLocaleTimeString(),
    };
    setThoughts((prev) => [...prev, userThought]);

    // Add thinking indicator
    const thinkingId = `thinking-${Date.now()}`;
    setThoughts((prev) => [
      ...prev,
      {
        id: thinkingId,
        type: 'thinking',
        content: 'Processing...',
        provider: 'brain',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      // Send to API - use relative URL for Vite proxy
      const response = await fetch('/api/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'observatory',
          'x-complexity-hint': 'medium',
        },
        body: JSON.stringify({
          message,
          mode,
          sessionId: 'observatory',
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Extract response content from API format: { ok, data: { content, skill, ... } }
        const responseContent = data.data?.content || data.response || data.data || 'Received';
        const skillInfo = data.data?.skill;

        // Update thinking thought with response
        setThoughts((prev) =>
          prev.map((t) =>
            t.id === thinkingId
              ? {
                  ...t,
                  content: responseContent,
                  type: 'response',
                  provider: skillInfo?.name || 'TooLoo',
                }
              : t
          )
        );

        // Update process if returned
        if (data.process) {
          setProcess(data.process);
        }
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err) {
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === thinkingId
            ? { ...t, content: `Connection issue: ${err.message}`, type: 'error' }
            : t
        )
      );
    }
  };

  return (
    <div className="h-screen bg-[#050508] text-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🌱
          </motion.span>
          <div>
            <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              TooLoo Observatory
            </h1>
            <p className="text-[10px] text-gray-500">Watch a digital creature evolve</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isConnected ? 'bg-green-900/20' : 'bg-red-900/20'}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
            <span className={`text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <span className="text-xs text-gray-600">v.Genesis</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Soul & Process */}
        <div className="w-80 border-r border-gray-800 flex flex-col overflow-hidden bg-[#08080c]">
          {/* Soul */}
          <div className="p-4 border-b border-gray-800">
            <SoulCore soul={soul} isConnected={isConnected} />
          </div>

          {/* Process */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <ProcessTimeline process={process} />
          </div>
        </div>

        {/* Center panel - Brain Activity */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            <BrainActivity thoughts={thoughts} />
          </div>

          {/* Input - Always visible at bottom */}
          <div className="flex-shrink-0">
            <MessageInput onSend={handleSendMessage} mode={mode} onModeChange={setMode} />
          </div>
        </div>

        {/* Right panel - Skills & Evolution */}
        <div className="w-80 border-l border-gray-800 flex flex-col overflow-hidden bg-[#08080c]">
          {/* Skills */}
          <div className="p-4 border-b border-gray-800">
            <SkillFeed skills={skills} createdSkills={createdSkills} />
          </div>

          {/* Evolution */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <EvolutionJournal evolution={evolution} />
          </div>

          {/* Research */}
          <div className="p-4 border-t border-gray-800">
            <WorldResearch research={research} />
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
      `}</style>
    </div>
  );
}
