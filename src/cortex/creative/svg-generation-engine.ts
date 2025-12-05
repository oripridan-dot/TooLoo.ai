// @version 3.3.160
// TooLoo.ai SVG Generation Engine
// Programmatic SVG building utilities for Visual Cortex 2.0
// Creates professional-grade SVG with gradients, filters, patterns, and animations

import { bus } from '../../core/event-bus.js';
import { animationEngine, SVGAnimateSpec } from './animation-engine.js';

// ============================================================================
// SVG ELEMENT TYPES
// ============================================================================

export interface SVGElement {
  tag: string;
  attrs: Record<string, string | number>;
  children?: (SVGElement | string)[];
  animation?: SVGAnimateSpec | SVGAnimateSpec[];
}

export interface GradientStop {
  offset: string | number;
  color: string;
  opacity?: number;
}

export interface LinearGradientSpec {
  id: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  stops: GradientStop[];
}

export interface RadialGradientSpec {
  id: string;
  cx?: string;
  cy?: string;
  r?: string;
  fx?: string;
  fy?: string;
  stops: GradientStop[];
}

export interface FilterSpec {
  id: string;
  type: 'glow' | 'shadow' | 'blur' | 'dropShadow' | 'innerShadow' | 'neon' | 'custom';
  color?: string;
  intensity?: number;
  spread?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface PatternSpec {
  id: string;
  type: 'grid' | 'dots' | 'lines' | 'crosshatch' | 'waves' | 'hexagons' | 'custom';
  size?: number;
  color?: string;
  backgroundColor?: string;
  strokeWidth?: number;
}

export interface PathCommand {
  type: 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z';
  args: number[];
}

// ============================================================================
// SVG BUILDER CLASS
// ============================================================================

/**
 * SVGBuilder - Fluent API for constructing SVG documents
 */
export class SVGBuilder {
  private width: number;
  private height: number;
  private viewBox: string;
  private defs: string[] = [];
  private elements: string[] = [];
  private styles: string[] = [];

  constructor(width: number = 800, height: number = 600) {
    this.width = width;
    this.height = height;
    this.viewBox = `0 0 ${width} ${height}`;
  }

  /**
   * Set custom viewBox
   */
  setViewBox(minX: number, minY: number, width: number, height: number): this {
    this.viewBox = `${minX} ${minY} ${width} ${height}`;
    return this;
  }

  // -------------------------------------------------------------------------
  // GRADIENTS
  // -------------------------------------------------------------------------

  /**
   * Add a linear gradient to defs
   */
  addLinearGradient(spec: LinearGradientSpec): this {
    const { id, x1 = '0%', y1 = '0%', x2 = '0%', y2 = '100%', stops } = spec;

    const stopsMarkup = stops
      .map((stop) => {
        const offset = typeof stop.offset === 'number' ? `${stop.offset}%` : stop.offset;
        const opacity = stop.opacity !== undefined ? `;stop-opacity:${stop.opacity}` : '';
        return `<stop offset="${offset}" style="stop-color:${stop.color}${opacity}"/>`;
      })
      .join('\n      ');

    this.defs.push(`
    <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      ${stopsMarkup}
    </linearGradient>`);

    return this;
  }

  /**
   * Add a radial gradient to defs
   */
  addRadialGradient(spec: RadialGradientSpec): this {
    const { id, cx = '50%', cy = '50%', r = '50%', fx, fy, stops } = spec;

    const fxAttr = fx ? ` fx="${fx}"` : '';
    const fyAttr = fy ? ` fy="${fy}"` : '';

    const stopsMarkup = stops
      .map((stop) => {
        const offset = typeof stop.offset === 'number' ? `${stop.offset}%` : stop.offset;
        const opacity = stop.opacity !== undefined ? `;stop-opacity:${stop.opacity}` : '';
        return `<stop offset="${offset}" style="stop-color:${stop.color}${opacity}"/>`;
      })
      .join('\n      ');

    this.defs.push(`
    <radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fxAttr}${fyAttr}>
      ${stopsMarkup}
    </radialGradient>`);

    return this;
  }

