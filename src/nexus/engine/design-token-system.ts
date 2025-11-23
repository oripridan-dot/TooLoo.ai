// @version 2.1.28
/**
 * Design Token System - Semantic, component-aware design tokens
 * 
 * Instead of global CSS variables, we map design decisions to specific components
 * Example: "primary color" → Button primary, Link active, Badge success, etc.
 */

export class DesignTokenSystem {
  constructor() {
    /**
     * Token map: design intent → component applications
     * Each token has:
     *   - value: the actual color/size/font
     *   - appliesTo: which components/classes use it
     *   - role: semantic meaning (primary, secondary, accent, etc.)
     *   - category: colors, typography, spacing, shadows, etc.
     */
    this.tokens = {};
    
    /**
     * Component map: which tokens affect each component
     * Enables targeted CSS generation
     */
    this.componentTokenMap = {
      // BUTTONS
      'button.primary': {
        background: 'color-primary',
        text: 'color-text-inverse',
        border: 'color-primary-dark',
        hover: 'color-primary-hover',
        active: 'color-primary-active'
      },
      'button.secondary': {
        background: 'color-secondary',
        text: 'color-text',
        border: 'color-secondary-dark',
        hover: 'color-secondary-hover'
      },
      'button.tertiary': {
        background: 'color-surface-secondary',
        text: 'color-text-secondary',
        border: 'color-border'
      },
      
      // CARDS & CONTAINERS
      'card': {
        background: 'color-surface',
        border: 'color-border',
        text: 'color-text',
        shadow: 'shadow-card'
      },
      'panel': {
        background: 'color-surface-secondary',
        border: 'color-border-subtle',
        text: 'color-text'
      },
      
      // INPUTS & FORMS
      'input': {
        background: 'color-surface',
        text: 'color-text',
        border: 'color-border',
        placeholder: 'color-text-muted',
        focus: 'color-primary'
      },
      'textarea': {
        background: 'color-surface',
        text: 'color-text',
        border: 'color-border',
        placeholder: 'color-text-muted'
      },
      'select': {
        background: 'color-surface',
        text: 'color-text',
        border: 'color-border'
      },
      
      // TEXT & TYPOGRAPHY
      'h1': { color: 'color-text', font: 'font-primary-xl' },
      'h2': { color: 'color-text', font: 'font-primary-lg' },
      'h3': { color: 'color-text', font: 'font-primary-md' },
      'body': { color: 'color-text', font: 'font-primary-base' },
      'caption': { color: 'color-text-muted', font: 'font-primary-sm' },
      
      // BADGES & STATUS
      'badge.success': { background: 'color-success', text: 'color-text-inverse' },
      'badge.error': { background: 'color-error', text: 'color-text-inverse' },
      'badge.warning': { background: 'color-warning', text: 'color-text-inverse' },
      
      // NAVIGATION
      'nav.active': { color: 'color-primary', borderBottom: 'border-primary' },
      'nav.inactive': { color: 'color-text-secondary' }
    };
    
    /**
     * Token definitions - semantic naming
     * Allows design systems to provide values that map to tokens
     */
    this.tokenDefinitions = {
      // Colors
      'color-primary': { category: 'color', semantic: 'primary action' },
      'color-primary-dark': { category: 'color', semantic: 'primary dark' },
      'color-primary-hover': { category: 'color', semantic: 'primary hover state' },
      'color-primary-active': { category: 'color', semantic: 'primary active state' },
      'color-secondary': { category: 'color', semantic: 'secondary action' },
      'color-secondary-dark': { category: 'color', semantic: 'secondary dark' },
      'color-secondary-hover': { category: 'color', semantic: 'secondary hover' },
      'color-text': { category: 'color', semantic: 'primary text' },
      'color-text-inverse': { category: 'color', semantic: 'text on dark bg' },
      'color-text-secondary': { category: 'color', semantic: 'secondary text' },
      'color-text-muted': { category: 'color', semantic: 'muted/disabled text' },
      'color-surface': { category: 'color', semantic: 'card/panel background' },
      'color-surface-secondary': { category: 'color', semantic: 'secondary surface' },
      'color-border': { category: 'color', semantic: 'border color' },
      'color-border-subtle': { category: 'color', semantic: 'subtle border' },
      'color-success': { category: 'color', semantic: 'success state' },
      'color-error': { category: 'color', semantic: 'error state' },
      'color-warning': { category: 'color', semantic: 'warning state' },
      
      // Typography
      'font-primary-xl': { category: 'typography', semantic: 'headings xl' },
      'font-primary-lg': { category: 'typography', semantic: 'headings lg' },
      'font-primary-md': { category: 'typography', semantic: 'headings md' },
      'font-primary-base': { category: 'typography', semantic: 'body text' },
      'font-primary-sm': { category: 'typography', semantic: 'small text' },
      'font-secondary': { category: 'typography', semantic: 'accent font' },
      'font-mono': { category: 'typography', semantic: 'monospace' },
      
      // Spacing
      'space-xs': { category: 'spacing', semantic: 'extra small' },
      'space-sm': { category: 'spacing', semantic: 'small' },
      'space-md': { category: 'spacing', semantic: 'medium' },
      'space-lg': { category: 'spacing', semantic: 'large' },
      'space-xl': { category: 'spacing', semantic: 'extra large' },
      
      // Shadows
      'shadow-sm': { category: 'shadow', semantic: 'subtle shadow' },
      'shadow-card': { category: 'shadow', semantic: 'card elevation' },
      'shadow-modal': { category: 'shadow', semantic: 'modal elevation' }
    };
  }

