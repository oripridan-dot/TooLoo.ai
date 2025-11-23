/**
 * Analytics Integration Module
 * 
 * Provides hooks for training-server and coach-server to:
 * - Record learning milestones to analytics server
 * - Query velocity predictions and badge suggestions
 * - Update learner profiles for leaderboards
 * 
 * Usage:
 *   import AnalyticsIntegration from './modules/analytics-integration.js';
 *   const analytics = new AnalyticsIntegration();
 *   
 *   // Record when user completes a challenge
 *   await analytics.recordChallengeMilestone(userId, challengeId, score, domain);
 *   
 *   // Get velocity tracking
 *   const velocity = await analytics.getVelocity(domain, daysWindow);
 *   
 *   // Get badge suggestions
 *   const badges = await analytics.getBadgeSuggestions(userId);
 */

export default class AnalyticsIntegration {
  constructor(options = {}) {
    this.analyticsPort = process.env.ANALYTICS_PORT || 3012;
    this.analyticsBase = `http://127.0.0.1:${this.analyticsPort}`;
    this.enabled = process.env.ANALYTICS_ENABLED !== 'false';
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 2;
  }

  /**
   * Health check for analytics server
   */
  async healthCheck() {
    try {
      const res = await fetch(`${this.analyticsBase}/health`, {
        timeout: this.timeout
      });
      return res.status === 200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Record a learning milestone (challenge completion, practice, etc.)
   */
  async recordChallengeMilestone(userId, challengeId, score, domain = 'consensus') {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const payload = {
        userId,
        challengeId,
        score,
        domain,
        timestamp: new Date().toISOString()
      };

      const res = await fetch(`${this.analyticsBase}/api/v1/analytics/milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: this.timeout
      });

      if (res.status !== 200) {
        console.warn(`Analytics milestone failed: ${res.status}`);
        return { ok: false, status: res.status };
      }

      return await res.json();
    } catch (e) {
      console.error('Analytics milestone error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Record multiple milestones in batch
   */
  async recordMilestones(milestones) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(`${this.analyticsBase}/api/v1/analytics/milestones-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones }),
        timeout: this.timeout * 2
      });

      if (res.status !== 200) {
        console.warn(`Analytics batch failed: ${res.status}`);
        return { ok: false, status: res.status };
      }

      return await res.json();
    } catch (e) {
      console.error('Analytics batch error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get velocity tracking for a domain
   */
  async getVelocity(domain, daysWindow = 30) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/velocity-enhanced?domain=${domain}&days=${daysWindow}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics velocity error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get 85% mastery achievement prediction
   */
  async predictAchievement(domain, currentMastery = 50) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/prediction?domain=${domain}&current=${currentMastery}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics prediction error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get acceleration analysis
   */
  async getAcceleration(domain) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/acceleration?domain=${domain}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics acceleration error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get badge suggestions for a user
   */
  async getBadgeSuggestions(userId) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/badges/suggestions?userId=${userId}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics badge suggestions error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get user's current badges
   */
  async getUserBadges(userId) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/badges/user?userId=${userId}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics user badges error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Unlock a specific badge
   */
  async unlockBadge(userId, badgeId) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/badges/unlock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, badgeId }),
          timeout: this.timeout
        }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics unlock badge error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Update learner profile for leaderboard
   */
  async updateLearnerProfile(userId, profileData) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/learner/profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, ...profileData }),
          timeout: this.timeout
        }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics learner profile error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get leaderboard for a domain
   */
  async getLeaderboard(domain, limit = 10) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/leaderboard?domain=${domain}&limit=${limit}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics leaderboard error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get overall leaderboard across all domains
   */
  async getOverallLeaderboard(limit = 10) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/leaderboard-overall?limit=${limit}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics overall leaderboard error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Compare two users
   */
  async compareUsers(userId1, userId2) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/comparison?user1=${userId1}&user2=${userId2}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics comparison error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get peer comparison and similar learners
   */
  async getPeerAnalysis(userId, limit = 5) {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/peer-analysis?userId=${userId}&limit=${limit}`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics peer analysis error:', e.message);
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboard() {
    if (!this.enabled) return { ok: false, reason: 'analytics disabled' };

    try {
      const res = await fetch(
        `${this.analyticsBase}/api/v1/analytics/dashboard`,
        { timeout: this.timeout }
      );

      if (res.status === 200) {
        return await res.json();
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error('Analytics dashboard error:', e.message);
      return { ok: false, error: e.message };
    }
  }
}
