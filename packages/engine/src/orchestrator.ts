// @version 3.3.573
// @version 3.3.573
/**
 * @tooloo/engine - Orchestrator
 * Main orchestration engine that ties everything together
 *
 * @version 2.0.0-alpha.0
 */

import type { SkillRegistry, SkillDefinition } from '@tooloo/skills';
import type { ProviderRegistry } from '@tooloo/providers';
import { 
  RoutingEngine, 
  createRoutingEngine, 
  DEFAULT_ROUTING_CONFIG 
} from './routing-engine.js';
import { 
  SkillExecutor, 
  createSkillExecutor, 
  DEFAULT_EXECUTOR_CONFIG 
} from './skill-executor.js';
import { ContextBuilder, createContextBuilder } from './context-builder.js';
import { ToolRegistry, toolRegistry as globalToolRegistry } from './tools/index.js';
import type {
  RoutingConfig,
  ExecutorConfig,
  ExecutionResult,
  ProviderSelection,
} from './types.js';

// =============================================================================
// ORCHESTRATOR CONFIG
// =============================================================================

export interface OrchestratorConfig {
  routing: Partial<RoutingConfig>;
  execution: Partial<ExecutorConfig>;
  defaultProvider: string;
  defaultModel: string;
  fallbackProviders?: Array<{ providerId: string; model: string }>;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  routing: DEFAULT_ROUTING_CONFIG,
  execution: DEFAULT_EXECUTOR_CONFIG,
  defaultProvider: 'ollama',
  defaultModel: 'qwen3:8b',
  fallbackProviders: [],
};

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * Main orchestrator that coordinates routing, execution, and context
 */
export class Orchestrator {
  private routingEngine: RoutingEngine;
  private executor: SkillExecutor;
  private contextBuilder: ContextBuilder;
  private toolRegistry: ToolRegistry;
  private config: OrchestratorConfig;
  
  constructor(
    skillRegistry: SkillRegistry,
    providerRegistry: ProviderRegistry,
    config?: Partial<OrchestratorConfig>,
    toolRegistry?: ToolRegistry
  ) {
    this.toolRegistry = toolRegistry ?? globalToolRegistry;
    
    this.config = {
      ...DEFAULT_ORCHESTRATOR_CONFIG,
      ...config,
      routing: { ...DEFAULT_ROUTING_CONFIG, ...config?.routing },
      execution: { ...DEFAULT_EXECUTOR_CONFIG, ...config?.execution },
    };
    
    // Initialize components
    this.routingEngine = createRoutingEngine(skillRegistry, this.config.routing);
    this.executor = createSkillExecutor(
      providerRegistry,
      this.config.execution,
      this.toolRegistry
    );
    this.contextBuilder = createContextBuilder();
  }
  
