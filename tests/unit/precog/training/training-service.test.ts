// @version 3.3.573
// Tests for TooLoo.ai Training Service
// Training camp and learning management tests

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type definitions from training service
interface FeedbackEntry {
  id: string;
  quality: number;
  relevance: number;
  clarity: number;
  provider: string;
  helpful: boolean | null;
  comment: string;
  timestamp: number;
  averageScore: number;
}

interface InteractionEntry {
  userId: string;
  engaged: boolean;
  [key: string]: unknown;
}

interface FeedbackStore {
  feedback: FeedbackEntry[];
  count: number;
  interactions: InteractionEntry[];
  lastUpdated: number;
}

interface ProviderMetrics {
  totalRequests: number;
  averageLatency: number;
  averageQuality: number;
  totalCost: number;
}

interface MetricsStore {
  providers: Record<string, ProviderMetrics>;
  responses: MetricsData[];
  averageQuality: number;
  lastUpdated: number;
}

interface MetricsData {
  responseId: string;
  provider: string;
  latency: number;
  tokensUsed: number;
  costEstimate: number;
  quality: number;
  timestamp: number;
}

interface TopicData {
  key?: string;
  id?: string;
  topic?: string;
  name?: string;
  problems?: unknown[];
  background?: boolean;
  force?: boolean;
}

interface Domain {
  name: string;
  mastery: number;
}

