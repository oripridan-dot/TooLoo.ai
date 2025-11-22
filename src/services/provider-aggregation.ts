/**
 * Provider Aggregation System
 * Collects specialized responses from all providers and synthesizes them
 * Enables decision making based on collective intelligence
 */

import { getProviderInstructions } from './provider-instructions.js';
import LLMProvider from '../engine/llm-provider.js';

export default class ProviderAggregation {
  constructor() {
    this.llmProvider = new LLMProvider();
    this.instructions = null;
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Initialize with instructions (call once at startup)
   */
  async initialize() {
    this.instructions = await getProviderInstructions();
    return this.instructions.getStatus();
  }

  /**
   * Call ALL providers in parallel with specialized prompts
   * Returns responses from each provider
   */
  async callAllProviders(basePrompt, context = {}) {
    if (!this.instructions) {
      throw new Error('Aggregation system not initialized. Call initialize() first.');
    }

    this.startTime = Date.now();
    this.results = [];

    const providers = this.instructions.getByPriority();
    const calls = providers.map(providerInstr => 
      this.callSingleProvider(
        providerInstr,
        basePrompt,
        context
      )
    );

    try {
      const results = await Promise.allSettled(calls);
      this.results = results.map((r, idx) => {
        // r is {status: 'fulfilled'|'rejected', value: ...}
        if (r.status === 'fulfilled') {
          return {
            ...r.value,
            provider: providers[idx].name,
            providerKey: Object.keys(this.instructions.instructions)[idx]
          };
        } else {
          return {
            status: 'error',
            provider: providers[idx].name,
            providerKey: Object.keys(this.instructions.instructions)[idx],
            error: r.reason?.message || String(r.reason)
          };
        }
      });

      this.endTime = Date.now();
      return this.aggregateResults();
    } catch (err) {
      console.error('[ProviderAggregation] Error calling providers:', err.message);
      throw err;
    }
  }

  /**
   * Call a single provider with specialized prompt
   */
  async callSingleProvider(providerInstr, basePrompt, context) {
    const startTime = Date.now();
    const specializedPrompt = this.instructions.buildSpecializedPrompt(
      providerInstr.name.split(' ')[0].toLowerCase(),
      basePrompt,
      { ...context, aggregationContext: true }
    );

    try {
      // Get provider key (matches what LLMProvider uses)
      const providerKey = this.mapProviderName(providerInstr.name);

      // Check if provider is available
      if (!this.llmProvider.providers[providerKey]) {
        throw new Error(`Provider ${providerInstr.name} not available (missing API keys)`);
      }

      // Call the appropriate provider method
      const response = await this.callProvider(
        providerKey,
        basePrompt,
        specializedPrompt
      );

      return {
        status: 'success',
        provider: providerInstr.name,
        providerKey,
        role: providerInstr.aggregationRole,
        response: response.content || response.response || response,
        responseTime: Date.now() - startTime,
        model: providerInstr.model,
        tokens: response.tokens || 0,
        confidence: response.confidence || 0.8
      };
    } catch (err) {
      return {
        status: 'error',
        provider: providerInstr.name,
        providerKey: this.mapProviderName(providerInstr.name),
        error: err.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Call provider using LLMProvider's methods
   */
  async callProvider(providerKey, userMessage, systemPrompt) {
    switch (providerKey) {
      case 'anthropic':
        return await this.llmProvider.callClaude(userMessage, systemPrompt);
      case 'openai':
        return await this.llmProvider.callOpenAI(userMessage, systemPrompt);
      case 'deepseek':
        return await this.llmProvider.callDeepSeek(userMessage, systemPrompt);
      case 'gemini':
        return await this.llmProvider.callGemini(userMessage, systemPrompt);
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  /**
   * Map provider display names to keys
   */
  mapProviderName(displayName) {
    const map = {
      'Anthropic Claude': 'anthropic',
      'Anthropic': 'anthropic',
      'Claude': 'anthropic',
      'OpenAI GPT-4o Mini': 'openai',
      'OpenAI': 'openai',
      'GPT-4o': 'openai',
      'DeepSeek Chat': 'deepseek',
      'DeepSeek': 'deepseek',
      'Google Gemini 2.5 Flash': 'gemini',
      'Gemini': 'gemini',
      'Google': 'gemini'
    };
    return map[displayName] || displayName.toLowerCase();
  }

  /**
   * Aggregate results from all providers
   */
  aggregateResults() {
    const successful = this.results.filter(r => r.status === 'success');
    const failed = this.results.filter(r => r.status === 'error');

    return {
      timestamp: new Date().toISOString(),
      executionTime: this.endTime - this.startTime,
      providers: {
        successful: successful.length,
        failed: failed.length,
        total: this.results.length
      },
      responses: successful.map(r => ({
        provider: r.provider,
        role: r.role,
        response: r.response,
        model: r.model,
        responseTime: r.responseTime,
        tokens: r.tokens,
        confidence: r.confidence
      })),
      errors: failed.map(r => ({
        provider: r.provider,
        error: r.error,
        responseTime: r.responseTime
      })),
      aggregationStrategy: {
        type: 'collective-intelligence',
        method: 'parallel-multi-provider',
        description: 'Each provider contributes their specialized expertise'
      }
    };
  }

  /**
   * Get synthesis of all responses
   * Combines insights from all providers into a unified answer
   */
  getSynthesis() {
    const successful = this.results.filter(r => r.status === 'success');
    if (successful.length === 0) {
      return {
        synthesized: 'No successful responses from providers.',
        source: 'error'
      };
    }

    // Group by role for clarity
    const byRole = {};
    successful.forEach(r => {
      if (!byRole[r.role]) byRole[r.role] = [];
      byRole[r.role].push(r);
    });

    let synthesis = '';
    const roleOrder = ['primary-reasoner', 'validator-implementer', 'pragmatist-optimizer', 'creative-synthesizer'];

    roleOrder.forEach(role => {
      if (byRole[role]) {
        synthesis += `\n[${'═'.repeat(60)}]\n`;
        synthesis += `[${byRole[role][0].role.toUpperCase()}]\n`;
        synthesis += `${'═'.repeat(60)}\n\n`;

        byRole[role].forEach(r => {
          synthesis += `**${r.provider}** (${r.model}):\n`;
          synthesis += `${r.response}\n\n`;
        });
      }
    });

    return {
      synthesized: synthesis,
      source: 'collective-intelligence',
      providerCount: successful.length,
      executionTime: this.endTime - this.startTime,
      detailedResponses: this.results.map(r => ({
        provider: r.provider,
        role: r.role,
        response: r.response,
        responseTime: r.responseTime
      }))
    };
  }

  /**
   * Get best response for a specific use case
   */
  getBestForUseCase(useCase) {
    const successful = this.results.filter(r => r.status === 'success');
    if (successful.length === 0) return null;

    // Find provider that's best suited for this use case
    const providers = this.instructions.getByPriority();
    for (const provider of providers) {
      if (provider.useFor.includes(useCase)) {
        const result = successful.find(r => r.provider === provider.name);
        if (result) {
          return {
            provider: result.provider,
            role: result.role,
            response: result.response,
            model: result.model,
            reason: `Selected for ${useCase} - ${provider.aggregationRole}`
          };
        }
      }
    }

    // Fallback to fastest response
    return successful.reduce((best, current) =>
      current.responseTime < best.responseTime ? current : best
    );
  }

  /**
   * Get analysis of provider performance
   */
  getProviderAnalysis() {
    const successful = this.results.filter(r => r.status === 'success');
    const failed = this.results.filter(r => r.status === 'error');

    return {
      summary: {
        totalRequests: this.results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / this.results.length * 100).toFixed(1) + '%'
      },
      timing: {
        totalTime: this.endTime - this.startTime,
        fastest: Math.min(...successful.map(r => r.responseTime)),
        slowest: Math.max(...successful.map(r => r.responseTime)),
        average: (successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length).toFixed(0)
      },
      providers: successful.map(r => ({
        name: r.provider,
        role: r.role,
        responseTime: r.responseTime,
        tokens: r.tokens,
        confidence: r.confidence
      })),
      failures: failed.map(r => ({
        provider: r.provider,
        error: r.error
      }))
    };
  }

  /**
   * Reset for new aggregation
   */
  reset() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }
}

// Singleton instance
let aggregationInstance = null;

export async function getProviderAggregation() {
  if (!aggregationInstance) {
    aggregationInstance = new ProviderAggregation();
    await aggregationInstance.initialize();
  }
  return aggregationInstance;
}
