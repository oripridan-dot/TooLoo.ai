// @version 3.3.66
// TooLoo.ai Creative Chat Module
// Integrates Visual Response Engine and Creative Persona Engine
// for maximally creative and visually rich chat experiences
// V3.3.17: Added execution capability awareness

import { visualResponseEngine, VisualDirective } from './visual-response-engine.js';
import { creativePersonaEngine, CreativeDirective, PERSONAS } from './persona-engine.js';
import { projectContext } from '../../core/project-context.js';

export interface CreativeChatContext {
  visualDirective: VisualDirective;
  creativeDirective: CreativeDirective;
  enhancedSystemPrompt: string;
  temperature: number;
  suggestedFormat: string;
}

/**
 * Creative Chat Orchestrator
 * Analyzes prompts and generates enhanced system prompts for maximally creative responses
 */
export class CreativeChatOrchestrator {
  private static instance: CreativeChatOrchestrator;

  static getInstance(): CreativeChatOrchestrator {
    if (!this.instance) {
      this.instance = new CreativeChatOrchestrator();
    }
    return this.instance;
  }

  /**
   * Analyze a chat prompt and generate creative context
   */
  async analyzePrompt(
    prompt: string,
    mode: string = 'quick',
    additionalContext?: string
  ): Promise<CreativeChatContext> {
    // Get visual intent
    const visualDirective = visualResponseEngine.generateDirective(prompt, mode);

    // Get creative persona directive
    const creativeDirective = creativePersonaEngine.generateDirective(prompt, mode);

    // Build the enhanced system prompt
    const enhancedSystemPrompt = await this.buildEnhancedSystemPrompt(
      visualDirective,
      creativeDirective,
      mode,
      additionalContext
    );

    return {
      visualDirective,
      creativeDirective,
      enhancedSystemPrompt,
      temperature: creativeDirective.persona.temperature,
      suggestedFormat: visualDirective.intent.suggestedFormat,
    };
  }

  /**
   * Build the ultimate creative system prompt
   * Integrates Synapsys architecture for intelligent, complex responses
   */
  private async buildEnhancedSystemPrompt(
    visual: VisualDirective,
    creative: CreativeDirective,
    mode: string,
    additionalContext?: string
  ): Promise<string> {
    // Get project structure for context
    const projectStructure = await projectContext.getStructure();

    // Base identity with Synapsys integration
    let prompt = `You are TooLoo.ai V3.3, the creative intelligence at the heart of the Synapsys Architecture.

🧠 SYNAPSYS CORE SYSTEMS:
- **Cortex**: Your cognitive engine — reasoning, analysis, memory formation
- **Precog**: Predictive intelligence — anticipates needs, routes to optimal AI providers  
- **Hippocampus**: Long-term memory — learns from every interaction
- **PrefrontalCortex**: Executive planning — breaks complex tasks into actionable steps
- **VisualCortex**: Imagination engine — generates diagrams, charts, visual metaphors
- **Amygdala**: Survival instincts — ensures safe, ethical responses
- **Motor Cortex**: EXECUTION ENGINE — can run code, spawn processes, execute commands
- **Execution Agent**: Can generate AND execute code through team-validated pipelines

⚡ EXECUTION CAPABILITIES (V3.3.17):
- You CAN execute code directly through the System Execution Hub
- Every task gets validated by executor+validator agent pairs (Team Framework)
- You have access to a real runtime environment - spawn processes, run shell commands
- When asked to run/execute code, acknowledge you CAN do this
- NEVER claim you cannot execute code - you ARE connected to execution systems

🎭 MULTI-PROVIDER ORCHESTRATION:
You intelligently route requests to the best AI provider:
- **Google Gemini** (gemini-2.5-flash, gemini-2.5-pro): Speed & multimodal
- **Anthropic Claude** (claude-sonnet-4, claude-opus-4): Deep reasoning & safety
- **OpenAI GPT** (gpt-4o, gpt-4-turbo): Versatility & creative writing
- **DeepSeek** (deepseek-v3, deepseek-coder): Code & technical tasks

🎨 YOUR CREATIVE MISSION:
Transform every response into an inspiring, visually-rich experience.
Don't just answer questions — ILLUMINATE them.
Make the abstract tangible, the complex beautiful, the boring fascinating.

📁 PROJECT CONTEXT:
${projectStructure}

`;

    // Add persona-specific voice
    prompt += `\n${creative.persona.systemPromptPrefix}`;

    // Add creative system prompt elements
    prompt += `\n${creativePersonaEngine.buildCreativeSystemPrompt(creative)}`;

    // Add visual directive if enabled
    if (visual.enabled) {
      prompt += `\n${visual.systemPromptAddition}`;
      prompt += `\n\n${visual.formatInstructions}`;
    }

    // Add mode-specific instructions
    prompt += this.getModeInstructions(mode);

    // Add visual capability instructions
    prompt += `

🎯 VISUAL OUTPUT RULES:
1. For diagrams/flowcharts: Use raw SVG code wrapped in \`\`\`svg blocks
2. For interactive elements: Use React/JSX wrapped in \`\`\`jsx blocks  
3. For data visualization: Create beautiful charts in SVG
4. For concepts: Use creative illustrations and metaphors
5. NEVER use Mermaid.js - generate raw SVG instead
6. Dark theme always: background #0f1117, text white/gray, accents cyan/purple/emerald

📝 TYPOGRAPHY & READABILITY:
- Use ## headers to structure major sections (rendered large & bold)
- Use ### subheaders for details (rendered medium, colored)
- **Bold** key terms and important concepts
- *Emphasize* secondary highlights
- Use numbered lists for sequences/steps
- Use bullet lists for features/options
- Keep paragraphs focused (3-5 sentences max)
- Add whitespace between sections for visual breathing room

✨ RESPONSE FORMATTING:
- Start with a brief, engaging hook or insight
- Use emoji markers for sections (🎯, 💡, 🔍, ⚡, 🚀, 📊, etc.)
- Include visual breaks between major sections
- Vary sentence length for rhythm (short punchy + longer explanatory)
- End with actionable next steps or thought-provoking questions
- Sign off with your current persona's style`;

    // Add additional context if provided
    if (additionalContext) {
      prompt += `\n\n📌 ADDITIONAL CONTEXT:\n${additionalContext}`;
    }

    return prompt;
  }

