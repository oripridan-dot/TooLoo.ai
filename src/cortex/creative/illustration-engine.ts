// @version 2.2.612
// TooLoo.ai Advanced Illustration Engine
// Human-like visual creation with intelligent scene composition
// Generates rich SVG illustrations, artistic renders, and visual metaphors

import { bus } from '../../core/event-bus.js';

// ============================================================================
// ILLUSTRATION TYPES & STYLES
// ============================================================================

export type IllustrationStyle =
  | 'minimalist' // Clean lines, simple shapes
  | 'isometric' // 3D isometric perspective
  | 'hand-drawn' // Sketch-like, organic
  | 'geometric' // Abstract geometric shapes
  | 'gradient-flow' // Smooth gradients and flows
  | 'neon-glow' // Cyberpunk neon aesthetics
  | 'watercolor' // Soft, painterly washes
  | 'line-art' // Detailed line illustrations
  | 'flat-design' // Modern flat icons/scenes
  | 'data-art' // Artistic data visualization
  | 'organic' // Nature-inspired, flowing
  | 'technical' // Blueprint, schematic style
  | 'retro-futurism' // Vintage sci-fi aesthetic
  | 'abstract'; // Non-representational art

export type IllustrationMood =
  | 'inspiring' // Uplifting, motivational
  | 'calm' // Peaceful, zen-like
  | 'energetic' // Dynamic, vibrant
  | 'mysterious' // Intriguing, dark
  | 'playful' // Fun, whimsical
  | 'professional' // Clean, business-like
  | 'futuristic' // Tech-forward, innovative
  | 'nostalgic' // Warm, familiar
  | 'dramatic'; // Bold, impactful

export interface IllustrationSpec {
  style: IllustrationStyle;
  mood: IllustrationMood;
  primaryColors: string[];
  accentColors: string[];
  complexity: 'minimal' | 'moderate' | 'detailed' | 'intricate';
  elements: SceneElement[];
  composition: CompositionGuide;
  effects: VisualEffect[];
}

export interface SceneElement {
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

export interface CompositionGuide {
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

export interface VisualEffect {
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
  intensity: number; // 0-1
  color?: string;
  params?: Record<string, unknown>;
}

export interface AnimationSpec {
  type: 'float' | 'pulse' | 'rotate' | 'fade' | 'scale' | 'path' | 'morph' | 'draw' | 'particle';
  duration: number; // seconds
  delay?: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
  loop?: boolean;
}

// ============================================================================
// COLOR PALETTES - Curated for different moods
// ============================================================================

export const COLOR_PALETTES: Record<IllustrationMood, { primary: string[]; accent: string[] }> = {
  inspiring: {
    primary: ['#06B6D4', '#8B5CF6', '#EC4899'], // Cyan, Purple, Pink
    accent: ['#F59E0B', '#10B981', '#3B82F6'], // Amber, Emerald, Blue
  },
  calm: {
    primary: ['#94A3B8', '#64748B', '#475569'], // Slate grays
    accent: ['#06B6D4', '#14B8A6', '#0EA5E9'], // Teals and blues
  },
  energetic: {
    primary: ['#F43F5E', '#EC4899', '#F97316'], // Rose, Pink, Orange
    accent: ['#FBBF24', '#A855F7', '#22D3EE'], // Yellow, Purple, Cyan
  },
  mysterious: {
    primary: ['#4C1D95', '#1E1B4B', '#312E81'], // Deep purples
    accent: ['#06B6D4', '#8B5CF6', '#C026D3'], // Cyan, Purple, Fuchsia
  },
  playful: {
    primary: ['#F472B6', '#A78BFA', '#60A5FA'], // Pink, Purple, Blue
    accent: ['#34D399', '#FBBF24', '#F87171'], // Green, Yellow, Red
  },
  professional: {
    primary: ['#1E293B', '#334155', '#475569'], // Dark slates
    accent: ['#06B6D4', '#10B981', '#3B82F6'], // Cyan, Emerald, Blue
  },
  futuristic: {
    primary: ['#0F172A', '#06B6D4', '#8B5CF6'], // Dark, Cyan, Purple
    accent: ['#22D3EE', '#A855F7', '#EC4899'], // Light cyan, Purple, Pink
  },
  nostalgic: {
    primary: ['#92400E', '#B45309', '#D97706'], // Warm browns/oranges
    accent: ['#F59E0B', '#FBBF24', '#FDE047'], // Yellows
  },
  dramatic: {
    primary: ['#0F0F0F', '#171717', '#262626'], // Near blacks
    accent: ['#EF4444', '#F97316', '#FBBF24'], // Red, Orange, Yellow
  },
};

// ============================================================================
// ILLUSTRATION GENERATION ENGINE
// ============================================================================

export class IllustrationEngine {
  private defaultWidth = 800;
  private defaultHeight = 600;

