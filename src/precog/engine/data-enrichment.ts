// @version 3.3.351
/**
 * Data Enrichment Pipeline
 *
 * V3.3.351: Added public initialize() method for main.ts bootstrap
 *
 * Enhances AI requests and responses with:
 * - Context augmentation from knowledge base
 * - Response enrichment with citations and sources
 * - Multi-source data aggregation
 * - Structured output enhancement
 * - Metadata injection
 *
 * Part of PHASE 3: Data Enrichment
 * @module precog/engine/data-enrichment
 */

import { bus } from '../../core/event-bus.js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface EnrichmentSource {
  id: string;
  name: string;
  type: 'knowledge-base' | 'api' | 'file' | 'memory' | 'web';
  priority: number;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface EnrichmentContext {
  query: string;
  domain?: string;
  taskType?: string;
  sessionId?: string;
  userId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  existingContext?: string;
}

export interface EnrichedRequest {
  originalQuery: string;
  enrichedQuery: string;
  contextChunks: ContextChunk[];
  metadata: EnrichmentMetadata;
  systemPromptAdditions: string[];
}

export interface ContextChunk {
  sourceId: string;
  sourceName: string;
  content: string;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export interface EnrichmentMetadata {
  enrichmentTime: number;
  sourcesUsed: string[];
  chunksAdded: number;
  tokenEstimate: number;
  cacheHit: boolean;
}

export interface EnrichedResponse {
  content: string;
  citations: Citation[];
  relatedTopics: string[];
  suggestedFollowups: string[];
  confidenceScore: number;
  metadata: ResponseMetadata;
}

export interface Citation {
  id: string;
  source: string;
  content: string;
  url?: string;
  timestamp?: string;
}

export interface ResponseMetadata {
  processingTime: number;
  citationsAdded: number;
  enrichmentLevel: 'none' | 'light' | 'medium' | 'heavy';
}

// ============================================================================
// KNOWLEDGE BASE INTERFACE
// ============================================================================

interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  domain: string;
  lastUpdated: string;
  embeddings?: number[];
}

// ============================================================================
// DATA ENRICHMENT PIPELINE CLASS
// ============================================================================