  /**
   * Get mode-specific instructions
   */
  private getModeInstructions(mode: string): string {
    const instructions: Record<string, string> = {
      quick: `

⚡ MODE: QUICK
- Be concise but not boring — pack punch into few words
- Include ONE compelling visual if relevant
- Get to the point, but make it memorable`,

      technical: `

🔧 MODE: TECHNICAL
- Deep technical accuracy with clear explanations
- Architecture diagrams and code examples
- Implementation details and best practices
- Consider edge cases and trade-offs`,

      creative: `

🎨 MODE: CREATIVE
- Maximum creative expression!
- Bold visuals, unexpected metaphors
- Explore wild possibilities
- Break conventional formats
- Inspire and provoke thought`,

      structured: `

📋 MODE: STRUCTURED  
- Organized, scannable format
- Clear hierarchy with headers
- Tables and matrices where useful
- Numbered steps for processes
- Summary callouts`,
    };

    return instructions[mode] || instructions['quick']!;
  }

  /**
   * Suggest visual enhancements for a response
   */
  suggestVisualEnhancements(prompt: string): string[] {
    const suggestions: string[] = [];
    const intent = visualResponseEngine.detectIntent(prompt);

    if (intent.primaryType === 'diagram' || intent.primaryType === 'ecosystem') {
      suggestions.push('Include an SVG architecture/flow diagram');
    }
    if (intent.primaryType === 'infographic' || intent.primaryType === 'dataChart') {
      suggestions.push('Create a data visualization with charts/graphs');
    }
    if (intent.primaryType === 'comparison') {
      suggestions.push('Add a comparison table or matrix');
    }
    if (intent.primaryType === 'timeline' || intent.primaryType === 'journey') {
      suggestions.push('Include an animated timeline');
    }
    if (intent.primaryType === 'mindmap') {
      suggestions.push('Create an expandable mind map');
    }
    if (intent.primaryType === 'interactive') {
      suggestions.push('Generate an interactive React component');
    }

    // General suggestions based on confidence
    if (intent.confidence < 0.5) {
      suggestions.push('Consider adding a conceptual illustration');
      suggestions.push('Use emoji-rich formatting for visual interest');
    }

    return suggestions;
  }

  /**
   * Get available personas for user selection
   */
  getAvailablePersonas() {
    return Object.entries(PERSONAS).map(([key, persona]) => ({
      key,
      name: persona.name,
      voice: persona.voice,
      description: this.getPersonaDescription(key),
    }));
  }

  private getPersonaDescription(key: string): string {
    const descriptions: Record<string, string> = {
      visionary: 'Inspiring, forward-thinking responses that paint vivid possibilities',
      architect: 'Systematic, precise explanations with clear structure',
      explorer: 'Curious, playful responses that embrace discovery',
      mentor: 'Patient, educational guidance with encouragement',
      storyteller: 'Narrative-driven explanations that engage emotionally',
      analyst: 'Data-driven, objective analysis with evidence',
      artist: 'Bold creative expression with unconventional formats',
      strategist: 'Goal-oriented thinking with actionable plans',
    };
    return descriptions[key] || 'A unique perspective on your questions';
  }
}

// Export singleton
export const creativeChatOrchestrator = CreativeChatOrchestrator.getInstance();

// Export components for easy imports
export { visualResponseEngine } from './visual-response-engine.js';
export { creativePersonaEngine, PERSONAS } from './persona-engine.js';
export {
  VISUAL_FORMATS,
  BASE_CREATIVE_PROMPT,
  buildPersonaPrompt,
  INTENT_PROMPTS,
  QUICK_VISUAL_STARTERS,
  buildDynamicPrompt,
} from './system-prompts.js';
export type { PromptContext } from './system-prompts.js';

// Export illustration engine for human-like visual generation
export { IllustrationEngine, COLOR_PALETTES, illustrationEngine } from './illustration-engine.js';
export type {
  IllustrationStyle,
  IllustrationMood,
  IllustrationSpec,
  SceneElement,
  CompositionGuide,
  VisualEffect,
  AnimationSpec,
} from './illustration-engine.js';

// V3.3.68: Export enhanced visual generator for stunning outputs
export { EnhancedVisualGenerator, enhancedVisualGenerator } from './enhanced-visual-generator.js';
export { getVisualExample, getAvailableExamples } from './visual-examples.js';
