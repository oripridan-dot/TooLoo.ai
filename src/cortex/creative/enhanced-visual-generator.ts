// @version 3.3.65
// TooLoo.ai Enhanced Visual Generator
// Transforms basic visual requests into stunning, professional-grade outputs
// Uses example-driven prompting and quality validation

import { getVisualExample } from './visual-examples.js';

/**
 * Visual request types that trigger enhancement
 */
const VISUAL_KEYWORDS = [
  // Explicit visual requests
  'svg', 'chart', 'graph', 'diagram', 'visualization', 'visual',
  'image', 'picture', 'drawing', 'illustration', 'graphic',
  'logo', 'icon', 'banner', 'infographic', 'animation',
  // Common visual tasks
  'draw', 'create a visual', 'show me', 'visualize', 'render',
  'design', 'generate an image', 'make a chart', 'plot',
  // Data visualization
  'pie chart', 'bar chart', 'line graph', 'scatter plot',
  'histogram', 'dashboard', 'metrics', 'analytics',
  // Diagrams
  'flowchart', 'flow diagram', 'architecture diagram', 'sequence diagram',
  'erd', 'uml', 'wireframe', 'mockup', 'prototype',
  // Abstract/creative
  'abstract', 'artistic', 'creative visual', 'artwork'
];

/**
 * Visual type categories
 */
type VisualType = 'chart' | 'diagram' | 'abstract' | 'dashboard' | 'general';

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
    return VISUAL_KEYWORDS.some(keyword => lowerPrompt.includes(keyword));
  }
  
  /**
   * Determine the type of visual being requested
   */
  detectVisualType(prompt: string): VisualType {
    const lowerPrompt = prompt.toLowerCase();
    
    // Chart/Graph detection
    if (/chart|graph|plot|histogram|pie|bar|line|scatter|data viz|analytics|metrics/.test(lowerPrompt)) {
      return 'chart';
    }
    
    // Diagram detection
    if (/diagram|flow|architecture|sequence|erd|uml|wireframe|mockup|system|process/.test(lowerPrompt)) {
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
   * Enhance a visual request with detailed instructions
   */
  enhancePrompt(originalPrompt: string): string {
    const visualType = this.detectVisualType(originalPrompt);
    const example = this.getRelevantExample(visualType);
    
    const enhancedPrompt = `
${originalPrompt}

=== CRITICAL VISUAL GENERATION REQUIREMENTS ===

You are TooLoo.ai, known for creating STUNNING, PROFESSIONAL-GRADE visuals.
Your visual output must be exceptional - the kind that makes users say "WOW!"

**MANDATORY SVG STRUCTURE:**
1. Start with proper viewBox (e.g., viewBox="0 0 800 500")
2. ALWAYS include a <defs> section with:
   - linearGradient or radialGradient definitions (at least 2-3 gradients)
   - filter effects (drop shadows, glows, blurs)
   - clipPath if needed
   - Unique IDs for all reusable elements

3. Use RICH, MODERN color palettes:
   - Primary: #6366f1, #8b5cf6, #a855f7 (purples/indigos)
   - Accent: #f472b6, #ec4899, #f43f5e (pinks/roses)
   - Success: #4ade80, #22c55e, #14b8a6 (greens/teals)
   - Info: #60a5fa, #3b82f6, #0ea5e9 (blues)
   - Dark backgrounds: #0a0a14, #0f0f1a, #1e1e2f
   
4. ALWAYS include ANIMATIONS:
   - <animate> for property changes
   - <animateTransform> for rotations/scales
   - <animateMotion> for path-based movement
   - Use realistic durations (2-10s for ambient, 0.3-0.8s for transitions)

5. LAYERED COMPOSITION:
   - Background layer (dark gradient or subtle pattern)
   - Mid-ground elements (main content)
   - Foreground accents (highlights, particles)
   - Proper z-ordering through element order

**QUALITY CHECKLIST:**
✓ Minimum 3 gradient definitions
✓ At least 1 filter effect (shadow or glow)
✓ At least 2 animations
✓ Professional typography (font-family="system-ui, -apple-system, sans-serif")
✓ Proper spacing and composition
✓ Rounded corners (rx attribute) on rectangles
✓ Stroke-linecap="round" for smooth lines

**EXAMPLE OF QUALITY OUTPUT (${visualType.toUpperCase()}):**
\`\`\`svg
${example}
\`\`\`

**OUTPUT FORMAT:**
Return a SINGLE, complete SVG code block. No explanations before or after.
The SVG should be production-ready and visually stunning.
Match or EXCEED the quality of the example above.
`.trim();

    return enhancedPrompt;
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
      suggestions
    };
  }
}

// Export singleton instance
export const enhancedVisualGenerator = EnhancedVisualGenerator.getInstance();
