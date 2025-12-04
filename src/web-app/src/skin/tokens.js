// @version 2.2.449
// TooLoo.ai Design Token Authority - Enhanced
// Single source of truth for all visual tokens with runtime utilities

// ============================================================================
// TYPE SAFETY HELPERS
// ============================================================================
const createColorScale = (base, name) => ({
  DEFAULT: base,
  50: `color-mix(in srgb, ${base} 10%, transparent)`,
  100: `color-mix(in srgb, ${base} 20%, transparent)`,
  200: `color-mix(in srgb, ${base} 30%, transparent)`,
  500: base,
  muted: `color-mix(in srgb, ${base} 20%, transparent)`,
});

// ============================================================================
// TOKENS
// ============================================================================
export const tokens = {
  // === COLORS: The DNA ===
  colors: {
    // Core palette (obsidian dark theme)
    obsidian: '#0a0a0a',
    surface: '#0f1117',
    surfaceElevated: '#151820',
    surfaceOverlay: '#1a1f28',

    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    borderMuted: 'rgba(255, 255, 255, 0.1)',
    borderDefault: 'rgba(255, 255, 255, 0.15)',
    borderStrong: 'rgba(255, 255, 255, 0.25)',

    // Text hierarchy
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af', // gray-400
    textMuted: '#6b7280', // gray-500
    textDisabled: '#4b5563', // gray-600

    // Accent colors (emotion-driven)
    accent: {
      cyan: '#06b6d4', // Primary accent
      cyanMuted: 'rgba(6, 182, 212, 0.2)',
      purple: '#a855f7', // Learning/exploration
      purpleMuted: 'rgba(168, 85, 247, 0.2)',
      rose: '#f43f5e', // Creative/design
      roseMuted: 'rgba(244, 63, 94, 0.2)',
      amber: '#f59e0b', // Warning/attention
      amberMuted: 'rgba(245, 158, 11, 0.2)',
      emerald: '#10b981', // Success/health
      emeraldMuted: 'rgba(16, 185, 129, 0.2)',
      red: '#ef4444', // Error/critical
      redMuted: 'rgba(239, 68, 68, 0.2)',
    },

    // Provider-specific (for Cortex visualization)
    providers: {
      openai: '#10b981',
      anthropic: '#f59e0b',
      google: '#3b82f6',
      groq: '#ec4899',
      ollama: '#8b5cf6',
    },

    // Semantic states
    states: {
      hover: 'rgba(255, 255, 255, 0.05)',
      active: 'rgba(255, 255, 255, 0.1)',
      focus: 'rgba(6, 182, 212, 0.3)',
      disabled: 'rgba(255, 255, 255, 0.02)',
    },
  },

  // === SPACING: The Rhythm ===
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
  },

  // === TYPOGRAPHY: The Voice ===
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // === RADII: The Curves ===
  radii: {
    none: '0',
    sm: '0.25rem', // 4px
    default: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    full: '9999px',
  },

  // === SHADOWS: The Depth ===
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    default: '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
    md: '0 4px 12px 0 rgba(0, 0, 0, 0.5)',
    lg: '0 8px 24px 0 rgba(0, 0, 0, 0.6)',
    glow: {
      cyan: '0 0 20px rgba(6, 182, 212, 0.3)',
      purple: '0 0 20px rgba(168, 85, 247, 0.3)',
      rose: '0 0 20px rgba(244, 63, 94, 0.3)',
    },
  },

  // === TRANSITIONS: The Motion ===
  transitions: {
    duration: {
      instant: '0ms',
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      glacial: '500ms',
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },

  // === LAYOUT: The Structure ===
  layout: {
    sidebar: {
      width: 256, // px - collapsible
      minWidth: 64, // px - icon rail
      maxWidth: 320, // px - expanded
    },
    neuralState: {
      width: 320, // px
      minWidth: 280, // px
      maxWidth: 480, // px
    },
    header: {
      height: 48, // px
    },
    panel: {
      minSize: 15, // % - minimum panel size
    },
    breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
  },

  // === Z-INDEX: The Layers ===
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    toast: 80,
  },
};

// CSS Custom Properties generator
export function generateCSSVariables() {
  const vars = [];

  // Colors
  vars.push(`--skin-bg-obsidian: ${tokens.colors.obsidian}`);
  vars.push(`--skin-bg-surface: ${tokens.colors.surface}`);
  vars.push(`--skin-bg-elevated: ${tokens.colors.surfaceElevated}`);
  vars.push(`--skin-bg-overlay: ${tokens.colors.surfaceOverlay}`);

  vars.push(`--skin-border-subtle: ${tokens.colors.borderSubtle}`);
  vars.push(`--skin-border-muted: ${tokens.colors.borderMuted}`);
  vars.push(`--skin-border-default: ${tokens.colors.borderDefault}`);

  vars.push(`--skin-text-primary: ${tokens.colors.textPrimary}`);
  vars.push(`--skin-text-secondary: ${tokens.colors.textSecondary}`);
  vars.push(`--skin-text-muted: ${tokens.colors.textMuted}`);

  vars.push(`--skin-accent-cyan: ${tokens.colors.accent.cyan}`);
  vars.push(`--skin-accent-purple: ${tokens.colors.accent.purple}`);
  vars.push(`--skin-accent-rose: ${tokens.colors.accent.rose}`);
  vars.push(`--skin-accent-amber: ${tokens.colors.accent.amber}`);
  vars.push(`--skin-accent-emerald: ${tokens.colors.accent.emerald}`);

  // Shadows
  vars.push(`--skin-shadow-glow-cyan: ${tokens.shadows.glow.cyan}`);
  vars.push(`--skin-shadow-glow-purple: ${tokens.shadows.glow.purple}`);

  // Transitions
  vars.push(`--skin-transition-fast: ${tokens.transitions.duration.fast}`);
  vars.push(`--skin-transition-normal: ${tokens.transitions.duration.normal}`);

  return vars.join(';\n');
}

// ============================================================================
// RUNTIME UTILITIES
// ============================================================================

/**
 * Get a token value by path (e.g., 'colors.accent.cyan')
 */
export function getToken(path, fallback = null) {
  try {
    return path.split('.').reduce((obj, key) => obj?.[key], tokens) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Inject CSS variables into the document
 */
export function injectCSSVariables() {
  const style = document.getElementById('skin-tokens') || document.createElement('style');
  style.id = 'skin-tokens';
  style.textContent = `:root { ${generateCSSVariables()} }`;
  if (!document.getElementById('skin-tokens')) {
    document.head.appendChild(style);
  }
}

/**
 * Get spacing value in rem
 */
export function space(key) {
  return tokens.spacing[key] || '0';
}

/**
 * Get font size with line height
 */
export function fontSize(key) {
  const size = tokens.typography.fontSize[key];
  return size ? { fontSize: size[0], lineHeight: size[1].lineHeight } : {};
}

/**
 * Create a color with opacity
 */
export function colorWithAlpha(colorKey, alpha) {
  const color = getToken(`colors.accent.${colorKey}`) || getToken(`colors.${colorKey}`);
  if (!color) return 'transparent';
  
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  return color;
}

/**
 * Get responsive breakpoint value
 */
export function breakpoint(key) {
  return tokens.layout.breakpoints[key] || 1024;
}

/**
 * Media query helper
 */
export function media(key) {
  return `@media (min-width: ${breakpoint(key)}px)`;
}

export default tokens;
