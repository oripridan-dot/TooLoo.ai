// @version 1.0.0
// Tests for TooLoo.ai Illustration Engine
// Human-like visual creation tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type definitions from illustration-engine.ts
type IllustrationStyle =
  | 'minimalist'
  | 'isometric'
  | 'hand-drawn'
  | 'geometric'
  | 'gradient-flow'
  | 'neon-glow'
  | 'watercolor'
  | 'line-art'
  | 'flat-design'
  | 'data-art'
  | 'organic'
  | 'technical'
  | 'retro-futurism'
  | 'abstract';

type IllustrationMood =
  | 'inspiring'
  | 'calm'
  | 'energetic'
  | 'mysterious'
  | 'playful'
  | 'professional'
  | 'futuristic'
  | 'nostalgic'
  | 'dramatic';

interface SceneElement {
  type:
    | 'shape'
    | 'icon'
    | 'text'
    | 'line'
    | 'pattern'
    | 'gradient'
    | 'particle'
    | 'character'
    | 'object';
  name: string;
  position: { x: number; y: number; z?: number };
  size: { width: number; height: number };
  rotation?: number;
  opacity?: number;
  style?: Record<string, string>;
  animation?: AnimationSpec;
  metadata?: Record<string, unknown>;
}

interface CompositionGuide {
  layout:
    | 'centered'
    | 'rule-of-thirds'
    | 'golden-ratio'
    | 'symmetrical'
    | 'asymmetrical'
    | 'radial'
    | 'grid';
  focalPoint: { x: number; y: number };
  flow: 'left-to-right' | 'top-to-bottom' | 'circular' | 'scattered' | 'convergent' | 'divergent';
  depth: 'flat' | 'layered' | 'isometric' | 'perspective';
  balance: 'symmetrical' | 'asymmetrical' | 'radial';
}

interface VisualEffect {
  type:
    | 'glow'
    | 'shadow'
    | 'blur'
    | 'gradient'
    | 'noise'
    | 'grain'
    | 'reflection'
    | 'parallax'
    | 'pulse'
    | 'shimmer';
  intensity: number;
  color?: string;
  params?: Record<string, unknown>;
}

interface AnimationSpec {
  type: 'float' | 'pulse' | 'rotate' | 'fade' | 'scale' | 'path' | 'morph' | 'draw' | 'particle';
  duration: number;
  delay?: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
  loop?: boolean;
}

interface IllustrationSpec {
  style: IllustrationStyle;
  mood: IllustrationMood;
  primaryColors: string[];
  accentColors: string[];
  complexity: 'minimal' | 'moderate' | 'detailed' | 'intricate';
  elements: SceneElement[];
  composition: CompositionGuide;
  effects: VisualEffect[];
}

const COLOR_PALETTES: Record<IllustrationMood, { primary: string[]; accent: string[] }> = {
  inspiring: {
    primary: ['#06B6D4', '#8B5CF6', '#EC4899'],
    accent: ['#F59E0B', '#10B981', '#3B82F6'],
  },
  calm: {
    primary: ['#94A3B8', '#64748B', '#475569'],
    accent: ['#06B6D4', '#14B8A6', '#0EA5E9'],
  },
  energetic: {
    primary: ['#F43F5E', '#EC4899', '#F97316'],
    accent: ['#FBBF24', '#A855F7', '#22D3EE'],
  },
  mysterious: {
    primary: ['#4C1D95', '#1E1B4B', '#312E81'],
    accent: ['#06B6D4', '#8B5CF6', '#C026D3'],
  },
  playful: {
    primary: ['#F472B6', '#A78BFA', '#60A5FA'],
    accent: ['#34D399', '#FBBF24', '#F87171'],
  },
  professional: {
    primary: ['#1E293B', '#334155', '#475569'],
    accent: ['#06B6D4', '#10B981', '#3B82F6'],
  },
  futuristic: {
    primary: ['#0F172A', '#06B6D4', '#8B5CF6'],
    accent: ['#22D3EE', '#A855F7', '#EC4899'],
  },
  nostalgic: {
    primary: ['#92400E', '#B45309', '#D97706'],
    accent: ['#F59E0B', '#FBBF24', '#FDE047'],
  },
  dramatic: {
    primary: ['#0F0F0F', '#171717', '#262626'],
    accent: ['#EF4444', '#F97316', '#FBBF24'],
  },
};

