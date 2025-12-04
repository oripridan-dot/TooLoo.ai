// @version 2.2.84
import { GoogleGenAI } from '@google/genai';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageCodeGenerationRequest,
  ImageCodeGenerationResponse,
  VisualContextAnalysis,
} from './types.js';

export class GeminiImageProvider {
  private client: GoogleGenAI;
  private apiKey: string;
  public name = 'GeminiDeSign';
  public type: 'paid' | 'local' | 'free' = 'paid';

  constructor() {
    this.apiKey = process.env['GEMINI_API_KEY'] || '';
    if (!this.apiKey) {
      console.warn('[GeminiImageProvider] GEMINI_API_KEY is not set.');
    }
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is missing.');
    }

    // Determine model name. Map "gemini" placeholders to actual Imagen models.
    // If the user explicitly requests an Imagen model, we should try to use it.
    // Gemini 2.0 Flash Exp is primarily a text/multimodal-input model, not an image generator.
    let modelName = req.model || 'imagen-4.0-generate-001';

    // Force Imagen 4 if a text model is requested for image generation
    // But allow "DeSign Studio" (gemini-2.5-flash-image) if we implement support for it later via generateContent
    // For now, we assume generateImages is used, which requires an Imagen model.
    if (
      (modelName.includes('flash') || modelName.includes('pro')) &&
      !modelName.includes('imagen')
    ) {
      console.warn(
        `[GeminiImageProvider] Requested model ${modelName} does not support image generation via generateImages. Switching to imagen-4.0-generate-001.`
      );
      modelName = 'imagen-4.0-generate-001';
    }

    // Construct parts
    const parts: {
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }[] = [];

    // Add text prompt
    let finalPrompt = req.prompt;
    if (req.negativePrompt) {
      finalPrompt += `\n\nNegative prompt (exclude these elements): ${req.negativePrompt}`;
    }

    // Config
    const config: Record<string, unknown> = {
      numberOfImages: 1,
    };

    // Only add imageConfig if we have a valid aspect ratio.
    if (req.aspectRatio) {
      config['aspectRatio'] = req.aspectRatio;
    }

    try {
      console.log(`[GeminiImageProvider] Generating image with model ${modelName}...`);

      // Use generateImages for Imagen models
      const response = await this.client.models.generateImages({
        model: modelName,
        prompt: finalPrompt,
        config: config,
      });

      const images: { data: string; mimeType: string }[] = [];

      if (response.generatedImages && response.generatedImages.length > 0) {
        for (const img of response.generatedImages) {
          if (img.image && img.image.imageBytes) {
            images.push({
              data: img.image.imageBytes,
              mimeType: 'image/png', // Imagen usually returns PNG
            });
          }
        }
      }

      if (images.length === 0) {
        console.warn(
          '[GeminiImageProvider] No images returned in response:',
          JSON.stringify(response, null, 2)
        );
        throw new Error(
          'No images generated. The model might have refused the prompt or failed to generate an image.'
        );
      }

      return {
        images,
        metadata: {
          model: modelName,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[GeminiImageProvider] Generation failed:', error);
      throw new Error(`Gemini image generation failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze visual context and generate functional code (DeSign Studio capability)
   * Uses Gemini 3 Pro Image Preview to understand design context and generate code
   */
  async generateCodeFromContext(
    req: ImageCodeGenerationRequest
  ): Promise<ImageCodeGenerationResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is missing.');
    }

    const modelName =
      req.provider === 'gemini-nano' ? 'gemini-3-pro-image-preview' : 'gemini-2.0-flash-exp';

    console.log(`[GeminiImageProvider] Generating code from context with ${modelName}...`);

    // Build context-aware prompt
    const contextPrompt = this.buildContextPrompt(req);

    try {
      const contents = [
        {
          role: 'user',
          parts: [{ text: contextPrompt }],
        },
      ];

      const response = await this.client.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          temperature: req.temperature || 0.7,
          maxOutputTokens: req.maxTokens || 2048,
        },
      });

      // Extract code from response
      let generatedCode = '';
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate && candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              generatedCode += part.text;
            }
          }
        }
      }

      if (!generatedCode) {
        throw new Error('No code generated from visual context');
      }

      // Analyze context for metadata
      const contextAnalysis = await this.analyzeVisualContext(req.context);

      return {
        code: generatedCode,
        language: req.outputFormat === 'markdown' ? 'markdown' : 'jsx',
        framework: req.outputFormat === 'react' ? 'react' : req.outputFormat,
        contextAnalysis,
        provider: 'gemini',
        model: modelName,
        metadata: {
          visualPrompt: req.visualPrompt,
          codePrompt: req.codePrompt,
          outputFormat: req.outputFormat,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[GeminiImageProvider] Code generation failed:', error);
      throw new Error(`Gemini code generation failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze visual design context to extract patterns and requirements
   */
  async analyzeVisualContext(context: any): Promise<VisualContextAnalysis> {
    const patterns: string[] = [];
    const requirements: string[] = [];
    const recommendations: string[] = [];

    // Extract patterns from context
    if (context.uiPatterns) {
      patterns.push(...context.uiPatterns);
    }

    // Identify requirements
    if (context.componentRequirements) {
      for (const req of context.componentRequirements) {
        requirements.push(`Component: ${req.name} - ${req.purpose}`);
      }
    }

    // Build recommendations based on design tokens
    if (context.designTokens?.colors) {
      recommendations.push('Use provided color palette for consistency');
    }
    if (context.designTokens?.typography) {
      recommendations.push('Apply typography tokens for text hierarchy');
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
   * Build comprehensive context-aware prompt for code generation
   */
  private buildContextPrompt(req: ImageCodeGenerationRequest): string {
    const { visualPrompt, codePrompt, context, outputFormat } = req;

    let prompt = `# Visual-to-Code Generation Request\n\n`;

    prompt += `## Visual Intent\n${visualPrompt}\n\n`;
    prompt += `## Code Generation Instructions\n${codePrompt}\n\n`;

    prompt += `## Output Format\nGenerate ${outputFormat} code.\n\n`;

    if (context.designTokens) {
      prompt += `## Design Tokens\n`;
      prompt += `Colors: ${JSON.stringify(context.designTokens.colors || {})}\n`;
      prompt += `Typography: ${JSON.stringify(context.designTokens.typography || {})}\n`;
      prompt += `Spacing: ${JSON.stringify(context.designTokens.spacing || {})}\n\n`;
    }

    if (context.uiPatterns && context.uiPatterns.length > 0) {
      prompt += `## UI Patterns to Use\n${context.uiPatterns.join(', ')}\n\n`;
    }

    if (context.componentRequirements && context.componentRequirements.length > 0) {
      prompt += `## Component Requirements\n`;
      for (const comp of context.componentRequirements) {
        prompt += `- ${comp.name}: ${comp.purpose}\n`;
      }
      prompt += `\n`;
    }

    if (context.customInstructions) {
      prompt += `## Custom Instructions\n${context.customInstructions}\n\n`;
    }

    prompt += `Generate production-ready code that follows the above context and requirements.`;

    return prompt;
  }
}
