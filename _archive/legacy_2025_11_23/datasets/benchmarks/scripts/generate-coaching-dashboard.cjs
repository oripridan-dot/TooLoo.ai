#!/usr/bin/env node
// Generate a simple static HTML dashboard for a single product
const fs = require('fs');
const path = require('path');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const args = process.argv.slice(2);
if(args.length===0){
  console.error('Usage: node scripts/generate-coaching-dashboard.cjs <ProductName>');
  process.exit(1);
}
const productName = args.join(' ');
const rootDir = path.join(__dirname,'..');
const benchmark = analyzer.loadBenchmark(rootDir);
const sig = benchmark.signatures.find(s=> s.product === productName);
if(!sig){
  console.error('Product not found in benchmark:', productName);
  process.exit(1);
}
const globalAvg = analyzer.computeGlobalTraitAverages(benchmark.signatures);
const coaching = analyzer.computeCoachingInsights(sig, globalAvg, {});
// gather radar traits
const radarPath = path.join(rootDir,'product-genesis-knowledge','radar-data.json');
let radarSeries = [];
if(fs.existsSync(radarPath)) {
  radarSeries = JSON.parse(fs.readFileSync(radarPath,'utf8'));
}
const traits = Object.keys(sig.traitScores);
function bar(value){
  const width = Math.round(value*100);
  return `<div style='background:#4e79a7;height:10px;width:${width}%;border-radius:3px'></div>`;
}
function pill(label,color){
  return `<span style="display:inline-block;background:${color};color:#fff;padding:2px 8px;margin:2px;border-radius:12px;font-size:12px">${label}</span>`;
}
const leveragePills = coaching.leverage.map(l=> pill(l.trait,'#2ca02c')).join('');
const strengthPills = coaching.strengths.map(l=> pill(l.trait,'#17becf')).join('');
const growthPills = coaching.growthGaps.map(l=> pill(l.trait,'#d62728')).join('');
const watchPills = coaching.watch.map(l=> pill(l.trait,'#ff7f0e')).join('');
const balanceAlert = coaching.balance.overConcentration ? `<div style='color:#d62728;font-weight:600'>Focus Risk: ${coaching.balance.dominantTraits.join(', ')}</div>` : '';
const prescriptions = coaching.patternPrescriptions.map(p=> `<tr><td>${p.trait}</td><td>${p.recommend.join(', ')}</td></tr>`).join('');
const traitRows = traits.map(t=> `<tr><td>${t}</td><td>${(sig.traitScores[t]*100).toFixed(1)}%</td><td>${(sig.traitPercentiles[t]*100).toFixed(1)}%</td><td>${bar(sig.traitScores[t])}</td></tr>`).join('');
// sparkline from trajectory reliability entries for this product
const trajPath = path.join(rootDir,'product-genesis-knowledge','trajectory.json');
let sparkSVG = '';
if (fs.existsSync(trajPath)) {
  try {
    const traj = JSON.parse(fs.readFileSync(trajPath,'utf8')).filter(r=> r.product === productName).slice(-20);
    if (traj.length>1) {
      const values = traj.map(r=> r.reliability || r.metrics?.reliability || 0);
      const max = Math.max(...values,1);
      const min = Math.min(...values,0);
      const w = 160; const h = 32; const step = w/(values.length-1);
      const pts = values.map((v,i)=> {
        const x = (i*step).toFixed(1);
        const norm = (v - min)/(max-min || 1);
        const y = (h - norm*h).toFixed(1);
        return `${x},${y}`;
      }).join(' ');
      sparkSVG = `<svg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><polyline fill='none' stroke='#4e79a7' stroke-width='2' points='${pts}'/><circle r='3' fill='#d62728' cx='${( (values.length-1)*step).toFixed(1)}' cy='${(h - ( (values[values.length-1]-min)/(max-min ||1))*h).toFixed(1)}' /></svg>`;
    }
  } catch(e) {}
}
const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>Coaching Dashboard - ${productName}</title><style>body{font-family:Inter,Arial,sans-serif;margin:32px;line-height:1.4;color:#222}h1{margin-top:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #eee;padding:6px 8px;text-align:left;font-size:13px}th{background:#fafafa}code{background:#f5f5f5;padding:2px 4px;border-radius:4px}</style></head><body>
<h1>Coaching Dashboard: ${productName}</h1>
<div style='margin-bottom:16px;font-size:14px'>Generated ${new Date().toISOString()}</div>
<h2>Profile Summary</h2>
<div>${coaching.narrative || 'No narrative'}</div>
<div style='margin-top:8px'><strong>Reliability Trend:</strong><br/>${sparkSVG || '<span style="font-size:12px;color:#888">Not enough history</span>'}</div>
${balanceAlert}
<h3>Trait Scores</h3>
<table><thead><tr><th>Trait</th><th>Score</th><th>Percentile</th><th>Visual</th></tr></thead><tbody>${traitRows}</tbody></table>
<h3>Highlights</h3>
<div><strong>Leverage:</strong> ${leveragePills || '—'}</div>
<div><strong>Strengths:</strong> ${strengthPills || '—'}</div>
<div><strong>Growth Gaps:</strong> ${growthPills || '—'}</div>
<div><strong>Watch:</strong> ${watchPills || '—'}</div>
<h3>Pattern Prescriptions</h3>
<table><thead><tr><th>Trait</th><th>Suggested Patterns</th></tr></thead><tbody>${prescriptions}</tbody></table>
<p style='margin-top:24px;font-size:12px;color:#666'>This dashboard is a static export. Rebuild benchmark then regenerate to refresh (incremental mode supported).</p>
</body></html>`;
const outFile = path.join(rootDir,'product-genesis-knowledge',`dashboard-${productName.replace(/\s+/g,'_')}.html`);
fs.writeFileSync(outFile, html);
console.log(`Dashboard generated -> ${outFile}`);
