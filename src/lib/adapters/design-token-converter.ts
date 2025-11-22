/**
 * Design Token Converter
 * Converts Figma design tokens to CSS variables and applies them to UI surfaces
 * Supports: Colors, Typography, Spacing, Effects, Shadows
 */

export class DesignTokenConverter {
  constructor() {
    this.cssVariables = new Map();
    this.tokenMetadata = new Map();
  }

  /**
   * Extract colors from design system and convert to CSS variables
   * Handles: Hex, RGB, HSL color formats
   */
  extractColorTokens(designSystem) {
    const colorVars = {};

    if (!designSystem.colors) return colorVars;

    Object.entries(designSystem.colors).forEach(([slug, colorToken]) => {
      const cssVarName = `--color-${slug}`;
      
      // Attempt to get actual color value if available
      let colorValue = colorToken.value || colorToken.hex || '#000000';
      
      // Normalize color format to CSS-compatible value
      colorValue = this.normalizeColor(colorValue);

      colorVars[cssVarName] = {
        value: colorValue,
        name: colorToken.name,
        description: colorToken.description,
        category: 'color',
        source: colorToken.source || 'figma'
      };

      this.cssVariables.set(cssVarName, colorValue);
      this.tokenMetadata.set(cssVarName, colorVars[cssVarName]);
    });

    return colorVars;
  }

  /**
   * Extract typography tokens and convert to CSS variables
   * Generates font-family, font-size, line-height, font-weight, letter-spacing
   */
  extractTypographyTokens(designSystem) {
    const typographyVars = {};

    if (!designSystem.typography) return typographyVars;

    Object.entries(designSystem.typography).forEach(([slug, typoToken]) => {
      const baseVarName = `--typography-${slug}`;

      // Font family
      const fontFamily = typoToken.fontFamily || 'system-ui, -apple-system, sans-serif';
      typographyVars[`${baseVarName}-family`] = {
        value: fontFamily,
        name: `${typoToken.name} - Family`,
        description: typoToken.description,
        category: 'typography',
        subcategory: 'font-family'
      };
      this.cssVariables.set(`${baseVarName}-family`, fontFamily);

      // Font size
      const fontSize = typoToken.fontSize || '16px';
      typographyVars[`${baseVarName}-size`] = {
        value: fontSize,
        name: `${typoToken.name} - Size`,
        category: 'typography',
        subcategory: 'font-size'
      };
      this.cssVariables.set(`${baseVarName}-size`, fontSize);

      // Line height
      const lineHeight = typoToken.lineHeight || '1.5';
      typographyVars[`${baseVarName}-height`] = {
        value: lineHeight,
        name: `${typoToken.name} - Line Height`,
        category: 'typography',
        subcategory: 'line-height'
      };
      this.cssVariables.set(`${baseVarName}-height`, lineHeight);

      // Font weight
      const fontWeight = typoToken.fontWeight || '400';
      typographyVars[`${baseVarName}-weight`] = {
        value: fontWeight,
        name: `${typoToken.name} - Weight`,
        category: 'typography',
        subcategory: 'font-weight'
      };
      this.cssVariables.set(`${baseVarName}-weight`, fontWeight);

      // Letter spacing
      if (typoToken.letterSpacing) {
        typographyVars[`${baseVarName}-spacing`] = {
          value: typoToken.letterSpacing,
          name: `${typoToken.name} - Letter Spacing`,
          category: 'typography',
          subcategory: 'letter-spacing'
        };
        this.cssVariables.set(`${baseVarName}-spacing`, typoToken.letterSpacing);
      }

      this.tokenMetadata.set(baseVarName, typographyVars[`${baseVarName}-family`]);
    });

    return typographyVars;
  }

  /**
   * Extract spacing/sizing tokens
   */
  extractSpacingTokens(designSystem) {
    const spacingVars = {};

    if (!designSystem.spacing) return spacingVars;

    Object.entries(designSystem.spacing).forEach(([slug, spacingValue]) => {
      const cssVarName = `--spacing-${slug}`;
      
      // Ensure value is CSS-compatible
      let normalizedValue = spacingValue;
      if (typeof spacingValue === 'number') {
        normalizedValue = `${spacingValue}px`;
      }

      spacingVars[cssVarName] = {
        value: normalizedValue,
        name: `Spacing ${slug}`,
        category: 'spacing',
        source: 'figma'
      };

      this.cssVariables.set(cssVarName, normalizedValue);
      this.tokenMetadata.set(cssVarName, spacingVars[cssVarName]);
    });

    return spacingVars;
  }

  /**
   * Extract effects (shadows, blur) tokens
   */
  extractEffectTokens(designSystem) {
    const effectVars = {};

    if (!designSystem.effects) return effectVars;

    Object.entries(designSystem.effects).forEach(([slug, effectToken]) => {
      const cssVarName = `--effect-${slug}`;
      
      // Convert Figma shadow format to CSS box-shadow
      let cssValue = this.convertShadowToCss(effectToken);

      effectVars[cssVarName] = {
        value: cssValue,
        name: effectToken.name || `Effect ${slug}`,
        description: effectToken.description,
        category: 'effect',
        effectType: effectToken.effectType
      };

      this.cssVariables.set(cssVarName, cssValue);
      this.tokenMetadata.set(cssVarName, effectVars[cssVarName]);
    });

    return effectVars;
  }