  /**
   * Analyze a prompt and determine the best illustration approach
   */
  analyzePrompt(prompt: string): IllustrationSpec {
    const style = this.detectStyle(prompt);
    const mood = this.detectMood(prompt);
    const palette = COLOR_PALETTES[mood];
    const complexity = this.detectComplexity(prompt);

    return {
      style,
      mood,
      primaryColors: palette.primary,
      accentColors: palette.accent,
      complexity,
      elements: this.planElements(prompt, style),
      composition: this.planComposition(prompt, style),
      effects: this.selectEffects(style, mood),
    };
  }

  /**
   * Detect illustration style from prompt
   */
  private detectStyle(prompt: string): IllustrationStyle {
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
    if (/nature|organic|flowing|living/i.test(lower)) return 'organic';
    if (/technical|blueprint|schematic|engineering/i.test(lower)) return 'technical';
    if (/retro|vintage|classic|old.?school/i.test(lower)) return 'retro-futurism';
    if (/abstract|experimental|avant.?garde/i.test(lower)) return 'abstract';

    // Default based on content
    if (/code|api|function|system/i.test(lower)) return 'technical';
    if (/creative|imagination|dream/i.test(lower)) return 'gradient-flow';
    if (/business|professional|corporate/i.test(lower)) return 'flat-design';

    return 'gradient-flow'; // Beautiful default
  }

  /**
   * Detect emotional mood from prompt
   */
  private detectMood(prompt: string): IllustrationMood {
    const lower = prompt.toLowerCase();

    if (/inspire|motivate|empower|achieve/i.test(lower)) return 'inspiring';
    if (/calm|peaceful|zen|relax|serene/i.test(lower)) return 'calm';
    if (/energy|dynamic|vibrant|exciting|fast/i.test(lower)) return 'energetic';
    if (/mystery|dark|secret|hidden|unknown/i.test(lower)) return 'mysterious';
    if (/fun|playful|whimsical|cute|joy/i.test(lower)) return 'playful';
    if (/professional|business|corporate|formal/i.test(lower)) return 'professional';
    if (/future|innovation|tech|ai|cyber/i.test(lower)) return 'futuristic';
    if (/nostalgia|memory|classic|retro|vintage/i.test(lower)) return 'nostalgic';
    if (/dramatic|bold|impact|powerful|intense/i.test(lower)) return 'dramatic';

    return 'inspiring'; // Default mood
  }

  /**
   * Detect complexity level
   */
  private detectComplexity(prompt: string): IllustrationSpec['complexity'] {
    const lower = prompt.toLowerCase();

    if (/simple|basic|quick|minimal/i.test(lower)) return 'minimal';
    if (/detailed|complex|comprehensive|thorough/i.test(lower)) return 'detailed';
    if (/intricate|elaborate|extensive|complete/i.test(lower)) return 'intricate';

    // Based on prompt length and specificity
    if (prompt.length < 50) return 'minimal';
    if (prompt.length > 200) return 'detailed';

    return 'moderate';
  }

