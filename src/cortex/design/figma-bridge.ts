// @version 3.3.220
// TooLoo.ai Design Cortex - Figma Bridge
// Connects TooLoo to Figma for design-to-code intelligence

import { bus } from '../../core/event-bus.js';

/**
 * Figma API Types
 */
export interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  name: string;
  lastModified: string;
  version: string;
}

export interface FigmaNode {
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

export type FigmaNodeType =
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

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Constraints {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: RGBA;
  gradientStops?: GradientStop[];
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;
  offset?: { x: number; y: number };
}

export interface TypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

/**
 * TooLoo Design Context - Enhanced Figma understanding
 */
export interface DesignContext {
  file: FigmaFile;
  semanticAnalysis: SemanticAnalysis;
  designTokens: DesignToken[];
  componentMap: Map<string, ComponentAnalysis>;
}

export interface SemanticAnalysis {
  purpose: string;
  targetAudience: string;
  designStyle: string;
  colorScheme: 'light' | 'dark' | 'both';
  accessibility: AccessibilityAnalysis;
}

export interface AccessibilityAnalysis {
  contrastIssues: ContrastIssue[];
  touchTargetIssues: TouchTargetIssue[];
  colorBlindnessIssues: ColorBlindnessIssue[];
  overallScore: number;
}

export interface ContrastIssue {
  nodeId: string;
  nodeName: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  wcagLevel: 'AA' | 'AAA';
}

export interface TouchTargetIssue {
  nodeId: string;
  nodeName: string;
  currentSize: { width: number; height: number };
  minimumSize: { width: number; height: number };
}

export interface ColorBlindnessIssue {
  nodeId: string;
  nodeName: string;
  type: 'deuteranopia' | 'protanopia' | 'tritanopia';
  description: string;
}

export interface DesignToken {
  name: string;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'borderRadius';
  value: string | number | object;
  figmaStyleId?: string;
}

export interface ComponentAnalysis {
  figmaId: string;
  name: string;
  type: ComponentType;
  semanticRole: SemanticRole;
  variants: ComponentVariant[];
  props: InferredProp[];
  accessibility: ComponentAccessibility;
  suggestedImplementation: ImplementationSuggestion;
}

export type ComponentType =
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

export type SemanticRole =
  | 'primary-action'
  | 'secondary-action'
  | 'navigation'
  | 'content'
  | 'input'
  | 'feedback'
  | 'decoration';

export interface ComponentVariant {
  name: string;
  props: Record<string, string | boolean | number>;
  figmaVariantId: string;
}

export interface InferredProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

export interface ComponentAccessibility {
  role: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tabIndex?: number;
  keyboardNavigation: boolean;
}

export interface ImplementationSuggestion {
  framework: 'react' | 'vue' | 'svelte' | 'html';
  existingComponent?: string;
  customImplementation: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedLines: number;
}

/**
 * Figma Bridge - Connects TooLoo to Figma API
 */
export class FigmaBridge {
  private static instance: FigmaBridge;
  private accessToken: string | null = null;
  private baseUrl = 'https://api.figma.com/v1';

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): FigmaBridge {
    if (!this.instance) {
      this.instance = new FigmaBridge();
    }
    return this.instance;
  }

  /**
   * Initialize with Figma access token
   */
  initialize(accessToken: string): void {
    this.accessToken = accessToken;
    console.log('[Design Cortex] Figma Bridge initialized');
  }

  /**
   * Setup event bus listeners
   */
  private setupEventListeners(): void {
    bus.on('design:import', async (event) => {
      try {
        const { fileId, nodeIds } = event.payload;
        const result = await this.importDesign(fileId, nodeIds);
        bus.publish('cortex', 'design:imported', { result });
      } catch (error) {
        bus.publish('cortex', 'design:error', { error: String(error) });
      }
    });

    bus.on('design:analyze', async (event) => {
      try {
        const { fileId } = event.payload;
        const analysis = await this.analyzeDesign(fileId);
        bus.publish('cortex', 'design:analyzed', { analysis });
      } catch (error) {
        bus.publish('cortex', 'design:error', { error: String(error) });
      }
    });
  }

