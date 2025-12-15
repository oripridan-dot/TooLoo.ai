// @version 1.1.0.0
/**
 * Google Gemini Provider Adapter
 * Multi-modal AI with advanced reasoning
 * 
 * @version 1.1.0.0
 * @updated 2025-12-15
 */

import { BaseProvider } from '../base.js';
import type { 
  CompletionRequest, 
  CompletionResponse, 
  StreamChunk,
  ProviderConfig,
} from '../types.js';

interface GeminiConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

interface GeminiStreamResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Google Gemini LLM Provider
 * Supports: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash
 */
export class GeminiProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    super(config);
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  protected async doHealthCheck(): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/models?key=${this.apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Gemini API health check failed: ${response.status}`);
    }
  }

  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const model = request.model ?? 'gemini-2.0-flash';

    const geminiRequest: GeminiRequest = {
      contents: this.formatMessages(request),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192,
        topP: request.topP,
        stopSequences: request.stop,
      },
    };

    // Add system instruction if present
    if (request.systemPrompt) {
      geminiRequest.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as GeminiResponse;
    const latencyMs = Date.now() - startTime;

    // Extract content from response
    const content = data.candidates?.[0]?.content?.parts
      ?.map(p => p.text)
      .join('') ?? '';

    return {
      id: `gemini-${Date.now()}`,
      provider: 'gemini',
      model: model,
      content,
      finishReason: this.mapFinishReason(data.candidates?.[0]?.finishReason),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      latencyMs,
      metadata: {
        modelVersion: data.modelVersion,
      },
    };
  }

  protected async *doStream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const model = request.model ?? 'gemini-2.0-flash';

    const geminiRequest: GeminiRequest = {
      contents: this.formatMessages(request),
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 8192,
        topP: request.topP,
        stopSequences: request.stop,
      },
    };

    // Add system instruction if present
    if (request.systemPrompt) {
      geminiRequest.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequest),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini stream error: ${response.status} - ${error}`);
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
            const parsed = JSON.parse(data) as GeminiStreamResponse;
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
              yield {
                id: `gemini-chunk-${Date.now()}`,
                type: 'content',
                content: text,
              };
            }

            // Check for finish
            if (parsed.candidates?.[0]?.finishReason) {
              yield {
                id: 'stream-done',
                type: 'done',
                content: '',
                finishReason: this.mapFinishReason(parsed.candidates[0].finishReason),
                usage: parsed.usageMetadata ? {
                  promptTokens: parsed.usageMetadata.promptTokenCount,
                  completionTokens: parsed.usageMetadata.candidatesTokenCount,
                  totalTokens: parsed.usageMetadata.totalTokenCount,
                } : undefined,
              };
            }
          } catch {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Format messages for Gemini API (different from OpenAI format)
  private formatMessages(request: CompletionRequest): GeminiContent[] {
    const contents: GeminiContent[] = [];
    
    // Process conversation history
    if (request.messages && request.messages.length > 0) {
      for (const msg of request.messages) {
        // Map roles: user stays user, assistant becomes model
        const role = msg.role === 'assistant' ? 'model' : 'user';
        
        // Skip system messages - they go in systemInstruction
        if (msg.role === 'system') continue;
        
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return contents;
  }

  private mapFinishReason(reason?: string): CompletionResponse['finishReason'] {
    if (!reason) return 'stop';
    
    const reasonMap: Record<string, CompletionResponse['finishReason']> = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop',
    };
    
    return reasonMap[reason] ?? 'stop';
  }
}

// Factory function for consistent instantiation
export default function createGeminiProvider(config: GeminiConfig): GeminiProvider {
  return new GeminiProvider(config);
}

// Export model list
export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;
