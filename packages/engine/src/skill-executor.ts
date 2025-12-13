// @version 2.0.NaN
// @version 2.0.NaN
/**
 * @tooloo/engine - Skill Executor
 * Executes matched skills with the appropriate provider and tool support
 *
 * @version 2.0.0-alpha.0
 */

import { eventBus } from '@tooloo/core';
import type { ProviderRegistry, BaseProvider } from '@tooloo/providers';
import type { SkillDefinition } from '@tooloo/skills';
import type {
  ExecutionContext,
  ExecutionResult,
  ExecutorConfig,
  ProviderSelection,
  Message,
  Artifact,
  ToolCall,
  ToolCallResponse,
} from './types.js';
import { ToolRegistry, toolRegistry as globalToolRegistry } from './tools/index.js';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  maxRetries: 3,
  timeoutMs: 60000,
  streaming: true,
  enableTools: true,
};

// =============================================================================
// SKILL EXECUTOR
// =============================================================================

/**
 * Executes skills using the selected provider
 * Now with tool execution support!
 */
export class SkillExecutor {
  private providerRegistry: ProviderRegistry;
  private toolRegistry: ToolRegistry;
  private config: ExecutorConfig;
  
  constructor(
    providerRegistry: ProviderRegistry,
    config?: Partial<ExecutorConfig>,
    toolRegistry?: ToolRegistry
  ) {
    this.providerRegistry = providerRegistry;
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    this.toolRegistry = toolRegistry ?? globalToolRegistry;
  }
  
