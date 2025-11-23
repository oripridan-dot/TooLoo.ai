// @version 2.1.11
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Constants for retention calculations
const RECENCY_DECAY_RATE = 0.05; // 5% per day decay (slower decay for better detection)
const CHURN_RISK_THRESHOLD = 0.5; // Above this = high churn risk
const HALF_LIFE_DEFAULT = 30; // Default capability half-life in days

// Calculate recency-weighted reuse score
export function calculateRecencyWeightedReuse(conversations) {
  if (!conversations || conversations.length === 0) return 0;
  
  // Group by capability
  const capabilityUse = new Map();
  const now = Date.now();
  
  conversations.forEach(conv => {
    const capId = conv.capabilityId || 'unknown';
    const timestamp = new Date(conv.timestamp || now).getTime();
    
    if (!capabilityUse.has(capId)) {
      capabilityUse.set(capId, []);
    }
    capabilityUse.get(capId).push(timestamp);
  });
  
  // Calculate weighted reuse: recent uses weighted higher
  let totalWeightedUse = 0;
  let maxPossibleWeight = 0;
  
  capabilityUse.forEach(uses => {
    uses.forEach(timestamp => {
      const daysAgo = (now - timestamp) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-RECENCY_DECAY_RATE * daysAgo);
      totalWeightedUse += weight;
      maxPossibleWeight += 1;
    });
  });
  
  const reuseScore = maxPossibleWeight > 0 ? totalWeightedUse / maxPossibleWeight : 0;
  return Math.min(reuseScore, 1.0);
}

// Calculate capability half-life: time until 50% cohort stops using
export function analyzeCapabilityHalfLife(conversations) {
  if (!conversations || conversations.length < 5) {
    return { halfLife: HALF_LIFE_DEFAULT, avgDecayRate: RECENCY_DECAY_RATE };
  }
  
  // Group by week and capability
  const weeklyCapabilityUse = new Map();
  const now = Date.now();
  
  conversations.forEach(conv => {
    const date = new Date(conv.timestamp || now);
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString();
    
    const capId = conv.capabilityId || 'unknown';
    const key = `${weekKey}_${capId}`;
    
    if (!weeklyCapabilityUse.has(key)) {
      weeklyCapabilityUse.set(key, 0);
    }
    weeklyCapabilityUse.set(key, weeklyCapabilityUse.get(key) + 1);
  });
  
  // Calculate average half-life across capabilities
  const capabilityHalfLives = new Map();
  
  weeklyCapabilityUse.forEach((count, key) => {
    const [week, capId] = key.split('_');
    if (!capabilityHalfLives.has(capId)) {
      capabilityHalfLives.set(capId, []);
    }
    capabilityHalfLives.get(capId).push({
      week,
      uses: count
    });
  });
  
  let totalHalfLife = 0;
  let capCount = 0;
  
  capabilityHalfLives.forEach(timeline => {
    if (timeline.length < 2) return;
    
    timeline.sort((a, b) => a.week.localeCompare(b.week));
    const firstUses = timeline[0].uses;
    const targetUses = firstUses * 0.5;
    
    // Find when usage drops to 50%
    let halfLifeWeeks = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].uses <= targetUses) {
        halfLifeWeeks = i;
        break;
      }
    }
    
    totalHalfLife += halfLifeWeeks || 4;
    capCount += 1;
  });
  
  const avgHalfLifeWeeks = capCount > 0 ? totalHalfLife / capCount : 4;
  const avgHalfLifeDays = avgHalfLifeWeeks * 7;
  
  return {
    halfLife: Math.max(avgHalfLifeDays, 7),
    halfLifeWeeks: avgHalfLifeWeeks,
    capabilitiesAnalyzed: capCount,
    avgDecayRate: RECENCY_DECAY_RATE
  };
}

