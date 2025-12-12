/**
 * Embedding-Based Skill Router
 * Maps User Intent Vector -> Skill Vector using semantic similarity
 * 
 * @version 2.0.0-alpha.0
 */

import type { SkillDefinition } from './types.js';
import type { SkillRegistry } from './registry.js';

// ============================================================================
// Types
// ============================================================================

export interface SkillEmbedding {
  skillId: string;
  vector: number[];
  keywords: string[];
  intents: string[];
}

export interface RoutingResult {
  skill: SkillDefinition;
  confidence: number;
  matchType: 'semantic' | 'keyword' | 'intent' | 'fallback';
  reasoning?: string;
}

export interface RouterConfig {
  /** Minimum confidence for semantic match */
  minSemanticConfidence: number;
  /** Minimum confidence for keyword match */
  minKeywordConfidence: number;
  /** Maximum skills to return */
  maxResults: number;
  /** Enable LLM-based routing for ambiguous cases */
  useLLMFallback: boolean;
  /** Fallback skill ID when no match found */
  fallbackSkillId?: string;
}

export type EmbedFunction = (text: string) => Promise<number[]>;
export type LLMRouterFunction = (query: string, skills: SkillDefinition[]) => Promise<string>;

// ============================================================================
// Skill Router
// ============================================================================

/**
 * Embedding-based Skill Router
 * The "Root Skill" that routes all incoming requests
 */
export class SkillRouter {
  private registry: SkillRegistry;
  private embedFn: EmbedFunction;
  private llmRouter?: LLMRouterFunction;
  private config: RouterConfig;
  
  // Cached skill embeddings
  private skillEmbeddings: Map<string, SkillEmbedding> = new Map();
  private embeddingsDirty = true;
  
  constructor(
    registry: SkillRegistry,
    embedFn: EmbedFunction,
    config: Partial<RouterConfig> = {},
    llmRouter?: LLMRouterFunction
  ) {
    this.registry = registry;
    this.embedFn = embedFn;
    this.llmRouter = llmRouter;
    this.config = {
      minSemanticConfidence: config.minSemanticConfidence ?? 0.75,
      minKeywordConfidence: config.minKeywordConfidence ?? 0.5,
      maxResults: config.maxResults ?? 3,
      useLLMFallback: config.useLLMFallback ?? false,
      fallbackSkillId: config.fallbackSkillId,
    };
  }
  
  /**
   * Route a user query to the best matching skill(s)
   */
  async route(query: string, context?: Record<string, unknown>): Promise<RoutingResult[]> {
    // Ensure embeddings are up to date
    await this.ensureEmbeddings();
    
    // Generate query embedding
    const queryEmbedding = await this.embedFn(query);
    
    // Score all skills
    const scores: Array<{
      skill: SkillDefinition;
      semanticScore: number;
      keywordScore: number;
      intentScore: number;
    }> = [];
    
    for (const [skillId, embedding] of this.skillEmbeddings) {
      const skill = this.registry.get(skillId);
      if (!skill) continue;
      
      // Check if skill is enabled for this context
      if (!this.isSkillEnabled(skill, context)) continue;
      
      const semanticScore = this.cosineSimilarity(queryEmbedding, embedding.vector);
      const keywordScore = this.scoreKeywords(query, embedding.keywords);
      const intentScore = this.scoreIntents(query, embedding.intents);
      
      scores.push({ skill, semanticScore, keywordScore, intentScore });
    }
    
    // Sort by combined score
    scores.sort((a, b) => {
      const scoreA = a.semanticScore * 0.6 + a.keywordScore * 0.25 + a.intentScore * 0.15;
      const scoreB = b.semanticScore * 0.6 + b.keywordScore * 0.25 + b.intentScore * 0.15;
      return scoreB - scoreA;
    });
    
    // Build results
    const results: RoutingResult[] = [];
    
    for (const { skill, semanticScore, keywordScore, intentScore } of scores.slice(0, this.config.maxResults)) {
      const combinedScore = semanticScore * 0.6 + keywordScore * 0.25 + intentScore * 0.15;
      
      if (semanticScore >= this.config.minSemanticConfidence) {
        results.push({
          skill,
          confidence: combinedScore,
          matchType: 'semantic',
          reasoning: `Semantic similarity: ${(semanticScore * 100).toFixed(1)}%`,
        });
      } else if (keywordScore >= this.config.minKeywordConfidence) {
        results.push({
          skill,
          confidence: combinedScore,
          matchType: 'keyword',
          reasoning: `Keyword match: ${(keywordScore * 100).toFixed(1)}%`,
        });
      } else if (intentScore > 0.5) {
        results.push({
          skill,
          confidence: combinedScore,
          matchType: 'intent',
          reasoning: `Intent match: ${(intentScore * 100).toFixed(1)}%`,
        });
      }
    }
    
    // If no good matches, try LLM fallback or use fallback skill
    if (results.length === 0) {
      const fallback = await this.handleNoMatch(query);
      if (fallback) {
        results.push(fallback);
      }
    }
    
    return results;
  }
  
  /**
   * Route and return the single best skill
   */
  async routeSingle(query: string, context?: Record<string, unknown>): Promise<RoutingResult | null> {
    const results = await this.route(query, context);
    return results[0] ?? null;
  }
  
  /**
   * Mark embeddings as needing refresh (call when skills change)
   */
  invalidateEmbeddings(): void {
    this.embeddingsDirty = true;
  }
  
