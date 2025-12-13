/**
 * @tooloo/evals - CLI Runner
 * Run cognitive evaluations against golden datasets
 * 
 * @version 2.0.0-alpha.0
 */

import { getGoldenInputsSummary, loadGoldenInputs } from './loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const goldenPath = path.join(__dirname, '../golden');
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              🧠 TooLoo Cognitive Evaluations                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Get summary of golden inputs
  const summary = await getGoldenInputsSummary(goldenPath);
  console.log('📊 Golden Dataset Summary:\n');
  console.log(`   Total inputs: ${summary.total}`);
  console.log(`   Categories:   ${Object.keys(summary.byCategory).length}`);
  console.log('');
  
  for (const [category, count] of Object.entries(summary.byCategory)) {
    console.log(`   • ${category}: ${count} tests`);
  }
  console.log('');

  // Load all golden inputs
  const inputs = await loadGoldenInputs(goldenPath);
  
  console.log('📝 Sample Golden Inputs:\n');
  for (const input of inputs.slice(0, 5)) {
    console.log(`   [${input.category}] ${input.id}: ${input.name}`);
    const inputText = input.input || '';
    console.log(`      Input: "${inputText.substring(0, 60).replace(/\n/g, ' ')}..."`);
    console.log(`      Expected Skill: ${input.expectedRoute?.skillId || 'N/A'}`);
    console.log(`      Difficulty: ${input.difficulty}`);
    console.log('');
  }

  // Check for API keys
  const hasDeepSeek = !!process.env['DEEPSEEK_API_KEY'];
  const hasOpenAI = !!process.env['OPENAI_API_KEY'];
  const hasAnthropic = !!process.env['ANTHROPIC_API_KEY'];

  console.log('🔑 API Key Status:');
  console.log(`   DEEPSEEK_API_KEY:  ${hasDeepSeek ? '✓ set' : '✗ missing'}`);
  console.log(`   OPENAI_API_KEY:    ${hasOpenAI ? '✓ set' : '✗ missing'}`);
  console.log(`   ANTHROPIC_API_KEY: ${hasAnthropic ? '✓ set' : '✗ missing'}`);
  console.log('');

  if (!hasDeepSeek && !hasOpenAI && !hasAnthropic) {
    console.log('⚠️  No API keys found. Set at least one to run evaluations.\n');
  }

  // Statistics
  console.log('📈 Dataset Statistics:\n');
  const difficulties = inputs.reduce((acc, i) => {
    acc[i.difficulty] = (acc[i.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  for (const [diff, count] of Object.entries(difficulties)) {
    console.log(`   ${diff}: ${count} tests`);
  }
  console.log('');

  // Tags analysis
  const allTags = inputs.flatMap(i => i.tags || []);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('🏷️  Top Tags:\n');
  for (const [tag, count] of topTags) {
    console.log(`   ${tag}: ${count}`);
  }
  console.log('');

  console.log('✅ Golden dataset validation complete!');
  console.log(`   ${summary.total} test cases ready for evaluation`);
}

main().catch(console.error);