  /**
   * Add a preset gradient
   */
  addPresetGradient(
    id: string,
    preset: 'purple' | 'sunset' | 'ocean' | 'forest' | 'fire' | 'neon' | 'midnight',
    direction: 'vertical' | 'horizontal' | 'diagonal' = 'vertical'
  ): this {
    const presets: Record<string, GradientStop[]> = {
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

    const directionCoords = {
      vertical: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
      horizontal: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
      diagonal: { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
    };

    return this.addLinearGradient({
      id,
      ...directionCoords[direction],
      stops: presets[preset],
    });
  }

  // -------------------------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------------------------

  /**
   * Add a filter effect to defs
   */
  addFilter(spec: FilterSpec): this {
    const { id, type, color = '#000000', intensity = 1, spread = 4, offsetX = 0, offsetY = 4 } = spec;

    let filterContent: string;

    switch (type) {
      case 'glow':
        filterContent = `
      <feGaussianBlur in="SourceAlpha" stdDeviation="${spread}" result="blur"/>
      <feFlood flood-color="${color}" flood-opacity="${intensity * 0.6}" result="glowColor"/>
      <feComposite in="glowColor" in2="blur" operator="in" result="softGlow"/>
      <feMerge>
        <feMergeNode in="softGlow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>`;
        break;

      case 'shadow':
        filterContent = `
      <feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${spread}" flood-color="${color}" flood-opacity="${intensity * 0.3}"/>`;
        break;

      case 'dropShadow':
        filterContent = `
      <feDropShadow dx="${offsetX}" dy="${offsetY}" stdDeviation="${spread}" flood-color="${color}" flood-opacity="${intensity * 0.4}"/>
      <feDropShadow dx="${offsetX / 2}" dy="${offsetY / 2}" stdDeviation="${spread / 2}" flood-color="${color}" flood-opacity="${intensity * 0.3}"/>`;
        break;

      case 'blur':
        filterContent = `
      <feGaussianBlur in="SourceGraphic" stdDeviation="${spread}"/>`;
        break;

      case 'innerShadow':
        filterContent = `
      <feOffset dx="${offsetX}" dy="${offsetY}"/>
      <feGaussianBlur stdDeviation="${spread}" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="${color}" flood-opacity="${intensity * 0.5}" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>`;
        break;

      case 'neon':
        filterContent = `
      <feGaussianBlur in="SourceAlpha" stdDeviation="${spread}" result="blur"/>
      <feFlood flood-color="${color}" flood-opacity="${intensity}" result="glowColor"/>
      <feComposite in="glowColor" in2="blur" operator="in" result="glow1"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${spread * 2}" result="blur2"/>
      <feFlood flood-color="${color}" flood-opacity="${intensity * 0.5}" result="glowColor2"/>
      <feComposite in="glowColor2" in2="blur2" operator="in" result="glow2"/>
      <feMerge>
        <feMergeNode in="glow2"/>
        <feMergeNode in="glow1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>`;
        break;

      default:
        filterContent = '';
    }

    this.defs.push(`
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${filterContent}
    </filter>`);

    return this;
  }

  // -------------------------------------------------------------------------
  // PATTERNS
  // -------------------------------------------------------------------------

  /**
   * Add a pattern to defs
   */
  addPattern(spec: PatternSpec): this {
    const {
      id,
      type,
      size = 20,
      color = '#ffffff',
      backgroundColor = 'transparent',
      strokeWidth = 1,
    } = spec;

    let patternContent: string;
    let patternSize = size;

    switch (type) {
      case 'grid':
        patternContent = `
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <path d="M${size} 0 L0 0 0 ${size}" fill="none" stroke="${color}" stroke-opacity="0.1" stroke-width="${strokeWidth}"/>`;
        break;

      case 'dots':
        patternContent = `
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${strokeWidth}" fill="${color}" fill-opacity="0.2"/>`;
        break;

      case 'lines':
        patternContent = `
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <line x1="0" y1="${size}" x2="${size}" y2="0" stroke="${color}" stroke-opacity="0.1" stroke-width="${strokeWidth}"/>`;
        break;

      case 'crosshatch':
        patternContent = `
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <path d="M0 0 L${size} ${size} M${size} 0 L0 ${size}" stroke="${color}" stroke-opacity="0.1" stroke-width="${strokeWidth}"/>`;
        break;

      case 'waves':
        patternContent = `
      <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
      <path d="M0 ${size / 2} Q${size / 4} ${size / 4} ${size / 2} ${size / 2} T${size} ${size / 2}" fill="none" stroke="${color}" stroke-opacity="0.15" stroke-width="${strokeWidth}"/>`;
        break;

      case 'hexagons':
        const h = size;
        const w = size * 1.732;
        patternSize = w;
        patternContent = `
      <rect width="${w}" height="${h * 2}" fill="${backgroundColor}"/>
      <path d="M${w / 2} 0 L${w} ${h / 4} L${w} ${(3 * h) / 4} L${w / 2} ${h} L0 ${(3 * h) / 4} L0 ${h / 4} Z" fill="none" stroke="${color}" stroke-opacity="0.1" stroke-width="${strokeWidth}"/>`;
        break;

      default:
        patternContent = '';
    }

    this.defs.push(`
    <pattern id="${id}" patternUnits="userSpaceOnUse" width="${patternSize}" height="${type === 'hexagons' ? size * 2 : size}">${patternContent}
    </pattern>`);

    return this;
  }

  // -------------------------------------------------------------------------
  // SHAPES
  // -------------------------------------------------------------------------

  /**
   * Add a rectangle
   */
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      rx?: number;
      ry?: number;
      filter?: string;
      opacity?: number;
      animation?: SVGAnimateSpec | SVGAnimateSpec[];
      class?: string;
    } = {}
  ): this {
    const attrs: string[] = [
      `x="${x}"`,
      `y="${y}"`,
      `width="${width}"`,
      `height="${height}"`,
    ];

    if (options.fill) attrs.push(`fill="${options.fill}"`);
    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.rx) attrs.push(`rx="${options.rx}"`);
    if (options.ry) attrs.push(`ry="${options.ry}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    let animationMarkup = '';
    if (options.animation) {
      const animations = Array.isArray(options.animation) ? options.animation : [options.animation];
      animationMarkup = animations.map((a) => animationEngine.generateSVGAnimate(a)).join('\n    ');
    }

    if (animationMarkup) {
      this.elements.push(`<rect ${attrs.join(' ')}>
    ${animationMarkup}
  </rect>`);
    } else {
      this.elements.push(`<rect ${attrs.join(' ')}/>`);
    }

    return this;
  }

  /**
   * Add a circle
   */
  circle(
    cx: number,
    cy: number,
    r: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      filter?: string;
      opacity?: number;
      animation?: SVGAnimateSpec | SVGAnimateSpec[];
      class?: string;
    } = {}
  ): this {
    const attrs: string[] = [`cx="${cx}"`, `cy="${cy}"`, `r="${r}"`];

    if (options.fill) attrs.push(`fill="${options.fill}"`);
    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    let animationMarkup = '';
    if (options.animation) {
      const animations = Array.isArray(options.animation) ? options.animation : [options.animation];
      animationMarkup = animations.map((a) => animationEngine.generateSVGAnimate(a)).join('\n    ');
    }

    if (animationMarkup) {
      this.elements.push(`<circle ${attrs.join(' ')}>
    ${animationMarkup}
  </circle>`);
    } else {
      this.elements.push(`<circle ${attrs.join(' ')}/>`);
    }

    return this;
  }

  /**
   * Add an ellipse
   */
  ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      filter?: string;
      opacity?: number;
      class?: string;
    } = {}
  ): this {
    const attrs: string[] = [`cx="${cx}"`, `cy="${cy}"`, `rx="${rx}"`, `ry="${ry}"`];

    if (options.fill) attrs.push(`fill="${options.fill}"`);
    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    this.elements.push(`<ellipse ${attrs.join(' ')}/>`);
    return this;
  }

  /**
   * Add a line
   */
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: 'butt' | 'round' | 'square';
      strokeDasharray?: string;
      opacity?: number;
      class?: string;
    } = {}
  ): this {
    const attrs: string[] = [`x1="${x1}"`, `y1="${y1}"`, `x2="${x2}"`, `y2="${y2}"`];

    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.strokeLinecap) attrs.push(`stroke-linecap="${options.strokeLinecap}"`);
    if (options.strokeDasharray) attrs.push(`stroke-dasharray="${options.strokeDasharray}"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    this.elements.push(`<line ${attrs.join(' ')}/>`);
    return this;
  }

