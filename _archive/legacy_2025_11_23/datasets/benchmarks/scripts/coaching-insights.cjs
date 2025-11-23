#!/usr/bin/env node
// Generate coaching insights for a product or all products
const path = require('path');
const fs = require('fs');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const args = process.argv.slice(2);
const rootDir = path.join(__dirname,'..');

function loadBenchmark(){return analyzer.loadBenchmark(rootDir);}    

function buildIndex(signatures){
  const map = new Map();
  for (const s of signatures) map.set(s.product, s);
  return map;
}

function insightsForProduct(productName, bench, options={}) {
  const signatures = bench.signatures;
  const sigIdx = buildIndex(signatures);
  const sig = sigIdx.get(productName);
  if(!sig) throw new Error(`Product not found in benchmark: ${productName}`);
  const globalAvg = analyzer.computeGlobalTraitAverages(signatures);
  const insights = analyzer.computeCoachingInsights(sig, globalAvg, options);
  return { product: productName, category: sig.category, generated: new Date().toISOString(), insights };
}

function insightsForAll(bench, options={}) {
  const signatures = bench.signatures;
  const globalAvg = analyzer.computeGlobalTraitAverages(signatures);
  const out = [];
  for (const sig of signatures) {
    const insights = analyzer.computeCoachingInsights(sig, globalAvg, options);
    out.push({ product: sig.product, category: sig.category, insights });
  }
  return { generated: new Date().toISOString(), count: out.length, items: out, thresholds: { ...options } };
}

function main(){
  if(args.length===0){
    console.error('Usage: node scripts/coaching-insights.cjs <ProductName>|--all [--json <outFile>]');
    process.exit(1);
  }
  const bench = loadBenchmark();
  const outDir = path.join(rootDir,'product-genesis-knowledge');
  let result; let outFile;
  if(args[0]==='--all') {
    result = insightsForAll(bench, {});
    outFile = path.join(outDir,'coaching-insights-all.json');
  } else {
    const productName = args[0];
    result = insightsForProduct(productName, bench, {});
    outFile = path.join(outDir,`coaching-insights-${productName.replace(/\s+/g,'_')}.json`);
  }
  fs.writeFileSync(outFile, JSON.stringify(result,null,2));
  console.log(`Coaching insights saved -> ${outFile}`);
  if(result.insights) {
    console.log(result.insights.narrative);
  } else if(result.items) {
    console.log(`Generated insights for ${result.count} products.`);
  }
}

main();
