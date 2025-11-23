/**
 * Segmenter Harness (Phase P2)
 * Compares heuristic segments vs synthetic session ground truth.
 */
import fs from 'fs';
import path from 'path';
import { segment } from '../engine/segmenter.js';
import { parse } from '../engine/parser.js';

const sessionsDir = path.resolve('conversation-synthetic', 'sessions');
const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));

function indexById(messages) { const map = {}; for (let i=0;i<messages.length;i++) map[messages[i].id]=i; return map; }

let global = { totalSegments:0, matchedBoundaries:0, labelMatches:0, totalTruthSegments:0 };
const mismatch = {};

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, file),'utf8'));
  // Build raw pseudo transcript for parser (consistent with fixtures)
  const raw = data.messages.map(m => `${m.author}: ${m.content}`).join('\n');
  const parsed = parse(raw);
  const segResult = segment(parsed.messages);
  const truth = data.segments;
  const idIndex = indexById(parsed.messages);
  // Compare boundaries by start indices
  const truthStarts = new Set(truth.map(s => idIndex[s.startMessageId]));
  const ourStarts = new Set(segResult.segments.map(s => idIndex[s.startMessageId]));
  let boundaryMatches = 0;
  for (const idx of truthStarts) if (ourStarts.has(idx)) boundaryMatches++;
  // Label align: naive compare of first message label in each truth segment to our segment containing that message
  let labelMatch = 0;
  const synonyms = [
    { truth: ['ceiling question','pivot selection','pivot','pivot question','alternate path proposal'], ours: ['pivot'] },
    { truth: ['risk enumeration','categorized risks','risks','blocker request','status report','extraction acknowledgment','risk conditional'], ours: ['risk'] },
    { truth: ['mitigation plan','mitigation sequence','pipeline draft'], ours: ['mitigation'] },
    { truth: ['option framing','option framing','option'], ours: ['option'] },
    { truth: ['compressed decision','decision compression'], ours: ['decision','authorization'] },
    { truth: ['approval','authorization','pivot selection approval','transition authorization'], ours: ['authorization','execution'] },
    { truth: ['privacy principle','privacy principle set','privacy augmentation','centralization proposal','model adjustment'], ours: ['privacy','onboarding','execution'] },
    { truth: ['profile request','profile delivery'], ours: ['profile','request'] },
    { truth: ['onboarding design','onboarding value','value time constraint','privacy augmentation'], ours: ['onboarding'] },
    { truth: ['format request','format convention','reporting convention','demonstration','convention lock'], ours: ['format','execution'] },
    { truth: ['execution','execution/refinement','refinement'], ours: ['execution'] }
  ];
  for (const t of truth) {
    const msgIdx = idIndex[t.startMessageId];
    const ours = segResult.segments.find(s => idIndex[s.startMessageId] <= msgIdx && idIndex[s.endMessageId] >= msgIdx);
    if (ours) {
      const normTruth = t.label.toLowerCase();
      const normOurs = ours.label.toLowerCase();
      const matched = synonyms.some(s => s.truth.some(tt => normTruth.includes(tt)) && s.ours.some(ol => normOurs.includes(ol)));
      if (matched) labelMatch++; else {
        const key = `${normTruth} => ${normOurs}`;
        mismatch[key] = (mismatch[key] || 0) + 1;
      }
    }
  }
  global.totalTruthSegments += truth.length;
  global.matchedBoundaries += boundaryMatches;
  global.labelMatches += labelMatch;
  global.totalSegments += segResult.segments.length;
}

const boundaryMatchRate = (global.matchedBoundaries / global.totalTruthSegments).toFixed(2);
const labelMatchRate = (global.labelMatches / global.totalTruthSegments).toFixed(2);
console.log('Segmenter Evaluation');
console.log({
  boundaryMatchRate,
  labelMatchRate,
  totalTruthSegments: global.totalTruthSegments,
  producedSegments: global.totalSegments
});
console.log('Label mismatches (truth => ours):');
console.table(Object.entries(mismatch).map(([k,v])=>({ pair:k, count:v })));
