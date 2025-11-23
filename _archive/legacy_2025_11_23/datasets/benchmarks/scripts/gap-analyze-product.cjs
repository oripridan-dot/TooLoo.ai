#!/usr/bin/env node
// Gap analysis for a single product vs benchmark
const path = require('path');
const fs = require('fs');
const engine = require('../engine/evolving-product-genesis-engine.cjs');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const args = process.argv.slice(2);
if(args.length===0){
  console.error('Usage: node scripts/gap-analyze-product.cjs <ProductName>');
  process.exit(1);
}
const productName = args[0];

const rootDir = path.join(__dirname,'..');

function loadBenchmark(){return analyzer.loadBenchmark(rootDir);}    

function findCategory(sigSet, productName){
  const f = sigSet.signatures.find(s=>s.product===productName);
  return f? f.category : null;
}

function main(){
  const bench = loadBenchmark();
  const sigSet = bench;
  const signatures = sigSet.signatures;
  const globalAvg = analyzer.computeGlobalTraitAverages(signatures);
  const existing = signatures.find(s=>s.product===productName);
  const targetSig = existing || engine.getSignature(productName, productName);
  const category = existing? existing.category : 'Unknown';
  const categoryAvgTraits = existing? sigSet.aggregates.categoryAverages[category].avgTraits : globalAvg;
  const gaps = analyzer.gapVector(targetSig, globalAvg, categoryAvgTraits);
  const top = analyzer.rankLargestGaps(gaps, 5);

  const report = {
    generated: new Date().toISOString(),
    product: productName,
    category,
    signature: targetSig,
    topGlobalTraitGaps: top,
    summary: top.map(t=> `${t.trait}: ${(t.dir>0?'+':'')}${(t.dir*100).toFixed(1)}pp vs global`).join('; ')
  };

  const outPath = path.join(rootDir,'product-genesis-knowledge',`gap-${productName.replace(/\s+/g,'_')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report,null,2));
  console.log(`Gap analysis saved -> ${outPath}`);
  console.log(report.summary);
}

main();
