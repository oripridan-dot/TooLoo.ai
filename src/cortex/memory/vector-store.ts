// @version 2.1.203
import fs from "fs-extra";
import * as path from "path";
import { precog } from "../../precog/index.js";

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
      this.scheduleSave();
      console.log(
        `[VectorStore] Added document: "${text.substring(0, 30)}..."`,
      );
    } catch (error) {
      console.error(`[VectorStore] Failed to generate embedding: ${error}`);
    }
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
