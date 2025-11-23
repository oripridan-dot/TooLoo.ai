// @version 2.1.11
/**
 * Example: Using Layer 1 Orchestrator with Response Aggregation
 * 
 * This demonstrates how to call multiple providers and get:
 * 1. Layer 1 bullets (key sentences/insights)
 * 2. Comprehensive aggregated response
 * 3. Detailed report with confidence metrics
 */

import Layer1Orchestrator from './layer1-orchestrator.js';

// Initialize
const orchestrator = new Layer1Orchestrator({
  maxParallel: 3,
  timeout: 30000,
  includeLocalProviders: true,
  minConfidence: 0.3
});

async function demonstrateLayer1Aggregation() {
  const prompt = `
    What are the key principles of effective AI system design?
    Provide practical insights and best practices.
  `;

  const systemPrompt = `
    You are an expert in AI systems architecture. Provide concise, 
    actionable insights focused on practical implementation.
  `;

  try {
    console.log('🚀 Orchestrating Layer 1 multi-provider response...\n');

    // Call multiple providers and aggregate
    const result = await orchestrator.orchestrateMultiProvider(
      prompt,
      systemPrompt,
      {
        taskType: 'reasoning',
        criticality: 'normal',
        maxTokens: 512,
        numProviders: 3  // Call 3 providers in parallel
      }
    );

    // ========== LAYER 1: BULLETS ==========
    console.log('📌 LAYER 1: KEY INSIGHTS (Bullets)\n');
    console.log('---');
    result.layer1Bullets.forEach(bullet => {
      console.log(bullet);
    });
    console.log('---\n');

    // ========== COMPREHENSIVE AGGREGATION ==========
    console.log('📊 COMPREHENSIVE AGGREGATED RESPONSE\n');
    console.log(`Summary: ${result.aggregated.summary}\n`);

    if (result.aggregated.suggestions.length > 0) {
      console.log('💡 Recommendations:');
      result.aggregated.suggestions.forEach(sugg => {
        console.log(sugg);
      });
      console.log();
    }

    // ========== METADATA ==========
    console.log('📈 Confidence & Metadata');
    console.log(`Confidence Level: ${result.aggregated.confidence}%`);
    console.log(`Providers Used: ${result.aggregated.providers.join(', ')}`);
    console.log(`Responses Aggregated: ${result.aggregated.responseCount}`);
    console.log();

    // ========== RAW RESPONSE PREVIEWS ==========
    console.log('📝 Raw Responses Summary:');
    console.log('---');
    result.rawResponses.forEach((resp, idx) => {
      console.log(`\n[${idx + 1}] ${resp.provider.toUpperCase()}`);
      console.log(`    Confidence: ${(resp.confidence * 100).toFixed(0)}%`);
      console.log(`    Preview: ${resp.text.substring(0, 80)}...`);
    });
    console.log('---\n');

    // ========== FORMATTED OUTPUT (for UI/display) ==========
    console.log('🎨 Formatted Output (Markdown):');
    console.log('---');
    console.log(orchestrator.formatOutput(result, 'markdown'));
    console.log('---\n');

    // ========== JSON EXPORT ==========
    console.log('💾 JSON Export (for storage/API):');
    console.log('---');
    console.log(orchestrator.formatOutput(result, 'json'));
    console.log('---');

  } catch (error) {
    console.error('❌ Error during orchestration:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

// Run example
demonstrateLayer1Aggregation();

/**
 * EXPECTED OUTPUT STRUCTURE:
 * 
 * 📌 LAYER 1: KEY INSIGHTS (Bullets)
 * ─────────────────────────────────
 * • Key principle 1: explanation
 * • Key principle 2: explanation
 * • Best practice: description
 * ...
 * 
 * 📊 COMPREHENSIVE AGGREGATED RESPONSE
 * ─────────────────────────────────────
 * Summary: Consolidated insights from all providers
 * 
 * 💡 Recommendations:
 * • Action 1: specific step
 * • Action 2: specific step
 * ...
 * 
 * 📈 Confidence & Metadata
 * ─────────────────────────
 * Confidence Level: 78%
 * Providers Used: deepseek, anthropic, openai
 * Responses Aggregated: 3
 * 
 * 📝 Raw Responses Summary
 * ────────────────────────
 * [1] DEEPSEEK - Confidence: 75%
 * [2] ANTHROPIC - Confidence: 85%
 * [3] OPENAI - Confidence: 80%
 */
