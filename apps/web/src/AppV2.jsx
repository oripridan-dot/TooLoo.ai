/**
 * AppV2.jsx - Synapsys Skill Shell
 * The "Operating System" that renders whatever skills the Nucleus provides.
 * No hardcoded menus - UI is 100% generated from the skill registry.
 *
 * @version 3.3.579-skill-shell
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, ConnectionState } from './hooks/useSocket';
import { apiRequest } from './utils/api';

// The "Universal Renderer" - Maps Skill IDs to Interfaces
// In a full implementation, these would be lazy-loaded dynamically
import ChatV2 from './components/ChatV2';
import SkillStudio from './components/SkillStudio';
import AdminDashboard from './components/AdminDashboard';
import MissionControl from './components/MissionControl';
import { AuthPage } from './components/Login';
import SkillMetricsDashboard from './components/SkillMetricsDashboard';
import TooLooObservatory from './components/TooLooObservatoryV3'; // V3 Clean Real-Data Observatory

// Fallback registry for when the API is cold or unreachable
// These are the UI-native skills that have renderers
const DEFAULT_SKILLS = [
  { id: 'core.observatory', name: 'Observatory', icon: '🔭', component: TooLooObservatory },
  { id: 'core.chat', name: 'Cognition', icon: '🧠', component: ChatV2 },
  { id: 'core.skills', name: 'Skill Studio', icon: '🧬', component: SkillStudio },
  { id: 'core.metrics', name: 'Metrics', icon: '📊', component: SkillMetricsDashboard },
  { id: 'core.admin', name: 'Nucleus', icon: '🎛️', component: AdminDashboard },
  { id: 'core.mission', name: 'Mission Control', icon: '🚀', component: MissionControl },
  { id: 'core.auth', name: 'Identity', icon: '👤', component: AuthPage },
];

// Component mapping for dynamic skill loading
// Maps skill IDs to their React components
// All skills use ChatV2 as the universal conversational interface
const COMPONENT_MAP = {
  // Core UI skills
  'core.observatory': TooLooObservatory,
  'core.chat': ChatV2,
  'core.skills': SkillStudio,
  'core.metrics': SkillMetricsDashboard,
  'core.admin': AdminDashboard,
  'core.mission': MissionControl,
  'core.auth': AuthPage,

  // === YAML-DEFINED SKILLS (from /skills directory) ===

  // Coding Skills
  'coding-assistant': ChatV2,
  architect: ChatV2,
  'research-analyst': ChatV2,
  'documentation-writer': ChatV2,
  'test-generator': ChatV2,
  'refactoring-expert': ChatV2,
  'code-reviewer': ChatV2,

  // Meta Skills (self-awareness & evolution)
  'self-awareness': ChatV2,
  'self-modification': ChatV2,
  'skill-creator': ChatV2,
  'skill-evolution': ChatV2,
  'skill-metrics': SkillMetricsDashboard,
  'autonomous-evolution': ChatV2, // Phase 8: Self-improvement

  // Learning Skills
  learning: ChatV2,
  experimentation: ChatV2,
  serendipity: ChatV2,
  'meta-cognition': ChatV2,

  // Memory Skills
  memory: ChatV2,
  knowledge: ChatV2,
  context: ChatV2,

  // Emergence Skills
  emergence: ChatV2,
  prediction: ChatV2,
  'goal-pursuit': ChatV2,

  // Execution Skills
  'sandbox-execution': ChatV2, // Safe isolated code execution

  // Core Skills
  scheduler: ChatV2,
  orchestrator: ChatV2,

  // Observability Skills
  observability: ChatV2,

  // Routing (meta-skill)
  routing: ChatV2,

  // Legacy API skills (backward compatibility)
  'default-chat': ChatV2,
  'code-generator': ChatV2,
  'code-analyzer': ChatV2,
};

function SkillIcon({ icon }) {
  return <span className="text-xl filter drop-shadow-md">{icon || '📦'}</span>;
}

export default function AppV2() {
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [activeSkillId, setActiveSkillId] = useState('core.observatory');
  const [loading, setLoading] = useState(true);
  const [bootMessage, setBootMessage] = useState('SYNAPSYS NUCLEUS BOOTING...');

  const { connectionState, systemStatus, emit } = useSocket({ autoConnect: true });

  // BOOT SEQUENCE: Ask Nucleus "What capabilities do I have?"
  useEffect(() => {
    const bootSynapsys = async () => {
      try {
        setBootMessage('CONNECTING TO NUCLEUS...');

        // Try to fetch skills from the Nucleus (for health check)
        await apiRequest('/skills');

        // Only show DEFAULT_SKILLS in sidebar
        // Other skills (coding-assistant, self-awareness, etc.) are used
        // for automatic routing based on message content, not manual selection
        setSkills(DEFAULT_SKILLS);
        setBootMessage('NUCLEUS ONLINE');

        await new Promise((r) => setTimeout(r, 300)); // Brief pause for visual feedback
        setLoading(false);
      } catch (err) {
        console.warn('Nucleus unreachable, using fallback skills:', err.message);
        setBootMessage('OFFLINE MODE');
        await new Promise((r) => setTimeout(r, 500));
        setSkills(DEFAULT_SKILLS);
        setLoading(false);
      }
    };

    bootSynapsys();
  }, []);

  // Periodic health ping when connected
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED) {
      const interval = setInterval(() => emit('system:ping'), 30000);
      return () => clearInterval(interval);
    }
  }, [connectionState, emit]);

  const activeSkill = skills.find((s) => s.id === activeSkillId) || skills[0];
  const ActiveComponent = activeSkill?.component || null;

  // Boot screen
  if (loading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center flex-col space-y-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-500 font-mono text-sm animate-pulse">{bootMessage}</p>
      </div>
    );
  }

  // Fallback if no component
  if (!ActiveComponent) {
    return (
      <div className="flex h-screen bg-black items-center justify-center flex-col space-y-4">
        <p className="text-red-500 font-mono text-sm">No skill component available</p>
        <button
          onClick={() => setActiveSkillId('core.chat')}
          className="px-4 py-2 bg-blue-600 rounded text-white"
        >
          Reset to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {/* DYNAMIC SIDEBAR - Generated from skill registry */}
      <div className="w-20 lg:w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col flex-shrink-0 z-20">
        {/* Brand */}
        <div className="h-16 flex items-center px-4 lg:px-6 border-b border-white/5 bg-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            T
          </div>
          <span className="ml-3 font-bold tracking-wide hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            TooLoo
          </span>
        </div>

        {/* Skill Matrix */}
        <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
          {skills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => setActiveSkillId(skill.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                activeSkillId === skill.id
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <SkillIcon icon={skill.icon} />
              <span className="font-medium text-sm hidden lg:block group-hover:translate-x-1 transition-transform">
                {skill.name}
              </span>
              {activeSkillId === skill.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] hidden lg:block" />
              )}
            </button>
          ))}
        </div>

        {/* System Status Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 text-xs">
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionState === ConnectionState.CONNECTED
                  ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                  : connectionState === ConnectionState.CONNECTING
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500 animate-pulse'
              }`}
            />
            <span className="text-gray-400 hidden lg:block">
              {connectionState === ConnectionState.CONNECTED
                ? 'NUCLEUS ONLINE'
                : connectionState === ConnectionState.CONNECTING
                  ? 'CONNECTING...'
                  : 'SEARCHING...'}
            </span>
          </div>
          {systemStatus && (
            <div className="hidden lg:flex justify-between text-gray-600 font-mono">
              <span>RAM: {systemStatus.memory?.percentage ?? 0}%</span>
              <span>Skills: {skills.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* REALITY RENDERER (The Viewport) */}
      <div className="flex-1 relative flex flex-col bg-[#050505]">
        <header className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">/</span>
            <span className="font-medium text-white">{activeSkill?.name}</span>
          </div>
          <div className="text-xs font-mono text-gray-600 border border-white/10 px-2 py-1 rounded">
            ID: {activeSkill?.id}
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSkillId}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, duration: 0.1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {ActiveComponent ? (
                <ActiveComponent />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No component available for this skill</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
