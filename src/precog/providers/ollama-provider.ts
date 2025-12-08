// @version 3.3.350
/**
 * Ollama Provider - Local AI Integration
 *
 * Provides integration with Ollama for local AI inference.
 * Supports:
 * - Model management (pull, list, delete)
 * - Streaming and non-streaming inference
 * - Health monitoring
 * - Automatic fallback from cloud to local
 *
 * Part of PHASE 2: Local AI Enhancement
 * @module precog/providers/ollama-provider
 */

import fetch, { Response } from 'node-fetch';
import { bus } from '../../core/event-bus.js';
import { Readable } from 'stream';

// Helper to read streaming response
async function* readStreamLines(response: Response): AsyncGenerator<string, void, unknown> {
  const body = response.body as unknown as Readable | null;
  if (!body) return;
  
  let buffer = '';
  for await (const chunk of body) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) yield line;
    }
  }
  if (buffer.trim()) yield buffer;
}

// ============================================================================
// TYPES
// ============================================================================

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    num_ctx?: number;
    num_predict?: number;
    temperature?: number;
    top_k?: number;
    top_p?: number;
    repeat_penalty?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
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

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: OllamaGenerateRequest['options'];
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaHealthStatus {
  available: boolean;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  lastCheck: number;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// RECOMMENDED MODELS
// ============================================================================

export const RECOMMENDED_MODELS = {
  // General purpose
  'llama3.2': {
    description: 'Meta Llama 3.2 - Excellent general purpose model',
    size: '3B',
    recommended: true,
  },
  'llama3.2:70b': {
    description: 'Meta Llama 3.2 70B - High capability model',
    size: '70B',
    recommended: false,
  },
  'mistral': {
    description: 'Mistral 7B - Fast and efficient',
    size: '7B',
    recommended: true,
  },
  // Code specialized
  'codellama': {
    description: 'Code Llama - Optimized for code generation',
    size: '7B',
    recommended: true,
  },
  'deepseek-coder': {
    description: 'DeepSeek Coder - Strong code understanding',
    size: '6.7B',
    recommended: true,
  },
  'starcoder2': {
    description: 'StarCoder2 - Code completion specialist',
    size: '15B',
    recommended: false,
  },
  // Creative/Writing
  'neural-chat': {
    description: 'Neural Chat - Conversational AI',
    size: '7B',
    recommended: false,
  },
  // Small/Fast
  'phi3': {
    description: 'Microsoft Phi-3 - Small but capable',
    size: '3.8B',
    recommended: true,
  },
  'gemma2': {
    description: 'Google Gemma 2 - Efficient and fast',
    size: '9B',
    recommended: true,
  },
};

// ============================================================================
// OLLAMA PROVIDER CLASS
// ============================================================================

export class OllamaProvider {
  private baseUrl: string;
  private defaultModel: string;
  private healthStatus: OllamaHealthStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.baseUrl = process.env['LOCALAI_BASE_URL'] || 
                   process.env['OLLAMA_BASE_URL'] || 
                   'http://localhost:11434';
    this.defaultModel = process.env['OLLAMA_MODEL'] || 
                        process.env['LOCALAI_MODEL'] || 
                        'llama3.2';
    
    this.healthStatus = {
      available: false,
      baseUrl: this.baseUrl,
      models: [],
      defaultModel: this.defaultModel,
      lastCheck: 0,
      latencyMs: 0,
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  // ===========================================================================
  // Health & Monitoring
  // ===========================================================================

  private startHealthMonitoring() {
    // Initial check
    this.checkHealth();
    
    // Periodic health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, 30000);
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { models?: OllamaModel[] };
      const models = data.models?.map(m => m.name) || [];
      
      this.healthStatus = {
        available: true,
        baseUrl: this.baseUrl,
        models,
        defaultModel: models.includes(this.defaultModel) ? this.defaultModel : (models[0] || this.defaultModel),
        lastCheck: Date.now(),
        latencyMs: Date.now() - startTime,
      };

      bus.publish('precog', 'ollama:health', this.healthStatus);
      console.log(`[OllamaProvider] ✓ Health check passed. Models: ${models.length}`);
      
    } catch (error: any) {
      this.healthStatus = {
        available: false,
        baseUrl: this.baseUrl,
        models: [],
        defaultModel: this.defaultModel,
        lastCheck: Date.now(),
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
      
      // Don't spam logs if Ollama is simply not configured
      if (process.env['ENABLE_LOCALAI'] === 'true') {
        console.warn(`[OllamaProvider] ✗ Health check failed: ${error.message}`);
      }
    }

    return this.healthStatus;
  }

  getHealthStatus(): OllamaHealthStatus {
    return { ...this.healthStatus };
  }

  isAvailable(): boolean {
    return this.healthStatus.available;
  }

  // ===========================================================================
  // Model Management
  // ===========================================================================

  async listModels(): Promise<OllamaModel[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }
    const data = await response.json() as { models?: OllamaModel[] };
    return data.models || [];
  }

  async pullModel(modelName: string, onProgress?: (status: string) => void): Promise<void> {
    console.log(`[OllamaProvider] Pulling model: ${modelName}`);
    
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    // Stream progress using helper
    for await (const line of readStreamLines(response)) {
      try {
        const data = JSON.parse(line) as { status?: string };
        if (data.status && onProgress) {
          onProgress(data.status);
        }
      } catch { /* ignore parse errors */ }
    }

    // Refresh model list
    await this.checkHealth();
    console.log(`[OllamaProvider] ✓ Model ${modelName} pulled successfully`);
  }

  async deleteModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete model: ${response.status}`);
    }

    await this.checkHealth();
    console.log(`[OllamaProvider] ✓ Model ${modelName} deleted`);
  }

  // ===========================================================================
  // Generation
  // ===========================================================================

  async generate(request: Partial<OllamaGenerateRequest>): Promise<OllamaGenerateResponse> {
    if (!this.healthStatus.available) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaGenerateRequest = {
      model: request.model || this.healthStatus.defaultModel,
      prompt: request.prompt || '',
      system: request.system,
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.7,
        ...request.options,
      },
    };

    const startTime = Date.now();
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Generation failed: ${response.status} - ${error}`);
    }

    const result = await response.json() as OllamaGenerateResponse;
    
    bus.publish('precog', 'ollama:generation', {
      model: fullRequest.model,
      latencyMs: Date.now() - startTime,
      tokenCount: result.eval_count || 0,
    });

    return result;
  }

  async *streamGenerate(
    request: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<string, void, unknown> {
    if (!this.healthStatus.available) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaGenerateRequest = {
      model: request.model || this.healthStatus.defaultModel,
      prompt: request.prompt || '',
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
      } catch { /* ignore parse errors */ }
    }
  }

  // ===========================================================================
  // Chat (Multi-turn conversations)
  // ===========================================================================

  async chat(request: Partial<OllamaChatRequest>): Promise<OllamaChatResponse> {
    if (!this.healthStatus.available) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaChatRequest = {
      model: request.model || this.healthStatus.defaultModel,
      messages: request.messages || [],
      stream: false,
      options: {
        num_ctx: 4096,
        temperature: 0.7,
        ...request.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat failed: ${response.status} - ${error}`);
    }

    return await response.json() as OllamaChatResponse;
  }

  async *streamChat(
    request: Partial<OllamaChatRequest>
  ): AsyncGenerator<string, void, unknown> {
    if (!this.healthStatus.available) {
      throw new Error('Ollama is not available');
    }

    const fullRequest: OllamaChatRequest = {
      model: request.model || this.healthStatus.defaultModel,
      messages: request.messages || [],
      stream: true,
      options: {
        num_ctx: 4096,
        temperature: 0.7,
        ...request.options,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stream chat failed: ${response.status} - ${error}`);
    }

    for await (const line of readStreamLines(response)) {
      try {
        const data = JSON.parse(line) as OllamaChatResponse;
        if (data.message?.content) {
          yield data.message.content;
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // ===========================================================================
  // Embeddings
  // ===========================================================================

  async embed(text: string, model?: string): Promise<number[]> {
    if (!this.healthStatus.available) {
      throw new Error('Ollama is not available');
    }

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json() as { embedding?: number[] };
    return data.embedding || [];
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const ollamaProvider = new OllamaProvider();
