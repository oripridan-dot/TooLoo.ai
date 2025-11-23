#!/usr/bin/env node

/**
 * ENGINE ARCHIVAL SCRIPT
 * ======================
 * 
 * Identifies dormant/unused engines and prepares them for archival.
 * Creates registry mapping which engines activate for which intents.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.join(__dirname, '..', 'engine');
const archiveDir = path.join(__dirname, '..', 'engine', 'deprecated');

// Engines that are ACTIVE in the Workbench system
const ACTIVE_ENGINES = [
  'workbench-orchestrator.js',
  'github-provider.js',
  'index.js'
];

// Dormant engines to archive
const DORMANT_ENGINES = [
  'AutonomousEvolutionEngine.js',
  'SelfDiscoveryEngine.js',
  'ProactiveIntelligenceEngine.js',
  'ArtifactGenerationEngine.js',
  'BookwormAnalysisEngine.js',
  'ProductWorkflowOrchestrator.js',
  'CohortAnalyzer.js',
  'CohortAnalyzerV2.js',
  'CohortAnalyzerV3.js',
  'CohortAnalyzerV4.js',
  'UserModelEngine.js',
  'MemoryOptimizer.js',
  'ConversationEngineV2.js',
  'ContextAwareEngine.js',
  'MessageFormatter.js',
  'LearningPathCustomizer.js',
  'OutputFormatter.js',
  'ResultSynthesizer.js',
  'SmartContextBuilder.js',
  'TraceProcessor.js',
  'ModelSelectorV2.js',
  'UtilityEngine.js',
  'ValidationEngine.js',
  'VoiceEngine.js',
  'VoicePresetManager.js'
];

// Create engine activation registry
const ENGINE_ACTIVATION_REGISTRY = {
  'analysis': {
    description: 'Understanding current state and finding insights',
    active_engines: ['workbench-orchestrator.js', 'github-provider.js'],
    dormant_engines: ['BookwormAnalysisEngine.js', 'CohortAnalyzer.js'],
    services: ['segmentation', 'meta', 'reports']
  },
  'improvement': {
    description: 'Finding and implementing optimizations',
    active_engines: ['workbench-orchestrator.js'],
    dormant_engines: ['ProactiveIntelligenceEngine.js', 'ModelSelectorV2.js'],
    services: ['meta', 'training', 'coach', 'reports']
  },
  'creation': {
    description: 'Building new artifacts and documentation',
    active_engines: ['workbench-orchestrator.js'],
    dormant_engines: ['ArtifactGenerationEngine.js', 'ProductWorkflowOrchestrator.js'],
    services: ['product', 'training', 'reports']
  },
  'prediction': {
    description: 'Forecasting and probability assessment',
    active_engines: ['workbench-orchestrator.js'],
    dormant_engines: ['ProactiveIntelligenceEngine.js'],
    services: ['meta', 'training', 'budget', 'reports']
  },
  'learning': {
    description: 'Educational content and learning paths',
    active_engines: ['workbench-orchestrator.js'],
    dormant_engines: ['LearningPathCustomizer.js', 'UserModelEngine.js'],
    services: ['coach', 'training', 'reports']
  },
  'debugging': {
    description: 'Root cause analysis and solutions',
    active_engines: ['workbench-orchestrator.js'],
    dormant_engines: ['ContextAwareEngine.js', 'TraceProcessor.js'],
    services: ['capabilities', 'segmentation', 'reports']
  }
};

console.log(`
╔════════════════════════════════════════════════════════════╗
║           ENGINE ARCHIVAL PREPARATION SCRIPT               ║
║           Identify & Prepare Dormant Engines               ║
╚════════════════════════════════════════════════════════════╝
`);

// Scan engine directory
console.log('\n📁 Scanning engine directory...');
let engineFiles = [];
try {
  engineFiles = fs.readdirSync(engineDir)
    .filter(f => f.endsWith('.js') && !f.startsWith('.'));
  console.log(`Found ${engineFiles.length} engine files`);
} catch (e) {
  console.error(`Error reading engine directory: ${e.message}`);
  process.exit(1);
}

// Categorize engines
const active = engineFiles.filter(f => ACTIVE_ENGINES.includes(f));
const dormant = engineFiles.filter(f => 
  !ACTIVE_ENGINES.includes(f) && 
  DORMANT_ENGINES.includes(f)
);
const unknown = engineFiles.filter(f =>
  !ACTIVE_ENGINES.includes(f) &&
  !DORMANT_ENGINES.includes(f)
);

console.log(`\n✅ Active Engines: ${active.length}`);
active.forEach(f => console.log(`   • ${f}`));

console.log(`\n⏸️  Dormant Engines: ${dormant.length}`);
dormant.forEach(f => {
  const size = fs.statSync(path.join(engineDir, f)).size;
  const lines = fs.readFileSync(path.join(engineDir, f), 'utf-8').split('\n').length;
  console.log(`   • ${f} (${lines} lines, ${(size / 1024).toFixed(1)}KB)`);
});

console.log(`\n❓ Unknown Engines: ${unknown.length}`);
unknown.forEach(f => console.log(`   • ${f}`));

// Calculate statistics
const totalDormantLines = dormant.reduce((sum, f) => {
  const content = fs.readFileSync(path.join(engineDir, f), 'utf-8');
  return sum + content.split('\n').length;
}, 0);

console.log(`\n📊 STATISTICS`);
console.log(`   Total Engine Files: ${engineFiles.length}`);
console.log(`   Active: ${active.length} (${((active.length / engineFiles.length) * 100).toFixed(1)}%)`);
console.log(`   Dormant: ${dormant.length} (${((dormant.length / engineFiles.length) * 100).toFixed(1)}%)`);
console.log(`   Dormant Lines of Code: ${totalDormantLines.toLocaleString()}`);
console.log(`   Potential Cleanup: ~${(totalDormantLines / 1000).toFixed(0)}k lines`);

// Create registry file
const registryPath = path.join(engineDir, 'ENGINE_ACTIVATION_REGISTRY.json');
console.log(`\n📝 Creating Engine Activation Registry...`);

fs.writeFileSync(registryPath, JSON.stringify(ENGINE_ACTIVATION_REGISTRY, null, 2));
console.log(`   Saved to: engine/ENGINE_ACTIVATION_REGISTRY.json`);

// Show next steps
console.log(`\n📋 NEXT STEPS TO ARCHIVE ENGINES`);
console.log(`
1. Review Dormant Engines:
   ${dormant.slice(0, 3).map(f => `   • engine/${f}`).join('\n')}
   ${dormant.length > 3 ? `   ... and ${dormant.length - 3} more` : ''}

2. Create Archive Directory:
   mkdir -p engine/deprecated

3. Move Dormant Engines (when ready):
   mv engine/AutonomousEvolutionEngine.js engine/deprecated/
   mv engine/SelfDiscoveryEngine.js engine/deprecated/
   ... (move all dormant engines)

4. Create Archive Index:
   Create engine/deprecated/README.md documenting:
   - Why each engine was deprecated
   - When it was archived
   - How to reactivate if needed
   - Dependencies and relationships

5. Update Engine Index:
   Edit engine/index.js to only export active engines

6. Git Commit:
   git add -A
   git commit -m "Archive: Move ${dormant.length} dormant engines to deprecated/"

📌 ENGINE ACTIVATION REGISTRY CREATED
   This registry maps intents to engines that can activate them.
   Use this to reactivate dormant engines in the future based on needs.

🎯 RECOMMENDATION
   Archive the ${dormant.length} dormant engines (~${totalDormantLines.toLocaleString()} LOC).
   This will clean up the codebase and make it easier to maintain.
   The activation registry preserves knowledge of what exists.
`);

// Check for deprecated directory
if (!fs.existsSync(archiveDir)) {
  console.log(`\n✏️  To create archive directory, run:`);
  console.log(`   mkdir -p ${archiveDir}`);
}

console.log(`\n✅ Archival preparation complete!`);
