// @version 3.3.9
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
   * Performs entity extraction and graph traversal to find related knowledge.
   */
  private async getGraphContext(query: string, limit: number): Promise<string[]> {
    const context: string[] = [];

    try {
      // 1. Extract entities/keywords from the query
      const entities = this.extractEntities(query);
      console.log(`[ContextManager] Extracted entities: ${entities.join(', ')}`);

      // 2. Find matching goals
      const goalStats = this.knowledgeGraph.getGoalStatistics();
      const matchedGoals: Array<{ goal: string; score: number; stats: any }> = [];

      for (const [goalId, stats] of goalStats) {
        const matchScore = this.calculateEntityMatchScore(goalId, entities);
        if (matchScore > 0.3) {
          matchedGoals.push({ goal: goalId, score: matchScore, stats });
        }
      }

      // Sort by match score and take top matches
      matchedGoals.sort((a, b) => b.score - a.score);
      const topGoals = matchedGoals.slice(0, Math.min(limit, 3));

      // 3. Build context from matched goals
      for (const matched of topGoals) {
        const summary = this.knowledgeGraph.getGoalPerformanceSummary(matched.goal);
        
        // Add goal context
        context.push(
          `Goal "${matched.goal}": ${summary.totalAttempts} attempts, ` +
          `${(summary.avgSuccessRate * 100).toFixed(1)}% success rate`
        );

        // Add best provider context
        const bestProvider = summary.providers[0];
        if (bestProvider && bestProvider.attempts > 0) {
          context.push(
            `Best provider for ${matched.goal}: ${bestProvider.provider} ` +
            `(${(bestProvider.successRate * 100).toFixed(1)}% success, ` +
            `${bestProvider.avgTime.toFixed(0)}ms avg)`
          );
        }
      }

      // 4. Get provider recommendations if query implies a task
      const taskKeywords = ['generate', 'create', 'analyze', 'code', 'write', 'help'];
      const isTaskQuery = taskKeywords.some(kw => query.toLowerCase().includes(kw));
      
      if (isTaskQuery && topGoals.length > 0) {
        const recommendations = this.knowledgeGraph.getProviderRecommendations(topGoals[0].goal);
        if (recommendations.length > 0) {
          const topRec = recommendations[0];
          context.push(
            `Recommended provider: ${topRec.provider} ` +
            `(confidence: ${(topRec.confidence * 100).toFixed(0)}%, ` +
            `quality: ${(topRec.metrics.avgQuality * 100).toFixed(0)}%)`
          );
        }
      }

      // 5. Add graph statistics for transparency
      const graphStats = this.knowledgeGraph.getGraphStatistics();
      if (graphStats.learningHistory > 0) {
        context.push(
          `Knowledge base: ${graphStats.nodes.tasks} tasks, ` +
          `${graphStats.nodes.providers} providers, ` +
          `${graphStats.learningHistory} learning entries`
        );
      }

    } catch (error) {
      console.warn('[ContextManager] Graph context retrieval failed:', error);
    }

    return context.slice(0, limit);
  }

  /**
   * Extract entities/keywords from a query for graph matching.
   */
  private extractEntities(query: string): string[] {
    // Normalize and tokenize
    const normalized = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(' ');
    
    // Common stop words to filter out
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'what',
      'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
      'only', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but',
      'or', 'if', 'then', 'else', 'for', 'of', 'to', 'in', 'on', 'at',
      'by', 'from', 'up', 'down', 'with', 'about', 'into', 'through'
    ]);

    // Filter meaningful words (2+ chars, not stop words)
    const entities = words.filter(word => 
      word.length >= 2 && !stopWords.has(word)
    );

    // Deduplicate
    return [...new Set(entities)];
  }

  /**
   * Calculate how well a goal matches the extracted entities.
   */
  private calculateEntityMatchScore(goalId: string, entities: string[]): number {
    if (entities.length === 0) return 0;

    const goalLower = goalId.toLowerCase();
    let matchCount = 0;

    for (const entity of entities) {
      if (goalLower.includes(entity) || entity.includes(goalLower)) {
        matchCount++;
      }
    }

    // Partial match scoring
    return matchCount / entities.length;
  }

  /**
   * Get enriched context with both vector and graph data merged intelligently.
   */
  async getEnrichedContext(query: string, options: {
    vectorLimit?: number;
    graphLimit?: number;
    includeRecommendations?: boolean;
  } = {}): Promise<{
    semantic: string[];
    graph: string[];
    recommendations: Array<{ provider: string; score: number; reason: string }>;
    metadata: { vectorHits: number; graphHits: number; confidence: number };
  }> {
    const vectorLimit = options.vectorLimit ?? 5;
    const graphLimit = options.graphLimit ?? 5;

    const semantic = await this.getVectorContext(query, vectorLimit);
    const graph = await this.getGraphContext(query, graphLimit);
    
    const recommendations: Array<{ provider: string; score: number; reason: string }> = [];
    
    if (options.includeRecommendations) {
      const entities = this.extractEntities(query);
      const goalStats = this.knowledgeGraph.getGoalStatistics();
      
      // Find best matching goal
      let bestGoal = '';
      let bestScore = 0;
      for (const [goalId] of goalStats) {
        const score = this.calculateEntityMatchScore(goalId, entities);
        if (score > bestScore) {
          bestScore = score;
          bestGoal = goalId;
        }
      }

      if (bestGoal) {
        const recs = this.knowledgeGraph.getProviderRecommendations(bestGoal);
        for (const rec of recs.slice(0, 3)) {
          recommendations.push({
            provider: rec.provider,
            score: rec.score,
            reason: `Best for ${bestGoal}: ${(rec.metrics.successRate * 100).toFixed(0)}% success rate`
          });
        }
      }
    }

    // Calculate confidence based on context richness
    const confidence = Math.min(1, (semantic.length + graph.length) / 10);

    return {
      semantic,
      graph,
      recommendations,
      metadata: {
        vectorHits: semantic.length,
        graphHits: graph.length,
        confidence
      }
    };
  }
}
