// @version 3.3.577
/**
 * @tooloo/engine - Routing Engine
 * Semantic and keyword-based skill routing
 * 
 * @version 2.0.0-alpha.0
 */

import type { SkillDefinition, SkillRegistry } from '@tooloo/skills';
import type { OrchestrationContext, RoutingResult } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

interface RoutingConfig {
  semantic: boolean;
  minConfidence: number;
  semanticWeight: number;
  keywordWeight: number;
}

interface ScoredSkill {
  skill: SkillDefinition;
  score: number;
  keywordScore: number;
  intentScore: number;
  semanticScore: number;
  reasoning: string;
}

// =============================================================================
// ROUTING ENGINE
// =============================================================================

/**
 * Routes requests to the most appropriate skill
 */
export class RoutingEngine {
  private config: RoutingConfig;

  constructor(
    private readonly skillRegistry: SkillRegistry,
    config: RoutingConfig
  ) {
    this.config = config;
  }

  /**
   * Route a request to the best matching skill
   */
  async route(context: OrchestrationContext): Promise<RoutingResult> {
    const startTime = Date.now();

    // Get all registered skills
    const skills = await this.getSkills();
    
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

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async getSkills(): Promise<SkillDefinition[]> {
    // Get skills from registry using getAll() method
    return this.skillRegistry.getAll();
  }

  private async scoreSkill(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): Promise<ScoredSkill> {
    const keywordScore = this.computeKeywordScore(skill, context);
    const intentScore = this.computeIntentScore(skill, context);
    const semanticScore = this.config.semantic 
      ? await this.computeSemanticScore(skill, context)
      : 0;

    // Weighted combination
    const score = this.config.semantic
      ? (semanticScore * this.config.semanticWeight) + 
        (keywordScore * this.config.keywordWeight * 0.5) +
        (intentScore * (1 - this.config.semanticWeight - this.config.keywordWeight * 0.5))
      : (keywordScore * 0.4) + (intentScore * 0.6);

    // Build reasoning
    const reasoning = this.buildReasoning(skill, { keywordScore, intentScore, semanticScore, score });

    return {
      skill,
      score: Math.min(score, 1.0),
      keywordScore,
      intentScore,
      semanticScore,
      reasoning,
    };
  }

  private computeKeywordScore(skill: SkillDefinition, context: OrchestrationContext): number {
    const messageWords = context.userMessage.toLowerCase().split(/\s+/);
    const skillKeywords = skill.triggers.keywords.map(k => k.toLowerCase());

    if (skillKeywords.length === 0) return 0;

    let matches = 0;
    for (const keyword of skillKeywords) {
      if (messageWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        matches++;
      }
    }

    // Also check patterns if available
    if (skill.triggers.patterns) {
      for (const pattern of skill.triggers.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(context.userMessage)) {
            matches += 2; // Patterns count more
          }
        } catch {
          // Invalid pattern, skip
        }
      }
    }

    return Math.min(matches / Math.max(skillKeywords.length, 1), 1.0);
  }

  private computeIntentScore(skill: SkillDefinition, context: OrchestrationContext): number {
    const detectedIntent = context.intent.type;
    const skillIntents = skill.triggers.intents;

    if (skillIntents.length === 0) return 0.3; // No intent specified = generic skill

    // Direct match
    if (skillIntents.includes(detectedIntent)) {
      return context.intent.confidence;
    }

    // Related intent mapping (partial matches)
    const relatedIntents: Record<string, string[]> = {
      code: ['create', 'fix', 'refactor', 'test'],
      fix: ['code', 'analyze'],
      analyze: ['code', 'review'],
      refactor: ['code', 'fix'],
      test: ['code'],
      plan: ['design', 'create'],
      research: ['analyze'],
    };

    const related = relatedIntents[detectedIntent] || [];
    for (const intent of skillIntents) {
      if (related.includes(intent)) {
        return context.intent.confidence * 0.6; // Partial match
      }
    }

    return 0;
  }

  private async computeSemanticScore(
    skill: SkillDefinition,
    context: OrchestrationContext
  ): Promise<number> {
    // For now, use a simple approximation
    // TODO: Integrate with actual embedding service from @tooloo/memory
    
    // Combine skill text for comparison
    const skillText = [
      skill.name,
      skill.description,
      ...skill.triggers.keywords,
    ].join(' ').toLowerCase();

    const messageText = context.userMessage.toLowerCase();

    // Simple word overlap as semantic approximation
    const skillWords = new Set(skillText.split(/\s+/));
    const messageWords = messageText.split(/\s+/);

    let overlap = 0;
    for (const word of messageWords) {
      if (skillWords.has(word) && word.length > 3) {
        overlap++;
      }
    }

    return Math.min(overlap / Math.max(messageWords.length, 1) * 2, 1.0);
  }

  private buildReasoning(
    skill: SkillDefinition,
    scores: { keywordScore: number; intentScore: number; semanticScore: number; score: number }
  ): string {
    const parts: string[] = [];

    if (scores.intentScore > 0.5) {
      parts.push(`Intent match: ${(scores.intentScore * 100).toFixed(0)}%`);
    }
    if (scores.keywordScore > 0.3) {
      parts.push(`Keyword match: ${(scores.keywordScore * 100).toFixed(0)}%`);
    }
    if (this.config.semantic && scores.semanticScore > 0.3) {
      parts.push(`Semantic similarity: ${(scores.semanticScore * 100).toFixed(0)}%`);
    }

    if (parts.length === 0) {
      return `Selected ${skill.name} as fallback (score: ${(scores.score * 100).toFixed(0)}%)`;
    }

    return `Selected ${skill.name}: ${parts.join(', ')}`;
  }

  private createFallbackResult(startTime: number): RoutingResult {
    // Create a default chat skill for fallback
    const defaultSkill: SkillDefinition = {
      id: 'default-chat' as any,
      name: 'Default Chat',
      version: '1.0.0',
      description: 'General conversational assistant',
      instructions: 'You are TooLoo, a helpful AI assistant created by TooLoo.ai. You are friendly, knowledgeable, and concise. Help users with their questions and tasks.',
      tools: [],
      triggers: {
        intents: ['chat', 'unknown'],
        keywords: [],
      },
      context: {
        maxTokens: 4096,
        ragSources: ['memory'],
        memoryScope: 'session',
      },
      composability: {
        requires: [],
        enhances: [],
        conflicts: [],
      },
    };

    return {
      skill: defaultSkill,
      confidence: 0.5,
      alternatives: [],
      reasoning: 'No matching skill found, using default chat',
      routingTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a routing engine with default configuration
 */
export function createRoutingEngine(
  skillRegistry: SkillRegistry,
  config?: Partial<RoutingConfig>
): RoutingEngine {
  const defaultConfig: RoutingConfig = {
    semantic: true,
    minConfidence: 0.6,
    semanticWeight: 0.6,
    keywordWeight: 0.4,
  };

  return new RoutingEngine(skillRegistry, { ...defaultConfig, ...config });
}