  /**
   * Map external design system colors to semantic tokens
   * Intelligent color inference based on provided colors
   */
  mapDesignSystemToTokens(designSystem) {
    const { colors, typography, spacing } = designSystem;
    const mappedTokens = {};

    // Map colors
    if (colors) {
      const colorArray = Object.entries(colors)
        .filter(([, v]) => typeof v === 'string' && v.match(/^#[0-9a-fA-F]{6}$/i))
        .map(([k, v]) => ({ name: k.toLowerCase(), value: v }));

      if (colorArray.length > 0) {
        // Primary color (usually first or explicitly named)
        const primary = colorArray.find(c => c.name.includes('primary')) || colorArray[0];
        mappedTokens['color-primary'] = primary.value;
        mappedTokens['color-primary-dark'] = this.darken(primary.value, 20);
        mappedTokens['color-primary-hover'] = this.lighten(primary.value, 10);
        mappedTokens['color-primary-active'] = this.darken(primary.value, 10);

        // Secondary color
        const secondary = colorArray.find(c => c.name.includes('secondary')) || colorArray[1];
        if (secondary) {
          mappedTokens['color-secondary'] = secondary.value;
          mappedTokens['color-secondary-dark'] = this.darken(secondary.value, 20);
          mappedTokens['color-secondary-hover'] = this.lighten(secondary.value, 10);
        }

        // Surface colors
        const background = colorArray.find(c => c.name.includes('bg') || c.name.includes('background'));
        const text = colorArray.find(c => c.name.includes('text') || c.name.includes('foreground'));

        if (background) {
          mappedTokens['color-surface'] = background.value;
          mappedTokens['color-surface-secondary'] = this.lighten(background.value, 5);
        }

        if (text) {
          mappedTokens['color-text'] = text.value;
          mappedTokens['color-text-inverse'] = this.isLight(text.value) ? '#000000' : '#ffffff';
          mappedTokens['color-text-secondary'] = this.lighten(text.value, 30);
          mappedTokens['color-text-muted'] = this.lighten(text.value, 50);
        }

        // Status colors
        const success = colorArray.find(c => c.name.includes('success'));
        const error = colorArray.find(c => c.name.includes('error') || c.name.includes('danger'));
        const warning = colorArray.find(c => c.name.includes('warn'));

        if (success) mappedTokens['color-success'] = success.value;
        if (error) mappedTokens['color-error'] = error.value;
        if (warning) mappedTokens['color-warning'] = warning.value;

        // Borders
        mappedTokens['color-border'] = this.lighten(text?.value || '#ffffff', 70);
        mappedTokens['color-border-subtle'] = this.lighten(text?.value || '#ffffff', 80);
      }
    }

    // Map typography
    if (typography) {
      const fonts = Object.values(typography).filter(f => typeof f === 'string');
      if (fonts.length > 0) {
        mappedTokens['font-primary-xl'] = fonts[0];
        mappedTokens['font-primary-lg'] = fonts[0];
        mappedTokens['font-primary-md'] = fonts[0];
        mappedTokens['font-primary-base'] = fonts[0];
        mappedTokens['font-primary-sm'] = fonts[0];
        mappedTokens['font-secondary'] = fonts[1] || fonts[0];
      }
    }

    // Map spacing
    if (spacing && typeof spacing === 'object') {
      Object.entries(spacing).forEach(([key, value]) => {
        const tokenKey = `space-${key.toLowerCase()}`;
        if (this.tokenDefinitions[tokenKey]) {
          mappedTokens[tokenKey] = value;
        }
      });
    }

    this.tokens = mappedTokens;
    return mappedTokens;
  }

  /**
   * Generate component-specific CSS rules
   * Returns CSS that targets specific components based on tokens
   */
  generateComponentCSS() {
    let css = '/* AUTO-GENERATED COMPONENT CSS FROM DESIGN TOKENS */\n\n';

    // Generate CSS rules for each component
    Object.entries(this.componentTokenMap).forEach(([componentSelector, tokenUsage]) => {
      const rules = {};

      Object.entries(tokenUsage).forEach(([cssProperty, tokenKey]) => {
        const tokenValue = this.tokens[tokenKey];
        if (tokenValue) {
          // Map semantic CSS properties to actual CSS
          const actualCSSProperty = this.mapPropertyToCSS(cssProperty, componentSelector);
          if (actualCSSProperty) {
            rules[actualCSSProperty] = tokenValue;
          }
        }
      });

      if (Object.keys(rules).length > 0) {
        css += `.${componentSelector} {\n`;
        Object.entries(rules).forEach(([prop, val]) => {
          css += `  ${prop}: ${val};\n`;
        });
        css += '}\n\n';
      }
    });

    return css;
  }

  /**
   * Generate CSS variables (for backward compatibility)
   * But also export which variables apply to which components
   */
  generateCSSVariables() {
    const vars = {};
    const componentMap = {};

    Object.entries(this.tokens).forEach(([tokenKey, value]) => {
      const cssVarName = `--${tokenKey}`;
      vars[cssVarName] = value;

      // Track which components use this token
      const affectedComponents = [];
      Object.entries(this.componentTokenMap).forEach(([component, usage]) => {
        if (Object.values(usage).includes(tokenKey)) {
          affectedComponents.push(component);
        }
      });

      if (affectedComponents.length > 0) {
        componentMap[tokenKey] = affectedComponents;
      }
    });

    return { variables: vars, componentMap };
  }

  /**
   * Helper: Map semantic property names to CSS properties
   */
  mapPropertyToCSS(property, component) {
    const map = {
      'background': 'background-color',
      'text': 'color',
      'border': 'border-color',
      'hover': null, // Requires :hover pseudo-class
      'active': null, // Requires :active pseudo-class
      'focus': null, // Requires :focus pseudo-class
      'placeholder': null, // Requires ::placeholder pseudo-element
      'borderBottom': 'border-bottom-color',
      'font': 'font-family',
      'color': 'color',
      'shadow': 'box-shadow'
    };

    return map[property] || null;
  }

  /**
   * Helper color functions
   */
  lighten(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  isLight(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = num >> 16;
    const G = (num >> 8) & 0x00FF;
    const B = num & 0x0000FF;
    const luminance = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
    return luminance > 0.5;
  }
}

export default DesignTokenSystem;
