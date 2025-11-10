/**
 * Training Engine Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import TrainingEngine from '../../lib/training-engine.js';

describe('TrainingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new TrainingEngine(null, {
      masteryThreshold: 80,
      decayRate: 0.02
    });
  });

  describe('initialization', () => {
    it('should create engine with defaults', () => {
      expect(engine).toBeDefined();
      expect(engine.activeSessions).toBeDefined();
      expect(engine.masteryScores).toBeDefined();
    });

    it('should set config values', () => {
      expect(engine.config.masteryThreshold).toBe(80);
      expect(engine.config.decayRate).toBe(0.02);
    });
  });

  describe('startTraining', () => {
    it('should require userId and focusArea', async () => {
      await expect(engine.startTraining(null, 'javascript')).rejects.toThrow();
      await expect(engine.startTraining('user123', null)).rejects.toThrow();
    });

    it('should create training session', async () => {
      const result = await engine.startTraining('user1', 'javascript', { roundCount: 3 });

      expect(result.sessionId).toBeDefined();
      expect(result.roundId).toBeDefined();
      expect(result.focusArea).toBe('javascript');
      expect(result.roundNumber).toBe(1);
      expect(result.totalRounds).toBe(3);
    });

    it('should store session in activeSessions', async () => {
      const result = await engine.startTraining('user1', 'python', { roundCount: 5 });
      const session = engine.getSession(result.sessionId);

      expect(session).toBeDefined();
      expect(session.userId).toBe('user1');
      expect(session.focusArea).toBe('python');
      expect(session.roundCount).toBe(5);
      expect(session.status).toBe('active');
    });

    it('should use default roundCount if not provided', async () => {
      const result = await engine.startTraining('user1', 'javascript');
      const session = engine.getSession(result.sessionId);

      expect(session.roundCount).toBe(5); // default
    });
  });

  describe('completeRound', () => {
    let sessionId, roundId;

    beforeEach(async () => {
      const result = await engine.startTraining('user1', 'javascript', { roundCount: 3 });
      sessionId = result.sessionId;
      roundId = result.roundId;
    });

    it('should require roundId and response', async () => {
      await expect(engine.completeRound(null, 'response')).rejects.toThrow();
      await expect(engine.completeRound(roundId, null)).rejects.toThrow();
    });

    it('should score response automatically', async () => {
      const result = await engine.completeRound(roundId, 'function test() { return true; }');

      expect(result.previousScore).toBeDefined();
      expect(typeof result.previousScore).toBe('number');
      expect(result.previousScore).toBeGreaterThanOrEqual(0);
      expect(result.previousScore).toBeLessThanOrEqual(100);
    });

    it('should accept custom score', async () => {
      const result = await engine.completeRound(roundId, 'some response', 85);

      expect(result.previousScore).toBe(85);
    });

    it('should update session state', async () => {
      await engine.completeRound(roundId, 'function add(a,b) { return a + b; }', 80);

      const session = engine.getSession(sessionId);
      expect(session.currentRound).toBe(2);
      expect(session.totalScore).toBeGreaterThan(0);
    });

    it('should continue to next round if not complete', async () => {
      const result = await engine.completeRound(roundId, 'response', 75);

      expect(result.continued).toBe(true);
      expect(result.roundNumber).toBe(2);
    });

    it('should mark session complete when all rounds done', async () => {
      let currentRoundId = roundId;

      // Complete rounds 1, 2, 3
      for (let i = 0; i < 3; i++) {
        const result = await engine.completeRound(currentRoundId, `response ${i}`, 75 + i * 5);

        if (result.continued) {
          currentRoundId = result.roundId;
        } else {
          expect(result.completed).toBe(true);
          expect(result.roundNumber).toBe(3);
        }
      }

      const session = engine.getSession(sessionId);
      expect(session.status).toBe('completed');
    });

    it('should prevent completing already completed round', async () => {
      await engine.completeRound(roundId, 'response', 75);

      await expect(engine.completeRound(roundId, 'another')).rejects.toThrow(
        'is already completed'
      );
    });
  });

  describe('scoreResponse', () => {
    it('should return 0 for empty response', () => {
      const score = engine.scoreResponse('', 'javascript');
      expect(score).toBe(0);
    });

    it('should return 0 for whitespace only', () => {
      const score = engine.scoreResponse('   ', 'javascript');
      expect(score).toBe(0);
    });

    it('should score based on length', () => {
      const shortScore = engine.scoreResponse('abc', 'javascript');
      const longScore = engine.scoreResponse('x'.repeat(500), 'javascript');

      expect(longScore).toBeGreaterThan(shortScore);
    });

    it('should boost score for keywords', () => {
      const withoutKeywords = engine.scoreResponse('some generic response text', 'javascript');
      const withKeywords = engine.scoreResponse('function test() { const x = 5; }', 'javascript');

      expect(withKeywords).toBeGreaterThan(withoutKeywords);
    });

    it('should cap score at 100', () => {
      const score = engine.scoreResponse('x'.repeat(10000), 'javascript');
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('mastery tracking', () => {
    it('should start with 0 mastery', () => {
      const score = engine.getMasteryScore('user1', 'javascript');
      expect(score).toBe(0);
    });

    it('should update mastery on round completion', async () => {
      const result1 = await engine.startTraining('user1', 'javascript', { roundCount: 1 });
      await engine.completeRound(result1.roundId, 'function test() { return 1; }', 75);

      const mastery = engine.getMasteryScore('user1', 'javascript');
      expect(mastery).toBeGreaterThan(0);
      expect(mastery).toBeLessThanOrEqual(100);
    });

    it('should calculate mastery metrics for user', async () => {
      const result1 = await engine.startTraining('user1', 'javascript', { roundCount: 1 });
      await engine.completeRound(result1.roundId, 'response', 80);

      const result2 = await engine.startTraining('user1', 'python', { roundCount: 1 });
      await engine.completeRound(result2.roundId, 'response', 60);

      const metrics = engine.getMasteryMetrics('user1');

      expect(metrics.userId).toBe('user1');
      expect(Object.keys(metrics.domains).length).toBeGreaterThanOrEqual(1);
      expect(metrics.totalProgress).toBeGreaterThan(0);
    });
  });

  describe('getLevel', () => {
    it('should return correct levels', () => {
      expect(engine.getLevel(90)).toBe('Mastered');
      expect(engine.getLevel(75)).toBe('Proficient');
      expect(engine.getLevel(60)).toBe('Competent');
      expect(engine.getLevel(40)).toBe('Developing');
      expect(engine.getLevel(20)).toBe('Beginner');
    });
  });

  describe('getUserSessions', () => {
    it('should return empty array for new user', () => {
      const sessions = engine.getUserSessions('unknown-user');
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBe(0);
    });

    it('should return all user sessions', async () => {
      await engine.startTraining('user1', 'javascript', { roundCount: 2 });
      await engine.startTraining('user1', 'python', { roundCount: 2 });

      const sessions = engine.getUserSessions('user1');
      expect(sessions.length).toBe(2);
      expect(sessions[0].focusArea).toBe('javascript');
      expect(sessions[1].focusArea).toBe('python');
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await engine.startTraining('user1', 'javascript');
      const stats = engine.getStats();

      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.totalRounds).toBeGreaterThan(0);
      expect(stats.trackedDomains).toBeGreaterThanOrEqual(0);
      expect(stats.averageMastery).toBeDefined();
    });
  });
});
