// @version 3.3.158
// TooLoo.ai Animation Engine
// Professional motion design system for SVG and UI animations
// Part of Visual Cortex 2.0 Enhanced Design Engine

import { bus } from '../../core/event-bus.js';

// ============================================================================
// ANIMATION TYPES & EASING
// ============================================================================

/**
 * Standard easing functions - industry-standard curves for smooth motion
 */
export const EASING_CURVES = {
  // Linear
  linear: 'linear',

  // Standard ease
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Cubic bezier presets
  easeInSine: 'cubic-bezier(0.47, 0, 0.745, 0.715)',
  easeOutSine: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
  easeInOutSine: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',

  easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',

  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',

  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',

  easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',

  easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',

  easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',

  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Spring-like
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  snappy: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

export type EasingName = keyof typeof EASING_CURVES;

/**
 * Animation timing presets for consistent motion design
 */
export const TIMING_PRESETS = {
  instant: 0,
  faster: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
  // Semantic timings
  microInteraction: 150,
  buttonPress: 100,
  menuSlide: 250,
  modalOpen: 300,
  pageTransition: 400,
  loadingPulse: 1500,
  attentionSeek: 2000,
} as const;

export type TimingPreset = keyof typeof TIMING_PRESETS;

// ============================================================================
// KEYFRAME DEFINITIONS
// ============================================================================

export interface Keyframe {
  offset: number; // 0-1 (percentage through animation)
  properties: Record<string, string | number>;
  easing?: EasingName | string;
}

export interface AnimationDefinition {
  name: string;
  keyframes: Keyframe[];
  duration: number; // ms
  easing: EasingName | string;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface SVGAnimateSpec {
  attributeName: string;
  from?: string;
  to?: string;
  values?: string[];
  keyTimes?: string;
  keySplines?: string;
  dur: string;
  begin?: string;
  repeatCount?: number | 'indefinite';
  fill?: 'freeze' | 'remove';
  calcMode?: 'discrete' | 'linear' | 'paced' | 'spline';
}

// ============================================================================
// ANIMATION PRESETS - Ready-to-use animations
// ============================================================================

export const ANIMATION_PRESETS = {
  // Entrance animations
  fadeIn: {
    name: 'fadeIn',
    keyframes: [
      { offset: 0, properties: { opacity: 0 } },
      { offset: 1, properties: { opacity: 1 } },
    ],
    duration: 300,
    easing: 'easeOutCubic',
  },

  fadeInUp: {
    name: 'fadeInUp',
    keyframes: [
      { offset: 0, properties: { opacity: 0, transform: 'translateY(20px)' } },
      { offset: 1, properties: { opacity: 1, transform: 'translateY(0)' } },
    ],
    duration: 400,
    easing: 'easeOutCubic',
  },

  fadeInDown: {
    name: 'fadeInDown',
    keyframes: [
      { offset: 0, properties: { opacity: 0, transform: 'translateY(-20px)' } },
      { offset: 1, properties: { opacity: 1, transform: 'translateY(0)' } },
    ],
    duration: 400,
    easing: 'easeOutCubic',
  },

  fadeInLeft: {
    name: 'fadeInLeft',
    keyframes: [
      { offset: 0, properties: { opacity: 0, transform: 'translateX(-20px)' } },
      { offset: 1, properties: { opacity: 1, transform: 'translateX(0)' } },
    ],
    duration: 400,
    easing: 'easeOutCubic',
  },

  fadeInRight: {
    name: 'fadeInRight',
    keyframes: [
      { offset: 0, properties: { opacity: 0, transform: 'translateX(20px)' } },
      { offset: 1, properties: { opacity: 1, transform: 'translateX(0)' } },
    ],
    duration: 400,
    easing: 'easeOutCubic',
  },

  scaleIn: {
    name: 'scaleIn',
    keyframes: [
      { offset: 0, properties: { opacity: 0, transform: 'scale(0.8)' } },
      { offset: 1, properties: { opacity: 1, transform: 'scale(1)' } },
    ],
    duration: 300,
    easing: 'easeOutBack',
  },

  slideInUp: {
    name: 'slideInUp',
    keyframes: [
      { offset: 0, properties: { transform: 'translateY(100%)' } },
      { offset: 1, properties: { transform: 'translateY(0)' } },
    ],
    duration: 400,
    easing: 'easeOutCubic',
  },

  // Exit animations
  fadeOut: {
    name: 'fadeOut',
    keyframes: [
      { offset: 0, properties: { opacity: 1 } },
      { offset: 1, properties: { opacity: 0 } },
    ],
    duration: 200,
    easing: 'easeInCubic',
  },

  scaleOut: {
    name: 'scaleOut',
    keyframes: [
      { offset: 0, properties: { opacity: 1, transform: 'scale(1)' } },
      { offset: 1, properties: { opacity: 0, transform: 'scale(0.8)' } },
    ],
    duration: 200,
    easing: 'easeInBack',
  },

  // Attention seekers
  pulse: {
    name: 'pulse',
    keyframes: [
      { offset: 0, properties: { transform: 'scale(1)' } },
      { offset: 0.5, properties: { transform: 'scale(1.05)' } },
      { offset: 1, properties: { transform: 'scale(1)' } },
    ],
    duration: 1000,
    easing: 'easeInOutSine',
    iterations: 'infinite',
  },

  bounce: {
    name: 'bounce',
    keyframes: [
      { offset: 0, properties: { transform: 'translateY(0)' } },
      { offset: 0.2, properties: { transform: 'translateY(-10px)' } },
      { offset: 0.4, properties: { transform: 'translateY(0)' } },
      { offset: 0.6, properties: { transform: 'translateY(-5px)' } },
      { offset: 0.8, properties: { transform: 'translateY(0)' } },
      { offset: 1, properties: { transform: 'translateY(0)' } },
    ],
    duration: 800,
    easing: 'easeOutQuad',
  },

  shake: {
    name: 'shake',
    keyframes: [
      { offset: 0, properties: { transform: 'translateX(0)' } },
      { offset: 0.1, properties: { transform: 'translateX(-5px)' } },
      { offset: 0.2, properties: { transform: 'translateX(5px)' } },
      { offset: 0.3, properties: { transform: 'translateX(-5px)' } },
      { offset: 0.4, properties: { transform: 'translateX(5px)' } },
      { offset: 0.5, properties: { transform: 'translateX(-5px)' } },
      { offset: 0.6, properties: { transform: 'translateX(5px)' } },
      { offset: 0.7, properties: { transform: 'translateX(-5px)' } },
      { offset: 0.8, properties: { transform: 'translateX(5px)' } },
      { offset: 0.9, properties: { transform: 'translateX(-5px)' } },
      { offset: 1, properties: { transform: 'translateX(0)' } },
    ],
    duration: 600,
    easing: 'linear',
  },

  glow: {
    name: 'glow',
    keyframes: [
      { offset: 0, properties: { filter: 'brightness(1)' } },
      { offset: 0.5, properties: { filter: 'brightness(1.2)' } },
      { offset: 1, properties: { filter: 'brightness(1)' } },
    ],
    duration: 2000,
    easing: 'easeInOutSine',
    iterations: 'infinite',
  },

  float: {
    name: 'float',
    keyframes: [
      { offset: 0, properties: { transform: 'translateY(0)' } },
      { offset: 0.5, properties: { transform: 'translateY(-10px)' } },
      { offset: 1, properties: { transform: 'translateY(0)' } },
    ],
    duration: 3000,
    easing: 'easeInOutSine',
    iterations: 'infinite',
  },

  spin: {
    name: 'spin',
    keyframes: [
      { offset: 0, properties: { transform: 'rotate(0deg)' } },
      { offset: 1, properties: { transform: 'rotate(360deg)' } },
    ],
    duration: 1000,
    easing: 'linear',
    iterations: 'infinite',
  },

  // Loading animations
  loadingDots: {
    name: 'loadingDots',
    keyframes: [
      { offset: 0, properties: { opacity: 0.3 } },
      { offset: 0.5, properties: { opacity: 1 } },
      { offset: 1, properties: { opacity: 0.3 } },
    ],
    duration: 1200,
    easing: 'easeInOutSine',
    iterations: 'infinite',
  },

  // Data visualization animations
  growFromZero: {
    name: 'growFromZero',
    keyframes: [
      { offset: 0, properties: { transform: 'scaleY(0)', transformOrigin: 'bottom' } },
      { offset: 1, properties: { transform: 'scaleY(1)', transformOrigin: 'bottom' } },
    ],
    duration: 800,
    easing: 'easeOutCubic',
  },

  drawLine: {
    name: 'drawLine',
    keyframes: [
      { offset: 0, properties: { strokeDashoffset: '100%' } },
      { offset: 1, properties: { strokeDashoffset: '0%' } },
    ],
    duration: 1500,
    easing: 'easeInOutCubic',
  },

  countUp: {
    name: 'countUp',
    keyframes: [
      { offset: 0, properties: { opacity: 0 } },
      { offset: 0.1, properties: { opacity: 1 } },
      { offset: 1, properties: { opacity: 1 } },
    ],
    duration: 2000,
    easing: 'linear',
  },
} as const;

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;

// ============================================================================
// TRANSITION PRESETS - For state changes
// ============================================================================

export interface TransitionSpec {
  property: string | string[];
  duration: number;
  easing: EasingName | string;
  delay?: number;
}

export const TRANSITION_PRESETS = {
  // General purpose
  default: {
    property: 'all',
    duration: TIMING_PRESETS.normal,
    easing: 'easeInOutCubic',
  },

  fast: {
    property: 'all',
    duration: TIMING_PRESETS.fast,
    easing: 'easeOutCubic',
  },

  slow: {
    property: 'all',
    duration: TIMING_PRESETS.slow,
    easing: 'easeInOutCubic',
  },

  // Specific properties
  opacity: {
    property: 'opacity',
    duration: TIMING_PRESETS.fast,
    easing: 'easeOutCubic',
  },

  transform: {
    property: 'transform',
    duration: TIMING_PRESETS.normal,
    easing: 'easeOutCubic',
  },

  colors: {
    property: ['color', 'background-color', 'border-color', 'fill', 'stroke'],
    duration: TIMING_PRESETS.fast,
    easing: 'easeInOutCubic',
  },

  size: {
    property: ['width', 'height', 'max-width', 'max-height'],
    duration: TIMING_PRESETS.normal,
    easing: 'easeInOutCubic',
  },

  // Interactive
  hover: {
    property: ['transform', 'box-shadow', 'background-color'],
    duration: TIMING_PRESETS.fast,
    easing: 'easeOutCubic',
  },

  focus: {
    property: ['outline', 'box-shadow', 'border-color'],
    duration: TIMING_PRESETS.faster,
    easing: 'easeOutCubic',
  },

  press: {
    property: 'transform',
    duration: TIMING_PRESETS.buttonPress,
    easing: 'easeInCubic',
  },
} as const;

export type TransitionPresetName = keyof typeof TRANSITION_PRESETS;

// ============================================================================
// ANIMATION ENGINE CLASS
// ============================================================================

/**
 * AnimationEngine - Motion design system for Visual Cortex 2.0
 * Generates SVG animations, CSS keyframes, and transition specifications
 */
export class AnimationEngine {
  private static instance: AnimationEngine;

  static getInstance(): AnimationEngine {
    if (!this.instance) {
      this.instance = new AnimationEngine();
    }
    return this.instance;
  }

  constructor() {
    // Subscribe to animation requests
    bus.on('cortex:animation_request', async (event) => {
      try {
        const result = await this.handleAnimationRequest(event.payload);
        bus.publish('cortex', 'cortex:animation_response', {
          ...result,
          requestId: event.payload?.requestId,
        });
      } catch (error) {
        bus.publish('cortex', 'cortex:animation_error', {
          error: error instanceof Error ? error.message : 'Animation generation failed',
          requestId: event.payload?.requestId,
        });
      }
    });

    console.log('🎬 Animation Engine initialized');
  }

  // -------------------------------------------------------------------------
  // SVG ANIMATION GENERATION
  // -------------------------------------------------------------------------

  /**
   * Generate SVG animate element
   */
  generateSVGAnimate(spec: SVGAnimateSpec): string {
    const attrs: string[] = [`attributeName="${spec.attributeName}"`];

    if (spec.from !== undefined) attrs.push(`from="${spec.from}"`);
    if (spec.to !== undefined) attrs.push(`to="${spec.to}"`);
    if (spec.values) attrs.push(`values="${spec.values.join(';')}"`);
    if (spec.keyTimes) attrs.push(`keyTimes="${spec.keyTimes}"`);
    if (spec.keySplines) attrs.push(`keySplines="${spec.keySplines}"`);

    attrs.push(`dur="${spec.dur}"`);

    if (spec.begin) attrs.push(`begin="${spec.begin}"`);
    if (spec.repeatCount) attrs.push(`repeatCount="${spec.repeatCount}"`);
    if (spec.fill) attrs.push(`fill="${spec.fill}"`);
    if (spec.calcMode) attrs.push(`calcMode="${spec.calcMode}"`);

    return `<animate ${attrs.join(' ')}/>`;
  }

  /**
   * Generate SVG animateTransform element
   */
  generateSVGAnimateTransform(spec: {
    type: 'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY';
    from: string;
    to: string;
    dur: string;
    begin?: string;
    repeatCount?: number | 'indefinite';
    fill?: 'freeze' | 'remove';
  }): string {
    const attrs = [
      'attributeName="transform"',
      `type="${spec.type}"`,
      `from="${spec.from}"`,
      `to="${spec.to}"`,
      `dur="${spec.dur}"`,
    ];

    if (spec.begin) attrs.push(`begin="${spec.begin}"`);
    if (spec.repeatCount) attrs.push(`repeatCount="${spec.repeatCount}"`);
    if (spec.fill) attrs.push(`fill="${spec.fill}"`);

    return `<animateTransform ${attrs.join(' ')}/>`;
  }

  /**
   * Generate SVG motion path animation
   */
  generateSVGMotionPath(spec: {
    pathId: string;
    dur: string;
    begin?: string;
    repeatCount?: number | 'indefinite';
    rotate?: 'auto' | 'auto-reverse' | number;
  }): string {
    const attrs = [`dur="${spec.dur}"`];

    if (spec.begin) attrs.push(`begin="${spec.begin}"`);
    if (spec.repeatCount) attrs.push(`repeatCount="${spec.repeatCount}"`);
    if (spec.rotate) attrs.push(`rotate="${spec.rotate}"`);

    return `<animateMotion ${attrs.join(' ')}>
      <mpath xlink:href="#${spec.pathId}"/>
    </animateMotion>`;
  }

  /**
   * Generate a complete SVG animation group for a bar chart
   */
  generateBarChartAnimation(
    barIndex: number,
    height: number,
    baseY: number,
    duration: number = 800,
    staggerDelay: number = 100
  ): string {
    const delay = barIndex * staggerDelay;
    const dur = `${duration}ms`;
    const begin = delay > 0 ? `${delay}ms` : undefined;

    return `
      ${this.generateSVGAnimate({
        attributeName: 'height',
        from: '0',
        to: height.toString(),
        dur,
        begin,
        fill: 'freeze',
      })}
      ${this.generateSVGAnimate({
        attributeName: 'y',
        from: baseY.toString(),
        to: (baseY - height).toString(),
        dur,
        begin,
        fill: 'freeze',
      })}
    `.trim();
  }

  /**
   * Generate line drawing animation
   */
  generateLineDrawAnimation(
    pathLength: number,
    duration: number = 1500,
    delay: number = 0
  ): string {
    const begin = delay > 0 ? `${delay}ms` : undefined;

    return `
      stroke-dasharray="${pathLength}"
      stroke-dashoffset="${pathLength}"
      ${this.generateSVGAnimate({
        attributeName: 'stroke-dashoffset',
        from: pathLength.toString(),
        to: '0',
        dur: `${duration}ms`,
        begin,
        fill: 'freeze',
        calcMode: 'spline',
        keySplines: '0.645 0.045 0.355 1',
      })}
    `.trim();
  }

  /**
   * Generate pulse animation for data points
   */
  generatePulseAnimation(
    duration: number = 2000,
    minScale: number = 1,
    maxScale: number = 1.2
  ): string {
    return this.generateSVGAnimate({
      attributeName: 'r',
      values: ['6', '8', '6'],
      dur: `${duration}ms`,
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95',
    });
  }

  /**
   * Generate rotation animation
   */
  generateRotationAnimation(
    duration: number = 10000,
    direction: 'clockwise' | 'counterclockwise' = 'clockwise'
  ): string {
    const from = direction === 'clockwise' ? '0' : '360';
    const to = direction === 'clockwise' ? '360' : '0';

    return this.generateSVGAnimateTransform({
      type: 'rotate',
      from: `${from} 0 0`,
      to: `${to} 0 0`,
      dur: `${duration}ms`,
      repeatCount: 'indefinite',
    });
  }

  /**
   * Generate floating animation
   */
  generateFloatAnimation(amplitude: number = 10, duration: number = 3000): string {
    return this.generateSVGAnimate({
      attributeName: 'transform',
      values: ['translate(0, 0)', `translate(0, -${amplitude})`, 'translate(0, 0)'],
      dur: `${duration}ms`,
      repeatCount: 'indefinite',
      calcMode: 'spline',
      keySplines: '0.445 0.05 0.55 0.95; 0.445 0.05 0.55 0.95',
    });
  }

  // -------------------------------------------------------------------------
  // CSS ANIMATION GENERATION
  // -------------------------------------------------------------------------

  /**
   * Convert animation definition to CSS keyframes
   */
  toCSSKeyframes(animation: AnimationDefinition): string {
    const keyframesContent = animation.keyframes
      .map((kf) => {
        const percentage = Math.round(kf.offset * 100);
        const props = Object.entries(kf.properties)
          .map(([key, value]) => {
            // Convert camelCase to kebab-case
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `    ${cssKey}: ${value};`;
          })
          .join('\n');
        return `  ${percentage}% {\n${props}\n  }`;
      })
      .join('\n');

    return `@keyframes ${animation.name} {\n${keyframesContent}\n}`;
  }

  /**
   * Generate CSS animation shorthand
   */
  toCSSAnimation(animation: AnimationDefinition): string {
    const easing =
      typeof animation.easing === 'string' && animation.easing in EASING_CURVES
        ? EASING_CURVES[animation.easing as EasingName]
        : animation.easing;

    const parts = [
      animation.name,
      `${animation.duration}ms`,
      easing,
      animation.delay ? `${animation.delay}ms` : '',
      animation.iterations === 'infinite' ? 'infinite' : animation.iterations?.toString() || '1',
      animation.direction || 'normal',
      animation.fillMode || 'both',
    ].filter(Boolean);

    return `animation: ${parts.join(' ')};`;
  }

  /**
   * Generate CSS transition string
   */
  toCSSTransition(transition: TransitionSpec): string {
    const properties = Array.isArray(transition.property)
      ? transition.property
      : [transition.property];

    const easing =
      typeof transition.easing === 'string' && transition.easing in EASING_CURVES
        ? EASING_CURVES[transition.easing as EasingName]
        : transition.easing;

    const delay = transition.delay ? ` ${transition.delay}ms` : '';

    return properties
      .map((prop) => `${prop} ${transition.duration}ms ${easing}${delay}`)
      .join(', ');
  }

  /**
   * Get animation preset by name
   */
  getPreset(name: AnimationPresetName): AnimationDefinition {
    const preset = ANIMATION_PRESETS[name];
    return {
      name: preset.name,
      keyframes: preset.keyframes.map((kf) => ({ ...kf, properties: { ...kf.properties } })),
      duration: preset.duration,
      easing: preset.easing,
      delay: 'delay' in preset ? (preset as { delay?: number }).delay : undefined,
      iterations:
        'iterations' in preset
          ? (preset as { iterations?: number | 'infinite' }).iterations
          : undefined,
      direction:
        'direction' in preset
          ? (preset as { direction?: AnimationDefinition['direction'] }).direction
          : undefined,
      fillMode:
        'fillMode' in preset
          ? (preset as { fillMode?: AnimationDefinition['fillMode'] }).fillMode
          : undefined,
    };
  }

  /**
   * Get transition preset by name
   */
  getTransitionPreset(name: TransitionPresetName): TransitionSpec {
    const preset = TRANSITION_PRESETS[name];
    const prop = preset.property;
    return {
      property: Array.isArray(prop) ? ([...prop] as string[]) : (prop as string),
      duration: preset.duration,
      easing: preset.easing,
      delay: 'delay' in preset ? (preset as { delay?: number }).delay : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // SEQUENCING & COMPOSITION
  // -------------------------------------------------------------------------

  /**
   * Create staggered animation delays for a list of elements
   */
  createStaggerDelays(count: number, staggerMs: number = 100, baseDelay: number = 0): number[] {
    return Array.from({ length: count }, (_, i) => baseDelay + i * staggerMs);
  }

  /**
   * Create animation sequence from multiple animations
   */
  createSequence(animations: { animation: AnimationDefinition; startAfter?: number }[]): {
    animations: AnimationDefinition[];
    totalDuration: number;
  } {
    let currentTime = 0;
    const sequencedAnimations: AnimationDefinition[] = [];

    for (const { animation, startAfter } of animations) {
      const delay = startAfter !== undefined ? startAfter : currentTime;
      sequencedAnimations.push({
        ...animation,
        delay,
      });
      currentTime = delay + animation.duration;
    }

    return {
      animations: sequencedAnimations,
      totalDuration: currentTime,
    };
  }

  /**
   * Generate entrance animation based on position
   */
  getEntranceAnimation(
    direction: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade'
  ): AnimationDefinition {
    const directionMap: Record<string, AnimationPresetName> = {
      up: 'fadeInUp',
      down: 'fadeInDown',
      left: 'fadeInLeft',
      right: 'fadeInRight',
      scale: 'scaleIn',
      fade: 'fadeIn',
    };

    const presetName = directionMap[direction] ?? 'fadeIn';
    return this.getPreset(presetName);
  }

  // -------------------------------------------------------------------------
  // EVENT HANDLING
  // -------------------------------------------------------------------------

  private async handleAnimationRequest(payload: unknown): Promise<{
    success: boolean;
    animation?: string | AnimationDefinition;
    css?: string;
  }> {
    if (!payload || typeof payload !== 'object') {
      return { success: false };
    }

    const request = payload as {
      type: 'svg' | 'css' | 'preset';
      preset?: AnimationPresetName;
      spec?: SVGAnimateSpec;
    };

    if (request.type === 'preset' && request.preset) {
      const preset = this.getPreset(request.preset);
      return {
        success: true,
        animation: preset,
        css: this.toCSSAnimation(preset),
      };
    }

    if (request.type === 'svg' && request.spec) {
      return {
        success: true,
        animation: this.generateSVGAnimate(request.spec),
      };
    }

    return { success: false };
  }
}

// Export singleton instance
export const animationEngine = AnimationEngine.getInstance();

export default animationEngine;
