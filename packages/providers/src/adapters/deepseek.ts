// @version 3.3.577
/**
 * DeepSeek Provider Adapter
 * High-performance, cost-effective code generation
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

interface DeepSeekConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

interface DeepSeekChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DeepSeekStreamDelta {
  id?: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * DeepSeek LLM Provider
 * Supports: deepseek-chat, deepseek-coder, deepseek-reasoner
 */
export class DeepSeekProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: DeepSeekConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1';
  }

  protected async doHealthCheck(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API health check failed: ${response.status}`);
    }
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    const deepseekRequest: DeepSeekRequest = {
      model: request.model ?? 'deepseek-chat',
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as DeepSeekResponse;
    const latencyMs = Date.now() - startTime;

    return {
      id: data.id,
      provider: 'deepseek',
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
    const deepseekRequest: DeepSeekRequest = {
      model: request.model ?? 'deepseek-chat',
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(deepseekRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek stream error: ${response.status} - ${error}`);
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
            const parsed = JSON.parse(data) as DeepSeekStreamDelta;
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
              };
            }
          } catch (parseError) {
            // Log malformed JSON for debugging - could indicate API changes
            console.warn('[DeepSeek] Failed to parse stream chunk:', {
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

  private formatMessages(request: CompletionRequest): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

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

export default DeepSeekProvider;
