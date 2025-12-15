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
import type { LLMOptions } from './types.js';
import { Kernel } from './kernel.js';
type Orchestrator = any;
type ProviderRegistry = any;
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
export declare class OrchestratorBridge extends EventEmitter {
    private config;
    private state;
    private providerRegistry;
    private orchestrator;
    connectedKernel: Kernel | null;
    constructor(config?: Partial<BridgeConfig>);
    /**
     * Initialize the bridge with provider registry
     */
    initialize(providerRegistry: ProviderRegistry): void;
    /**
     * Set the orchestrator reference (optional, for advanced features)
     */
    setOrchestrator(orchestrator: Orchestrator): void;
    /**
     * Connect the bridge to the Kernel
     * This injects real LLM services into the kernel context
     */
    connect(targetKernel?: Kernel): void;
    /**
     * Create the LLM services object for kernel context
     */
    private createLLMServices;
    /**
     * Complete a prompt using the real LLM provider
     */
    complete(prompt: string, options?: LLMOptions): Promise<string>;
    /**
     * Retry completion with exponential backoff
     */
    private completeWithRetry;
    /**
     * Stream a completion using the real LLM provider
     */
    stream(prompt: string, options?: LLMOptions): AsyncIterable<string>;
    /**
     * Process a message through the full orchestrator pipeline
     * This is exposed to skills that need advanced orchestration
     */
    processWithOrchestrator(message: string, options?: {
        sessionId?: string;
        stream?: boolean;
    }): Promise<any>;
    /**
     * Switch the default provider at runtime
     */
    setDefaultProvider(providerId: string): void;
    /**
     * Get available providers
     */
    getAvailableProviders(): string[];
    /**
     * Check if a provider is available
     */
    hasProvider(providerId: string): boolean;
    /**
     * Get current bridge state
     */
    getState(): BridgeState;
    /**
     * Get bridge configuration
     */
    getConfig(): BridgeConfig;
    /**
     * Update configuration at runtime
     */
    updateConfig(updates: Partial<BridgeConfig>): void;
    /**
     * Get metrics summary
     */
    getMetrics(): Record<string, number>;
    /**
     * Disconnect from kernel and cleanup
     */
    disconnect(): void;
}
/** Global bridge instance */
export declare const orchestratorBridge: OrchestratorBridge;
export default orchestratorBridge;
//# sourceMappingURL=orchestrator-bridge.d.ts.map