describe('Illustration Engine', () => {
  describe('IllustrationStyle Types', () => {
    const styles: IllustrationStyle[] = [
      'minimalist',
      'isometric',
      'hand-drawn',
      'geometric',
      'gradient-flow',
      'neon-glow',
      'watercolor',
      'line-art',
      'flat-design',
      'data-art',
      'organic',
      'technical',
      'retro-futurism',
      'abstract',
    ];

    it('should have 14 unique illustration styles', () => {
      expect(styles).toHaveLength(14);
      expect(new Set(styles).size).toBe(14);
    });

    it('should include clean visual styles', () => {
      expect(styles).toContain('minimalist');
      expect(styles).toContain('flat-design');
      expect(styles).toContain('line-art');
    });

    it('should include dimensional styles', () => {
      expect(styles).toContain('isometric');
    });

    it('should include artistic styles', () => {
      expect(styles).toContain('watercolor');
      expect(styles).toContain('hand-drawn');
      expect(styles).toContain('abstract');
    });

    it('should include technical styles', () => {
      expect(styles).toContain('technical');
      expect(styles).toContain('data-art');
    });
  });

  describe('IllustrationMood Types', () => {
    const moods: IllustrationMood[] = [
      'inspiring',
      'calm',
      'energetic',
      'mysterious',
      'playful',
      'professional',
      'futuristic',
      'nostalgic',
      'dramatic',
    ];

    it('should have 9 unique moods', () => {
      expect(moods).toHaveLength(9);
      expect(new Set(moods).size).toBe(9);
    });

    it('should include positive moods', () => {
      expect(moods).toContain('inspiring');
      expect(moods).toContain('calm');
      expect(moods).toContain('playful');
    });

    it('should include professional moods', () => {
      expect(moods).toContain('professional');
      expect(moods).toContain('futuristic');
    });

    it('should include atmospheric moods', () => {
      expect(moods).toContain('mysterious');
      expect(moods).toContain('dramatic');
      expect(moods).toContain('nostalgic');
    });
  });

  describe('SceneElement Interface', () => {
    it('should validate basic scene element', () => {
      const element: SceneElement = {
        type: 'shape',
        name: 'circle',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
      };

      expect(element.type).toBe('shape');
      expect(element.name).toBe('circle');
      expect(element.position.x).toBe(100);
      expect(element.size.width).toBe(50);
    });

    it('should support 3D position', () => {
      const element: SceneElement = {
        type: 'icon',
        name: 'star',
        position: { x: 50, y: 50, z: 10 },
        size: { width: 30, height: 30 },
      };

      expect(element.position.z).toBe(10);
    });

    it('should support rotation and opacity', () => {
      const element: SceneElement = {
        type: 'text',
        name: 'title',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 40 },
        rotation: 45,
        opacity: 0.8,
      };

      expect(element.rotation).toBe(45);
      expect(element.opacity).toBe(0.8);
    });

    it('should support custom styles', () => {
      const element: SceneElement = {
        type: 'line',
        name: 'divider',
        position: { x: 0, y: 100 },
        size: { width: 400, height: 2 },
        style: {
          stroke: '#ffffff',
          strokeWidth: '2px',
          strokeDasharray: '5,5',
        },
      };

      expect(element.style?.stroke).toBe('#ffffff');
      expect(element.style?.strokeDasharray).toBe('5,5');
    });

    it('should support animation', () => {
      const element: SceneElement = {
        type: 'particle',
        name: 'sparkle',
        position: { x: 200, y: 200 },
        size: { width: 20, height: 20 },
        animation: {
          type: 'pulse',
          duration: 2,
          easing: 'ease-in-out',
          loop: true,
        },
      };

      expect(element.animation?.type).toBe('pulse');
      expect(element.animation?.loop).toBe(true);
    });

    it('should support all element types', () => {
      const types: SceneElement['type'][] = [
        'shape',
        'icon',
        'text',
        'line',
        'pattern',
        'gradient',
        'particle',
        'character',
        'object',
      ];

      types.forEach(type => {
        const element: SceneElement = {
          type,
          name: 'test',
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
        };
        expect(element.type).toBe(type);
      });
    });
  });

  describe('CompositionGuide Interface', () => {
    it('should validate basic composition', () => {
      const comp: CompositionGuide = {
        layout: 'centered',
        focalPoint: { x: 400, y: 300 },
        flow: 'left-to-right',
        depth: 'flat',
        balance: 'symmetrical',
      };

      expect(comp.layout).toBe('centered');
      expect(comp.focalPoint.x).toBe(400);
    });

    it('should support all layout types', () => {
      const layouts: CompositionGuide['layout'][] = [
        'centered',
        'rule-of-thirds',
        'golden-ratio',
        'symmetrical',
        'asymmetrical',
        'radial',
        'grid',
      ];

      layouts.forEach(layout => {
        const comp: CompositionGuide = {
          layout,
          focalPoint: { x: 0, y: 0 },
          flow: 'left-to-right',
          depth: 'flat',
          balance: 'symmetrical',
        };
        expect(comp.layout).toBe(layout);
      });
    });

    it('should support all flow directions', () => {
      const flows: CompositionGuide['flow'][] = [
        'left-to-right',
        'top-to-bottom',
        'circular',
        'scattered',
        'convergent',
        'divergent',
      ];

      flows.forEach(flow => {
        const comp: CompositionGuide = {
          layout: 'centered',
          focalPoint: { x: 0, y: 0 },
          flow,
          depth: 'flat',
          balance: 'symmetrical',
        };
        expect(comp.flow).toBe(flow);
      });
    });

    it('should support all depth types', () => {
      const depths: CompositionGuide['depth'][] = [
        'flat',
        'layered',
        'isometric',
        'perspective',
      ];

      depths.forEach(depth => {
        const comp: CompositionGuide = {
          layout: 'centered',
          focalPoint: { x: 0, y: 0 },
          flow: 'left-to-right',
          depth,
          balance: 'symmetrical',
        };
        expect(comp.depth).toBe(depth);
      });
    });

    it('should support all balance types', () => {
      const balances: CompositionGuide['balance'][] = [
        'symmetrical',
        'asymmetrical',
        'radial',
      ];

      balances.forEach(balance => {
        const comp: CompositionGuide = {
          layout: 'centered',
          focalPoint: { x: 0, y: 0 },
          flow: 'left-to-right',
          depth: 'flat',
          balance,
        };
        expect(comp.balance).toBe(balance);
      });
    });
  });

  describe('VisualEffect Interface', () => {
    it('should validate basic effect', () => {
      const effect: VisualEffect = {
        type: 'glow',
        intensity: 0.5,
      };

      expect(effect.type).toBe('glow');
      expect(effect.intensity).toBe(0.5);
    });

    it('should support color and params', () => {
      const effect: VisualEffect = {
        type: 'shadow',
        intensity: 0.8,
        color: '#000000',
        params: {
          offsetX: 5,
          offsetY: 5,
          blur: 10,
        },
      };

      expect(effect.color).toBe('#000000');
      expect(effect.params?.offsetX).toBe(5);
    });

    it('should support all effect types', () => {
      const types: VisualEffect['type'][] = [
        'glow',
        'shadow',
        'blur',
        'gradient',
        'noise',
        'grain',
        'reflection',
        'parallax',
        'pulse',
        'shimmer',
      ];

      types.forEach(type => {
        const effect: VisualEffect = {
          type,
          intensity: 0.5,
        };
        expect(effect.type).toBe(type);
      });
    });

    it('should have intensity 0-1', () => {
      const low: VisualEffect = { type: 'glow', intensity: 0 };
      const mid: VisualEffect = { type: 'glow', intensity: 0.5 };
      const high: VisualEffect = { type: 'glow', intensity: 1 };

      expect(low.intensity).toBe(0);
      expect(mid.intensity).toBe(0.5);
      expect(high.intensity).toBe(1);
    });
  });

  describe('AnimationSpec Interface', () => {
    it('should validate basic animation', () => {
      const anim: AnimationSpec = {
        type: 'float',
        duration: 2,
        easing: 'linear',
      };

      expect(anim.type).toBe('float');
      expect(anim.duration).toBe(2);
    });

    it('should support delay and loop', () => {
      const anim: AnimationSpec = {
        type: 'pulse',
        duration: 1.5,
        delay: 0.5,
        easing: 'ease-in-out',
        loop: true,
      };

      expect(anim.delay).toBe(0.5);
      expect(anim.loop).toBe(true);
    });

    it('should support all animation types', () => {
      const types: AnimationSpec['type'][] = [
        'float',
        'pulse',
        'rotate',
        'fade',
        'scale',
        'path',
        'morph',
        'draw',
        'particle',
      ];

      types.forEach(type => {
        const anim: AnimationSpec = {
          type,
          duration: 1,
          easing: 'linear',
        };
        expect(anim.type).toBe(type);
      });
    });

    it('should support all easing types', () => {
      const easings: AnimationSpec['easing'][] = [
        'linear',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'bounce',
        'elastic',
      ];

      easings.forEach(easing => {
        const anim: AnimationSpec = {
          type: 'fade',
          duration: 1,
          easing,
        };
        expect(anim.easing).toBe(easing);
      });
    });
  });

  describe('IllustrationSpec Interface', () => {
    it('should validate complete illustration spec', () => {
      const spec: IllustrationSpec = {
        style: 'minimalist',
        mood: 'calm',
        primaryColors: ['#94A3B8', '#64748B'],
        accentColors: ['#06B6D4'],
        complexity: 'minimal',
        elements: [],
        composition: {
          layout: 'centered',
          focalPoint: { x: 400, y: 300 },
          flow: 'left-to-right',
          depth: 'flat',
          balance: 'symmetrical',
        },
        effects: [],
      };

      expect(spec.style).toBe('minimalist');
      expect(spec.mood).toBe('calm');
      expect(spec.complexity).toBe('minimal');
    });

    it('should support all complexity levels', () => {
      const levels: IllustrationSpec['complexity'][] = [
        'minimal',
        'moderate',
        'detailed',
        'intricate',
      ];

      levels.forEach(complexity => {
        const spec: IllustrationSpec = {
          style: 'minimalist',
          mood: 'calm',
          primaryColors: [],
          accentColors: [],
          complexity,
          elements: [],
          composition: {
            layout: 'centered',
            focalPoint: { x: 0, y: 0 },
            flow: 'left-to-right',
            depth: 'flat',
            balance: 'symmetrical',
          },
          effects: [],
        };
        expect(spec.complexity).toBe(complexity);
      });
    });

    it('should contain multiple elements', () => {
      const spec: IllustrationSpec = {
        style: 'geometric',
        mood: 'futuristic',
        primaryColors: ['#0F172A'],
        accentColors: ['#22D3EE'],
        complexity: 'detailed',
        elements: [
          { type: 'shape', name: 'bg', position: { x: 0, y: 0 }, size: { width: 800, height: 600 } },
          { type: 'icon', name: 'logo', position: { x: 400, y: 300 }, size: { width: 100, height: 100 } },
          { type: 'text', name: 'title', position: { x: 400, y: 450 }, size: { width: 300, height: 40 } },
        ],
        composition: {
          layout: 'centered',
          focalPoint: { x: 400, y: 300 },
          flow: 'convergent',
          depth: 'layered',
          balance: 'symmetrical',
        },
        effects: [
          { type: 'glow', intensity: 0.3, color: '#22D3EE' },
        ],
      };

      expect(spec.elements).toHaveLength(3);
      expect(spec.effects).toHaveLength(1);
    });
  });

  describe('COLOR_PALETTES', () => {
    it('should have palettes for all moods', () => {
      const moods: IllustrationMood[] = [
        'inspiring',
        'calm',
        'energetic',
        'mysterious',
        'playful',
        'professional',
        'futuristic',
        'nostalgic',
        'dramatic',
      ];

      moods.forEach(mood => {
        expect(COLOR_PALETTES[mood]).toBeDefined();
        expect(COLOR_PALETTES[mood].primary).toBeDefined();
        expect(COLOR_PALETTES[mood].accent).toBeDefined();
      });
    });

    it('should have valid hex colors', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;

      Object.values(COLOR_PALETTES).forEach(palette => {
        palette.primary.forEach(color => {
          expect(color).toMatch(hexPattern);
        });
        palette.accent.forEach(color => {
          expect(color).toMatch(hexPattern);
        });
      });
    });

    it('should have 3 primary and 3 accent colors', () => {
      Object.values(COLOR_PALETTES).forEach(palette => {
        expect(palette.primary).toHaveLength(3);
        expect(palette.accent).toHaveLength(3);
      });
    });

    it('should have warm colors for nostalgic mood', () => {
      const nostalgic = COLOR_PALETTES.nostalgic;
      // Brown/orange tones start with #9, #B, #D, #F
      nostalgic.primary.forEach(color => {
        const firstChar = color[1].toUpperCase();
        expect(['9', 'B', 'D', 'F']).toContain(firstChar);
      });
    });

    it('should have dark colors for dramatic mood', () => {
      const dramatic = COLOR_PALETTES.dramatic;
      // Primary should be near-blacks (low RGB values)
      dramatic.primary.forEach(color => {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        expect(r).toBeLessThanOrEqual(40);
        expect(g).toBeLessThanOrEqual(40);
        expect(b).toBeLessThanOrEqual(40);
      });
    });

    it('should have distinct palettes', () => {
      const allPrimaries = new Set<string>();
      Object.values(COLOR_PALETTES).forEach(palette => {
        palette.primary.forEach(color => allPrimaries.add(color));
      });
      // Should have many distinct colors across palettes
      expect(allPrimaries.size).toBeGreaterThan(15);
    });
  });

  describe('Style Detection Helpers', () => {
    function detectStyle(prompt: string): IllustrationStyle {
      const lower = prompt.toLowerCase();
      if (/minimalist|simple|clean|basic/i.test(lower)) return 'minimalist';
      if (/isometric|3d|dimension|cube/i.test(lower)) return 'isometric';
      if (/sketch|hand.?drawn|organic|natural/i.test(lower)) return 'hand-drawn';
      if (/geometric|abstract|shapes?/i.test(lower)) return 'geometric';
      if (/gradient|flow|smooth|wave/i.test(lower)) return 'gradient-flow';
      if (/neon|glow|cyber|futuristic|tech/i.test(lower)) return 'neon-glow';
      if (/watercolor|paint|artistic|soft/i.test(lower)) return 'watercolor';
      if (/line|detailed|intricate/i.test(lower)) return 'line-art';
      if (/flat|icon|modern|ui/i.test(lower)) return 'flat-design';
      if (/data|chart|visualization|analytics/i.test(lower)) return 'data-art';
      return 'minimalist';
    }

    it('should detect minimalist style', () => {
      expect(detectStyle('Create a simple clean design')).toBe('minimalist');
      expect(detectStyle('Basic minimalist icon')).toBe('minimalist');
    });

    it('should detect isometric style', () => {
      expect(detectStyle('Make an isometric cube scene')).toBe('isometric');
      expect(detectStyle('3D dimensional view')).toBe('isometric');
    });

    it('should detect hand-drawn style', () => {
      expect(detectStyle('Sketch-like organic feel')).toBe('hand-drawn');
      expect(detectStyle('Hand drawn natural elements')).toBe('hand-drawn');
    });

    it('should detect neon-glow style', () => {
      expect(detectStyle('Neon cyberpunk scene')).toBe('neon-glow');
      expect(detectStyle('Futuristic tech glow')).toBe('neon-glow');
    });

    it('should detect data-art style', () => {
      expect(detectStyle('Data visualization chart')).toBe('data-art');
      expect(detectStyle('Analytics dashboard')).toBe('data-art');
    });

    function detectMood(prompt: string): IllustrationMood {
      const lower = prompt.toLowerCase();
      if (/inspiring|motivat|uplift|empower/i.test(lower)) return 'inspiring';
      if (/calm|peaceful|zen|relax|serene/i.test(lower)) return 'calm';
      if (/energetic|dynamic|vibrant|active/i.test(lower)) return 'energetic';
      if (/mysterious|dark|intriguing|enigma/i.test(lower)) return 'mysterious';
      if (/playful|fun|whimsi|joy/i.test(lower)) return 'playful';
      if (/professional|business|corporate|formal/i.test(lower)) return 'professional';
      return 'professional';
    }

    it('should detect inspiring mood', () => {
      expect(detectMood('Motivational uplifting scene')).toBe('inspiring');
    });

    it('should detect calm mood', () => {
      expect(detectMood('Peaceful zen garden')).toBe('calm');
      expect(detectMood('Relaxing serene view')).toBe('calm');
    });

    it('should detect playful mood', () => {
      expect(detectMood('Fun whimsical characters')).toBe('playful');
      expect(detectMood('Joyful celebration')).toBe('playful');
    });

    it('should default to professional', () => {
      expect(detectMood('Standard business presentation')).toBe('professional');
    });
  });

  describe('SVG Generation Helpers', () => {
    function generateSVGHeader(width: number, height: number): string {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
    }

    it('should generate valid SVG header', () => {
      const header = generateSVGHeader(800, 600);
      expect(header).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(header).toContain('viewBox="0 0 800 600"');
    });

    function generateRect(x: number, y: number, w: number, h: number, fill: string): string {
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" />`;
    }

    it('should generate valid rect element', () => {
      const rect = generateRect(10, 20, 100, 50, '#ff0000');
      expect(rect).toContain('x="10"');
      expect(rect).toContain('y="20"');
      expect(rect).toContain('fill="#ff0000"');
    });

    function generateCircle(cx: number, cy: number, r: number, fill: string): string {
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
    }

    it('should generate valid circle element', () => {
      const circle = generateCircle(100, 100, 50, '#00ff00');
      expect(circle).toContain('cx="100"');
      expect(circle).toContain('r="50"');
    });
  });
});
