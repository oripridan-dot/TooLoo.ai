#!/usr/bin/env node
import { EvolvingProductGenesisEngine } from '../engine/evolving-product-genesis-engine.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { rounds: 2, product: 'GenericX', description: 'adaptive platform layer' };
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--rounds') opts.rounds = parseInt(args[++i],10);
    else if (args[i]==='--product') opts.product = args[++i];
    else if (args[i]==='--desc') opts.description = args[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  console.log('🔁 Evolving Genesis Orchestrator');
  console.log(`Product: ${opts.product}`);
  console.log(`Rounds: ${opts.rounds}`);
  const engine = new EvolvingProductGenesisEngine();
  const trajectory = [];
  for (let r=1; r<=opts.rounds; r++) {
    console.log(`\n=== ROUND ${r} ===`);
    const { roundIndex, reportPath, metrics, adoptedPatterns } = await engine.runRound({productName: opts.product, productDescription: opts.description});
    console.log(`Report: ${reportPath}`);
    console.log(`Reliability ${(metrics.reliability*100).toFixed(1)}%  Coverage ${(metrics.coverage*100).toFixed(1)}%  Diversity ${(metrics.traitDiversity*100).toFixed(1)}%  Stability ${(metrics.stability*100).toFixed(1)}%  Novelty ${(metrics.novelty*100).toFixed(1)}%`);
    if (adoptedPatterns.length) console.log('Adopted:', adoptedPatterns.map(p=>p.id).join(', '));
    trajectory.push({ round: roundIndex, metrics, adopted: adoptedPatterns });
  }
  console.log('\nTrajectory:', trajectory.map(t=>({round:t.round, rel:(t.metrics.reliability*100).toFixed(1)})));
}

main().catch(e=>{console.error(e);process.exit(1);});
