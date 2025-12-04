// @version 3.0.0
// TooLoo.ai Visual Response Engine
// Intelligent visual content generation for maximally creative chat experiences
// Analyzes prompts and generates appropriate visual formats

import { bus } from '../../core/event-bus.js';

// ============================================================================
// VISUAL RESPONSE TYPES
// ============================================================================

export type VisualType =
  | 'diagram' // Flowcharts, architecture, processes
  | 'infographic' // Data visualization, statistics
  | 'illustration' // Conceptual art, metaphors
  | 'animation' // Animated explanations
  | 'timeline' // Sequential events
  | 'comparison' // Side-by-side analysis
  | 'mindmap' // Concept exploration
  | 'codeVisual' // Code with visual annotations
  | 'dataChart' // Charts and graphs
  | 'storyboard' // Sequential narrative
  | 'ecosystem' // System relationships
  | 'journey' // User/process journeys
  | 'matrix' // Comparison matrices
  | 'hierarchy' // Org charts, taxonomies
  | 'network' // Connection graphs
  | 'gallery' // Image collections
  | 'document' // Formatted documents
  | 'interactive'; // Interactive widgets

export interface VisualIntent {
  primaryType: VisualType;
  secondaryTypes: VisualType[];
  confidence: number;
  suggestedFormat: 'svg' | 'mermaid' | 'react' | 'html' | 'markdown' | 'canvas';
  emotionalTone: 'inspiring' | 'analytical' | 'playful' | 'serious' | 'creative' | 'professional';
  complexity: 'simple' | 'moderate' | 'complex';
  interactivityLevel: 'static' | 'hover' | 'interactive' | 'animated';
}

export interface VisualDirective {
  enabled: boolean;
  intent: VisualIntent;
  systemPromptAddition: string;
  formatInstructions: string;
  examplePatterns: string[];
}

// ============================================================================
// INTENT DETECTION PATTERNS
// ============================================================================

const VISUAL_PATTERNS: Record<VisualType, RegExp[]> = {
  diagram: [
    /how\s+(does|do|is|are|can|should|would).*work/i,
    /explain.*process/i,
    /architecture|structure|flow|pipeline/i,
    /steps?\s+(to|for|of)/i,
    /diagram|flowchart|schematic/i,
    /design\s+(pattern|system|approach)/i,
  ],
  infographic: [
    /statistics|stats|data|metrics|numbers/i,
    /compare.*(?:numbers|data|metrics)/i,
    /visualization|visualize|display.*data/i,
    /breakdown|analysis|report/i,
    /percentage|ratio|proportion/i,
  ],
  illustration: [
    /imagine|envision|picture|visualize/i,
    /creative|artistic|beautiful/i,
    /metaphor|analogy|like.*(?:a|the)/i,
    /concept|idea|vision/i,
    /what\s+(?:if|would)/i,
    /dream|fantasy|inspire/i,
  ],
  animation: [
    /animate|animation|motion/i,
    /show.*(?:in action|moving|live)/i,
    /demonstrate|demo/i,
    /step.by.step/i,
    /evolve|transform|morph/i,
  ],
  timeline: [
    /timeline|history|evolution/i,
    /chronolog|sequence|order/i,
    /before.*after/i,
    /progress|journey.*over.*time/i,
    /phases?|stages?|milestones?/i,
  ],
  comparison: [
    /compare|versus|vs\.?|difference/i,
    /better|worse|pros.*cons/i,
    /advantages?|disadvantages?/i,
    /trade.?offs?|options?/i,
    /which\s+(is|should|would)/i,
  ],
  mindmap: [
    /brainstorm|ideas?|concepts?/i,
    /explore|expand|branch/i,
    /mind\s*map|concept\s*map/i,
    /related|connections?|associations?/i,
    /think.*about/i,
  ],
  codeVisual: [
    /code|programming|function|class|api/i,
    /implement|develop|build/i,
    /algorithm|logic|syntax/i,
    /debug|fix|error/i,
    /refactor|optimize/i,
  ],
  dataChart: [
    /chart|graph|plot/i,
    /trend|growth|decline/i,
    /distribution|spread/i,
    /correlation|relationship.*data/i,
    /forecast|predict/i,
  ],
  storyboard: [
    /story|narrative|scenario/i,
    /user\s*story|use\s*case/i,
    /sequence.*events/i,
    /explain.*happens/i,
    /walk.*through/i,
  ],
  ecosystem: [
    /ecosystem|environment|system/i,
    /components?|parts?|elements?/i,
    /interact|integrate|connect/i,
    /dependencies?|relationships?/i,
    /architecture.*overview/i,
  ],
  journey: [
    /journey|path|roadmap/i,
    /experience|process|workflow/i,
    /from.*to|start.*end/i,
    /customer|user.*flow/i,
    /onboarding|lifecycle/i,
  ],
  matrix: [
    /matrix|grid|table/i,
    /criteria|features?.*comparison/i,
    /scoring|rating|ranking/i,
    /evaluate|assess/i,
    /quadrant/i,
  ],
  hierarchy: [
    /hierarchy|org.*chart/i,
    /structure|organization/i,
    /levels?|tiers?|layers?/i,
    /taxonomy|classification/i,
    /parent.*child|inheritance/i,
  ],
  network: [
    /network|graph|nodes?/i,
    /connections?|links?|edges?/i,
    /social.*graph|relationship.*map/i,
    /topology|mesh/i,
    /interconnected?/i,
  ],
  gallery: [
    /images?|pictures?|photos?/i,
    /gallery|collection|showcase/i,
    /examples?|samples?|portfolio/i,
    /visual.*examples?/i,
  ],
  document: [
    /document|report|summary/i,
    /write.*(?:a|an|the)/i,
    /draft|outline|template/i,
    /format.*(?:as|like)/i,
    /professional.*(?:document|report)/i,
  ],
  interactive: [
    /interactive|clickable|dynamic/i,
    /playground|sandbox|experiment/i,
    /try|test|play.*with/i,
    /widget|tool|calculator/i,
    /adjustable|configurable/i,
  ],
};

