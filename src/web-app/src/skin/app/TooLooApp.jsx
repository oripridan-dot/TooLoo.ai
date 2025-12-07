// @version 3.3.223
// TooLoo.ai - Main Liquid Synapsys Application
// The viewport IS TooLoo - Space V3 with organized cards

import React, { memo, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

// Synapsys DNA & Conductor - only import what we need
import { useSynapsynDNA, SynapysConductor, SYNAPSYS_PRESETS } from '../synapsys';

// Shell & Effects
import { LiquidShell, LiquidTransition } from '../shell/LiquidShell';
import { LiquidEngineProvider } from '../effects/LiquidEngine';
import { TextureEngineProvider } from '../effects/TextureEngine';

// Presence - only the provider
import { TooLooPresenceProvider } from '../TooLooPresence';

// Views
import { VIEWS } from '../views';

// Lazy load views for code splitting
const Space = lazy(() => import('../views/SpaceV3'));
const Cortex = lazy(() => import('../views/Cortex'));
const Synaptic = lazy(() => import('../views/Synaptic'));
const CreationSpace = lazy(() => import('../views/CreationSpaceView'));
const Growth = lazy(() => import('../views/Growth'));
const Studio = lazy(() => import('../views/Studio'));
const Command = lazy(() => import('../views/Command'));

// View component map
const VIEW_MAP = {
  space: Space,
  cortex: Cortex,
  synaptic: Synaptic,
  creationspace: CreationSpace,
  growth: Growth,
  studio: Studio,
  command: Command,
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
    gradient: 'hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 text-cyan-400',
  };

  const activeColorMap = {
    cyan: 'bg-cyan-500/20 border-cyan-500/50',
    purple: 'bg-purple-500/20 border-purple-500/50',
    emerald: 'bg-emerald-500/20 border-emerald-500/50',
    rose: 'bg-rose-500/20 border-rose-500/50',
    amber: 'bg-amber-500/20 border-amber-500/50',
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // View shortcuts (1-7)
      if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey) {
        const viewKeys = Object.keys(VIEWS);
        const index = parseInt(e.key) - 1;
        if (viewKeys[index]) {
          setActiveView(viewKeys[index]);
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

  // Get the current view component
  const ViewComponent = VIEW_MAP[activeView] || VIEW_MAP.space;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        collapsed={sidebarCollapsed}
      />

      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <LiquidTransition viewKey={activeView}>
          <Suspense fallback={<ViewLoading />}>
            <ViewComponent />
          </Suspense>
        </LiquidTransition>
      </main>
    </div>
  );
});

TooLooAppInner.displayName = 'TooLooAppInner';

// ============================================================================
// TOOLOO APP - With all providers (Lightweight)
// ============================================================================

const TooLooApp = memo(() => {
  return (
    <LiquidEngineProvider enabled={true}>
      <TooLooPresenceProvider>
        <TextureEngineProvider enabled={false}>
          <SynapysConductor>
            <LiquidShell showEdge={true}>
              <TooLooAppInner />
            </LiquidShell>
          </SynapysConductor>
        </TextureEngineProvider>
      </TooLooPresenceProvider>
    </LiquidEngineProvider>
  );
});

TooLooApp.displayName = 'TooLooApp';

export default TooLooApp;
