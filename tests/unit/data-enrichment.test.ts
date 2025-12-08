// @version 3.3.353 - Data Enrichment Pipeline Unit Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock event bus
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

import { DataEnrichmentPipeline } from '../../src/precog/engine/data-enrichment.js';

describe('DataEnrichmentPipeline', () => {
  let pipeline: DataEnrichmentPipeline;

  beforeEach(async () => {
    vi.clearAllMocks();
    pipeline = new DataEnrichmentPipeline();
    await pipeline.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newPipeline = new DataEnrichmentPipeline();
      await newPipeline.initialize();
      expect(newPipeline).toBeDefined();
    });

    it('should have built-in knowledge sources', async () => {
      const sources = pipeline.listSources();
      expect(sources.length).toBeGreaterThan(0);
    });
  });

  describe('source management', () => {
    it('should register custom source', () => {
      pipeline.registerSource({
        id: 'custom-source',
        name: 'Custom Test Source',
        type: 'custom',
        priority: 5,
        enabled: true,
        fetch: async () => [{ content: 'test', relevance: 0.8 }],
      });

      const sources = pipeline.listSources();
      const customSource = sources.find((s) => s.id === 'custom-source');
      expect(customSource).toBeDefined();
    });

    it('should enable/disable sources', () => {
      const sources = pipeline.listSources();
      const sourceId = sources[0].id;

      pipeline.enableSource(sourceId, false);
      let updatedSources = pipeline.listSources();
      let source = updatedSources.find((s) => s.id === sourceId);
      expect(source?.enabled).toBe(false);

      pipeline.enableSource(sourceId, true);
      updatedSources = pipeline.listSources();
      source = updatedSources.find((s) => s.id === sourceId);
      expect(source?.enabled).toBe(true);
    });
  });

  describe('request enrichment', () => {
    it('should enrich request with context', async () => {
      const prompt = 'What is the capital of France?';
      const enriched = await pipeline.enrichRequest(prompt, {});

      expect(enriched).toBeDefined();
      expect(enriched.originalPrompt).toBe(prompt);
      expect(enriched.enrichedPrompt).toBeDefined();
    });

    it('should include metadata in enriched request', async () => {
      const enriched = await pipeline.enrichRequest('Test prompt', {});

      expect(enriched.metadata).toBeDefined();
      expect(enriched.metadata.timestamp).toBeDefined();
      expect(enriched.metadata.sourcesUsed).toBeDefined();
      expect(enriched.metadata.totalChunks).toBeDefined();
    });

    it('should use context from options', async () => {
      const enriched = await pipeline.enrichRequest('Test', {
        includeContext: ['conversation-history', 'system-state'],
      });

      expect(enriched.contextChunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxContextTokens', async () => {
      const enriched = await pipeline.enrichRequest('Test', {
        maxContextTokens: 100,
      });

      // Should not exceed token limit (rough check)
      const totalContent = enriched.contextChunks.map((c) => c.content).join('');
      expect(totalContent.length / 4).toBeLessThanOrEqual(200); // ~4 chars per token + buffer
    });

    it('should filter by minimum relevance', async () => {
      const enriched = await pipeline.enrichRequest('Test', {
        minRelevance: 0.9,
      });

      enriched.contextChunks.forEach((chunk) => {
        expect(chunk.relevance).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('response enrichment', () => {
    it('should enrich response with metadata', async () => {
      const response = 'Paris is the capital of France.';
      const enriched = await pipeline.enrichResponse(response, {
        prompt: 'What is the capital of France?',
      });

      expect(enriched).toBeDefined();
      expect(enriched.originalResponse).toBe(response);
      expect(enriched.metadata).toBeDefined();
    });

    it('should add related topics', async () => {
      const enriched = await pipeline.enrichResponse('Test response', {});

      expect(enriched.metadata.relatedTopics).toBeDefined();
      expect(Array.isArray(enriched.metadata.relatedTopics)).toBe(true);
    });

    it('should add confidence score', async () => {
      const enriched = await pipeline.enrichResponse('Test response', {});

      expect(enriched.metadata.confidence).toBeDefined();
      expect(enriched.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(enriched.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should suggest follow-up queries', async () => {
      const enriched = await pipeline.enrichResponse('Test response about coding', {
        prompt: 'How do I write tests?',
      });

      expect(enriched.metadata.suggestedFollowUps).toBeDefined();
      expect(Array.isArray(enriched.metadata.suggestedFollowUps)).toBe(true);
    });
  });

  describe('knowledge base', () => {
    it('should add to knowledge base', async () => {
      await pipeline.addToKnowledgeBase({
        content: 'Test knowledge entry',
        category: 'testing',
        tags: ['test', 'unit'],
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should search knowledge base', async () => {
      // Add some test data
      await pipeline.addToKnowledgeBase({
        content: 'TypeScript is a typed superset of JavaScript',
        category: 'programming',
        tags: ['typescript', 'javascript'],
      });

      const results = await pipeline.searchKnowledge('TypeScript', { limit: 5 });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by category', async () => {
      await pipeline.addToKnowledgeBase({
        content: 'Programming knowledge',
        category: 'programming',
        tags: [],
      });

      const results = await pipeline.searchKnowledge('programming', {
        category: 'programming',
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('context building', () => {
    it('should build context string from chunks', () => {
      const chunks = [
        { source: 'test', content: 'First chunk', relevance: 0.9, timestamp: Date.now() },
        { source: 'test', content: 'Second chunk', relevance: 0.8, timestamp: Date.now() },
      ];

      const context = (pipeline as any).buildContextString(chunks);
      expect(context).toContain('First chunk');
      expect(context).toContain('Second chunk');
    });

    it('should sort chunks by relevance', () => {
      const chunks = [
        { source: 'test', content: 'Low relevance', relevance: 0.3, timestamp: Date.now() },
        { source: 'test', content: 'High relevance', relevance: 0.9, timestamp: Date.now() },
        { source: 'test', content: 'Medium relevance', relevance: 0.6, timestamp: Date.now() },
      ];

      const sorted = (pipeline as any).sortByRelevance(chunks);
      expect(sorted[0].relevance).toBe(0.9);
      expect(sorted[1].relevance).toBe(0.6);
      expect(sorted[2].relevance).toBe(0.3);
    });
  });

  describe('metrics', () => {
    it('should track enrichment metrics', async () => {
      await pipeline.enrichRequest('Test 1', {});
      await pipeline.enrichRequest('Test 2', {});
      await pipeline.enrichResponse('Response 1', {});

      const metrics = pipeline.getMetrics();
      expect(metrics.requestsEnriched).toBeGreaterThanOrEqual(2);
      expect(metrics.responsesEnriched).toBeGreaterThanOrEqual(1);
    });

    it('should calculate average enrichment time', async () => {
      await pipeline.enrichRequest('Test', {});

      const metrics = pipeline.getMetrics();
      expect(metrics.avgEnrichmentTime).toBeGreaterThanOrEqual(0);
    });
  });
});
