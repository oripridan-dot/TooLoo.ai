// @version 3.3.576
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
// @version 3.3.573
/**
 * @tooloo/engine - Routing Engine
 * Semantic and keyword-based skill routing
 * 
 * GOD MODE Configuration:
 * - keywordWeight: 0.8 (obey command words instantly)
 * - minConfidence: 0.4 (accept weaker matches)
 * 
 * @version 2.0.0-alpha.0
 */

import { createSkillId } from '@tooloo/core';
import type { SkillRegistry, SkillDefinition } from '@tooloo/skills';
import type { 
  RoutingConfig, 
  RoutingResult, 
  OrchestrationContext 
} from './types.js';

// =============================================================================
// DEFAULT CONFIGURATION - GOD MODE
// =============================================================================

/**
 * GOD MODE routing configuration
 * - High keyword weight: Commands like "deploy", "refactor", "analyze" trigger instantly
 * - Low min confidence: Accept weaker matches for creative/exploratory queries
 * - Semantic disabled by default: Enable only when embedding service is available
 */
export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  // Semantic routing (requires embedding service)
  semantic: false,
  
  // GOD MODE: Force AI to obey specific command words
  // High keyword weight = instant response to "deploy", "refactor", etc.
  keywordWeight: 0.8,
  
  // Semantic weight when embeddings enabled
  semanticWeight: 0.6,
  
  // GOD MODE: Lower barrier for skill matching
  // Accept weaker matches for creative/exploratory queries
  minConfidence: 0.4,
  
  // Embedding function (injected when semantic enabled)
  embedFn: undefined,
};

// =============================================================================
// ROUTING ENGINE
// =============================================================================

/**
 * Routes requests to the most appropriate skill
 */
export class RoutingEngine {
  private skillRegistry: SkillRegistry;
  private config: RoutingConfig;
  private skillEmbeddings: Map<string, number[]> = new Map();
  
  constructor(skillRegistry: SkillRegistry, config?: Partial<RoutingConfig>) {
    this.skillRegistry = skillRegistry;
    this.config = { ...DEFAULT_ROUTING_CONFIG, ...config };
  }
  
  /**
   * Route a request to the best matching skill
   */
  async route(context: OrchestrationContext): Promise<RoutingResult> {
    const startTime = Date.now();
    
    // Get all registered skills
    const skills = this.getSkills();
    
    if (skills.length === 0) {
      return this.createFallbackResult(startTime);
    }
    
    // Score each skill
    const scoredSkills = await Promise.all(
      skills.map(skill => this.scoreSkill(skill, context))
    );
    
    // Sort by score descending
    scoredSkills.sort((a, b) => b.score - a.score);
    
    // Get best match
    const best = scoredSkills[0];
    
    if (!best || best.score < this.config.minConfidence) {
      return this.createFallbackResult(startTime);
    }
    
    // Build alternatives (next 3 best matches)
    const alternatives = scoredSkills
      .slice(1, 4)
      .filter(s => s.score >= this.config.minConfidence * 0.5)
      .map(s => ({
        skill: s.skill,
        confidence: s.score,
      }));
    
    // Log routing decision
    console.log(`[RoutingEngine] Routed to: ${best.skill.id} (${(best.score * 100).toFixed(0)}% confidence)`);
    
    return {
      skill: best.skill,
      confidence: best.score,
      alternatives,
      reasoning: best.reasoning,
      routingTimeMs: Date.now() - startTime,
    };
  }
  
  /**
   * Update routing configuration
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Enable semantic routing with embedding function
   */
  async enableSemantic(embedFn: (text: string) => Promise<number[]>): Promise<void> {
    this.config.semantic = true;
    this.config.embedFn = embedFn;
    
    // Pre-compute embeddings for all skills
    await this.computeSkillEmbeddings();
  }
  
  /**
   * Disable semantic routing
   */
  disableSemantic(): void {
    this.config.semantic = false;
    this.config.embedFn = undefined;
    this.skillEmbeddings.clear();
  }
  
