// @version 3.3.163
// TooLoo.ai Visual Cortex 2.0
// Enhanced Design Engine - Central orchestrator for visual generation
// Unifies SVG Generation, Animation, Data Visualization, and Design System

import { bus } from '../../core/event-bus.js';
import {
  animationEngine,
  AnimationEngine,
  ANIMATION_PRESETS,
  EASING_CURVES,
  TIMING_PRESETS,
} from '../creative/animation-engine.js';
import {
  dataVizEngine,
  DataVizEngine,
  DataPoint,
  DataSeries,
  ChartOptions,
  CHART_PALETTES,
} from '../creative/data-viz-engine.js';
import {
  svgGenerationEngine,
  SVGGenerationEngine,
  SVGBuilder,
} from '../creative/svg-generation-engine.js';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// DESIGN SYSTEM TYPES
// ============================================================================

export interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    border: {
      default: string;
      focus: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  typography: {
    fontFamily: {
      sans: string;
      serif: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    glow: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  zIndex: {
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    tooltip: number;
  };
  accessibility: {
    focusRingColor: string;
    focusRingWidth: string;
    focusRingOffset: string;
    minTouchTarget: string;
    reducedMotion: boolean;
  };
}

export interface ComponentSpec {
  name: string;
  description: string;
  variants: string[];
  sizes: string[];
  states: string[];
  props: Record<string, { type: string; default?: unknown; description: string }>;
}

export interface DesignSystem {
  tokens: DesignTokens;
  components: ComponentSpec[];
  version: string;
  lastUpdated: string;
}

// ============================================================================
// VISUAL CORTEX 2.0 REQUEST/RESPONSE TYPES
// ============================================================================

export type VisualCortex2RequestType =
  | 'svg'
  | 'chart'
  | 'animation'
  | 'component'
  | 'diagram'
  | 'infographic';

export interface VisualCortex2Request {
  type: VisualCortex2RequestType;
  subtype?: string;
  data?: unknown;
  options?: Record<string, unknown>;
  style?: {
    theme?: 'dark' | 'light' | 'vibrant' | 'minimal';
    animate?: boolean;
    responsive?: boolean;
  };
}

export interface VisualCortex2Response {
  success: boolean;
  svg?: string;
  css?: string;
  animation?: string;
  metadata?: {
    width: number;
    height: number;
    type: string;
    elements: number;
    animated: boolean;
  };
  error?: string;
}

// ============================================================================
// VISUAL CORTEX 2.0 CLASS
// ============================================================================

/**
 * VisualCortex2 - Enhanced Design Engine
 *
 * The central orchestrator for all visual generation in TooLoo.ai
 * Integrates four core modules:
 *
 * 1. SVG Generation Engine - Programmatic SVG building
 * 2. Animation Engine - Motion design system
 * 3. Data Viz Engine - Charts and graphs
 * 4. Design System - Tokens and components
 */
export class VisualCortex2 {
  private static instance: VisualCortex2;

  // Sub-engines
  public readonly svg: SVGGenerationEngine;
  public readonly animation: AnimationEngine;
  public readonly dataViz: DataVizEngine;

  // Design system
  private designSystem: DesignSystem | null = null;
  private designSystemPath: string;

  // Presets and themes
  public readonly palettes = CHART_PALETTES;
  public readonly easings = EASING_CURVES;
  public readonly timings = TIMING_PRESETS;
  public readonly animations = ANIMATION_PRESETS;

  static getInstance(): VisualCortex2 {
    if (!this.instance) {
      this.instance = new VisualCortex2();
    }
    return this.instance;
  }

  constructor() {
    // Initialize sub-engines
    this.svg = svgGenerationEngine;
    this.animation = animationEngine;
    this.dataViz = dataVizEngine;

    // Set design system path
    this.designSystemPath = path.resolve(process.cwd(), 'data/design-system.json');

    // Load design system
    this.loadDesignSystem().catch(console.error);

    // Subscribe to visual cortex events
    bus.on('cortex:visual2_request', async (event) => {
      try {
        const result = await this.generate(event.payload as VisualCortex2Request);
        bus.publish('cortex', 'cortex:visual2_response', {
          ...result,
          requestId: event.payload?.requestId,
        });
      } catch (error) {
        bus.publish('cortex', 'cortex:visual2_error', {
          error: error instanceof Error ? error.message : 'Visual generation failed',
          requestId: event.payload?.requestId,
        });
      }
    });

    console.log('🧠 Visual Cortex 2.0 Enhanced Design Engine initialized');
  }

  // -------------------------------------------------------------------------
  // DESIGN SYSTEM MANAGEMENT
  // -------------------------------------------------------------------------

  /**
   * Load design system from file
   */
  async loadDesignSystem(): Promise<DesignSystem> {
    try {
      const data = await fs.readFile(this.designSystemPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Merge with defaults if needed
      this.designSystem = this.mergeWithDefaults(parsed);
      return this.designSystem;
    } catch {
      // Return defaults if file doesn't exist
      this.designSystem = this.getDefaultDesignSystem();
      return this.designSystem;
    }
  }

  /**
   * Save design system to file
   */
  async saveDesignSystem(system?: DesignSystem): Promise<void> {
    const toSave = system || this.designSystem;
    if (!toSave) return;

    toSave.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.designSystemPath, JSON.stringify(toSave, null, 2));
    this.designSystem = toSave;
  }

  /**
   * Get current design system
   */
  getDesignSystem(): DesignSystem {
    return this.designSystem || this.getDefaultDesignSystem();
  }

  /**
   * Get design tokens
   */
  getTokens(): DesignTokens {
    return this.getDesignSystem().tokens;
  }

  /**
   * Update design tokens
   */
  async updateTokens(updates: Partial<DesignTokens>): Promise<DesignTokens> {
    const system = this.getDesignSystem();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    system.tokens = this.deepMerge(system.tokens as any, updates as any) as unknown as DesignTokens;
    await this.saveDesignSystem(system);
    return system.tokens;
  }

  /**
   * Get default design system
   */
  private getDefaultDesignSystem(): DesignSystem {
    return {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      tokens: {
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
          background: {
            primary: '#0f0f1a',
            secondary: '#1e1e2f',
            tertiary: '#2d2d4a',
          },
          text: {
            primary: '#ffffff',
            secondary: '#e2e8f0',
            muted: '#94a3b8',
            inverse: '#0f172a',
          },
          border: {
            default: '#334155',
            focus: '#6366f1',
          },
        },
        spacing: {
          xs: '0.25rem',
          sm: '0.5rem',
          md: '1rem',
          lg: '1.5rem',
          xl: '2rem',
          '2xl': '3rem',
          '3xl': '4rem',
        },
        typography: {
          fontFamily: {
            sans: 'Inter, system-ui, -apple-system, sans-serif',
            serif: 'Georgia, Cambria, serif',
            mono: 'JetBrains Mono, Menlo, Monaco, monospace',
          },
          fontSize: {
            xs: '0.75rem',
            sm: '0.875rem',
            base: '1rem',
            lg: '1.125rem',
            xl: '1.25rem',
            '2xl': '1.5rem',
            '3xl': '1.875rem',
            '4xl': '2.25rem',
          },
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
          },
          lineHeight: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
          },
        },
        borderRadius: {
          none: '0',
          sm: '0.25rem',
          md: '0.5rem',
          lg: '0.75rem',
          xl: '1rem',
          full: '9999px',
        },
        shadows: {
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          glow: '0 0 20px rgb(99 102 241 / 0.4)',
        },
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
        zIndex: {
          dropdown: 1000,
          sticky: 1100,
          fixed: 1200,
          modal: 1300,
          tooltip: 1400,
        },
        accessibility: {
          focusRingColor: '#6366f1',
          focusRingWidth: '2px',
          focusRingOffset: '2px',
          minTouchTarget: '44px',
          reducedMotion: false,
        },
      },
      components: [
        {
          name: 'Button',
          description: 'Interactive button component',
          variants: ['solid', 'outline', 'ghost', 'link'],
          sizes: ['sm', 'md', 'lg'],
          states: ['default', 'hover', 'active', 'disabled', 'loading'],
          props: {
            variant: { type: 'string', default: 'solid', description: 'Visual style variant' },
            size: { type: 'string', default: 'md', description: 'Button size' },
            disabled: { type: 'boolean', default: false, description: 'Disabled state' },
            loading: { type: 'boolean', default: false, description: 'Loading state' },
          },
        },
        {
          name: 'Card',
          description: 'Container card component',
          variants: ['elevated', 'outlined', 'filled'],
          sizes: ['sm', 'md', 'lg'],
          states: ['default', 'hover', 'selected'],
          props: {
            variant: { type: 'string', default: 'elevated', description: 'Visual style variant' },
            padding: { type: 'string', default: 'md', description: 'Internal padding' },
            interactive: { type: 'boolean', default: false, description: 'Hover effects' },
          },
        },
        {
          name: 'Badge',
          description: 'Label badge component',
          variants: ['solid', 'outline', 'subtle'],
          sizes: ['sm', 'md', 'lg'],
          states: ['default'],
          props: {
            color: { type: 'string', default: 'primary', description: 'Badge color' },
            size: { type: 'string', default: 'md', description: 'Badge size' },
          },
        },
        {
          name: 'Input',
          description: 'Text input component',
          variants: ['outline', 'filled', 'flushed'],
          sizes: ['sm', 'md', 'lg'],
          states: ['default', 'focus', 'error', 'disabled'],
          props: {
            variant: { type: 'string', default: 'outline', description: 'Visual style variant' },
            size: { type: 'string', default: 'md', description: 'Input size' },
            error: { type: 'boolean', default: false, description: 'Error state' },
          },
        },
      ],
    };
  }

  /**
   * Merge with defaults
   */
  private mergeWithDefaults(parsed: Partial<DesignSystem>): DesignSystem {
    const defaults = this.getDefaultDesignSystem();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.deepMerge(defaults as any, parsed as any) as unknown as DesignSystem;
  }

  /**
   * Deep merge utility
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (target[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // UNIFIED GENERATION API
  // -------------------------------------------------------------------------

  /**
   * Generate visual output based on request
   */
  async generate(request: VisualCortex2Request): Promise<VisualCortex2Response> {
    const theme = request.style?.theme || 'dark';
    const animate = request.style?.animate !== false;

    try {
      switch (request.type) {
        case 'svg':
          return this.generateSVG(request);

        case 'chart':
          return this.generateChart(request, theme, animate);

        case 'animation':
          return this.generateAnimation(request);

        case 'component':
          return this.generateComponent(request);

        case 'diagram':
          return this.generateDiagram(request, theme, animate);

        case 'infographic':
          return this.generateInfographic(request, theme, animate);

        default:
          return { success: false, error: `Unknown request type: ${request.type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      };
    }
  }

  /**
   * Generate SVG
   */
  private generateSVG(request: VisualCortex2Request): VisualCortex2Response {
    const subtype = request.subtype || 'background';
    const options = request.options || {};

    let svg: string;

    switch (subtype) {
      case 'background':
        svg = this.svg.createBackground(options as Parameters<typeof this.svg.createBackground>[0]);
        break;

      case 'card':
        svg = this.svg.createCard(options as Parameters<typeof this.svg.createCard>[0]);
        break;

      case 'badge':
        svg = this.svg.createBadge(options as Parameters<typeof this.svg.createBadge>[0]);
        break;

      case 'icon':
        svg = this.svg.createIcon(options as Parameters<typeof this.svg.createIcon>[0]);
        break;

      case 'custom':
        // Allow passing a builder callback
        const width = (options['width'] as number) || 800;
        const height = (options['height'] as number) || 600;
        const builder = this.svg.create(width, height);
        svg = builder.build();
        break;

      default:
        return { success: false, error: `Unknown SVG subtype: ${subtype}` };
    }

    return {
      success: true,
      svg,
      metadata: {
        width: (request.options?.['width'] as number) || 800,
        height: (request.options?.['height'] as number) || 600,
        type: `svg-${subtype}`,
        elements: 1,
        animated: false,
      },
    };
  }

  /**
   * Generate chart
   */
  private generateChart(
    request: VisualCortex2Request,
    theme: string,
    animate: boolean
  ): VisualCortex2Response {
    const subtype = request.subtype || 'bar';
    const data = request.data;
    const options: ChartOptions = {
      ...(request.options as ChartOptions),
      theme: theme as ChartOptions['theme'],
      animate,
    };

    let svg: string;

    switch (subtype) {
      case 'bar':
        svg = this.dataViz.generateBarChart(data as DataPoint[], options);
        break;

      case 'line':
        svg = this.dataViz.generateLineChart(data as DataSeries[], options);
        break;

      case 'pie':
      case 'donut':
        svg = this.dataViz.generatePieChart(data as DataPoint[], {
          ...options,
          donut: subtype === 'donut',
        });
        break;

      case 'gauge':
        svg = this.dataViz.generateGauge((data as { value: number }).value || 0, options);
        break;

      case 'sparkline':
        svg = this.dataViz.generateSparkline(data as number[], request.options);
        break;

      default:
        return { success: false, error: `Unknown chart subtype: ${subtype}` };
    }

    return {
      success: true,
      svg,
      metadata: {
        width: options.width || 800,
        height: options.height || 500,
        type: `chart-${subtype}`,
        elements: Array.isArray(data) ? data.length : 1,
        animated: animate,
      },
    };
  }

  /**
   * Generate animation
   */
  private generateAnimation(request: VisualCortex2Request): VisualCortex2Response {
    const subtype = request.subtype || 'css';
    const presetName = request.options?.['preset'] as keyof typeof ANIMATION_PRESETS | undefined;

    if (!presetName || !ANIMATION_PRESETS[presetName]) {
      return { success: false, error: `Unknown animation preset: ${presetName}` };
    }

    const preset = this.animation.getPreset(presetName);

    if (subtype === 'css') {
      const keyframes = this.animation.toCSSKeyframes(preset);
      const animation = this.animation.toCSSAnimation(preset);

      return {
        success: true,
        css: `${keyframes}\n\n.animated { ${animation} }`,
        animation: animation,
        metadata: {
          width: 0,
          height: 0,
          type: `animation-${presetName}`,
          elements: 0,
          animated: true,
        },
      };
    }

    if (subtype === 'svg') {
      const svgAnimate = this.animation.generateSVGAnimate({
        attributeName: 'opacity',
        from: '0',
        to: '1',
        dur: `${preset.duration}ms`,
        fill: 'freeze',
      });

      return {
        success: true,
        animation: svgAnimate,
        metadata: {
          width: 0,
          height: 0,
          type: `animation-svg-${presetName}`,
          elements: 0,
          animated: true,
        },
      };
    }

    return { success: false, error: `Unknown animation subtype: ${subtype}` };
  }

  /**
   * Generate component
   */
  private generateComponent(request: VisualCortex2Request): VisualCortex2Response {
    const componentName = request.subtype || 'card';
    const options = request.options || {};

    // Use SVG generation engine for components
    switch (componentName) {
      case 'card':
        return {
          success: true,
          svg: this.svg.createCard(options as Parameters<typeof this.svg.createCard>[0]),
          metadata: {
            width: (options['width'] as number) || 300,
            height: (options['height'] as number) || 180,
            type: 'component-card',
            elements: 1,
            animated: false,
          },
        };

      case 'badge':
        return {
          success: true,
          svg: this.svg.createBadge(options as Parameters<typeof this.svg.createBadge>[0]),
          metadata: {
            width: 100,
            height: 26,
            type: 'component-badge',
            elements: 1,
            animated: false,
          },
        };

      default:
        return { success: false, error: `Unknown component: ${componentName}` };
    }
  }

  /**
   * Generate diagram (placeholder for future expansion)
   */
  private generateDiagram(
    request: VisualCortex2Request,
    theme: string,
    animate: boolean
  ): VisualCortex2Response {
    // This could be expanded to generate flow diagrams, architecture diagrams, etc.
    const tokens = this.getTokens();
    const builder = this.svg.create(800, 600);

    // Create a simple placeholder diagram
    builder
      .addPresetGradient('bgGrad', 'midnight', 'diagonal')
      .addFilter({ id: 'glow', type: 'neon', color: tokens.colors.primary, intensity: 0.8 })
      .rect(0, 0, 800, 600, { fill: 'url(#bgGrad)', rx: 20 })
      .text('Diagram Generation', 400, 300, {
        fill: tokens.colors.text.primary,
        fontSize: 24,
        fontWeight: 600,
        textAnchor: 'middle',
        fontFamily: tokens.typography.fontFamily.sans,
      });

    return {
      success: true,
      svg: builder.build(),
      metadata: {
        width: 800,
        height: 600,
        type: 'diagram',
        elements: 2,
        animated: animate,
      },
    };
  }

  /**
   * Generate infographic (placeholder for future expansion)
   */
  private generateInfographic(
    request: VisualCortex2Request,
    theme: string,
    animate: boolean
  ): VisualCortex2Response {
    // This could combine multiple charts and text into an infographic
    return this.generateDiagram(request, theme, animate);
  }

  // -------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // -------------------------------------------------------------------------

  /**
   * Quick bar chart generation
   */
  barChart(data: DataPoint[], options?: ChartOptions): string {
    return this.dataViz.generateBarChart(data, options);
  }

  /**
   * Quick line chart generation
   */
  lineChart(series: DataSeries[], options?: ChartOptions): string {
    return this.dataViz.generateLineChart(series, options);
  }

  /**
   * Quick pie chart generation
   */
  pieChart(data: DataPoint[], options?: ChartOptions): string {
    return this.dataViz.generatePieChart(data, options);
  }

  /**
   * Quick gauge generation
   */
  gauge(value: number, options?: ChartOptions): string {
    return this.dataViz.generateGauge(value, options);
  }

  /**
   * Quick sparkline generation
   */
  sparkline(
    values: number[],
    options?: { width?: number; height?: number; color?: string }
  ): string {
    return this.dataViz.generateSparkline(values, options);
  }

  /**
   * Create SVG builder
   */
  createSVG(width?: number, height?: number): SVGBuilder {
    return this.svg.create(width, height);
  }

  /**
   * Get CSS animation
   */
  getCSSAnimation(preset: keyof typeof ANIMATION_PRESETS): string {
    return this.animation.toCSSAnimation(this.animation.getPreset(preset));
  }

  /**
   * Get system status
   */
  getStatus(): {
    initialized: boolean;
    modules: string[];
    designSystemVersion: string;
    tokenCategories: string[];
    componentCount: number;
  } {
    const system = this.getDesignSystem();

    return {
      initialized: true,
      modules: ['SVG Generation', 'Animation', 'Data Visualization', 'Design System'],
      designSystemVersion: system.version,
      tokenCategories: Object.keys(system.tokens),
      componentCount: system.components.length,
    };
  }
}

// Export singleton instance
export const visualCortex2 = VisualCortex2.getInstance();

// Re-export sub-engines for direct access
export { animationEngine, dataVizEngine, svgGenerationEngine };

// Re-export types
export type { DataPoint, DataSeries, ChartOptions, SVGBuilder };

export default visualCortex2;
