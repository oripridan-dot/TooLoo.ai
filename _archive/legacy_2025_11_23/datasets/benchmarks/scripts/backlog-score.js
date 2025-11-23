#!/usr/bin/env node
/**
 * RICE Scoring Utility for backlog CSV.
 * Input: backlog-airbnb.csv (or custom path)
 * Output: backlog-airbnb-scored.csv with RICE components + Score.
 * Assumptions:
 *  - If Reach/Impact/Confidence columns absent, we synthesize from ValueScore.
 *    ValueScore 5 => Impact 3, Reach 2000, Confidence 0.85; scale downward.
 */
import fs from 'fs';
import path from 'path';

const inFile = process.argv[2] || 'backlog-airbnb.csv';
if(!fs.existsSync(inFile)) { console.error('File not found:', inFile); process.exit(1);} 
const raw = fs.readFileSync(inFile,'utf8').trim().split(/\r?\n/);
const header = raw[0].split(',');
const rows = raw.slice(1).map(l=>l.split(','));

// Extend header if missing
if(!header.includes('Reach')) header.push('Reach');
if(!header.includes('Impact')) header.push('Impact');
if(!header.includes('Confidence')) header.push('Confidence');
if(!header.includes('RICE')) header.push('RICE');

const idx = Object.fromEntries(header.map((h,i)=>[h,i]));

const outRows = rows.map(cols => {
  // Ensure array length
  while(cols.length < header.length) cols.push('');
  const valueScore = parseInt(cols[header.indexOf('ValueScore')],10) || 3;
  // Synthesized heuristics
  const impact = cols[idx.Impact] || (valueScore >=5 ? 3 : valueScore>=4?2.5 : valueScore>=3?2:1.5);
  const reach = cols[idx.Reach] || (valueScore >=5 ? 2000 : valueScore>=4?1200 : valueScore>=3?800:400);
  const confidence = cols[idx.Confidence] || (valueScore >=5 ? 0.85 : valueScore>=4?0.8 : valueScore>=3?0.7:0.65);
  const effort = parseFloat(cols[header.indexOf('Effort')]) || 3;
  const RICE = ((parseFloat(reach)*parseFloat(impact)*parseFloat(confidence))/effort).toFixed(2);
  cols[idx.Reach] = reach;
  cols[idx.Impact] = impact;
  cols[idx.Confidence] = confidence;
  cols[idx.RICE] = RICE;
  return cols;
});

const outCsv = header.join(',') + '\n' + outRows.map(r=>r.join(',')).join('\n');
const outPath = inFile.replace(/\.csv$/, '-scored.csv');
fs.writeFileSync(outPath, outCsv, 'utf8');
console.log('Scored backlog written ->', path.resolve(outPath));