  /**
   * Fetch a Figma file
   */
  async getFile(fileId: string): Promise<FigmaFile> {
    if (!this.accessToken) {
      throw new Error('Figma access token not set');
    }

    const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get specific nodes from a file
   */
  async getNodes(fileId: string, nodeIds: string[]): Promise<Record<string, FigmaNode>> {
    if (!this.accessToken) {
      throw new Error('Figma access token not set');
    }

    const ids = nodeIds.join(',');
    const response = await fetch(`${this.baseUrl}/files/${fileId}/nodes?ids=${ids}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nodes;
  }

  /**
   * Get file styles
   */
  async getStyles(fileId: string): Promise<FigmaStyle[]> {
    if (!this.accessToken) {
      throw new Error('Figma access token not set');
    }

    const response = await fetch(`${this.baseUrl}/files/${fileId}/styles`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.meta.styles;
  }

  /**
   * Export node as image
   */
  async exportImage(
    fileId: string,
    nodeId: string,
    format: 'png' | 'svg' | 'jpg' = 'svg',
    scale: number = 2
  ): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Figma access token not set');
    }

    const response = await fetch(
      `${this.baseUrl}/images/${fileId}?ids=${nodeId}&format=${format}&scale=${scale}`,
      {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.images[nodeId];
  }

  /**
   * Import a design and create context
   */
  async importDesign(fileId: string, nodeIds?: string[]): Promise<DesignContext> {
    const file = await this.getFile(fileId);
    
    // Get specific nodes if provided
    const nodes = nodeIds 
      ? await this.getNodes(fileId, nodeIds)
      : { root: file.document };

    // Perform semantic analysis
    const semanticAnalysis = await this.performSemanticAnalysis(file, nodes);
    
    // Extract design tokens
    const designTokens = this.extractDesignTokens(file);
    
    // Analyze components
    const componentMap = await this.analyzeComponents(file, nodes);

    return {
      file,
      semanticAnalysis,
      designTokens,
      componentMap,
    };
  }

  /**
   * Analyze design semantically
   */
  private async performSemanticAnalysis(
    file: FigmaFile,
    nodes: Record<string, FigmaNode>
  ): Promise<SemanticAnalysis> {
    // TODO: Use TooLoo's AI to analyze design intent
    return {
      purpose: this.inferPurpose(file.name),
      targetAudience: 'general',
      designStyle: this.inferDesignStyle(nodes),
      colorScheme: this.inferColorScheme(nodes),
      accessibility: await this.analyzeAccessibility(nodes),
    };
  }

  /**
   * Infer purpose from file name and structure
   */
  private inferPurpose(fileName: string): string {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('dashboard')) return 'Analytics Dashboard';
    if (lowerName.includes('landing')) return 'Landing Page';
    if (lowerName.includes('mobile')) return 'Mobile Application';
    if (lowerName.includes('web') || lowerName.includes('app')) return 'Web Application';
    return 'Design System Component';
  }

  /**
   * Infer design style from visual patterns
   */
  private inferDesignStyle(nodes: Record<string, FigmaNode>): string {
    // Analyze corner radii, colors, and spacing
    // TODO: Implement visual pattern recognition
    return 'modern-minimal';
  }

  /**
   * Infer color scheme
   */
  private inferColorScheme(nodes: Record<string, FigmaNode>): 'light' | 'dark' | 'both' {
    // Analyze background colors
    // TODO: Implement color analysis
    return 'light';
  }

  /**
   * Analyze accessibility
   */
  private async analyzeAccessibility(
    nodes: Record<string, FigmaNode>
  ): Promise<AccessibilityAnalysis> {
    const contrastIssues: ContrastIssue[] = [];
    const touchTargetIssues: TouchTargetIssue[] = [];
    const colorBlindnessIssues: ColorBlindnessIssue[] = [];

    // TODO: Implement accessibility analysis
    // - Check color contrast
    // - Check touch target sizes
    // - Simulate color blindness

    const totalIssues = contrastIssues.length + touchTargetIssues.length + colorBlindnessIssues.length;
    const overallScore = totalIssues === 0 ? 100 : Math.max(0, 100 - totalIssues * 5);

    return {
      contrastIssues,
      touchTargetIssues,
      colorBlindnessIssues,
      overallScore,
    };
  }

  /**
   * Extract design tokens from Figma styles
   */
  private extractDesignTokens(file: FigmaFile): DesignToken[] {
    const tokens: DesignToken[] = [];

    for (const [key, style] of Object.entries(file.styles)) {
      tokens.push({
        name: style.name,
        type: this.styleTypeToTokenType(style.styleType),
        value: key, // Would need to fetch actual value
        figmaStyleId: style.key,
      });
    }

    return tokens;
  }

  /**
   * Convert Figma style type to token type
   */
  private styleTypeToTokenType(styleType: string): DesignToken['type'] {
    switch (styleType) {
      case 'FILL':
        return 'color';
      case 'TEXT':
        return 'typography';
      case 'EFFECT':
        return 'shadow';
      default:
        return 'color';
    }
  }

  /**
   * Analyze components in the design
   */
  private async analyzeComponents(
    file: FigmaFile,
    nodes: Record<string, FigmaNode>
  ): Promise<Map<string, ComponentAnalysis>> {
    const componentMap = new Map<string, ComponentAnalysis>();

    for (const [key, component] of Object.entries(file.components)) {
      const analysis = await this.analyzeComponent(component, nodes);
      componentMap.set(key, analysis);
    }

    return componentMap;
  }

  /**
   * Analyze a single component
   */
  private async analyzeComponent(
    component: FigmaComponent,
    nodes: Record<string, FigmaNode>
  ): Promise<ComponentAnalysis> {
    const type = this.inferComponentType(component.name);
    const role = this.inferSemanticRole(type);

    return {
      figmaId: component.key,
      name: component.name,
      type,
      semanticRole: role,
      variants: [], // Would extract from component set
      props: this.inferProps(component, type),
      accessibility: this.getDefaultAccessibility(type),
      suggestedImplementation: {
        framework: 'react',
        customImplementation: this.generateImplementationSkeleton(component.name, type),
        complexity: 'moderate',
        estimatedLines: 50,
      },
    };
  }

  /**
   * Infer component type from name
   */
  private inferComponentType(name: string): ComponentType {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('button') || lowerName.includes('btn')) return 'button';
    if (lowerName.includes('input') || lowerName.includes('field') || lowerName.includes('text')) return 'input';
    if (lowerName.includes('card')) return 'card';
    if (lowerName.includes('nav') || lowerName.includes('menu')) return 'navigation';
    if (lowerName.includes('modal') || lowerName.includes('dialog')) return 'modal';
    if (lowerName.includes('list')) return 'list';
    if (lowerName.includes('table')) return 'table';
    if (lowerName.includes('form')) return 'form';
    if (lowerName.includes('hero')) return 'hero';
    if (lowerName.includes('footer')) return 'footer';
    if (lowerName.includes('header')) return 'header';
    if (lowerName.includes('sidebar')) return 'sidebar';
    return 'custom';
  }

  /**
   * Infer semantic role from component type
   */
  private inferSemanticRole(type: ComponentType): SemanticRole {
    switch (type) {
      case 'button':
        return 'primary-action';
      case 'navigation':
      case 'header':
      case 'sidebar':
        return 'navigation';
      case 'input':
      case 'form':
        return 'input';
      case 'card':
      case 'list':
      case 'table':
      case 'hero':
        return 'content';
      case 'modal':
        return 'feedback';
      default:
        return 'content';
    }
  }

  /**
   * Infer props for a component
   */
  private inferProps(component: FigmaComponent, type: ComponentType): InferredProp[] {
    const commonProps: InferredProp[] = [
      { name: 'className', type: 'string', required: false, description: 'Additional CSS classes' },
    ];

    switch (type) {
      case 'button':
        return [
          ...commonProps,
          { name: 'children', type: 'React.ReactNode', required: true, description: 'Button content' },
          { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
          { name: 'disabled', type: 'boolean', required: false, defaultValue: false, description: 'Disabled state' },
          { name: 'variant', type: "'primary' | 'secondary' | 'ghost'", required: false, defaultValue: 'primary', description: 'Button style variant' },
        ];
      case 'input':
        return [
          ...commonProps,
          { name: 'value', type: 'string', required: false, description: 'Input value' },
          { name: 'onChange', type: '(e: ChangeEvent) => void', required: false, description: 'Change handler' },
          { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
          { name: 'label', type: 'string', required: false, description: 'Input label' },
        ];
      case 'card':
        return [
          ...commonProps,
          { name: 'children', type: 'React.ReactNode', required: true, description: 'Card content' },
          { name: 'title', type: 'string', required: false, description: 'Card title' },
          { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
        ];
      default:
        return [
          ...commonProps,
          { name: 'children', type: 'React.ReactNode', required: false, description: 'Component content' },
        ];
    }
  }

  /**
   * Get default accessibility settings
   */
  private getDefaultAccessibility(type: ComponentType): ComponentAccessibility {
    switch (type) {
      case 'button':
        return {
          role: 'button',
          tabIndex: 0,
          keyboardNavigation: true,
        };
      case 'input':
        return {
          role: 'textbox',
          tabIndex: 0,
          keyboardNavigation: true,
        };
      case 'navigation':
        return {
          role: 'navigation',
          tabIndex: -1,
          keyboardNavigation: true,
        };
      case 'modal':
        return {
          role: 'dialog',
          ariaLabel: 'Dialog',
          tabIndex: -1,
          keyboardNavigation: true,
        };
      default:
        return {
          role: 'region',
          tabIndex: -1,
          keyboardNavigation: false,
        };
    }
  }

  /**
   * Generate implementation skeleton
   */
  private generateImplementationSkeleton(name: string, type: ComponentType): string {
    const pascalName = name.replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    return `export const ${pascalName}: React.FC<${pascalName}Props> = (props) => {
  // TODO: Implement ${type} component
  return <div>{/* ${name} */}</div>;
};`;
  }

  /**
   * Full design analysis
   */
  async analyzeDesign(fileId: string): Promise<DesignContext> {
    return this.importDesign(fileId);
  }

  /**
   * Parse Figma URL to extract file ID and node IDs
   */
  static parseUrl(url: string): { fileId: string; nodeIds?: string[] } {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/file\/([^/]+)/);
    
    if (!pathMatch || !pathMatch[1]) {
      throw new Error('Invalid Figma URL');
    }

    const fileId = pathMatch[1];
    const nodeIdParam = urlObj.searchParams.get('node-id');
    const nodeIds = nodeIdParam ? [nodeIdParam.replace('-', ':')] : undefined;

    return { fileId, nodeIds };
  }
}

// Export singleton
export const figmaBridge = FigmaBridge.getInstance();
