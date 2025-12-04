// @version 2.1.386
import fs from 'fs-extra';
import * as path from 'path';
import { precog } from '../../precog/index.js';

// Memory limits to prevent disk/memory bloat
const MAX_DOCUMENTS = 3000; // Prune when exceeding this
const PRUNE_TARGET = 2000; // Keep this many after pruning
const MAX_FILE_SIZE_MB = 100; // Max file size in MB

// Simple in-memory vector store with cosine similarity
// In a real production environment, this would be replaced by HNSW or a dedicated vector DB
interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: any;
  createdAt: number;
}

export class VectorStore {
  private filePath: string;
  private documents: VectorDocument[] = [];
  private isInitialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

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

  async add(text: string, metadata: any = {}) {
    if (!this.isInitialized) await this.initialize();

    // Get embedding from OpenAI via Precog
    const openai = precog.providers.getProvider('openai');

    if (!openai || !openai.embed) {
      console.warn('[VectorStore] OpenAI provider not available for embeddings.');
      return;
    }

    // Chunking Strategy:
    // OpenAI text-embedding-3-small has a limit of 8191 tokens.
    // We'll use a safe character limit of 8000 chars (~2000 tokens) to ensure we never hit the limit
    // and to provide better semantic granularity for retrieval.
    const CHUNK_SIZE = 8000;
    const chunks = this.chunkText(text, CHUNK_SIZE);

    console.log(`[VectorStore] Processing ${chunks.length} chunks for document...`);

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
        };

        this.documents.push(doc);
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
      `[VectorStore] Added document chunks: "${text.substring(0, 30)}..." (${chunks.length} chunks)`
    );
  }

  async search(query: string, k: number = 3): Promise<{ doc: VectorDocument; score: number }[]> {
    if (!this.isInitialized) await this.initialize();

    const openai = precog.providers.getProvider('openai');
    if (!openai || !openai.embed) {
      console.warn('[VectorStore] OpenAI provider not available for search.');
      return [];
    }

    try {
      const queryEmbedding = await openai.embed(query);
      if (!queryEmbedding) return [];

      // Calculate cosine similarity
      const scored = this.documents
        .filter((doc) => doc.embedding && Array.isArray(doc.embedding))
        .map((doc) => ({
          doc,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding),
        }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, k);
    } catch (error) {
      console.error(`[VectorStore] Search failed: ${error}`);
      return [];
    }
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