describe('Training Service', () => {
  describe('FeedbackEntry Interface', () => {
    it('should validate basic feedback entry', () => {
      const entry: FeedbackEntry = {
        id: 'fb-001',
        quality: 0.85,
        relevance: 0.9,
        clarity: 0.8,
        provider: 'openai',
        helpful: true,
        comment: 'Good response',
        timestamp: Date.now(),
        averageScore: 0.85,
      };

      expect(entry.id).toBe('fb-001');
      expect(entry.quality).toBe(0.85);
      expect(entry.provider).toBe('openai');
    });

    it('should allow null helpful status', () => {
      const entry: FeedbackEntry = {
        id: 'fb-002',
        quality: 0.7,
        relevance: 0.7,
        clarity: 0.7,
        provider: 'anthropic',
        helpful: null,
        comment: '',
        timestamp: Date.now(),
        averageScore: 0.7,
      };

      expect(entry.helpful).toBeNull();
    });

    it('should calculate average score correctly', () => {
      const quality = 0.8;
      const relevance = 0.9;
      const clarity = 0.7;
      const avgScore = (quality + relevance + clarity) / 3;

      expect(avgScore).toBeCloseTo(0.8, 1);
    });

    it('should support negative feedback', () => {
      const entry: FeedbackEntry = {
        id: 'fb-003',
        quality: 0.3,
        relevance: 0.4,
        clarity: 0.5,
        provider: 'openai',
        helpful: false,
        comment: 'Not helpful',
        timestamp: Date.now(),
        averageScore: 0.4,
      };

      expect(entry.helpful).toBe(false);
      expect(entry.averageScore).toBeLessThan(0.5);
    });
  });

  describe('InteractionEntry Interface', () => {
    it('should validate basic interaction', () => {
      const interaction: InteractionEntry = {
        userId: 'user-001',
        engaged: true,
      };

      expect(interaction.userId).toBe('user-001');
      expect(interaction.engaged).toBe(true);
    });

    it('should support additional properties', () => {
      const interaction: InteractionEntry = {
        userId: 'user-002',
        engaged: false,
        sessionDuration: 300,
        messageCount: 5,
        topic: 'coding',
      };

      expect(interaction.sessionDuration).toBe(300);
      expect(interaction.messageCount).toBe(5);
    });
  });

  describe('FeedbackStore Interface', () => {
    it('should validate empty feedback store', () => {
      const store: FeedbackStore = {
        feedback: [],
        count: 0,
        interactions: [],
        lastUpdated: Date.now(),
      };

      expect(store.feedback).toHaveLength(0);
      expect(store.count).toBe(0);
    });

    it('should track multiple feedback entries', () => {
      const store: FeedbackStore = {
        feedback: [
          { id: 'fb-1', quality: 0.8, relevance: 0.8, clarity: 0.8, provider: 'openai', helpful: true, comment: '', timestamp: Date.now(), averageScore: 0.8 },
          { id: 'fb-2', quality: 0.9, relevance: 0.9, clarity: 0.9, provider: 'anthropic', helpful: true, comment: '', timestamp: Date.now(), averageScore: 0.9 },
        ],
        count: 2,
        interactions: [],
        lastUpdated: Date.now(),
      };

      expect(store.feedback).toHaveLength(2);
      expect(store.count).toBe(2);
    });

    it('should track interactions', () => {
      const store: FeedbackStore = {
        feedback: [],
        count: 0,
        interactions: [
          { userId: 'user-1', engaged: true },
          { userId: 'user-2', engaged: false },
        ],
        lastUpdated: Date.now(),
      };

      expect(store.interactions).toHaveLength(2);
    });
  });

  describe('ProviderMetrics Interface', () => {
    it('should validate provider metrics', () => {
      const metrics: ProviderMetrics = {
        totalRequests: 100,
        averageLatency: 500,
        averageQuality: 0.85,
        totalCost: 1.50,
      };

      expect(metrics.totalRequests).toBe(100);
      expect(metrics.averageLatency).toBe(500);
      expect(metrics.averageQuality).toBe(0.85);
      expect(metrics.totalCost).toBe(1.50);
    });

    it('should handle zero requests', () => {
      const metrics: ProviderMetrics = {
        totalRequests: 0,
        averageLatency: 0,
        averageQuality: 0,
        totalCost: 0,
      };

      expect(metrics.totalRequests).toBe(0);
    });

    it('should track high-volume providers', () => {
      const metrics: ProviderMetrics = {
        totalRequests: 10000,
        averageLatency: 250,
        averageQuality: 0.92,
        totalCost: 150.00,
      };

      expect(metrics.totalRequests).toBe(10000);
      expect(metrics.averageQuality).toBeGreaterThan(0.9);
    });
  });

  describe('MetricsStore Interface', () => {
    it('should validate empty metrics store', () => {
      const store: MetricsStore = {
        providers: {},
        responses: [],
        averageQuality: 0,
        lastUpdated: Date.now(),
      };

      expect(Object.keys(store.providers)).toHaveLength(0);
      expect(store.responses).toHaveLength(0);
    });

    it('should track multiple providers', () => {
      const store: MetricsStore = {
        providers: {
          openai: { totalRequests: 50, averageLatency: 400, averageQuality: 0.85, totalCost: 0.75 },
          anthropic: { totalRequests: 30, averageLatency: 500, averageQuality: 0.90, totalCost: 0.50 },
          gemini: { totalRequests: 20, averageLatency: 300, averageQuality: 0.80, totalCost: 0.25 },
        },
        responses: [],
        averageQuality: 0.85,
        lastUpdated: Date.now(),
      };

      expect(Object.keys(store.providers)).toHaveLength(3);
    });

    it('should track response metrics', () => {
      const store: MetricsStore = {
        providers: {},
        responses: [
          { responseId: 'r1', provider: 'openai', latency: 400, tokensUsed: 500, costEstimate: 0.01, quality: 0.9, timestamp: Date.now() },
          { responseId: 'r2', provider: 'anthropic', latency: 500, tokensUsed: 600, costEstimate: 0.02, quality: 0.85, timestamp: Date.now() },
        ],
        averageQuality: 0.875,
        lastUpdated: Date.now(),
      };

      expect(store.responses).toHaveLength(2);
    });
  });

  describe('MetricsData Interface', () => {
    it('should validate metrics data', () => {
      const data: MetricsData = {
        responseId: 'resp-001',
        provider: 'openai',
        latency: 450,
        tokensUsed: 750,
        costEstimate: 0.015,
        quality: 0.88,
        timestamp: Date.now(),
      };

      expect(data.responseId).toBe('resp-001');
      expect(data.provider).toBe('openai');
      expect(data.latency).toBe(450);
    });

    it('should track token usage', () => {
      const data: MetricsData = {
        responseId: 'resp-002',
        provider: 'anthropic',
        latency: 600,
        tokensUsed: 1500,
        costEstimate: 0.03,
        quality: 0.92,
        timestamp: Date.now(),
      };

      expect(data.tokensUsed).toBe(1500);
      expect(data.costEstimate).toBe(0.03);
    });

    it('should support low-latency responses', () => {
      const data: MetricsData = {
        responseId: 'resp-003',
        provider: 'gemini',
        latency: 100,
        tokensUsed: 200,
        costEstimate: 0.002,
        quality: 0.75,
        timestamp: Date.now(),
      };

      expect(data.latency).toBeLessThan(200);
    });
  });

  describe('TopicData Interface', () => {
    it('should validate topic with key', () => {
      const topic: TopicData = {
        key: 'typescript',
      };

      expect(topic.key).toBe('typescript');
    });

    it('should validate topic with id', () => {
      const topic: TopicData = {
        id: 'topic-001',
        topic: 'React Hooks',
      };

      expect(topic.id).toBe('topic-001');
      expect(topic.topic).toBe('React Hooks');
    });

    it('should support problems array', () => {
      const topic: TopicData = {
        name: 'JavaScript',
        problems: [
          { id: 'p1', difficulty: 'easy' },
          { id: 'p2', difficulty: 'medium' },
        ],
      };

      expect(topic.problems).toHaveLength(2);
    });

    it('should support background training', () => {
      const topic: TopicData = {
        key: 'performance',
        background: true,
        force: false,
      };

      expect(topic.background).toBe(true);
      expect(topic.force).toBe(false);
    });
  });

  describe('Domain Interface', () => {
    it('should validate domain', () => {
      const domain: Domain = {
        name: 'TypeScript',
        mastery: 0.85,
      };

      expect(domain.name).toBe('TypeScript');
      expect(domain.mastery).toBe(0.85);
    });

    it('should support mastery levels 0-1', () => {
      const novice: Domain = { name: 'Rust', mastery: 0.1 };
      const intermediate: Domain = { name: 'Python', mastery: 0.5 };
      const expert: Domain = { name: 'JavaScript', mastery: 0.95 };

      expect(novice.mastery).toBeLessThan(0.3);
      expect(intermediate.mastery).toBeGreaterThan(0.3);
      expect(intermediate.mastery).toBeLessThan(0.7);
      expect(expert.mastery).toBeGreaterThan(0.9);
    });
  });

  describe('Feedback Calculations', () => {
    function calculateAverageQuality(feedback: FeedbackEntry[]): number {
      if (feedback.length === 0) return 0;
      return feedback.reduce((sum, f) => sum + f.averageScore, 0) / feedback.length;
    }

    it('should calculate average quality', () => {
      const feedback: FeedbackEntry[] = [
        { id: '1', quality: 0.8, relevance: 0.8, clarity: 0.8, provider: 'openai', helpful: true, comment: '', timestamp: 0, averageScore: 0.8 },
        { id: '2', quality: 0.9, relevance: 0.9, clarity: 0.9, provider: 'openai', helpful: true, comment: '', timestamp: 0, averageScore: 0.9 },
      ];

      expect(calculateAverageQuality(feedback)).toBeCloseTo(0.85, 2);
    });

    it('should return 0 for empty feedback', () => {
      expect(calculateAverageQuality([])).toBe(0);
    });

    function getSuccessRate(responses: MetricsData[], threshold = 0.8): number {
      if (responses.length === 0) return 0.75; // Default
      const successes = responses.filter(r => r.quality >= threshold).length;
      return successes / responses.length;
    }

    it('should calculate success rate', () => {
      const responses: MetricsData[] = [
        { responseId: '1', provider: 'openai', latency: 0, tokensUsed: 0, costEstimate: 0, quality: 0.9, timestamp: 0 },
        { responseId: '2', provider: 'openai', latency: 0, tokensUsed: 0, costEstimate: 0, quality: 0.6, timestamp: 0 },
        { responseId: '3', provider: 'openai', latency: 0, tokensUsed: 0, costEstimate: 0, quality: 0.85, timestamp: 0 },
      ];

      expect(getSuccessRate(responses)).toBeCloseTo(0.67, 1);
    });

    it('should default to 0.75 for empty responses', () => {
      expect(getSuccessRate([])).toBe(0.75);
    });
  });

  describe('Provider Comparison', () => {
    interface ProviderComparison {
      provider: string;
      metrics: ProviderMetrics;
      score: number;
    }

    function rankProviders(providers: Record<string, ProviderMetrics>): ProviderComparison[] {
      return Object.entries(providers)
        .map(([provider, metrics]) => ({
          provider,
          metrics,
          score: metrics.averageQuality * 0.6 + (1 - metrics.averageLatency / 1000) * 0.3 - metrics.totalCost * 0.1,
        }))
        .sort((a, b) => b.score - a.score);
    }

    it('should rank providers by score', () => {
      const providers: Record<string, ProviderMetrics> = {
        openai: { totalRequests: 100, averageLatency: 400, averageQuality: 0.85, totalCost: 1.0 },
        anthropic: { totalRequests: 80, averageLatency: 500, averageQuality: 0.90, totalCost: 1.2 },
        gemini: { totalRequests: 50, averageLatency: 300, averageQuality: 0.75, totalCost: 0.5 },
      };

      const ranked = rankProviders(providers);
      expect(ranked[0].provider).toBeDefined();
      expect(ranked).toHaveLength(3);
    });

    it('should handle single provider', () => {
      const providers: Record<string, ProviderMetrics> = {
        openai: { totalRequests: 100, averageLatency: 400, averageQuality: 0.85, totalCost: 1.0 },
      };

      const ranked = rankProviders(providers);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].provider).toBe('openai');
    });
  });

  describe('Training Progress Tracking', () => {
    interface TrainingProgress {
      domainsLearned: number;
      totalDomains: number;
      averageMastery: number;
      sessionsCompleted: number;
    }

    function calculateProgress(domains: Domain[]): TrainingProgress {
      const learned = domains.filter(d => d.mastery >= 0.7).length;
      const avgMastery = domains.reduce((sum, d) => sum + d.mastery, 0) / domains.length;
      
      return {
        domainsLearned: learned,
        totalDomains: domains.length,
        averageMastery: avgMastery,
        sessionsCompleted: Math.floor(avgMastery * domains.length * 10),
      };
    }

    it('should calculate training progress', () => {
      const domains: Domain[] = [
        { name: 'TypeScript', mastery: 0.9 },
        { name: 'Python', mastery: 0.75 },
        { name: 'Rust', mastery: 0.3 },
      ];

      const progress = calculateProgress(domains);
      expect(progress.domainsLearned).toBe(2);
      expect(progress.totalDomains).toBe(3);
      expect(progress.averageMastery).toBeCloseTo(0.65, 1);
    });

    it('should track sessions completed', () => {
      const domains: Domain[] = [
        { name: 'JavaScript', mastery: 0.8 },
      ];

      const progress = calculateProgress(domains);
      expect(progress.sessionsCompleted).toBe(8);
    });
  });
});
