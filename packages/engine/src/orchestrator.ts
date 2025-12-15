// @version 1.1.0.0
/**
 * @tooloo/engine - Orchestrator
 * The brain that coordinates skills, providers, and memory
 * 
 * @version 1.1.0.0
 * @updated 2025-12-15
 */

import type { 
  Intent, 
  Message, 
  SessionId
} from '@tooloo/core';
import type { SkillDefinition, SkillRegistry } from '@tooloo/skills';
import type { ProviderRegistry } from '@tooloo/providers';

import type {
  OrchestrationContext,
  OrchestrationResult,
  OrchestratorConfig,
  OrchestratorEvent,
  ProviderSelection,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { RoutingEngine } from './routing-engine.js';
import { SkillExecutor } from './skill-executor.js';
import { ContextBuilder } from './context-builder.js';

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * The main orchestration engine
 * Coordinates all components to process user requests
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private routingEngine: RoutingEngine;
  private skillExecutor: SkillExecutor;
  private contextBuilder: ContextBuilder;
  private eventListeners: Map<string, Set<(event: OrchestratorEvent) => void>>;
  
  constructor(
    private readonly skillRegistry: SkillRegistry,
    private readonly providerRegistry: ProviderRegistry,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.routingEngine = new RoutingEngine(this.skillRegistry, this.config.routing);
    this.skillExecutor = new SkillExecutor(providerRegistry, this.config);
    this.contextBuilder = new ContextBuilder(this.config.memory);
    this.eventListeners = new Map();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Process a user message through the orchestration pipeline
   */
  async process(
    message: string,
    sessionId: SessionId,
    options: {
      userId?: string;
      projectId?: string;
      conversation?: Message[];
      artifacts?: any[];
      stream?: boolean;
      routingHints?: {
        complexity?: string;
        preferredProvider?: string;
        speedWeight?: number;
        qualityWeight?: number;
        [key: string]: unknown;
      };
    } = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    console.log(`[Orchestrator] Processing message: "${message.slice(0, 50)}..."`);

    try {
      // 1. Build context
      const context = await this.buildContext(message, sessionId, requestId, options);
      console.log(`[Orchestrator] Context built. Intent: ${context.intent.type} (${context.intent.confidence})`);
      this.emit({ type: 'orchestration:start', context });

      // 2. Route to skill
      const routingStart = Date.now();
      const routingResult = await this.routingEngine.route(context);
      const routingTimeMs = Date.now() - routingStart;
      console.log(`[Orchestrator] Routed to skill: ${routingResult.skill.name} (${routingResult.confidence})`);
      this.emit({ type: 'orchestration:routed', result: routingResult });

      // 3. Select provider
      const providerSelection = await this.selectProvider(routingResult.skill, context);
      console.log(`[Orchestrator] Selected provider: ${providerSelection.providerId}, model: ${providerSelection.model}`);
      this.emit({ type: 'orchestration:provider_selected', selection: providerSelection });

      // 4. Execute skill
      this.emit({ type: 'orchestration:executing', skill: routingResult.skill });
      const executionStart = Date.now();
      
      const executionResult = await this.skillExecutor.execute({
        orchestration: context,
        skill: routingResult.skill,
        confidence: routingResult.confidence,
        tools: [], // TODO: Load tools from skill definition
        memory: {
          getRelevant: async () => [], // TODO: Wire to @tooloo/memory
          store: async () => 'temp_id',
        },
      }, providerSelection);

      const executionTimeMs = Date.now() - executionStart;
      const totalTimeMs = Date.now() - startTime;

      // 5. Build result
      const result: OrchestrationResult = {
        success: true,
        response: {
          content: executionResult.content,
          role: 'assistant',
          metadata: {
            skillId: routingResult.skill.id,
            providerId: providerSelection.providerId,
            model: providerSelection.model,
            tokenCount: executionResult.tokenCount,
            latencyMs: executionResult.latencyMs,
          },
        },
        artifacts: executionResult.artifacts,
        toolCalls: executionResult.toolCalls,
        routing: routingResult,
        provider: providerSelection,
        metrics: {
          totalTimeMs,
          routingTimeMs,
          executionTimeMs,
        },
      };

      this.emit({ type: 'orchestration:complete', result });
      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[Orchestrator] ❌ Execution error:`, err.message);
      console.error(`[Orchestrator] Stack:`, err.stack);
      this.emit({ type: 'orchestration:error', error: err });

      return {
        success: false,
        error: {
          code: 'ORCHESTRATION_ERROR',
          message: err.message,
          details: err.stack,
          recoverable: this.isRecoverableError(err),
        },
        routing: {
          skill: this.getDefaultSkill(),
          confidence: 0,
          alternatives: [],
          reasoning: 'Error occurred before routing',
          routingTimeMs: 0,
        },
        provider: {
          providerId: this.config.defaultProvider as any,
          model: this.config.defaultModel,
          reason: 'Default fallback due to error',
          fallbacks: [],
          config: {},
        },
        metrics: {
          totalTimeMs: Date.now() - startTime,
          routingTimeMs: 0,
          executionTimeMs: 0,
        },
      };
    }
  }

  /**
   * Process with streaming response
   */
  async *processStream(
    message: string,
    sessionId: SessionId,
    options: Parameters<typeof this.process>[2] = {}
  ): AsyncGenerator<string | OrchestrationResult> {
    const context = await this.buildContext(
      message, 
      sessionId, 
      `req_${Date.now()}`,
      options
    );

    const routingResult = await this.routingEngine.route(context);
    const providerSelection = await this.selectProvider(routingResult.skill, context);

    // Stream from executor
    const stream = this.skillExecutor.executeStream({
      orchestration: context,
      skill: routingResult.skill,
      confidence: routingResult.confidence,
      tools: [],
      memory: {
        getRelevant: async () => [],
        store: async () => 'temp_id',
      },
    }, providerSelection);

    let fullContent = '';
    for await (const chunk of stream) {
      if (typeof chunk === 'string') {
        fullContent += chunk;
        this.emit({ type: 'orchestration:stream_chunk', chunk });
        yield chunk;
      }
    }

    // Yield final result
    yield {
      success: true,
      response: {
        content: fullContent,
        role: 'assistant',
        metadata: {
          skillId: routingResult.skill.id,
          providerId: providerSelection.providerId,
          model: providerSelection.model,
          tokenCount: { prompt: 0, completion: 0, total: 0 },
          latencyMs: 0,
        },
      },
      routing: routingResult,
      provider: providerSelection,
      metrics: {
        totalTimeMs: 0,
        routingTimeMs: 0,
        executionTimeMs: 0,
      },
    };
  }

  /**
   * Subscribe to orchestrator events
   */
  on(type: OrchestratorEvent['type'], listener: (event: OrchestratorEvent) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
    
    return () => {
      this.eventListeners.get(type)?.delete(listener);
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.routingEngine.updateConfig(this.config.routing);
    this.skillExecutor.updateConfig(this.config);
    this.contextBuilder.updateConfig(this.config.memory);
  }

  /**
   * Get current configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async buildContext(
    message: string,
    sessionId: SessionId,
    requestId: string,
    options: {
      userId?: string;
      projectId?: string;
      conversation?: Message[];
      artifacts?: any[];
    }
  ): Promise<OrchestrationContext> {
    // Detect intent from message
    const intent = await this.detectIntent(message);

    // Build memory state
    const memory = await this.contextBuilder.buildMemoryState(
      options.conversation || [],
      options.artifacts || []
    );

    return {
      sessionId,
      userId: options.userId as any,
      projectId: options.projectId as any,
      userMessage: message,
      intent,
      conversation: options.conversation || [],
      memory,
      artifacts: options.artifacts || [],
      metadata: {
        timestamp: new Date(),
        requestId,
        source: 'api',
      },
    };
  }

  private async detectIntent(message: string): Promise<Intent> {
    // Simple heuristic-based intent detection
    // TODO: Use embedding-based classification from @tooloo/skills router
    
    const lowercased = message.toLowerCase();
    
    const intentPatterns: Array<{ type: Intent['type']; patterns: RegExp[]; keywords: string[] }> = [
      // INTROSPECTION - highest priority for self-awareness questions
      {
        type: 'introspect' as Intent['type'],
        patterns: [
          /are you self[- ]?aware/i,
          /are you (sentient|conscious|alive)/i,
          /what are you/i,
          /who are you/i,
          /tell me about yourself/i,
          /about yourself/i,
          /what can you do/i,
          /your (architecture|code|design)/i,
          /do you (think|feel|have consciousness)/i,
          /you (self[- ]?aware|sentient|conscious)/i,
        ],
        keywords: ['self', 'aware', 'yourself', 'you', 'consciousness', 'sentient', 'identity', 'who'],
      },
      {
        type: 'code',
        patterns: [/write|create|implement|build|code|function|class|component/i],
        keywords: ['code', 'implement', 'function', 'class'],
      },
      {
        type: 'fix',
        patterns: [/fix|debug|error|bug|issue|broken|doesn't work/i],
        keywords: ['fix', 'debug', 'error', 'bug'],
      },
      {
        type: 'analyze',
        patterns: [/analyze|review|explain|why|how does|understand/i],
        keywords: ['analyze', 'review', 'explain'],
      },
      {
        type: 'refactor',
        patterns: [/refactor|improve|optimize|clean up|simplify/i],
        keywords: ['refactor', 'improve', 'optimize'],
      },
      {
        type: 'test',
        patterns: [/test|spec|coverage|unit test|integration test/i],
        keywords: ['test', 'spec', 'coverage'],
      },
      {
        type: 'plan',
        patterns: [/plan|architect|design system|roadmap|strategy/i],
        keywords: ['plan', 'architect', 'roadmap'],
      },
      {
        type: 'research',
        patterns: [/search|find|look up|documentation|docs/i],
        keywords: ['search', 'find', 'docs'],
      },
      // NEW INTENTS FOR SKILLS OS
      {
        type: 'learn' as Intent['type'],
        patterns: [
          /learning|learned|feedback|reward|q-learning/i,
          /how (fast|well) (are you|am i) learning/i,
          /learning (status|progress|velocity)/i,
        ],
        keywords: ['learn', 'learning', 'feedback', 'reward'],
      },
      {
        type: 'remember' as Intent['type'],
        patterns: [
          /remember|recall|memory|forget/i,
          /do you remember/i,
          /what do you (remember|know)/i,
        ],
        keywords: ['remember', 'recall', 'memory', 'forget'],
      },
      {
        type: 'experiment' as Intent['type'],
        patterns: [
          /experiment|a\/b test|benchmark|shadow test/i,
          /run (an? )?experiment/i,
          /compare|which is better/i,
        ],
        keywords: ['experiment', 'test', 'benchmark', 'compare'],
      },
      {
        type: 'emerge' as Intent['type'],
        patterns: [
          /synthesize|emergence|creative|predict/i,
          /generate (idea|goal)/i,
          /novel|breakthrough/i,
        ],
        keywords: ['emerge', 'synthesize', 'creative', 'predict'],
      },
      {
        type: 'observe' as Intent['type'],
        patterns: [
          /health|metrics|status|monitor/i,
          /how (is|are) (the|things) (system|running)/i,
          /observability|dashboard/i,
        ],
        keywords: ['health', 'metrics', 'status', 'monitor', 'dashboard'],
      },
      {
        type: 'meta' as Intent['type'],
        patterns: [
          /meta[- ]?cognition|thinking about thinking/i,
          /learning velocity|strategy effectiveness/i,
          /cognitive load|knowledge transfer/i,
        ],
        keywords: ['meta', 'cognition', 'velocity', 'strategy'],
      },
      {
        type: 'evolve' as Intent['type'],
        patterns: [
          /evolve|evolution|improve yourself/i,
          /skill (performance|metrics|evolution)/i,
          /self[- ]?improvement/i,
        ],
        keywords: ['evolve', 'evolution', 'improve', 'skill'],
      },
    ];

    let bestMatch: { type: Intent['type']; confidence: number; keywords: string[]; matchCount: number } = {
      type: 'chat',
      confidence: 0.5,
      keywords: [],
      matchCount: 0,
    };

    for (const pattern of intentPatterns) {
      const matchedPatterns = pattern.patterns.filter(p => p.test(lowercased));
      const matchCount = matchedPatterns.length;
      const keywordMatches = pattern.keywords.filter(k => lowercased.includes(k));
      
      // If ANY pattern matches, consider this a valid intent
      if (matchCount > 0) {
        // Calculate confidence based on pattern matches + keyword matches
        // Base: 0.7 for any pattern match, +0.1 for each additional pattern, +0.05 for each keyword
        const confidence = Math.min(
          0.7 + (matchCount - 1) * 0.1 + keywordMatches.length * 0.05,
          0.95
        );
        
        // Prefer this match if it has higher confidence OR same confidence but more matches
        if (confidence > bestMatch.confidence || 
            (confidence === bestMatch.confidence && matchCount > bestMatch.matchCount)) {
          bestMatch = {
            type: pattern.type,
            confidence,
            keywords: keywordMatches,
            matchCount,
          };
        }
      }
    }

    return {
      type: bestMatch.type,
      confidence: bestMatch.confidence,
      keywords: bestMatch.keywords,
    };
  }

  private async selectProvider(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): Promise<ProviderSelection> {
    // Check skill's preferred providers
    const preferredProviders = skill.modelRequirements?.preferredProviders || [];
    
    // Get available providers from registry
    const availableProviders = this.providerRegistry.getAvailable();
    // Normalize names to lowercase for comparison
    const availableProviderNamesLower = availableProviders.map(p => p.name.toLowerCase());
    
    console.log(`[Orchestrator] Available providers: ${availableProviderNamesLower.join(', ')}`);
    console.log(`[Orchestrator] Skill ${skill.name} prefers: ${preferredProviders.join(', ')}`);
    
    // Select based on skill requirements and availability
    let selectedProvider = this.config.defaultProvider;
    let selectedModel = this.config.defaultModel;
    let reason = 'Default provider selection';

    // Helper to check availability (case-insensitive)
    const isAvailable = (name: string) => availableProviderNamesLower.includes(name.toLowerCase());
    
    // Helper to get correct model for provider
    const getModelForProvider = (provider: string): string => {
      const defaults: Record<string, string> = {
        deepseek: 'deepseek-chat',
        anthropic: 'claude-sonnet-4-20250514',
        openai: 'gpt-4o',
        ollama: 'llama3.2',
      };
      return defaults[provider.toLowerCase()] || 'default';
    };

    // Check for skill-specific preferences (HIGHEST PRIORITY)
    if (preferredProviders.length > 0) {
      for (const preferred of preferredProviders) {
        if (isAvailable(preferred)) {
          selectedProvider = preferred;
          selectedModel = getModelForProvider(preferred);
          reason = `Skill ${skill.name} prefers ${preferred}`;
          break;
        }
      }
    }

    // Only use intent-based routing if NO skill preference was applied
    // Check for intent-based routing (only if provider is available and no skill preference set)
    // Priority: DeepSeek for cost-efficiency, Anthropic for quality, OpenAI as fallback
    if (reason === 'Default provider selection') {
      const intentProviderMap: Record<string, Array<{ provider: string; model: string }>> = {
      code: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
      fix: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
      analyze: [
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
      refactor: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
      test: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
      plan: [
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'deepseek', model: 'deepseek-chat' },
      ],
      research: [
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'deepseek', model: 'deepseek-chat' },
      ],
      creative: [
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
        { provider: 'deepseek', model: 'deepseek-chat' },
      ],
      chat: [
        { provider: 'deepseek', model: 'deepseek-chat' },
        { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        { provider: 'openai', model: 'gpt-4o' },
      ],
    };

      const intentOptions = intentProviderMap[context.intent.type];
      if (intentOptions) {
        for (const option of intentOptions) {
          if (isAvailable(option.provider)) {
            selectedProvider = option.provider;
            selectedModel = option.model;
            reason = `Intent ${context.intent.type} mapped to ${selectedProvider}`;
            break;
          }
        }
      }
    }  // End of "if no skill preference" block

    // Build fallbacks
    const fallbacks = availableProviderNamesLower
      .filter((p: string) => p !== selectedProvider.toLowerCase())
      .slice(0, 2)
      .map((p: string) => ({
        providerId: p as any,
        model: getModelForProvider(p),
      }));

    return {
      providerId: selectedProvider as any,
      model: selectedModel,
      reason,
      fallbacks,
      config: {
        temperature: skill.modelRequirements?.temperature,
        maxTokens: skill.context.maxTokens,
      },
    };
  }

  private getDefaultSkill(): SkillDefinition {
    // Return a minimal default skill for error cases
    return {
      id: 'default-chat' as any,
      name: 'Default Chat',
      version: '1.0.0',
      description: 'Default conversational skill',
      instructions: 'You are TooLoo, a helpful AI assistant created by TooLoo.ai. You are friendly, knowledgeable, and concise. Help users with their questions and tasks.',
      tools: [],
      triggers: {
        intents: ['chat'],
        keywords: [],
      },
      context: {
        maxTokens: 4096,
        ragSources: [],
        memoryScope: 'session',
      },
      composability: {
        requires: [],
        enhances: [],
        conflicts: [],
      },
    };
  }

  private isRecoverableError(error: Error): boolean {
    // Check if error is recoverable (e.g., rate limit, temporary failure)
    const recoverablePatterns = [
      /rate limit/i,
      /timeout/i,
      /temporary/i,
      /retry/i,
      /503/i,
      /429/i,
    ];
    return recoverablePatterns.some(p => p.test(error.message));
  }

  private emit(event: OrchestratorEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (err) {
          console.error(`Error in orchestrator event listener:`, err);
        }
      }
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new orchestrator instance
 */
export function createOrchestrator(
  skillRegistry: SkillRegistry,
  providerRegistry: ProviderRegistry,
  config?: Partial<OrchestratorConfig>
): Orchestrator {
  return new Orchestrator(skillRegistry, providerRegistry, config);
}