  /**
   * Add a path
   */
  path(
    d: string | PathCommand[],
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: 'butt' | 'round' | 'square';
      strokeLinejoin?: 'miter' | 'round' | 'bevel';
      strokeDasharray?: string;
      filter?: string;
      opacity?: number;
      animation?: SVGAnimateSpec | SVGAnimateSpec[];
      class?: string;
    } = {}
  ): this {
    const pathData = typeof d === 'string' ? d : this.pathCommandsToString(d);
    const attrs: string[] = [`d="${pathData}"`];

    if (options.fill !== undefined) attrs.push(`fill="${options.fill}"`);
    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.strokeLinecap) attrs.push(`stroke-linecap="${options.strokeLinecap}"`);
    if (options.strokeLinejoin) attrs.push(`stroke-linejoin="${options.strokeLinejoin}"`);
    if (options.strokeDasharray) attrs.push(`stroke-dasharray="${options.strokeDasharray}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    let animationMarkup = '';
    if (options.animation) {
      const animations = Array.isArray(options.animation) ? options.animation : [options.animation];
      animationMarkup = animations.map((a) => animationEngine.generateSVGAnimate(a)).join('\n    ');
    }

    if (animationMarkup) {
      this.elements.push(`<path ${attrs.join(' ')}>
    ${animationMarkup}
  </path>`);
    } else {
      this.elements.push(`<path ${attrs.join(' ')}/>`);
    }

    return this;
  }

  /**
   * Add a polygon
   */
  polygon(
    points: [number, number][],
    options: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      filter?: string;
      opacity?: number;
      class?: string;
    } = {}
  ): this {
    const pointsStr = points.map((p) => `${p[0]},${p[1]}`).join(' ');
    const attrs: string[] = [`points="${pointsStr}"`];

    if (options.fill) attrs.push(`fill="${options.fill}"`);
    if (options.stroke) attrs.push(`stroke="${options.stroke}"`);
    if (options.strokeWidth) attrs.push(`stroke-width="${options.strokeWidth}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    this.elements.push(`<polygon ${attrs.join(' ')}/>`);
    return this;
  }

