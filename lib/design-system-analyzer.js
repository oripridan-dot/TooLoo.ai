#!/usr/bin/env node

/**
 * Design System Analyzer
 * Intelligent design system extraction and analysis
 * Identifies color relationships, spacing scales, typography hierarchies
 * Generates organized design tokens with confidence scores
 */

export class DesignSystemAnalyzer {
  constructor(rawTokens) {
    this.rawTokens = rawTokens; // { colors, typography, spacing }
    this.analyzed = null;
    this.confidence = {}; // confidence scores for each token
  }

  /**
   * Analyze extracted tokens and generate structured design system
   */
  analyze() {
    this.analyzed = {
      colors: this._analyzeColors(),
      typography: this._analyzeTypography(),
      spacing: this._analyzeSpacing(),
      components: this._detectComponentPatterns(),
      metadata: this._generateMetadata()
    };
    return this.analyzed;
  }

  /**
   * Analyze colors: semantic grouping, relationships, palettes
   */
  _analyzeColors() {
    const colors = this.rawTokens.colors || {};
    if (Object.keys(colors).length === 0) {
      return { primary: {}, semantic: {}, palettes: [] };
    }

    const analyzed = {
      primary: {},
      secondary: {},
      semantic: {},
      palettes: [],
      lightness: [],
      relationships: []
    };

    // Parse all colors and compute properties
    const colorData = Object.entries(colors).map(([hex, data]) => ({
      hex,
      rgb: this._hexToRgb(hex),
      hsl: this._hexToHsl(hex),
      lightness: this._getLightness(hex),
      ...data
    }));

    // Sort by lightness to identify palette structure
    colorData.sort((a, b) => a.lightness - b.lightness);

    // Identify primary color (usually mid-tone, high saturation)
    const primary = colorData.find(c => c.lightness > 30 && c.lightness < 70) || colorData[Math.floor(colorData.length / 2)];
    if (primary) {
      analyzed.primary = {
        name: 'primary',
        hex: primary.hex,
        rgb: primary.rgb,
        hsl: primary.hsl,
        lightness: primary.lightness,
        confidence: 0.85
      };
    }

    // Identify secondary color (contrast with primary)
    const secondary = colorData.find(c => 
      c.hex !== primary?.hex && 
      this._colorDistance(c.hex, primary?.hex || '#000') > 100
    );
    if (secondary) {
      analyzed.secondary = {
        name: 'secondary',
        hex: secondary.hex,
        rgb: secondary.rgb,
        hsl: secondary.hsl,
        confidence: 0.75
      };
    }

    // Semantic colors (success, warning, error, info)
    const semanticMap = {
      success: ['#00ff91', '#1fbf74', '#22c55e', '#10b981', '#34d399'],
      error: ['#ff5c7c', '#ef4444', '#f87171', '#dc2626', '#b91c1c'],
      warning: ['#ffbd2e', '#f59e0b', '#fbbf24', '#f97316', '#ea580c'],
      info: ['#4436ff', '#3b82f6', '#60a5fa', '#0ea5e9', '#06b6d4']
    };

    Object.entries(semanticMap).forEach(([role, candidates]) => {
      const match = colorData.find(c => 
        candidates.some(candidate => 
          this._colorDistance(c.hex, candidate) < 50
        )
      );
      if (match) {
        analyzed.semantic[role] = {
          hex: match.hex,
          confidence: 0.8
        };
      }
    });

    // Detect color palettes (multiple shades of same hue)
    const byHue = {};
    colorData.forEach(c => {
      const hue = Math.round(c.hsl.h);
      if (!byHue[hue]) byHue[hue] = [];
      byHue[hue].push(c);
    });

    Object.entries(byHue).forEach(([hue, shades]) => {
      if (shades.length >= 3) {
        analyzed.palettes.push({
          hue: parseInt(hue),
          name: this._getHueName(parseInt(hue)),
          shades: shades.map(s => ({ hex: s.hex, lightness: s.lightness }))
        });
      }
    });

    this.confidence.colors = Math.min(1, Object.keys(colors).length / 10);
    return analyzed;
  }

