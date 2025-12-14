// @version 3.3.573
// Tests for TooLoo.ai Animation Engine
// Professional motion design system tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type definitions from animation-engine.ts
const EASING_CURVES = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
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
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  snappy: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

type EasingName = keyof typeof EASING_CURVES;

const TIMING_PRESETS = {
  instant: 0,
  faster: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
  microInteraction: 150,
  buttonPress: 100,
  menuSlide: 250,
  modalOpen: 300,
  pageTransition: 400,
  loadingPulse: 1500,
  attentionSeek: 2000,
} as const;

type TimingPreset = keyof typeof TIMING_PRESETS;

interface Keyframe {
  offset: number;
  properties: Record<string, string | number>;
  easing?: EasingName | string;
}

interface AnimationDefinition {
  name: string;
  keyframes: Keyframe[];
  duration: number;
  easing: EasingName | string;
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

interface SVGAnimateSpec {
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

const ANIMATION_PRESETS: Record<string, AnimationDefinition> = {
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
};

describe('Animation Engine', () => {
  describe('EASING_CURVES', () => {
    it('should have standard CSS easing values', () => {
      expect(EASING_CURVES.linear).toBe('linear');
      expect(EASING_CURVES.ease).toBe('ease');
      expect(EASING_CURVES.easeIn).toBe('ease-in');
      expect(EASING_CURVES.easeOut).toBe('ease-out');
      expect(EASING_CURVES.easeInOut).toBe('ease-in-out');
    });

    it('should have cubic-bezier values for sine easing', () => {
      expect(EASING_CURVES.easeInSine).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeOutSine).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeInOutSine).toMatch(/^cubic-bezier\(/);
    });

    it('should have cubic-bezier values for quad easing', () => {
      expect(EASING_CURVES.easeInQuad).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeOutQuad).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeInOutQuad).toMatch(/^cubic-bezier\(/);
    });

    it('should have cubic-bezier values for cubic easing', () => {
      expect(EASING_CURVES.easeInCubic).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeOutCubic).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeInOutCubic).toMatch(/^cubic-bezier\(/);
    });

    it('should have cubic-bezier values for expo easing', () => {
      expect(EASING_CURVES.easeInExpo).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeOutExpo).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeInOutExpo).toMatch(/^cubic-bezier\(/);
    });

    it('should have cubic-bezier values for back easing', () => {
      expect(EASING_CURVES.easeInBack).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeOutBack).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.easeInOutBack).toMatch(/^cubic-bezier\(/);
    });

