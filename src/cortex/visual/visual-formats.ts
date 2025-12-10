// @version 3.3.374
// TooLoo.ai Visual Formats - Multi-Format Visual Artifact System
// ═══════════════════════════════════════════════════════════════════════════
// DIVERSIFIED VISUAL COMMUNICATION - Beyond SVG
//
// TooLoo can now express itself through MANY visual formats:
// - SVG: Vector diagrams, icons, illustrations
// - ASCII Art: Text-based diagrams, retro aesthetic
// - Markdown Tables: Structured data, comparisons
// - Mermaid: Flowcharts, sequences, entity relationships
// - HTML Components: Rich interactive widgets
// - Canvas/Chart.js: Data visualizations, graphs
// - Emoji Diagrams: Playful visual representations
// - Code Visualizations: Syntax-highlighted code art
// - Terminal Art: ANSI color sequences, box drawing
// - Mathematical: LaTeX/KaTeX rendered equations
// ═══════════════════════════════════════════════════════════════════════════

// ============================================================================
// VISUAL FORMAT TYPES
// ============================================================================

/**
 * All supported visual artifact formats
 */
export type VisualFormat =
  | 'svg' // Vector graphics - diagrams, icons, illustrations
  | 'ascii' // ASCII art - text-based visuals
  | 'markdown-table' // Markdown tables - structured data
  | 'mermaid' // Mermaid diagrams - flowcharts, sequences
  | 'html' // HTML components - rich widgets
  | 'chart' // Chart data - graphs, visualizations
  | 'emoji' // Emoji compositions - playful visuals
  | 'code-art' // Code as visual art
  | 'terminal' // Terminal/ANSI art
  | 'math' // Mathematical notation (LaTeX/KaTeX)
  | 'gradient-card' // Styled info cards
  | 'comparison' // Side-by-side comparison views
  | 'timeline' // Timeline visualization
  | 'tree' // Tree/hierarchy visualization
  | 'matrix' // Matrix/grid visualization
  | 'stats-card'; // Statistics dashboard card

/**
 * Base visual artifact structure
 */
export interface VisualArtifact {
  id: string;
  format: VisualFormat;
  content: string | object;
  metadata: VisualMetadata;
  style?: VisualStyle;
  interactive?: boolean;
  animated?: boolean;
}

/**
 * Visual artifact metadata
 */
export interface VisualMetadata {
  title?: string;
  description?: string;
  width?: number | string;
  height?: number | string;
  theme?: 'dark' | 'light' | 'vibrant' | 'minimal';
  createdAt: string;
  generator: string;
  tags?: string[];
  accessibility?: {
    altText?: string;
    ariaLabel?: string;
    reducedMotion?: boolean;
  };
}

/**
 * Visual styling options
 */
export interface VisualStyle {
  colorScheme?: string[];
  fontFamily?: string;
  animation?: 'none' | 'subtle' | 'energetic';
  border?: boolean;
  shadow?: boolean;
  rounded?: boolean;
  glow?: boolean;
  glassmorphism?: boolean;
}

// ============================================================================
// FORMAT-SPECIFIC CONTENT TYPES
// ============================================================================

/**
 * SVG visual content
 */
export interface SVGContent {
  svg: string;
  viewBox?: string;
  preserveAspectRatio?: string;
}

/**
 * ASCII art content
 */
export interface ASCIIContent {
  art: string;
  charset?: 'standard' | 'extended' | 'unicode' | 'box-drawing';
  monospace: boolean;
}

/**
 * Markdown table content
 */
export interface MarkdownTableContent {
  headers: string[];
  rows: string[][];
  alignment?: ('left' | 'center' | 'right')[];
  caption?: string;
}

/**
 * Mermaid diagram content
 */
export interface MermaidContent {
  type:
    | 'flowchart'
    | 'sequence'
    | 'class'
    | 'state'
    | 'er'
    | 'journey'
    | 'gantt'
    | 'pie'
    | 'mindmap'
    | 'timeline'
    | 'quadrant';
  code: string;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
}