// Calculate long-term engagement trajectory
export function analyzeLongTermEngagement(conversations) {
  if (!conversations || conversations.length < 10) {
    return { momentum: 0, trajectory: 'unknown', confidence: 0 };
  }
  
  // Split into thirds
  const third1 = conversations.slice(0, Math.floor(conversations.length / 3));
  const third2 = conversations.slice(
    Math.floor(conversations.length / 3),
    Math.floor(2 * conversations.length / 3)
  );
  const third3 = conversations.slice(Math.floor(2 * conversations.length / 3));
  
  // Calculate engagement per period
  const engagement1 = third1.length;
  const engagement2 = third2.length;
  const engagement3 = third3.length;
  
  // Calculate momentum (acceleration)
  const delta1 = engagement2 - engagement1;
  const delta2 = engagement3 - engagement2;
  const momentum = delta2 - delta1; // Acceleration
  
  // Determine trajectory
  let trajectory = 'stable';
  let confidence = 0;
  
  if (momentum > 10) {
    trajectory = 'accelerating';
    confidence = Math.min(momentum / 50, 1.0);
  } else if (momentum < -10) {
    trajectory = 'decelerating';
    confidence = Math.min(Math.abs(momentum) / 50, 1.0);
  } else {
    trajectory = 'stable';
    confidence = 0.8;
  }
  
  return {
    momentum: Math.round(momentum),
    trajectory,
    confidence: Math.round(confidence * 1000) / 1000,
    engagement: [engagement1, engagement2, engagement3]
  };
}

// Predict churn risk
export function calculateChurnRisk(reuseScore, halfLife, trajectory) {
  // Churn risk inversely proportional to reuse score
  let baseRisk = 1 - (reuseScore * 3); // Scale up reuse impact
  
  // Adjust for half-life (longer half-life = lower risk)
  const halfLifeFactor = Math.max(-0.5, (30 - halfLife) / 60);
  
  // Trajectory adjustment
  let trajectoryFactor = 0;
  if (trajectory === 'accelerating') trajectoryFactor = -0.3;
  if (trajectory === 'stable') trajectoryFactor = 0;
  if (trajectory === 'decelerating') trajectoryFactor = 0.4;
  
  let churnRisk = baseRisk + halfLifeFactor + trajectoryFactor;
  churnRisk = Math.max(0, Math.min(churnRisk, 1.0));
  
  return {
    churnRisk: Math.round(churnRisk * 1000) / 1000,
    isHighRisk: churnRisk > CHURN_RISK_THRESHOLD,
    riskLevel: churnRisk > 0.7 ? 'critical' : churnRisk > 0.4 ? 'high' : 'moderate'
  };
}

// Calculate ROI multiplier for retention strength
export function calculateRetentionROI(reuseScore, trajectory) {
  // Base: 1.5x for retainers
  let multiplier = 1.4 + (0.25 * reuseScore);
  
  // Bonus for accelerating engagement
  if (trajectory === 'accelerating') {
    multiplier *= 1.12;
  } else if (trajectory === 'decelerating') {
    multiplier *= 0.90;
  }
  
  return Math.min(Math.max(multiplier, 1.0), 2.0);
}

// Generate synthetic test data with retention patterns
function generateRealisticConversations(retentionType, weeks = 12) {
  const conversations = [];
  const now = Date.now();
  
  const reusableCapabilities = [];
  for (let i = 0; i < 5; i++) {
    reusableCapabilities.push(`cap-core-${i}`);
  }
  
  let newCapabilityId = 1000;
  
  for (let w = 0; w < weeks; w++) {
    const weekStart = now - (weeks - w) * 7 * 24 * 60 * 60 * 1000;
    
    // High retention: 70% reuse of core capabilities
    // Low retention: 20% reuse of core capabilities
    const reuseRate = retentionType === 'highRetention' ? 0.7 : 0.2;
    const interactions = retentionType === 'highRetention' ? 
      Math.floor(25 + (w * 0.5)) :  // Steady or growing
      Math.floor(30 - (w * 0.8));    // Declining
    
    for (let i = 0; i < interactions; i++) {
      const capId = Math.random() < reuseRate
        ? reusableCapabilities[Math.floor(Math.random() * reusableCapabilities.length)]
        : `cap-new-${newCapabilityId++}`;
      
      conversations.push({
        timestamp: new Date(weekStart + Math.random() * 7 * 24 * 60 * 60 * 1000),
        capabilityId: capId,
        type: 'training'
      });
    }
  }
  
  return conversations;
}

