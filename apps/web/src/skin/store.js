// @version 2.2.408
// TooLoo.ai Skin Store - Zustand store for UI state management
// Manages theme, layout preferences, and component visibility

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LAYOUT_PRESETS } from './SkinShell';

export const useSkinStore = create(
  persist(
    (set, get) => ({
      // === THEME STATE ===
      theme: {
        mode: 'dark', // dark | light | cyberpunk | midnight
        accent: 'cyan', // cyan | purple | rose | amber | emerald
        fontScale: 1.0, // 0.8 - 1.2
      },

      setTheme: (updates) =>
        set((state) => ({
          theme: { ...state.theme, ...updates },
        })),

      // === LAYOUT STATE ===
      layout: {
        preset: 'monitor-mode',
        customSizes: null, // null = use preset, otherwise { sidebar, main, neural }
        sidebarCollapsed: false,
        neuralCollapsed: false,
        splitView: null, // null | { primary: 'Chat', secondary: 'CortexMonitor' }
      },

      setLayout: (updates) =>
        set((state) => ({
          layout: { ...state.layout, ...updates },
        })),

      applyPreset: (presetKey) => {
        const preset = LAYOUT_PRESETS[presetKey];
        if (preset) {
          set({
            layout: {
              preset: presetKey,
              customSizes: null,
              sidebarCollapsed: preset.sizes.sidebar <= 10,
              neuralCollapsed: preset.sizes.neural === 0,
              splitView: null,
            },
          });
        }
      },

      // === PANEL VISIBILITY ===
      panels: {
        sidebar: true,
        neural: true,
        header: true,
        thoughtBubble: true,
        activityLog: true,
      },

      togglePanel: (panelName) =>
        set((state) => ({
          panels: { ...state.panels, [panelName]: !state.panels[panelName] },
        })),

      // === WIDGET PREFERENCES ===
      widgets: {
        // Dashboard widget order and visibility
        dashboard: {
          order: ['stats', 'cortex', 'qa', 'decisions', 'cost'],
          hidden: [],
        },
        // Neural state widget order
        neural: {
          order: ['cortex', 'memory', 'providers', 'activity'],
          hidden: [],
        },
      },

      setWidgetOrder: (section, order) =>
        set((state) => ({
          widgets: {
            ...state.widgets,
            [section]: { ...state.widgets[section], order },
          },
        })),

      toggleWidget: (section, widgetId) =>
        set((state) => {
          const sectionWidgets = state.widgets[section];
          const isHidden = sectionWidgets.hidden.includes(widgetId);
          return {
            widgets: {
              ...state.widgets,
              [section]: {
                ...sectionWidgets,
                hidden: isHidden
                  ? sectionWidgets.hidden.filter((id) => id !== widgetId)
                  : [...sectionWidgets.hidden, widgetId],
              },
            },
          };
        }),

      // === SPLIT VIEW ===
      enableSplitView: (primary, secondary) =>
        set((state) => ({
          layout: {
            ...state.layout,
            splitView: { primary, secondary },
          },
        })),

      disableSplitView: () =>
        set((state) => ({
          layout: {
            ...state.layout,
            splitView: null,
          },
        })),

      // === QUICK ACTIONS ===
      focusMode: false,
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),

      // === KEYBOARD SHORTCUT PREFERENCES ===
      shortcuts: {
        toggleSidebar: ['Ctrl', 'Shift', 'B'],
        toggleNeural: ['Ctrl', 'Shift', 'N'],
        focusMode: ['Ctrl', 'Shift', 'F'],
        preset1: ['Ctrl', 'Shift', '1'],
        preset2: ['Ctrl', 'Shift', '2'],
        preset3: ['Ctrl', 'Shift', '3'],
      },

      // === RESET ===
      resetToDefaults: () =>
        set({
          theme: {
            mode: 'dark',
            accent: 'cyan',
            fontScale: 1.0,
          },
          layout: {
            preset: 'monitor-mode',
            customSizes: null,
            sidebarCollapsed: false,
            neuralCollapsed: false,
            splitView: null,
          },
          panels: {
            sidebar: true,
            neural: true,
            header: true,
            thoughtBubble: true,
            activityLog: true,
          },
          focusMode: false,
        }),
    }),
    {
      name: 'tooloo-skin-preferences',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        layout: state.layout,
        panels: state.panels,
        widgets: state.widgets,
        shortcuts: state.shortcuts,
      }),
    }
  )
);

export default useSkinStore;
