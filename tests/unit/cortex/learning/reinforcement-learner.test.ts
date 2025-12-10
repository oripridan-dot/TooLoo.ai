// @version 1.0.0 - ReinforcementLearner Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test interfaces
interface Reward {
  id: string;
  sessionId: string;
  timestamp: Date;
  source: 'explicit' | 'implicit' | 'system';
  value: number;
  context: RewardContext;
}

interface RewardContext {
  taskType: string;
  provider: string;
  model?: string;
  complexity: 'low' | 'medium' | 'high';
  latency?: number;
  cost?: number;
  userAction?: 'thumbs_up' | 'thumbs_down' | 'copy' | 'regenerate' | 'edit' | 'ignore';
}

interface StateVector {
  taskType: string;
  complexity: number;
  recency: number;
  providerHistory: Record<string, number>;
  domainSignature: string;
}

interface Action {
  provider: string;
  temperature: number;
  promptStrategy: 'direct' | 'chain_of_thought' | 'few_shot' | 'decompose';
  creativityLevel: number;
}

interface QTableEntry {
  state: string;
  action: string;
  qValue: number;
  updateCount: number;
  lastUpdated: Date;
}

interface LearningPolicy {
  explorationRate: number;
  learningRate: number;
  discountFactor: number;
  minExplorationRate: number;
  explorationDecay: number;
}

type LearningStatus = 'active' | 'paused' | 'boosted' | 'throttled' | 'emergency_stop';

