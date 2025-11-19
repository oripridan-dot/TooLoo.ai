#!/usr/bin/env node

/**
 * Design System Auto-Remediation Engine
 * 
 * Automatically fix common design system issues:
 * 1. Rule-Based Fixes - Apply standardized corrections
 * 2. Conflict Resolution - Resolve token and spacing conflicts
 * 3. Optimization Suggestions - Smart recommendations for improvements
 */

export class DesignAutoRemediation {
  constructor(system = {}) {
    this.system = system;
    this.rules = this._initRemediationRules();
    this.fixes = [];
    this.suggestions = [];
  }

  /**
   * Initialize remediation rules
   */
  _initRemediationRules() {
    return {
      colorNaming: {
        preferred: 'dash-separated',
        description: 'Standardize color names to dash-separated lowercase'
      },
      spacingScale: {
        base: 4,
        multiplier: 1.5,
        description: 'Geometric progression for spacing values'
      },
      typographyScale: {
        standard: [12, 14, 16, 20, 24, 32, 48],
        description: 'Standard typography size scale'
      }
    };
  }

  /**
   * PHASE 1: ANALYZE & DETECT ISSUES
   * Scan the design system for common problems
   */

  /**
   * Analyze system and detect issues
   */
  analyzeForIssues() {
    const issues = {
      colorIssues: this._detectColorIssues(),
      spacingIssues: this._detectSpacingIssues(),
      typographyIssues: this._detectTypographyIssues(),
      componentIssues: this._detectComponentIssues(),
      consistencyIssues: this._detectConsistencyIssues()
    };

    return {
      totalIssues: Object.values(issues).flat().length,
      issuesByCategory: Object.entries(issues).reduce((acc, [key, val]) => {
        acc[key] = val.length;
        return acc;
      }, {}),
      issues,
      severity: this._calculateOverallSeverity(issues)
    };
  }

  _detectColorIssues() {
    const issues = [];
    const colors = this.system.colors || {};

    // Issue 1: Too many colors
    if (Object.keys(colors).length > 20) {
      issues.push({
        id: 'color-overload',
        severity: 'high',
        issue: `Too many colors (${Object.keys(colors).length}). Industry standard is 8-15.`,
        affectedCount: Object.keys(colors).length,
        recommendation: 'Consolidate to primary, secondary, and accent colors'
      });
    }

    // Issue 2: Inconsistent color naming
    const colorNames = Object.keys(colors);
    const namingPatterns = new Set(colorNames.map(n => {
      if (n.includes('-')) return 'dash-separated';
      if (n.match(/^[a-z][a-z0-9]*$/)) return 'camelCase';
      if (n.match(/^[A-Z]/)) return 'PascalCase';
      return 'other';
    }));

    if (namingPatterns.size > 1) {
      issues.push({
        id: 'color-naming-inconsistent',
        severity: 'medium',
        issue: `Inconsistent color naming (${Array.from(namingPatterns).join(', ')})`,
        affectedCount: colorNames.length,
        recommendation: 'Standardize to one naming convention (e.g., dash-separated or camelCase)'
      });
    }

    // Issue 3: Missing semantic colors
    const semanticColors = ['primary', 'secondary', 'success', 'error', 'warning', 'info'];
    const hasSemantic = semanticColors.filter(sc => 
      Object.keys(colors).some(c => c.toLowerCase().includes(sc))
    );

    if (hasSemantic.length < 3) {
      issues.push({
        id: 'color-missing-semantic',
        severity: 'medium',
        issue: `Missing semantic color naming (only ${hasSemantic.length}/6 found)`,
        recommendation: 'Add explicit primary, secondary, success, error, warning, info colors'
      });
    }

    // Issue 4: Similar hex values
    const hexValues = Object.entries(colors).map(([name, value]) => ({ name, value }));
    for (let i = 0; i < hexValues.length; i++) {
      for (let j = i + 1; j < hexValues.length; j++) {
        const distance = this._colorDistance(hexValues[i].value, hexValues[j].value);
        if (distance < 20) {
          issues.push({
            id: 'color-too-similar',
            severity: 'low',
            issue: `Colors too similar: ${hexValues[i].name} and ${hexValues[j].name}`,
            colors: [hexValues[i].name, hexValues[j].name],
            recommendation: 'Merge or adjust one of the colors'
          });
        }
      }
    }

    return issues;
  }

