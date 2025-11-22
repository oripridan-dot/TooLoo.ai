#!/usr/bin/env node

/**
 * Design Extractor
 * Analyzes websites and extracts design systems (colors, fonts, spacing, patterns)
 * Returns structured design tokens for instant agility
 * Uses pure JS for HTML parsing (no external dependencies except fetch)
 */

export class DesignExtractor {
  constructor(options = {}) {
    this.timeout = options.timeout || 10000;
    this.userAgent = options.userAgent || 'TooLoo.ai/2.0 Design Analyzer';
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Fetch and extract design system from website
   */
  async extractFromUrl(url, options = {}) {
    const { verbose = false, includeElements = false } = options;
    
    try {
      if (verbose) console.log(`[Extractor] Fetching ${url}...`);
      
      const html = await this._fetchUrl(url);
      
      // Extract all design aspects
      const colors = await this._extractColors(html);
      const typography = await this._extractTypography(html);
      const spacing = await this._extractSpacing(html);
      const effects = await this._extractEffects(html);
      const components = includeElements ? await this._extractComponents(html) : {};
      
      // Build design system
      const designSystem = {
        source: { url, fetchedAt: new Date().toISOString() },
        colors: this._deduplicateColors(colors),
        typography: this._deduplicateTypography(typography),
        spacing,
        effects,
        components,
        metadata: {
          colorsFound: Object.keys(colors).length,
          typographyFamiliesFound: new Set(typography.map(t => t.family)).size,
          spacingValuesFound: Object.keys(spacing).length,
          shadowsFound: effects.shadows.length,
          bordersFound: effects.borders.length,
          estimatedDesignMaturity: this._scoreMaturity(colors, typography)
        }
      };

      return {
        ok: true,
        system: designSystem,
        tokens: this._systemToTokens(designSystem),
        css: this._systemToCss(designSystem)
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        hint: 'Verify URL is accessible and contains HTML content'
      };
    }
  }

  /**
   * Extract all color values from HTML and CSS
   */
  async _extractColors(html) {
    const colors = {};
    const seen = new Set();
    
    // 1. Extract all hex colors (#RRGGBB format) - aggressive matching
    const hexMatches = html.matchAll(/#[0-9a-fA-F]{6}\b/gi);
    for (const match of hexMatches) {
      const hex = match[0].toLowerCase();
      if (!seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'hex-value', context: 'found' };
      }
    }

    // 2. Extract RGB/RGBA colors
    const rgbMatches = html.matchAll(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/gi);
    for (const match of rgbMatches) {
      const hex = '#' + [match[1], match[2], match[3]]
        .map(x => parseInt(x).toString(16).padStart(2, '0'))
        .join('')
        .toLowerCase();
      if (!seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'rgb-value', context: 'found' };
      }
    }

    // 3. Extract HSL colors
    const hslMatches = html.matchAll(/hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*[\d.]+)?\s*\)/gi);
    for (const match of hslMatches) {
      const h = parseInt(match[1]);
      const s = parseInt(match[2]);
      const l = parseInt(match[3]);
      const hex = this._hslToHex(h, s, l);
      if (!seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'hsl-value', context: 'found' };
      }
    }

    // 4. Extract from CSS property assignments
    const cssColorMatches = html.matchAll(/(?:color|background|background-color|border|border-color|fill|stroke|box-shadow|text-shadow):\s*([#a-zA-Z0-9,.()\s\-]+)/gi);
    for (const match of cssColorMatches) {
      const val = match[1];
      const hex = this._normalizeColor(val);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        const role = match[0].toLowerCase().includes('background') ? 'background' : 
                    match[0].toLowerCase().includes('color') ? 'text' : 'secondary';
        colors[hex] = { hex, role, context: 'css' };
      }
    }

    // 5. Extract from data attributes, inline styles, and class names
    const attrMatches = html.matchAll(/(?:data-color|data-bg|style)=["']([^"']*(?:#[0-9a-fA-F]{6})[^"']*)/gi);
    for (const match of attrMatches) {
      const val = match[1];
      const hexMatch = val.match(/#[0-9a-fA-F]{6}/);
      if (hexMatch) {
        const hex = hexMatch[0].toLowerCase();
        if (!seen.has(hex)) {
          seen.add(hex);
          colors[hex] = { hex, role: 'attribute', context: 'data-attr' };
        }
      }
    }

    // 6. Extract from CSS variables/custom properties
    const cssVarMatches = html.matchAll(/--[\w-]+:\s*([#a-zA-Z0-9,.()\s\-]+)/gi);
    for (const match of cssVarMatches) {
      const hex = this._normalizeColor(match[1]);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'css-var', context: 'custom-prop' };
      }
    }

    // 7. Extract from SVG/Canvas elements
    const svgMatches = html.matchAll(/(?:fill|stroke)=["']([#a-zA-Z0-9]+)["']/gi);
    for (const match of svgMatches) {
      const val = match[1];
      const hex = this._normalizeColor(val);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'svg-attr', context: 'svg' };
      }
    }

    // 8. Extract named colors and convert to hex
    const namedColorMatches = html.matchAll(/(?:color|background):\s*(black|white|red|blue|green|yellow|orange|purple|pink|gray|silver|navy|teal|lime|olive|maroon|aqua)\b/gi);
    for (const match of namedColorMatches) {
      const hex = this._namedColorToHex(match[1]);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'named-color', context: 'named' };
      }
    }

    return colors;
  }

  /**
   * Extract typography (fonts, sizes, weights)
   */
  async _extractTypography(html) {
    const typography = [];
    const seen = new Set();

    // Extract from font-family declarations (clean up)
    const fontMatches = html.matchAll(/font-family:\s*['"]*([^'";\n{}<]+)/gi);
    for (const match of fontMatches) {
      const raw = match[1].trim();
      // Stop at any CSS syntax to avoid parsing broken HTML
      const families = raw.split(',').map(f => f.trim().replace(/['"]/g, '').split('}')[0].split('{')[0]);
      families.forEach(family => {
        if (family && family.length > 2 && family.length < 100 && !family.includes(';') && !seen.has(family)) {
          seen.add(family);
          typography.push({
            family,
            size: null,
            weight: '400',
            role: 'body'
          });
        }
      });
    }

    // Extract from Google Fonts imports
    const googleFontMatches = html.matchAll(/(?:href|url)\s*=\s*["'](?:[^"']*fonts\.googleapis\.com[^"']*family=([^&"']+))/g);
    for (const match of googleFontMatches) {
      const families = decodeURIComponent(match[1]).split('|');
      families.forEach(f => {
        if (f && f.length < 100 && !seen.has(f)) {
          seen.add(f);
          typography.push({
            family: f,
            imported: true,
            source: 'google-fonts'
          });
        }
      });
    }

    // Extract font-weight variations
    const weightMatches = html.matchAll(/font-weight:\s*(\d+)/g);
    for (const match of weightMatches) {
      const weight = match[1];
      if (!typography.some(t => t.weight === weight)) {
        typography.forEach(t => {
          if (!t.weight || t.weight === '400') {
            t.weight = weight;
          }
        });
      }
    }

    return typography.slice(0, 5); // Keep top 5
  }

  /**
   * Extract shadows, borders, and depth values
   */
  async _extractEffects(html) {
    const effects = {
      shadows: [],
      borders: [],
      radiuses: []
    };
    const seen = new Set();

    // Extract box-shadow values (complex but important)
    const shadowMatches = html.matchAll(/box-shadow:\s*([^;}"]+)/gi);
    for (const match of shadowMatches) {
      const shadow = match[1].trim();
      if (shadow && !seen.has(shadow) && shadow.length < 100) {
        effects.shadows.push(shadow);
        seen.add(shadow);
      }
    }

    // Extract text-shadow values
    const textShadowMatches = html.matchAll(/text-shadow:\s*([^;}"]+)/gi);
    for (const match of textShadowMatches) {
      const shadow = match[1].trim();
      if (shadow && !seen.has(shadow) && shadow.length < 100) {
        effects.shadows.push(shadow);
        seen.add(shadow);
      }
    }

    // Extract border styles (border: 1px solid #ccc, etc.)
    const borderMatches = html.matchAll(/border(?:-\w+)?:\s*([^;}"]+)/gi);
    for (const match of borderMatches) {
      const border = match[1].trim();
      if (border && !seen.has(border) && border.length < 100) {
        effects.borders.push(border);
        seen.add(border);
      }
    }

    // Extract border-radius values (8px, 50%, etc.)
    const radiusMatches = html.matchAll(/border-radius:\s*([^;}"]+)/gi);
    for (const match of radiusMatches) {
      const radius = match[1].trim();
      if (radius && !seen.has(radius) && radius.length < 50) {
        effects.radiuses.push(radius);
        seen.add(radius);
      }
    }

    // Extract outline and ring styles (common in modern design)
    const outlineMatches = html.matchAll(/outline:\s*([^;}"]+)/gi);
    for (const match of outlineMatches) {
      const outline = match[1].trim();
      if (outline && !seen.has(outline) && outline.length < 100) {
        effects.borders.push(outline);
        seen.add(outline);
      }
    }

    return effects;
  }

  /**
   * Extract spacing patterns (margins, padding, gaps, sizes)
   */
  async _extractSpacing(html) {
    const spacing = {};
    const seen = new Set();

    // 1. Extract all px values from CSS (aggressive)
    const pxMatches = html.matchAll(/:\s*(\d+)px\b/g);
    for (const match of pxMatches) {
      const px = parseInt(match[1]);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // 2. Extract from margin/padding properties
    const marginPaddingMatches = html.matchAll(/(?:margin|padding|gap|width|height|min-width|max-width|min-height|max-height):\s*(\d+)px/gi);
    for (const match of marginPaddingMatches) {
      const px = parseInt(match[1]);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // 3. Extract from shorthand (margin: 8px 16px, etc.)
    const shorthandMatches = html.matchAll(/(?:margin|padding):\s*([0-9px\s]+)/gi);
    for (const match of shorthandMatches) {
      const values = match[1].match(/\d+(?=px)/g) || [];
      values.forEach(val => {
        const px = parseInt(val);
        if (px > 0 && px < 500 && !seen.has(px)) {
          seen.add(px);
          spacing[px] = true;
        }
      });
    }

    // 4. Extract from border radius, outline width, etc.
    const otherSizingMatches = html.matchAll(/(?:border-radius|border-width|outline-width|stroke-width|line-height):\s*(\d+)px/gi);
    for (const match of otherSizingMatches) {
      const px = parseInt(match[1]);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // 5. Extract from grid/flex gap and other layout properties
    const layoutMatches = html.matchAll(/(?:row-gap|column-gap|gap|flex-basis):\s*(\d+)px/gi);
    for (const match of layoutMatches) {
      const px = parseInt(match[1]);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // 6. Extract from data attributes and CSS variables
    const dataAndVarMatches = html.matchAll(/(?:--[\w-]+|data-\w+):\s*(\d+)px/gi);
    for (const match of dataAndVarMatches) {
      const px = parseInt(match[1]);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // 7. Extract rem/em values and convert to px (assuming 16px base)
    const remMatches = html.matchAll(/:\s*([\d.]+)rem\b/gi);
    for (const match of remMatches) {
      const px = Math.round(parseFloat(match[1]) * 16);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    const emMatches = html.matchAll(/:\s*([\d.]+)em\b/gi);
    for (const match of emMatches) {
      const px = Math.round(parseFloat(match[1]) * 16);
      if (px > 0 && px < 500 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // Build semantic scale from found values
    const sorted = Object.keys(spacing).map(Number).sort((a, b) => a - b);
    const semantic = {};
    const steps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    
    sorted.slice(0, 9).forEach((px, i) => {
      semantic[steps[i]] = `${px}px`;
    });

    return semantic;
  }

  /**
   * Extract component patterns from HTML structure
   */
  async _extractComponents(html) {
    const components = {};
    
    // Count button elements
    const buttonCount = (html.match(/<button|<a[^>]*href|class="btn/gi) || []).length;
    if (buttonCount > 0) {
      components.button = {
        count: buttonCount,
        hasNativeButton: html.includes('<button'),
        usesClassNames: /class=["'][^"']*btn/i.test(html)
      };
    }

    // Count card/container patterns
    const cardCount = (html.match(/class=["'][^"']*(?:card|container|box)/gi) || []).length;
    if (cardCount > 0) {
      components.card = { count: cardCount };
    }

    return components;
  }

  /**
   * Helpers
   */

  async _fetchUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const html = await res.text();
      return html.slice(0, 500000); // Max 500KB
    } finally {
      clearTimeout(timeout);
    }
  }

  _extractHexFromString(str) {
    const match = str.match(/#[0-9a-fA-F]{6}/);
    if (match) return match[0].toLowerCase();
    
    const rgb = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgb) {
      return '#' + [rgb[1], rgb[2], rgb[3]]
        .map(x => parseInt(x).toString(16).padStart(2, '0'))
        .join('')
        .toLowerCase();
    }
    
    return null;
  }

  _normalizeColor(color) {
    const hex = this._extractHexFromString(color);
    return hex ? hex.toLowerCase() : null;
  }

  _normalizePx(val) {
    if (!val) return null;
    const match = val.match(/(\d+(?:\.\d+)?)/);
    return match ? Math.round(parseFloat(match[1])) : null;
  }

  _guessColorRole(context, $el) {
    const text = context.toLowerCase();
    if (text.includes('background') || text.includes('bg')) return 'background';
    if (text.includes('text') || text.includes('color')) return 'text';
    if (text.includes('border')) return 'border';
    if (text.includes('shadow')) return 'shadow';
    return 'secondary';
  }

  _guessFontRole($el) {
    const tag = $el.prop('tagName')?.toLowerCase();
    if (['h1', 'h2', 'h3'].includes(tag)) return 'heading';
    if (['p', 'body', 'span'].includes(tag)) return 'body';
    return 'UI';
  }

  _deduplicateColors(colors) {
    // Keep top ~8 colors (usually enough for a palette)
    return Object.entries(colors)
      .sort((a, b) => (b[1].context === 'style-tag' ? 1 : -1))
      .slice(0, 10)
      .reduce((acc, [hex, data]) => {
        acc[hex] = data;
        return acc;
      }, {});
  }

  _deduplicateTypography(typography) {
    // Keep unique families and top weights/sizes
    const byFamily = {};
    typography.forEach(t => {
      if (!byFamily[t.family]) {
        byFamily[t.family] = [];
      }
      byFamily[t.family].push(t);
    });

    return Object.entries(byFamily)
      .slice(0, 3)
      .map(([family, variants]) => ({
        family,
        variants: variants.slice(0, 3)
      }));
  }

  _systemToTokens(system) {
    const tokens = {
      colors: {},
      typography: {},
      spacing: system.spacing
    };

    Object.entries(system.colors).forEach(([hex, data], i) => {
      const role = data.role || 'neutral';
      const key = i === 0 ? 'brand' : `${role}-${i}`;
      tokens.colors[key] = hex;
    });

    system.typography.forEach((t, i) => {
      tokens.typography[`font-${t.family.toLowerCase().replace(/\s+/g, '-')}`] = t.family;
    });

    return tokens;
  }

  _systemToCss(system) {
    let css = ':root {\n';

    Object.entries(system.colors).forEach(([hex, data], i) => {
      const role = data.role || 'neutral';
      const varName = i === 0 ? 'brand' : `${role}-${i}`;
      css += `  --${varName}: ${hex};\n`;
    });

    system.typography.forEach(t => {
      const varName = `font-${t.family.toLowerCase().replace(/\s+/g, '-')}`;
      css += `  --${varName}: '${t.family}', sans-serif;\n`;
    });

    Object.entries(system.spacing).forEach(([key, val]) => {
      css += `  --spacing-${key}: ${val};\n`;
    });

    css += '}\n';
    return css;
  }

  /**
   * Convert HSL to hex color
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} Hex color (#RRGGBB)
   */
  _hslToHex(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    const toHex = (n) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  /**
   * Convert named CSS color to hex
   * @param {string} name - Color name (e.g., 'red', 'blue')
   * @returns {string} Hex color (#RRGGBB) or null
   */
  _namedColorToHex(name) {
    const namedColors = {
      aliceblue: '#f0f8ff',
      antiquewhite: '#faebd7',
      aqua: '#00ffff',
      aquamarine: '#7fffd4',
      azure: '#f0ffff',
      beige: '#f5f5dc',
      bisque: '#ffe4c4',
      black: '#000000',
      blanchedalmond: '#ffebcd',
      blue: '#0000ff',
      blueviolet: '#8a2be2',
      brown: '#a52a2a',
      burlywood: '#deb887',
      cadetblue: '#5f9ea0',
      chartreuse: '#7fff00',
      chocolate: '#d2691e',
      coral: '#ff7f50',
      cornflowerblue: '#6495ed',
      cornsilk: '#fff8dc',
      crimson: '#dc143c',
      cyan: '#00ffff',
      darkblue: '#00008b',
      darkcyan: '#008b8b',
      darkgoldenrod: '#b8860b',
      darkgray: '#a9a9a9',
      darkgrey: '#a9a9a9',
      darkgreen: '#006400',
      darkkhaki: '#bdb76b',
      darkmagenta: '#8b008b',
      darkolivegreen: '#556b2f',
      darkorange: '#ff8c00',
      darkorchid: '#9932cc',
      darkred: '#8b0000',
      darksalmon: '#e9967a',
      darkseagreen: '#8fbc8f',
      darkslateblue: '#483d8b',
      darkslategray: '#2f4f4f',
      darkslategrey: '#2f4f4f',
      darkturquoise: '#00ced1',
      darkviolet: '#9400d3',
      deeppink: '#ff1493',
      deepskyblue: '#00bfff',
      dimgray: '#696969',
      dimgrey: '#696969',
      dodgerblue: '#1e90ff',
      firebrick: '#b22222',
      floralwhite: '#fffaf0',
      forestgreen: '#228b22',
      fuchsia: '#ff00ff',
      gainsboro: '#dcdcdc',
      ghostwhite: '#f8f8ff',
      gold: '#ffd700',
      goldenrod: '#daa520',
      gray: '#808080',
      grey: '#808080',
      green: '#008000',
      greenyellow: '#adff2f',
      honeydew: '#f0fff0',
      hotpink: '#ff69b4',
      indianred: '#cd5c5c',
      indigo: '#4b0082',
      ivory: '#fffff0',
      khaki: '#f0e68c',
      lavender: '#e6e6fa',
      lavenderblush: '#fff0f5',
      lawngreen: '#7cfc00',
      lemonchiffon: '#fffacd',
      lightblue: '#add8e6',
      lightcoral: '#f08080',
      lightcyan: '#e0ffff',
      lightgoldenrodyellow: '#fafad2',
      lightgray: '#d3d3d3',
      lightgrey: '#d3d3d3',
      lightgreen: '#90ee90',
      lightpink: '#ffb6c1',
      lightsalmon: '#ffa07a',
      lightseagreen: '#20b2aa',
      lightskyblue: '#87cefa',
      lightslategray: '#778899',
      lightslategrey: '#778899',
      lightsteelblue: '#b0c4de',
      lightyellow: '#ffffe0',
      lime: '#00ff00',
      limegreen: '#32cd32',
      linen: '#faf0e6',
      magenta: '#ff00ff',
      maroon: '#800000',
      mediumaquamarine: '#66cdaa',
      mediumblue: '#0000cd',
      mediumorchid: '#ba55d3',
      mediumpurple: '#9370db',
      mediumseagreen: '#3cb371',
      mediumslateblue: '#7b68ee',
      mediumspringgreen: '#00fa9a',
      mediumturquoise: '#48d1cc',
      mediumvioletred: '#c71585',
      midnightblue: '#191970',
      mintcream: '#f5fffa',
      mistyrose: '#ffe4e1',
      moccasin: '#ffe4b5',
      navajowhite: '#ffdead',
      navy: '#000080',
      oldlace: '#fdf5e6',
      olive: '#808000',
      olivedrab: '#6b8e23',
      orange: '#ffa500',
      orangered: '#ff4500',
      orchid: '#da70d6',
      palegoldenrod: '#eee8aa',
      palegreen: '#98fb98',
      paleturquoise: '#afeeee',
      palevioletred: '#db7093',
      papayawhip: '#ffefd5',
      peachpuff: '#ffdab9',
      peru: '#cd853f',
      pink: '#ffc0cb',
      plum: '#dda0dd',
      powderblue: '#b0e0e6',
      purple: '#800080',
      red: '#ff0000',
      rosybrown: '#bc8f8f',
      royalblue: '#4169e1',
      saddlebrown: '#8b4513',
      salmon: '#fa8072',
      sandybrown: '#f4a460',
      seagreen: '#2e8b57',
      seashell: '#fff5ee',
      sienna: '#a0522d',
      silver: '#c0c0c0',
      skyblue: '#87ceeb',
      slateblue: '#6a5acd',
      slategray: '#708090',
      slategrey: '#708090',
      snow: '#fffafa',
      springgreen: '#00ff7f',
      steelblue: '#4682b4',
      tan: '#d2b48c',
      teal: '#008080',
      thistle: '#d8bfd8',
      tomato: '#ff6347',
      turquoise: '#40e0d0',
      violet: '#ee82ee',
      wheat: '#f5deb3',
      white: '#ffffff',
      whitesmoke: '#f5f5f5',
      yellow: '#ffff00',
      yellowgreen: '#9acd32'
    };
    
    const lower = name.toLowerCase();
    return namedColors[lower] || null;
  }

  _scoreMaturity(colors, typography) {
    let score = 0;
    if (Object.keys(colors).length > 5) score += 30;
    if (typography.length > 2) score += 30;
    if (Object.keys(colors).length > 10) score += 20;
    if (typography.some(t => t.imported)) score += 20;
    return Math.min(100, score);
  }

  /**
   * Extract brand metadata (logo, favicon, description, primary colors)
   */
  async extractBrandMetadata(url) {
    try {
      const html = await this._fetchUrl(url);
      const baseUrl = new URL(url);
      
      // Extract favicon
      const faviconMatch = html.match(/<link[^>]*rel="(?:icon|shortcut icon)"[^>]*href="([^"]+)"/i);
      let favicon = faviconMatch ? faviconMatch[1] : null;
      if (favicon && !favicon.startsWith('http')) {
        favicon = new URL(favicon, baseUrl).href;
      }
      
      // Extract OG image / logo
      const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
      const ogLogoMatch = html.match(/<meta\s+property="og:logo"\s+content="([^"]+)"/i);
      let logo = ogLogoMatch?.[1] || ogImageMatch?.[1] || null;
      if (logo && !logo.startsWith('http')) {
        logo = new URL(logo, baseUrl).href;
      }
      
      // Extract description
      const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
      const description = descriptionMatch?.[1] || '';
      
      // Extract brand name from title or og:site_name
      const ogSiteNameMatch = html.match(/<meta\s+property="og:site_name"\s+content="([^"]+)"/i);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const name = ogSiteNameMatch?.[1] || titleMatch?.[1] || baseUrl.hostname;
      
      // Detect primary and accent colors from CSS variables and theme colors
      const primaryColorMatch = html.match(/(?:--primary|--brand|--main):\s*(#[a-f0-9]{3,8}|rgb\([^)]+\))/gi);
      const accentColorMatch = html.match(/(?:--accent|--highlight|--secondary):\s*(#[a-f0-9]{3,8}|rgb\([^)]+\))/gi);
      
      return {
        name: name?.trim() || baseUrl.hostname,
        favicon,
        logo,
        description: description?.trim() || '',
        primaryColor: primaryColorMatch?.[0]?.split(':')?.[1]?.trim() || null,
        accentColor: accentColorMatch?.[0]?.split(':')?.[1]?.trim() || null
      };
    } catch (err) {
      return {
        name: new URL(url).hostname,
        favicon: null,
        logo: null,
        description: '',
        primaryColor: null,
        accentColor: null
      };
    }
  }

  /**
   * Extract site structure (HTML hierarchy, main sections, component count)
   */
  async extractSiteStructure(url) {
    try {
      const html = await this._fetchUrl(url);
      
      // Count total elements
      const totalElements = (html.match(/<[a-z][a-z0-9]*[^>]*>/gi) || []).length;
      
      // Extract main structural sections
      const mainSections = [];
      const sectionPatterns = [
        { name: 'Header', regex: /<header[^>]*>[\s\S]*?<\/header>/gi },
        { name: 'Navigation', regex: /<nav[^>]*>[\s\S]*?<\/nav>/gi },
        { name: 'Main Content', regex: /<main[^>]*>[\s\S]*?<\/main>/gi },
        { name: 'Footer', regex: /<footer[^>]*>[\s\S]*?<\/footer>/gi },
        { name: 'Sidebar', regex: /<aside[^>]*>[\s\S]*?<\/aside>/gi }
      ];
      
      sectionPatterns.forEach(pattern => {
        const matches = html.match(pattern.regex);
        if (matches) {
          mainSections.push({
            name: pattern.name,
            count: matches.length,
            estimated: true
          });
        }
      });
      
      // Count common components
      const componentCount = {
        buttons: (html.match(/<button[^>]*>/gi) || []).length + (html.match(/class="[^"]*btn[^"]*"/gi) || []).length,
        forms: (html.match(/<form[^>]*>/gi) || []).length,
        inputs: (html.match(/<input[^>]*>/gi) || []).length,
        images: (html.match(/<img[^>]*>/gi) || []).length,
        links: (html.match(/<a[^>]*>/gi) || []).length,
        headings: (html.match(/<h[1-6][^>]*>/gi) || []).length,
        cards: (html.match(/class="[^"]*card[^"]*"/gi) || []).length,
        modals: (html.match(/class="[^"]*modal[^"]*"/gi) || []).length
      };
      
      // Estimate hierarchy depth
      const depthMatch = html.match(/<div[^>]*>/g) || [];
      const estimatedDepth = Math.min(Math.ceil(Math.log2(depthMatch.length)), 8);
      
      return {
        totalElements,
        hierarchy: {
          estimatedDepth,
          mainSections: mainSections.length
        },
        mainSections,
        componentCount
      };
    } catch (err) {
      return {
        totalElements: 0,
        hierarchy: { estimatedDepth: 0, mainSections: 0 },
        mainSections: [],
        componentCount: {}
      };
    }
  }

  /**
   * Extract icons, SVGs, and visual assets
   */
  async extractVisualAssets(url) {
    try {
      const html = await this._fetchUrl(url);
      const baseUrl = new URL(url);
      
      // Extract SVG inline icons
      const svgMatches = html.match(/<svg[^>]*>[\s\S]*?<\/svg>/gi) || [];
      const svgIcons = svgMatches.slice(0, 20).map((svg, idx) => ({
        id: `inline-svg-${idx}`,
        type: 'inline-svg',
        content: svg.substring(0, 200) + (svg.length > 200 ? '...' : '')
      }));
      
      // Extract icon fonts (Font Awesome, Material Icons, etc.)
      const iconFontMatches = html.match(/(?:fas|fab|far|fal|material-icons|icon[s]*)[^>"]*/gi) || [];
      const iconFonts = [...new Set(iconFontMatches)].slice(0, 15).map(name => ({
        name: name.trim(),
        type: 'icon-font'
      }));
      
      // Extract image assets
      const imgMatches = html.match(/<img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi) || [];
      const images = [];
      imgMatches.slice(0, 20).forEach(match => {
        const srcMatch = match.match(/src="([^"]+)"/);
        const altMatch = match.match(/alt="([^"]*)"/);
        if (srcMatch) {
          let src = srcMatch[1];
          if (!src.startsWith('http')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {}
          }
          images.push({
            src: src.substring(0, 100),
            alt: altMatch ? altMatch[1] : '',
            type: src.includes('svg') ? 'svg' : src.includes('png') ? 'png' : src.includes('jpg') ? 'jpg' : 'image'
          });
        }
      });
      
      // Extract visual patterns (gradients, shadows, animations)
      const gradientMatches = html.match(/linear-gradient\([^)]+\)|radial-gradient\([^)]+\)/gi) || [];
      const gradients = [...new Set(gradientMatches)].slice(0, 10).map((grad, idx) => ({
        id: `gradient-${idx}`,
        value: grad.substring(0, 80)
      }));
      
      const shadowMatches = html.match(/(?:box-shadow|text-shadow):\s*([^;]+)/gi) || [];
      const shadows = [...new Set(shadowMatches)].slice(0, 10).map((shadow, idx) => ({
        id: `shadow-${idx}`,
        value: shadow.substring(0, 80)
      }));
      
      // Extract animation/keyframe patterns
      const animationMatches = html.match(/@keyframes\s+([^{]+)\{/gi) || [];
      const animations = [...new Set(animationMatches)].slice(0, 10).map(anim => ({
        name: anim.match(/@keyframes\s+([^{]+)/i)[1].trim()
      }));
      
      // Extract border radius patterns
      const borderRadiusMatches = html.match(/border-radius:\s*([^;]+)/gi) || [];
      const borderRadii = [...new Set(borderRadiusMatches)].slice(0, 8).map((br, idx) => ({
        id: `border-radius-${idx}`,
        value: br.match(/:\s*([^;]+)/)[1].trim()
      }));
      
      return {
        icons: {
          svgInline: svgIcons.length,
          iconFonts: iconFonts,
          svgDetails: svgIcons
        },
        images: {
          total: images.length,
          assets: images
        },
        patterns: {
          gradients: gradients.length,
          shadows: shadows.length,
          animations: animations.length,
          borderRadii: borderRadii.length,
          details: {
            gradients: gradients,
            shadows: shadows,
            animations: animations,
            borderRadii: borderRadii
          }
        }
      };
    } catch (err) {
      return {
        icons: { svgInline: 0, iconFonts: [], svgDetails: [] },
        images: { total: 0, assets: [] },
        patterns: { gradients: 0, shadows: 0, animations: 0, borderRadii: 0, details: {} }
      };
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) {
    console.log('Usage: node design-extractor.js <url>');
    process.exit(1);
  }

  const extractor = new DesignExtractor();
  const result = await extractor.extractFromUrl(url, { verbose: true });
  console.log(JSON.stringify(result, null, 2));
}

export default DesignExtractor;
