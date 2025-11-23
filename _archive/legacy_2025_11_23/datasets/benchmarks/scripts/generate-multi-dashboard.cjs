#!/usr/bin/env node
// Multi-product comparison dashboard
const fs = require('fs');
const path = require('path');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const args = process.argv.slice(2);
if(args.length===0){
  console.error('Usage: node scripts/generate-multi-dashboard.cjs <Product1,Product2,...> [--out filename.html]');
  process.exit(1);
}
let listArg = args[0];
let outName = null;
let sortMode = null; // 'gaps' or 'trait:<name>' or 'reliability'
for (let i=1;i<args.length;i++) {
  if(args[i]==='--out' && args[i+1]) outName = args[i+1];
  if(args[i]==='--sort' && args[i+1]) sortMode = args[i+1];
}
const products = listArg.split(',').map(s=>s.trim()).filter(Boolean);
const rootDir = path.join(__dirname,'..');
const bench = analyzer.loadBenchmark(rootDir);
const sigMap = new Map(bench.signatures.map(s=>[s.product,s]));
const missing = products.filter(p=> !sigMap.has(p));
if(missing.length){
  console.error('Missing in benchmark:', missing.join(', '));
}
const globalAvg = analyzer.computeGlobalTraitAverages(bench.signatures);

function buildRow(trait){
  const cells = products.map(p=>{
    const sig = sigMap.get(p);
    if(!sig) return `<td class='missing'>—</td>`;
    const score = sig.traitScores[trait] || 0;
    const pct = (sig.traitPercentiles[trait]||0)*100;
    let cls='';
    if(pct>=90) cls='lev'; else if(pct>=80) cls='str'; else if(pct<=35) cls='gap';
    return `<td class='${cls}' title='${pct.toFixed(1)}%ile'>${(score*100).toFixed(1)}%</td>`;
  }).join('');
  return `<tr><th>${trait}</th>${cells}</tr>`;
}

// collect trait universe
const traits = new Set();
bench.signatures.slice(0,50).forEach(s=> Object.keys(s.traitScores).forEach(t=> traits.add(t))); // sample enough
const traitRows = [...traits].map(t=> buildRow(t)).join('\n');

function summaryBlock(p){
  const sig = sigMap.get(p); if(!sig) return `<div class='card missing'><h3>${p}</h3><div>Not in benchmark</div></div>`;
  const coaching = analyzer.computeCoachingInsights(sig, globalAvg, {});
  function list(names){return names.map(n=>`<span>${n.trait||n}</span>`).join(', ') || '—';}
  return `<div class='card'><h3>${p}</h3><div class='narr'>${coaching.narrative}</div><div class='tags'><strong>L:</strong> ${list(coaching.leverage)} <strong>S:</strong> ${list(coaching.strengths)} <strong>G:</strong> ${list(coaching.growthGaps)}</div></div>`;
}

// optional sorting pre-render
function sortProducts(list){
  if(!sortMode) return list;
  if(sortMode === 'gaps') {
    return [...list].sort((a,b)=> {
      const aSig = sigMap.get(a); const bSig = sigMap.get(b);
      const aCoach = analyzer.computeCoachingInsights(aSig, globalAvg, {});
      const bCoach = analyzer.computeCoachingInsights(bSig, globalAvg, {});
      return bCoach.growthGaps.length - aCoach.growthGaps.length;
    });
  }
  if(sortMode === 'reliability') {
    return [...list].sort((a,b)=> (sigMap.get(b).metrics.reliability) - (sigMap.get(a).metrics.reliability));
  }
  if(sortMode.startsWith('trait:')) {
    const t = sortMode.split(':')[1];
    return [...list].sort((a,b)=> (sigMap.get(b).traitScores[t]||0) - (sigMap.get(a).traitScores[t]||0));
  }
  return list;
}
const sortedProducts = sortProducts(products);
const summary = sortedProducts.map(p=> summaryBlock(p)).join('\n');
const style = `body{font-family:Inter,Arial,sans-serif;margin:32px;color:#222}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #eee;padding:6px 8px;font-size:13px;text-align:center}th{background:#fafafa}th:first-child{text-align:left}h1{margin:0 0 8px} .lev{background:#2ca02c20} .str{background:#17becf20} .gap{background:#d6272820} .missing{color:#bbb} .cards{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px} .card{border:1px solid #eee;padding:10px 12px;border-radius:8px;width:240px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05)} .card h3{margin:0 0 4px;font-size:15px} .narr{font-size:12px;line-height:1.3;margin-bottom:6px} .tags{font-size:11px;color:#444}`;
const legend = `<div style='margin-top:8px;font-size:12px'><span style='background:#2ca02c20;padding:2px 6px;border-radius:4px'>Leverage ≥90p</span> <span style='background:#17becf20;padding:2px 6px;border-radius:4px'>Strength ≥80p</span> <span style='background:#d6272820;padding:2px 6px;border-radius:4px'>Gap ≤35p</span></div>`;
const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Multi Dashboard</title><style>${style}</style></head><body><h1>Comparison Dashboard</h1><div style='font-size:12px'>Products: ${sortedProducts.join(', ')} | Generated ${new Date().toISOString()}${sortMode? ' | Sort: '+sortMode:''}</div>${legend}<div class='cards'>${summary}</div><table><thead><tr><th>Trait</th>${sortedProducts.map(p=>`<th>${p}</th>`).join('')}</tr></thead><tbody>${traitRows}</tbody></table></body></html>`;
const outFile = path.join(rootDir,'product-genesis-knowledge', outName || `multi-dashboard-${products.slice(0,5).join('_')}.html`);
fs.writeFileSync(outFile, html);
console.log('Multi dashboard generated -> '+outFile);
