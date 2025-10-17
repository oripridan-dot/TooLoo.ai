/**
 * Parser Harness (Phase P1 validation)
 * Loads synthetic JSON sessions and corresponding raw fixtures, parses raw, compares counts & spot checks content.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '../engine/parser.js';

const baseSessions = path.resolve('conversation-synthetic', 'sessions');
const rawDir = path.resolve('conversation-synthetic', 'fixtures', 'raw');

function normalize(str) {
  return str.replace(/\s+/g, ' ').trim();
}

let pass = 0, fail = 0; const reports = [];
for (const file of fs.readdirSync(baseSessions).filter(f => f.endsWith('.json'))) {
  const json = JSON.parse(fs.readFileSync(path.join(baseSessions, file), 'utf8'));
  const rawPath = path.join(rawDir, file.replace('.json', '.txt'));
  if (!fs.existsSync(rawPath)) {
    fail++; reports.push({ file, error: 'Missing raw fixture' }); continue;
  }
  const raw = fs.readFileSync(rawPath, 'utf8');
  const parsed = parse(raw, { maxMessages: 400 });
  const expectedCount = json.messages.length;
  const gotCount = parsed.messages.length;
  let ok = expectedCount === gotCount;
  // Spot-check first & last message content semantic equivalence
  if (ok && expectedCount > 0) {
    const expFirst = normalize(json.messages[0].content).slice(0, 80);
    const gotFirst = normalize(parsed.messages[0].content).slice(0, 80);
    const expLast = normalize(json.messages[expectedCount - 1].content).slice(0, 80);
    const gotLast = normalize(parsed.messages[gotCount - 1].content).slice(0, 80);
    ok = ok && expFirst === gotFirst && expLast === gotLast;
    if (!ok) {
      reports.push({ file, error: 'Content mismatch', expFirst, gotFirst, expLast, gotLast });
    }
  }
  if (ok) { pass++; } else { fail++; }
}

// Edge Case: Empty input
const empty = parse('');
if (empty.messages.length === 0 && empty.metadata.reasons.includes('EMPTY_INPUT')) {
  pass++; reports.push({ file: 'EMPTY_INPUT', note: 'ok' });
} else { fail++; reports.push({ file: 'EMPTY_INPUT', error: 'Did not flag empty input properly' }); }

// Edge Case: Oversize sampling
// Build synthetic large transcript by repeating first raw fixture lines
try {
  const sampleRawFile = path.join(rawDir, fs.readdirSync(rawDir).filter(f => f.endsWith('.txt'))[0]);
  const baseLines = fs.readFileSync(sampleRawFile, 'utf8').split('\n');
  let big = [];
  while (big.length < 450) big = big.concat(baseLines);
  big = big.slice(0, 450);
  const oversized = parse(big.join('\n'), { maxMessages: 400 });
  if (oversized.metadata.truncated && oversized.messages.length === 400) {
    pass++; reports.push({ file: 'OVERSIZE', note: 'truncated OK' });
  } else { fail++; reports.push({ file: 'OVERSIZE', error: 'Truncation failed', len: oversized.messages.length }); }
} catch (e) {
  fail++; reports.push({ file: 'OVERSIZE', error: e.message });
}

console.log('Parser Harness Results');
console.log('Pass:', pass, 'Fail:', fail);
if (reports.length) console.table(reports);
if (fail > 0) {
  process.exitCode = 1;
}