/**
 * Chart data content
 */
export interface ChartContent {
  type:
    | 'bar'
    | 'line'
    | 'pie'
    | 'doughnut'
    | 'radar'
    | 'scatter'
    | 'bubble'
    | 'area'
    | 'polar'
    | 'gauge'
    | 'treemap'
    | 'sankey';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      fill?: boolean;
    }>;
  };
  options?: Record<string, unknown>;
}

/**
 * Emoji composition content
 */
export interface EmojiContent {
  composition: string;
  layout: 'inline' | 'grid' | 'flow' | 'scene';
  scale?: number;
  animated?: boolean;
}

/**
 * Code art content
 */
export interface CodeArtContent {
  code: string;
  language: string;
  highlightLines?: number[];
  theme?: 'dark' | 'light' | 'hacker' | 'neon';
  showLineNumbers?: boolean;
  wrapLines?: boolean;
}

/**
 * Terminal art content (ANSI)
 */
export interface TerminalContent {
  output: string;
  prompt?: string;
  commands?: string[];
  colorize?: boolean;
}

/**
 * Math content (LaTeX)
 */
export interface MathContent {
  expression: string;
  displayMode: boolean;
  numbered?: boolean;
}

/**
 * Gradient card content
 */
export interface GradientCardContent {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: string;
  gradient: [string, string] | [string, string, string];
  footer?: string;
}

/**
 * Comparison view content
 */
export interface ComparisonContent {
  items: Array<{
    title: string;
    features: Record<string, string | boolean | number>;
    highlight?: boolean;
    badge?: string;
  }>;
  compareBy: string[];
}

/**
 * Timeline content
 */
