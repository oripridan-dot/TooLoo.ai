#!/usr/bin/env node
// Generate enablement priority list based on gap density & low clarity / high imbalance
const fs = require('fs');
const path = require('path');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const rootDir = path.join(__dirname,'..');
const bench = analyzer.loadBenchmark(rootDir);
const signatures = bench.signatures;
const globalAvg = analyzer.computeGlobalTraitAverages(signatures);

function scoreProduct(sig){
  const coaching = analyzer.computeCoachingInsights(sig, globalAvg, {});
  // base score: number of growth gaps
  let score = coaching.growthGaps.length;
  // penalty if decisionClarity very low (<25p)
  const dc = sig.traitPercentiles.decisionClarity || 0;
  if(dc < 0.25) score += 1.5;
  // penalty if over concentration
  if(coaching.balance.overConcentration) score += 1;
  // slight weight for low reliability percentile
  const relP = sig.percentiles.reliability || 0;
  if(relP < 0.3) score += 0.5;
  return { product: sig.product, category: sig.category, score, gaps: coaching.growthGaps.map(g=>g.trait), decisionClarityPct: dc, reliabilityPct: relP, overConcentration: coaching.balance.overConcentration };
}

const rows = signatures.map(scoreProduct).sort((a,b)=> b.score - a.score);
const out = { generated: new Date().toISOString(), count: rows.length, rows };
const outFile = path.join(rootDir,'product-genesis-knowledge','enablement-priority.json');
fs.writeFileSync(outFile, JSON.stringify(out,null,2));
console.log('Enablement priority list -> '+outFile);
console.log('Top 5:\n'+ rows.slice(0,5).map(r=> `${r.product} (score ${r.score})`).join('\n'));
