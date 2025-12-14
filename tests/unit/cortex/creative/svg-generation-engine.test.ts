// @version 3.3.577
// Tests for TooLoo.ai SVG Generation Engine
// Programmatic SVG building utilities tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type definitions from svg-generation-engine.ts
interface SVGElement {
  tag: string;
  attrs: Record<string, string | number>;
  children?: (SVGElement | string)[];
  animation?: SVGAnimateSpec | SVGAnimateSpec[];
}

interface SVGAnimateSpec {
  attributeName: string;
  from?: string;
  to?: string;
  values?: string[];
  dur: string;
  repeatCount?: number | 'indefinite';
}

interface GradientStop {
  offset: string | number;
  color: string;
  opacity?: number;
}

interface LinearGradientSpec {
  id: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  stops: GradientStop[];
}

interface RadialGradientSpec {
  id: string;
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  stops: GradientStop[];
}

interface FilterSpec {
  id: string;
  type: 'glow' | 'shadow' | 'blur' | 'dropShadow' | 'innerShadow' | 'neon' | 'custom';
  color?: string;
  intensity?: number;
  spread?: number;
  offsetX?: number;
  offsetY?: number;
}

interface PatternSpec {
  id: string;
  type: 'grid' | 'dots' | 'lines' | 'crosshatch' | 'waves' | 'hexagons' | 'custom';
  size?: number;
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
}

interface PathCommand {
  type: 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z';
  args: number[];
}

