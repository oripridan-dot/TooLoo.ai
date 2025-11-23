// Product Benchmark Analyzer
const fs = require('fs');
const path = require('path');

function loadBenchmark(rootDir) {
  const p = path.join(rootDir,'product-genesis-knowledge','benchmark-signatures.json');
  if(!fs.existsSync(p)) throw new Error('Benchmark signatures not found. Run build-product-benchmark.cjs first.');
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

function computeGlobalTraitAverages(signatures) {
  const sums = {}; let count=0;
  for (const sig of signatures) {
    for (const [trait,val] of Object.entries(sig.traitScores)) {
      sums[trait] = (sums[trait]||0) + val;
    }
    count++;
  }
  const averages = {}; for (const [trait,sum] of Object.entries(sums)) averages[trait] = sum / count;
  return averages;
}

function gapVector(target, globalAvg, categoryAvg) {
  const gaps = {};
  for (const trait of Object.keys(globalAvg)) {
    const tVal = target.traitScores[trait] || 0;
    gaps[trait] = {
      target: tVal,
      vsGlobal: tVal - globalAvg[trait],
      vsCategory: categoryAvg[trait] !== undefined ? tVal - categoryAvg[trait] : null
    };
  }
  return gaps;
}

function rankLargestGaps(gaps, topN=5) {
  const arr = Object.entries(gaps).map(([trait,obj])=>({trait, delta: Math.abs(obj.vsGlobal), dir: obj.vsGlobal}));
  return arr.sort((a,b)=> b.delta - a.delta).slice(0, topN);
}

function computeCoachingInsights(signature, globalAvg, options={}) {
  // thresholds
  const strongPct = options.strongPercentileThreshold || 0.8; // percentile above which trait is a strength
  const leveragePct = options.leveragePercentileThreshold || 0.9; // top tier leverage traits
  const growthPct = options.growthPercentileThreshold || 0.35; // percentile below which trait is a growth gap
  const materialDelta = options.materialDelta || 0.05; // absolute difference vs global to call out
  const dominantThreshold = options.dominantThreshold || 0.85; // raw score threshold to consider dominant
  const overConcentrationStd = options.overConcentrationStd || 0.12; // std dev level to flag imbalance
  const maxPrescriptionsPerTrait = options.maxPrescriptionsPerTrait || 3;
  const traitScores = signature.traitScores || {};
  const traitPercentiles = signature.traitPercentiles || {};
  const strengths = [];
  const leverage = [];
  const growthGaps = [];
  const watch = [];
  // pattern family mapping (light heuristic)
  const PATTERN_MAP = {
    strategicVision: ['pivot-trigger-question','option-framing-request','vision-differentiator','scope-compression'],
    riskIntelligence: ['risk-surfacing','contingency-framing','assumption-stress-test','failure-pre-mortem'],
    decisionClarity: ['decision-shorthand-affirm','option-framing-request','criteria-alignment','next-step-authorization'],
    innovationDrive: ['paradigm-challenge','future-state-probe','novelty-seed','exploratory-scenario-cast'],
    executionDiscipline: ['next-step-authorization','deliverable-framing-quad','cadence-commit','scope-compression']
  };
  for (const trait of Object.keys(traitScores)) {
    const score = traitScores[trait];
    const pct = traitPercentiles[trait] ?? null;
    const deltaGlobal = globalAvg[trait] !== undefined ? score - globalAvg[trait] : null;
    if (pct !== null) {
      if (pct >= leveragePct) {
        leverage.push({ trait, score, percentile: pct, deltaGlobal });
      } else if (pct >= strongPct) {
        strengths.push({ trait, score, percentile: pct, deltaGlobal });
      } else if (pct <= growthPct) {
        growthGaps.push({ trait, score, percentile: pct, deltaGlobal });
      } else if (Math.abs(deltaGlobal) >= materialDelta) {
        watch.push({ trait, score, percentile: pct, deltaGlobal });
      }
    }
  }
  strengths.sort((a,b)=> b.percentile - a.percentile);
  leverage.sort((a,b)=> b.percentile - a.percentile);
  growthGaps.sort((a,b)=> a.percentile - b.percentile);
  watch.sort((a,b)=> Math.abs(b.deltaGlobal) - Math.abs(a.deltaGlobal));
  // balance index (std dev of trait scores)
  const values = Object.values(traitScores);
  const mean = values.reduce((a,b)=>a+b,0)/ (values.length||1);
  const variance = values.reduce((a,b)=> a + Math.pow(b-mean,2),0)/(values.length||1);
  const stdDev = Math.sqrt(variance);
  const dominantTraits = Object.entries(traitScores).filter(([t,v])=> v >= dominantThreshold).map(([t])=>t);
  const overConcentration = stdDev >= overConcentrationStd && dominantTraits.length===1;
  // prescriptions for growth gaps
  const patternPrescriptions = growthGaps.map(g=> ({ trait: g.trait, recommend: (PATTERN_MAP[g.trait]||[]).slice(0,maxPrescriptionsPerTrait) }));
  const narrativeParts = [];
  if (leverage.length) narrativeParts.push(`Leverage: ${leverage.map(l=>`${l.trait}`).join(', ')}`);
  if (strengths.length) narrativeParts.push(`Strengths: ${strengths.map(s=>`${s.trait}`).join(', ')}`);
  if (growthGaps.length) narrativeParts.push(`Growth: ${growthGaps.map(g=>`${g.trait}`).join(', ')}`);
  if (watch.length) narrativeParts.push(`Watch: ${watch.map(w=>`${w.trait}`).join(', ')}`);
  if (overConcentration) narrativeParts.push(`Focus Risk: ${dominantTraits[0]} overshadowing others`);
  return {
    thresholds: { strongPct, leveragePct, growthPct, materialDelta },
    counts: { leverage: leverage.length, strengths: strengths.length, growth: growthGaps.length, watch: watch.length },
    leverage, strengths, growthGaps, watch,
    balance: { stdDev, mean, dominantTraits, overConcentration },
    patternPrescriptions,
    narrative: narrativeParts.join(' | ')
  };
}

module.exports = { loadBenchmark, computeGlobalTraitAverages, gapVector, rankLargestGaps, computeCoachingInsights };
