// @version 3.3.577
/**
 * Skill Router Tests with Real Embeddings
 * Tests the SkillRouter with actual embedding providers
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { SkillDefinition, SkillId } from '../../packages/skills/src/types.js';

// Mock skill registry for testing
class MockSkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }
}

// Test skills
const testSkills: SkillDefinition[] = [
  {
    id: 'code-gen' as SkillId,
    name: 'Code Generator',
    version: '1.0.0',
    description: 'Generate code in various programming languages',
    instructions: 'You are an expert programmer. Write clean, efficient code.',
    tools: [],
    triggers: {
      intents: ['code', 'create'],
      keywords: ['code', 'function', 'implement', 'write', 'program', 'typescript', 'javascript'],
      patterns: ['write.*function', 'create.*class', 'implement.*interface'],
    },
    context: {
      maxTokens: 4096,
      ragSources: [],
      memoryScope: 'session',
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
    },
  },
  {
    id: 'docs-gen' as SkillId,
    name: 'Documentation Generator',
    version: '1.0.0',
    description: 'Generate documentation and explanations',
    instructions: 'You are a technical writer. Create clear, comprehensive documentation.',
    tools: [],
    triggers: {
      intents: ['explain', 'document'],
      keywords: ['explain', 'document', 'readme', 'description', 'overview', 'guide'],
      patterns: ['explain.*how', 'write.*documentation', 'create.*readme'],
    },
    context: {
      maxTokens: 4096,
      ragSources: [],
      memoryScope: 'session',
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
    },
  },
  {
    id: 'code-review' as SkillId,
    name: 'Code Reviewer',
    version: '1.0.0',
    description: 'Review code for bugs, improvements, and best practices',
    instructions: 'You are a senior code reviewer. Find issues and suggest improvements.',
    tools: [],
    triggers: {
      intents: ['review', 'analyze'],
      keywords: ['review', 'check', 'audit', 'analyze', 'bug', 'issue', 'improve'],
      patterns: ['review.*code', 'check.*for.*bugs', 'analyze.*performance'],
    },
    context: {
      maxTokens: 4096,
      ragSources: [],
      memoryScope: 'session',
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
    },
  },
  {
    id: 'refactor' as SkillId,
    name: 'Code Refactorer',
    version: '1.0.0',
    description: 'Refactor and improve existing code',
    instructions: 'You are a refactoring expert. Improve code without changing behavior.',
    tools: [],
    triggers: {
      intents: ['refactor', 'improve'],
      keywords: ['refactor', 'optimize', 'improve', 'clean', 'restructure', 'simplify'],
      patterns: ['refactor.*code', 'optimize.*function', 'clean.*up'],
    },
    context: {
      maxTokens: 4096,
      ragSources: [],
      memoryScope: 'session',
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
    },
  },
];

describe('SkillRouter Integration', () => {
  let registry: MockSkillRegistry;
  let embedFn: (text: string) => Promise<number[]>;

  beforeEach(async () => {
    // Setup registry
    registry = new MockSkillRegistry();
    testSkills.forEach(skill => registry.register(skill));

    // Use local embedding provider
    const { LocalEmbeddingProvider } = await import(
      '../../packages/providers/src/embeddings.js'
    );
    const provider = new LocalEmbeddingProvider(384);
    embedFn = (text: string) => provider.embed(text);
  });

  describe('Skill Matching', () => {
    it('should produce different scores for different skills', async () => {
      // This test verifies the embedding infrastructure works
      // The local TF-IDF provider has limited semantic understanding
      // but should produce varying scores across skills
      const query = 'Write a TypeScript function to sort an array';
      const queryEmbed = await embedFn(query);
      const scores: Array<{ skillId: string; score: number }> = [];

      for (const skill of testSkills) {
        const skillText = [
          skill.name,
          skill.description,
          skill.instructions,
          ...skill.triggers.keywords,
        ].join(' ');
        
        const skillEmbed = await embedFn(skillText);
        const score = cosineSimilarity(queryEmbed, skillEmbed);
        scores.push({ skillId: skill.id, score });
      }

      // All scores should be between 0 and 1
      scores.forEach(s => {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(1);
      });

      // Scores should not all be identical (system is differentiating)
      const uniqueScores = new Set(scores.map(s => s.score.toFixed(4)));
      expect(uniqueScores.size).toBeGreaterThan(1);
    });

    it('should consistently rank skills for the same query', async () => {
      const query = 'Review this code for bugs';
      
      // Run ranking twice
      const rankings: string[][] = [];
      
      for (let i = 0; i < 2; i++) {
        const queryEmbed = await embedFn(query);
        const scores: Array<{ skillId: string; score: number }> = [];

        for (const skill of testSkills) {
          const skillText = [skill.name, skill.description, ...skill.triggers.keywords].join(' ');
          const skillEmbed = await embedFn(skillText);
          const score = cosineSimilarity(queryEmbed, skillEmbed);
          scores.push({ skillId: skill.id, score });
        }

        scores.sort((a, b) => b.score - a.score);
        rankings.push(scores.map(s => s.skillId));
      }

      // Rankings should be consistent
      expect(rankings[0]).toEqual(rankings[1]);
    });

    it('should match review queries to code-review skill', async () => {
      // This test uses a query with clear "review" intent
      const queries = [
        'Review this code for bugs',
        'Check this function for issues',
        'Analyze and audit this code',
      ];

      for (const query of queries) {
        const queryEmbed = await embedFn(query);
        let bestMatch = { skill: testSkills[0]!, score: -1 };

        for (const skill of testSkills) {
          const skillText = [
            skill.name,
            skill.description,
            skill.instructions,
            ...skill.triggers.keywords,
          ].join(' ');
          
          const skillEmbed = await embedFn(skillText);
          const score = cosineSimilarity(queryEmbed, skillEmbed);

          if (score > bestMatch.score) {
            bestMatch = { skill, score };
          }
        }

        expect(bestMatch.skill.id).toBe('code-review');
      }
    });

    it('should rank refactor skill high for optimization queries', async () => {
      const queries = [
        'Refactor this messy function',
        'Optimize and improve this code',
        'Clean up and restructure this',
      ];

      for (const query of queries) {
        const queryEmbed = await embedFn(query);
        const scores: Array<{ skill: typeof testSkills[0]; score: number }> = [];

        for (const skill of testSkills) {
          const skillText = [
            skill.name,
            skill.description,
            skill.instructions,
            ...skill.triggers.keywords,
          ].join(' ');
          
          const skillEmbed = await embedFn(skillText);
          const score = cosineSimilarity(queryEmbed, skillEmbed);
          scores.push({ skill, score });
        }

        scores.sort((a, b) => b.score - a.score);
        
        // Refactor skill should be in top 3
        const top3 = scores.slice(0, 3).map(s => s.skill.id);
        expect(top3).toContain('refactor');
      }
    });
  });

  describe('Confidence Scores', () => {
    it('should return higher confidence for clear matches', async () => {
      const clearQuery = 'Write a JavaScript function';
      const ambiguousQuery = 'Help me with my project';

      const clearEmbed = await embedFn(clearQuery);
      const ambiguousEmbed = await embedFn(ambiguousQuery);

      const codeSkill = testSkills.find(s => s.id === 'code-gen')!;
      const skillText = [
        codeSkill.name,
        codeSkill.description,
        ...codeSkill.triggers.keywords,
      ].join(' ');
      const skillEmbed = await embedFn(skillText);

      const clearScore = cosineSimilarity(clearEmbed, skillEmbed);
      const ambiguousScore = cosineSimilarity(ambiguousEmbed, skillEmbed);

      expect(clearScore).toBeGreaterThan(ambiguousScore);
    });

    it('should return positive scores for all skills', async () => {
      const query = 'Help me with coding';
      const queryEmbed = await embedFn(query);

      for (const skill of testSkills) {
        const skillText = [skill.name, skill.description, ...skill.triggers.keywords].join(' ');
        const skillEmbed = await embedFn(skillText);
        const score = cosineSimilarity(queryEmbed, skillEmbed);

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', async () => {
      const queryEmbed = await embedFn('');
      expect(queryEmbed.length).toBe(384);
    });

    it('should handle very long query', async () => {
      const longQuery = 'Write a function '.repeat(100);
      const queryEmbed = await embedFn(longQuery);
      expect(queryEmbed.length).toBe(384);
    });

    it('should handle special characters', async () => {
      const specialQuery = 'Write a function that handles @#$%^&*() characters';
      const queryEmbed = await embedFn(specialQuery);
      expect(queryEmbed.length).toBe(384);
    });

    it('should handle unicode text', async () => {
      const unicodeQuery = 'Write a function for 日本語 text processing';
      const queryEmbed = await embedFn(unicodeQuery);
      expect(queryEmbed.length).toBe(384);
    });
  });
});

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
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