  /**
   * Generate complete CSS file content
   * Can be injected directly into UI or saved to file
   */
  generateCssContent(designSystem, options = {}) {
    const {
      includeComments = true,
      rootSelector = ':root',
      minify = false
    } = options;

    let cssOutput = '';

    // Extract all token types
    const colorVars = this.extractColorTokens(designSystem);
    const typographyVars = this.extractTypographyTokens(designSystem);
    const spacingVars = this.extractSpacingTokens(designSystem);
    const effectVars = this.extractEffectTokens(designSystem);

    // Build CSS
    cssOutput += `${rootSelector} {\n`;

    if (includeComments) cssOutput += '  /* Color Tokens */\n';
    Object.entries(colorVars).forEach(([varName, metadata]) => {
      cssOutput += `  ${varName}: ${metadata.value}; /* ${metadata.name} */\n`;
    });

    if (includeComments) cssOutput += '\n  /* Typography Tokens */\n';
    Object.entries(typographyVars).forEach(([varName, metadata]) => {
      cssOutput += `  ${varName}: ${metadata.value}; /* ${metadata.name} */\n`;
    });

    if (includeComments) cssOutput += '\n  /* Spacing Tokens */\n';
    Object.entries(spacingVars).forEach(([varName, metadata]) => {
      cssOutput += `  ${varName}: ${metadata.value}; /* ${metadata.name} */\n`;
    });

    if (includeComments) cssOutput += '\n  /* Effect Tokens (Shadows, etc) */\n';
    Object.entries(effectVars).forEach(([varName, metadata]) => {
      cssOutput += `  ${varName}: ${metadata.value}; /* ${metadata.name} */\n`;
    });

    cssOutput += '}\n';

    // Add utility classes
    if (!minify) {
      cssOutput += '\n/* Utility Classes Generated from Design Tokens */\n';
      
      // Color utilities
      Object.entries(colorVars).forEach(([varName, metadata]) => {
        const className = varName.replace('--color-', '').replace(/[_-]/g, '-');
        cssOutput += `.bg-${className} { background-color: var(${varName}); }\n`;
        cssOutput += `.text-${className} { color: var(${varName}); }\n`;
      });

      // Spacing utilities
      Object.entries(spacingVars).forEach(([varName, metadata]) => {
        const className = varName.replace('--spacing-', '').replace(/[_-]/g, '-');
        cssOutput += `.p-${className} { padding: var(${varName}); }\n`;
        cssOutput += `.m-${className} { margin: var(${varName}); }\n`;
      });

      // Shadow utilities
      Object.entries(effectVars).forEach(([varName, metadata]) => {
        if (metadata.effectType === 'SHADOW' || varName.includes('shadow')) {
          const className = varName.replace('--effect-', '').replace(/[_-]/g, '-');
          cssOutput += `.shadow-${className} { box-shadow: var(${varName}); }\n`;
        }
      });
    }

    return cssOutput;
  }

  /**
   * Normalize color value to CSS-compatible format
   */
  normalizeColor(color) {
    if (!color) return '#000000';

    // Already hex
    if (typeof color === 'string' && color.startsWith('#')) {
      return color;
    }

    // RGB object or string
    if (typeof color === 'object' && (color.r !== undefined && color.g !== undefined && color.b !== undefined)) {
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = color.a !== undefined ? color.a : 1;
      return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
    }

    // Assume it's already valid CSS
    return color;
  }

  /**
   * Convert Figma shadow format to CSS box-shadow
   */
  convertShadowToCss(shadowToken) {
    // Expected Figma shadow: { x: number, y: number, blur: number, spread: number, color: {...}, opacity: number }
    if (!shadowToken.x && !shadowToken.y) {
      return shadowToken.value || 'none';
    }

    const x = shadowToken.x || 0;
    const y = shadowToken.y || 0;
    const blur = shadowToken.blur || 0;
    const spread = shadowToken.spread || 0;
    const colorObj = shadowToken.color || { r: 0, g: 0, b: 0, a: 1 };
    const opacity = shadowToken.opacity !== undefined ? shadowToken.opacity : colorObj.a || 1;

    // Normalize color
    const r = Math.round((colorObj.r || 0) * 255);
    const g = Math.round((colorObj.g || 0) * 255);
    const b = Math.round((colorObj.b || 0) * 255);

    const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    return `${x}px ${y}px ${blur}px ${spread}px ${rgbaColor}`;
  }

  /**
   * Get all CSS variables as object
   */
  getCssVariablesObject() {
    const result = {};
    for (const [key, value] of this.cssVariables) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get metadata for all tokens
   */
  getTokenMetadata() {
    const result = {};
    for (const [key, value] of this.tokenMetadata) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Clear all stored variables and metadata
   */
  reset() {
    this.cssVariables.clear();
    this.tokenMetadata.clear();
  }
}

export default new DesignTokenConverter();
