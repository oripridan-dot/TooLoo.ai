// Trait Synthesis Harness - Validates trait computation against synthetic sessions
// Loads synthetic sessions, runs pattern extraction, computes trait vectors, and validates results

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector, formatTraitVector } from '../engine/trait-aggregator.js';

const SESSIONS_DIR = path.join(__dirname, '../conversation-synthetic/sessions');

function loadSession(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runTraitSynthesisHarness() {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  let sessionResults = [];

  console.log('Trait Synthesis Harness Results:');
  console.log('=====================================');

  for (const file of files) {
    const session = loadSession(path.join(SESSIONS_DIR, file));
    const messages = session.messages || [];
    const segments = session.segments || [];
    
    // Run pattern extraction
    const patterns = runPatternExtraction(messages, segments);
    
    // Compute trait vector
    const traitVector = computeTraitVector(patterns);
    const formattedTraits = formatTraitVector(traitVector);
    
    // Validate against expected ranges (from synthetic session annotations)
    const expectedTraits = session.expectedTraits || {};
    const validation = validateTraits(formattedTraits, expectedTraits);
    
    sessionResults.push({
      file,
      patternCount: patterns.length,
      traits: formattedTraits,
      validation,
      session: session.sessionId
    });

    console.log(`\nSession: ${session.sessionId} (${file})`);
    console.log(`  Patterns processed: ${patterns.length}`);
    console.log(`  Trait Vector:`);
    for (const [trait, value] of Object.entries(formattedTraits)) {
      if (trait !== 'timestamp' && trait !== 'version') {
        const expected = expectedTraits[trait];
        const status = expected ? (Math.abs(value - expected) < 0.2 ? '✓' : '⚠') : '-';
        console.log(`    ${trait}: ${value} ${status} ${expected ? `(expected: ${expected})` : ''}`);
      }
    }
    console.log(`  Validation: ${validation.passed}/${validation.total} traits within range`);
  }

  // Summary
  const totalValidations = sessionResults.reduce((sum, r) => sum + r.validation.total, 0);
  const passedValidations = sessionResults.reduce((sum, r) => sum + r.validation.passed, 0);
  const overallAccuracy = totalValidations > 0 ? (passedValidations / totalValidations) : 0;

  console.log(`\n=====================================`);
  console.log(`Overall trait accuracy: ${Math.round(overallAccuracy * 100)}% (${passedValidations}/${totalValidations})`);
  console.log(`Sessions processed: ${sessionResults.length}`);
  
  return sessionResults;
}

function validateTraits(computed, expected) {
  let passed = 0;
  let total = 0;
  
  for (const [trait, expectedValue] of Object.entries(expected)) {
    if (trait !== 'timestamp' && trait !== 'version') {
      total++;
      const computedValue = computed[trait] || 0;
      if (Math.abs(computedValue - expectedValue) < 0.2) { // 20% tolerance
        passed++;
      }
    }
  }
  
  return { passed, total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTraitSynthesisHarness();
}

export { runTraitSynthesisHarness };