export interface TimelineContent {
  events: Array<{
    date: string;
    title: string;
    description?: string;
    icon?: string;
    type?: 'milestone' | 'event' | 'checkpoint';
  }>;
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Tree/hierarchy content
 */
export interface TreeContent {
  root: TreeNode;
  style?: 'org-chart' | 'file-tree' | 'mind-map' | 'indented';
}

export interface TreeNode {
  label: string;
  icon?: string;
  children?: TreeNode[];
  metadata?: Record<string, unknown>;
}

/**
 * Matrix/grid content
 */
export interface MatrixContent {
  headers: { rows: string[]; cols: string[] };
  cells: (string | number | boolean)[][];
  cellRenderer?: 'text' | 'icon' | 'color' | 'progress';
}

/**
 * Stats card content
 */
export interface StatsCardContent {
  stats: Array<{
    label: string;
    value: string | number;
    change?: { value: number; direction: 'up' | 'down' | 'flat' };
    icon?: string;
    color?: string;
  }>;
  layout?: 'grid' | 'row' | 'stack';
}

// ============================================================================
// FORMAT CAPABILITIES & RECOMMENDATIONS
// ============================================================================

/**
 * Format capabilities and use cases
 */
export const FORMAT_CAPABILITIES: Record<
  VisualFormat,
  {
    name: string;
    description: string;
    bestFor: string[];
    notFor: string[];
    complexity: 'low' | 'medium' | 'high';
    interactive: boolean;
    animated: boolean;
    accessible: boolean;
    examples: string[];
  }
> = {
  svg: {
    name: 'SVG Diagram',
    description: 'Scalable vector graphics for detailed diagrams and illustrations',
    bestFor: [
      'architecture diagrams',
      'flowcharts',
      'icons',
      'illustrations',
      'logos',
      'infographics',
    ],
    notFor: ['large datasets', 'real-time data', 'simple lists'],
    complexity: 'high',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['System architecture', 'Process flow', 'UI mockup', 'Icon set'],
  },
  ascii: {
    name: 'ASCII Art',
    description: 'Text-based visual representations using characters',
    bestFor: [
      'quick diagrams',
      'terminal output',
      'retro aesthetic',
      'simple structures',
      'progress bars',
    ],
    notFor: ['detailed graphics', 'color-critical visuals', 'complex shapes'],
    complexity: 'low',
    interactive: false,
    animated: false,
    accessible: true,
    examples: ['Box diagram', 'Tree structure', 'Loading bar', 'Banner'],
  },
  'markdown-table': {
    name: 'Markdown Table',
    description: 'Structured tabular data with headers and rows',
    bestFor: ['data comparison', 'feature lists', 'specifications', 'schedules', 'structured info'],
    notFor: ['visual diagrams', 'hierarchies', 'graphs'],
    complexity: 'low',
    interactive: false,
    animated: false,
    accessible: true,
    examples: ['Feature comparison', 'Price table', 'Schedule', 'Specs list'],
  },
  mermaid: {
    name: 'Mermaid Diagram',
    description: 'Text-to-diagram for flowcharts, sequences, and more',
    bestFor: [
      'flowcharts',
      'sequence diagrams',
      'class diagrams',
      'state machines',
      'ER diagrams',
      'gantt charts',
    ],
    notFor: ['artistic illustrations', 'data visualizations', 'free-form graphics'],
    complexity: 'medium',
    interactive: true,
    animated: false,
    accessible: true,
    examples: ['API flow', 'User journey', 'Database schema', 'Git flow'],
  },
  html: {
    name: 'HTML Component',
    description: 'Rich interactive HTML/CSS widgets',
    bestFor: ['interactive widgets', 'forms', 'cards', 'layouts', 'styled content'],
    notFor: ['static diagrams', 'print content', 'accessibility-critical'],
    complexity: 'high',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['Dashboard card', 'Form widget', 'Hero section', 'Feature grid'],
  },
  chart: {
    name: 'Data Chart',
    description: 'Data visualization charts and graphs',
    bestFor: ['numerical data', 'trends', 'distributions', 'comparisons', 'analytics'],
    notFor: ['process flows', 'hierarchies', 'textual data'],
    complexity: 'medium',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['Sales chart', 'Usage graph', 'Distribution pie', 'Trend line'],
  },
  emoji: {
    name: 'Emoji Composition',
    description: 'Visual communication using emoji characters',
    bestFor: [
      'quick visuals',
      'status indicators',
      'playful content',
      'social media',
      'mood representation',
    ],
    notFor: ['formal documents', 'technical diagrams', 'precise data'],
    complexity: 'low',
    interactive: false,
    animated: true,
    accessible: true,
    examples: ['Mood indicator', 'Progress status', 'Feature highlights', 'Quick guide'],
  },
  'code-art': {
    name: 'Code Visualization',
    description: 'Syntax-highlighted code as visual element',
    bestFor: ['code examples', 'algorithms', 'syntax demonstration', 'technical tutorials'],
    notFor: ['non-technical audiences', 'data visualization', 'diagrams'],
    complexity: 'low',
    interactive: true,
    animated: false,
    accessible: true,
    examples: ['Code snippet', 'Algorithm visualization', 'Syntax demo', 'Diff view'],
  },
  terminal: {
    name: 'Terminal Output',
    description: 'Command-line style output with ANSI colors',
    bestFor: ['command examples', 'CLI output', 'logs', 'installation guides', 'dev tools'],
    notFor: ['non-technical users', 'print media', 'formal reports'],
    complexity: 'low',
    interactive: false,
    animated: true,
    accessible: true,
    examples: ['Install command', 'Log output', 'CLI help', 'Build output'],
  },
  math: {
    name: 'Mathematical Expression',
    description: 'LaTeX/KaTeX rendered mathematical notation',
    bestFor: ['equations', 'formulas', 'mathematical proofs', 'scientific notation'],
    notFor: ['non-math content', 'code', 'general text'],
    complexity: 'medium',
    interactive: false,
    animated: false,
    accessible: true,
    examples: ['Formula', 'Equation', 'Integral', 'Matrix notation'],
  },
  'gradient-card': {
    name: 'Gradient Info Card',
    description: 'Stylized information card with gradient background',
    bestFor: ['key metrics', 'highlights', 'announcements', 'feature showcases'],
    notFor: ['detailed data', 'long content', 'technical diagrams'],
    complexity: 'low',
    interactive: false,
    animated: true,
    accessible: true,
    examples: ['Stat card', 'Feature highlight', 'Quick fact', 'Achievement'],
  },
  comparison: {
    name: 'Comparison View',
    description: 'Side-by-side comparison of items or options',
    bestFor: ['product comparison', 'plan tiers', 'feature matrices', 'A/B options'],
    notFor: ['single items', 'sequential data', 'timelines'],
    complexity: 'medium',
    interactive: true,
    animated: false,
    accessible: true,
    examples: ['Plan comparison', 'Product specs', 'Tech stack comparison'],
  },
  timeline: {
    name: 'Timeline',
    description: 'Chronological sequence of events',
    bestFor: ['project history', 'roadmaps', 'event sequences', 'version history'],
    notFor: ['non-temporal data', 'random lists', 'hierarchies'],
    complexity: 'medium',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['Project timeline', 'Version history', 'Event schedule'],
  },
  tree: {
    name: 'Tree/Hierarchy',
    description: 'Hierarchical tree structure visualization',
    bestFor: ['file structures', 'org charts', 'taxonomies', 'nested data'],
    notFor: ['flat lists', 'temporal data', 'graph relationships'],
    complexity: 'medium',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['File tree', 'Org chart', 'Menu structure', 'Category hierarchy'],
  },
  matrix: {
    name: 'Matrix/Grid',
    description: 'Two-dimensional grid visualization',
    bestFor: ['feature matrices', 'compatibility tables', 'skill grids', 'heat maps'],
    notFor: ['sequential data', 'narratives', 'simple lists'],
    complexity: 'medium',
    interactive: true,
    animated: false,
    accessible: true,
    examples: ['Compatibility matrix', 'Skill grid', 'Priority matrix'],
  },
  'stats-card': {
    name: 'Stats Dashboard',
    description: 'Multiple statistics in a dashboard layout',
    bestFor: ['KPIs', 'dashboards', 'quick stats', 'metrics overview'],
    notFor: ['detailed reports', 'narratives', 'diagrams'],
    complexity: 'low',
    interactive: true,
    animated: true,
    accessible: true,
    examples: ['Dashboard header', 'KPI cards', 'Quick metrics'],
  },
};

// ============================================================================
// FORMAT SELECTION INTELLIGENCE
// ============================================================================

/**
 * Keywords that suggest specific formats
 */
export const FORMAT_KEYWORDS: Record<VisualFormat, string[]> = {
  svg: [
    'diagram',
    'illustration',
    'icon',
    'draw',
    'graphic',
    'visual',
    'architecture',
    'flowchart',
  ],
  ascii: ['ascii', 'text art', 'terminal diagram', 'box', 'retro', 'simple diagram'],
  'markdown-table': ['table', 'compare', 'list', 'specs', 'features', 'structured'],
  mermaid: ['flowchart', 'sequence', 'class diagram', 'state machine', 'er diagram', 'gantt'],
  html: ['widget', 'interactive', 'component', 'card', 'styled'],
  chart: ['chart', 'graph', 'data', 'statistics', 'trend', 'analytics', 'numbers'],
  emoji: ['emoji', 'fun', 'playful', 'quick', 'mood', 'status'],
  'code-art': ['code', 'snippet', 'algorithm', 'syntax', 'programming'],
  terminal: ['terminal', 'command', 'cli', 'shell', 'output', 'install'],
  math: ['equation', 'formula', 'math', 'calculate', 'expression', 'integral'],
  'gradient-card': ['highlight', 'feature', 'showcase', 'announcement'],
  comparison: ['compare', 'versus', 'vs', 'difference', 'pros cons', 'options'],
  timeline: ['timeline', 'history', 'events', 'schedule', 'roadmap', 'phases'],
  tree: ['tree', 'hierarchy', 'structure', 'nested', 'org chart', 'file structure'],
  matrix: ['matrix', 'grid', 'compatibility', 'skills', 'heat map'],
  'stats-card': ['stats', 'metrics', 'kpi', 'dashboard', 'numbers', 'overview'],
};

/**
 * Determines the best visual format based on content analysis
 */
export function suggestFormat(
  query: string,
  context?: {
    hasNumericalData?: boolean;
    hasHierarchy?: boolean;
    hasTemporal?: boolean;
    hasComparison?: boolean;
    preferInteractive?: boolean;
    targetAudience?: 'technical' | 'general' | 'executive';
  }
): VisualFormat[] {
  const queryLower = query.toLowerCase();
  const scores: Record<VisualFormat, number> = {} as Record<VisualFormat, number>;

  // Initialize scores
  Object.keys(FORMAT_CAPABILITIES).forEach((format) => {
    scores[format as VisualFormat] = 0;
  });

  // Score based on keywords
  Object.entries(FORMAT_KEYWORDS).forEach(([format, keywords]) => {
    keywords.forEach((keyword) => {
      if (queryLower.includes(keyword)) {
        scores[format as VisualFormat] += 2;
      }
    });
  });

  // Context-based scoring
  if (context) {
    if (context.hasNumericalData) {
      scores.chart += 3;
      scores['stats-card'] += 2;
      scores['markdown-table'] += 1;
    }
    if (context.hasHierarchy) {
      scores.tree += 3;
      scores.mermaid += 2;
      scores.svg += 1;
    }
    if (context.hasTemporal) {
      scores.timeline += 3;
      scores.mermaid += 1;
    }
    if (context.hasComparison) {
      scores.comparison += 3;
      scores['markdown-table'] += 2;
      scores.matrix += 1;
    }
    if (context.preferInteractive) {
      scores.html += 2;
      scores.chart += 1;
      scores.mermaid += 1;
    }
    if (context.targetAudience === 'technical') {
      scores['code-art'] += 2;
      scores.terminal += 2;
      scores.ascii += 1;
    }
    if (context.targetAudience === 'executive') {
      scores['gradient-card'] += 2;
      scores['stats-card'] += 2;
      scores.chart += 1;
    }
  }

  // Sort by score and return top formats
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0)
    .slice(0, 3)
    .map(([format]) => format as VisualFormat);
}