  /**
   * Get current configuration
   */
  getConfig(): Readonly<RoutingConfig> {
    return { ...this.config };
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  private getSkills(): SkillDefinition[] {
    return this.skillRegistry.getAll();
  }
  
  private async scoreSkill(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): Promise<{
    skill: SkillDefinition;
    score: number;
    keywordScore: number;
    intentScore: number;
    semanticScore: number;
    reasoning: string;
  }> {
    const keywordScore = this.computeKeywordScore(skill, context);
    const intentScore = this.computeIntentScore(skill, context);
    const semanticScore = this.config.semantic
      ? await this.computeSemanticScore(skill, context)
      : 0;
    
    // Weighted combination - GOD MODE emphasizes keywords
    let score: number;
    
    if (this.config.semantic && semanticScore > 0) {
      // With semantic: blend all three
      score = 
        (semanticScore * this.config.semanticWeight) +
        (keywordScore * this.config.keywordWeight) +
        (intentScore * (1 - this.config.semanticWeight - this.config.keywordWeight));
    } else {
      // Without semantic: GOD MODE keyword dominance
      score = (keywordScore * this.config.keywordWeight) + 
              (intentScore * (1 - this.config.keywordWeight));
    }
    
    const reasoning = this.buildReasoning(skill, {
      keywordScore,
      intentScore,
      semanticScore,
      score,
    });
    
    return {
      skill,
      score: Math.min(score, 1.0),
      keywordScore,
      intentScore,
      semanticScore,
      reasoning,
    };
  }
  
  private computeKeywordScore(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): number {
    const messageWords = context.userMessage.toLowerCase().split(/\s+/);
    const skillKeywords = skill.triggers.keywords.map(k => k.toLowerCase());
    
    if (skillKeywords.length === 0) return 0;
    
    let matches = 0;
    let partialMatches = 0;
    
    for (const keyword of skillKeywords) {
      // Exact match
      if (messageWords.includes(keyword)) {
        matches++;
      } else {
        // Partial match (substring)
        for (const word of messageWords) {
          if (word.includes(keyword) || keyword.includes(word)) {
            if (word.length >= 3) { // Avoid trivial matches
              partialMatches++;
              break;
            }
          }
        }
      }
    }
    
    // Full matches worth more than partials
    const score = (matches + partialMatches * 0.5) / skillKeywords.length;
    
    return Math.min(score, 1.0);
  }
  
  private computeIntentScore(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): number {
    const detectedIntent = context.intent.type.toLowerCase();
    const skillIntents = skill.triggers.intents.map(i => i.toLowerCase());
    
    if (skillIntents.length === 0) return 0;
    
    // Direct match
    if (skillIntents.includes(detectedIntent)) {
      return context.intent.confidence;
    }
    
    // Partial match (one word in common)
    for (const skillIntent of skillIntents) {
      if (
        detectedIntent.includes(skillIntent) ||
        skillIntent.includes(detectedIntent)
      ) {
        return context.intent.confidence * 0.7;
      }
    }
    
    return 0;
  }
  
  private async computeSemanticScore(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): Promise<number> {
    if (!this.config.embedFn) return 0;
    
    try {
      // Get or compute skill embedding
      let skillEmbedding = this.skillEmbeddings.get(skill.id);
      if (!skillEmbedding) {
        const skillText = this.buildSkillText(skill);
        skillEmbedding = await this.config.embedFn(skillText);
        this.skillEmbeddings.set(skill.id, skillEmbedding);
      }
      
      // Compute query embedding
      const queryEmbedding = await this.config.embedFn(context.userMessage);
      
      // Cosine similarity
      return this.cosineSimilarity(queryEmbedding, skillEmbedding);
    } catch {
      return 0;
    }
  }
  
  private async computeSkillEmbeddings(): Promise<void> {
    if (!this.config.embedFn) return;
    
    const skills = this.getSkills();
    
    for (const skill of skills) {
      const skillText = this.buildSkillText(skill);
      const embedding = await this.config.embedFn(skillText);
      this.skillEmbeddings.set(skill.id, embedding);
    }
  }
  
  private buildSkillText(skill: SkillDefinition): string {
    const parts = [
      skill.name,
      skill.description,
      ...skill.triggers.keywords,
      ...skill.triggers.intents,
    ];
    
    return parts.join(' ');
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
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
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }
  
  private buildReasoning(
    skill: SkillDefinition,
    scores: {
      keywordScore: number;
      intentScore: number;
      semanticScore: number;
      score: number;
    }
  ): string {
    const parts: string[] = [];
    
    if (scores.keywordScore > 0) {
      parts.push(
        `Keywords: ${(scores.keywordScore * 100).toFixed(0)}%`
      );
    }
    
    if (scores.intentScore > 0) {
      parts.push(
        `Intent: ${(scores.intentScore * 100).toFixed(0)}%`
      );
    }
    
    if (scores.semanticScore > 0) {
      parts.push(
        `Semantic: ${(scores.semanticScore * 100).toFixed(0)}%`
      );
    }
    
    return `Matched "${skill.name}" (${(scores.score * 100).toFixed(0)}% confidence) - ${parts.join(', ')}`;
  }
  
  private createFallbackResult(startTime: number): RoutingResult {
    return {
      skill: this.createFallbackSkill(),
      confidence: 0,
      alternatives: [],
      reasoning: 'No matching skill found, using fallback',
      routingTimeMs: Date.now() - startTime,
    };
  }
  
  private createFallbackSkill(): SkillDefinition {
    return {
      id: createSkillId('fallback'),
      name: 'General Assistant',
      version: '1.0.0',
      description: 'General-purpose assistant for unmatched queries',
      instructions: 'You are a helpful assistant. Answer the user query to the best of your ability.',
      tools: [],
      triggers: {
        intents: ['chat'],
        keywords: [],
        patterns: [],
      },
      context: {
        maxTokens: 4096,
        ragSources: [],
        memoryScope: 'session',
        includeHistory: true,
        maxHistoryMessages: 10,
      },
      composability: {
        requires: [],
        enhances: [],
        conflicts: [],
        priority: 0,
      },
      modelRequirements: {
        minContext: 4096,
        capabilities: [],
        preferredProviders: [],
        temperature: 0.7,
      },
      metadata: {
        author: 'system',
        license: 'MIT',
        tags: ['fallback'],
        examples: [],
      },
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a routing engine
 */
export function createRoutingEngine(
  skillRegistry: SkillRegistry,
  config?: Partial<RoutingConfig>
): RoutingEngine {
  return new RoutingEngine(skillRegistry, config);
}
