// @version 2.2.516
// TooLoo.ai Skin Shell - Enhanced with TooLoo Presence System
// Top-quality, resilient layout system with error boundaries, accessibility, liquid visuals, and TooLoo's soul

import React, { useState, useCallback, useEffect, useMemo, memo, Component } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import tokens from './tokens';
import {
  LiquidEngineProvider,
  PointerAurora,
  EmotionalOrbs,
  useLiquidEngine,
  FPSMonitor,
  EMOTIONS,
} from './effects/LiquidEngine';
import { TextureEngineProvider, TextureLayer, TextureOverlay } from './effects/TextureEngine';
import {
  TooLooPresenceProvider,
  useTooLooPresence,
  TooLooEye,
  TooLooBreath,
  TooLooStatus,
} from './TooLooPresence';

// ============================================================================
// ERROR BOUNDARY - Catches and handles panel render errors gracefully
// ============================================================================
class PanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SkinShell] Panel error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-red-500/5 border border-red-500/20 rounded-lg m-2">
          <div className="text-center p-4">
            <div className="text-red-400 text-sm font-medium mb-2">Panel Error</div>
            <div className="text-xs text-gray-500 max-w-xs">
              {this.state.error?.message || 'Something went wrong'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Debounce utility for resize events
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Screen reader announcement helper
function announceToScreenReader(message) {
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => document.body.removeChild(el), 1000);
}

// ============================================================================
// RESIZE HANDLE - Visual feedback with accessibility
// ============================================================================
const ResizeHandle = memo(({ direction = 'horizontal', className = '', id }) => {
  const [isDragging, setIsDragging] = useState(false);
  const isVertical = direction === 'vertical';

  return (
    <PanelResizeHandle
      id={id}
      className={`
        group relative flex items-center justify-center
        ${isVertical ? 'h-2 cursor-row-resize' : 'w-2 cursor-col-resize'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
        ${className}
      `}
      onDragging={setIsDragging}
    >
      {/* Visual handle indicator */}
      <div
        className={`
          absolute transition-all duration-150 ease-out
          ${isVertical ? 'w-12 h-1 rounded-full' : 'w-1 h-12 rounded-full'}
          ${
            isDragging
              ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)] scale-110'
              : 'bg-white/10 group-hover:bg-cyan-500/50 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.3)]'
          }
        `}
        aria-hidden="true"
      />

      {/* Invisible hit area for easier grabbing */}
      <div
        className={`absolute ${isVertical ? 'inset-x-0 -inset-y-2' : 'inset-y-0 -inset-x-2'}`}
        aria-hidden="true"
      />

      {/* Screen reader text */}
      <span className="sr-only">
        Resize {isVertical ? 'vertically' : 'horizontally'}. Use arrow keys to adjust.
      </span>
    </PanelResizeHandle>
  );
});

ResizeHandle.displayName = 'ResizeHandle';

// Layout preset configurations - Beautiful work environment presets
export const LAYOUT_PRESETS = {
  'chat-focus': {
    name: 'Chat Focus',
    description: 'Deep work mode for conversations',
    icon: '💬',
    emoji: '🎯',
    theme: 'focused',
    sizes: {
      sidebar: 12,
      main: 70,
      neural: 18,
    },
    shortcuts: ['Ctrl', 'Shift', '1'],
    accent: 'cyan',
    bgGradient: 'from-cyan-900/5 via-transparent to-transparent',
  },
  'monitor-mode': {
    name: 'Command Center',
    description: 'Full system oversight & monitoring',
    icon: '📊',
    emoji: '🛸',
    theme: 'observant',
    sizes: {
      sidebar: 18,
      main: 48,
      neural: 34,
    },
    shortcuts: ['Ctrl', 'Shift', '2'],
    accent: 'purple',
    bgGradient: 'from-purple-900/5 via-transparent to-cyan-900/5',
  },
  dashboard: {
    name: 'Dashboard',
    description: 'Analytics & insights view',
    icon: '🎛️',
    emoji: '📈',
    theme: 'analytical',
    sizes: {
      sidebar: 15,
      main: 85,
      neural: 0,
    },
    shortcuts: ['Ctrl', 'Shift', '3'],
    accent: 'amber',
    bgGradient: 'from-amber-900/5 via-transparent to-transparent',
  },
  minimal: {
    name: 'Zen Mode',
    description: 'Distraction-free creative space',
    icon: '🎯',
    emoji: '🧘',
    theme: 'minimal',
    sizes: {
      sidebar: 5,
      main: 80,
      neural: 15,
    },
    shortcuts: ['Ctrl', 'Shift', '4'],
    accent: 'emerald',
    bgGradient: 'from-emerald-900/5 via-transparent to-transparent',
  },
  split: {
    name: 'Split View',
    description: 'Multi-tasking powerhouse',
    icon: '⚡',
    emoji: '⚡',
    theme: 'productive',
    sizes: {
      sidebar: 20,
      main: 40,
      neural: 40,
    },
    shortcuts: ['Ctrl', 'Shift', '5'],
    accent: 'rose',
    bgGradient: 'from-rose-900/5 via-transparent to-purple-900/5',
  },
  research: {
    name: 'Research Lab',
    description: 'Wide main for exploration',
    icon: '🔬',
    emoji: '🔬',
    theme: 'explorative',
    sizes: {
      sidebar: 15,
      main: 60,
      neural: 25,
    },
    shortcuts: ['Ctrl', 'Shift', '6'],
    accent: 'blue',
    bgGradient: 'from-blue-900/5 via-transparent to-indigo-900/5',
  },
  presentation: {
    name: 'Showcase',
    description: 'Clean view for demos',
    icon: '🎭',
    emoji: '✨',
    theme: 'presentation',
    sizes: {
      sidebar: 0,
      main: 75,
      neural: 25,
    },
    shortcuts: ['Ctrl', 'Shift', '7'],
    accent: 'violet',
    bgGradient: 'from-violet-900/5 via-transparent to-fuchsia-900/5',
  },
};