// Emotional tone patterns
const TONE_PATTERNS: Record<VisualIntent['emotionalTone'], RegExp[]> = {
  inspiring: [/inspire|motivate|dream|vision|imagine|transform|revolutionize/i],
  analytical: [/analyze|data|metrics|statistics|measure|evaluate|assess/i],
  playful: [/fun|play|experiment|explore|creative|wild|crazy/i],
  serious: [/critical|important|urgent|security|risk|compliance/i],
  creative: [/creative|artistic|innovative|unique|original|novel/i],
  professional: [/professional|business|enterprise|corporate|formal/i],
};

// ============================================================================
// VISUAL RESPONSE ENGINE
// ============================================================================

export class VisualResponseEngine {
  private static instance: VisualResponseEngine;

  static getInstance(): VisualResponseEngine {
    if (!this.instance) {
      this.instance = new VisualResponseEngine();
    }
    return this.instance;
  }

  /**
   * Analyze a prompt and detect visual intent
   */
  detectIntent(prompt: string): VisualIntent {
    const scores: Record<VisualType, number> = {} as Record<VisualType, number>;

    // Score each visual type
    for (const [type, patterns] of Object.entries(VISUAL_PATTERNS)) {
      scores[type as VisualType] = patterns.reduce((score, pattern) => {
        return score + (pattern.test(prompt) ? 1 : 0);
      }, 0);
    }

    // Find best matches
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);

    const primaryType = (sorted[0]?.[0] || 'diagram') as VisualType;
    const primaryScore = sorted[0]?.[1] || 0;
    const secondaryTypes = sorted.slice(1, 3).map(([type]) => type as VisualType);

    // Detect emotional tone
    let emotionalTone: VisualIntent['emotionalTone'] = 'professional';
    for (const [tone, patterns] of Object.entries(TONE_PATTERNS)) {
      if (patterns.some((p) => p.test(prompt))) {
        emotionalTone = tone as VisualIntent['emotionalTone'];
        break;
      }
    }

    // Determine format and complexity
    const suggestedFormat = this.getSuggestedFormat(primaryType);
    const complexity = this.assessComplexity(prompt, primaryType);
    const interactivityLevel = this.getInteractivityLevel(primaryType, prompt);

    const confidence = Math.min(1, primaryScore / 3);

