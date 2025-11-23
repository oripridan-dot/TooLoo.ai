#!/usr/bin/env node
/**
 * Phase 3 Sprint 1 - Task 4: Live Dashboard
 * Build real-time ROI visualization system with cohort analysis and anomaly detection
 */
import fs from 'fs/promises';
import { existsSync } from 'fs';

const DATA_DIR = './data/phase-3';

// Statistical thresholds for anomaly detection
const ANOMALY_THRESHOLDS = {
  roi_zscore: 2.5,        // Flag ROI values beyond 2.5 standard deviations
  cost_zscore: 2.0,       // Flag unusual cost patterns
  completion_outlier: 0.2 // Flag >20% above/below cohort average
};

/**
 * Calculate statistical metrics (mean, stdev, etc.)
 */
function calculateStats(values) {
  if (!values || values.length === 0) return null;
  
  const n = values.length;
  const mean = values.reduce((a, b) => a + b) / n;
  const variance = values.reduce((sq, val) => sq + Math.pow(val - mean, 2), 0) / n;
  const stdev = Math.sqrt(variance);
  
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  return { mean, stdev, median, min: sorted[0], max: sorted[n-1], count: n };
}

/**
 * Detect anomalies using z-score method
 */
function detectAnomalies(roiRecords, stats) {
  const anomalies = [];
  
  roiRecords.forEach(record => {
    const roiZscore = Math.abs((record.roi.adjustedROI - stats.roi.mean) / (stats.roi.stdev || 1));
    const costZscore = Math.abs((record.roi.totalCost - stats.cost.mean) / (stats.cost.stdev || 1));
    
    if (roiZscore > ANOMALY_THRESHOLDS.roi_zscore) {
      anomalies.push({
        type: 'roi_outlier',
        learnerId: record.learnerId,
        archetype: record.archetype,
        value: record.roi.adjustedROI,
        zscore: roiZscore,
        severity: roiZscore > 3.5 ? 'critical' : 'high'
      });
    }
    
    if (costZscore > ANOMALY_THRESHOLDS.cost_zscore) {
      anomalies.push({
        type: 'cost_outlier',
        learnerId: record.learnerId,
        archetype: record.archetype,
        value: record.roi.totalCost,
        zscore: costZscore,
        severity: costZscore > 3.0 ? 'critical' : 'warning'
      });
    }
  });
  
  return anomalies;
}

/**
 * Build cohort-level performance dashboard
 */
function buildCohortDashboard(roiRecords, archetypeStats) {
  const cohortMap = {};
  
  roiRecords.forEach(record => {
    if (!cohortMap[record.cohortId]) {
      cohortMap[record.cohortId] = {
        cohortId: record.cohortId,
        learnerCount: 0,
        roiValues: [],
        costValues: [],
        archetypeDistribution: {},
        avgCompletion: 0,
        totalInvestment: 0,
        totalValue: 0
      };
    }
    
    const cohort = cohortMap[record.cohortId];
    cohort.learnerCount++;
    cohort.roiValues.push(record.roi.adjustedROI);
    cohort.costValues.push(record.roi.totalCost);
    cohort.totalInvestment += record.roi.totalCost;
    cohort.totalValue += record.roi.totalBenefit;
    cohort.avgCompletion += record.roi.programsCompleted / record.roi.totalPrograms;
    
    // Track archetype distribution
    const arch = record.archetype;
    if (!cohort.archetypeDistribution[arch]) {
      cohort.archetypeDistribution[arch] = 0;
    }
    cohort.archetypeDistribution[arch]++;
  });
  
  // Calculate cohort metrics
  const cohortDashboard = Object.values(cohortMap).map(cohort => {
    const roiStats = calculateStats(cohort.roiValues);
    const costStats = calculateStats(cohort.costValues);
    
    return {
      ...cohort,
      avgCompletion: (cohort.avgCompletion / cohort.learnerCount).toFixed(2),
      cohortROI: ((cohort.totalValue - cohort.totalInvestment) / cohort.totalInvestment * 100).toFixed(2) + '%',
      avgROI: roiStats.mean.toFixed(4),
      roiRange: `${roiStats.min.toFixed(4)} - ${roiStats.max.toFixed(4)}`,
      roiStdev: roiStats.stdev.toFixed(4),
      avgCost: costStats.mean.toFixed(2),
      archetypeDistribution: Object.fromEntries(
        Object.entries(cohort.archetypeDistribution)
          .map(([arch, count]) => [arch, ((count / cohort.learnerCount) * 100).toFixed(1) + '%'])
      )
    };
  });
  
  return cohortDashboard.sort((a, b) => parseFloat(b.cohortROI) - parseFloat(a.cohortROI));
}

/**
 * Build archetype-level performance dashboard
 */
