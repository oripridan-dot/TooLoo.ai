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
import { kernel } from './kernel.js';
// =============================================================================
// DEFAULT CONFIG
// =============================================================================
const DEFAULT_BRIDGE_CONFIG = {
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
    config;
    state;
    providerRegistry = null;
    orchestrator = null;
    connectedKernel = null;
    constructor(config = {}) {
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
    initialize(providerRegistry) {
        this.providerRegistry = providerRegistry;
        this.state.initialized = true;
        this.state.activeProvider = this.config.defaultProvider;
        console.log(`[OrchestratorBridge] ✓ Initialized with provider: ${this.config.defaultProvider}`);
        this.emit('bridge:initialized', { provider: this.config.defaultProvider });
    }
    /**
     * Set the orchestrator reference (optional, for advanced features)
     */
    setOrchestrator(orchestrator) {
        this.orchestrator = orchestrator;
        console.log('[OrchestratorBridge] ✓ Orchestrator connected');
    }
    /**
     * Connect the bridge to the Kernel
     * This injects real LLM services into the kernel context
     */
    connect(targetKernel = kernel) {
        if (!this.state.initialized) {
            throw new Error('[OrchestratorBridge] Must initialize with provider registry first');
        }
        this.connectedKernel = targetKernel;
        // Create the enhanced LLM services
        const llmServices = this.createLLMServices();
        // Inject into kernel context
        // We need to patch the kernel's createContext method
        const originalCreateContext = targetKernel.createContext.bind(targetKernel);
        targetKernel.createContext = (overrides) => {
            const context = originalCreateContext(overrides);
            // Replace mock LLM services with real ones
            context.services.llm = llmServices;
            // Add orchestrator service for advanced use
            context.services.orchestrator = {
                process: this.processWithOrchestrator.bind(this),
                getState: () => this.getState(),
            };
            return context;
        };
        // Also patch existing kernel context if it exists
        targetKernel.context.services.llm = llmServices;
        console.log('[OrchestratorBridge] ✓ Connected to Kernel - LLM services injected');
        this.emit('bridge:connected', { kernel: true });
    }
    // ---------------------------------------------------------------------------
    // LLM SERVICES
    // ---------------------------------------------------------------------------
    /**
     * Create the LLM services object for kernel context
     */
    createLLMServices() {
        return {
            complete: this.complete.bind(this),
            stream: this.stream.bind(this),
        };
    }
    /**
     * Complete a prompt using the real LLM provider
     */
    async complete(prompt, options) {
        const startTime = Date.now();
        if (!this.providerRegistry) {
            throw new Error('[OrchestratorBridge] Provider registry not initialized');
        }
        const providerId = options?.provider || this.config.defaultProvider;
        const provider = this.providerRegistry.get(providerId);
        if (!provider) {
            throw new Error(`[OrchestratorBridge] Provider not found: ${providerId}`);
        }
        const model = options?.model || this.config.defaultModels[providerId] || 'default';
        try {
            this.emit('llm:start', { provider: providerId, model, prompt: prompt.slice(0, 100) });
            // Build the completion request
            const request = {
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
        }
        catch (error) {
            this.state.errors++;
            this.state.lastError = error;
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
    async completeWithRetry(prompt, options, attempt) {
        if (attempt >= this.config.retry.maxAttempts) {
            throw this.state.lastError || new Error('Max retries exceeded');
        }
        await new Promise(r => setTimeout(r, this.config.retry.backoffMs * attempt));
        console.log(`[OrchestratorBridge] Retry attempt ${attempt + 1}/${this.config.retry.maxAttempts}`);
        try {
            return await this.complete(prompt, options);
        }
        catch {
            return this.completeWithRetry(prompt, options, attempt + 1);
        }
    }
    /**
     * Stream a completion using the real LLM provider
     */
    async *stream(prompt, options) {
        if (!this.providerRegistry) {
            throw new Error('[OrchestratorBridge] Provider registry not initialized');
        }
        const providerId = options?.provider || this.config.defaultProvider;
        const provider = this.providerRegistry.get(providerId);
        if (!provider) {
            throw new Error(`[OrchestratorBridge] Provider not found: ${providerId}`);
        }
        const model = options?.model || this.config.defaultModels[providerId] || 'default';
        this.state.streamsCount++;
        this.emit('llm:stream:start', { provider: providerId, model });
        try {
            // Build the streaming request
            const request = {
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
        }
        catch (error) {
            this.state.errors++;
            this.state.lastError = error;
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
    async processWithOrchestrator(message, options) {
        if (!this.orchestrator) {
            // Fall back to simple completion if no orchestrator
            const content = await this.complete(message);
            return { success: true, response: { content, role: 'assistant' } };
        }
        const sessionId = options?.sessionId || `kernel_${Date.now()}`;
        return this.orchestrator.process(message, sessionId, {
            stream: options?.stream,
        });
    }
    // ---------------------------------------------------------------------------
    // PROVIDER MANAGEMENT
    // ---------------------------------------------------------------------------
    /**
     * Switch the default provider at runtime
     */
    setDefaultProvider(providerId) {
        if (!this.providerRegistry?.get(providerId)) {
            throw new Error(`Provider not available: ${providerId}`);
        }
        this.config.defaultProvider = providerId;
        this.state.activeProvider = providerId;
        console.log(`[OrchestratorBridge] Switched to provider: ${providerId}`);
        this.emit('bridge:provider_changed', { provider: providerId });
    }
    /**
     * Get available providers
     */
    getAvailableProviders() {
        if (!this.providerRegistry)
            return [];
        return this.providerRegistry.list().map((p) => p.id);
    }
    /**
     * Check if a provider is available
     */
    hasProvider(providerId) {
        return this.providerRegistry?.get(providerId) !== undefined;
    }
    // ---------------------------------------------------------------------------
    // STATE & METRICS
    // ---------------------------------------------------------------------------
    /**
     * Get current bridge state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get bridge configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration at runtime
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.emit('bridge:config_updated', { config: this.config });
    }
    /**
     * Get metrics summary
     */
    getMetrics() {
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
    disconnect() {
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
//# sourceMappingURL=orchestrator-bridge.js.map