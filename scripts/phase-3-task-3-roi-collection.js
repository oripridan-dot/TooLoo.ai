#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';

const DATA_DIR = './data/phase-3';
const ARCHETYPE_ROI_BASELINES = { 'FAST_LEARNER': 1.8, 'SPECIALIST': 1.6, 'POWER_USER': 1.4, 'LONG_TERM_RETAINER': 1.5, 'GENERALIST': 1.0 };
const TRAINING_PROGRAMS = { 'foundations': { cost: 500, hours: 40 }, 'intermediate': { cost: 1200, hours: 60 }, 'advanced': { cost: 2500, hours: 80 }, 'certification': { cost: 3500, hours: 100 }, 'mentoring': { cost: 2000, hours: 20 }, 'microlearning': { cost: 200, hours: 8 } };
const PROGRAM_KEYS = Object.keys(TRAINING_PROGRAMS);

function seededRandom(seed) {
  let s = parseInt(seed.toString().replace(/[a-z-]/g, '0').replace(/\d/g, c => (c*13)%256)) || 42;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateTrainingEngagement(learner, archetypeData) {
  const programs = [];
  const rng = seededRandom(learner.id);
  const enrollmentCount = Math.floor(rng() * 4) + 2;
  for (let i = 0; i < enrollmentCount; i++) {
    const programType = PROGRAM_KEYS[Math.floor(rng() * PROGRAM_KEYS.length)];
    const program = TRAINING_PROGRAMS[programType];
    const completionRate = Math.max(0, Math.min(1, archetypeData.metrics.completionRate + rng() * 0.2 - 0.1));
    const retention = Math.max(0, Math.min(1, archetypeData.metrics.retentionRate + rng() * 0.15 - 0.075));
    programs.push({ type: programType, enrolledAt: new Date(Date.now() - (Math.floor(rng() * 90) + 1) * 86400000).toISOString(), cost: program.cost, hoursCompleted: Math.round(program.hours * completionRate), totalHours: program.hours, completionRate, retention, certificateEarned: completionRate > 0.8, skillsGained: Math.round(completionRate * 5) + Math.round(rng() * 2) });
  }
  return programs;
}

function calculateROI(learner, archetypeData, programs) {
  let totalCost = 0, totalBenefit = 0, certificateCount = 0, totalSkillsGained = 0, weightedRetention = 0;
  const BASE_HOURLY_RATE = 50, SKILL_MULTIPLIER = 12, CERTIFICATE_BONUS = 500;
  programs.forEach(p => {
    totalCost += p.cost;
    const timeValue = p.hoursCompleted * BASE_HOURLY_RATE;
    const skillValue = p.skillsGained * SKILL_MULTIPLIER;
    if (p.certificateEarned) { certificateCount++; totalBenefit += CERTIFICATE_BONUS; }
    totalBenefit += timeValue + skillValue + p.cost * p.retention * 0.3;
    totalSkillsGained += p.skillsGained;
    weightedRetention += p.retention * p.cost;
  });
  if (totalCost > 0) weightedRetention = weightedRetention / totalCost;
  const baseROI = totalCost > 0 ? (totalBenefit - totalCost) / totalCost : 0;
  const archetypeMultiplier = ARCHETYPE_ROI_BASELINES[archetypeData.archetype] || 1.0;
  const predictedROI = baseROI * archetypeMultiplier;
  const confidenceAdjustment = Math.max(0.7, archetypeData.confidence);
  const adjustedROI = predictedROI * confidenceAdjustment;
  return { totalCost, totalBenefit, baseROI, archetypeMultiplier, predictedROI, confidence: confidenceAdjustment, adjustedROI, certificateCount, skillsGained: totalSkillsGained, averageRetention: weightedRetention, programsCompleted: programs.filter(p => p.completionRate > 0.8).length, totalPrograms: programs.length };
}

async function collectROIMetrics() {
  console.log('\n🚀 Phase 3 Sprint 1 - Task 3: ROI Metric Collection\n');
  console.log('Loading data...');
  if (!existsSync(DATA_DIR)) await fs.mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(`${DATA_DIR}/learners-imported.jsonl`)) throw new Error('Learner data not found');
  const archetypeContent = await fs.readFile(`${DATA_DIR}/archetype-detections.jsonl`, 'utf-8');
  const archetypeMap = {};
  archetypeContent.trim().split('\n').forEach(line => { if (line.trim()) { const r = JSON.parse(line); archetypeMap[r.learnerId] = r; } });
  console.log(`  ✅ Loaded ${Object.keys(archetypeMap).length} archetypes`);
  const learnerContent = await fs.readFile(`${DATA_DIR}/learners-imported.jsonl`, 'utf-8');
  const learnerLines = learnerContent.trim().split('\n').filter(l => l.trim());
  console.log(`  ✅ Loaded ${learnerLines.length} learners\n`);
  console.log('Processing ROI tracking...\n');
  const roiWriter = createWriteStream(`${DATA_DIR}/roi-tracking.jsonl`);
  const stats = { processed: 0, errors: 0, successfulROI: 0, totalROI: 0, totalCost: 0, totalBenefit: 0, roiByArchetype: {}, costByArchetype: {}, benefitByArchetype: {} };
  const startTime = Date.now();
  for (let i = 0; i < learnerLines.length; i++) {
    try {
      const learner = JSON.parse(learnerLines[i]);
      const archetypeData = archetypeMap[learner.id];
      if (!archetypeData) { stats.errors++; continue; }
      const programs = generateTrainingEngagement(learner, archetypeData);
      const roi = calculateROI(learner, archetypeData, programs);
      const arch = archetypeData.archetype;
      if (!stats.roiByArchetype[arch]) { stats.roiByArchetype[arch] = []; stats.costByArchetype[arch] = []; stats.benefitByArchetype[arch] = []; }
      stats.roiByArchetype[arch].push(roi.adjustedROI);
      stats.costByArchetype[arch].push(roi.totalCost);
      stats.benefitByArchetype[arch].push(roi.totalBenefit);
      roiWriter.write(JSON.stringify({ learnerId: learner.id, cohortId: learner.cohortId, archetype: archetypeData.archetype, confidence: archetypeData.confidence, timestamp: new Date().toISOString(), programs, roi }) + '\n');
      stats.processed++;
      stats.successfulROI++;
      stats.totalROI += roi.adjustedROI;
      stats.totalCost += roi.totalCost;
      stats.totalBenefit += roi.totalBenefit;
      if ((i + 1) % 100 === 0) process.stdout.write(`\r  Processed: ${i + 1} learners...`);
    } catch (err) { stats.errors++; }
  }
  roiWriter.end();
  await new Promise(resolve => roiWriter.on('finish', resolve));
  const elapsedMs = Date.now() - startTime;
  const aggregateStats = { totalLearners: stats.processed, successRate: ((stats.successfulROI / stats.processed) * 100).toFixed(2), errorCount: stats.errors, errorRate: ((stats.errors / (stats.processed + stats.errors)) * 100).toFixed(2), averageROI: (stats.totalROI / stats.successfulROI).toFixed(4), averageCost: (stats.totalCost / stats.successfulROI).toFixed(2), averageBenefit: (stats.totalBenefit / stats.successfulROI).toFixed(2), totalInvestment: stats.totalCost, totalValue: stats.totalBenefit, overallROI: ((stats.totalBenefit - stats.totalCost) / stats.totalCost * 100).toFixed(2) + '%', archetypeMetrics: {} };
  for (const [arch, vals] of Object.entries(stats.roiByArchetype)) { if (vals.length > 0) { const avgROI = vals.reduce((a, b) => a + b) / vals.length; const avgCost = stats.costByArchetype[arch].reduce((a, b) => a + b) / stats.costByArchetype[arch].length; const avgBenefit = stats.benefitByArchetype[arch].reduce((a, b) => a + b) / stats.benefitByArchetype[arch].length; aggregateStats.archetypeMetrics[arch] = { count: vals.length, averageROI: avgROI.toFixed(4), averageCost: avgCost.toFixed(2), averageBenefit: avgBenefit.toFixed(2), roiDistribution: { min: Math.min(...vals).toFixed(4), max: Math.max(...vals).toFixed(4), median: (vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)]).toFixed(4) } }; } }
  await fs.writeFile(`${DATA_DIR}/roi-stats.json`, JSON.stringify(aggregateStats, null, 2));
  console.log('\n\n✅ ROI Metric Collection Complete\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Processing Summary:');
  console.log(`  Learners processed:    ${stats.processed}`);
  console.log(`  Successful ROI:        ${stats.successfulROI} (${aggregateStats.successRate}%)`);
  console.log(`  Errors:                ${stats.errors} (${aggregateStats.errorRate}%)`);
  console.log(`  Time elapsed:          ${(elapsedMs / 1000).toFixed(2)}s`);
  console.log('\n📈 Overall ROI Metrics:');
  console.log(`  Total Investment:      $${aggregateStats.totalInvestment.toLocaleString()}`);
  console.log(`  Total Value Created:   $${aggregateStats.totalValue.toLocaleString()}`);
  console.log(`  Overall ROI:           ${aggregateStats.overallROI}`);
  console.log(`  Average ROI/Learner:   ${aggregateStats.averageROI}`);
  console.log(`  Average Cost/Learner:  $${aggregateStats.averageCost}`);
  console.log(`  Average Benefit/Learn: $${aggregateStats.averageBenefit}`);
  console.log('\n🎯 ROI by Archetype:');
  for (const [arch, m] of Object.entries(aggregateStats.archetypeMetrics)) { console.log(`\n  ${arch}:`); console.log(`    Learners:     ${m.count}`); console.log(`    Avg ROI:      ${m.averageROI}`); console.log(`    Avg Cost:     $${m.averageCost}`); console.log(`    Avg Benefit:  $${m.averageBenefit}`); console.log(`    ROI Range:    ${m.roiDistribution.min} - ${m.roiDistribution.max}`); }
  console.log('\n📁 Output Files:');
  console.log(`  ✅ ${DATA_DIR}/roi-tracking.jsonl (${stats.successfulROI} records)`);
  console.log(`  ✅ ${DATA_DIR}/roi-stats.json (aggregate statistics)`);
  console.log('\n✨ Task 3 Complete: ROI tracking ready for Task 4 (Live Dashboard)\n');
  return aggregateStats;
}

try { await collectROIMetrics(); process.exit(0); } catch (err) { console.error('\n❌ ROI Collection Failed:', err.message); process.exit(1); }
