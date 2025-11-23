// Pattern Extraction Harness - Validates pattern extraction accuracy
// Loads synthetic sessions, runs parser, segmenter, and pattern extractor, then reports feature emission and distinctiveness

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { segment as runSegmentation } from '../engine/segmenter.js';
import { runPatternExtraction } from '../engine/pattern-extractor.js';

const SESSIONS_DIR = path.join(__dirname, '../conversation-synthetic/sessions');


function loadSession(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runHarness() {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
  let totalPatterns = 0;
  let totalDistinct = 0;
  let sessionResults = [];

  for (const file of files) {
    const session = loadSession(path.join(SESSIONS_DIR, file));
    const messages = session.messages || [];
    const segments = session.segments || runSegmentation(messages);
    const patterns = runPatternExtraction(messages, segments);
    totalPatterns += patterns.length;
    totalDistinct += patterns.filter(p => p.features.distinctiveness > 0.5).length;
    sessionResults.push({
      file,
      patternCount: patterns.length,
      distinctCount: patterns.filter(p => p.features.distinctiveness > 0.5).length,
      patterns
    });
  }

  // Report summary
  console.log('Pattern Extraction Harness Results:');
  for (const result of sessionResults) {
    console.log(`Session: ${result.file}`);
    console.log(`  Patterns found: ${result.patternCount}`);
    console.log(`  Distinctive patterns: ${result.distinctCount}`);
    if (result.patterns.length > 0) {
      for (const p of result.patterns) {
        console.log(`    Pattern: ${p.patterns.join(', ')}`);
        console.log(`      Segment: ${p.segmentId}`);
        console.log(`      Window: ${p.windowStart}–${p.windowEnd}`);
        console.log(`      Texts: ${p.texts.join(' | ')}`);
        console.log(`      Features: ${JSON.stringify(p.features)}`);
      }
    }
  }
  console.log(`Total patterns: ${totalPatterns}`);
  console.log(`Total distinctive: ${totalDistinct}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHarness();
}