// Default layout
const DEFAULT_LAYOUT = {
  preset: 'monitor-mode',
  sizes: LAYOUT_PRESETS['monitor-mode'].sizes,
  sidebarCollapsed: false,
  neuralCollapsed: false,
};

const STORAGE_KEY = 'tooloo_skin_layout';
const STORAGE_VERSION = 2;

// Load persisted layout from localStorage with version migration
const loadLayout = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(saved);

    // Version migration - reset if outdated
    if (!parsed.version || parsed.version < STORAGE_VERSION) {
      console.info('[SkinShell] Migrating layout storage to version', STORAGE_VERSION);
      return DEFAULT_LAYOUT;
    }

    // Validate required fields
    if (!parsed.sizes || typeof parsed.sizes.main !== 'number') {
      console.warn('[SkinShell] Invalid layout data, using defaults');
      return DEFAULT_LAYOUT;
    }

    return {
      ...DEFAULT_LAYOUT,
      ...parsed,
      // Ensure sizes are within safe bounds
      sizes: {
        sidebar: Math.max(0, Math.min(40, parsed.sizes.sidebar ?? 15)),
        main: Math.max(30, Math.min(100, parsed.sizes.main ?? 60)),
        neural: Math.max(0, Math.min(50, parsed.sizes.neural ?? 25)),
      },
    };
  } catch (e) {
    console.warn('[SkinShell] Failed to load layout:', e.message);
    return DEFAULT_LAYOUT;
  }
};

// Save layout to localStorage with versioning
const saveLayout = (layout) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...layout, version: STORAGE_VERSION, savedAt: Date.now() })
    );
  } catch (e) {
    console.warn('[SkinShell] Failed to save layout:', e.message);
  }
};

