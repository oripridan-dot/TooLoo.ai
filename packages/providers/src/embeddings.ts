/**
 * @tooloo/providers - Embedding Service
 * Real vector embeddings for semantic routing
 * 
 * @version 2.0.0-alpha.0
 */

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingConfig {
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

// ============================================================================
// OpenAI Embedding Provider
// ============================================================================

interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  private config: OpenAIEmbeddingConfig;
  private dimensions: number;

  constructor(config: OpenAIEmbeddingConfig) {
    this.config = {
      model: config.model ?? 'text-embedding-3-small',
      dimensions: config.dimensions ?? 1536,
      batchSize: config.batchSize ?? 100,
      ...config,
    };
    this.dimensions = this.config.dimensions ?? 1536;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    const embedding = result[0];
    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.baseUrl ?? 'https://api.openai.com/v1';
    
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as OpenAIEmbeddingResponse;
    
    // Sort by index to maintain order
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    return sorted.map(d => d.embedding);
  }
}

// ============================================================================
// Local/Fallback Embedding Provider (TF-IDF based)
// ============================================================================

/**
 * A simple local embedding provider using TF-IDF vectors
 * Use this when no API key is available or for testing
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local';
  private dimensions: number;
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  // Document count could be used for dynamic IDF calculation in future
  // private documentCount = 0;

  constructor(dimensions = 384) {
    this.dimensions = dimensions;
    // Initialize with common words for basic vocabulary
    this.initializeVocabulary();
  }

  getDimensions(): number {
    return this.dimensions;
  }

  private initializeVocabulary(): void {
    // Common programming and AI terms for TooLoo context
    const commonTerms = [
      // Programming
      'code', 'function', 'class', 'method', 'variable', 'const', 'let', 'var',
      'async', 'await', 'promise', 'callback', 'return', 'export', 'import',
      'module', 'package', 'library', 'framework', 'typescript', 'javascript',
      'python', 'react', 'node', 'api', 'rest', 'graphql', 'database', 'sql',
      
      // Actions
      'create', 'build', 'make', 'generate', 'write', 'implement', 'develop',
      'fix', 'debug', 'repair', 'solve', 'resolve', 'patch',
      'refactor', 'optimize', 'improve', 'enhance', 'clean',
      'test', 'verify', 'validate', 'check', 'review', 'analyze',
      'explain', 'describe', 'document', 'help', 'assist',
      'search', 'find', 'query', 'lookup', 'research',
      'design', 'architect', 'plan', 'structure', 'organize',
      
      // Concepts
      'error', 'bug', 'issue', 'problem', 'exception', 'failure',
      'performance', 'speed', 'memory', 'efficiency',
      'security', 'authentication', 'authorization', 'encryption',
      'data', 'model', 'schema', 'type', 'interface',
      'component', 'service', 'controller', 'middleware',
      'route', 'endpoint', 'request', 'response',
      'state', 'store', 'reducer', 'action', 'context',
      
      // AI specific
      'agent', 'llm', 'embedding', 'vector', 'semantic', 'neural',
      'prompt', 'completion', 'inference', 'model', 'training',
      'skill', 'intent', 'routing', 'orchestration',
    ];

    commonTerms.forEach((term, index) => {
      this.vocabulary.set(term, index % this.dimensions);
      this.idf.set(term, Math.log(100 / (1 + Math.random() * 10)));
    });
  }

  async embed(text: string): Promise<number[]> {
    return this.computeEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.computeEmbedding(text));
  }

  private computeEmbedding(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const words = this.tokenize(text);
    const wordFreq = new Map<string, number>();
    
    // Count word frequencies
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
    
    // Compute TF-IDF weighted vector
    for (const [word, freq] of wordFreq) {
      // Hash unknown words to consistent positions
      let position = this.vocabulary.get(word);
      if (position === undefined) {
        position = this.hashToPosition(word);
      }
      
      const tf = freq / words.length;
      const idf = this.idf.get(word) ?? Math.log(100);
      const tfidf = tf * idf;
      
      // Add to vector with position wrapping
      const idx = position % this.dimensions;
      vector[idx] = (vector[idx] ?? 0) + tfidf;
      
      // Also add to nearby positions for smoother vectors
      const prev = (idx - 1 + this.dimensions) % this.dimensions;
      const next = (idx + 1) % this.dimensions;
      vector[prev] = (vector[prev] ?? 0) + tfidf * 0.3;
      vector[next] = (vector[next] ?? 0) + tfidf * 0.3;
    }
    
    // Normalize vector
    return this.normalize(vector);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  private hashToPosition(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % this.dimensions;
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }
}

// ============================================================================
// Embedding Service Factory
// ============================================================================

export interface EmbeddingServiceConfig {
  provider: 'openai' | 'local';
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

/**
 * Create an embedding function compatible with SkillRouter
 */
export function createEmbeddingFunction(config: EmbeddingServiceConfig): (text: string) => Promise<number[]> {
  let provider: EmbeddingProvider;

  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        console.warn('[Embeddings] No OpenAI API key provided, falling back to local embeddings');
        provider = new LocalEmbeddingProvider(config.dimensions);
      } else {
        provider = new OpenAIEmbeddingProvider({
          apiKey: config.apiKey,
          model: config.model ?? 'text-embedding-3-small',
          dimensions: config.dimensions ?? 1536,
        });
      }
      break;
    case 'local':
    default:
      provider = new LocalEmbeddingProvider(config.dimensions ?? 384);
      break;
  }

  return async (text: string) => provider.embed(text);
}

/**
 * Create an embedding provider instance
 */
export function createEmbeddingProvider(config: EmbeddingServiceConfig): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        console.warn('[Embeddings] No OpenAI API key provided, falling back to local embeddings');
        return new LocalEmbeddingProvider(config.dimensions);
      }
      return new OpenAIEmbeddingProvider({
        apiKey: config.apiKey,
        model: config.model ?? 'text-embedding-3-small',
        dimensions: config.dimensions ?? 1536,
      });
    case 'local':
    default:
      return new LocalEmbeddingProvider(config.dimensions ?? 384);
  }
}

// ============================================================================
// Export default provider for convenience
// ============================================================================

let defaultProvider: EmbeddingProvider | null = null;

export function getDefaultEmbeddingProvider(): EmbeddingProvider {
  if (!defaultProvider) {
    const apiKey = process.env['OPENAI_API_KEY'];
    defaultProvider = createEmbeddingProvider({
      provider: apiKey ? 'openai' : 'local',
      apiKey,
    });
  }
  return defaultProvider;
}

export function setDefaultEmbeddingProvider(provider: EmbeddingProvider): void {
  defaultProvider = provider;
}
