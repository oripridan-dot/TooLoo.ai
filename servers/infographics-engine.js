/**
 * Infographics Engine
 * Generates visual representations of analysis data
 * Supports 8 visualization types: gauge, matrix, tree, flow, timeline, network, heatmap, sankey
 */

class InfographicsEngine {
  constructor() {
    this.templates = this.loadTemplates();
    this.cache = new Map();
    this.idCounter = 0;
  }

  loadTemplates() {
    return {
      gauge: {
        name: 'Quality Gauge',
        description: 'Radial score visualization',
        bestFor: ['quality_scores', 'performance_metrics', 'completeness'],
        icon: '📊'
      },
      matrix: {
        name: 'Comparison Matrix',
        description: 'Side-by-side comparisons',
        bestFor: ['before_after', 'prompt_comparison', 'quality_metrics'],
        icon: '📋'
      },
      tree: {
        name: 'Hierarchical Tree',
        description: 'Shows parent-child relationships',
        bestFor: ['issue_hierarchy', 'decision_trees', 'org_structure'],
        icon: '🌳'
      },
      flow: {
        name: 'Process Flow',
        description: 'Visualizes sequences and transitions',
        bestFor: ['workflows', 'user_journeys', 'refinement_paths'],
        icon: '➡️'
      },
      timeline: {
        name: 'Timeline',
        description: 'Visualizes progression over time',
        bestFor: ['training_rounds', 'iteration_history', 'improvements'],
        icon: '📈'
      },
      network: {
        name: 'Relationship Network',
        description: 'Shows interconnected concepts',
        bestFor: ['concept_map', 'root_causes', 'impact_chains'],
        icon: '🕸️'
      },
      heatmap: {
        name: 'Intensity Heatmap',
        description: 'Shows intensity patterns across dimensions',
        bestFor: ['quality_breakdown', 'error_density', 'performance_map'],
        icon: '🔥'
      },
      sankey: {
        name: 'Flow Transformation',
        description: 'Visualizes data transformations',
        bestFor: ['token_flow', 'data_pipeline', 'refinement_stages'],
        icon: '💧'
      }
    };
  }

  /**
   * Auto-detect best visualization type for data
   */
  detectVisualizationType(data, analysisType) {
    const rules = {
      'prompt_analysis': () => data.issues && data.issues.length > 3 ? 'tree' : (data.before && data.after ? 'matrix' : 'gauge'),
      'training_analysis': () => data.rounds ? 'timeline' : (data.metrics && data.metrics.length > 5 ? 'heatmap' : 'gauge'),
      'root_cause': () => 'network',
      'comparison': () => 'matrix',
      'workflow': () => 'flow',
      'hierarchy': () => 'tree'
    };

    const detector = rules[analysisType] || (() => 'gauge');
    return detector();
  }

  /**
   * Generate infographic specification
   */
  async generate({ data, type, style = 'modern', title, metrics }) {
    const id = `infographic_${++this.idCounter}_${Date.now()}`;

    const infographic = {
      id,
      type,
      title: title || 'Analysis Visualization',
      style,
      timestamp: new Date().toISOString(),
      format: 'svg',
      sections: this.buildSections(data, type),
      dimensions: this.calculateDimensions(data, type),
      colors: this.selectColorScheme(style),
      data: this.normalizeData(data),
      svg: this.renderSVG(data, type, style, title)
    };

    this.cache.set(id, infographic);
    return infographic;
  }

