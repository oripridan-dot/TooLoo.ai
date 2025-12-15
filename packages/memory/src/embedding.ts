// @version 1.0.0
/**
 * Embedding Utilities
 * 
 * Vector operations for semantic similarity.
 * Includes local embedder fallback when no API is available.
 * 
 * @version 1.0.0
 * @skill-os true
 */

import type { Embedding, EmbeddingProvider } from './types.js';

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[] | readonly number[], b: number[] | readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[] | readonly number[], b: number[] | readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions must match: ${a.length} vs ${b.length}`);
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  if (norm === 0) return v;
  return v.map(x => x / norm);
}

/**
 * Average multiple vectors
 */
export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  
  const dim = vectors[0]!.length;
  const result = new Array(dim).fill(0);
  
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += v[i]!;
    }
  }
  
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }
  
  return result;
}

// ============================================================================
// Local Embedder (Fallback)
// ============================================================================

/**
 * Simple local embedder using TF-IDF-like approach
 * For use when no API embeddings are available
 */
export class LocalEmbedder implements EmbeddingProvider {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private dimensions: number;
  private documentCount = 0;
  
  constructor(dimensions = 256) {
    this.dimensions = dimensions;
    this.initializeVocabulary();
  }
  
  /**
   * Initialize with common English words
   */
  private initializeVocabulary(): void {
    const commonWords = [
      'code', 'function', 'variable', 'class', 'method', 'return', 'import',
      'export', 'async', 'await', 'promise', 'error', 'try', 'catch', 'throw',
      'type', 'interface', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'array', 'object', 'string', 'number', 'boolean', 'null', 'undefined',
      'file', 'read', 'write', 'create', 'delete', 'update', 'get', 'set',
      'api', 'request', 'response', 'server', 'client', 'database', 'query',
      'test', 'debug', 'log', 'print', 'output', 'input', 'parameter',
      'user', 'system', 'memory', 'cache', 'store', 'load', 'save',
      'skill', 'kernel', 'router', 'execute', 'process', 'handle',
      'typescript', 'javascript', 'python', 'node', 'react', 'vue',
      'component', 'render', 'state', 'props', 'hook', 'effect',
      'help', 'what', 'how', 'why', 'when', 'where', 'which',
      'build', 'run', 'start', 'stop', 'deploy', 'install', 'config',
    ];
    
    for (let i = 0; i < commonWords.length && i < this.dimensions; i++) {
      this.vocabulary.set(commonWords[i]!, i);
      this.idf.set(commonWords[i]!, 1.0); // Default IDF
    }
  }
  
  async embed(text: string): Promise<Embedding> {
    const tokens = this.tokenize(text);
    const vector = new Array(this.dimensions).fill(0);
    
    // Term frequency
    const tf: Map<string, number> = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    
    // Build vector
    for (const [token, freq] of tf) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined && idx < this.dimensions) {
        const idfValue = this.idf.get(token) ?? 1.0;
        vector[idx] = (freq / tokens.length) * idfValue;
      } else {
        // Hash unknown words to a dimension
        const hash = this.simpleHash(token) % this.dimensions;
        vector[hash] += freq / tokens.length;
      }
    }
    
    // Normalize
    const normalized = normalizeVector(vector);
    
    return {
      vector: normalized,
      model: 'local-tfidf',
      dimensions: this.dimensions,
    };
  }
  
  async embedBatch(texts: string[]): Promise<Embedding[]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }
  
  getDimensions(): number {
    return this.dimensions;
  }
  
  getModel(): string {
    return 'local-tfidf';
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Update IDF values from document corpus
   */
  updateIDF(documents: string[]): void {
    this.documentCount += documents.length;
    const docFreq: Map<string, number> = new Map();
    
    for (const doc of documents) {
      const tokens = new Set(this.tokenize(doc));
      for (const token of tokens) {
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }
    
    for (const [token, freq] of docFreq) {
      const idfValue = Math.log(this.documentCount / (freq + 1)) + 1;
      this.idf.set(token, idfValue);
      
      // Add to vocabulary if new
      if (!this.vocabulary.has(token) && this.vocabulary.size < this.dimensions) {
        this.vocabulary.set(token, this.vocabulary.size);
      }
    }
  }
}

// ============================================================================
// API Embedders
// ============================================================================

/**
 * OpenAI embedding provider
 */
export class OpenAIEmbedder implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private dimensions: number;
  
  constructor(options: { apiKey: string; model?: string; dimensions?: number }) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'text-embedding-3-small';
    this.dimensions = options.dimensions ?? 1536;
  }
  
  async embed(text: string): Promise<Embedding> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        dimensions: this.dimensions,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    
    return {
      vector: data.data[0]!.embedding,
      model: this.model,
      dimensions: this.dimensions,
    };
  }
  
  async embedBatch(texts: string[]): Promise<Embedding[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        dimensions: this.dimensions,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    
    return data.data.map(d => ({
      vector: d.embedding,
      model: this.model,
      dimensions: this.dimensions,
    }));
  }
  
  getDimensions(): number {
    return this.dimensions;
  }
  
  getModel(): string {
    return this.model;
  }
}

// ============================================================================
// Embedder Factory
// ============================================================================

export interface EmbedderConfig {
  provider?: 'openai' | 'local';
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

/**
 * Create an embedding provider based on configuration
 */
export function createEmbedder(config: EmbedderConfig = {}): EmbeddingProvider {
  const provider = config.provider ?? 'local';
  
  switch (provider) {
    case 'openai':
      if (!config.apiKey) {
        console.warn('[Embedder] No OpenAI API key provided, falling back to local embedder');
        return new LocalEmbedder(config.dimensions ?? 256);
      }
      return new OpenAIEmbedder({
        apiKey: config.apiKey,
        model: config.model,
        dimensions: config.dimensions,
      });
    
    case 'local':
    default:
      return new LocalEmbedder(config.dimensions ?? 256);
  }
}
