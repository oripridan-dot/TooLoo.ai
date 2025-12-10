// @version 3.3.377
// TooLoo.ai Enhanced Visual Generator
// DIVERSIFIED VISUAL COMMUNICATION - Routes to best format, not just SVG
// Uses format-aware prompting based on content type

import { getVisualExample } from './visual-examples.js';

/**
 * Visual request types that trigger enhancement
 */
const VISUAL_KEYWORDS = [
  // Explicit visual requests
  'svg',
  'chart',
  'graph',
  'diagram',
  'visualization',
  'visual',
  'image',
  'picture',
  'drawing',
  'illustration',
  'graphic',
  'logo',
  'icon',
  'banner',
  'infographic',
  'animation',
  // Common visual tasks
  'draw',
  'create a visual',
  'show me',
  'visualize',
  'render',
  'design',
  'generate an image',
  'make a chart',
  'plot',
  // Data visualization
  'pie chart',
  'bar chart',
  'line graph',
  'scatter plot',
  'histogram',
  'dashboard',
  'metrics',
  'analytics',
  // Diagrams
  'flowchart',
  'flow diagram',
  'architecture diagram',
  'sequence diagram',
  'erd',
  'uml',
  'wireframe',
  'mockup',
  'prototype',
  // Abstract/creative
  'abstract',
  'artistic',
  'creative visual',
  'artwork',
];

/**
 * Visual type categories - now maps to format recommendations
 */
type VisualType = 'chart' | 'diagram' | 'abstract' | 'dashboard' | 'general';

/**
 * Recommended format for each visual type
 */
const FORMAT_RECOMMENDATIONS: Record<VisualType, { primary: string; fallback: string; description: string }> = {
  chart: {
    primary: 'chart',
    fallback: 'svg',
    description: 'Use ```chart with JSON data for interactive Chart.js rendering'
  },
  diagram: {
    primary: 'mermaid',
    fallback: 'ascii',
    description: 'Use ```mermaid for flowcharts, sequences, architecture diagrams'
  },
  dashboard: {
    primary: 'stats',
    fallback: 'chart',
    description: 'Use ```stats JSON for KPI cards and metrics displays'
  },
  abstract: {
    primary: 'svg',
    fallback: 'emoji',
    description: 'Use ```svg for complex graphics, icons, or artistic visuals'
  },
  general: {
    primary: 'ascii',
    fallback: 'mermaid',
    description: 'Use ```ascii for quick diagrams or ```mermaid for structured flows'
  }
};

/**
 * Enhanced Visual Generator
 * Transforms basic visual requests into stunning outputs
 */
export class EnhancedVisualGenerator {
  private static instance: EnhancedVisualGenerator;

  static getInstance(): EnhancedVisualGenerator {
    if (!this.instance) {
      this.instance = new EnhancedVisualGenerator();
    }
    return this.instance;
  }

