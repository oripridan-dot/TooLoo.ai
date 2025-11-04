/**
 * Tests for Predictive Analytics Module
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMovingAverage,
  analyzeTrends,
  predictLearningVelocity,
  calculateCostBenefit,
  detectAnomalies,
  compareCohorts
} from '../modules/predictive-analytics.js';

test('calculateMovingAverage - computes correct averages', () => {
  const data = [10, 20, 30, 40, 50];
  const ma3 = calculateMovingAverage(data, 3);
  
  assert.equal(ma3.length, 3);
  assert.equal(ma3[0], 20); // (10+20+30)/3
  assert.equal(ma3[1], 30); // (20+30+40)/3
  assert.equal(ma3[2], 40); // (30+40+50)/3
});

test('calculateMovingAverage - handles insufficient data', () => {
  const data = [10, 20];
  const ma5 = calculateMovingAverage(data, 5);
  
  assert.equal(ma5.length, 0);
});

test('analyzeTrends - generates trend analysis', () => {
  const timeSeries = [
    { timestamp: 1, value: 10 },
    { timestamp: 2, value: 20 },
    { timestamp: 3, value: 30 },
    { timestamp: 4, value: 40 },
    { timestamp: 5, value: 50 },
    { timestamp: 6, value: 60 },
    { timestamp: 7, value: 70 },
    { timestamp: 8, value: 80 }
  ];
  
  const trends = analyzeTrends(timeSeries);
  
  assert.ok(trends.day7);
  assert.ok(Array.isArray(trends.day7));
  assert.equal(trends.current, 80);
  assert.ok(['increasing', 'decreasing', 'stable'].includes(trends.trend));
  assert.equal(trends.dataPoints, 8);
});

test('analyzeTrends - handles empty data', () => {
  const trends = analyzeTrends([]);
  
  assert.deepEqual(trends.day7, []);
  assert.equal(trends.current, 0);
  assert.equal(trends.trend, 'insufficient_data');
});

test('predictLearningVelocity - generates predictions', () => {
  const historicalData = [
    { timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, tasksCompleted: 5, accuracy: 0.8 },
    { timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000, tasksCompleted: 7, accuracy: 0.82 },
    { timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, tasksCompleted: 9, accuracy: 0.85 },
    { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, tasksCompleted: 12, accuracy: 0.87 },
    { timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000, tasksCompleted: 15, accuracy: 0.88 },
    { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, tasksCompleted: 18, accuracy: 0.9 }
  ];
  
  const prediction = predictLearningVelocity(historicalData, 30);
  
  assert.ok(prediction.prediction !== null);
  assert.ok(prediction.confidence >= 0 && prediction.confidence <= 100);
  assert.ok(prediction.accuracy >= 0 && prediction.accuracy <= 100);
  assert.equal(prediction.forecastDays, 30);
  assert.ok(prediction.message.includes('historical'));
});

test('predictLearningVelocity - handles insufficient data', () => {
  const historicalData = [
    { timestamp: Date.now(), tasksCompleted: 5, accuracy: 0.8 },
    { timestamp: Date.now(), tasksCompleted: 7, accuracy: 0.82 }
  ];
  
  const prediction = predictLearningVelocity(historicalData, 30);
  
  assert.equal(prediction.prediction, null);
  assert.equal(prediction.confidence, 0);
  assert.ok(prediction.message.includes('Insufficient'));
});

test('predictLearningVelocity - handles identical timestamps (no variance)', () => {
  const sameTime = Date.now();
  const historicalData = [
    { timestamp: sameTime, tasksCompleted: 5, accuracy: 0.8 },
    { timestamp: sameTime, tasksCompleted: 7, accuracy: 0.82 },
    { timestamp: sameTime, tasksCompleted: 9, accuracy: 0.85 },
    { timestamp: sameTime, tasksCompleted: 12, accuracy: 0.87 },
    { timestamp: sameTime, tasksCompleted: 15, accuracy: 0.88 }
  ];
  
  const prediction = predictLearningVelocity(historicalData, 30);
  
  assert.equal(prediction.prediction, null);
  assert.equal(prediction.confidence, 0);
  assert.ok(prediction.message.includes('no variance'));
});

test('predictLearningVelocity - accuracy should be greater than 75%', () => {
  // Generate high-quality historical data
  const historicalData = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    historicalData.push({
      timestamp: now - (30 - i) * 24 * 60 * 60 * 1000,
      tasksCompleted: i + 5,
      accuracy: 0.85 + Math.random() * 0.1 // High accuracy data
    });
  }
  
  const prediction = predictLearningVelocity(historicalData, 30);
  
  assert.ok(prediction.accuracy > 75, `Expected accuracy > 75%, got ${prediction.accuracy}%`);
});

test('calculateCostBenefit - computes ROI correctly', () => {
  const workflow = {
    timeSavedHours: 20,
    qualityImprovementPercent: 30,
    errorReductionPercent: 25,
    aiCostDollars: 10,
    humanHourlyRate: 50,
    tasksCompleted: 10
  };
  
  const analysis = calculateCostBenefit(workflow);
  
  assert.ok(analysis.totalBenefit > 0);
  assert.equal(analysis.totalCost, 10);
  assert.ok(analysis.netBenefit > 0);
  assert.ok(analysis.roi > 0);
  assert.ok(['excellent', 'good', 'positive', 'negative'].includes(analysis.roiCategory));
  assert.equal(analysis.costPerTask, 1); // 10/10
});

test('calculateCostBenefit - handles zero cost edge case', () => {
  const workflow = {
    timeSavedHours: 10,
    aiCostDollars: 0,
    humanHourlyRate: 50,
    tasksCompleted: 5
  };
  
  const analysis = calculateCostBenefit(workflow);
  
  assert.equal(analysis.totalCost, 0);
  assert.equal(analysis.roi, 0);
  assert.equal(analysis.costPerTask, 0);
});

test('detectAnomalies - identifies outliers', () => {
  // Use more normal data points to establish a clear baseline
  const data = [10, 12, 11, 13, 10, 11, 12, 10, 11, 13, 12, 11, 10, 12, 11, 1000]; // 1000 is a clear outlier
  const anomalies = detectAnomalies(data, 3);
  
  assert.ok(anomalies.length > 0, 'Should detect at least one anomaly');
  const outlierAnomaly = anomalies.find(a => a.value === 1000);
  assert.ok(outlierAnomaly, 'Should detect the value 1000 as an anomaly');
  assert.ok(outlierAnomaly.zScore > 3, `Z-score ${outlierAnomaly.zScore} should be > 3`);
  assert.ok(['critical', 'high', 'moderate'].includes(outlierAnomaly.severity));
});

test('detectAnomalies - returns empty for normal data', () => {
  const data = [10, 11, 12, 11, 10, 12, 11, 10];
  const anomalies = detectAnomalies(data, 3);
  
  assert.equal(anomalies.length, 0);
});

test('detectAnomalies - has high specificity (>95%)', () => {
  // Z-score with threshold 3 gives ~99.7% specificity
  const data = Array.from({ length: 100 }, () => 50 + Math.random() * 10);
  const anomalies = detectAnomalies(data, 3);
  
  const falsePositiveRate = anomalies.length / data.length;
  assert.ok(falsePositiveRate < 0.05, `False positive rate ${falsePositiveRate} should be < 5%`);
});

test('compareCohorts - compares two cohorts', () => {
  const cohortA = {
    name: 'Group A',
    tasks: [{ id: 1 }, { id: 2 }],
    avgAccuracy: 0.85,
    avgSpeed: 5,
    totalCost: 50
  };
  
  const cohortB = {
    name: 'Group B',
    tasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
    avgAccuracy: 0.90,
    avgSpeed: 6,
    totalCost: 60
  };
  
  const comparison = compareCohorts(cohortA, cohortB);
  
  assert.equal(comparison.cohortA.name, 'Group A');
  assert.equal(comparison.cohortB.name, 'Group B');
  assert.equal(comparison.comparison.taskCountDiff, 1);
  assert.ok(['cohortA', 'cohortB', 'tie'].includes(comparison.comparison.winner));
});

test('compareCohorts - handles equal cohorts', () => {
  const cohortA = {
    name: 'Group A',
    tasks: [{ id: 1 }],
    avgAccuracy: 0.85,
    avgSpeed: 5,
    totalCost: 50
  };
  
  const cohortB = {
    name: 'Group B',
    tasks: [{ id: 1 }],
    avgAccuracy: 0.85,
    avgSpeed: 5,
    totalCost: 50
  };
  
  const comparison = compareCohorts(cohortA, cohortB);
  
  assert.equal(comparison.comparison.taskCountDiff, 0);
  assert.equal(comparison.comparison.winner, 'tie');
});
