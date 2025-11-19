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
      const components = includeElements ? await this._extractComponents(html) : {};
      
      // Build design system
      const designSystem = {
        source: { url, fetchedAt: new Date().toISOString() },
        colors: this._deduplicateColors(colors),
        typography: this._deduplicateTypography(typography),
        spacing,
        components,
        metadata: {
          colorsFound: Object.keys(colors).length,
          typographyFamiliesFound: new Set(typography.map(t => t.family)).size,
          spacingValuesFound: Object.keys(spacing).length,
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
    
    // Extract from inline styles
    const styleMatches = html.matchAll(/style="[^"]*color[^"]*"|style='[^']*color[^']*'|style=`[^`]*color[^`]*`/g);
    for (const match of styleMatches) {
      const hex = this._extractHexFromString(match[0]);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'inline', context: 'style-attr' };
      }
    }

    // Extract from CSS color values
    const colorMatches = html.matchAll(/(?:color|background|border|fill|stroke):\s*(#[0-9a-fA-F]{6}|rgb\([^)]+\))/gi);
    for (const match of colorMatches) {
      const hex = this._normalizeColor(match[1]);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        const role = match[0].toLowerCase().includes('background') ? 'background' : 
                    match[0].toLowerCase().includes('color') ? 'text' : 'secondary';
        colors[hex] = { hex, role, context: 'css' };
      }
    }

    // Extract from CSS variables
    const varMatches = html.matchAll(/--[\w-]+:\s*(#[0-9a-fA-F]{6}|rgb\([^)]+\))/g);
    for (const match of varMatches) {
      const hex = this._normalizeColor(match[1]);
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        colors[hex] = { hex, role: 'variable', context: 'css-var' };
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
   * Extract spacing patterns (margins, padding, gaps)
   */
  async _extractSpacing(html) {
    const spacing = {};
    const seen = new Set();

    // Extract padding/margin/gap values in px
    const spacingMatches = html.matchAll(/(?:padding|margin|gap):\s*(\d+(?:\.\d+)?)px/g);
    for (const match of spacingMatches) {
      const px = Math.round(parseFloat(match[1]));
      if (px > 0 && px < 200 && !seen.has(px)) {
        seen.add(px);
        spacing[px] = true;
      }
    }

    // Build semantic scale from found values
    const sorted = Object.keys(spacing).map(Number).sort((a, b) => a - b);
    const semantic = {};
    const steps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    
    sorted.slice(0, 7).forEach((px, i) => {
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

  _scoreMaturity(colors, typography) {
    let score = 0;
    if (Object.keys(colors).length > 5) score += 30;
    if (typography.length > 2) score += 30;
    if (Object.keys(colors).length > 10) score += 20;
    if (typography.some(t => t.imported)) score += 20;
    return Math.min(100, score);
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
