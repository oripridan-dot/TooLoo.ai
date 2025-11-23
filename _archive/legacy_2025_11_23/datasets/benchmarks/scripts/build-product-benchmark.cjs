#!/usr/bin/env node
// Build product benchmark signatures
const fs = require('fs');
const path = require('path');
const engine = require('../engine/evolving-product-genesis-engine.cjs');

const datasetPath = path.join(__dirname, '../product-genesis-knowledge/products-dataset.json');
const outPath = path.join(__dirname, '../product-genesis-knowledge/benchmark-signatures.json');

const args = process.argv.slice(2);
let limit = null;
let incremental = false;
let targetProducts = null; // array
for (let i=0;i<args.length;i++) {
  if (args[i] === '--limit' && args[i+1]) { limit = parseInt(args[i+1],10); }
  if (args[i] === '--incremental') incremental = true;
  if (args[i] === '--products' && args[i+1]) { targetProducts = args[i+1].split(',').map(s=>s.trim()).filter(Boolean); }
}

function loadDataset() {
  return JSON.parse(fs.readFileSync(datasetPath,'utf8'));
}

function build() {
  const data = loadDataset();
  const categories = data.categories || {};
  let existing = null;
  if (incremental && fs.existsSync(outPath)) {
    try { existing = JSON.parse(fs.readFileSync(outPath,'utf8')); } catch(e){ existing = null; }
  }
  const existingMap = new Map();
  if (existing) {
    for (const sig of existing.signatures || []) existingMap.set(sig.product, sig);
  }
  const signatures = [];
  for (const [cat, products] of Object.entries(categories)) {
    for (const p of products) {
      if (limit !== null && signatures.length >= limit) break;
      if (targetProducts && !targetProducts.includes(p)) {
        // if incremental and signature existed previously include original untouched to keep dataset stable
        if (incremental && existingMap.has(p)) {
          const clone = JSON.parse(JSON.stringify(existingMap.get(p)));
          signatures.push(clone);
        }
        continue;
      }
      let sig;
      if (incremental && existingMap.has(p) && !(targetProducts && targetProducts.includes(p))) {
        sig = JSON.parse(JSON.stringify(existingMap.get(p)));
      } else {
        sig = engine.getSignature(p, p);
        sig.category = cat;
      }
      signatures.push(sig);
    }
    if (limit !== null && signatures.length >= limit) break;
  }
  // recompute aggregates & percentiles globally to keep ranks consistent
  const aggregates = computeAggregates(signatures);
  const percentiles = computePercentiles(signatures);
  for (const sig of signatures) {
    sig.percentiles = {
      reliability: percentiles.reliability.map.find(p=>p.product===sig.product).p,
      coverage: percentiles.coverage.map.find(p=>p.product===sig.product).p,
      traitMean: percentiles.traitMean.map.find(p=>p.product===sig.product).p
    };
    sig.traitPercentiles = {};
    for (const trait of Object.keys(sig.traitScores)) {
      sig.traitPercentiles[trait] = percentiles.traits[trait].map.find(p=>p.product===sig.product).p;
    }
  }
  const radarData = buildRadar(signatures);
  const out = { generated: new Date().toISOString(), count: signatures.length, categories: Object.keys(categories).length, signatures, aggregates, percentiles: percentiles.summary, radar: radarData.meta, incremental, targetProducts: targetProducts||null };
  fs.writeFileSync(outPath, JSON.stringify(out,null,2));
  const radarOut = outPath.replace('benchmark-signatures.json','radar-data.json');
  fs.writeFileSync(radarOut, JSON.stringify(radarData.series,null,2));
  console.log(`Benchmark built (${incremental? 'incremental':'full'}): ${signatures.length} signatures -> ${outPath}`);
  if (targetProducts) console.log(`Targets: ${targetProducts.join(', ')}`);
  console.log(`Radar data -> ${radarOut}`);
}

function computeAggregates(signatures) {
  const byCategory = {};
  for (const sig of signatures) {
    if (!byCategory[sig.category]) byCategory[sig.category] = { traitSums:{}, count:0, reliability:0, coverage:0, traitDiversity:0, traitMean:0 };
    const agg = byCategory[sig.category];
    for (const [trait,val] of Object.entries(sig.traitScores)) {
      agg.traitSums[trait] = (agg.traitSums[trait]||0)+val;
    }
    agg.reliability += sig.metrics.reliability;
    agg.coverage += sig.metrics.coverage;
    agg.traitDiversity += sig.metrics.traitDiversity;
    agg.traitMean += sig.metrics.traitMean;
    agg.count++;
  }
  const categoryAverages = {};
  for (const [cat, agg] of Object.entries(byCategory)) {
    const avgTraits = {};
    for (const [trait,sum] of Object.entries(agg.traitSums)) {
      avgTraits[trait] = sum / agg.count;
    }
    categoryAverages[cat] = {
      avgTraits,
      reliability: agg.reliability/agg.count,
      coverage: agg.coverage/agg.count,
      traitDiversity: agg.traitDiversity/agg.count,
      traitMean: agg.traitMean/agg.count,
      count: agg.count
    };
  }
  return { categoryAverages };
}

function computePercentiles(signatures) {
  function rank(values) {
    const sorted = [...values].sort((a,b)=>a.value-b.value);
    return values.map(v=> ({ product: v.product, p: (sorted.findIndex(s=>s===v)+1)/sorted.length }));
  }
  function metricMap(metricKey) {
    const arr = signatures.map(s=> ({ product: s.product, value: s.metrics[metricKey] }));
    const sorted = [...arr].sort((a,b)=> a.value - b.value);
    return { map: sorted.map((v,i)=> ({ product: v.product, p: (i+1)/sorted.length })) };
  }
  const reliability = metricMap('reliability');
  const coverage = metricMap('coverage');
  const traitMean = metricMap('traitMean');
  const traits = {};
  const allTraits = new Set();
  signatures.forEach(s=> Object.keys(s.traitScores).forEach(t=> allTraits.add(t)));
  for (const t of allTraits) {
    const arr = signatures.map(s=> ({ product: s.product, value: s.traitScores[t]||0 }));
    const sorted = [...arr].sort((a,b)=> a.value - b.value);
    traits[t] = { map: sorted.map((v,i)=> ({ product: v.product, p: (i+1)/sorted.length })) };
  }
  const summary = { fields: ['reliability','coverage','traitMean', ...allTraits] };
  return { reliability, coverage, traitMean, traits, summary };
}

function buildRadar(signatures) {
  // simple radar: each signature -> vector of trait scores
  const allTraits = new Set();
  signatures.forEach(s=> Object.keys(s.traitScores).forEach(t=> allTraits.add(t)));
  const traitList = [...allTraits];
  const series = signatures.map(s=> ({ name: s.product, values: traitList.map(t=> s.traitScores[t] || 0) }));
  return { meta: { traits: traitList, count: series.length }, series };
}

build();
