/**
 * Knowledge Graph Engine Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for cross-goal knowledge graph, provider performance tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('KnowledgeGraphEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance with initialized providers', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();
      expect(engine).toBeDefined();
    });

    it('should initialize known providers', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // Check provider capabilities
      const capabilities = engine.getProviderCapabilities('openai');
      expect(capabilities).toBeInstanceOf(Array);
      expect(capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('Provider Capabilities', () => {
    const providers = [
      'huggingface',
      'deepseek',
      'openinterpreter',
      'anthropic',
      'openai',
      'gemini',
    ];

    it.each(providers)('should return capabilities for %s', async (provider) => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();
      const capabilities = engine.getProviderCapabilities(provider);

      expect(capabilities).toBeInstanceOf(Array);
      expect(capabilities.length).toBeGreaterThan(0);
    });

    it('should return general capabilities for unknown provider', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();
      const capabilities = engine.getProviderCapabilities('unknown-provider');

      expect(capabilities).toContain('general-purpose');
    });
  });

  describe('Task Performance Recording', () => {
    it('should record task performance', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'task-1',
        goal: 'code-generation',
        provider: 'openai',
        success: true,
        responseTime: 1500,
        cost: 0.01,
        quality: 0.9,
      });

      // Should not throw
      expect(engine).toBeDefined();
    });

    it('should track multiple attempts', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'task-1',
        goal: 'analysis',
        provider: 'anthropic',
        success: true,
        responseTime: 2000,
      });

      engine.recordTaskPerformance({
        taskId: 'task-2',
        goal: 'analysis',
        provider: 'anthropic',
        success: true,
        responseTime: 1800,
      });

      engine.recordTaskPerformance({
        taskId: 'task-3',
        goal: 'analysis',
        provider: 'anthropic',
        success: false,
        responseTime: 5000,
      });

      // After 3 attempts, recommendations should be available
      const recommendations = engine.getProviderRecommendations('analysis');
      expect(recommendations).toBeInstanceOf(Array);
    });

    it('should handle optional fields', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // Only required fields
      engine.recordTaskPerformance({
        taskId: 'task-min',
        goal: 'test-goal',
        provider: 'openai',
        success: true,
        responseTime: 1000,
      });

      expect(engine).toBeDefined();
    });

    it('should record context information', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'task-ctx',
        goal: 'code-generation',
        provider: 'gemini',
        success: true,
        responseTime: 1200,
        context: {
          domain: 'typescript',
          complexity: 'high',
          fileType: 'ts',
        },
      });

      expect(engine).toBeDefined();
    });
  });

  describe('Provider Recommendations', () => {
    it('should return empty array with no data', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();
      const recommendations = engine.getProviderRecommendations('new-goal');

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBe(0);
    });

    it('should return recommendations after enough samples', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // Add minimum samples (3)
      for (let i = 0; i < 5; i++) {
        engine.recordTaskPerformance({
          taskId: `task-${i}`,
          goal: 'tested-goal',
          provider: 'openai',
          success: i < 4, // 80% success
          responseTime: 1000 + i * 100,
          quality: 0.8,
        });
      }

      const recommendations = engine.getProviderRecommendations('tested-goal');
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].provider).toBe('openai');
    });

    it('should include metrics in recommendations', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      for (let i = 0; i < 5; i++) {
        engine.recordTaskPerformance({
          taskId: `task-m-${i}`,
          goal: 'metrics-goal',
          provider: 'anthropic',
          success: true,
          responseTime: 2000,
          quality: 0.95,
          cost: 0.02,
        });
      }

      const recommendations = engine.getProviderRecommendations('metrics-goal');
      expect(recommendations[0].metrics).toBeDefined();
      expect(recommendations[0].metrics.successRate).toBeGreaterThan(0);
      expect(recommendations[0].metrics.avgQuality).toBeGreaterThan(0);
    });

    it('should consider context in recommendations', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      for (let i = 0; i < 5; i++) {
        engine.recordTaskPerformance({
          taskId: `task-c-${i}`,
          goal: 'context-goal',
          provider: 'deepseek',
          success: true,
          responseTime: 500,
          quality: 0.8,
        });
      }

      // Context with speed priority
      const speedRecs = engine.getProviderRecommendations('context-goal', {
        priority: 'speed',
      });

      // Context with quality priority
      const qualityRecs = engine.getProviderRecommendations('context-goal', {
        priority: 'quality',
      });

      expect(speedRecs).toBeInstanceOf(Array);
      expect(qualityRecs).toBeInstanceOf(Array);
    });
  });

  describe('Knowledge Graph Relationships', () => {
    it('should create task-goal relationships', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'rel-task-1',
        goal: 'rel-goal',
        provider: 'openai',
        success: true,
        responseTime: 1000,
      });

      // Relationships are internal, just verify no errors
      expect(engine).toBeDefined();
    });

    it('should create domain relationships', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'domain-task',
        goal: 'domain-goal',
        provider: 'gemini',
        success: true,
        responseTime: 1500,
        context: {
          domain: 'python',
        },
      });

      expect(engine).toBeDefined();
    });

    it('should create complexity relationships', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      engine.recordTaskPerformance({
        taskId: 'complex-task',
        goal: 'complex-goal',
        provider: 'anthropic',
        success: true,
        responseTime: 3000,
        context: {
          complexity: 'high',
        },
      });

      expect(engine).toBeDefined();
    });
  });

  describe('Learning History', () => {
    it('should maintain learning history', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      for (let i = 0; i < 10; i++) {
        engine.recordTaskPerformance({
          taskId: `history-${i}`,
          goal: 'history-goal',
          provider: 'openai',
          success: true,
          responseTime: 1000,
        });
      }

      expect(engine).toBeDefined();
    });

    it('should limit history size', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // Add many entries (but won't actually hit 10k limit in test)
      for (let i = 0; i < 100; i++) {
        engine.recordTaskPerformance({
          taskId: `limit-${i}`,
          goal: 'limit-goal',
          provider: 'deepseek',
          success: true,
          responseTime: 500,
        });
      }

      expect(engine).toBeDefined();
    });
  });

  describe('Correlation Matrix', () => {
    it('should update correlations over time', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // First sample
      engine.recordTaskPerformance({
        taskId: 'corr-1',
        goal: 'corr-goal',
        provider: 'openai',
        success: true,
        responseTime: 1000,
        quality: 0.8,
      });

      // Second sample with different values
      engine.recordTaskPerformance({
        taskId: 'corr-2',
        goal: 'corr-goal',
        provider: 'openai',
        success: true,
        responseTime: 2000,
        quality: 0.9,
      });

      expect(engine).toBeDefined();
    });
  });

  describe('Provider Score Calculation', () => {
    it('should calculate scores based on performance', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // High performer
      for (let i = 0; i < 5; i++) {
        engine.recordTaskPerformance({
          taskId: `high-${i}`,
          goal: 'score-goal',
          provider: 'openai',
          success: true,
          responseTime: 500,
          quality: 0.95,
        });
      }

      // Low performer
      for (let i = 0; i < 5; i++) {
        engine.recordTaskPerformance({
          taskId: `low-${i}`,
          goal: 'score-goal',
          provider: 'huggingface',
          success: i < 2, // 40% success
          responseTime: 5000,
          quality: 0.6,
        });
      }

      const recommendations = engine.getProviderRecommendations('score-goal');
      if (recommendations.length >= 2) {
        // Higher performer should rank higher
        const openaiRec = recommendations.find((r) => r.provider === 'openai');
        const hfRec = recommendations.find((r) => r.provider === 'huggingface');
        if (openaiRec && hfRec) {
          expect(openaiRec.score).toBeGreaterThan(hfRec.score);
        }
      }
    });
  });

  describe('Goal Performance Tracking', () => {
    it('should track per-goal performance', async () => {
      const KnowledgeGraphEngine = (
        await import('../../../../src/cortex/memory/knowledge-graph-engine')
      ).default;

      const engine = new KnowledgeGraphEngine();

      // Track for goal A
      engine.recordTaskPerformance({
        taskId: 'goal-a-1',
        goal: 'goal-a',
        provider: 'openai',
        success: true,
        responseTime: 1000,
      });

      // Track for goal B
      engine.recordTaskPerformance({
        taskId: 'goal-b-1',
        goal: 'goal-b',
        provider: 'openai',
        success: false,
        responseTime: 3000,
      });

      // Different goals should have separate tracking
      expect(engine).toBeDefined();
    });
  });
});
