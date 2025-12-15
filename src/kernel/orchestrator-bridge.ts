/**
 * @file TooLoo.ai Skills OS - Kernel-Orchestrator Bridge
 * @description Seamlessly connects the Kernel to the Orchestrator's LLM capabilities
 * @version 1.1.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * THE BRIDGE PATTERN
 * ==================
 * The Kernel is the execution engine (lightweight, fast, local).
 * The Orchestrator has the LLM providers (DeepSeek, Anthropic, OpenAI, Gemini).
 * 
 * This bridge:
 * 1. Injects real LLM services into the Kernel context
 * 2. Allows skills to call LLMs without knowing which provider
 * 3. Enables the Kernel to drive orchestration transparently
 * 4. Provides streaming support end-to-end
 */

import { EventEmitter } from 'events';
import type { KernelContext, LLMOptions } from './types.js';
import { kernel, Kernel } from './kernel.js';

// Types imported dynamically to avoid circular deps
// These mirror @tooloo/engine and @tooloo/providers types
type Orchestrator = any;
type ProviderRegistry = any;

interface CompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// =============================================================================
// TYPES
// =============================================================================

export interface BridgeConfig {
  /** Default LLM provider */
  defaultProvider: 'deepseek' | 'anthropic' | 'openai' | 'gemini';
  /** Default model per provider */
  defaultModels: {
    deepseek?: string;
    anthropic?: string;
    openai?: string;
    gemini?: string;
  };
  /** Enable streaming by default */
  streamByDefault: boolean;
  /** Timeout for LLM calls (ms) */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface BridgeState {
  initialized: boolean;
  activeProvider: string | null;
  completionsCount: number;
  streamsCount: number;
  errors: number;
  lastError?: Error;
}

export interface LLMCompletionResult {
  content: string;
  provider: string;
  model: string;
  tokenCount?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  cached?: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  defaultProvider: 'deepseek',
  defaultModels: {
    deepseek: 'deepseek-chat',
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    gemini: 'gemini-2.0-flash',
  },
  streamByDefault: true,
  timeout: 60000,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
};

// =============================================================================
// ORCHESTRATOR BRIDGE
// =============================================================================

/**
 * Bridge that connects the Kernel to the Orchestrator's LLM capabilities
 * 
 * Usage:
 * ```typescript
 * import { OrchestratorBridge } from './orchestrator-bridge.js';
 * 
 * const bridge = new OrchestratorBridge(providerRegistry);
 * bridge.connect(kernel);
 * 
 * // Now skills can use real LLMs:
 * const result = await context.services.llm.complete('Hello!');
 * ```
 */
export class OrchestratorBridge extends EventEmitter {
  private config: BridgeConfig;
  private state: BridgeState;
  private providerRegistry: ProviderRegistry | null = null;
  private orchestrator: Orchestrator | null = null;
  public connectedKernel: Kernel | null = null;

  constructor(config: Partial<BridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config };
    this.state = {
      initialized: false,
      activeProvider: null,
      completionsCount: 0,
      streamsCount: 0,
      errors: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize the bridge with provider registry
   */
  initialize(providerRegistry: ProviderRegistry): void {
    this.providerRegistry = providerRegistry;
    this.state.initialized = true;
    this.state.activeProvider = this.config.defaultProvider;
    
    console.log(`[OrchestratorBridge] ✓ Initialized with provider: ${this.config.defaultProvider}`);
    this.emit('bridge:initialized', { provider: this.config.defaultProvider });
  }

  /**
   * Set the orchestrator reference (optional, for advanced features)
   */
  setOrchestrator(orchestrator: Orchestrator): void {
    this.orchestrator = orchestrator;
    console.log('[OrchestratorBridge] ✓ Orchestrator connected');
  }

  /**
   * Connect the bridge to the Kernel
   * This injects real LLM services into the kernel context
   */
  connect(targetKernel: Kernel = kernel): void {
    if (!this.state.initialized) {
      throw new Error('[OrchestratorBridge] Must initialize with provider registry first');
    }

    this.connectedKernel = targetKernel;

    // Create the enhanced LLM services
    const llmServices = this.createLLMServices();

    // Inject into kernel context
    // We need to patch the kernel's createContext method
    const originalCreateContext = (targetKernel as any).createContext.bind(targetKernel);
    
    (targetKernel as any).createContext = (overrides?: Partial<KernelContext>): KernelContext => {
      const context = originalCreateContext(overrides);
      
      // Replace mock LLM services with real ones
      context.services.llm = llmServices;
      
      // Add orchestrator service for advanced use
      (context.services as any).orchestrator = {
        process: this.processWithOrchestrator.bind(this),
        getState: () => this.getState(),
      };

      return context;
    };

    // Also patch existing kernel context if it exists
    (targetKernel as any).context.services.llm = llmServices;

    console.log('[OrchestratorBridge] ✓ Connected to Kernel - LLM services injected');
    this.emit('bridge:connected', { kernel: true });
  }

  // ---------------------------------------------------------------------------
  // LLM SERVICES
  // ---------------------------------------------------------------------------

  /**
   * Create the LLM services object for kernel context
   */
  private createLLMServices(): KernelContext['services']['llm'] {
    return {
      complete: this.complete.bind(this),
      stream: this.stream.bind(this),
    };
  }

  /**
   * Complete a prompt using the real LLM provider
   */
  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const startTime = Date.now();
    
    if (!this.providerRegistry) {
      throw new Error('[OrchestratorBridge] Provider registry not initialized');
    }

    const providerId = options?.provider || this.config.defaultProvider;
    const provider = this.providerRegistry.get(providerId);
    
    if (!provider) {
      throw new Error(`[OrchestratorBridge] Provider not found: ${providerId}`);
    }

    const model = options?.model || this.config.defaultModels[providerId as keyof typeof this.config.defaultModels] || 'default';

    try {
      this.emit('llm:start', { provider: providerId, model, prompt: prompt.slice(0, 100) });

      // Build the completion request
      const request: CompletionRequest = {
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4096,
        stream: false,
      };

      // Execute completion
      const response = await provider.complete(request);
      
      const latencyMs = Date.now() - startTime;
      this.state.completionsCount++;

      this.emit('llm:complete', {
        provider: providerId,
        model,
        latencyMs,
        tokenCount: response.usage,
      });

      return response.content;

    } catch (error) {
      this.state.errors++;
      this.state.lastError = error as Error;
      
      this.emit('llm:error', { provider: providerId, error });
      
      // Attempt fallback if configured
      if (this.config.retry.maxAttempts > 1) {
        return this.completeWithRetry(prompt, options, 1);
      }
      
      throw error;
    }
  }

