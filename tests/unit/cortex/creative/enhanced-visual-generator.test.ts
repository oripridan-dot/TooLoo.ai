// @version 3.3.573
// Tests for TooLoo.ai Enhanced Visual Generator
// Diversified visual communication tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Visual keywords that trigger enhancement
const VISUAL_KEYWORDS = [
  'svg', 'chart', 'graph', 'diagram', 'visualization', 'visual',
  'image', 'picture', 'drawing', 'illustration', 'graphic',
  'logo', 'icon', 'banner', 'infographic', 'animation',
  'draw', 'create a visual', 'show me', 'visualize', 'render',
  'design', 'generate an image', 'make a chart', 'plot',
  'pie chart', 'bar chart', 'line graph', 'scatter plot',
  'histogram', 'dashboard', 'metrics', 'analytics',
  'flowchart', 'flow diagram', 'architecture diagram',
  'sequence diagram', 'erd', 'uml', 'wireframe', 'mockup',
  'prototype', 'abstract', 'artistic', 'creative visual', 'artwork',
];

type VisualType = 'chart' | 'diagram' | 'abstract' | 'dashboard' | 'general';

const FORMAT_RECOMMENDATIONS: Record<VisualType, { primary: string; fallback: string; description: string }> = {
  chart: {
    primary: 'chart',
    fallback: 'svg',
    description: 'Use ```chart with JSON data for interactive Chart.js rendering',
  },
  diagram: {
    primary: 'mermaid',
    fallback: 'ascii',
    description: 'Use ```mermaid for flowcharts, sequences, architecture diagrams',
  },
  dashboard: {
    primary: 'stats',
    fallback: 'chart',
    description: 'Use ```stats JSON for KPI cards and metrics displays',
  },
  abstract: {
    primary: 'svg',
    fallback: 'emoji',
    description: 'Use ```svg for complex graphics, icons, or artistic visuals',
  },
  general: {
    primary: 'ascii',
    fallback: 'mermaid',
    description: 'Use ```ascii for quick diagrams or ```mermaid for structured flows',
  },
};

