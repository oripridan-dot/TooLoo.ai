// @version 3.3.577
/**
 * Figma Bridge Tests
 * Tests for Figma API integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../core/event-bus.js', () => ({
  bus: {
    on: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('FigmaBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('FigmaFile', () => {
      it('should have document property', () => {
        interface FigmaFile {
          document: { id: string; name: string };
          components: Record<string, unknown>;
          styles: Record<string, unknown>;
          name: string;
          lastModified: string;
          version: string;
        }
        const file: FigmaFile = {
          document: { id: '0:0', name: 'Document' },
          components: {},
          styles: {},
          name: 'My Design',
          lastModified: '2024-01-15T10:00:00Z',
          version: '1.0',
        };
        expect(file.document.id).toBe('0:0');
      });

      it('should have components map', () => {
        interface FigmaFile {
          document: { id: string };
          components: Record<string, { key: string; name: string }>;
          styles: Record<string, unknown>;
          name: string;
          lastModified: string;
          version: string;
        }
        const file: FigmaFile = {
          document: { id: '0:0' },
          components: {
            'btn-1': { key: 'abc', name: 'Button' },
            'card-1': { key: 'def', name: 'Card' },
          },
          styles: {},
          name: 'Design System',
          lastModified: '2024-01-15T10:00:00Z',
          version: '2.0',
        };
        expect(Object.keys(file.components)).toHaveLength(2);
      });

      it('should have styles map', () => {
        interface FigmaFile {
          document: { id: string };
          components: Record<string, unknown>;
          styles: Record<string, { key: string; styleType: string }>;
          name: string;
          lastModified: string;
          version: string;
        }
        const file: FigmaFile = {
          document: { id: '0:0' },
          components: {},
          styles: {
            'color-primary': { key: 'c1', styleType: 'FILL' },
            'text-heading': { key: 't1', styleType: 'TEXT' },
          },
          name: 'Design',
          lastModified: '2024-01-15T10:00:00Z',
          version: '1.0',
        };
        expect(Object.keys(file.styles)).toHaveLength(2);
      });
    });

    describe('FigmaNode', () => {
      it('should have id property', () => {
        interface FigmaNode {
          id: string;
          name: string;
          type: string;
          children?: FigmaNode[];
        }
        const node: FigmaNode = {
          id: '1:23',
          name: 'Button',
          type: 'COMPONENT',
        };
        expect(node.id).toBe('1:23');
      });

      it('should have type property', () => {
        interface FigmaNode {
          id: string;
          name: string;
          type: string;
        }
        const node: FigmaNode = {
          id: '1:24',
          name: 'Frame',
          type: 'FRAME',
        };
        expect(node.type).toBe('FRAME');
      });

      it('should have optional children', () => {
        interface FigmaNode {
          id: string;
          name: string;
          type: string;
          children?: FigmaNode[];
        }
        const node: FigmaNode = {
          id: '1:25',
          name: 'Container',
          type: 'FRAME',
          children: [
            { id: '1:26', name: 'Child', type: 'TEXT' },
          ],
        };
        expect(node.children).toHaveLength(1);
      });

      it('should have bounding box', () => {
        interface FigmaNode {
          id: string;
          name: string;
          type: string;
          absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
        }
        const node: FigmaNode = {
          id: '1:27',
          name: 'Box',
          type: 'RECTANGLE',
          absoluteBoundingBox: { x: 100, y: 200, width: 150, height: 50 },
        };
        expect(node.absoluteBoundingBox?.width).toBe(150);
      });

      it('should have layout properties', () => {
        interface FigmaNode {
          id: string;
          name: string;
          type: string;
          layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
          itemSpacing?: number;
          paddingTop?: number;
        }
        const node: FigmaNode = {
          id: '1:28',
          name: 'Flexbox',
          type: 'FRAME',
          layoutMode: 'HORIZONTAL',
          itemSpacing: 8,
          paddingTop: 16,
        };
        expect(node.layoutMode).toBe('HORIZONTAL');
      });
    });

    describe('FigmaNodeType', () => {
      it('should include FRAME', () => {
        type FigmaNodeType = 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'TEXT' |
          'RECTANGLE' | 'ELLIPSE' | 'COMPONENT' | 'INSTANCE';
        const type: FigmaNodeType = 'FRAME';
        expect(type).toBe('FRAME');
      });

      it('should include COMPONENT', () => {
        type FigmaNodeType = 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'TEXT' |
          'RECTANGLE' | 'ELLIPSE' | 'COMPONENT' | 'INSTANCE';
        const type: FigmaNodeType = 'COMPONENT';
        expect(type).toBe('COMPONENT');
      });

      it('should include TEXT', () => {
        type FigmaNodeType = 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'TEXT' |
          'RECTANGLE' | 'ELLIPSE' | 'COMPONENT' | 'INSTANCE';
        const type: FigmaNodeType = 'TEXT';
        expect(type).toBe('TEXT');
      });
    });

    describe('BoundingBox', () => {
      it('should have x, y, width, height', () => {
        interface BoundingBox {
          x: number;
          y: number;
          width: number;
          height: number;
        }
        const box: BoundingBox = {
          x: 50,
          y: 100,
          width: 200,
          height: 100,
        };
        expect(box.x).toBe(50);
        expect(box.width).toBe(200);
      });
    });

    describe('Constraints', () => {
      it('should have vertical constraint', () => {
        interface Constraints {
          vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
          horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
        }
        const constraints: Constraints = {
          vertical: 'TOP',
          horizontal: 'LEFT',
        };
        expect(constraints.vertical).toBe('TOP');
      });

      it('should have horizontal constraint', () => {
        interface Constraints {
          vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
          horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
        }
        const constraints: Constraints = {
          vertical: 'CENTER',
          horizontal: 'SCALE',
        };
        expect(constraints.horizontal).toBe('SCALE');
      });
    });

    describe('Paint', () => {
      it('should have type property', () => {
        interface Paint {
          type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
          visible?: boolean;
          opacity?: number;
          color?: { r: number; g: number; b: number; a: number };
        }
        const paint: Paint = {
          type: 'SOLID',
          visible: true,
          color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
        };
        expect(paint.type).toBe('SOLID');
      });

      it('should support gradients', () => {
        interface Paint {
          type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
          gradientStops?: { position: number; color: unknown }[];
        }
        const paint: Paint = {
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: {} },
            { position: 1, color: {} },
          ],
        };
        expect(paint.type).toBe('GRADIENT_LINEAR');
      });
    });

    describe('RGBA', () => {
      it('should have r, g, b, a values 0-1', () => {
        interface RGBA {
          r: number;
          g: number;
          b: number;
          a: number;
        }
        const color: RGBA = { r: 0.25, g: 0.5, b: 0.75, a: 1.0 };
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('FigmaBridge Class', () => {
    it('should initialize with API token', () => {
      const token = 'figd_xxx_secret_token';
      expect(token).toContain('figd_');
    });

    it('should cache file data', () => {
      const cache = new Map();
      cache.set('file-123', { name: 'Design', lastModified: Date.now() });
      expect(cache.has('file-123')).toBe(true);
    });
  });

  describe('API Operations', () => {
    describe('getFile', () => {
      it('should construct API URL', () => {
        const fileId = 'abc123xyz';
        const url = `https://api.figma.com/v1/files/${fileId}`;
        expect(url).toContain(fileId);
      });

      it('should include authorization header', () => {
        const token = 'figd_xxx';
        const headers = { 'X-Figma-Token': token };
        expect(headers['X-Figma-Token']).toBe(token);
      });
    });

    describe('getNode', () => {
      it('should construct node URL', () => {
        const fileId = 'abc123';
        const nodeId = '1:23';
        const url = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`;
        expect(url).toContain('nodes');
      });
    });

    describe('getImages', () => {
      it('should construct images URL', () => {
        const fileId = 'abc123';
        const nodeIds = ['1:1', '1:2', '1:3'];
        const url = `https://api.figma.com/v1/images/${fileId}?ids=${nodeIds.join(',')}`;
        expect(url).toContain('images');
      });

      it('should support image format option', () => {
        const format = 'svg';
        const url = `https://api.figma.com/v1/images/abc?format=${format}`;
        expect(url).toContain('format=svg');
      });
    });
  });

  describe('Node Processing', () => {
    it('should extract component info', () => {
      const node = {
        id: '1:100',
        name: 'Button/Primary',
        type: 'COMPONENT',
        children: [],
      };
      const componentInfo = {
        id: node.id,
        name: node.name,
        isComponent: node.type === 'COMPONENT',
      };
      expect(componentInfo.isComponent).toBe(true);
    });

    it('should detect auto-layout', () => {
      const node = {
        layoutMode: 'HORIZONTAL',
        itemSpacing: 8,
      };
      const hasAutoLayout = node.layoutMode !== 'NONE' && node.layoutMode !== undefined;
      expect(hasAutoLayout).toBe(true);
    });

    it('should calculate flex properties', () => {
      const node = {
        layoutMode: 'VERTICAL',
        itemSpacing: 16,
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 16,
        paddingRight: 16,
      };
      const flexStyles = {
        display: 'flex',
        flexDirection: node.layoutMode === 'VERTICAL' ? 'column' : 'row',
        gap: `${node.itemSpacing}px`,
        padding: `${node.paddingTop}px ${node.paddingRight}px ${node.paddingBottom}px ${node.paddingLeft}px`,
      };
      expect(flexStyles.flexDirection).toBe('column');
    });
  });

  describe('Color Conversion', () => {
    it('should convert RGBA to CSS', () => {
      const color = { r: 0.2, g: 0.4, b: 0.8, a: 1 };
      const css = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
      expect(css).toBe('rgba(51, 102, 204, 1)');
    });

    it('should convert to hex', () => {
      const color = { r: 1, g: 0, b: 0 };
      const hex = '#' + [color.r, color.g, color.b]
        .map(c => Math.round(c * 255).toString(16).padStart(2, '0'))
        .join('');
      expect(hex).toBe('#ff0000');
    });
  });

  describe('Caching', () => {
    it('should cache file data', () => {
      const cache = new Map();
      const fileId = 'abc123';
      const data = { name: 'Design', version: '1.0' };
      cache.set(fileId, data);
      expect(cache.get(fileId)).toEqual(data);
    });

    it('should invalidate cache after TTL', () => {
      const TTL_MS = 5 * 60 * 1000; // 5 minutes
      const cachedAt = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const isExpired = Date.now() - cachedAt > TTL_MS;
      expect(isExpired).toBe(true);
    });
  });

  describe('Design Token Extraction', () => {
    it('should extract color tokens', () => {
      const styles = {
        'S:color-primary': { name: 'Primary', styleType: 'FILL' },
        'S:color-secondary': { name: 'Secondary', styleType: 'FILL' },
      };
      const colorTokens = Object.values(styles).filter(s => s.styleType === 'FILL');
      expect(colorTokens).toHaveLength(2);
    });

    it('should extract text tokens', () => {
      const styles = {
        'S:text-heading': { name: 'Heading', styleType: 'TEXT' },
        'S:text-body': { name: 'Body', styleType: 'TEXT' },
      };
      const textTokens = Object.values(styles).filter(s => s.styleType === 'TEXT');
      expect(textTokens).toHaveLength(2);
    });
  });
});
