#!/usr/bin/env node
/**
 * Compute precision/recall on sample extraction vs ground truth.
 */
import fs from 'fs';
import path from 'path';

const gt = JSON.parse(fs.readFileSync('quality/sample-ground-truth.json','utf8'));
const pred = JSON.parse(fs.readFileSync('quality/sample-predictions.json','utf8'));
const gtSet = new Set(gt.patterns.map(p=>p.name.toLowerCase()));
const predSet = new Set(pred.patterns.map(p=>p.name.toLowerCase()));
let tp=0; predSet.forEach(n=>{ if(gtSet.has(n)) tp++; });
const fp = predSet.size - tp;
const fn = gtSet.size - tp;
const precision = tp / (tp+fp);
const recall = tp / (tp+fn);
const f1 = (2*precision*recall)/(precision+recall);
const report = { tp, fp, fn, precision:+precision.toFixed(3), recall:+recall.toFixed(3), f1:+f1.toFixed(3), timestamp: new Date().toISOString() };
fs.writeFileSync('quality/metrics-latest.json', JSON.stringify(report,null,2));
// Append to history log (JSON Lines)
try {
	fs.appendFileSync('quality/metrics-history.jsonl', JSON.stringify(report) + '\n');
} catch {}
console.log('Metrics:', report);
