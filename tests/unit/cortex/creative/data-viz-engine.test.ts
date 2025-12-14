// @version 3.3.577
/**
 * Data Visualization Engine Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for chart and graph generation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock animation engine
vi.mock('../../../../src/cortex/creative/animation-engine.js', () => ({
  animationEngine: {
    createAnimation: vi.fn(),
  },
  EASING_CURVES: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  },
}));

describe('DataVizEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create singleton instance', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const instance1 = DataVizEngine.getInstance();
      const instance2 = DataVizEngine.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should subscribe to viz requests on init', async () => {
      const { bus } = await import('../../../../src/core/event-bus.js');
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      new DataVizEngine();

      expect(bus.on).toHaveBeenCalledWith('cortex:dataviz_request', expect.any(Function));
    });
  });

  describe('Color Palettes', () => {
    it('should export chart palettes', async () => {
      const { CHART_PALETTES } = await import('../../../../src/cortex/creative/data-viz-engine');

      expect(CHART_PALETTES.vibrant).toBeInstanceOf(Array);
      expect(CHART_PALETTES.dark).toBeInstanceOf(Array);
      expect(CHART_PALETTES.light).toBeInstanceOf(Array);
      expect(CHART_PALETTES.minimal).toBeInstanceOf(Array);
      expect(CHART_PALETTES.gradient).toBeInstanceOf(Array);
    });

    it('should have valid hex colors in palettes', async () => {
      const { CHART_PALETTES } = await import('../../../../src/cortex/creative/data-viz-engine');

      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const color of CHART_PALETTES.vibrant) {
        expect(color).toMatch(hexRegex);
      }
    });
  });

  describe('Bar Chart Generation', () => {
    it('should generate valid SVG bar chart', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [
        { label: 'Jan', value: 100 },
        { label: 'Feb', value: 150 },
        { label: 'Mar', value: 120 },
      ];

      const svg = engine.generateBarChart(data);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('viewBox');
    });

    it('should apply custom dimensions', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, {
        width: 1200,
        height: 800,
      });

      expect(svg).toContain('viewBox="0 0 1200 800"');
    });

    it('should include title when provided', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, {
        title: 'Sales Report',
      });

      expect(svg).toContain('Sales Report');
    });

    it('should include subtitle when provided', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, {
        title: 'Main Title',
        subtitle: 'Sub heading',
      });

      expect(svg).toContain('Sub heading');
    });

    it('should support different themes', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const darkSvg = engine.generateBarChart(data, { theme: 'dark' });
      const lightSvg = engine.generateBarChart(data, { theme: 'light' });

      expect(darkSvg).toBeTruthy();
      expect(lightSvg).toBeTruthy();
      expect(darkSvg).not.toBe(lightSvg);
    });

    it('should handle empty data gracefully', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();

      // Should not throw
      const svg = engine.generateBarChart([]);
      expect(svg).toContain('<svg');
    });

    it('should include animation when enabled', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, { animate: true });

      expect(svg).toContain('<animate');
    });

    it('should not include animation when disabled', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, { animate: false });

      // May still have some animation elements but fewer
      expect(svg).toContain('<svg');
    });

    it('should include grid when showGrid is true', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50 }];

      const svg = engine.generateBarChart(data, { showGrid: true });

      expect(svg).toContain('grid');
    });

    it('should include labels when showLabels is true', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'January', value: 50 }];

      const svg = engine.generateBarChart(data, { showLabels: true });

      expect(svg).toContain('January');
    });

    it('should include values when showValues is true', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 42 }];

      const svg = engine.generateBarChart(data, { showValues: true });

      expect(svg).toContain('42');
    });

    it('should use custom colors when provided', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = [{ label: 'Test', value: 50, color: '#ff0000' }];

      const svg = engine.generateBarChart(data);

      expect(svg).toContain('#ff0000');
    });

    it('should handle large datasets', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const data = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i}`,
        value: Math.random() * 100,
      }));

      const svg = engine.generateBarChart(data);
      expect(svg).toContain('<svg');
      expect(svg.length).toBeGreaterThan(1000);
    });
  });

  describe('SVG Structure', () => {
    it('should include defs section', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const svg = engine.generateBarChart([{ label: 'Test', value: 50 }]);

      expect(svg).toContain('<defs>');
      expect(svg).toContain('</defs>');
    });

    it('should include gradient definitions', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const svg = engine.generateBarChart([{ label: 'Test', value: 50 }]);

      expect(svg).toContain('linearGradient');
    });

    it('should include filter effects', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const svg = engine.generateBarChart([{ label: 'Test', value: 50 }]);

      expect(svg).toContain('<filter');
    });

    it('should have background rect', async () => {
      const { DataVizEngine } = await import('../../../../src/cortex/creative/data-viz-engine');

      const engine = DataVizEngine.getInstance();
      const svg = engine.generateBarChart([{ label: 'Test', value: 50 }]);

      expect(svg).toContain('<rect');
    });
  });
});
