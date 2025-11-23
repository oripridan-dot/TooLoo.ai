#!/usr/bin/env node

/**
 * Design System Enhancer
 * Advanced capabilities for design system analysis and comparison
 * - Component pattern detection and extraction
 * - Design maturity scoring (enhanced)
 * - Cross-site system comparison
 * - AI-powered semantic token naming
 */

export class DesignSystemEnhancer {
  constructor(extractedSystem = {}) {
    this.system = extractedSystem;
    this.components = [];
    this.maturityScore = 0;
    this.semanticNames = {};
  }

  /**
   * Component Detection Phase
   * Identify and extract repeated UI patterns from HTML
   */
  async detectComponents(html) {
    const components = {
      buttons: this._detectButtons(html),
      cards: this._detectCards(html),
      headers: this._detectHeaders(html),
      forms: this._detectForms(html),
      navigation: this._detectNavigation(html),
      modals: this._detectModals(html),
      alerts: this._detectAlerts(html),
      badges: this._detectBadges(html),
      lists: this._detectLists(html),
      tables: this._detectTables(html)
    };

    // Filter out empty components
    this.components = Object.entries(components)
      .filter(([_, comp]) => comp && Object.keys(comp).length > 0)
      .reduce((acc, [name, comp]) => ({ ...acc, [name]: comp }), {});

    return this.components;
  }

  /**
   * COMPONENT DETECTION HELPERS
   */