  /**
   * Build sections for infographic
   */
  buildSections(data, type) {
    const sections = {
      tree: [
        { name: 'root', content: data.title || 'Root' },
        { name: 'branches', content: data.issues || [] },
        { name: 'leaves', content: data.details || [] }
      ],
      matrix: [
        { name: 'header', content: ['Original', 'Refined'] },
        { name: 'rows', content: data.rows || [] },
        { name: 'summary', content: data.summary }
      ],
      flow: [
        { name: 'start', content: data.initial || 'Start' },
        { name: 'steps', content: data.steps || [] },
        { name: 'end', content: data.outcome || 'End' }
      ],
      gauge: [
        { name: 'center', content: data.score || 5 },
        { name: 'label', content: data.label || 'Score' },
        { name: 'range', content: `0 - ${data.max || 10}` }
      ],
      network: [
        { name: 'nodes', content: data.concepts || [] },
        { name: 'edges', content: data.relationships || [] },
        { name: 'legend', content: data.legend }
      ],
      timeline: [
        { name: 'events', content: data.events || [] },
        { name: 'markers', content: data.milestones || [] },
        { name: 'progression', content: data.progress }
      ],
      heatmap: [
        { name: 'matrix', content: data.values },
        { name: 'colorscale', content: data.intensity },
        { name: 'annotations', content: data.hotspots || [] }
      ],
      sankey: [
        { name: 'flows', content: data.flows || [] },
        { name: 'nodes', content: data.nodes || [] },
        { name: 'legend', content: data.legend }
      ]
    };

    return sections[type] || sections.gauge;
  }

  /**
   * Calculate optimal dimensions
   */
  calculateDimensions(data, type) {
    const defaults = {
      tree: { width: 800, height: 600 },
      matrix: { width: 900, height: 500 },
      flow: { width: 1000, height: 400 },
      gauge: { width: 400, height: 400 },
      network: { width: 800, height: 800 },
      timeline: { width: 1000, height: 300 },
      heatmap: { width: 700, height: 600 },
      sankey: { width: 900, height: 500 }
    };
    return defaults[type] || defaults.gauge;
  }