  /**
   * Analyze typography: hierarchy, pairings, readability
   */
  _analyzeTypography() {
    const fonts = this.rawTokens.typography || [];
    
    const analyzed = {
      families: [],
      pairing: null,
      hierarchy: [],
      recommended: {}
    };

    if (fonts.length === 0) {
      return analyzed;
    }

    // Categorize fonts
    const serifs = fonts.filter(f => this._isSerif(f.family));
    const sansSerifs = fonts.filter(f => !this._isSerif(f.family));

    // Ideal pairing: serif + sans-serif or two complementary sans-serifs
    if (serifs.length > 0 && sansSerifs.length > 0) {
      analyzed.pairing = {
        display: serifs[0]?.family || fonts[0]?.family,
        body: sansSerifs[0]?.family || fonts[1]?.family,
        confidence: 0.9
      };
    } else if (sansSerifs.length >= 2) {
      analyzed.pairing = {
        display: sansSerifs[0]?.family,
        body: sansSerifs[1]?.family,
        confidence: 0.7
      };
    } else {
      analyzed.pairing = {
        display: fonts[0]?.family,
        body: fonts[0]?.family,
        confidence: 0.5
      };
    }

    // Suggest hierarchy
    analyzed.hierarchy = [
      { level: 'h1', size: '48px', font: analyzed.pairing.display, weight: '700' },
      { level: 'h2', size: '36px', font: analyzed.pairing.display, weight: '700' },
      { level: 'h3', size: '28px', font: analyzed.pairing.display, weight: '600' },
      { level: 'h4', size: '20px', font: analyzed.pairing.body, weight: '600' },
      { level: 'body', size: '16px', font: analyzed.pairing.body, weight: '400' },
      { level: 'small', size: '12px', font: analyzed.pairing.body, weight: '400' },
      { level: 'caption', size: '10px', font: analyzed.pairing.body, weight: '500' }
    ];

    analyzed.recommended = {
      displayFont: analyzed.pairing.display,
      bodyFont: analyzed.pairing.body,
      pairingScore: analyzed.pairing.confidence
    };

    this.confidence.typography = Math.min(1, fonts.length / 3);
    return analyzed;
  }