export const SkinShell = memo(
  ({
    sidebar,
    main,
    neural,
    header,
    showNeural = true,
    liquidEffects = true,
    showAurora = true,
    showOrbs = false,
    // Texture options
    showTexture = true,
    textureType = 'noise', // noise, perlin, plasma, circuits, aurora, etc.
    textureIntensity = 0.5,
    textureBlendMode = 'overlay',
    className = '',
  }) => {
    const [layout, setLayout] = useState(loadLayout);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Responsive breakpoint detection with debounce
    useEffect(() => {
      const checkViewport = () => {
        const width = window.innerWidth;
        setIsMobile(width < tokens.layout.breakpoints.md);
        setIsTablet(width >= tokens.layout.breakpoints.md && width < tokens.layout.breakpoints.lg);
      };

      checkViewport();
      setIsHydrated(true);

      const handleResize = debounce(checkViewport, 100);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Persist layout changes (debounced to avoid spam)
    useEffect(() => {
      if (isHydrated) {
        const save = debounce(() => saveLayout(layout), 500);
        save();
      }
    }, [layout, isHydrated]);

    // Handle panel resize with bounds checking
    const handleResize = useCallback((sizes) => {
      const [sidebarSize, mainSize, neuralSize] = sizes;
      setLayout((prev) => ({
        ...prev,
        preset: 'custom',
        sizes: {
          sidebar: Math.round(sidebarSize ?? prev.sizes.sidebar),
          main: Math.round(mainSize ?? prev.sizes.main),
          neural: Math.round(neuralSize ?? prev.sizes.neural),
        },
      }));
    }, []);

    // Apply preset with validation and announcement
    const applyPreset = useCallback((presetKey) => {
      const preset = LAYOUT_PRESETS[presetKey];
      if (!preset) {
        console.warn('[SkinShell] Unknown preset:', presetKey);
        return;
      }

      setLayout({
        preset: presetKey,
        sizes: { ...preset.sizes },
        sidebarCollapsed: preset.sizes.sidebar <= 10,
        neuralCollapsed: preset.sizes.neural === 0,
      });

      announceToScreenReader(`Layout changed to ${preset.name}`);
    }, []);

    // Toggle sidebar with smart main panel adjustment
    const toggleSidebar = useCallback(() => {
      setLayout((prev) => {
        const collapsed = !prev.sidebarCollapsed;
        const sidebarSize = collapsed ? 5 : 20;
        const mainAdjustment = collapsed ? 15 : -15;

        return {
          ...prev,
          preset: 'custom',
          sidebarCollapsed: collapsed,
          sizes: {
            ...prev.sizes,
            sidebar: sidebarSize,
            main: Math.min(95, Math.max(30, prev.sizes.main + mainAdjustment)),
          },
        };
      });
    }, []);

    // Toggle neural panel with smart main panel adjustment
    const toggleNeural = useCallback(() => {
      setLayout((prev) => {
        const collapsed = !prev.neuralCollapsed;
        const neuralSize = collapsed ? 0 : 25;
        const mainAdjustment = collapsed ? 25 : -25;

        return {
          ...prev,
          preset: 'custom',
          neuralCollapsed: collapsed,
          sizes: {
            ...prev.sizes,
            neural: neuralSize,
            main: Math.min(95, Math.max(30, prev.sizes.main + mainAdjustment)),
          },
        };
      });
    }, []);

    // Keyboard shortcuts with input field protection
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (!e.ctrlKey || !e.shiftKey) return;

        // Prevent conflicts with input fields
        if (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        ) {
          return;
        }

        const presetMap = {
          1: 'chat-focus',
          2: 'monitor-mode',
          3: 'dashboard',
          4: 'minimal',
          5: 'split',
          6: 'research',
          7: 'presentation',
        };

        if (presetMap[e.key]) {
          e.preventDefault();
          applyPreset(presetMap[e.key]);
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleSidebar();
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          toggleNeural();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [applyPreset, toggleSidebar, toggleNeural]);

    // Memoized context value to prevent unnecessary re-renders
    const layoutContext = useMemo(
      () => ({
        layout,
        applyPreset,
        toggleSidebar,
        toggleNeural,
        presets: LAYOUT_PRESETS,
        isMobile,
        isTablet,
      }),
      [layout, applyPreset, toggleSidebar, toggleNeural, isMobile, isTablet]
    );

    // Mobile: Simplified stack layout
    if (isMobile) {
      return (
        <LiquidEngineProvider enabled={liquidEffects}>
          <TooLooPresenceProvider>
            <TextureEngineProvider enabled={showTexture}>
              <SkinLayoutContext.Provider value={layoutContext}>
                {/* Liquid Effects Layer */}
                {liquidEffects && showAurora && (
                  <PointerAurora size={250} intensity={0.5} blur={60} />
                )}
                {liquidEffects && showOrbs && (
                  <EmotionalOrbs count={3} size={{ min: 30, max: 80 }} />
                )}

                {/* Texture Layer - Dynamic reactive textures */}
                {showTexture && (
                  <TextureLayer
                    texture={textureType}
                    intensity={textureIntensity * 0.7}
                    scale={0.8}
                  />
                )}

                {/* FPS Monitor (Ctrl+Shift+F to toggle) */}
                <FPSMonitor position="bottom-right" />

                <div
                  className={`flex flex-col h-screen bg-[#0a0a0a] relative ${className}`}
                  role="application"
                  aria-label="TooLoo Application"
                >
                  {header}
                  <main className="flex-1 overflow-hidden" role="main">
                    <PanelErrorBoundary>{main}</PanelErrorBoundary>
                  </main>
                </div>
              </SkinLayoutContext.Provider>
            </TextureEngineProvider>
          </TooLooPresenceProvider>
        </LiquidEngineProvider>
      );
    }

    // Desktop/Tablet: Full resizable layout
    return (
      <LiquidEngineProvider enabled={liquidEffects}>
        <TooLooPresenceProvider>
          <TextureEngineProvider enabled={showTexture}>
            <SkinLayoutContext.Provider value={layoutContext}>
              {/* Liquid Effects Layer - Behind all content */}
              {liquidEffects && showAurora && (
                <PointerAurora size={350} intensity={0.6} blur={80} />
              )}
              {liquidEffects && showOrbs && (
                <EmotionalOrbs count={5} size={{ min: 40, max: 100 }} />
              )}

              {/* Texture Layer - Dynamic reactive textures */}
              {showTexture && (
                <TextureLayer texture={textureType} intensity={textureIntensity} scale={1} />
              )}

              {/* FPS Monitor (Ctrl+Shift+F to toggle) */}
              <FPSMonitor position="bottom-right" />

              <div
                className={`flex flex-col h-screen bg-[#0a0a0a] relative ${className}`}
                role="application"
                aria-label="TooLoo Application"
              >
                {header}

                <PanelGroup
                  direction="horizontal"
                  className="flex-1"
                  onLayout={handleResize}
                  autoSaveId="tooloo-skin-layout-v2"
                >
                  {/* Sidebar Panel */}
                  <Panel
                    id="sidebar-panel"
                    defaultSize={layout.sizes.sidebar}
                    minSize={5}
                    maxSize={35}
                    collapsible
                    collapsedSize={5}
                    onCollapse={() => setLayout((prev) => ({ ...prev, sidebarCollapsed: true }))}
                    onExpand={() => setLayout((prev) => ({ ...prev, sidebarCollapsed: false }))}
                    className="overflow-hidden"
                    order={1}
                  >
                    <PanelErrorBoundary>
                      <nav
                        className="h-full overflow-hidden"
                        role="navigation"
                        aria-label="Sidebar"
                      >
                        {typeof sidebar === 'function'
                          ? sidebar({ collapsed: layout.sidebarCollapsed, toggle: toggleSidebar })
                          : sidebar}
                      </nav>
                    </PanelErrorBoundary>
                  </Panel>

                  <ResizeHandle id="sidebar-resize" />

                  {/* Main Content Panel */}
                  <Panel
                    id="main-panel"
                    defaultSize={layout.sizes.main}
                    minSize={30}
                    className="overflow-hidden"
                    order={2}
                  >
                    <PanelErrorBoundary>
                      <main className="h-full overflow-auto" role="main">
                        {main}
                      </main>
                    </PanelErrorBoundary>
                  </Panel>

                  {/* Neural State Panel (conditional) */}
                  {showNeural && !layout.neuralCollapsed && (
                    <>
                      <ResizeHandle id="neural-resize" />
                      <Panel
                        id="neural-panel"
                        defaultSize={layout.sizes.neural}
                        minSize={15}
                        maxSize={50}
                        collapsible
                        collapsedSize={0}
                        onCollapse={() => setLayout((prev) => ({ ...prev, neuralCollapsed: true }))}
                        className="overflow-hidden"
                        order={3}
                      >
                        <PanelErrorBoundary>
                          <aside
                            className="h-full overflow-hidden"
                            role="complementary"
                            aria-label="Neural State"
                          >
                            {typeof neural === 'function'
                              ? neural({ collapsed: layout.neuralCollapsed, toggle: toggleNeural })
                              : neural}
                          </aside>
                        </PanelErrorBoundary>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </div>
              {/* TooLoo's subtle presence indicator */}
              <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
                <TooLooEye size={20} />
                <TooLooStatus className="text-gray-400" />
              </div>
            </SkinLayoutContext.Provider>
          </TextureEngineProvider>
        </TooLooPresenceProvider>
      </LiquidEngineProvider>
    );
  }
);

SkinShell.displayName = 'SkinShell';

// Context for layout controls
export const SkinLayoutContext = React.createContext({
  layout: DEFAULT_LAYOUT,
  applyPreset: () => {},
  toggleSidebar: () => {},
  toggleNeural: () => {},
  presets: LAYOUT_PRESETS,
  isMobile: false,
});

// Hook to access layout controls
export const useSkinLayout = () => React.useContext(SkinLayoutContext);

export default SkinShell;