function buildArchetypeDashboard(roiRecords) {
  const archetypeMap = {};
  
  roiRecords.forEach(record => {
    const arch = record.archetype;
    if (!archetypeMap[arch]) {
      archetypeMap[arch] = {
        archetype: arch,
        learnerCount: 0,
        roiValues: [],
        costValues: [],
        benefitValues: [],
        confidenceScores: [],
        completionRates: []
      };
    }
    
    const archData = archetypeMap[arch];
    archData.learnerCount++;
    archData.roiValues.push(record.roi.adjustedROI);
    archData.costValues.push(record.roi.totalCost);
    archData.benefitValues.push(record.roi.totalBenefit);
    archData.confidenceScores.push(record.confidence);
    archData.completionRates.push(record.roi.programsCompleted / record.roi.totalPrograms);
  });
  
  const archetypeDashboard = Object.values(archetypeMap).map(arch => {
    const roiStats = calculateStats(arch.roiValues);
    const costStats = calculateStats(arch.costValues);
    const benefitStats = calculateStats(arch.benefitValues);
    const confStats = calculateStats(arch.confidenceScores);
    const compStats = calculateStats(arch.completionRates);
    
    return {
      archetype: arch.archetype,
      learnerCount: arch.learnerCount,
      avgROI: roiStats.mean.toFixed(4),
      roiRange: `${roiStats.min.toFixed(4)} - ${roiStats.max.toFixed(4)}`,
      roiStdev: roiStats.stdev.toFixed(4),
      avgCost: costStats.mean.toFixed(2),
      avgBenefit: benefitStats.mean.toFixed(2),
      benefitPerDollar: (benefitStats.mean / costStats.mean).toFixed(2),
      avgConfidence: confStats.mean.toFixed(4),
      avgCompletion: (compStats.mean * 100).toFixed(1) + '%',
      totalInvestment: arch.costValues.reduce((a, b) => a + b).toLocaleString(),
      totalValue: arch.benefitValues.reduce((a, b) => a + b).toLocaleString()
    };
  });
  
  return archetypeDashboard.sort((a, b) => parseFloat(b.avgROI) - parseFloat(a.avgROI));
}

/**
 * Calculate trend indicators for ROI forecasting
 */
function calculateTrends(roiRecords, archetypes) {
  const trends = {};
  
  archetypes.forEach(arch => {
    const archRecords = roiRecords.filter(r => r.archetype === arch);
    if (archRecords.length < 2) return;
    
    // Sort by enrollment date to get time series
    const sorted = archRecords.sort((a, b) => 
      new Date(a.programs[0]?.enrolledAt || 0) - new Date(b.programs[0]?.enrolledAt || 0)
    );
    
    // Simple trend: compare first 25% vs last 25%
    const quarter = Math.floor(sorted.length / 4);
    const first = sorted.slice(0, quarter);
    const last = sorted.slice(-quarter);
    
    const firstAvg = first.reduce((sum, r) => sum + r.roi.adjustedROI, 0) / first.length;
    const lastAvg = last.reduce((sum, r) => sum + r.roi.adjustedROI, 0) / last.length;
    
    const trend = lastAvg > firstAvg ? 'improving' : lastAvg < firstAvg ? 'declining' : 'stable';
    const trendStrength = Math.abs((lastAvg - firstAvg) / firstAvg * 100).toFixed(1);
    
    trends[arch] = {
      trend,
      trendStrength: trendStrength + '%',
      forecast: trend === 'improving' ? 'positive' : trend === 'declining' ? 'caution' : 'neutral'
    };
  });
  
  return trends;
}

/**
 * Main dashboard generation
 */
