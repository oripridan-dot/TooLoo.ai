/**
 * Phase 6C: Learning Velocity Tracker
 * Plots mastery gain over time and predicts 85% achievement
 * Analyzes learning acceleration/deceleration patterns
 */

export class VelocityTracker {
  constructor() {
    this.velocityHistory = new Map(); // domain -> velocity readings over time
    this.accelerationTrends = new Map();
  }

  /**
   * Record a learning milestone
   */
  recordMilestone(event) {
    const milestone = {
      timestamp: new Date().toISOString(),
      domain: event.domain,
      masteryBefore: event.masteryBefore,
      masteryAfter: event.masteryAfter,
      masteryGain: event.masteryAfter - event.masteryBefore,
      sessionDuration: event.sessionDuration || 0,
      challengeType: event.challengeType,
      score: event.score,
      efficiency: (event.masteryAfter - event.masteryBefore) / (event.sessionDuration || 1)
    };

    if (!this.velocityHistory.has(event.domain)) {
      this.velocityHistory.set(event.domain, []);
    }

    this.velocityHistory.get(event.domain).push(milestone);
    return milestone;
  }

  /**
   * Calculate instantaneous velocity (points per day)
   */
  calculateVelocity(domain, days = 7) {
    const history = this.velocityHistory.get(domain) || [];
    if (history.length === 0) return null;

    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentEvents = history.filter(e => new Date(e.timestamp) > cutoff);

    if (recentEvents.length < 2) return null;

    const totalGain = recentEvents.reduce((sum, e) => sum + e.masteryGain, 0);
    const daysElapsed = (now - new Date(recentEvents[0].timestamp)) / (1000 * 60 * 60 * 24);

    return {
      domain,
      period: `${days} days`,
      totalGain: parseFloat(totalGain.toFixed(2)),
      daysElapsed: parseFloat(daysElapsed.toFixed(1)),
      velocityPerDay: parseFloat((totalGain / daysElapsed).toFixed(3)),
      eventCount: recentEvents.length,
      averageEfficiency: parseFloat(
        (recentEvents.reduce((sum, e) => sum + e.efficiency, 0) / recentEvents.length).toFixed(3)
      ),
      trend: this.calculateTrend(recentEvents)
    };
  }

  /**
   * Determine trend direction
   */
  calculateTrend(events) {
    if (events.length < 2) return 'insufficient_data';

    const firstHalf = events.slice(0, Math.floor(events.length / 2));
    const secondHalf = events.slice(Math.floor(events.length / 2));

    const firstHalfVel = firstHalf.reduce((sum, e) => sum + e.masteryGain, 0) / firstHalf.length;
    const secondHalfVel = secondHalf.reduce((sum, e) => sum + e.masteryGain, 0) / secondHalf.length;

    const acceleration = secondHalfVel - firstHalfVel;

    if (acceleration > 0.5) return 'accelerating_🚀';
    if (acceleration > 0) return 'improving_📈';
    if (acceleration > -0.5) return 'stable_➡️';
    if (acceleration > -1) return 'declining_📉';
    return 'critical_⚠️';
  }

  /**
   * Predict when mastery target will be reached
   */
  predictAchievement(domain, currentMastery, targetMastery = 85) {
    const velocity = this.calculateVelocity(domain, 7);

    if (!velocity || velocity.velocityPerDay <= 0) {
      return {
        achievable: false,
        reason: 'Insufficient data or negative velocity',
        domain,
        currentMastery,
        targetMastery
      };
    }

    const masteryGap = targetMastery - currentMastery;
    const daysToTarget = masteryGap / velocity.velocityPerDay;

    const achievementDate = new Date();
    achievementDate.setDate(achievementDate.getDate() + daysToTarget);

    const confidence = this.calculateConfidence(velocity, daysToTarget);

    return {
      achievable: true,
      domain,
      currentMastery: parseFloat(currentMastery.toFixed(1)),
      targetMastery,
      masteryGap: parseFloat(masteryGap.toFixed(1)),
      daysToTarget: Math.ceil(daysToTarget),
      weeksToTarget: parseFloat((daysToTarget / 7).toFixed(1)),
      predictedDate: achievementDate.toISOString().split('T')[0],
      predictedDateISO: achievementDate.toISOString(),
      confidence,
      velocity: velocity.velocityPerDay,
      recentTrend: velocity.trend,
      recommendation: this.getRecommendation(daysToTarget, velocity.trend),
      chartData: this.generateProjectionChart(domain, currentMastery, targetMastery, velocity.velocityPerDay, daysToTarget)
    };
  }

  /**
   * Calculate prediction confidence (0-100)
   */
  calculateConfidence(velocity, daysToTarget) {
    let confidence = 75; // base

    // Add or subtract based on data consistency
    if (velocity.eventCount >= 10) confidence += 15;
    else if (velocity.eventCount >= 5) confidence += 10;

    // Check consistency
    const history = this.velocityHistory.get(velocity.domain) || [];
    if (history.length >= 10) {
      const recentVelocities = this.getMultipleVelocities(velocity.domain, [7, 14, 30]);
      const variance = this.calculateVariance(recentVelocities);
      if (variance < 0.1) confidence += 10;
      if (variance > 0.5) confidence -= 15;
    }

    // Time projection impact
    if (daysToTarget > 60) confidence -= 10;
    if (daysToTarget > 90) confidence -= 15;

    return Math.max(20, Math.min(100, confidence));
  }

