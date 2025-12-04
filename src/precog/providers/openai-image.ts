import OpenAI from 'openai';
import {
  ImageCodeGenerationRequest,
  ImageCodeGenerationResponse,
  VisualContextAnalysis,
} from './types.js';

export class OpenAIImageProvider {
  private client: OpenAI | null = null;
  public name = 'DALLE3Provider';
  public type: 'paid' | 'local' | 'free' = 'paid';

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    } else {
      console.warn(
        '[OpenAIImageProvider] OPENAI_API_KEY is not set. OpenAI image generation will be unavailable.'
      );
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async generateImage(prompt: string, options: Record<string, unknown> = {}): Promise<string> {
    if (!this.client) {
      throw new Error(
        'OpenAI API key is missing. Please set OPENAI_API_KEY in your environment variables.'
      );
    }

    console.log(`[OpenAIImageProvider] Generating image with model dall-e-3...`);

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
        quality: 'standard',
        style: 'vivid',
      });

      const image = response.data?.[0];
      if (!image || !image.b64_json) {
        throw new Error('No image data returned from OpenAI');
      }

      return `data:image/png;base64,${image.b64_json}`;
    } catch (error) {
      console.error('[OpenAIImageProvider] Error generating image:', error);
      throw error;
    }
  }

  /**
   * Generate code from visual context using DALL-E 3 vision capabilities
   * DALL-E 3 can analyze design intent and inform code generation
   */
  async generateCodeFromContext(
    req: ImageCodeGenerationRequest
  ): Promise<ImageCodeGenerationResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key is missing.');
    }

    console.log(`[OpenAIImageProvider] Generating code from context with DALL-E 3...`);

    // Build comprehensive context-aware prompt for code generation
    const contextPrompt = this.buildCodeGenerationPrompt(req);

    try {
      // Use GPT-4 Turbo for code generation (which has vision capabilities)
      // This interprets the visual context and generates code
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: contextPrompt,
          },
        ],
        temperature: req.temperature || 0.7,
        max_tokens: req.maxTokens || 2048,
      });

      const generatedCode = response.choices[0]?.message?.content || '';

      if (!generatedCode) {
        throw new Error('No code generated from visual context');
      }

      // Analyze context
      const contextAnalysis = await this.analyzeVisualContext(req.context);

      // Generate optional visual mockup with DALL-E
      let imageUrl: string | undefined;
      if (req.includeImage) {
        try {
          imageUrl = await this.generateImage(req.visualPrompt);
        } catch (e) {
          console.warn('[OpenAIImageProvider] Failed to generate visual mockup:', e);
        }
      }

      return {
        code: generatedCode,
        language: req.outputFormat === 'markdown' ? 'markdown' : 'jsx',
        framework: req.outputFormat === 'react' ? 'react' : req.outputFormat,
        imageUrl,
        contextAnalysis,
        provider: 'openai',
        model: 'gpt-4-turbo',
        metadata: {
          visualPrompt: req.visualPrompt,
          codePrompt: req.codePrompt,
          outputFormat: req.outputFormat,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[OpenAIImageProvider] Code generation failed:', error);
      throw new Error(`OpenAI code generation failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze visual context to extract design patterns and requirements
   */
  async analyzeVisualContext(context: any): Promise<VisualContextAnalysis> {
    const patterns: string[] = [];
    const requirements: string[] = [];
    const recommendations: string[] = [];

    // Extract UI patterns
    if (context.uiPatterns) {
      patterns.push(...context.uiPatterns);
    }

    // Build requirements list
    if (context.componentRequirements) {
      for (const req of context.componentRequirements) {
        requirements.push(`Component: ${req.name} - ${req.purpose}`);
      }
    }

    // Generate recommendations
    if (context.designTokens?.colors) {
      recommendations.push('Ensure color consistency with provided palette');
    }
    if (context.designTokens?.typography) {
      recommendations.push('Apply typography hierarchy from design tokens');
    }
    if (context.brandGuidelines) {
      recommendations.push('Maintain brand guidelines in visual output');
    }

    // Determine code generation strategy
    let codeGenStrategy: 'component' | 'layout' | 'system' | 'utility' = 'component';
    if (context.uiPatterns?.length > 1) {
      codeGenStrategy = 'layout';
    }
    if (patterns.includes('design-system')) {
      codeGenStrategy = 'system';
    }

    return {
      extractedTokens: context.designTokens || {},
      identifiedPatterns: patterns,
      requirements,
      recommendations,
      codeGenStrategy,
    };
  }

  /**
   * Build comprehensive prompt for code generation from visual context
   */
  private buildCodeGenerationPrompt(req: ImageCodeGenerationRequest): string {
    const { visualPrompt, codePrompt, context, outputFormat } = req;

    let prompt = `# Visual-to-Code Generation\n\n`;

    prompt += `## Design Intent\n${visualPrompt}\n\n`;
    prompt += `## Code Requirements\n${codePrompt}\n\n`;

    prompt += `## Output Format\nGenerate ${outputFormat.toUpperCase()} code.\n\n`;

    if (context.designTokens) {
      prompt += `## Design System\n`;
      if (context.designTokens.colors) {
        const colors = Object.entries(context.designTokens.colors)
          .map(([key, val]) => `  ${key}: ${val}`)
          .join('\n');
        prompt += `### Colors\n${colors}\n`;
      }
      if (context.designTokens.typography) {
        prompt += `### Typography\n${JSON.stringify(context.designTokens.typography, null, 2)}\n`;
      }
      if (context.designTokens.spacing) {
        const spacing = Object.entries(context.designTokens.spacing)
          .map(([key, val]) => `  ${key}: ${val}`)
          .join('\n');
        prompt += `### Spacing Scale\n${spacing}\n`;
      }
      prompt += `\n`;
    }

    if (context.brandGuidelines) {
      prompt += `## Brand Guidelines\n`;
      if (context.brandGuidelines.primaryColor) {
        prompt += `- Primary Color: ${context.brandGuidelines.primaryColor}\n`;
      }
      if (context.brandGuidelines.fontFamily) {
        prompt += `- Font Family: ${context.brandGuidelines.fontFamily}\n`;
      }
      if (context.brandGuidelines.tone) {
        prompt += `- Brand Tone: ${context.brandGuidelines.tone}\n`;
      }
      prompt += `\n`;
    }

    if (context.uiPatterns && context.uiPatterns.length > 0) {
      prompt += `## UI Patterns\nIncorporate these patterns: ${context.uiPatterns.join(', ')}\n\n`;
    }

    if (context.componentRequirements && context.componentRequirements.length > 0) {
      prompt += `## Required Components\n`;
      for (const comp of context.componentRequirements) {
        prompt += `- **${comp.name}**: ${comp.purpose}\n`;
        if (comp.props) {
          prompt += `  Props: ${JSON.stringify(comp.props)}\n`;
        }
      }
      prompt += `\n`;
    }

    if (context.existingComponents && context.existingComponents.length > 0) {
      prompt += `## Reference Components (reuse if applicable)\n`;
      for (const comp of context.existingComponents) {
        prompt += `### ${comp.name}\n\`\`\`${outputFormat}\n${comp.code}\n\`\`\`\n\n`;
      }
    }

    if (context.customInstructions) {
      prompt += `## Special Instructions\n${context.customInstructions}\n\n`;
    }

    prompt += `Generate clean, maintainable, production-ready code. Use best practices for ${outputFormat}. `;
    prompt += `Follow all design tokens and brand guidelines. Ensure semantic HTML and accessibility.`;

    return prompt;
  }
}