  /**
   * Retry completion with exponential backoff
   */
  private async completeWithRetry(
    prompt: string,
    options: LLMOptions | undefined,
    attempt: number
  ): Promise<string> {
    if (attempt >= this.config.retry.maxAttempts) {
      throw this.state.lastError || new Error('Max retries exceeded');
    }

    await new Promise(r => setTimeout(r, this.config.retry.backoffMs * attempt));
    
    console.log(`[OrchestratorBridge] Retry attempt ${attempt + 1}/${this.config.retry.maxAttempts}`);
    
    try {
      return await this.complete(prompt, options);
    } catch {
      return this.completeWithRetry(prompt, options, attempt + 1);
    }
  }

  /**
   * Stream a completion using the real LLM provider
   */
  async *stream(prompt: string, options?: LLMOptions): AsyncIterable<string> {
    if (!this.providerRegistry) {
      throw new Error('[OrchestratorBridge] Provider registry not initialized');
    }

    const providerId = options?.provider || this.config.defaultProvider;
    const provider = this.providerRegistry.get(providerId);
    
    if (!provider) {
      throw new Error(`[OrchestratorBridge] Provider not found: ${providerId}`);
    }

    const model = options?.model || this.config.defaultModels[providerId as keyof typeof this.config.defaultModels] || 'default';

    this.state.streamsCount++;
    this.emit('llm:stream:start', { provider: providerId, model });

    try {
      // Build the streaming request
      const request: CompletionRequest = {
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4096,
        stream: true,
      };

      // Stream the response
      const stream = provider.stream(request);
      
      for await (const chunk of stream) {
        yield chunk.content;
        this.emit('llm:stream:chunk', { chunk: chunk.content });
      }

      this.emit('llm:stream:end', { provider: providerId, model });

    } catch (error) {
      this.state.errors++;
      this.state.lastError = error as Error;
      this.emit('llm:stream:error', { provider: providerId, error });
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // ORCHESTRATOR INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Process a message through the full orchestrator pipeline
   * This is exposed to skills that need advanced orchestration
   */
  async processWithOrchestrator(
    message: string,
    options?: {
      sessionId?: string;
      stream?: boolean;
    }
  ): Promise<any> {
    if (!this.orchestrator) {
      // Fall back to simple completion if no orchestrator
      const content = await this.complete(message);
      return { success: true, response: { content, role: 'assistant' } };
    }

    const sessionId = options?.sessionId || `kernel_${Date.now()}`;
    return this.orchestrator.process(message, sessionId as any, {
      stream: options?.stream,
    });
  }

  // ---------------------------------------------------------------------------
  // PROVIDER MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Switch the default provider at runtime
   */
  setDefaultProvider(providerId: string): void {
    if (!this.providerRegistry?.get(providerId)) {
      throw new Error(`Provider not available: ${providerId}`);
    }
    
    this.config.defaultProvider = providerId as any;
    this.state.activeProvider = providerId;
    
    console.log(`[OrchestratorBridge] Switched to provider: ${providerId}`);
    this.emit('bridge:provider_changed', { provider: providerId });
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    if (!this.providerRegistry) return [];
    return this.providerRegistry.list().map((p: { id: string }) => p.id);
  }

  /**
   * Check if a provider is available
   */
  hasProvider(providerId: string): boolean {
    return this.providerRegistry?.get(providerId) !== undefined;
  }

  // ---------------------------------------------------------------------------
  // STATE & METRICS
  // ---------------------------------------------------------------------------

  /**
   * Get current bridge state
   */
  getState(): BridgeState {
    return { ...this.state };
  }

  /**
   * Get bridge configuration
   */
  getConfig(): BridgeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<BridgeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('bridge:config_updated', { config: this.config });
  }

  /**
   * Get metrics summary
   */
  getMetrics(): Record<string, number> {
    return {
      completions: this.state.completionsCount,
      streams: this.state.streamsCount,
      errors: this.state.errors,
      successRate: this.state.completionsCount > 0
        ? ((this.state.completionsCount - this.state.errors) / this.state.completionsCount) * 100
        : 100,
    };
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Disconnect from kernel and cleanup
   */
  disconnect(): void {
    this.connectedKernel = null;
    this.orchestrator = null;
    this.emit('bridge:disconnected');
    console.log('[OrchestratorBridge] Disconnected');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global bridge instance */
export const orchestratorBridge = new OrchestratorBridge();

export default orchestratorBridge;
