#!/usr/bin/env node

/**
 * Design System Industry Registry
 * Cross-company benchmarking and standardization database
 */

export class IndustryRegistry {
  constructor() {
    this.systems = new Map();
    this.companies = new Map();
    this.industries = new Map();
    this.metadata = {
      created: new Date().toISOString(),
      totalSystems: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * PHASE 1: REGISTRY MANAGEMENT
   * Register and manage design systems
   */

  /**
   * Register a new design system to the registry
   */
  registerSystem(system, metadata = {}) {
    const id = `${metadata.company || 'unknown'}_${Date.now()}`;

    const registeredSystem = {
      id,
      timestamp: new Date().toISOString(),
      company: metadata.company || 'Unknown',
      industry: metadata.industry || 'general',
      country: metadata.country || 'Unknown',
      teamSize: metadata.teamSize || 0,
      yearsOld: metadata.yearsOld || 0,
      system: {
        colors: system.colors || {},
        typography: system.typography || [],
        spacing: system.spacing || {},
        components: system.components || {},
        effects: system.effects || {},
        metadata: system.metadata || {}
      },
      metrics: this._calculateSystemMetrics(system),
      tags: metadata.tags || []
    };

    this.systems.set(id, registeredSystem);

    // Update company registry
    const company = metadata.company || 'Unknown';
    if (!this.companies.has(company)) {
      this.companies.set(company, []);
    }
    this.companies.get(company).push(id);

    // Update industry registry
    const industry = metadata.industry || 'general';
    if (!this.industries.has(industry)) {
      this.industries.set(industry, []);
    }
    this.industries.get(industry).push(id);

    this.metadata.totalSystems = this.systems.size;
    this.metadata.lastUpdated = new Date().toISOString();

    return {
      registered: true,
      systemId: id,
      company: metadata.company,
      industry: metadata.industry,
      metrics: registeredSystem.metrics
    };
  }

  /**
   * Calculate metrics for a system
   */
  _calculateSystemMetrics(system) {
    return {
      colorCount: Object.keys(system.colors || {}).length,
      typographyCount: (system.typography || []).length,
      spacingCount: Object.keys(system.spacing || {}).length,
      componentCount: Object.keys(system.components || {}).length,
      effectsCount: Object.keys(system.effects || {}).length,
      totalTokens: 
        Object.keys(system.colors || {}).length +
        (system.typography || []).length +
        Object.keys(system.spacing || {}).length,
      documentationScore: system.metadata?.estimatedDesignMaturity || 0
    };
  }

  /**
   * Search registry by criteria
   */
  search(criteria = {}) {
    let results = Array.from(this.systems.values());

    // Filter by company
    if (criteria.company) {
      results = results.filter(s => s.company === criteria.company);
    }

    // Filter by industry
    if (criteria.industry) {
      results = results.filter(s => s.industry === criteria.industry);
    }

    // Filter by minimum maturity
    if (criteria.minMaturity !== undefined) {
      results = results.filter(s => s.metrics.documentationScore >= criteria.minMaturity);
    }

    // Filter by minimum colors
    if (criteria.minColors !== undefined) {
      results = results.filter(s => s.metrics.colorCount >= criteria.minColors);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(s => 
        criteria.tags.some(tag => s.tags.includes(tag))
      );
    }

    // Sort by metric
    if (criteria.sortBy === 'maturity') {
      results.sort((a, b) => b.metrics.documentationScore - a.metrics.documentationScore);
    } else if (criteria.sortBy === 'size') {
      results.sort((a, b) => b.metrics.totalTokens - a.metrics.totalTokens);
    } else if (criteria.sortBy === 'date') {
      results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return {
      count: results.length,
      results: results.map(s => ({
        id: s.id,
        company: s.company,
        industry: s.industry,
        metrics: s.metrics,
        maturity: this._getMaturityLevel(s.metrics.documentationScore),
        registeredAt: s.timestamp
      }))
    };
  }

  /**
   * PHASE 2: INDUSTRY BENCHMARKING
   * Compare systems and calculate industry standards
   */

  /**
   * Get detailed benchmarking data for an industry
   */
  benchmarkIndustry(industry = 'general') {
    const industryIds = this.industries.get(industry) || [];
    if (industryIds.length === 0) {
      return { error: `No systems found for industry: ${industry}` };
    }

    const systems = industryIds.map(id => this.systems.get(id));

    return {
      industry,
      systemCount: systems.length,
      companyCount: new Set(systems.map(s => s.company)).size,
      metrics: this._calculateIndustryMetrics(systems),
      trends: this._analyzeIndustryTrends(systems),
      topPerformers: this._getTopPerformers(systems, 5),
      underperformers: this._getUnderperformers(systems, 3),
      recommendations: this._generateIndustryRecommendations(systems)
    };
  }

  _calculateIndustryMetrics(systems) {
    if (systems.length === 0) return null;

    const metrics = {
      colors: { avg: 0, median: 0, min: Infinity, max: 0, std: 0 },
      typography: { avg: 0, median: 0, min: Infinity, max: 0, std: 0 },
      spacing: { avg: 0, median: 0, min: Infinity, max: 0, std: 0 },
      components: { avg: 0, median: 0, min: Infinity, max: 0, std: 0 },
      maturity: { avg: 0, median: 0, min: Infinity, max: 0, std: 0 }
    };

    // Collect values for each metric
    const colorCounts = [];
    const typoCounts = [];
    const spacingCounts = [];
    const componentCounts = [];
    const maturityCounts = [];

    for (const system of systems) {
      colorCounts.push(system.metrics.colorCount);
      typoCounts.push(system.metrics.typographyCount);
      spacingCounts.push(system.metrics.spacingCount);
      componentCounts.push(system.metrics.componentCount);
      maturityCounts.push(system.metrics.documentationScore);
    }

    // Calculate statistics for each metric
    metrics.colors = this._calculateStatistics(colorCounts);
    metrics.typography = this._calculateStatistics(typoCounts);
    metrics.spacing = this._calculateStatistics(spacingCounts);
    metrics.components = this._calculateStatistics(componentCounts);
    metrics.maturity = this._calculateStatistics(maturityCounts);

    return metrics;
  }

  _calculateStatistics(values) {
    if (values.length === 0) return { avg: 0, median: 0, min: 0, max: 0, std: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);

    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      avg: avg.toFixed(1),
      median,
      min,
      max,
      std: std.toFixed(2)
    };
  }

  _analyzeIndustryTrends(systems) {
    const trends = {};

    // Analyze maturity progression
    const sortedByDate = [...systems].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const maturityByYear = {};
    for (const system of sortedByDate) {
      const year = new Date(system.timestamp).getFullYear();
      if (!maturityByYear[year]) maturityByYear[year] = [];
      maturityByYear[year].push(system.metrics.documentationScore);
    }

    trends.maturityProgression = Object.entries(maturityByYear).reduce((acc, [year, scores]) => {
      acc[year] = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      return acc;
    }, {});

    // Identify technology preferences
    const colorRanges = {};
    for (const system of systems) {
      const range = this._getColorCountRange(system.metrics.colorCount);
      colorRanges[range] = (colorRanges[range] || 0) + 1;
    }
    trends.colorPalettePreference = colorRanges;

    // Component documentation trend
    const avgComponentCount = systems.reduce((sum, s) => sum + s.metrics.componentCount, 0) / systems.length;
    trends.averageComponentsPerSystem = avgComponentCount.toFixed(1);

    return trends;
  }

  _getColorCountRange(count) {
    if (count <= 5) return 'minimal';
    if (count <= 10) return 'standard';
    if (count <= 15) return 'extended';
    return 'comprehensive';
  }

  _getTopPerformers(systems, count) {
    return [...systems]
      .sort((a, b) => b.metrics.documentationScore - a.metrics.documentationScore)
      .slice(0, count)
      .map(s => ({
        company: s.company,
        industry: s.industry,
        maturityScore: s.metrics.documentationScore,
        tokens: s.metrics.totalTokens,
        maturityLevel: this._getMaturityLevel(s.metrics.documentationScore)
      }));
  }

  _getUnderperformers(systems, count) {
    return [...systems]
      .sort((a, b) => a.metrics.documentationScore - b.metrics.documentationScore)
      .slice(0, count)
      .map(s => ({
        company: s.company,
        maturityScore: s.metrics.documentationScore,
        recommendation: `Increase documentation from ${s.metrics.documentationScore} to industry average`
      }));
  }

  _generateIndustryRecommendations(systems) {
    const recs = [];
    const metrics = this._calculateIndustryMetrics(systems);

    // Color palette recommendation
    if (metrics.colors.avg < 8) {
      recs.push({
        category: 'colors',
        recommendation: `Expand color palette from ${metrics.colors.avg} to 8-12 colors`,
        reasoning: 'Industry average suggests need for more color variety'
      });
    }

    // Component documentation
    if (metrics.components.avg < 15) {
      recs.push({
        category: 'components',
        recommendation: `Document ${15 - Math.round(metrics.components.avg)} more components`,
        reasoning: 'Industry standard is 15+ documented components'
      });
    }

    // Maturity improvement
    if (metrics.maturity.avg < 70) {
      recs.push({
        category: 'maturity',
        recommendation: 'Improve design system documentation and governance',
        reasoning: `Industry average maturity is ${metrics.maturity.avg}, aim for 80+`
      });
    }

    return recs;
  }

  /**
   * PHASE 3: COMPARISON ANALYSIS
   * Compare multiple systems side-by-side
   */

  /**
   * Compare specific companies or systems
   */
  compareCompanies(companies) {
    const systemIds = [];
    for (const company of companies) {
      const ids = this.companies.get(company) || [];
      systemIds.push(...ids);
    }

    const systems = systemIds.map(id => this.systems.get(id)).filter(Boolean);

    if (systems.length === 0) {
      return { error: 'No systems found for comparison' };
    }

    return {
      companies: companies,
      comparison: {
        colorPalettes: this._compareColorPalettes(systems),
        typographyApproaches: this._compareTypography(systems),
        spacingPhilosophies: this._compareSpacing(systems),
        componentDocumentation: this._compareComponents(systems),
        maturityLevels: this._compareMaturity(systems),
        recommendations: this._generateComparisonRecommendations(systems)
      }
    };
  }

  _compareColorPalettes(systems) {
    const comparison = {};

    for (const system of systems) {
      const colorCount = system.metrics.colorCount;
      const colorNames = Object.keys(system.system.colors);
      const hasSemanticColors = colorNames.some(c => 
        /primary|secondary|success|error|warning|info/i.test(c)
      );

      comparison[system.company] = {
        colorCount,
        hasSemanticNaming: hasSemanticColors,
        recommendation: colorCount > 20 ? 'Consolidate palette' : 'Good balance'
      };
    }

    return comparison;
  }

  _compareTypography(systems) {
    const comparison = {};

    for (const system of systems) {
      const typos = system.system.typography;
      const families = new Set(typos.map(t => t.family));
      const sizes = new Set(typos.map(t => t.size));
      const weights = new Set(typos.map(t => t.weight || 'regular'));

      comparison[system.company] = {
        families: families.size,
        sizes: sizes.size,
        weights: weights.size,
        totalStyles: typos.length,
        recommendation: families.size > 3 ? 'Limit typefaces' : 'Good variety'
      };
    }

    return comparison;
  }

  _compareSpacing(systems) {
    const comparison = {};

    for (const system of systems) {
      const spacingCount = system.metrics.spacingCount;
      const hasBase = Object.keys(system.system.spacing).some(s => 
        /base|xs|unit/.test(s)
      );

      comparison[system.company] = {
        scaleSize: spacingCount,
        hasBaseUnit: hasBase,
        recommendation: spacingCount > 12 ? 'Simplify scale' : 'Well-defined'
      };
    }

    return comparison;
  }

  _compareComponents(systems) {
    const comparison = {};

    for (const system of systems) {
      const componentCount = system.metrics.componentCount;
      const documented = Object.values(system.system.components)
        .filter(c => c.description || c.documentation).length;

      const docPercent = componentCount > 0 ? ((documented / componentCount) * 100).toFixed(0) : 0;

      comparison[system.company] = {
        totalComponents: componentCount,
        documented: documented,
        documentationPercent: docPercent,
        recommendation: docPercent < 50 ? 'Add documentation' : 'Well documented'
      };
    }

    return comparison;
  }

  _compareMaturity(systems) {
    const comparison = {};

    for (const system of systems) {
      const score = system.metrics.documentationScore;
      const level = this._getMaturityLevel(score);

      comparison[system.company] = {
        score,
        level,
        tokens: system.metrics.totalTokens,
        recommendation: score < 70 ? 'Improve governance' : 'Strong foundation'
      };
    }

    return comparison;
  }

  _generateComparisonRecommendations(systems) {
    const recommendations = [];

    // Find leader in each category
    const leaderByColors = [...systems].sort((a, b) => b.metrics.colorCount - a.metrics.colorCount)[0];
    const leaderByComponents = [...systems].sort((a, b) => b.metrics.componentCount - a.metrics.componentCount)[0];
    const leaderByMaturity = [...systems].sort((a, b) => b.metrics.documentationScore - a.metrics.documentationScore)[0];

    if (leaderByColors) {
      recommendations.push({
        category: 'color-palette',
        leader: leaderByColors.company,
        size: leaderByColors.metrics.colorCount,
        suggestion: 'Consider adopting similar color structure'
      });
    }

    if (leaderByComponents) {
      recommendations.push({
        category: 'component-library',
        leader: leaderByComponents.company,
        count: leaderByComponents.metrics.componentCount,
        suggestion: 'Benchmark against this company\'s component documentation'
      });
    }

    if (leaderByMaturity) {
      recommendations.push({
        category: 'maturity',
        leader: leaderByMaturity.company,
        score: leaderByMaturity.metrics.documentationScore,
        suggestion: 'Use this company as template for governance structure'
      });
    }

    return recommendations;
  }

  /**
   * PHASE 4: STANDARDIZATION METRICS
   * Calculate standardization and best practices
   */

  /**
   * Get standardization metrics for an industry
   */
  getStandardizationMetrics(industry = 'general') {
    const industryIds = this.industries.get(industry) || [];
    if (industryIds.length === 0) {
      return { error: 'No systems found' };
    }

    const systems = industryIds.map(id => this.systems.get(id));

    return {
      industry,
      standardization: {
        colorNamingConsistency: this._measureColorNamingConsistency(systems),
        spacingScaleConsistency: this._measureSpacingConsistency(systems),
        typographyStandardization: this._measureTypographyStandardization(systems),
        componentNaming: this._measureComponentNaming(systems)
      },
      bestPractices: this._identifyBestPractices(systems),
      complianceScore: this._calculateComplianceScore(systems)
    };
  }

  _measureColorNamingConsistency(systems) {
    const patterns = new Map();

    for (const system of systems) {
      const colorNames = Object.keys(system.system.colors);
      
      // Detect naming pattern
      let pattern = 'other';
      if (colorNames.every(n => /^[a-z]+-[a-z]+-?\d*$/.test(n))) {
        pattern = 'dash-semantic';
      } else if (colorNames.every(n => /^[a-z][a-zA-Z]*$/.test(n))) {
        pattern = 'camelCase';
      }

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    const total = systems.length;
    const consistency = Math.max(...patterns.values()) / total * 100;

    return {
      consistency: consistency.toFixed(1),
      dominantPattern: Array.from(patterns.entries()).sort((a, b) => b[1] - a[1])[0][0],
      systemsFollowingPattern: Array.from(patterns.entries()).sort((a, b) => b[1] - a[1])[0][1]
    };
  }

  _measureSpacingConsistency(systems) {
    const scales = [];

    for (const system of systems) {
      const spacingValues = Object.values(system.system.spacing)
        .map(v => parseInt(v))
        .filter(v => !isNaN(v))
        .sort((a, b) => a - b);

      if (spacingValues.length > 1) {
        scales.push(spacingValues);
      }
    }

    // Check how many systems use base-4, base-8, etc.
    const bases = { base4: 0, base8: 0, base16: 0, other: 0 };

    for (const scale of scales) {
      const baseValue = scale[0];
      
      if (baseValue % 4 === 0 && baseValue <= 8) bases.base4++;
      else if (baseValue === 8) bases.base8++;
      else if (baseValue === 16) bases.base16++;
      else bases.other++;
    }

    const mostCommon = Object.entries(bases).sort((a, b) => b[1] - a[1])[0];

    return {
      consistency: ((mostCommon[1] / scales.length) * 100).toFixed(1),
      dominantBase: mostCommon[0],
      systemsUsingIt: mostCommon[1]
    };
  }

  _measureTypographyStandardization(systems) {
    const fontFamilyCount = [];
    const fontSizeCount = [];

    for (const system of systems) {
      const typos = system.system.typography;
      const families = new Set(typos.map(t => t.family));
      const sizes = new Set(typos.map(t => t.size));

      fontFamilyCount.push(families.size);
      fontSizeCount.push(sizes.size);
    }

    const avgFamilies = (fontFamilyCount.reduce((a, b) => a + b, 0) / fontFamilyCount.length).toFixed(1);
    const avgSizes = (fontSizeCount.reduce((a, b) => a + b, 0) / fontSizeCount.length).toFixed(1);

    return {
      averageFamilies: avgFamilies,
      averageSizes: avgSizes,
      recommendation: avgFamilies > 3 ? 'Industry typically uses 2-3 families' : 'Well-standardized'
    };
  }

  _measureComponentNaming(systems) {
    // Analyze if components follow naming conventions
    const componentCounts = systems.map(s => Object.keys(s.system.components).length);
    const avg = componentCounts.reduce((a, b) => a + b, 0) / componentCounts.length;

    return {
      averageCount: avg.toFixed(1),
      minCount: Math.min(...componentCounts),
      maxCount: Math.max(...componentCounts),
      recommendation: avg < 10 ? 'Consider documenting more patterns' : 'Comprehensive coverage'
    };
  }

  _identifyBestPractices(systems) {
    const practices = [];

    // Find systems that excel in different areas
    const bestColors = [...systems].sort((a, b) => b.metrics.colorCount - a.metrics.colorCount)[0];
    const bestComponents = [...systems].sort((a, b) => b.metrics.componentCount - a.metrics.componentCount)[0];
    const bestMaturity = [...systems].sort((a, b) => b.metrics.documentationScore - a.metrics.documentationScore)[0];

    practices.push({
      practice: 'Color palette structure',
      leader: bestColors?.company,
      metric: `${bestColors?.metrics.colorCount || 0} colors, well-organized`
    });

    practices.push({
      practice: 'Component documentation',
      leader: bestComponents?.company,
      metric: `${bestComponents?.metrics.componentCount || 0} documented components`
    });

    practices.push({
      practice: 'Overall maturity',
      leader: bestMaturity?.company,
      metric: `Score: ${bestMaturity?.metrics.documentationScore || 0}/100`
    });

    return practices;
  }

  _calculateComplianceScore(systems) {
    let score = 50; // Base score

    if (systems.length >= 5) score += 10; // Good sample size
    if (systems.length >= 20) score += 10; // Large sample

    // Check metric variance
    const maturityScores = systems.map(s => s.metrics.documentationScore);
    const variance = this._calculateVariance(maturityScores);

    if (variance < 200) score += 20; // Consistent practices
    else if (variance < 500) score += 10;

    return Math.min(100, score);
  }

  _calculateVariance(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  }

  _getMaturityLevel(score) {
    if (score >= 90) return 'World-Class';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 30) return 'Basic';
    return 'Minimal';
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const systems = Array.from(this.systems.values());

    return {
      totalSystems: systems.length,
      uniqueCompanies: this.companies.size,
      industries: Array.from(this.industries.keys()),
      systemsByIndustry: Object.fromEntries(
        Array.from(this.industries.entries()).map(([ind, ids]) => [ind, ids.length])
      ),
      averageMaturity: systems.length > 0 
        ? (systems.reduce((sum, s) => sum + s.metrics.documentationScore, 0) / systems.length).toFixed(1)
        : 0,
      metadata: this.metadata
    };
  }
}
