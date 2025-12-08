// @version 3.3.351 - Ollama Provider Unit Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { OllamaProvider } from '../../src/precog/providers/ollama-provider.js';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaProvider('http://localhost:11434');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create provider with default URL', () => {
      const defaultProvider = new OllamaProvider();
      expect(defaultProvider).toBeDefined();
    });

    it('should create provider with custom URL', () => {
      const customProvider = new OllamaProvider('http://custom:1234');
      expect(customProvider).toBeDefined();
    });
  });

  describe('isOnline', () => {
    it('should return true when Ollama is reachable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const online = await provider.isOnline();
      expect(online).toBe(true);
    });

    it('should return false when Ollama is not reachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const online = await provider.isOnline();
      expect(online).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should return list of models', async () => {
      const mockModels = {
        models: [
          { name: 'llama2:latest', size: 1000000, modified_at: '2024-01-01' },
          { name: 'codellama:7b', size: 2000000, modified_at: '2024-01-02' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      });

      const models = await provider.listModels();
      expect(models).toHaveLength(2);
      expect(models[0].name).toBe('llama2:latest');
      expect(models[1].name).toBe('codellama:7b');
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });
  });

  describe('generate', () => {
    it('should generate text response', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'Hello! How can I help you?',
        done: true,
        context: [1, 2, 3],
        total_duration: 1000000000,
        load_duration: 100000000,
        prompt_eval_count: 10,
        prompt_eval_duration: 50000000,
        eval_count: 20,
        eval_duration: 200000000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.generate('Hello', { model: 'llama2' });
      expect(result.response).toBe('Hello! How can I help you?');
      expect(result.model).toBe('llama2');
      expect(result.done).toBe(true);
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(provider.generate('Hello', { model: 'llama2' })).rejects.toThrow(
        'Ollama API error: 500'
      );
    });
  });

  describe('chat', () => {
    it('should send chat messages', async () => {
      const mockResponse = {
        model: 'llama2',
        message: { role: 'assistant', content: 'I am doing well, thanks!' },
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.chat(
        [{ role: 'user', content: 'How are you?' }],
        { model: 'llama2' }
      );

      expect(result.message.content).toBe('I am doing well, thanks!');
      expect(result.message.role).toBe('assistant');
    });
  });

  describe('embed', () => {
    it('should generate embeddings', async () => {
      const mockResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const embeddings = await provider.embed('Test text', { model: 'llama2' });
      expect(embeddings).toHaveLength(5);
      expect(embeddings[0]).toBeCloseTo(0.1);
    });
  });

  describe('pullModel', () => {
    it('should pull a model', async () => {
      const mockResponse = {
        status: 'success',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.pullModel('llama2');
      expect(result).toBe(true);
    });

    it('should return false on pull failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Pull failed'));

      const result = await provider.pullModel('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('deleteModel', () => {
    it('should delete a model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await provider.deleteModel('llama2');
      expect(result).toBe(true);
    });

    it('should return false on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await provider.deleteModel('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('showModelInfo', () => {
    it('should return model info', async () => {
      const mockInfo = {
        modelfile: 'FROM llama2',
        parameters: 'temperature 0.7',
        template: '{{ .Prompt }}',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      });

      const info = await provider.showModelInfo('llama2');
      expect(info).toBeDefined();
      expect(info.modelfile).toBe('FROM llama2');
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Not found'));

      const info = await provider.showModelInfo('nonexistent');
      expect(info).toBeNull();
    });
  });
});
