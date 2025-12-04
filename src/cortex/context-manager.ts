import { VectorStore } from './memory/vector-store.js';
import KnowledgeGraphEngine from './memory/knowledge-graph-engine.js';

/**
 * ContextManager
 * Retrieves relevant history by vector similarity AND causal links in the Knowledge Graph.
 */
export class ContextManager {
  constructor(
    private vectorStore: VectorStore,
    private knowledgeGraph: KnowledgeGraphEngine
  ) {}

  /**
   * Retrieves context for a given query.
   * @param query The user's query.
   * @param limit Max number of context items.
   */
  async getContext(query: string, limit: number = 5): Promise<string[]> {
    const vectorContext = await this.getVectorContext(query, limit);
    const graphContext = await this.getGraphContext(query, limit);

    // Combine and deduplicate
    return [...new Set([...vectorContext, ...graphContext])];
  }

  /**
   * Retrieves context based on vector similarity (Semantic Search).
   */
  private async getVectorContext(query: string, limit: number): Promise<string[]> {
    try {
      const results = await this.vectorStore.search(query, limit);
      return results.map((r) => r.doc.text);
    } catch (error) {
      console.warn('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Retrieves context based on causal links in the Knowledge Graph.
   */
  private async getGraphContext(query: string, limit: number): Promise<string[]> {
    // Since we don't have a direct query method on KnowledgeGraphEngine for text,
    // we'll use a heuristic: find goals or tasks related to keywords in the query.
    // This is a simplified implementation.

    // TODO: Implement proper graph traversal based on query entities
    console.log(`Fetching graph context for: ${query}`);

    // Placeholder: return empty for now as KG doesn't support text search directly
    return [];
  }
}