  _detectSpacingIssues() {
    const issues = [];
    const spacing = this.system.spacing || {};
    const spacingValues = Object.entries(spacing).map(([name, value]) => ({
      name,
      value: parseInt(value) || value
    })).filter(s => typeof s.value === 'number');

    // Issue 1: Inconsistent scale
    const isConsistentScale = this._isConsistentScale(spacingValues.map(s => s.value));
    if (!isConsistentScale && spacingValues.length > 3) {
      issues.push({
        id: 'spacing-inconsistent-scale',
        severity: 'high',
        issue: 'Spacing scale is not consistent (expected geometric progression)',
        values: spacingValues.map(s => `${s.name}: ${s.value}px`),
        recommendation: 'Use consistent multiplier (e.g., 4px base, 1.5x or 2x scale)'
      });
    }

    // Issue 2: Too many spacing values
    if (spacingValues.length > 12) {
      issues.push({
        id: 'spacing-overload',
        severity: 'medium',
        issue: `Too many spacing values (${spacingValues.length}). Industry standard is 6-10.`,
        recommendation: 'Consolidate to essential spacing scale'
      });
    }

    // Issue 3: Missing base spacing
    if (!Object.keys(spacing).some(k => k.toLowerCase().includes('base') || k === '1')) {
      issues.push({
        id: 'spacing-no-base',
        severity: 'low',
        issue: 'No base spacing unit defined (e.g., 4px)',
        recommendation: 'Define a base unit and derive all other values from it'
      });
    }

    // Issue 4: Gaps in scale
    if (spacingValues.length > 2) {
      const sorted = spacingValues.sort((a, b) => a.value - b.value);
      const gaps = [];
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].value - sorted[i].value;
        if (gap > sorted[i].value * 0.5) {
          gaps.push({
            between: `${sorted[i].name} (${sorted[i].value}px) and ${sorted[i + 1].name} (${sorted[i + 1].value}px)`,
            gap: gap
          });
        }
      }
      if (gaps.length > 0) {
        issues.push({
          id: 'spacing-gaps',
          severity: 'low',
          issue: `Gaps in spacing scale: ${gaps.length} found`,
          gaps,
          recommendation: 'Fill gaps or ensure spacing scale is intentional'
        });
      }
    }

    return issues;
  }

  _detectTypographyIssues() {
    const issues = [];
    const typography = this.system.typography || [];

    // Issue 1: Too many typefaces
    const families = new Set(typography.map(t => t.family));
    if (families.size > 3) {
      issues.push({
        id: 'typography-overload',
        severity: 'high',
        issue: `Too many typefaces (${families.size}). Industry standard is 2-3.`,
        recommendation: 'Limit to 2-3 typeface families maximum'
      });
    }

    // Issue 2: Size scale inconsistency
    const sizes = typography.map(t => t.size).filter(s => s).sort((a, b) => a - b);
    if (sizes.length > 2 && !this._isConsistentScale(sizes)) {
      issues.push({
        id: 'typography-size-scale',
        severity: 'medium',
        issue: 'Typography size scale is not consistent',
        sizes: sizes.join(', ') + 'px',
        recommendation: 'Use consistent size scale (e.g., 12, 14, 16, 20, 24, 32)'
      });
    }

    // Issue 3: Missing heading hierarchy
    const hasHeadings = typography.some(t => 
      t.name?.match(/h[1-6]|heading|display/i)
    );
    if (!hasHeadings && typography.length > 0) {
      issues.push({
        id: 'typography-no-heading-hierarchy',
        severity: 'medium',
        issue: 'No clear heading hierarchy defined',
        recommendation: 'Define heading styles: H1, H2, H3, plus body and caption styles'
      });
    }

    // Issue 4: Line height not defined
    const noLineHeight = typography.filter(t => !t.lineHeight || t.lineHeight === 1);
    if (noLineHeight.length > typography.length / 2) {
      issues.push({
        id: 'typography-line-height',
        severity: 'low',
        issue: `${noLineHeight.length} typography styles missing line height`,
        recommendation: 'Set line height to 1.5 for body text, 1.2 for headings'
      });
    }

    return issues;
  }

  _detectComponentIssues() {
    const issues = [];
    const components = this.system.components || {};

    // Issue 1: Too few components
    if (Object.keys(components).length < 5) {
      issues.push({
        id: 'components-insufficient',
        severity: 'low',
        issue: `Too few components documented (${Object.keys(components).length})`,
        recommendation: 'Document at least 8-10 core components'
      });
    }

    // Issue 2: Inconsistent component structure
    const structurePatterns = new Set(
      Object.values(components).map(c => Object.keys(c).sort().join(','))
    );
    if (structurePatterns.size > 1) {
      issues.push({
        id: 'components-inconsistent-structure',
        severity: 'medium',
        issue: `Components have inconsistent structure (${structurePatterns.size} patterns found)`,
        recommendation: 'Standardize component structure: name, variants, props, examples'
      });
    }

    return issues;
  }

  _detectConsistencyIssues() {
    const issues = [];

    // Issue 1: Orphaned tokens (tokens defined but not used)
    const allTokens = [
      ...Object.keys(this.system.colors || {}),
      ...Object.keys(this.system.spacing || {}),
      ...Object.keys(this.system.effects || {})
    ];

    const usedTokens = new Set();
    Object.values(this.system.components || {}).forEach(comp => {
      const json = JSON.stringify(comp).toLowerCase();
      allTokens.forEach(token => {
        if (json.includes(token.toLowerCase())) {
          usedTokens.add(token);
        }
      });
    });

    const orphaned = allTokens.filter(t => !usedTokens.has(t));
    if (orphaned.length > allTokens.length * 0.2) {
      issues.push({
        id: 'consistency-orphaned-tokens',
        severity: 'low',
        issue: `${orphaned.length} tokens may be unused`,
        tokens: orphaned.slice(0, 5),
        recommendation: 'Remove unused tokens or add to components'
      });
    }

    // Issue 2: Documentation gaps
    const documented = Object.values(this.system.components || {})
      .filter(c => c.description || c.documentation).length;
    const total = Object.keys(this.system.components || {}).length;

    if (total > 0 && documented / total < 0.5) {
      issues.push({
        id: 'consistency-documentation',
        severity: 'medium',
        issue: `Only ${documented}/${total} components have documentation`,
        recommendation: 'Add description and usage guidelines to all components'
      });
    }

    return issues;
  }

  /**
   * PHASE 2: APPLY AUTOMATIC FIXES
   * Apply rule-based corrections
   */

  /**
   * Apply all automatic fixes to the system
   */
  applyAutoFixes() {
    const issues = this.analyzeForIssues();
    this.fixes = [];

    // Apply fixes for each issue type
    for (const issue of issues.issues.colorIssues) {
      if (issue.id === 'color-naming-inconsistent') {
        this._fixColorNaming();
      }
      if (issue.id === 'color-too-similar') {
        this._fixSimilarColors();
      }
    }

    for (const issue of issues.issues.spacingIssues) {
      if (issue.id === 'spacing-inconsistent-scale') {
        this._fixSpacingScale();
      }
    }

    for (const issue of issues.issues.typographyIssues) {
      if (issue.id === 'typography-size-scale') {
        this._fixTypographyScale();
      }
    }

    return {
      fixesApplied: this.fixes.length,
      fixes: this.fixes,
      systemModified: this.system,
      changesSummary: this._summarizeChanges()
    };
  }

  _fixColorNaming() {
    const colors = this.system.colors || {};
    const standardized = {};

    for (const [name, value] of Object.entries(colors)) {
      // Standardize to dash-separated lowercase
      let standardName = name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      standardized[standardName] = value;
    }

    this.system.colors = standardized;
    this.fixes.push({
      type: 'color-naming',
      before: Object.keys(colors).length,
      after: Object.keys(standardized).length,
      description: 'Standardized color naming to dash-separated lowercase'
    });
  }

  _fixSimilarColors() {
    const colors = { ...this.system.colors };
    const removed = [];

    const sortedColors = Object.entries(colors)
      .sort((a, b) => a[1].localeCompare(b[1]));

    for (let i = 0; i < sortedColors.length - 1; i++) {
      const dist = this._colorDistance(sortedColors[i][1], sortedColors[i + 1][1]);
      if (dist < 20) {
        removed.push(sortedColors[i + 1][0]);
        delete colors[sortedColors[i + 1][0]];
      }
    }

    this.system.colors = colors;
    if (removed.length > 0) {
      this.fixes.push({
        type: 'color-consolidation',
        removed,
        description: `Removed ${removed.length} duplicate/similar colors`
      });
    }
  }

  _fixSpacingScale() {
    const spacing = this.system.spacing || {};
    const base = 4; // Standard base unit
    const multiplier = 1.5;

    const newScale = {};
    for (let i = 1; i <= 8; i++) {
      const value = Math.round(base * Math.pow(multiplier, i - 1));
      newScale[`spacing-${i}`] = `${value}px`;
    }

    const oldCount = Object.keys(spacing).length;
    this.system.spacing = newScale;

    this.fixes.push({
      type: 'spacing-scale-standardization',
      before: oldCount,
      after: Object.keys(newScale).length,
      base: `${base}px`,
      multiplier: multiplier,
      description: 'Standardized spacing scale with geometric progression'
    });
  }

  _fixTypographyScale() {
    const typography = this.system.typography || [];
    const standardScale = [12, 14, 16, 20, 24, 32, 48];

    const updated = typography.map(t => {
      if (!t.size) return t;

      // Find nearest standard size
      const nearest = standardScale.reduce((prev, curr) => 
        Math.abs(curr - t.size) < Math.abs(prev - t.size) ? curr : prev
      );

      return {
        ...t,
        size: nearest,
        lineHeight: nearest <= 16 ? 1.5 : 1.4
      };
    });

    this.system.typography = updated;
    this.fixes.push({
      type: 'typography-scale',
      scale: standardScale,
      description: 'Standardized typography to consistent size scale'
    });
  }

  /**
   * PHASE 3: CONFLICT RESOLUTION
   * Resolve conflicts between tokens
   */

  /**
   * Detect and resolve conflicts
   */
  resolveConflicts() {
    const conflicts = [];

    // Conflict 1: Duplicate values with different names
    conflicts.push(...this._resolveDuplicateTokens());

    // Conflict 2: Overlapping ranges
    conflicts.push(...this._resolveSpacingOverlaps());

    // Conflict 3: Naming conflicts
    conflicts.push(...this._resolveNamingConflicts());

    return {
      conflictsFound: conflicts.length,
      conflicts,
      resolved: conflicts.filter(c => c.resolution).length
    };
  }

  _resolveDuplicateTokens() {
    const conflicts = [];
    const colors = this.system.colors || {};
    const colorMap = new Map();

    // Group by value
    for (const [name, value] of Object.entries(colors)) {
      if (!colorMap.has(value)) {
        colorMap.set(value, []);
      }
      colorMap.get(value).push(name);
    }

    // Find duplicates
    for (const [value, names] of colorMap.entries()) {
      if (names.length > 1) {
        conflicts.push({
          type: 'duplicate-color-value',
          value,
          names,
          resolution: `Keep ${names[0]}, alias or remove ${names.slice(1).join(', ')}`
        });
      }
    }

    return conflicts;
  }

  _resolveSpacingOverlaps() {
    const conflicts = [];
    const spacing = this.system.spacing || {};
    const values = Object.entries(spacing)
      .map(([name, val]) => ({ name, value: parseInt(val) || 0 }))
      .filter(s => s.value > 0)
      .sort((a, b) => a.value - b.value);

    for (let i = 0; i < values.length - 1; i++) {
      const diff = values[i + 1].value - values[i].value;
      if (diff < 2) {
        conflicts.push({
          type: 'spacing-overlap',
          values: [values[i].name, values[i + 1].name],
          difference: `${diff}px`,
          resolution: `Merge ${values[i + 1].name} into ${values[i].name}`
        });
      }
    }

    return conflicts;
  }

  _resolveNamingConflicts() {
    const conflicts = [];
    const allTokens = [
      ...Object.keys(this.system.colors || {}),
      ...Object.keys(this.system.spacing || {}),
      ...Object.keys(this.system.typography?.map(t => t.name) || [])
    ];

    const lowerNames = new Map();
    for (const token of allTokens) {
      const lower = token.toLowerCase();
      if (!lowerNames.has(lower)) {
        lowerNames.set(lower, []);
      }
      lowerNames.get(lower).push(token);
    }

    for (const [_lower, names] of lowerNames.entries()) {
      if (names.length > 1) {
        conflicts.push({
          type: 'naming-case-conflict',
          names,
          resolution: `Standardize to single case format: ${names[0]}`
        });
      }
    }

    return conflicts;
  }

  /**
   * PHASE 4: OPTIMIZATION SUGGESTIONS
   * Smart recommendations for improvements
   */

  /**
   * Generate optimization suggestions
   */
  generateOptimizations() {
    const suggestions = [];

    suggestions.push(...this._suggestColorOptimizations());
    suggestions.push(...this._suggestSpacingOptimizations());
    suggestions.push(...this._suggestTypographyOptimizations());
    suggestions.push(...this._suggestComponentOptimizations());

    return {
      totalSuggestions: suggestions.length,
      suggestions: suggestions.sort((a, b) => b.impact - a.impact),
      potentialBenefit: this._calculatePotentialBenefit(suggestions)
    };
  }

  _suggestColorOptimizations() {
    const suggestions = [];
    const colors = this.system.colors || {};

    // Suggestion 1: Color variables usage
    if (Object.keys(colors).length > 5) {
      suggestions.push({
        category: 'color-optimization',
        title: 'Create color variable aliases',
        description: 'Use semantic color names (primary, secondary) aliased to actual colors',
        impact: 8,
        implementation: 'Create aliases: primary → blue-500, secondary → gray-600',
        timeEstimate: '10 minutes'
      });
    }

    // Suggestion 2: Color palette analysis
    const hues = new Set();
    Object.values(colors).forEach(hex => {
      const hue = this._getHue(hex);
      hues.add(Math.round(hue / 30) * 30);
    });

    if (hues.size > 5) {
      suggestions.push({
        category: 'color-optimization',
        title: 'Consolidate color hues',
        description: 'Reduce number of distinct hues for better harmony',
        impact: 7,
        hueCount: hues.size,
        recommendation: 'Aim for 3-4 primary hues'
      });
    }

    return suggestions;
  }

  _suggestSpacingOptimizations() {
    const suggestions = [];
    const spacing = this.system.spacing || {};
    const spacingCount = Object.keys(spacing).length;

    // Suggestion 1: Spacing name standards
    const hasNumbering = Object.keys(spacing).some(s => s.match(/\d/));
    if (!hasNumbering && spacingCount > 0) {
      suggestions.push({
        category: 'spacing-optimization',
        title: 'Add numeric spacing scale',
        description: 'Use spacing-1, spacing-2, ... naming for consistency',
        impact: 6,
        implementation: 'Rename to spacing-1 through spacing-8',
        timeEstimate: '5 minutes'
      });
    }

    // Suggestion 2: REM instead of PX
    if (Object.values(spacing).some(s => s.toString().includes('px'))) {
      suggestions.push({
        category: 'spacing-optimization',
        title: 'Convert to rem units',
        description: 'Use rem units for better scalability and accessibility',
        impact: 7,
        implementation: 'Convert px values to rem (divide by 16)',
        timeEstimate: '10 minutes'
      });
    }

    return suggestions;
  }

  _suggestTypographyOptimizations() {
    const suggestions = [];
    const typography = this.system.typography || [];

    // Suggestion 1: Web fonts import
    if (typography.length > 0) {
      const fonts = new Set(typography.map(t => t.family));
      suggestions.push({
        category: 'typography-optimization',
        title: 'Optimize web font loading',
        description: `${fonts.size} typeface(s) detected. Ensure subset and weight optimization.`,
        impact: 6,
        fonts: Array.from(fonts),
        recommendation: 'Use font-display: swap; and limit weights to 2-3 per family'
      });
    }

    // Suggestion 2: Letter spacing
    const missingLetterSpacing = typography.filter(t => !t.letterSpacing).length;
    if (missingLetterSpacing > 0) {
      suggestions.push({
        category: 'typography-optimization',
        title: 'Add letter spacing to headings',
        description: 'Improve readability and visual hierarchy',
        impact: 5,
        affectedStyles: missingLetterSpacing,
        recommendation: 'Add 0.5px letter-spacing to heading styles'
      });
    }

    return suggestions;
  }

  _suggestComponentOptimizations() {
    const suggestions = [];
    const components = this.system.components || {};

    if (Object.keys(components).length === 0) {
      suggestions.push({
        category: 'component-optimization',
        title: 'Create component library',
        description: 'Document reusable component patterns',
        impact: 9,
        components: ['Button', 'Card', 'Form', 'Navigation', 'Modal'],
        timeEstimate: '2-3 hours'
      });
    }

    return suggestions;
  }

  _calculatePotentialBenefit(suggestions) {
    const totalImpact = suggestions.reduce((sum, s) => sum + s.impact, 0);
    const avgImpact = suggestions.length > 0 ? totalImpact / suggestions.length : 0;

    return {
      totalImpactScore: totalImpact,
      averageImpact: avgImpact.toFixed(1),
      highImpactCount: suggestions.filter(s => s.impact >= 8).length,
      estimatedTimeHours: (suggestions.length * 0.25).toFixed(1)
    };
  }

  /**
   * HELPER METHODS
   */

  _colorDistance(hex1, hex2) {
    const rgb1 = this._hexToRgb(hex1);
    const rgb2 = this._hexToRgb(hex2);
    
    const dr = rgb1[0] - rgb2[0];
    const dg = rgb1[1] - rgb2[1];
    const db = rgb1[2] - rgb2[2];

    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  _getHue(hex) {
    const rgb = this._hexToRgb(hex);
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max === r) {
      h = ((g - b) / (max - min)) % 6;
    } else if (max === g) {
      h = (b - r) / (max - min) + 2;
    } else {
      h = (r - g) / (max - min) + 4;
    }

    return (h * 60 + 360) % 360;
  }

  _isConsistentScale(values) {
    if (values.length < 3) return true;

    const sorted = [...values].sort((a, b) => a - b);
    const ratios = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] > 0) {
        ratios.push(sorted[i + 1] / sorted[i]);
      }
    }

    if (ratios.length === 0) return true;

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance = ratios.reduce((sum, r) => sum + Math.pow(r - avgRatio, 2), 0) / ratios.length;

    return Math.sqrt(variance) < 0.2; // Consistent if variance is low
  }

  _summarizeChanges() {
    return {
      colorsFix: this.fixes.filter(f => f.type.includes('color')).length,
      spacingFixes: this.fixes.filter(f => f.type.includes('spacing')).length,
      typographyFixes: this.fixes.filter(f => f.type.includes('typography')).length
    };
  }

  _calculateOverallSeverity(issues) {
    const totalHighSeverity = Object.values(issues)
      .flat()
      .filter(i => i.severity === 'high').length;

    if (totalHighSeverity > 2) return 'critical';
    if (totalHighSeverity > 0) return 'high';
    
    const totalMediumSeverity = Object.values(issues)
      .flat()
      .filter(i => i.severity === 'medium').length;

    if (totalMediumSeverity > 2) return 'medium';
    return 'low';
  }
}

export default DesignAutoRemediation;
