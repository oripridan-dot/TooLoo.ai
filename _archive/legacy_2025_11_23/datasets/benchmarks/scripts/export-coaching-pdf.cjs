#!/usr/bin/env node
// Export coaching PDF packets for one or multiple products
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const analyzer = require('../engine/product-benchmark-analyzer.cjs');

const args = process.argv.slice(2);
if(args.length===0){
  console.error('Usage: node scripts/export-coaching-pdf.cjs <Product1,Product2,...>');
  process.exit(1);
}
const products = args[0].split(',').map(s=>s.trim()).filter(Boolean);
const rootDir = path.join(__dirname,'..');
const bench = analyzer.loadBenchmark(rootDir);
const globalAvg = analyzer.computeGlobalTraitAverages(bench.signatures);

function addSection(doc,title){doc.moveDown(0.5);doc.fontSize(14).fillColor('#111').text(title);doc.moveDown(0.25);} 
function addLine(doc,label,val){doc.fontSize(10).fillColor('#222').text(label+': '+val);} 

function exportAll(){
  const outFile = path.join(rootDir,'product-genesis-knowledge',`coaching-packet-${Date.now()}.pdf`);
  const doc = new PDFDocument({ margin:42 });
  doc.pipe(fs.createWriteStream(outFile));
  doc.fontSize(16).text('TooLoo.ai Coaching Packet', { underline:false });
  doc.fontSize(9).fillColor('#555').text('Generated '+ new Date().toISOString());
  products.forEach(p=> {
    const sig = bench.signatures.find(s=> s.product === p);
    if(!sig){ doc.addPage(); doc.fontSize(14).fillColor('#900').text(p+': Not in benchmark'); return; }
    const coaching = analyzer.computeCoachingInsights(sig, globalAvg, {});
    doc.addPage();
    doc.fontSize(18).fillColor('#111').text(p);
    doc.fontSize(9).fillColor('#555').text('Category: '+sig.category);
    addSection(doc,'Summary Narrative');
    doc.fontSize(11).fillColor('#222').text(coaching.narrative || 'No narrative');
    addSection(doc,'Trait Scores');
    Object.entries(sig.traitScores).forEach(([t,v])=> addLine(doc, t, (v*100).toFixed(1)+'% (p'+ ((sig.traitPercentiles[t]||0)*100).toFixed(0)+')'));
    addSection(doc,'Highlights');
    addLine(doc,'Leverage', coaching.leverage.map(x=>x.trait).join(', ') || '—');
    addLine(doc,'Strengths', coaching.strengths.map(x=>x.trait).join(', ') || '—');
    addLine(doc,'Growth Gaps', coaching.growthGaps.map(x=>x.trait).join(', ') || '—');
    if(coaching.watch.length) addLine(doc,'Watch', coaching.watch.map(x=>x.trait).join(', '));
    if(coaching.balance.overConcentration) addLine(doc,'Focus Risk', coaching.balance.dominantTraits.join(', '));
    addSection(doc,'Pattern Prescriptions');
    coaching.patternPrescriptions.forEach(pp=> addLine(doc, pp.trait, pp.recommend.join(', ')) );
  });
  doc.end();
  console.log('PDF exported -> '+outFile);
}

exportAll();