  /**
   * Select color scheme
   */
  selectColorScheme(style = 'modern') {
    const schemes = {
      modern: {
        primary: '#6366F1',
        secondary: '#EC4899',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937',
        grid: '#E5E7EB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444'
      },
      dark: {
        primary: '#818CF8',
        secondary: '#F472B6',
        accent: '#FBBF24',
        background: '#111827',
        text: '#F3F4F6',
        grid: '#374151',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171'
      },
      minimal: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#999999',
        background: '#FFFFFF',
        text: '#000000',
        grid: '#CCCCCC',
        success: '#000000',
        warning: '#666666',
        error: '#999999'
      }
    };
    return schemes[style] || schemes.modern;
  }

  /**
   * Normalize data structure
   */
  normalizeData(data) {
    return {
      title: data.title || 'Analysis',
      items: Array.isArray(data) ? data : [data],
      metrics: data.metrics || {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Render SVG
   */
  renderSVG(data, type, style, title) {
    const colors = this.selectColorScheme(style);
    const dims = this.calculateDimensions(data, type);

    let svg = `<svg width="${dims.width}" height="${dims.height}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs><style>text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }</style></defs>`;
    svg += `<rect width="${dims.width}" height="${dims.height}" fill="${colors.background}"/>`;

    // Title
    if (title) {
      svg += `<text x="${dims.width / 2}" y="25" font-size="16" font-weight="bold" text-anchor="middle" fill="${colors.text}">${title}</text>`;
    }

    // Type-specific rendering
    switch (type) {
      case 'gauge':
        svg += this.renderGauge(data, colors, dims);
        break;
      case 'matrix':
        svg += this.renderMatrix(data, colors, dims);
        break;
      case 'tree':
        svg += this.renderTree(data, colors, dims);
        break;
      case 'flow':
        svg += this.renderFlow(data, colors, dims);
        break;
      case 'timeline':
        svg += this.renderTimeline(data, colors, dims);
        break;
      case 'network':
        svg += this.renderNetwork(data, colors, dims);
        break;
      case 'heatmap':
        svg += this.renderHeatmap(data, colors, dims);
        break;
      default:
        svg += this.renderGauge(data, colors, dims);
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Render gauge visualization
   */
  renderGauge(data, colors, dims) {
    const cx = dims.width / 2;
    const cy = dims.height / 2;
    const radius = Math.min(dims.width, dims.height) / 3;
    const score = data.score || 6;
    const max = data.max || 10;
    const percentage = (score / max) * 100;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percentage / 100);

    let svg = '';
    svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colors.grid}" stroke-width="10"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${colors.primary}" stroke-width="10" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>`;
    svg += `<text x="${cx}" y="${cy}" font-size="48" font-weight="bold" text-anchor="middle" fill="${colors.text}">${score}</text>`;
    svg += `<text x="${cx}" y="${cy + 30}" font-size="14" text-anchor="middle" fill="${colors.secondary}">${data.label || 'Quality'}</text>`;

    return svg;
  }

  /**
   * Render matrix
   */
  renderMatrix(data, colors, dims) {
    let svg = '';
    const cellWidth = 200;
    const cellHeight = 60;
    const cols = 2;

    svg += `<text x="20" y="50" font-size="12" font-weight="bold" fill="${colors.text}">Before</text>`;
    svg += `<text x="${cellWidth + 40}" y="50" font-size="12" font-weight="bold" fill="${colors.text}">After</text>`;

    const rows = Math.min(data.rows ? data.rows.length : 3, 5);
    for (let i = 0; i < rows; i++) {
      const y = 70 + i * cellHeight;
      svg += `<rect x="20" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${colors.accent}" opacity="0.2" stroke="${colors.grid}"/>`;
      svg += `<text x="30" y="${y + 35}" font-size="11" fill="${colors.text}">Item ${i + 1}</text>`;
      svg += `<rect x="${cellWidth + 40}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${colors.primary}" opacity="0.2" stroke="${colors.grid}"/>`;
      svg += `<text x="${cellWidth + 50}" y="${y + 35}" font-size="11" fill="${colors.text}">Improved</text>`;
    }

    return svg;
  }

  /**
   * Render tree
   */
  renderTree(data, colors, dims) {
    let svg = '';
    const centerX = dims.width / 2;
    const centerY = 80;

    svg += `<circle cx="${centerX}" cy="${centerY}" r="20" fill="${colors.primary}"/>`;
    svg += `<text x="${centerX}" y="${centerY + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="bold">●</text>`;

    const branches = data.issues || [];
    const angleStep = Math.PI * 2 / Math.max(branches.length, 1);

    branches.forEach((branch, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const x = centerX + Math.cos(angle) * 120;
      const y = centerY + Math.sin(angle) * 100;

      svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${colors.grid}" stroke-width="2"/>`;
      svg += `<circle cx="${x}" cy="${y}" r="15" fill="${colors.secondary}"/>`;
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="white">${i + 1}</text>`;
    });

    return svg;
  }

  /**
   * Render flow
   */
  renderFlow(data, colors, dims) {
    let svg = '';
    const steps = data.steps || ['Start', 'Process', 'End'];
    const stepWidth = (dims.width - 40) / steps.length;

    steps.forEach((step, i) => {
      const x = 20 + i * stepWidth + stepWidth / 2;
      const y = dims.height / 2;

      svg += `<rect x="${x - 35}" y="${y - 20}" width="70" height="40" rx="5" fill="${colors.primary}" opacity="0.8"/>`;
      svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${step}</text>`;

      if (i < steps.length - 1) {
        svg += `<line x1="${x + 35}" y1="${y}" x2="${x + stepWidth - 35}" y2="${y}" stroke="${colors.secondary}" stroke-width="2"/>`;
        svg += `<polygon points="${x + stepWidth - 30},${y} ${x + stepWidth - 40},${y - 4} ${x + stepWidth - 40},${y + 4}" fill="${colors.secondary}"/>`;
      }
    });

    return svg;
  }

  /**
   * Render timeline
   */
  renderTimeline(data, colors, dims) {
    let svg = '';
    const events = data.events || ['Round 1', 'Round 2', 'Round 3'];
    const eventSpacing = (dims.width - 40) / Math.max(events.length - 1, 1);

    svg += `<line x1="20" y1="${dims.height / 2}" x2="${dims.width - 20}" y2="${dims.height / 2}" stroke="${colors.grid}" stroke-width="2"/>`;

    events.forEach((event, i) => {
      const x = 20 + i * eventSpacing;
      const y = dims.height / 2;

      svg += `<circle cx="${x}" cy="${y}" r="8" fill="${colors.primary}"/>`;
      svg += `<text x="${x}" y="${y - 20}" text-anchor="middle" font-size="10" fill="${colors.text}">${event}</text>`;
    });

    return svg;
  }

  /**
   * Render network
   */
  renderNetwork(data, colors, dims) {
    let svg = '';
    const nodes = data.concepts || ['A', 'B', 'C', 'D'];
    const centerX = dims.width / 2;
    const centerY = dims.height / 2;
    const radius = 100;

    nodes.forEach((_, i) => {
      const angle1 = (i / nodes.length) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius;

      const nextI = (i + 1) % nodes.length;
      const angle2 = (nextI / nodes.length) * Math.PI * 2;
      const x2 = centerX + Math.cos(angle2) * radius;
      const y2 = centerY + Math.sin(angle2) * radius;

      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.grid}" stroke-width="1" opacity="0.5"/>`;
    });

    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      svg += `<circle cx="${x}" cy="${y}" r="12" fill="${colors.primary}"/>`;
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${node}</text>`;
    });

    svg += `<circle cx="${centerX}" cy="${centerY}" r="8" fill="${colors.secondary}"/>`;

    return svg;
  }

  /**
   * Render heatmap
   */
  renderHeatmap(data, colors, dims) {
    let svg = '';
    const cells = 4;
    const cellSize = (dims.width - 40) / cells;

    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const x = 20 + i * cellSize;
        const y = 50 + j * cellSize;
        const intensity = Math.random();
        const hue = intensity * 120;
        const color = `hsl(${hue}, 100%, 50%)`;

        svg += `<rect x="${x}" y="${y}" width="${cellSize - 2}" height="${cellSize - 2}" fill="${color}" opacity="${intensity}"/>`;
      }
    }

    return svg;
  }

  /**
   * Generate explanation
   */
  generateExplanation(infographic) {
    const { type, data } = infographic;

    const explanations = {
      gauge: `Quality score of ${data.score || 5} out of ${data.max || 10}. This indicates ${this.interpretScore(data.score)}.`,
      matrix: 'Comparison shows improvements across key dimensions and refinements.',
      tree: `Hierarchical breakdown shows ${data.items?.length || 3} primary issues.`,
      flow: 'Process flows through sequential stages, each building on previous outcomes.',
      timeline: `Timeline shows progression over ${data.items?.length || 3} events.`,
      network: `Network reveals ${data.items?.length || 3} interconnected concepts.`,
      heatmap: 'Heatmap shows intensity patterns across dimensions.'
    };

    const summary = explanations[type] || 'Analysis visualization';

    return {
      summary,
      takeaways: [
        `Visualization type: ${type}`,
        `Data points: ${data.items?.length || 'multiple'}`,
        'Recommended action: Review highlighted sections',
        'Next step: Apply refinements and re-analyze'
      ],
      recommendations: [
        'Export infographic for sharing',
        'Use visual as reference for next iteration',
        'Compare with previous infographics to track progress',
        'Share with team to align on quality'
      ]
    };
  }

  interpretScore(score) {
    if (score < 3) return 'significant room for improvement';
    if (score < 6) return 'moderate quality with clear opportunities';
    if (score < 8) return 'good quality with minor refinements';
    return 'excellent quality';
  }

  /**
   * List templates
   */
  listTemplates() {
    return Object.entries(this.templates).map(([key, template]) => ({
      id: key,
      ...template
    }));
  }

  /**
   * Get infographic by ID
   */
  getInfographic(id) {
    if (!this.cache.has(id)) {
      throw new Error(`Infographic ${id} not found`);
    }
    return this.cache.get(id);
  }
}

export default InfographicsEngine;