export class DataEnrichmentPipeline {
  private sources: Map<string, EnrichmentSource> = new Map();
  private contextCache: Map<string, { data: ContextChunk[]; timestamp: number }> = new Map();
  private knowledgeBase: KnowledgeEntry[] = [];
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data');
    this.initializeDefaultSources();
    this.loadKnowledgeBase();
  }

  /**
   * Public initialization method for async setup
   * Called by main.ts during bootstrap
   */
  async initialize(): Promise<void> {
    // Re-load knowledge base (in case data changed)
    await this.loadKnowledgeBase();
    console.log(`[DataEnrichment] ✓ Loaded ${this.knowledgeBase.length} knowledge entries`);
  }

  private initializeDefaultSources() {
    // Built-in sources
    this.registerSource({
      id: 'knowledge-base',
      name: 'TooLoo Knowledge Base',
      type: 'knowledge-base',
      priority: 1,
      enabled: true,
    });

    this.registerSource({
      id: 'conversation-memory',
      name: 'Conversation Memory',
      type: 'memory',
      priority: 2,
      enabled: true,
    });

    this.registerSource({
      id: 'project-context',
      name: 'Project Context',
      type: 'file',
      priority: 3,
      enabled: true,
    });

    this.registerSource({
      id: 'learning-patterns',
      name: 'Learning Patterns',
      type: 'memory',
      priority: 4,
      enabled: true,
    });
  }

  private loadKnowledgeBase() {
    try {
      const kbPath = path.join(this.dataDir, 'knowledge', 'sources.json');
      if (fs.existsSync(kbPath)) {
        const data = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
        this.knowledgeBase = Array.isArray(data.entries) ? data.entries : [];
        console.log(`[DataEnrichment] ✓ Loaded ${this.knowledgeBase.length} knowledge entries`);
      }
    } catch (error) {
      console.warn('[DataEnrichment] Could not load knowledge base');
      this.knowledgeBase = [];
    }
  }

  // ===========================================================================
  // Source Management
  // ===========================================================================

  registerSource(source: EnrichmentSource) {
    this.sources.set(source.id, source);
    console.log(`[DataEnrichment] Registered source: ${source.name}`);
  }

  unregisterSource(sourceId: string) {
    this.sources.delete(sourceId);
  }

  getActiveSources(): EnrichmentSource[] {
    return Array.from(this.sources.values())
      .filter((s) => s.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  // ===========================================================================
  // Request Enrichment
  // ===========================================================================

  async enrichRequest(context: EnrichmentContext): Promise<EnrichedRequest> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    const cached = this.contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return this.buildEnrichedRequest(context, cached.data, true, startTime);
    }

    // Gather context from all enabled sources
    const contextChunks: ContextChunk[] = [];
    const activeSources = this.getActiveSources();

    for (const source of activeSources) {
      try {
        const chunks = await this.gatherFromSource(source, context);
        contextChunks.push(...chunks);
      } catch (error) {
        console.warn(`[DataEnrichment] Source ${source.name} failed:`, error);
      }
    }

    // Sort by relevance and limit
    const sortedChunks = contextChunks
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10); // Limit to top 10 chunks

    // Cache result
    this.contextCache.set(cacheKey, {
      data: sortedChunks,
      timestamp: Date.now(),
    });

    const result = this.buildEnrichedRequest(context, sortedChunks, false, startTime);

    bus.publish('precog', 'enrichment:request', {
      query: context.query.substring(0, 100),
      chunksAdded: sortedChunks.length,
      sources: sortedChunks.map((c) => c.sourceId),
    });

    return result;
  }

  private async gatherFromSource(
    source: EnrichmentSource,
    context: EnrichmentContext
  ): Promise<ContextChunk[]> {
    switch (source.type) {
      case 'knowledge-base':
        return this.searchKnowledgeBase(source, context);
      case 'memory':
        return this.searchMemory(source, context);
      case 'file':
        return this.searchFiles(source, context);
      default:
        return [];
    }
  }

  private searchKnowledgeBase(
    source: EnrichmentSource,
    context: EnrichmentContext
  ): ContextChunk[] {
    const queryLower = context.query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    return this.knowledgeBase
      .map((entry) => {
        // Simple relevance scoring based on keyword matching
        const contentLower = entry.content.toLowerCase();
        const titleLower = entry.title.toLowerCase();

        let score = 0;
        for (const word of queryWords) {
          if (titleLower.includes(word)) score += 2;
          if (contentLower.includes(word)) score += 1;
          if (entry.tags.some((t) => t.toLowerCase().includes(word))) score += 1.5;
        }

        // Domain boost
        if (context.domain && entry.domain === context.domain) {
          score *= 1.5;
        }

        return {
          sourceId: source.id,
          sourceName: source.name,
          content: entry.content,
          relevanceScore: score / queryWords.length,
          metadata: { id: entry.id, title: entry.title },
        };
      })
      .filter((chunk) => chunk.relevanceScore > 0.3);
  }

  private searchMemory(source: EnrichmentSource, context: EnrichmentContext): ContextChunk[] {
    // Include conversation history as context
    const chunks: ContextChunk[] = [];

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      // Include recent conversation for context
      const recentHistory = context.conversationHistory.slice(-5);
      const historyText = recentHistory.map((m) => `${m.role}: ${m.content}`).join('\n');

      chunks.push({
        sourceId: source.id,
        sourceName: source.name,
        content: `Recent conversation context:\n${historyText}`,
        relevanceScore: 0.7,
        metadata: { type: 'conversation_history', messageCount: recentHistory.length },
      });
    }

    return chunks;
  }

  private searchFiles(source: EnrichmentSource, context: EnrichmentContext): ContextChunk[] {
    // Search project-related files for context
    const chunks: ContextChunk[] = [];

    try {
      // Load patterns.json for learned patterns
      const patternsPath = path.join(this.dataDir, 'patterns.json');
      if (fs.existsSync(patternsPath)) {
        const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
        const relevantPatterns = patterns.slice(0, 3); // Top patterns

        if (relevantPatterns.length > 0) {
          chunks.push({
            sourceId: source.id,
            sourceName: source.name,
            content: `Learned patterns:\n${JSON.stringify(relevantPatterns, null, 2)}`,
            relevanceScore: 0.5,
            metadata: { type: 'patterns', count: relevantPatterns.length },
          });
        }
      }
    } catch {
      /* ignore */
    }

    return chunks;
  }

  private buildEnrichedRequest(
    context: EnrichmentContext,
    chunks: ContextChunk[],
    cacheHit: boolean,
    startTime: number
  ): EnrichedRequest {
    // Build enriched query with context
    const enrichedQuery = context.query;
    const systemPromptAdditions: string[] = [];

    if (chunks.length > 0) {
      const contextText = chunks.map((c) => `[${c.sourceName}]: ${c.content}`).join('\n\n');

      systemPromptAdditions.push(`\n\n📚 RELEVANT CONTEXT:\n${contextText}\n`);
    }

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const totalChars = chunks.reduce((sum, c) => sum + c.content.length, 0);
    const tokenEstimate = Math.ceil(totalChars / 4);

    return {
      originalQuery: context.query,
      enrichedQuery,
      contextChunks: chunks,
      metadata: {
        enrichmentTime: Date.now() - startTime,
        sourcesUsed: Array.from(new Set(chunks.map((c) => c.sourceId))),
        chunksAdded: chunks.length,
        tokenEstimate,
        cacheHit,
      },
      systemPromptAdditions,
    };
  }

  private generateCacheKey(context: EnrichmentContext): string {
    return `${context.query.substring(0, 100)}_${context.domain || ''}_${context.taskType || ''}`;
  }

  // ===========================================================================
  // Response Enrichment
  // ===========================================================================

  async enrichResponse(
    response: string,
    context: EnrichmentContext,
    requestEnrichment?: EnrichedRequest
  ): Promise<EnrichedResponse> {
    const startTime = Date.now();
    const citations: Citation[] = [];
    const relatedTopics: string[] = [];
    const suggestedFollowups: string[] = [];

    // Extract potential citations from context chunks
    if (requestEnrichment?.contextChunks) {
      for (const chunk of requestEnrichment.contextChunks) {
        if (chunk.relevanceScore > 0.5 && chunk.metadata?.['title']) {
          citations.push({
            id: `cite-${citations.length + 1}`,
            source: chunk.sourceName,
            content: String(chunk.metadata['title']),
          });
        }
      }
    }

    // Generate related topics based on response content
    const topics = this.extractTopics(response);
    relatedTopics.push(...topics.slice(0, 5));

    // Generate follow-up suggestions
    const followups = this.generateFollowups(context.query, response, context.domain);
    suggestedFollowups.push(...followups.slice(0, 3));

    // Calculate confidence based on source coverage
    const sourceCoverage = requestEnrichment?.metadata.sourcesUsed.length || 0;
    const confidenceScore = Math.min(0.5 + sourceCoverage * 0.1, 0.95);

    const enrichmentLevel: ResponseMetadata['enrichmentLevel'] =
      citations.length === 0
        ? 'none'
        : citations.length < 3
          ? 'light'
          : citations.length < 6
            ? 'medium'
            : 'heavy';

    bus.publish('precog', 'enrichment:response', {
      citationsAdded: citations.length,
      topicsFound: relatedTopics.length,
      confidenceScore,
    });

    return {
      content: response,
      citations,
      relatedTopics,
      suggestedFollowups,
      confidenceScore,
      metadata: {
        processingTime: Date.now() - startTime,
        citationsAdded: citations.length,
        enrichmentLevel,
      },
    };
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction based on capitalized phrases and technical terms
    const topics = new Set<string>();

    // Extract capitalized words (potential proper nouns/topics)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    capitalizedWords.forEach((w) => {
      if (w.length > 3) topics.add(w);
    });

    // Extract technical terms (words with underscores, camelCase, etc.)
    const technicalTerms = text.match(/\b[a-z]+(?:[A-Z][a-z]+)+\b|\b[a-z]+_[a-z]+\b/g) || [];
    technicalTerms.forEach((t) => topics.add(t));

    return Array.from(topics).slice(0, 10);
  }

  private generateFollowups(query: string, response: string, domain?: string): string[] {
    const followups: string[] = [];

    // Domain-specific followups
    if (domain === 'engineering') {
      if (response.includes('function') || response.includes('class')) {
        followups.push('Can you add unit tests for this code?');
        followups.push('How can I optimize the performance?');
      }
      if (response.includes('error') || response.includes('exception')) {
        followups.push('What are common causes of this error?');
      }
    } else if (domain === 'design') {
      followups.push('Can you suggest alternative design patterns?');
      followups.push('How can I improve accessibility?');
    }

    // Generic followups
    if (response.length > 500) {
      followups.push('Can you summarize the key points?');
    }
    if (response.includes('however') || response.includes('alternatively')) {
      followups.push('What are the trade-offs between these approaches?');
    }

    return followups;
  }

  // ===========================================================================
  // Knowledge Base Management
  // ===========================================================================

  async addKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'lastUpdated'>): Promise<string> {
    const id = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEntry: KnowledgeEntry = {
      ...entry,
      id,
      lastUpdated: new Date().toISOString(),
    };

    this.knowledgeBase.push(newEntry);
    await this.saveKnowledgeBase();

    return id;
  }

  async updateKnowledgeEntry(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean> {
    const index = this.knowledgeBase.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.knowledgeBase[index] = {
      ...this.knowledgeBase[index]!,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await this.saveKnowledgeBase();
    return true;
  }

  async deleteKnowledgeEntry(id: string): Promise<boolean> {
    const index = this.knowledgeBase.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this.knowledgeBase.splice(index, 1);
    await this.saveKnowledgeBase();
    return true;
  }

  private async saveKnowledgeBase() {
    try {
      const kbDir = path.join(this.dataDir, 'knowledge');
      if (!fs.existsSync(kbDir)) {
        fs.mkdirSync(kbDir, { recursive: true });
      }

      const kbPath = path.join(kbDir, 'sources.json');
      fs.writeFileSync(kbPath, JSON.stringify({ entries: this.knowledgeBase }, null, 2));
    } catch (error) {
      console.error('[DataEnrichment] Failed to save knowledge base:', error);
    }
  }

  // ===========================================================================
  // Stats & Diagnostics
  // ===========================================================================

  getStats() {
    return {
      sources: Array.from(this.sources.values()).map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        enabled: s.enabled,
      })),
      knowledgeEntries: this.knowledgeBase.length,
      cacheSize: this.contextCache.size,
      cacheTimeout: this.cacheTimeout,
    };
  }

  clearCache() {
    this.contextCache.clear();
    console.log('[DataEnrichment] Cache cleared');
  }
}

// Export singleton instance
export const dataEnrichment = new DataEnrichmentPipeline();
