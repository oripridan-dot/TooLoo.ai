/**
 * Predictive Analytics Module
 * Provides statistical analysis, trend forecasting, and anomaly detection
 */

/**
 * Calculate moving average for a given period
 * @param {Array<number>} data - Time series data
 * @param {number} period - Window size for moving average
 * @returns {Array<number>} Moving averages
 */
export function calculateMovingAverage(data, period) {
  if (!data || data.length < period) {
    return [];
  }

  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / period;
    result.push(avg);
  }
  return result;
}

/**
 * Calculate trend analysis for multiple periods
 * @param {Array<Object>} timeSeries - Array of {timestamp, value} objects
 * @returns {Object} Trend analysis with 7, 30, and 90 day moving averages
 */
export function analyzeTrends(timeSeries) {
  if (!timeSeries || timeSeries.length === 0) {
    return {
      day7: [],
      day30: [],
      day90: [],
      current: 0,
      trend: 'insufficient_data'
    };
  }

  const values = timeSeries.map(item => item.value);
  const current = values[values.length - 1];

  const ma7 = calculateMovingAverage(values, 7);
  const ma30 = calculateMovingAverage(values, 30);
  const ma90 = calculateMovingAverage(values, 90);

  // Determine trend direction
  let trend = 'stable';
  if (ma7.length >= 2) {
    const recentTrend = ma7[ma7.length - 1] - ma7[ma7.length - 2];
    if (recentTrend > 0) trend = 'increasing';
    else if (recentTrend < 0) trend = 'decreasing';
  }

  return {
    day7: ma7,
    day30: ma30,
    day90: ma90,
    current,
    trend,
    dataPoints: values.length
  };
}

/**
 * Predict learning velocity using linear regression
 * @param {Array<Object>} historicalData - Training data with {timestamp, tasksCompleted, accuracy}
 * @param {number} forecastDays - Days to forecast ahead
 * @returns {Object} Prediction with confidence score
 */
export function predictLearningVelocity(historicalData, forecastDays = 30) {
  if (!historicalData || historicalData.length < 5) {
    return {
      prediction: null,
      confidence: 0,
      accuracy: 0,
      message: 'Insufficient historical data (minimum 5 data points required)'
    };
  }

  // Extract features: days from start, tasks completed
  const startTime = historicalData[0].timestamp;
  const dataPoints = historicalData.map((item, index) => ({
    x: (item.timestamp - startTime) / (1000 * 60 * 60 * 24), // days from start
    y: item.tasksCompleted || index + 1,
    accuracy: item.accuracy || 0.8
  }));

  // Simple linear regression
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  
  // Handle edge case: all X values are identical (no variance)
  if (denominator === 0) {
    return {
      prediction: null,
      confidence: 0,
      accuracy: 0,
      message: 'Unable to predict: no variance in time data'
    };
  }
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R² (coefficient of determination) for accuracy
  const yMean = sumY / n;
  const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = dataPoints.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  
  // Handle edge case: all Y values are identical (no variance)
  const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

  // Predict future values
  const lastDay = dataPoints[dataPoints.length - 1].x;
  const futureDay = lastDay + forecastDays;
  const prediction = slope * futureDay + intercept;

  // Calculate average accuracy from historical data
  const avgAccuracy = dataPoints.reduce((sum, p) => sum + p.accuracy, 0) / n;

  return {
    prediction: Math.max(0, Math.round(prediction)),
    confidence: Math.min(95, Math.round(rSquared * 100)),
    accuracy: Math.round(avgAccuracy * 100),
    slope,
    forecastDays,
    message: `Based on ${n} historical data points`
  };
}

/**
 * Calculate cost-benefit analysis for workflows
 * @param {Object} workflow - Workflow data with costs and benefits
 * @returns {Object} ROI analysis
 */
