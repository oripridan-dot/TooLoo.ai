// @version 2.1.28
/**
 * Layer 1 Multi-Provider Orchestrator
 * Calls multiple providers in parallel and aggregates responses
 * Returns: Layer 1 bullets + comprehensive aggregated response
 */

import LLMProvider, { generateSmartLLM, generateLLM } from "./llm-provider.js";
import ResponseAggregator from "./response-aggregator.js";

export class Layer1Orchestrator {
  constructor(options = {}) {
    this.provider = new LLMProvider();
    this.aggregator = new ResponseAggregator();
    this.options = {
      maxParallel: options.maxParallel || 3,
      timeout: options.timeout || 30000,
      includeLocalProviders: options.includeLocalProviders !== false,
      minConfidence: options.minConfidence || 0.3,
      ...options,
    };
  }

  /**
   * Call multiple providers in parallel and aggregate
   * @param {string} prompt - User prompt
   * @param {string} system - System instruction
   * @param {object} config - Configuration (taskType, criticality, maxTokens)
   * @returns {object} {layer1Bullets, aggregated, rawResponses}
   */
  async orchestrateMultiProvider(prompt, system = "", config = {}) {
    const {
      taskType = "general",
      criticality = "normal",
      maxTokens = 512,
      numProviders = 3,
    } = config;

    this.aggregator.reset();

    // Determine which providers to call
    const providersToCall = this.selectProviders(numProviders);
    if (providersToCall.length === 0) {
      throw new Error("No available providers configured");
    }

    // Call providers in parallel with timeout
    const results = await Promise.allSettled(
      providersToCall.map((providerName) =>
        this.callProviderWithTimeout(providerName, prompt, system, {
          taskType,
          criticality,
          maxTokens,
        }),
      ),
    );

    // Process results
    const rawResponses = [];
    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        const { text, provider, confidence } = result.value;
        this.aggregator.addResponse(text, {
          provider,
          confidence,
          taskType,
        });
        rawResponses.push(result.value);
      } else if (result.status === "rejected") {
        console.warn(
          `Provider ${providersToCall[idx]} failed:`,
          result.reason?.message,
        );
      }
    });

    if (rawResponses.length === 0) {
      throw new Error("All providers failed to respond");
    }

    // Generate outputs
    return {
      layer1Bullets: this.aggregator.generateLayer1Bullets(),
      aggregated: this.aggregator.generateAggregatedResponse(),
      rawResponses,
      report: this.aggregator.getDetailedReport(),
    };
  }

  /**
   * Select providers based on availability and configuration
   */
  selectProviders(count = 3) {
    const available = [];

    // Priority order: local first (free), then premium
    const order = this.options.includeLocalProviders
      ? ["localai", "deepseek", "anthropic", "openai", "gemini"]
      : ["deepseek", "anthropic", "openai", "gemini"];

    for (const provider of order) {
      const config = {
        deepseek: () => (process.env.DEEPSEEK_API_KEY ? provider : null),
        anthropic: () => (process.env.ANTHROPIC_API_KEY ? provider : null),
        openai: () => (process.env.OPENAI_API_KEY ? provider : null),
        gemini: () => (process.env.GEMINI_API_KEY ? provider : null),

        localai: () =>
          process.env.LOCALAI_ENABLED === "true" ? provider : null,
      };

      if (config[provider]?.()) {
        available.push(provider);
      }
    }

    return available.slice(0, count);
  }

  /**
   * Call a single provider with timeout and confidence scoring
   */
  async callProviderWithTimeout(providerName, prompt, system, config) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Provider ${providerName} timeout (${this.options.timeout}ms)`,
          ),
        );
      }, this.options.timeout);

      (async () => {
        try {
          // Use smart routing if available, else direct call
          let result;
          if (providerName === "smart") {
            result = await generateSmartLLM({
              prompt,
              system,
              taskType: config.taskType,
              criticality: config.criticality,
              maxTokens: config.maxTokens,
            });
          } else {
            const text = await generateLLM({
              prompt,
              provider: providerName,
              system,
              maxTokens: config.maxTokens,
            });
            result = { text, providerUsed: providerName };
          }

          clearTimeout(timeout);

          // Score confidence (1-10 scale)
          const confidence = this.scoreConfidence(result, providerName);

          resolve({
            text: result.text,
            provider: result.providerUsed || providerName,
            confidence: Math.min(confidence / 10, 1), // Normalize to 0-1
            taskType: result.taskTypeDetected || config.taskType,
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      })();
    });
  }

  /**
   * Score response confidence (1-10)
   */
  scoreConfidence(result, provider) {
    let score = 6; // Base score

    // Provider reputation boost
    const providerBoosts = {
      anthropic: 8.5,
      openai: 8,
      deepseek: 7.5,
      gemini: 7,

      localai: 5,
    };

    score = providerBoosts[provider] || score;

    // Response length bonus (more detail = higher confidence)
    if (result.text?.length > 500) score += 1;
    if (result.text?.length > 1000) score += 1;

    // Clamp to 1-10
    return Math.max(1, Math.min(10, score));
  }

  /**
   * Format for UI display
   */
  formatOutput(orchestrateResult, format = "markdown") {
    const { layer1Bullets, aggregated } = orchestrateResult;

    if (format === "json") {
      return JSON.stringify(
        {
          layer1: layer1Bullets,
          aggregated,
        },
        null,
        2,
      );
    }

    // Markdown format
    let output = "# Layer 1 Analysis\n\n";
    output += "## Key Insights\n";
    layer1Bullets.forEach((bullet) => {
      output += `${bullet}\n`;
    });

    output += "\n## Comprehensive Summary\n";
    output += `${aggregated.summary}\n`;

    if (aggregated.suggestions.length > 0) {
      output += "\n## Recommendations\n";
      aggregated.suggestions.forEach((sugg) => {
        output += `${sugg}\n`;
      });
    }

    output += "\n---\n";
    output += `**Confidence**: ${aggregated.confidence}%\n`;
    output += `**Providers**: ${aggregated.providers.join(", ")}\n`;

    return output;
  }
}

// Export for use
export default Layer1Orchestrator;