  /**
   * Process a user message end-to-end
   */
  async process(
    userMessage: string,
    sessionId?: string,
    projectId?: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Update context builder
    if (sessionId) {
      this.contextBuilder.setSession(sessionId);
    }
    if (projectId) {
      this.contextBuilder.setProject(projectId);
    }
    
    // Detect intent (simplified - can be enhanced with ML)
    const intent = this.detectIntent(userMessage);
    this.contextBuilder.setIntent(intent);
    
    // Build orchestration context
    const orchestration = this.contextBuilder.buildOrchestration(userMessage);
    
    // Route to best skill
    const routingResult = await this.routingEngine.route(orchestration);
    
    // Build execution context
    const executionContext = this.contextBuilder.build(userMessage, routingResult.skill);
    
    // Select provider
    const providerSelection = this.selectProvider(routingResult.skill);
    
    // Execute
    const result = await this.executor.execute(executionContext, providerSelection);
    
    // Add assistant response to conversation
    this.contextBuilder.addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });
    this.contextBuilder.addMessage({
      role: 'assistant',
      content: result.content,
      timestamp: new Date(),
    });
    
    // Add artifacts to context
    for (const artifact of result.artifacts) {
      this.contextBuilder.addArtifact(artifact);
    }
    
    // Log completion
    console.log(`[Orchestrator] Complete: ${routingResult.skill.id} (${Date.now() - startTime}ms)`);
    
    return result;
  }
  
  /**
   * Process with streaming response
   */
  async *processStream(
    userMessage: string,
    sessionId?: string,
    projectId?: string
  ): AsyncGenerator<string> {
    // Update context builder
    if (sessionId) {
      this.contextBuilder.setSession(sessionId);
    }
    if (projectId) {
      this.contextBuilder.setProject(projectId);
    }
    
    // Detect intent
    const intent = this.detectIntent(userMessage);
    this.contextBuilder.setIntent(intent);
    
    // Build orchestration context
    const orchestration = this.contextBuilder.buildOrchestration(userMessage);
    
    // Route to best skill
    const routingResult = await this.routingEngine.route(orchestration);
    
    // Build execution context
    const executionContext = this.contextBuilder.build(userMessage, routingResult.skill);
    
    // Select provider
    const providerSelection = this.selectProvider(routingResult.skill);
    
    // Stream execution
    const chunks: string[] = [];
    for await (const chunk of this.executor.executeStream(executionContext, providerSelection)) {
      chunks.push(chunk);
      yield chunk;
    }
    
    // Add messages to conversation
    const fullResponse = chunks.join('');
    this.contextBuilder.addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });
    this.contextBuilder.addMessage({
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
    });
  }
  
  /**
   * Get routing engine for configuration
   */
  getRoutingEngine(): RoutingEngine {
    return this.routingEngine;
  }
  
  /**
   * Get executor for configuration
   */
  getExecutor(): SkillExecutor {
    return this.executor;
  }
  
  /**
   * Get context builder for state management
   */
  getContextBuilder(): ContextBuilder {
    return this.contextBuilder;
  }
  
  /**
   * Get tool registry
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
  
  /**
   * Enable semantic routing
   */
  async enableSemanticRouting(
    embedFn: (text: string) => Promise<number[]>
  ): Promise<void> {
    await this.routingEngine.enableSemantic(embedFn);
  }
  
  /**
   * Reset session state
   */
  resetSession(): void {
    this.contextBuilder.reset();
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  /**
   * Simple intent detection based on keywords
   * Can be enhanced with ML-based classification
   */
  private detectIntent(message: string): { type: string; confidence: number } {
    const lower = message.toLowerCase();
    
    // Intent patterns with keywords
    const patterns: Array<{ type: string; keywords: string[]; weight: number }> = [
      { type: 'code', keywords: ['code', 'function', 'implement', 'write', 'create', 'build', 'develop'], weight: 0.9 },
      { type: 'refactor', keywords: ['refactor', 'improve', 'optimize', 'clean', 'restructure'], weight: 0.85 },
      { type: 'fix', keywords: ['debug', 'fix', 'error', 'bug', 'issue', 'problem'], weight: 0.85 },
      { type: 'analyze', keywords: ['analyze', 'review', 'explain', 'understand', 'what'], weight: 0.8 },
      { type: 'design', keywords: ['design', 'architect', 'plan', 'structure', 'diagram'], weight: 0.85 },
      { type: 'execute', keywords: ['deploy', 'release', 'ship', 'publish', 'launch'], weight: 0.9 },
      { type: 'test', keywords: ['test', 'spec', 'coverage', 'assert', 'verify'], weight: 0.85 },
      { type: 'document', keywords: ['document', 'docs', 'readme', 'comment', 'explain'], weight: 0.8 },
    ];
    
    let bestMatch = { type: 'chat', confidence: 0.5 };
    
    for (const pattern of patterns) {
      const matches = pattern.keywords.filter(kw => lower.includes(kw));
      if (matches.length > 0) {
        const confidence = (matches.length / pattern.keywords.length) * pattern.weight;
        if (confidence > bestMatch.confidence) {
          bestMatch = { type: pattern.type, confidence: Math.min(confidence, 1.0) };
        }
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Select provider based on skill requirements
   */
  private selectProvider(skill: SkillDefinition): ProviderSelection {
    // Get preferred providers from skill requirements
    const preferred = skill.modelRequirements?.preferredProviders ?? [];
    
    // For now, just use the default provider
    // TODO: Implement provider availability check
    const providerId = preferred[0] ?? this.config.defaultProvider;
    
    return {
      providerId,
      model: this.getModelForProvider(providerId),
      config: {
        temperature: skill.modelRequirements?.temperature ?? 0.7,
        maxTokens: skill.context.maxTokens,
      },
      fallbacks: this.config.fallbackProviders ?? [],
    };
  }
  
  /**
   * Get appropriate model for provider
   */
  private getModelForProvider(providerId: string): string {
    const modelMap: Record<string, string> = {
      ollama: 'qwen3:8b',
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4o',
      deepseek: 'deepseek-chat',
    };
    
    return modelMap[providerId] ?? this.config.defaultModel;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an orchestrator instance
 */
export function createOrchestrator(
  skillRegistry: SkillRegistry,
  providerRegistry: ProviderRegistry,
  config?: Partial<OrchestratorConfig>,
  toolRegistry?: ToolRegistry
): Orchestrator {
  return new Orchestrator(skillRegistry, providerRegistry, config, toolRegistry);
}
