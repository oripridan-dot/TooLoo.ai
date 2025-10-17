
// Auto-Evolving Genesis Automation Script (CommonJS)
// Runs evolution cycles, triggers integration, supports watch mode
const fs = require('fs');
const path = require('path');
const { appendPatterns } = require('../engine/pattern-library-integrator.cjs');
const engine = require('../engine/evolving-product-genesis-engine.cjs');

const configPath = path.join(__dirname, '../product-genesis-knowledge/auto-config.json');
const knowledgePath = path.join(__dirname, '../product-genesis-knowledge/knowledge.json');
const trajectoryPath = path.join(__dirname, '../product-genesis-knowledge/trajectory.json');

function loadConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.knowledgePath = knowledgePath;
  return config;
}
function loadKnowledge() {
  return JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
}
function saveKnowledge(data) {
  fs.writeFileSync(knowledgePath, JSON.stringify(data, null, 2), 'utf8');
}

function appendTrajectory(entry) {
  let arr = [];
  if (fs.existsSync(trajectoryPath)) {
    try { arr = JSON.parse(fs.readFileSync(trajectoryPath, 'utf8')); } catch(_) { arr = []; }
  }
  arr.push(entry);
  fs.writeFileSync(trajectoryPath, JSON.stringify(arr, null, 2));
}

async function runCycle(config) {
  let knowledge = loadKnowledge();
  for (const product of config.products) {
    const result = await engine.runEvolutionRound(product, knowledge, config);
    knowledge = result.updatedKnowledge;
    appendTrajectory({
      ts: new Date().toISOString(),
      product,
      reliability: result.metrics.compositeReliability,
      novelty: result.metrics.novelty,
      coverage: result.metrics.coverage,
      adopted: result.learnedPatterns
    });
    if (
      config.forceIntegration ||
      (result.metrics.compositeReliability >= config.integrationThreshold &&
        result.metrics.novelty >= config.noveltyThreshold)
    ) {
      appendPatterns(result.learnedPatterns);
      console.log(`Patterns integrated for ${product}`);
    }
    saveKnowledge(knowledge);
    console.log(`Cycle for ${product} complete. Reliability: ${result.metrics.compositeReliability}`);
  }
}

async function main() {
  const config = loadConfig();
  let cycles = 0;
  do {
    await runCycle(config);
    cycles++;
    if (!config.watchMode || cycles >= config.maxCycles) break;
    await new Promise(res => setTimeout(res, config.cycleIntervalMinutes * 60000));
  } while (config.watchMode);
  console.log('Auto-evolution complete.');
}

main();