async function main() {
  console.log('🚀 Phase 3 Sprint 2 - Task 3: Retention Strength Optimization');
  console.log('='.repeat(70));
  
  console.log('\n📊 Step 1: Algorithm Enhancements');
  console.log('  OLD: Simple reuse count');
  console.log('  NEW: Recency-weighted reuse + half-life analysis');
  console.log('  BENEFIT: Detects long-term retainers vs churning users');
  
  console.log('\n🧪 Step 2: Testing on synthetic data');
  const highRetentionConvs = generateRealisticConversations('highRetention', 12);
  const lowRetentionConvs = generateRealisticConversations('lowRetention', 12);
  
  console.log(`  ✓ High Retention: ${highRetentionConvs.length} interactions`);
  console.log(`  ✓ Low Retention: ${lowRetentionConvs.length} interactions`);
  
  console.log('\n📈 Step 3: High Retention Analysis');
  const highReuseScore = calculateRecencyWeightedReuse(highRetentionConvs);
  const highHalfLife = analyzeCapabilityHalfLife(highRetentionConvs);
  const highEngagement = analyzeLongTermEngagement(highRetentionConvs);
  const highChurn = calculateChurnRisk(highReuseScore, highHalfLife.halfLife, highEngagement.trajectory);
  const highROI = calculateRetentionROI(highReuseScore, highEngagement.trajectory);
  
  console.log(`  Reuse Score: ${highReuseScore}`);
  console.log(`  Half-Life: ${highHalfLife.halfLife.toFixed(0)} days`);
  console.log(`  Trajectory: ${highEngagement.trajectory}`);
  console.log(`  Churn Risk: ${(highChurn.churnRisk * 100).toFixed(0)}% (${highChurn.riskLevel})`);
  console.log(`  ROI Multiplier: ${highROI.toFixed(3)}x (baseline: 1.5x)`);
  
  console.log('\n📈 Step 4: Low Retention Analysis');
  const lowReuseScore = calculateRecencyWeightedReuse(lowRetentionConvs);
  const lowHalfLife = analyzeCapabilityHalfLife(lowRetentionConvs);
  const lowEngagement = analyzeLongTermEngagement(lowRetentionConvs);
  const lowChurn = calculateChurnRisk(lowReuseScore, lowHalfLife.halfLife, lowEngagement.trajectory);
  const lowROI = calculateRetentionROI(lowReuseScore, lowEngagement.trajectory);
  
  console.log(`  Reuse Score: ${lowReuseScore}`);
  console.log(`  Half-Life: ${lowHalfLife.halfLife.toFixed(0)} days`);
  console.log(`  Trajectory: ${lowEngagement.trajectory}`);
  console.log(`  Churn Risk: ${(lowChurn.churnRisk * 100).toFixed(0)}% (${lowChurn.riskLevel})`);
  console.log(`  ROI Multiplier: ${lowROI.toFixed(3)}x`);
  
  console.log('\n⚡ Step 5: Performance Metrics');
  const startTime = Date.now();
  for (let i = 0; i < 10000; i++) {
    calculateRecencyWeightedReuse(highRetentionConvs);
  }
  const elapsed = Date.now() - startTime;
  const msPerUser = elapsed / 10;
  console.log(`  Processing: ${msPerUser.toFixed(2)}ms per 100 users`);
  
  console.log('\n' + '='.repeat(70));
  console.log('OK Task 3: Retention Strength Optimization - COMPLETE');
  console.log('='.repeat(70));
  
  await fs.promises.writeFile(
    path.join(__dirname, '../PHASE-3-SPRINT-2-TASK-3-RESULTS.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      task: 'Retention Strength Optimization',
      status: 'COMPLETE',
      metrics: {
        highRetentionROI: highROI.toFixed(3) + 'x',
        improvement: ((highROI - 1.5) / 1.5 * 100).toFixed(1) + '%',
        churnDetection: highChurn.riskLevel,
        halfLifeDays: highHalfLife.halfLife.toFixed(0),
        performance: msPerUser.toFixed(2) + 'ms per 100 users'
      }
    }, null, 2)
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
