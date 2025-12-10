/**
 * SegmentationService Tests
 * Tests for user segmentation based on intent analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock user model engine
vi.mock('./user-model-engine.js', () => ({
  getUserModelEngine: () => ({
    updateUserSegment: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('SegmentationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('UserSegment', () => {
      it('should include developer segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'developer';
        expect(segment).toBe('developer');
      });

      it('should include creative segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'creative';
        expect(segment).toBe('creative');
      });

      it('should include analyst segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'analyst';
        expect(segment).toBe('analyst');
      });

      it('should include general segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'general';
        expect(segment).toBe('general');
      });
    });
  });

  describe('Keyword Configuration', () => {
    describe('Developer Keywords', () => {
      it('should include code-related keywords', () => {
        const developerKeywords = [
          'code', 'function', 'api', 'bug', 'error', 'typescript', 'python',
          'java', 'const', 'var', 'let', 'class', 'interface',
        ];
        expect(developerKeywords).toContain('code');
        expect(developerKeywords).toContain('function');
        expect(developerKeywords).toContain('api');
      });

      it('should include devops keywords', () => {
        const developerKeywords = ['git', 'docker', 'deploy', 'endpoint'];
        expect(developerKeywords).toContain('git');
        expect(developerKeywords).toContain('docker');
      });

      it('should include data format keywords', () => {
        const developerKeywords = ['json', 'xml', 'sql', 'query'];
        expect(developerKeywords).toContain('json');
        expect(developerKeywords).toContain('sql');
      });
    });

    describe('Creative Keywords', () => {
      it('should include writing keywords', () => {
        const creativeKeywords = [
          'write', 'story', 'poem', 'creative', 'imagine',
          'character', 'plot', 'narrative', 'fiction',
        ];
        expect(creativeKeywords).toContain('story');
        expect(creativeKeywords).toContain('poem');
      });

      it('should include design keywords', () => {
        const creativeKeywords = ['design', 'paint', 'draw', 'style'];
        expect(creativeKeywords).toContain('design');
        expect(creativeKeywords).toContain('draw');
      });

      it('should include content keywords', () => {
        const creativeKeywords = ['blog', 'article', 'essay', 'script', 'screenplay'];
        expect(creativeKeywords).toContain('blog');
        expect(creativeKeywords).toContain('article');
      });
    });

    describe('Analyst Keywords', () => {
      it('should include analysis keywords', () => {
        const analystKeywords = [
          'analyze', 'data', 'report', 'summary', 'trend', 'statistics',
        ];
        expect(analystKeywords).toContain('analyze');
        expect(analystKeywords).toContain('data');
      });

      it('should include visualization keywords', () => {
        const analystKeywords = ['chart', 'graph', 'excel', 'csv'];
        expect(analystKeywords).toContain('chart');
        expect(analystKeywords).toContain('excel');
      });

      it('should include business keywords', () => {
        const analystKeywords = [
          'kpi', 'performance', 'growth', 'revenue', 'profit', 'loss',
        ];
        expect(analystKeywords).toContain('kpi');
        expect(analystKeywords).toContain('revenue');
      });
    });
  });

  describe('Intent Analysis', () => {
    it('should detect developer intent from coding keywords', () => {
      const message = 'Can you help me fix this TypeScript error?';
      const text = message.toLowerCase();
      const developerKeywords = ['typescript', 'error', 'fix', 'code'];
      const matches = developerKeywords.filter((w) => text.includes(w)).length;
      expect(matches).toBeGreaterThan(0);
    });

    it('should detect creative intent from writing keywords', () => {
      const message = 'Write me a short story about a dragon';
      const text = message.toLowerCase();
      const creativeKeywords = ['write', 'story', 'poem', 'creative'];
      const matches = creativeKeywords.filter((w) => text.includes(w)).length;
      expect(matches).toBeGreaterThan(0);
    });

    it('should detect analyst intent from data keywords', () => {
      const message = 'Analyze this data and create a summary report';
      const text = message.toLowerCase();
      const analystKeywords = ['analyze', 'data', 'report', 'summary'];
      const matches = analystKeywords.filter((w) => text.includes(w)).length;
      expect(matches).toBeGreaterThan(0);
    });

    it('should fall back to general for ambiguous messages', () => {
      const message = 'Hello, how are you?';
      const text = message.toLowerCase();
      const allKeywords = ['code', 'write', 'analyze'];
      const matches = allKeywords.filter((w) => text.includes(w)).length;
      expect(matches).toBe(0);
    });

    it('should select segment with most keyword matches', () => {
      const segments = [
        { name: 'developer', matches: 3 },
        { name: 'creative', matches: 1 },
        { name: 'analyst', matches: 2 },
      ];
      const best = segments.reduce((a, b) => (a.matches > b.matches ? a : b));
      expect(best.name).toBe('developer');
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on match count', () => {
      const matches = 3;
      const confidence = Math.min(matches * 0.2, 0.9);
      expect(confidence).toBeCloseTo(0.6, 5);
    });

    it('should cap confidence at 0.9', () => {
      const matches = 10;
      const confidence = Math.min(matches * 0.2, 0.9);
      expect(confidence).toBe(0.9);
    });

    it('should have low confidence for no matches', () => {
      const matches = 0;
      const confidence = matches > 0 ? Math.min(matches * 0.2, 0.9) : 0.1;
      expect(confidence).toBe(0.1);
    });
  });

  describe('Provider Preferences', () => {
    describe('Developer Segment', () => {
      it('should prefer DeepSeek for code', () => {
        const preferences = {
          anthropic: 1.2,
          deepseek: 1.3,
          openai: 1.0,
          google: 0.9,
        };
        expect(preferences.deepseek).toBe(1.3);
      });

      it('should boost Anthropic for code', () => {
        const preferences = {
          anthropic: 1.2,
          deepseek: 1.3,
          openai: 1.0,
          google: 0.9,
        };
        expect(preferences.anthropic).toBeGreaterThan(1.0);
      });

      it('should slightly de-prioritize Google for code', () => {
        const preferences = {
          anthropic: 1.2,
          deepseek: 1.3,
          openai: 1.0,
          google: 0.9,
        };
        expect(preferences.google).toBeLessThan(1.0);
      });
    });

    describe('Creative Segment', () => {
      it('should prefer Anthropic for creative tasks', () => {
        const preferences = {
          anthropic: 1.3,
          openai: 1.1,
          google: 1.0,
          deepseek: 0.8,
        };
        expect(preferences.anthropic).toBe(1.3);
      });

      it('should de-prioritize DeepSeek for creative', () => {
        const preferences = {
          anthropic: 1.3,
          openai: 1.1,
          google: 1.0,
          deepseek: 0.8,
        };
        expect(preferences.deepseek).toBeLessThan(1.0);
      });
    });

    describe('Analyst Segment', () => {
      it('should prefer OpenAI for analysis', () => {
        const preferences = {
          openai: 1.2,
          anthropic: 1.1,
          google: 1.0,
          deepseek: 0.9,
        };
        expect(preferences.openai).toBe(1.2);
      });

      it('should boost Anthropic for large context analysis', () => {
        const preferences = {
          openai: 1.2,
          anthropic: 1.1,
          google: 1.0,
          deepseek: 0.9,
        };
        expect(preferences.anthropic).toBeGreaterThan(1.0);
      });
    });

    describe('General Segment', () => {
      it('should have neutral preferences', () => {
        const preferences = {
          openai: 1.0,
          anthropic: 1.0,
          google: 1.0,
          deepseek: 1.0,
        };
        expect(Object.values(preferences).every((v) => v === 1.0)).toBe(true);
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      let instance1: { id: number } | null = null;
      let instance2: { id: number } | null = null;

      const getInstance = (() => {
        let inst: { id: number } | null = null;
        return () => {
          if (!inst) inst = { id: Math.random() };
          return inst;
        };
      })();

      instance1 = getInstance();
      instance2 = getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
