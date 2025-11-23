// @version 2.1.28
/**
 * Analytics Engine
 * Provides trend analysis, anomaly detection, and comparative metrics
 * for system performance and learning metrics
 */

export class AnalyticsEngine {
  constructor() {
    this.metrics = new Map();
    this.trends = new Map();
    this.anomalies = [];
  }

  /**
   * Record a metric data point
   * @param {string} metric - Metric name (e.g., 'training_accuracy', 'api_latency')
   * @param {number} value - Metric value
   * @param {object} metadata - Additional context (provider, timestamp, etc.)
   * @returns {array} - Updated metric history
   */
  recordMetric(metric, value, metadata = {}) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const dataPoint = {
      value: parseFloat(value),
      timestamp: metadata.timestamp || new Date().toISOString(),
      metadata
    };

    const history = this.metrics.get(metric);
    history.push(dataPoint);

    // Keep last 1000 data points per metric
    if (history.length > 1000) {
      history.shift();
    }

    return history;
  }

  /**
   * Analyze trends using linear regression
   * @param {string} metric - Metric to analyze
   * @param {number} windowSize - Number of recent data points to analyze
   * @returns {object} - Trend analysis with direction and rate
   */
  analyzeTrend(metric, windowSize = 20) {
    const history = this.metrics.get(metric) || [];

    if (history.length < 2) {
      return {
        metric,
        trend: 'insufficient_data',
        direction: 'unknown',
        rate: 0,
        confidence: 0
      };
    }

    // Use recent data points
    const data = history.slice(-windowSize);
    const n = data.length;

    // Calculate linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, idx) => {
      const x = idx;
      const y = point.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    let ssRes = 0, ssTot = 0;
    const avgY = sumY / n;

    data.forEach((point, idx) => {
      const predicted = slope * idx + intercept;
      ssRes += Math.pow(point.value - predicted, 2);
      ssTot += Math.pow(point.value - avgY, 2);
    });

    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

    return {
      metric,
      trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'degrading' : 'stable',
      direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
      rate: parseFloat(slope.toFixed(4)),
      confidence: parseFloat(Math.abs(rSquared).toFixed(2)),
      current: data[n - 1]?.value || 0,
      previous: data[n - 2]?.value || 0,
      average: parseFloat((sumY / n).toFixed(2)),
      dataPoints: n,
      window: windowSize
    };
  }

  /**
   * Detect anomalies using z-score method
   * @param {string} metric - Metric to analyze
   * @param {number} threshold - Z-score threshold (default 2.0)
   * @returns {array} - Detected anomalies with severity
   */
  detectAnomalies(metric, threshold = 2.0) {
    const history = this.metrics.get(metric) || [];

    if (history.length < 5) {
      return [];
    }

    // Calculate mean and standard deviation
    const values = history.map(p => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return [];
    }

    // Calculate z-scores and identify anomalies
    const anomalies = [];
    history.forEach((point) => {
      const zScore = Math.abs((point.value - mean) / stdDev);

      if (zScore > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          zScore: parseFloat(zScore.toFixed(2)),
          severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
          direction: point.value > mean ? 'above_average' : 'below_average',
          metadata: point.metadata
        });
      }
    });

    return anomalies;
  }

  /**
   * Compare metrics across different dimensions
   * @param {array} metrics - Metrics to compare
   * @param {string} dimension - Comparison dimension (provider, timerange, etc.)
   * @returns {object} - Comparative analysis
   */
  compareMetrics(metrics, dimension = 'overall') {
    const comparisons = {};

    metrics.forEach(metric => {
      const history = this.metrics.get(metric) || [];

      if (history.length === 0) {
        comparisons[metric] = {
          metric,
          status: 'no_data',
          average: 0,
          min: 0,
          max: 0
        };
        return;
      }

      const values = history.map(p => p.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const current = values[values.length - 1];

      comparisons[metric] = {
        metric,
        current,
        average: parseFloat(avg.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        range: parseFloat((max - min).toFixed(2)),
        variance: parseFloat((Math.pow(
          values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length,
          0.5
        )).toFixed(2)),
        dataPoints: values.length
      };
    });

    return {
      dimension,
      timestamp: new Date().toISOString(),
      comparisons,
      summary: this.generateComparativeSummary(comparisons)
    };
  }

  /**
   * Generate insights about metric comparison
   */
  generateComparativeSummary(comparisons) {
    const insights = [];

    Object.values(comparisons).forEach(comp => {
      if (comp.current > comp.average * 1.2) {
        insights.push(`${comp.metric}: Above average (${comp.current} vs ${comp.average})`);
      } else if (comp.current < comp.average * 0.8) {
        insights.push(`${comp.metric}: Below average (${comp.current} vs ${comp.average})`);
      }
    });

    return {
      count: insights.length,
      insights
    };
  }

  /**
   * Generate comprehensive analytics report
   */
  generateReport(metricList) {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    metricList.forEach(metric => {
      const trend = this.analyzeTrend(metric);
      const anomalies = this.detectAnomalies(metric);

      report.metrics[metric] = {
        trend,
        anomalies,
        anomalyCount: anomalies.length,
        recentAnomaly: anomalies.length > 0 ? anomalies[anomalies.length - 1] : null
      };
    });

    report.summary = this.generateReportSummary(report.metrics);

    return report;
  }

  /**
   * Generate report summary with key insights
   */
  generateReportSummary(metrics) {
    const improving = Object.values(metrics).filter(m => m.trend.trend === 'improving').length;
    const degrading = Object.values(metrics).filter(m => m.trend.trend === 'degrading').length;
    const stable = Object.values(metrics).filter(m => m.trend.trend === 'stable').length;
    const totalAnomalies = Object.values(metrics).reduce((sum, m) => sum + m.anomalyCount, 0);

    return {
      improving,
      degrading,
      stable,
      totalAnomalies,
      healthScore: this.calculateHealthScore(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  calculateHealthScore(metrics) {
    let score = 100;

    Object.values(metrics).forEach(metric => {
      // Deduct for degrading trends
      if (metric.trend.trend === 'degrading') {
        score -= 10;
      }

      // Deduct for anomalies
      score -= metric.anomalyCount * 5;

      // Deduct for low confidence
      if (metric.trend.confidence < 0.5) {
        score -= 5;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    Object.entries(metrics).forEach(([name, metric]) => {
      if (metric.trend.trend === 'degrading') {
        recommendations.push(`${name} is degrading. Current rate: ${metric.trend.rate}/point. Investigate root cause.`);
      }

      if (metric.anomalyCount > 0) {
        recommendations.push(`${name} has ${metric.anomalyCount} anomalies. Latest: ${metric.recentAnomaly.severity} severity.`);
      }

      if (metric.trend.confidence < 0.5) {
        recommendations.push(`${name} has high variance. Collect more data for reliable trend analysis.`);
      }
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(metric, startTime, endTime) {
    const history = this.metrics.get(metric) || [];
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return history.filter(point => {
      const time = new Date(point.timestamp).getTime();
      return time >= start && time <= end;
    });
  }

  /**
   * Calculate percentile
   */
  getPercentile(metric, percentile = 95) {
    const history = this.metrics.get(metric) || [];

    if (history.length === 0) return 0;

    const values = history.map(p => p.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;

    return values[Math.max(0, index)];
  }
}

export default new AnalyticsEngine();