  /**
   * Add text
   */
  text(
    content: string,
    x: number,
    y: number,
    options: {
      fill?: string;
      fontSize?: number | string;
      fontFamily?: string;
      fontWeight?: string | number;
      textAnchor?: 'start' | 'middle' | 'end';
      dominantBaseline?: 'auto' | 'middle' | 'hanging';
      filter?: string;
      opacity?: number;
      class?: string;
    } = {}
  ): this {
    const attrs: string[] = [`x="${x}"`, `y="${y}"`];

    if (options.fill) attrs.push(`fill="${options.fill}"`);
    if (options.fontSize) attrs.push(`font-size="${options.fontSize}"`);
    if (options.fontFamily) attrs.push(`font-family="${options.fontFamily}"`);
    if (options.fontWeight) attrs.push(`font-weight="${options.fontWeight}"`);
    if (options.textAnchor) attrs.push(`text-anchor="${options.textAnchor}"`);
    if (options.dominantBaseline) attrs.push(`dominant-baseline="${options.dominantBaseline}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    this.elements.push(`<text ${attrs.join(' ')}>${this.escapeXml(content)}</text>`);
    return this;
  }

  // -------------------------------------------------------------------------
  // GROUPS & TRANSFORMS
  // -------------------------------------------------------------------------

  /**
   * Start a group
   */
  startGroup(options: {
    transform?: string;
    filter?: string;
    opacity?: number;
    class?: string;
    id?: string;
  } = {}): this {
    const attrs: string[] = [];

    if (options.id) attrs.push(`id="${options.id}"`);
    if (options.transform) attrs.push(`transform="${options.transform}"`);
    if (options.filter) attrs.push(`filter="url(#${options.filter})"`);
    if (options.opacity !== undefined) attrs.push(`opacity="${options.opacity}"`);
    if (options.class) attrs.push(`class="${options.class}"`);

    this.elements.push(`<g${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
    return this;
  }

  /**
   * End a group
   */
  endGroup(): this {
    this.elements.push('</g>');
    return this;
  }

  // -------------------------------------------------------------------------
  // RAW SVG
  // -------------------------------------------------------------------------

  /**
   * Add raw SVG markup
   */
  raw(svg: string): this {
    this.elements.push(svg);
    return this;
  }

  /**
   * Add raw markup to defs
   */
  addDef(def: string): this {
    this.defs.push(def);
    return this;
  }

  // -------------------------------------------------------------------------
  // UTILITIES
  // -------------------------------------------------------------------------

  /**
   * Convert path commands to string
   */
  private pathCommandsToString(commands: PathCommand[]): string {
    return commands.map((cmd) => `${cmd.type}${cmd.args.join(',')}`).join(' ');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // -------------------------------------------------------------------------
  // BUILD OUTPUT
  // -------------------------------------------------------------------------

  /**
   * Build the final SVG string
   */
  build(): string {
    const defsContent = this.defs.length > 0 ? `<defs>${this.defs.join('\n  ')}\n  </defs>` : '';

    const stylesContent =
      this.styles.length > 0 ? `<style>\n    ${this.styles.join('\n    ')}\n  </style>` : '';

    return `<svg viewBox="${this.viewBox}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${defsContent}
  ${stylesContent}
  ${this.elements.join('\n  ')}
</svg>`;
  }
}

// ============================================================================
// SVG GENERATION ENGINE CLASS
// ============================================================================

/**
 * SVGGenerationEngine - Factory for creating SVG documents
 */
export class SVGGenerationEngine {
  private static instance: SVGGenerationEngine;

  static getInstance(): SVGGenerationEngine {
    if (!this.instance) {
      this.instance = new SVGGenerationEngine();
    }
    return this.instance;
  }

  constructor() {
    // Subscribe to SVG generation requests
    bus.on('cortex:svg_request', async (event) => {
      try {
        const result = await this.handleSvgRequest(event.payload);
        bus.publish('cortex', 'cortex:svg_response', {
          ...result,
          requestId: event.payload?.requestId,
        });
      } catch (error) {
        bus.publish('cortex', 'cortex:svg_error', {
          error: error instanceof Error ? error.message : 'SVG generation failed',
          requestId: event.payload?.requestId,
        });
      }
    });

    console.log('🎨 SVG Generation Engine initialized');
  }

  /**
   * Create a new SVG builder
   */
  create(width: number = 800, height: number = 600): SVGBuilder {
    return new SVGBuilder(width, height);
  }

  /**
   * Create a styled background SVG
   */
  createBackground(options: {
    width?: number;
    height?: number;
    theme?: 'dark' | 'light' | 'gradient' | 'pattern';
    primaryColor?: string;
    secondaryColor?: string;
    pattern?: PatternSpec['type'];
  } = {}): string {
    const {
      width = 800,
      height = 600,
      theme = 'dark',
      primaryColor = '#0f0f1a',
      secondaryColor = '#1e1e3f',
      pattern,
    } = options;

    const builder = this.create(width, height);

    if (theme === 'gradient') {
      builder.addLinearGradient({
        id: 'bg',
        stops: [
          { offset: 0, color: primaryColor },
          { offset: 100, color: secondaryColor },
        ],
      });
      builder.rect(0, 0, width, height, { fill: 'url(#bg)' });
    } else if (theme === 'dark') {
      builder.addLinearGradient({
        id: 'bg',
        x2: '100%',
        y2: '100%',
        stops: [
          { offset: 0, color: '#0a0a14' },
          { offset: 50, color: '#0f0f1a' },
          { offset: 100, color: '#1e1e2f' },
        ],
      });
      builder.rect(0, 0, width, height, { fill: 'url(#bg)' });
    } else if (theme === 'light') {
      builder.rect(0, 0, width, height, { fill: '#ffffff' });
    }

    if (pattern) {
      builder.addPattern({ id: 'bgPattern', type: pattern, size: 40 });
      builder.rect(0, 0, width, height, { fill: 'url(#bgPattern)' });
    }

    return builder.build();
  }

  /**
   * Create a card component SVG
   */
  createCard(options: {
    width?: number;
    height?: number;
    title?: string;
    subtitle?: string;
    icon?: string;
    value?: string | number;
    theme?: 'dark' | 'light';
    accentColor?: string;
  } = {}): string {
    const {
      width = 300,
      height = 180,
      title = '',
      subtitle = '',
      value = '',
      theme = 'dark',
      accentColor = '#6366f1',
    } = options;

    const bgColor = theme === 'dark' ? '#1e1e2f' : '#ffffff';
    const textColor = theme === 'dark' ? '#ffffff' : '#1e293b';
    const mutedColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    const builder = this.create(width, height);

    builder
      .addLinearGradient({
        id: 'cardAccent',
        stops: [
          { offset: 0, color: accentColor },
          { offset: 100, color: accentColor, opacity: 0.5 },
        ],
      })
      .addFilter({ id: 'cardShadow', type: 'dropShadow', intensity: 0.3, spread: 8 })
      .rect(0, 0, width, height, {
        fill: bgColor,
        rx: 16,
        filter: 'cardShadow',
      })
      .rect(0, 0, 4, height, { fill: 'url(#cardAccent)', rx: 2 });

    if (title) {
      builder.text(title, 24, 40, {
        fill: textColor,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });
    }

    if (subtitle) {
      builder.text(subtitle, 24, 60, {
        fill: mutedColor,
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });
    }

    if (value) {
      builder.text(String(value), 24, 120, {
        fill: textColor,
        fontSize: 36,
        fontWeight: 700,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });
    }

    return builder.build();
  }

  /**
   * Create a badge/tag SVG
   */
  createBadge(options: {
    text: string;
    color?: string;
    textColor?: string;
    size?: 'sm' | 'md' | 'lg';
  } = { text: 'Badge' }): string {
    const {
      text,
      color = '#6366f1',
      textColor = '#ffffff',
      size = 'md',
    } = options;

    const sizes = {
      sm: { height: 20, fontSize: 10, paddingX: 8, rx: 4 },
      md: { height: 26, fontSize: 12, paddingX: 12, rx: 6 },
      lg: { height: 32, fontSize: 14, paddingX: 16, rx: 8 },
    };

    const s = sizes[size];
    const width = text.length * s.fontSize * 0.6 + s.paddingX * 2;

    const builder = this.create(width, s.height);

    builder
      .rect(0, 0, width, s.height, { fill: color, rx: s.rx })
      .text(text, width / 2, s.height / 2 + s.fontSize * 0.35, {
        fill: textColor,
        fontSize: s.fontSize,
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAnchor: 'middle',
      });

    return builder.build();
  }

  /**
   * Create an icon placeholder SVG
   */
  createIcon(options: {
    type: 'circle' | 'square' | 'hexagon' | 'star';
    size?: number;
    color?: string;
    strokeOnly?: boolean;
  } = { type: 'circle' }): string {
    const { type, size = 48, color = '#6366f1', strokeOnly = false } = options;

    const builder = this.create(size, size);
    const center = size / 2;
    const radius = size * 0.4;

    const fillOption = strokeOnly ? { stroke: color, strokeWidth: 2, fill: 'none' } : { fill: color };

    switch (type) {
      case 'circle':
        builder.circle(center, center, radius, fillOption);
        break;

      case 'square':
        const squareSize = radius * 1.6;
        builder.rect(
          center - squareSize / 2,
          center - squareSize / 2,
          squareSize,
          squareSize,
          { ...fillOption, rx: 4 }
        );
        break;

      case 'hexagon':
        const hexPoints: [number, number][] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * (Math.PI / 180);
          hexPoints.push([center + radius * Math.cos(angle), center + radius * Math.sin(angle)]);
        }
        builder.polygon(hexPoints, fillOption);
        break;

      case 'star':
        const starPoints: [number, number][] = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? radius : radius * 0.5;
          const angle = (i * 36 - 90) * (Math.PI / 180);
          starPoints.push([center + r * Math.cos(angle), center + r * Math.sin(angle)]);
        }
        builder.polygon(starPoints, fillOption);
        break;
    }

    return builder.build();
  }

  // -------------------------------------------------------------------------
  // EVENT HANDLING
  // -------------------------------------------------------------------------

  private async handleSvgRequest(payload: unknown): Promise<{
    success: boolean;
    svg?: string;
    type?: string;
  }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false };
    }

    const request = payload as {
      type: 'background' | 'card' | 'badge' | 'icon' | 'custom';
      options?: Record<string, unknown>;
    };

    try {
      switch (request.type) {
        case 'background':
          return {
            success: true,
            svg: this.createBackground(request.options as Parameters<typeof this.createBackground>[0]),
            type: 'background',
          };

        case 'card':
          return {
            success: true,
            svg: this.createCard(request.options as Parameters<typeof this.createCard>[0]),
            type: 'card',
          };

        case 'badge':
          return {
            success: true,
            svg: this.createBadge(request.options as Parameters<typeof this.createBadge>[0]),
            type: 'badge',
          };

        case 'icon':
          return {
            success: true,
            svg: this.createIcon(request.options as Parameters<typeof this.createIcon>[0]),
            type: 'icon',
          };

        default:
          return { success: false };
      }
    } catch (error) {
      console.error('SVG generation error:', error);
      return { success: false };
    }
  }
}

// Export singleton instance
export const svgGenerationEngine = SVGGenerationEngine.getInstance();

export default svgGenerationEngine;
