#!/usr/bin/env node
/**
 * Genesis Cleaner Utility
 * Usage: node scripts/clean-genesis.js <inputFile> [outputFile]
 * - Removes lines containing '**undefined**' or 'NaN%'
 * - Normalizes confidence percentages to 0–100
 * - Collapses duplicate blank lines
 */
import fs from 'fs';
import path from 'path';

const inPath = process.argv[2];
if(!inPath){
  console.error('Input file required');
  process.exit(1);
}
const outPath = process.argv[3] || inPath.replace(/\.md$/, '-clean.md');
let txt = fs.readFileSync(inPath, 'utf8');

// Remove undefined / NaN lines
txt = txt.split('\n').filter(l => !/\*\*undefined\*\*/i.test(l) && !/NaN%/.test(l)).join('\n');

// Normalize confidence patterns like 'confidence: 134%' ➜ clamp
txt = txt.replace(/(confidence:\s*)(\d+)%/gi, (_, pre, num) => {
  let n = parseInt(num,10); if(n>100) n=100; if(n<0) n=0; return pre + n + '%';
});

// Collapse >2 blank lines
txt = txt.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(outPath, txt, 'utf8');
console.log(`Cleaned genesis written -> ${path.resolve(outPath)}`);
