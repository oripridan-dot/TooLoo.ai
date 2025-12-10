/**
 * Design System Types Test Suite
 * @version 3.3.510
 *
 * Tests for the Figma Bridge and Design-to-Code types including:
 * - Figma node types and structures
 * - Design tokens
 * - Component analysis
 * - Code generation options
 * - Accessibility analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirror from figma-bridge.ts and design-to-code.ts)
// ============================================================================

type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE';

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Constraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: RGBA;
  gradientStops?: GradientStop[];
}

interface GradientStop {
  position: number;
  color: RGBA;
}

interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;
  offset?: { x: number; y: number };
}

interface TypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  children?: FigmaNode[];
  absoluteBoundingBox?: BoundingBox;
  constraints?: Constraints;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  style?: TypeStyle;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  cornerRadius?: number;
  characters?: string;
}

interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  name: string;
  lastModified: string;
  version: string;
}

interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

interface DesignToken {
  name: string;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'borderRadius';
  value: string | number | object;
  figmaStyleId?: string;
}

interface ContrastIssue {
  nodeId: string;
  nodeName: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  wcagLevel: 'AA' | 'AAA';
}

interface TouchTargetIssue {
  nodeId: string;
  nodeName: string;
  currentSize: { width: number; height: number };
  minimumSize: { width: number; height: number };
}

interface ColorBlindnessIssue {
  nodeId: string;
  nodeName: string;
  type: 'deuteranopia' | 'protanopia' | 'tritanopia';
  description: string;
}

interface AccessibilityAnalysis {
  contrastIssues: ContrastIssue[];
  touchTargetIssues: TouchTargetIssue[];
  colorBlindnessIssues: ColorBlindnessIssue[];
  overallScore: number;
}

interface SemanticAnalysis {
  purpose: string;
  targetAudience: string;
  designStyle: string;
  colorScheme: 'light' | 'dark' | 'both';
  accessibility: AccessibilityAnalysis;
}

type ComponentType =
  | 'button'
  | 'input'
  | 'card'
  | 'navigation'
  | 'modal'
  | 'list'
  | 'table'
  | 'form'
  | 'hero'
  | 'footer'
  | 'header'
  | 'sidebar'
  | 'custom';

type SemanticRole =
  | 'primary-action'
  | 'secondary-action'
  | 'navigation'
  | 'content'
  | 'input'
  | 'feedback'
  | 'decoration';

interface ComponentVariant {
  name: string;
  props: Record<string, string | boolean | number>;
  figmaVariantId: string;
}

interface InferredProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

interface ComponentAccessibility {
  role: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  keyboardNavigation: boolean;
}

interface ImplementationSuggestion {
  framework: 'react' | 'vue' | 'svelte' | 'html';
  existingComponent?: string;
  customImplementation: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedLines: number;
}

interface ComponentAnalysis {
  figmaId: string;
  name: string;
  type: ComponentType;
  semanticRole: SemanticRole;
  variants: ComponentVariant[];
  props: InferredProp[];
  accessibility: ComponentAccessibility;
  suggestedImplementation: ImplementationSuggestion;
}

interface CodeGenOptions {
  framework: 'react' | 'vue' | 'svelte' | 'html';
  styling: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'inline';
  typescript: boolean;
  componentLibrary?: 'shadcn' | 'radix' | 'chakra' | 'mantine' | 'custom';
  designSystemPath?: string;
  includeTests: boolean;
  includeStorybook: boolean;
}

interface GeneratedComponent {
  name: string;
  code: string;
  types?: string;
  styles?: string;
  test?: string;
  story?: string;
  dependencies: string[];
  qualityScore: number;
  figmaSource: {
    fileId: string;
    nodeId: string;
    url: string;
  };
}

interface GenerationWarning {
  type: 'accessibility' | 'performance' | 'compatibility' | 'design-system';
  severity: 'low' | 'medium' | 'high';
  message: string;
  componentName?: string;
  autoFixAvailable: boolean;
}

interface GenerationSuggestion {
  type: 'optimization' | 'best-practice' | 'alternative';
  message: string;
  componentName?: string;
  codeChange?: { before: string; after: string };
}

interface GenerationResult {
  components: GeneratedComponent[];
  sharedStyles?: string;
  designTokens?: string;
  indexFile?: string;
  totalQualityScore: number;
  warnings: GenerationWarning[];
  suggestions: GenerationSuggestion[];
}

// ============================================================================
// FIGMA NODE TYPE TESTS
// ============================================================================

describe('FigmaNodeType', () => {
  const nodeTypes: FigmaNodeType[] = [
    'DOCUMENT',
    'CANVAS',
    'FRAME',
    'GROUP',
    'VECTOR',
    'BOOLEAN_OPERATION',
    'STAR',
    'LINE',
    'ELLIPSE',
    'REGULAR_POLYGON',
    'RECTANGLE',
    'TEXT',
    'SLICE',
    'COMPONENT',
    'COMPONENT_SET',
    'INSTANCE',
  ];

  it('should have all Figma node types', () => {
    expect(nodeTypes).toHaveLength(16);
  });

  it('should include container types', () => {
    expect(nodeTypes).toContain('DOCUMENT');
    expect(nodeTypes).toContain('CANVAS');
    expect(nodeTypes).toContain('FRAME');
    expect(nodeTypes).toContain('GROUP');
  });

  it('should include shape types', () => {
    expect(nodeTypes).toContain('RECTANGLE');
    expect(nodeTypes).toContain('ELLIPSE');
    expect(nodeTypes).toContain('STAR');
    expect(nodeTypes).toContain('LINE');
  });

  it('should include component types', () => {
    expect(nodeTypes).toContain('COMPONENT');
    expect(nodeTypes).toContain('COMPONENT_SET');
    expect(nodeTypes).toContain('INSTANCE');
  });

  it('should include text type', () => {
    expect(nodeTypes).toContain('TEXT');
  });
});

// ============================================================================
// RGBA COLOR TESTS
// ============================================================================

describe('RGBA', () => {
  it('should create valid RGBA color', () => {
    const color: RGBA = { r: 0.5, g: 0.3, b: 0.8, a: 1 };
    expect(color.r).toBe(0.5);
    expect(color.g).toBe(0.3);
    expect(color.b).toBe(0.8);
    expect(color.a).toBe(1);
  });

  it('should support transparent colors', () => {
    const transparent: RGBA = { r: 1, g: 1, b: 1, a: 0 };
    expect(transparent.a).toBe(0);
  });

  it('should support semi-transparent colors', () => {
    const semiTransparent: RGBA = { r: 0, g: 0, b: 0, a: 0.5 };
    expect(semiTransparent.a).toBe(0.5);
  });

  it('should have values in 0-1 range', () => {
    const color: RGBA = { r: 0, g: 1, b: 0.5, a: 0.75 };
    expect(color.r).toBeGreaterThanOrEqual(0);
    expect(color.g).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// BOUNDING BOX TESTS
// ============================================================================

describe('BoundingBox', () => {
  it('should create bounding box with dimensions', () => {
    const box: BoundingBox = { x: 100, y: 200, width: 300, height: 400 };
    expect(box.width).toBe(300);
    expect(box.height).toBe(400);
  });

  it('should support position at origin', () => {
    const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
  });

  it('should support negative positions', () => {
    const box: BoundingBox = { x: -50, y: -25, width: 100, height: 100 };
    expect(box.x).toBeLessThan(0);
    expect(box.y).toBeLessThan(0);
  });
});

// ============================================================================
// CONSTRAINTS TESTS
// ============================================================================

describe('Constraints', () => {
  it('should create default constraints', () => {
    const constraints: Constraints = { vertical: 'TOP', horizontal: 'LEFT' };
    expect(constraints.vertical).toBe('TOP');
    expect(constraints.horizontal).toBe('LEFT');
  });

  it('should support centered constraints', () => {
    const constraints: Constraints = { vertical: 'CENTER', horizontal: 'CENTER' };
    expect(constraints.vertical).toBe('CENTER');
    expect(constraints.horizontal).toBe('CENTER');
  });

  it('should support stretch constraints', () => {
    const constraints: Constraints = { vertical: 'TOP_BOTTOM', horizontal: 'LEFT_RIGHT' };
    expect(constraints.vertical).toBe('TOP_BOTTOM');
    expect(constraints.horizontal).toBe('LEFT_RIGHT');
  });

  it('should support scale constraints', () => {
    const constraints: Constraints = { vertical: 'SCALE', horizontal: 'SCALE' };
    expect(constraints.vertical).toBe('SCALE');
    expect(constraints.horizontal).toBe('SCALE');
  });
});

// ============================================================================
// PAINT TESTS
// ============================================================================

describe('Paint', () => {
  it('should create solid fill', () => {
    const paint: Paint = {
      type: 'SOLID',
      visible: true,
      opacity: 1,
      color: { r: 1, g: 0, b: 0, a: 1 },
    };
    expect(paint.type).toBe('SOLID');
    expect(paint.color?.r).toBe(1);
  });

  it('should create gradient fill', () => {
    const paint: Paint = {
      type: 'GRADIENT_LINEAR',
      visible: true,
      gradientStops: [
        { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
      ],
    };
    expect(paint.type).toBe('GRADIENT_LINEAR');
    expect(paint.gradientStops).toHaveLength(2);
  });

  it('should create image fill', () => {
    const paint: Paint = {
      type: 'IMAGE',
      visible: true,
      opacity: 0.8,
    };
    expect(paint.type).toBe('IMAGE');
    expect(paint.opacity).toBe(0.8);
  });

  it('should support invisible paints', () => {
    const paint: Paint = {
      type: 'SOLID',
      visible: false,
      color: { r: 0, g: 0, b: 0, a: 1 },
    };
    expect(paint.visible).toBe(false);
  });
});

// ============================================================================
// EFFECT TESTS
// ============================================================================

describe('Effect', () => {
  it('should create drop shadow', () => {
    const effect: Effect = {
      type: 'DROP_SHADOW',
      visible: true,
      radius: 10,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 4 },
    };
    expect(effect.type).toBe('DROP_SHADOW');
    expect(effect.offset?.y).toBe(4);
  });

  it('should create inner shadow', () => {
    const effect: Effect = {
      type: 'INNER_SHADOW',
      visible: true,
      radius: 5,
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 2 },
    };
    expect(effect.type).toBe('INNER_SHADOW');
  });

  it('should create layer blur', () => {
    const effect: Effect = {
      type: 'LAYER_BLUR',
      visible: true,
      radius: 8,
    };
    expect(effect.type).toBe('LAYER_BLUR');
    expect(effect.radius).toBe(8);
  });

  it('should create background blur', () => {
    const effect: Effect = {
      type: 'BACKGROUND_BLUR',
      visible: true,
      radius: 20,
    };
    expect(effect.type).toBe('BACKGROUND_BLUR');
  });
});

// ============================================================================
// TYPE STYLE TESTS
// ============================================================================

describe('TypeStyle', () => {
  it('should create basic text style', () => {
    const style: TypeStyle = {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
    };
    expect(style.fontFamily).toBe('Inter');
    expect(style.fontSize).toBe(16);
  });

  it('should support full typography settings', () => {
    const style: TypeStyle = {
      fontFamily: 'Roboto',
      fontPostScriptName: 'Roboto-Bold',
      fontWeight: 700,
      fontSize: 24,
      lineHeightPx: 32,
      letterSpacing: 0.5,
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'CENTER',
    };
    expect(style.fontWeight).toBe(700);
    expect(style.letterSpacing).toBe(0.5);
    expect(style.textAlignHorizontal).toBe('CENTER');
  });

  it('should support different text alignments', () => {
    const alignments = ['LEFT', 'RIGHT', 'CENTER', 'JUSTIFIED'];
    alignments.forEach((align) => {
      const style: TypeStyle = {
        fontFamily: 'Arial',
        fontWeight: 400,
        fontSize: 14,
        textAlignHorizontal: align as TypeStyle['textAlignHorizontal'],
      };
      expect(style.textAlignHorizontal).toBe(align);
    });
  });
});

// ============================================================================
// FIGMA NODE TESTS
// ============================================================================

describe('FigmaNode', () => {
  it('should create basic node', () => {
    const node: FigmaNode = {
      id: 'node-123',
      name: 'Button',
      type: 'COMPONENT',
    };
    expect(node.id).toBe('node-123');
    expect(node.type).toBe('COMPONENT');
  });

  it('should support children', () => {
    const node: FigmaNode = {
      id: 'frame-1',
      name: 'Container',
      type: 'FRAME',
      children: [
        { id: 'child-1', name: 'Text', type: 'TEXT', characters: 'Hello' },
        { id: 'child-2', name: 'Icon', type: 'VECTOR' },
      ],
    };
    expect(node.children).toHaveLength(2);
    expect(node.children?.[0].characters).toBe('Hello');
  });

  it('should support auto layout', () => {
    const node: FigmaNode = {
      id: 'auto-layout',
      name: 'Stack',
      type: 'FRAME',
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
    };
    expect(node.layoutMode).toBe('VERTICAL');
    expect(node.itemSpacing).toBe(16);
  });

  it('should support corner radius', () => {
    const node: FigmaNode = {
      id: 'rounded',
      name: 'Card',
      type: 'RECTANGLE',
      cornerRadius: 8,
    };
    expect(node.cornerRadius).toBe(8);
  });

  it('should support fills and strokes', () => {
    const node: FigmaNode = {
      id: 'styled',
      name: 'Box',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
    };
    expect(node.fills).toHaveLength(1);
    expect(node.strokes).toHaveLength(1);
  });
});

// ============================================================================
// FIGMA FILE TESTS
// ============================================================================

describe('FigmaFile', () => {
  it('should create file structure', () => {
    const file: FigmaFile = {
      document: {
        id: 'doc',
        name: 'Document',
        type: 'DOCUMENT',
        children: [],
      },
      components: {},
      styles: {},
      name: 'My Design',
      lastModified: '2024-01-15T10:00:00Z',
      version: '1.0.0',
    };
    expect(file.name).toBe('My Design');
    expect(file.document.type).toBe('DOCUMENT');
  });

  it('should track components', () => {
    const file: FigmaFile = {
      document: { id: 'doc', name: 'Doc', type: 'DOCUMENT' },
      components: {
        'comp-1': { key: 'btn', name: 'Button', description: 'Primary button' },
        'comp-2': { key: 'inp', name: 'Input', description: 'Text input' },
      },
      styles: {},
      name: 'Design System',
      lastModified: '2024-01-15T10:00:00Z',
      version: '1.0.0',
    };
    expect(Object.keys(file.components)).toHaveLength(2);
    expect(file.components['comp-1'].name).toBe('Button');
  });

  it('should track styles', () => {
    const file: FigmaFile = {
      document: { id: 'doc', name: 'Doc', type: 'DOCUMENT' },
      components: {},
      styles: {
        'style-1': { key: 's1', name: 'Primary', styleType: 'FILL', description: 'Primary color' },
        'style-2': { key: 's2', name: 'Heading', styleType: 'TEXT', description: 'Heading text' },
      },
      name: 'Design System',
      lastModified: '2024-01-15T10:00:00Z',
      version: '1.0.0',
    };
    expect(file.styles['style-1'].styleType).toBe('FILL');
    expect(file.styles['style-2'].styleType).toBe('TEXT');
  });
});

// ============================================================================
// DESIGN TOKEN TESTS
// ============================================================================

describe('DesignToken', () => {
  it('should create color token', () => {
    const token: DesignToken = {
      name: 'primary',
      type: 'color',
      value: '#0066FF',
      figmaStyleId: 'style-123',
    };
    expect(token.type).toBe('color');
    expect(token.value).toBe('#0066FF');
  });

  it('should create spacing token', () => {
    const token: DesignToken = {
      name: 'spacing-md',
      type: 'spacing',
      value: 16,
    };
    expect(token.type).toBe('spacing');
    expect(token.value).toBe(16);
  });

  it('should create typography token', () => {
    const token: DesignToken = {
      name: 'heading-1',
      type: 'typography',
      value: {
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 40,
      },
    };
    expect(token.type).toBe('typography');
    expect((token.value as any).fontFamily).toBe('Inter');
  });

  it('should create shadow token', () => {
    const token: DesignToken = {
      name: 'shadow-lg',
      type: 'shadow',
      value: '0 10px 25px rgba(0,0,0,0.15)',
    };
    expect(token.type).toBe('shadow');
  });

  it('should create border radius token', () => {
    const token: DesignToken = {
      name: 'radius-md',
      type: 'borderRadius',
      value: 8,
    };
    expect(token.type).toBe('borderRadius');
  });
});

// ============================================================================
// ACCESSIBILITY ISSUE TESTS
// ============================================================================

describe('Accessibility Issues', () => {
  describe('ContrastIssue', () => {
    it('should track contrast issues', () => {
      const issue: ContrastIssue = {
        nodeId: 'text-1',
        nodeName: 'Button Label',
        foreground: '#888888',
        background: '#FFFFFF',
        ratio: 3.5,
        requiredRatio: 4.5,
        wcagLevel: 'AA',
      };
      expect(issue.ratio).toBeLessThan(issue.requiredRatio);
      expect(issue.wcagLevel).toBe('AA');
    });
  });

  describe('TouchTargetIssue', () => {
    it('should track touch target issues', () => {
      const issue: TouchTargetIssue = {
        nodeId: 'btn-1',
        nodeName: 'Small Button',
        currentSize: { width: 32, height: 32 },
        minimumSize: { width: 44, height: 44 },
      };
      expect(issue.currentSize.width).toBeLessThan(issue.minimumSize.width);
    });
  });

  describe('ColorBlindnessIssue', () => {
    it('should track color blindness issues', () => {
      const issue: ColorBlindnessIssue = {
        nodeId: 'status-1',
        nodeName: 'Status Indicator',
        type: 'deuteranopia',
        description: 'Red/green colors may be indistinguishable',
      };
      expect(issue.type).toBe('deuteranopia');
    });

    it('should support all color blindness types', () => {
      const types: ColorBlindnessIssue['type'][] = ['deuteranopia', 'protanopia', 'tritanopia'];
      types.forEach((type) => {
        const issue: ColorBlindnessIssue = {
          nodeId: 'node',
          nodeName: 'Test',
          type,
          description: `Issue with ${type}`,
        };
        expect(issue.type).toBe(type);
      });
    });
  });
});

// ============================================================================
// COMPONENT TYPE TESTS
// ============================================================================

describe('ComponentType', () => {
  const componentTypes: ComponentType[] = [
    'button',
    'input',
    'card',
    'navigation',
    'modal',
    'list',
    'table',
    'form',
    'hero',
    'footer',
    'header',
    'sidebar',
    'custom',
  ];

  it('should have all component types', () => {
    expect(componentTypes).toHaveLength(13);
  });

  it('should include interactive components', () => {
    expect(componentTypes).toContain('button');
    expect(componentTypes).toContain('input');
    expect(componentTypes).toContain('modal');
  });

  it('should include layout components', () => {
    expect(componentTypes).toContain('header');
    expect(componentTypes).toContain('footer');
    expect(componentTypes).toContain('sidebar');
  });

  it('should include content components', () => {
    expect(componentTypes).toContain('card');
    expect(componentTypes).toContain('list');
    expect(componentTypes).toContain('table');
  });
});

// ============================================================================
// SEMANTIC ROLE TESTS
// ============================================================================

describe('SemanticRole', () => {
  const roles: SemanticRole[] = [
    'primary-action',
    'secondary-action',
    'navigation',
    'content',
    'input',
    'feedback',
    'decoration',
  ];

  it('should have all semantic roles', () => {
    expect(roles).toHaveLength(7);
  });

  it('should include action roles', () => {
    expect(roles).toContain('primary-action');
    expect(roles).toContain('secondary-action');
  });

  it('should include structural roles', () => {
    expect(roles).toContain('navigation');
    expect(roles).toContain('content');
  });
});

// ============================================================================
// COMPONENT ANALYSIS TESTS
// ============================================================================

describe('ComponentAnalysis', () => {
  it('should create component analysis', () => {
    const analysis: ComponentAnalysis = {
      figmaId: 'comp-123',
      name: 'PrimaryButton',
      type: 'button',
      semanticRole: 'primary-action',
      variants: [
        { name: 'default', props: { size: 'md', variant: 'primary' }, figmaVariantId: 'v1' },
        { name: 'small', props: { size: 'sm', variant: 'primary' }, figmaVariantId: 'v2' },
      ],
      props: [
        {
          name: 'children',
          type: 'React.ReactNode',
          required: true,
          description: 'Button content',
        },
        { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
      ],
      accessibility: {
        role: 'button',
        ariaLabel: 'Submit',
        keyboardNavigation: true,
      },
      suggestedImplementation: {
        framework: 'react',
        customImplementation: 'export function PrimaryButton...',
        complexity: 'simple',
        estimatedLines: 25,
      },
    };
    expect(analysis.name).toBe('PrimaryButton');
    expect(analysis.variants).toHaveLength(2);
    expect(analysis.props).toHaveLength(2);
  });

  it('should support existing component match', () => {
    const analysis: ComponentAnalysis = {
      figmaId: 'comp-456',
      name: 'Button',
      type: 'button',
      semanticRole: 'primary-action',
      variants: [],
      props: [],
      accessibility: { role: 'button', keyboardNavigation: true },
      suggestedImplementation: {
        framework: 'react',
        existingComponent: '@shadcn/ui/button',
        customImplementation: '',
        complexity: 'simple',
        estimatedLines: 0,
      },
    };
    expect(analysis.suggestedImplementation.existingComponent).toBe('@shadcn/ui/button');
  });
});

// ============================================================================
// CODE GEN OPTIONS TESTS
// ============================================================================

describe('CodeGenOptions', () => {
  it('should create React options', () => {
    const options: CodeGenOptions = {
      framework: 'react',
      styling: 'tailwind',
      typescript: true,
      componentLibrary: 'shadcn',
      includeTests: true,
      includeStorybook: true,
    };
    expect(options.framework).toBe('react');
    expect(options.typescript).toBe(true);
  });

  it('should create Vue options', () => {
    const options: CodeGenOptions = {
      framework: 'vue',
      styling: 'css-modules',
      typescript: true,
      includeTests: true,
      includeStorybook: false,
    };
    expect(options.framework).toBe('vue');
    expect(options.styling).toBe('css-modules');
  });

  it('should support all frameworks', () => {
    const frameworks: CodeGenOptions['framework'][] = ['react', 'vue', 'svelte', 'html'];
    frameworks.forEach((framework) => {
      const options: CodeGenOptions = {
        framework,
        styling: 'tailwind',
        typescript: true,
        includeTests: false,
        includeStorybook: false,
      };
      expect(options.framework).toBe(framework);
    });
  });

  it('should support all styling options', () => {
    const styles: CodeGenOptions['styling'][] = [
      'tailwind',
      'css-modules',
      'styled-components',
      'emotion',
      'inline',
    ];
    styles.forEach((styling) => {
      const options: CodeGenOptions = {
        framework: 'react',
        styling,
        typescript: true,
        includeTests: false,
        includeStorybook: false,
      };
      expect(options.styling).toBe(styling);
    });
  });

  it('should support component libraries', () => {
    const libraries: NonNullable<CodeGenOptions['componentLibrary']>[] = [
      'shadcn',
      'radix',
      'chakra',
      'mantine',
      'custom',
    ];
    libraries.forEach((lib) => {
      const options: CodeGenOptions = {
        framework: 'react',
        styling: 'tailwind',
        typescript: true,
        componentLibrary: lib,
        includeTests: false,
        includeStorybook: false,
      };
      expect(options.componentLibrary).toBe(lib);
    });
  });
});

// ============================================================================
// GENERATED COMPONENT TESTS
// ============================================================================

describe('GeneratedComponent', () => {
  it('should create generated component', () => {
    const component: GeneratedComponent = {
      name: 'Button',
      code: 'export function Button() { return <button>Click</button>; }',
      types: 'export interface ButtonProps { children: React.ReactNode; }',
      styles: '.button { padding: 8px 16px; }',
      test: 'test("renders button", () => { ... })',
      story: 'export const Default = () => <Button>Click</Button>',
      dependencies: ['react'],
      qualityScore: 0.92,
      figmaSource: {
        fileId: 'file-123',
        nodeId: 'node-456',
        url: 'https://figma.com/...',
      },
    };
    expect(component.name).toBe('Button');
    expect(component.qualityScore).toBe(0.92);
    expect(component.dependencies).toContain('react');
  });

  it('should support minimal generated component', () => {
    const component: GeneratedComponent = {
      name: 'Divider',
      code: '<hr class="divider" />',
      dependencies: [],
      qualityScore: 1.0,
      figmaSource: {
        fileId: 'file-123',
        nodeId: 'node-789',
        url: 'https://figma.com/...',
      },
    };
    expect(component.types).toBeUndefined();
    expect(component.test).toBeUndefined();
  });
});

// ============================================================================
// GENERATION WARNING TESTS
// ============================================================================

describe('GenerationWarning', () => {
  it('should create accessibility warning', () => {
    const warning: GenerationWarning = {
      type: 'accessibility',
      severity: 'high',
      message: 'Missing alt text for image',
      componentName: 'Hero',
      autoFixAvailable: true,
    };
    expect(warning.type).toBe('accessibility');
    expect(warning.severity).toBe('high');
    expect(warning.autoFixAvailable).toBe(true);
  });

  it('should create performance warning', () => {
    const warning: GenerationWarning = {
      type: 'performance',
      severity: 'medium',
      message: 'Large image might affect load time',
      componentName: 'Gallery',
      autoFixAvailable: false,
    };
    expect(warning.type).toBe('performance');
  });

  it('should have all severity levels', () => {
    const severities: GenerationWarning['severity'][] = ['low', 'medium', 'high'];
    severities.forEach((severity) => {
      const warning: GenerationWarning = {
        type: 'compatibility',
        severity,
        message: 'Test warning',
        autoFixAvailable: false,
      };
      expect(warning.severity).toBe(severity);
    });
  });
});

// ============================================================================
// GENERATION SUGGESTION TESTS
// ============================================================================

describe('GenerationSuggestion', () => {
  it('should create optimization suggestion', () => {
    const suggestion: GenerationSuggestion = {
      type: 'optimization',
      message: 'Consider using memo() for expensive renders',
      componentName: 'DataTable',
      codeChange: {
        before: 'export function DataTable()',
        after: 'export const DataTable = memo(function DataTable())',
      },
    };
    expect(suggestion.type).toBe('optimization');
    expect(suggestion.codeChange?.before).toBeDefined();
  });

  it('should create best-practice suggestion', () => {
    const suggestion: GenerationSuggestion = {
      type: 'best-practice',
      message: 'Add displayName for debugging',
      componentName: 'Button',
    };
    expect(suggestion.type).toBe('best-practice');
  });

  it('should create alternative suggestion', () => {
    const suggestion: GenerationSuggestion = {
      type: 'alternative',
      message: 'Consider using shadcn Button instead',
    };
    expect(suggestion.type).toBe('alternative');
  });
});

// ============================================================================
// GENERATION RESULT TESTS
// ============================================================================

describe('GenerationResult', () => {
  it('should create complete generation result', () => {
    const result: GenerationResult = {
      components: [
        {
          name: 'Button',
          code: 'export function Button() {}',
          dependencies: ['react'],
          qualityScore: 0.95,
          figmaSource: { fileId: 'f1', nodeId: 'n1', url: 'https://...' },
        },
      ],
      sharedStyles: ':root { --primary: #0066FF; }',
      designTokens: 'export const tokens = { ... }',
      indexFile: 'export * from "./Button"',
      totalQualityScore: 0.95,
      warnings: [],
      suggestions: [],
    };
    expect(result.components).toHaveLength(1);
    expect(result.totalQualityScore).toBe(0.95);
    expect(result.warnings).toHaveLength(0);
  });

  it('should calculate average quality score', () => {
    const components: GeneratedComponent[] = [
      {
        name: 'A',
        code: '',
        dependencies: [],
        qualityScore: 0.8,
        figmaSource: { fileId: '', nodeId: '', url: '' },
      },
      {
        name: 'B',
        code: '',
        dependencies: [],
        qualityScore: 0.9,
        figmaSource: { fileId: '', nodeId: '', url: '' },
      },
      {
        name: 'C',
        code: '',
        dependencies: [],
        qualityScore: 1.0,
        figmaSource: { fileId: '', nodeId: '', url: '' },
      },
    ];
    const avgScore = components.reduce((sum, c) => sum + c.qualityScore, 0) / components.length;
    expect(avgScore).toBeCloseTo(0.9, 2);
  });
});
