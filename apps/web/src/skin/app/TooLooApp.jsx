// @version 3.3.538
// TooLoo.ai - Main Liquid Synapsys Application
// The viewport IS TooLoo - Space V4 with professional UI & Projects
// V3.3.449: Added Projection Interface - ControlDeck header with provider/cost/confidence
// V3.3.450: Added Workstation view - 4-panel unified development interface
// V3.3.480: Added Living Canvas - emotional background layer with performance controls
// V3.3.532: Added CommandPalette (Cmd+K) - Quick actions and navigation

import React, { memo, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

// Synapsys DNA & Conductor - only import what we need
import { useSynapsynDNA, SynapysConductor, SYNAPSYS_PRESETS } from '../synapsys';

// V3.3.449: Projection Interface - Backend state visualization
import { ControlDeck } from '../components/ControlDeck';
import { KnowledgeRail } from '../components/KnowledgeRail';
import { useSystemState } from '../store/systemStateStore';

// V3.3.532: Command Palette - Quick actions
import { CommandPalette, useCommandPalette } from '../components/CommandPalette';

// V3.3.480: Living Canvas - Emotional background
import LivingCanvas from '../canvas/LivingCanvas';
import CanvasSocketBridge from '../canvas/CanvasSocketBridge';
import { DepthScene } from '../canvas/DepthParallax';

// Shell & Effects
import { LiquidShell, LiquidTransition } from '../shell/LiquidShell';
import { LiquidEngineProvider } from '../effects/LiquidEngine';
import { TextureEngineProvider } from '../effects/TextureEngine';

// Presence - only the provider
import { TooLooPresenceProvider } from '../TooLooPresence';

// Views
import { VIEWS } from '../views';

// Project Selector
import { ProjectSelector } from '../components/ProjectSelector';

// V3.3.405: SystemPulse HUD - Real-time file watcher visualization
import { SystemPulse } from '../components/SystemPulse';

// Lazy load views for code splitting
const Space = lazy(() => import('../views/SpaceV4'));
const Projects = lazy(() => import('../views/Projects'));
const Cortex = lazy(() => import('../views/Cortex'));
const Synaptic = lazy(() => import('../views/Synaptic'));
const CreationSpace = lazy(() => import('../views/CreationSpaceView'));
const Growth = lazy(() => import('../views/Growth'));
const Studio = lazy(() => import('../views/Studio'));
const Command = lazy(() => import('../views/Command'));
// V3.3.408: DeSignStudio and Internal Mirror
const Design = lazy(() => import('../views/Design'));
const Mirror = lazy(() => import('../views/Mirror'));
// V3.3.450: Workstation - 4-panel unified development interface
const Workstation = lazy(() => import('../views/Workstation'));

// View component map
const VIEW_MAP = {
  space: Space,
  projects: Projects,
  cortex: Cortex,
  synaptic: Synaptic,
  creationspace: CreationSpace,
  growth: Growth,
  studio: Studio,
  command: Command,
  design: Design,
  mirror: Mirror,
  workstation: Workstation,
};

// ============================================================================
// NAV ITEM - Navigation button
// ============================================================================

const NavItem = memo(({ view, isActive, onClick }) => {
  const config = VIEWS[view];
  if (!config) return null;

  const colorMap = {
    cyan: 'hover:bg-cyan-500/20 text-cyan-400',
    purple: 'hover:bg-purple-500/20 text-purple-400',
    emerald: 'hover:bg-emerald-500/20 text-emerald-400',
    rose: 'hover:bg-rose-500/20 text-rose-400',
    amber: 'hover:bg-amber-500/20 text-amber-400',
    indigo: 'hover:bg-indigo-500/20 text-indigo-400',
    gradient: 'hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 text-cyan-400',
  };

  const activeColorMap = {
    cyan: 'bg-cyan-500/20 border-cyan-500/50',
    purple: 'bg-purple-500/20 border-purple-500/50',
    emerald: 'bg-emerald-500/20 border-emerald-500/50',
    rose: 'bg-rose-500/20 border-rose-500/50',
    amber: 'bg-amber-500/20 border-amber-500/50',
    indigo: 'bg-indigo-500/20 border-indigo-500/50',
    gradient: 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/50',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(view)}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        ${
          isActive
            ? `${activeColorMap[config.color]} border`
            : `bg-white/5 border border-transparent ${colorMap[config.color]}`
        }
      `}
    >
      <span className="text-xl">{config.icon}</span>
      <div className="text-left hidden lg:block">
        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
          {config.name}
        </p>
        <p className="text-xs text-gray-500 hidden xl:block">{config.description}</p>
      </div>
      <span className="text-xs text-gray-600 ml-auto hidden xl:block">{config.shortcut}</span>
    </motion.button>
  );
});

NavItem.displayName = 'NavItem';

// ============================================================================
// SIDEBAR - Navigation sidebar (Simplified - no DNA hooks)
// ============================================================================

const Sidebar = memo(({ activeView, onViewChange, collapsed = false }) => {
  // Direct store access for preset changes - no hooks that cause re-renders
  const handleGoZen = useCallback(() => useSynapsynDNA.getState().transitionTo('zen'), []);
  const handleGoCreative = useCallback(
    () => useSynapsynDNA.getState().transitionTo('creative'),
    []
  );
  const handleGoImmersive = useCallback(
    () => useSynapsynDNA.getState().transitionTo('immersive'),
    []
  );

  const handleNewProject = useCallback(() => {
    // Navigate to projects view when creating new project
    onViewChange('projects');
  }, [onViewChange]);

  return (
    <div
      className={`
      h-full flex flex-col bg-black/20 backdrop-blur-sm border-r border-white/5
      ${collapsed ? 'w-16' : 'w-64'}
      transition-all duration-300
    `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400">👁</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-white">TooLoo</h1>
              <p className="text-xs text-gray-500">Liquid Synapsys</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Project Selector */}
      {!collapsed && (
        <div className="p-3 border-b border-white/5">
          <p className="text-xs text-gray-500 mb-2 px-1">Active Project</p>
          <ProjectSelector onNewProject={handleNewProject} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 overflow-auto">
        {Object.keys(VIEWS).map((view) => (
          <NavItem key={view} view={view} isActive={activeView === view} onClick={onViewChange} />
        ))}
      </nav>

      {/* Quick presets */}
      {!collapsed && (
        <div className="p-3 border-t border-white/5">
          <p className="text-xs text-gray-500 mb-2 px-2">Quick Mood</p>
          <div className="flex gap-1">
            <button
              onClick={handleGoZen}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 transition-colors"
              title="Zen Mode"
            >
              🧘
            </button>
            <button
              onClick={handleGoCreative}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 transition-colors"
              title="Creative Mode"
            >
              🎨
            </button>
            <button
              onClick={handleGoImmersive}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 transition-colors"
              title="Immersive Mode"
            >
              🌌
            </button>
          </div>
        </div>
      )}

      {/* Status - simplified, no TooLooEye/TooLooStatus to avoid hooks */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/50" />
          {!collapsed && <span className="text-xs text-gray-500">Online</span>}
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

// ============================================================================
// LOADING FALLBACK - simplified
// ============================================================================

const ViewLoading = memo(() => (
  <div className="h-full flex items-center justify-center">
    <div className="text-gray-500 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-cyan-500/20 animate-pulse" />
      <span className="text-sm">Loading...</span>
    </div>
  </div>
));

ViewLoading.displayName = 'ViewLoading';

// ============================================================================
// TOOLOO APP - Main application with Liquid Shell
// ============================================================================

const TooLooAppInner = memo(() => {
  const [activeView, setActiveView] = useState('space');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // V3.3.532: Command Palette state
  const { isOpen: commandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();

  // V3.3.532: Command Palette action handler
  const handleCommandAction = useCallback((action) => {
    console.log('[CommandPalette] Action:', action);
    
    switch (action.type) {
      // Navigation actions
      case 'view':
        if (action.target && VIEW_MAP[action.target]) {
          setActiveView(action.target);
        }
        break;
        
      // AI actions - emit to system
      case 'ai:generate':
      case 'ai:explain':
      case 'ai:refactor':
      case 'ai:test':
      case 'ai:review':
        // Get socket and emit to backend
        const socket = useSystemState.getState().connection?.socket;
        if (socket) {
          socket.emit('command:execute', { 
            type: action.type, 
            payload: action.payload 
          });
        }
        break;
        
      // Theme actions
      case 'theme':
        if (action.target === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (action.target === 'light') {
          document.documentElement.classList.remove('dark');
        }
        break;
        
      // Preset actions
      case 'preset':
        if (action.target && SYNAPSYS_PRESETS[action.target]) {
          useSynapsynDNA.getState().transitionTo(action.target);
        }
        break;
        
      // Toggle actions
      case 'toggle':
        if (action.target === 'sidebar') {
          setSidebarCollapsed(prev => !prev);
        } else if (action.target === 'knowledge') {
          setKnowledgeRailOpen(prev => !prev);
        }
        break;
        
      // Project actions
      case 'project:new':
        setActiveView('projects');
        break;
        
      case 'project:open':
        setActiveView('projects');
        break;
        
      default:
        console.log('[CommandPalette] Unhandled action:', action);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // V3.3.532: Command Palette (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      
      // Ignore if typing in input (except for Cmd+K above)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // View shortcuts (1-9, 0) - supports 10 views
      if (((e.key >= '1' && e.key <= '9') || e.key === '0') && !e.ctrlKey && !e.metaKey) {
        const viewKeys = Object.keys(VIEWS);
        const index = e.key === '0' ? 9 : parseInt(e.key) - 1;
        if (viewKeys[index]) {
          setActiveView(viewKeys[index]);
        }
      }

      // V3.3.450: Letter shortcuts for views (W for Workstation, etc.)
      if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const viewKeys = Object.keys(VIEWS);
        const matchedView = viewKeys.find(
          (key) => VIEWS[key].shortcut?.toLowerCase() === e.key.toLowerCase()
        );
        if (matchedView) {
          setActiveView(matchedView);
        }
      }

      // Toggle sidebar (Ctrl+B)
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }

      // Preset shortcuts (Ctrl+1-9)
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const presetKeys = Object.keys(SYNAPSYS_PRESETS);
        const index = parseInt(e.key) - 1;
        if (presetKeys[index]) {
          useSynapsynDNA.getState().transitionTo(presetKeys[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  // V3.3.449: Initialize Projection Interface store connection
  const initializeConnection = useSystemState((s) => s.initializeConnection);
  const [knowledgeRailOpen, setKnowledgeRailOpen] = useState(false);

  useEffect(() => {
    initializeConnection();
  }, [initializeConnection]);

  // Get the current view component
  const ViewComponent = VIEW_MAP[activeView] || VIEW_MAP.space;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* V3.3.449: Projection Interface Header - Shows provider, cost, confidence */}
      <ControlDeck />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-hidden relative">
          <LiquidTransition viewKey={activeView}>
            <Suspense fallback={<ViewLoading />}>
              <ViewComponent />
            </Suspense>
          </LiquidTransition>

          {/* V3.3.449: Knowledge Rail toggle button */}
          <button
            onClick={() => setKnowledgeRailOpen(!knowledgeRailOpen)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Toggle Knowledge Context"
          >
            📚
          </button>
        </main>

        {/* V3.3.449: Knowledge Rail - Shows retrieved context */}
        <KnowledgeRail isOpen={knowledgeRailOpen} onClose={() => setKnowledgeRailOpen(false)} />
      </div>
      
      {/* V3.3.532: Command Palette - Global quick actions */}
      <CommandPalette 
        isOpen={commandPaletteOpen}
        onClose={closeCommandPalette}
        onAction={handleCommandAction}
      />
    </div>
  );
});

TooLooAppInner.displayName = 'TooLooAppInner';

// ============================================================================
// TOOLOO APP - With all providers (Lightweight)
// ============================================================================

const TooLooApp = memo(() => {
  // V3.3.480: Get socket for Living Canvas bridge
  const socket = useSystemState((s) => s.connection?.socket);
  
  return (
    <LiquidEngineProvider enabled={true}>
      <TooLooPresenceProvider>
        <TextureEngineProvider enabled={false}>
          <SynapysConductor>
            {/* V3.3.480: Living Canvas - Emotional background layer */}
            <LivingCanvas />
            <CanvasSocketBridge socket={socket} />
            
            <LiquidShell showEdge={true}>
              <DepthScene showOrbs={true}>
                <TooLooAppInner />
              </DepthScene>
              {/* V3.3.405: System Pulse HUD - Shows file watcher activity */}
              <SystemPulse position="bottom-right" enabled={true} />
            </LiquidShell>
          </SynapysConductor>
        </TextureEngineProvider>
      </TooLooPresenceProvider>
    </LiquidEngineProvider>
  );
});

TooLooApp.displayName = 'TooLooApp';

export default TooLooApp;