export function calculateCostBenefit(workflow) {
  const {
    timeSavedHours = 0,
    qualityImprovementPercent = 0,
    errorReductionPercent = 0,
    aiCostDollars = 0,
    humanHourlyRate = 50,
    tasksCompleted = 0
  } = workflow;

  const timeSavedValue = timeSavedHours * humanHourlyRate;
  const qualityValue = (qualityImprovementPercent / 100) * timeSavedValue;
  const errorValue = (errorReductionPercent / 100) * timeSavedValue * 0.5; // Errors cost 50% of time

  const totalBenefit = timeSavedValue + qualityValue + errorValue;
  const totalCost = aiCostDollars;
  const roi = totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0;

  return {
    totalBenefit: Math.round(totalBenefit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    netBenefit: Math.round((totalBenefit - totalCost) * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    roiCategory: roi > 200 ? 'excellent' : roi > 100 ? 'good' : roi > 0 ? 'positive' : 'negative',
    costPerTask: tasksCompleted > 0 ? Math.round((totalCost / tasksCompleted) * 100) / 100 : 0,
    valuePerTask: tasksCompleted > 0 ? Math.round((totalBenefit / tasksCompleted) * 100) / 100 : 0
  };
}

/**
 * Detect anomalies using z-score method
 * @param {Array<number>} data - Time series data
 * @param {number} threshold - Z-score threshold (default: 3 for 99.7% specificity)
 * @returns {Array<Object>} Detected anomalies with indices and z-scores
 */
export function detectAnomalies(data, threshold = 3) {
  if (!data || data.length < 3) {
    return [];
  }

  // Calculate mean and standard deviation
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  // Detect anomalies using z-score
  const anomalies = [];
  data.forEach((value, index) => {
    const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0;
    if (zScore > threshold) {
      anomalies.push({
        index,
        value,
        zScore: Math.round(zScore * 100) / 100,
        deviation: Math.round((value - mean) * 100) / 100,
        severity: zScore > 4 ? 'critical' : zScore > 3.5 ? 'high' : 'moderate'
      });
    }
  });

  return anomalies;
}

/**
 * Calculate cohort comparison metrics
 * @param {Object} cohortA - First cohort data
 * @param {Object} cohortB - Second cohort data
 * @returns {Object} Comparative analysis
 */
export function compareCohorts(cohortA, cohortB) {
  const metricsA = {
    taskCount: cohortA.tasks?.length || 0,
    avgAccuracy: cohortA.avgAccuracy || 0,
    avgSpeed: cohortA.avgSpeed || 0,
    totalCost: cohortA.totalCost || 0
  };

  const metricsB = {
    taskCount: cohortB.tasks?.length || 0,
    avgAccuracy: cohortB.avgAccuracy || 0,
    avgSpeed: cohortB.avgSpeed || 0,
    totalCost: cohortB.totalCost || 0
  };

  const comparison = {
    taskCountDiff: metricsB.taskCount - metricsA.taskCount,
    taskCountPercent: metricsA.taskCount > 0
      ? Math.round(((metricsB.taskCount - metricsA.taskCount) / metricsA.taskCount) * 10000) / 100
      : 0,
    accuracyDiff: Math.round((metricsB.avgAccuracy - metricsA.avgAccuracy) * 100) / 100,
    speedDiff: Math.round((metricsB.avgSpeed - metricsA.avgSpeed) * 100) / 100,
    costDiff: Math.round((metricsB.totalCost - metricsA.totalCost) * 100) / 100,
    winner: determineWinner(metricsA, metricsB)
  };

  return {
    cohortA: { name: cohortA.name, ...metricsA },
    cohortB: { name: cohortB.name, ...metricsB },
    comparison
  };
}

/**
 * Determine which cohort performed better overall
 * @private
 */
function determineWinner(metricsA, metricsB) {
  let scoreA = 0;
  let scoreB = 0;

  // More tasks completed is better
  if (metricsA.taskCount > metricsB.taskCount) scoreA++;
  else if (metricsB.taskCount > metricsA.taskCount) scoreB++;

  // Higher accuracy is better
  if (metricsA.avgAccuracy > metricsB.avgAccuracy) scoreA++;
  else if (metricsB.avgAccuracy > metricsA.avgAccuracy) scoreB++;

  // Higher speed is better (assuming speed is tasks/hour)
  if (metricsA.avgSpeed > metricsB.avgSpeed) scoreA++;
  else if (metricsB.avgSpeed > metricsA.avgSpeed) scoreB++;

  // Lower cost is better
  if (metricsA.totalCost < metricsB.totalCost) scoreA++;
  else if (metricsB.totalCost < metricsA.totalCost) scoreB++;

  if (scoreA > scoreB) return 'cohortA';
  if (scoreB > scoreA) return 'cohortB';
  return 'tie';
}

export default {
  calculateMovingAverage,
  analyzeTrends,
  predictLearningVelocity,
  calculateCostBenefit,
  detectAnomalies,
  compareCohorts
};
