// Snapshot Assembly Harness - Validates complete cognitive snapshot composition
// Tests end-to-end pipeline: messages → segments → patterns → traits → snapshot

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';
import { composeSnapshot, formatSnapshot } from '../engine/snapshot-composer.js';

const SESSIONS_DIR = path.join(__dirname, '../conversation-synthetic/sessions');

function loadSession(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runSnapshotAssemblyHarness() {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  let sessionResults = [];

  console.log('Snapshot Assembly Harness Results:');
  console.log('===================================');

  for (const file of files) {
    const session = loadSession(path.join(SESSIONS_DIR, file));
    const messages = session.messages || [];
    const segments = session.segments || [];
    
    // Run full pipeline
    const startTime = Date.now();
    const patterns = runPatternExtraction(messages, segments);
    const traits = computeTraitVector(patterns);
    const snapshot = composeSnapshot({
      messages,
      segments,
      patterns,
      traits
    }, {
      processingTime: Date.now() - startTime,
      scoringSpecVersion: '0.1.0'
    });
    
    // Validate snapshot schema
    const validation = validateSnapshot(snapshot);
    const summary = formatSnapshot(snapshot, 'summary');
    
    sessionResults.push({
      file,
      sessionId: session.sessionId,
      snapshot,
      summary,
      validation,
      processingTime: snapshot.metadata.processingTime
    });

    console.log(`\nSession: ${session.sessionId} (${file})`);
    console.log(`  Processing time: ${snapshot.metadata.processingTime}ms`);
    console.log(`  Messages: ${snapshot.metadata.messageCount}`);
    console.log(`  Segments: ${snapshot.metadata.segmentCount}`);
    console.log(`  Patterns: ${snapshot.metadata.patternCount}`);
    console.log(`  Insights: ${snapshot.summary.totalInsights}`);
    console.log(`  Highlights: ${snapshot.summary.highlightPatterns}`);
    console.log(`  Dominant trait: ${snapshot.summary.dominantTrait}`);
    console.log(`  Style: ${snapshot.summary.conversationStyle}`);
    console.log(`  Recommendations: ${snapshot.recommendations.length}`);
    console.log(`  Schema validation: ${validation.passed}/${validation.total} checks ✓`);
    
    // Display top patterns
    if (snapshot.patterns.length > 0) {
      console.log(`  Top patterns:`);
      snapshot.patterns.slice(0, 3).forEach(p => {
        console.log(`    ${p.id} (conf: ${p.confidence}, segment: ${p.segmentId})`);
      });
    }
    
    // Display trait summary
    console.log(`  Trait summary:`);
    for (const [trait, data] of Object.entries(snapshot.traits)) {
      console.log(`    ${trait}: ${data.value} (${data.interpretation})`);
    }
  }

  // Overall statistics
  const avgProcessingTime = sessionResults.reduce((sum, r) => sum + r.processingTime, 0) / sessionResults.length;
  const totalValidationsPassed = sessionResults.reduce((sum, r) => sum + r.validation.passed, 0);
  const totalValidations = sessionResults.reduce((sum, r) => sum + r.validation.total, 0);
  const schemaCompliance = totalValidations > 0 ? (totalValidationsPassed / totalValidations) : 0;

  console.log(`\n===================================`);
  console.log(`Sessions processed: ${sessionResults.length}`);
  console.log(`Average processing time: ${Math.round(avgProcessingTime)}ms`);
  console.log(`Schema compliance: ${Math.round(schemaCompliance * 100)}% (${totalValidationsPassed}/${totalValidations})`);
  console.log(`Performance target: <150ms per pattern-scoring-spec.md`);
  console.log(`Performance status: ${avgProcessingTime < 150 ? '✓ PASS' : '⚠ REVIEW'}`);
  
  return sessionResults;
}

function validateSnapshot(snapshot) {
  let passed = 0;
  let total = 0;
  
  // Required fields validation
  const requiredFields = ['metadata', 'segments', 'patterns', 'traits', 'recommendations', 'summary'];
  for (const field of requiredFields) {
    total++;
    if (snapshot[field] !== undefined) passed++;
  }
  
  // Metadata validation
  const metadataFields = ['messageCount', 'segmentCount', 'patternCount', 'timestamp', 'version'];
  for (const field of metadataFields) {
    total++;
    if (snapshot.metadata?.[field] !== undefined) passed++;
  }
  
  // Trait validation (all traits present with values 0-1)
  const expectedTraits = ['decisionCompression', 'riskDiscipline', 'trustPriority', 'structureExpectation'];
  for (const trait of expectedTraits) {
    total++;
    const value = snapshot.traits?.[trait]?.value;
    if (typeof value === 'number' && value >= 0 && value <= 1) passed++;
  }
  
  // Pattern validation (confidence and distinctiveness in range)
  for (const pattern of snapshot.patterns || []) {
    total += 2;
    if (pattern.confidence >= 0 && pattern.confidence <= 1) passed++;
    if (pattern.distinctiveness >= 0 && pattern.distinctiveness <= 1) passed++;
  }
  
  return { passed, total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSnapshotAssemblyHarness();
}

export { runSnapshotAssemblyHarness };