  /**
   * Plan scene elements based on prompt analysis
   */
  private planElements(prompt: string, style: IllustrationStyle): SceneElement[] {
    const elements: SceneElement[] = [];

    // Background element
    elements.push({
      type: 'gradient',
      name: 'background',
      position: { x: 0, y: 0 },
      size: { width: this.defaultWidth, height: this.defaultHeight },
      style: { background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 100%)' },
    });

    // Add style-specific elements
    switch (style) {
      case 'isometric':
        elements.push(...this.createIsometricElements());
        break;
      case 'neon-glow':
        elements.push(...this.createNeonElements());
        break;
      case 'gradient-flow':
        elements.push(...this.createFlowElements());
        break;
      case 'geometric':
        elements.push(...this.createGeometricElements());
        break;
      default:
        elements.push(...this.createDefaultElements());
    }

    return elements;
  }

  /**
   * Plan composition and layout
   */
  private planComposition(prompt: string, style: IllustrationStyle): CompositionGuide {
    return {
      layout: style === 'isometric' ? 'asymmetrical' : 'rule-of-thirds',
      focalPoint: { x: 0.5, y: 0.4 }, // Slightly above center
      flow: style === 'organic' ? 'circular' : 'left-to-right',
      depth: style === 'isometric' ? 'isometric' : 'layered',
      balance: style === 'geometric' ? 'symmetrical' : 'asymmetrical',
    };
  }

  /**
   * Select visual effects based on style and mood
   */
  private selectEffects(style: IllustrationStyle, mood: IllustrationMood): VisualEffect[] {
    const effects: VisualEffect[] = [];

    // Glow for neon style
    if (style === 'neon-glow' || mood === 'futuristic') {
      effects.push({ type: 'glow', intensity: 0.8, color: '#06B6D4' });
    }

    // Soft shadows for depth
    if (style !== 'flat-design') {
      effects.push({ type: 'shadow', intensity: 0.3 });
    }

    // Gradient overlays
    if (style === 'gradient-flow') {
      effects.push({ type: 'gradient', intensity: 0.5 });
    }

    // Shimmer for mystery
    if (mood === 'mysterious' || mood === 'inspiring') {
      effects.push({ type: 'shimmer', intensity: 0.2 });
    }

    return effects;
  }

  // Element generators
  private createIsometricElements(): SceneElement[] {
    return [
      {
        type: 'shape',
        name: 'iso-cube-1',
        position: { x: 300, y: 200, z: 0 },
        size: { width: 100, height: 100 },
      },
      {
        type: 'shape',
        name: 'iso-cube-2',
        position: { x: 400, y: 250, z: 50 },
        size: { width: 80, height: 80 },
      },
      {
        type: 'shape',
        name: 'iso-cube-3',
        position: { x: 350, y: 150, z: 100 },
        size: { width: 60, height: 60 },
      },
    ];
  }

  private createNeonElements(): SceneElement[] {
    return [
      {
        type: 'line',
        name: 'neon-circle',
        position: { x: 400, y: 300 },
        size: { width: 200, height: 200 },
        style: { stroke: '#06B6D4', filter: 'drop-shadow(0 0 10px #06B6D4)' },
      },
      {
        type: 'line',
        name: 'neon-line-1',
        position: { x: 100, y: 100 },
        size: { width: 600, height: 2 },
        style: { stroke: '#8B5CF6', filter: 'drop-shadow(0 0 8px #8B5CF6)' },
      },
      {
        type: 'line',
        name: 'neon-line-2',
        position: { x: 100, y: 500 },
        size: { width: 600, height: 2 },
        style: { stroke: '#EC4899', filter: 'drop-shadow(0 0 8px #EC4899)' },
      },
    ];
  }

  private createFlowElements(): SceneElement[] {
    return [
      {
        type: 'gradient',
        name: 'flow-blob-1',
        position: { x: 200, y: 200 },
        size: { width: 300, height: 300 },
        style: { fill: 'url(#gradient1)', opacity: '0.6' },
      },
      {
        type: 'gradient',
        name: 'flow-blob-2',
        position: { x: 400, y: 300 },
        size: { width: 250, height: 250 },
        style: { fill: 'url(#gradient2)', opacity: '0.5' },
      },
      {
        type: 'gradient',
        name: 'flow-blob-3',
        position: { x: 300, y: 150 },
        size: { width: 200, height: 200 },
        style: { fill: 'url(#gradient3)', opacity: '0.4' },
      },
    ];
  }