  /**
   * Get velocity over multiple time periods
   */
  getMultipleVelocities(domain, periods = [7, 14, 30]) {
    return periods.map(days => {
      const vel = this.calculateVelocity(domain, days);
      return vel ? vel.velocityPerDay : 0;
    });
  }

  /**
   * Calculate variance in velocities
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Generate chart data for visualization
   */
  generateProjectionChart(domain, current, target, velocity, days) {
    const points = [];
    const resolution = Math.max(7, Math.floor(days / 20));

    for (let i = 0; i <= days; i += resolution) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const mastery = Math.min(target, current + velocity * i);

      points.push({
        day: i,
        date: date.toISOString().split('T')[0],
        mastery: parseFloat(mastery.toFixed(1)),
        targetReached: mastery >= target
      });
    }

    return {
      title: `${domain} Mastery Projection`,
      currentPoint: { day: 0, mastery: current, marker: '●' },
      targetPoint: { day: days, mastery: target, marker: '🎯' },
      trajectory: points,
      avgMasteryPerWeek: parseFloat((velocity * 7).toFixed(2))
    };
  }

  /**
   * Get contextual recommendation
   */
  getRecommendation(daysToTarget, trend) {
    if (daysToTarget <= 7) {
      return '🎯 You\'re very close! Sprint to the finish line';
    }

    if (daysToTarget <= 14) {
      return '📈 Great pace! Maintain consistency for 2 more weeks';
    }

    if (daysToTarget <= 30) {
      return '💪 On track! Keep up the steady effort for a month';
    }

    if (trend.includes('accelerating')) {
      return '🚀 Accelerating well! Continue your current strategy';
    }

    if (trend.includes('declining')) {
      return '⚠️ Velocity declining. Increase challenge difficulty or frequency';
    }

    return '✅ Steady progress. Consistency is your strength';
  }

  /**
   * Analyze learning acceleration pattern
   */
  analyzeLearningAcceleration(domain) {
    const history = this.velocityHistory.get(domain) || [];
    if (history.length < 10) {
      return { 
        status: 'insufficient_data',
        pattern: 'insufficient_data',
        insights: ['Not enough data to analyze acceleration pattern'],
        recommendations: ['Continue practicing to build history']
      };
    }

    // Calculate velocity over 4 periods
    const periods = [7, 14, 30, 60];
    const velocities = periods.map(p => this.calculateVelocity(domain, p)?.velocityPerDay || 0);

    const accelerationRate = velocities.length > 0 && velocities[0] > 0
      ? (velocities[velocities.length - 1] - velocities[0]) / velocities[0]
      : 0;

    return {
      domain,
      fourWeekVelocity: velocities,
      accelerationRate: parseFloat(accelerationRate.toFixed(3)),
      pattern: accelerationRate > 0.3 ? 'accelerating' : accelerationRate < -0.3 ? 'decelerating' : 'stable',
      insights: this.generateAccelerationInsights(velocities, accelerationRate),
      recommendations: this.getAccelerationRecommendations(accelerationRate)
    };
  }

  /**
   * Generate insights from acceleration data
   */
  generateAccelerationInsights(velocities, rate) {
    const insights = [];

    if (Math.abs(rate) > 1) {
      insights.push(`Dramatic ${rate > 0 ? 'increase' : 'decrease'} in learning pace`);
    }

    const highVel = velocities.filter(v => v > 1).length;
    if (highVel >= 3) {
      insights.push('Consistently high learning velocity - excellent momentum');
    }

    if (velocities[0] > 0.5 && velocities[velocities.length - 1] < 0.1) {
      insights.push('Sharp decline in learning pace - may need intervention');
    }

    return insights;
  }

  /**
   * Get recommendations based on acceleration
   */
  getAccelerationRecommendations(rate) {
    if (rate > 0.5) return ['Push harder challenges', 'Reduce break time', 'Study in groups'];
    if (rate > 0) return ['Maintain current routine', 'Gradually increase difficulty'];
    if (rate > -0.3) return ['Add variety to challenges', 'Track what\'s working'];
    return ['Take a brief break', 'Review fundamentals', 'Adjust strategy'];
  }

  /**
   * Get mastery over time series data
   */
  getMasteryTimeSeries(domain) {
    const history = this.velocityHistory.get(domain) || [];

    const cumulative = [];
    let runningMastery = 0;

    history.forEach(event => {
      runningMastery += event.masteryGain;
      cumulative.push({
        timestamp: event.timestamp,
        cumulativeMastery: parseFloat(Math.min(100, runningMastery).toFixed(2)),
        sessionScore: event.score,
        efficiency: event.efficiency
      });
    });

    return {
      domain,
      dataPoints: cumulative.length,
      series: cumulative
    };
  }

  /**
   * Get velocity statistics summary
   */
  getVelocityStats(domain) {
    const velocity7 = this.calculateVelocity(domain, 7);
    const velocity14 = this.calculateVelocity(domain, 14);
    const velocity30 = this.calculateVelocity(domain, 30);

    return {
      domain,
      velocity7Day: velocity7?.velocityPerDay || 0,
      velocity14Day: velocity14?.velocityPerDay || 0,
      velocity30Day: velocity30?.velocityPerDay || 0,
      trend: velocity7?.trend || 'no_data',
      acceleration: ((velocity7?.velocityPerDay || 0) - (velocity30?.velocityPerDay || 0)) / (velocity30?.velocityPerDay || 1),
      lastRecorded: this.velocityHistory.get(domain)?.[this.velocityHistory.get(domain).length - 1]?.timestamp || null
    };
  }
}

export default VelocityTracker;
