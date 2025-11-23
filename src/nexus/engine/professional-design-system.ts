// @version 2.1.28
/**
 * Professional Design System Engine
 * 
 * Comprehensive component and token system capable of creating complete design languages
 * inspired by and compatible with professional design systems (Material, Ant Design, 
 * Chakra UI, Carbon, Fluent, etc.)
 */

class ProfessionalDesignSystem {
  constructor() {
    // Comprehensive token structure matching professional design systems
    this.tokenCategories = {
      colors: {
        primary: null,
        secondary: null,
        tertiary: null,
        success: null,
        warning: null,
        error: null,
        info: null,
        neutral: null,
        background: null,
        surface: null,
        border: null,
        text: null,
      },
      typography: {
        'heading-1': { size: null, weight: null, lineHeight: null },
        'heading-2': { size: null, weight: null, lineHeight: null },
        'heading-3': { size: null, weight: null, lineHeight: null },
        'heading-4': { size: null, weight: null, lineHeight: null },
        'body-lg': { size: null, weight: null, lineHeight: null },
        'body-md': { size: null, weight: null, lineHeight: null },
        'body-sm': { size: null, weight: null, lineHeight: null },
        'label': { size: null, weight: null, lineHeight: null },
        'caption': { size: null, weight: null, lineHeight: null },
        'code': { size: null, weight: null, lineHeight: null, family: null },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'xxl': '32px',
        'xxxl': '48px',
      },
      sizing: {
        'xs': '20px',
        'sm': '28px',
        'md': '36px',
        'lg': '44px',
        'xl': '52px',
      },
      shadows: {
        'none': 'none',
        'xs': '0 1px 2px rgba(0,0,0,0.05)',
        'sm': '0 1px 3px rgba(0,0,0,0.1)',
        'md': '0 4px 6px rgba(0,0,0,0.1)',
        'lg': '0 10px 15px rgba(0,0,0,0.1)',
        'xl': '0 20px 25px rgba(0,0,0,0.1)',
        'elevation-1': '0 2px 4px rgba(0,0,0,0.12)',
        'elevation-2': '0 4px 8px rgba(0,0,0,0.15)',
        'elevation-3': '0 8px 16px rgba(0,0,0,0.15)',
        'elevation-4': '0 16px 32px rgba(0,0,0,0.15)',
        'elevation-5': '0 24px 48px rgba(0,0,0,0.2)',
      },
      borders: {
        'radius-none': '0',
        'radius-xs': '2px',
        'radius-sm': '4px',
        'radius-md': '8px',
        'radius-lg': '12px',
        'radius-xl': '16px',
        'radius-full': '9999px',
        'width-1': '1px',
        'width-2': '2px',
      },
      animations: {
        'duration-fast': '100ms',
        'duration-normal': '300ms',
        'duration-slow': '500ms',
        'easing-linear': 'linear',
        'easing-ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'easing-ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'easing-ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      opacity: {
        'disabled': '0.5',
        'hover': '0.8',
        'focus': '1',
      },
      zIndex: {
        'dropdown': '1000',
        'modal': '1100',
        'popover': '1050',
        'tooltip': '1150',
      },
    };

    // Comprehensive component system
    this.componentMap = {
      // Button variants
      'button': {
        tokens: ['color-primary', 'space-md', 'radius-md', 'shadow-sm'],
        variants: ['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'success', 'warning'],
        states: ['default', 'hover', 'active', 'disabled', 'loading'],
        sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
      },
      'button.primary': {
        tokens: ['color-primary', 'color-text-inverse', 'space-md'],
        css: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md) var(--space-lg);
          background-color: var(--color-primary);
          color: var(--color-text-inverse);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'button.secondary': {
        tokens: ['color-primary', 'space-md', 'radius-md'],
        css: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md) var(--space-lg);
          background-color: transparent;
          color: var(--color-primary);
          border: 2px solid var(--color-primary);
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'button.tertiary': {
        tokens: ['color-text', 'space-md'],
        css: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md) var(--space-lg);
          background-color: transparent;
          color: var(--color-text);
          border: none;
          cursor: pointer;
          text-decoration: underline;
          font-weight: 600;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'button.ghost': {
        tokens: ['color-text', 'space-md', 'radius-md'],
        css: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md) var(--space-lg);
          background-color: transparent;
          color: var(--color-text);
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 500;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },

      // Form elements
      'input': {
        tokens: ['color-border', 'color-text', 'space-md', 'radius-md', 'shadow-xs'],
        variants: ['text', 'email', 'password', 'number', 'date', 'time', 'textarea', 'select'],
        states: ['default', 'focus', 'hover', 'disabled', 'error'],
      },
      'input.text': {
        tokens: ['color-surface', 'color-border', 'color-text', 'space-md'],
        css: `
          width: 100%;
          padding: var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: inherit;
          color: var(--color-text);
          background-color: var(--color-surface);
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'textarea': {
        tokens: ['color-surface', 'color-border', 'color-text', 'space-md'],
        css: `
          width: 100%;
          padding: var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: inherit;
          color: var(--color-text);
          background-color: var(--color-surface);
          resize: vertical;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'select': {
        tokens: ['color-surface', 'color-border', 'color-text', 'space-md'],
        css: `
          width: 100%;
          padding: var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: inherit;
          color: var(--color-text);
          background-color: var(--color-surface);
          cursor: pointer;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'checkbox': {
        tokens: ['color-primary', 'color-border', 'space-sm'],
        css: `
          width: 18px;
          height: 18px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-xs);
          cursor: pointer;
          accent-color: var(--color-primary);
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'radio': {
        tokens: ['color-primary', 'color-border', 'space-sm'],
        css: `
          width: 18px;
          height: 18px;
          border: 2px solid var(--color-border);
          border-radius: 50%;
          cursor: pointer;
          accent-color: var(--color-primary);
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'toggle': {
        tokens: ['color-primary', 'color-border', 'radius-full'],
        css: `
          position: relative;
          display: inline-block;
          width: 50px;
          height: 26px;
          background-color: var(--color-border);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: background-color var(--duration-normal) var(--easing-ease-out);
        `,
      },

      // Cards and containers
      'card': {
        tokens: ['color-surface', 'color-border', 'space-lg', 'radius-lg', 'shadow-md'],
        variants: ['default', 'elevated', 'outlined', 'interactive'],
        css: `
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          box-shadow: var(--shadow-md);
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'panel': {
        tokens: ['color-surface', 'color-border', 'space-md', 'radius-md'],
        css: `
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'section': {
        tokens: ['color-background', 'space-xl'],
        css: `
          background-color: var(--color-background);
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
        `,
      },

      // Navigation
      'nav': {
        tokens: ['color-surface', 'color-border', 'space-lg'],
        variants: ['horizontal', 'vertical', 'breadcrumb', 'steppers', 'tabs'],
        css: `
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-lg);
          background-color: var(--color-surface);
        `,
      },
      'nav.item': {
        tokens: ['color-text', 'space-md', 'radius-md'],
        css: `
          padding: var(--space-md) var(--space-lg);
          color: var(--color-text);
          text-decoration: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--duration-normal) var(--easing-ease-out);
        `,
      },
      'nav.active': {
        tokens: ['color-primary'],
        css: `
          color: var(--color-primary);
          font-weight: 600;
          border-bottom: 2px solid var(--color-primary);
        `,
      },
      'breadcrumb': {
        tokens: ['color-text', 'space-sm'],
        css: `
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: var(--body-sm);
        `,
      },
      'pagination': {
        tokens: ['color-primary', 'space-sm', 'radius-md'],
        css: `
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          list-style: none;
        `,
      },
      'tabs': {
        tokens: ['color-text', 'color-primary', 'space-md'],
        css: `
          display: flex;
          gap: var(--space-md);
          border-bottom: 1px solid var(--color-border);
        `,
      },
      'tabs.pane': {
        tokens: ['color-surface', 'space-lg'],
        css: `
          padding: var(--space-lg);
          background-color: var(--color-surface);
        `,
      },

      // Typography
      'heading-1': {
        tokens: ['font-heading-1', 'color-text', 'space-lg'],
        css: `
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text);
          margin-bottom: var(--space-lg);
        `,
      },
      'heading-2': {
        tokens: ['font-heading-2', 'color-text', 'space-lg'],
        css: `
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text);
          margin-bottom: var(--space-lg);
        `,
      },
      'heading-3': {
        tokens: ['font-heading-3', 'color-text', 'space-md'],
        css: `
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text);
          margin-bottom: var(--space-md);
        `,
      },
      'body': {
        tokens: ['font-body-md', 'color-text', 'space-md'],
        css: `
          font-size: 1rem;
          line-height: 1.6;
          color: var(--color-text);
        `,
      },
      'caption': {
        tokens: ['font-caption', 'color-text-secondary', 'space-sm'],
        css: `
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          opacity: 0.7;
        `,
      },

      // Feedback & Status
      'alert': {
        tokens: ['color-background', 'color-border', 'space-md', 'radius-md'],
        variants: ['info', 'success', 'warning', 'error'],
        css: `
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border-left: 4px solid;
          background-color: var(--color-background);
        `,
      },
      'badge': {
        tokens: ['color-primary', 'space-sm', 'radius-full'],
        variants: ['success', 'error', 'warning', 'info'],
        css: `
          display: inline-block;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          background-color: var(--color-primary);
          color: white;
        `,
      },
      'tooltip': {
        tokens: ['color-background', 'space-sm', 'radius-md', 'shadow-lg', 'z-tooltip'],
        css: `
          position: absolute;
          padding: var(--space-sm);
          background-color: var(--color-background);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          white-space: nowrap;
          box-shadow: var(--shadow-lg);
          z-index: var(--z-tooltip);
        `,
      },
      'modal': {
        tokens: ['color-surface', 'space-lg', 'radius-lg', 'shadow-xl', 'z-modal'],
        css: `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--color-surface);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          box-shadow: var(--shadow-xl);
          z-index: var(--z-modal);
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        `,
      },
      'notification': {
        tokens: ['color-surface', 'space-md', 'radius-md', 'shadow-lg'],
        variants: ['info', 'success', 'warning', 'error'],
        css: `
          padding: var(--space-md);
          border-radius: var(--radius-md);
          background-color: var(--color-surface);
          box-shadow: var(--shadow-lg);
        `,
      },

      // Data Display
      'table': {
        tokens: ['color-surface', 'color-border', 'space-md'],
        css: `
          width: 100%;
          border-collapse: collapse;
          background-color: var(--color-surface);
        `,
      },
      'table.row': {
        tokens: ['color-border', 'space-md'],
        css: `
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-md) 0;
        `,
      },
      'table.cell': {
        tokens: ['color-text', 'space-md'],
        css: `
          padding: var(--space-md);
          color: var(--color-text);
        `,
      },
      'list': {
        tokens: ['color-text', 'space-md'],
        css: `
          list-style: none;
          padding: 0;
        `,
      },
      'list.item': {
        tokens: ['color-text', 'space-md', 'color-border'],
        css: `
          padding: var(--space-md) 0;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
        `,
      },
      'avatar': {
        tokens: ['color-primary', 'radius-full'],
        sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
        css: `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background-color: var(--color-primary);
          color: white;
          font-weight: 600;
        `,
      },
      'progress': {
        tokens: ['color-primary', 'color-border', 'radius-full'],
        css: `
          width: 100%;
          height: 4px;
          border-radius: var(--radius-full);
          background-color: var(--color-border);
          overflow: hidden;
        `,
      },

      // Interactive
      'accordion': {
        tokens: ['color-border', 'space-md', 'color-text'],
        css: `
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        `,
      },
      'accordion.item': {
        tokens: ['color-border', 'space-md'],
        css: `
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-md) 0;
        `,
      },
      'dropdown': {
        tokens: ['color-surface', 'color-border', 'space-md', 'shadow-lg', 'z-dropdown'],
        css: `
          position: absolute;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: var(--z-dropdown);
          min-width: 200px;
        `,
      },
      'popover': {
        tokens: ['color-surface', 'color-border', 'space-md', 'shadow-lg', 'radius-md', 'z-popover'],
        css: `
          position: absolute;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          box-shadow: var(--shadow-lg);
          z-index: var(--z-popover);
        `,
      },
    };
  }

  /**
   * Map a design system to semantic tokens
   */
  mapDesignSystemToTokens(designInput) {
    const tokens = { ...this.tokenCategories };

    // Map colors
    if (designInput.colors) {
      tokens.colors.primary = designInput.colors.primary || '#6366f1';
      tokens.colors.secondary = designInput.colors.secondary || '#ec4899';
      tokens.colors.tertiary = designInput.colors.tertiary || designInput.colors.secondary;
      tokens.colors.success = designInput.colors.success || '#10b981';
      tokens.colors.warning = designInput.colors.warning || '#f59e0b';
      tokens.colors.error = designInput.colors.error || '#ef4444';
      tokens.colors.info = designInput.colors.info || '#3b82f6';
      tokens.colors.neutral = designInput.colors.neutral || '#6b7280';
      tokens.colors.background = designInput.colors.background || '#ffffff';
      tokens.colors.surface = designInput.colors.surface || '#f9fafb';
      tokens.colors.border = designInput.colors.border || '#e5e7eb';
      tokens.colors.text = designInput.colors.text || '#1f2937';
    }

    // Map typography
    if (designInput.typography) {
      const primaryFont = designInput.typography.primary || 'system-ui, sans-serif';
      const monoFont = designInput.typography.mono || 'monospace';
      
      tokens.typography['heading-1'].size = '2.5rem';
      tokens.typography['heading-1'].weight = '700';
      tokens.typography['heading-2'].size = '2rem';
      tokens.typography['heading-2'].weight = '700';
      tokens.typography['heading-3'].size = '1.5rem';
      tokens.typography['heading-3'].weight = '700';
      tokens.typography['heading-4'].size = '1.25rem';
      tokens.typography['heading-4'].weight = '600';
      tokens.typography['body-lg'].size = '1.125rem';
      tokens.typography['body-lg'].weight = '400';
      tokens.typography['body-md'].size = '1rem';
      tokens.typography['body-md'].weight = '400';
      tokens.typography['body-sm'].size = '0.875rem';
      tokens.typography['body-sm'].weight = '400';
      tokens.typography['label'].size = '0.875rem';
      tokens.typography['label'].weight = '600';
      tokens.typography['caption'].size = '0.75rem';
      tokens.typography['caption'].weight = '500';
      tokens.typography['code'].size = '0.875rem';
      tokens.typography['code'].weight = '500';
      tokens.typography['code'].family = monoFont;
    }

    // Map spacing
    if (designInput.spacing) {
      tokens.spacing.xs = designInput.spacing.xs || '4px';
      tokens.spacing.sm = designInput.spacing.sm || '8px';
      tokens.spacing.md = designInput.spacing.md || '12px';
      tokens.spacing.lg = designInput.spacing.lg || '16px';
      tokens.spacing.xl = designInput.spacing.xl || '24px';
      tokens.spacing.xxl = designInput.spacing.xxl || '32px';
    }

    return tokens;
  }

  /**
   * Generate comprehensive CSS for all components
   */
  generateComprehensiveCSS(tokens) {
    let css = '/* AUTO-GENERATED COMPREHENSIVE COMPONENT CSS FROM DESIGN TOKENS */\n\n';

    // CSS Variables from tokens
    css += ':root {\n';
    css += `  --color-primary: ${tokens.colors.primary};\n`;
    css += `  --color-secondary: ${tokens.colors.secondary};\n`;
    css += `  --color-success: ${tokens.colors.success};\n`;
    css += `  --color-error: ${tokens.colors.error};\n`;
    css += `  --color-warning: ${tokens.colors.warning};\n`;
    css += `  --color-text: ${tokens.colors.text};\n`;
    css += `  --color-surface: ${tokens.colors.surface};\n`;
    css += `  --color-border: ${tokens.colors.border};\n`;
    
    // Spacing variables
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      css += `  --space-${key}: ${value};\n`;
    });

    // Shadows
    Object.entries(tokens.shadows).forEach(([key, value]) => {
      css += `  --shadow-${key}: ${value};\n`;
    });

    // Borders
    Object.entries(tokens.borders).forEach(([key, value]) => {
      css += `  --radius-${key.replace('radius-', '')}: ${value};\n`;
    });

    // Animations
    Object.entries(tokens.animations).forEach(([key, value]) => {
      css += `  --${key}: ${value};\n`;
    });

    // Z-index
    Object.entries(tokens.zIndex).forEach(([key, value]) => {
      css += `  --z-${key}: ${value};\n`;
    });

    css += '}\n\n';

    // Generate CSS rules for components
    Object.entries(this.componentMap).forEach(([componentName, componentDef]) => {
      if (componentDef.css) {
        css += `/* ${componentName} */\n`;
        css += `.${componentName} {\n`;
        css += `  ${componentDef.css.trim().split('\n').join('\n  ')}\n`;
        css += '}\n\n';
      }
    });

    return css;
  }

  /**
   * Build component map showing which tokens affect which components
   */
  buildComponentMap(tokens) {
    const map = {};

    Object.entries(this.componentMap).forEach(([componentName, componentDef]) => {
      if (componentDef.tokens) {
        componentDef.tokens.forEach(tokenName => {
          if (!map[tokenName]) {
            map[tokenName] = [];
          }
          map[tokenName].push(componentName);
        });
      }
    });

    return map;
  }

  /**
   * Get all components for a specific category
   */
  getComponentsByCategory(category) {
    const categories = {
      buttons: Object.keys(this.componentMap).filter(c => c.includes('button')),
      forms: Object.keys(this.componentMap).filter(c => ['input', 'textarea', 'select', 'checkbox', 'radio', 'toggle'].includes(c)),
      navigation: Object.keys(this.componentMap).filter(c => ['nav', 'breadcrumb', 'pagination', 'tabs'].includes(c) || c.includes('nav.')),
      containers: Object.keys(this.componentMap).filter(c => ['card', 'panel', 'section'].includes(c)),
      typography: Object.keys(this.componentMap).filter(c => c.includes('heading') || c.includes('body') || c.includes('caption')),
      feedback: Object.keys(this.componentMap).filter(c => ['alert', 'badge', 'tooltip', 'modal', 'notification'].includes(c)),
      data: Object.keys(this.componentMap).filter(c => ['table', 'list', 'avatar', 'progress'].includes(c) || c.includes('table.') || c.includes('list.')),
      interactive: Object.keys(this.componentMap).filter(c => ['accordion', 'dropdown', 'popover'].includes(c) || c.includes('accordion.') || c.includes('tabs.')),
    };

    return categories[category] || [];
  }

  /**
   * Get full system statistics
   */
  getSystemStats() {
    return {
      totalComponents: Object.keys(this.componentMap).length,
      totalTokens: Object.keys(this.tokenCategories).reduce((sum, cat) => {
        const catTokens = this.tokenCategories[cat];
        return sum + (typeof catTokens === 'object' ? Object.keys(catTokens).length : 1);
      }, 0),
      categories: Object.keys(this.tokenCategories),
      componentsByCategory: {
        buttons: this.getComponentsByCategory('buttons').length,
        forms: this.getComponentsByCategory('forms').length,
        navigation: this.getComponentsByCategory('navigation').length,
        containers: this.getComponentsByCategory('containers').length,
        typography: this.getComponentsByCategory('typography').length,
        feedback: this.getComponentsByCategory('feedback').length,
        data: this.getComponentsByCategory('data').length,
        interactive: this.getComponentsByCategory('interactive').length,
      },
    };
  }
}

export default ProfessionalDesignSystem;