// ============================================================================
// ARTIFACT GENERATORS
// ============================================================================

/**
 * Creates a visual artifact with full metadata
 */
export function createVisualArtifact(
  format: VisualFormat,
  content: string | object,
  options?: Partial<VisualMetadata & VisualStyle>
): VisualArtifact {
  return {
    id: `va-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    format,
    content,
    metadata: {
      title: options?.title,
      description: options?.description,
      width: options?.width,
      height: options?.height,
      theme: options?.theme || 'dark',
      createdAt: new Date().toISOString(),
      generator: 'TooLoo.ai Visual Cortex',
      tags: options?.tags,
      accessibility: options?.accessibility,
    },
    style: {
      colorScheme: options?.colorScheme,
      fontFamily: options?.fontFamily,
      animation: options?.animation || 'subtle',
      border: options?.border ?? true,
      shadow: options?.shadow ?? true,
      rounded: options?.rounded ?? true,
      glow: options?.glow ?? false,
      glassmorphism: options?.glassmorphism ?? true,
    },
    interactive: FORMAT_CAPABILITIES[format]?.interactive ?? false,
    animated: FORMAT_CAPABILITIES[format]?.animated ?? false,
  };
}

// ============================================================================
// ASCII ART GENERATORS
// ============================================================================

/**
 * Generate ASCII box diagram
 */
export function generateASCIIBox(
  title: string,
  content: string[],
  style: 'single' | 'double' | 'rounded' = 'rounded'
): string {
  const borders = {
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  };

  const b = borders[style];
  const maxLen = Math.max(title.length, ...content.map((l) => l.length)) + 2;

  const lines: string[] = [];
  lines.push(`${b.tl}${b.h.repeat(maxLen + 2)}${b.tr}`);
  lines.push(`${b.v} ${title.padEnd(maxLen)} ${b.v}`);
  lines.push(`${b.v}${b.h.repeat(maxLen + 2)}${b.v}`);
  content.forEach((line) => {
    lines.push(`${b.v} ${line.padEnd(maxLen)} ${b.v}`);
  });
  lines.push(`${b.bl}${b.h.repeat(maxLen + 2)}${b.br}`);

  return lines.join('\n');
}

/**
 * Generate ASCII tree
 */
export function generateASCIITree(
  node: TreeNode,
  prefix: string = '',
  isLast: boolean = true
): string {
  const lines: string[] = [];
  const connector = isLast ? '└── ' : '├── ';
  const extension = isLast ? '    ' : '│   ';

  lines.push(`${prefix}${connector}${node.icon || ''}${node.label}`);

  if (node.children) {
    node.children.forEach((child, i) => {
      const isChildLast = i === node.children!.length - 1;
      lines.push(generateASCIITree(child, prefix + extension, isChildLast));
    });
  }

  return lines.join('\n');
}

/**
 * Generate ASCII progress bar
 */
export function generateASCIIProgress(
  value: number,
  max: number = 100,
  width: number = 20,
  style: 'blocks' | 'arrows' | 'dots' = 'blocks'
): string {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const styles = {
    blocks: { filled: '█', empty: '░', left: '[', right: ']' },
    arrows: { filled: '▶', empty: '·', left: '|', right: '|' },
    dots: { filled: '●', empty: '○', left: '(', right: ')' },
  };

  const s = styles[style];
  return `${s.left}${s.filled.repeat(filled)}${s.empty.repeat(empty)}${s.right} ${percent.toFixed(0)}%`;
}

// ============================================================================
// EMOJI COMPOSITION GENERATORS
// ============================================================================

/**
 * Generate emoji-based status indicator
 */
export function generateEmojiStatus(
  status: 'success' | 'warning' | 'error' | 'info' | 'loading' | 'progress',
  message?: string
): string {
  const indicators = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    loading: '⏳',
    progress: '🔄',
  };

  return `${indicators[status]} ${message || status}`;
}

/**
 * Generate emoji scene/composition
 */
export function generateEmojiScene(theme: string): string {
  const defaultScene = '💻 ⚡ 🔧 📱 🚀';
  const scenes: Record<string, string> = {
    success: '🎉 ✨ 🏆 ✨ 🎉',
    celebration: '🎊 🥳 🎈 🎁 🎂',
    nature: '🌳 🌸 🦋 🌺 🌳',
    tech: defaultScene,
    space: '🌍 🚀 ⭐ 🌙 🛸',
    weather: '☀️ 🌤️ ⛅ 🌧️ ⛈️',
    food: '🍕 🍔 🌮 🍣 🍰',
    animals: '🐱 🐶 🦊 🐰 🦁',
    ocean: '🌊 🐠 🐙 🦀 🐚',
    music: '🎵 🎸 🎹 🥁 🎤',
  };

  return scenes[theme] ?? defaultScene;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  FORMAT_CAPABILITIES,
  FORMAT_KEYWORDS,
  suggestFormat,
  createVisualArtifact,
  generateASCIIBox,
  generateASCIITree,
  generateASCIIProgress,
  generateEmojiStatus,
  generateEmojiScene,
};
