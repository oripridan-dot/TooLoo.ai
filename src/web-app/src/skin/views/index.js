// @version 3.3.224
// TooLoo.ai Views Index
// The views of TooLoo - with organized Space V3 paradigm

// Space V3 - NEW: Organized cards with brief & suggestions
export { default as Space } from './SpaceV3';

// Previous versions (preserved)
export { default as SpaceV2 } from './SpaceV2';

// Cortex - TooLoo's brain visualization (providers, processing)
export { default as Cortex } from './Cortex';

// Synaptic - Classic conversation and neural activity
export { default as Synaptic } from './Synaptic';

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

// View registry for dynamic routing
export const VIEWS = {
  space: {
    id: 'space',
    name: 'Space',
    icon: '👁',
    description: 'Unified creative canvas',
    color: 'gradient',
    shortcut: '1',
    isNew: true,
    isPrimary: true,
  },
  cortex: {
    id: 'cortex',
    name: 'Cortex',
    icon: '🧠',
    description: 'Brain visualization & providers',
    color: 'cyan',
    shortcut: '2',
  },
  synaptic: {
    id: 'synaptic',
    name: 'Synaptic',
    icon: '💬',
    description: 'Classic conversation mode',
    color: 'purple',
    shortcut: '3',
  },
  creationspace: {
    id: 'creationspace',
    name: 'Creation Space',
    icon: '✨',
    description: 'Emergent thought crystallization',
    color: 'gradient',
    shortcut: '4',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    icon: '📈',
    description: 'Learning & health monitoring',
    color: 'emerald',
    shortcut: '5',
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    icon: '🎨',
    description: 'Design & creation space',
    color: 'rose',
    shortcut: '6',
  },
  command: {
    id: 'command',
    name: 'Command',
    icon: '⚙️',
    description: 'System control & settings',
    color: 'amber',
    shortcut: '7',
  },
};

// View component map for dynamic rendering
export const VIEW_COMPONENTS = {
  space: () => import('./SpaceV3').then((m) => m.default),
  cortex: () => import('./Cortex').then((m) => m.default),
  synaptic: () => import('./Synaptic').then((m) => m.default),
  creationspace: () => import('./CreationSpaceView').then((m) => m.default),
  growth: () => import('./Growth').then((m) => m.default),
  studio: () => import('./Studio').then((m) => m.default),
  command: () => import('./Command').then((m) => m.default),
};
