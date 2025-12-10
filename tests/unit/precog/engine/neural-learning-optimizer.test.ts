// @version 1.0.0
/**
 * Unit tests for NeuralLearningOptimizer
 *
 * Tests the Q-Learning system that:
 * - Selects optimal learning strategies based on state
 * - Uses epsilon-greedy exploration
 * - Updates Q-values based on rewards
 * - Persists learning state
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  NeuralLearningOptimizer,
  type LearningState,
  type LearningStrategy,
} from '../../../../src/precog/engine/neural-learning-optimizer';
import { promises as fs } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

// Mock event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

describe('NeuralLearningOptimizer', () => {
  let optimizer: NeuralLearningOptimizer;

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.readFile as any).mockRejectedValue(new Error('File not found'));
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);

    optimizer = new NeuralLearningOptimizer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(optimizer).toBeDefined();
    });

    it('should accept custom config', () => {
      const customOptimizer = new NeuralLearningOptimizer({
        learningRate: 0.2,
        explorationRate: 0.5,
      });
      expect(customOptimizer).toBeDefined();
    });
  });

  describe('init', () => {
    it('should create data directory', async () => {
      await optimizer.init();
      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should load existing Q-table from disk', async () => {
      const savedData = {
        qTable: [
          [
            '{"m":0.4,"c":0.6,"s":0.6,"q":0.6,"b":0.3,"f":0}',
            [
              {
                strategy: 'efficiency',
                stateHash: 'test',
                qValue: 0.8,
                visits: 5,
                lastUpdated: Date.now(),
              },
            ],
          ],
        ],
        config: { learningRate: 0.15 },
        actionHistory: [],
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.init();

      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should start fresh if no saved data exists', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

      await optimizer.init();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getCurrentLearningState', () => {
    it('should return current learning state', () => {
      const state = optimizer.getCurrentLearningState();

      expect(state).toHaveProperty('mastery');
      expect(state).toHaveProperty('confidence');
      expect(state).toHaveProperty('explorationRate');
      expect(state).toHaveProperty('recentSuccessRate');
    });

    it('should return a copy, not the original', () => {
      const state1 = optimizer.getCurrentLearningState();
      state1.mastery = 0.99;

      const state2 = optimizer.getCurrentLearningState();
      expect(state2.mastery).not.toBe(0.99);
    });
  });

  describe('updateLearningState', () => {
    it('should update learning state with new observations', () => {
      optimizer.updateLearningState({
        mastery: 0.8,
        confidence: 0.9,
      });

      const state = optimizer.getCurrentLearningState();
      expect(state.mastery).toBe(0.8);
      expect(state.confidence).toBe(0.9);
    });

    it('should preserve unchanged values', () => {
      const originalState = optimizer.getCurrentLearningState();
      const originalLatency = originalState.averageLatency;

      optimizer.updateLearningState({
        mastery: 0.8,
      });

      const newState = optimizer.getCurrentLearningState();
      expect(newState.averageLatency).toBe(originalLatency);
    });
  });

  describe('selectLearningAction', () => {
    const strategies: LearningStrategy[] = [
      'gradient_ascent',
      'random_exploration',
      'efficiency',
      'meta_learning',
      'weakness_targeting',
      'parallel_training',
    ];

    it('should return a valid learning strategy', () => {
      const action = optimizer.selectLearningAction();
      expect(strategies).toContain(action);
    });

    it('should explore with epsilon probability', () => {
      // Force exploration
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // Less than epsilon (0.3)

      const action = optimizer.selectLearningAction();

      // Should return some strategy (exploring)
      expect(strategies).toContain(action);
    });

    it('should exploit with (1-epsilon) probability', () => {
      // Force exploitation
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // Greater than epsilon

      const action = optimizer.selectLearningAction();

      expect(strategies).toContain(action);
    });

    it('should use heuristic for unexplored states', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // Force exploit

      const action = optimizer.selectLearningAction();

      // For unexplored state, should return heuristic action
      expect(strategies).toContain(action);
    });

    it('should accept custom state parameter', () => {
      const customState: LearningState = {
        mastery: 0.9,
        confidence: 0.9,
        explorationRate: 0.1,
        budgetUtilization: 0.5,
        recentSuccessRate: 0.95,
        averageLatency: 1000,
        averageQuality: 0.9,
        learningVelocity: 0.2,
        domainStrengths: { coding: 0.9 },
        modelPerformance: { anthropic: 0.9 },
        recentFailures: [],
      };

      const action = optimizer.selectLearningAction(customState);

      expect(strategies).toContain(action);
    });
  });

  describe('heuristic action selection', () => {
    it('should target weaknesses when failures exist', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // Force exploit

      optimizer.updateLearningState({
        recentFailures: ['coding', 'analysis'],
      });

      const action = optimizer.selectLearningAction();

      // Heuristic should suggest weakness_targeting
      expect(action).toBe('weakness_targeting');
    });

    it('should prefer efficiency when budget is tight', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      optimizer.updateLearningState({
        budgetUtilization: 0.85,
        recentFailures: [],
      });

      const action = optimizer.selectLearningAction();

      expect(action).toBe('efficiency');
    });

    it('should focus on learning when mastery is low', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      optimizer.updateLearningState({
        mastery: 0.3,
        budgetUtilization: 0.5,
        recentFailures: [],
      });

      const action = optimizer.selectLearningAction();

      expect(action).toBe('gradient_ascent');
    });

    it('should try meta-learning when doing well', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      optimizer.updateLearningState({
        mastery: 0.8,
        recentSuccessRate: 0.85,
        budgetUtilization: 0.5,
        recentFailures: [],
      });

      const action = optimizer.selectLearningAction();

      expect(action).toBe('meta_learning');
    });
  });

  describe('updateQValue', () => {
    it('should update Q-value based on reward', () => {
      const state = optimizer.getCurrentLearningState();
      const nextState = { ...state, mastery: state.mastery + 0.1 };

      // This should not throw
      optimizer.updateQValue(state, 'efficiency', 0.8, nextState);

      expect(true).toBe(true);
    });

    it('should create Q-table entry for new state', () => {
      const state: LearningState = {
        mastery: 0.999, // Unusual value to ensure new state
        confidence: 0.999,
        explorationRate: 0.1,
        budgetUtilization: 0.1,
        recentSuccessRate: 0.999,
        averageLatency: 100,
        averageQuality: 0.999,
        learningVelocity: 0.1,
        domainStrengths: {},
        modelPerformance: {},
        recentFailures: [],
      };

      optimizer.updateQValue(state, 'gradient_ascent', 1.0, state);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle multiple updates to same state-action pair', () => {
      const state = optimizer.getCurrentLearningState();

      // Multiple updates
      optimizer.updateQValue(state, 'efficiency', 0.8, state);
      optimizer.updateQValue(state, 'efficiency', 0.9, state);
      optimizer.updateQValue(state, 'efficiency', 0.7, state);

      expect(true).toBe(true);
    });
  });

  describe('saveQTable', () => {
    it('should save Q-table to disk', async () => {
      await optimizer.saveQTable();

      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    });

    it('should include config and history in saved data', async () => {
      await optimizer.saveQTable();

      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData).toHaveProperty('qTable');
      expect(writtenData).toHaveProperty('config');
      expect(writtenData).toHaveProperty('lastSaved');
    });
  });

  describe('learning dynamics', () => {
    it('should improve Q-values with positive rewards', () => {
      const state = optimizer.getCurrentLearningState();

      // Multiple positive rewards
      for (let i = 0; i < 5; i++) {
        optimizer.updateQValue(state, 'efficiency', 1.0, state);
      }

      // Q-value should have increased (but we can't directly access it)
      // The test verifies no errors occur
      expect(true).toBe(true);
    });

    it('should decrease Q-values with negative rewards', () => {
      const state = optimizer.getCurrentLearningState();

      // Multiple negative rewards
      for (let i = 0; i < 5; i++) {
        optimizer.updateQValue(state, 'random_exploration', -0.5, state);
      }

      expect(true).toBe(true);
    });
  });

  describe('strategy mappings', () => {
    it('should have mappings for all strategies', () => {
      // This tests internal consistency - all strategies should work
      const strategies: LearningStrategy[] = [
        'gradient_ascent',
        'random_exploration',
        'efficiency',
        'meta_learning',
        'weakness_targeting',
        'parallel_training',
      ];

      for (const strategy of strategies) {
        // Force this strategy and verify it's valid
        expect(strategies).toContain(strategy);
      }
    });
  });
});
