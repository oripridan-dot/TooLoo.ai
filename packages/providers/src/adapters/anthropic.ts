/**
 * Anthropic (Claude) Provider Adapter
 * Best for nuanced reasoning and analysis
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

interface AnthropicConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  anthropicVersion?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
  };
  content_block?: AnthropicContentBlock;
  message?: Partial<AnthropicResponse>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Anthropic Claude Provider
 * Supports: claude-3-opus, claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet
 */
export class AnthropicProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string;
  private anthropicVersion: string;

  constructor(config: AnthropicConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
    this.anthropicVersion = config.anthropicVersion ?? '2023-06-01';
  }

  protected async doHealthCheck(): Promise<void> {
    // Anthropic doesn't have a dedicated health endpoint
    // We'll make a minimal request to verify API key
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion,
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });

    // Even a successful response means the API is working
    if (!response.ok && response.status !== 429 && response.status !== 400) {
      throw new Error(`Anthropic API health check failed: ${response.status}`);
    }
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    const anthropicRequest: AnthropicRequest = {
      model: request.model ?? 'claude-3-5-sonnet-20241022',
      messages: this.formatMessages(request),
      system: request.systemPrompt,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      stop_sequences: request.stop,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion,
      },
      body: JSON.stringify(anthropicRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as AnthropicResponse;
    const latencyMs = Date.now() - startTime;

    // Extract text content from content blocks
    const content = data.content
      .filter((block): block is AnthropicContentBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      id: data.id,
      provider: 'anthropic',
      model: data.model,
      content,
      finishReason: this.mapFinishReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      latencyMs,
      metadata: {
        stopSequence: data.stop_sequence,
      },
    };
  }

  protected async *doStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const anthropicRequest: AnthropicRequest = {
      model: request.model ?? 'claude-3-5-sonnet-20241022',
      messages: this.formatMessages(request),
      system: request.systemPrompt,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      top_p: request.topP,
      stop_sequences: request.stop,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.anthropicVersion,
      },
      body: JSON.stringify(anthropicRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic stream error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

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
          
          try {
            const event = JSON.parse(data) as AnthropicStreamEvent;

            switch (event.type) {
              case 'message_start':
                if (event.message?.usage?.input_tokens) {
                  inputTokens = event.message.usage.input_tokens;
                }
                break;

              case 'content_block_delta':
                if (event.delta?.text) {
                  yield { id: 'stream', type: 'delta', content: event.delta.text };
                }
                break;

              case 'message_delta':
                if (event.usage?.output_tokens) {
                  outputTokens = event.usage.output_tokens;
                }
                if (event.delta?.stop_reason) {
                  yield {
                    id: 'stream-done',
                    type: 'done',
                    content: '',
                    finishReason: this.mapFinishReason(event.delta.stop_reason),
                    usage: {
                      promptTokens: inputTokens,
                      completionTokens: outputTokens,
                      totalTokens: inputTokens + outputTokens,
                    },
                  };
                  return;
                }
                break;

              case 'message_stop':
                yield { id: 'stream-done', type: 'done', content: '' };
                return;
            }
          } catch (parseError) {
            // Log malformed JSON for debugging - could indicate API changes
            console.warn('[Anthropic] Failed to parse stream chunk:', {
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

  private formatMessages(request: CompletionRequest): AnthropicMessage[] {
    const messages: AnthropicMessage[] = [];

    for (const msg of request.messages) {
      // Anthropic only supports 'user' and 'assistant' roles in messages array
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  private mapFinishReason(reason: string | undefined): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn': return 'stop';
      case 'stop_sequence': return 'stop';
      case 'max_tokens': return 'length';
      case 'tool_use': return 'tool_use';
      default: return 'stop';
    }
  }
}

export default AnthropicProvider;