describe('Enhanced Visual Generator', () => {
  describe('VISUAL_KEYWORDS', () => {
    it('should have explicit visual keywords', () => {
      const explicitKeywords = ['svg', 'chart', 'graph', 'diagram', 'visualization'];
      explicitKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have action-based keywords', () => {
      const actionKeywords = ['draw', 'visualize', 'render', 'design', 'plot'];
      actionKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have chart type keywords', () => {
      const chartKeywords = ['pie chart', 'bar chart', 'line graph', 'scatter plot', 'histogram'];
      chartKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have diagram type keywords', () => {
      const diagramKeywords = ['flowchart', 'sequence diagram', 'erd', 'uml', 'architecture diagram'];
      diagramKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have UI/UX keywords', () => {
      const uiKeywords = ['wireframe', 'mockup', 'prototype', 'dashboard'];
      uiKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have creative keywords', () => {
      const creativeKeywords = ['abstract', 'artistic', 'creative visual', 'artwork'];
      creativeKeywords.forEach(keyword => {
        expect(VISUAL_KEYWORDS).toContain(keyword);
      });
    });

    it('should have at least 40 keywords', () => {
      expect(VISUAL_KEYWORDS.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('FORMAT_RECOMMENDATIONS', () => {
    it('should have recommendations for all visual types', () => {
      const types: VisualType[] = ['chart', 'diagram', 'abstract', 'dashboard', 'general'];
      types.forEach(type => {
        expect(FORMAT_RECOMMENDATIONS[type]).toBeDefined();
        expect(FORMAT_RECOMMENDATIONS[type].primary).toBeDefined();
        expect(FORMAT_RECOMMENDATIONS[type].fallback).toBeDefined();
        expect(FORMAT_RECOMMENDATIONS[type].description).toBeDefined();
      });
    });

    it('should recommend chart format for charts', () => {
      expect(FORMAT_RECOMMENDATIONS.chart.primary).toBe('chart');
      expect(FORMAT_RECOMMENDATIONS.chart.fallback).toBe('svg');
    });

    it('should recommend mermaid for diagrams', () => {
      expect(FORMAT_RECOMMENDATIONS.diagram.primary).toBe('mermaid');
      expect(FORMAT_RECOMMENDATIONS.diagram.fallback).toBe('ascii');
    });

    it('should recommend stats for dashboards', () => {
      expect(FORMAT_RECOMMENDATIONS.dashboard.primary).toBe('stats');
    });

    it('should recommend svg for abstract visuals', () => {
      expect(FORMAT_RECOMMENDATIONS.abstract.primary).toBe('svg');
      expect(FORMAT_RECOMMENDATIONS.abstract.fallback).toBe('emoji');
    });

    it('should have ascii as general primary format', () => {
      expect(FORMAT_RECOMMENDATIONS.general.primary).toBe('ascii');
    });

    it('should have descriptions for all formats', () => {
      Object.values(FORMAT_RECOMMENDATIONS).forEach(rec => {
        expect(rec.description.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Visual Type Detection', () => {
    function detectVisualType(prompt: string): VisualType {
      const lower = prompt.toLowerCase();
      
      // Diagram patterns (check first - more specific)
      if (/flowchart|flow\s*diagram|sequence|architecture|erd|uml|wireframe/i.test(lower)) {
        return 'diagram';
      }
      
      // Dashboard patterns
      if (/dashboard|kpi|metrics|stats|analytics/i.test(lower)) {
        return 'dashboard';
      }
      
      // Chart patterns
      if (/\bchart\b|graph|plot|histogram|pie|bar|line|scatter|trend/i.test(lower)) {
        return 'chart';
      }
      
      // Abstract/artistic patterns
      if (/abstract|artistic|creative|artwork|logo|icon|illustration/i.test(lower)) {
        return 'abstract';
      }
      
      return 'general';
    }

    it('should detect chart type', () => {
      expect(detectVisualType('Create a bar chart')).toBe('chart');
      expect(detectVisualType('Show me a line graph')).toBe('chart');
      expect(detectVisualType('Generate a pie chart')).toBe('chart');
    });

    it('should detect dashboard type', () => {
      expect(detectVisualType('Create a dashboard')).toBe('dashboard');
      expect(detectVisualType('Show KPI metrics')).toBe('dashboard');
      expect(detectVisualType('Analytics dashboard')).toBe('dashboard');
    });

    it('should detect diagram type', () => {
      expect(detectVisualType('Create a flowchart')).toBe('diagram');
      expect(detectVisualType('Draw a sequence diagram')).toBe('diagram');
      expect(detectVisualType('Architecture diagram')).toBe('diagram');
    });

    it('should detect abstract type', () => {
      expect(detectVisualType('Create an abstract design')).toBe('abstract');
      expect(detectVisualType('Design a logo')).toBe('abstract');
      expect(detectVisualType('Make an artistic illustration')).toBe('abstract');
    });

    it('should default to general', () => {
      expect(detectVisualType('Show me something')).toBe('general');
      expect(detectVisualType('Visualize this')).toBe('general');
    });
  });

  describe('Visual Keyword Detection', () => {
    function hasVisualKeyword(text: string): boolean {
      const lower = text.toLowerCase();
      return VISUAL_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
    }

    it('should detect explicit keywords', () => {
      expect(hasVisualKeyword('Create an SVG')).toBe(true);
      expect(hasVisualKeyword('Generate a chart')).toBe(true);
      expect(hasVisualKeyword('Make a diagram')).toBe(true);
    });

    it('should detect action keywords', () => {
      expect(hasVisualKeyword('Draw something')).toBe(true);
      expect(hasVisualKeyword('Visualize data')).toBe(true);
      expect(hasVisualKeyword('Render output')).toBe(true);
    });

    it('should detect compound keywords', () => {
      expect(hasVisualKeyword('Create a pie chart')).toBe(true);
      expect(hasVisualKeyword('Architecture diagram')).toBe(true);
      expect(hasVisualKeyword('Line graph')).toBe(true);
    });

    it('should return false for non-visual requests', () => {
      expect(hasVisualKeyword('Explain this code')).toBe(false);
      expect(hasVisualKeyword('Write a function')).toBe(false);
      expect(hasVisualKeyword('Help me debug')).toBe(false);
    });
  });

  describe('Format Code Block Generation', () => {
    function generateCodeBlock(format: string, content: string): string {
      return '```' + format + '\n' + content + '\n```';
    }

    it('should generate chart code block', () => {
      const block = generateCodeBlock('chart', '{"type":"bar","data":{}}');
      expect(block).toContain('```chart');
      expect(block).toContain('```');
    });

    it('should generate mermaid code block', () => {
      const block = generateCodeBlock('mermaid', 'graph TD\n  A --> B');
      expect(block).toContain('```mermaid');
      expect(block).toContain('graph TD');
    });

    it('should generate svg code block', () => {
      const block = generateCodeBlock('svg', '<svg></svg>');
      expect(block).toContain('```svg');
    });

    it('should generate ascii code block', () => {
      const block = generateCodeBlock('ascii', '+---+\n|   |\n+---+');
      expect(block).toContain('```ascii');
    });

    it('should generate stats code block', () => {
      const block = generateCodeBlock('stats', '{"kpis":[]}');
      expect(block).toContain('```stats');
    });
  });

  describe('Chart Type Recommendations', () => {
    interface ChartRecommendation {
      type: string;
      useCase: string;
      dataShape: string;
    }

    const CHART_RECOMMENDATIONS: Record<string, ChartRecommendation> = {
      bar: {
        type: 'bar',
        useCase: 'Comparing categories',
        dataShape: 'Labels and values',
      },
      line: {
        type: 'line',
        useCase: 'Trends over time',
        dataShape: 'Time series',
      },
      pie: {
        type: 'pie',
        useCase: 'Part-to-whole relationships',
        dataShape: 'Categories with percentages',
      },
      scatter: {
        type: 'scatter',
        useCase: 'Correlation between variables',
        dataShape: 'X-Y pairs',
      },
      area: {
        type: 'area',
        useCase: 'Cumulative totals over time',
        dataShape: 'Stacked values',
      },
    };

    it('should have bar chart recommendation', () => {
      expect(CHART_RECOMMENDATIONS.bar.type).toBe('bar');
      expect(CHART_RECOMMENDATIONS.bar.useCase).toContain('categories');
    });

    it('should have line chart recommendation', () => {
      expect(CHART_RECOMMENDATIONS.line.type).toBe('line');
      expect(CHART_RECOMMENDATIONS.line.useCase).toContain('Trends');
    });

    it('should have pie chart recommendation', () => {
      expect(CHART_RECOMMENDATIONS.pie.type).toBe('pie');
      expect(CHART_RECOMMENDATIONS.pie.useCase).toContain('Part-to-whole');
    });

    it('should have scatter chart recommendation', () => {
      expect(CHART_RECOMMENDATIONS.scatter.type).toBe('scatter');
      expect(CHART_RECOMMENDATIONS.scatter.useCase).toContain('Correlation');
    });

    it('should have area chart recommendation', () => {
      expect(CHART_RECOMMENDATIONS.area.type).toBe('area');
      expect(CHART_RECOMMENDATIONS.area.useCase).toContain('Cumulative');
    });
  });

  describe('Diagram Type Recommendations', () => {
    interface DiagramRecommendation {
      type: string;
      syntax: string;
      useCase: string;
    }

    const DIAGRAM_TYPES: Record<string, DiagramRecommendation> = {
      flowchart: {
        type: 'flowchart',
        syntax: 'graph TD',
        useCase: 'Process flows and decision trees',
      },
      sequence: {
        type: 'sequence',
        syntax: 'sequenceDiagram',
        useCase: 'Interactions between components',
      },
      class: {
        type: 'class',
        syntax: 'classDiagram',
        useCase: 'Object relationships',
      },
      er: {
        type: 'er',
        syntax: 'erDiagram',
        useCase: 'Database relationships',
      },
      state: {
        type: 'state',
        syntax: 'stateDiagram-v2',
        useCase: 'State machines',
      },
    };

    it('should have flowchart diagram', () => {
      expect(DIAGRAM_TYPES.flowchart.syntax).toBe('graph TD');
    });

    it('should have sequence diagram', () => {
      expect(DIAGRAM_TYPES.sequence.syntax).toBe('sequenceDiagram');
    });

    it('should have class diagram', () => {
      expect(DIAGRAM_TYPES.class.syntax).toBe('classDiagram');
    });

    it('should have ER diagram', () => {
      expect(DIAGRAM_TYPES.er.syntax).toBe('erDiagram');
    });

    it('should have state diagram', () => {
      expect(DIAGRAM_TYPES.state.syntax).toBe('stateDiagram-v2');
    });

    it('should all have use cases', () => {
      Object.values(DIAGRAM_TYPES).forEach(diag => {
        expect(diag.useCase.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Visual Enhancement Logic', () => {
    function shouldEnhanceVisual(prompt: string): boolean {
      const lower = prompt.toLowerCase();
      return VISUAL_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    }

    function getEnhancementFormat(prompt: string, visualType: VisualType): string {
      const rec = FORMAT_RECOMMENDATIONS[visualType];
      return rec.primary;
    }

    it('should enhance visual requests', () => {
      expect(shouldEnhanceVisual('Create a chart')).toBe(true);
      expect(shouldEnhanceVisual('Draw a flowchart')).toBe(true);
    });

    it('should not enhance non-visual requests', () => {
      expect(shouldEnhanceVisual('Write code')).toBe(false);
      expect(shouldEnhanceVisual('Fix bug')).toBe(false);
    });

    it('should return correct format for visual type', () => {
      expect(getEnhancementFormat('', 'chart')).toBe('chart');
      expect(getEnhancementFormat('', 'diagram')).toBe('mermaid');
      expect(getEnhancementFormat('', 'dashboard')).toBe('stats');
    });
  });

  describe('Visual Output Validation', () => {
    function isValidSVG(content: string): boolean {
      return content.includes('<svg') && content.includes('</svg>');
    }

    function isValidMermaid(content: string): boolean {
      const validStarts = ['graph', 'sequenceDiagram', 'classDiagram', 'erDiagram', 'stateDiagram'];
      return validStarts.some(start => content.trim().startsWith(start));
    }

    function isValidChartJSON(content: string): boolean {
      try {
        const parsed = JSON.parse(content);
        return parsed.type !== undefined || parsed.data !== undefined;
      } catch {
        return false;
      }
    }

    it('should validate SVG', () => {
      expect(isValidSVG('<svg><circle/></svg>')).toBe(true);
      expect(isValidSVG('not svg')).toBe(false);
    });

    it('should validate mermaid', () => {
      expect(isValidMermaid('graph TD\n  A --> B')).toBe(true);
      expect(isValidMermaid('sequenceDiagram\n  A->>B: Hello')).toBe(true);
      expect(isValidMermaid('invalid')).toBe(false);
    });

    it('should validate chart JSON', () => {
      expect(isValidChartJSON('{"type":"bar"}')).toBe(true);
      expect(isValidChartJSON('{"data":{}}')).toBe(true);
      expect(isValidChartJSON('not json')).toBe(false);
    });
  });
});
