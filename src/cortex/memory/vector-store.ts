// @version 3.3.401
import fs from 'fs-extra';
import * as path from 'path';
import { precog } from '../../precog/index.js';

// Memory limits to prevent disk/memory bloat
const MAX_DOCUMENTS = 3000; // Prune when exceeding this
const PRUNE_TARGET = 2000; // Keep this many after pruning
const MAX_FILE_SIZE_MB = 100; // Max file size in MB

// Recency decay constants for memory weighting
const RECENCY_DECAY_HOURS = 24; // Half-life for recency decay
const RECENCY_WEIGHT = 0.3; // How much recency affects final score (0-1)
const SIMILARITY_WEIGHT = 0.7; // How much semantic similarity affects final score

// Task type categories for specialized retrieval
const TASK_TYPE_KEYWORDS: Record<string, string[]> = {
  execution: ['execute', 'run', 'code', 'script', 'output', 'error', 'fix', 'debug'],
  design: ['ui', 'component', 'style', 'layout', 'color', 'animation', 'css'],
  analysis: ['analyze', 'understand', 'explain', 'why', 'how', 'what'],
  generation: ['create', 'generate', 'build', 'make', 'write', 'implement'],
  learning: ['learn', 'improve', 'optimize', 'better', 'pattern', 'feedback'],
};

// Simple in-memory vector store with cosine similarity
// In a real production environment, this would be replaced by HNSW or a dedicated vector DB
interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: VectorDocumentMetadata;
  createdAt: number;
  /** Number of times this document was retrieved */
  accessCount: number;
  /** Last access timestamp */
  lastAccessedAt: number;
  /** Task type category */
  taskType?: string;
  /** Success/failure outcome if applicable */
  outcome?: 'success' | 'failure' | 'unknown';
}

interface VectorDocumentMetadata {
  type?: string;
  tags?: string[];
  id?: string;
  chunkIndex?: number;
  totalChunks?: number;
  originalLength?: number;
  errorType?: string;
  fixApplied?: boolean;
  language?: string;
  [key: string]: unknown;
}

/** Options for enhanced search */
export interface SearchOptions {
  /** Number of results to return */
  k?: number;
  /** Filter by task type */
  taskType?: 'execution' | 'design' | 'analysis' | 'generation' | 'learning';
  /** Filter by outcome */
  outcome?: 'success' | 'failure';
  /** Minimum recency (timestamp) */
  minRecency?: number;
  /** Maximum age in hours */
  maxAgeHours?: number;
  /** Boost recent results */
  recencyBoost?: boolean;
  /** Only return successful experiences */
  successOnly?: boolean;
  /** Include metadata tags filter */
  tags?: string[];
}

export class VectorStore {
  private filePath: string;
  private documents: VectorDocument[] = [];
  private isInitialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;
  /** Statistics for memory usage analysis */
  private stats = {
    totalSearches: 0,
    avgSearchTime: 0,
    cacheHits: 0,
    documentsAdded: 0,
  };

  constructor(private rootDir: string) {
    this.filePath = path.join(rootDir, 'data/memory/vectors.json');
  }

