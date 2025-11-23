/**
 * Phase 6C: Learning Velocity Tracker
 * 
 * Plots mastery progression over time, calculates learning velocity,
 * and predicts 85% achievement with confidence scores
 */

export class LearningVelocityTracker {
  constructor() {
    this.history = [];
    this.velocityCache = new Map();
    this.predictionCache = new Map();
    this.EMA_ALPHA = 0.2; // Exponential smoothing factor
    this.DECAY_HALF_LIFE = 14; // days (older data decays)
  }

  /**
   * Record a mastery milestone
   */
  recordMilestone(domain, mastery, metadata = {}) {
    const milestone = {
      timestamp: new Date().toISOString(),
      domain,
      mastery: parseFloat(mastery),
      ...metadata
    };
    this.history.push(milestone);
    
    // Invalidate caches
    this.velocityCache.delete(domain);
    this.predictionCache.delete(domain);
    
    return milestone;
  }

  /**
   * Get domain history
   */
  getDomainHistory(domain) {
    return this.history
      .filter(m => m.domain === domain)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Calculate exponential moving average velocity
   * Weighs recent progress more heavily, and applies temporal decay
   */
  calculateVelocityWithEMA(domain) {
    if (this.velocityCache.has(domain)) {
      return this.velocityCache.get(domain);
    }

    const history = this.getDomainHistory(domain);
    if (history.length < 2) {
      return null;
    }

    const now = Date.now();
    let ema = 0;
    let weight = 0;

    // Calculate velocity between consecutive points, with decay
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];

      const timeSpan = new Date(curr.timestamp) - new Date(prev.timestamp);
      const daysDiff = timeSpan / (1000 * 60 * 60 * 24);

      if (daysDiff === 0) continue;

      const masteryGain = curr.mastery - prev.mastery;
      const pointVelocity = masteryGain / daysDiff; // % per day

      // Apply temporal decay: older data has less weight
      const pointAge = (now - new Date(curr.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.exp(-(Math.LN2 / this.DECAY_HALF_LIFE) * pointAge);

      const weightedVelocity = pointVelocity * decayFactor;
      weight += decayFactor;

      ema = ema * (1 - this.EMA_ALPHA) + weightedVelocity * this.EMA_ALPHA;
    }

    const result = {
      domain,
      velocityPerDay: parseFloat(ema.toFixed(3)), // % per day
      trend: ema > 0.2 ? '📈 accelerating' : ema > 0 ? '→ steady' : '📉 decelerating',
      dataPoints: history.length,
      timespan: {
        start: history[0].timestamp,
        end: history[history.length - 1].timestamp,
        daysSpanned: (
          (new Date(history[history.length - 1].timestamp) - new Date(history[0].timestamp)) /
          (1000 * 60 * 60 * 24)
        ).toFixed(1)
      }
    };

    this.velocityCache.set(domain, result);
    return result;
  }

  /**
   * Predict achievement date for target mastery (default 85%)
   * Returns prediction with confidence intervals
   */
  predictAchievementDate(domain, currentMastery, targetMastery = 85) {
    const cacheKey = `${domain}-${currentMastery}-${targetMastery}`;
    if (this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey);
    }

    const velocity = this.calculateVelocityWithEMA(domain);
    
    if (!velocity || velocity.velocityPerDay <= 0) {
      const result = {
        achievable: false,
        reason: velocity ? 'Velocity is zero or negative' : 'Insufficient historical data (need 2+ milestones)',
        recommendation: 'Focus on consistent practice'
      };
      this.predictionCache.set(cacheKey, result);
      return result;
    }

    const masteryGap = targetMastery - currentMastery;

    if (masteryGap <= 0) {
      const result = {
        achievable: true,
        status: 'ACHIEVED',
        currentMastery,
        targetMastery,
        achieved: true,
        message: `🎉 Already at ${currentMastery}% mastery!`
      };
      this.predictionCache.set(cacheKey, result);
      return result;
    }

    // Base prediction
    const daysToTarget = masteryGap / velocity.velocityPerDay;
    const achievementDate = new Date();
    achievementDate.setDate(achievementDate.getDate() + daysToTarget);

    // Confidence: based on consistency and velocity strength
    const history = this.getDomainHistory(domain);
    const velocities = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const timeSpan = new Date(curr.timestamp) - new Date(prev.timestamp);
      const daysDiff = timeSpan / (1000 * 60 * 60 * 24);
      if (daysDiff > 0) {
        velocities.push((curr.mastery - prev.mastery) / daysDiff);
      }
    }

    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 1 - (stdDev / Math.max(Math.abs(avgVelocity), 0.1)));

    const strengthScore = Math.min(1, Math.abs(velocity.velocityPerDay) / 0.5); // 0.5% per day is "strong"
    let confidence = (consistencyScore * 0.6 + strengthScore * 0.4);
    confidence = Math.min(Math.max(confidence, 0), 1);

    // Confidence intervals (68/95 confidence bands)
    const confidenceInterval = stdDev * daysToTarget;
    const date68 = new Date(achievementDate.getTime() + confidenceInterval * 1000 * 60 * 60 * 24);
    const date95 = new Date(achievementDate.getTime() + confidenceInterval * 2 * 1000 * 60 * 60 * 24);

    const result = {
      achievable: true,
      currentMastery: parseFloat(currentMastery),
      targetMastery,
      masteryGap,
      velocity: velocity.velocityPerDay,
      trend: velocity.trend,
      daysToTarget: Math.ceil(daysToTarget),
      weeksToTarget: (daysToTarget / 7).toFixed(1),
      monthsToTarget: (daysToTarget / 30).toFixed(1),
      predictedDate: achievementDate.toISOString().split('T')[0],
      confidence: parseFloat((confidence * 100).toFixed(0)),
      confidenceLevel: confidence > 0.8 ? 'HIGH' : confidence > 0.5 ? 'MODERATE' : 'LOW',
      confidenceBands: {
        optimistic68: date68.toISOString().split('T')[0],
        conservative95: date95.toISOString().split('T')[0]
      },
      recommendation: this.generateRecommendation(daysToTarget, consistencyScore)
    };

    this.predictionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Generate actionable recommendation based on projection
   */
  generateRecommendation(daysToTarget, consistency) {
    if (daysToTarget < 7) {
      return '🚀 On pace! You\'re very close!';
    } else if (daysToTarget < 14) {
      return '💪 Great progress. Keep the momentum going!';
    } else if (daysToTarget < 30) {
      return '📚 Stay consistent. You\'re tracking well.';
    } else if (daysToTarget < 60) {
      return '⏰ Long-term goal. Break it into smaller milestones.';
    } else if (consistency < 0.6) {
      return '🔄 Increase consistency. Try daily practice.';
    } else {
      return '⚡ Boost intensity. Consider more challenges.';
    }
  }

  /**
   * Get mastery trajectory (points for plotting)
   */
  getMasteryTrajectory(domain, maxPoints = 100) {
    const history = this.getDomainHistory(domain);
    if (history.length === 0) return [];

    // Sample or include all points
    const step = Math.max(1, Math.ceil(history.length / maxPoints));
    return history
      .filter((_, idx) => idx % step === 0 || idx === history.length - 1)
      .map(m => ({
        date: m.timestamp.split('T')[0],
        mastery: m.mastery,
        timestamp: new Date(m.timestamp).getTime()
      }));
  }

  /**
   * Calculate velocity trend (is learning accelerating or decelerating?)
   */
  getVelocityTrend(domain) {
    const history = this.getDomainHistory(domain);
    if (history.length < 6) return { trend: 'insufficient_data', confidence: 0 };

    const mid = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, mid);
    const secondHalf = history.slice(mid);

    const v1 = this.calculateWeeklyVelocity(firstHalf);
    const v2 = this.calculateWeeklyVelocity(secondHalf);

    const delta = v2 - v1;
    const changeMagnitude = Math.abs(delta / Math.max(Math.abs(v1), 0.01));

    let trend = 'stable';
    if (delta > 0 && changeMagnitude > 0.2) trend = 'accelerating';
    if (delta < -0.1 && changeMagnitude > 0.2) trend = 'decelerating';

    return {
      trend,
      velocityChange: delta.toFixed(3),
      confidence: Math.min((changeMagnitude * 2), 1).toFixed(2)
    };
  }

  /**
   * Calculate average velocity for a subset of history
   */
  calculateWeeklyVelocity(historySubset) {
    if (historySubset.length < 2) return 0;

    const timeSpan = new Date(historySubset[historySubset.length - 1].timestamp) - new Date(historySubset[0].timestamp);
    const daysDiff = timeSpan / (1000 * 60 * 60 * 24);
    const masteryGain = historySubset[historySubset.length - 1].mastery - historySubset[0].mastery;

    return daysDiff > 0 ? masteryGain / daysDiff : 0;
  }

  /**
   * Get comparative analysis across domains
   */
  getComparativeAnalysis() {
    const domains = [...new Set(this.history.map(m => m.domain))];
    const analysis = {};

    domains.forEach(domain => {
      const velocity = this.calculateVelocityWithEMA(domain);
      const history = this.getDomainHistory(domain);
      const currentMastery = history.length > 0 ? history[history.length - 1].mastery : 0;
      const prediction = this.predictAchievementDate(domain, currentMastery);

      analysis[domain] = {
        currentMastery,
        velocity: velocity?.velocityPerDay || 0,
        trend: velocity?.trend || 'N/A',
        prediction: prediction.achievable ? {
          predictedDate: prediction.predictedDate,
          daysRemaining: prediction.daysToTarget,
          confidence: prediction.confidenceLevel
        } : null,
        dataPoints: history.length
      };
    });

    return analysis;
  }
}

