// @version 2.2.2
import LLMProvider from "../precog/providers/llm-provider.js";

export interface LLMGenerationOptions {
  prompt: string;
  system?: string;
  taskType?: "chat" | "code" | "reasoning" | "analysis" | "creative";
  criticality?: "low" | "normal" | "high";
  maxTokens?: number;
  context?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  provider: string;
  confidence: number;
  latency?: number;
}

export class LLMSDK {
  private provider: LLMProvider;

  constructor() {
    this.provider = new LLMProvider();
  }

  /**
   * Generate text using the best available LLM provider.
   */
  async generate(options: LLMGenerationOptions): Promise<LLMResponse> {
    const result = await this.provider.generateSmartLLM({
      prompt: options.prompt,
      system: options.system,
      taskType: options.taskType,
      criticality: options.criticality,
      maxTokens: options.maxTokens,
      context: options.context
    });

    return {
      content: result.text || result.content,
      provider: result.providerUsed || result.provider,
      confidence: result.providerBadge?.percent ? result.providerBadge.percent / 100 : (result.confidence || 0.7),
      latency: result.latency
    };
  }

  /**
   * Generate code specifically.
   */
  async generateCode(prompt: string, language: string): Promise<LLMResponse> {
    return this.generate({
      prompt: `Generate ${language} code for: ${prompt}`,
      system: `You are an expert ${language} developer. Return ONLY the code, no markdown, no explanations.`,
      taskType: "code",
      criticality: "high"
    });
  }
}

export const llm = new LLMSDK();