  /**
   * Detect if a prompt is requesting visual output
   */
  detectVisualRequest(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    return VISUAL_KEYWORDS.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * Determine the type of visual being requested
   */
  detectVisualType(prompt: string): VisualType {
    const lowerPrompt = prompt.toLowerCase();

    // Chart/Graph detection
    if (
      /chart|graph|plot|histogram|pie|bar|line|scatter|data viz|analytics|metrics/.test(lowerPrompt)
    ) {
      return 'chart';
    }

    // Diagram detection
    if (
      /diagram|flow|architecture|sequence|erd|uml|wireframe|mockup|system|process/.test(lowerPrompt)
    ) {
      return 'diagram';
    }

    // Dashboard/Widget detection
    if (/dashboard|widget|card|stats|kpi|metric card|status/.test(lowerPrompt)) {
      return 'dashboard';
    }

    // Abstract/Art detection
    if (/abstract|art|creative|artistic|logo|brand|icon|generative/.test(lowerPrompt)) {
      return 'abstract';
    }

    return 'general';
  }

  /**
   * Get relevant example for the visual type
   */
  getRelevantExample(visualType: VisualType): string {
    switch (visualType) {
      case 'chart':
        return getVisualExample('chart');
      case 'diagram':
        return getVisualExample('diagram');
      case 'dashboard':
        return getVisualExample('dashboard');
      case 'abstract':
        return getVisualExample('abstract');
      default:
        return getVisualExample('chart');
    }
  }

  /**
   * Get the recommended format for a visual type
   */
  getRecommendedFormat(visualType: VisualType): { primary: string; fallback: string; description: string } {
    return FORMAT_RECOMMENDATIONS[visualType] || FORMAT_RECOMMENDATIONS.general;
  }

  /**
   * Enhance a visual request with FORMAT-APPROPRIATE instructions
   * No longer forces SVG - routes to the best format for the content
   */
  enhancePrompt(originalPrompt: string): string {
    const visualType = this.detectVisualType(originalPrompt);
    const format = this.getRecommendedFormat(visualType);

    // Chart-specific enhancement
    if (visualType === 'chart') {
      return `${originalPrompt}

=== CHART GENERATION INSTRUCTIONS ===
Use the \`\`\`chart code block with JSON data for Chart.js rendering.

**EXACT FORMAT:**
\`\`\`chart
{"type":"bar","data":{"labels":["Label1","Label2","Label3"],"datasets":[{"label":"Data","data":[10,20,30]}]}}
\`\`\`

**Chart Types:** bar, line, pie, doughnut, radar, polarArea
**For PIE charts:** {"type":"pie","data":{"labels":["A","B","C"],"datasets":[{"data":[40,30,30]}]}}

IMPORTANT:
- JSON must be valid, single-line, no trailing commas
- Include meaningful labels and data values
- Return ONLY the chart code block, no extra explanation
`.trim();
    }

    // Diagram-specific enhancement (mermaid)
    if (visualType === 'diagram') {
      return `${originalPrompt}

=== DIAGRAM GENERATION INSTRUCTIONS ===
Use \`\`\`mermaid for flowcharts, sequences, and architecture diagrams.

**Flowchart Example:**
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

**Sequence Example:**
\`\`\`mermaid
sequenceDiagram
    User->>Server: Request
    Server->>Database: Query
    Database-->>Server: Result
    Server-->>User: Response
\`\`\`

IMPORTANT: Return ONLY the mermaid code block.
`.trim();
    }

    // Dashboard/Stats enhancement
    if (visualType === 'dashboard') {
      return `${originalPrompt}

=== DASHBOARD/STATS INSTRUCTIONS ===
Use \`\`\`stats for KPI cards and metrics displays.

**Format:**
\`\`\`stats
{"stats":[{"label":"Users","value":"12.5K","change":{"value":15,"direction":"up"}},{"label":"Revenue","value":"$48K","change":{"value":8,"direction":"up"}}]}
\`\`\`

Or use \`\`\`chart for data visualizations.
IMPORTANT: Return ONLY the code block with valid JSON.
`.trim();
    }

    // Abstract/Complex graphics - still use SVG
    if (visualType === 'abstract') {
      const example = this.getRelevantExample(visualType);
      return `${originalPrompt}

=== SVG VISUAL GENERATION ===
For complex graphics, icons, or artistic visuals, use \`\`\`svg

**Quality Requirements:**
- Use viewBox="0 0 800 500"
- Dark background: #0a0a0f
- Rich colors: #6366f1, #8b5cf6, #f472b6, #4ade80
- Include gradients in <defs>
- Add subtle animations

**Example:**
\`\`\`svg
${example}
\`\`\`

Return ONLY the SVG code block.
`.trim();
    }

    // General/Quick visuals - prefer ascii or mermaid
    return `${originalPrompt}

=== VISUAL FORMAT SELECTION ===
Choose the BEST format for this content:

• **\`\`\`ascii** - Quick text diagrams, boxes, trees
• **\`\`\`mermaid** - Flowcharts, sequences, architecture
• **\`\`\`chart** - Data: {"type":"bar","data":{...}}
• **\`\`\`emoji** - Status indicators, playful visuals

Pick ONE format and return ONLY that code block.
`.trim();
  }

  /**
   * Validate visual output quality
   */
  validateVisualQuality(svgContent: string): {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for viewBox
    if (!svgContent.includes('viewBox')) {
      issues.push('Missing viewBox attribute');
      score -= 15;
    }

    // Check for gradients
    if (!svgContent.includes('Gradient')) {
      issues.push('No gradients defined');
      suggestions.push('Add linearGradient or radialGradient for depth');
      score -= 20;
    }

    // Check for filters
    if (!svgContent.includes('<filter')) {
      suggestions.push('Consider adding filter effects (shadows, glows)');
      score -= 10;
    }

    // Check for animations
    if (!svgContent.includes('<animate') && !svgContent.includes('<animateTransform')) {
      issues.push('No animations found');
      suggestions.push('Add animations for visual appeal');
      score -= 15;
    }

    // Check for defs section
    if (!svgContent.includes('<defs')) {
      issues.push('Missing <defs> section');
      score -= 10;
    }

    // Check for rounded corners usage
    if (!svgContent.includes('rx=')) {
      suggestions.push('Consider using rounded corners (rx attribute)');
      score -= 5;
    }

    // Check for proper font-family
    if (svgContent.includes('<text') && !svgContent.includes('font-family')) {
      suggestions.push('Add font-family for consistent typography');
      score -= 5;
    }

    // Check for color richness (multiple colors)
    const colorMatches = svgContent.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(/g) || [];
    if (colorMatches.length < 4) {
      suggestions.push('Use a richer color palette');
      score -= 10;
    }

    // Bonus for advanced features
    if (svgContent.includes('stroke-dasharray')) {
      score += 5;
    }
    if (svgContent.includes('animateMotion')) {
      score += 5;
    }
    if (svgContent.includes('feDropShadow') || svgContent.includes('feGaussianBlur')) {
      score += 5;
    }

    // Cap score at 100
    score = Math.min(100, Math.max(0, score));

    return {
      isValid: score >= 60,
      score,
      issues,
      suggestions,
    };
  }
}

// Export singleton instance
export const enhancedVisualGenerator = EnhancedVisualGenerator.getInstance();