  /**
   * Get routing explanation for debugging
   */
  async explain(query: string): Promise<{
    query: string;
    queryEmbedding: number[];
    skillScores: Array<{
      skillId: string;
      skillName: string;
      semanticScore: number;
      keywordScore: number;
      intentScore: number;
      combined: number;
    }>;
    selectedSkill: string | null;
    reasoning: string;
  }> {
    await this.ensureEmbeddings();
    const queryEmbedding = await this.embedFn(query);
    
    const skillScores: Array<{
      skillId: string;
      skillName: string;
      semanticScore: number;
      keywordScore: number;
      intentScore: number;
      combined: number;
    }> = [];
    
    for (const [skillId, embedding] of this.skillEmbeddings) {
      const skill = this.registry.get(skillId);
      if (!skill) continue;
      
      const semanticScore = this.cosineSimilarity(queryEmbedding, embedding.vector);
      const keywordScore = this.scoreKeywords(query, embedding.keywords);
      const intentScore = this.scoreIntents(query, embedding.intents);
      const combined = semanticScore * 0.6 + keywordScore * 0.25 + intentScore * 0.15;
      
      skillScores.push({
        skillId,
        skillName: skill.name,
        semanticScore,
        keywordScore,
        intentScore,
        combined,
      });
    }
    
    skillScores.sort((a, b) => b.combined - a.combined);
    
    const top = skillScores[0];
    const selectedSkill = top && top.combined > this.config.minSemanticConfidence ? top.skillId : null;
    
    return {
      query,
      queryEmbedding,
      skillScores,
      selectedSkill,
      reasoning: selectedSkill && top
        ? `Selected "${top.skillName}" with ${(top.combined * 100).toFixed(1)}% confidence`
        : `No skill matched with sufficient confidence (best: ${((top?.combined ?? 0) * 100).toFixed(1)}%)`,
    };
  }
  
  // ===========================================================================
  // Private Methods
  // ===========================================================================
  
  private async ensureEmbeddings(): Promise<void> {
    if (!this.embeddingsDirty) return;
    
    const skills = this.registry.getAll();
    
    for (const skill of skills) {
      // Create embedding text from skill definition
      const embeddingText = this.buildEmbeddingText(skill);
      const vector = await this.embedFn(embeddingText);
      
      this.skillEmbeddings.set(skill.id, {
        skillId: skill.id,
        vector,
        keywords: skill.triggers.keywords ?? [],
        intents: skill.triggers.intents ?? [],
      });
    }
    
    this.embeddingsDirty = false;
  }
  
  private buildEmbeddingText(skill: SkillDefinition): string {
    const parts: string[] = [
      skill.name,
      skill.instructions,
    ];
    
    if (skill.triggers.keywords) {
      parts.push(skill.triggers.keywords.join(' '));
    }
    
    if (skill.triggers.intents) {
      parts.push(skill.triggers.intents.join(' '));
    }
    
    if (skill.triggers.patterns) {
      parts.push(skill.triggers.patterns.join(' '));
    }
    
    // Limit to first 1000 chars for embedding
    return parts.join(' ').slice(0, 1000);
  }
  
  private isSkillEnabled(skill: SkillDefinition, context?: Record<string, unknown>): boolean {
    // Check model requirements if they have required capabilities
    if (!skill.modelRequirements?.capabilities) return true;
    if (!context) return true;
    
    // Check if context has required capabilities
    const contextCaps = context['capabilities'] as string[] | undefined;
    if (!contextCaps) return true;
    
    return skill.modelRequirements.capabilities.every((cap: string) => contextCaps.includes(cap));
  }
  
  private scoreKeywords(query: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    
    const queryLower = query.toLowerCase();
    const matches = keywords.filter(kw => queryLower.includes(kw.toLowerCase()));
    
    return matches.length / keywords.length;
  }
  
  private scoreIntents(query: string, intents: string[]): number {
    if (intents.length === 0) return 0;
    
    const queryLower = query.toLowerCase();
    
    // Intent matching with fuzzy logic
    const intentPatterns: Record<string, string[]> = {
      'code': ['code', 'program', 'function', 'implement', 'write', 'debug', 'fix'],
      'review': ['review', 'check', 'audit', 'analyze', 'examine'],
      'explain': ['explain', 'what is', 'how does', 'describe', 'tell me about'],
      'design': ['design', 'architect', 'plan', 'structure', 'organize'],
      'research': ['research', 'find', 'search', 'look up', 'investigate'],
      'refactor': ['refactor', 'improve', 'optimize', 'clean up', 'restructure'],
    };
    
    let maxScore = 0;
    
    for (const intent of intents) {
      const patterns = intentPatterns[intent] ?? [intent];
      const hasMatch = patterns.some(p => queryLower.includes(p.toLowerCase()));
      if (hasMatch) {
        maxScore = Math.max(maxScore, 1.0);
      }
    }
    
    return maxScore;
  }
  
  private async handleNoMatch(query: string): Promise<RoutingResult | null> {
    // Try LLM-based routing
    if (this.config.useLLMFallback && this.llmRouter) {
      const skills = this.registry.getAll();
      const selectedId = await this.llmRouter(query, skills);
      const skill = this.registry.get(selectedId);
      
      if (skill) {
        return {
          skill,
          confidence: 0.6,
          matchType: 'fallback',
          reasoning: 'Selected by LLM router due to no semantic/keyword match',
        };
      }
    }
    
    // Use fallback skill
    if (this.config.fallbackSkillId) {
      const fallbackSkill = this.registry.get(this.config.fallbackSkillId);
      if (fallbackSkill) {
        return {
          skill: fallbackSkill,
          confidence: 0.3,
          matchType: 'fallback',
          reasoning: 'Using default fallback skill',
        };
      }
    }
    
    return null;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dotProduct += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

export default SkillRouter;