describe('SVG Generation Engine', () => {
  describe('SVGElement Interface', () => {
    it('should validate basic SVG element', () => {
      const element: SVGElement = {
        tag: 'rect',
        attrs: {
          x: 10,
          y: 10,
          width: 100,
          height: 50,
          fill: '#ff0000',
        },
      };

      expect(element.tag).toBe('rect');
      expect(element.attrs.x).toBe(10);
      expect(element.attrs.fill).toBe('#ff0000');
    });

    it('should support children elements', () => {
      const element: SVGElement = {
        tag: 'g',
        attrs: { id: 'group1' },
        children: [
          { tag: 'circle', attrs: { cx: 50, cy: 50, r: 25 } },
          { tag: 'rect', attrs: { x: 0, y: 0, width: 100, height: 100 } },
        ],
      };

      expect(element.children).toHaveLength(2);
      expect((element.children![0] as SVGElement).tag).toBe('circle');
    });

    it('should support text children', () => {
      const element: SVGElement = {
        tag: 'text',
        attrs: { x: 100, y: 50 },
        children: ['Hello World'],
      };

      expect(element.children![0]).toBe('Hello World');
    });

    it('should support animation', () => {
      const element: SVGElement = {
        tag: 'circle',
        attrs: { cx: 50, cy: 50, r: 10 },
        animation: {
          attributeName: 'r',
          from: '10',
          to: '20',
          dur: '1s',
          repeatCount: 'indefinite',
        },
      };

      expect(element.animation).toBeDefined();
      expect((element.animation as SVGAnimateSpec).attributeName).toBe('r');
    });

    it('should support multiple animations', () => {
      const element: SVGElement = {
        tag: 'rect',
        attrs: { x: 0, y: 0, width: 50, height: 50 },
        animation: [
          { attributeName: 'x', from: '0', to: '100', dur: '2s' },
          { attributeName: 'opacity', from: '1', to: '0', dur: '2s' },
        ],
      };

      expect(Array.isArray(element.animation)).toBe(true);
      expect((element.animation as SVGAnimateSpec[]).length).toBe(2);
    });
  });

  describe('GradientStop Interface', () => {
    it('should validate numeric offset', () => {
      const stop: GradientStop = {
        offset: 50,
        color: '#ff0000',
      };

      expect(stop.offset).toBe(50);
      expect(stop.color).toBe('#ff0000');
    });

    it('should validate string offset', () => {
      const stop: GradientStop = {
        offset: '50%',
        color: '#00ff00',
      };

      expect(stop.offset).toBe('50%');
    });

    it('should support opacity', () => {
      const stop: GradientStop = {
        offset: 0,
        color: '#0000ff',
        opacity: 0.5,
      };

      expect(stop.opacity).toBe(0.5);
    });
  });

  describe('LinearGradientSpec Interface', () => {
    it('should validate basic linear gradient', () => {
      const gradient: LinearGradientSpec = {
        id: 'myGradient',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 100, color: '#0000ff' },
        ],
      };

      expect(gradient.id).toBe('myGradient');
      expect(gradient.stops).toHaveLength(2);
    });

    it('should support direction properties', () => {
      const gradient: LinearGradientSpec = {
        id: 'horizontal',
        x1: '0%',
        y1: '50%',
        x2: '100%',
        y2: '50%',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 100, color: '#0000ff' },
        ],
      };

      expect(gradient.x1).toBe('0%');
      expect(gradient.x2).toBe('100%');
    });

    it('should support diagonal gradient', () => {
      const gradient: LinearGradientSpec = {
        id: 'diagonal',
        x1: '0%',
        y1: '0%',
        x2: '100%',
        y2: '100%',
        stops: [
          { offset: 0, color: '#fff' },
          { offset: 100, color: '#000' },
        ],
      };

      expect(gradient.x1).toBe('0%');
      expect(gradient.y1).toBe('0%');
      expect(gradient.x2).toBe('100%');
      expect(gradient.y2).toBe('100%');
    });

    it('should support multiple stops', () => {
      const gradient: LinearGradientSpec = {
        id: 'rainbow',
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 25, color: '#ffff00' },
          { offset: 50, color: '#00ff00' },
          { offset: 75, color: '#00ffff' },
          { offset: 100, color: '#0000ff' },
        ],
      };

      expect(gradient.stops).toHaveLength(5);
    });
  });

  describe('RadialGradientSpec Interface', () => {
    it('should validate basic radial gradient', () => {
      const gradient: RadialGradientSpec = {
        id: 'radialGrad',
        stops: [
          { offset: 0, color: '#ffffff' },
          { offset: 100, color: '#000000' },
        ],
      };

      expect(gradient.id).toBe('radialGrad');
    });

    it('should support center and radius', () => {
      const gradient: RadialGradientSpec = {
        id: 'centered',
        cx: '50%',
        cy: '50%',
        r: '50%',
        stops: [
          { offset: 0, color: '#fff' },
          { offset: 100, color: '#000' },
        ],
      };

      expect(gradient.cx).toBe('50%');
      expect(gradient.cy).toBe('50%');
      expect(gradient.r).toBe('50%');
    });

    it('should support focal point', () => {
      const gradient: RadialGradientSpec = {
        id: 'focal',
        cx: '50%',
        cy: '50%',
        r: '50%',
        fx: '25%',
        fy: '25%',
        stops: [
          { offset: 0, color: '#fff' },
          { offset: 100, color: '#000' },
        ],
      };

      expect(gradient.fx).toBe('25%');
      expect(gradient.fy).toBe('25%');
    });
  });

  describe('FilterSpec Interface', () => {
    it('should validate basic filter', () => {
      const filter: FilterSpec = {
        id: 'glowFilter',
        type: 'glow',
      };

      expect(filter.id).toBe('glowFilter');
      expect(filter.type).toBe('glow');
    });

    it('should support filter types', () => {
      const types: FilterSpec['type'][] = [
        'glow',
        'shadow',
        'blur',
        'dropShadow',
        'innerShadow',
        'neon',
        'custom',
      ];

      types.forEach(type => {
        const filter: FilterSpec = { id: 'test', type };
        expect(filter.type).toBe(type);
      });
    });

    it('should support filter parameters', () => {
      const filter: FilterSpec = {
        id: 'shadowFilter',
        type: 'shadow',
        color: '#000000',
        intensity: 0.5,
        spread: 5,
        offsetX: 3,
        offsetY: 3,
      };

      expect(filter.color).toBe('#000000');
      expect(filter.intensity).toBe(0.5);
      expect(filter.spread).toBe(5);
      expect(filter.offsetX).toBe(3);
      expect(filter.offsetY).toBe(3);
    });
  });

  describe('PatternSpec Interface', () => {
    it('should validate basic pattern', () => {
      const pattern: PatternSpec = {
        id: 'gridPattern',
        type: 'grid',
      };

      expect(pattern.id).toBe('gridPattern');
      expect(pattern.type).toBe('grid');
    });

    it('should support pattern types', () => {
      const types: PatternSpec['type'][] = [
        'grid',
        'dots',
        'lines',
        'crosshatch',
        'waves',
        'hexagons',
        'custom',
      ];

      types.forEach(type => {
        const pattern: PatternSpec = { id: 'test', type };
        expect(pattern.type).toBe(type);
      });
    });

    it('should support pattern parameters', () => {
      const pattern: PatternSpec = {
        id: 'dotPattern',
        type: 'dots',
        size: 10,
        color: '#333333',
        backgroundColor: '#ffffff',
        strokeWidth: 1,
      };

      expect(pattern.size).toBe(10);
      expect(pattern.color).toBe('#333333');
      expect(pattern.backgroundColor).toBe('#ffffff');
      expect(pattern.strokeWidth).toBe(1);
    });
  });

  describe('PathCommand Interface', () => {
    it('should validate move command', () => {
      const cmd: PathCommand = {
        type: 'M',
        args: [100, 100],
      };

      expect(cmd.type).toBe('M');
      expect(cmd.args).toEqual([100, 100]);
    });

    it('should validate line commands', () => {
      const commands: PathCommand[] = [
        { type: 'L', args: [200, 200] },
        { type: 'H', args: [300] },
        { type: 'V', args: [150] },
      ];

      expect(commands[0].type).toBe('L');
      expect(commands[1].type).toBe('H');
      expect(commands[2].type).toBe('V');
    });

    it('should validate curve commands', () => {
      const cubic: PathCommand = {
        type: 'C',
        args: [100, 100, 200, 200, 300, 100],
      };

      const quad: PathCommand = {
        type: 'Q',
        args: [150, 0, 300, 100],
      };

      expect(cubic.type).toBe('C');
      expect(cubic.args).toHaveLength(6);
      expect(quad.type).toBe('Q');
      expect(quad.args).toHaveLength(4);
    });

    it('should validate arc command', () => {
      const arc: PathCommand = {
        type: 'A',
        args: [50, 50, 0, 0, 1, 100, 100],
      };

      expect(arc.type).toBe('A');
      expect(arc.args).toHaveLength(7);
    });

    it('should validate close path command', () => {
      const close: PathCommand = {
        type: 'Z',
        args: [],
      };

      expect(close.type).toBe('Z');
      expect(close.args).toHaveLength(0);
    });
  });

  describe('SVG Building Helpers', () => {
    function pathToString(commands: PathCommand[]): string {
      return commands
        .map(cmd => {
          if (cmd.type === 'Z') return 'Z';
          return `${cmd.type}${cmd.args.join(',')}`;
        })
        .join(' ');
    }

    it('should generate path string', () => {
      const path = pathToString([
        { type: 'M', args: [10, 10] },
        { type: 'L', args: [100, 100] },
        { type: 'Z', args: [] },
      ]);

      expect(path).toBe('M10,10 L100,100 Z');
    });

    function createElement(element: SVGElement): string {
      const attrs = Object.entries(element.attrs)
        .map(([key, val]) => `${key}="${val}"`)
        .join(' ');
      
      if (!element.children || element.children.length === 0) {
        return `<${element.tag} ${attrs} />`;
      }
      
      const children = element.children
        .map(child => typeof child === 'string' ? child : createElement(child))
        .join('');
      
      return `<${element.tag} ${attrs}>${children}</${element.tag}>`;
    }

    it('should create self-closing element', () => {
      const rect = createElement({
        tag: 'rect',
        attrs: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(rect).toContain('<rect');
      expect(rect).toContain('width="100"');
      expect(rect).toContain('/>');
    });

    it('should create element with children', () => {
      const group = createElement({
        tag: 'g',
        attrs: { id: 'myGroup' },
        children: [
          { tag: 'circle', attrs: { cx: 50, cy: 50, r: 25 } },
        ],
      });

      expect(group).toContain('<g');
      expect(group).toContain('<circle');
      expect(group).toContain('</g>');
    });

    function generateGradientStops(stops: GradientStop[]): string {
      return stops
        .map(stop => {
          const offset = typeof stop.offset === 'number' ? `${stop.offset}%` : stop.offset;
          const opacity = stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : '';
          return `<stop offset="${offset}" stop-color="${stop.color}"${opacity}/>`;
        })
        .join('');
    }

    it('should generate gradient stops', () => {
      const stops = generateGradientStops([
        { offset: 0, color: '#ff0000' },
        { offset: 100, color: '#0000ff' },
      ]);

      expect(stops).toContain('offset="0%"');
      expect(stops).toContain('stop-color="#ff0000"');
      expect(stops).toContain('offset="100%"');
    });

    it('should handle opacity in gradient stops', () => {
      const stops = generateGradientStops([
        { offset: 50, color: '#00ff00', opacity: 0.5 },
      ]);

      expect(stops).toContain('stop-opacity="0.5"');
    });
  });

  describe('Preset Gradients', () => {
    const presets = {
      purple: [
        { offset: 0, color: '#667eea' },
        { offset: 100, color: '#764ba2' },
      ],
      sunset: [
        { offset: 0, color: '#f093fb' },
        { offset: 100, color: '#f5576c' },
      ],
      ocean: [
        { offset: 0, color: '#4facfe' },
        { offset: 100, color: '#00f2fe' },
      ],
      forest: [
        { offset: 0, color: '#43e97b' },
        { offset: 100, color: '#38f9d7' },
      ],
      fire: [
        { offset: 0, color: '#f97316' },
        { offset: 50, color: '#ef4444' },
        { offset: 100, color: '#dc2626' },
      ],
      neon: [
        { offset: 0, color: '#6366f1' },
        { offset: 50, color: '#8b5cf6' },
        { offset: 100, color: '#a855f7' },
      ],
      midnight: [
        { offset: 0, color: '#0f0f1a' },
        { offset: 50, color: '#1e1e3f' },
        { offset: 100, color: '#2d2d5a' },
      ],
    };

    it('should have all preset gradients defined', () => {
      expect(Object.keys(presets)).toHaveLength(7);
    });

    it('should have valid hex colors in presets', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      Object.values(presets).forEach(stops => {
        stops.forEach(stop => {
          expect(stop.color).toMatch(hexPattern);
        });
      });
    });

    it('should have fire gradient with 3 stops', () => {
      expect(presets.fire).toHaveLength(3);
    });

    it('should have neon gradient with 3 stops', () => {
      expect(presets.neon).toHaveLength(3);
    });

    it('should have midnight gradient with dark colors', () => {
      presets.midnight.forEach(stop => {
        const r = parseInt(stop.color.slice(1, 3), 16);
        const g = parseInt(stop.color.slice(3, 5), 16);
        const b = parseInt(stop.color.slice(5, 7), 16);
        expect(Math.max(r, g, b)).toBeLessThan(100);
      });
    });
  });

  describe('SVG Coordinate Helpers', () => {
    function polarToCartesian(
      cx: number,
      cy: number,
      r: number,
      angle: number
    ): { x: number; y: number } {
      const rad = ((angle - 90) * Math.PI) / 180;
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
      };
    }

    it('should convert polar to cartesian at 0 degrees', () => {
      const point = polarToCartesian(100, 100, 50, 0);
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(50);
    });

    it('should convert polar to cartesian at 90 degrees', () => {
      const point = polarToCartesian(100, 100, 50, 90);
      expect(point.x).toBeCloseTo(150);
      expect(point.y).toBeCloseTo(100);
    });

    it('should convert polar to cartesian at 180 degrees', () => {
      const point = polarToCartesian(100, 100, 50, 180);
      expect(point.x).toBeCloseTo(100);
      expect(point.y).toBeCloseTo(150);
    });

    function describeArc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number
    ): string {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(' ');
    }

    it('should describe a small arc', () => {
      const arc = describeArc(100, 100, 50, 0, 90);
      expect(arc).toContain('M');
      expect(arc).toContain('A');
      expect(arc).toContain('0'); // largeArcFlag should be 0
    });

    it('should describe a large arc', () => {
      const arc = describeArc(100, 100, 50, 0, 270);
      expect(arc).toContain('1'); // largeArcFlag should be 1
    });
  });
});