  /**
   * Execute a skill with the given context
   */
  async execute(
    context: ExecutionContext,
    providerSelection: ProviderSelection
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    // Get provider
    const provider = this.providerRegistry.get(providerSelection.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerSelection.providerId}`);
    }
    
    // Build messages for the provider
    const messages = this.buildMessages(context);
    
    // Get tool schemas if tools enabled
    const tools = this.config.enableTools && context.tools.length > 0
      ? this.getToolSchemas(context.tools.map(t => t.name))
      : undefined;
    
    // Track current provider and model for fallback logic
    let currentProvider = provider;
    let currentModel = providerSelection.model;
    
    // Execute with retries
    let lastError: Error | null = null;
    let attempts = 0;
    let allToolCalls: ToolCallResponse[] = [];
    
    while (attempts < this.config.maxRetries) {
      try {
        // Execute completion (potentially with tool calls)
        const { content, usage, toolCalls } = await this.executeWithTools(
          currentProvider,
          messages,
          currentModel,
          providerSelection,
          context,
          tools
        );
        
        if (toolCalls) {
          allToolCalls = [...allToolCalls, ...toolCalls];
        }
        
        const latencyMs = Date.now() - startTime;
        
        // Extract artifacts from response if any
        const artifacts = this.extractArtifacts(content, context);
        
        // Emit success event
        eventBus.publish('engine', 'execution:complete', {
          skillId: context.skill.id,
          providerId: providerSelection.providerId,
          model: currentModel,
          latencyMs,
          tokenCount: usage?.totalTokens ?? 0,
        });
        
        return {
          content,
          tokenCount: {
            prompt: usage?.promptTokens ?? 0,
            completion: usage?.completionTokens ?? 0,
            total: usage?.totalTokens ?? 0,
          },
          latencyMs,
          artifacts,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;
        
        // Try fallback provider
        if (
          attempts < this.config.maxRetries &&
          providerSelection.fallbacks.length >= attempts
        ) {
          const fallback = providerSelection.fallbacks[attempts - 1];
          if (fallback) {
            const fallbackProvider = this.providerRegistry.get(fallback.providerId);
            if (fallbackProvider && fallbackProvider.isAvailable()) {
              currentProvider = fallbackProvider;
              currentModel = fallback.model;
              continue;
            }
          }
        }
        
        // If no fallbacks available, wait before retry with same provider
        if (attempts < this.config.maxRetries) {
          await this.delay(1000 * attempts);
        }
      }
    }
    
    // Emit failure event
    eventBus.publish('engine', 'execution:failed', {
      skillId: context.skill.id,
      providerId: providerSelection.providerId,
      error: lastError?.message,
    });
    
    throw lastError || new Error('Execution failed after all retries');
  }
  
  /**
   * Execute with streaming response
   */
  async *executeStream(
    context: ExecutionContext,
    providerSelection: ProviderSelection
  ): AsyncGenerator<string> {
    const provider = this.providerRegistry.get(providerSelection.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerSelection.providerId}`);
    }
    
    const messages = this.buildMessages(context);
    
    // Check if provider supports streaming
    if ('stream' in provider && typeof provider.stream === 'function') {
      const stream = await (provider as BaseProvider & { stream: Function }).stream({
        messages,
        model: providerSelection.model,
        temperature: providerSelection.config.temperature ?? 0.7,
        maxTokens: providerSelection.config.maxTokens ?? context.skill.context.maxTokens,
      });
      
      for await (const chunk of stream as AsyncIterable<{ content?: string } | string>) {
        // Extract content from StreamChunk object
        if (chunk && typeof chunk === 'object' && 'content' in chunk && chunk.content) {
          yield chunk.content;
        } else if (typeof chunk === 'string') {
          yield chunk;
        }
      }
    } else {
      // Fall back to non-streaming
      const result = await this.execute(context, providerSelection);
      yield result.content;
    }
  }
  
  /**
   * Update executor configuration
   */
  updateConfig(config: Partial<ExecutorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Readonly<ExecutorConfig> {
    return { ...this.config };
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  /**
   * Execute with tool calling support
   */
  private async executeWithTools(
    provider: BaseProvider,
    messages: Message[],
    model: string,
    selection: ProviderSelection,
    context: ExecutionContext,
    tools?: Array<{ name: string; description: string; parameters: unknown }>
  ): Promise<{
    content: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    toolCalls?: ToolCallResponse[];
  }> {
    // Initial completion
    const response = await provider.complete({
      messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      model,
      temperature: selection.config.temperature ?? 0.7,
      maxTokens: selection.config.maxTokens ?? context.skill.context.maxTokens,
      tools,
    });
    
    // Check if response contains tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Execute tool calls
      const toolResults = await this.executeToolCalls(response.toolCalls);
      
      // Build tool result messages
      const toolMessages: Message[] = [
        ...messages,
        { role: 'assistant', content: response.content, toolCalls: response.toolCalls },
        ...toolResults.map(tr => ({
          role: 'tool' as const,
          content: tr.result.success ? tr.result.output : `Error: ${tr.result.error}`,
          toolCallId: tr.toolCallId,
        })),
      ];
      
      // Continue completion with tool results
      const finalResponse = await provider.complete({
        messages: toolMessages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        model,
        temperature: selection.config.temperature ?? 0.7,
        maxTokens: selection.config.maxTokens ?? context.skill.context.maxTokens,
      });
      
      return {
        content: finalResponse.content,
        usage: {
          promptTokens: (response.usage?.promptTokens ?? 0) + (finalResponse.usage?.promptTokens ?? 0),
          completionTokens: (response.usage?.completionTokens ?? 0) + (finalResponse.usage?.completionTokens ?? 0),
          totalTokens: (response.usage?.totalTokens ?? 0) + (finalResponse.usage?.totalTokens ?? 0),
        },
        toolCalls: toolResults,
      };
    }
    
    return {
      content: response.content,
      usage: response.usage,
    };
  }
  
  /**
   * Execute tool calls
   */
  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolCallResponse[]> {
    return this.toolRegistry.executeMany(toolCalls);
  }
  
  /**
   * Get tool schemas for specific tools
   */
  private getToolSchemas(
    toolNames: string[]
  ): Array<{ name: string; description: string; parameters: unknown }> {
    const allSchemas = this.toolRegistry.getSchemas();
    return allSchemas.filter(s => toolNames.includes(s.name));
  }
  
  private buildMessages(context: ExecutionContext): Message[] {
    const messages: Message[] = [];
    
    // System message from skill instructions
    const systemPrompt = this.buildSystemPrompt(context);
    messages.push({ role: 'system', content: systemPrompt });
    
    // Include conversation history if configured
    if (context.skill.context.includeHistory) {
      const maxHistory = context.skill.context.maxHistoryMessages ?? 10;
      const history = context.orchestration.conversation.slice(-maxHistory);
      
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }
    
    // Current user message
    messages.push({
      role: 'user',
      content: context.orchestration.userMessage,
    });
    
    return messages;
  }
  
  private buildSystemPrompt(context: ExecutionContext): string {
    const parts: string[] = [];
    
    // Base instructions
    parts.push(context.skill.instructions);
    
    // Add context about available tools
    if (context.tools.length > 0 && this.config.enableTools) {
      parts.push('\n\n## Available Tools');
      parts.push('You can use these tools to perform actions:');
      for (const tool of context.tools) {
        parts.push(`- **${tool.name}**: ${tool.description}`);
      }
      parts.push('\nTo use a tool, respond with a tool call in the appropriate format.');
    }
    
    // Add context about the current session
    parts.push('\n\n## Context');
    parts.push(`- Session: ${context.orchestration.sessionId}`);
    if (context.orchestration.projectId) {
      parts.push(`- Project: ${context.orchestration.projectId}`);
    }
    parts.push(
      `- Detected Intent: ${context.orchestration.intent.type} (${(context.orchestration.intent.confidence * 100).toFixed(0)}% confidence)`
    );
    
    // Add recent artifacts context if available
    if (context.orchestration.artifacts.length > 0) {
      const recentArtifacts = context.orchestration.artifacts.slice(-5);
      parts.push('\n\n## Recent Artifacts');
      for (const artifact of recentArtifacts) {
        parts.push(`- ${artifact.name} (${artifact.type})`);
      }
    }
    
    return parts.join('\n');
  }
  
  private extractArtifacts(content: string, _context: ExecutionContext): Artifact[] {
    const artifacts: Artifact[] = [];
    
    // Extract code blocks as artifacts
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2]?.trim() || '';
      
      if (code.length > 50) {
        // Only extract substantial code blocks
        artifacts.push({
          id: `artifact_${Date.now()}_${index++}`,
          type: 'code',
          name: `generated_${language}_${index}`,
          content: code,
          language,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            tags: [language],
          },
        });
      }
    }
    
    return artifacts;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a skill executor
 */
export function createSkillExecutor(
  providerRegistry: ProviderRegistry,
  config?: Partial<ExecutorConfig>,
  toolRegistry?: ToolRegistry
): SkillExecutor {
  return new SkillExecutor(providerRegistry, config, toolRegistry);
}
