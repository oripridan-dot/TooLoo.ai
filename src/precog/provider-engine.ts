// @version 2.1.265
import LLMProvider from "./providers/llm-provider.js";
import { GeminiImageProvider } from "./providers/gemini-image.js";
import { OpenAIImageProvider } from "./providers/openai-image.js";
import { ImageGenerationRequest, ImageGenerationResponse } from "./providers/types.js";
import { CostCalculator } from "./engine/cost-calculator.js";
import fetch from "node-fetch";

interface OpenAIEmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

export class ProviderEngine {
  private llmProvider: LLMProvider;
  private geminiImageProvider: GeminiImageProvider;
  private openaiImageProvider: OpenAIImageProvider;
  private costCalculator: CostCalculator;

  constructor() {
    this.llmProvider = new LLMProvider();
    this.geminiImageProvider = new GeminiImageProvider();
    this.openaiImageProvider = new OpenAIImageProvider();
    this.costCalculator = new CostCalculator();
  }

  getProvider(name: string) {
    if (name === "openai") {
      return {
        embed: async (text: string) => {
          if (!process.env.OPENAI_API_KEY) {
            console.warn(
              "[ProviderEngine] OpenAI API key missing for embeddings",
            );
            return null;
          }
          try {
            const response = await fetch(
              "https://api.openai.com/v1/embeddings",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  input: text,
                  model: "text-embedding-3-small",
                }),
              },
            );

            if (!response.ok) {
              const err = await response.text();
              console.error(
                `[ProviderEngine] OpenAI Embedding Error: ${response.status} ${err}`,
              );
              return null;
            }

            const data = (await response.json()) as OpenAIEmbeddingResponse;
            if (data && data.data && data.data.length > 0) {
              return data.data[0].embedding;
            }
            return null;
          } catch (e) {
            console.error("[ProviderEngine] Embedding exception", e);
            return null;
          }
        },
      };
    }
    // Return a dummy for other providers if needed, or null
    return null;
  }

  async generate(params: {
    prompt: string;
    system?: string;
    taskType?: string;
  }) {
    // Adaptive Routing Logic
    const complexity = this.classifyComplexity(params.prompt, params.taskType);
    const modelTier = complexity === 'high' ? 'pro' : 'flash';
    
    console.log(`[ProviderEngine] Routing request (Complexity: ${complexity}) to ${modelTier} tier.`);

    // Use the class instance which has Amygdala integration and timeouts
    const result = await this.llmProvider.generate({
      prompt: params.prompt,
      system: params.system,
      taskType: params.taskType,
      maxTokens: 4096, // Increased default for thinking models
      modelTier // Pass tier to provider (needs implementation in LLMProvider)
    });

    // Cost Tracking
    const cost = this.costCalculator.getProviderCost(result.provider);
    console.log(`[ProviderEngine] Request completed via ${result.provider}. Est. Cost: $${cost}`);

    return {
      content: result.content,
      provider: result.provider,
      model: result.provider, 
    };
  }

  async generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    console.log(`[ProviderEngine] Generating image with prompt: ${req.prompt.substring(0, 50)}...`);
    
    if (req.provider === 'openai' || (req.model && req.model.includes('dall-e'))) {
        try {
            const base64Image = await this.openaiImageProvider.generateImage(req.prompt, {
                model: req.model,
                size: req.imageSize,
                quality: 'standard',
                style: 'vivid'
            });
            
            // Handle data URI format if present
            const data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
            
            return {
                images: [{
                    data: data,
                    mimeType: 'image/png'
                }]
            };
        } catch (error: any) {
            console.error("[ProviderEngine] OpenAI generation failed:", error);
            // Fallback to Gemini if OpenAI fails and provider wasn't strictly enforced? 
            // For now, just rethrow with a clearer message or let the caller handle it.
            // But if the user explicitly asked for OpenAI, we should probably fail.
            throw new Error(`OpenAI generation failed: ${error.message}`);
        }
    }

    return this.geminiImageProvider.generateImage(req);
  }

  private classifyComplexity(prompt: string, taskType?: string): 'low' | 'high' {
      if (taskType === 'code_generation' || taskType === 'architecting') return 'high';
      if (prompt.length > 1000) return 'high';
      if (prompt.includes('analyze') || prompt.includes('design')) return 'high';
      return 'low';
  }
}