    return {
      primaryType,
      secondaryTypes,
      confidence,
      suggestedFormat,
      emotionalTone,
      complexity,
      interactivityLevel,
    };
  }

  /**
   * Generate visual directive for the chat system
   */
  generateDirective(prompt: string, mode: string = 'quick'): VisualDirective {
    const intent = this.detectIntent(prompt);

    // Skip visual generation for very simple queries
    if (intent.confidence < 0.2 && mode === 'quick') {
      return {
        enabled: false,
        intent,
        systemPromptAddition: '',
        formatInstructions: '',
        examplePatterns: [],
      };
    }

    const systemPromptAddition = this.buildSystemPromptAddition(intent);
    const formatInstructions = this.buildFormatInstructions(intent);
    const examplePatterns = this.getExamplePatterns(intent.primaryType);

    return {
      enabled: intent.confidence >= 0.3 || mode === 'creative',
      intent,
      systemPromptAddition,
      formatInstructions,
      examplePatterns,
    };
  }

  private getSuggestedFormat(type: VisualType): VisualIntent['suggestedFormat'] {
    const formatMap: Record<VisualType, VisualIntent['suggestedFormat']> = {
      diagram: 'svg',
      infographic: 'svg',
      illustration: 'svg',
      animation: 'react',
      timeline: 'svg',
      comparison: 'react',
      mindmap: 'svg',
      codeVisual: 'react',
      dataChart: 'svg',
      storyboard: 'react',
      ecosystem: 'svg',
      journey: 'svg',
      matrix: 'react',
      hierarchy: 'svg',
      network: 'svg',
      gallery: 'react',
      document: 'markdown',
      interactive: 'react',
    };
    return formatMap[type] || 'svg';
  }

  private assessComplexity(prompt: string, type: VisualType): VisualIntent['complexity'] {
    const complexityIndicators = [
      /complex|detailed|comprehensive|complete|full/i,
      /multiple|many|various|several/i,
      /all.*(?:aspects|parts|components)/i,
    ];

    const simpleIndicators = [
      /simple|basic|quick|brief|short/i,
      /just|only|single/i,
      /overview|summary/i,
    ];

    const complexMatches = complexityIndicators.filter((p) => p.test(prompt)).length;
    const simpleMatches = simpleIndicators.filter((p) => p.test(prompt)).length;

    if (complexMatches > simpleMatches) return 'complex';
    if (simpleMatches > complexMatches) return 'simple';
    return 'moderate';
  }

  private getInteractivityLevel(
    type: VisualType,
    prompt: string
  ): VisualIntent['interactivityLevel'] {
    if (/interactive|click|hover|dynamic/i.test(prompt)) return 'interactive';
    if (/animate|motion|move/i.test(prompt)) return 'animated';

    const interactiveTypes: VisualType[] = ['interactive', 'comparison', 'matrix', 'codeVisual'];
    const animatedTypes: VisualType[] = ['animation', 'timeline', 'journey', 'storyboard'];

    if (interactiveTypes.includes(type)) return 'interactive';
    if (animatedTypes.includes(type)) return 'animated';
    return 'hover';
  }

  private buildSystemPromptAddition(intent: VisualIntent): string {
    const visualInstructions: Record<VisualType, string> = {
      diagram: `
🎨 VISUAL RESPONSE: Create a beautiful SVG diagram to explain this concept.
- Use clean lines, modern styling, dark theme (white/cyan on dark)
- Include clear labels and directional flow arrows
- Make it comprehensive but not cluttered
- Wrap in \`\`\`svg code block`,

      infographic: `
📊 VISUAL RESPONSE: Create an engaging infographic with data visualization.
- Use modern data viz techniques: bars, circles, icons
- Include key statistics with visual emphasis
- Use color coding for different categories
- Make numbers pop with visual hierarchy
- Wrap in \`\`\`svg code block`,

      illustration: `
🎭 VISUAL RESPONSE: Create an artistic conceptual illustration.
- Use metaphors and visual storytelling
- Abstract shapes and gradients for concepts
- Evocative imagery that captures the essence
- Make it memorable and thought-provoking
- Wrap in \`\`\`svg code block`,

      animation: `
🎬 VISUAL RESPONSE: Create an animated explanation component.
- Use React with framer-motion for smooth animations
- Show progression/transformation over time
- Include play/pause controls if appropriate
- Make motion purposeful, not decorative
- Wrap in \`\`\`jsx code block`,

      timeline: `
📅 VISUAL RESPONSE: Create a visual timeline.
- Clear chronological progression
- Key milestones with icons/colors
- Connecting lines showing flow of time
- Brief labels for each point
- Wrap in \`\`\`svg code block`,

      comparison: `
⚖️ VISUAL RESPONSE: Create a visual comparison.
- Side-by-side or split view
- Clear pros/cons visualization
- Color coding (green=good, red=bad, yellow=neutral)
- Summary indicators
- Can use React component for interactivity
- Wrap in \`\`\`jsx or \`\`\`svg code block`,

      mindmap: `
🧠 VISUAL RESPONSE: Create an expansive mind map.
- Central concept with branching ideas
- Color-coded categories
- Varying node sizes by importance
- Organic, flowing connections
- Wrap in \`\`\`svg code block`,

      codeVisual: `
💻 VISUAL RESPONSE: Create visually annotated code.
- Syntax-highlighted code blocks
- Visual annotations and callouts
- Flowlines connecting related parts
- React component with interactive hover states
- Wrap in \`\`\`jsx code block`,

      dataChart: `
📈 VISUAL RESPONSE: Create beautiful data charts.
- Modern chart design (bars, lines, areas, pies)
- Animated data reveals if appropriate
- Legend and axis labels
- Tooltips for detailed values
- Wrap in \`\`\`svg or \`\`\`jsx code block`,

      storyboard: `
🎬 VISUAL RESPONSE: Create a visual storyboard.
- Sequential panels showing progression
- Character/user representation
- Scene transitions and flow
- Narrative captions
- Wrap in \`\`\`jsx code block`,

      ecosystem: `
🌐 VISUAL RESPONSE: Create an ecosystem diagram.
- Components as distinct entities
- Relationship arrows and labels
- Groupings and boundaries
- Legend for different types
- Wrap in \`\`\`svg code block`,

      journey: `
🗺️ VISUAL RESPONSE: Create a journey map.
- Path visualization with stages
- Emotional indicators at each stage
- Pain points and opportunities
- Clear start and end states
- Wrap in \`\`\`svg code block`,

      matrix: `
🔢 VISUAL RESPONSE: Create an evaluation matrix.
- Grid layout with clear headers
- Visual scoring (stars, bars, checks)
- Color coding for quick scanning
- Summary row/column
- Wrap in \`\`\`jsx code block for interactivity`,

      hierarchy: `
🏛️ VISUAL RESPONSE: Create a hierarchy diagram.
- Clear parent-child relationships
- Level indicators
- Connecting lines with labels
- Expandable sections if complex
- Wrap in \`\`\`svg code block`,

      network: `
🕸️ VISUAL RESPONSE: Create a network graph.
- Nodes representing entities
- Edges showing relationships
- Node sizing by importance
- Clustering related items
- Wrap in \`\`\`svg code block`,

      gallery: `
🖼️ VISUAL RESPONSE: Create a visual gallery.
- Grid or masonry layout
- Thumbnail previews
- Category organization
- Click-to-expand capability
- Wrap in \`\`\`jsx code block`,

      document: `
📄 VISUAL RESPONSE: Create a beautifully formatted document.
- Professional structure and headings
- Visual callouts and highlights
- Icon badges for key points
- Clean typography hierarchy`,

      interactive: `
🎮 VISUAL RESPONSE: Create an interactive widget.
- React component with state management
- User controls (sliders, buttons, inputs)
- Real-time feedback
- Engaging micro-interactions
- Wrap in \`\`\`jsx code block`,
    };

    const toneInstructions: Record<VisualIntent['emotionalTone'], string> = {
      inspiring:
        '\n💫 TONE: Make it inspiring and aspirational. Use uplifting colors, expansive layouts, and forward-looking imagery.',
      analytical:
        '\n🔬 TONE: Keep it precise and data-driven. Clear metrics, clean lines, factual presentation.',
      playful:
        '\n🎉 TONE: Make it fun and engaging! Use vibrant colors, playful shapes, and delightful details.',
      serious:
        '\n⚠️ TONE: Professional and authoritative. Muted colors, clear warnings where needed, trustworthy appearance.',
      creative:
        '\n🎨 TONE: Express creativity boldly! Unique layouts, artistic elements, unexpected visual metaphors.',
      professional:
        '\n💼 TONE: Clean, corporate, trustworthy. Modern minimalism, clear hierarchy, polished presentation.',
    };

    let addition = visualInstructions[intent.primaryType] || '';
    addition += toneInstructions[intent.emotionalTone] || '';

    if (intent.complexity === 'complex') {
      addition +=
        '\n📐 SCOPE: This is a complex topic - create a comprehensive visual with multiple sections or panels.';
    } else if (intent.complexity === 'simple') {
      addition +=
        '\n✨ SCOPE: Keep it simple and focused - one clear visual that communicates the core idea.';
    }

    return addition;
  }

  private buildFormatInstructions(intent: VisualIntent): string {
    const format = intent.suggestedFormat;

    const instructions: Record<typeof format, string> = {
      svg: `OUTPUT FORMAT: Raw SVG code
- Use viewBox for responsiveness (e.g., viewBox="0 0 800 600")
- Dark theme: background #0f1117, text white/gray, accents cyan/purple
- Include <style> block for animations if needed
- Make sure all text is readable (min 12px)`,

      mermaid: `OUTPUT FORMAT: Mermaid diagram code
- Use appropriate diagram type (flowchart, sequence, etc.)
- Keep labels concise
- Use subgraphs for organization`,

      react: `OUTPUT FORMAT: Self-contained React/JSX component
- Use hooks (useState, useEffect) as needed
- Include all styles inline or with Tailwind
- Component should be named and exportable
- Dark theme styling (bg-[#0f1117], text-white)
- Use framer-motion for animations`,

      html: `OUTPUT FORMAT: HTML with embedded CSS/JS
- Self-contained, no external dependencies
- Dark theme styling
- Responsive design`,

      markdown: `OUTPUT FORMAT: Rich Markdown
- Use headers, lists, tables, blockquotes
- Include emoji for visual interest
- Format code blocks with language tags`,

      canvas: `OUTPUT FORMAT: Canvas-based visualization
- Include setup and animation loop
- Dark theme colors
- Responsive sizing`,
    };

    return instructions[format] || instructions.svg;
  }

  private getExamplePatterns(type: VisualType): string[] {
    // Return example output patterns for the AI to follow
    const patterns: Record<VisualType, string[]> = {
      diagram: [
        '```svg\n<svg viewBox="0 0 800 400">...</svg>\n```',
        '[[visual:diagram|flowchart showing the process]]',
      ],
      infographic: [
        '```svg\n<svg viewBox="0 0 600 800"><!-- infographic --></svg>\n```',
        '[[visual:infographic|key statistics visualization]]',
      ],
      illustration: ['```svg\n<svg viewBox="0 0 400 400"><!-- conceptual art --></svg>\n```'],
      animation: ['```jsx\nfunction AnimatedExplanation() { ... }\n```'],
      timeline: ['```svg\n<svg viewBox="0 0 1000 200"><!-- timeline --></svg>\n```'],
      comparison: ['```jsx\nfunction ComparisonTable() { ... }\n```'],
      mindmap: ['```svg\n<svg viewBox="0 0 800 800"><!-- mindmap --></svg>\n```'],
      codeVisual: ['```jsx\nfunction AnnotatedCode() { ... }\n```'],
      dataChart: ['```svg\n<svg viewBox="0 0 600 400"><!-- chart --></svg>\n```'],
      storyboard: ['```jsx\nfunction Storyboard() { ... }\n```'],
      ecosystem: ['```svg\n<svg viewBox="0 0 800 600"><!-- ecosystem --></svg>\n```'],
      journey: ['```svg\n<svg viewBox="0 0 1200 400"><!-- journey map --></svg>\n```'],
      matrix: ['```jsx\nfunction EvaluationMatrix() { ... }\n```'],
      hierarchy: ['```svg\n<svg viewBox="0 0 600 800"><!-- hierarchy --></svg>\n```'],
      network: ['```svg\n<svg viewBox="0 0 800 800"><!-- network graph --></svg>\n```'],
      gallery: ['```jsx\nfunction ImageGallery() { ... }\n```'],
      document: ['# Document Title\n\n## Section 1\n...'],
      interactive: [
        '```jsx\nfunction InteractiveWidget() { const [state, setState] = useState(...); ... }\n```',
      ],
    };

    return patterns[type] || patterns.diagram;
  }
}

// Export singleton instance
export const visualResponseEngine = VisualResponseEngine.getInstance();