  _detectButtons(html) {
    const buttons = {};
    const seen = new Set();

    // Native button elements with classes
    const buttonMatches = html.matchAll(/<button[^>]*class=["']([^"']+)["'][^>]*>/gi);
    for (const match of buttonMatches) {
      const classes = match[1];
      if (!seen.has(classes)) {
        seen.add(classes);
        buttons[classes] = {
          type: 'button',
          pattern: classes.split(' '),
          variants: this._extractVariants(classes),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }
    }

    // Anchor tags styled as buttons (a.btn, a.button, etc.)
    const linkMatches = html.matchAll(/<a[^>]*class=["']([^"']*\b(?:btn|button)[^"']*)["'][^>]*>/gi);
    for (const match of linkMatches) {
      const classes = match[1];
      if (!seen.has(classes) && !buttons[classes]) {
        seen.add(classes);
        buttons[classes] = {
          type: 'link-button',
          pattern: classes.split(' '),
          variants: this._extractVariants(classes),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }
    }

    // Div-based buttons (common in modern frameworks)
    const divMatches = html.matchAll(/<div[^>]*class=["']([^"']*\b(?:btn|button|cta)[^"']*)["'][^>]*>/gi);
    for (const match of divMatches) {
      const classes = match[1];
      if (!seen.has(classes) && !buttons[classes]) {
        seen.add(classes);
        buttons[classes] = {
          type: 'div-button',
          pattern: classes.split(' '),
          variants: this._extractVariants(classes),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }
    }

    return buttons;
  }

  _detectCards(html) {
    const cards = {};
    const seen = new Set();

    // Elements with card/container/box classes
    const patterns = ['card', 'container', 'box', 'panel', 'section', 'tile'];
    
    for (const pattern of patterns) {
      const regex = new RegExp(`<(\\w+)[^>]*class=["']([^"']*\\b${pattern}\\b[^"']*)["'][^>]*>`, 'gi');
      for (const match of html.matchAll(regex)) {
        const classes = match[2];
        if (!seen.has(classes)) {
          seen.add(classes);
          cards[classes] = {
            element: match[1],
            pattern: classes.split(' '),
            variants: this._extractVariants(classes),
            count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
          };
        }
      }
    }

    return cards;
  }

  _detectHeaders(html) {
    const headers = {};
    
    // H1, H2, H3 with classes
    for (let i = 1; i <= 6; i++) {
      const regex = new RegExp(`<h${i}[^>]*class=["']([^"']+)["'][^>]*>`, 'gi');
      for (const match of html.matchAll(regex)) {
        const classes = match[1];
        headers[classes] = {
          level: `h${i}`,
          pattern: classes.split(' '),
          variants: this._extractVariants(classes),
          count: (html.match(new RegExp(`<h${i}[^>]*class=["']${classes}["']`, 'g')) || []).length
        };
      }
    }

    // Header/nav elements
    const headerMatches = html.matchAll(/<(?:header|nav)[^>]*class=["']([^"']+)["'][^>]*>/gi);
    for (const match of headerMatches) {
      const classes = match[1];
      headers[`nav_${classes}`] = {
        element: 'header/nav',
        pattern: classes.split(' '),
        variants: this._extractVariants(classes),
        count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
      };
    }

    return headers;
  }

  _detectForms(html) {
    const forms = {};

    // Count form elements and input types
    const inputTypes = new Set();
    const inputMatches = html.matchAll(/<input[^>]*type=["']([^"']+)["'][^>]*>/gi);
    for (const match of inputMatches) {
      inputTypes.add(match[1]);
    }

    if (inputTypes.size > 0) {
      forms.inputs = {
        types: Array.from(inputTypes),
        count: (html.match(/<input/gi) || []).length,
        hasLabels: /<label/.test(html),
        hasValidation: /required|aria-required|pattern/.test(html)
      };
    }

    // Textarea elements
    const textareaCount = (html.match(/<textarea/gi) || []).length;
    if (textareaCount > 0) {
      forms.textarea = { count: textareaCount };
    }

    // Select elements
    const selectCount = (html.match(/<select/gi) || []).length;
    if (selectCount > 0) {
      forms.select = { count: selectCount };
    }

    // Form groups
    const formGroupMatches = html.matchAll(/<(?:div|fieldset)[^>]*class=["']([^"']*(?:form|group)[^"']*)["'][^>]*>/gi);
    for (const match of formGroupMatches) {
      const classes = match[1];
      forms[classes] = {
        pattern: classes.split(' '),
        count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
      };
    }

    return forms;
  }

  _detectNavigation(html) {
    const nav = {};

    // Nav elements with classes
    const navMatches = html.matchAll(/<(?:nav|ul)[^>]*class=["']([^"']+)["'][^>]*>/gi);
    for (const match of navMatches) {
      const classes = match[1];
      nav[classes] = {
        pattern: classes.split(' '),
        variants: this._extractVariants(classes),
        hasLinks: /href/.test(match[0]),
        count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
      };
    }

    // Breadcrumbs
    if (/breadcrumb/i.test(html)) {
      nav.breadcrumbs = { pattern: 'breadcrumb', count: (html.match(/breadcrumb/gi) || []).length };
    }

    // Tabs
    if (/tab|tablist/i.test(html)) {
      nav.tabs = { pattern: 'tabs', count: (html.match(/tab/gi) || []).length };
    }

    // Pagination
    if (/pagination|pagina/i.test(html)) {
      nav.pagination = { pattern: 'pagination', count: (html.match(/pagination/gi) || []).length };
    }

    return nav;
  }

  _detectModals(html) {
    const modals = {};

    // Modal/dialog elements
    const patterns = ['modal', 'dialog', 'popup', 'overlay'];
    
    for (const pattern of patterns) {
      const regex = new RegExp(`<(?:div|section)[^>]*class=["']([^"']*\\b${pattern}\\b[^"']*)["'][^>]*>`, 'gi');
      for (const match of html.matchAll(regex)) {
        const classes = match[1];
        modals[classes] = {
          pattern: classes.split(' '),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length,
          hasBackdrop: /backdrop|overlay/.test(match[0])
        };
      }
    }

    return modals;
  }

  _detectAlerts(html) {
    const alerts = {};

    // Alert/notification patterns
    const patterns = ['alert', 'notification', 'toast', 'warning', 'error', 'success', 'info'];
    
    for (const pattern of patterns) {
      const regex = new RegExp(`<(?:div|section|article)[^>]*class=["']([^"']*\\b${pattern}\\b[^"']*)["'][^>]*>`, 'gi');
      for (const match of html.matchAll(regex)) {
        const classes = match[1];
        alerts[classes] = {
          pattern: classes.split(' '),
          type: pattern,
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }
    }

    return alerts;
  }

  _detectBadges(html) {
    const badges = {};

    // Badge/label/tag patterns
    const patterns = ['badge', 'label', 'tag', 'chip', 'pill'];
    
    for (const pattern of patterns) {
      const regex = new RegExp(`<(?:span|div|a)[^>]*class=["']([^"']*\\b${pattern}\\b[^"']*)["'][^>]*>`, 'gi');
      for (const match of html.matchAll(regex)) {
        const classes = match[1];
        badges[classes] = {
          element: match[1],
          pattern: classes.split(' '),
          variants: this._extractVariants(classes),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }
    }

    return badges;
  }

  _detectLists(html) {
    const lists = {};

    // Lists with classes
    const listMatches = html.matchAll(/<(?:ul|ol)[^>]*class=["']([^"']+)["'][^>]*>/gi);
    for (const match of listMatches) {
      const classes = match[1];
      lists[classes] = {
        type: match[0].includes('<ul') ? 'unordered' : 'ordered',
        pattern: classes.split(' '),
        count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
      };
    }

    return lists;
  }

  _detectTables(html) {
    const tables = {};

    // Tables with classes
    if (html.includes('<table')) {
      const tableMatches = html.matchAll(/<table[^>]*class=["']([^"']+)["'][^>]*>/gi);
      for (const match of tableMatches) {
        const classes = match[1];
        tables[classes] = {
          pattern: classes.split(' '),
          hasThead: /<thead/.test(match[0]),
          hasTfoot: /<tfoot/.test(match[0]),
          count: (html.match(new RegExp(`class=["']${classes}`, 'g')) || []).length
        };
      }

      tables.summary = {
        total: (html.match(/<table/gi) || []).length,
        withHeaders: (html.match(/<th/gi) || []).length
      };
    }

    return tables;
  }

  _extractVariants(classes) {
    // Extract common variant patterns (e.g., btn-primary, btn-lg, btn-disabled)
    const parts = classes.split(' ');
    const variants = new Map();
    
    for (const part of parts) {
      const match = part.match(/^([a-z]+)-([a-z]+)$/i);
      if (match) {
        const [_, prefix, variant] = match;
        if (!variants.has(prefix)) {
          variants.set(prefix, []);
        }
        variants.get(prefix).push(variant);
      }
    }

    return Object.fromEntries(variants);
  }

  /**
   * Design Maturity Scoring Phase
   * Enhanced assessment of design system quality and consistency
   */
  scoreDesignMaturity(system) {
    let score = 0;
    const breakdown = {};

    // Color palette consistency (0-20 points)
    const colorScore = this._scoreColorConsistency(system.colors || {});
    breakdown.colors = colorScore;
    score += colorScore;

    // Typography hierarchy (0-20 points)
    const typographyScore = this._scoreTypographyHierarchy(system.typography || []);
    breakdown.typography = typographyScore;
    score += typographyScore;

    // Spacing scale consistency (0-20 points)
    const spacingScore = this._scoreSpacingConsistency(system.spacing || {});
    breakdown.spacing = spacingScore;
    score += spacingScore;

    // Component consistency (0-20 points)
    const componentScore = this._scoreComponentConsistency(this.components);
    breakdown.components = componentScore;
    score += componentScore;

    // Design documentation/accessibility (0-20 points)
    const docsScore = this._scoreDocumentation(system);
    breakdown.documentation = docsScore;
    score += docsScore;

    this.maturityScore = Math.min(100, score);

    return {
      overall: this.maturityScore,
      breakdown,
      level: this._getMaturityLevel(this.maturityScore),
      recommendations: this._generateRecommendations(breakdown)
    };
  }

  _scoreColorConsistency(colors) {
    let score = 0;

    const colorCount = Object.keys(colors).length;
    if (colorCount >= 3 && colorCount <= 12) score += 10; // Sweet spot
    else if (colorCount >= 2 && colorCount <= 20) score += 8;
    else if (colorCount > 0) score += 5;

    // Check for semantic naming patterns
    const semanticPatterns = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
    const hasSemanticNaming = semanticPatterns.some(p => 
      Object.keys(colors).some(c => c.toLowerCase().includes(p))
    );
    if (hasSemanticNaming) score += 10;

    return Math.min(20, score);
  }

  _scoreTypographyHierarchy(typography) {
    let score = 0;

    const fontCount = new Set(typography.map(t => t.family)).size;
    if (fontCount >= 1 && fontCount <= 3) score += 10; // Recommended range
    else if (fontCount > 0) score += 5;

    // Check for weight variety
    const weights = new Set(typography.map(t => t.weight));
    if (weights.size >= 3) score += 10; // Multiple weights indicate hierarchy

    return Math.min(20, score);
  }

  _scoreSpacingConsistency(spacing) {
    let score = 0;

    const spacingCount = Object.keys(spacing).length;
    if (spacingCount >= 4 && spacingCount <= 8) score += 15; // Sweet spot for scale
    else if (spacingCount >= 2) score += 10;
    else if (spacingCount > 0) score += 5;

    // Check for consistent intervals
    const values = Object.values(spacing)
      .map(v => parseInt(v))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length >= 3) {
      const intervals = [];
      for (let i = 1; i < values.length; i++) {
        intervals.push(values[i] - values[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const isConsistent = intervals.every(i => Math.abs(i - avgInterval) < avgInterval * 0.5);
      if (isConsistent) score += 5;
    }

    return Math.min(20, score);
  }

  _scoreComponentConsistency(components) {
    let score = 0;

    const componentTypes = Object.keys(components).length;
    if (componentTypes >= 3) score += 10;
    else if (componentTypes >= 1) score += 5;

    // Count variants (e.g., btn-primary, btn-secondary)
    const totalVariants = Object.values(components)
      .reduce((sum, comp) => sum + Object.keys(comp).length, 0);
    if (totalVariants >= 10) score += 10;
    else if (totalVariants >= 5) score += 5;

    return Math.min(20, score);
  }

  _scoreDocumentation(system) {
    let score = 0;

    // Check for metadata
    if (system.metadata) score += 5;
    if (system.effects) score += 5;
    if (system.accessibility) score += 5;
    if (system.guidelines) score += 5;

    return Math.min(20, score);
  }

  _getMaturityLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Basic';
    return 'Minimal';
  }

  _generateRecommendations(breakdown) {
    const recommendations = [];

    if (breakdown.colors < 15) {
      recommendations.push('Expand color palette with semantic color roles');
    }
    if (breakdown.typography < 15) {
      recommendations.push('Establish clear typography hierarchy with multiple weights');
    }
    if (breakdown.spacing < 15) {
      recommendations.push('Create consistent spacing scale (4px, 8px, 16px, 24px, etc.)');
    }
    if (breakdown.components < 15) {
      recommendations.push('Document and standardize component patterns');
    }
    if (breakdown.documentation < 15) {
      recommendations.push('Add accessibility guidelines and component documentation');
    }

    return recommendations;
  }

  /**
   * Cross-Site Comparison Phase
   * Compare extracted systems side-by-side
   */
  compareWithSystem(otherSystem) {
    return {
      colorComparison: this._compareColors(this.system.colors, otherSystem.colors),
      typographyComparison: this._compareTypography(this.system.typography, otherSystem.typography),
      spacingComparison: this._compareSpacing(this.system.spacing, otherSystem.spacing),
      componentComparison: this._compareComponents(this.components, otherSystem.components || {}),
      maturityComparison: this._compareMaturity(this.maturityScore, otherSystem.maturityScore || 0),
      similarities: this._findSimilarities(this.system, otherSystem),
      differences: this._findDifferences(this.system, otherSystem)
    };
  }

  _compareColors(colors1, colors2) {
    const set1 = new Set(Object.keys(colors1));
    const set2 = new Set(Object.keys(colors2));
    const shared = Array.from(set1).filter(c => set2.has(c));
    const unique1 = Array.from(set1).filter(c => !set2.has(c));
    const unique2 = Array.from(set2).filter(c => !set1.has(c));

    return {
      total: { system1: set1.size, system2: set2.size },
      shared: { count: shared.length, colors: shared },
      unique: { system1: unique1, system2: unique2 },
      similarity: set1.size > 0 ? (shared.length / set1.size * 100).toFixed(1) : 0
    };
  }

  _compareTypography(typo1, typo2) {
    const families1 = new Set(typo1.map(t => t.family));
    const families2 = new Set(typo2.map(t => t.family));
    const shared = Array.from(families1).filter(f => families2.has(f));

    return {
      total: { system1: families1.size, system2: families2.size },
      shared: { count: shared.length, families: shared },
      similarity: families1.size > 0 ? (shared.length / families1.size * 100).toFixed(1) : 0
    };
  }

  _compareSpacing(spacing1, spacing2) {
    const keys1 = Object.keys(spacing1);
    const keys2 = Object.keys(spacing2);
    const shared = keys1.filter(k => keys2.includes(k));

    return {
      total: { system1: keys1.length, system2: keys2.length },
      shared: { count: shared.length, values: shared },
      similarity: keys1.length > 0 ? (shared.length / keys1.length * 100).toFixed(1) : 0
    };
  }

  _compareComponents(comp1, comp2) {
    const types1 = new Set(Object.keys(comp1));
    const types2 = new Set(Object.keys(comp2));
    const shared = Array.from(types1).filter(t => types2.has(t));

    return {
      total: { system1: types1.size, system2: types2.size },
      shared: { count: shared.length, types: shared },
      similarity: types1.size > 0 ? (shared.length / types1.size * 100).toFixed(1) : 0
    };
  }

  _compareMaturity(score1, score2) {
    const diff = Math.abs(score1 - score2);
    return {
      system1: score1,
      system2: score2,
      difference: diff,
      stronger: score1 > score2 ? 'system1' : 'system2'
    };
  }

  _findSimilarities(system1, system2) {
    const similarities = [];

    // Similar color counts
    const colorDiff = Math.abs(
      Object.keys(system1.colors || {}).length - 
      Object.keys(system2.colors || {}).length
    );
    if (colorDiff <= 2) similarities.push('Similar color palette size');

    // Similar typography approach
    const typo1Count = new Set(system1.typography?.map(t => t.family) || []).size;
    const typo2Count = new Set(system2.typography?.map(t => t.family) || []).size;
    if (typo1Count === typo2Count) similarities.push('Same number of font families');

    // Similar spacing approaches
    const spacing1Count = Object.keys(system1.spacing || {}).length;
    const spacing2Count = Object.keys(system2.spacing || {}).length;
    if (Math.abs(spacing1Count - spacing2Count) <= 2) similarities.push('Similar spacing scale');

    return similarities;
  }

  _findDifferences(system1, system2) {
    const differences = [];

    // Color palette differences
    const colorDiff = Math.abs(
      Object.keys(system1.colors || {}).length - 
      Object.keys(system2.colors || {}).length
    );
    if (colorDiff > 2) {
      differences.push(`Color palette sizes differ by ${colorDiff} colors`);
    }

    // Typography differences
    const typo1Count = new Set(system1.typography?.map(t => t.family) || []).size;
    const typo2Count = new Set(system2.typography?.map(t => t.family) || []).size;
    if (typo1Count !== typo2Count) {
      differences.push(`Typography: ${typo1Count} vs ${typo2Count} font families`);
    }

    // Component differences
    const comp1Types = Object.keys(system1.components || {}).length;
    const comp2Types = Object.keys(system2.components || {}).length;
    if (comp1Types !== comp2Types) {
      differences.push(`Component types: ${comp1Types} vs ${comp2Types}`);
    }

    return differences;
  }

  /**
   * AI Token Naming Phase
   * Semantic naming and categorization of discovered tokens
   */
  generateSemanticNames(tokens) {
    this.semanticNames = {
      colors: this._nameColors(tokens.colors || {}),
      typography: this._nameTypography(tokens.typography || []),
      spacing: this._nameSpacing(tokens.spacing || {}),
      effects: this._nameEffects(tokens.effects || {})
    };

    return this.semanticNames;
  }

  _nameColors(colors) {
    const named = {};

    for (const [hex, data] of Object.entries(colors)) {
      const hsl = this._hexToHsl(hex);
      let name = this._guessColorName(hex, hsl);
      let semantic = this._guessSemanticRole(hex);

      named[hex] = {
        originalHex: hex,
        suggestedName: name,
        semanticRole: semantic,
        hsl,
        confidence: this._getNameConfidence(hex)
      };
    }

    return named;
  }

  _guessColorName(hex, hsl) {
    const [h, s, l] = hsl;

    // Grayscale
    if (s < 5) {
      if (l < 10) return 'black';
      if (l < 25) return 'gray-900';
      if (l < 40) return 'gray-800';
      if (l < 55) return 'gray-700';
      if (l < 70) return 'gray-500';
      if (l < 85) return 'gray-300';
      if (l < 95) return 'gray-100';
      return 'white';
    }

    // Hue-based naming
    const hueRanges = {
      'red': [355, 10],
      'orange': [15, 40],
      'yellow': [45, 65],
      'green': [70, 155],
      'cyan': [160, 200],
      'blue': [205, 260],
      'purple': [265, 295],
      'pink': [300, 350]
    };

    for (const [color, [min, max]] of Object.entries(hueRanges)) {
      if (min <= max) {
        if (h >= min && h <= max) return color;
      } else {
        if (h >= min || h <= max) return color;
      }
    }

    return 'color';
  }

  _guessSemanticRole(hex) {
    const roles = {
      '#007bff': 'primary',
      '#28a745': 'success',
      '#ffc107': 'warning',
      '#dc3545': 'danger',
      '#17a2b8': 'info',
      '#6c757d': 'secondary'
    };

    if (roles[hex]) return roles[hex];

    // Guess based on intensity and lightness
    const rgb = this._hexToRgb(hex);
    const hsl = this._hexToHsl(hex);
    const [, , l] = hsl;

    // Very dark or very light = background/text
    if (l < 20) return 'text-primary';
    if (l > 90) return 'background-light';
    if (l > 80) return 'background';

    // Mid-tone
    return 'secondary';
  }

  _getNameConfidence(hex) {
    // Higher confidence for standard hex values
    const standardColors = [
      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
      '#007bff', '#28a745', '#dc3545', '#ffc107'
    ];
    if (standardColors.includes(hex)) return 'high';
    
    return 'medium';
  }

  _nameTypography(typography) {
    const named = {};

    for (const typo of typography) {
      named[typo.family] = {
        original: typo.family,
        suggestedName: this._normalizeTypographyName(typo.family),
        weights: typo.weights || [],
        sizes: typo.sizes || [],
        semantic: this._guessTypographyRole(typo.family),
        confidence: this._getTypoConfidence(typo.family)
      };
    }

    return named;
  }

  _normalizeTypographyName(family) {
    // Clean up font names: remove quotes, normalize spaces
    return family.replace(/["']/g, '').trim().split(',')[0];
  }

  _guessTypographyRole(family) {
    const familyLower = family.toLowerCase();

    if (familyLower.includes('serif')) return 'serif';
    if (familyLower.includes('mono')) return 'monospace';
    if (familyLower.includes('system') || familyLower.includes('-apple')) return 'system';
    
    return 'sans-serif';
  }

  _getTypoConfidence(family) {
    // Web-safe fonts = high confidence
    const webSafe = [
      'arial', 'verdana', 'helvetica', 'times', 'courier',
      'georgia', 'palatino', 'garamond', 'bookman', 'comic sans'
    ];
    if (webSafe.some(f => family.toLowerCase().includes(f))) return 'high';
    
    return 'medium';
  }

  _nameSpacing(spacing) {
    const named = {};

    const scales = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    const sortedValues = Object.entries(spacing)
      .sort((a, b) => parseInt(a[1]) - parseInt(b[1]));

    for (let i = 0; i < sortedValues.length; i++) {
      const [key, value] = sortedValues[i];
      named[key] = {
        original: value,
        suggestedScale: scales[i] || `custom-${i}`,
        pxValue: parseInt(value),
        semanticUsage: this._guessSpacingUsage(parseInt(value)),
        confidence: 'high'
      };
    }

    return named;
  }

  _guessSpacingUsage(px) {
    if (px <= 4) return 'micro-spacing';
    if (px <= 8) return 'compact-padding';
    if (px <= 16) return 'default-padding';
    if (px <= 24) return 'section-padding';
    if (px <= 32) return 'large-margin';
    return 'section-margin';
  }

  _nameEffects(effects) {
    const named = {};

    if (effects.shadows && effects.shadows.length > 0) {
      named.shadows = effects.shadows.map((shadow, i) => ({
        original: shadow,
        suggestedName: this._nameShadow(shadow, i),
        type: shadow.includes('inset') ? 'inset' : 'drop',
        intensity: this._analyzeShadowIntensity(shadow)
      }));
    }

    if (effects.borders && effects.borders.length > 0) {
      named.borders = effects.borders.map((border, i) => ({
        original: border,
        suggestedName: this._nameBorder(border, i),
        width: this._extractBorderWidth(border),
        style: this._extractBorderStyle(border)
      }));
    }

    return named;
  }

  _nameShadow(shadow, index) {
    if (shadow.includes('0 4px')) return 'shadow-md';
    if (shadow.includes('0 1px')) return 'shadow-sm';
    if (shadow.includes('0 10px') || shadow.includes('0 20px')) return 'shadow-lg';
    if (shadow.includes('inset')) return 'shadow-inset';
    return `shadow-${index}`;
  }

  _analyzeShadowIntensity(shadow) {
    // Parse alpha value from rgba
    const alphaMatch = shadow.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/);
    if (alphaMatch) {
      const alpha = parseFloat(alphaMatch[1]);
      if (alpha > 0.3) return 'strong';
      if (alpha > 0.15) return 'medium';
      return 'subtle';
    }
    return 'unknown';
  }

  _nameBorder(border, index) {
    if (border.includes('solid')) return 'border-solid';
    if (border.includes('dashed')) return 'border-dashed';
    if (border.includes('dotted')) return 'border-dotted';
    return `border-${index}`;
  }

  _extractBorderWidth(border) {
    const match = border.match(/(\d+)px/);
    return match ? `${match[1]}px` : 'unknown';
  }

  _extractBorderStyle(border) {
    if (border.includes('solid')) return 'solid';
    if (border.includes('dashed')) return 'dashed';
    if (border.includes('dotted')) return 'dotted';
    if (border.includes('double')) return 'double';
    return 'unknown';
  }

  /**
   * HELPER METHODS
   */

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  _hexToHsl(hex) {
    const [r, g, b] = this._hexToRgb(hex);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
        case gn: h = ((bn - rn) / d + 2) / 6; break;
        case bn: h = ((rn - gn) / d + 4) / 6; break;
      }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
}

export default DesignSystemEnhancer;