/**
 * Visualization data generator for charting libraries
 */
export class VelocityVisualizationGenerator {
  /**
   * Generate data for Chart.js line chart
   */
  static generateLineChartData(trajectory, label = 'Mastery') {
    return {
      labels: trajectory.map(p => p.date),
      datasets: [{
        label,
        data: trajectory.map(p => p.mastery),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.1,
        fill: true
      }]
    };
  }

  /**
   * Generate data for prediction with confidence bands
   */
  static generatePredictionChart(trajectory, prediction) {
    if (!prediction.achievable) {
      return { labels: [], datasets: [] };
    }

    const lastDate = trajectory[trajectory.length - 1].timestamp;
    const daysToTarget = prediction.daysToTarget;

    // Generate future dates
    const futurePoints = [];
    for (let i = 0; i <= daysToTarget; i += Math.max(1, Math.ceil(daysToTarget / 20))) {
      const date = new Date(lastDate + i * 24 * 60 * 60 * 1000);
      const estimatedMastery = Math.min(
        prediction.currentMastery + (prediction.velocity * i),
        prediction.targetMastery
      );
      futurePoints.push({
        date: date.toISOString().split('T')[0],
        mastery: Math.round(estimatedMastery * 10) / 10
      });
    }

    return {
      labels: [...trajectory.map(p => p.date), ...futurePoints.map(p => p.date)],
      datasets: [
        {
          label: 'Historical Mastery',
          data: [...trajectory.map(p => p.mastery), ...Array(futurePoints.length).fill(null)],
          borderColor: 'rgb(75, 192, 192)',
          fill: false
        },
        {
          label: 'Predicted Path',
          data: [...Array(trajectory.length).fill(null), ...futurePoints.map(p => p.mastery)],
          borderColor: 'rgb(255, 99, 132)',
          borderDash: [5, 5],
          fill: false
        },
        {
          label: `85% Target`,
          data: Array(trajectory.length + futurePoints.length).fill(prediction.targetMastery),
          borderColor: 'rgb(54, 162, 235)',
          borderDash: [2, 2],
          fill: false
        }
      ]
    };
  }

  /**
   * Generate comparative bar chart data
   */
  static generateComparativeChart(comparative) {
    const domains = Object.keys(comparative);
    return {
      labels: domains,
      datasets: [
        {
          label: 'Current Mastery %',
          data: domains.map(d => comparative[d].currentMastery),
          backgroundColor: 'rgba(75, 192, 192, 0.8)'
        },
        {
          label: 'Velocity (% per day)',
          data: domains.map(d => comparative[d].velocity * 10), // Scale for visibility
          backgroundColor: 'rgba(255, 99, 132, 0.8)'
        }
      ]
    };
  }
}

export default LearningVelocityTracker;
