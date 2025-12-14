// @version 3.3.577
/**
 * @tooloo/engine - Skill Executor
 * Executes matched skills with the appropriate provider
 * 
 * @version 2.0.0-alpha.0
 */

import type { ProviderRegistry } from '@tooloo/providers';
import type { Artifact } from '@tooloo/core';

import type {
  SkillExecutionContext,
  ProviderSelection,
  OrchestratorConfig,
  ToolResult,
} from './types.js';

// =============================================================================
// TYPES
// =============================================================================

interface ExecutionResult {
  content: string;
  tokenCount: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  artifacts?: Artifact[];
  toolCalls?: Array<{
    tool: string;
    params: Record<string, unknown>;
    result: ToolResult;
  }>;
}

// =============================================================================
// SKILL EXECUTOR
// =============================================================================

/**
 * Executes skills using the selected provider
 */
export class SkillExecutor {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private config: OrchestratorConfig
  ) {}

  /**
   * Execute a skill with the given context
   */
  async execute(
    context: SkillExecutionContext,
    providerSelection: ProviderSelection
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Get provider
    const provider = this.providerRegistry.get(providerSelection.providerId as string);
    if (!provider) {
      throw new Error(`Provider not found: ${providerSelection.providerId}`);
    }

    // Build messages for the provider
    const messages = this.buildMessages(context);

    // Track current provider and model for fallback logic
    let currentProvider = provider;
    let currentModel = providerSelection.model;

    // Execute with retries
    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.config.maxRetries) {
      try {
        const response = await currentProvider.complete({
          messages,
          model: currentModel,
          temperature: providerSelection.config.temperature ?? 0.7,
          maxTokens: providerSelection.config.maxTokens ?? context.skill.context.maxTokens,
        });

        const latencyMs = Date.now() - startTime;

        // Extract artifacts from response if any
        const artifacts = this.extractArtifacts(response.content, context);

        return {
          content: response.content,
          tokenCount: {
            prompt: response.usage?.promptTokens ?? 0,
            completion: response.usage?.completionTokens ?? 0,
            total: response.usage?.totalTokens ?? 0,
          },
          latencyMs,
          artifacts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        // Try fallback provider
        if (attempts < this.config.maxRetries && providerSelection.fallbacks.length >= attempts) {
          const fallback = providerSelection.fallbacks[attempts - 1];
          if (fallback) {
            const fallbackProvider = this.providerRegistry.get(fallback.providerId as string);
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

    throw lastError || new Error('Execution failed after all retries');
  }

  /**
   * Execute with streaming response
   */
  async *executeStream(
    context: SkillExecutionContext,
    providerSelection: ProviderSelection
  ): AsyncGenerator<string> {
    const provider = this.providerRegistry.get(providerSelection.providerId as string);
    if (!provider) {
      throw new Error(`Provider not found: ${providerSelection.providerId}`);
    }

    const messages = this.buildMessages(context);

    // Check if provider supports streaming
    if ('stream' in provider && typeof provider.stream === 'function') {
      const stream = await (provider as any).stream({
        messages,
        model: providerSelection.model,
        temperature: providerSelection.config.temperature ?? 0.7,
        maxTokens: providerSelection.config.maxTokens ?? context.skill.context.maxTokens,
      });

      for await (const chunk of stream) {
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
  updateConfig(config: OrchestratorConfig): void {
    this.config = config;
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private buildMessages(context: SkillExecutionContext): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

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

  private buildSystemPrompt(context: SkillExecutionContext): string {
    const parts: string[] = [];

    // Base instructions
    parts.push(context.skill.instructions);

    // Add context about available tools
    if (context.tools.length > 0) {
      parts.push('\n\n## Available Tools');
      for (const tool of context.tools) {
        parts.push(`- **${tool.name}**: ${tool.description}`);
      }
    }

    // Add context about the current session
    parts.push('\n\n## Context');
    parts.push(`- Session: ${context.orchestration.sessionId}`);
    if (context.orchestration.projectId) {
      parts.push(`- Project: ${context.orchestration.projectId}`);
    }
    parts.push(`- Detected Intent: ${context.orchestration.intent.type} (${(context.orchestration.intent.confidence * 100).toFixed(0)}% confidence)`);

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

  private extractArtifacts(content: string, _context: SkillExecutionContext): Artifact[] {
    const artifacts: Artifact[] = [];

    // Extract code blocks as artifacts
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2]?.trim() || '';

      if (code.length > 50) { // Only extract substantial code blocks
        artifacts.push({
          id: `artifact_${Date.now()}_${index++}` as any,
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
  config: OrchestratorConfig
): SkillExecutor {
  return new SkillExecutor(providerRegistry, config);
}