  /**
   * Analyze spacing: scale, increments, consistency
   */
  _analyzeSpacing() {
    const spacing = this.rawTokens.spacing || {};
    
    const analyzed = {
      scale: [],
      increment: null,
      consistency: 0,
      suggested: {}
    };

    if (Object.keys(spacing).length === 0) {
      return analyzed;
    }

    // Extract numeric values
    const values = Object.values(spacing)
      .map(v => {
        const match = v.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (values.length < 2) {
      return analyzed;
    }

    analyzed.scale = values;

    // Detect increment (common difference)
    const diffs = [];
    for (let i = 1; i < values.length; i++) {
      diffs.push(values[i] - values[i - 1]);
    }
    const increment = Math.round(
      diffs.reduce((a, b) => a + b, 0) / diffs.length
    );
    analyzed.increment = increment > 0 ? increment : 8; // default 8px

    // Consistency score (how many match the increment pattern)
    let consistent = 0;
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (Math.abs(diff - analyzed.increment) < 2) consistent++;
    }
    analyzed.consistency = consistent / Math.max(1, values.length - 1);

    // Suggest semantic spacing
    const baseIncrement = analyzed.increment;
    analyzed.suggested = {
      xs: `${baseIncrement * 0.5}px`,
      sm: `${baseIncrement * 1}px`,
      md: `${baseIncrement * 1.5}px`,
      lg: `${baseIncrement * 2}px`,
      xl: `${baseIncrement * 3}px`,
      '2xl': `${baseIncrement * 4}px`,
      '3xl': `${baseIncrement * 6}px`
    };

    this.confidence.spacing = Math.min(1, analyzed.consistency);
    return analyzed;
  }

  /**
   * Detect component patterns and structures
   */
  _detectComponentPatterns() {
    const rawTokens = this.rawTokens;
    const components = [];

    // Button pattern: primary + secondary colors with spacing
    if (Object.keys(rawTokens.colors || {}).length >= 2) {
      components.push({
        name: 'Button',
        states: {
          default: 'primary color + 8px padding',
          hover: 'darker primary',
          disabled: 'muted color'
        },
        confidence: 0.7
      });
    }

    // Card pattern: background + spacing
    if (Object.keys(rawTokens.spacing || {}).length >= 2) {
      components.push({
        name: 'Card',
        states: {
          default: 'surface background + 16px padding',
          hover: 'elevated shadow'
        },
        confidence: 0.7
      });
    }

    // Typography hierarchy
    if ((rawTokens.typography || []).length > 0) {
      components.push({
        name: 'Typography',
        variants: [
          'Display (H1-H3)',
          'Body (P, span)',
          'Caption (small, em)'
        ],
        confidence: 0.85
      });
    }

    return components;
  }

  /**
   * Generate comprehensive metadata
   */
  _generateMetadata() {
    return {
      extractedAt: new Date().toISOString(),
      totalTokens: Object.keys(this.rawTokens.colors || {}).length +
                   (this.rawTokens.typography || []).length +
                   Object.keys(this.rawTokens.spacing || {}).length,
      completeness: this._scoreCompleteness(),
      designMaturity: this._scoreMaturity(),
      readiness: this._scoreReadiness(),
      confidence: this.confidence
    };
  }

  /**
   * Helpers
   */

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  _hexToHsl(hex) {
    const rgb = this._hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  _getLightness(hex) {
    const hsl = this._hexToHsl(hex);
    return hsl.l;
  }

  _colorDistance(hex1, hex2) {
    const rgb1 = this._hexToRgb(hex1);
    const rgb2 = this._hexToRgb(hex2);
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  _getHueName(hue) {
    const names = {
      0: 'Red', 30: 'Orange', 60: 'Yellow', 120: 'Green',
      180: 'Cyan', 240: 'Blue', 270: 'Purple', 300: 'Magenta'
    };
    const closest = Object.keys(names).reduce((prev, curr) =>
      Math.abs(curr - hue) < Math.abs(prev - hue) ? curr : prev
    );
    return names[closest];
  }

  _isSerif(fontName) {
    const serifNames = ['Georgia', 'Times', 'Garamond', 'Playfair', 'Merriweather', 'Lora'];
    return serifNames.some(name => fontName.toLowerCase().includes(name.toLowerCase()));
  }

  _scoreCompleteness() {
    const colors = Object.keys(this.rawTokens.colors || {}).length;
    const fonts = (this.rawTokens.typography || []).length;
    const spacing = Object.keys(this.rawTokens.spacing || {}).length;
    
    let score = 0;
    if (colors >= 5) score += 30;
    if (fonts >= 2) score += 30;
    if (spacing >= 4) score += 40;
    return Math.min(100, score);
  }

  _scoreMaturity() {
    const colors = Object.keys(this.rawTokens.colors || {}).length;
    const fonts = (this.rawTokens.typography || []).length;
    const spacing = Object.keys(this.rawTokens.spacing || {}).length;
    
    let score = 0;
    if (colors >= 10) score += 25;
    if (colors >= 20) score += 15;
    if (fonts >= 3) score += 25;
    if (spacing >= 7) score += 35;
    return Math.min(100, score);
  }

  _scoreReadiness() {
    const completeness = this._scoreCompleteness();
    const maturity = this._scoreMaturity();
    const avgConfidence = Object.values(this.confidence).length > 0
      ? Object.values(this.confidence).reduce((a, b) => a + b) / Object.values(this.confidence).length
      : 0;
    
    return Math.round((completeness * 0.3 + maturity * 0.5 + avgConfidence * 100 * 0.2));
  }
}

export default DesignSystemAnalyzer;
