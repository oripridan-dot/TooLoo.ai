// @version 3.3.577
/**
 * @tooloo/engine - Context Builder
 * Builds orchestration context with memory hydration
 * 
 * @version 2.0.0-alpha.0
 */

import type { Message, MemoryState, ArtifactId, Artifact } from '@tooloo/core';

// =============================================================================
// TYPES
// =============================================================================

interface MemoryConfig {
  maxShortTerm: number;
  maxContextTokens: number;
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Builds context for orchestration with memory hydration
 */
export class ContextBuilder {
  constructor(private config: MemoryConfig) {}

  /**
   * Build memory state from conversation and artifacts
   */
  async buildMemoryState(
    conversation: Message[],
    artifacts: Artifact[]
  ): Promise<MemoryState> {
    // Trim conversation to max short-term
    const shortTerm = conversation.slice(-this.config.maxShortTerm);

    // Get recent artifact IDs
    const recentArtifacts: ArtifactId[] = artifacts
      .slice(-10)
      .map(a => a.id);

    // Estimate tokens used
    const usedTokens = this.estimateTokens(shortTerm);

    return {
      shortTerm,
      workingMemory: new Map(),
      recentArtifacts,
      contextWindow: {
        usedTokens,
        maxTokens: this.config.maxContextTokens,
        priority: 'recency',
      },
    };
  }

  /**
   * Hydrate context with relevant memories
   * TODO: Integrate with @tooloo/memory vector store
   */
  async hydrateContext(
    _query: string,
    baseContext: MemoryState,
    _options?: {
      limit?: number;
      sources?: Array<'conversation' | 'artifact' | 'knowledge'>;
    }
  ): Promise<MemoryState> {
    // For now, return base context
    // This will be wired to @tooloo/memory's semantic search
    return baseContext;
  }

  /**
   * Compress context to fit within token limits
   */
  compressContext(
    context: MemoryState,
    targetTokens: number
  ): MemoryState {
    if (context.contextWindow.usedTokens <= targetTokens) {
      return context;
    }

    // Strategy: Remove older messages first
    const shortTerm = [...context.shortTerm];
    let usedTokens = context.contextWindow.usedTokens;

    while (usedTokens > targetTokens && shortTerm.length > 1) {
      const removed = shortTerm.shift();
      if (removed) {
        usedTokens -= this.estimateMessageTokens(removed);
      }
    }

    return {
      ...context,
      shortTerm,
      contextWindow: {
        ...context.contextWindow,
        usedTokens,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private estimateTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => total + this.estimateMessageTokens(msg), 0);
  }

  private estimateMessageTokens(message: Message): number {
    // Rough estimation: ~4 characters per token on average
    const contentTokens = Math.ceil(message.content.length / 4);
    const overhead = 4; // Role, message structure
    return contentTokens + overhead;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a context builder
 */
export function createContextBuilder(config?: Partial<MemoryConfig>): ContextBuilder {
  const defaultConfig: MemoryConfig = {
    maxShortTerm: 20,
    maxContextTokens: 128000,
  };

  return new ContextBuilder({ ...defaultConfig, ...config });
}
