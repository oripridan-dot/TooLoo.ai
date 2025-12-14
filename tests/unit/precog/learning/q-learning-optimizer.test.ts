// @version 3.3.577
/**
 * Unit tests for QLearningOptimizer
 *
 * Tests the reinforcement learning system that:
 * - Learns optimal provider selection based on state
 * - Uses epsilon-greedy exploration
 * - Updates Q-values based on rewards
 * - Persists learning state to disk
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  QLearningOptimizer,
  getQLearningOptimizer,
  type QState,
  type QReward,
} from '../../../../src/precog/learning/q-learning-optimizer';
import fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
  },
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
}));

describe('QLearningOptimizer', () => {
  let optimizer: QLearningOptimizer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh optimizer with test path
    optimizer = new QLearningOptimizer('/tmp/test-q-learning.json');

    // Default mock implementations
    (fs.readFile as any).mockRejectedValue(new Error('File not found'));
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.access as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should load existing Q-table from disk', async () => {
      const savedData = {
        'code:developer:deepseek': { qValue: 0.8, visits: 10 },
        'creative:general:anthropic': { qValue: 0.6, visits: 5 },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.initialize();

      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should start with empty Q-table if no file exists', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

      await optimizer.initialize();

      // Should not throw and should work with empty table
      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const provider = optimizer.getOptimalProvider(state, ['deepseek', 'openai']);

      expect(['deepseek', 'openai']).toContain(provider);
    });

    it('should only initialize once', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));

      await optimizer.initialize();
      await optimizer.initialize();
      await optimizer.initialize();

      // Should only call readFile once
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should create directory if needed', async () => {
      (fs.access as any).mockRejectedValue(new Error('ENOENT'));

      await optimizer.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  describe('getOptimalProvider', () => {
    it('should return best provider based on Q-values', async () => {
      // Load Q-table with known values
      const savedData = {
        'code:developer:deepseek': { qValue: 0.9, visits: 100 },
        'code:developer:openai': { qValue: 0.3, visits: 50 },
        'code:developer:anthropic': { qValue: 0.5, visits: 75 },
      };

      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.initialize();

      // Mock Math.random to always exploit (not explore)
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // > epsilon (0.1)

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const provider = optimizer.getOptimalProvider(state, ['deepseek', 'openai', 'anthropic']);

      expect(provider).toBe('deepseek'); // Highest Q-value
    });

    it('should explore with epsilon probability', async () => {
      await optimizer.initialize();

      // Mock Math.random to always explore
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // < epsilon (0.1)

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const providers = ['deepseek', 'openai', 'anthropic'];
      const provider = optimizer.getOptimalProvider(state, providers);

      // Should return one of the providers (random)
      expect(providers).toContain(provider);
    });

    it('should use first provider as default when Q-values are equal', async () => {
      await optimizer.initialize();

      // Mock to exploit
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const state: QState = { taskType: 'new', userSegment: 'new' };
      const provider = optimizer.getOptimalProvider(state, ['first', 'second']);

      // With no Q-values, should return first available
      expect(provider).toBe('first');
    });

    it('should return fallback provider when list is empty', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const provider = optimizer.getOptimalProvider(state, []);

      expect(provider).toBe('deepseek'); // Default fallback
    });
  });

  describe('update', () => {
    it('should update Q-value based on reward', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };
      const reward: QReward = {
        latency: 100,
        success: true,
        quality: 0.9,
      };

      await optimizer.update(state, action, reward);

      // Should save the updated state
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should calculate reward correctly for fast, successful requests', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };
      const reward: QReward = {
        latency: 100, // Fast
        success: true,
        quality: 1.0, // High quality
      };

      await optimizer.update(state, action, reward);

      // Now get optimal provider - deepseek should have high Q-value
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Exploit

      const provider = optimizer.getOptimalProvider(state, ['deepseek', 'openai']);

      // After positive reward, deepseek should be preferred
      expect(provider).toBe('deepseek');
    });

    it('should penalize slow requests', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'slowprovider' };
      const reward: QReward = {
        latency: 4500, // Very slow (almost 5s)
        success: true,
        quality: 0.5,
      };

      await optimizer.update(state, action, reward);

      // Check that writeFile was called (state was updated)
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should penalize failed requests', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'failprovider' };
      const reward: QReward = {
        latency: 100,
        success: false, // Failed
        quality: 0,
      };

      await optimizer.update(state, action, reward);

      // Should still save the negative update
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle missing quality score with default', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };
      const reward: QReward = {
        latency: 100,
        success: true,
        // quality not provided - should use 0.5 default
      };

      // Should not throw
      await expect(optimizer.update(state, action, reward)).resolves.not.toThrow();
    });

    it('should increment visit count', async () => {
      // Pre-populate Q-table
      const savedData = {
        'code:developer:deepseek': { qValue: 0.5, visits: 5 },
      };
      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };
      const reward: QReward = { latency: 100, success: true };

      await optimizer.update(state, action, reward);

      // Check the write call - visits should be incremented
      const writeCall = (fs.writeFile as any).mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData['code:developer:deepseek'].visits).toBe(6);
    });

    it('should auto-initialize if not initialized', async () => {
      const freshOptimizer = new QLearningOptimizer('/tmp/fresh-test.json');

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };
      const reward: QReward = { latency: 100, success: true };

      // Should auto-initialize
      await freshOptimizer.update(state, action, reward);

      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('state key generation', () => {
    it('should create consistent state keys', async () => {
      // Pre-populate with specific key
      const savedData = {
        'analysis:analyst:openai': { qValue: 0.8, visits: 10 },
      };
      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.initialize();

      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Exploit

      // Should find the matching state
      const state: QState = { taskType: 'analysis', userSegment: 'analyst' };
      const provider = optimizer.getOptimalProvider(state, ['openai', 'deepseek']);

      expect(provider).toBe('openai'); // Has highest Q-value for this state
    });

    it('should differentiate between task types', async () => {
      const savedData = {
        'code:developer:deepseek': { qValue: 0.9, visits: 10 },
        'creative:developer:anthropic': { qValue: 0.9, visits: 10 },
      };
      (fs.readFile as any).mockResolvedValue(JSON.stringify(savedData));

      await optimizer.initialize();

      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Exploit

      const codeState: QState = { taskType: 'code', userSegment: 'developer' };
      const codeProvider = optimizer.getOptimalProvider(codeState, [
        'deepseek',
        'anthropic',
        'openai',
      ]);
      expect(codeProvider).toBe('deepseek');

      const creativeState: QState = { taskType: 'creative', userSegment: 'developer' };
      const creativeProvider = optimizer.getOptimalProvider(creativeState, [
        'deepseek',
        'anthropic',
        'openai',
      ]);
      expect(creativeProvider).toBe('anthropic');
    });
  });

  describe('Q-learning algorithm', () => {
    it('should converge Q-values with repeated updates', async () => {
      await optimizer.initialize();

      const state: QState = { taskType: 'code', userSegment: 'developer' };
      const action = { provider: 'deepseek' };

      // Simulate multiple successful requests
      for (let i = 0; i < 10; i++) {
        await optimizer.update(state, action, {
          latency: 100,
          success: true,
          quality: 0.9,
        });
      }

      // Multiple writes should have occurred
      expect(fs.writeFile).toHaveBeenCalledTimes(10);
    });
  });
});

describe('getQLearningOptimizer singleton', () => {
  it('should return a QLearningOptimizer instance', () => {
    const instance = getQLearningOptimizer();
    expect(instance).toBeInstanceOf(QLearningOptimizer);
  });

  it('should return the same instance on subsequent calls', () => {
    const instance1 = getQLearningOptimizer();
    const instance2 = getQLearningOptimizer();
    expect(instance1).toBe(instance2);
  });
});
