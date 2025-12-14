// @version 3.3.577
/**
 * OpenAI Provider Adapter
 * GPT-4 family for versatile intelligence
 * 
 * @version 2.0.0-alpha.0
 */

import { BaseProvider } from '../base.js';
import type { 
  CompletionRequest, 
  CompletionResponse, 
  StreamChunk,
  ProviderConfig,
} from '../types.js';

interface OpenAIConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamDelta {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI GPT Provider
 * Supports: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
 */
export class OpenAIProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.organization = config.organization;
  }

  protected async doHealthCheck(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API health check failed: ${response.status}`);
    }
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    const openaiRequest: OpenAIRequest = {
      model: request.model ?? 'gpt-4o',
      messages: this.formatMessages(request),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      top_p: request.topP,
      stream: false,
      stop: request.stop,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as OpenAIResponse;
    const latencyMs = Date.now() - startTime;

    return {
      id: data.id,
      provider: 'openai',
      model: data.model,
      content: data.choices[0]?.message.content ?? '',
      finishReason: this.mapFinishReason(data.choices[0]?.finish_reason),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      latencyMs,
      metadata: {
        created: data.created,
      },
    };
  }

  protected async *doStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const openaiRequest: OpenAIRequest = {
      model: request.model ?? 'gpt-4o',
      messages: this.formatMessages(request),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      top_p: request.topP,
      stream: true,
      stop: request.stop,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI stream error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { id: 'stream-done', type: 'done', content: '' };
            return;
          }

          try {
            const parsed = JSON.parse(data) as OpenAIStreamDelta;
            const delta = parsed.choices[0]?.delta;

            if (delta?.content) {
              yield { id: parsed.id ?? 'stream', type: 'delta', content: delta.content };
            }

            if (parsed.choices[0]?.finish_reason) {
              yield {
                id: parsed.id ?? 'stream-done',
                type: 'done',
                content: '',
                finishReason: this.mapFinishReason(parsed.choices[0].finish_reason),
                usage: parsed.usage ? {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                } : undefined,
              };
            }
          } catch (parseError) {
            // Log malformed JSON for debugging - could indicate API changes
            console.warn('[OpenAI] Failed to parse stream chunk:', {
              data: data.substring(0, 200),
              error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
            });
            // Continue processing other chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return headers;
  }

  private formatMessages(request: CompletionRequest): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    return messages;
  }

  private mapFinishReason(reason: string | undefined): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop': return 'stop';
      case 'length': return 'length';
      case 'tool_calls': return 'tool_use';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
}

export default OpenAIProvider;