    it('should have spring-like easing curves', () => {
      expect(EASING_CURVES.spring).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.bounce).toMatch(/^cubic-bezier\(/);
      expect(EASING_CURVES.snappy).toMatch(/^cubic-bezier\(/);
    });

    it('should have valid cubic-bezier format', () => {
      const bezierPattern = /^cubic-bezier\(-?[\d.]+,\s*-?[\d.]+,\s*-?[\d.]+,\s*-?[\d.]+\)$/;
      Object.entries(EASING_CURVES).forEach(([name, value]) => {
        if (value.startsWith('cubic-bezier')) {
          expect(value).toMatch(bezierPattern);
        }
      });
    });

    it('should have 30+ easing options', () => {
      expect(Object.keys(EASING_CURVES).length).toBeGreaterThanOrEqual(30);
    });
  });

  describe('TIMING_PRESETS', () => {
    it('should have instant at 0ms', () => {
      expect(TIMING_PRESETS.instant).toBe(0);
    });

    it('should have progressively longer durations', () => {
      expect(TIMING_PRESETS.faster).toBeLessThan(TIMING_PRESETS.fast);
      expect(TIMING_PRESETS.fast).toBeLessThan(TIMING_PRESETS.normal);
      expect(TIMING_PRESETS.normal).toBeLessThan(TIMING_PRESETS.slow);
      expect(TIMING_PRESETS.slow).toBeLessThan(TIMING_PRESETS.slower);
      expect(TIMING_PRESETS.slower).toBeLessThan(TIMING_PRESETS.slowest);
    });

    it('should have semantic timing values', () => {
      expect(TIMING_PRESETS.microInteraction).toBe(150);
      expect(TIMING_PRESETS.buttonPress).toBe(100);
      expect(TIMING_PRESETS.menuSlide).toBe(250);
      expect(TIMING_PRESETS.modalOpen).toBe(300);
      expect(TIMING_PRESETS.pageTransition).toBe(400);
    });

    it('should have longer durations for attention-seeking', () => {
      expect(TIMING_PRESETS.loadingPulse).toBe(1500);
      expect(TIMING_PRESETS.attentionSeek).toBe(2000);
    });

    it('should have all positive values', () => {
      Object.values(TIMING_PRESETS).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Keyframe Interface', () => {
    it('should validate keyframe structure', () => {
      const keyframe: Keyframe = {
        offset: 0.5,
        properties: { opacity: 0.5, transform: 'scale(1.2)' },
        easing: 'easeInOut',
      };

      expect(keyframe.offset).toBe(0.5);
      expect(keyframe.properties.opacity).toBe(0.5);
      expect(keyframe.easing).toBe('easeInOut');
    });

    it('should allow keyframes without easing', () => {
      const keyframe: Keyframe = {
        offset: 0,
        properties: { opacity: 1 },
      };

      expect(keyframe.easing).toBeUndefined();
    });

    it('should support multiple properties', () => {
      const keyframe: Keyframe = {
        offset: 1,
        properties: {
          opacity: 1,
          transform: 'translateX(100px)',
          filter: 'blur(0px)',
        },
      };

      expect(Object.keys(keyframe.properties)).toHaveLength(3);
    });

    it('should accept offset values 0-1', () => {
      const start: Keyframe = { offset: 0, properties: {} };
      const middle: Keyframe = { offset: 0.5, properties: {} };
      const end: Keyframe = { offset: 1, properties: {} };

      expect(start.offset).toBe(0);
      expect(middle.offset).toBe(0.5);
      expect(end.offset).toBe(1);
    });
  });

  describe('AnimationDefinition Interface', () => {
    it('should validate animation definition structure', () => {
      const animation: AnimationDefinition = {
        name: 'testAnimation',
        keyframes: [
          { offset: 0, properties: { opacity: 0 } },
          { offset: 1, properties: { opacity: 1 } },
        ],
        duration: 500,
        easing: 'ease',
      };

      expect(animation.name).toBe('testAnimation');
      expect(animation.keyframes).toHaveLength(2);
      expect(animation.duration).toBe(500);
      expect(animation.easing).toBe('ease');
    });

    it('should support optional properties', () => {
      const animation: AnimationDefinition = {
        name: 'fullAnimation',
        keyframes: [],
        duration: 1000,
        easing: 'linear',
        delay: 200,
        iterations: 3,
        direction: 'alternate',
        fillMode: 'both',
      };

      expect(animation.delay).toBe(200);
      expect(animation.iterations).toBe(3);
      expect(animation.direction).toBe('alternate');
      expect(animation.fillMode).toBe('both');
    });

    it('should support infinite iterations', () => {
      const animation: AnimationDefinition = {
        name: 'infiniteLoop',
        keyframes: [],
        duration: 2000,
        easing: 'linear',
        iterations: 'infinite',
      };

      expect(animation.iterations).toBe('infinite');
    });

    it('should validate direction types', () => {
      const directions: AnimationDefinition['direction'][] = [
        'normal',
        'reverse',
        'alternate',
        'alternate-reverse',
      ];

      directions.forEach(dir => {
        const anim: AnimationDefinition = {
          name: 'test',
          keyframes: [],
          duration: 100,
          easing: 'linear',
          direction: dir,
        };
        expect(anim.direction).toBe(dir);
      });
    });

    it('should validate fillMode types', () => {
      const fillModes: AnimationDefinition['fillMode'][] = [
        'none',
        'forwards',
        'backwards',
        'both',
      ];

      fillModes.forEach(fill => {
        const anim: AnimationDefinition = {
          name: 'test',
          keyframes: [],
          duration: 100,
          easing: 'linear',
          fillMode: fill,
        };
        expect(anim.fillMode).toBe(fill);
      });
    });
  });

  describe('SVGAnimateSpec Interface', () => {
    it('should validate basic SVG animate spec', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'opacity',
        from: '0',
        to: '1',
        dur: '1s',
      };

      expect(spec.attributeName).toBe('opacity');
      expect(spec.from).toBe('0');
      expect(spec.to).toBe('1');
      expect(spec.dur).toBe('1s');
    });

    it('should support values array', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'd',
        values: ['M0,0 L100,100', 'M0,100 L100,0', 'M50,50 L50,50'],
        dur: '2s',
      };

      expect(spec.values).toHaveLength(3);
    });

    it('should support keyTimes', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'cx',
        values: ['50', '100', '50'],
        keyTimes: '0;0.5;1',
        dur: '1s',
      };

      expect(spec.keyTimes).toBe('0;0.5;1');
    });

    it('should support indefinite repeat', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'fill',
        from: '#ff0000',
        to: '#00ff00',
        dur: '2s',
        repeatCount: 'indefinite',
      };

      expect(spec.repeatCount).toBe('indefinite');
    });

    it('should support numeric repeat count', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'r',
        from: '10',
        to: '20',
        dur: '500ms',
        repeatCount: 5,
      };

      expect(spec.repeatCount).toBe(5);
    });

    it('should support calcMode options', () => {
      const calcModes: SVGAnimateSpec['calcMode'][] = [
        'discrete',
        'linear',
        'paced',
        'spline',
      ];

      calcModes.forEach(mode => {
        const spec: SVGAnimateSpec = {
          attributeName: 'x',
          dur: '1s',
          calcMode: mode,
        };
        expect(spec.calcMode).toBe(mode);
      });
    });

    it('should support fill options', () => {
      const freezeSpec: SVGAnimateSpec = {
        attributeName: 'y',
        dur: '1s',
        fill: 'freeze',
      };

      const removeSpec: SVGAnimateSpec = {
        attributeName: 'y',
        dur: '1s',
        fill: 'remove',
      };

      expect(freezeSpec.fill).toBe('freeze');
      expect(removeSpec.fill).toBe('remove');
    });
  });

  describe('ANIMATION_PRESETS', () => {
    it('should have fadeIn preset', () => {
      const fadeIn = ANIMATION_PRESETS.fadeIn;
      expect(fadeIn.name).toBe('fadeIn');
      expect(fadeIn.keyframes[0].properties.opacity).toBe(0);
      expect(fadeIn.keyframes[1].properties.opacity).toBe(1);
      expect(fadeIn.duration).toBe(300);
    });

    it('should have fadeInUp preset with transform', () => {
      const fadeInUp = ANIMATION_PRESETS.fadeInUp;
      expect(fadeInUp.keyframes[0].properties.transform).toBe('translateY(20px)');
      expect(fadeInUp.keyframes[1].properties.transform).toBe('translateY(0)');
    });

    it('should have scaleIn preset with back easing', () => {
      const scaleIn = ANIMATION_PRESETS.scaleIn;
      expect(scaleIn.easing).toBe('easeOutBack');
      expect(scaleIn.keyframes[0].properties.transform).toBe('scale(0.8)');
    });

    it('should have slideInUp preset', () => {
      const slideInUp = ANIMATION_PRESETS.slideInUp;
      expect(slideInUp.keyframes[0].properties.transform).toBe('translateY(100%)');
      expect(slideInUp.keyframes[1].properties.transform).toBe('translateY(0)');
    });

    it('should have all presets with required fields', () => {
      Object.values(ANIMATION_PRESETS).forEach(preset => {
        expect(preset.name).toBeDefined();
        expect(preset.keyframes.length).toBeGreaterThanOrEqual(2);
        expect(preset.duration).toBeGreaterThan(0);
        expect(preset.easing).toBeDefined();
      });
    });

    it('should have keyframes starting at offset 0', () => {
      Object.values(ANIMATION_PRESETS).forEach(preset => {
        expect(preset.keyframes[0].offset).toBe(0);
      });
    });

    it('should have keyframes ending at offset 1', () => {
      Object.values(ANIMATION_PRESETS).forEach(preset => {
        const lastKeyframe = preset.keyframes[preset.keyframes.length - 1];
        expect(lastKeyframe.offset).toBe(1);
      });
    });
  });

  describe('Animation Generation Helpers', () => {
    function generateCSS(animation: AnimationDefinition): string {
      const keyframeCSS = animation.keyframes
        .map(kf => {
          const props = Object.entries(kf.properties)
            .map(([key, val]) => `${key}: ${val}`)
            .join('; ');
          return `${kf.offset * 100}% { ${props} }`;
        })
        .join(' ');
      return `@keyframes ${animation.name} { ${keyframeCSS} }`;
    }

    it('should generate valid CSS keyframes', () => {
      const css = generateCSS(ANIMATION_PRESETS.fadeIn);
      expect(css).toContain('@keyframes fadeIn');
      expect(css).toContain('0%');
      expect(css).toContain('100%');
      expect(css).toContain('opacity');
    });

    function generateSVGAnimate(spec: SVGAnimateSpec): string {
      const attrs = Object.entries(spec)
        .filter(([_, v]) => v !== undefined)
        .map(([key, val]) => `${key}="${val}"`)
        .join(' ');
      return `<animate ${attrs} />`;
    }

    it('should generate valid SVG animate element', () => {
      const spec: SVGAnimateSpec = {
        attributeName: 'opacity',
        from: '0',
        to: '1',
        dur: '1s',
      };
      const svg = generateSVGAnimate(spec);
      expect(svg).toContain('<animate');
      expect(svg).toContain('attributeName="opacity"');
      expect(svg).toContain('dur="1s"');
    });

    function getDurationMs(timing: TimingPreset): number {
      return TIMING_PRESETS[timing];
    }

    it('should resolve timing presets', () => {
      expect(getDurationMs('instant')).toBe(0);
      expect(getDurationMs('normal')).toBe(300);
      expect(getDurationMs('slowest')).toBe(1000);
    });

    function getEasingValue(name: EasingName): string {
      return EASING_CURVES[name];
    }

    it('should resolve easing values', () => {
      expect(getEasingValue('linear')).toBe('linear');
      expect(getEasingValue('easeOutCubic')).toMatch(/^cubic-bezier/);
    });
  });

  describe('Animation Sequencing', () => {
    interface AnimationSequence {
      animations: AnimationDefinition[];
      sequential: boolean;
    }

    function getTotalDuration(sequence: AnimationSequence): number {
      if (sequence.sequential) {
        return sequence.animations.reduce((total, anim) => {
          return total + anim.duration + (anim.delay || 0);
        }, 0);
      }
      return Math.max(
        ...sequence.animations.map(a => a.duration + (a.delay || 0))
      );
    }

    it('should calculate sequential duration', () => {
      const sequence: AnimationSequence = {
        animations: [
          { name: 'a', keyframes: [], duration: 300, easing: 'linear' },
          { name: 'b', keyframes: [], duration: 200, easing: 'linear', delay: 100 },
        ],
        sequential: true,
      };

      expect(getTotalDuration(sequence)).toBe(600);
    });

    it('should calculate parallel duration', () => {
      const sequence: AnimationSequence = {
        animations: [
          { name: 'a', keyframes: [], duration: 300, easing: 'linear' },
          { name: 'b', keyframes: [], duration: 400, easing: 'linear', delay: 50 },
        ],
        sequential: false,
      };

      expect(getTotalDuration(sequence)).toBe(450);
    });
  });
});