  private createGeometricElements(): SceneElement[] {
    return [
      {
        type: 'shape',
        name: 'geo-triangle',
        position: { x: 400, y: 100 },
        size: { width: 150, height: 130 },
      },
      {
        type: 'shape',
        name: 'geo-circle',
        position: { x: 200, y: 300 },
        size: { width: 120, height: 120 },
      },
      {
        type: 'shape',
        name: 'geo-square',
        position: { x: 500, y: 350 },
        size: { width: 100, height: 100 },
      },
      {
        type: 'shape',
        name: 'geo-hexagon',
        position: { x: 350, y: 250 },
        size: { width: 80, height: 90 },
      },
    ];
  }

  private createDefaultElements(): SceneElement[] {
    return [
      {
        type: 'shape',
        name: 'default-main',
        position: { x: 400, y: 300 },
        size: { width: 200, height: 200 },
      },
      {
        type: 'line',
        name: 'default-accent',
        position: { x: 100, y: 100 },
        size: { width: 600, height: 400 },
      },
    ];
  }

  /**
   * Generate SVG illustration from spec
   */
  generateSVG(spec: IllustrationSpec, width = 800, height = 600): string {
    const gradients = this.generateGradientDefs(spec);
    const filters = this.generateFilterDefs(spec);
    const elements = this.renderElements(spec);

    return `<svg viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradients}
    ${filters}
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Visual elements -->
  ${elements}
</svg>`;
  }

  /**
   * Generate gradient definitions
   */
  private generateGradientDefs(spec: IllustrationSpec): string {
    const [p1, p2, p3] = spec.primaryColors;
    const [a1, a2] = spec.accentColors;

    return `
    <!-- Background gradient -->
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </radialGradient>
    
    <!-- Primary gradients -->
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p1}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${p2}" stop-opacity="0.4"/>
    </linearGradient>
    
    <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${p2}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${p3}" stop-opacity="0.3"/>
    </linearGradient>
    
    <linearGradient id="gradient3" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="${a1}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${a2}" stop-opacity="0.2"/>
    </linearGradient>
    
    <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${p1}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${p1}" stop-opacity="0"/>
    </radialGradient>`;
  }

  /**
   * Generate filter definitions for effects
   */
  private generateFilterDefs(spec: IllustrationSpec): string {
    return `
    <!-- Glow effect -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    
    <!-- Soft shadow -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="4" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    
    <!-- Blur effect -->
    <filter id="blur">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    
    <!-- Noise texture -->
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/>
    </filter>`;
  }

  /**
   * Render SVG elements from spec
   */
  private renderElements(spec: IllustrationSpec): string {
    const elements: string[] = [];

    // Add decorative background elements
    elements.push(this.renderBackgroundDecor(spec));

    // Add main visual elements based on style
    switch (spec.style) {
      case 'neon-glow':
        elements.push(this.renderNeonScene(spec));
        break;
      case 'gradient-flow':
        elements.push(this.renderFlowScene(spec));
        break;
      case 'isometric':
        elements.push(this.renderIsometricScene(spec));
        break;
      case 'geometric':
        elements.push(this.renderGeometricScene(spec));
        break;
      default:
        elements.push(this.renderDefaultScene(spec));
    }

    // Add foreground effects
    elements.push(this.renderForegroundEffects(spec));

    return elements.join('\n');
  }

