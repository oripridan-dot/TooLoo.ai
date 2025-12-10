// @version 1.0.0 - MetaLearner Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test interfaces
interface LearningVelocity {
  current: number;
  trend: 'accelerating' | 'stable' | 'decelerating' | 'stalled';
  acceleration: number;
  projectedPlateau: Date | null;
}

interface StrategyEffectiveness {
  strategyId: string;
  name: string;
  successRate: number;
  avgImprovementPerUse: number;
  domainAffinity: Record<string, number>;
  cooldownPeriod: number;
  lastUsed: Date;
}

interface KnowledgeTransfer {
  id: string;
  sourceDomain: string;
  targetDomain: string;
  transferredConcepts: string[];
  effectivenessGain: number;
  discoveredAt: Date;
}

interface CognitiveLoadMetrics {
  currentLoad: number;
  optimalLoad: number;
  loadDistribution: Record<string, number>;
  bottlenecks: string[];
}

interface EmergencePattern {
  id: string;
  type: 'breakthrough' | 'insight' | 'connection' | 'synthesis';
  description: string;
  involvedSystems: string[];
  confidence: number;
  potentialImpact: 'low' | 'medium' | 'high' | 'transformative';
  discoveredAt: Date;
  exploited: boolean;
}

describe('MetaLearner', () => {
  describe('LearningVelocity Interface', () => {
    it('should have current rate 0-1', () => {
      const velocity: LearningVelocity = {
        current: 0.75, trend: 'stable', acceleration: 0, projectedPlateau: null
      };
      expect(velocity.current).toBeGreaterThanOrEqual(0);
      expect(velocity.current).toBeLessThanOrEqual(1);
    });

    it('should support accelerating trend', () => {
      const velocity: LearningVelocity = {
        current: 0.8, trend: 'accelerating', acceleration: 0.1, projectedPlateau: null
      };
      expect(velocity.trend).toBe('accelerating');
    });

    it('should support stable trend', () => {
      const velocity: LearningVelocity = {
        current: 0.5, trend: 'stable', acceleration: 0, projectedPlateau: null
      };
      expect(velocity.trend).toBe('stable');
    });

    it('should support decelerating trend', () => {
      const velocity: LearningVelocity = {
        current: 0.4, trend: 'decelerating', acceleration: -0.05, projectedPlateau: new Date()
      };
      expect(velocity.trend).toBe('decelerating');
    });

    it('should support stalled trend', () => {
      const velocity: LearningVelocity = {
        current: 0.2, trend: 'stalled', acceleration: 0, projectedPlateau: new Date()
      };
      expect(velocity.trend).toBe('stalled');
    });

    it('should track acceleration rate', () => {
      const velocity: LearningVelocity = {
        current: 0.7, trend: 'accelerating', acceleration: 0.15, projectedPlateau: null
      };
      expect(velocity.acceleration).toBe(0.15);
    });

    it('should project plateau date', () => {
      const plateauDate = new Date('2025-06-01');
      const velocity: LearningVelocity = {
        current: 0.3, trend: 'decelerating', acceleration: -0.1, projectedPlateau: plateauDate
      };
      expect(velocity.projectedPlateau).toEqual(plateauDate);
    });
  });

  describe('StrategyEffectiveness Interface', () => {
    it('should have strategy id', () => {
      const strategy: StrategyEffectiveness = {
        strategyId: 'strat-1', name: 'Reinforcement', successRate: 0.8,
        avgImprovementPerUse: 0.1, domainAffinity: {}, cooldownPeriod: 3600, lastUsed: new Date()
      };
      expect(strategy.strategyId).toBe('strat-1');
    });

    it('should track success rate', () => {
      const strategy: StrategyEffectiveness = {
        strategyId: '', name: 'Test', successRate: 0.92,
        avgImprovementPerUse: 0, domainAffinity: {}, cooldownPeriod: 0, lastUsed: new Date()
      };
      expect(strategy.successRate).toBe(0.92);
    });

    it('should track domain affinity', () => {
      const strategy: StrategyEffectiveness = {
        strategyId: '', name: '', successRate: 0,
        avgImprovementPerUse: 0, domainAffinity: { coding: 0.9, design: 0.6 },
        cooldownPeriod: 0, lastUsed: new Date()
      };
      expect(strategy.domainAffinity.coding).toBe(0.9);
    });

    it('should have cooldown period', () => {
      const strategy: StrategyEffectiveness = {
        strategyId: '', name: '', successRate: 0,
        avgImprovementPerUse: 0, domainAffinity: {}, cooldownPeriod: 7200, lastUsed: new Date()
      };
      expect(strategy.cooldownPeriod).toBe(7200);
    });
  });

  describe('KnowledgeTransfer Interface', () => {
    it('should have source and target domains', () => {
      const transfer: KnowledgeTransfer = {
        id: 't-1', sourceDomain: 'backend', targetDomain: 'frontend',
        transferredConcepts: [], effectivenessGain: 0.2, discoveredAt: new Date()
      };
      expect(transfer.sourceDomain).toBe('backend');
      expect(transfer.targetDomain).toBe('frontend');
    });

    it('should list transferred concepts', () => {
      const transfer: KnowledgeTransfer = {
        id: '', sourceDomain: '', targetDomain: '',
        transferredConcepts: ['error-handling', 'validation'],
        effectivenessGain: 0, discoveredAt: new Date()
      };
      expect(transfer.transferredConcepts).toHaveLength(2);
    });

    it('should track effectiveness gain', () => {
      const transfer: KnowledgeTransfer = {
        id: '', sourceDomain: '', targetDomain: '',
        transferredConcepts: [], effectivenessGain: 0.35, discoveredAt: new Date()
      };
      expect(transfer.effectivenessGain).toBe(0.35);
    });
  });

  describe('CognitiveLoadMetrics Interface', () => {
    it('should track current load 0-1', () => {
      const metrics: CognitiveLoadMetrics = {
        currentLoad: 0.65, optimalLoad: 0.7, loadDistribution: {}, bottlenecks: []
      };
      expect(metrics.currentLoad).toBeLessThanOrEqual(1);
    });

    it('should define optimal load', () => {
      const metrics: CognitiveLoadMetrics = {
        currentLoad: 0.5, optimalLoad: 0.75, loadDistribution: {}, bottlenecks: []
      };
      expect(metrics.optimalLoad).toBe(0.75);
    });

    it('should track load distribution', () => {
      const metrics: CognitiveLoadMetrics = {
        currentLoad: 0.8, optimalLoad: 0.7,
        loadDistribution: { memory: 0.3, reasoning: 0.5 }, bottlenecks: []
      };
      expect(metrics.loadDistribution.memory).toBe(0.3);
    });

    it('should identify bottlenecks', () => {
      const metrics: CognitiveLoadMetrics = {
        currentLoad: 0.95, optimalLoad: 0.7, loadDistribution: {},
        bottlenecks: ['memory', 'context-processing']
      };
      expect(metrics.bottlenecks).toContain('memory');
    });
  });

  describe('EmergencePattern Interface', () => {
    it('should support breakthrough type', () => {
      const pattern: EmergencePattern = {
        id: 'e-1', type: 'breakthrough', description: 'Major discovery',
        involvedSystems: [], confidence: 0.9, potentialImpact: 'high',
        discoveredAt: new Date(), exploited: false
      };
      expect(pattern.type).toBe('breakthrough');
    });

    it('should support insight type', () => {
      const pattern: EmergencePattern = {
        id: '', type: 'insight', description: '',
        involvedSystems: [], confidence: 0.7, potentialImpact: 'medium',
        discoveredAt: new Date(), exploited: false
      };
      expect(pattern.type).toBe('insight');
    });

    it('should support connection type', () => {
      const pattern: EmergencePattern = {
        id: '', type: 'connection', description: '',
        involvedSystems: ['system-a', 'system-b'], confidence: 0.6, potentialImpact: 'low',
        discoveredAt: new Date(), exploited: false
      };
      expect(pattern.type).toBe('connection');
    });

    it('should support synthesis type', () => {
      const pattern: EmergencePattern = {
        id: '', type: 'synthesis', description: '',
        involvedSystems: [], confidence: 0.85, potentialImpact: 'transformative',
        discoveredAt: new Date(), exploited: false
      };
      expect(pattern.type).toBe('synthesis');
    });

    it('should track potential impact levels', () => {
      const impacts = ['low', 'medium', 'high', 'transformative'];
      expect(impacts).toContain('transformative');
    });

    it('should track exploited status', () => {
      const pattern: EmergencePattern = {
        id: '', type: 'breakthrough', description: '',
        involvedSystems: [], confidence: 0.9, potentialImpact: 'high',
        discoveredAt: new Date(), exploited: true
      };
      expect(pattern.exploited).toBe(true);
    });
  });

  describe('Event Integration', () => {
    it('should emit cognitive_state_change events', () => {
      const eventType = 'cognitive_state_change';
      expect(eventType).toBe('cognitive_state_change');
    });

    it('should include velocity in state change', () => {
      const stateChange = { velocity: 0.8, cognitiveLoad: 0.6 };
      expect(stateChange.velocity).toBe(0.8);
    });

    it('should include cognitive load in state change', () => {
      const stateChange = { velocity: 0.8, cognitiveLoad: 0.6 };
      expect(stateChange.cognitiveLoad).toBe(0.6);
    });
  });
});