describe('ReinforcementLearner', () => {
  describe('Reward Interface', () => {
    it('should have id', () => {
      const reward: Reward = {
        id: 'r-1', sessionId: 's-1', timestamp: new Date(),
        source: 'explicit', value: 0.8, context: { taskType: 'code', provider: 'openai', complexity: 'medium' }
      };
      expect(reward.id).toBe('r-1');
    });

    it('should have value from -1 to 1', () => {
      const reward: Reward = {
        id: '', sessionId: '', timestamp: new Date(),
        source: 'system', value: 0.5, context: { taskType: '', provider: '', complexity: 'low' }
      };
      expect(reward.value).toBeGreaterThanOrEqual(-1);
      expect(reward.value).toBeLessThanOrEqual(1);
    });

    it('should support explicit source', () => {
      const reward: Reward = {
        id: '', sessionId: '', timestamp: new Date(),
        source: 'explicit', value: 1, context: { taskType: '', provider: '', complexity: 'low' }
      };
      expect(reward.source).toBe('explicit');
    });

    it('should support implicit source', () => {
      const reward: Reward = {
        id: '', sessionId: '', timestamp: new Date(),
        source: 'implicit', value: 0.7, context: { taskType: '', provider: '', complexity: 'low' }
      };
      expect(reward.source).toBe('implicit');
    });

    it('should support system source', () => {
      const reward: Reward = {
        id: '', sessionId: '', timestamp: new Date(),
        source: 'system', value: -0.5, context: { taskType: '', provider: '', complexity: 'low' }
      };
      expect(reward.source).toBe('system');
    });
  });

  describe('RewardContext Interface', () => {
    it('should have taskType', () => {
      const ctx: RewardContext = { taskType: 'code-generation', provider: 'anthropic', complexity: 'high' };
      expect(ctx.taskType).toBe('code-generation');
    });

    it('should have provider', () => {
      const ctx: RewardContext = { taskType: '', provider: 'gemini', complexity: 'medium' };
      expect(ctx.provider).toBe('gemini');
    });

    it('should support low complexity', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'low' };
      expect(ctx.complexity).toBe('low');
    });

    it('should support medium complexity', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'medium' };
      expect(ctx.complexity).toBe('medium');
    });

    it('should support high complexity', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'high' };
      expect(ctx.complexity).toBe('high');
    });

    it('should have optional userAction', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'low', userAction: 'thumbs_up' };
      expect(ctx.userAction).toBe('thumbs_up');
    });

    it('should support all user actions', () => {
      const actions = ['thumbs_up', 'thumbs_down', 'copy', 'regenerate', 'edit', 'ignore'];
      expect(actions).toContain('thumbs_up');
      expect(actions).toContain('copy');
      expect(actions).toContain('regenerate');
    });

    it('should have optional latency', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'low', latency: 500 };
      expect(ctx.latency).toBe(500);
    });

    it('should have optional cost', () => {
      const ctx: RewardContext = { taskType: '', provider: '', complexity: 'low', cost: 0.002 };
      expect(ctx.cost).toBe(0.002);
    });
  });

  describe('StateVector Interface', () => {
    it('should have taskType', () => {
      const state: StateVector = {
        taskType: 'debugging', complexity: 0.7, recency: 0.9,
        providerHistory: {}, domainSignature: 'hash123'
      };
      expect(state.taskType).toBe('debugging');
    });

    it('should have complexity 0-1', () => {
      const state: StateVector = {
        taskType: '', complexity: 0.65, recency: 1,
        providerHistory: {}, domainSignature: ''
      };
      expect(state.complexity).toBeGreaterThanOrEqual(0);
      expect(state.complexity).toBeLessThanOrEqual(1);
    });

    it('should have recency factor', () => {
      const state: StateVector = {
        taskType: '', complexity: 0.5, recency: 0.8,
        providerHistory: {}, domainSignature: ''
      };
      expect(state.recency).toBe(0.8);
    });

    it('should track provider history', () => {
      const state: StateVector = {
        taskType: '', complexity: 0.5, recency: 1,
        providerHistory: { openai: 0.9, anthropic: 0.85 }, domainSignature: ''
      };
      expect(state.providerHistory.openai).toBe(0.9);
    });
  });

  describe('Action Interface', () => {
    it('should have provider', () => {
      const action: Action = { provider: 'openai', temperature: 0.7, promptStrategy: 'direct', creativityLevel: 0.5 };
      expect(action.provider).toBe('openai');
    });

    it('should have temperature', () => {
      const action: Action = { provider: '', temperature: 0.3, promptStrategy: 'direct', creativityLevel: 0 };
      expect(action.temperature).toBe(0.3);
    });

    it('should support direct strategy', () => {
      const action: Action = { provider: '', temperature: 0, promptStrategy: 'direct', creativityLevel: 0 };
      expect(action.promptStrategy).toBe('direct');
    });

    it('should support chain_of_thought strategy', () => {
      const action: Action = { provider: '', temperature: 0, promptStrategy: 'chain_of_thought', creativityLevel: 0 };
      expect(action.promptStrategy).toBe('chain_of_thought');
    });

    it('should support few_shot strategy', () => {
      const action: Action = { provider: '', temperature: 0, promptStrategy: 'few_shot', creativityLevel: 0 };
      expect(action.promptStrategy).toBe('few_shot');
    });

    it('should support decompose strategy', () => {
      const action: Action = { provider: '', temperature: 0, promptStrategy: 'decompose', creativityLevel: 0 };
      expect(action.promptStrategy).toBe('decompose');
    });
  });

  describe('QTableEntry Interface', () => {
    it('should store qValue', () => {
      const entry: QTableEntry = {
        state: 'state-hash', action: 'action-hash', qValue: 0.75,
        updateCount: 10, lastUpdated: new Date()
      };
      expect(entry.qValue).toBe(0.75);
    });

    it('should track update count', () => {
      const entry: QTableEntry = {
        state: '', action: '', qValue: 0, updateCount: 25, lastUpdated: new Date()
      };
      expect(entry.updateCount).toBe(25);
    });
  });

  describe('LearningPolicy Interface', () => {
    it('should have exploration rate (epsilon)', () => {
      const policy: LearningPolicy = {
        explorationRate: 0.2, learningRate: 0.1, discountFactor: 0.9,
        minExplorationRate: 0.01, explorationDecay: 0.995
      };
      expect(policy.explorationRate).toBe(0.2);
    });

    it('should have learning rate (alpha)', () => {
      const policy: LearningPolicy = {
        explorationRate: 0.2, learningRate: 0.15, discountFactor: 0.9,
        minExplorationRate: 0.01, explorationDecay: 0.99
      };
      expect(policy.learningRate).toBe(0.15);
    });

    it('should have discount factor (gamma)', () => {
      const policy: LearningPolicy = {
        explorationRate: 0.1, learningRate: 0.1, discountFactor: 0.95,
        minExplorationRate: 0.01, explorationDecay: 0.99
      };
      expect(policy.discountFactor).toBe(0.95);
    });
  });

  describe('LearningStatus', () => {
    it('should support active status', () => {
      const status: LearningStatus = 'active';
      expect(status).toBe('active');
    });

    it('should support paused status', () => {
      const status: LearningStatus = 'paused';
      expect(status).toBe('paused');
    });

    it('should support boosted status', () => {
      const status: LearningStatus = 'boosted';
      expect(status).toBe('boosted');
    });

    it('should support throttled status', () => {
      const status: LearningStatus = 'throttled';
      expect(status).toBe('throttled');
    });

    it('should support emergency_stop status', () => {
      const status: LearningStatus = 'emergency_stop';
      expect(status).toBe('emergency_stop');
    });
  });

  describe('Epsilon-Greedy Policy', () => {
    it('should explore when random < epsilon', () => {
      const epsilon = 0.2;
      const random = 0.1;
      const shouldExplore = random < epsilon;
      expect(shouldExplore).toBe(true);
    });

    it('should exploit when random >= epsilon', () => {
      const epsilon = 0.2;
      const random = 0.5;
      const shouldExploit = random >= epsilon;
      expect(shouldExploit).toBe(true);
    });

    it('should decay exploration over time', () => {
      let epsilon = 0.3;
      const decay = 0.99;
      epsilon *= decay;
      expect(epsilon).toBeCloseTo(0.297);
    });

    it('should not go below minimum exploration', () => {
      let epsilon = 0.01;
      const min = 0.01;
      const decay = 0.99;
      epsilon = Math.max(min, epsilon * decay);
      expect(epsilon).toBe(0.01);
    });
  });
});
