/**
 * Ollama Provider Adapter
 * Local LLM inference via Ollama
 * 
 * @version 2.0.0-alpha.0
 */

import { randomUUID } from 'crypto';
import { BaseProvider } from '../base.js';
import type { 
  CompletionRequest, 
  CompletionResponse, 
  StreamChunk,
  ProviderConfig,
  ModelInfo,
} from '../types.js';

// =============================================================================
// OLLAMA TYPES
// =============================================================================

interface OllamaConfig extends ProviderConfig {
  healthCheckInterval?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: OllamaOptions;
}

interface OllamaOptions {
  num_ctx?: number;
  num_predict?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  stop?: string[];
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];  // base64 encoded
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: OllamaOptions;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

// =============================================================================
// RECOMMENDED MODELS
// =============================================================================

export const OLLAMA_MODELS: ModelInfo[] = [
  {
    id: 'deepseek-coder-v2:16b',
    name: 'DeepSeek Coder V2 16B',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    capabilities: [
      { domain: 'coding', level: 'expert', score: 95 },
      { domain: 'reasoning', level: 'proficient', score: 80 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
  {
    id: 'codellama:34b',
    name: 'Code Llama 34B',
    contextWindow: 16000,
    maxOutputTokens: 4096,
    capabilities: [
      { domain: 'coding', level: 'expert', score: 90 },
      { domain: 'reasoning', level: 'capable', score: 70 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
  {
    id: 'qwen2.5:32b',
    name: 'Qwen 2.5 32B',
    contextWindow: 32000,
    maxOutputTokens: 8192,
    capabilities: [
      { domain: 'coding', level: 'proficient', score: 85 },
      { domain: 'reasoning', level: 'proficient', score: 85 },
      { domain: 'analysis', level: 'proficient', score: 80 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: [
      { domain: 'reasoning', level: 'capable', score: 75 },
      { domain: 'creative', level: 'capable', score: 70 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
  {
    id: 'mistral:7b',
    name: 'Mistral 7B',
    contextWindow: 32000,
    maxOutputTokens: 4096,
    capabilities: [
      { domain: 'reasoning', level: 'capable', score: 72 },
      { domain: 'creative', level: 'proficient', score: 75 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    contextWindow: 8192,
    maxOutputTokens: 0,
    capabilities: [
      { domain: 'analysis', level: 'expert', score: 90 },
    ],
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
  },
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Read lines from a streaming response
 */
async function* readStreamLines(response: Response): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) yield line;
      }
    }
    
    if (buffer.trim()) yield buffer;
  } finally {
    reader.releaseLock();
  }
}

// =============================================================================
// OLLAMA PROVIDER
// =============================================================================

/**
 * OllamaProvider - Local LLM inference via Ollama
 * 
 * Features:
 * - Health monitoring
 * - Model management (list, pull, delete)
 * - Generate & Chat endpoints
 * - Streaming support
 * - Embeddings
 */
export class OllamaProvider extends BaseProvider {
  private baseUrl: string;
  private healthCheckIntervalMs: number;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private _availableModels: OllamaModel[] = [];
  private _isHealthy: boolean = false;

  constructor(config: OllamaConfig) {
    super({
      ...config,
      models: OLLAMA_MODELS,
    });
    
    this.baseUrl = config.baseUrl ?? 
      process.env['OLLAMA_BASE_URL'] ?? 
      process.env['LOCALAI_BASE_URL'] ?? 
      'http://localhost:11434';
    
    this.healthCheckIntervalMs = config.healthCheckInterval ?? 30000;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) return;
    
    // Initial check
    void this.checkLocalHealth();
    
    this.healthCheckTimer = setInterval(() => {
      void this.checkLocalHealth();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get available models
   */
  get availableModels(): OllamaModel[] {
    return this._availableModels;
  }

  /**
   * Check if Ollama is healthy
   */
  get isHealthy(): boolean {
    return this._isHealthy;
  }

  /**
   * Internal health check implementation
   */
  private async checkLocalHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this._isHealthy = false;
        return false;
      }

      const data = await response.json() as OllamaTagsResponse;
      this._availableModels = data.models || [];
      this._isHealthy = true;
      
      return true;
    } catch {
      this._isHealthy = false;
      this._availableModels = [];
      return false;
    }
  }

  /**
   * Health check for base provider contract
   */
  protected async doHealthCheck(): Promise<void> {
    const healthy = await this.checkLocalHealth();
    if (!healthy) {
      throw new Error(`Ollama not available at ${this.baseUrl}`);
    }
  }

  // ===========================================================================
  // MODEL MANAGEMENT
  // ===========================================================================

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json() as OllamaTagsResponse;
    this._availableModels = data.models || [];
    return this._availableModels;
  }

  /**
   * Pull a model with progress callback
   */
  async pullModel(
    modelName: string, 
    onProgress?: (progress: OllamaPullProgress) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    for await (const line of readStreamLines(response)) {
      try {
        const progress = JSON.parse(line) as OllamaPullProgress;
        onProgress?.(progress);
      } catch {
        // Ignore parse errors
      }
    }

    // Refresh model list
    await this.listModels();
  }

  /**
   * Delete a model
   */
  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.status}`);
    }

    // Refresh model list
    await this.listModels();
  }

  // ===========================================================================
  // COMPLETION API (BaseProvider contract)
  // ===========================================================================

  /**
   * Complete a prompt (standard provider interface)
   */
  protected async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    
    // Convert to Ollama chat format
    const messages: OllamaChatMessage[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    for (const msg of request.messages) {
      messages.push({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      });
    }

    const ollamaRequest: OllamaChatRequest = {
      model: request.model ?? this.config.defaultModel,
      messages,
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop: request.stop,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as OllamaChatResponse;
    const latencyMs = Date.now() - startTime;

    return {
      id: randomUUID(),
      content: data.message.content,
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
      finishReason: data.done ? 'stop' : 'length',
      latencyMs,
    };
  }

  /**
   * Stream a completion (standard provider interface)
   */
  protected async *doStream(request: CompletionRequest): AsyncGenerator<StreamChunk, void, unknown> {
    // Convert to Ollama chat format
    const messages: OllamaChatMessage[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    for (const msg of request.messages) {
      messages.push({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      });
    }

    const ollamaRequest: OllamaChatRequest = {
      model: request.model ?? this.config.defaultModel,
      messages,
      stream: true,
      options: {
        num_ctx: 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop: request.stop,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama stream error: ${response.status} - ${error}`);
    }

    const chunkId = randomUUID();
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const line of readStreamLines(response)) {
      try {
        const data = JSON.parse(line) as OllamaChatResponse;
        
        if (data.message?.content) {
          yield {
            id: chunkId,
            type: 'content',
            content: data.message.content,
          };
        }

        if (data.done) {
          promptTokens = data.prompt_eval_count ?? 0;
          completionTokens = data.eval_count ?? 0;
          
          yield {
            id: chunkId,
            type: 'done',
            finishReason: 'stop',
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
          };
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  // ===========================================================================
  // DIRECT OLLAMA API (additional methods)
  // ===========================================================================

  /**
   * Raw generate endpoint (non-chat)
   */
  async generate(request: Partial<OllamaGenerateRequest>): Promise<OllamaGenerateResponse> {
    if (!this._isHealthy) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaGenerateRequest = {
      model: request.model ?? this.config.defaultModel,
      prompt: request.prompt ?? '',
      system: request.system,
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.7,
        ...request.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Generation failed: ${response.status} - ${error}`);
    }

    return await response.json() as OllamaGenerateResponse;
  }

  /**
   * Stream raw generate endpoint
   */
  async *streamGenerate(
    request: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<string, void, unknown> {
    if (!this._isHealthy) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaGenerateRequest = {
      model: request.model ?? this.config.defaultModel,
      prompt: request.prompt ?? '',
      system: request.system,
      stream: true,
      options: {
        num_ctx: 4096,
        temperature: 0.7,
        ...request.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stream generation failed: ${response.status} - ${error}`);
    }

    for await (const line of readStreamLines(response)) {
      try {
        const data = JSON.parse(line) as OllamaGenerateResponse;
        if (data.response) {
          yield data.response;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  /**
   * Get embeddings for text
   */
  async embed(text: string, model?: string): Promise<number[]> {
    if (!this._isHealthy) {
      throw new Error('Ollama is not available');
    }

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model ?? 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as { embedding?: number[] };
    return data.embedding ?? [];
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Destroy provider and cleanup
   */
  destroy(): void {
    this.stopHealthMonitoring();
  }
}
