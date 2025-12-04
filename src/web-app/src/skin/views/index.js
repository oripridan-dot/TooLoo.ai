// @version 2.2.619
// TooLoo.ai Views Index
// The 6 main views of TooLoo - with new Creation Space paradigm

// Cortex - TooLoo's brain visualization (providers, processing)
export { default as Cortex } from './Cortex';

// Synaptic - Classic conversation and neural activity
export { default as Synaptic } from './Synaptic';

// CreationSpace - NEW: Emergent thought manifestation (replaces traditional chat)
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
  cortex: {
    id: 'cortex',
    name: 'Cortex',
    icon: '🧠',
    description: 'Brain visualization & providers',
    color: 'cyan',
    shortcut: '1',
  },
  synaptic: {
    id: 'synaptic',
    name: 'Synaptic',
    icon: '💬',
    description: 'Classic conversation mode',
    color: 'purple',
    shortcut: '2',
  },
  creationspace: {
    id: 'creationspace',
    name: 'Creation Space',
    icon: '✨',
    description: 'Emergent thought crystallization',
    color: 'gradient',
    shortcut: '3',
    isNew: true,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    icon: '📈',
    description: 'Learning & health monitoring',
    color: 'emerald',
    shortcut: '4',
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    icon: '🎨',
    description: 'Design & creation space',
    color: 'rose',
    shortcut: '5',
  },
  command: {
    id: 'command',
    name: 'Command',
    icon: '⚙️',
    description: 'System control & settings',
    color: 'amber',
    shortcut: '6',
  },
};

// View component map for dynamic rendering
export const VIEW_COMPONENTS = {
  cortex: () => import('./Cortex').then((m) => m.default),
  synaptic: () => import('./Synaptic').then((m) => m.default),
  creationspace: () => import('./CreationSpaceView').then((m) => m.default),
  growth: () => import('./Growth').then((m) => m.default),
  studio: () => import('./Studio').then((m) => m.default),
  command: () => import('./Command').then((m) => m.default),
};
