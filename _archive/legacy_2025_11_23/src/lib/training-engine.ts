/**
 * Training Engine - Core learning round logic
 * 
 * Manages:
 * - Training sessions and rounds
 * - Mastery score tracking and progression
 * - Round completion and scoring
 */

import { v4 as uuid } from 'uuid';

class TrainingEngine {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      maxRoundDuration: config.maxRoundDuration || 3600000, // 1 hour
      defaultRoundCount: config.defaultRoundCount || 5,
      masteryThreshold: config.masteryThreshold || 80,
      decayRate: config.decayRate || 0.02,
      ...config
    };

    // State
    this.activeSessions = new Map();      // sessionId -> session data
    this.masteryScores = new Map();        // userId + domain -> score
    this.roundHistory = new Map();         // roundId -> round data
  }

  /**
   * Start a new training session
   */
  async startTraining(userId, focusArea, options = {}) {
    if (!userId || !focusArea) {
      throw new Error('userId and focusArea are required');
    }

    const sessionId = uuid();
    const roundId = uuid();
    const now = Date.now();

    const session = {
      sessionId,
      userId,
      focusArea,
      startTime: now,
      roundCount: options.roundCount || this.config.defaultRoundCount,
      currentRound: 1,
      totalScore: 0,
      rounds: [],
      status: 'active'
    };

    const round = {
      roundId,
      sessionId,
      userId,
      focusArea,
      roundNumber: 1,
      startTime: now,
      endTime: null,
      response: null,
      score: null,
      feedback: null,
      status: 'active'
    };

    // Store
    this.activeSessions.set(sessionId, session);
    this.roundHistory.set(roundId, round);

    // Emit event
    if (this.eventBus) {
      await this.eventBus.emit({
        type: 'training.started',
        aggregateId: sessionId,
        data: {
          userId,
          sessionId,
          focusArea,
          roundCount: session.roundCount,
          timestamp: now
        }
      });
    }

    return {
      sessionId,
      roundId,
      focusArea,
      roundNumber: 1,
      totalRounds: session.roundCount
    };
  }

  /**
   * Complete a training round with response
   */
  async completeRound(roundId, response, score = null) {
    if (!roundId || !response) {
      throw new Error('roundId and response are required');
    }

    const round = this.roundHistory.get(roundId);
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }

    if (round.status !== 'active') {
      throw new Error(`Round ${roundId} is already completed`);
    }

    const now = Date.now();
    const session = this.activeSessions.get(round.sessionId);

    // Calculate score if not provided
    if (score === null) {
      score = this.scoreResponse(response, round.focusArea);
    }

    // Update round
    round.endTime = now;
    round.response = response;
    round.score = score;
    round.status = 'completed';

    // Update session
    session.totalScore += score;
    session.rounds.push(roundId);

    // Update mastery
    this.updateMastery(round.userId, round.focusArea, score);

    // Check if session complete
    const isSessionComplete = session.currentRound >= session.roundCount;

    // Emit event
    if (this.eventBus) {
      const eventType = isSessionComplete ? 'training.completed' : 'training.paused';

      await this.eventBus.emit({
        type: eventType,
        aggregateId: session.sessionId,
        data: {
          userId: round.userId,
          sessionId: session.sessionId,
          roundId,
          roundNumber: session.currentRound,
          totalRounds: session.roundCount,
          roundScore: score,
          sessionScore: session.totalScore / session.currentRound,
          focusArea: round.focusArea,
          masteryScore: this.getMasteryScore(round.userId, round.focusArea),
          timestamp: now
        }
      });
    }

    // Move to next round if continuing
    if (!isSessionComplete) {
      session.currentRound += 1;
      const nextRoundId = uuid();

      const nextRound = {
        roundId: nextRoundId,
        sessionId: session.sessionId,
        userId: round.userId,
        focusArea: round.focusArea,
        roundNumber: session.currentRound,
        startTime: now,
        endTime: null,
        response: null,
        score: null,
        feedback: null,
        status: 'active'
      };

      this.roundHistory.set(nextRoundId, nextRound);

      return {
        sessionId: session.sessionId,
        roundId: nextRoundId,
        roundNumber: session.currentRound,
        totalRounds: session.roundCount,
        previousScore: score,
        continued: true
      };
    } else {
      session.status = 'completed';

      return {
        sessionId: session.sessionId,
        roundId,
        roundNumber: session.currentRound,
        totalRounds: session.roundCount,
        finalScore: score,
        completed: true,
        masteryAchieved: this.getMasteryScore(round.userId, round.focusArea) >= this.config.masteryThreshold
      };
    }
  }

  /**
   * Score a response (basic algorithm - can be enhanced)
   */
  scoreResponse(response, focusArea) {
    if (!response || response.trim().length === 0) {
      return 0;
    }

    // Simple scoring: length and keywords
    const length = response.length;
    const keywords = this.getKeywords(focusArea);

    let score = Math.min(100, Math.max(0, (length / 500) * 100));

    // Boost if keywords found
    let keywordCount = 0;
    keywords.forEach(keyword => {
      if (response.toLowerCase().includes(keyword.toLowerCase())) {
        keywordCount++;
      }
    });

    const keywordBoost = (keywordCount / keywords.length) * 30;
    score = Math.min(100, score + keywordBoost);

    return Math.round(score);
  }

  /**
   * Get keywords for a focus area
   */
  getKeywords(focusArea) {
    const keywordMap = {
      'javascript': ['function', 'variable', 'array', 'object', 'async', 'promise'],
      'python': ['def', 'class', 'import', 'loop', 'function', 'variable'],
      'react': ['component', 'state', 'props', 'useEffect', 'useState', 'jsx'],
      'typescript': ['interface', 'type', 'generic', 'class', 'enum', 'decorator'],
      'sql': ['select', 'from', 'where', 'join', 'group', 'order'],
      'default': ['concept', 'example', 'explanation', 'detail', 'answer']
    };

    return keywordMap[focusArea.toLowerCase()] || keywordMap.default;
  }

  /**
   * Update mastery score for user + domain
   */
  updateMastery(userId, domain, score) {
    const key = `${userId}:${domain}`;
    const current = this.masteryScores.get(key) || 0;

    // Moving average: 70% old + 30% new
    const updated = Math.round(current * 0.7 + score * 0.3);
    this.masteryScores.set(key, updated);

    // Emit if mastery improved significantly
    if (updated > current + 10) {
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'mastery.improved',
          aggregateId: userId,
          data: {
            userId,
            domain,
            previousScore: current,
            newScore: updated,
            improvement: updated - current,
            timestamp: Date.now()
          }
        }).catch(() => {}); // Silent fail for async emit
      }
    }
  }

  /**
   * Get mastery score for user + domain
   */
  getMasteryScore(userId, domain) {
    const key = `${userId}:${domain}`;
    return this.masteryScores.get(key) || 0;
  }

  /**
   * Get all mastery scores for user
   */
  getMasteryMetrics(userId) {
    const metrics = {
      userId,
      domains: {},
      totalProgress: 0,
      timestamp: Date.now()
    };

    let totalScore = 0;
    let domainCount = 0;

    // Collect all domains for this user
    for (const [key, score] of this.masteryScores.entries()) {
      const [id, domain] = key.split(':');
      if (id === userId) {
        metrics.domains[domain] = {
          score,
          level: this.getLevel(score),
          threshold: this.config.masteryThreshold
        };
        totalScore += score;
        domainCount++;
      }
    }

    if (domainCount > 0) {
      metrics.totalProgress = Math.round(totalScore / domainCount);
    }

    return metrics;
  }

  /**
   * Get proficiency level from score
   */
  getLevel(score) {
    if (score >= this.config.masteryThreshold) return 'Mastered';
    if (score >= 70) return 'Proficient';
    if (score >= 50) return 'Competent';
    if (score >= 30) return 'Developing';
    return 'Beginner';
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get round by ID
   */
  getRound(roundId) {
    return this.roundHistory.get(roundId);
  }

  /**
   * Get all sessions for user
   */
  getUserSessions(userId) {
    const sessions = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        sessions.push({
          sessionId,
          focusArea: session.focusArea,
          status: session.status,
          roundCount: session.roundCount,
          currentRound: session.currentRound,
          score: Math.round(session.totalScore / session.currentRound || 0),
          startTime: session.startTime
        });
      }
    }

    return sessions;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      totalRounds: this.roundHistory.size,
      trackedDomains: new Set(
        Array.from(this.masteryScores.keys()).map(k => k.split(':')[1])
      ).size,
      averageMastery: this.getAverageMastery(),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate average mastery across all users
   */
  getAverageMastery() {
    if (this.masteryScores.size === 0) return 0;

    const sum = Array.from(this.masteryScores.values())
      .reduce((a, b) => a + b, 0);

    return Math.round(sum / this.masteryScores.size);
  }
}

export default TrainingEngine;
