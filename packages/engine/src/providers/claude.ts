import Anthropic from '@anthropic-ai/sdk';
import { AIProviderClient, AIProvider, AIRequest, AIResponse } from '../interfaces.js';
import { measureExecutionTime, calculateTokenCost } from '../utils.js';

export class ClaudeProvider implements AIProviderClient {
  public readonly name: AIProvider = 'claude';
  private client: Anthropic;
  private config: { apiKey: string; baseUrl?: string };

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const { result: response, executionTimeMs } = await measureExecutionTime(async () => {
      const message = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: request.maxTokens ?? 4000,
        temperature: request.temperature ?? 0.7,
        system: request.systemMessage,
        messages: [
          { role: 'user', content: request.prompt },
        ],
      });

      return message;
    });

    const usage = response.usage;
    
    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      provider: this.name,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      performance: {
        responseTimeMs: executionTimeMs,
      },
      metadata: {
        model: response.model,
        stopReason: response.stop_reason,
        cost: calculateTokenCost(this.name, usage.input_tokens, usage.output_tokens),
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try a minimal request to check availability
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
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