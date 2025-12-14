// @version 3.3.577
/**
 * @tooloo/providers - Embedding Service Tests
 * Tests for OpenAI and Local embedding providers
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LocalEmbeddingProvider,
  OpenAIEmbeddingProvider,
  createEmbeddingFunction,
  createEmbeddingProvider,
} from '../../packages/providers/src/embeddings.js';

describe('LocalEmbeddingProvider', () => {
  let provider: LocalEmbeddingProvider;

  beforeEach(() => {
    provider = new LocalEmbeddingProvider(384);
  });

  describe('embed', () => {
    it('should return a normalized vector', async () => {
      const embedding = await provider.embed('Write a function to sort an array');
      
      expect(embedding).toBeInstanceOf(Array);
      expect(embedding.length).toBe(384);
      
      // Check vector is normalized (magnitude should be ~1)
      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 2);
    });

    it('should produce similar embeddings for similar texts', async () => {
      const embedding1 = await provider.embed('Write a JavaScript function to sort an array');
      const embedding2 = await provider.embed('Create a JS function for array sorting');
      const embedding3 = await provider.embed('Deploy a Docker container to production');

      // Cosine similarity helper
      const cosineSim = (a: number[], b: number[]) => {
        return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
      };

      const simSimilar = cosineSim(embedding1, embedding2);
      const simDifferent = cosineSim(embedding1, embedding3);

      // Similar texts should have higher similarity
      expect(simSimilar).toBeGreaterThan(simDifferent);
    });

    it('should return consistent embeddings for the same text', async () => {
      const text = 'Refactor this TypeScript code';
      const embedding1 = await provider.embed(text);
      const embedding2 = await provider.embed(text);

      expect(embedding1).toEqual(embedding2);
    });
  });

  describe('embedBatch', () => {
    it('should embed multiple texts', async () => {
      const texts = [
        'Write a function',
        'Debug this code',
        'Explain the architecture',
      ];

      const embeddings = await provider.embedBatch(texts);

      expect(embeddings.length).toBe(3);
      embeddings.forEach(emb => {
        expect(emb.length).toBe(384);
      });
    });

    it('should maintain order', async () => {
      const texts = ['apple', 'banana', 'cherry'];
      const embeddings = await provider.embedBatch(texts);
      const singleEmbeddings = await Promise.all(texts.map(t => provider.embed(t)));

      expect(embeddings).toEqual(singleEmbeddings);
    });
  });

  describe('getDimensions', () => {
    it('should return configured dimensions', () => {
      expect(provider.getDimensions()).toBe(384);
      
      const largeProvider = new LocalEmbeddingProvider(768);
      expect(largeProvider.getDimensions()).toBe(768);
    });
  });
});

describe('OpenAIEmbeddingProvider', () => {
  let provider: OpenAIEmbeddingProvider;

  beforeEach(() => {
    provider = new OpenAIEmbeddingProvider({
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      dimensions: 1536,
    });
  });

  describe('configuration', () => {
    it('should use default model if not specified', () => {
      const defaultProvider = new OpenAIEmbeddingProvider({
        apiKey: 'test-key',
      });
      expect(defaultProvider.getDimensions()).toBe(1536);
    });

    it('should use custom dimensions if specified', () => {
      const customProvider = new OpenAIEmbeddingProvider({
        apiKey: 'test-key',
        dimensions: 512,
      });
      expect(customProvider.getDimensions()).toBe(512);
    });
  });

  describe('embed (mocked)', () => {
    it('should call OpenAI API correctly', async () => {
      const mockResponse = {
        data: [{ index: 0, embedding: new Array(1536).fill(0.1) }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const embedding = await provider.embed('test text');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(embedding.length).toBe(1536);
    });

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(provider.embed('test')).rejects.toThrow('OpenAI Embedding API error');
    });
  });
});

describe('createEmbeddingFunction', () => {
  it('should create local provider when no API key', () => {
    const embedFn = createEmbeddingFunction({
      provider: 'openai',
      // No API key
    });

    expect(embedFn).toBeInstanceOf(Function);
  });

  it('should create local provider explicitly', () => {
    const embedFn = createEmbeddingFunction({
      provider: 'local',
      dimensions: 256,
    });

    expect(embedFn).toBeInstanceOf(Function);
  });

  it('should return working embed function', async () => {
    const embedFn = createEmbeddingFunction({
      provider: 'local',
      dimensions: 128,
    });

    const embedding = await embedFn('test query');
    expect(embedding.length).toBe(128);
  });
});

describe('createEmbeddingProvider', () => {
  it('should return LocalEmbeddingProvider for local config', () => {
    const provider = createEmbeddingProvider({
      provider: 'local',
      dimensions: 384,
    });

    expect(provider.name).toBe('local');
    expect(provider.getDimensions()).toBe(384);
  });

  it('should fallback to local when OpenAI key missing', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const provider = createEmbeddingProvider({
      provider: 'openai',
      // No API key
    });

    expect(provider.name).toBe('local');
    expect(consoleWarn).toHaveBeenCalled();
    
    consoleWarn.mockRestore();
  });
});