  private renderBackgroundDecor(spec: IllustrationSpec): string {
    const [p1, p2] = spec.primaryColors;
    return `
  <!-- Background decoration -->
  <g opacity="0.3">
    <circle cx="100" cy="100" r="200" fill="url(#glowGradient)"/>
    <circle cx="700" cy="500" r="150" fill="url(#glowGradient)"/>
  </g>
  
  <!-- Subtle grid -->
  <g stroke="${p1}" stroke-opacity="0.05" stroke-width="1">
    ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="600"/>`).join('\n    ')}
    ${Array.from({ length: 15 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="800" y2="${i * 40}"/>`).join('\n    ')}
  </g>`;
  }

  private renderNeonScene(spec: IllustrationSpec): string {
    const [p1, p2, p3] = spec.primaryColors;
    const [a1] = spec.accentColors;

    return `
  <!-- Neon scene -->
  <g filter="url(#glow)">
    <!-- Main neon ring -->
    <circle cx="400" cy="300" r="150" fill="none" stroke="${p1}" stroke-width="3" opacity="0.9">
      <animate attributeName="r" values="150;155;150" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="400" cy="300" r="120" fill="none" stroke="${p2}" stroke-width="2" opacity="0.7"/>
    <circle cx="400" cy="300" r="90" fill="none" stroke="${p3}" stroke-width="2" opacity="0.5"/>
    
    <!-- Neon accent lines -->
    <line x1="50" y1="100" x2="350" y2="100" stroke="${a1}" stroke-width="2" opacity="0.8"/>
    <line x1="450" y1="500" x2="750" y2="500" stroke="${p1}" stroke-width="2" opacity="0.8"/>
    
    <!-- Central glow -->
    <circle cx="400" cy="300" r="40" fill="${p1}" opacity="0.3"/>
    <circle cx="400" cy="300" r="20" fill="${p1}" opacity="0.5"/>
    <circle cx="400" cy="300" r="8" fill="white" opacity="0.9"/>
  </g>
  
  <!-- Floating particles -->
  <g>
    ${this.generateParticles(spec, 20)}
  </g>`;
  }

  private renderFlowScene(spec: IllustrationSpec): string {
    const [p1, p2, p3] = spec.primaryColors;

    return `
  <!-- Flow scene with organic blobs -->
  <g filter="url(#blur)">
    <!-- Large flowing blobs -->
    <ellipse cx="250" cy="250" rx="180" ry="150" fill="url(#gradient1)" opacity="0.6">
      <animate attributeName="rx" values="180;200;180" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="ry" values="150;130;150" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    
    <ellipse cx="550" cy="350" rx="150" ry="180" fill="url(#gradient2)" opacity="0.5">
      <animate attributeName="rx" values="150;170;150" dur="3.5s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="350;340;350" dur="4s" repeatCount="indefinite"/>
    </ellipse>
    
    <ellipse cx="400" cy="200" rx="120" ry="100" fill="url(#gradient3)" opacity="0.4">
      <animate attributeName="ry" values="100;115;100" dur="5s" repeatCount="indefinite"/>
    </ellipse>
  </g>
  
  <!-- Crisp accent elements -->
  <g filter="url(#glow)">
    <circle cx="400" cy="300" r="80" fill="none" stroke="${p1}" stroke-width="2" stroke-dasharray="10 5"/>
    <circle cx="400" cy="300" r="60" fill="none" stroke="${p2}" stroke-width="1.5" stroke-dasharray="5 3"/>
    
    <!-- Central focus -->
    <circle cx="400" cy="300" r="25" fill="${p1}" opacity="0.8"/>
    <circle cx="400" cy="300" r="10" fill="white" opacity="0.95"/>
  </g>
  
  <!-- Flow lines -->
  <g stroke="${p1}" stroke-width="1" fill="none" opacity="0.3">
    <path d="M100,400 Q250,300 400,350 T700,300">
      <animate attributeName="d" values="M100,400 Q250,300 400,350 T700,300;M100,380 Q250,320 400,330 T700,320;M100,400 Q250,300 400,350 T700,300" dur="6s" repeatCount="indefinite"/>
    </path>
    <path d="M100,200 Q300,150 400,200 T700,180"/>
  </g>`;
  }

  private renderIsometricScene(spec: IllustrationSpec): string {
    const p1 = spec.primaryColors[0] || '#06B6D4';
    const p2 = spec.primaryColors[1] || '#8B5CF6';
    const p3 = spec.primaryColors[2] || '#EC4899';

    return `
  <!-- Isometric scene -->
  <g transform="translate(400, 300)">
    <!-- Isometric grid plane -->
    <g stroke="${p1}" stroke-opacity="0.1" stroke-width="1">
      ${Array.from({ length: 10 }, (_, i) => {
        const offset = (i - 5) * 40;
        return `<line x1="${offset - 200}" y1="${offset / 2 + 100}" x2="${offset + 200}" y2="${offset / 2 - 100}"/>`;
      }).join('\n      ')}
    </g>
    
    <!-- Isometric cubes -->
    <g filter="url(#softShadow)">
      ${this.renderIsoCube(-60, 0, 80, p1, p2)}
      ${this.renderIsoCube(40, -30, 60, p2, p3)}
      ${this.renderIsoCube(-20, 50, 50, p3, p1)}
      ${this.renderIsoCube(80, 20, 40, p1, p3)}
    </g>
    
    <!-- Floating accent -->
    <g filter="url(#glow)">
      <circle cx="0" cy="-100" r="30" fill="${p1}" opacity="0.6">
        <animate attributeName="cy" values="-100;-110;-100" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="-100" r="15" fill="white" opacity="0.8"/>
    </g>
  </g>`;
  }

  private renderIsoCube(
    x: number,
    y: number,
    size: number,
    color1: string,
    color2: string
  ): string {
    const h = size * 0.866; // height factor for isometric
    return `
    <g transform="translate(${x}, ${y})">
      <!-- Top face -->
      <polygon points="0,${-h} ${size / 2},${-h - size / 4} ${size},${-h} ${size / 2},${-h + size / 4}" fill="${color1}" opacity="0.9"/>
      <!-- Left face -->
      <polygon points="0,${-h} ${size / 2},${-h + size / 4} ${size / 2},${size / 4} 0,0" fill="${color2}" opacity="0.7"/>
      <!-- Right face -->
      <polygon points="${size},${-h} ${size / 2},${-h + size / 4} ${size / 2},${size / 4} ${size},0" fill="${color1}" opacity="0.5"/>
    </g>`;
  }

  private renderGeometricScene(spec: IllustrationSpec): string {
    const [p1, p2, p3] = spec.primaryColors;
    const [a1, a2] = spec.accentColors;

    return `
  <!-- Geometric scene -->
  <g filter="url(#softShadow)">
    <!-- Main geometric shapes -->
    <polygon points="400,80 480,220 320,220" fill="${p1}" opacity="0.8"/>
    <circle cx="250" cy="350" r="80" fill="${p2}" opacity="0.7"/>
    <rect x="480" y="300" width="120" height="120" rx="8" fill="${p3}" opacity="0.8"/>
    
    <!-- Accent shapes -->
    <polygon points="150,150 180,200 120,200" fill="${a1}" opacity="0.6"/>
    <circle cx="650" cy="180" r="40" fill="${a2}" opacity="0.5"/>
    
    <!-- Connecting lines -->
    <g stroke="${p1}" stroke-width="2" fill="none" opacity="0.4">
      <line x1="400" y1="160" x2="280" y2="290"/>
      <line x1="400" y1="160" x2="520" y2="340"/>
      <line x1="320" y1="350" x2="490" y2="360"/>
    </g>
  </g>
  
  <!-- Decorative dots -->
  <g fill="${p1}" opacity="0.6">
    ${Array.from({ length: 15 }, () => {
      const x = Math.random() * 700 + 50;
      const y = Math.random() * 500 + 50;
      const r = Math.random() * 4 + 2;
      return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
    }).join('\n    ')}
  </g>`;
  }

  private renderDefaultScene(spec: IllustrationSpec): string {
    const [p1, p2] = spec.primaryColors;

    return `
  <!-- Default scene -->
  <g>
    <circle cx="400" cy="300" r="120" fill="url(#gradient1)" filter="url(#glow)"/>
    <circle cx="400" cy="300" r="80" fill="url(#gradient2)"/>
    <circle cx="400" cy="300" r="40" fill="${p1}" opacity="0.8"/>
    <circle cx="400" cy="300" r="15" fill="white" opacity="0.9"/>
  </g>`;
  }

  private renderForegroundEffects(spec: IllustrationSpec): string {
    const [p1] = spec.primaryColors;

    return `
  <!-- Foreground effects -->
  <g opacity="0.15">
    <!-- Vignette -->
    <rect width="800" height="600" fill="url(#vignette)"/>
  </g>
  
  <!-- Ambient particles -->
  <g>
    ${this.generateParticles(spec, 10)}
  </g>`;
  }

  private generateParticles(spec: IllustrationSpec, count: number): string {
    const colors = [...spec.primaryColors, ...spec.accentColors];

    return Array.from({ length: count }, (_, i) => {
      const x = Math.random() * 800;
      const y = Math.random() * 600;
      const r = Math.random() * 3 + 1;
      const color = colors[i % colors.length];
      const dur = 3 + Math.random() * 4;
      const delay = Math.random() * 2;

      return `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.6">
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${y};${y - 20};${y}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
    </circle>`;
    }).join('');
  }

  /**
   * Generate system prompt addition for illustration requests
   */
  generateIllustrationPrompt(spec: IllustrationSpec): string {
    return `
🎨 ILLUSTRATION DIRECTIVE

You are creating a ${spec.style} style illustration with a ${spec.mood} mood.

COLOR PALETTE:
- Primary: ${spec.primaryColors.join(', ')}
- Accent: ${spec.accentColors.join(', ')}
- Background: Dark (#0f0f1a to #1a1a2e gradient)

COMPOSITION GUIDE:
- Layout: ${spec.composition.layout}
- Flow: ${spec.composition.flow}
- Depth: ${spec.composition.depth}
- Focal point: Center-upper third

STYLE CHARACTERISTICS:
${this.getStyleCharacteristics(spec.style)}

VISUAL EFFECTS TO INCLUDE:
${spec.effects.map((e) => `- ${e.type} (intensity: ${e.intensity})`).join('\n')}

TECHNICAL REQUIREMENTS:
- Generate raw SVG code (NO Mermaid)
- ViewBox: 0 0 800 600
- Use gradients and filters for depth
- Include subtle animations where appropriate
- Ensure all text is readable (min 14px)
- Use the color palette consistently

OUTPUT FORMAT:
\`\`\`svg
<svg viewBox="0 0 800 600" ...>
  <!-- Your illustration here -->
</svg>
\`\`\``;
  }

  private getStyleCharacteristics(style: IllustrationStyle): string {
    const characteristics: Record<IllustrationStyle, string> = {
      minimalist:
        '- Clean lines, ample whitespace\n- Simple geometric shapes\n- Limited color use\n- Focus on essential elements',
      isometric:
        '- 3D isometric perspective (30° angles)\n- Cube-based structures\n- Layered depth\n- Technical precision',
      'hand-drawn':
        '- Organic, imperfect lines\n- Sketch-like strokes\n- Natural feel\n- Warm, human touch',
      geometric:
        '- Bold geometric shapes\n- Sharp angles and curves\n- Mathematical precision\n- Abstract composition',
      'gradient-flow':
        '- Smooth color transitions\n- Flowing organic shapes\n- Soft edges and blurs\n- Dreamy atmosphere',
      'neon-glow':
        '- Bright neon colors\n- Glow effects on dark background\n- Cyberpunk aesthetic\n- High contrast',
      watercolor:
        '- Soft, blended edges\n- Layered transparency\n- Organic color bleeding\n- Artistic imperfection',
      'line-art':
        '- Detailed line work\n- No fills, only strokes\n- Intricate patterns\n- High detail',
      'flat-design':
        '- Solid colors, no gradients\n- Simple shapes\n- Modern UI aesthetic\n- Clean and readable',
      'data-art':
        '- Data-driven visuals\n- Charts as art\n- Information beauty\n- Pattern revelation',
      organic:
        '- Nature-inspired curves\n- Flowing, living shapes\n- Growth patterns\n- Bio-mimicry',
      technical:
        '- Blueprint style\n- Grid lines and measurements\n- Precise annotations\n- Engineering aesthetic',
      'retro-futurism':
        '- Vintage sci-fi aesthetic\n- Retro color palette\n- Classic space-age shapes\n- Nostalgic future',
      abstract:
        '- Non-representational\n- Experimental composition\n- Emotion over form\n- Creative freedom',
    };

    return characteristics[style] || characteristics['gradient-flow'];
  }
}

// Export singleton instance
export const illustrationEngine = new IllustrationEngine();