async function generateDashboard() {
  console.log('\n🚀 Phase 3 Sprint 1 - Task 4: Live Dashboard\n');
  console.log('Building real-time ROI visualization system...\n');
  
  if (!existsSync(`${DATA_DIR}/roi-tracking.jsonl`)) {
    throw new Error('ROI tracking data not found. Run Task 3 first.');
  }
  
  // Load ROI tracking data
  const roiContent = await fs.readFile(`${DATA_DIR}/roi-tracking.jsonl`, 'utf-8');
  const roiRecords = roiContent.trim().split('\n').map(line => JSON.parse(line));
  
  console.log(`✅ Loaded ${roiRecords.length} ROI records\n`);
  
  // Calculate global statistics
  const globalStats = {
    roi: calculateStats(roiRecords.map(r => r.roi.adjustedROI)),
    cost: calculateStats(roiRecords.map(r => r.roi.totalCost)),
    benefit: calculateStats(roiRecords.map(r => r.roi.totalBenefit)),
    confidence: calculateStats(roiRecords.map(r => r.confidence))
  };
  
  console.log('📊 Processing dashboards...\n');
  
  // Build dashboards
  const archetypes = [...new Set(roiRecords.map(r => r.archetype))];
  const cohortDashboard = buildCohortDashboard(roiRecords, globalStats);
  const archetypeDashboard = buildArchetypeDashboard(roiRecords);
  const trends = calculateTrends(roiRecords, archetypes);
  
  // Detect anomalies
  const anomalies = detectAnomalies(roiRecords, globalStats);
  const anomalyStats = {
    totalAnomalies: anomalies.length,
    roiOutliers: anomalies.filter(a => a.type === 'roi_outlier').length,
    costOutliers: anomalies.filter(a => a.type === 'cost_outlier').length,
    critical: anomalies.filter(a => a.severity === 'critical').length
  };
  
  // Compile dashboard
  const dashboard = {
    timestamp: new Date().toISOString(),
    summary: {
      totalLearners: roiRecords.length,
      totalCohorts: new Set(roiRecords.map(r => r.cohortId)).size,
      archetypeCount: archetypes.length,
      globalROI: {
        average: globalStats.roi.mean.toFixed(4),
        median: globalStats.roi.median.toFixed(4),
        stdev: globalStats.roi.stdev.toFixed(4),
        range: `${globalStats.roi.min.toFixed(4)} - ${globalStats.roi.max.toFixed(4)}`
      }
    },
    anomalies: {
      ...anomalyStats,
      alerts: anomalies
        .filter(a => a.severity === 'critical')
        .slice(0, 10)
        .map(a => ({
          learnerId: a.learnerId,
          type: a.type,
          value: a.value.toFixed(4),
          zscore: a.zscore.toFixed(2),
          archetype: a.archetype
        }))
    },
    trends,
    cohortAnalysis: cohortDashboard,
    archetypeAnalysis: archetypeDashboard
  };
  
  // Save dashboard
  await fs.writeFile(`${DATA_DIR}/dashboard-live.json`, JSON.stringify(dashboard, null, 2));
  
  // Display results
  console.log('✅ Dashboard Generation Complete\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DASHBOARD SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nGlobal Metrics:');
  console.log(`  Learners Analyzed:     ${dashboard.summary.totalLearners}`);
  console.log(`  Cohorts:               ${dashboard.summary.totalCohorts}`);
  console.log(`  Archetypes:            ${dashboard.summary.archetypeCount}`);
  console.log(`  Average ROI:           ${dashboard.summary.globalROI.average}`);
  console.log(`  Median ROI:            ${dashboard.summary.globalROI.median}`);
  console.log(`  ROI Std Dev:           ${dashboard.summary.globalROI.stdev}`);
  
  console.log('\n🎯 Archetype Performance (Top Performers):');
  archetypeDashboard.slice(0, 3).forEach((arch, i) => {
    console.log(`  ${i+1}. ${arch.archetype}`);
    console.log(`     ROI Range: ${arch.roiRange}`);
    console.log(`     Avg ROI:   ${arch.avgROI}`);
    console.log(`     Learners:  ${arch.learnerCount}`);
  });
  
  console.log('\n🏘️  Cohort Performance (Ranked):');
  cohortDashboard.slice(0, 3).forEach((cohort, i) => {
    console.log(`  ${i+1}. ${cohort.cohortId}`);
    console.log(`     ROI: ${cohort.cohortROI}`);
    console.log(`     Learners: ${cohort.learnerCount}`);
    console.log(`     Avg Completion: ${cohort.avgCompletion}`);
  });
  
  console.log('\n🚨 Anomaly Detection:');
  console.log(`  Total Anomalies:       ${anomalyStats.totalAnomalies}`);
  console.log(`  ROI Outliers:          ${anomalyStats.roiOutliers}`);
  console.log(`  Cost Outliers:         ${anomalyStats.costOutliers}`);
  console.log(`  Critical Alerts:       ${anomalyStats.critical}`);
  
  if (anomalyStats.critical > 0) {
    console.log('\n  Top Critical Alerts:');
    anomalies
      .filter(a => a.severity === 'critical')
      .slice(0, 3)
      .forEach(alert => {
        console.log(`    • ${alert.learnerId} (${alert.archetype}): ${alert.type} zscore=${alert.zscore.toFixed(2)}`);
      });
  }
  
  console.log('\n📈 Trend Forecasting:');
  Object.entries(trends).forEach(([arch, trend]) => {
    const emoji = trend.forecast === 'positive' ? '📈' : trend.forecast === 'caution' ? '📉' : '➡️ ';
    console.log(`  ${emoji} ${arch}: ${trend.trend} (${trend.trendStrength})`);
  });
  
  console.log('\n📁 Output Files:');
  console.log(`  ✅ ${DATA_DIR}/dashboard-live.json (real-time visualization data)`);
  console.log('\n✨ Task 4 Complete: Live Dashboard ready for Task 5 (Calibration)\n');
  
  return dashboard;
}

try {
  await generateDashboard();
  process.exit(0);
} catch (err) {
  console.error('\n❌ Dashboard Generation Failed:', err.message);
  process.exit(1);
}
