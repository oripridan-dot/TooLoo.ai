import OpenAI from 'openai';
import { AIProviderClient, AIProvider, AIRequest, AIResponse } from '../interfaces.js';
import { measureExecutionTime, calculateTokenCost } from '../utils.js';

export class OpenAIProvider implements AIProviderClient {
  public readonly name: AIProvider = 'openai';
  private client: OpenAI;
  private config: { apiKey: string; baseUrl?: string };

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const { result: response, executionTimeMs } = await measureExecutionTime(async () => {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          ...(request.systemMessage ? [{ role: 'system' as const, content: request.systemMessage }] : []),
          { role: 'user' as const, content: request.prompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4000,
      });

      return completion;
    });

    const usage = response.usage!;
    
    return {
      content: response.choices[0].message.content || '',
      provider: this.name,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      performance: {
        responseTimeMs: executionTimeMs,
      },
      metadata: {
        model: response.model,
        finishReason: response.choices[0].finish_reason,
        cost: calculateTokenCost(this.name, usage.prompt_tokens, usage.completion_tokens),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  getConfig() {
    return {
      name: this.name,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl,
    };
  }
}