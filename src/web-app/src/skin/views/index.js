// @version 3.3.591
// TooLoo.ai Views Index
// The views of TooLoo - with professional Space V4 & Figma-style Projects

// Space V4 - Professional UI with real chat & expand
export { default as Space } from './SpaceV4';

// Previous versions (preserved)
export { default as SpaceV3 } from './SpaceV3';
export { default as SpaceV2 } from './SpaceV2';

// Cortex - TooLoo's brain visualization (providers, processing)
export { default as Cortex } from './Cortex';

// Synaptic - Classic conversation and neural activity
export { default as Synaptic } from './Synaptic';

// Projects - Figma/GitHub-style project management
export { default as Projects } from './Projects';

// CreationSpace - Legacy: Emergent thought manifestation
export { default as CreationSpace } from './CreationSpaceView';

// Growth - Learning, exploration, health monitoring
export { default as Growth } from './Growth';

// Studio - Design, creation, emergence
export { default as Studio } from './Studio';

// Command - System control, settings, testing
export { default as Command } from './Command';

// LiquidSkinShowcase - Full immersive demo of Liquid Skin system
export { default as LiquidSkinShowcase } from './LiquidSkinShowcase';

// V3.3.408: DeSignStudio - Visual Cortex interface
export { default as Design } from './Design';

// V3.3.408: Internal Mirror - Self-hosted code editor with Monaco
export { default as Mirror } from './Mirror';

// V3.3.450: Workstation - The 4-Panel Unified Development Interface (Phase 2d)
export { default as Workstation } from './Workstation';

// V3.3.586: UnifiedDevelopment - Single machine for Genesis + Synapsys
export { default as UnifiedDevelopment } from './UnifiedDevelopment';

// View registry for dynamic routing
export const VIEWS = {
  unified: {
    id: 'unified',
    name: 'Unified Dev',
    icon: '⚡',
    description: 'ONE machine for development',
    color: 'gradient',
    shortcut: 'U',
    isNew: true,
    isPrimary: true, // The new primary unified view
  },
  workstation: {
    id: 'workstation',
    name: 'Workstation',
    icon: '🖥️',
    description: '4-panel unified development interface',
    color: 'cyan',
    shortcut: 'W',
    isNew: true,
  },
  space: {
    id: 'space',
    name: 'Space',
    icon: '👁',
    description: 'Unified creative canvas',
    color: 'gradient',
    shortcut: '1',
    isNew: false,
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    icon: '📂',
    description: 'Manage your projects',
    color: 'indigo',
    shortcut: '2',
    isNew: true,
  },
  cortex: {
    id: 'cortex',
    name: 'Cortex',
    icon: '🧠',
    description: 'Brain visualization & providers',
    color: 'cyan',
    shortcut: '3',
  },
  synaptic: {
    id: 'synaptic',
    name: 'Synaptic',
    icon: '💬',
    description: 'Classic conversation mode',
    color: 'purple',
    shortcut: '4',
  },
  creationspace: {
    id: 'creationspace',
    name: 'Creation Space',
    icon: '✨',
    description: 'Emergent thought crystallization',
    color: 'gradient',
    shortcut: '5',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    icon: '📈',
    description: 'Learning & health monitoring',
    color: 'emerald',
    shortcut: '6',
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    icon: '🎨',
    description: 'Design & creation space',
    color: 'rose',
    shortcut: '7',
  },
  command: {
    id: 'command',
    name: 'Command',
    icon: '⚙️',
    description: 'System control & settings',
    color: 'amber',
    shortcut: '8',
  },
  design: {
    id: 'design',
    name: 'Design',
    icon: '🎭',
    description: 'Visual Cortex studio',
    color: 'rose',
    shortcut: '9',
    isNew: true,
  },
  mirror: {
    id: 'mirror',
    name: 'Mirror',
    icon: '🪞',
    description: 'Self-hosted code editor',
    color: 'cyan',
    shortcut: '0',
    isNew: true,
  },
};

// View component map for dynamic rendering
export const VIEW_COMPONENTS = {
  unified: () => import('./UnifiedDevelopment').then((m) => m.default),
  workstation: () => import('./Workstation').then((m) => m.default),
  space: () => import('./SpaceV4').then((m) => m.default),
  projects: () => import('./Projects').then((m) => m.default),
  cortex: () => import('./Cortex').then((m) => m.default),
  synaptic: () => import('./Synaptic').then((m) => m.default),
  creationspace: () => import('./CreationSpaceView').then((m) => m.default),
  growth: () => import('./Growth').then((m) => m.default),
  studio: () => import('./Studio').then((m) => m.default),
  command: () => import('./Command').then((m) => m.default),
  design: () => import('./Design').then((m) => m.default),
  mirror: () => import('./Mirror').then((m) => m.default),
};
