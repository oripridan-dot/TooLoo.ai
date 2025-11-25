// @version 2.1.287
import fs from "fs-extra";
import * as path from "path";
import { precog } from "../../precog/index.js";

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
    this.filePath = path.join(rootDir, "data/memory/vectors.json");
  }

  // Cosine similarity calculation
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(queryEmbedding: number[], limit: number = 5): Promise<VectorDocument[]> {
    if (!this.isInitialized) await this.initialize();

    return this.documents
      .map(doc => ({ ...doc, score: this.cosineSimilarity(queryEmbedding, doc.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  // ...existing code...
  async add(text: string, metadata: any = {}) {
    if (!this.isInitialized) await this.initialize();

    // Get embedding from OpenAI via Precog
    const openai = precog.providers.getProvider("openai");

    if (!openai || !openai.embed) {
      console.warn(
        "[VectorStore] OpenAI provider not available for embeddings.",
      );
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
            originalLength: text.length
          },
          createdAt: Date.now(),
        };

        this.documents.push(doc);
      } catch (error) {
        console.error(`[VectorStore] Failed to generate embedding for chunk ${i}: ${error}`);
      }
    }

    // Monitor size
    if (this.documents.length > 5000) {
      console.warn(
        "[VectorStore] Warning: Vector store size exceeding 5000 documents. Consider pruning.",
      );
    }

    this.scheduleSave();
    console.log(
      `[VectorStore] Added document chunks: "${text.substring(0, 30)}..." (${chunks.length} chunks)`,
    );
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
  // ...existing code...
  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 2000); // Debounce for 2 seconds
  }

  private async save() {
    try {
      await fs.writeFile(
        this.filePath,
        JSON.stringify(this.documents, null, 2),
      );
      // console.log("[VectorStore] Saved to disk.");
    } catch (err) {
      console.error(`[VectorStore] Save failed: ${err}`);
    }
  }
  // ...existing code...

  async initialize() {
    if (this.isInitialized) return;

    try {
      await fs.ensureFile(this.filePath);
      const content = await fs.readFile(this.filePath, "utf-8");
      if (content.trim()) {
        this.documents = JSON.parse(content);
      }
    } catch (error) {
      console.warn(
        "[VectorStore] Could not load existing vectors, starting fresh.",
      );
      this.documents = [];
    }

    this.isInitialized = true;
    console.log(
      `[VectorStore] Initialized with ${this.documents.length} documents.`,
    );
  }

  async add(text: string, metadata: any = {}) {
    if (!this.isInitialized) await this.initialize();

    // Get embedding from OpenAI via Precog
    const openai = precog.providers.getProvider("openai");

    if (!openai || !openai.embed) {
      console.warn(
        "[VectorStore] OpenAI provider not available for embeddings.",
      );
      return;
    }

    try {
      const embedding = await openai.embed(text);

      const doc: VectorDocument = {
        id: Math.random().toString(36).substring(7),
        text,
        embedding,
        metadata,
        createdAt: Date.now(),
      };

      this.documents.push(doc);
      await this.save();
      console.log(
        `[VectorStore] Added document: "${text.substring(0, 30)}..."`,
      );
    } catch (error) {
      console.error(`[VectorStore] Failed to generate embedding: ${error}`);
    }
  }

  async search(query: string, k: number = 3): Promise<VectorDocument[]> {
    if (!this.isInitialized) await this.initialize();

    const openai = precog.providers.getProvider("openai");
    if (!openai || !openai.embed) {
      console.warn("[VectorStore] OpenAI provider not available for search.");
      return [];
    }

    try {
      const queryEmbedding = await openai.embed(query);

      // Calculate cosine similarity
      const scored = this.documents.map((doc) => ({
        doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, k).map((s) => s.doc);
    } catch (error) {
      console.error(`[VectorStore] Search failed: ${error}`);
      return [];
    }
  }

  private async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.documents, null, 2));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