  async initialize() {
    if (this.isInitialized) return;

    // Clean up orphaned temp files on startup
    await this.cleanupTempFiles();

    try {
      await fs.ensureFile(this.filePath);
      const stats = await fs.stat(this.filePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > MAX_FILE_SIZE_MB) {
        console.warn(`[VectorStore] File too large (${sizeMB.toFixed(1)}MB), resetting...`);
        this.documents = [];
        await this.save();
      } else {
        const content = await fs.readFile(this.filePath, 'utf-8');
        if (content.trim()) {
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              this.documents = parsed;
            } else {
              console.warn('[VectorStore] Corrupt data found (not an array), resetting.');
              this.documents = [];
            }
          } catch (e) {
            console.warn('[VectorStore] JSON parse error, resetting.');
            this.documents = [];
          }

          // Prune on load if needed
          if (this.documents.length > MAX_DOCUMENTS) {
            console.log(
              `[VectorStore] Pruning ${this.documents.length} → ${PRUNE_TARGET} documents...`
            );
            await this.prune();
          }
        }
      }
    } catch (error) {
      console.warn('[VectorStore] Could not load existing vectors, starting fresh.');
      this.documents = [];
    }

    this.isInitialized = true;
    console.log(`[VectorStore] Initialized with ${this.documents.length} documents.`);
  }

  private async cleanupTempFiles() {
    const memoryDir = path.dirname(this.filePath);
    try {
      const files = await fs.readdir(memoryDir);
      const tempFiles = files.filter((f) => f.includes('.tmp-'));
      for (const tempFile of tempFiles) {
        await fs.unlink(path.join(memoryDir, tempFile)).catch(() => {});
      }
      if (tempFiles.length > 0) {
        console.log(`[VectorStore] Cleaned up ${tempFiles.length} orphaned temp files.`);
      }
    } catch (e) {
      // Directory might not exist yet
    }
  }

  private async prune() {
    // Keep most recent documents
    this.documents.sort((a, b) => b.createdAt - a.createdAt);
    this.documents = this.documents.slice(0, PRUNE_TARGET);
    await this.save();
    console.log(`[VectorStore] Pruned to ${this.documents.length} documents.`);
  }

  async add(text: string, metadata: VectorDocumentMetadata = {}) {
    if (!this.isInitialized) await this.initialize();

    // Get embedding from OpenAI via Precog
    const openai = precog.providers.getProvider('openai');

    if (!openai || !openai.embed) {
      console.warn('[VectorStore] OpenAI provider not available for embeddings.');
      return;
    }

    // Auto-detect task type from text and metadata
    const taskType = this.detectTaskType(text, metadata);
    const outcome = this.detectOutcome(text, metadata);

    // Chunking Strategy:
    // OpenAI text-embedding-3-small has a limit of 8191 tokens.
    // We'll use a safe character limit of 8000 chars (~2000 tokens) to ensure we never hit the limit
    // and to provide better semantic granularity for retrieval.
    const CHUNK_SIZE = 8000;
    const chunks = this.chunkText(text, CHUNK_SIZE);

    console.log(
      `[VectorStore] Processing ${chunks.length} chunks for document (task: ${taskType})...`
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      try {
        const embedding = await openai.embed(chunk);

        const doc: VectorDocument = {
          id: Math.random().toString(36).substring(7),
          text: chunk,
          embedding,
          metadata: {
            ...metadata,
            chunkIndex: i,
            totalChunks: chunks.length,
            originalLength: text.length,
          },
          createdAt: Date.now(),
          accessCount: 0,
          lastAccessedAt: Date.now(),
          taskType,
          outcome,
        };

        this.documents.push(doc);
        this.stats.documentsAdded++;
      } catch (error: any) {
        // Handle Quota Exceeded (429) gracefully
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
          console.warn(
            `[VectorStore] Embedding quota exceeded (429). Skipping remaining chunks for this document.`
          );
          break; // Stop processing chunks for this document
        }
        console.error(`[VectorStore] Failed to generate embedding for chunk ${i}: ${error}`);
      }
    }

    // Monitor size and auto-prune
    if (this.documents.length > MAX_DOCUMENTS) {
      console.warn(
        `[VectorStore] Document limit exceeded (${this.documents.length}/${MAX_DOCUMENTS}). Auto-pruning...`
      );
      await this.prune();
    }

    this.scheduleSave();
    console.log(
      `[VectorStore] Added document chunks: "${text.substring(0, 30)}..." (${chunks.length} chunks, type: ${taskType})`
    );
  }

  /**
   * Detect task type from text and metadata
   */
  private detectTaskType(text: string, metadata: VectorDocumentMetadata): string {
    const lowerText = text.toLowerCase();

    // Check metadata first
    if (metadata.type) {
      const metaType = metadata.type.toLowerCase();
      if (metaType.includes('error') || metaType.includes('exec')) return 'execution';
      if (metaType.includes('ui') || metaType.includes('design')) return 'design';
    }

    // Then check text content
    for (const [taskType, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
      const matchCount = keywords.filter((kw) => lowerText.includes(kw)).length;
      if (matchCount >= 2) return taskType; // At least 2 keyword matches
    }

    return 'general';
  }

  /**
   * Detect outcome (success/failure) from text and metadata
   */
  private detectOutcome(
    text: string,
    metadata: VectorDocumentMetadata
  ): 'success' | 'failure' | 'unknown' {
    const lowerText = text.toLowerCase();

    // Check for explicit outcome markers
    if (
      metadata.fixApplied === true ||
      lowerText.includes('success') ||
      lowerText.includes('completed')
    ) {
      return 'success';
    }
    if (metadata.errorType || lowerText.includes('error') || lowerText.includes('failed')) {
      return 'failure';
    }

    return 'unknown';
  }

  /**
   * Enhanced search with task-aware retrieval and recency weighting
   * This is the key improvement for "remembering what worked"
   */
  async search(
    query: string,
    kOrOptions: number | SearchOptions = 3
  ): Promise<{ doc: VectorDocument; score: number }[]> {
    if (!this.isInitialized) await this.initialize();

    const searchStart = Date.now();

    // Handle both old API (just k) and new options API
    const options: SearchOptions = typeof kOrOptions === 'number' ? { k: kOrOptions } : kOrOptions;
    const k = options.k || 3;

    const openai = precog.providers.getProvider('openai');
    if (!openai || !openai.embed) {
      console.warn('[VectorStore] OpenAI provider not available for search.');
      return [];
    }

    try {
      const queryEmbedding = await openai.embed(query);
      if (!queryEmbedding) return [];

      const now = Date.now();

      // STEP 1: Filter documents based on options
      let candidates = this.documents.filter((doc) => {
        if (!doc.embedding || !Array.isArray(doc.embedding)) return false;

        // Task type filter
        if (options.taskType && doc.taskType !== options.taskType) return false;

        // Outcome filter
        if (options.outcome && doc.outcome !== options.outcome) return false;
        if (options.successOnly && doc.outcome !== 'success') return false;

        // Age filter
        if (options.maxAgeHours) {
          const ageHours = (now - doc.createdAt) / (1000 * 60 * 60);
          if (ageHours > options.maxAgeHours) return false;
        }

        // Recency filter
        if (options.minRecency && doc.createdAt < options.minRecency) return false;

        // Tags filter
        if (options.tags && options.tags.length > 0) {
          const docTags = doc.metadata?.tags || [];
          const hasMatchingTag = options.tags.some((tag) => docTags.includes(tag));
          if (!hasMatchingTag) return false;
        }

        return true;
      });

      // STEP 2: Calculate scores with recency weighting
      const scored = candidates.map((doc) => {
        // Semantic similarity score (0-1)
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);

        // Recency score (0-1) - exponential decay
        let recencyScore = 1;
        if (options.recencyBoost !== false) {
          const ageHours = (now - doc.createdAt) / (1000 * 60 * 60);
          recencyScore = Math.exp(-ageHours / RECENCY_DECAY_HOURS);
        }

        // Access frequency bonus (small boost for frequently accessed docs)
        const accessBonus = Math.min(doc.accessCount * 0.01, 0.1); // Max 10% boost

        // Combined score
        const finalScore =
          SIMILARITY_WEIGHT * similarity + RECENCY_WEIGHT * recencyScore + accessBonus;

        return { doc, score: finalScore, similarity, recencyScore };
      });

      // Sort by final score descending
      scored.sort((a, b) => b.score - a.score);

      // STEP 3: Update access tracking for retrieved documents
      const results = scored.slice(0, k);
      for (const result of results) {
        result.doc.accessCount++;
        result.doc.lastAccessedAt = now;
      }

      // Schedule save to persist access counts
      if (results.length > 0) {
        this.scheduleSave();
      }

      // Update stats
      this.stats.totalSearches++;
      const searchDuration = Date.now() - searchStart;
      this.stats.avgSearchTime =
        (this.stats.avgSearchTime * (this.stats.totalSearches - 1) + searchDuration) /
        this.stats.totalSearches;

      console.log(`[VectorStore] Search completed: ${results.length} results, ${searchDuration}ms`);

      return results.map((r) => ({ doc: r.doc, score: r.score }));
    } catch (error) {
      console.error(`[VectorStore] Search failed: ${error}`);
      return [];
    }
  }

  /**
   * Find similar past experiences for a given task
   * Specifically designed for execution pipeline to recall "what worked before"
   */
  async findSimilarExperiences(
    taskDescription: string,
    options: {
      onlySuccessful?: boolean;
      taskType?: string;
      maxAge?: number;
      limit?: number;
    } = {}
  ): Promise<{ experience: string; outcome: string; similarity: number }[]> {
    const searchOptions: SearchOptions = {
      k: options.limit || 5,
      successOnly: options.onlySuccessful,
      taskType: options.taskType as any,
      maxAgeHours: options.maxAge,
      recencyBoost: true,
    };

    const results = await this.search(taskDescription, searchOptions);

    return results.map((r) => ({
      experience: r.doc.text.substring(0, 500), // Truncate for context window
      outcome: r.doc.outcome || 'unknown',
      similarity: r.score,
    }));
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalDocuments: this.documents.length,
      taskTypeDistribution: this.getTaskTypeDistribution(),
      outcomeDistribution: this.getOutcomeDistribution(),
    };
  }

  private getTaskTypeDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const doc of this.documents) {
      const type = doc.taskType || 'unknown';
      dist[type] = (dist[type] || 0) + 1;
    }
    return dist;
  }

  private getOutcomeDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const doc of this.documents) {
      const outcome = doc.outcome || 'unknown';
      dist[outcome] = (dist[outcome] || 0) + 1;
    }
    return dist;
  }

  /**
   * Record an execution experience for future recall
   * This creates a structured "Problem → Action → Result" record
   */
  async recordExperience(experience: {
    problem: string;
    action: string;
    result: string;
    success: boolean;
    errorType?: string;
    language?: string;
    fixApplied?: boolean;
    context?: Record<string, unknown>;
  }): Promise<void> {
    const experienceText = `
PROBLEM: ${experience.problem}
ACTION: ${experience.action}
RESULT: ${experience.result}
OUTCOME: ${experience.success ? 'SUCCESS' : 'FAILURE'}
${experience.errorType ? `ERROR_TYPE: ${experience.errorType}` : ''}
${experience.fixApplied ? 'FIX_APPLIED: true' : ''}
    `.trim();

    await this.add(experienceText, {
      type: 'execution-experience',
      tags: [
        'experience',
        experience.success ? 'success' : 'failure',
        experience.language || 'unknown',
      ],
      errorType: experience.errorType,
      fixApplied: experience.fixApplied,
      language: experience.language,
      ...experience.context,
    });

    console.log(
      `[VectorStore] Recorded experience: ${experience.success ? '✓' : '✗'} ${experience.problem.substring(0, 50)}...`
    );
  }

  /**
   * Get relevant past experiences for a similar problem
   * Used by the execution pipeline before attempting to fix errors
   */
  async getRelevantExperiences(
    problem: string,
    options: {
      preferSuccessful?: boolean;
      errorType?: string;
      limit?: number;
    } = {}
  ): Promise<
    {
      problem: string;
      action: string;
      result: string;
      success: boolean;
      similarity: number;
    }[]
  > {
    const searchOptions: SearchOptions = {
      k: options.limit || 3,
      taskType: 'execution',
      successOnly: options.preferSuccessful,
      recencyBoost: true,
      tags: options.errorType ? ['experience', options.errorType] : ['experience'],
    };

    const results = await this.search(problem, searchOptions);

    // Parse the structured experience format
    return results.map((r) => {
      const text = r.doc.text;
      const problemMatch = text.match(/PROBLEM: (.+?)(?=\nACTION:|$)/s);
      const actionMatch = text.match(/ACTION: (.+?)(?=\nRESULT:|$)/s);
      const resultMatch = text.match(/RESULT: (.+?)(?=\nOUTCOME:|$)/s);

      return {
        problem: problemMatch?.[1]?.trim() || text.substring(0, 100),
        action: actionMatch?.[1]?.trim() || 'Unknown',
        result: resultMatch?.[1]?.trim() || 'Unknown',
        success: r.doc.outcome === 'success',
        similarity: r.score,
      };
    });
  }

  /**
   * Index a code file with AST-enhanced understanding
   * Creates embeddings that include structural context (functions, classes, etc.)
   * This enables better code retrieval than plain text search
   */
  async indexCodeFile(filePath: string): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { getASTIndexer } = await import('./ast-indexer.js');
      const astIndexer = getASTIndexer(this.rootDir);

      // Index the file
      const fileIndex = await astIndexer.indexFile(filePath);

      // Create structured summary for embedding
      const summary = astIndexer.generateFileSummary(fileIndex);

      // Store the summary with code-specific metadata
      await this.add(summary, {
        type: 'code-index',
        tags: ['code', 'ast', ...fileIndex.exports.slice(0, 5)],
        language:
          filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? 'typescript' : 'javascript',
        filePath,
        symbolCount: fileIndex.symbols.length,
        exportCount: fileIndex.exports.length,
        importCount: fileIndex.imports.length,
      });

      // Also store individual function/class summaries for fine-grained retrieval
      for (const symbol of fileIndex.symbols) {
        if (symbol.kind === 'function' || symbol.kind === 'class') {
          await this.add(symbol.summary, {
            type: `code-${symbol.kind}`,
            tags: ['code', symbol.kind, symbol.name],
            language: filePath.endsWith('.ts') ? 'typescript' : 'javascript',
            filePath,
            symbolName: symbol.name,
            line: symbol.line,
            isExported: symbol.isExported,
          });
        }
      }

      console.log(
        `[VectorStore] Indexed code file: ${filePath} (${fileIndex.symbols.length} symbols)`
      );
    } catch (err) {
      console.warn(`[VectorStore] Failed to AST-index ${filePath}:`, err);
      // Fall back to plain text indexing
      const fsPromises = await import('fs/promises');
      const content = await fsPromises.readFile(filePath, 'utf-8');
      await this.add(content, { type: 'code', filePath });
    }
  }

  /**
   * Search for code symbols (functions, classes, types)
   */
  async searchCode(
    query: string,
    options: {
      kind?: 'function' | 'class' | 'interface' | 'type';
      limit?: number;
    } = {}
  ): Promise<{ symbol: string; filePath: string; similarity: number }[]> {
    const searchOptions: SearchOptions = {
      k: options.limit || 5,
      tags: options.kind ? ['code', options.kind] : ['code'],
      recencyBoost: false, // Code structure doesn't benefit from recency
    };

    const results = await this.search(query, searchOptions);

    return results.map((r) => ({
      symbol: (r.doc.metadata?.['symbolName'] as string) || r.doc.text.split('\n')[0] || 'unknown',
      filePath: (r.doc.metadata?.['filePath'] as string) || 'unknown',
      similarity: r.score,
    }));
  }

  private chunkText(text: string, size: number): string[] {
    const chunks: string[] = [];
    let index = 0;
    while (index < text.length) {
      chunks.push(text.slice(index, index + size));
      index += size;
    }
    return chunks;
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 2000); // Debounce for 2 seconds
  }

  private async save() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.documents, null, 2));
      // console.log("[VectorStore] Saved to disk.");
    } catch (err) {
      console.error(`[VectorStore] Save failed: ${err}`);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
