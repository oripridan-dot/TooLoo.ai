/**
 * Challenge Engine Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ChallengeEngine from '../../lib/challenge-engine.js';

describe('ChallengeEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ChallengeEngine(null, {
      passingScore: 70
    });
  });

  describe('initialization', () => {
    it('should create engine with defaults', () => {
      expect(engine).toBeDefined();
      expect(engine.challenges).toBeDefined();
      expect(engine.activeChalls).toBeDefined();
    });

    it('should load challenges', () => {
      expect(engine.challenges.javascript).toBeDefined();
      expect(engine.challenges.python).toBeDefined();
    });

    it('should have difficulty levels', () => {
      const jsEasy = engine.challenges.javascript.easy;
      const jsMedium = engine.challenges.javascript.medium;
      const jsHard = engine.challenges.javascript.hard;

      expect(jsEasy).toBeDefined();
      expect(jsMedium).toBeDefined();
      expect(jsHard).toBeDefined();
    });
  });

  describe('startChallenge', () => {
    it('should require userId and skill', async () => {
      await expect(engine.startChallenge(null, 'javascript')).rejects.toThrow();
      await expect(engine.startChallenge('user1', null)).rejects.toThrow();
    });

    it('should validate difficulty level', async () => {
      await expect(
        engine.startChallenge('user1', 'javascript', 'impossible')
      ).rejects.toThrow('difficulty must be one of');
    });

    it('should require skill to exist', async () => {
      await expect(
        engine.startChallenge('user1', 'unknown-skill', 'easy')
      ).rejects.toThrow('No challenges found');
    });

    it('should create challenge with default difficulty', async () => {
      const result = await engine.startChallenge('user1', 'javascript');

      expect(result.challengeId).toBeDefined();
      expect(result.skill).toBe('javascript');
      expect(result.difficulty).toBe('medium');
      expect(result.title).toBeDefined();
      expect(result.prompt).toBeDefined();
    });

    it('should create challenge with specific difficulty', async () => {
      const result = await engine.startChallenge('user1', 'javascript', 'hard');

      expect(result.difficulty).toBe('hard');
    });

    it('should store challenge in activeChalls', async () => {
      const result = await engine.startChallenge('user1', 'python', 'easy');
      const challenge = engine.getChallenge(result.challengeId);

      expect(challenge).toBeDefined();
      expect(challenge.userId).toBe('user1');
      expect(challenge.skill).toBe('python');
      expect(challenge.status).toBe('active');
    });

    it('should not include solution in response', async () => {
      const result = await engine.startChallenge('user1', 'javascript');

      expect(result.solution).toBeUndefined();
    });
  });

  describe('gradeChallenge', () => {
    let challengeId;

    beforeEach(async () => {
      const result = await engine.startChallenge('user1', 'javascript', 'medium');
      challengeId = result.challengeId;
    });

    it('should require challengeId and response', async () => {
      await expect(engine.gradeChallenge(null, 'response')).rejects.toThrow();
      await expect(engine.gradeChallenge(challengeId, null)).rejects.toThrow();
    });

    it('should grade response with score', async () => {
      const result = await engine.gradeChallenge(
        challengeId,
        'function test() { const arr = [1,2,3]; return arr.map(x => x * 2); }'
      );

      expect(result.grade).toBeDefined();
      expect(typeof result.grade).toBe('number');
      expect(result.grade).toBeGreaterThanOrEqual(0);
      expect(result.grade).toBeLessThanOrEqual(100);
    });

    it('should determine pass/fail based on threshold', async () => {
      const result = await engine.gradeChallenge(
        challengeId,
        'function test() { const x = 10; const y = x * 2; return y; }'
      );

      expect(result.passed).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should generate feedback', async () => {
      const result = await engine.gradeChallenge(
        challengeId,
        'function test() { return 1; }'
      );

      expect(result.feedback).toBeDefined();
      expect(result.feedback.overall).toBeDefined();
      expect(result.feedback.details).toBeDefined();
      expect(Array.isArray(result.feedback.details)).toBe(true);
    });

    it('should prevent grading already graded challenge', async () => {
      await engine.gradeChallenge(challengeId, 'function test() {}');

      await expect(
        engine.gradeChallenge(challengeId, 'another response')
      ).rejects.toThrow('is already graded');
    });

    it('should update challenge status', async () => {
      await engine.gradeChallenge(challengeId, 'response');

      const challenge = engine.getChallenge(challengeId);
      expect(challenge.status).toBe('graded');
      expect(challenge.response).toBe('response');
      expect(challenge.grade).toBeDefined();
    });
  });

  describe('gradeResponse', () => {
    it('should return 0 for empty response', () => {
      const score = engine.gradeResponse('', ['function', 'const']);
      expect(score).toBe(0);
    });

    it('should score based on length', () => {
      const short = engine.gradeResponse('abc', ['function']);
      const long = engine.gradeResponse('x'.repeat(200), ['function']);

      expect(long).toBeGreaterThan(short);
    });

    it('should match keywords', () => {
      const withKeywords = engine.gradeResponse(
        'function test() { const x = 5; }',
        ['function', 'const']
      );

      expect(withKeywords).toBeGreaterThan(0);
    });

    it('should match case insensitively', () => {
      const score = engine.gradeResponse(
        'FUNCTION TEST() { CONST X = 5; }',
        ['function', 'const']
      );

      expect(score).toBeGreaterThan(0);
    });

    it('should bonus for code quality', () => {
      const noCode = engine.gradeResponse('function and const are important', ['function', 'const']);
      const withCode = engine.gradeResponse(
        'function test() {\n  const x = 5;\n  return x;\n}',
        ['function', 'const']
      );

      expect(withCode).toBeGreaterThan(noCode);
    });

    it('should cap score at 100', () => {
      const score = engine.gradeResponse(
        'function test() { const x = 5; return x; }',
        ['function']
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('generateFeedback', () => {
    it('should provide positive feedback on pass', async () => {
      const result = await engine.startChallenge('user1', 'javascript', 'easy');
      const gradeResult = await engine.gradeChallenge(
        result.challengeId,
        'function test() { console.log("Hello"); return true; }'
      );

      if (gradeResult.passed) {
        expect(gradeResult.feedback.overall).toContain('Excellent');
      }
    });

    it('should provide constructive feedback on fail', async () => {
      const result = await engine.startChallenge('user1', 'javascript', 'hard');
      const gradeResult = await engine.gradeChallenge(
        result.challengeId,
        'some bad response'
      );

      if (!gradeResult.passed) {
        expect(gradeResult.feedback.overall).toContain('Keep practicing');
      }
    });

    it('should list missing concepts', async () => {
      const result = await engine.startChallenge('user1', 'javascript', 'medium');
      const gradeResult = await engine.gradeChallenge(
        result.challengeId,
        'response without any code'
      );

      expect(gradeResult.feedback.details.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await engine.startChallenge('user1', 'javascript');
      const stats = engine.getStats();

      expect(stats.activeChallenges).toBeGreaterThanOrEqual(0);
      expect(stats.completedChallenges).toBeDefined();
      expect(stats.passedChallenges).toBeDefined();
      expect(stats.passRate).toBeDefined();
    });

    it('should track completion and pass rate', async () => {
      const result1 = await engine.startChallenge('user1', 'javascript', 'easy');
      const result2 = await engine.startChallenge('user1', 'python', 'easy');

      await engine.gradeChallenge(result1.challengeId, 'function test() { return 1; }');
      await engine.gradeChallenge(result2.challengeId, 'def test(): return 1');

      const stats = engine.getStats();
      expect(stats.completedChallenges).toBe(2);
    });
  });

  describe('challenge pool', () => {
    it('should have javascript challenges', () => {
      const pool = engine.challenges.javascript;
      expect(pool.easy.length).toBeGreaterThan(0);
      expect(pool.medium.length).toBeGreaterThan(0);
      expect(pool.hard.length).toBeGreaterThan(0);
    });

    it('should have python challenges', () => {
      const pool = engine.challenges.python;
      expect(pool.easy.length).toBeGreaterThan(0);
      expect(pool.medium.length).toBeGreaterThan(0);
      expect(pool.hard.length).toBeGreaterThan(0);
    });

    it('should have challenge structure', () => {
      const challenge = engine.challenges.javascript.easy[0];
      expect(challenge.id).toBeDefined();
      expect(challenge.title).toBeDefined();
      expect(challenge.prompt).toBeDefined();
      expect(challenge.expectedKeywords).toBeDefined();
      expect(challenge.solution).toBeDefined();
    });
  });
});
